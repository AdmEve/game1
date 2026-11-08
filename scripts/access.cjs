// Accessibility check at 360x640 with the phone set to reduce motion: the setting follows it, large text
// leaves nothing off-screen, volume sliders store and switch sound off at zero. Writes <out>-settings.png, <out>-bigtext.png.
//   node scripts/access.cjs /tmp/acc
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (Linux; Android 12) Mobile', reducedMotion: 'reduce' });
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto('http://127.0.0.1:5173/?play&shot', { waitUntil: 'load' });
  await p.waitForFunction(() => document.title === 'ready', null, { timeout: 120000 });
  console.log('OS reduce-motion followed:', await p.evaluate(() => document.documentElement.classList.contains('reduce-motion')));
  await p.evaluate(() => { document.querySelectorAll('.modal-back').forEach((m) => m.remove()); });
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  await p.screenshot({ path: out + '-settings.png' });
  // Large text on.
  await p.evaluate(() => { const rows = [...document.querySelectorAll('.settings .row')]; const r = rows.find((x) => x.textContent.includes('متن بزرگ')); r.querySelector('input').click(); });
  await p.waitForTimeout(300);
  await p.screenshot({ path: out + '-bigtext.png' });
  const over = await p.evaluate(() => { const c = document.querySelector('.pause-card'); const bad = []; c.querySelectorAll('*').forEach((e) => { const r = e.getBoundingClientRect(); if (r.width && (r.right > innerWidth + 1 || r.left < -1)) bad.push(e.className || e.tagName); }); return bad.slice(0, 5); });
  console.log('elements overflowing the screen with large text:', JSON.stringify(over));
  // Volumes: the sfx slider to 0 turns sound off; music slider sets the level.
  const vol = await p.evaluate(async () => {
    const rows = [...document.querySelectorAll('.settings .row.slider input')];
    rows[1].value = '0'; rows[1].dispatchEvent(new Event('input')); rows[1].dispatchEvent(new Event('change'));
    rows[0].value = '50'; rows[0].dispatchEvent(new Event('input')); rows[0].dispatchEvent(new Event('change'));
    const s = window.__rb.save.settings;
    return { sound: s.sound, sfxVol: s.sfxVol, music: s.music, musicVol: s.musicVol, stored: JSON.parse(localStorage.getItem('rahbandoon.save.v1')).settings.sfxVol };
  });
  console.log('volumes:', JSON.stringify(vol));
  if (errors.length) console.log('errors', errors);
  await b.close();
})();
