// A level's result must never land on another level. A win is decided on the last tap and its card follows a few
// seconds later (the finale); a loss after a short beat. Leaving in that window used to bring the old result into
// the next level: its win card over a fresh board (credited to the wrong attempt), or a loss.
// Checks: leave right after a win and after a loss is decided (no card on the next level, which still plays),
// and the gear can't open the pause card during the finale (as back can't), after which the win card does show.
//   npx vite preview --port 4173 & URL=http://127.0.0.1:4173/ node scripts/staleresult.cjs
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:4173/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, userAgent: 'Mozilla/5.0 (Linux; Android 13) Mobile' });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(URL + '?play&shot', { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 300000 });
  await p.evaluate(() => {
    const rb = window.__rb;
    rb.save.seen = Object.fromEntries(['spot', 'cover', 'broken', 'ch2'].map((k) => [k, true])); for (let k = 0; k < 400; k++) rb.save.seen['boss' + k] = true;
    window.__start = async (n) => {
      document.querySelectorAll('.modal-back, .wallet-float').forEach((m) => m.remove());
      rb.save.level = n; await rb.goLevel(n, undefined, false);
      document.querySelectorAll('.modal-back').forEach((m) => m.remove());
      return rb.session();
    };
    // Play the solver's moves until the outcome is decided (the finale has only just begun).
    window.__winDecided = async (s) => { for (const m of rb.solve(s.level)) { s.tap(m); if (s.s.over) break; await rb.advance(0.7, false); } return s.s.over; };
    // On a level with a tap budget, spend it on cars that can't move (every tap counts) until the level is lost.
    window.__loseLevel = rb.levels.findIndex((l, i) => i > 8 && l.moves);
    window.__loseDecided = async (s) => {
      for (let k = 0; k < 200 && !s.s.over; k++) {
        const cars = s.s.inLot.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
        s.tap(cars[k % cars.length]); await rb.advance(0.12, false);
      }
      return s.s.over;
    };
  });
  let fails = 0;
  const report = (ok, msg) => { if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); };

  for (const outcome of ['won', 'lost']) {
    const r = await p.evaluate(async (outcome) => {
      const rb = window.__rb;
      let s = await window.__start(outcome === 'won' ? 6 : window.__loseLevel);
      const decided = outcome === 'won' ? await window.__winDecided(s) : await window.__loseDecided(s);
      if (decided !== outcome) return { skipped: `could not reach "${outcome}" (got ${decided})` };
      const level0 = rb.save.level;
      // Leave at once (Levels, Home or Restart all start another level the same way).
      s = await window.__start(8);
      await rb.advance(15, false);
      const card = document.querySelector('.result, .lose, .modal-back .card');
      // The new level still takes taps.
      const m = rb.solve(s.level)[0]; s.tap(m); await rb.advance(1.5, false);
      return { card: card ? card.className + ': ' + card.innerText.slice(0, 40).replace(/\n/g, ' / ') : null, over: s.s.over, moved: !s.s.inLot[m], level0, level1: rb.save.level };
    }, outcome);
    if (r.skipped) { report(false, r.skipped); continue; }
    report(!r.card, `leaving right after a ${outcome === 'won' ? 'win' : 'loss'}: ${r.card ? 'its card showed on the next level (' + r.card + ')' : 'nothing shows on the next level'}`);
    report(r.moved && !r.over, `the next level still plays (first move ${r.moved ? 'made' : 'refused'}, over: ${r.over})`);
  }

  // The gear during the finale does nothing; the win card follows.
  const g = await p.evaluate(async () => {
    const rb = window.__rb;
    const s = await window.__start(6);
    if (await window.__winDecided(s) !== 'won') return { skipped: true };
    document.querySelector('.hud .gear, .iconbtn.gear').click();
    const pauseOpened = !!document.querySelector('.pause-card, .settings');
    for (let k = 0; k < 30 && !document.querySelector('.result.win'); k++) await rb.advance(0.5, false);
    return { pauseOpened, win: !!document.querySelector('.result.win'), stacked: document.querySelectorAll('.modal-back').length };
  });
  if (g.skipped) report(false, 'gear: could not reach a win');
  else {
    report(!g.pauseOpened, `gear during the win finale: ${g.pauseOpened ? 'opened the pause card' : 'ignored'}`);
    report(g.win && g.stacked === 1, `the win card then shows, alone (${g.stacked} card(s) open)`);
  }
  if (errors.length) report(false, 'page errors: ' + [...new Set(errors)].slice(0, 3).join(' | '));
  console.log(fails ? `${fails} failure(s)` : 'all ok');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
