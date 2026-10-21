#!/usr/bin/env python3
"""Turn the Liara OpenAPI specs in specs/ into Markdown reference docs in docs/api/.

Usage:
    bash scripts/fetch_specs.sh      # optional: refresh specs/ from developers.liara.ir
    python3 scripts/generate_docs.py

Needs PyYAML (pip install pyyaml).
"""
import json
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SPEC_DIR = ROOT / "specs"
OUT_DIR = ROOT / "docs" / "api"

METHODS = ("get", "post", "put", "patch", "delete", "head", "options")
MAX_DEPTH = 5

# spec file -> (doc file name, product title, group)
PRODUCTS = {
    "paas.yaml": ("paas.md", "PaaS (Apps)", "Platform"),
    "dbaas.yaml": ("dbaas.md", "DBaaS (Databases)", "Platform"),
    "database-inspector.yaml": ("database-inspector.md", "Database Inspector", "Platform"),
    "object-storage.yaml": ("object-storage.md", "Object Storage", "Platform"),
    "file-browser.yaml": ("file-browser.md", "File Browser (Disks)", "Platform"),
    "dns.yaml": ("dns.md", "DNS", "Platform"),
    "mail.yaml": ("mail.md", "Mail Server", "Platform"),
    "Iaas.yaml": ("iaas.md", "IaaS (Virtual Machines)", "Platform"),
    "me.yaml": ("account.md", "Account (User)", "Account"),
    "billing.yaml": ("billing.md", "Billing", "Account"),
    "ai-chat-completions.yaml": ("ai-chat-completions.md", "AI - Chat Completions", "AI"),
    "ai-embeddings.yaml": ("ai-embeddings.md", "AI - Embeddings", "AI"),
    "ai-image-generation.yaml": ("ai-image-generation.md", "AI - Image Generation", "AI"),
    "ai-stt.yaml": ("ai-stt.md", "AI - Speech to Text", "AI"),
    "ai-tts.yaml": ("ai-tts.md", "AI - Text to Speech", "AI"),
    "ai-keys.yaml": ("ai-keys.md", "AI - API Keys", "AI"),
    "ai-logs.yaml": ("ai-logs.md", "AI - Logs", "AI"),
    "ai-models.yaml": ("ai-models.md", "AI - Model Catalog", "AI"),
    "ai-playground.yaml": ("ai-playground.md", "AI - Playground", "AI"),
    "ai-workspaces.yaml": ("ai-workspaces.md", "AI - Workspaces", "AI"),
}


def esc(text):
    """Make text safe for a single Markdown table cell."""
    if text is None:
        return ""
    text = str(text).strip()
    text = re.sub(r"\s*\n\s*", " ", text)
    return text.replace("|", "\\|")


