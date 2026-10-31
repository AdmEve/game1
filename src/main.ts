import './fonts.css';
import './style.css';
import * as THREE from 'three';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import PACKED from './game/levels.pack.json';
import { unpackLevel } from './game/pack';
import type { Color, Kind, Level } from './game/rules';
import { busy, ease, resetTraffic, setSpeed, tick, tween } from './render/anim';
import { outdoorEnv } from './render/env.js';
import { setCarShadows, warmFleet } from './render/fleet';
import { sky } from './render/world';
import { Session } from './play/session';
import { CHAPTERS, chapterOf, type Light } from './game/chapters';
import { lightsMaterial } from './render/fleet';
import { BOOSTERS, Hud, button, fa, faNum, h, modal, type BoosterId } from './ui/hud';
import { emo } from './ui/emoji';
import { maybeDaily, showChest, showIntro, showShop } from './ui/meta';
import { claimable, newlyReached, showAchievements } from './ui/achieve';
import { FREE_LEVELS, lives, loseLife } from './lives';
import { livesPill, showNoLives } from './ui/lives';
import { addStars, nextRenovation, showAgency } from './ui/agency';
import { starsFor } from './render/agency';
import { POM, showYaldaWin, yaldaBanner } from './ui/yalda';
import { nowruzBanner, showNowruzWin } from './ui/nowruz';
import { fillPiggy } from './ui/piggy';
import { AJOOL, BOSS_LINES } from './ui/characters';
import { passReady, punch, showPass } from './ui/pass';
import { HAFT_SIN, nowruzLevel, yaldaLevel } from './game/events';
import { addKeys, showGarage } from './ui/garage';
import { radioCard } from './ui/radio';
import { dailyLevel, today } from './game/daily';
import { initMonetization, maybeInterstitial, rateApp, rewardedAvailable, showRewarded } from './monetize';
import { persist, save } from './save';
import * as sfx from './audio';
import { click, coin } from './audio';
import { MOODS as WEATHER_MOODS, type WeatherKind } from './render/weather';
import { prepareMusic, setMood, setTension, startMusic, stopMusic } from './music';
import { haptic } from './haptics';

const levels: Level[] = (PACKED as string[]).map(unpackLevel);
const debug = new URLSearchParams(location.search);

// ───── Renderer and scene ─────
const app = document.getElementById('app')!;
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: debug.has('shot') });
/** Phones (the APK or a mobile browser) get a lighter setup: fewer pixels, cheaper shadows, no live blur. */
const mobile = Capacitor.isNativePlatform() || /Android|iPhone|iPad/i.test(navigator.userAgent);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, debug.has('shot') ? 3 : mobile ? 1.25 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = mobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
// The world's shadows barely change, so phones redraw the shadow map only every few frames, and cars cast none.
if (mobile) { renderer.shadowMap.autoUpdate = false; setCarShadows(false); }
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.append(renderer.domElement);
// Lens look: a tilt-shift blur on the far city (miniature feel) and a soft vignette.
const tilt = document.createElement('div'); tilt.className = mobile ? 'tiltshift lite' : 'tiltshift';
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
sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
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
  dusk: { sky: [[0, '#0f1b4d'], [0.45, '#3b3f8f'], [0.75, '#c2607a'], [1, '#f6a96b']], fog: 0x3a3570, hemi: [0x8a8fe0, 0x2a2238, 0.45], sun: [0xff9a6a, 1.4, [-22, 7, 4]], exposure: 1.1, env: 0.35, lamps: 2.0 },
  spring: { sky: [[0, '#3f8fe0'], [0.5, '#9fd3fb'], [0.85, '#e9f5f2'], [1, '#fdf0f5']], fog: 0xe4f1f6, hemi: [0xeaf6ff, 0x5f7a45, 0.75], sun: [0xfff6e6, 2.7, [-10, 20, 12]], exposure: 0.96, env: 0.85, lamps: 0.3 },
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

