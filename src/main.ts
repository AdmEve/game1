import 'vazirmatn/Vazirmatn-font-face.css';
import './style.css';
import * as THREE from 'three';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import LEVELS from './game/levels.json';
import type { Color, Kind, Level } from './game/rules';
import { busy, ease, tick, tween } from './render/anim';
import { outdoorEnv } from './render/env.js';
import { warmFleet } from './render/fleet';
import { sky } from './render/world';
import { Session } from './play/session';
import { CHAPTERS, chapterOf, type Light } from './game/chapters';
import { lightsMaterial } from './render/fleet';
import { BOOSTERS, Hud, button, fa, faNum, h, modal, type BoosterId } from './ui/hud';
import { emo } from './ui/emoji';
import { maybeDaily, showChest, showIntro, showShop } from './ui/meta';
import { claimable, newlyReached, showAchievements } from './ui/achieve';
import { POM, showYaldaWin, yaldaBanner } from './ui/yalda';
import { yaldaLevel } from './game/events';
import { addKeys, showGarage } from './ui/garage';
import { radioCard } from './ui/radio';
import { dailyLevel, today } from './game/daily';
import { initMonetization, maybeInterstitial, rateApp, rewardedAvailable, showRewarded } from './monetize';
import { persist, save } from './save';
import { click, coin } from './audio';
import { setMood, setTension, startMusic, stopMusic } from './music';
import { haptic } from './haptics';

const levels = LEVELS as Level[];
const debug = new URLSearchParams(location.search);

// ───── Renderer and scene ─────
const app = document.getElementById('app')!;
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: debug.has('shot') });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, debug.has('shot') ? 3 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.append(renderer.domElement);
// Lens look: a tilt-shift blur on the far city (miniature feel) and a soft vignette.
const tilt = document.createElement('div'); tilt.className = 'tiltshift';
const vignette = document.createElement('div'); vignette.className = 'vignette';
const tint = document.createElement('div'); tint.className = 'tint';
app.append(tilt, tint, vignette);

const scene = new THREE.Scene();
scene.background = sky();
scene.fog = new THREE.Fog(0xdfe9f2, 40, 95);
scene.environment = outdoorEnv(renderer);
scene.environmentIntensity = 0.8;
scene.add(new THREE.HemisphereLight(0xe3f0ff, 0x6b5a45, 0.7));
const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
sun.shadow.radius = 3;
scene.add(sun, sun.target);

const hemi = scene.children.find((o) => (o as THREE.HemisphereLight).isHemisphereLight) as THREE.HemisphereLight;

/** Per-chapter time of day: sky, fog, sun angle and color, exposure, how much lamps and headlights glow. */
const LIGHTS: Record<Light, { sky: [number, string][]; fog: number; hemi: [number, number, number]; sun: [number, number, [number, number, number]]; exposure: number; env: number; lamps: number }> = {
  day: { sky: [[0, '#4b93dd'], [0.5, '#9dcff7'], [0.85, '#e8eef2'], [1, '#f7e7cf']], fog: 0xdfe9f2, hemi: [0xe3f0ff, 0x6b5a45, 0.7], sun: [0xfff0d8, 2.6, [-9, 22, 11]], exposure: 0.95, env: 0.8, lamps: 0.32 },
  sunset: { sky: [[0, '#34477f'], [0.45, '#c9708a'], [0.75, '#f6a05e'], [1, '#ffd79a']], fog: 0xe8956a, hemi: [0xffb98c, 0x3d2a45, 0.42], sun: [0xff8a3d, 3.2, [-22, 8, 5]], exposure: 0.92, env: 0.45, lamps: 1.0 },
  bazaar: { sky: [[0, '#5a8fd0'], [0.5, '#bcd6ee'], [0.85, '#f3e6cf'], [1, '#f6d9a8']], fog: 0xf0e2c8, hemi: [0xfff1d8, 0x7a5a3a, 0.62], sun: [0xffd49a, 2.8, [-14, 16, 9]], exposure: 0.95, env: 0.7, lamps: 0.4 },
  autumn: { sky: [[0, '#4f7fb8'], [0.5, '#e7b98a'], [0.82, '#f6c27a'], [1, '#ffdca3']], fog: 0xe9c89a, hemi: [0xffe0b0, 0x5a3a20, 0.55], sun: [0xffb15c, 3.0, [-18, 12, 8]], exposure: 0.93, env: 0.55, lamps: 0.8 },
  snow: { sky: [[0, '#8fb3d9'], [0.5, '#cfe0f0'], [1, '#f4f8fb']], fog: 0xe6eef6, hemi: [0xf0f6ff, 0xb9c4d0, 0.95], sun: [0xf2f6ff, 2.1, [-8, 24, 12]], exposure: 0.92, env: 0.9, lamps: 0.5 },
  night: { sky: [[0, '#040918'], [0.55, '#122148'], [1, '#2c3d6e']], fog: 0x0f1a36, hemi: [0x6a7fc0, 0x10121c, 0.34], sun: [0xb4c6ff, 0.55, [10, 20, 8]], exposure: 1.25, env: 0.18, lamps: 2.6 },
};
let sunOffset = new THREE.Vector3(-9, 22, 11);
function applyLight(light: Light) {
  const L = LIGHTS[light];
  (scene.background as THREE.Texture)?.dispose();
  scene.background = sky(L.sky);
  (scene.fog as THREE.Fog).color.setHex(L.fog);
  hemi.color.setHex(L.hemi[0]); hemi.groundColor.setHex(L.hemi[1]); hemi.intensity = L.hemi[2];
  sun.color.setHex(L.sun[0]); sun.intensity = L.sun[1]; sunOffset = new THREE.Vector3(...L.sun[2]);
  renderer.toneMappingExposure = L.exposure;
  scene.environmentIntensity = L.env;
  lightsMaterial.emissiveIntensity = L.lamps;
  document.body.dataset.light = light;
}

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 260);
const PITCH = THREE.MathUtils.degToRad(54);

