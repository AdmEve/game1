// Progress transfer (BEST_IN_MARKET_PLAN N11), end to end between two "phones" (two browser profiles, so two
// localStorages): the old phone's Settings → انتقال پیشرفت → کد این گوشی gives a code; the new phone's → وارد کردن کد
// refuses junk and a code cut short, shows both phones' progress before the swap, changes nothing on «نه», and on
// «آره» restarts on the old phone's progress, keeping its own Bazaar purchases and graphics setting, and says so.
//   npx vite preview --port 4173 & URL=http://127.0.0.1:4173/ node scripts/transfer.cjs [out-dir]
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:4173/';
const out = process.argv[2];
let fails = 0;
const report = (ok, msg) => { if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); };
const helpers = () => {
  window.__top = () => [...document.querySelectorAll('.modal-back:not(.out) .card')].pop() ?? null;
  window.__press = (text) => { const b = [...window.__top().querySelectorAll('.btn')].find((x) => x.textContent.includes(text)); if (b) b.click(); return !!b; };
  window.__wait = (ms) => new Promise((r) => setTimeout(r, ms));
};
async function phone(b, errors) {
  const ctx = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: out ? 2 : 1, userAgent: 'Mozilla/5.0 (Linux; Android 13) Mobile' });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new globalThis.URL(URL).origin });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(URL + '?play', { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 300000 });
  await p.evaluate(helpers);
  return p;
}
const openTransfer = (p) => p.evaluate(async () => {
  document.querySelectorAll('.modal-back').forEach((m) => m.remove());
  window.__rb.cards.pause(); await window.__wait(400);
  window.__press('انتقال پیشرفت'); await window.__wait(400);
  return window.__top()?.querySelector('h2')?.textContent;
});

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];

  // The old phone: well into the game, with no-ads bought and high graphics.
  const a = await phone(b, errors);
  await a.evaluate(() => {
    const s = window.__rb.save;
    s.level = 118; s.coins = 845; s.boosters = { crane: 3, whistle: 0, bay: 7 }; s.garage = { keys: 4, restored: ['peykan'] };
    s.owned.no_ads = true; s.settings.quality = 'high'; s.settings.leftHand = true;
    for (let k = 0; k < 118; k++) s.lvStats[k] = [3, 2, 1];
  });
  report((await openTransfer(a)) === 'انتقال پیشرفت', 'Settings → «انتقال پیشرفت به گوشی دیگه» opens the transfer card');
  if (out) await a.screenshot({ path: `${out}/transfer-card.png` });
  const got = await a.evaluate(async () => {
    window.__press('کد این گوشی'); await window.__wait(600);
    const c = window.__top(), code = c.querySelector('textarea.code')?.value ?? '';
    window.__press('کپی'); await window.__wait(300);
    let clip = null; try { clip = await navigator.clipboard.readText(); } catch { /* headless without clipboard */ }
    return { where: c.querySelector('.where')?.textContent, code, clip, note: document.querySelector('.note')?.textContent };
  });
  report(/^RB1\.[A-Za-z0-9_-]+\.[0-9a-z]+$/.test(got.code) && got.where === 'مرحله‌ی ۱۱۹ · ۸۴۵ سکه',
    `«کد این گوشی»: the code (${got.code.length} characters) under «${got.where}»`);
  report(got.clip === got.code && got.note === 'کد کپی شد', `«کپی» copies it and says so (${got.note})`);
  if (out) await a.screenshot({ path: `${out}/transfer-code.png` });

  // The new phone: just installed, a few levels in, low graphics.
  const n = await phone(b, errors);
  await n.evaluate(() => { const s = window.__rb.save; s.level = 3; s.coins = 260; s.settings.quality = 'low'; });
  await openTransfer(n);
  const enter = (text) => n.evaluate(async (t) => {
    const c = window.__top(), ta = c.querySelector('textarea.code');
    ta.value = t; ta.dispatchEvent(new Event('input'));
    window.__press('بیار'); await window.__wait(500);
    const top = window.__top();
    return { title: top.querySelector('h2')?.textContent, err: top.querySelector('.err')?.textContent ?? '', swap: [...top.querySelectorAll('.swap > div')].map((x) => `${x.querySelector('b').textContent} · ${x.querySelector('span').textContent}`) };
  }, text);
  await n.evaluate(async () => { window.__press('وارد کردن کد'); await window.__wait(400); });
  const empty = await n.evaluate(() => [...window.__top().querySelectorAll('.btn')].find((x) => x.textContent.includes('بیار')).disabled);
  report(empty, 'an empty box: «بیار» waits for a code');
  let r = await enter('سلام، این کد منه');
  report(r.title === 'وارد کردن کد' && /RB1/.test(r.err), `not a code: says so (${r.err})`);
  r = await enter(got.code.slice(0, 200) + got.code.slice(got.code.lastIndexOf('.')));
  report(r.title === 'وارد کردن کد' && /کامل نیست/.test(r.err), `a code cut short: says to copy all of it (${r.err})`);
  // As a messenger hands it back: the words it was sent with, wrapped, with a direction mark.
  r = await enter(`کد پیشرفت راه‌بندون (مرحله‌ی ۱۱۹ · ۸۴۵ سکه):\n‏${got.code.slice(0, 50)}\n${got.code.slice(50)}`);
  report(r.title === 'جایگزین بشه؟' && r.swap[0] === 'مرحله‌ی ۴ · ۲۶۰ سکه' && r.swap[1] === 'مرحله‌ی ۱۱۹ · ۸۴۵ سکه',
    `a wrapped code from a message: both phones' progress before the swap (${JSON.stringify(r.swap)})`);
  if (out) await n.screenshot({ path: `${out}/transfer-confirm.png` });
  const kept = await n.evaluate(async () => { window.__press('نه'); await window.__wait(400); return { level: window.__rb.save.level, top: window.__top()?.querySelector('h2')?.textContent }; });
  report(kept.level === 3 && kept.top === 'وارد کردن کد', `«نه»: nothing changes, back to the code (${JSON.stringify(kept)})`);
  await enter(got.code);
  await Promise.all([n.waitForEvent('load', { timeout: 120000 }), n.evaluate(() => window.__press('جایگزین کن'))]);
  await n.waitForFunction(() => document.title === 'ready', null, { timeout: 300000 });
  const after = await n.evaluate(async () => {
    for (let k = 0; k < 30 && !document.querySelector('.note'); k++) await new Promise((r) => setTimeout(r, 100));
    const s = window.__rb.save;
    return { level: s.level, coins: s.coins, bay: s.boosters.bay, garage: s.garage.restored, stats: Object.keys(s.lvStats).length, noAds: s.owned.no_ads, quality: s.settings.quality, leftHand: s.settings.leftHand,
      note: document.querySelector('.note')?.textContent, before: JSON.parse(localStorage.getItem('rahbandoon.save.v1.before-transfer') ?? 'null')?.level };
  });
  report(after.level === 118 && after.coins === 845 && after.bay === 7 && after.garage.join() === 'peykan' && after.stats === 118 && after.leftHand,
    `«آره، جایگزین کن»: the game restarts on the old phone's progress (${JSON.stringify(after)})`);
  report(after.noAds === false && after.quality === 'low', 'this phone keeps its own Bazaar purchases and graphics setting');
  report(after.note === 'پیشرفتت اومد! مرحله‌ی ۱۱۹ · ۸۴۵ سکه', `and says so (${after.note})`);
  report(after.before === 3, 'the progress it replaced is kept aside');
  report(!errors.length, `no page errors${errors.length ? ': ' + [...new Set(errors)].slice(0, 2).join(' | ') : ''}`);
  console.log(fails ? `${fails} failure(s)` : 'all ok');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
