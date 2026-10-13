import { RIASEC_QUESTIONS } from './riasecQuestions.js';

const EXTRA_RIASEC = [
  { id: 31, category: 'R', textEn: 'I like installing solar panels, wiring a room, or assembling furniture from a kit.', textUr: 'مجھے سولر پینل لگانا، کمرے کی وائرنگ یا فرنیچر جوڑنا پسند ہے۔' },
  { id: 32, category: 'R', textEn: 'I would rather fix a broken phone or bike than write a long report about it.', textUr: 'میں لمبی رپورٹ لکھنے سے پہلے ٹوٹا فون یا بائیسیکل ٹھیک کرنا پسند کروں گا۔' },
  { id: 33, category: 'R', textEn: 'I enjoy sports that need coordination, or learning how engines and tools actually work.', textUr: 'مجھے جسمانی کھیل یا یہ سیکھنا پسند ہے کہ انجن اور اوزار کیسے کام کرتے ہیں۔' },
  { id: 34, category: 'I', textEn: 'I keep asking “why” until I understand how a medicine, formula or app really works.', textUr: 'میں “کیوں” پوچھتا رہتا ہوں جب تک دوا، فارمولا یا ایپ سمجھ نہ آ جائے۔' },
  { id: 35, category: 'I', textEn: 'I enjoy comparing two explanations and picking the one that fits the evidence.', textUr: 'مجھے دو وضاحتیں موازنہ کر کے ثبوت کے مطابق صحیح والی چننا پسند ہے۔' },
  { id: 36, category: 'I', textEn: 'I like watching science videos or trying small experiments at home.', textUr: 'مجھے سائنس کی ویڈیوز دیکھنا یا گھر پر چھوٹے تجربے کرنا پسند ہے۔' },
  { id: 37, category: 'A', textEn: 'I notice colours, fonts and layouts, and I enjoy making things look better.', textUr: 'میں رنگ، فونٹ اور لے آؤٹ دیکھتا ہوں اور چیزوں کو خوبصورت بنانا پسند کرتا ہوں۔' },
  { id: 38, category: 'A', textEn: 'I would rather write a story, make a reel or design a poster than fill a spreadsheet.', textUr: 'میں اسپریڈشیٹ بھرنے سے پہلے کہانی، ریل یا پوسٹر بنانا پسند کروں گا۔' },
  { id: 39, category: 'A', textEn: 'I like remixing music, decorating a room, or inventing my own style.', textUr: 'مجھے موسیقی مکس کرنا، کمرہ سجانا یا اپنا انداز بنانا پسند ہے۔' },
  { id: 40, category: 'S', textEn: 'Friends come to me when they need someone to listen without judging.', textUr: 'دوست تب میرے پاس آتے ہیں جب انہیں بغیر تنقید کے سننے والا چاہیے۔' },
  { id: 41, category: 'S', textEn: 'I feel useful when I volunteer, tutor, or help a classmate who is stuck.', textUr: 'جب میں رضاکارانہ کام، ٹیوشن یا پھسے ہوئے دوست کی مدد کرتا ہوں تو فائدہ محسوس ہوتا ہے۔' },
  { id: 42, category: 'S', textEn: 'I enjoy planning a class event so that everyone feels included.', textUr: 'مجھے کلاس کا ایونٹ اس طرح بنانا پسند ہے کہ سب شامل محسوس کریں۔' },
  { id: 43, category: 'E', textEn: 'I like selling an idea — a stall at a school fair, a freelance gig, or a campaign.', textUr: 'مجھے آئیڈیا بیچنا پسند ہے — میلہ سٹال، فری لانس کام یا مہم۔' },
  { id: 44, category: 'E', textEn: 'I step forward when a group has no leader and I can set a plan.', textUr: 'جب گروپ کا لیڈر نہ ہو تو میں آگے بڑھ کر منصوبہ بناتا ہوں۔' },
  { id: 45, category: 'E', textEn: 'I enjoy competing, setting targets, and tracking whether we hit them.', textUr: 'مجھے مقابلہ، ہدف رکھنا اور دیکھنا پسند ہے کہ ہم پہنچے یا نہیں۔' },
  { id: 46, category: 'C', textEn: 'I like making checklists, calendars and neat notes so nothing is missed.', textUr: 'مجھے چیک لسٹ، کیلنڈر اور صاف نوٹس بنانا پسند ہے تاکہ کچھ چھوٹ نہ جائے۔' },
  { id: 47, category: 'C', textEn: 'I feel calm when numbers, files or money are recorded correctly.', textUr: 'جب اعداد، فائلیں یا پیسے درست درج ہوں تو مجھے سکون ہوتا ہے۔' },
  { id: 48, category: 'C', textEn: 'I prefer a clear routine and written rules over last-minute improvising.', textUr: 'میں اچانک انداز سے زیادہ واضح روٹین اور لکھا ہوا اصول پسند کرتا ہوں۔' },
];

function hashSeed(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(list: T[], rand: () => number) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function personalRiasecQuestions(userId?: string | null, attempt = 0) {
  const rand = rng(hashSeed(`${userId || 'guest'}:${attempt}`));
  const pool = [...RIASEC_QUESTIONS, ...EXTRA_RIASEC] as Array<{ id: number; category: string; textEn: string; textUr: string }>;
  const byType: Record<string, typeof pool> = { R: [], I: [], A: [], S: [], E: [], C: [] };
  for (const q of pool) {
    if (byType[q.category]) byType[q.category].push(q);
  }
  const picked = ['R', 'I', 'A', 'S', 'E', 'C'].flatMap((type) => shuffle(byType[type], rand).slice(0, 5));
  return shuffle(picked, rand);
}
