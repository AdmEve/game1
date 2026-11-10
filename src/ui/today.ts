/**
 * «امروز» (BEST_IN_MARKET_PLAN P4): the day's things in one card, from home. Today's «ساعت شلوغی», and Ms. Sabouri's
 * three missions over the agency radio, each with its progress and its coins to claim, and a key for all three.
 */
import { coin } from '../audio';
import { haptic } from '../haptics';
import { BONUS, MISSION_ICON, MISSIONS_FROM, REWARD, claimableMissions, missionText, todayMissions } from '../missions';
import { persist, save } from '../save';
import { emo } from './emoji';
import { addKeys } from './garage';
import { asBack, button, fa, faNum, h, modal } from './hud';
import { icon } from './icons';

export interface TodayOpts {
  day: string;
  rushDone: boolean;
  /** Days in a row the rush has been beaten. */
  rushStreak: number;
  /** Play today's rush (the card is closed first); the button shows `busy` while the level is being made. */
  playRush: (busy: (on: boolean) => void) => Promise<boolean>;
  onChange: () => void;
  onClose: () => void;
}

/** The home button's line: missions done, or the rush's state before missions start. */
export function todayLine(day: string, rushDone: boolean): string {
  if (save.level < MISSIONS_FROM) return rushDone ? 'امروز رد شد!' : `چالش امروز ${icon('key')}`;
  const ms = todayMissions(save, day), done = ms.list.filter((m) => m.got >= m.goal).length;
  return `مأموریت‌ها: ${fa(done)}/${fa(ms.list.length)}`;
}
export const todayBadge = (day: string) => (save.level < MISSIONS_FROM ? 0 : claimableMissions(todayMissions(save, day)));

export function showToday(o: TodayOpts) {
  const c = h('div', 'today');
  c.innerHTML = `<h2>${icon('radio')} امروز</h2>`;
  const close = modal(c, 'pop today-card');
  // Today's rush hour.
  const rush = button(`${icon('clock')}<span>ساعت شلوغی<small>${o.rushDone ? `امروز رد شد! ${o.rushStreak > 1 ? `${fa(o.rushStreak)} روز پشت سر هم` : ''}` : `چالش امروز، جایزه‌ش یه سوئیچ ${icon('key')}`}</small></span>${o.rushDone ? icon('check', 'ico ok') : icon('play', 'ico go')}`, `rush-row${o.rushDone ? ' done' : ''}`, async () => {
    if (o.rushDone || rush.classList.contains('busy')) return;
    const small = rush.querySelector('small')!, was = small.innerHTML;
    const ok = await o.playRush((on) => { rush.classList.toggle('busy', on); small.innerHTML = on ? 'آماده می‌شه…' : was; });
    if (ok) close();
  });
  c.append(rush);
  if (save.level >= MISSIONS_FROM) {
    const ms = todayMissions(save, o.day);
    c.append(h('h3', 'today-h', `مأموریت‌های امروز <small>${emo('📻', 'emo xs')} خانم صبوری از بی‌سیم آژانس</small>`));
    const list = h('div', 'missions');
    const draw = () => {
      list.innerHTML = '';
      for (const m of ms.list) {
        const done = m.got >= m.goal, row = h('div', `mission${done ? ' done' : ''}${m.claimed ? ' claimed' : ''}`);
        row.innerHTML = `<span class="mi">${emo(MISSION_ICON[m.kind], 'emo sm')}</span><span class="mt"><b>${missionText(m, fa)}</b>
          <i class="bar"><i style="width:${Math.round((m.got / m.goal) * 100)}%"></i></i><small>${fa(m.got)} از ${fa(m.goal)}</small></span>`;
        if (m.claimed) row.append(h('span', 'mr got', icon('check')));
        else if (done) {
          row.append(button(`بگیر ${emo('🪙', 'emo xs')} ${fa(REWARD[m.kind])}`, 'gold claim', () => {
            m.claimed = true; save.coins += REWARD[m.kind]; persist(); o.onChange(); coin(); haptic('success'); draw();
          }));
        } else row.append(h('span', 'mr', `${emo('🪙', 'emo xs')} ${fa(REWARD[m.kind])}`));
        list.append(row);
      }
      // All three: a key and coins.
      const all = ms.list.every((m) => m.claimed);
      const bonus = h('div', `mission bonus${ms.bonus ? ' claimed' : ''}`);
      bonus.innerHTML = `<span class="mi">${emo('🎁', 'emo sm')}</span><span class="mt"><b>هر سه تا</b><small>${emo('🔑', 'emo xs')} ${fa(BONUS.keys)} سوئیچ و ${emo('🪙', 'emo xs')} ${faNum(BONUS.coins)} سکه</small></span>`;
      if (ms.bonus) bonus.append(h('span', 'mr got', icon('check')));
      else if (all) {
        bonus.append(button('بگیر', 'gold claim', () => {
          ms.bonus = true; save.coins += BONUS.coins; addKeys(BONUS.keys); persist(); o.onChange(); coin(); coin(0.12); haptic('success'); draw();
        }));
      }
      list.append(bonus);
    };
    draw();
    c.append(list);
    c.append(h('p', 'today-foot', 'هر روز سه تا مأموریت تازه.'));
  }
  // A long card on a small phone: it scrolls, with its close always in reach (as the privacy policy).
  const foot = h('div', 'privacy-foot');
  foot.append(asBack(button('بستن', 'ghost', () => { close(); o.onClose(); })));
  c.append(foot);
}