let session: Session | null = null;
let hud: Hud;
let craneMode = false;
let modalOpen = false;
const safe = { top: 132, bottom: 128 };

// Tutorial hand: on the first levels before the first tap, and after a long idle anywhere.
const hand = h('div', 'hand', emo('👆', 'emo'));
document.body.append(hand);
let hintFor = -1, hintAt = 0;
function updateHand() {
  if (!session || modalOpen || session.s.over) { hand.classList.remove('show'); hintFor = -1; return; }
  const idle = performance.now() - session.lastInput;
  const want = (current < 3 && session.taps === 0) || (current < 3 && idle > 3500) || idle > 10000;
  if (!want) { hand.classList.remove('show'); hintFor = -1; return; }
  if (hintFor < 0 || !session.s.inLot[hintFor] || performance.now() - hintAt > 4000) { hintFor = session.hint(); hintAt = performance.now(); }
  if (hintFor < 0) { hand.classList.remove('show'); return; }
  const p = session.anchor(hintFor).project(camera);
  hand.style.left = `${((p.x + 1) / 2) * window.innerWidth}px`;
  hand.style.top = `${((1 - p.y) / 2) * window.innerHeight}px`;
  hand.classList.add('show');
}

/** Fit the level's focus box between the top bar and the booster bar. */
function fitCamera() {
  const W = window.innerWidth, H = window.innerHeight;
  renderer.setSize(W, H);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  if (!session) return;
  const box = session.focus();
  const center = box.getCenter(new THREE.Vector3());
  const dir = new THREE.Vector3(0, Math.sin(PITCH), Math.cos(PITCH));
  const corners: THREE.Vector3[] = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
  const top = 1 - (2 * safe.top) / H, bottom = -1 + (2 * safe.bottom) / H, side = 1 - 24 / W;
  let target = center.clone();
  for (let iter = 0; iter < 4; iter++) {
    let lo = 4, hi = 120;
    const fits = (d: number) => {
      camera.position.copy(target).addScaledVector(dir, d); camera.lookAt(target); camera.updateMatrixWorld();
      let minY = Infinity, maxY = -Infinity, maxX = 0;
      for (const c of corners) { const p = c.clone().project(camera); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); maxX = Math.max(maxX, Math.abs(p.x)); }
      return { ok: maxY - minY <= top - bottom && maxX <= side, minY, maxY };
    };
    for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (fits(m).ok) hi = m; else lo = m; }
    const r = fits(hi);
    // Sit the lot right above the booster bar; spare height goes to the city skyline.
    const want = bottom, have = r.minY;
    if (Math.abs(want - have) < 0.004) break;
    const shift = (have - want) * hi * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.sin(PITCH);
    target = target.clone().add(new THREE.Vector3(0, 0, -shift));
  }
  camBase.copy(camera.position);
  camTarget.copy(target);
  // Keep the sun's shadow box around the playfield.
  sun.position.copy(target).add(sunOffset);
  sun.target.position.copy(target);
  const ext = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.75 + 4;
  Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 70 });
  sun.shadow.camera.updateProjectionMatrix();
}

