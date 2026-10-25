/** Local reminders (no server): the daily gift and the character waiting to grow up. */
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { meta, persist } from './save';

const native = Capacitor.isNativePlatform();
const IDS = [101, 102, 103];

export async function askNotifyPermission() {
  if (!native || meta.notifyAsked) return;
  meta.notifyAsked = true;
  persist();
  try { await LocalNotifications.requestPermissions(); } catch { /* ignore */ }
}

/** Called when the app goes to the background. */
export async function scheduleReminders() {
  if (!native) return;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return;
    await LocalNotifications.cancel({ notifications: IDS.map((id) => ({ id })) });
    const L = meta.life;
    const name = L && !L.dead ? L.first : null;
    const at = (hours: number) => new Date(Date.now() + hours * 3600 * 1000);
    await LocalNotifications.schedule({
      notifications: [
        { id: 101, title: '🎁 هدیه‌ی امروزت آماده‌ست!', body: 'بیا الماس روزانه‌ات رو بگیر و یه سال دیگه زندگی کن.', schedule: { at: at(22) } },
        { id: 102, title: name ? `👶 ${name} منتظرته!` : '👶 یه زندگی جدید منتظرته!', body: name ? `${name} هنوز ${L!.age} سالشه. ببین سال بعد چی پیش میاد!` : 'به دنیا بیا و ببین این بار چی‌کاره می‌شی!', schedule: { at: at(50) } },
        { id: 103, title: '🎯 چالش‌های این هفته', body: 'سه تا چالش جدید با جایزه‌ی الماس منتظرته!', schedule: { at: at(24 * 6) } },
      ],
    });
  } catch { /* ignore */ }
}

export async function cancelReminders() {
  if (!native) return;
  try { await LocalNotifications.cancel({ notifications: IDS.map((id) => ({ id })) }); } catch { /* ignore */ }
}
