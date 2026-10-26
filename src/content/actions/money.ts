import { award } from '../../engine/achieve';
import { clamp, type Ctx } from '../../engine/ctx';
import { fa, money, num } from '../../engine/fmt';
import { defActions, defEvents, type ActionOption } from '../../engine/registry';
import type { Asset } from '../../engine/types';
import { assetValue } from '../../engine/wealth';
import { milCardOk } from '../../engine/year';
import { CARS, HOUSES, SHOPS } from '../assets';
import { COUNTRIES, countryById } from '../cities';
import { degreeLevel } from '../edu';

function addAsset(c: Ctx, a: Omit<Asset, 'id' | 'year'>) {
  const same = c.L.assets.find((x) => x.kind === a.kind && x.ref === a.ref && ['coin', 'dollar', 'stock', 'crypto', 'deposit'].includes(a.kind));
  if (same) {
    same.qty += a.qty;
    same.paid += a.paid;
    return same;
  }
  const n: Asset = { ...a, id: c.L.nextId++, year: c.L.year };
  c.L.assets.push(n);
  return n;
}

const adultFree = (c: Ctx) => c.age >= 18 && !c.L.prison;

function amountOptions(c: Ctx, unitPrice: number, amounts: number[], unit: string): ActionOption[] {
  return amounts.map((q) => ({ id: String(q), label: `${num(q)} ${unit}`, desc: money(q * unitPrice), cost: Math.round(q * unitPrice), data: q }));
}

function tomanOptions(c: Ctx): ActionOption[] {
  return [10e6, 50e6, 200e6, 1e9, 5e9, 25e9].map((x) => c.price(x)).map((x) => ({ id: String(x), label: money(x), cost: x, data: x }));
}