// ───── Juice: floating texts and camera shake ─────
let shakeAmp = 0;
const camBase = new THREE.Vector3(), camTarget = new THREE.Vector3();

/** Level opening: the camera swoops down from the skyline onto the lot. */
function introSwoop() {
  if (debug.has('shot') || !session) return;
  const endPos = camBase.clone(), endLook = camTarget.clone();
  const startLook = new THREE.Vector3(0, 3, session.L.walkZ - 14);
  const startPos = endPos.clone().add(new THREE.Vector3(0, 6, 10));
  const look = new THREE.Vector3();
  void tween(1.5, (k) => {
    camera.position.lerpVectors(startPos, endPos, k);
    look.lerpVectors(startLook, endLook, k);
    camera.lookAt(look);
    camBase.copy(camera.position);
  }, ease.inOut).then(() => { camera.position.copy(endPos); camera.lookAt(endLook); camBase.copy(endPos); });
}
function floatText(text: string, at: THREE.Vector3, kind: 'coin' | 'combo' | 'bad') {
  const p = at.clone().project(camera);
  const el = h('div', 'float float-' + kind, kind === 'coin' ? `${emo('🧍', 'emo sm')}<b dir="ltr">${fa(text)}</b>` : `<b>${fa(text)}</b>`);
  el.style.left = `${((p.x + 1) / 2) * window.innerWidth}px`;
  el.style.top = `${((1 - p.y) / 2) * window.innerHeight}px`;
  document.body.append(el);
  setTimeout(() => el.remove(), 1300);
}
function cameraFlash() {
  const f = h('div', 'flash');
  document.body.append(f);
  click(); setTimeout(() => click(), 70);
  setTimeout(() => f.remove(), 450);
}
function applyShake(dt: number) {
  if (shakeAmp <= 0.001) { if (shakeAmp > 0) { camera.position.copy(camBase); shakeAmp = 0; } return; }
  camera.position.copy(camBase).add(new THREE.Vector3((Math.random() - 0.5) * shakeAmp, (Math.random() - 0.5) * shakeAmp, (Math.random() - 0.5) * shakeAmp));
  shakeAmp *= Math.exp(-dt * 14);
}

// ───── Input ─────
const ray = new THREE.Raycaster();
const groundY = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.45);
let down: { x: number; y: number; i: number } | null = null;
function pick(x: number, y: number): number {
  if (!session) return -1;
  ray.setFromCamera(new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1), camera);
  const p = new THREE.Vector3();
  if (!ray.ray.intersectPlane(groundY, p)) return -1;
  return session.vehicleAt(p);
}
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (!session || modalOpen) return;
  const i = pick(e.clientX, e.clientY);
  down = { x: e.clientX, y: e.clientY, i };
  if (i >= 0) session.press(i, true);
});
renderer.domElement.addEventListener('pointercancel', () => { if (down && down.i >= 0) session?.press(down.i, false); down = null; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || !session || modalOpen) return;
  const d = down; down = null;
  if (d.i >= 0) session.press(d.i, false);
  if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 14) return;
  const i = d.i >= 0 ? d.i : pick(e.clientX, e.clientY);
  if (i < 0) return;
  if (craneMode) {
    if (session.crane(i)) { save.boosters.crane--; helped = true; persist(); hud.refresh(); }
    craneMode = false; hud.active(null);
  } else session.tap(i);
  hand.classList.remove('show'); hintFor = -1;
});

// ───── Level flow ─────
function disposeSession() {
  if (!session) return;
  scene.remove(session.group);
  session.group.traverse((o) => {
    const m = o as THREE.Mesh;
    // Vehicle geometry and materials are shared between levels; free only the world's.
    if (!m.isMesh || m.geometry.userData.keep) return;
    m.geometry.dispose();
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      (mat as THREE.MeshStandardMaterial).map?.dispose();
      mat.dispose();
    }
  });
  session = null;
}

/** The level being played (a replay when below save.level). */
let current = 0;
/** Playing today's «ساعت شلوغی» instead of a Journey level. */
let rush: Level | null = null;
/** A booster or a continue was used this level (it then doesn't count as a clean win). */
let helped = false;
/** «شب یلدا»: which night of the event is being played, or -1. */
let yaldaNight = -1;

