export interface City {
  id: string;
  name: string;
  /** Housing price per m² relative to Tehran's average. */
  mul: number;
  /** Population weight for random births. */
  w: number;
  emoji: string;
  /** Something the city is famous for (used in texts). */
  famous: string;
  /** Typical souvenir. */
  sogat: string;
  /** Neighbourhoods: [name, price multiplier relative to the city]. */
  hoods: [string, number][];
}

export const CITIES: City[] = [
  { id: 'tehran', name: 'تهران', mul: 1, w: 18, emoji: '🗼', famous: 'برج میلاد و ترافیک', sogat: 'هیچی، فقط خستگی', hoods: [['پرند', 0.18], ['نازی‌آباد', 0.45], ['نارمک', 0.7], ['ستارخان', 0.85], ['پونک', 0.95], ['یوسف‌آباد', 1.35], ['سعادت‌آباد', 1.6], ['زعفرانیه', 2.8]] },
  { id: 'mashhad', name: 'مشهد', mul: 0.38, w: 8, emoji: '🕌', famous: 'زعفران و نبات', sogat: 'زعفران و نبات', hoods: [['طلاب', 0.6], ['قاسم‌آباد', 1.1], ['وکیل‌آباد', 1.4]] },
  { id: 'isfahan', name: 'اصفهان', mul: 0.42, w: 6, emoji: '🌉', famous: 'سی‌وسه‌پل و گز', sogat: 'گز', hoods: [['زینبیه', 0.6], ['جلفا', 1.2], ['مرداویج', 1.4]] },
  { id: 'shiraz', name: 'شیراز', mul: 0.36, w: 5, emoji: '🌹', famous: 'حافظیه و نارنج', sogat: 'کلوچه و عرق بهارنارنج', hoods: [['شهرک گلستان', 0.8], ['معالی‌آباد', 1.3], ['قصردشت', 1.1]] },
  { id: 'tabriz', name: 'تبریز', mul: 0.3, w: 5, emoji: '🏛️', famous: 'بازار تاریخی و قوری‌قوری', sogat: 'باقلوا و قرابیه', hoods: [['ولیعصر', 1.3], ['باغمیشه', 1.1], ['مارالان', 0.8]] },
  { id: 'karaj', name: 'کرج', mul: 0.33, w: 6, emoji: '🛣️', famous: 'اتوبان و رفت‌وآمد به تهران', sogat: 'خستگی اتوبان', hoods: [['مهرشهر', 1.2], ['گوهردشت', 1], ['فردیس', 0.7]] },
  { id: 'ahvaz', name: 'اهواز', mul: 0.22, w: 4, emoji: '🌴', famous: 'کارون و گرمای ۵۰ درجه', sogat: 'خرما', hoods: [['کیانپارس', 1.4], ['زیتون', 1.1], ['کوی علوی', 0.6]] },
  { id: 'qom', name: 'قم', mul: 0.3, w: 3, emoji: '🍯', famous: 'سوهان', sogat: 'سوهان', hoods: [['پردیسان', 1.1], ['صفاشهر', 0.9]] },
  { id: 'kermanshah', name: 'کرمانشاه', mul: 0.2, w: 3, emoji: '🏔️', famous: 'طاق‌بستان و نان برنجی', sogat: 'نان برنجی', hoods: [['الهیه', 1.3], ['کسری', 0.8]] },
  { id: 'urmia', name: 'ارومیه', mul: 0.22, w: 3, emoji: '🍎', famous: 'دریاچه و سیب', sogat: 'سیب و کشمش', hoods: [['شهرک ارکیده', 1.1], ['خیام', 0.9]] },
  { id: 'rasht', name: 'رشت', mul: 0.3, w: 3, emoji: '🌧️', famous: 'بارون و میرزاقاسمی', sogat: 'کلوچه و ماهی دودی', hoods: [['گلسار', 1.5], ['منظریه', 0.9]] },
  { id: 'zahedan', name: 'زاهدان', mul: 0.13, w: 2, emoji: '🏜️', famous: 'آفتاب و مهمون‌نوازی', sogat: 'خرما', hoods: [['زیباشهر', 1.1], ['شیرآباد', 0.6]] },
  { id: 'kerman', name: 'کرمان', mul: 0.2, w: 2, emoji: '🥜', famous: 'پسته و کلمپه', sogat: 'کلمپه', hoods: [['شهرک مطهری', 1.1], ['جوپاری', 0.9]] },
  { id: 'yazd', name: 'یزد', mul: 0.24, w: 2, emoji: '🏺', famous: 'بادگیر و قطاب', sogat: 'باقلوا و قطاب', hoods: [['صفائیه', 1.3], ['بافت قدیم', 0.9]] },
  { id: 'hamedan', name: 'همدان', mul: 0.22, w: 2, emoji: '🗿', famous: 'گنجنامه و علی‌صدر', sogat: 'کشمش و کلوچه', hoods: [['خضر', 1.1], ['مدنی', 0.9]] },
  { id: 'arak', name: 'اراک', mul: 0.2, w: 2, emoji: '🏭', famous: 'صنعت و قالی', sogat: 'نان اراکی', hoods: [['شهرک قدس', 1], ['ملک', 1.1]] },
  { id: 'ardabil', name: 'اردبیل', mul: 0.17, w: 2, emoji: '♨️', famous: 'سرعین و عسل', sogat: 'عسل و حلوای سیاه', hoods: [['کارشناسان', 1.1], ['شهرک وحدت', 0.9]] },
  { id: 'qazvin', name: 'قزوین', mul: 0.24, w: 2, emoji: '🍮', famous: 'باقلوا و تاریخ', sogat: 'نان نازک', hoods: [['مینودر', 1.1], ['خیابان پیغمبریه', 0.9]] },
  { id: 'zanjan', name: 'زنجان', mul: 0.18, w: 2, emoji: '🔪', famous: 'چاقو و چارُق', sogat: 'چاقو', hoods: [['کارمندان', 1.1], ['اسلام‌آباد', 0.9]] },
  { id: 'sanandaj', name: 'سنندج', mul: 0.16, w: 2, emoji: '🧶', famous: 'کلاش و آبیدر', sogat: 'گیوه', hoods: [['شهرک بهاران', 1], ['آبیدر', 1.1]] },
  { id: 'khorramabad', name: 'خرم‌آباد', mul: 0.15, w: 1.5, emoji: '🏰', famous: 'فلک‌الافلاک', sogat: 'کلوچه', hoods: [['کیو', 1.1], ['ماسور', 0.9]] },
  { id: 'gorgan', name: 'گرگان', mul: 0.2, w: 1.5, emoji: '🌳', famous: 'جنگل ناهارخوران', sogat: 'عسل جنگلی', hoods: [['ناهارخوران', 1.3], ['گلشهر', 0.9]] },
  { id: 'sari', name: 'ساری', mul: 0.25, w: 1.5, emoji: '🍊', famous: 'مرکبات و شالیزار', sogat: 'پرتقال', hoods: [['طبرستان', 1.1], ['فرهنگ', 1]] },
  { id: 'bandarabbas', name: 'بندرعباس', mul: 0.2, w: 1.5, emoji: '⚓', famous: 'دریا و رطوبت', sogat: 'میگو و مسقطی', hoods: [['گلشهر', 1.2], ['شهرک توحید', 0.9]] },
  { id: 'bushehr', name: 'بوشهر', mul: 0.2, w: 1, emoji: '🐟', famous: 'خلیج فارس و نی‌انبون', sogat: 'ماهی', hoods: [['ریشهر', 1.1], ['بهمنی', 0.9]] },
  { id: 'birjand', name: 'بیرجند', mul: 0.13, w: 1, emoji: '🌾', famous: 'زرشک و عناب', sogat: 'زرشک', hoods: [['مدرس', 1], ['غفاری', 1]] },
  { id: 'semnan', name: 'سمنان', mul: 0.17, w: 1, emoji: '🍲', famous: 'دیزی سنگی', sogat: 'حلوا', hoods: [['گلستان', 1], ['مطهری', 1]] },
  { id: 'kish', name: 'کیش', mul: 0.6, w: 0.5, emoji: '🏝️', famous: 'جزیره و بازارهاش', sogat: 'عطر و ادکلن', hoods: [['مرکز جزیره', 1], ['ساحل', 1.4]] },
  { id: 'yasuj', name: 'یاسوج', mul: 0.12, w: 1, emoji: '🌲', famous: 'آبشار و بلوط', sogat: 'عسل', hoods: [['شهرک ارم', 1], ['مرکز', 1]] },
  { id: 'shahrekord', name: 'شهرکرد', mul: 0.14, w: 1, emoji: '❄️', famous: 'سرما و بختیاری', sogat: 'گز', hoods: [['کوی مهدیه', 1], ['مرکز', 1]] },
  { id: 'ilam', name: 'ایلام', mul: 0.12, w: 1, emoji: '⛰️', famous: 'کوه‌های زاگرس', sogat: 'کلانه', hoods: [['بانبرز', 1], ['مرکز', 1]] },
];

