// Sound-effect mix check: renders each effect offline through the game's real output chain (slider gain,
// compressor) and reports its peak and its loudest 50 ms (short-term RMS), in dBFS, plus clipping.
//   node scripts/sfxmix.cjs
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:5173/';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(URL + '?play&shot', { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 120000 });
  const rows = await p.evaluate(async () => {
    const a = await import('/src/audio.ts');
    const list = [
      ['click (UI)', () => a.click()], ['coin', () => a.coin()], ['pop (empty car)', () => a.pop(0)], ['pop (full car)', () => a.pop(1)],
      ['bump (blocked)', () => a.bump()], ['chirp', () => a.chirp()], ['engine', () => a.engine()], ['engine (heavy)', () => a.engine(0, true)],
      ['horn new', () => a.horn('new')], ['horn old', () => a.horn('old')], ['horn bus', () => a.horn('bus')], ['horn x2 (depart)', () => a.horn('new', 2)],
      ['wedding horns', () => a.weddingHorns()], ['whistle', () => a.whistleSound()], ['crane', () => a.craneSound()],
      ['win jingle', () => a.win()], ['lose jingle', () => a.lose()], ['thunder', () => a.thunder()],
      // Worst case: three cars leaving at once while passengers board and coins land.
      ['BURST (all at once)', () => { for (let k = 0; k < 3; k++) { a.horn('new', 2, k * 0.05); a.engine(k * 0.05); a.chirp(k * 0.05); } for (let k = 0; k < 5; k++) a.pop(k / 4); a.coin(); a.coin(0.05); a.bump(); a.win(); }],
    ];
    const out = [];
    for (const [name, fn] of list) {
      const buf = await a.renderSound(fn, 3);
      const d = buf.getChannelData(0), sr = buf.sampleRate, W = Math.round(sr * 0.05);
      let peak = 0, clip = 0, best = 0, sum = 0;
      for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; if (v >= 0.999) clip++; }
      for (let i = 0; i + W <= d.length; i += W >> 1) { let e = 0; for (let k = i; k < i + W; k++) e += d[k] * d[k]; best = Math.max(best, e / W); }
      const db = (x) => (x > 0 ? 20 * Math.log10(x) : -120);
      out.push({ name, peak: +db(peak).toFixed(1), loud: +(10 * Math.log10(best || 1e-12)).toFixed(1), clip });
    }
    return out;
  });
  const gameplay = rows.filter((r) => /pop|coin|engine|horn x2|bump|chirp/.test(r.name)).map((r) => r.loud).sort((x, y) => x - y);
  const med = gameplay[Math.floor(gameplay.length / 2)];
  for (const r of rows) console.log(`${r.name.padEnd(18)} peak ${String(r.peak).padStart(6)} dBFS   loudest 50ms ${String(r.loud).padStart(6)} dB   vs gameplay median ${(r.loud - med >= 0 ? '+' : '') + (r.loud - med).toFixed(1).padStart(5)}${r.clip ? `   CLIPS ${r.clip}` : ''}`);
  await b.close();
})();