function startLevel(pick?: number, custom?: Level, swoop = true, night = -1) {
  disposeSession();
  rush = custom ?? null;
  yaldaNight = night;
  current = Math.min(pick ?? save.level, levels.length - 1);
  const n = current;
  const level = custom ?? levels[n];
  // The rush hour rotates through the chapters' places by weekday.
  // Yalda nights are played at home in Tajrish, after dark.
  const ch = night >= 0 ? { ...CHAPTERS[0], light: 'night' as const } : custom ? CHAPTERS[new Date().getDay() % CHAPTERS.length] : chapterOf(n);
  applyLight(ch.light);
  setMood(ch.light);
  craneMode = false;
  modalOpen = false;
  helped = false;
  session = new Session(level, {
    queueLeft: (q, total) => hud.setQueue(q, total),
    toast: (t) => hud.toast(t),
    canPlay: () => !modalOpen,
    won: () => showWin(),
    lost: () => showLose(),
    float: floatText,
    parity: (p, left) => hud.setParity(p, left),
    officer: (a) => hud.setOfficer(a),
    flash: cameraFlash,
    shake: (a) => { shakeAmp = Math.max(shakeAmp, a); },
  }, n + 1, { stop: ch.stop, night: ch.light === 'night', snow: ch.light === 'snow', landmark: ch.landmark, autumn: ch.light === 'autumn', boulevard: ch.n === 2, yalda: night >= 0, skins: save.garage.restored, colorblind: save.settings.colorblind });
  scene.add(session.group);
  if (night >= 0) hud.setEvent(`شب یلدا ${fa(night + 1)}`, POM('hud')); else if (custom) hud.setRush(); else hud.setLevel(n + 1, level.tag);
  hud.refresh();
  hud.active(null);
  hud.show(true);
  fitCamera();
  if (swoop) introSwoop();
  if (custom) return;
  const TIPS = ['روی ماشینی بزن که مسافرهای جلوی صف رنگش رو می‌خوان!', 'فلش روی ماشین جهت حرکتشه. اول ماشین‌های جلویی رو رد کن!', 'جای پارک ایستگاه محدوده؛ ماشینی رو بفرست که مسافرش تو صف نزدیکه.'];
  if (n < TIPS.length) hud.toast(TIPS[n], 5500);
  if (n === ch.from && n > 0 && !save.seen['ch' + ch.n]) {
    modalOpen = true;
    const c = h('div', 'newch');
    const blurb = { night: 'شب‌های میدان آزادی، چراغ‌ها روشن و ترافیک سنگین!', sunset: 'غروب ولیعصر، زیر چنارهای قدیمی. ترافیک داره سنگین‌تر می‌شه!', snow: 'برف اومده! همه دارن می‌رن توچال اسکی. پلیس راهور هم سر چهارراه وایستاده.', bazaar: 'بازار بزرگ تهران! گاری‌های میوه همه‌جا هستن و جای پارک پیدا نمی‌شه.', autumn: 'پاییز دربند! برگ‌های نارنجی، چای و قلیون کنار رودخونه… و ماشین‌های عروس که عجله دارن.', day: '' }[ch.light];
    c.innerHTML = `<div class="burst">${emo({ night: '🌙', sunset: '🌇', snow: '❄️', bazaar: '🕌', autumn: '🍁', day: '🌄' }[ch.light], 'emo huge')}</div><small>فصل جدید باز شد!</small><h2>فصل ${fa(ch.n)}: ${ch.name}</h2><p>${blurb}</p>`;
    const close = modal(c, 'pop');
    c.append(button('بزن بریم!', 'primary big', () => { save.seen['ch' + ch.n] = true; persist(); close(); modalOpen = false; }));
  } else if (level.intro && !save.seen[level.intro]) {
    modalOpen = true;
    showIntro(level.intro).then(() => { save.seen[level.intro!] = true; persist(); modalOpen = false; });
  }
}

function useBooster(id: BoosterId) {
  if (!session || modalOpen) return;
  const def = BOOSTERS.find((b) => b.id === id)!;
  if (save.boosters[id] <= 0) {
    if (save.coins < def.price) { hud.toast('سکه کافی نداری!'); return; }
    save.coins -= def.price; save.boosters[id]++; persist(); hud.refresh(); coin();
  }
  if (id === 'crane') {
    craneMode = !craneMode;
    hud.active(craneMode ? 'crane' : null);
    if (craneMode) hud.toast(def.hint, 2200);
    return;
  }
  const ok = id === 'bay' ? session.extraBay() : session.whistle();
  if (!ok) { hud.toast(id === 'bay' ? 'همه‌ی جاهای پارک بازه!' : 'یه لحظه صبر کن…'); return; }
  save.boosters[id]--; helped = true; persist(); hud.refresh(); hud.bump(id); haptic('medium');
}

