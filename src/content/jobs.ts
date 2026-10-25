import type { DegreeKind, Gender } from '../engine/types';

export interface JobDef {
  id: string;
  title: string;
  emoji: string;
  /** Minimum degree. */
  degree?: DegreeKind;
  /** Any of these majors (by id). */
  majors?: string[];
  smarts?: number;
  looks?: number;
  health?: number;
  minAge?: number;
  maxAge?: number;
  gender?: Gender;
  /** Men need a military service card. */
  mil?: boolean;
  /** A flag the player must have (a course, a licence…). */
  flag?: string;
  /** Monthly pay as a multiple of the minimum wage, at level 0. */
  pay: number;
  /** Pay multiplier per promotion. */
  growth: number;
  levels: string[];
  stress: number;
  /** Hiring difficulty 0..1. */
  hard: number;
  part?: boolean;
  gov?: boolean;
  /** Needs the «شغل‌های ویژه» pack. */
  vip?: boolean;
  /** Needs a car. */
  car?: boolean;
  /** Abroad salary tier: 0 low, 1 mid, 2 high. */
  tier: 0 | 1 | 2;
}

export const JOBS: JobDef[] = [
  // ── part-time for students ──
  { id: 'tutor', title: 'معلم خصوصی', emoji: '📝', smarts: 60, minAge: 16, pay: 0.5, growth: 1.2, levels: ['معلم خصوصی', 'معلم خصوصی معروف'], stress: 0.2, hard: 0.2, part: true, tier: 0 },
  { id: 'barista', title: 'باریستا (پاره‌وقت)', emoji: '☕', minAge: 16, pay: 0.45, growth: 1.1, levels: ['باریستا', 'سرباریستا'], stress: 0.3, hard: 0.3, part: true, tier: 0 },
  { id: 'typist', title: 'تایپیست (پاره‌وقت)', emoji: '⌨️', minAge: 15, pay: 0.3, growth: 1.1, levels: ['تایپیست'], stress: 0.1, hard: 0.1, part: true, tier: 0 },
  { id: 'gamenet', title: 'متصدی گیم‌نت', emoji: '🎮', minAge: 15, pay: 0.35, growth: 1.1, levels: ['متصدی گیم‌نت'], stress: 0.1, hard: 0.2, part: true, tier: 0 },
  // ── no degree ──
  { id: 'worker', title: 'کارگر ساختمانی', emoji: '👷', minAge: 16, health: 40, pay: 1.15, growth: 1.15, levels: ['کارگر ساده', 'استادکار', 'سرکارگر'], stress: 0.5, hard: 0.05, tier: 0 },
  { id: 'factory', title: 'کارگر کارخانه', emoji: '🏭', minAge: 18, pay: 1.1, growth: 1.12, levels: ['کارگر خط تولید', 'سرشیفت', 'سرپرست تولید'], stress: 0.5, hard: 0.15, tier: 0 },
  { id: 'courier', title: 'پیک موتوری', emoji: '🛵', minAge: 18, pay: 1.3, growth: 1.05, levels: ['پیک موتوری'], stress: 0.6, hard: 0.05, tier: 0 },
  { id: 'cab', title: 'راننده تاکسی اینترنتی', emoji: '🚕', minAge: 18, car: true, pay: 1.6, growth: 1.05, levels: ['راننده', 'راننده‌ی پنج‌ستاره'], stress: 0.5, hard: 0.05, tier: 0 },
  { id: 'seller', title: 'فروشنده‌ی مغازه', emoji: '🛍️', minAge: 16, pay: 1.0, growth: 1.12, levels: ['فروشنده', 'فروشنده‌ی ارشد', 'مدیر فروشگاه'], stress: 0.3, hard: 0.1, tier: 0 },
  { id: 'baker', title: 'شاگرد نانوایی', emoji: '🥖', minAge: 15, pay: 1.0, growth: 1.25, levels: ['شاگرد نانوا', 'شاطر', 'استاد شاطر'], stress: 0.4, hard: 0.1, tier: 0 },
  { id: 'guard', title: 'نگهبان', emoji: '💂', minAge: 22, mil: true, pay: 1.05, growth: 1.05, levels: ['نگهبان', 'سرنگهبان'], stress: 0.2, hard: 0.1, tier: 0 },
  { id: 'cook', title: 'آشپز رستوران', emoji: '👨‍🍳', minAge: 18, pay: 1.4, growth: 1.2, levels: ['کمک‌آشپز', 'آشپز', 'سرآشپز'], stress: 0.6, hard: 0.2, tier: 0 },
  { id: 'peddler', title: 'دستفروش مترو', emoji: '🚇', minAge: 16, pay: 0.8, growth: 1.05, levels: ['دستفروش'], stress: 0.5, hard: 0.0, tier: 0 },
  { id: 'farmer', title: 'کشاورز', emoji: '🌾', minAge: 16, health: 40, pay: 1.0, growth: 1.15, levels: ['کشاورز', 'باغدار'], stress: 0.4, hard: 0.05, tier: 0 },
  { id: 'trucker', title: 'راننده کامیون', emoji: '🚛', minAge: 23, mil: true, flag: 'licence', pay: 2.0, growth: 1.1, levels: ['راننده کامیون', 'راننده‌ی ترانزیت'], stress: 0.6, hard: 0.2, tier: 0 },
  { id: 'barber', title: 'آرایشگر', emoji: '💇', minAge: 18, flag: 'c_barber', pay: 1.6, growth: 1.25, levels: ['آرایشگر', 'آرایشگر معروف', 'صاحب سالن'], stress: 0.3, hard: 0.2, tier: 0 },
  { id: 'tailor', title: 'خیاط', emoji: '🧵', minAge: 18, flag: 'c_tailor', pay: 1.3, growth: 1.2, levels: ['خیاط', 'خیاط مزون'], stress: 0.3, hard: 0.15, tier: 0 },
  { id: 'mechanic', title: 'مکانیک', emoji: '🔧', minAge: 18, flag: 'c_mechanic', pay: 1.7, growth: 1.2, levels: ['شاگرد مکانیک', 'مکانیک', 'صاحب تعمیرگاه'], stress: 0.4, hard: 0.15, tier: 0 },
  { id: 'plumber', title: 'لوله‌کش', emoji: '🚰', minAge: 18, flag: 'c_plumber', pay: 1.9, growth: 1.15, levels: ['لوله‌کش', 'تأسیسات‌کار'], stress: 0.3, hard: 0.1, tier: 0 },
  { id: 'electrician', title: 'برق‌کار ساختمان', emoji: '💡', minAge: 18, flag: 'c_elec', pay: 1.9, growth: 1.15, levels: ['برق‌کار', 'پیمانکار برق'], stress: 0.3, hard: 0.1, tier: 0 },
  { id: 'trainer', title: 'مربی باشگاه', emoji: '🏋️', minAge: 20, health: 75, flag: 'c_coach', pay: 1.5, growth: 1.25, levels: ['مربی', 'مربی خصوصی', 'صاحب باشگاه'], stress: 0.2, hard: 0.2, tier: 0 },
  // ── diploma ──
  { id: 'secretary', title: 'منشی مطب', emoji: '📞', degree: 'diploma', minAge: 18, pay: 1.05, growth: 1.1, levels: ['منشی', 'منشی ارشد'], stress: 0.3, hard: 0.15, tier: 0 },
  { id: 'police', title: 'پلیس', emoji: '👮', degree: 'diploma', minAge: 18, maxAge: 30, health: 60, mil: true, pay: 1.8, growth: 1.15, levels: ['سرباز وظیفه', 'گروهبان', 'ستوان', 'سرگرد'], stress: 0.6, hard: 0.3, gov: true, tier: 1 },
  { id: 'firefighter', title: 'آتش‌نشان', emoji: '🚒', degree: 'diploma', minAge: 20, maxAge: 32, health: 70, mil: true, pay: 2.0, growth: 1.12, levels: ['آتش‌نشان', 'فرمانده ایستگاه'], stress: 0.7, hard: 0.35, gov: true, tier: 1 },
  { id: 'marketer', title: 'بازاریاب', emoji: '📣', degree: 'diploma', minAge: 18, pay: 1.3, growth: 1.25, levels: ['بازاریاب', 'سرپرست فروش', 'مدیر فروش'], stress: 0.5, hard: 0.1, tier: 0 },
  { id: 'hotel', title: 'کارمند هتل', emoji: '🏨', degree: 'diploma', minAge: 19, looks: 40, pay: 1.3, growth: 1.15, levels: ['پذیرش', 'سرپرست پذیرش', 'مدیر هتل'], stress: 0.4, hard: 0.25, tier: 0 },
  { id: 'attendant', title: 'مهماندار هواپیما', emoji: '✈️', degree: 'diploma', minAge: 20, maxAge: 30, looks: 60, health: 60, flag: 'english', pay: 2.6, growth: 1.12, levels: ['مهماندار', 'سرمهماندار'], stress: 0.5, hard: 0.6, tier: 1 },
  { id: 'insurance', title: 'کارمند بیمه', emoji: '📄', degree: 'diploma', minAge: 20, mil: true, pay: 1.6, growth: 1.15, levels: ['کارمند', 'کارشناس', 'رئیس شعبه'], stress: 0.4, hard: 0.3, tier: 0 },
  // ── kardani ──
  { id: 'technician', title: 'تکنسین برق صنعتی', emoji: '⚡', degree: 'kardani', majors: ['k_elec', 'elec'], pay: 1.9, growth: 1.15, levels: ['تکنسین', 'سرپرست فنی'], stress: 0.4, hard: 0.2, tier: 1 },
  { id: 'autotech', title: 'تکنسین خودرو', emoji: '🚗', degree: 'kardani', majors: ['k_mech', 'mech'], pay: 1.8, growth: 1.15, levels: ['تکنسین', 'سرپرست تعمیرگاه'], stress: 0.4, hard: 0.2, tier: 1 },
  { id: 'it', title: 'پشتیبان شبکه', emoji: '🌐', degree: 'kardani', majors: ['k_comp', 'comp', 'elec'], pay: 1.9, growth: 1.2, levels: ['پشتیبان', 'کارشناس شبکه', 'مدیر IT'], stress: 0.4, hard: 0.25, tier: 1 },
  { id: 'bookkeeper', title: 'دفتردار', emoji: '🧾', degree: 'kardani', majors: ['k_acc', 'acc', 'mgmt', 'econ'], pay: 1.5, growth: 1.15, levels: ['دفتردار', 'حسابدار'], stress: 0.3, hard: 0.2, tier: 0 },
  // ── bachelor ──
  { id: 'dev', title: 'برنامه‌نویس', emoji: '💻', degree: 'karshenasi', majors: ['comp', 'elec', 'math', 'phys', 'ind'], smarts: 55, pay: 3.6, growth: 1.35, levels: ['برنامه‌نویس جونیور', 'برنامه‌نویس', 'برنامه‌نویس ارشد', 'مدیر فنی (CTO)'], stress: 0.5, hard: 0.35, tier: 2 },
  { id: 'eleng', title: 'مهندس برق', emoji: '🔌', degree: 'karshenasi', majors: ['elec'], pay: 2.8, growth: 1.25, levels: ['کارشناس', 'مهندس ارشد', 'مدیر پروژه'], stress: 0.5, hard: 0.35, tier: 2 },
  { id: 'mecheng', title: 'مهندس مکانیک', emoji: '⚙️', degree: 'karshenasi', majors: ['mech'], pay: 2.6, growth: 1.25, levels: ['کارشناس', 'مهندس ارشد', 'مدیر کارخانه'], stress: 0.5, hard: 0.35, tier: 2 },
  { id: 'civileng', title: 'مهندس عمران', emoji: '🏗️', degree: 'karshenasi', majors: ['civil'], pay: 2.5, growth: 1.3, levels: ['مهندس ناظر', 'مهندس اجرا', 'پیمانکار'], stress: 0.5, hard: 0.3, tier: 1 },
  { id: 'architect', title: 'معمار', emoji: '📐', degree: 'karshenasi', majors: ['arch'], pay: 2.6, growth: 1.3, levels: ['طراح', 'معمار ارشد', 'صاحب دفتر'], stress: 0.4, hard: 0.35, tier: 2 },
  { id: 'indeng', title: 'کارشناس صنایع', emoji: '📊', degree: 'karshenasi', majors: ['ind', 'mgmt'], pay: 2.4, growth: 1.25, levels: ['کارشناس', 'مدیر برنامه‌ریزی', 'مدیرعامل'], stress: 0.5, hard: 0.3, tier: 1 },
  { id: 'oil', title: 'کارشناس شرکت نفت', emoji: '🛢️', degree: 'karshenasi', majors: ['chem', 'mech', 'elec', 'civil'], mil: true, pay: 5.5, growth: 1.2, levels: ['کارشناس', 'کارشناس ارشد', 'رئیس بخش'], stress: 0.4, hard: 0.85, gov: true, tier: 2 },
  { id: 'teacher', title: 'معلم', emoji: '🧑‍🏫', degree: 'karshenasi', mil: true, pay: 1.6, growth: 1.12, levels: ['معلم حق‌التدریس', 'معلم رسمی', 'مدیر مدرسه'], stress: 0.5, hard: 0.35, gov: true, tier: 0 },
  { id: 'clerk', title: 'کارمند اداره', emoji: '🗂️', degree: 'karshenasi', mil: true, pay: 1.8, growth: 1.15, levels: ['کارمند', 'کارشناس', 'رئیس اداره', 'مدیرکل'], stress: 0.3, hard: 0.5, gov: true, tier: 0 },
  { id: 'banker', title: 'کارمند بانک', emoji: '🏦', degree: 'karshenasi', majors: ['acc', 'econ', 'mgmt', 'math', 'ind'], mil: true, pay: 2.2, growth: 1.18, levels: ['کارمند باجه', 'معاون شعبه', 'رئیس شعبه'], stress: 0.4, hard: 0.55, gov: true, tier: 1 },
  { id: 'accountant', title: 'حسابدار', emoji: '🧮', degree: 'karshenasi', majors: ['acc', 'econ', 'mgmt', 'k_acc'], pay: 2.0, growth: 1.2, levels: ['حسابدار', 'حسابدار ارشد', 'مدیر مالی'], stress: 0.4, hard: 0.2, tier: 1 },
  { id: 'nurse', title: 'پرستار', emoji: '🩺', degree: 'karshenasi', majors: ['nurse'], pay: 2.1, growth: 1.12, levels: ['پرستار', 'سرپرستار', 'مترون'], stress: 0.8, hard: 0.15, tier: 1 },
  { id: 'midwife', title: 'ماما', emoji: '👶', degree: 'karshenasi', majors: ['midwife'], gender: 'f', pay: 2.0, growth: 1.15, levels: ['ماما', 'مامای ارشد'], stress: 0.6, hard: 0.25, tier: 1 },
  { id: 'physio', title: 'فیزیوتراپ', emoji: '🦵', degree: 'karshenasi', majors: ['physio'], pay: 3.0, growth: 1.2, levels: ['فیزیوتراپ', 'صاحب کلینیک'], stress: 0.3, hard: 0.3, tier: 1 },
  { id: 'nutritionist', title: 'کارشناس تغذیه', emoji: '🥗', degree: 'karshenasi', majors: ['nutri'], pay: 2.3, growth: 1.25, levels: ['کارشناس تغذیه', 'صاحب کلینیک لاغری'], stress: 0.2, hard: 0.3, tier: 1 },
  { id: 'translator', title: 'مترجم', emoji: '🌐', degree: 'karshenasi', majors: ['eng', 'lit'], pay: 1.6, growth: 1.2, levels: ['مترجم', 'مترجم رسمی'], stress: 0.3, hard: 0.2, tier: 1 },
  { id: 'journalist', title: 'خبرنگار', emoji: '📰', degree: 'karshenasi', majors: ['journal', 'lit', 'soc'], pay: 1.7, growth: 1.2, levels: ['خبرنگار', 'دبیر سرویس', 'سردبیر'], stress: 0.6, hard: 0.3, tier: 1 },
  { id: 'graphic', title: 'گرافیست', emoji: '🖌️', degree: 'karshenasi', majors: ['graphic', 'paint', 'arch'], pay: 1.9, growth: 1.25, levels: ['گرافیست', 'طراح ارشد', 'مدیر هنری'], stress: 0.4, hard: 0.25, tier: 1 },
  { id: 'photographer', title: 'عکاس', emoji: '📷', degree: 'karshenasi', majors: ['cinema', 'graphic', 'paint'], pay: 1.7, growth: 1.25, levels: ['عکاس', 'عکاس آتلیه', 'صاحب آتلیه'], stress: 0.3, hard: 0.2, tier: 1 },
  { id: 'musicteacher', title: 'معلم موسیقی', emoji: '🎼', degree: 'karshenasi', majors: ['music'], pay: 1.6, growth: 1.2, levels: ['معلم موسیقی', 'صاحب آموزشگاه'], stress: 0.2, hard: 0.2, tier: 1 },
  { id: 'designer', title: 'طراح لباس', emoji: '👗', degree: 'karshenasi', majors: ['fashion', 'graphic'], pay: 1.8, growth: 1.3, levels: ['طراح', 'طراح ارشد', 'صاحب برند'], stress: 0.4, hard: 0.3, tier: 1 },
  { id: 'lawyer', title: 'وکیل', emoji: '⚖️', degree: 'karshenasi', majors: ['law'], flag: 'bar', pay: 3.5, growth: 1.35, levels: ['کارآموز وکالت', 'وکیل پایه‌یک', 'وکیل معروف'], stress: 0.6, hard: 0.25, tier: 1 },
  { id: 'psychologist', title: 'روانشناس', emoji: '🛋️', degree: 'arshad', majors: ['psych'], pay: 2.6, growth: 1.3, levels: ['مشاور', 'روانشناس بالینی', 'صاحب کلینیک'], stress: 0.4, hard: 0.3, tier: 1 },
  // ── professional doctorate ──
  { id: 'gp', title: 'پزشک عمومی', emoji: '🧑‍⚕️', degree: 'doctor', majors: ['med'], pay: 6, growth: 1.15, levels: ['پزشک طرحی', 'پزشک عمومی', 'صاحب مطب'], stress: 0.7, hard: 0.1, tier: 2 },
  { id: 'specialist', title: 'پزشک متخصص', emoji: '🩻', degree: 'doctor', majors: ['med'], flag: 'residency', pay: 14, growth: 1.2, levels: ['متخصص', 'فوق‌تخصص', 'رئیس بخش بیمارستان'], stress: 0.8, hard: 0.2, tier: 2 },
  { id: 'dentist', title: 'دندان‌پزشک', emoji: '🦷', degree: 'doctor', majors: ['dent'], pay: 9, growth: 1.2, levels: ['دندان‌پزشک', 'صاحب کلینیک'], stress: 0.5, hard: 0.15, tier: 2 },
  { id: 'pharmacist', title: 'داروساز', emoji: '💊', degree: 'doctor', majors: ['pharm'], pay: 5, growth: 1.2, levels: ['داروساز', 'صاحب داروخانه'], stress: 0.4, hard: 0.15, tier: 2 },
  { id: 'vet', title: 'دامپزشک', emoji: '🐄', degree: 'doctor', majors: ['vet'], pay: 3.5, growth: 1.2, levels: ['دامپزشک', 'صاحب کلینیک دامپزشکی'], stress: 0.4, hard: 0.2, tier: 1 },
  // ── higher degrees ──
  { id: 'researcher', title: 'پژوهشگر', emoji: '🔬', degree: 'arshad', smarts: 65, pay: 2.4, growth: 1.2, levels: ['پژوهشگر', 'پژوهشگر ارشد'], stress: 0.3, hard: 0.4, tier: 1 },
  { id: 'professor', title: 'استاد دانشگاه', emoji: '🎓', degree: 'phd', smarts: 70, mil: true, pay: 4, growth: 1.18, levels: ['استادیار', 'دانشیار', 'استاد تمام'], stress: 0.4, hard: 0.6, gov: true, tier: 2 },
  // ── special careers (pack) ──
  { id: 'footballer', title: 'فوتبالیست حرفه‌ای', emoji: '⚽', minAge: 17, maxAge: 27, health: 80, vip: true, pay: 8, growth: 1.8, levels: ['بازیکن لیگ یک', 'بازیکن لیگ برتر', 'ستاره‌ی لیگ', 'عضو تیم ملی'], stress: 0.6, hard: 0.6, tier: 2 },
  { id: 'actor', title: 'بازیگر', emoji: '🎬', minAge: 18, looks: 65, vip: true, pay: 3, growth: 2.2, levels: ['بازیگر نقش مکمل', 'بازیگر سریال', 'ستاره‌ی سینما'], stress: 0.5, hard: 0.6, tier: 2 },
  { id: 'singer', title: 'خواننده', emoji: '🎙️', minAge: 18, flag: 'voice', vip: true, pay: 3, growth: 2.2, levels: ['خواننده‌ی مجالس', 'خواننده‌ی پاپ', 'سوپراستار'], stress: 0.5, hard: 0.55, tier: 2 },
  { id: 'pilot', title: 'خلبان', emoji: '🛫', degree: 'diploma', minAge: 20, maxAge: 32, smarts: 60, health: 75, mil: true, flag: 'flight_school', vip: true, pay: 9, growth: 1.25, levels: ['کمک‌خلبان', 'خلبان', 'کاپیتان'], stress: 0.6, hard: 0.4, tier: 2 },
  { id: 'tycoon', title: 'تاجر بازار', emoji: '🧳', minAge: 22, vip: true, pay: 6, growth: 1.6, levels: ['حجره‌دار', 'تاجر', 'حاجی بازار'], stress: 0.6, hard: 0.5, tier: 2 },
];

export function jobById(id: string): JobDef | undefined {
  return JOBS.find((j) => j.id === id);
}
