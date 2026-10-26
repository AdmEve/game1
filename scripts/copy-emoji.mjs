// Copies the Twemoji SVGs for every emoji used in src/ into public/emoji/, so the game shows
// the same flat emoji on every phone (old Android versions have outdated or missing emoji).
import { readdirSync, readFileSync, statSync, mkdirSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = join(root, 'src');
const out = join(root, 'public/emoji');
const twemoji = join(root, 'node_modules/@twemoji/svg');

const RE = /(?:\p{RI}\p{RI}|[#*0-9]️?⃣|\p{Extended_Pictographic}(?:️|[\u{1F3FB}-\u{1F3FF}])?(?:‍\p{Extended_Pictographic}(?:️|[\u{1F3FB}-\u{1F3FF}])?)*)/gu;

export function codeOf(e) {
  const cps = [...e].map((ch) => ch.codePointAt(0).toString(16));
  // Twemoji drops FE0F unless the sequence has a zero-width joiner.
  return (e.includes('‍') ? cps : cps.filter((c) => c !== 'fe0f')).join('-');
}

function walk(dir, files = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (/\.(ts|css|html)$/.test(f)) files.push(p);
  }
  return files;
}

const found = new Set();
for (const f of walk(src)) for (const m of readFileSync(f, 'utf8').matchAll(RE)) found.add(m[0]);

if (existsSync(out)) rmSync(out, { recursive: true });
mkdirSync(out, { recursive: true });
let n = 0;
const missing = [];
for (const e of found) {
  let code = codeOf(e);
  let file = join(twemoji, `${code}.svg`);
  if (!existsSync(file)) {
    code = [...e].map((ch) => ch.codePointAt(0).toString(16)).join('-');
    file = join(twemoji, `${code}.svg`);
  }
  if (!existsSync(file)) { missing.push(e); continue; }
  copyFileSync(file, join(out, `${codeOf(e)}.svg`));
  n++;
}
console.log(`emoji: ${n} copied${missing.length ? `, missing: ${missing.join(' ')}` : ''}`);