function reward(n: number) {
  return 20 + Math.min(40, n * 2) + (levels[n]?.tag ? 40 : 0);
}

/** Counts a win towards the achievements; returns a banner for any medal just earned. */
function recordWin(boss: boolean) {
  const st = save.stats;
  st.wins++;
  if (session) { st.people += session.s.queue.length; st.bestCombo = Math.max(st.bestCombo, session.bestCombo); }
  if (!helped) st.clean++;
  if (boss) st.bosses++;
  st.bestRush = Math.max(st.bestRush, save.rush.streak);
  const got = newlyReached();
  return got.length ? `<div class="newach">${emo('🏅', 'emo sm')} افتخار جدید: <b>${got.map((a) => a.name).join('، ')}</b><small>جایزه‌ش تو صفحه‌ی افتخارات منتظرته</small></div>` : '';
}

function showRushWin() {
  const streak = save.rush.day === new Date(Date.now() - 864e5).toISOString().slice(0, 10) ? save.rush.streak + 1 : 1;
  save.rush = { day: today(), streak };
  const coins = 250 + Math.min(6, streak - 1) * 50;
  save.coins += coins; addKeys(1); const ach = recordWin(false); persist();
  modalOpen = true; hud.show(false); hud.refresh();
  const c = h('div', 'result win');
  c.innerHTML = `<div class="burst">${emo('⏰', 'emo huge')}</div><h2>ساعت شلوغی رو رد کردی!</h2><p>${fa(streak)} روز پشت سر هم! فردا یه ترافیک تازه منتظرته.</p>
    <div class="reward">${emo('🪙')}<b dir="ltr">+${faNum(coins)}</b></div><div class="reward keyr">${emo('🔑')}<b dir="ltr">+${fa(1)}</b></div>${ach}`;
  const close = modal(c, 'pop');
  c.append(button('برگرد به خونه', 'primary big', () => { close(); modalOpen = false; startLevel(); showHome(); }));
  for (let i = 0; i < 6; i++) coin(0.15 + i * 0.09);
}

function showWin() {
  if (yaldaNight >= 0) {
    recordWin(false);
    modalOpen = true; hud.show(false); hud.refresh();
    showYaldaWin(yaldaNight, () => { hud.refresh(); modalOpen = false; startLevel(); showHome(); });
    return;
  }
  if (rush) { showRushWin(); return; }
  const n = current;
  const replay = n < save.level;
  // Replays pay a little; keys and progress only come from new levels.
  const coins = replay ? 10 : reward(n) + (session?.bonus ?? 0);
  const lvl = levels[n];
  const keys = replay ? 0 : (lvl?.tag ? 1 : 0) + (n + 1 === chapterOf(n).to ? 2 : 0);
  if (keys) addKeys(keys);
  const ach = recordWin(!replay && !!lvl?.tag);
  save.coins += coins;
  if (!replay) save.level = Math.min(save.level + 1, levels.length);
  persist();
  modalOpen = true;
  hud.show(false);
  hud.refresh();
  const c = h('div', 'result win');
  c.innerHTML = `<div class="burst">${emo('🏆', 'emo huge')}</div><h2>آفرین!</h2><p>همه‌ی مسافرها سوار شدن و ترافیک باز شد.</p>
    <div class="reward">${emo('🪙')}<b dir="ltr">+${faNum(coins)}</b></div>${keys ? `<div class="reward keyr">${emo('🔑')}<b dir="ltr">+${fa(keys)}</b><small>سوئیچ گاراژ</small></div>` : ''}${ach}`;
  const close = modal(c, 'pop');
  const next = async () => {
    close(); modalOpen = true;
    if (!replay && (n + 1) % 5 === 0) await showChest(() => hud.refresh());
    if ((n + 1 === 8 || n + 1 === 24) && !save.rated) await askRating();
    await maybeInterstitial(n);
    modalOpen = false; startLevel();
  };
  if (rewardedAvailable()) {
    const dbl = button(`${emo('🎬', 'emo sm')} دو برابرش کن!`, 'gold', async () => {
      dbl.setAttribute('disabled', '');
      if (await showRewarded()) {
        save.coins += coins; persist(); hud.refresh();
        (c.querySelector('.reward b') as HTMLElement).textContent = `+${faNum(coins * 2)}`;
        for (let i = 0; i < 5; i++) coin(i * 0.08);
        dbl.remove();
      } else dbl.removeAttribute('disabled');
    });
    c.append(dbl);
  }
  c.append(button(save.level >= levels.length ? 'همه‌ی مرحله‌ها رو تموم کردی! 🎉' : `مرحله‌ی بعد ${fa(save.level + 1)}`, 'primary big', () => { void next(); }));
  for (let i = 0; i < 5; i++) coin(0.15 + i * 0.09);
}

