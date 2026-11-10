/** The hint solver, off the main thread: a deep search can take a second on a phone, and it must never stall a frame. */
import { hintFor } from '../game/solver';
import type { Level, State } from '../game/rules';

self.onmessage = (e: MessageEvent<{ id: number; level: Level; state: State; limit: number; maxBays: number }>) => {
  const { id, level, state, limit, maxBays } = e.data;
  state.level = level;
  (self as unknown as Worker).postMessage({ id, ...hintFor(level, state, limit, maxBays) });
};
