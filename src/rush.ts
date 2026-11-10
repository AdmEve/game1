/**
 * Today's «ساعت شلوغی» level, prepared ahead (C11): hardening it takes a phone a few seconds, so it starts in a worker
 * when home opens, and is kept for the rest of the day (memory, then storage across restarts). Without a worker
 * (older WebViews) the day's level is played as generated.
 */
import { dailyLevel, today } from './game/daily';
import type { Level } from './game/rules';

const KEY = 'rahbandoon.rush';
/** Bump when the rush's making changes, so a stored level from the old way is made again. */
const MAKE = 1;
let ready: { day: string; level: Level | null } | null = null;
let pending: { day: string; p: Promise<Level | null> } | null = null;

/** Whether today's level is ready to play now. */
export const rushReady = () => ready?.day === today();

export function prepareRush(): Promise<Level | null> {
  const day = today();
  if (ready?.day === day) return Promise.resolve(ready.level);
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { day: string; make: number; level: Level | null } | null;
    if (s && s.day === day && s.make === MAKE && s.level) { ready = { day, level: s.level }; return Promise.resolve(s.level); }
  } catch { /* nothing stored */ }
  if (pending?.day === day) return pending.p;
  const p = new Promise<Level | null>((resolve) => {
    const finish = (level: Level | null, keep: boolean) => {
      ready = { day, level }; pending = null;
      if (keep) try { localStorage.setItem(KEY, JSON.stringify({ day, make: MAKE, level })); } catch { /* storage full or blocked */ }
      resolve(level);
    };
    let w: Worker;
    try { w = new Worker(new URL('./workers/daily.worker.ts', import.meta.url), { type: 'module' }); } catch { finish(dailyLevel(day), false); return; }
    w.onmessage = (e: MessageEvent<{ day: string; level: Level | null }>) => { w.terminate(); finish(e.data.level ?? dailyLevel(day), !!e.data.level); };
    w.onerror = () => { w.terminate(); finish(dailyLevel(day), false); };
    w.postMessage({ day });
  });
  pending = { day, p };
  return p;
}