/** Ask happy players (right after a win) to rate the game on Bazaar; unhappy ones are not sent there. */
function askRating(): Promise<void> {
  return new Promise((done) => {
    const c = h('div', 'rate');
    c.innerHTML = `<div class="burst">${emo('😍', 'emo huge')}</div><h2>از راه‌بندون خوشت میاد؟</h2><p>با پنج ستاره تو بازار کمکمون کن تا مرحله‌های بیشتری بسازیم!</p>`;
    const close = modal(c, 'pop');
    c.append(button(`${emo('⭐', 'emo sm')} آره، پنج ستاره!`, 'gold big', () => { save.rated = true; persist(); rateApp(); close(); done(); }));
    c.append(button('بعداً', 'ghost', () => { close(); done(); }));
  });
}

function showLose() {
  save.stats.losses++;
  persist();
  modalOpen = true;
  const c = h('div', 'result lose');
  const price = 300;
  const COLOR_FA: Record<string, string> = { red: 'قرمز', yellow: 'زرد', blue: 'آبی', green: 'سبز', purple: 'بنفش', orange: 'نارنجی', white: 'سفید', pink: 'صورتی' };
  const want = session ? session.s.queue[session.s.q] : undefined;
  // Bays still free means the loss came from a wedding car missing its deadline.
  const bride = session && !session.isFull() ? session.s.late.findIndex(Boolean) : -1;
  const culprit = bride >= 0 ? bride : session ? session.culprit() : -1;
  if (culprit >= 0) session!.highlight(culprit);
  const why = bride >= 0 ? 'ماشین عروس به موقع راه نیفتاد و عروس دیر رسید! دفعه‌ی بعد اول راهش رو باز کن.' : want && culprit >= 0 ? `مسافر جلوی صف ماشین <b>${COLOR_FA[want]}</b> می‌خواست، ولی هنوز تو پارکینگ گیر کرده بود.` : 'همه‌ی جاهای پارک پر شد و مسافر جلوی صف ماشینش رو نداره.';
  c.innerHTML = `<div class="burst">${emo(bride >= 0 ? '💔' : '🚧', 'emo huge')}</div><h2>${bride >= 0 ? 'عروسی به هم خورد!' : 'راه‌بندون شد!'}</h2><p>${why}</p>`;
  const close = modal(c, 'pop');
  const canBay = session && (session.s.bays.length < 6 || bride >= 0);
  const resume = () => { close(); modalOpen = false; helped = true; session!.extraBay(); };
  if (canBay) {
    c.append(button(`${emo(bride >= 0 ? '💐' : '🅿️', 'emo sm')} ${bride >= 0 ? 'ادامه بده' : 'یه جای پارک دیگه'}، ${emo('🪙', 'emo sm')} ${fa(price)}`, 'gold big', () => {
      if (save.coins < price) { hud.toast('سکه کافی نداری!'); showShop(() => {}, () => hud.refresh()); return; }
      save.coins -= price; persist(); hud.refresh();
      resume();
    }));
    if (rewardedAvailable()) {
      const ad = button(`${emo('🎬', 'emo sm')} با دیدن تبلیغ ادامه بده`, 'primary', async () => {
        ad.setAttribute('disabled', '');
        if (await showRewarded()) resume(); else ad.removeAttribute('disabled');
      });
      c.append(ad);
    }
  }
  c.append(button('از اول', canBay ? 'ghost' : 'primary big', () => { close(); modalOpen = false; startLevel(current, rush ?? undefined, true, yaldaNight); }));
}

