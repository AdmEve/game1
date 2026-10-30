/**
 * Adaptive background music, synthesised live. A calm, warm 4/4 groove: a soft pad, an electric-piano
 * arpeggio, a plucked melody that wanders through a pentatonic subset of the chapter's mode (never a clash),
 * a round bass, and quiet drums. As the parking bays fill up, a tension layer (more hi-hat, a brighter
 * pad, a driving off-beat) fades in. Everything runs through a gentle low-pass so nothing is ever shrill.
 */
import { audioOut } from './audio';
import { save } from './save';

// Per-chapter feel: tempo in quarter notes per minute, tonic and mode (in semitones above the tonic).
const MOODS = {
  day: { bpm: 84, tonic: 261.63, scale: [0, 2, 4, 5, 7, 9, 11], drums: 1 }, // C major: bright and easy
  sunset: { bpm: 76, tonic: 220, scale: [0, 2, 3, 5, 7, 8, 10], drums: 0.8 }, // A minor: wistful
  night: { bpm: 72, tonic: 246.94, scale: [0, 2, 3, 5, 7, 8, 10], drums: 0.6 }, // B minor: deep and calm
  bazaar: { bpm: 90, tonic: 261.63, scale: [0, 1, 4, 5, 7, 8, 10], drums: 1.1 }, // Hijaz-like on C: lively and exotic
  dusk: { bpm: 78, tonic: 233.08, scale: [0, 1, 4, 5, 7, 8, 10], drums: 0.8 }, // the same colour, lower and slower
  spring: { bpm: 92, tonic: 293.66, scale: [0, 2, 4, 5, 7, 9, 11], drums: 1.05 }, // D major: springy
  autumn: { bpm: 74, tonic: 196, scale: [0, 2, 3, 5, 7, 8, 10], drums: 0.7 }, // G minor: bittersweet
  snow: { bpm: 68, tonic: 349.23, scale: [0, 2, 4, 5, 7, 9, 11], drums: 0.4 }, // F major: hushed
};
type Mood = keyof typeof MOODS;
let E = 60 / MOODS.day.bpm / 2; // one eighth note
let TONIC = MOODS.day.tonic;
let SCALE = MOODS.day.scale;
let DRUMS = 1;
let moodSeed = 1;

export function setMood(m: Mood) {
  const x = MOODS[m];
  E = 60 / x.bpm / 2; TONIC = x.tonic; SCALE = x.scale; DRUMS = x.drums;
  moodSeed = Object.keys(MOODS).indexOf(m) + 1;
  melody = makeMelody();
}
const freq = (deg: number, oct = 0) => {
  const o = Math.floor(deg / 7), d = ((deg % 7) + 7) % 7;
  return TONIC * 2 ** ((SCALE[d] + 12 * (o + oct)) / 12);
};

// One chord per bar: scale degrees of the roots (I, vi, IV, V in a major mode; the same degrees in a minor one).
const PROG = [0, 5, 3, 4];
const BARS = 16; // the melody repeats every sixteen bars, four chords four times

/** A seeded melody, so each chapter has its own tune but it is the same every time you play it. */
type Note = { at: number; deg: number; len: number };
let melody: Note[][] = [];
function makeMelody(): Note[][] {
  let s = moodSeed * 9301 + 49297;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  // Pentatonic subset of the mode: scale degrees 0, 1, 2, 4, 5 (and their octaves).
  const PENT = [0, 1, 2, 4, 5];
  const toDeg = (i: number) => Math.floor(i / 5) * 7 + PENT[((i % 5) + 5) % 5];
  const RHYTHMS: [number, number][][] = [
    [[0, 3], [3, 1], [4, 4]], [[0, 2], [2, 2], [4, 4]], [[0, 4], [4, 2], [6, 2]],
    [[0, 2], [2, 1], [3, 1], [4, 4]], [[1, 2], [3, 2], [5, 3]], [[0, 8]],
  ];
  const bars: Note[][] = [];
  let i = 5 + Math.floor(rnd() * 3); // start near the middle of the range
  for (let b = 0; b < BARS; b++) {
    const notes: Note[] = [];
    // The last bar of each four-bar phrase rests more and lands on the tonic.
    const end = b % 4 === 3;
    const rhythm = end ? RHYTHMS[rnd() < 0.5 ? 0 : 5] : RHYTHMS[Math.floor(rnd() * RHYTHMS.length)];
    rhythm.forEach(([at, len], k) => {
      if (!end && rnd() < 0.2 && k > 0) return; // an occasional rest
      const step = Math.round((rnd() - 0.5) * 3); // -1, 0 or +1 mostly: stepwise motion
      i = Math.max(2, Math.min(9, i + step));
      const target = end && k === rhythm.length - 1 ? 5 : i; // phrase ends on the tonic
      if (target !== i) i = target;
      notes.push({ at, deg: toDeg(i), len });
    });
    bars.push(notes);
  }
  return bars;
}
melody = makeMelody();

