/** Pets you can keep. Prices and yearly care are in 1405 toman. */
export interface PetKind {
  id: string;
  name: string;
  emoji: string;
  /** Lifespan range in years. */
  life: [number, number];
  /** Buying price (0: adopted from the street). */
  cost: number;
  /** Food and vet per year. */
  care: number;
  names: string[];
}

export const PET_KINDS: PetKind[] = [
  { id: 'cat', name: 'گربه', emoji: '🐈', life: [12, 18], cost: 0, care: 12e6, names: ['پیشی', 'ملوس', 'نخودی', 'گربه‌خان', 'پشمک', 'فندق', 'زیتون', 'لوسی'] },
  { id: 'persian', name: 'گربه‌ی پرشین', emoji: '🐱', life: [12, 17], cost: 30e6, care: 30e6, names: ['شاه‌پسند', 'پرنسس', 'سلطان', 'مخمل', 'ابری'] },
  { id: 'dog', name: 'سگ', emoji: '🐕', life: [10, 15], cost: 20e6, care: 35e6, names: ['پاپی', 'جکی', 'رکس', 'هاپو', 'مشکی', 'گرگی'] },
  { id: 'parrot', name: 'طوطی', emoji: '🦜', life: [20, 50], cost: 45e6, care: 6e6, names: ['کاکو', 'حسن‌آقا', 'پرپری', 'مرجان', 'سبزی'] },
  { id: 'canary', name: 'قناری', emoji: '🐤', life: [6, 10], cost: 3e6, care: 2e6, names: ['جیک‌جیک', 'زردو', 'بلبل', 'طلایی'] },
  { id: 'fish', name: 'ماهی قرمز', emoji: '🐠', life: [1, 8], cost: 300e3, care: 300e3, names: ['نارنجی', 'قرمزی', 'نمو', 'حوضی'] },
  { id: 'turtle', name: 'لاک‌پشت', emoji: '🐢', life: [25, 60], cost: 2e6, care: 1e6, names: ['آقای لاکی', 'سرعت', 'کندو', 'پیرمرد'] },
  { id: 'rabbit', name: 'خرگوش', emoji: '🐇', life: [6, 10], cost: 5e6, care: 8e6, names: ['خرگوشی', 'گوش‌دراز', 'هویج', 'برفی'] },
];

export function petKind(id: string): PetKind {
  return PET_KINDS.find((k) => k.id === id) ?? PET_KINDS[0];
}