function showSettings() {
  modalOpen = true;
  const c = h('div', 'settings');
  c.innerHTML = `<h2>${emo('⚙️')} تنظیمات</h2>`;
  const row = (label: string, key: keyof typeof save.settings) => {
    const r = h('label', 'row', `<span>${label}</span>`);
    const t = h('input') as HTMLInputElement; t.type = 'checkbox'; t.checked = save.settings[key]; t.className = 'switch';
    t.onchange = () => {
      save.settings[key] = t.checked; persist();
      if (key === 'music') { if (t.checked) startMusic(); else stopMusic(); }
      if (key === 'colorblind') needsRestart = true;
    };
    r.append(t); c.append(r);
  };
  row('صدا', 'sound'); row('موسیقی', 'music'); row('لرزش', 'haptics'); row('حالت کوررنگی (نماد روی رنگ‌ها)', 'colorblind');
  let needsRestart = false;
  const close = modal(c, 'pop');
  c.append(button(`${emo('🗺️', 'emo sm')} انتخاب مرحله`, 'ghost', () => { close(); showLevels(); }));
  c.append(button('شروع دوباره‌ی مرحله', 'ghost', () => { close(); modalOpen = false; startLevel(current); }));
  c.append(button('ادامه', 'primary', () => { close(); modalOpen = false; if (needsRestart && session && session.s.exits === 0) startLevel(current); }));
  // Version label; seven taps unlock every level (for testers).
  const ver = h('div', 'ver', `نسخه‌ی ${fa(__APP_VERSION__)}`);
  let taps = 0;
  ver.onclick = () => { if (++taps === 7) { save.devUnlock = true; persist(); hud.toast('همه‌ی مرحله‌ها باز شد (حالت آزمایشی)'); } };
  c.append(ver);
}

/** Level select: every chapter's levels; unlocked ones can be replayed. */
function showLevels() {
  modalOpen = true;
  const c = h('div', 'levels');
  c.innerHTML = `<h2>${emo('🗺️')} مرحله‌ها</h2>`;
  const unlocked = save.devUnlock ? levels.length : save.level;
  let close = () => {};
  for (const ch of CHAPTERS) {
    c.append(h('h3', '', `فصل ${fa(ch.n)}: ${ch.name}`));
    const grid = h('div', 'lgrid');
    for (let i = ch.from; i < ch.to && i < levels.length; i++) {
      const open = i <= unlocked;
      const tag = levels[i].tag;
      const b = h('button', `lv ${i < save.level ? 'done' : i === save.level ? 'now' : ''} ${open ? '' : 'locked'} ${tag ?? ''}`, open ? fa(i + 1) : emo('🔒', 'emo xs'));
      if (open) b.onclick = () => { close(); modalOpen = false; startLevel(i); hud.show(true); };
      grid.append(b);
    }
    c.append(grid);
  }
  close = modal(c, 'pop levels-card');
  c.append(button('بستن', 'ghost', () => { close(); modalOpen = false; }));
}

function showHome() {
  modalOpen = true;
  hud.show(false);
  const c = h('div', 'home');
  const ch = chapterOf(Math.min(save.level, levels.length - 1));
  const done = Math.min(save.level, ch.to) - ch.from, total = ch.to - ch.from;
  const map = CHAPTERS.map((k) => `<span class="${save.level >= k.to ? 'done' : k === ch ? 'now' : 'locked'}">${save.level >= k.from ? fa(k.n) : emo('🔒', 'emo xs')}</span>`).join('<i></i>');
  c.innerHTML = `<div class="logo"><span class="sign">راه‌بندون</span><small>ترافیک تهران، تو دستای تو</small></div>
    <div class="chapter"><div class="ch-map">${map}</div><div class="ch-t">${emo('📍')} فصل ${fa(ch.n)}: ${ch.name}</div><div class="ch-bar"><i style="width:${Math.round((done / total) * 100)}%"></i></div><div class="ch-n">${fa(done)} از ${fa(total)}</div></div>`;
  c.prepend(radioCard());
  const yb = yaldaBanner((night) => {
    const lvl = yaldaLevel(night);
    if (!lvl) { hud.toast('مرحله‌ی امشب آماده نشد، بعداً سر بزن!'); return; }
    close(); modalOpen = false;
    startLevel(undefined, lvl, true, night); hud.show(true);
  });
  if (yb) c.querySelector('.chapter')!.before(yb);
  const close = modal(c, 'home-card');

  const gar = button(`${emo('🔧', 'emo sm')} گاراژ من<small>${emo('🔑', 'emo xs')} ${fa(save.garage.keys)} سوئیچ</small>`, 'garage-btn', () => {
    close(); showGarage(() => showHome());
  });
  const rowEl = h('div', 'home-row');
  rowEl.append(gar);
  c.append(rowEl);
  const rushDone = save.rush.day === today();
  const rushBtn = button(rushDone ? `${emo('✅', 'emo sm')} ساعت شلوغی<small>امروز رد شد!</small>` : `${emo('⏰', 'emo sm')} ساعت شلوغی<small>چالش امروز ${emo('🔑', 'emo xs')}</small>`, rushDone ? 'rush-btn done' : 'rush-btn', () => {
    if (rushDone) return;
    const lvl = dailyLevel();
    if (!lvl) { hud.toast('چالش امروز آماده نشد، بعداً سر بزن!'); return; }
    close(); modalOpen = false;
    startLevel(undefined, lvl); hud.show(true);
  });
  rowEl.append(rushBtn);
  const waiting = claimable();
  rowEl.append(button(`${emo('🏆')}${waiting ? `<i class="badge">${fa(waiting)}</i>` : ''}`, 'ach-btn', () => {
    close(); showAchievements(() => showHome(), () => hud.refresh());
  }));
  c.append(button(`بزن بریم! <small>مرحله‌ی ${fa(save.level + 1)}</small>`, 'primary huge', async () => {
    close();
    await maybeDaily(() => hud.refresh());
    modalOpen = false; hud.show(true);
    introSwoop();
  }));
}

