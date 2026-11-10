/**
 * «انتقال پیشرفت» (Settings): this phone's code, to copy or send to oneself, and a code from another phone, read and
 * confirmed with both phones' progress side by side before it replaces this one's. The format and what travels are in
 * ../transfer.ts. After the swap the game restarts on the new progress and says so (takeTransferNote).
 */
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { haptic } from '../haptics';
import { replaceSave, save, type Save } from '../save';
import { makeCode, merged, readCode } from '../transfer';
import { asBack, button, fa, faNum, h, modal, note } from './hud';
import { icon } from './icons';

const DONE = 'rahbandoon.transferred';

/** Where a save stands, in a few words: the level it is on and its coins. */
const stage = (s: Partial<Save>, total: number) => ((s.level ?? 0) >= total ? `همه‌ی ${fa(total)} مرحله` : `مرحله‌ی ${fa((s.level ?? 0) + 1)}`);
const coins = (s: Partial<Save>) => `${faNum(s.coins ?? 0)} سکه`;
const where = (s: Partial<Save>, total: number) => `${stage(s, total)} · ${coins(s)}`;
/** The card's icon on its tile; every step has one, so the card underneath never shows past the top. */
const tile = (name: string) => `<div class="burst"><span class="help-tile">${icon(name)}</span></div>`;

const WHY = {
  none: 'این کد راه‌بندون نیست. کد با «RB1.» شروع می‌شه.',
  broken: 'کد کامل نیست یا عوض شده؛ دوباره همه‌ش رو کپی کن.',
  newer: 'این کد مال نسخه‌ی تازه‌تر بازیه؛ اول بازی رو از بازار به‌روز کن.',
};

function codeBox(value = '') {
  const ta = h('textarea', 'code') as HTMLTextAreaElement;
  ta.dir = 'ltr'; ta.rows = 4; ta.value = value; ta.spellcheck = false;
  ta.setAttribute('autocomplete', 'off'); ta.setAttribute('autocapitalize', 'off'); ta.setAttribute('autocorrect', 'off');
  return ta;
}

/** Copy: the clipboard API where the WebView allows it, else the selected text the old way. */
async function copy(text: string, ta: HTMLTextAreaElement): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* no clipboard permission */ }
  try { ta.focus(); ta.select(); ta.setSelectionRange(0, text.length); return document.execCommand('copy'); } catch { return false; }
}

export function showTransfer(total: number) {
  const c = h('div', 'transfer');
  c.innerHTML = `${tile('transfer')}<h2>انتقال پیشرفت</h2>
    <p>گوشی عوض می‌کنی یا بازی رو دوباره نصب می‌کنی؟ با یه کد همه‌ی پیشرفتت میاد: مرحله‌ها، سکه‌ها، کمک‌ها، گاراژ و آژانس.</p>`;
  const close = modal(c, 'pop');
  c.append(button(`${icon('share')} کد این گوشی`, 'gold big', () => void showCode(total)));
  c.append(button(`${icon('import')} وارد کردن کد`, 'primary', () => showEnter(total)));
  c.append(h('p', 'small', 'خریدهای بازار با همون حساب بازار خودشون برمی‌گردن.'));
  c.append(asBack(button('برگرد', 'ghost', close)));
}

async function showCode(total: number) {
  const code = await makeCode(save);
  const c = h('div', 'transfer transfer-code');
  c.innerHTML = `${tile('share')}<h2>کد پیشرفتت</h2><p class="where">${where(save, total)}</p>`;
  const ta = codeBox(code);
  ta.readOnly = true; ta.setAttribute('aria-label', 'کد پیشرفت');
  ta.onfocus = () => ta.select();
  c.append(ta, h('p', 'small', 'یه جای امن نگهش دار، مثلاً «پیام‌های ذخیره‌شده»ی تلگرام. کد، پیشرفت همین لحظه رو داره؛ بیشتر که بازی کردی، کد تازه بگیر.'));
  const close = modal(c, 'pop');
  const native = Capacitor.isNativePlatform();
  if (native) {
    c.append(button(`${icon('share')} فرستادن`, 'gold big', () => {
      void Share.share({ title: 'کد پیشرفت راه‌بندون', text: `کد پیشرفت راه‌بندون (${where(save, total)}):\n${code}` }).catch(() => {});
    }));
  }
  c.append(button(`${icon('copy')} کپی`, native ? 'primary' : 'gold big', async () => {
    const ok = await copy(code, ta);
    note(ok ? 'کد کپی شد' : 'کپی نشد؛ انگشتت رو روی کد نگه دار و کپی کن');
    if (ok) haptic('light');
  }));
  c.append(asBack(button('برگرد', 'ghost', close)));
}

function showEnter(total: number) {
  const c = h('div', 'transfer transfer-in');
  c.innerHTML = `${tile('import')}<h2>وارد کردن کد</h2><p>کدی رو که از گوشی قبلی گرفتی اینجا بچسبون (انگشتت رو روی کادر نگه دار).</p>`;
  const ta = codeBox();
  ta.placeholder = 'RB1.…'; ta.setAttribute('aria-label', 'کد پیشرفت از گوشی قبلی');
  const err = h('p', 'err');
  err.setAttribute('role', 'alert');
  c.append(ta, err);
  const close = modal(c, 'pop');
  const go = button(`${icon('import')} بیار`, 'gold big', async () => {
    go.disabled = true;
    const r = await readCode(ta.value);
    go.disabled = !ta.value.trim();
    if (!r.ok) { err.textContent = WHY[r.why]; haptic('warn'); return; }
    confirmSwap(r.save, total);
  }) as HTMLButtonElement;
  go.disabled = true;
  ta.oninput = () => { go.disabled = !ta.value.trim(); err.textContent = ''; };
  c.append(go, asBack(button('برگرد', 'ghost', close)));
}

function confirmSwap(from: Partial<Save>, total: number) {
  const behind = (from.level ?? 0) < save.level;
  const c = h('div', 'transfer transfer-ok');
  c.innerHTML = `${tile('transfer')}<h2>جایگزین بشه؟</h2>
    <p>پیشرفت این گوشی می‌ره و پیشرفت کد جاش رو می‌گیره.</p>
    <div class="swap"><div><small>این گوشی</small><b>${stage(save, total)}</b><span>${coins(save)}</span></div><i>${icon('chevron')}</i><div class="to"><small>کد</small><b>${stage(from, total)}</b><span>${coins(from)}</span></div></div>
    ${behind ? '<p class="warn">پیشرفت کد از این گوشی کمتره!</p>' : ''}`;
  const close = modal(c, 'pop');
  c.append(button('آره، جایگزین کن', 'primary big', () => {
    replaceSave(merged(from, save));
    try { localStorage.setItem(DONE, where(save, total)); } catch { /* the note after the restart is only a nicety */ }
    haptic('success');
    // Start again on the new progress: every screen, the HUD and the world were built from the old one.
    location.reload();
  }));
  c.append(asBack(button('نه', 'ghost', close)));
}

/** After a swap and the restart: the note to show once («پیشرفتت اومد»), or null. */
export function takeTransferNote(): string | null {
  try {
    const w = localStorage.getItem(DONE);
    if (w === null) return null;
    localStorage.removeItem(DONE);
    return `پیشرفتت اومد! ${w}`;
  } catch { return null; }
}
