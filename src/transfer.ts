/**
 * «انتقال پیشرفت»: the whole save as a short text code, to carry to a new phone or a reinstall (Cafe Bazaar has no
 * cloud save, and progress lost with a phone is the commonest complaint in the store's reviews of games like this).
 *
 * The code is `RB1.<deflated save, base64url>.<check>`. The check catches a code cut short or mistyped (messengers wrap
 * and trim long text) and makes hand-editing the coins less inviting; it is not security. What stays with the phone:
 * Bazaar purchases (`owned`, restored from the player's Bazaar account at start), the graphics quality (chosen for this
 * phone's GPU) and the reminders (this phone's notification permission).
 */
import { normalize, SAVE_VERSION, type Save } from './save';

const MARK = 'RB1';
const SALT = 'rahbandoon:tehran-gridlock';

/** FNV-1a, 32-bit, in base 36: short enough to type, enough to catch a damaged code. */
function check(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

const b64url = (bytes: Uint8Array) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64url = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function deflate(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function inflate(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Response(stream).text();
}

/** The code for a save. */
export async function makeCode(s: Save): Promise<string> {
  // Purchases come back from Bazaar on the other phone; tester switches stay here.
  const { owned: _owned, devUnlock: _dev, ...rest } = s;
  const data = b64url(await deflate(JSON.stringify(rest)));
  return `${MARK}.${data}.${check(SALT + data)}`;
}

export type ReadResult = { ok: true; save: Partial<Save> } | { ok: false; why: 'none' | 'broken' | 'newer' };

/**
 * A code read back from whatever was pasted: a messenger may have wrapped it, added marks around it (Persian text
 * carries invisible direction marks), or kept the words it was shared with.
 */
export async function readCode(text: string): Promise<ReadResult> {
  const flat = text.replace(/[\s​-‏‪-‮⁦-⁩﻿]+/g, '');
  const m = /RB1\.([A-Za-z0-9_-]+)\.([0-9a-z]+)/.exec(flat);
  if (!m) return { ok: false, why: 'none' };
  if (check(SALT + m[1]) !== m[2]) return { ok: false, why: 'broken' };
  let s: Partial<Save> | null;
  try { s = JSON.parse(await inflate(unb64url(m[1]))) as Partial<Save> | null; } catch { return { ok: false, why: 'broken' }; }
  if (!s || typeof s !== 'object' || !Number.isFinite(s.level) || !Number.isFinite(s.coins) || s.level! < 0 || s.coins! < 0) return { ok: false, why: 'broken' };
  if ((s.v ?? 1) > SAVE_VERSION) return { ok: false, why: 'newer' };
  return { ok: true, save: s };
}

/** The save this phone will have: the code's progress, with what stays with the phone kept from `here`. */
export function merged(from: Partial<Save>, here: Save): Save {
  const next = normalize({ ...from, settings: { ...here.settings, ...from.settings } });
  next.owned = { ...here.owned };
  next.settings.quality = here.settings.quality;
  next.settings.notify = here.settings.notify;
  next.notifyAsked = here.notifyAsked;
  if (here.devUnlock) next.devUnlock = true; else delete next.devUnlock;
  return next;
}
