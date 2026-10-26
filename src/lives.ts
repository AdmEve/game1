/**
 * Lives «جون»: five hearts; giving up on a lost Journey level costs one, and one grows back every
 * half hour. The first levels are free so new players never meet the wall.
 */
import { persist, save } from './save';

export const MAX_LIVES = 5;
export const REGEN_MS = 30 * 60 * 1000;
/** Levels below this (0-based) never cost a life. */
export const FREE_LEVELS = 12;

/** Bring the count up to date with the clock and return it. */
export function lives(now = Date.now()): number {
  const l = save.lives;
  if (l.n >= MAX_LIVES) { l.next = 0; return l.n; }
  if (!l.next) l.next = now + REGEN_MS;
  let changed = false;
  while (l.n < MAX_LIVES && now >= l.next) { l.n++; l.next += REGEN_MS; changed = true; }
  if (l.n >= MAX_LIVES) l.next = 0;
  if (changed) persist();
  return l.n;
}

/** Milliseconds until the next life (0 when full). */
export const msToNext = (now = Date.now()) => (lives(now) >= MAX_LIVES ? 0 : Math.max(0, save.lives.next - now));

export function loseLife(now = Date.now()) {
  lives(now);
  if (save.lives.n <= 0) return;
  if (save.lives.n === MAX_LIVES) save.lives.next = now + REGEN_MS;
  save.lives.n--;
  persist();
}

export function addLives(k: number) {
  lives();
  save.lives.n = Math.min(MAX_LIVES, save.lives.n + k);
  if (save.lives.n >= MAX_LIVES) save.lives.next = 0;
  persist();
}

/** «۲۴:۰۵» style countdown. */
export function clock(ms: number) {
  const s = Math.ceil(ms / 1000), m = Math.floor(s / 60), r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
}
