import type { StatKey } from '../engine/types';

export interface Trait {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  /** Stat changes at birth. */
  mod?: Partial<Record<StatKey, number>>;
  luck?: number;
  grit?: number;
  /** Can't be combined with these. */
  not?: string[];
}

export const TRAITS: Trait[] = [
  { id: 'genius', name: 'نابغه', emoji: '🧠', desc: 'درس براش آبِ خوردنه', mod: { smarts: 25 }, not: ['slow'] },
  { id: 'slow', name: 'کُندذهن', emoji: '🐢', desc: 'دیر می‌گیره ولی خوب می‌گیره', mod: { smarts: -20 }, not: ['genius'] },
  { id: 'pretty', name: 'خوشگل', emoji: '✨', desc: 'از بچگی همه می‌گن ماشالله', mod: { looks: 25 } },
  { id: 'athlete', name: 'ورزشکار', emoji: '⚽', desc: 'بدن قوی و پرانرژی', mod: { health: 15 } },
  { id: 'sickly', name: 'ضعیف‌البنیه', emoji: '🤧', desc: 'زود مریض می‌شه', mod: { health: -20 }, not: ['athlete'] },
  { id: 'lucky', name: 'خوش‌شانس', emoji: '🍀', desc: 'دست به خاک بزنه طلا می‌شه', luck: 25, not: ['unlucky'] },
  { id: 'unlucky', name: 'بدشانس', emoji: '🐈‍⬛', desc: 'اگه بارون پلو بباره…', luck: -25, not: ['lucky'] },
  { id: 'lazy', name: 'تنبل', emoji: '🛋️', desc: 'فردا انجامش می‌ده، قول!', grit: -25, not: ['hardworking'] },
  { id: 'hardworking', name: 'سخت‌کوش', emoji: '💪', desc: 'تا تموم نشه ول نمی‌کنه', grit: 25, not: ['lazy'] },
  { id: 'charming', name: 'خوش‌زبون', emoji: '😏', desc: 'مار رو از سوراخ بیرون میاره', mod: { rep: 10 } },
  { id: 'singer', name: 'خوش‌صدا', emoji: '🎤', desc: 'تو مهمونی‌ها همه می‌گن یه آهنگ بخون', mod: { happy: 5 } },
  { id: 'foodie', name: 'شکمو', emoji: '🍗', desc: 'عاشق قورمه‌سبزی و کباب', mod: { happy: 5, health: -5 } },
  { id: 'sensitive', name: 'زودرنج', emoji: '🥺', desc: 'زود دلش می‌شکنه', mod: { happy: -10 } },
  { id: 'cheerful', name: 'شاد', emoji: '😄', desc: 'همیشه لبخند به لب', mod: { happy: 20 }, not: ['sensitive'] },
  { id: 'stingy', name: 'خسیس', emoji: '🪙', desc: 'پول رو از جیبش با انبر هم نمی‌شه درآورد' },
  { id: 'generous', name: 'دست‌ودل‌باز', emoji: '🎁', desc: 'همیشه حساب رو اون می‌ده', mod: { rep: 5 }, not: ['stingy'] },
  { id: 'artist', name: 'هنرمند', emoji: '🎨', desc: 'خلاق و احساساتی' },
  { id: 'nerd', name: 'خوره‌ی کامپیوتر', emoji: '💻', desc: 'از بچگی با کامپیوتر ور می‌ره', mod: { smarts: 8 } },
];

export function traitById(id: string): Trait | undefined {
  return TRAITS.find((t) => t.id === id);
}
