/** «گاراژ من»: restore classic Iranian cars with car keys; restored classics then drive in your levels. */
import * as THREE from 'three';
import { coin } from '../audio';
import { haptic } from '../haptics';
import { CARS, buildCar } from '../render/cars.js';
import { outdoorEnv } from '../render/env.js';
import { persist, save } from '../save';
import { emo } from './emoji';
import { button, fa, h, modal } from './hud';

export const CLASSICS = [
  { id: 'javanan', name: 'پیکان جوانان', year: '۱۳۵۴', cost: 3, color: 0xc62828,
    story: 'بابابزرگ این پیکان جوانان رو سال ۵۴ خرید. جمعه‌ها با همین ماشین می‌رفتن شمال، صندوق پر از هندونه و بچه‌ها رو صندلی عقب!' },
  { id: 'jiane', name: 'ژیان', year: '۱۳۵۰', cost: 5, color: 0x8fbf9f,
    story: 'ژیان! کوچیک بود ولی دلش بزرگ. می‌گن تو سربالایی‌های دربند مسافرها پیاده می‌شدن هلش می‌دادن!' },
  { id: 'renault5', name: 'رنو ۵', year: '۱۳۵۵', cost: 6, color: 0xf2c230,
    story: 'رنو ۵، ماشین اولِ خیلی‌ها. کوچیک و زرنگ؛ همیشه یه جای پارک پیدا می‌کرد، حتی جلوی بازار.' },
  { id: 'royale', name: 'شورولت رویال', year: '۱۳۵۶', cost: 8, color: 0x1e3a5f,
    story: 'شورولت رویال، ماشین آدم‌حسابی‌ها! هر کی سوارش می‌شد حس می‌کرد وزیره. عروس‌کشون محل همیشه با این بود.' },
] as const;

const rust = new THREE.MeshStandardMaterial({ color: 0x7a5236, roughness: 0.95, metalness: 0.15, flatShading: true });

/** Award car keys (shown as a floating message by the caller). */
export function addKeys(n: number) { save.garage.keys += n; persist(); }

export function showGarage(onClose: () => void) {
  let i = 0;
  const c = h('div', 'garage');
  c.innerHTML = `<h2>${emo('🔧')} گاراژ من</h2><div class="keys">${emo('🔑')} <b></b> سوئیچ</div>`;
  const stage = h('div', 'stage');
  const canvas = document.createElement('canvas');
  stage.append(canvas);
  const info = h('div', 'ginfo');
  const nav = h('div', 'gnav');
  const prev = button('›', 'ghost round', () => { i = (i + CLASSICS.length - 1) % CLASSICS.length; show(); });
  const next = button('‹', 'ghost round', () => { i = (i + 1) % CLASSICS.length; show(); });
  const action = h('div', 'gaction');
  nav.append(prev, info, next);
  c.append(stage, nav, action);
  const close = modal(c, 'pop garage-card');
  c.append(button('بستن', 'ghost', () => { stop = true; renderer.dispose(); close(); onClose(); }));

  // A small turntable renderer just for this screen.
  const W = Math.min(340, window.innerWidth - 60), H = 200;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: location.search.includes('shot') });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.environment = outdoorEnv(renderer); scene.environmentIntensity = 0.85;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 0.8));
  const sun = new THREE.DirectionalLight(0xfff2dc, 2.2); sun.position.set(4, 8, 6); scene.add(sun);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.3, 0.12, 48), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.3 }));
  disc.position.y = -0.06; scene.add(disc);
  const cam = new THREE.PerspectiveCamera(28, W / H, 0.1, 50); cam.position.set(0, 2.2, 7.6); cam.lookAt(0, 0.6, 0);
  let car: THREE.Object3D | null = null;
  let stop = false;

  const show = () => {
    const k = CLASSICS[i], owned = save.garage.restored.includes(k.id);
    (c.querySelector('.keys b') as HTMLElement).textContent = fa(save.garage.keys);
    if (car) scene.remove(car);
    car = buildCar(CARS[k.id], owned ? k.color : rust, { q: 0.8 });
    scene.add(car);
    info.innerHTML = `<b>${k.name}</b><small>مدل ${k.year}</small>`;
    action.innerHTML = '';
    if (owned) action.append(h('p', 'story', `${emo('📜', 'emo sm')} ${k.story}`), h('div', 'owned', `${emo('✅', 'emo sm')} بازسازی شد! حالا تو مرحله‌ها می‌بینیش.`));
    else {
      action.append(h('p', 'story dim', 'یه ماشین قدیمیِ زنگ‌زده که منتظر یه دست نوازشه…'));
      const can = save.garage.keys >= k.cost;
      const b = button(`${emo('🔧', 'emo sm')} بازسازی کن، ${emo('🔑', 'emo sm')} ${fa(k.cost)}`, can ? 'gold big' : 'ghost', () => {
        if (save.garage.keys < k.cost) { b.classList.add('nope'); setTimeout(() => b.classList.remove('nope'), 400); haptic('warn'); return; }
        save.garage.keys -= k.cost; save.garage.restored.push(k.id); persist();
        coin(); coin(0.12); coin(0.24); haptic('success');
        stage.classList.add('sparkle'); setTimeout(() => stage.classList.remove('sparkle'), 900);
        show();
      });
      action.append(b);
      if (!can) action.append(h('small', 'hint', 'سوئیچ رو از مرحله‌های سخت، صندوق‌ها و آخر هر فصل می‌گیری.'));
    }
  };
  show();
  let t = 0;
  const loop = () => {
    if (stop) return;
    t += 0.016;
    if (car) car.rotation.y = t * 0.6;
    renderer.render(scene, cam);
    if (!location.search.includes('shot')) requestAnimationFrame(loop);
  };
  loop();
}
