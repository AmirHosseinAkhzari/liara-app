// Small helpers shared by the HTML reports: escaping (every value also passes the secret
// scrubber), Persian digits and money, dates in Tehran time, the embedded logo and font.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrubLine } from './verify.mjs';

const ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets');

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (v) => scrubLine(String(v ?? '')).replace(/[&<>"']/g, (c) => ESC[c]);
export const escLong = (v) => String(v ?? '').split('\n').map((l) => esc(l)).join('<br>');
export const safeUrl = (u) => {
  try {
    const x = new URL(String(u));
    return x.protocol === 'https:' || x.protocol === 'http:' ? x.toString() : null;
  } catch {
    return null;
  }
};
export const faDigits = (s) => String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

export function fmtNum(n, lang) {
  if (typeof n !== 'number') return lang === 'fa' ? 'نامعلوم' : 'unknown';
  const s = Math.round(n).toLocaleString('en-US');
  return lang === 'fa' ? faDigits(s).replace(/,/g, '٬') : s;
}
// Persian number that keeps up to two decimals (0.5 → ۰٫۵).
export function faNum(n) {
  if (typeof n !== 'number') return 'نامعلوم';
  return faDigits(n.toLocaleString('en-US', { maximumFractionDigits: 2 })).replace(/,/g, '٬').replace(/\./g, '٫');
}
export const toman = (n, lang) => (typeof n !== 'number' ? fmtNum(n, lang) : lang === 'fa' ? `${fmtNum(n, lang)} تومان` : `${fmtNum(n, lang)} Toman`);
// Short Persian amounts for chart axes: ۱٫۲ میلیون، ۵۰۰ هزار.
export function faCompact(n) {
  const a = Math.abs(n);
  if (a >= 1e9) return `${faNum(Math.round(n / 1e8) / 10)} میلیارد`;
  if (a >= 1e6) return `${faNum(Math.round(n / 1e5) / 10)} میلیون`;
  if (a >= 1e3) return `${faNum(Math.round(n / 1e3))} هزار`;
  return faNum(Math.round(n));
}

export function fmtTime(iso, lang) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const opts = { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' };
  return lang === 'fa' ? new Intl.DateTimeFormat('fa-IR', opts).format(d) : `${new Intl.DateTimeFormat('en-GB', opts).format(d)}`;
}
// A calendar date in the Persian (Solar Hijri) calendar: ۲۵ دی ۱۴۰۵.
export function faDate(d, { year = true } = {}) {
  const opts = { day: 'numeric', month: 'long', timeZone: 'Asia/Tehran', ...(year ? { year: 'numeric' } : {}) };
  return new Intl.DateTimeFormat('fa-IR', opts).format(d);
}

// Latin values inside Persian text are isolated so they can't reorder the line.
export const v = (x) => `<bdi>${esc(x)}</bdi>`;
export const pill = (kind, label) => `<span class="pill pill-${kind}">${esc(label)}</span>`;

export function logoSvg() {
  try {
    const svg = fs.readFileSync(path.join(ASSETS, 'liara-logo.svg'), 'utf8');
    // The file was checked to contain no scripts or external references.
    return /<script|on\w+=|href="http/i.test(svg) ? '' : svg.replace('<svg ', '<svg role="img" aria-label="Liara" class="logo" ');
  } catch {
    return '';
  }
}

export function fontFaces(lang) {
  if (lang !== 'fa') return '';
  const face = (file, weight) => {
    try {
      const b64 = fs.readFileSync(path.join(ASSETS, 'fonts', file)).toString('base64');
      return `@font-face{font-family:"Vazirmatn";font-weight:${weight};font-style:normal;font-display:swap;src:url(data:font/ttf;base64,${b64}) format("truetype");}`;
    } catch {
      return '';
    }
  };
  return face('Vazirmatn-Regular.ttf', 400) + face('Vazirmatn-Bold.ttf', 700);
}
