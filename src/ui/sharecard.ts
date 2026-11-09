/**
 * Share a win: the level's starting layout as a clean top-down puzzle diagram, with the level, how many taps it
 * took and the Bazaar link, sent through the phone's share sheet (Telegram, WhatsApp…). Drawn in 2D from the level
 * data: at the win the 3D board is empty, and reading back a WebGL frame would stall a phone. Covered cars stay
 * covered, so the picture never spoils the puzzle.
 */
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { CONFIG } from '../config';
import { cellsOf, type Dir, type Level } from '../game/rules';
import { PAINT } from '../render/fleet';
import { TUNNEL_COLORS } from '../render/mechanics';

export const STORE_URL = `https://cafebazaar.ir/app/${CONFIG.BAZAAR_PACKAGE}`;
export interface ShareWin {
  level: Level;
  /** e.g. «مرحله‌ی ۴۷ · ولیعصر» */
  title: string;
  /** A red pill next to the title, e.g. «سخت». */
  badge?: string;
  /** The boast, e.g. «با ۱۲ حرکت ردش کردم!» */
  brag: string;
}

const W = 1080, H = 1350;
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
const FONT = 'Vazirmatn, system-ui, sans-serif';

function rounded(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.roundRect(x, y, w, h, r);
}

/** A chevron pointing `dir`, centered at (x, y). */
function arrow(g: CanvasRenderingContext2D, x: number, y: number, size: number, dir: Dir, fill = 'rgba(255,255,255,.96)') {
  const a = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 }[dir];
  g.save(); g.translate(x, y); g.rotate(a);
  g.beginPath(); g.moveTo(size * 0.42, 0); g.lineTo(-size * 0.22, -size * 0.36); g.lineTo(-size * 0.08, 0); g.lineTo(-size * 0.22, size * 0.36); g.closePath();
  g.fillStyle = fill; g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = size * 0.12; g.fill();
  g.restore();
}

