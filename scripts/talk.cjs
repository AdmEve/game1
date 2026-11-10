// Characters speak (L2): a character's line on a card writes itself in without moving the card, a tap shows the rest,
// the voices switch silences them (the words still write in), reduced motion shows the line at once, and a line on
// a card behind the level's veil waits for it to lift (Mr. Ajool's boss card).
//   npx vite preview --port 4173 & URL=http://127.0.0.1:4173/ node scripts/talk.cjs
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:4173/';
let fails = 0;
const report = (ok, msg) => { if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); };
const SEEN = ['spot', 'help-bay', 'help-crane', 'help-whistle', 'cover', 'broken', 'vip', 'oddEven', 'courier', 'officer', 'cart', 'ch2'];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, userAgent: 'Mozilla/5.0 (Linux; Android 13) Mobile' });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  // Count the voice's oscillators (sawtooth: no other sound on a card uses one).
  await p.addInitScript(() => {
    window.__saws = 0;
    const make = BaseAudioContext.prototype.createOscillator;
    BaseAudioContext.prototype.createOscillator = function () {
      const o = make.call(this);
      let type = 'sine';
      Object.defineProperty(o, 'type', { get: () => type, set: (v) => { type = v; if (v === 'sawtooth') window.__saws++; } });
      return o;
    };
  });
  await p.goto(URL + '?play', { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 300000 });
  await p.mouse.click(5, 5); // a touch, so the page may make sound
  // Open the welcome back card (Mash Rahim's line) and follow it.
  const follow = (opts) => p.evaluate(async ({ voices, still, tapAt }) => {
    const r = window.__rb;
    document.querySelectorAll('.modal-back').forEach((m) => m.remove());
    r.save.seen = {}; r.save.settings.sound = true; r.save.settings.voices = voices;
    document.documentElement.classList.toggle('reduce-motion', still);
    for (let k = 0; k < 100 && document.querySelector('.veil.on'); k++) await new Promise((x) => setTimeout(x, 100));
    window.__saws = 0;
    r.cards.welcomeBack(5);
    const sp = document.querySelector('.modal-back:not(.out) .speech');
    const rest = () => [...sp.querySelectorAll('.tw-rest')].reduce((n, x) => n + x.textContent.length, 0);
    // Layout size (offset*: unaffected by the card's pop-in scale, which a slow machine may still be running).
    const box = () => `${sp.offsetWidth}x${sp.offsetHeight}`;
    const seen = [];
    const t0 = performance.now();
    for (let k = 0; k < 40; k++) {
      await new Promise((x) => setTimeout(x, 100));
      if (tapAt && performance.now() - t0 > tapAt && !seen.tapped) { sp.closest('.card').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); seen.tapped = true; }
      seen.push({ rest: rest(), box: box() });
    }
    document.documentElement.classList.remove('reduce-motion');
    return { seen, tapped: !!seen.tapped, saws: window.__saws, text: sp.textContent.replace(/\s+/g, ' ').trim() };
  }, opts);
  const a = await follow({ voices: true, still: false });
  const rests = a.seen.map((s) => s.rest), boxes = new Set(a.seen.map((s) => s.box));
  report(rests[0] > 40 && rests.some((n, i) => i && n < rests[i - 1] && n > 0) && rests[rests.length - 1] === 0, `the line writes itself in (${rests.filter((_, i) => i % 6 === 0).join(' → ')} letters left)`);
  report(boxes.size === 1, `the bubble keeps its size as it fills (${[...boxes].join(', ')})`);
  report(a.saws >= 8, `Mash Rahim's voice speaks along (${a.saws} syllables)`);
  report(/روز نبودی جوون/.test(a.text), 'the whole line is in the card from the start (for screen readers)');
  const t = await follow({ voices: true, still: false, tapAt: 700 });
  const after = t.seen.findIndex((s, i) => i > 6 && s.rest === 0);
  report(t.tapped && after >= 0 && after <= 8, `a tap shows the rest at once (${t.seen.slice(5, 9).map((s) => s.rest).join(' → ')})`);
  const q = await follow({ voices: false, still: false });
  report(q.saws === 0 && q.seen[q.seen.length - 1].rest === 0, `voices off: the line still writes in, silently (${q.saws} syllables)`);
  const m = await follow({ voices: true, still: true });
  report(m.seen.every((s) => s.rest === 0) && m.saws > 0 && m.saws <= 3, `reduced motion: the line at once, and a short hello (${m.saws} syllables)`);
  // Mr. Ajool before his boss level: he waits for the level's veil, and his drums.
  const boss = await p.evaluate(async (seen) => {
    const r = window.__rb;
    document.querySelectorAll('.modal-back').forEach((x) => x.remove());
    r.save.seen = Object.fromEntries(seen.map((k) => [k, true])); r.save.level = 29;
    r.goLevel(29);
    let veilOff = -1, first = -1;
    const t0 = performance.now();
    for (let k = 0; k < 80 && first < 0; k++) {
      await new Promise((x) => setTimeout(x, 50));
      const sp = document.querySelector('.modal-back:not(.out) .boss-card .speech');
      if (veilOff < 0 && !document.querySelector('.veil.on')) veilOff = performance.now() - t0;
      if (sp && sp.querySelector('.tw-rest') && sp.firstChild?.textContent) first = performance.now() - t0;
    }
    return { veilOff: Math.round(veilOff), first: Math.round(first) };
  }, SEEN);
  report(boss.veilOff >= 0 && boss.first - boss.veilOff >= 800, `Mr. Ajool's taunt starts after the veil lifts and his drums (${JSON.stringify(boss)} ms)`);
  report(!errors.length, `no page errors${errors.length ? ': ' + [...new Set(errors)].slice(0, 2).join(' | ') : ''}`);
  console.log(fails ? `${fails} failure(s)` : 'all ok');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