let c: AudioContext | null = null;
let bus: GainNode, tensionGain: GainNode, padFilter: BiquadFilterNode, noiseBuf: AudioBuffer;
let timer = 0, nextTime = 0, step = 0;
let tension = 0, tensionTarget = 0;
let playing = false;

function init(offline?: { c: AudioContext; out: AudioNode }) {
  const o = offline ?? audioOut();
  if (!o) return false;
  c = o.c;
  bus = c.createGain(); bus.gain.value = 0;
  tensionGain = c.createGain(); tensionGain.gain.value = 0;
  // Everything passes a soft low-pass (tames any brightness) and a roomy reverb.
  const soft = c.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 6200; soft.Q.value = 0.4;
  const rev = c.createConvolver();
  const len = Math.floor(c.sampleRate * 2.2), ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6; }
  rev.buffer = ir;
  const wet = c.createGain(); wet.gain.value = 0.3;
  tensionGain.connect(bus);
  bus.connect(soft); soft.connect(o.out);
  bus.connect(rev).connect(wet).connect(soft);
  padFilter = c.createBiquadFilter(); padFilter.type = 'lowpass'; padFilter.frequency.value = 800; padFilter.Q.value = 0.5; padFilter.connect(bus);
  noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  return true;
}

function gainEnv(t: number, a: number, peak: number, hold: number, rel: number, dest: AudioNode) {
  const g = c!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setValueAtTime(peak, t + a + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
  g.connect(dest);
  return g;
}

/** Electric-piano voice: a sine carrier phase-modulated by a sine whose strength dies away. */
function keys(f: number, t: number, vol: number, dest: AudioNode = bus) {
  const car = c!.createOscillator(), mod = c!.createOscillator(), mg = c!.createGain();
  car.type = 'sine'; mod.type = 'sine'; car.frequency.value = f; mod.frequency.value = f;
  mg.gain.setValueAtTime(f * 1.4, t); mg.gain.exponentialRampToValueAtTime(f * 0.08, t + 0.5);
  mod.connect(mg).connect(car.frequency);
  car.connect(gainEnv(t, 0.006, vol, 0, 1.3, dest));
  car.start(t); mod.start(t); car.stop(t + 1.5); mod.stop(t + 1.5);
}

/** The melody: a soft plucked bell, a sine with a quickly fading octave above. */
function lead(f: number, t: number, len: number, vol: number) {
  const o = c!.createOscillator(), o2 = c!.createOscillator(), g2 = c!.createGain();
  o.type = 'triangle'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2;
  g2.gain.setValueAtTime(0.35, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  o2.connect(g2).connect(gainEnv(t, 0.01, vol, 0, Math.min(1.8, 0.5 + len * E), bus));
  o.connect(gainEnv(t, 0.01, vol, 0, Math.min(1.8, 0.5 + len * E), bus));
  o.start(t); o2.start(t); o.stop(t + 2); o2.stop(t + 2);
}

function bass(f: number, t: number, len: number, vol = 0.24) {
  const o = c!.createOscillator(); o.type = 'sine'; o.frequency.value = f;
  const o2 = c!.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f;
  const g2 = c!.createGain(); g2.gain.value = 0.25;
  const lp = c!.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
  const env = gainEnv(t, 0.012, vol, len * E * 0.55, len * E * 0.45, bus);
  o.connect(lp); o2.connect(g2).connect(lp); lp.connect(env);
  o.start(t); o2.start(t); o.stop(t + len * E + 0.15); o2.stop(t + len * E + 0.15);
}

/** A slow, warm chord: detuned triangles through the pad filter. */
function pad(root: number, t: number, bars = 1) {
  const dur = bars * 8 * E;
  for (const deg of [root, root + 2, root + 4]) {
    for (const det of [-5, 5]) {
      const o = c!.createOscillator(); o.type = 'triangle'; o.frequency.value = freq(deg, -1); o.detune.value = det;
      const g = c!.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.016, t + 0.9); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
      o.connect(g).connect(padFilter);
      o.start(t); o.stop(t + dur + 0.7);
    }
  }
}

function kick(t: number, vol: number) {
  const o = c!.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.12);
  o.connect(gainEnv(t, 0.003, vol, 0.02, 0.2, bus)); o.start(t); o.stop(t + 0.3);
}
function rim(t: number, vol: number) {
  const n = c!.createBufferSource(); n.buffer = noiseBuf;
  const bp = c!.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 1.2;
  n.connect(bp).connect(gainEnv(t, 0.002, vol, 0, 0.09, bus)); n.start(t, Math.random() * 0.8); n.stop(t + 0.12);
}
function hat(t: number, vol: number, dest: AudioNode = bus) {
  const n = c!.createBufferSource(); n.buffer = noiseBuf;
  const hp = c!.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
  n.connect(hp).connect(gainEnv(t, 0.002, vol, 0, 0.04, dest)); n.start(t, Math.random() * 0.8); n.stop(t + 0.07);
}

