import { describe, expect, it } from 'vitest';
import { createPacer, type PaceMemory } from '../src/render/pacing';

/** Drive the pacer with a 60 Hz rAF where each rendered frame actually takes `frameMs`. */
function run(p: ReturnType<typeof createPacer>, seconds: number, frameMs: number, start = 0) {
  let t = start, last = start;
  const end = start + seconds * 1000;
  while (t < end) {
    t += 1000 / 60;
    if (t - last < frameMs - 0.5) continue; // the GPU is still busy: this refresh is missed
    const dt = p.frame(t);
    if (dt === null) continue;
    p.observe(t, (t - last) / 1000);
    last = t;
  }
  return t;
}

describe('frame pacing governor', () => {
  it('steps the resolution down on a phone that cannot hold 60 fps, and remembers it', () => {
    let scale = 1, memory: PaceMemory | null = null;
    const p = createPacer({ adaptive: () => true, onScale: (s) => { scale = s; }, remember: (m) => { memory = m; } });
    run(p, 20, 33.3);
    expect(scale).toBeLessThan(1);
    expect(memory).not.toBeNull();
    // A new launch starts where it settled.
    let scale2 = 1;
    const p2 = createPacer({ adaptive: () => true, onScale: (s) => { scale2 = s; }, memory });
    expect(p2.state.scale).toBe(scale);
    expect(scale2).toBe(1); // no change event needed: it starts there
  });

  it('keeps full resolution (or sharper) on a phone that holds 60 fps', () => {
    let scale = 1;
    const p = createPacer({ adaptive: () => true, onScale: (s) => { scale = s; } });
    run(p, 30, 16.7);
    expect(scale).toBeGreaterThanOrEqual(1);
  });

  it('steps down on a phone at ~20 fps too (its slow rAF must not hide the problem)', () => {
    let scale = 1;
    const p = createPacer({ adaptive: () => true, onScale: (s) => { scale = s; } });
    run(p, 20, 50);
    expect(scale).toBeLessThan(1);
  });

  it('does nothing outside auto quality', () => {
    let changed = false;
    const p = createPacer({ adaptive: () => false, onScale: () => { changed = true; } });
    run(p, 20, 40);
    expect(changed).toBe(false);
  });
});