defActions([
  {
    id: 'buy_gold', group: 'money', emoji: '🪙', limit: 4,
    label: 'خرید سکه‌ی طلا', desc: (c) => `هر سکه: ${money(c.L.econ.coin)}`,
    when: (c) => c.age >= 16 && !c.L.prison,
    options: (c) => amountOptions(c, c.L.econ.coin, [1, 5, 20, 100, 500], 'سکه'),
    do: (c, o) => {
      const q = o!.data as number;
      addAsset(c, { kind: 'coin', ref: 'coin', name: 'سکه‌ی طلا', qty: q, paid: o!.cost! });
      c.happy(2);
      return `${fa(q)} سکه خریدی ${c.pick(['و گذاشتی تو گاوصندوق. «طلا همیشه ارزشش رو حفظ می‌کنه!»', 'و گذاشتی تو صندوق امانات بانک.', 'و تو یه جوراب قدیمی ته کمد قایمش کردی!', `و ${c.parent('یه دوست')} گفت «آفرین، طلا بهترین پس‌اندازه!»`])}`;
    },
  },
  {
    id: 'buy_dollar', group: 'money', emoji: '💵', limit: 4,
    label: 'خرید دلار', desc: (c) => `هر دلار: ${money(c.L.econ.dollar)}`,
    when: (c) => c.age >= 16 && !c.L.prison,
    options: (c) => amountOptions(c, c.L.econ.dollar * 1.02, [100, 1000, 10000, 100000], 'دلار'),
    do: (c, o) => {
      const q = o!.data as number;
      addAsset(c, { kind: 'dollar', ref: 'usd', name: 'دلار', qty: q, paid: o!.cost! });
      return `${num(q)} دلار ${c.pick(['از صرافی سر کوچه خریدی.', 'خریدی و لای کتاب‌ها قایم کردی!', 'خریدی. صراف گفت «فردا گرون‌تر می‌شه، خوب موقعی خریدی!»', 'خریدی و حالا هر روز صبح اول از همه قیمت دلار رو چک می‌کنی.'])}`;
    },
  },
  {
    id: 'buy_stock', group: 'money', emoji: '📈', limit: 4,
    label: 'خرید سهام (بورس)', desc: 'پرنوسان، با سود بالقوه‌ی زیاد',
    when: (c) => c.age >= 18 && !c.L.prison && !c.abroad,
    options: (c) => tomanOptions(c),
    do: (c, o) => {
      const x = o!.data as number;
      addAsset(c, { kind: 'stock', ref: 'fund', name: 'سهام بورس', qty: x / c.L.econ.stock, paid: x });
      return `${money(x)} سهام خریدی. یه کانال تلگرامی گفته بود «این سهم موشکه!»`;
    },
  },
  {
    id: 'buy_crypto', group: 'money', emoji: '🪙', limit: 4,
    label: 'خرید رمزارز', desc: 'خیلی پرریسک!',
    when: (c) => c.age >= 18 && !c.L.prison,
    options: (c) => tomanOptions(c),
    do: (c, o) => {
      const x = o!.data as number;
      const a = addAsset(c, { kind: 'crypto', ref: 'btc', name: 'رمزارز', qty: x / (c.L.econ.crypto * c.L.econ.dollar), paid: x });
      void a;
      return `${money(x)} رمزارز خریدی. حالا هر پنج دقیقه قیمت رو چک می‌کنی!`;
    },
  },
  {
    id: 'deposit', group: 'money', emoji: '🏦', limit: 3,
    label: 'سپرده‌ی بانکی', desc: (c) => `سود سالانه ${fa(Math.round(c.L.econ.rate * 100))}٪`,
    when: (c) => c.age >= 18 && !c.L.prison,
    options: (c) => tomanOptions(c),
    do: (c, o) => {
      const x = o!.data as number;
      addAsset(c, { kind: 'deposit', ref: 'bank', name: 'سپرده‌ی بانکی', qty: x, paid: x });
      return `${money(x)} سپرده‌ی یک‌ساله گذاشتی. کارمند بانک یه خودکار هم بهت هدیه داد!`;
    },
  },
  {
    id: 'sell', group: 'money', emoji: '🤝', limit: 6,
    label: 'فروش دارایی',
    when: (c) => c.L.assets.length > 0 && !c.L.prison,
    options: (c) => c.L.assets.map((a) => {
      const v = assetValue(c.L, a);
      const gain = v - a.paid;
      return { id: String(a.id), label: assetLabel(a), desc: `ارزش: ${money(v)}، ${gain >= 0 ? 'سود' : 'ضرر'}: ${money(Math.abs(gain))}`, data: a.id };
    }),
    do: (c, o) => {
      const a = c.L.assets.find((x) => x.id === o!.data)!;
      const v = Math.round(assetValue(c.L, a) * (a.kind === 'house' || a.kind === 'car' ? 0.97 : 1));
      c.L.assets = c.L.assets.filter((x) => x !== a);
      c.money(v);
      const gain = v - a.paid;
      if (a.kind === 'crypto' && v > a.paid * 10) award(c, 'crypto');
      if (a.kind === 'house' && c.L.home === 'own' && !c.L.assets.some((x) => x.kind === 'house')) c.L.home = 'rent';
      c.happy(gain > 0 ? 4 : -4);
      return `${assetLabel(a)} رو به ${money(v)} فروختی. ${gain > 0 ? `${money(gain)} سود کردی!` : gain < 0 ? `${money(-gain)} ضرر کردی.` : ''}`;
    },
  },
  {
    id: 'loan', group: 'money', emoji: '🏛️',
    label: 'وام گرفتن', desc: 'قسط ۴ ساله با سود ۲۳٪',
    when: (c) => adultFree(c) && !c.abroad && c.L.loans.length < 3,
    off: (c) => (c.L.gender === 'm' && !milCardOk(c.L) ? 'کارت پایان خدمت نداری' : !c.L.job ? 'ضامن و فیش حقوقی نداری' : false),
    options: (c) => {
      const max = (c.L.job?.salary ?? 0) * 24;
      return [0.25, 0.5, 1].map((f) => Math.round(max * f)).map((x) => ({ id: String(x), label: money(x), data: x }));
    },
    do: (c, o) => {
      const x = o!.data as number;
      c.money(x);
      c.L.loans.push({ id: c.L.nextId++, name: 'وام بانکی', left: x, yearly: Math.round((x * 1.23) / 3.2), rate: 0.23 });
      return `${money(x)} وام گرفتی. بعد از دو ماه دوندگی و سه تا ضامن!`;
    },
  },
  {
    id: 'buy_car', group: 'money', emoji: '🚗',
    label: 'خرید ماشین',
    when: (c) => adultFree(c),
    options: (c) => CARS.map((d) => {
      const price = Math.round(d.price * c.L.econ.car);
      return { id: d.id, label: d.name, emoji: d.emoji, desc: money(price), cost: price };
    }),
    do: (c, o) => {
      // The price is held while haggling; the haggle event refunds what isn't spent.
      c.queue('haggle', { kind: 'car', ref: o!.id, price: o!.cost! });
      return `رفتی سراغ خرید ${o!.label}…`;
    },
  },
  {
    id: 'buy_house', group: 'money', emoji: '🏠',
    label: 'خرید خونه',
    when: (c) => adultFree(c) && !c.abroad,
    options: (c) => {
      const city = c.city;
      const out: ActionOption[] = [];
      for (const [hood, hm] of city.hoods) {
        for (const h of HOUSES) {
          if (h.id === 'north') continue;
          if (h.id === 'penthouse' && hm < 1.3) continue;
          if (h.id === 'studio' && hm > 1) continue;
          const price = Math.round(h.area * c.L.econ.m2 * city.mul * hm * h.mul);
          out.push({ id: `${h.id}|${hood}`, label: `${h.name} — ${hood}`, emoji: h.emoji, desc: money(price), cost: price, data: { ref: h.id, hood, mul: city.mul * hm } });
        }
      }
      const n = HOUSES.find((h) => h.id === 'north')!;
      const np = Math.round(n.area * c.L.econ.m2 * n.mul);
      out.push({ id: 'north|شمال', label: n.name, emoji: n.emoji, desc: money(np), cost: np, data: { ref: 'north', hood: 'نوشهر', mul: 1 } });
      return out.sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0));
    },
    do: (c, o) => {
      const d = o!.data as { ref: string; hood: string; mul: number };
      c.queue('haggle', { kind: 'house', ref: d.ref, hood: d.hood, mul: d.mul, price: o!.cost! });
      return `با بنگاه‌دار رفتی ${o!.label} رو ببینی…`;
    },
  },
  {
    id: 'rent_out', group: 'money', emoji: '🔑',
    label: 'اجاره دادن خونه',
    when: (c) => c.L.assets.some((a) => a.kind === 'house' && !a.rented) && (c.L.home !== 'own' || c.L.assets.filter((a) => a.kind === 'house' && !a.rented).length > 1),
    options: (c) => c.L.assets.filter((a) => a.kind === 'house' && !a.rented).map((a) => ({ id: String(a.id), label: a.name, desc: `اجاره‌ی سالانه حدود ${money(assetValue(c.L, a) * 0.04)}`, data: a.id })),
    do: (c, o) => {
      const a = c.L.assets.find((x) => x.id === o!.data)!;
      a.rented = true;
      return `${a.name} رو اجاره دادی. مستاجرت یه خانواده‌ی چهارنفره‌ست که قول دادن «مثل خونه‌ی خودمون نگهش می‌داریم».`;
    },
  },
  {
    id: 'business', group: 'money', emoji: '🏪',
    label: 'راه‌اندازی کسب‌وکار',
    when: (c) => adultFree(c) && c.L.assets.filter((a) => a.kind === 'shop').length < 3,
    options: (c) => SHOPS.map((s) => ({ id: s.id, label: s.name, emoji: s.emoji, desc: `سرمایه: ${money(s.cost * c.L.econ.price)}، ریسک: ${s.risk > 0.6 ? 'خیلی زیاد' : s.risk > 0.35 ? 'متوسط' : 'کم'}`, cost: Math.round(s.cost * c.L.econ.price) })),
    do: (c, o) => {
      const s = SHOPS.find((x) => x.id === o!.id)!;
      addAsset(c, { kind: 'shop', ref: s.id, name: `${s.name} ${c.name}`, qty: 1, paid: o!.cost!, cond: 100 });
      c.happy(8).rep(4);
      return `${s.emoji} ${s.name} خودت رو افتتاح کردی! روز افتتاحیه کل فامیل اومدن و شیرینی خوردن.`;
    },
  },
  {
    id: 'gem_cash', group: 'money', emoji: '💎', gems: 10,
    label: 'کمک غیبی', desc: (c) => `${money(c.wage * 24)} پول نقد فوری`,
    when: (c) => c.age >= 16 && !c.L.prison,
    do: (c) => {
      c.money(c.wage * 24);
      c.happy(6);
      return c.pick(['یه عموی دور از کانادا برات پول فرستاد!', 'یه بلیت بخت‌آزمایی قدیمی تو جیب کتت پیدا کردی که برنده بود!', 'یه حساب بانکی فراموش‌شده‌ی قدیمی پیدا کردی!']);
    },
  },
  {
    id: 'charity', group: 'social', emoji: '🤲',
    label: 'کمک به خیریه', desc: (c) => money(c.price(10e6)),
    cost: (c) => c.price(10e6),
    when: (c) => c.age >= 16 && !c.L.prison,
    do: (c) => {
      c.inc('charity');
      c.happy(5).rep(4);
      return c.pick(['به یه خیریه‌ی کودکان کار کمک کردی.', 'جهیزیه‌ی یه عروس نیازمند رو جور کردی.', 'به زلزله‌زده‌ها کمک فرستادی.', 'پول دارو برای یه بیمار نیازمند رو دادی.']);
    },
  },
  {
    id: 'nazri', group: 'social', emoji: '🍲',
    label: 'نذری دادن', desc: (c) => money(c.price(30e6)),
    cost: (c) => c.price(30e6),
    when: (c) => c.age >= 20 && !c.L.prison && !c.abroad,
    do: (c) => {
      c.inc('charity');
      c.happy(5).rep(6);
      return c.pick(['یه دیگ بزرگ شله‌زرد پختی و به همسایه‌ها دادی.', 'قیمه نذری پختی؛ صف تا سر کوچه بود!', 'آش رشته نذری دادی و کل محل اومدن.']);
    },
  },
  // ───────── abroad ─────────
  {
    id: 'emigrate', group: 'abroad', emoji: '✈️',
    label: 'اقدام برای مهاجرت',
    when: (c) => adultFree(c) && !c.abroad,
    off: (c) => (c.male && !milCardOk(c.L) ? 'بدون کارت پایان خدمت پاسپورت نمی‌دن' : false),
    options: (c) => COUNTRIES.filter((x) => x.id !== 'us').map((co) => {
      const cost = Math.round(co.cost * c.L.econ.dollar * 0.8);
      const needIelts = co.lang === 'انگلیسی' ? 6 : 0;
      const off = needIelts && (c.L.edu.ielts ?? 0) < needIelts ? `آیلتس ${fa(needIelts)} لازمه` : undefined;
      return { id: co.id, label: `${co.flag} ${co.name}`, desc: `هزینه و تمکن مالی: ${money(cost)}`, cost, off };
    }),
    do: (c, o) => {
      const co = countryById(o!.id)!;
      const deg = c.L.edu.degrees.reduce((m, d) => Math.max(m, degreeLevel(d.kind)), 0);
      const p = clamp((1 - co.hard) * (0.5 + deg * 0.15) * (0.8 + c.s('smarts') / 200) + ((c.L.edu.ielts ?? 0) - 6) * 0.1, 0.05, 0.92);
      if (c.lucky(p)) {
        c.money(Math.round(o!.cost! * 0.6)); // the show-money comes back to you
        moveAbroad(c, co.id);
        return `${co.flag} ویزات اومد و رفتی ${co.name}! فرودگاه امام کلی گریه کردین.`;
      }
      c.money(Math.round(o!.cost! * 0.8));
      c.happy(-10);
      return `ویزای ${co.name} ریجکت شد. هزینه‌ی وکیل و ترجمه پرید!`;
    },
  },
  {
    id: 'lottery', group: 'abroad', emoji: '🎫',
    label: 'ثبت‌نام لاتاری گرین‌کارت', desc: (c) => money(c.price(1e6)),
    cost: (c) => c.price(1e6),
    when: (c) => adultFree(c) && c.L.country !== 'us' && !c.has('greencard') && c.L.edu.degrees.length > 0,
    do: (c) => {
      if (c.lucky(0.012)) { c.queue('greencard'); return 'یه ایمیل اومده از سفارت آمریکا…'; }
      return c.pick(['ثبت‌نام کردی. عکس‌ت رو سه بار عوض کردی که پس‌زمینه سفید باشه!', 'ثبت‌نام کردی و تا اردیبهشت هر روز سایت رو چک کردی. این دفعه هم نشد.']);
    },
  },
  {
    id: 'recognize', group: 'abroad', emoji: '📜',
    label: 'معادل‌سازی مدرک', desc: (c) => `یه سال دوره و امتحان، ${money(4000 * c.L.econ.dollar)}`,
    cost: (c) => Math.round(4000 * c.L.econ.dollar),
    when: (c) => c.abroad && !c.has('recognized') && c.L.edu.degrees.some((d) => d.kind !== 'diploma') && !c.L.prison,
    do: (c) => {
      if (c.lucky(0.7 + c.s('smarts') / 500)) { c.flag('recognized'); c.smarts(2); return 'مدرکت رو معادل‌سازی کردی! حالا می‌تونی برای کارهای تخصصی درخواست بدی.'; }
      c.happy(-5);
      return 'امتحان معادل‌سازی رو رد شدی. سال بعد دوباره.';
    },
  },
  {
    id: 'return_home', group: 'abroad', emoji: '🇮🇷',
    label: 'برگشت به ایران',
    confirm: 'مطمئنی می‌خوای برگردی ایران؟',
    when: (c) => c.abroad && !c.L.prison,
    do: (c) => {
      const co = countryById(c.L.country)!;
      c.L.country = 'ir';
      c.L.home = c.L.assets.some((a) => a.kind === 'house') ? 'own' : c.parents.length && !c.spouse ? 'parents' : 'rent';
      c.L.job = null;
      if (c.L.edu.stage === 'uni' && c.L.edu.uni?.abroad) { c.L.edu.stage = 'none'; c.L.edu.uni = undefined; }
      c.happy(10);
      award(c, 'returned');
      for (const p of c.parents) c.close(p, 15);
      return `از ${co.name} برگشتی ایران. ${c.rel('mother') ? 'مامانت تو فرودگاه اسپند دود کرد!' : 'کل فامیل اومدن فرودگاه استقبالت!'}`;
    },
  },
]);

