import 'vazirmatn/Vazirmatn-font-face.css';
import './style.css';
import * as THREE from 'three';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import LEVELS from './game/levels.json';
import type { Level } from './game/rules';
import { tick } from './render/anim';
import { outdoorEnv } from './render/env.js';
import { warmFleet } from './render/fleet';
import { sky } from './render/world';
import { Session } from './play/session';
import { BOOSTERS, Hud, button, fa, faNum, h, modal, type BoosterId } from './ui/hud';
import { emo } from './ui/emoji';
import { maybeDaily, showChest, showShop } from './ui/meta';
import { initMonetization, maybeInterstitial, rewardedAvailable, showRewarded } from './monetize';
import { persist, save } from './save';
import { coin } from './audio';
import { setTension, startMusic, stopMusic } from './music';
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
app.append(tilt, vignette);

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
  const want = (save.level < 3 && session.taps === 0) || (save.level < 3 && idle > 3500) || idle > 10000;
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
  // Keep the sun's shadow box around the playfield.
  sun.position.copy(target).add(new THREE.Vector3(-9, 22, 11));
  sun.target.position.copy(target);
  const ext = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.75 + 4;
  Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 70 });
  sun.shadow.camera.updateProjectionMatrix();
}

// ───── Juice: floating texts and camera shake ─────
let shakeAmp = 0;
const camBase = new THREE.Vector3();
function floatText(text: string, at: THREE.Vector3, kind: 'coin' | 'combo' | 'bad') {
  const p = at.clone().project(camera);
  const el = h('div', 'float float-' + kind, kind === 'coin' ? `${emo('🧍', 'emo sm')}<b dir="ltr">${fa(text)}</b>` : `<b>${fa(text)}</b>`);
  el.style.left = `${((p.x + 1) / 2) * window.innerWidth}px`;
  el.style.top = `${((1 - p.y) / 2) * window.innerHeight}px`;
  document.body.append(el);
  setTimeout(() => el.remove(), 1300);
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
    if (session.crane(i)) { save.boosters.crane--; persist(); hud.refresh(); }
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

function startLevel() {
  disposeSession();
  const n = Math.min(save.level, levels.length - 1);
  const level = levels[n];
  craneMode = false;
  session = new Session(level, {
    queueLeft: (q) => hud.setQueue(q),
    toast: (t) => hud.toast(t),
    canPlay: () => !modalOpen,
    won: () => showWin(),
    lost: () => showLose(),
    float: floatText,
    shake: (a) => { shakeAmp = Math.max(shakeAmp, a); },
  }, n + 1);
  scene.add(session.group);
  hud.setLevel(save.level + 1, level.tag);
  hud.refresh();
  hud.active(null);
  hud.show(true);
  fitCamera();
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
  save.boosters[id]--; persist(); hud.refresh(); hud.bump(id); haptic('medium');
}

function reward() {
  const n = save.level;
  return 20 + Math.min(40, n * 2) + (levels[n]?.tag ? 40 : 0);
}

function showWin() {
  const n = save.level;
  const coins = reward() + (session?.bonus ?? 0);
  save.stats.wins++;
  save.coins += coins;
  save.level++;
  persist();
  modalOpen = true;
  hud.show(false);
  hud.refresh();
  const c = h('div', 'result win');
  c.innerHTML = `<div class="burst">${emo('🏆', 'emo huge')}</div><h2>آفرین!</h2><p>همه‌ی مسافرها سوار شدن و ترافیک باز شد.</p>
    <div class="reward">${emo('🪙')}<b dir="ltr">+${faNum(coins)}</b></div>`;
  const close = modal(c, 'pop');
  const next = async () => {
    close(); modalOpen = true;
    if ((n + 1) % 5 === 0) await showChest(() => hud.refresh());
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
  c.append(button(`مرحله‌ی بعد ${fa(save.level + 1)}`, 'primary big', () => { void next(); }));
  for (let i = 0; i < 5; i++) coin(0.15 + i * 0.09);
}

function showLose() {
  save.stats.losses++;
  persist();
  modalOpen = true;
  const c = h('div', 'result lose');
  const price = 300;
  c.innerHTML = `<div class="burst">${emo('🚧', 'emo huge')}</div><h2>راه‌بندون شد!</h2><p>همه‌ی جاهای پارک پر شد و مسافر جلوی صف ماشینش رو نداره.</p>`;
  const close = modal(c, 'pop');
  const canBay = session && session.s.bays.length < 6;
  const resume = () => { close(); modalOpen = false; session!.extraBay(); };
  if (canBay) {
    c.append(button(`${emo('🅿️', 'emo sm')} یه جای پارک دیگه، ${emo('🪙', 'emo sm')} ${fa(price)}`, 'gold big', () => {
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
  c.append(button('از اول', canBay ? 'ghost' : 'primary big', () => { close(); modalOpen = false; startLevel(); }));
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
    };
    r.append(t); c.append(r);
  };
  row('صدا', 'sound'); row('موسیقی', 'music'); row('لرزش', 'haptics');
  const close = modal(c, 'pop');
  c.append(button('شروع دوباره‌ی مرحله', 'ghost', () => { close(); modalOpen = false; startLevel(); }));
  c.append(button('ادامه', 'primary', () => { close(); modalOpen = false; }));
}

function showHome() {
  modalOpen = true;
  hud.show(false);
  const c = h('div', 'home');
  c.innerHTML = `<div class="logo"><span class="sign">راه‌بندون</span><small>ترافیک تهران، تو دستای تو</small></div>
    <div class="chapter"><div class="ch-t">${emo('📍')} فصل ۱: تجریش</div><div class="ch-bar"><i style="width:${Math.round((Math.min(save.level, levels.length) / levels.length) * 100)}%"></i></div><div class="ch-n">${fa(Math.min(save.level, levels.length))} از ${fa(levels.length)}</div></div>`;
  const close = modal(c, 'home-card');
  c.append(button(`بزن بریم! <small>مرحله‌ی ${fa(save.level + 1)}</small>`, 'primary huge', async () => {
    close();
    await maybeDaily(() => hud.refresh());
    modalOpen = false; hud.show(true);
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
  startLevel();
  if (!debug.has('play')) showHome();
  void initMonetization();
  window.addEventListener('resize', fitCamera);
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
