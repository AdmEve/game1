/** The hint solver, off the main thread: a deep search can take a second on a phone, and it must never stall a frame. */
import { hintFor, losingMove } from '../game/solver';
import type { Level, State } from '../game/rules';

type Ask = { id: number; level: Level; state: State; limit: number; maxBays: number; kind?: undefined }
  | { id: number; level: Level; snaps: State[]; limit: number; kind: 'review' };

self.onmessage = (e: MessageEvent<Ask>) => {
  // After a loss: which of the player's taps lost it (C12).
  if (e.data.kind === 'review') {
    const { id, level, snaps, limit } = e.data;
    for (const s of snaps) s.level = level;
    (self as unknown as Worker).postMessage({ id, review: losingMove(level, snaps, limit) });
    return;
  }
  const { id, level, state, limit, maxBays } = e.data;
  state.level = level;
  (self as unknown as Worker).postMessage({ id, ...hintFor(level, state, limit, maxBays) });
};
