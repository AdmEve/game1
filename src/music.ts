/**
 * Adaptive background music, synthesised live: a 6/8 Persian pop groove in Mahur (major) with tombak,
 * bass, a soft pad and a santur melody. A tension layer (daf shaker, busier tombak, drone) fades in as
 * the parking bays fill up.
 */
import { audioOut, pluckBuffer } from './audio';
import { save } from './save';

// Per-chapter mood: tempo (dotted quarters per minute), tonic and mode. Persian modes use quarter tones
// («کرن»), so scale steps may be fractional semitones.
const MOODS = {
  day: { bpm: 92, tonic: 293.66, scale: [0, 2, 4, 5, 7, 9, 11], perc: 1 }, // Mahur on D: bright
  sunset: { bpm: 80, tonic: 329.63, scale: [0, 1.5, 3, 5, 7, 8, 10], perc: 0.8 }, // Shur on E: wistful
  night: { bpm: 84, tonic: 261.63, scale: [0, 2, 3, 5, 7, 8, 11], perc: 0.6 }, // Bayat-e Esfahan on C: mysterious
};
let E = 60 / MOODS.day.bpm / 3; // one eighth note
let TONIC = MOODS.day.tonic;
let SCALE = MOODS.day.scale;
let PERC = 1;

export function setMood(m: keyof typeof MOODS) {
  const x = MOODS[m];
  E = 60 / x.bpm / 3; TONIC = x.tonic; SCALE = x.scale; PERC = x.perc;
}
const freq = (deg: number, oct = 0) => {
  const o = Math.floor(deg / 7), d = ((deg % 7) + 7) % 7;
  return TONIC * 2 ** ((SCALE[d] + 12 * (o + oct)) / 12);
};

// Chords per bar (scale degree of the root; minor chords use the scale's own thirds).
const CHORDS = [0, 0, 3, 3, 4, 4, 0, 0, 5, 5, 3, 3, 1, 1, 4, 4];
// Melody per bar: [degree, length in eighths]. Degrees above 6 continue into the next octave.
const MELODY: [number, number][][] = [
  [[4, 2], [3, 1], [2, 1], [3, 1], [4, 1]], [[4, 3], [7, 3]],
  [[5, 2], [4, 1], [3, 2], [2, 1]], [[3, 3], [1, 3]],
  [[4, 1], [5, 1], [6, 1], [7, 2], [6, 1]], [[5, 3], [4, 3]],
  [[2, 1], [3, 1], [4, 1], [3, 1], [2, 1], [1, 1]], [[0, 6]],
  [[5, 2], [7, 1], [8, 2], [7, 1]], [[5, 6]],
  [[3, 2], [5, 1], [7, 2], [5, 1]], [[4, 3], [3, 3]],
  [[1, 2], [3, 1], [5, 2], [4, 1]], [[3, 3], [2, 3]],
  [[4, 1], [6, 1], [8, 1], [7, 1], [6, 1], [4, 1]], [[4, 6]],
];

let c: AudioContext | null = null;
let bus: GainNode, melodyGain: GainNode, tensionGain: GainNode, noise: AudioBuffer;
let timer = 0, nextTime = 0, step = 0;
let tension = 0, tensionTarget = 0;
let playing = false;

function init(offline?: { c: AudioContext; out: AudioNode }) {
  const o = offline ?? audioOut();
  if (!o) return false;
  c = o.c;
  bus = c.createGain(); bus.gain.value = 0;
  melodyGain = c.createGain(); melodyGain.gain.value = 1;
  tensionGain = c.createGain(); tensionGain.gain.value = 0;
  // A short room reverb gives the santur and tombak some air.
  const rev = c.createConvolver();
  const len = Math.floor(c.sampleRate * 1.6), ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3; }
  rev.buffer = ir;
  const wet = c.createGain(); wet.gain.value = 0.22;
  melodyGain.connect(bus); tensionGain.connect(bus);
  bus.connect(o.out); bus.connect(rev).connect(wet).connect(o.out);
  noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  return true;
}

function env(t: number, a: number, peak: number, d: number, dest: AudioNode) {
  const g = c!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  g.connect(dest);
  return g;
}

function santur(f: number, t: number, len: number, vol: number) {
  // Long notes are played as a tremolo, the santur's signature.
  const hits = len >= 3 ? Math.round(len * 2) : 1;
  for (let k = 0; k < hits; k++) {
    const s = c!.createBufferSource(); s.buffer = pluckBuffer(c!, f, 0.4993, 1.6);
    const g = c!.createGain(); g.gain.value = vol * (k === 0 ? 1 : 0.42 * (1 - (k / hits) * 0.5));
    s.connect(g).connect(melodyGain);
    s.start(t + k * (E / 2));
  }
}

function bass(f: number, t: number, len: number) {
  const o = c!.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
  const lp = c!.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
  o.connect(lp).connect(env(t, 0.01, 0.22, len * E * 0.9, bus));
  o.start(t); o.stop(t + len * E + 0.1);
}

function pad(root: number, t: number) {
  for (const deg of [root, root + 2, root + 4]) {
    for (const det of [-6, 6]) {
      const o = c!.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq(deg, -1); o.detune.value = det;
      const lp = c!.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
      const g = c!.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.012, t + 0.35); g.gain.linearRampToValueAtTime(0.0001, t + 6 * E + 0.3);
      o.connect(lp).connect(g).connect(bus);
      o.start(t); o.stop(t + 6 * E + 0.4);
    }
  }
}

