// Card layout audit: opens every card the game can show at small and large phone sizes and checks that it fits the
// screen, that every button can be seen without scrolling (cards built to scroll only need to fit as a whole),
// and that nothing overflows sideways.
//   node scripts/cardfit.cjs [320x568,360x640,412x915]      BIG=1 with the larger-text setting, ONLY=garage,shop for a subset
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:5173/';
const SIZES = (process.argv[2] || '320x568,360x640,412x915').split(',').map((s) => s.split('x').map(Number));
const SEEN = ['spot', 'help-bay', 'help-crane', 'help-whistle', 'cover', 'broken', 'vip', 'oddEven', 'courier', 'officer', 'cart', 'wedding', 'granny', 'tunnel', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'];
// [name, setup+open (runs in the page; may be async)]
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const CARDS0 = [
  ['home', (r) => r.cards.home()],
  // Mid-game: rush hour not yet played today, a streak, medals and metro-card stations waiting (every badge and chip).
  ['home (mid-game)', (r) => { r.save.level = 41; r.save.streak = 2; r.save.rush = { day: '', streak: 0 }; r.cards.home(); }],
  // Every level won: the finish note on home (the one-off card is its own case below).
  ['home (finished)', (r) => { r.save.level = r.levels.length; r.save.seen.finale = true; r.cards.home(); }],
  ['finale', (r) => r.cards.finale()],
  // A help with none left and too few coins: a video, the shop, or not now (H10).
  ['help offer', (r) => { r.save.coins = 120; r.cards.helpOffer('bay'); }],
  // Progress to another phone (N11): the card, this phone's code, and the swap asked before it happens.
  ['transfer', (r) => r.cards.transfer()],
  ['transfer (code)', async (r) => { r.cards.transfer(); [...document.querySelectorAll('.transfer .btn')].find((x) => x.textContent.includes('کد این گوشی')).click(); await new Promise((x) => setTimeout(x, 400)); }],
  ['transfer (swap)', async (r) => {
    const wait = (ms) => new Promise((x) => setTimeout(x, ms)), press = (t) => [...[...document.querySelectorAll('.modal-back:not(.out) .card')].pop().querySelectorAll('.btn')].find((x) => x.textContent.includes(t)).click();
    r.save.level = 118; r.save.coins = 12845; r.cards.transfer(); press('کد این گوشی'); await wait(400);
    const code = document.querySelector('.transfer-code textarea').value;
    r.save.level = 3; r.save.coins = 260; press('برگرد'); await wait(250); press('وارد کردن کد'); await wait(250);
    const ta = document.querySelector('.transfer-in textarea'); ta.value = code; ta.dispatchEvent(new Event('input')); press('بیار'); await wait(400);
  }],
  // The metro card with the whole line ridden this month (its header says so instead of «تا ایستگاه بعد»).
  ['pass (end of line)', (r) => { r.save.pass = { month: new Date().toISOString().slice(0, 7), punches: 41, free: [], prem: [], premium: false }; r.cards.pass(); }],
  ['pause', (r) => r.cards.pause()],
  // A level with special rules: the pause card's chips to read them again; and «راهنمای بازی» with every rule met (J6).
  ['pause (rules)', (r) => { r.save.level = 188; r.startLevel(188, undefined, false); document.querySelectorAll('.modal-back').forEach((m) => m.remove()); r.cards.pause(); }],
  ['guide', (r) => { r.save.level = 239; r.cards.guide(); }],
  // Settings from home's gear: no pause controls, a close in the corner (H11).
  ['settings (home)', (r) => { r.cards.home(); r.cards.settings(); }],
  ['levels', (r) => r.cards.levels()],
  ['shop', (r) => r.cards.shop()],
  ['garage', (r) => r.cards.garage()],
  ['agency', (r) => r.cards.agency()],
  ['pass', (r) => r.cards.pass()],
  ['achievements', (r) => r.cards.achievements()],
  // With the Journey done: the Endless row too (C10).
  ['achievements (finished)', (r) => { r.save.level = r.levels.length; r.save.endless = 12; r.cards.achievements(); }],
  ['chest', (r) => r.cards.chest()],
  ['intro (longest text)', (r) => r.cards.intro('wedding')],
  ['no lives', (r) => { r.save.lives = { n: 0, next: Date.now() + 25 * 60e3 }; r.cards.noLives(); }],
  ['daily gift (day 7)', (r) => { r.save.daily = { day: '2000-01-01', streak: 6 }; r.save.daily.day = new Date(Date.now() - 864e5).toISOString().slice(0, 10); r.cards.daily(); }],
  ['rate', (r) => r.cards.rate()],
  // Back after days away (P3).
  ['welcome back', (r) => r.cards.welcomeBack(5)],
  // The starter pack, offered once after a win from level 18 (O2).
  ['starter offer', (r) => { r.save.owned.starter = false; r.save.owned.no_ads = false; r.cards.starter(); }],
  ['privacy policy', (r) => r.cards.privacy()],
  ['chapter card', (r) => { delete r.save.seen.ch2; r.save.level = 30; r.startLevel(30, undefined, false); }],
  ['boss card', (r) => { delete r.save.seen.boss29; r.save.level = 29; r.startLevel(29, undefined, false); }],
  ['lose (bays)', (r) => { r.save.level = 40; r.save.streak = 3; r.startLevel(40, undefined, false); r.cards.lose(); }],
  // With the losing move found (C12): the line the solver adds as the card opens (placed here by hand: no game played).
  ['lose (with review)', (r) => { r.save.level = 40; r.save.streak = 3; r.startLevel(40, undefined, false); r.cards.lose();
    const n = document.createElement('div'); n.className = 'review-note'; n.innerHTML = '<span>بدون کمک، از حرکت <b>۱۲</b> به بعد دیگه راهی نبود: <b>وانت زامیاد نقره‌ای</b>.</span>';
    document.querySelector('.result.lose p').after(n); }],
  ['lose (time)', (r) => { r.save.level = 40; r.startLevel(40, undefined, false); r.cards.lose('time'); }],
  ['win (boss, worst case)', (r) => { r.save.level = 29; r.save.streak = 3; r.save.stats.wins = 0; r.startLevel(29, undefined, false); document.querySelectorAll('.modal-back').forEach((m) => m.remove()); r.cards.win(); }],
  ['rush win', (r) => { r.cards.rushWin(); }],
  ['yalda win (last night)', (r) => r.cards.yaldaWin(6)],
  ['nowruz win (last day)', (r) => r.cards.nowruzWin(6)],
  ['give-up confirm', async (r) => { r.save.level = 40; r.save.streak = 3; r.startLevel(40, undefined, false); document.querySelectorAll('.modal-back').forEach((m) => m.remove()); const s = r.session(); s.tap(s.s.inLot.findIndex(Boolean)); await r.advance(0.2, false); r.cards.giveUp(); }],
];
const CARDS = ONLY ? CARDS0.filter(([n]) => ONLY.some((o) => n.startsWith(o))) : CARDS0;
(async () => {
  const b = await chromium.launch();
  let problems = 0;
  for (const [W, H] of SIZES) {
    const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (Linux; Android 12) Mobile' });
    const errors = []; p.on('pageerror', (e) => errors.push(e.message));
    if (process.env.BIG) await p.addInitScript(() => { window.__bigText = true; });
    await p.goto(URL + '?play&shot', { waitUntil: 'load' });
    await p.waitForFunction(() => document.title === 'ready', null, { timeout: 120000 });
    console.log(`== ${W}×${H}${process.env.BIG ? ' (larger text)' : ''}`);
    for (const [name, open] of CARDS) {
      const res = await p.evaluate(async ([seen, src]) => {
        const r = window.__rb;
        document.querySelectorAll('.modal-back').forEach((m) => m.remove());
        r.save.seen = Object.fromEntries(seen.map((k) => [k, true])); for (let k = 0; k < 400; k++) r.save.seen['boss' + k] = true;
        // BIG=1: the larger-text setting on (cards must still fit).
        document.documentElement.classList.toggle('big-text', !!window.__bigText);
        // Many cards return a promise that settles only when the card closes: don't wait on those for long.
        await Promise.race([Promise.resolve((0, eval)(`(${src})`)(r)), new Promise((x) => setTimeout(x, 1500))]);
        await new Promise((x) => setTimeout(x, 450));
        const backs = [...document.querySelectorAll('.modal-back:not(.out)')];
        const card = backs[backs.length - 1]?.querySelector(':scope > .card');
        if (!card) return { missing: true };
        const vw = innerWidth, vh = innerHeight, cr = card.getBoundingClientRect();
        const scrolls = getComputedStyle(card).overflowY === 'auto' && card.scrollHeight > card.clientHeight + 1;
        const hidden = [], wide = [];
        card.querySelectorAll('.btn, button').forEach((x) => {
          const q = x.getBoundingClientRect(); if (!q.width) return;
          if (!scrolls && (q.bottom > vh + 0.5 || q.top < -0.5)) hidden.push(x.textContent.trim().slice(0, 16));
        });
        card.querySelectorAll('*').forEach((x) => { const q = x.getBoundingClientRect(); if (q.width && (q.right > vw + 1 || q.left < -1)) wide.push((x.className && x.className.baseVal === undefined ? x.className : x.tagName).toString().slice(0, 20)); });
        // A label spilling out of its own button (over its neighbour, or cut off): every line of text inside the button's box.
        const spill = [];
        card.querySelectorAll('.btn, button').forEach((x) => {
          const q = x.getBoundingClientRect(); if (!q.width) return;
          const tw = document.createTreeWalker(x, NodeFilter.SHOW_TEXT);
          for (let t = tw.nextNode(); t; t = tw.nextNode()) {
            if (!t.textContent.trim() || t.parentElement.closest('.badge')) continue; // a count badge sits across the corner on purpose
            const rg = document.createRange(); rg.selectNodeContents(t);
            if ([...rg.getClientRects()].some((rr) => rr.width && (rr.left < q.left - 1 || rr.right > q.right + 1))) { spill.push(x.textContent.trim().replace(/\s+/g, ' ').slice(0, 18)); break; }
          }
        });
        return { h: Math.round(cr.height), top: Math.round(cr.top), bottom: Math.round(cr.bottom), vh, scrolls, hidden, wide: [...new Set(wide)].slice(0, 4), spill: [...new Set(spill)].slice(0, 4) };
      }, [SEEN, open.toString()]);
      if (res.missing) { console.log(`  ?    ${name}: no card opened`); continue; }
      const fits = res.top >= -0.5 && res.bottom <= res.vh + 0.5;
      const ok = fits && !res.hidden.length && !res.wide.length && !res.spill.length;
      if (!ok) problems++;
      console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(24)} ${String(res.h).padStart(4)} px${res.scrolls ? ' (scrolls)' : ''}${fits ? '' : `  off-screen (top ${res.top}, bottom ${res.bottom})`}${res.hidden.length ? `  buttons off-screen: ${res.hidden.join(' | ')}` : ''}${res.wide.length ? `  too wide: ${res.wide.join(', ')}` : ''}${res.spill.length ? `  text out of its button: ${res.spill.join(' | ')}` : ''}`);
    }
    if (errors.length) { problems++; console.log('  page errors:', [...new Set(errors)].slice(0, 3)); }
    await p.close();
  }
  await b.close();
  if (problems) process.exitCode = 1;
})();
