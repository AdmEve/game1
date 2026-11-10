// Back to before the losing move (BEST_IN_MARKET_PLAN C13): levels are lost for real until one is hopeless (one more
// bay can't win); its lose card names the losing tap and offers «از حرکت N دوباره» for what a bay costs; taking it
// replays the level to exactly the lot before that tap, without a card, without the replay's words, with a note, and
// no life gone.
//   npx vite preview --port 4173 & URL=http://127.0.0.1:4173/ node scripts/rewind.cjs
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:4173/';
let fails = 0;
const report = (ok, msg) => { if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, userAgent: 'Mozilla/5.0 (Linux; Android 13) Mobile' });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(URL + '?play', { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 300000 });
  let offer = null;
  for (let attempt = 0; attempt < 20 && !offer; attempt++) {
    offer = await p.evaluate(async (attempt) => {
      const rb = window.__rb;
      rb.save.seen = Object.fromEntries(['help-bay', 'help-crane', 'help-whistle', 'spot', 'cover', 'broken', 'vip', 'oddEven', 'courier', 'officer', 'cart', 'ch2', 'ch3', 'ch4', 'ch5'].map((k) => [k, true]));
      for (let k = 0; k < 400; k++) rb.save.seen['boss' + k] = true;
      let n = 30 + attempt * 7; while (rb.levels[n].time || rb.levels[n].moves) n++;
      rb.save.level = n; rb.save.lives = { n: 5, next: 0 }; rb.save.coins = 1000; rb.save.streak = 0;
      document.querySelectorAll('.modal-back').forEach((m) => m.remove());
      await rb.goLevel(n);
      for (let k = 0; k < 300 && (rb.swooping() || document.querySelector('.veil.on') || document.querySelector('.modal-back:not(.out)')); k++) await new Promise((x) => setTimeout(x, 100));
      const s = rb.session(), lots = [];
      let seed = n * 13 + attempt; const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
      for (let k = 0; k < 80 && !s.s.over && !document.querySelector('.result'); k++) {
        const free = s.s.inLot.map((v, j) => (v && rb.route(j).end === 'out' ? j : -1)).filter((j) => j >= 0);
        if (!free.length) break;
        lots.push(JSON.stringify(s.s.inLot));
        s.tap(free[Math.floor(rand() * free.length)]); await rb.advance(0.6, false);
      }
      for (let k = 0; k < 40 && !document.querySelector('.result'); k++) { await rb.advance(0.3, false); await new Promise((x) => setTimeout(x, 50)); }
      for (let k = 0; k < 60 && !document.querySelector('.result.lose .rewind'); k++) await new Promise((x) => setTimeout(x, 100));
      const btn = document.querySelector('.result.lose .rewind');
      if (!btn) return null;
      const review = document.querySelector('.review-note')?.textContent ?? '';
      const move = Number([...review.matchAll(/[۰-۹]+/g)][0][0].replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
      window.__want = lots[move - 1];
      return { level: n + 1, move, review, note: document.querySelector('.continue-note')?.textContent, buttons: [...document.querySelectorAll('.result.lose .btn')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()) };
    }, attempt);
  }
  report(!!offer, `a hopeless loss offers going back to before the losing tap (${JSON.stringify(offer)})`);
  if (offer) {
    report(offer.buttons[0].startsWith(`از حرکت ${offer.review.match(/حرکت ([۰-۹]+)/)[1]} دوباره`) && /از اول/.test(offer.buttons[offer.buttons.length - 1]) && /هنوز می‌شه برد/.test(offer.note ?? ''),
      `the card: «از حرکت N دوباره» first, «از اول» last, and the note says it can still be won (${offer.buttons.join(' | ')})`);
    const after = await p.evaluate(async () => {
      const rb = window.__rb, c0 = rb.save.coins, l0 = rb.save.lives.n;
      // Every toast shown from here on (headless frames are slow: the note may come and go between two looks).
      const shown = [], te = document.querySelector('.hud .toast');
      window.__toastObs = new MutationObserver(() => shown.push(`${te.classList.contains('show') ? 'show' : 'hide'} ${te.textContent}`));
      window.__toastObs.observe(te, { attributes: true, childList: true, characterData: true, subtree: true });
      document.querySelector('.result.lose .rewind').click();
      await new Promise((x) => setTimeout(x, 300));
      for (let k = 0; k < 600 && (document.querySelector('.veil.on') || document.querySelector('.modal-back:not(.out)')); k++) await new Promise((x) => setTimeout(x, 100));
      // The note waits until the level is in view (as start-of-level notes do), and comes from the frame loop: keep
      // frames coming (headless Chromium lets them stall on a heavy software-rendered scene) while watching for it.
      for (let k = 0; k < 60 && !shown.some((t) => /^show برگشتی/.test(t)); k++) { await rb.advance(0.05); await new Promise((x) => setTimeout(x, 100)); }
      const s = rb.session();
      return { coins: rb.save.coins - c0, lives: rb.save.lives.n - l0, taps: s.taps, over: s.s.over, sameLot: JSON.stringify(s.s.inLot) === window.__want, cards: document.querySelectorAll('.modal-back:not(.out)').length, floats: document.querySelectorAll('.float').length, note: shown.find((t) => /^show برگشتی/.test(t)) ?? null };
    });
    report(after.sameLot && after.taps === offer.move - 1 && !after.over && !after.cards && !after.floats, `taken: the lot exactly as before tap ${offer.move}, nothing open, no stray words (${JSON.stringify(after)})`);
    report(after.coins === -300 && after.lives === 0 && /برگشتی به قبل از حرکت/.test(after.note ?? ''), 'paid as a bay is, no life gone, and a note says where play goes on');
    // Back where they just lost: the hint is offered after a few seconds, not the usual twenty.
    const chip = await p.evaluate(async () => {
      const rb = window.__rb;
      rb.idleFor(5000); await rb.advance(0.05, false);
      return document.querySelector('.hint-chip').classList.contains('show');
    });
    report(chip, 'after the rewind, 5 s idle brings the «راهنما؟» chip (usually 20 s)');
  }
  report(!errors.length, `no page errors${errors.length ? ': ' + [...new Set(errors)].slice(0, 2).join(' | ') : ''}`);
  console.log(fails ? `${fails} failure(s)` : 'all ok');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
