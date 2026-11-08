/**
 * A small log of script errors on this device (the last 20, repeats counted), so a tester can send what went
 * wrong from Settings. Nothing leaves the phone unless the player shares it.
 */
const KEY = 'rahbandoon.errors';
const MAX = 20;
export interface ErrEntry { t: number; m: string; at?: string; n: number; build: string }

declare const __BUILD__: string;
const build = typeof __BUILD__ === 'string' ? __BUILD__ : 'dev';

export function errors(): ErrEntry[] {
  try { const l = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(l) ? l : []; } catch { return []; }
}

export function logError(message: string, at?: string, now = Date.now()) {
  const list = errors();
  const m = String(message).slice(0, 300);
  const last = list[list.length - 1];
  if (last && last.m === m && last.at === at) { last.n++; last.t = now; }
  else list.push({ t: now, m, at, n: 1, build });
  while (list.length > MAX) list.shift();
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage full */ }
}

export function clearErrors() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }

/** The log as plain text, for sharing. */
export function errorReport(): string {
  return errors().map((e) => `${new Date(e.t).toISOString()} [${e.build}]${e.n > 1 ? ` ×${e.n}` : ''} ${e.m}${e.at ? ` @ ${e.at}` : ''}`).join('\n');
}

export function installErrorLog() {
  window.addEventListener('error', (e) => logError(e.message || 'error', e.filename ? `${e.filename.split('/').pop()}:${e.lineno}:${e.colno}` : undefined));
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as { message?: string; stack?: string } | undefined;
    logError(r?.message ?? String(r), r?.stack?.split('\n')[1]?.trim());
  });
}
