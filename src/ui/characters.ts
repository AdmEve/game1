/**
 * The cast, drawn as small portraits: «مش‌رحیم», the veteran taxi driver who teaches the ropes, and
 * «آقای عجول», owner of the rival agency, whose jams are the boss levels.
 */

/** Mash Rahim: flat cap, big grey moustache, kind eyes, a brown driver's jacket. */
export const RAHIM = (cls = '') => `<svg class="face ${cls}" viewBox="0 0 120 120" aria-hidden="true">
  <defs><clipPath id="fr"><circle cx="60" cy="60" r="56"/></clipPath>
    <radialGradient id="rbg" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="#fff3c4"/><stop offset="1" stop-color="#f6c453"/></radialGradient></defs>
  <circle cx="60" cy="60" r="58" fill="#7c4a21"/><circle cx="60" cy="60" r="56" fill="url(#rbg)"/>
  <g clip-path="url(#fr)">
    <path d="M14 122 Q18 88 60 84 Q102 88 106 122 Z" fill="#6b4226"/>
    <path d="M44 86 L60 104 L76 86 Z" fill="#f1ede4"/><path d="M56 92 L60 104 L64 92 Z" fill="#2f3e5c"/>
    <rect x="49" y="74" width="22" height="16" rx="6" fill="#d6a27a"/>
    <ellipse cx="60" cy="56" rx="25" ry="28" fill="#e0b088"/>
    <ellipse cx="35" cy="58" rx="5" ry="8" fill="#d29b72"/><ellipse cx="85" cy="58" rx="5" ry="8" fill="#d29b72"/>
    <path d="M36 70 Q60 92 84 70 Q80 84 60 86 Q40 84 36 70Z" fill="#c8c3bb" opacity=".55"/>
    <path d="M33 40 Q36 18 60 17 Q86 18 88 40 Q60 30 33 40Z" fill="#5b5f66"/>
    <path d="M30 41 Q60 31 92 41 Q93 46 88 46 Q60 38 34 46 Q29 46 30 41Z" fill="#45484e"/>
    <path d="M44 50 Q49 47 54 50" stroke="#8a8a8a" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M66 50 Q71 47 76 50" stroke="#8a8a8a" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M45 57 Q49 54 53 57" stroke="#3b2a20" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M67 57 Q71 54 75 57" stroke="#3b2a20" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M42 59 l-3 2 M78 59 l3 2" stroke="#b07c58" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M57 58 Q60 66 63 58 Q64 66 60 67 Q56 66 57 58Z" fill="#c98d64"/>
    <path d="M40 72 Q50 64 60 69 Q70 64 80 72 Q74 78 66 75 Q60 73 54 75 Q46 78 40 72Z" fill="#d9d6d0"/>
    <path d="M52 78 Q60 82 68 78" stroke="#8a4b33" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;

/** Mr. Ajool: slick hair, pencil moustache, aviators, a loud shirt and a gold chain. */
export const AJOOL = (cls = '') => `<svg class="face ${cls}" viewBox="0 0 120 120" aria-hidden="true">
  <defs><clipPath id="fa"><circle cx="60" cy="60" r="56"/></clipPath>
    <radialGradient id="abg" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="#fbcfe8"/><stop offset="1" stop-color="#be185d"/></radialGradient>
    <pattern id="ash" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#7c3aed"/><circle cx="4" cy="4" r="2.5" fill="#fde047"/><circle cx="11" cy="10" r="2" fill="#22d3ee"/></pattern></defs>
  <circle cx="60" cy="60" r="58" fill="#4c0519"/><circle cx="60" cy="60" r="56" fill="url(#abg)"/>
  <g clip-path="url(#fa)">
    <path d="M12 122 Q16 88 60 84 Q104 88 108 122 Z" fill="url(#ash)"/>
    <path d="M46 86 L60 98 L74 86" stroke="#f8fafc" stroke-width="5" fill="none"/>
    <path d="M44 96 Q60 112 76 96" stroke="#facc15" stroke-width="3" fill="none"/><circle cx="60" cy="106" r="4" fill="#facc15"/>
    <rect x="50" y="72" width="20" height="16" rx="6" fill="#e8b892"/>
    <path d="M35 50 Q34 82 60 86 Q86 82 85 50 Q85 26 60 26 Q35 26 35 50Z" fill="#f1c9a0"/>
    <ellipse cx="34" cy="58" rx="4.5" ry="7" fill="#e8b892"/><ellipse cx="86" cy="58" rx="4.5" ry="7" fill="#e8b892"/>
    <path d="M32 54 Q30 22 62 20 Q92 22 88 52 Q84 36 70 34 Q50 30 40 40 Q34 46 32 54Z" fill="#111827"/>
    <path d="M50 26 Q66 22 80 32" stroke="#4b5563" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M42 46 Q49 41 56 45" stroke="#111827" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <path d="M64 43 Q71 37 79 42" stroke="#111827" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <rect x="39" y="49" width="19" height="12" rx="6" fill="#111827"/><rect x="62" y="49" width="19" height="12" rx="6" fill="#111827"/>
    <path d="M58 53 H62" stroke="#111827" stroke-width="2.5"/>
    <path d="M43 52 L50 52" stroke="#9ca3af" stroke-width="2" stroke-linecap="round"/><path d="M66 52 L73 52" stroke="#9ca3af" stroke-width="2" stroke-linecap="round"/>
    <path d="M57 61 Q60 68 63 61" stroke="#c98d64" stroke-width="2.5" fill="none"/>
    <path d="M48 71 Q60 67 72 71" stroke="#111827" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M52 76 Q63 80 72 73" stroke="#7f1d1d" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;

/** Mr. Ajool's taunt before each chapter's boss level, and his excuse once beaten. */
export const BOSS_LINES: { taunt: string; beaten: string }[] = [
  { taunt: 'به به! نوه‌ی آقاجون! این پارکینگ تجریش رو من بستم. ببینم چند مرده حلاجی!', beaten: 'شانسی بود! تو ولیعصر حسابت رو می‌رسم…' },
  { taunt: 'ولیعصر مال منه! همه‌ی ماشین‌هام زیر چنارها جا خوش کردن.', beaten: 'ای بابا! خب… میدون آزادی که دیگه کار تو نیست!' },
  { taunt: 'شب‌های آزادی، ترافیک دست منه. حتی دوربین‌ها هم رفیق منن!', beaten: 'یخ کردم! تو توچال یه درسی بهت می‌دم.' },
  { taunt: 'تو برف توچال، پلیس راهور هم با منه. کم بیار!', beaten: 'دماغم یخ زد… بازار رو دیگه نمی‌تونی!' },
  { taunt: 'بازار بزرگ؟ همه‌ی گاری‌ها رو خودم فرستادم وسط پارکینگ!', beaten: 'حجره‌م رو بستم! ولی دربند، دربند مال منه.' },
  { taunt: 'پاییز دربند و دو تا ماشین عروس! ببینم به عروسی می‌رسی؟', beaten: 'عروسی خوش گذشت؟ هه… بهار می‌بینمت.' },
  { taunt: 'حاج‌خانم‌ها با کیسه‌های عید… ماشینات جا ندارن، تسلیم شو!', beaten: 'حاج‌خانم‌ها هم طرف تو رو گرفتن! برج میلاد آخرین سنگره.' },
  { taunt: 'تونل‌های نیایش رو قاطی کردم! از کجا می‌ری، از کجا میای بیرون؟', beaten: 'باشه، باشه! قبول دارم… آژانس آقاجون بهترین آژانس تهرونه!' },
];
