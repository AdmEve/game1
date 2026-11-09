// Older Android WebViews (the app accepts Chrome 84+): the game must run where canvas roundRect (Chrome 99) is
// missing, its CSS must not need :has() (105) or inset (87), a load failure on an old WebView must say to update
// it, and Capacitor's page for WebViews below 84 must read right (and offer a retry, not an update, on newer ones).
//   npx vite build && npx vite preview --port 4173 & URL=http://127.0.0.1:4173/ node scripts/oldwebview.cjs [out-dir]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL = process.env.URL || 'http://127.0.0.1:4173/';
const out = process.argv[2];
const UA = (v) => `Mozilla/5.0 (Linux; Android 9; SM-J600F Build/PPR1; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/${v}.0.4430.91 Mobile Safari/537.36`;
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
let fails = 0;
const report = (ok, msg) => { if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); };
(async () => {
  // The built CSS: nothing newer than Chrome 84 reads.
  const dist = path.join(__dirname, '..', 'dist', 'assets');
  const css = fs.readdirSync(dist).filter((f) => f.endsWith('.css')).map((f) => fs.readFileSync(path.join(dist, f), 'utf8')).join('\n');
  const has = (css.match(/:has\(/g) || []).length, inset = (css.match(/(^|[;{\s])inset\s*:/g) || []).length;
  report(!has && !inset, `built CSS: ${has} :has() and ${inset} inset (both need a newer Chrome than 84)`);

  const b = await chromium.launch({ args: GL });
  // 1. Chrome 90 without roundRect: boots, plays a level to the win, opens the garage, draws a share picture.
  {
    const p = await b.newPage({ viewport: { width: 360, height: 640 }, userAgent: UA(90) });
    const errors = []; p.on('pageerror', (e) => errors.push(e.message));
    await p.addInitScript(() => { for (const c of [CanvasRenderingContext2D, Path2D, globalThis.OffscreenCanvasRenderingContext2D]) if (c) delete c.prototype.roundRect; });
    await p.goto(URL + '?play', { waitUntil: 'load' });
    const title = await p.waitForFunction(() => document.title === 'ready' || document.title === 'fatal', null, { timeout: 300000 }).then(() => p.title(), () => 'timeout');
    report(title === 'ready', `Chrome 90 without roundRect: ${title === 'ready' ? 'boots' : 'ended as ' + title}`);
    if (title === 'ready') {
      const r = await p.evaluate(async () => {
        const rb = window.__rb;
        document.querySelectorAll('.modal-back').forEach((m) => m.remove()); document.body.classList.remove('at-home');
        const s = rb.session();
        for (const m of rb.solve(s.level)) { s.tap(m); await rb.advance(0.7, false); }
        for (let k = 0; k < 40 && !document.querySelector('.result.win'); k++) await rb.advance(0.5, false);
        const won = !!document.querySelector('.result.win');
        document.querySelectorAll('.modal-back').forEach((m) => m.remove());
        rb.cards.garage(); await new Promise((x) => setTimeout(x, 800));
        const garage = !!document.querySelector('.garage .stage canvas');
        const share = (await rb.shareCard(24)).length;
        return { won, garage, share, polyfilled: typeof CanvasRenderingContext2D.prototype.roundRect === 'function' };
      });
      report(r.polyfilled, 'roundRect polyfilled');
      report(r.won && r.garage && r.share > 100000, `plays level 1 to the win (${r.won}), garage opens (${r.garage}), share picture drawn (${Math.round(r.share / 1024)} KB)`);
    }
    report(!errors.length, `no page errors${errors.length ? ': ' + [...new Set(errors)].slice(0, 2).join(' | ') : ''}`);
    await p.close();
  }
  // 2. Without the polyfill (roundRect present but broken), Chrome 95: the load fails, and the card says to update
  //    Android System WebView (the polyfill above is what keeps this from happening).
  {
    const p = await b.newPage({ viewport: { width: 360, height: 640 }, userAgent: UA(95) });
    await p.addInitScript(() => { CanvasRenderingContext2D.prototype.roundRect = undefined; });
    await p.goto(URL, { waitUntil: 'load' });
    const title = await p.waitForFunction(() => document.title === 'ready' || document.title === 'fatal', null, { timeout: 300000 }).then(() => p.title(), () => 'timeout');
    const text = await p.evaluate(() => document.querySelector('.fatal-box')?.innerText ?? '');
    report(title === 'fatal' && text.includes('Android System WebView') && text.includes('۹۵'), `a load failure on WebView 95 says to update it: ${title === 'fatal' ? text.split('\n').filter(Boolean).slice(2, 3).join(' ') : 'ended as ' + title}`);
    if (out) await p.screenshot({ path: `${out}/oldwebview-fatal.png` });
    await p.close();
  }
  // 3. Capacitor's page for WebViews below 84, and on a new one (a page that failed to load): retry instead.
  for (const [v, want] of [[70, 'update'], [120, 'retry']]) {
    const p = await b.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, userAgent: UA(v) });
    await p.goto(URL + 'webview-update.html', { waitUntil: 'load' });
    await p.waitForTimeout(300);
    const r = await p.evaluate(() => {
      const vis = (id) => { const e = document.getElementById(id); return !!e && e.offsetParent !== null; };
      const box = document.querySelector('.box').getBoundingClientRect();
      return { update: vis('update'), retry: vis('retry'), ver: document.getElementById('ver').textContent, bottom: Math.round(box.bottom), w: document.documentElement.scrollWidth };
    });
    const ok = want === 'update' ? r.update && !r.retry && r.ver.includes(String(v)) : r.retry && !r.update;
    report(ok && r.w <= 360 && r.bottom <= 640, `update page on WebView ${v}: shows ${r.update ? 'store links' : ''}${r.retry ? 'a retry' : ''}${r.ver ? ` and "${r.ver}"` : ''}; content ends at ${r.bottom}px, width ${r.w}px`);
    if (out) await p.screenshot({ path: `${out}/oldwebview-page-${v}.png`, fullPage: true });
    await p.close();
  }
  await b.close();
  console.log(fails ? `${fails} failure(s)` : 'all ok');
  process.exit(fails ? 1 : 0);
})();