// Weather: thicker fog and dimmer light in rain and snow, and a flash of the sky for lightning.
let wxBase = { hemi: 0.7, sun: 2.6, exposure: 0.95 };
let wxFlashing = false;
function applyWeatherMood(kind: WeatherKind) {
  const m = WEATHER_MOODS[kind], fog = scene.fog as THREE.Fog;
  fog.near = m.fogNear; fog.far = m.fogFar;
  fog.color.lerp(new THREE.Color(m.tint), m.tintAmount);
  hemi.intensity *= m.light; sun.intensity *= m.light;
  wxBase = { hemi: hemi.intensity, sun: sun.intensity, exposure: renderer.toneMappingExposure };
  const amb = kind === 'rain' || kind === 'storm' || kind === 'snow' || kind === 'dust' ? kind : null;
  sfx.ambience(amb);
}
function applyFlash(f: number) {
  if (!f && !wxFlashing) return;
  wxFlashing = f > 0;
  hemi.intensity = wxBase.hemi * (1 + f * 3.5); sun.intensity = wxBase.sun * (1 + f * 2);
  renderer.toneMappingExposure = wxBase.exposure * (1 + f * 0.5);
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
/**
 * Level start: the camera opens on the chapter's landmark over the rooftops, then sweeps down onto the
 * lot. The full reveal plays when a chapter's place is new this session; later levels get a short swoop.
 */
let lastPlace = '';
function swoopPose(k: number, startPos: THREE.Vector3, startLook: THREE.Vector3, endPos: THREE.Vector3, endLook: THREE.Vector3) {
  // Rise a little in the middle so the move arcs over the rooftops instead of cutting through them.
  camera.position.lerpVectors(startPos, endPos, k).add(new THREE.Vector3(0, Math.sin(k * Math.PI) * 3, 0));
  camera.lookAt(new THREE.Vector3().lerpVectors(startLook, endLook, k));
}
function landmarkShot() {
  const lm = session!.landmark, v = session!.landmarkView;
  if (v) return { startPos: v.from.clone(), startLook: v.look.clone() };
  // Far enough back to frame the whole landmark (taller ones need more room), looking a little below
  // its top so the street shows underneath.
  const d = Math.min(34, Math.max(16, (lm.y * 1.4 + 6) * 1.9)); // inside the fog's clear range
  const startLook = new THREE.Vector3(lm.x, lm.y * 0.6, lm.z);
  const startPos = new THREE.Vector3(lm.x * 0.7, lm.y * 0.55 + 4, lm.z + d);
  return { startPos, startLook };
}
function introSwoop() {
  if (!session) return;
  const endPos = camBase.clone(), endLook = camTarget.clone();
  const place = session.landmark.toArray().join();
  const full = place !== lastPlace;
  lastPlace = place;
  const { startPos, startLook } = full ? landmarkShot() : { startPos: endPos.clone().add(new THREE.Vector3(0, 6, 10)), startLook: new THREE.Vector3(0, 3, session.L.walkZ - 14) };
  if (debug.has('shot')) return;
  // Hold on the landmark for a beat, then sweep down.
  const hold = full ? 0.7 : 0;
  void tween(hold + (full ? 2.0 : 1.5), (t) => {
    const k = full ? Math.max(0, (t * (hold + 2.0) - hold) / 2.0) : t;
    swoopPose(ease.inOut(k), startPos, startLook, endPos, endLook);
    camBase.copy(camera.position);
  }, ease.linear).then(() => { camera.position.copy(endPos); camera.lookAt(endLook); camBase.copy(endPos); });
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
/** When taps pile up faster than cars can park and load, play the backlog a little faster to catch up. */
function catchUp() {
  const b = session?.backlog ?? 0;
  setSpeed(b > 6 ? 2.3 : b > 4 ? 1.8 : b > 2 ? 1.4 : 1);
}

function disposeSession() {
  if (!session) return;
  resetTraffic();
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
/** A seasonal event level being played («شب یلدا» night or «نوروز» day), or null. */
type EventRun = { kind: 'yalda' | 'nowruz'; i: number };
let event: EventRun | null = null;

function startLevel(pick?: number, custom?: Level, swoop = true, ev: EventRun | null = null) {
  disposeSession();
  rush = custom ?? null;
  event = ev;
  current = Math.min(pick ?? save.level, levels.length - 1);
  const n = current;
  const level = custom ?? levels[n];
  // Yalda nights are played at home in Tajrish, after dark. The rush hour rotates day by day through
  // the places the player has already unlocked (never spoiling a chapter they haven't reached).
  const unlocked = CHAPTERS.filter((c) => c.from <= save.level);
  const ch = ev ? { ...CHAPTERS[0], light: ev.kind === 'yalda' ? 'night' as const : 'spring' as const, weather: ev.kind === 'yalda' ? 'snow' as const : 'petals' as const } : custom ? unlocked[Math.floor(Date.now() / 864e5) % unlocked.length] : chapterOf(n);
  applyLight(ch.light);
  applyWeatherMood(ch.weather);
  setMood(ch.light);
  craneMode = false;
  modalOpen = false;
  helped = false;
  session = new Session(level, {
    queueLeft: (q, total) => hud.setQueue(q, total),
    toast: (t) => hud.toast(t),
    canPlay: () => !modalOpen,
    won: () => showWin(),
    lost: (why) => showLose(why),
    limits: (t, m) => hud.setLimits(t, m),
    float: floatText,
    parity: (p, left) => hud.setParity(p, left),
    officer: (a) => hud.setOfficer(a),
    flash: cameraFlash,
    shake: (a) => { shakeAmp = Math.max(shakeAmp, a); },
  }, n + 1, { stop: ch.stop, night: ch.light === 'night' || ch.light === 'dusk', snow: ch.light === 'snow', weather: ch.weather, landmark: ch.landmark, autumn: ch.light === 'autumn', boulevard: ch.n === 2, yalda: ev?.kind === 'yalda', nowruz: ev?.kind === 'nowruz', skins: save.garage.restored, colorblind: save.settings.colorblind });
  scene.add(session.group);
  renderer.shadowMap.needsUpdate = true;
  if (session.weather) session.weather.onThunder = () => sfx.thunder();
  if (ev?.kind === 'yalda') hud.setEvent(`شب یلدا ${fa(ev.i + 1)}`, POM('hud'));
  else if (ev?.kind === 'nowruz') hud.setEvent(`نوروز، روز ${fa(ev.i + 1)}`, emo(HAFT_SIN[ev.i].icon, 'emo'));
  else if (custom) hud.setRush(); else hud.setLevel(n + 1, level.tag);
  if (level.time) setTimeout(() => hud.toast(`این مرحله ${fa(level.time!)} ثانیه وقت داره! ساعت از اولین ضربه شروع می‌شه.`), 900);
  else if (level.moves) setTimeout(() => hud.toast(`فقط ${fa(level.moves!)} ضربه داری! ضربه‌ی اشتباه هم حساب می‌شه.`), 900);
  else if (level.bays && level.bays < 5) setTimeout(() => hud.toast(`این مرحله فقط ${fa(level.bays!)} جای پارک داره!`), 900);
  hud.refresh();
  hud.active(null);
  hud.show(true);
  fitCamera();
  if (swoop) introSwoop();
  if (custom) {
    // Event and daily levels may hold mechanics the player hasn't reached yet: explain the first one.
    const v = level.vehicles, o = level.obstacles ?? [];
    const has: [NonNullable<Level['intro']>, boolean][] = [
      ['cover', v.some((x) => x.covered)], ['broken', v.some((x) => x.wait)], ['vip', !!level.vip?.length], ['oddEven', !!level.oddEven],
      ['courier', v.some((x) => x.kind === 'bike')], ['officer', !!level.officer], ['cart', o.some((x) => x.kind === 'cart')],
      ['wedding', v.some((x) => x.wedding)], ['granny', !!level.granny?.length], ['tunnel', o.some((x) => x.kind === 'tunnel')],
    ];
    const unseen = has.find(([k, on]) => on && !save.seen[k]);
    if (unseen) { modalOpen = true; void showIntro(unseen[0]).then(() => { save.seen[unseen[0]] = true; persist(); modalOpen = false; }); }
    return;
  }
  const TIPS = ['روی ماشینی بزن که مسافرهای جلوی صف رنگش رو می‌خوان!', 'فلش روی ماشین جهت حرکتشه. اول ماشین‌های جلویی رو رد کن!', 'جای پارک ایستگاه محدوده؛ ماشینی رو بفرست که مسافرش تو صف نزدیکه.'];
  if (n < TIPS.length) hud.toast(TIPS[n], 5500);
  if (n === ch.from && n > 0 && !save.seen['ch' + ch.n]) {
    modalOpen = true;
    const c = h('div', 'newch');
    const blurb = { night: 'شب‌های میدان آزادی، چراغ‌ها روشن و ترافیک سنگین!', sunset: 'غروب ولیعصر، زیر چنارهای قدیمی. ترافیک داره سنگین‌تر می‌شه!', snow: 'برف اومده! همه دارن می‌رن توچال اسکی. پلیس راهور هم سر چهارراه وایستاده.', bazaar: 'بازار بزرگ تهران! گاری‌های میوه همه‌جا هستن و جای پارک پیدا نمی‌شه.', dusk: 'غروب، برج میلاد چراغاش روشن شده و همه از تونل نیایش می‌رن خونه. حواست باشه کدوم تونل به کجا می‌ره!', spring: 'بهار اومده! پل طبیعت پر از شکوفه‌ست و حاج‌خانم‌ها با کیسه‌های خرید عید منتظر ماشینن.', autumn: 'پاییز دربند! برگ‌های نارنجی، چای و قلیون کنار رودخونه… و ماشین‌های عروس که عجله دارن.', day: '' }[ch.light];
    c.innerHTML = `<div class="burst">${emo({ night: '🌙', sunset: '🌇', snow: '❄️', bazaar: '🕌', autumn: '🍁', spring: '🌸', dusk: '🗼', day: '🌄' }[ch.light], 'emo huge')}</div><small>فصل جدید باز شد!</small><h2>فصل ${fa(ch.n)}: ${ch.name}</h2><p>${blurb}</p>`;
    const close = modal(c, 'pop');
    c.append(button('بزن بریم!', 'primary big', () => { save.seen['ch' + ch.n] = true; persist(); close(); modalOpen = false; }));
  } else if (level.intro && !save.seen[level.intro]) {
    modalOpen = true;
    showIntro(level.intro).then(() => { save.seen[level.intro!] = true; persist(); modalOpen = false; });
  } else if (level.tag === 'boss' && !save.seen['boss' + n]) {
    // Mr. Ajool walks in before his boss level.
    modalOpen = true;
    const c = h('div', 'boss-card');
    const line = BOSS_LINES[(ch.n - 1) % BOSS_LINES.length];
    c.innerHTML = `<div class="vs">مرحله‌ی رئیس</div>${AJOOL('big')}<h2>آقای عجول</h2><div class="speech bad">${line.taunt}</div>`;
    const close = modal(c, 'pop boss');
    c.append(button('حالا می‌بینیم! 💪', 'primary big', () => { save.seen['boss' + n] = true; persist(); close(); modalOpen = false; }));
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
  if (event) {
    recordWin(false);
    modalOpen = true; hud.show(false); hud.refresh();
    const back = () => { hud.refresh(); modalOpen = false; startLevel(); showHome(); };
    if (event.kind === 'yalda') showYaldaWin(event.i, back); else showNowruzWin(event.i, back);
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
  const piggy = replay ? 0 : fillPiggy(n);
  const station = !replay && punch();
  const stars = replay ? 0 : starsFor(lvl?.tag);
  if (stars) addStars(stars);
  const ach = recordWin(!replay && !!lvl?.tag);
  save.coins += coins;
  if (!replay) save.level = Math.min(save.level + 1, levels.length);
  persist();
  modalOpen = true;
  hud.show(false);
  hud.refresh();
  const c = h('div', 'result win');
  // Rewards in one row, then the notes (pass, money box), then Mr. Ajool and any new medal.
  const rewards = `<div class="reward">${emo('🪙')}<b dir="ltr">+${faNum(coins)}</b></div>`
    + (stars ? `<div class="reward starr">${emo('⭐')}<b dir="ltr">+${fa(stars)}</b><small>ستاره</small></div>` : '')
    + (keys ? `<div class="reward keyr">${emo('🔑')}<b dir="ltr">+${fa(keys)}</b><small>سوئیچ</small></div>` : '');
  const notes = (station ? `<div class="piggy-note">${emo('🚇', 'emo xs')} رسیدی به ایستگاه بعدی کارت بلیت!</div>` : '')
    + (piggy ? `<div class="piggy-note">${emo('🏺', 'emo xs')} ${fa(piggy)} سکه رفت تو قلکت</div>` : '');
  const beaten = lvl?.tag === 'boss' && !replay ? `<div class="beaten">${AJOOL('sm')}<div><b>آقای عجول:</b> ${BOSS_LINES[(chapterOf(n).n - 1) % BOSS_LINES.length].beaten}</div></div>` : '';
  c.innerHTML = `<div class="burst">${emo('🏆', 'emo huge')}</div><h2>آفرین!</h2><p>همه‌ی مسافرها سوار شدن و ترافیک باز شد.</p>
    <div class="rewards">${rewards}</div>${notes}${beaten}${ach}`;
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

function showLose(limit?: 'time' | 'moves') {
  save.stats.losses++;
  persist();
  modalOpen = true;
  const c = h('div', 'result lose');
  const price = 300;
  const COLOR_FA: Record<string, string> = { red: 'قرمز', yellow: 'زرد', blue: 'آبی', green: 'سبز', purple: 'بنفش', orange: 'نارنجی', white: 'سفید', pink: 'صورتی' };
  const want = session ? session.s.queue[session.s.q] : undefined;
  // Bays still free means the loss came from a wedding car missing its deadline.
  const bride = !limit && session && !session.isFull() ? session.lastLate : -1;
  const culprit = bride >= 0 ? bride : session ? session.culprit() : -1;
  if (culprit >= 0) session!.highlight(culprit);
  const why = limit === 'time' ? 'وقت تموم شد و هنوز ماشین‌ها تو پارکینگ موندن! سریع‌تر تصمیم بگیر.' : limit === 'moves' ? 'ضربه‌هات تموم شد! ضربه روی ماشین گیر کرده هم حساب می‌شه، پس قبل از زدن خوب نگاه کن.' : bride >= 0 ? 'ماشین عروس به موقع راه نیفتاد و عروس دیر رسید! دفعه‌ی بعد اول راهش رو باز کن.' : want && culprit >= 0 ? `مسافر جلوی صف ماشین <b>${COLOR_FA[want]}</b> می‌خواست، ولی هنوز تو پارکینگ گیر کرده بود.` : 'همه‌ی جاهای پارک پر شد و مسافر جلوی صف ماشینش رو نداره.';
  c.innerHTML = `<div class="burst">${emo(limit === 'time' ? '⏰' : limit === 'moves' ? '👆' : bride >= 0 ? '💔' : '🚧', 'emo huge')}</div><h2>${limit === 'time' ? 'وقت تموم شد!' : limit === 'moves' ? 'ضربه‌هات تموم شد!' : bride >= 0 ? 'عروسی به هم خورد!' : 'راه‌بندون شد!'}</h2><p>${why}</p>`;
  const close = modal(c, 'pop');
  const canBay = !!session && (!!limit || session.s.bays.length < 6 || bride >= 0);
  const resume = () => { close(); modalOpen = false; helped = true; if (limit) session!.extend(); else session!.extraBay(); };
  if (canBay) {
    c.append(button(`${emo(limit === 'time' ? '⏱️' : limit === 'moves' ? '👆' : bride >= 0 ? '💐' : '🅿️', 'emo sm')} ${limit === 'time' ? '۱۵ ثانیه وقت بیشتر' : limit === 'moves' ? '۴ ضربه‌ی بیشتر' : bride >= 0 ? 'ادامه بده' : 'یه جای پارک دیگه'}، ${emo('🪙', 'emo sm')} ${fa(price)}`, 'gold big', () => {
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
  c.append(button('از اول', canBay ? 'ghost' : 'primary big', async () => {
    close();
    // Giving up on a Journey level costs a life (the daily challenge and events are free).
    if (!rush && current >= FREE_LEVELS) {
      loseLife();
      if (lives() <= 0 && !(await showNoLives(() => hud.refresh()))) { startLevel(current, undefined, false); showHome(); return; }
    }
    modalOpen = false; startLevel(current, rush ?? undefined, true, event);
  }));
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
  const ver = h('div', 'ver', `نسخه‌ی ${fa(__APP_VERSION__)} · ساخت ${__BUILD__}`);
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
      if (open) b.onclick = async () => {
        if (i >= FREE_LEVELS && lives() <= 0 && !(await showNoLives(() => hud.refresh()))) return;
        close(); modalOpen = false; startLevel(i); hud.show(true);
      };
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
    startLevel(undefined, lvl, true, { kind: 'yalda', i: night }); hud.show(true);
  });
  if (yb) c.querySelector('.chapter')!.before(yb);
  const nb = nowruzBanner((day) => {
    const lvl = nowruzLevel(day);
    if (!lvl) { hud.toast('مرحله‌ی امروز آماده نشد، بعداً سر بزن!'); return; }
    close(); modalOpen = false;
    startLevel(undefined, lvl, true, { kind: 'nowruz', i: day }); hud.show(true);
  });
  if (nb) c.querySelector('.chapter')!.before(nb);
  const close = modal(c, 'home-card');

  const gar = button(`${emo('🔧', 'emo sm')} گاراژ من<small>${emo('🔑', 'emo xs')} ${fa(save.garage.keys)} سوئیچ</small>`, 'garage-btn', () => {
    close(); showGarage(() => showHome());
  });
  const next = nextRenovation();
  const ready = !!next && save.agency.stars >= next.cost;
  c.append(button(`<span>${emo('🏠', 'emo sm')} آژانس آقاجون<small>${next ? `بعدی: ${next.name}` : 'آژانس کامل بازسازی شد!'}</small></span><span class="sb ${ready ? 'ready' : ''}">${emo('⭐', 'emo xs')} ${fa(save.agency.stars)}</span>`, 'agency-btn', () => {
    close(); showAgency(() => showHome());
  }));
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
  const tickets = passReady();
  rowEl.append(button(`${emo('🎫')}${tickets ? `<i class="badge">${fa(tickets)}</i>` : ''}`, 'ach-btn pass-btn', () => {
    close(); showPass(() => hud.refresh(), () => showHome());
  }));
  const waiting = claimable();
  rowEl.append(button(`${emo('🏆')}${waiting ? `<i class="badge">${fa(waiting)}</i>` : ''}`, 'ach-btn', () => {
    close(); showAchievements(() => showHome(), () => hud.refresh());
  }));
  c.querySelector('.chapter')!.append(livesPill());
  c.append(button(`بزن بریم! <small>مرحله‌ی ${fa(save.level + 1)}</small>`, 'primary huge', async () => {
    if (save.level >= FREE_LEVELS && lives() <= 0 && !(await showNoLives(() => hud.refresh()))) return;
    close();
    await maybeDaily(() => hud.refresh());
    modalOpen = false; hud.show(true);
    introSwoop();
  }));
}

// ───── Boot ─────
async function boot() {
  // Stars arrived after launch: credit players for the levels they had already won.
  if (!save.agency.init) {
    save.agency.stars += levels.slice(0, save.level).reduce((a, l) => a + starsFor(l.tag), 0);
    save.agency.init = true; persist();
  }
  hud = new Hud(document.body);
  hud.onBooster = useBooster;
  hud.onSettings = showSettings;
  hud.onCoins = () => { modalOpen = true; showShop(() => { modalOpen = false; }, () => hud.refresh()); };
  performance.mark('b0');
  performance.measure('before-boot', { start: 0, end: 'b0' });
  await document.fonts.load('900 40px Vazirmatn').catch(() => {});
  performance.measure('fonts', 'b0');
  performance.mark('b1');
  warmFleet([]);
  performance.measure('fleet', 'b1');
  performance.mark('b2');
  startLevel(undefined, undefined, debug.has('play'));
  performance.measure('level', 'b2');
  if (!debug.has('play')) showHome();
  void initMonetization();
  window.addEventListener('resize', fitCamera);
  // Build every vehicle template in the background so later levels load instantly. Each build takes a
  // noticeable slice of a frame on a phone, so it only happens behind a menu, never during play.
  const pending: [Kind, Color][] = [];
  for (const k of ['pride', 'peykan', 'p405', 'samand', 'zamyad', 'bus'] as Kind[]) for (const c of ['red', 'yellow', 'blue', 'green', 'purple', 'orange'] as Color[]) pending.push([k, c]);
  pending.push(['bike', 'white']);
  const warm = () => {
    if (!pending.length) return;
    if (modalOpen && !busy() && document.visibilityState === 'visible') warmFleet([pending.shift()!]);
    setTimeout(warm, 120);
  };
  setTimeout(warm, 2500);
  // The music loop is built behind the menu, a slice at a time, so it is ready by the first tap.
  setTimeout(prepareMusic, 1800);
  // Browsers only allow audio after a gesture: start the music on the first touch.
  window.addEventListener('pointerdown', () => startMusic(), { once: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopMusic(0.2); else startMusic(); });
  let last = performance.now(), shadowTick = 0;
  // Adaptive quality: watch the frame rate over the first seconds of play and step down if the phone struggles.
  let probeFrames = 0, probeTime = 0, tier = 2;
  const stepDown = () => {
    tier--;
    if (tier === 1) { tilt.style.display = 'none'; renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25)); }
    if (tier === 0) { sun.shadow.mapSize.set(512, 512); sun.shadow.map?.dispose(); sun.shadow.map = null; renderer.shadowMap.type = THREE.BasicShadowMap; renderer.setPixelRatio(1); }
    fitCamera();
  };
  const loop = (t: number) => {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (tier > 0 && !modalOpen && document.visibilityState === 'visible') {
      probeFrames++; probeTime += dt;
      if (probeTime > 2.5) {
        if (probeFrames / probeTime < 50) stepDown();
        probeFrames = 0; probeTime = 0;
      }
    }
    // When taps pile up faster than cars can park and load, play the backlog a little faster to catch up.
    catchUp();
    tick(dt);
    session?.idle(t / 1000);
    applyFlash(session?.weather?.flash ?? 0);
    if (session) {
      const bays = session.s.bays, used = bays.filter(Boolean).length;
      setTension(session.s.over ? 0 : Math.max(0, (used - 2) / Math.max(1, bays.length - 2)));
    }
    applyShake(dt);
    updateHand();
    if (mobile && ++shadowTick % 4 === 0) renderer.shadowMap.needsUpdate = true;
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
    /** Render the level-start camera move at progress k (0 = the landmark shot). */
    swoop: (k: number) => { const st = landmarkShot(); swoopPose(k, st.startPos, st.startLook, camBase.clone(), camTarget.clone()); renderer.render(scene, camera); },
    /** Advance the animations by `sec` in fixed steps, then draw one frame. */
    async advance(sec: number) { for (let t = 0; t < sec; t += 1 / 30) { catchUp(); tick(1 / 30); await new Promise((r) => setTimeout(r, 0)); } updateHand(); renderer.render(scene, camera); },
  };
  performance.mark('b3');
  renderer.render(scene, camera);
  performance.measure('first-frame', 'b3');
  document.title = 'ready';
}
void boot();