class Spec:
    def __init__(self, path):
        self.path = path
        self.doc = yaml.safe_load(path.read_text(encoding="utf-8"))

    def resolve(self, node, seen=()):
        """Follow a local $ref. Returns (node, ref_name_or_None)."""
        if isinstance(node, dict) and "$ref" in node:
            ref = node["$ref"]
            if not ref.startswith("#/") or ref in seen:
                return {"type": "object", "description": f"(recursive: {ref})"}, ref
            target = self.doc
            for part in ref[2:].split("/"):
                target = target.get(part, {}) if isinstance(target, dict) else {}
            resolved, _ = self.resolve(target, seen + (ref,))
            return resolved, ref.rsplit("/", 1)[-1]
        return node, None

    # ---- schema helpers -------------------------------------------------
    def type_label(self, schema):
        schema, ref = self.resolve(schema)
        if not isinstance(schema, dict):
            return "any"
        for combo in ("oneOf", "anyOf"):
            if combo in schema:
                return " \\| ".join(self.type_label(s) for s in schema[combo])
        if "allOf" in schema:
            return "object"
        t = schema.get("type")
        if isinstance(t, list):
            t = " \\| ".join(t)
        if t == "array":
            return f"{self.type_label(schema.get('items', {}))}[]"
        if not t:
            t = "object" if "properties" in schema else "any"
        if schema.get("format"):
            t = f"{t} ({schema['format']})"
        return t

    def merged(self, schema):
        """Flatten allOf into one object schema."""
        schema, _ = self.resolve(schema)
        if not isinstance(schema, dict):
            return {}
        if "allOf" not in schema:
            return schema
        out = {"type": "object", "properties": {}, "required": []}
        for part in schema["allOf"]:
            part = self.merged(part)
            out["properties"].update(part.get("properties", {}) or {})
            out["required"] += part.get("required", []) or []
            if part.get("description") and not out.get("description"):
                out["description"] = part["description"]
        for k, v in schema.items():
            if k != "allOf":
                out.setdefault(k, v)
        return out

    def field_rows(self, schema, prefix="", depth=0, seen=()):
        """Yield (name, type, required, description) rows for an object schema."""
        schema = self.merged(schema)
        if depth > MAX_DEPTH or not isinstance(schema, dict):
            return
        if schema.get("type") == "array" or "items" in schema:
            items = self.merged(schema.get("items", {}))
            if items.get("properties"):
                yield from self.field_rows(items, prefix + "[]", depth + 1, seen)
            return
        variants = schema.get("oneOf") or schema.get("anyOf")
        if variants and not schema.get("properties"):
            for i, v in enumerate(variants, 1):
                v = self.merged(v)
                if v.get("properties"):
                    label = v.get("title") or f"option {i}"
                    yield (f"{prefix or '(body)'} — *{esc(label)}*", self.type_label(v), "", esc(v.get("description")))
                    yield from self.field_rows(v, prefix, depth + 1, seen)
            return
        required = set(schema.get("required", []) or [])
        for name, prop in (schema.get("properties") or {}).items():
            raw = prop
            prop = self.merged(prop)
            full = f"{prefix}.{name}" if prefix else name
            yield (f"`{full}`", self.type_label(raw), "yes" if name in required else "", self.describe(prop))
            ref = raw.get("$ref") if isinstance(raw, dict) else None
            if ref and ref in seen:
                continue
            child_seen = seen + ((ref,) if ref else ())
            if prop.get("properties") or prop.get("allOf") or prop.get("oneOf") or prop.get("anyOf"):
                yield from self.field_rows(prop, full, depth + 1, child_seen)
            elif prop.get("type") == "array":
                items = self.merged(prop.get("items", {}))
                if items.get("properties"):
                    yield from self.field_rows(items, full + "[]", depth + 1, child_seen)

    def describe(self, schema):
        schema, _ = self.resolve(schema)
        if not isinstance(schema, dict):
            return ""
        parts = []
        if schema.get("description"):
            parts.append(esc(schema["description"]))
        enum = schema.get("enum") or (schema.get("items") or {}).get("enum")
        if enum:
            parts.append("One of: " + ", ".join(f"`{e}`" for e in enum))
        if "default" in schema:
            parts.append(f"Default: `{json.dumps(schema['default'], ensure_ascii=False)}`")
        for key, label in (("minimum", "Min"), ("maximum", "Max"), ("minLength", "Min length"), ("maxLength", "Max length")):
            if key in schema:
                parts.append(f"{label}: {schema[key]}")
        if "example" in schema and not isinstance(schema["example"], (dict, list)):
            parts.append(f"Example: `{esc(json.dumps(schema['example'], ensure_ascii=False))}`")
        return " ".join(parts)

    def sample(self, schema, depth=0, seen=()):
        """Build an example value from a schema (uses examples when given)."""
        raw = schema
        schema = self.merged(schema)
        if not isinstance(schema, dict) or depth > MAX_DEPTH:
            return None
        if "example" in schema:
            return schema["example"]
        if schema.get("enum"):
            return schema["enum"][0]
        if "default" in schema:
            return schema["default"]
        variants = schema.get("oneOf") or schema.get("anyOf")
        if variants and not schema.get("properties"):
            return self.sample(variants[0], depth + 1, seen)
        t = schema.get("type")
        if t == "array" or "items" in schema:
            v = self.sample(schema.get("items", {}), depth + 1, seen)
            return [] if v is None else [v]
        if t == "object" or schema.get("properties"):
            ref = raw.get("$ref") if isinstance(raw, dict) else None
            if ref and ref in seen:
                return {}
            seen = seen + ((ref,) if ref else ())
            return {k: self.sample(v, depth + 1, seen) for k, v in (schema.get("properties") or {}).items()}
        return {"string": "string", "integer": 0, "number": 0, "boolean": False}.get(t, None)


def media_example(spec, media):
    if not isinstance(media, dict):
        return None
    if "example" in media:
        return media["example"]
    examples = media.get("examples")
    if isinstance(examples, dict) and examples:
        first, _ = spec.resolve(next(iter(examples.values())))
        if isinstance(first, dict) and "value" in first:
            return first["value"]
    if "schema" in media:
        return spec.sample(media["schema"])
    return None


def code_block(value, lang="json"):
    if isinstance(value, (dict, list)):
        text = json.dumps(value, indent=2, ensure_ascii=False)
    else:
        text = str(value)
    if len(text) > 4000:
        text = text[:4000] + "\n... (truncated)"
    return f"```{lang}\n{text}\n```\n"


def table(headers, rows):
    out = ["| " + " | ".join(headers) + " |", "|" + "---|" * len(headers)]
    out += ["| " + " | ".join(str(c) for c in r) + " |" for r in rows]
    return "\n".join(out) + "\n"


def slug(text):
    s = re.sub(r"[^\w\- ]", "", text.lower()).strip().replace(" ", "-")
    return re.sub(r"-+", "-", s)


