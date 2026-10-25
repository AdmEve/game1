/** Pets: adopting one, things to do with it, and what pets get up to. */
import { clamp, type Ctx } from '../../engine/ctx';
import { fa, money, num } from '../../engine/fmt';
import { defActions, defEvents, defPetActs } from '../../engine/registry';
import type { Pet } from '../../engine/types';
import { PET_KINDS, petKind } from '../pets';

/** The pet an event is about (chosen in `prep`). */
function thePet(c: Ctx): Pet {
  return (c.L.pets ?? []).find((p) => p.id === c.p.pet)!;
}

/** Prep that picks one of your pets of these kinds (any kind when empty). */
function withPet(...kinds: string[]) {
  return (c: Ctx) => {
    const list = c.pets.filter((p) => !kinds.length || kinds.includes(p.kind));
    return list.length ? { pet: c.pick(list).id } : null;
  };
}

const hasPet = (...kinds: string[]) => (c: Ctx) => c.pets.some((p) => !kinds.length || kinds.includes(p.kind));

/** Gone for good (given away or lost): not shown among the pets that died. */
function loseFor(c: Ctx, p: Pet) {
  p.alive = false;
  c.happy(-Math.round(4 + p.close / 12));
}

defActions([
  {
    id: 'adopt_pet', group: 'home', emoji: '🐾',
    label: 'حیوون خونگی',
    desc: 'گربه، سگ، طوطی، ماهی…',
    when: (c) => c.age >= 6 && !c.L.prison,
    off: (c) => (c.pets.length >= 4 ? 'دیگه جا نداری! خونه شده باغ وحش' : false),
    options: (c) => PET_KINDS.map((k) => ({
      id: k.id,
      label: k.id === 'cat' ? 'یه گربه‌ی خیابونی رو بیار خونه' : k.name,
      emoji: k.emoji,
      desc: `${k.cost && c.age >= 18 ? money(c.price(k.cost)) : 'مجانی!'}، خرج سالانه حدود ${money(c.price(k.care))}`,
      cost: c.age >= 18 ? c.price(k.cost) : 0,
    })),
    do: (c, o) => {
      const k = petKind(o!.id);
      if (c.age < 18 && k.id !== 'fish' && c.parents.length && !c.lucky(0.5)) {
        c.happy(-4);
        return `${c.pick(['بابات', 'مامانت'])} گفت «نخیر! کی می‌خواد تمیزش کنه؟» و قضیه منتفی شد.`;
      }
      const p = c.addPet(k.id, k.id === 'cat' ? c.int(0, 2) : 0);
      c.happy(8);
      const how = k.id === 'cat' ? 'یه بچه‌گربه‌ی لاغر رو از کنار سطل آشغال آوردی خونه و حموم کردی.' : `یه ${k.name} خریدی.`;
      return `${how} اسمش رو گذاشتی «${p.name}». ${c.age < 18 ? 'قول دادی خودت تمیزش کنی!' : 'خونه‌ات شلوغ‌تر و شادتر شد.'}`;
    },
  },
]);

