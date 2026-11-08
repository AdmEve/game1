import { describe, expect, it, vi } from 'vitest';
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: {} }));
import { DAILY_ID, LIVES_ID, outsideQuiet, planReminders, usualHour } from '../src/notify';

const at = (h: number, m = 0, day = 10) => new Date(2026, 10, day, h, m).getTime();

describe('reminders', () => {
  it('never ring in the quiet hours', () => {
    expect(outsideQuiet(at(23, 30))).toBe(at(9, 0, 11));
    expect(outsideQuiet(at(6, 15))).toBe(at(9, 0));
    expect(outsideQuiet(at(14, 5))).toBe(at(14, 5));
  });
  it('use the hour this player usually plays, within reason', () => {
    expect(usualHour([])).toBe(19);
    expect(usualHour([20, 21, 20, 8, 20])).toBe(20);
    expect(usualHour([2, 3, 1])).toBe(10);
    expect(usualHour([23, 23])).toBe(21);
  });
  it('plan lives-full only for a real wait, and the daily one for tomorrow', () => {
    const now = at(15);
    const p = planReminders({ now, livesFullAt: now + 60 * 60_000, opens: [18] });
    expect(p.map((r) => r.id)).toEqual([LIVES_ID, DAILY_ID]);
    expect(p[0].at).toBe(now + 60 * 60_000);
    expect(p[1].at).toBe(at(18, 0, 11));
    expect(planReminders({ now, livesFullAt: now + 5 * 60_000, opens: [] }).map((r) => r.id)).toEqual([DAILY_ID]);
    expect(planReminders({ now, livesFullAt: null, opens: [] }).map((r) => r.id)).toEqual([DAILY_ID]);
  });
});
