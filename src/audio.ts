/**
 * Synthesised sound effects (no audio files yet): car horns, engines, tire chirps, boarding pops,
 * coins, a police whistle and a santur-like plucked string for wins.
 */
import { save } from './save';

let ctx: AudioContext | null = null;
let master: GainNode;
let noiseBuf: AudioBuffer;

let out: AudioNode;

/** The shared audio context and output (also used by the music), created on first use. */
export function audioOut(): { c: AudioContext; out: AudioNode } | null {
  if (!ctx) {
    try {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.55;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      master.connect(comp).connect(ctx.destination);
      out = comp;
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch { return null; }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return { c: ctx, out };
}

function ac(): AudioContext | null {
  if (!save.settings.sound) return null;
  return audioOut()?.c ?? null;
}

function env(c: AudioContext, t: number, a: number, peak: number, d: number) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  return g;
}
function osc(c: AudioContext, type: OscillatorType, f: number, t: number, dur: number) {
  const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(t + dur + 0.05); return o;
}
function noise(c: AudioContext, t: number, dur: number) {
  const n = c.createBufferSource(); n.buffer = noiseBuf; n.loop = true; n.start(t, Math.random() * 0.5); n.stop(t + dur + 0.05); return n;
}

/** Car horn. Old cars (Peykan) honk lower and rougher than new ones. */
export function horn(kind: 'old' | 'new' | 'bus' = 'new', times = 1, delay = 0) {
  const c = ac(); if (!c) return;
  const [f1, f2] = kind === 'old' ? [370, 440] : kind === 'bus' ? [220, 277] : [440, 554];
  for (let k = 0; k < times; k++) {
    const t = c.currentTime + delay + k * 0.2, dur = times > 1 ? 0.12 : 0.28;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = kind === 'bus' ? 700 : 1100; bp.Q.value = 1.4;
    const g = env(c, t, 0.01, 0.22, dur);
    for (const f of [f1, f2]) osc(c, 'square', f * (1 + (Math.random() - 0.5) * 0.01), t, dur).connect(bp);
    bp.connect(g).connect(master);
  }
}

/** The wedding convoy's honking rhythm (ta-ta, ta-ta-ta), two cars answering each other. */
export function weddingHorns(delay = 0) {
  const c = ac(); if (!c) return;
  const beats = [0, 0.16, 0.48, 0.62, 0.76, 1.1, 1.26, 1.58, 1.72, 1.86];
  beats.forEach((b, k) => {
    const t = c.currentTime + delay + b, [f1, f2] = k % 5 < 2 ? [440, 554] : [392, 494];
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 1.4;
    const g = env(c, t, 0.01, 0.2, 0.11);
    for (const f of [f1, f2]) osc(c, 'square', f * (1 + (Math.random() - 0.5) * 0.01), t, 0.11).connect(bp);
    bp.connect(g).connect(master);
  });
}

/** Engine pull-away: a rising growl. */
export function engine(delay = 0, heavy = false) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay, dur = 0.7;
  const o = osc(c, 'sawtooth', heavy ? 45 : 70, t, dur);
  o.frequency.exponentialRampToValueAtTime(heavy ? 95 : 160, t + 0.45);
  o.frequency.exponentialRampToValueAtTime(heavy ? 80 : 130, t + dur);
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
  const g = env(c, t, 0.05, 0.16, dur);
  o.connect(lp).connect(g).connect(master);
}

/** Tire chirp when a car launches or turns hard. */
export function chirp(delay = 0, vol = 0.07) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 6;
  noise(c, t, 0.18).connect(bp).connect(env(c, t, 0.01, vol, 0.16)).connect(master);
}

export function bump() {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  const o = osc(c, 'sine', 120, t, 0.15); o.frequency.exponentialRampToValueAtTime(60, t + 0.12);
  o.connect(env(c, t, 0.005, 0.3, 0.13)).connect(master);
}

/** A passenger hops in. Pitch climbs as the car fills. */
export function pop(fill = 0) {
  const c = ac(); if (!c) return;
  const t = c.currentTime, f = 520 * 2 ** (fill * 0.75);
  const o = osc(c, 'sine', f, t, 0.1); o.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.07);
  o.connect(env(c, t, 0.005, 0.14, 0.09)).connect(master);
}

export function coin(delay = 0) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + delay;
  osc(c, 'triangle', 1318, t, 0.08).connect(env(c, t, 0.004, 0.12, 0.08)).connect(master);
  osc(c, 'triangle', 1760, t + 0.07, 0.25).connect(env(c, t + 0.07, 0.004, 0.12, 0.25)).connect(master);
}

export function click() {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  osc(c, 'square', 1800, t, 0.02).connect(env(c, t, 0.001, 0.05, 0.02)).connect(master);
}

/** Traffic police whistle: two sharp blasts with a trill. */
export function whistleSound() {
  const c = ac(); if (!c) return;
  for (const [d, len] of [[0, 0.18], [0.26, 0.45]]) {
    const t = c.currentTime + d;
    const o = osc(c, 'sine', 2900, t, len);
    const lfo = osc(c, 'sine', 34, t, len); const lg = c.createGain(); lg.gain.value = 140; lfo.connect(lg).connect(o.frequency);
    o.connect(env(c, t, 0.01, 0.12, len)).connect(master);
  }
}