export function moveAbroad(c: Ctx, country: string) {
  const L = c.L;
  L.country = country;
  L.home = 'abroad';
  c.flag('emigrated');
  if (L.job) L.job = null;
  if (L.edu.stage === 'uni' && !L.edu.uni?.abroad) { L.edu.stage = 'none'; L.edu.uni = undefined; }
  c.happy(12).rep(3);
  for (const p of c.parents) c.close(p, -5);
  award(c, 'emigrant');
}

function assetLabel(a: Asset): string {
  switch (a.kind) {
    case 'coin': return `${fa(a.qty)} سکه‌ی طلا`;
    case 'dollar': return `${num(a.qty)} دلار`;
    case 'stock': return 'سهام بورس';
    case 'crypto': return 'رمزارز';
    case 'deposit': return 'سپرده‌ی بانکی';
    default: return a.name;
  }
}

defEvents([
  {
    id: 'haggle',
    milestone: true,
    emoji: (c) => (c.p.kind === 'car' ? '🚗' : '🏠'),
    title: 'چونه زدن',
    text: (c) => `${c.p.kind === 'car' ? 'فروشنده' : 'بنگاه‌دار'} قیمت ${haggleWhat(c.p)} رو ${money(c.p.price as number)} گفت. چی‌کار می‌کنی؟`,
    choices: [
      // Settled in the haggling mini-game.
      {
        label: 'تحویل بگیر',
        when: (c) => c.p.deal !== undefined,
        do: (c) => {
          const deal = c.p.deal as number;
          const off = (c.p.price as number) - deal;
          if (off >= (c.p.price as number) * 0.15) award(c, 'haggler');
          return `${off > 0 ? `با چونه زدن ${money(off)} تخفیف گرفتی! ` : ''}${buyNow(c, deal)}`;
        },
      },
      {
        label: 'باشه',
        when: (c) => !!c.p.walk,
        do: (c) => {
          c.money(c.p.price as number);
          if (c.p.walk === 1) { c.happy(-4); return `فروشنده‌ی ${haggleWhat(c.p)} قهر کرد و معامله به هم خورد.`; }
          return `از خرید ${haggleWhat(c.p)} منصرف شدی.`;
        },
      },
      { label: 'قبول! بخریمش', when: haggleOpen, do: (c) => buyNow(c, c.p.price as number) },
      {
        label: 'چونه می‌زنم!',
        when: haggleOpen,
        do: (c) => {
          const price = c.p.price as number;
          const skill = (c.trait('charming') ? 0.2 : 0) + (c.trait('stingy') ? 0.15 : 0);
          if (c.lucky(0.55 + skill)) {
            const off = Math.round(price * c.rng.range(0.04, 0.14));
            return `با کلی «جون من!» و «آخرش رو بگو» قیمت رو ${money(off)} پایین آوردی. ${buyNow(c, price - off)}`;
          }
          if (c.chance(0.4)) {
            c.money(price);
            c.happy(-4);
            return 'فروشنده ناراحت شد و گفت «برو آقا/خانم، مشتری زیاده!» و معامله به هم خورد.'.replace('آقا/خانم', c.g('آقا', 'خانم'));
          }
          return `فروشنده کوتاه نیومد. ${buyNow(c, price)}`;
        },
      },
      { label: 'پشیمون شدم', when: haggleOpen, do: (c) => { c.money(c.p.price as number); return 'از خرید منصرف شدی.'; } },
    ],
  },
  {
    id: 'greencard',
    milestone: true,
    emoji: '🇺🇸',
    title: 'برنده‌ی لاتاری!',
    text: 'باورت نمی‌شه! تو لاتاری گرین‌کارت آمریکا برنده شدی! باید بری مصاحبه تو سفارت (تو ترکیه یا امارات).',
    choices: [
      {
        label: 'می‌رم مصاحبه!',
        cost: (c) => c.price(400e6),
        note: (c) => `هزینه‌ی سفر و مدارک: ${money(c.price(400e6))}`,
        do: (c) => {
          c.flag('greencard');
          award(c, 'greencard');
          if (c.male && !milCardOk(c.L)) return 'متأسفانه بدون کارت پایان خدمت نتونستی پاسپورت بگیری. چه حیف!';
          if (c.lucky(0.6)) { moveAbroad(c, 'us'); return '🇺🇸 ویزات صادر شد و رفتی آمریکا! خوش اومدی به سرزمین فرصت‌ها (و بیمه‌های گرون).'; }
          c.happy(-20);
          return 'بعد از ۱۸ ماه کلیرنس، پرونده‌ات رد شد. خیلی ناراحت شدی.';
        },
      },
      { label: 'نه، همین‌جا می‌مونم', do: (c) => { c.flag('greencard'); return 'گرین‌کارت رو ول کردی. فامیل فکر می‌کنن دیوونه شدی!'; } },
    ],
  },
]);

