#!/usr/bin/env bash
# Download the latest Liara OpenAPI specs into specs/.
# The list of specs comes from the "OpenAPI Specs" section of https://developers.liara.ir/llms.txt
set -euo pipefail

BASE="https://developers.liara.ir"
DEST="$(cd "$(dirname "$0")/.." && pwd)/specs"
mkdir -p "$DEST"

paths=$(curl -fsSL "$BASE/llms.txt" | grep -oE '\(/spec/[^)]+\.ya?ml\)' | tr -d '()')
if [ -z "$paths" ]; then
  echo "No specs found in $BASE/llms.txt" >&2
  exit 1
fi

for p in $paths; do
  echo "fetching $p"
  curl -fsSL "$BASE$p" -o "$DEST/$(basename "$p")"
done
echo "done: $(echo "$paths" | wc -l | tr -d ' ') specs in $DEST"