function schedule(i: number, t: number) {
  const pos = i % 8, bar = Math.floor(i / 8) % BARS;
  const root = PROG[bar % 4];
  // A hair of human timing on the soft instruments.
  const hum = () => (Math.random() - 0.5) * 0.012;
  if (pos === 0) {
    pad(root, t);
    for (const n of melody[bar]) lead(freq(n.deg, 1), t + n.at * E + hum(), n.len, 0.055);
  }
  // Electric-piano arpeggio: root, fifth, octave, third, in eighths (a gentle rolling figure).
  const ARP = [0, 2, 4, 7, 4, 2, 4, 2];
  keys(freq(root + ARP[pos]), t + hum(), pos % 2 ? 0.05 : 0.07);
  // Bass on the one and the "and" of two.
  if (pos === 0) bass(freq(root, -2), t, 3);
  if (pos === 3) bass(freq(root + 4, -2), t, 2, 0.18);
  if (pos === 6) bass(freq(root, -2), t, 2, 0.16);
  // Quiet drums: kick on 1 and 3, a soft rim on 2 and 4, hats on the off-beats.
  if (pos === 0 || pos === 4) kick(t, 0.32 * DRUMS);
  if (pos === 2 || pos === 6) rim(t, 0.05 * DRUMS);
  if (pos % 2 === 1) hat(t, 0.02 * DRUMS);
  // Tension: more hats, a driving off-beat kick and a brighter pad.
  if (tension > 0.02) {
    hat(t, 0.025, tensionGain); hat(t + E / 2, 0.015, tensionGain);
    if (pos === 3 || pos === 7) kick(t + E * 0.5, 0.2);
  }
}

function tickScheduler() {
  if (!c) return;
  tension += (tensionTarget - tension) * 0.08;
  tensionGain.gain.setTargetAtTime(tension, c.currentTime, 0.4);
  padFilter.frequency.setTargetAtTime(800 + tension * 1400, c.currentTime, 0.5);
  while (nextTime < c.currentTime + 0.25) { schedule(step, nextTime); nextTime += E; step++; }
}

export function startMusic() {
  if (!save.settings.music || playing) return;
  if (!c && !init()) return;
  playing = true;
  nextTime = c!.currentTime + 0.1;
  bus.gain.cancelScheduledValues(c!.currentTime);
  bus.gain.setTargetAtTime(0.5, c!.currentTime, 1.2);
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
  bus.gain.value = 0.5; tension = tens; tensionGain.gain.value = tens; padFilter.frequency.value = 800 + tens * 1400;
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