/** What is being bought, for the haggle texts. */
export function haggleWhat(p: Record<string, unknown>): string {
  return p.kind === 'car' ? CARS.find((x) => x.id === p.ref)?.name ?? '' : `${HOUSES.find((x) => x.id === p.ref)?.name} در ${p.hood}`;
}

function haggleOpen(c: Ctx) {
  return c.p.deal === undefined && !c.p.walk;
}

function buyNow(c: Ctx, paid: number): string {
  const L = c.L;
  // The full price was taken when the deal started; give back the difference.
  c.money((c.p.price as number) - paid);
  if (c.p.kind === 'car') {
    const d = CARS.find((x) => x.id === c.p.ref)!;
    addAsset(c, { kind: 'car', ref: d.id, name: d.name, qty: 1, paid, cond: d.id === 'pride' || d.id === 'peykan' ? 60 : 100 });
    c.happy(6 + d.flex).rep(d.flex);
    return `${d.emoji} ${d.name} خریدی! ${d.flex >= 8 ? 'تو محل همه برگشتن نگاه کردن!' : 'اولین کاری که کردی یه آویز به آینه‌اش زدی.'}`;
  }
  const h = HOUSES.find((x) => x.id === c.p.ref)!;
  addAsset(c, { kind: 'house', ref: h.id, name: `${h.name} ${c.p.hood}`, qty: h.area, paid, mul: c.p.mul as number });
  c.happy(10 + h.flex).rep(3 + h.flex);
  if (L.home === 'rent' || (L.home === 'parents' && L.age >= 25)) {
    L.home = 'own';
    return `${h.emoji} صاحب‌خونه شدی و رفتی توش! دیگه اجاره نمی‌دی.`;
  }
  return `${h.emoji} صاحب ${h.name} تو ${c.p.hood} شدی!`;
}
