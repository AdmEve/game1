// Share a win: the picture for levels of every kind (buses and pickups, bikes, covered cars, cones, fruit carts,
// tunnels), saved for a look by eye; and the share button only where it belongs (new hard or chapter-final wins
// and the daily rush, not ordinary wins or replays). The share call must carry the picture and the store link.
//   npx vite preview --port 4173 & URL=http://127.0.0.1:4173/ node scripts/sharecard.cjs [out-dir]
const { chromium } = require('playwright');
const fs = require('fs');
const URL = process.env.URL || 'http://127.0.0.1:4173/';
const out = process.argv[2];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (Linux; Android 13) Mobile' });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  // Record what the page asks the browser to share.
  await p.addInitScript(() => {
    window.__shared = [];
    navigator.canShare = () => true;
    navigator.share = async (d) => { window.__shared.push({ text: d.text, files: (d.files || []).map((f) => ({ name: f.name, type: f.type, size: f.size })) }); };
  });
  await p.goto(URL + '?play', { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 300000 });
  let fails = 0;
  const fail = (m) => { fails++; console.log('FAIL ' + m); };
  // One level of each kind (the first that has it).
  const picks = await p.evaluate(() => {
    const L = window.__rb.levels, find = (f) => L.findIndex(f);
    return {
      'buses and pickups': find((l) => l.vehicles.some((v) => v.kind === 'bus') && l.vehicles.some((v) => v.kind === 'zamyad')),
      bikes: find((l) => l.vehicles.some((v) => v.kind === 'bike')),
      'covered cars': find((l) => l.vehicles.some((v) => v.covered)),
      cones: find((l) => (l.obstacles || []).some((o) => o.kind === 'cone')),
      'fruit cart': find((l) => (l.obstacles || []).some((o) => o.kind === 'cart')),
      tunnels: find((l) => (l.obstacles || []).filter((o) => o.kind === 'tunnel').length >= 4),
      'largest board': L.reduce((m, l, i) => (l.w * l.h > L[m].w * L[m].h ? i : m), 0),
    };
  });
  for (const [kind, n] of Object.entries(picks)) {
    if (n < 0) { console.log(`(no level with ${kind})`); continue; }
    const url = await p.evaluate((n) => window.__rb.shareCard(n), n);
    const png = Buffer.from(url.split(',')[1], 'base64');
    const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
    if (w !== 1080 || h !== 1350) fail(`${kind}: ${w}x${h}`);
    if (out) fs.writeFileSync(`${out}/share-${kind.replace(/\W+/g, '-')}.png`, png);
    console.log(`ok   ${kind}: level ${n + 1}, ${w}x${h}, ${Math.round(png.length / 1024)} KB`);
  }
  // Where the button shows.
  const cases = [
    ['new hard-level win', (n) => n, true],
    ['new ordinary win', (n) => n, false],
    ['replayed hard level', (n) => n, false],
  ];
  const hard = await p.evaluate(() => window.__rb.levels.findIndex((l, i) => i > 8 && l.tag));
  const plain = await p.evaluate(() => window.__rb.levels.findIndex((l, i) => i > 8 && !l.tag && (i + 1) % 30 !== 0));
  for (const [name, , want] of cases) {
    const n = name.includes('ordinary') ? plain : hard, replay = name.startsWith('replayed');
    const has = await p.evaluate(async ([n, replay]) => {
      const r = window.__rb;
      document.querySelectorAll('.modal-back').forEach((m) => m.remove());
      r.save.level = replay ? n + 5 : n;
      r.startLevel(n, undefined, false);
      document.querySelectorAll('.modal-back').forEach((m) => m.remove());
      r.cards.win();
      await new Promise((x) => setTimeout(x, 400));
      const btn = document.querySelector('.result.win .win-row .btn.share');
      const row = document.querySelector('.result.win .win-row')?.getBoundingClientRect();
      return { btn: !!btn, fits: row ? row.right <= innerWidth && row.left >= 0 : false };
    }, [n, replay]);
    if (has.btn !== want) fail(`${name} (level ${n + 1}): share button ${has.btn ? 'shown' : 'missing'}`);
    else if (!has.fits) fail(`${name}: win row off screen`);
    else console.log(`ok   ${name}: share button ${want ? 'shown' : 'absent'}`);
  }
  // The daily rush win, and what a tap on share sends.
  const rush = await p.evaluate(async () => {
    const r = window.__rb;
    document.querySelectorAll('.modal-back').forEach((m) => m.remove());
    await r.goLevel(undefined, r.levels[40], false);
    document.querySelectorAll('.modal-back').forEach((m) => m.remove());
    r.cards.rushWin();
    await new Promise((x) => setTimeout(x, 400));
    const btn = document.querySelector('.result.win .btn.share');
    if (!btn) return null;
    btn.click();
    for (let k = 0; k < 50 && !window.__shared.length; k++) await new Promise((x) => setTimeout(x, 100));
    return window.__shared[0] ?? 'nothing shared';
  });
  if (!rush) fail('rush win: no share button');
  else if (typeof rush === 'string') fail('rush win: ' + rush);
  else {
    const f = rush.files[0];
    if (!f || f.type !== 'image/jpeg' || f.size < 20000 || f.size > 600000) fail(`rush share: bad file ${JSON.stringify(f)}`);
    else if (!rush.text.includes('cafebazaar.ir/app/')) fail('rush share: no store link in the text');
    else console.log(`ok   rush win shares a ${Math.round(f.size / 1024)} KB picture and: ${rush.text}`);
  }
  if (errors.length) fail('page errors: ' + errors.slice(0, 3).join(' | '));
  console.log(fails ? `${fails} failure(s)` : 'all ok');
  await b.close();
  process.exit(fails ? 1 : 0);
})();