def server_url(spec):
    servers = spec.doc.get("servers") or [{}]
    return servers[0].get("url", "")


def auth_summary(spec):
    schemes = (spec.doc.get("components") or {}).get("securitySchemes") or {}
    lines = []
    for name, s in schemes.items():
        if s.get("type") == "http":
            lines.append(f"- `{name}`: HTTP {s.get('scheme')} ({s.get('bearerFormat', '')}) → `Authorization: Bearer <token>`")
        elif s.get("type") == "apiKey":
            lines.append(f"- `{name}`: API key in {s.get('in')} `{s.get('name')}` → `Authorization: Bearer <token>`")
        else:
            lines.append(f"- `{name}`: {s.get('type')}")
    return "\n".join(lines) or "- No auth scheme declared in the spec (public endpoints)."


def curl_example(spec, method, path, op, base):
    url = base + re.sub(r"\{([^}]+)\}", lambda m: "{" + m.group(1) + "}", path)
    query = []
    for p in op.get("_params", []):
        if p.get("in") == "query" and p.get("required"):
            query.append(f"{p['name']}=<{p['name']}>")
    if query:
        url += "?" + "&".join(query)
    lines = [f"curl -X {method.upper()} \"{url}\""]
    secured = op.get("security", spec.doc.get("security"))
    if secured or secured is None and (spec.doc.get("components") or {}).get("securitySchemes"):
        if secured != []:
            lines.append('  -H "Authorization: Bearer $LIARA_API_TOKEN"')
    body = op.get("requestBody")
    if body:
        body, _ = spec.resolve(body)
        content = body.get("content") or {}
        if "application/json" in content:
            ex = media_example(spec, content["application/json"])
            lines.append('  -H "Content-Type: application/json"')
            if ex is not None:
                lines.append("  -d '" + json.dumps(ex, ensure_ascii=False).replace("'", "'\\''") + "'")
        elif "multipart/form-data" in content:
            schema = spec.merged(content["multipart/form-data"].get("schema", {}))
            for name, prop in (schema.get("properties") or {}).items():
                prop = spec.merged(prop)
                val = "@./file" if prop.get("format") == "binary" else f"<{name}>"
                lines.append(f'  -F "{name}={val}"')
        elif content:
            ctype = next(iter(content))
            lines.append(f'  -H "Content-Type: {ctype}"')
    return " \\\n".join(lines)


def render_operation(spec, method, path, op, path_item, base):
    md = []
    title = op.get("summary") or op.get("operationId") or f"{method.upper()} {path}"
    md.append(f"### {title}\n")
    md.append(f"`{method.upper()} {path}`\n")
    if op.get("deprecated"):
        md.append("> **Deprecated.**\n")
    desc = (op.get("description") or "").strip()
    if desc and desc.lower() != (op.get("summary") or "").lower():
        md.append(desc + "\n")
    if op.get("operationId"):
        md.append(f"Operation ID: `{op['operationId']}`\n")

    security = op.get("security", spec.doc.get("security"))
    if security == []:
        md.append("Auth: **none** (public)\n")
    elif security:
        names = sorted({k for s in security for k in s})
        md.append("Auth: " + " or ".join(f"`{n}`" for n in names) + "\n")

    params = []
    for p in (path_item.get("parameters") or []) + (op.get("parameters") or []):
        p, _ = spec.resolve(p)
        params.append(p)
    op["_params"] = params
    if params:
        rows = []
        for p in params:
            schema = p.get("schema") or {}
            rows.append((f"`{p.get('name')}`", p.get("in", ""), spec.type_label(schema) if schema else "string",
                         "yes" if p.get("required") else "", " ".join(x for x in (esc(p.get("description")), spec.describe(schema)) if x)))
        md.append("**Parameters**\n")
        md.append(table(["Name", "In", "Type", "Required", "Description"], rows))

    body = op.get("requestBody")
    if body:
        body, _ = spec.resolve(body)
        content = body.get("content") or {}
        for ctype, media in content.items():
            req = " (required)" if body.get("required") else ""
            md.append(f"**Request body** — `{ctype}`{req}\n")
            if body.get("description"):
                md.append(esc(body["description"]) + "\n")
            schema = media.get("schema") if isinstance(media, dict) else None
            rows = list(spec.field_rows(schema)) if schema else []
            if rows:
                md.append(table(["Field", "Type", "Required", "Description"], rows))
            elif schema:
                md.append(f"Type: `{spec.type_label(schema)}`\n")
            if ctype == "application/json":
                ex = media_example(spec, media)
                if ex not in (None, {}, []):
                    md.append("Example:\n")
                    md.append(code_block(ex))

    responses = op.get("responses") or {}
    if responses:
        md.append("**Responses**\n")
        rows = []
        for code, r in responses.items():
            r, _ = spec.resolve(r)
            ctypes = ", ".join(f"`{c}`" for c in (r.get("content") or {}))
            rows.append((f"`{code}`", esc(r.get("description")), ctypes))
        md.append(table(["Status", "Description", "Content"], rows))
        for code, r in responses.items():
            if not str(code).startswith("2"):
                continue
            r, _ = spec.resolve(r)
            for ctype, media in (r.get("content") or {}).items():
                schema = media.get("schema") if isinstance(media, dict) else None
                rows = list(spec.field_rows(schema)) if schema else []
                if rows:
                    md.append(f"<details><summary>Response <code>{code}</code> fields</summary>\n")
                    md.append(table(["Field", "Type", "Required", "Description"], rows))
                    md.append("</details>\n")
                ex = media_example(spec, media)
                if ex not in (None, {}, [], ""):
                    md.append(f"<details><summary>Response <code>{code}</code> example</summary>\n")
                    md.append(code_block(ex, "json" if "json" in ctype else ""))
                    md.append("</details>\n")
                break

    md.append("**Example request**\n")
    md.append(code_block(curl_example(spec, method, path, op, base), "bash"))
    op.pop("_params", None)
    return "\n".join(md)


