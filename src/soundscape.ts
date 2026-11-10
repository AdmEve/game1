/**
 * «صدای شهر»: each chapter's place, heard under the music (BEST_IN_MARKET_PLAN I7). A distant traffic bed, pitched
 * where a phone's speaker can play it; sparrows by day and in spring; the bazaar's crowd; a far-off horn now and then.
 * Up on Tochal only the wind (the weather bed) is left. All synthesised, on the weather bus, so the sounds slider sets
 * it and sound off silences it; nothing is scheduled while the app is hidden.
 */
import { ambOut } from './audio';
import type { Light } from './game/chapters';

/** How much of each layer a place has (0 = none, 1 = the usual). */
export interface Scape { traffic: number; birds: number; crowd: number; horns: number }
export const SCAPES: Record<Light, Scape> = {
  day: { traffic: 0.8, birds: 1, crowd: 0, horns: 0.8 }, // Tajrish: a square with plane trees
  sunset: { traffic: 1.2, birds: 0.45, crowd: 0, horns: 1.2 }, // Valiasr at rush hour
  night: { traffic: 0.7, birds: 0, crowd: 0, horns: 0.5 }, // Azadi at night (and Yalda's winter nights)
  snow: { traffic: 0, birds: 0, crowd: 0, horns: 0 }, // Tochal: the wind only
  bazaar: { traffic: 0.35, birds: 0.25, crowd: 1, horns: 0.35 },
  autumn: { traffic: 0.35, birds: 0.2, crowd: 0, horns: 0.3 }, // Darband in the rain
  spring: { traffic: 0.6, birds: 1.5, crowd: 0, horns: 0.6 }, // Tabiat bridge (and Nowruz)
  dusk: { traffic: 1, birds: 0.3, crowd: 0, horns: 0.9 }, // Milad at dusk
};

