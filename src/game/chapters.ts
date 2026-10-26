/** The Journey's chapters: each is a Tehran place with its own light and bus stop. */
export type Light = 'day' | 'sunset' | 'night' | 'snow' | 'bazaar' | 'autumn';
export interface Chapter { n: number; name: string; stop: string; light: Light; landmark: 'milad' | 'azadi' | 'both' | 'tochal' | 'bazaar' | 'darband'; from: number; to: number; }

export const CHAPTERS: Chapter[] = [
  { n: 1, name: 'تجریش', stop: 'ایستگاه تجریش', light: 'day', landmark: 'both', from: 0, to: 30 },
  { n: 2, name: 'خیابان ولیعصر', stop: 'ایستگاه ونک', light: 'sunset', landmark: 'milad', from: 30, to: 60 },
  { n: 3, name: 'میدان آزادی', stop: 'ایستگاه آزادی', light: 'night', landmark: 'azadi', from: 60, to: 90 },
  { n: 4, name: 'برف توچال', stop: 'ایستگاه تله‌کابین', light: 'snow', landmark: 'tochal', from: 90, to: 120 },
  { n: 5, name: 'بازار بزرگ', stop: 'ایستگاه پانزده خرداد', light: 'bazaar', landmark: 'bazaar', from: 120, to: 150 },
  { n: 6, name: 'پاییز دربند', stop: 'ایستگاه سربند', light: 'autumn', landmark: 'darband', from: 150, to: 180 },
];

export const chapterOf = (level: number) => CHAPTERS.find((c) => level >= c.from && level < c.to) ?? CHAPTERS[CHAPTERS.length - 1];