function tom(t: number, vol = 0.5) {
  const o = c!.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(58, t + 0.14);
  o.connect(env(t, 0.004, vol, 0.26, bus)); o.start(t); o.stop(t + 0.32);
}
function bak(t: number, vol = 0.18, dest: AudioNode = bus) {
  const n = c!.createBufferSource(); n.buffer = noise;
  const bp = c!.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2800; bp.Q.value = 1.6;
  n.connect(bp).connect(env(t, 0.002, vol, 0.07, dest)); n.start(t, Math.random() * 0.8); n.stop(t + 0.1);
  const o = c!.createOscillator(); o.type = 'triangle'; o.frequency.value = 520;
  o.connect(env(t, 0.002, vol * 0.5, 0.05, dest)); o.start(t); o.stop(t + 0.08);
}
function shaker(t: number, vol: number) {
  const n = c!.createBufferSource(); n.buffer = noise;
  const hp = c!.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6500;
  n.connect(hp).connect(env(t, 0.004, vol, 0.05, tensionGain)); n.start(t, Math.random() * 0.8); n.stop(t + 0.08);
}

function schedule(i: number, t: number) {
  const pos = i % 6, bar = Math.floor(i / 6) % 16;
  const root = CHORDS[bar];
  if (pos === 0) {
    pad(root, t);
    // Melody notes that start in this bar.
    let at = 0;
    for (const [deg, len] of MELODY[bar]) { santur(freq(deg, 1), t + at * E, len, 0.17); at += len; }
  }
  // Bass: root on 1, fifth on 4, a passing note on 6.
  if (pos === 0) bass(freq(root, -2), t, 3);
  if (pos === 3) bass(freq(root + 4, -2), t, 2);
  if (pos === 5) bass(freq(root + (bar % 2 ? 5 : 2), -2), t, 1);
  // Tombak in 6/8: tom on 1 and 4, bak on 3 and 5, a fill every fourth bar.
  if (pos === 0 || pos === 3) tom(t, (pos === 0 ? 0.5 : 0.36) * PERC);
  if (pos === 2 || pos === 4) bak(t, 0.18 * PERC);
  if (bar % 4 === 3 && pos >= 4) { bak(t + E / 2, 0.12); bak(t + E / 4, 0.08); }
  // Tension layer: sixteenth shakers and an extra bak roll.
  if (tension > 0.02) {
    shaker(t, 0.06); shaker(t + E / 2, 0.035);
    if (pos === 1 || pos === 5) bak(t, 0.14, tensionGain);
  }
}

function tickScheduler() {
  if (!c) return;
  tension += (tensionTarget - tension) * 0.08;
  tensionGain.gain.setTargetAtTime(tension, c.currentTime, 0.3);
  melodyGain.gain.setTargetAtTime(1 - tension * 0.45, c.currentTime, 0.3);
  while (nextTime < c.currentTime + 0.2) { schedule(step, nextTime); nextTime += E; step++; }
}

export function startMusic() {
  if (!save.settings.music || playing) return;
  if (!c && !init()) return;
  playing = true;
  nextTime = c!.currentTime + 0.1;
  bus.gain.cancelScheduledValues(c!.currentTime);
  bus.gain.setTargetAtTime(0.6, c!.currentTime, 0.8);
  timer = window.setInterval(tickScheduler, 40);
}

export function stopMusic(fade = 0.6) {
  if (!c || !playing) return;
  playing = false;
  bus.gain.setTargetAtTime(0, c.currentTime, fade / 3);
  const t = timer;
  setTimeout(() => clearInterval(t), fade * 1000 + 200);
}

/** 0 = calm, 1 = every bay is taken. */
export function setTension(x: number) { tensionTarget = Math.max(0, Math.min(1, x)); }

/** Test hook: render `sec` seconds of music offline (with the given tension) into a 16-bit WAV. */
export async function renderMusicWav(sec: number, tens = 0): Promise<Blob> {
  const off = new OfflineAudioContext(2, Math.floor(44100 * sec), 44100);
  const comp = off.createDynamicsCompressor(); comp.threshold.value = -14; comp.connect(off.destination);
  init({ c: off as unknown as AudioContext, out: comp });
  bus.gain.value = 0.5; tension = tens; tensionGain.gain.value = tens; melodyGain.gain.value = 1 - tens * 0.45;
  let t = 0.05, i = 0;
  while (t < sec) { schedule(i++, t); t += E; }
  const buf = await off.startRendering();
  const n = buf.length, data = new DataView(new ArrayBuffer(44 + n * 4));
  const w = (o: number, s: string) => { for (let k = 0; k < s.length; k++) data.setUint8(o + k, s.charCodeAt(k)); };
  w(0, 'RIFF'); data.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, 2, true);
  data.setUint32(24, 44100, true); data.setUint32(28, 44100 * 4, true); data.setUint16(32, 4, true); data.setUint16(34, 16, true); w(36, 'data'); data.setUint32(40, n * 4, true);
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  for (let k = 0; k < n; k++) { data.setInt16(44 + k * 4, Math.max(-1, Math.min(1, L[k])) * 32767, true); data.setInt16(46 + k * 4, Math.max(-1, Math.min(1, R[k])) * 32767, true); }
  c = null;
  return new Blob([data.buffer], { type: 'audio/wav' });
}
