/**
 * Local reminders (nothing leaves the phone): "your lives are full" when they refill, "today's rush hour is
 * here" the next day at the hour this player usually plays, and after three days away, the welcome back. Both are scheduled only while the game is in
 * the background and cleared the moment it comes back; nothing rings between 22:00 and 09:00. Permission is
 * asked once, after the tenth level, with a card that says what it is for; Settings can turn it off.
 */
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface Reminder { id: number; at: number; title: string; body: string }
export const LIVES_ID = 1, DAILY_ID = 2, COMEBACK_ID = 3;
/** Days away that earn the welcome back (and its reminder). */
export const AWAY_DAYS = 3;

/** A time inside the quiet hours (22:00–09:00) moves to 09:00 the morning after. */
export function outsideQuiet(at: number): number {
  const d = new Date(at), h = d.getHours();
  if (h >= 22) { d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d.getTime(); }
  if (h < 9) { d.setHours(9, 0, 0, 0); return d.getTime(); }
  return at;
}

/** The hour this player usually opens the game: the median of recent opens (clamped to 10–21), or 19. */
export function usualHour(opens: number[]): number {
  if (!opens.length) return 19;
  const s = [...opens].sort((a, b) => a - b), m = s[Math.floor(s.length / 2)];
  return Math.min(21, Math.max(10, m));
}

export function planReminders(o: { now: number; livesFullAt: number | null; opens: number[]; comeback?: boolean }): Reminder[] {
  const out: Reminder[] = [];
  // Only worth a ping when the wait is real (more than ten minutes away).
  if (o.livesFullAt && o.livesFullAt > o.now + 10 * 60_000) {
    out.push({ id: LIVES_ID, at: outsideQuiet(o.livesFullAt), title: 'جون‌هات پر شد! ❤️', body: 'پنج تا جون داری؛ بیا یه گره‌ی ترافیک دیگه باز کن.' });
  }
  const d = new Date(o.now);
  d.setDate(d.getDate() + 1); d.setHours(usualHour(o.opens), 0, 0, 0);
  out.push({ id: DAILY_ID, at: d.getTime(), title: 'ساعت شلوغی امروز رسید! ⏰', body: 'چالش امروز آماده‌ست؛ یه سوئیچ جایزه داره.' });
  // Away for days: the welcome back waits (P3), and the reminder says so (it is cleared if they come back sooner).
  if (o.comeback) {
    const c = new Date(o.now);
    c.setDate(c.getDate() + AWAY_DAYS); c.setHours(usualHour(o.opens), 0, 0, 0);
    out.push({ id: COMEBACK_ID, at: c.getTime(), title: 'ترافیک تهران منتظرته! 🚕', body: 'مش‌رحیم یه هدیه‌ی خوش‌اومد برات کنار گذاشته: جون پر و از هر کمکی یکی.' });
  }
  return out;
}

const native = () => Capacitor.isNativePlatform();

/** Ask the system for permission (Android 13+ shows its dialog). Resolves whether reminders may show. */
export async function askNotifications(): Promise<boolean> {
  if (!native()) return false;
  try { return (await LocalNotifications.requestPermissions()).display === 'granted'; } catch { return false; }
}

/** Replace any pending reminders with `plan` (or just clear them when `plan` is empty or reminders are off). */
export async function syncReminders(on: boolean, plan: Reminder[]) {
  if (!native()) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    if (!on || !plan.length) return;
    if ((await LocalNotifications.checkPermissions()).display !== 'granted') return;
    await LocalNotifications.schedule({
      notifications: plan.map((r) => ({ id: r.id, title: r.title, body: r.body, schedule: { at: new Date(r.at) }, smallIcon: 'ic_stat_rb', iconColor: '#F2B124' })),
    });
  } catch { /* the reminder is a nicety: never let it break the game */ }
}
