/** Days of the Iranian year: Ramadan and Muharram customs, Mother's and Father's Day, the first of Mehr… */
import { award } from '../../engine/achieve';
import type { Ctx } from '../../engine/ctx';
import { money } from '../../engine/fmt';
import { defEvents } from '../../engine/registry';

const parentGift = (c: Ctx) => c.price(c.age < 18 ? 1e6 : 6e6);

defEvents([
  {
    // Played as a mini-game in the app (src/ui/fire.ts).
    id: 'fire_jump',
    milestone: true,
    emoji: '🔥',
    title: 'پریدن از روی آتیش',
    text: 'تو کوچه سه تا آتیش روشن کردن…',
    choices: [
      { label: 'عالی بود!', when: (c) => !!c.p.played && !c.p.burnt, do: (c) => { c.happy(8).rep(1); award(c, 'firejumper'); return '«زردی من از تو، سرخی تو از من!» از روی هر سه تا آتیش پریدی. سال نو با انرژی شروع می‌شه!'; } },
      { label: 'آخ!', when: (c) => !!c.p.burnt, do: (c) => { c.health(-4).happy(-2); return 'پاچه‌ی شلوارت آتیش گرفت و با یه سطل آب خاموشت کردن! سال دیگه احتیاط کن.'; } },
      {
        label: 'می‌پرم!',
        when: (c) => !c.p.played,
        do: (c) => {
          if (c.lucky(0.8)) { c.happy(6); return '«زردی من از تو، سرخی تو از من!» از روی آتیش‌ها پریدی. عالی بود.'; }
          c.health(-4).happy(-2);
          return 'پاچه‌ی شلوارت آتیش گرفت و با یه سطل آب خاموشت کردن!';
        },
      },
    ],
  },
  {
    id: 'cal_chaharshanbe', emoji: '🔥', title: 'چهارشنبه‌سوری', age: [18, 75], once: false, cd: 3, w: 0.8,
    text: 'چهارشنبه‌سوریه! همسایه‌ها تو کوچه آتیش روشن کردن و صدای ترقه از همه‌جا میاد.',
    choices: [
      { label: 'از روی آتیش می‌پرم!', do: (c) => { c.next('fire_jump'); return ''; } },
      { label: 'آش و آجیل چهارشنبه‌سوری می‌خورم', do: (c) => { c.happy(3); return 'با همسایه‌ها دور آتیش آش رشته خوردین و آجیل مشکل‌گشا پخش کردین.'; } },
      { label: 'از پشت پنجره نگاه می‌کنم', do: (c) => { c.happy(1); return 'از پشت پنجره به ترقه‌ها نگاه کردی و هر بار از صداشون پریدی!'; } },
    ],
  },
  {
    id: 'cal_iftar', emoji: '🌙', title: 'افطاری', age: [8, 95], once: false, cd: 4, w: 0.6,
    text: 'ماه رمضونه و خاله‌ات همه‌ی فامیل رو برای افطاری دعوت کرده. سفره پر از شله‌زرد و زولبیا بامیه و آش رشته‌ست!',
    choices: [
      { label: 'می‌رم، دلم برای همه تنگ شده', do: (c) => { c.happy(5).rep(2); for (const p of c.parents) c.close(p, 3); return 'دور سفره همه از قدیم‌ها گفتن و خندیدن. آخر شب یه ظرف آش هم برات گذاشتن کنار!'; } },
      { label: 'کار دارم، نمی‌رسم', do: (c) => { c.rep(-1); return 'خاله‌ات زنگ زد: «جات خیلی خالی بود!» و یه عکس از سفره فرستاد.'; } },
    ],
  },
  {
    id: 'cal_sahari', emoji: '🌙', age: [10, 30], once: false, cd: 5, w: 0.4, text: '',
    when: (c) => c.parents.length > 0,
    auto: (c) => { c.happy(2); return '🌙 سحر با صدای مامانت بیدار شدی و همه دور سفره نون و پنیر و خرما خوردین. صبح سر کلاس چرت زدی!'; },
  },
  {
    id: 'cal_nazri', emoji: '🍲', age: [5, 100], once: false, cd: 4, w: 0.6, text: '',
    auto: (c) => { c.happy(2); return `🍲 تو ماه محرم همسایه‌ها نذری ${c.pick(['قیمه', 'شله‌زرد', 'حلیم', 'شیر برنج'])} پختن و یه کاسه هم در خونه‌ی شما آوردن!`; },
  },
  {
    id: 'cal_mothers_day', emoji: '💐', title: 'روز مادر', age: [6, 80], once: false, cd: 4, w: 0.7,
    when: (c) => !!c.rel('mother'),
    text: 'فردا روز مادره! برای مامانت چی‌کار می‌کنی؟',
    choices: [
      { label: 'یه هدیه‌ی خوب می‌خرم', cost: parentGift, note: (c) => money(parentGift(c)), do: (c) => { c.close(c.rel('mother')!, 12); c.happy(3); return `${c.pick(['یه روسری قشنگ', 'یه عطر', 'یه گلدون شمعدونی', 'یه دستبند'])} خریدی. مامانت گفت «چرا خرج کردی؟» ولی تا یه هفته به همه نشونش داد!`; } },
      { label: (c) => (c.age < 14 ? 'خودم یه کارت درست می‌کنم' : 'یه دسته گل و یه بوس'), do: (c) => { c.close(c.rel('mother')!, 9); c.happy(2); return 'مامانت اشک تو چشماش جمع شد و گفت «بهترین هدیه‌ی دنیا!»'; } },
      { label: 'یادم رفت!', do: (c) => { c.close(c.rel('mother')!, -10); return 'مامانت گفت «اشکال نداره… من که مادر نیستم!» یه هفته عذاب وجدان داشتی.'; } },
    ],
  },
  {
    id: 'cal_fathers_day', emoji: '👔', title: 'روز پدر', age: [6, 80], once: false, cd: 4, w: 0.7,
    when: (c) => !!c.rel('father'),
    text: 'فردا روز پدره! برای بابات چی می‌گیری؟',
    choices: [
      { label: 'یه جفت جوراب، طبق سنت!', do: (c) => { c.close(c.rel('father')!, 4); c.happy(2); return 'بابات گفت «به‌به، جوراب!» این بیستمین جفت جورابیه که امسال گرفته.'; } },
      { label: 'یه هدیه‌ی حسابی', cost: parentGift, note: (c) => money(parentGift(c)), do: (c) => { c.close(c.rel('father')!, 12); return `${c.pick(['یه پیرهن چهارخونه', 'یه ساعت مچی', 'یه کیف چرمی', 'یه کمربند'])} خریدی. بابات چیزی نگفت ولی فرداش با همون اومد بیرون!`; } },
      { label: 'بغلش می‌کنم', do: (c) => { c.close(c.rel('father')!, 8); return 'بابات اولش جا خورد، بعد محکم بغلت کرد. «باشه بابا، باشه!»'; } },
    ],
  },
  {
    id: 'cal_teachers_day', emoji: '🧑‍🏫', title: 'روز معلم', age: [7, 17], once: false, cd: 3, w: 0.6,
    when: (c) => c.L.edu.stage === 'school',
    text: 'فردا روز معلمه و همه‌ی بچه‌ها برای معلم هدیه می‌برن.',
    choices: [
      { label: 'یه شاخه گل می‌برم', do: (c) => { c.rep(2); c.L.edu.effort += 0.3; return 'معلمت گل رو گذاشت تو لیوان رو میزش و کل روز بهت لبخند زد.'; } },
      { label: 'مامانم یه کادوی گرون خریده!', do: (c) => { c.rep(1); return 'معلم گفت «وای، راضی به زحمت نبودم!» بقیه‌ی بچه‌ها حسودیشون شد.'; } },
      { label: 'یه نامه‌ی تشکر می‌نویسم', do: (c) => { c.rep(2).happy(2); c.L.edu.effort += 0.5; return 'معلمت نامه‌ات رو سر کلاس خوند و گفت «این بهترین هدیه‌ی امسال بود».'; } },
    ],
  },
  {
    id: 'cal_mehr', emoji: '🎒', age: [7, 17], once: false, cd: 3, w: 0.5, text: '',
    when: (c) => c.L.edu.stage === 'school',
    auto: (c) => { c.happy(c.chance(0.5) ? 2 : -2); return `🎒 اول مهر شد! بوی کتاب نو و ${c.pick(['مداد تراش‌نخورده', 'جلد پلاستیکی کتاب‌ها', 'کفش نو'])}… «باز آمد بوی ماه مدرسه»!`; },
  },
  {
    id: 'cal_sepandarmazgan', emoji: '❤️', title: 'سپندارمذگان', age: [18, 90], once: false, cd: 4, w: 0.5,
    when: (c) => !!(c.spouse ?? c.rel('fiance')),
    text: (c) => `امروز سپندارمذگانه، روز عشق ایرانی! برای ${(c.spouse ?? c.rel('fiance'))!.first} چی‌کار می‌کنی؟`,
    choices: [
      { label: 'شام بیرون، دوتایی', cost: (c) => c.price(5e6), note: (c) => money(c.price(5e6)), do: (c) => { c.close((c.spouse ?? c.rel('fiance'))!, 12); c.happy(5); return 'رفتین یه رستوران سنتی و تا آخر شب حرف زدین. مثل روزهای اول!'; } },
      { label: 'یه شاخه گل و یه شعر از حافظ', do: (c) => { c.close((c.spouse ?? c.rel('fiance'))!, 8); c.happy(3); return `«اگر آن ترک شیرازی به دست آرد دل ما را…» خوندی و ${(c.spouse ?? c.rel('fiance'))!.first} خندید و گفت «حافظ هم بلد بودی؟!»`; } },
      { label: 'مگه همچین روزی هم داریم؟', do: (c) => { c.close((c.spouse ?? c.rel('fiance'))!, -6); return 'گفتی «ما ایرونی‌ها روز عشق داریم؟!» و یه نگاه سرد گرفتی.'; } },
    ],
  },
]);
