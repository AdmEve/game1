import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function storage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, String(v)); }, removeItem: (k: string) => { m.delete(k); } };
}

describe('device report', () => {
  beforeEach(() => { vi.resetModules(); vi.stubGlobal('localStorage', storage()); performance.clearMeasures(); });
  afterEach(() => { vi.unstubAllGlobals(); performance.clearMeasures(); });

  it('keeps the last five cold starts with their stage timings', async () => {
    const { recordBoot, boots } = await import('../src/devreport');
    for (let i = 0; i < 7; i++) {
      performance.clearMeasures();
      performance.measure('fleet', { start: 0, duration: 100 + i });
      recordBoot();
    }
    const b = boots();
    expect(b).toHaveLength(5);
    expect(b[0].fleet).toBe(102);
    expect(b[4].fleet).toBe(106);
    expect(b[4].ready).toBeGreaterThan(0);
  });

  it('reads as one fact per line, GPU name included', async () => {
    vi.stubGlobal('screen', { width: 393, height: 873 });
    vi.stubGlobal('devicePixelRatio', 2.75);
    vi.stubGlobal('innerWidth', 393);
    vi.stubGlobal('innerHeight', 800);
    const { recordBoot, deviceReport } = await import('../src/devreport');
    performance.measure('compile', { start: 0, duration: 47 });
    recordBoot();
    const gl = { getExtension: () => ({ UNMASKED_RENDERER_WEBGL: 37446 }), getParameter: (k: number) => (k === 37446 ? 'Adreno (TM) 610' : '?'), RENDERER: 7937 };
    const text = deviceReport('Rahbandoon 1.0 (abc)', gl as unknown as WebGL2RenderingContext, { Profile: 'auto, lite' });
    const lines = text.split('\n');
    expect(lines[0]).toBe('Rahbandoon 1.0 (abc)');
    expect(text).toContain('GPU: Adreno (TM) 610');
    expect(text).toContain('Screen: 393x873 @2.75, view 393x800');
    expect(text).toContain('Profile: auto, lite');
    expect(lines.at(-1)).toMatch(/ready \d+ {2}compile 47/);
  });

  it('survives a GPU that hides its name and storage that throws', async () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } });
    const { recordBoot, boots, gpuName } = await import('../src/devreport');
    expect(() => recordBoot()).not.toThrow();
    expect(boots()).toEqual([]);
    expect(gpuName({ getExtension: () => { throw new Error('nope'); } } as unknown as WebGL2RenderingContext)).toBe('unknown');
  });
});