def render_spec(spec_file, doc_name, title):
    spec = Spec(spec_file)
    info = spec.doc.get("info") or {}
    base = server_url(spec)
    tags_meta = {t["name"]: t.get("description", "") for t in spec.doc.get("tags") or []}

    groups = {}
    for path, item in (spec.doc.get("paths") or {}).items():
        for method in METHODS:
            if method in item:
                op = item[method]
                tag = (op.get("tags") or ["General"])[0]
                groups.setdefault(tag, []).append((method, path, op, item))
    order = [t for t in tags_meta if t in groups] + [t for t in groups if t not in tags_meta]
    total = sum(len(v) for v in groups.values())

    md = [f"# {title}\n"]
    md.append(f"> Generated from [`specs/{spec_file.name}`](../../specs/{spec_file.name}) "
              f"(source: https://developers.liara.ir/spec/{spec_file.name}). Do not edit by hand — "
              f"run `python3 scripts/generate_docs.py`.\n")
    md.append(f"**Spec title:** {info.get('title', '')}  ")
    md.append(f"**Version:** {info.get('version', '')}  ")
    md.append(f"**Base URL:** `{base}`  ")
    md.append(f"**Endpoints:** {total}\n")
    if (spec.doc.get("servers") or [{}])[0].get("variables"):
        md.append("> The base URL contains a variable assigned per resource by Liara (see the console / the related service's info endpoint).\n")
    if info.get("description"):
        md.append("## About\n")
        md.append(info["description"].strip() + "\n")
    md.append("## Authentication\n")
    md.append(auth_summary(spec) + "\n")

    md.append("## Endpoints\n")
    rows = []
    for tag in order:
        for method, path, op, _ in groups[tag]:
            name = op.get("summary") or op.get("operationId") or path
            rows.append((esc(tag), f"`{method.upper()}`", f"`{esc(path)}`", f"[{esc(name)}](#{slug(name)})"))
    md.append(table(["Group", "Method", "Path", "Summary"], rows))

    for tag in order:
        md.append(f"## {tag}\n")
        if tags_meta.get(tag):
            md.append(tags_meta[tag].strip() + "\n")
        for method, path, op, item in groups[tag]:
            md.append(render_operation(spec, method, path, op, item, base))
            md.append("---\n")

    (OUT_DIR / doc_name).write_text("\n".join(md), encoding="utf-8")
    return total, base


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    summary = []
    for spec_file in sorted(SPEC_DIR.glob("*.yaml")):
        doc_name, title, group = PRODUCTS.get(spec_file.name, (spec_file.stem.lower() + ".md", spec_file.stem, "Other"))
        total, base = render_spec(spec_file, doc_name, title)
        summary.append((group, title, doc_name, total, base))
        print(f"{spec_file.name:28} -> docs/api/{doc_name} ({total} endpoints)")

    order = {"Platform": 0, "Account": 1, "AI": 2, "Other": 3}
    position = {v[0]: i for i, v in enumerate(PRODUCTS.values())}
    summary.sort(key=lambda r: (order.get(r[0], 9), position.get(r[2], 99)))
    rows = [(g, f"[{t}]({d})", n, f"`{b}`") for g, t, d, n, b in summary]
    index = ["# Liara API reference (generated)\n",
             "One file per OpenAPI spec published at https://developers.liara.ir. "
             "Read [../README.md](../README.md) first for auth, base URLs and conventions.\n",
             table(["Group", "Product", "Endpoints", "Base URL"], rows),
             f"**Total endpoints:** {sum(r[3] for r in summary)}\n"]
    (OUT_DIR / "README.md").write_text("\n".join(index), encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