let brownBuf: AudioBuffer | null = null, whiteBuf: AudioBuffer | null = null;
/** Brown noise (deep, rumbling), normalised; 6 s so the loop isn't heard. */
function brown(c: AudioContext) {
  if (!brownBuf) {
    brownBuf = c.createBuffer(1, c.sampleRate * 6, c.sampleRate);
    const d = brownBuf.getChannelData(0); let b = 0, peak = 0;
    for (let i = 0; i < d.length; i++) { b = (b + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = b; peak = Math.max(peak, Math.abs(b)); }
    for (let i = 0; i < d.length; i++) d[i] /= peak;
  }
  return brownBuf;
}
function white(c: AudioContext) {
  if (!whiteBuf) {
    whiteBuf = c.createBuffer(1, c.sampleRate * 3, c.sampleRate);
    const d = whiteBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return whiteBuf;
}

/** A sparrow's phrase: two to five quick chirps, high and bright, somewhere to the side. */
function sparrow(c: AudioContext, out: AudioNode, vol: number) {
  const pan = c.createStereoPanner(); pan.pan.value = Math.random() * 1.6 - 0.8; pan.connect(out);
  const base = 3300 + Math.random() * 1700, n = 2 + Math.floor(Math.random() * 4);
  let t = c.currentTime + 0.03;
  for (let i = 0; i < n; i++) {
    const d = 0.035 + Math.random() * 0.05, f0 = base * (0.9 + Math.random() * 0.25), f1 = f0 * (Math.random() < 0.5 ? 1.3 : 0.75);
    const o = c.createOscillator(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(vol * 0.02, t + d);
    o.connect(g).connect(pan); o.start(t); o.stop(t + d + 0.02);
    t += d + 0.03 + Math.random() * 0.09;
  }
  setTimeout(() => pan.disconnect(), (t - c.currentTime + 0.5) * 1000);
}

/** A horn a few streets away: a car horn's two notes, muffled by distance; sometimes twice. */
function farHorn(c: AudioContext, out: AudioNode, vol: number) {
  const pan = c.createStereoPanner(); pan.pan.value = Math.random() * 1.4 - 0.7;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650 + Math.random() * 300;
  lp.connect(pan).connect(out);
  const f = 330 + Math.random() * 150, twice = Math.random() < 0.35;
  let t = c.currentTime + 0.03, end = t;
  for (let k = 0; k < (twice ? 2 : 1); k++) {
    const d = 0.16 + Math.random() * (twice ? 0.12 : 0.3);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.setValueAtTime(vol, t + d - 0.04); g.gain.linearRampToValueAtTime(0, t + d);
    g.connect(lp);
    for (const m of [1, 1.26]) { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = f * m; o.connect(g); o.start(t); o.stop(t + d + 0.02); }
    end = t + d; t += d + 0.09;
  }
  setTimeout(() => pan.disconnect(), (end - c.currentTime + 0.5) * 1000);
}

let current: { light: Light; stop: () => void } | null = null;
/** The place being heard now (for tests). */
export const scapeNow = () => current?.light ?? null;

/** Change to a place's sounds (cross-fading), or none. Unchanged place: nothing happens. */
export function soundscape(light: Light | null) {
  if (light && current?.light === light) return;
  current?.stop(); current = null;
  const o = ambOut();
  if (!o || !light) return;
  const sc = SCAPES[light];
  if (!sc.traffic && !sc.birds && !sc.crowd && !sc.horns) return;
  const { c, bus } = o;
  const out = c.createGain(); out.gain.value = 0; out.connect(bus); out.gain.setTargetAtTime(1, c.currentTime, 1.2);
  const sources: AudioScheduledSourceNode[] = [];
  const loops: number[] = [];
  const live = () => !document.hidden && c.state === 'running';
  /** Something every `min`–`max` seconds (only while the game is in view). */
  const every = (min: number, max: number, fn: () => void, slot = loops.length) => {
    const next = () => { loops[slot] = window.setTimeout(() => { if (live()) fn(); next(); }, (min + Math.random() * (max - min)) * 1000); };
    next();
  };
  if (sc.traffic) {
    // Distant traffic: brown noise, its rumble lifted into the 120-700 Hz a phone can play, swelling slowly.
    const src = c.createBufferSource(); src.buffer = brown(c); src.loop = true;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 110;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    const g = c.createGain(); g.gain.value = 0.045 * sc.traffic;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.05 + Math.random() * 0.04;
    const depth = c.createGain(); depth.gain.value = 0.015 * sc.traffic;
    lfo.connect(depth).connect(g.gain);
    src.connect(hp).connect(lp).connect(g).connect(out); src.start(); lfo.start();
    sources.push(src, lfo);
  }
  if (sc.crowd) {
    // The bazaar: a murmur of voices, three bands of noise whose loudness moves like speech.
    for (const [f, q] of [[420, 1.4], [850, 1.6], [1700, 2]] as const) {
      const src = c.createBufferSource(); src.buffer = white(c); src.loop = true; src.loopStart = Math.random();
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const g = c.createGain(); g.gain.value = 0;
      src.connect(bp).connect(g).connect(out); src.start(0, Math.random() * 2);
      sources.push(src);
      const base = 0.05 * sc.crowd * (f > 1000 ? 0.6 : 1);
      // Two seconds of syllable-like swells at a time.
      const plan = () => { const t0 = c.currentTime; for (let t = 0; t < 2; t += 0.11 + Math.random() * 0.16) g.gain.setTargetAtTime(base * (0.25 + Math.random() * 1.1), t0 + t, 0.05); };
      plan(); every(1.9, 1.9, plan);
    }
  }
  if (sc.birds) every(2.2 / sc.birds, 7 / sc.birds, () => sparrow(c, out, 0.015 + Math.random() * 0.015));
  if (sc.horns) every(14 / sc.horns, 34 / sc.horns, () => farHorn(c, out, 0.012 + Math.random() * 0.01));
  current = {
    light,
    stop: () => {
      loops.forEach((id) => clearTimeout(id));
      out.gain.setTargetAtTime(0, c.currentTime, 0.5);
      setTimeout(() => { for (const s of sources) { try { s.stop(); } catch { /* already stopped */ } } out.disconnect(); }, 2500);
    },
  };
}