// ───── Boot ─────
async function boot() {
  hud = new Hud(document.body);
  hud.onBooster = useBooster;
  hud.onSettings = showSettings;
  hud.onCoins = () => { modalOpen = true; showShop(() => { modalOpen = false; }, () => hud.refresh()); };
  await document.fonts.load('900 40px Vazirmatn').catch(() => {});
  warmFleet([]);
  startLevel(undefined, undefined, debug.has('play'));
  if (!debug.has('play')) showHome();
  void initMonetization();
  window.addEventListener('resize', fitCamera);
  // Build every vehicle template in the background, one per idle frame, so later levels load instantly.
  const pending: [Kind, Color][] = [];
  for (const k of ['pride', 'peykan', 'p405', 'samand', 'zamyad', 'bus'] as Kind[]) for (const c of ['red', 'yellow', 'blue', 'green', 'purple', 'orange'] as Color[]) pending.push([k, c]);
  pending.push(['bike', 'white']);
  const warm = () => {
    if (!pending.length) return;
    if (!busy() && document.visibilityState === 'visible') warmFleet([pending.shift()!]);
    setTimeout(warm, 120);
  };
  setTimeout(warm, 2500);
  // Browsers only allow audio after a gesture: start the music on the first touch.
  window.addEventListener('pointerdown', () => startMusic(), { once: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopMusic(0.2); else startMusic(); });
  let last = performance.now();
  // Adaptive quality: watch the frame rate over the first seconds of play and step down if the phone struggles.
  let probeFrames = 0, probeTime = 0, tier = 2;
  const stepDown = () => {
    tier--;
    if (tier === 1) { tilt.style.display = 'none'; renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); }
    if (tier === 0) { sun.shadow.mapSize.set(1024, 1024); sun.shadow.map?.dispose(); sun.shadow.map = null; renderer.setPixelRatio(1); }
    fitCamera();
  };
  const loop = (t: number) => {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (tier > 0 && !modalOpen && document.visibilityState === 'visible') {
      probeFrames++; probeTime += dt;
      if (probeTime > 2.5) {
        if (probeFrames / probeTime < 45) stepDown();
        probeFrames = 0; probeTime = 0;
      }
    }
    tick(dt);
    session?.idle(t / 1000);
    if (session) {
      const bays = session.s.bays, used = bays.filter(Boolean).length;
      setTension(session.s.over ? 0 : Math.max(0, (used - 2) / Math.max(1, bays.length - 2)));
    }
    applyShake(dt);
    updateHand();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  };
  if (debug.has('shot')) renderer.render(scene, camera);
  else requestAnimationFrame(loop);
  if (Capacitor.isNativePlatform()) {
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    SplashScreen.hide().catch(() => {});
    CapApp.addListener('backButton', () => { if (!modalOpen) showSettings(); });
  }
  // Test hooks for headless screenshots.
  (window as unknown as { __rb: unknown }).__rb = {
    session: () => session, save, startLevel, levels, camera, renderer,
    /** Advance the animations by `sec` in fixed steps, then draw one frame. */
    async advance(sec: number) { for (let t = 0; t < sec; t += 1 / 30) { tick(1 / 30); await new Promise((r) => setTimeout(r, 0)); } updateHand(); renderer.render(scene, camera); },
  };
  document.title = 'ready';
}
void boot();