/** The board: lot, grid, obstacles and vehicles, fitted into the box (bx, by, bw, bh). */
function board(g: CanvasRenderingContext2D, lv: Level, bx: number, by: number, bw: number, bh: number) {
  const s = Math.min(bw / lv.w, bh / lv.h, 130), lw = s * lv.w, lh = s * lv.h;
  const x0 = bx + (bw - lw) / 2, y0 = by + (bh - lh) / 2, pad = s * 0.28;
  // Asphalt with a painted lot border.
  rounded(g, x0 - pad, y0 - pad, lw + pad * 2, lh + pad * 2, s * 0.35);
  const asphalt = g.createLinearGradient(0, y0 - pad, 0, y0 + lh + pad); asphalt.addColorStop(0, '#363c47'); asphalt.addColorStop(1, '#2a2f38');
  g.fillStyle = asphalt; g.fill();
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = Math.max(3, s * 0.035); g.setLineDash([s * 0.28, s * 0.18]);
  g.strokeRect(x0 - pad * 0.45, y0 - pad * 0.45, lw + pad * 0.9, lh + pad * 0.9); g.setLineDash([]);
  g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 2;
  for (let c = 1; c < lv.w; c++) { g.beginPath(); g.moveTo(x0 + c * s, y0); g.lineTo(x0 + c * s, y0 + lh); g.stroke(); }
  for (let r = 1; r < lv.h; r++) { g.beginPath(); g.moveTo(x0, y0 + r * s); g.lineTo(x0 + lw, y0 + r * s); g.stroke(); }
  const cx = (c: number) => x0 + (c + 0.5) * s, cy = (r: number) => y0 + (r + 0.5) * s;
  // Obstacles.
  (lv.obstacles ?? []).forEach((o, i) => {
    if (o.kind === 'cone') {
      g.beginPath(); g.moveTo(cx(o.col), cy(o.row) - s * 0.3); g.lineTo(cx(o.col) + s * 0.24, cy(o.row) + s * 0.26); g.lineTo(cx(o.col) - s * 0.24, cy(o.row) + s * 0.26); g.closePath();
      g.fillStyle = '#f97316'; g.fill();
      g.fillStyle = '#fff'; g.fillRect(cx(o.col) - s * 0.12, cy(o.row) - s * 0.02, s * 0.24, s * 0.08);
    } else if (o.kind === 'cart') {
      rounded(g, cx(o.col) - s * 0.36, cy(o.row) - s * 0.3, s * 0.72, s * 0.6, s * 0.1); g.fillStyle = '#8b5a2b'; g.fill();
      for (const [dx, dy, col] of [[-0.16, -0.08, '#ef4444'], [0.04, -0.1, '#f59e0b'], [0.18, 0.06, '#84cc16'], [-0.04, 0.1, '#ef4444']] as const) {
        g.beginPath(); g.arc(cx(o.col) + dx * s, cy(o.row) + dy * s, s * 0.09, 0, Math.PI * 2); g.fillStyle = col; g.fill();
      }
    } else {
      // The same pair color the board shows (session.ts numbers pairs the same way).
      const pairNo = (lv.obstacles ?? []).slice(0, Math.min(i, o.pair ?? i)).filter((t) => t.kind === 'tunnel').length / 2;
      const col = hex(TUNNEL_COLORS[pairNo % TUNNEL_COLORS.length]);
      g.beginPath(); g.arc(cx(o.col), cy(o.row), s * 0.36, 0, Math.PI * 2); g.fillStyle = '#0b0d12'; g.fill();
      g.lineWidth = s * 0.08; g.strokeStyle = col; g.stroke();
    }
  });
  // Vehicles: body in its paint, a darker windscreen at the front, and the arrow it will drive.
  for (const v of lv.vehicles) {
    const cells = cellsOf(v), c0 = cells[0], c1 = cells[cells.length - 1];
    const inset = v.kind === 'bike' ? s * 0.24 : s * 0.09;
    const x = x0 + c0[0] * s + inset, y = y0 + c0[1] * s + inset, w = (c1[0] - c0[0] + 1) * s - inset * 2, h = (c1[1] - c0[1] + 1) * s - inset * 2;
    const r = Math.min(w, h) * 0.26;
    g.save();
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = s * 0.12; g.shadowOffsetY = s * 0.05;
    rounded(g, x, y, w, h, r);
    if (v.covered) {
      g.fillStyle = '#6b7280'; g.fill(); g.shadowColor = 'transparent';
      g.clip(); g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = s * 0.06;
      for (let k = -h; k < w; k += s * 0.22) { g.beginPath(); g.moveTo(x + k, y + h); g.lineTo(x + k + h, y); g.stroke(); }
      g.restore();
      g.fillStyle = '#fff'; g.font = `900 ${Math.round(s * 0.5)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('؟', x + w / 2, y + h / 2 + s * 0.04);
      continue;
    }
    g.fillStyle = hex(PAINT[v.color]); g.fill();
    g.shadowColor = 'transparent';
    // A soft highlight across the roof, so the cars read as cars and not as tiles.
    g.clip();
    const hl = g.createLinearGradient(x, y, x + w, y + h); hl.addColorStop(0, 'rgba(255,255,255,.28)'); hl.addColorStop(0.5, 'rgba(255,255,255,.04)'); hl.addColorStop(1, 'rgba(0,0,0,.18)');
    g.fillStyle = hl; g.fillRect(x, y, w, h);
    if (v.kind !== 'bike') {
      const k = s * 0.2, horiz = v.dir === 'left' || v.dir === 'right';
      const fx = v.dir === 'right' ? x + w - k * 1.6 : v.dir === 'left' ? x + k * 0.6 : x + w * 0.16;
      const fy = v.dir === 'down' ? y + h - k * 1.6 : v.dir === 'up' ? y + k * 0.6 : y + h * 0.16;
      rounded(g, fx, fy, horiz ? k : w * 0.68, horiz ? h * 0.68 : k, k * 0.3); g.fillStyle = 'rgba(15,23,42,.55)'; g.fill();
    }
    g.restore();
    g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 2; rounded(g, x, y, w, h, r); g.stroke();
    // A white arrow vanishes on white or silver paint: light paints get a dark one.
    const p = PAINT[v.color], light = 0.299 * (p >> 16) + 0.587 * ((p >> 8) & 255) + 0.114 * (p & 255) > 150;
    arrow(g, x + w / 2, y + h / 2, Math.min(w, h) * (v.kind === 'bike' ? 0.9 : 0.62), v.dir, light ? 'rgba(15,23,42,.9)' : undefined);
  }
}

/** Draw the card. Fonts must be loaded first (shareWin does it). */
export function drawShareCard(info: ShareWin, canvas = document.createElement('canvas')): HTMLCanvasElement {
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d')!;
  const bg = g.createRadialGradient(W / 2, H * 0.42, 40, W / 2, H * 0.42, H * 0.8);
  bg.addColorStop(0, '#1d3354'); bg.addColorStop(0.55, '#101c30'); bg.addColorStop(1, '#0a1220');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#fff'; g.font = `900 112px ${FONT}`; g.fillText('راه‌بندون', W / 2, 150);
  g.direction = 'ltr'; g.fillStyle = '#f2b124'; g.font = `700 28px ${FONT}`;
  (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '12px';
  g.fillText('TEHRAN · GRIDLOCK', W / 2 + 6, 226);
  (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
  // Title, with the badge as a pill to its left.
  g.direction = 'rtl'; g.font = `800 46px ${FONT}`; g.fillStyle = '#e2e8f0';
  const tw = g.measureText(info.title).width, bw = info.badge ? g.measureText(info.badge).width + 44 : 0, gap = info.badge ? 18 : 0;
  const left = (W - tw - bw - gap) / 2;
  g.textAlign = 'right'; g.fillText(info.title, left + bw + gap + tw, 312);
  if (info.badge) {
    rounded(g, left, 268, bw, 60, 30); g.fillStyle = '#dc2626'; g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(info.badge, left + bw / 2, 312);
  }
  board(g, info.level, 90, 366, 900, 680);
  g.textAlign = 'center'; g.direction = 'rtl';
  g.fillStyle = '#fff'; g.font = `900 58px ${FONT}`; g.fillText(info.brag, W / 2, 1140);
  g.fillStyle = '#f2b124'; g.font = `800 48px ${FONT}`; g.fillText('تو می‌تونی؟', W / 2, 1208);
  g.fillStyle = 'rgba(255,255,255,.7)'; g.font = `600 30px ${FONT}`; g.fillText('راه‌بندون رو از کافه‌بازار بگیر', W / 2, 1282);
  g.direction = 'ltr'; g.fillStyle = 'rgba(255,255,255,.45)'; g.font = `500 24px ${FONT}`; g.fillText(STORE_URL.replace('https://', ''), W / 2, 1322);
  return canvas;
}

/** The text that goes with the image (and alone where images can't be shared). */
export const shareText = (info: ShareWin) => `${info.brag} ${info.title} — راه‌بندون. تو می‌تونی؟ ${STORE_URL}`;

/** Draw and share. Resolves to what happened, for the caller's toast. */
export async function shareWin(info: ShareWin): Promise<'shared' | 'saved' | 'failed'> {
  try {
    await Promise.all(['900 112px Vazirmatn', '800 46px Vazirmatn', '600 30px Vazirmatn'].map((f) => document.fonts.load(f).catch(() => {})));
    const canvas = drawShareCard(info), text = shareText(info), title = 'راه‌بندون';
    if (Capacitor.isNativePlatform()) {
      // JPEG: a fraction of a PNG's size on mobile data (messengers recompress pictures anyway).
      const data = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
      const { uri } = await Filesystem.writeFile({ path: 'rahbandoon-win.jpg', data, directory: Directory.Cache });
      await Share.share({ title, text, files: [uri], dialogTitle: 'فرستادن برای دوستات' });
      return 'shared';
    }
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.9));
    if (!blob) return 'failed';
    const file = new File([blob], 'rahbandoon-win.jpg', { type: 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ title, text, files: [file] }); return 'shared'; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return 'saved';
  } catch (e) {
    // Closing the share sheet without choosing an app is not a failure worth a message.
    if ((e as Error)?.name === 'AbortError' || /cancel/i.test(String((e as Error)?.message))) return 'shared';
    return 'failed';
  }
}
