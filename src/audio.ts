import { meta } from './save';

/**
 * Small synthesised sound set (no audio files): taps, a year chime, good/bad stings, a coin
 * sound and a soft santur-like arpeggio in the Shur mode for big moments.
 */
let ctx: AudioContext | null = null;
let master: GainNode;

function ac(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.5;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12;
      master.connect(comp);
      comp.connect(ctx.destination);
    } catch { return null; }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function pluck(freq: number, delay = 0, dur = 0.5, vol = 0.18, type: OscillatorType = 'triangle') {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const o2 = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o2.type = 'sine';
  o.frequency.setValueAtTime(freq, t);
  o2.frequency.setValueAtTime(freq * 2.003, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const g2 = c.createGain();
  g2.gain.value = 0.25;
  o.connect(g);
  o2.connect(g2);
  g2.connect(g);
  g.connect(master);
  o.start(t);
  o2.start(t);
  o.stop(t + dur + 0.05);
  o2.stop(t + dur + 0.05);
}

// Shur on D: D, E-koron (~quarter flat), F, G, A, Bb, C, D.
const D = 293.66;
const SHUR = [1, 1.0864, 1.1892, 1.3348, 1.4983, 1.5874, 1.7818, 2];

export type Sfx = 'tap' | 'year' | 'good' | 'bad' | 'coin' | 'big' | 'death' | 'open';

export function sfx(kind: Sfx) {
  if (!meta.settings.sound) return;
  switch (kind) {
    case 'tap': pluck(D * 2, 0, 0.12, 0.08, 'sine'); break;
    case 'open': pluck(D * SHUR[4], 0, 0.18, 0.08, 'sine'); break;
    case 'year': [0, 2, 4].forEach((n, i) => pluck(D * SHUR[n], i * 0.07, 0.45, 0.12)); break;
    case 'good': [2, 4, 7].forEach((n, i) => pluck(D * SHUR[n], i * 0.08, 0.5, 0.13)); break;
    case 'bad': [3, 1].forEach((n, i) => pluck(D * SHUR[n] * 0.5, i * 0.12, 0.6, 0.14, 'sawtooth')); break;
    case 'coin': [7, 7].forEach((n, i) => pluck(D * SHUR[n] * 2, i * 0.07, 0.25, 0.08, 'square')); break;
    case 'big': [0, 2, 4, 5, 7].forEach((n, i) => pluck(D * SHUR[n], i * 0.09, 0.7, 0.13)); break;
    case 'death': [4, 3, 2, 1, 0].forEach((n, i) => pluck(D * SHUR[n] * 0.5, i * 0.22, 1.1, 0.12)); break;
  }
}