export function cityById(id: string): City {
  return CITIES.find((c) => c.id === id) ?? CITIES[0];
}

export interface Country {
  id: string;
  name: string;
  flag: string;
  /** Typical monthly salary in USD for a mid job. */
  usd: number;
  /** Yearly cost of living in USD for one person. */
  cost: number;
  /** Visa difficulty 0..1 (higher is harder). */
  hard: number;
  lang: string;
}

export const COUNTRIES: Country[] = [
  { id: 'tr', name: 'ترکیه', flag: '🇹🇷', usd: 1100, cost: 11000, hard: 0.15, lang: 'ترکی' },
  { id: 'ae', name: 'امارات', flag: '🇦🇪', usd: 2800, cost: 26000, hard: 0.35, lang: 'انگلیسی' },
  { id: 'de', name: 'آلمان', flag: '🇩🇪', usd: 3800, cost: 24000, hard: 0.55, lang: 'آلمانی' },
  { id: 'it', name: 'ایتالیا', flag: '🇮🇹', usd: 2600, cost: 20000, hard: 0.45, lang: 'ایتالیایی' },
  { id: 'ca', name: 'کانادا', flag: '🇨🇦', usd: 4000, cost: 30000, hard: 0.6, lang: 'انگلیسی' },
  { id: 'au', name: 'استرالیا', flag: '🇦🇺', usd: 4300, cost: 32000, hard: 0.65, lang: 'انگلیسی' },
  { id: 'us', name: 'آمریکا', flag: '🇺🇸', usd: 5200, cost: 38000, hard: 0.9, lang: 'انگلیسی' },
];

export function countryById(id: string): Country | undefined {
  return COUNTRIES.find((c) => c.id === id);
}