/** Crane motor whine plus a clank. */
export function craneSound() {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  const o = osc(c, 'sawtooth', 180, t, 1.0); o.frequency.linearRampToValueAtTime(260, t + 0.8);
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
  o.connect(lp).connect(env(c, t, 0.05, 0.06, 0.95)).connect(master);
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 3;
  noise(c, t + 1.0, 0.1).connect(bp).connect(env(c, t + 1.0, 0.002, 0.2, 0.1)).connect(master);
}

/** A plucked string (Karplus–Strong), close to a santur. Buffers are cached per pitch. */
const plucks = new Map<string, AudioBuffer>();
export function pluckBuffer(c: AudioContext, f: number, decay = 0.4985, dur = 1.4): AudioBuffer {
  const key = `${Math.round(f * 10)}:${decay}:${dur}`;
  const hit = plucks.get(key); if (hit) return hit;
  const sr = c.sampleRate, len = Math.floor(sr * dur), buf = c.createBuffer(1, len, sr), d = buf.getChannelData(0);
  const p = Math.max(2, Math.round(sr / f)), ring = new Float32Array(p);
  for (let i = 0; i < p; i++) ring[i] = Math.random() * 2 - 1;
  for (let i = 0, k = 0; i < len; i++, k = (k + 1) % p) {
    const nx = (k + 1) % p;
    d[i] = ring[k];
    ring[k] = decay * (ring[k] + ring[nx]);
  }
  plucks.set(key, buf);
  return buf;
}
function pluck(f: number, delay: number, vol = 0.2) {
  const c = ac(); if (!c) return;
  const s = c.createBufferSource(); s.buffer = pluckBuffer(c, f);
  const g = c.createGain(); g.gain.value = vol;
  s.connect(g).connect(master);
  s.start(c.currentTime + delay);
}

/** Win: a bright run in Mahur (Persian major mode). */
export function win() {
  const notes = [392, 440, 494, 523, 587, 659, 784];
  notes.forEach((f, i) => pluck(f, i * 0.07, 0.18));
  [523, 659, 784].forEach((f) => pluck(f, 0.62, 0.14));
}
export function lose() {
  [392, 370, 311, 262].forEach((f, i) => pluck(f, i * 0.16, 0.16));
}

// ───── Weather sounds ─────
let ambBuf: AudioBuffer | null = null;
let amb: { src: AudioBufferSourceNode; gain: GainNode; lfo?: OscillatorNode } | null = null;

/** A four-second noise loop, long enough that the repeat isn't noticeable. */
function ambNoise(c: AudioContext) {
  if (!ambBuf) {
    ambBuf = c.createBuffer(1, c.sampleRate * 4, c.sampleRate);
    const d = ambBuf.getChannelData(0); let b = 0;
    for (let i = 0; i < d.length; i++) { b = b * 0.6 + (Math.random() * 2 - 1) * 0.4; d[i] = b; }
  }
  return ambBuf;
}

/** The bed of sound under a map's weather: rain hiss, a storm, or a low wind. `null` fades it out. */
export function ambience(kind: 'rain' | 'storm' | 'snow' | 'dust' | null) {
  const c = ac();
  const old = amb; amb = null;
  if (old && ctx) { old.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4); setTimeout(() => { try { old.src.stop(); old.lfo?.stop(); } catch { /* already stopped */ } }, 1800); }
  if (!c || !kind) return;
  const src = c.createBufferSource(); src.buffer = ambNoise(c); src.loop = true;
  const gain = c.createGain(); gain.gain.value = 0;
  const f = c.createBiquadFilter();
  let lfo: OscillatorNode | undefined, level = 0.05;
  if (kind === 'rain' || kind === 'storm') {
    f.type = 'bandpass'; f.frequency.value = kind === 'storm' ? 2600 : 3400; f.Q.value = 0.35; level = kind === 'storm' ? 0.12 : 0.075;
  } else {
    f.type = 'lowpass'; f.frequency.value = 420; level = 0.05;
    // The wind swells and fades.
    lfo = c.createOscillator(); lfo.frequency.value = 0.12;
    const depth = c.createGain(); depth.gain.value = 260; lfo.connect(depth).connect(f.frequency); lfo.start();
  }
  src.connect(f).connect(gain).connect(out); src.start();
  gain.gain.setTargetAtTime(level, c.currentTime, 0.8);
  amb = { src, gain, lfo };
}

/** A rumble of thunder after a flash. */
export function thunder() {
  const c = ac(); if (!c) return;
  const t = c.currentTime;
  const n = noise(c, t, 2.6), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(260, t); lp.frequency.exponentialRampToValueAtTime(70, t + 2.4);
  n.connect(lp).connect(env(c, t, 0.12, 0.55, 2.3)).connect(out);
  const o = osc(c, 'sine', 62, t, 2.2); o.frequency.exponentialRampToValueAtTime(34, t + 2.1);
  o.connect(env(c, t, 0.1, 0.3, 2.0)).connect(out);
}
