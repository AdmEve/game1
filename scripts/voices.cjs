// The characters' voices (L2), rendered through the game's own output chain to a WAV, to listen to: each says one of
// their lines at the pace the card writes it in. Mash Rahim, then Ms. Sabouri (radio), then Mr. Ajool.
//   npx vite --port 5173 & node scripts/voices.cjs out.wav
const { chromium } = require('playwright');
const fs = require('fs');
const URL = process.env.URL || 'http://127.0.0.1:5173/';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(URL + '?play&shot', { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 120000 });
  const pcm = await p.evaluate(async () => {
    const a = await import('/src/audio.ts'), t = await import('/src/ui/talk.ts'), ch = await import('/src/ui/characters.ts');
    const lines = [
      ['rahim', 'وقتی جاهای ایستگاه داره پر می‌شه، «جای پارک» یه جای اضافه کنارشون باز می‌کنه.'],
      ['sabouri', 'سلام! مأموریت‌های امروز رو از بی‌سیم می‌گم؛ هر سه تا رو بری، یه سوئیچ هم جایزه داری.'],
      ['ajool', ch.BOSS_LINES[0].taunt],
    ];
    const sec = lines.reduce((s, [who, l]) => s + t.plan(l, who).reduce((x, st) => x + st.wait, 0) / 1000 + 1.2, 0.5);
    const buf = await a.renderSound(() => {
      let at = 0.3;
      for (const [who, line] of lines) {
        if (who === 'sabouri') a.squelch(at - 0.15);
        for (const st of t.plan(line, who)) { if (st.syl) a.syllable(who, st.syl.vowel, st.syl.lift, st.syl.wobble, at); at += st.wait / 1000; }
        if (who === 'sabouri') a.squelch(at + 0.05);
        at += 1.2;
      }
    }, sec, 22050);
    const d = buf.getChannelData(0), out = new Int16Array(d.length);
    for (let i = 0; i < d.length; i++) out[i] = Math.max(-1, Math.min(1, d[i])) * 32767;
    return { rate: buf.sampleRate, data: Array.from(out) };
  });
  const n = pcm.data.length, wav = Buffer.alloc(44 + n * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + n * 2, 4); wav.write('WAVE', 8); wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(pcm.rate, 24);
  wav.writeUInt32LE(pcm.rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) wav.writeInt16LE(pcm.data[i], 44 + i * 2);
  fs.writeFileSync(process.argv[2] || 'voices.wav', wav);
  console.log(`${(n / pcm.rate).toFixed(1)} s written`);
  await b.close();
})();