defPetActs([
  {
    id: 'pet_cuddle', emoji: '🤗',
    label: 'نازش کن',
    when: (_c, p) => p.kind !== 'fish' && p.kind !== 'turtle',
    do: (c, p) => {
      p.close = clamp(p.close + 10);
      c.happy(3);
      switch (p.kind) {
        case 'cat': case 'persian': return `${p.name} خرخر کرد و رو پات خوابید. دیگه نمی‌تونی از جات تکون بخوری!`;
        case 'dog': return `${p.name} دمش رو تکون داد و کل صورتت رو لیس زد!`;
        case 'parrot': return `${p.name} گفت «دوستت دارم!» معلوم نیست از کی یاد گرفته!`;
        case 'canary': return `${p.name} رو انگشتت نشست و یه آواز خوند.`;
        default: return `${p.name} گوش‌هاش رو تکون داد و بینیش رو مالید به دستت.`;
      }
    },
  },
  {
    id: 'pet_play', emoji: '🎾',
    label: 'باهاش وقت بگذرون',
    when: () => true,
    do: (c, p) => {
      p.close = clamp(p.close + 7);
      switch (p.kind) {
        case 'dog':
          c.health(2).happy(3);
          return c.chance(0.25) ? `${p.name} رو بردی پارک. یه گربه دید و افتاد دنبالش؛ نیم ساعت دنبالش دویدی!` : `${p.name} رو بردی پارک و توپ پرت کردی. هر دوتون خسته و خوشحال برگشتین.`;
        case 'parrot': {
          const n = c.inc('parrotWords');
          c.happy(3);
          const word = c.pick(['سلام!', 'چایی بیار!', 'گل پسر!', 'قربونت برم!', 'برو بیرون!', 'الو؟ الو؟']);
          return n >= 5 ? `${p.name} دیگه بلبل‌زبون شده! امروز گفت «${word}»` : `بهش یاد دادی بگه «${word}». بعد از دو روز تمرین گفتش!`;
        }
        case 'fish': case 'turtle':
          c.happy(2);
          return `نیم ساعت نشستی و ${p.name} رو تماشا کردی. آرامش گرفتی.`;
        case 'cat': case 'persian':
          c.happy(3);
          return `با یه نخ کاموا با ${p.name} بازی کردی. آخرش کل کاموا دور مبل پیچیده بود!`;
        default:
          c.happy(3);
          return `کلی با ${p.name} بازی کردی.`;
      }
    },
  },
  {
    id: 'pet_photo', emoji: '📸',
    label: 'عکسش رو بذار اینستاگرام',
    when: (c) => c.age >= 12,
    do: (c, p) => {
      const viral = c.lucky(p.kind === 'persian' || p.kind === 'parrot' ? 0.12 : 0.06);
      const n = viral ? c.int(5000, 40000) : c.int(5, 120);
      c.L.followers += n;
      c.happy(viral ? 8 : 1);
      return viral ? `ویدیوی ${p.name} وایرال شد! ${num(n)} فالوور جدید گرفتی. حالا همه ${p.name} رو می‌شناسن، نه تو رو!` : `عکس ${p.name} رو گذاشتی. ${fa(n)} تا فالوور جدید و کلی قلب گرفت.`;
    },
  },
  {
    id: 'pet_vet', emoji: '🩺',
    label: 'ببرش دامپزشکی',
    when: (_c, p) => p.kind !== 'fish',
    cost: (c, p) => c.price(petKind(p.kind).care * 0.3 + 2e6),
    do: (c, p) => {
      p.life += c.chance(0.5) ? 1 : 0;
      p.close = clamp(p.close + 3);
      return c.pick([`دامپزشک گفت «${p.name} سالمه، فقط یه کم چاق شده!»`, `${p.name} واکسن‌هاش رو زد و کل راه برگشت قهر بود.`, `دامپزشک یه ویتامین داد. ${p.name} سرحال‌تر شد.`]);
    },
  },
  {
    id: 'pet_give', emoji: '👋',
    label: 'بسپارش به یه خانواده‌ی دیگه',
    when: () => true,
    do: (c, p) => {
      loseFor(c, p);
      return `${p.name} رو دادی به یه خانواده‌ی مهربون. دلت براش تنگ می‌شه.`;
    },
  },
]);

