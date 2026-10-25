/** Cars and houses for sale. Prices are in 1405 toman and follow the car / housing indices. */

export interface CarDef {
  id: string;
  name: string;
  emoji: string;
  /** Price new in 1405 toman. */
  price: number;
  /** Status boost (looks/rep/happiness on purchase). */
  flex: number;
  /** Chance per year of a breakdown. */
  breaks: number;
}

export const CARS: CarDef[] = [
  { id: 'pride', name: 'پراید ۱۳۱ دست دوم', emoji: '🚗', price: 520e6, flex: 0, breaks: 0.35 },
  { id: 'peykan', name: 'پیکان وانت', emoji: '🛻', price: 450e6, flex: 0, breaks: 0.3 },
  { id: 'tiba', name: 'تیبا', emoji: '🚗', price: 900e6, flex: 1, breaks: 0.25 },
  { id: 'saina', name: 'ساینا', emoji: '🚙', price: 1.5e9, flex: 1, breaks: 0.22 },
  { id: '206', name: 'پژو ۲۰۶', emoji: '🚗', price: 1.9e9, flex: 2, breaks: 0.18 },
  { id: 'dena', name: 'دنا پلاس', emoji: '🚘', price: 2.4e9, flex: 3, breaks: 0.15 },
  { id: 'tara', name: 'تارا', emoji: '🚘', price: 2.2e9, flex: 3, breaks: 0.14 },
  { id: 'chinese', name: 'شاسی‌بلند چینی', emoji: '🚙', price: 4.5e9, flex: 5, breaks: 0.12 },
  { id: 'camry', name: 'تویوتا کمری', emoji: '🚘', price: 12e9, flex: 8, breaks: 0.05 },
  { id: 'benz', name: 'بنز کلاس E', emoji: '🏎️', price: 30e9, flex: 12, breaks: 0.06 },
  { id: 'porsche', name: 'پورشه کاین', emoji: '🏎️', price: 75e9, flex: 18, breaks: 0.05 },
];

export interface HouseDef {
  id: string;
  name: string;
  emoji: string;
  /** Area in m². */
  area: number;
  /** Price multiplier on top of the city/neighbourhood average (new building, villa…). */
  mul: number;
  flex: number;
}

export const HOUSES: HouseDef[] = [
  { id: 'studio', name: 'سوئیت ۳۵ متری', emoji: '🏠', area: 35, mul: 0.95, flex: 0 },
  { id: 'apt60', name: 'آپارتمان ۶۰ متری قدیمی', emoji: '🏢', area: 60, mul: 0.85, flex: 1 },
  { id: 'apt85', name: 'آپارتمان ۸۵ متری', emoji: '🏢', area: 85, mul: 1, flex: 2 },
  { id: 'apt120', name: 'آپارتمان ۱۲۰ متری نوساز', emoji: '🏬', area: 120, mul: 1.2, flex: 4 },
  { id: 'villa', name: 'خونه‌ی ویلایی حیاط‌دار', emoji: '🏡', area: 250, mul: 1.1, flex: 6 },
  { id: 'penthouse', name: 'پنت‌هاوس با استخر', emoji: '🏰', area: 300, mul: 2.2, flex: 12 },
  { id: 'north', name: 'ویلای شمال', emoji: '🏖️', area: 200, mul: 0.35, flex: 5 },
];

export interface ShopDef {
  id: string;
  name: string;
  emoji: string;
  /** Startup capital in 1405 toman. */
  cost: number;
  /** Mean yearly return on capital and its spread. */
  ret: number;
  risk: number;
}

export const SHOPS: ShopDef[] = [
  { id: 'cafe', name: 'کافه', emoji: '☕', cost: 1.5e9, ret: 0.45, risk: 0.5 },
  { id: 'market', name: 'سوپرمارکت', emoji: '🏪', cost: 3e9, ret: 0.4, risk: 0.25 },
  { id: 'bakery', name: 'نانوایی', emoji: '🥖', cost: 2e9, ret: 0.42, risk: 0.2 },
  { id: 'boutique', name: 'بوتیک لباس', emoji: '👚', cost: 2.5e9, ret: 0.45, risk: 0.45 },
  { id: 'restaurant', name: 'رستوران سنتی', emoji: '🍢', cost: 6e9, ret: 0.5, risk: 0.45 },
  { id: 'startup', name: 'استارتاپ اینترنتی', emoji: '🚀', cost: 4e9, ret: 0.6, risk: 0.95 },
  { id: 'gold', name: 'طلافروشی', emoji: '💍', cost: 25e9, ret: 0.4, risk: 0.2 },
];