defEvents([
  {
    id: 'pt_kid_wants', age: [5, 12], w: 0.8, emoji: '🐱', title: 'یه بچه‌گربه!',
    when: (c) => !c.pets.length && c.parents.length > 0,
    text: 'دوستت یه بچه‌گربه داره و تو هم از صبح تا شب می‌گی «منم می‌خوام!»',
    choices: [
      {
        label: 'گریه و التماس به بابا و مامان',
        do: (c) => {
          if (!c.lucky(0.45)) { c.happy(-3); return 'مامانت گفت «یا جای من یا جای گربه!» قضیه تموم شد.'; }
          const p = c.addPet('cat');
          c.happy(10);
          return `بالاخره راضی شدن! اسمش رو گذاشتی «${p.name}».`;
        },
      },
      {
        label: 'قول می‌دم شاگرد اول بشم!',
        do: (c) => {
          if (!c.lucky(c.s('smarts') > 60 ? 0.7 : 0.4)) { c.happy(-2); return 'بابات گفت «اول شاگرد اول شو، بعد حرفش رو بزن.»'; }
          const p = c.addPet('cat');
          c.flag('petPromise');
          c.happy(10);
          return `معامله سر گرفت! «${p.name}» اومد خونه‌تون. حالا باید درس بخونی!`;
        },
      },
      { label: 'بی‌خیال، با اسباب‌بازی‌هام سرگرمم', do: () => 'به جاش با عروسک‌هات بازی کردی.' },
    ],
  },
  {
    id: 'pt_fish_nowruz', age: [4, 85], w: 0.5, once: false, cd: 6, emoji: '🐠', title: 'ماهی هفت‌سین',
    when: (c) => !c.pet('fish') && c.L.country === 'ir',
    text: 'سیزده‌به‌در گذشت و ماهی قرمز سفره‌ی هفت‌سین هنوز زنده‌ست و تو تنگش دور خودش می‌چرخه.',
    choices: [
      { label: 'نگهش می‌دارم!', do: (c) => { const p = c.addPet('fish'); c.happy(3); return `یه تنگ بزرگ‌تر براش خریدی و اسمش رو گذاشتی «${p.name}».`; } },
      { label: 'می‌برمش حوض پارک', do: (c) => { c.happy(1); return 'ماهی رو انداختی تو حوض پارک. حالا با کلی ماهی دیگه زندگی می‌کنه.'; } },
      { label: 'می‌ندازمش تو رودخونه', do: (c) => { c.rep(-1); return 'بعداً خوندی که ماهی قرمز تو رودخونه برای ماهی‌های بومی ضرر داره. 😬'; } },
    ],
  },
  {
    id: 'pt_cat_gift', age: [4, 100], once: false, cd: 6, emoji: '🐭', text: '',
    when: hasPet('cat', 'persian'), prep: withPet('cat', 'persian'),
    auto: (c) => { c.happy(1); return `🐭 ${thePet(c).name} یه موش مرده آورده گذاشته جلوی در اتاقت! یعنی خیلی دوستت داره.`; },
  },
  {
    id: 'pt_cat_sofa', age: [18, 100], once: false, cd: 8, emoji: '🛋️', title: 'مبل نو',
    when: hasPet('cat', 'persian'), prep: withPet('cat', 'persian'),
    text: (c) => `${thePet(c).name} با ناخن‌هاش مبل نو رو ریش‌ریش کرده!`,
    choices: [
      { label: 'دعواش می‌کنم', do: (c) => { const p = thePet(c); p.close = clamp(p.close - 10); return `${p.name} قهر کرد و تا شب زیر تخت موند.`; } },
      { label: 'براش اسکرچر می‌خرم', cost: (c) => c.price(2e6), note: (c) => money(c.price(2e6)), do: (c) => { const p = thePet(c); p.close = clamp(p.close + 5); return `${p.name} اسکرچر رو دوست داشت… ولی هنوز مبل رو بیشتر دوست داره!`; } },
      { label: 'مبل فدای سرش!', do: (c) => { c.happy(2); return 'مبل ریش‌ریش رو با یه پتو پوشوندی. مهمون‌ها فکر می‌کنن دکوره!'; } },
    ],
  },
  {
    id: 'pt_cat_kittens', age: [8, 100], emoji: '🐈', title: 'بچه‌گربه‌ها!',
    when: hasPet('cat'), prep: withPet('cat'),
    text: (c) => `${thePet(c).name} چهار تا بچه به دنیا آورد! کل خونه پر از میو میوئه.`,
    choices: [
      {
        label: 'یکی رو نگه می‌دارم، بقیه رو می‌دم به دوستام',
        do: (c) => {
          if (c.pets.length >= 4) { c.rep(2); return 'جا نداشتی، همه رو دادی به دوستات. همه ازت ممنون شدن.'; }
          const k = c.addPet('cat');
          c.happy(6).rep(2);
          return `«${k.name}» موند پیش شما و بقیه رو دادی به دوستات.`;
        },
      },
      { label: 'همه رو می‌برم پناهگاه حیوانات', do: (c) => { c.rep(1); return 'بچه‌گربه‌ها رو بردی پناهگاه. یه هفته جاشون خالی بود.'; } },
    ],
  },
  {
    id: 'pt_dog_bark', age: [18, 100], once: false, cd: 6, emoji: '🐕', title: 'همسایه شاکیه',
    when: (c) => hasPet('dog')(c) && c.L.home !== 'parents', prep: withPet('dog'),
    text: (c) => `همسایه‌ی طبقه‌ی پایین اومده دم در: «این ${thePet(c).name} شما شب تا صبح پارس می‌کنه!»`,
    choices: [
      { label: 'عذرخواهی می‌کنم و شیرینی می‌برم', cost: (c) => c.price(1e6), note: (c) => money(c.price(1e6)), do: (c) => { c.rep(2); return 'همسایه شیرینی رو گرفت و گفت «باشه، ولی دیگه تکرار نشه.»'; } },
      { label: 'می‌برمش کلاس تربیت سگ', cost: (c) => c.price(12e6), note: (c) => money(c.price(12e6)), do: (c) => { const p = thePet(c); p.close = clamp(p.close + 6); c.rep(1); return `${p.name} حالا «بشین» و «ساکت» رو بلده. البته فقط وقتی جایزه در کار باشه!`; } },
      { label: 'می‌گم سگ خودتونه که پارس می‌کنه!', do: (c) => { c.rep(-4); return 'همسایه رفت شکایت کرد به مدیر ساختمون. جلسه‌ی ساختمون شد دادگاه!'; } },
    ],
  },
  {
    id: 'pt_dog_park', age: [16, 90], where: 'ir', once: false, cd: 8, w: 0.6, emoji: '👮', title: 'تو پارک',
    when: hasPet('dog'), prep: withPet('dog'),
    text: (c) => `داشتی ${thePet(c).name} رو تو پارک می‌گردوندی که مأمور گفت «سگ‌گردانی تو پارک ممنوعه!»`,
    choices: [
      { label: 'عذرخواهی می‌کنم و می‌رم', do: (c) => { c.happy(-2); return 'برگشتی خونه و تو کوچه گردوندیش.'; } },
      {
        label: 'بحث می‌کنم',
        do: (c) => {
          if (c.lucky(0.4)) return 'مأمور خسته بود و گفت «برو، فقط زود!»';
          c.money(-c.price(3e6)).rep(-2);
          return `${money(c.price(3e6))} جریمه شدی!`;
        },
      },
    ],
  },
  {
    id: 'pt_dog_hero', age: [10, 100], emoji: '🦸', text: '', pop: true, title: 'سگ قهرمان',
    when: hasPet('dog'), prep: withPet('dog'),
    auto: (c) => { const p = thePet(c); p.close = clamp(p.close + 10); c.happy(5).rep(2); return `🦸 نصف شب ${p.name} انقدر پارس کرد که بیدار شدی… یه دزد داشت از دیوار می‌اومد بالا! دزد فرار کرد و ${p.name} قهرمان محله شد.`; },
  },
  {
    id: 'pt_parrot_swear', age: [12, 100], emoji: '🦜', title: 'آبروریزی!',
    when: hasPet('parrot'), prep: withPet('parrot'),
    text: (c) => `مهمون داشتین و جلوی همه، ${thePet(c).name} یه فحش آبدار داد! همه می‌دونن از کی یاد گرفته…`,
    choices: [
      { label: 'می‌گم از تلویزیون یاد گرفته!', do: (c) => { if (c.lucky(0.5)) return 'همه باور کردن… یا وانمود کردن که باور کردن.'; c.rep(-4); return `همون لحظه ${thePet(c).name} با صدای خودت تکرارش کرد! آبروت رفت.`; } },
      { label: 'می‌زنم زیر خنده', do: (c) => { c.happy(3).rep(-2); return 'همه خندیدن، به جز مادربزرگ!'; } },
    ],
  },
  {
    id: 'pt_parrot_phone', age: [8, 100], emoji: '📱', text: '',
    when: hasPet('parrot'), prep: withPet('parrot'),
    auto: (c) => { c.happy(2); return `📱 ${thePet(c).name} صدای زنگ گوشیت رو یاد گرفته. روزی ده بار می‌دوی سمت گوشی!`; },
  },
  {
    id: 'pt_parrot_old', age: [70, 110], emoji: '🦜', text: '',
    when: (c) => c.pets.some((p) => p.kind === 'parrot' && c.L.year - p.born >= 25), prep: withPet('parrot'),
    auto: (c) => `🦜 ${thePet(c).name} از ${fa(c.L.year - thePet(c).born)} سال پیش با توئه و هنوز صبح‌ها می‌گه «سلام!». وصیت کردی بعد از تو به نوه‌ات برسه.`,
  },
  {
    id: 'pt_sick', age: [6, 100], once: false, cd: 6, w: 0.7, emoji: '🤒', title: 'حیوون مریض',
    when: (c) => c.pets.some((p) => p.kind !== 'fish'), prep: (c) => { const l = c.pets.filter((p) => p.kind !== 'fish'); return l.length ? { pet: c.pick(l).id } : null; },
    text: (c) => `${thePet(c).name} چند روزه چیزی نمی‌خوره و همه‌اش یه گوشه خوابیده.`,
    choices: [
      {
        label: 'می‌برمش دامپزشکی',
        cost: (c) => c.price(petKind(thePet(c).kind).care * 0.5 + 6e6),
        note: (c) => money(c.price(petKind(thePet(c).kind).care * 0.5 + 6e6)),
        do: (c) => { const p = thePet(c); p.close = clamp(p.close + 8); return `دامپزشک گفت یه عفونت ساده بوده. ${p.name} بعد از یه هفته دوباره شیطون شد!`; },
      },
      {
        label: 'صبر می‌کنم، خودش خوب می‌شه',
        do: (c) => {
          const p = thePet(c);
          if (c.lucky(0.6)) return `خوشبختانه ${p.name} بعد از چند روز خوب شد.`;
          p.alive = false;
          p.died = c.L.year;
          c.happy(-12);
          return `${p.name} خوب نشد و از پیشت رفت. کاش زودتر برده بودیش دکتر…`;
        },
      },
    ],
  },
  {
    id: 'pt_lost', age: [6, 100], w: 0.6, emoji: '🔎', title: 'گم شده!',
    when: hasPet('cat', 'persian', 'dog', 'rabbit', 'parrot'), prep: withPet('cat', 'persian', 'dog', 'rabbit', 'parrot'),
    text: (c) => `${thePet(c).name} از صبح غیبش زده!`,
    choices: [
      {
        label: 'کل محله رو آگهی می‌زنم',
        cost: (c) => c.price(1e6),
        note: (c) => money(c.price(1e6)),
        do: (c) => {
          const p = thePet(c);
          if (c.lucky(0.75)) { p.close = clamp(p.close + 10); c.happy(6); return `یه بچه‌ی محل ${p.name} رو آورد دم در! بهش مژدگونی دادی.`; }
          loseFor(c, p);
          return `هر چی گشتی ${p.name} پیدا نشد. هنوز عکسش رو دیوارهای محله‌ست.`;
        },
      },
      {
        label: 'منتظر می‌مونم برگرده',
        do: (c) => {
          const p = thePet(c);
          if (c.lucky(p.kind === 'cat' || p.kind === 'persian' ? 0.6 : 0.35)) { c.happy(4); return `سه روز بعد ${p.name} خودش برگشت، کثیف و گرسنه ولی سالم!`; }
          loseFor(c, p);
          return `${p.name} دیگه برنگشت.`;
        },
      },
    ],
  },
  {
    id: 'pt_rabbit_cable', age: [6, 100], once: false, cd: 5, emoji: '🔌', text: '',
    when: hasPet('rabbit'), prep: withPet('rabbit'),
    auto: (c) => { c.money(-c.price(1e6)); return `🔌 ${thePet(c).name} سیم ${c.age < 13 ? 'شارژر گوشی بابات' : 'شارژر گوشیت'} رو جویده! باز هم!`; },
  },
  {
    id: 'pt_canary_song', age: [6, 100], once: false, cd: 4, emoji: '🐤', text: '',
    when: hasPet('canary'), prep: withPet('canary'),
    auto: (c) => { c.happy(3); return `🐤 صبح‌ها با آواز ${thePet(c).name} بیدار می‌شی. روزت خوب شروع می‌شه.`; },
  },
  {
    id: 'pt_turtle_sleep', age: [6, 100], emoji: '🐢', text: '',
    when: hasPet('turtle'), prep: withPet('turtle'),
    auto: (c) => `🐢 ${thePet(c).name} سه ماهه تکون نخورده! کلی نگران شدی ولی دامپزشک گفت «خواب زمستونیه!»`,
  },
  {
    id: 'pt_allergy', age: [20, 90], emoji: '🤧', title: 'حساسیت',
    when: (c) => !!c.spouse && hasPet('cat', 'persian', 'rabbit')(c), prep: withPet('cat', 'persian', 'rabbit'),
    text: (c) => `${c.relName(c.spouse!)} به ${thePet(c).name} حساسیت داره و کل روز عطسه می‌کنه!`,
    choices: [
      { label: (c) => `${thePet(c).name} رو می‌سپارم به مامانم`, do: (c) => { loseFor(c, thePet(c)); c.close(c.spouse!, 6); return `${thePet(c).name} رفت خونه‌ی مامانت. هر هفته می‌ری بهش سر می‌زنی.`; } },
      { label: 'براش قرص آنتی‌هیستامین می‌خرم!', do: (c) => { c.close(c.spouse!, -8); return 'همسرت گفت «یعنی گربه‌ات از من مهم‌تره؟!» جواب ندادی.'; } },
    ],
  },
  {
    id: 'pt_comfort', age: [8, 100], once: false, cd: 5, emoji: '🫂', text: '',
    when: (c) => c.pets.some((p) => p.kind !== 'fish' && p.close >= 50) && c.s('happy') <= 35,
    prep: (c) => { const l = c.pets.filter((p) => p.kind !== 'fish' && p.close >= 50); return l.length ? { pet: c.pick(l).id } : null; },
    auto: (c) => { c.happy(6); return `🫂 روزهای سختی بود، ولی ${thePet(c).name} همیشه کنارت بود.`; },
  },
]);
