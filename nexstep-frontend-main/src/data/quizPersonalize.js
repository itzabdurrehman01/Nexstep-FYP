import { RIASEC_QUESTIONS, SUBJECT_QUESTIONS } from './interestQuiz.js';

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

const EXTRA_SUBJECT = [
  {
    id: 'q11', en: 'When a group project starts, what do you usually do first?', ur: 'گروپ پراجیکٹ شروع ہو تو آپ سب سے پہلے کیا کرتے ہیں؟',
    options: [
      { en: 'Build the model, circuit or prototype', ur: 'ماڈل، سرکٹ یا پروٹوٹائپ بنانا', areas: { technical: 2, engineering: 2 } },
      { en: 'Research the topic and check facts', ur: 'موضوع کی تحقیق اور حقائق چیک کرنا', areas: { medical: 1, humanities: 2 } },
      { en: 'Write the code or set up the slides / site', ur: 'کوڈ لکھنا یا سلائیڈز / سائٹ بنانا', areas: { computing: 3 } },
      { en: 'Divide tasks, set deadlines and present', ur: 'کام تقسیم کرنا، ڈیڈ لائن اور پریزنٹیشن', areas: { business: 2, social: 1 } },
      { en: 'Design the look and the story', ur: 'نظر اور کہانی ڈیزائن کرنا', areas: { creative: 3 } },
    ],
  },
  {
    id: 'q12', en: 'Which news story would you click first?', ur: 'آپ سب سے پہلے کون سی خبر کھولیں گے؟',
    options: [
      { en: 'A new hospital treatment or vaccine', ur: 'نیا علاج یا ویکسین', areas: { medical: 3 } },
      { en: 'A new dam, metro or power plant', ur: 'نیا ڈیم، میٹرو یا پاور پلانٹ', areas: { engineering: 3 } },
      { en: 'A new app, AI tool or phone', ur: 'نئی ایپ، اے آئی یا فون', areas: { computing: 3 } },
      { en: 'A business that grew from a small shop', ur: 'چھوٹی دکان سے بڑا کاروبار', areas: { business: 3 } },
      { en: 'A court decision or election', ur: 'عدالتی فیصلہ یا الیکشن', areas: { humanities: 3 } },
      { en: 'A film, design award or art show', ur: 'فلم، ڈیزائن ایوارڈ یا آرٹ شو', areas: { creative: 3 } },
    ],
  },
  {
    id: 'q13', en: 'What bothers you most in a job?', ur: 'نوکری میں آپ کو سب سے زیادہ کیا تکلیف دے گا؟',
    options: [
      { en: 'Sitting all day with no practical work', ur: 'دن بھر بیٹھنا بغیر عملی کام کے', areas: { technical: 2, engineering: 1 } },
      { en: 'Guessing without data or proof', ur: 'بغیر ثبوت کے اندازہ لگانا', areas: { medical: 1, computing: 1, engineering: 1 } },
      { en: 'Repeating the same task with no new ideas', ur: 'بغیر نئے خیال کے ایک ہی کام دہرانا', areas: { creative: 2, humanities: 1 } },
      { en: 'Working alone with no one to help', ur: 'اکیلے کام، مدد کے بغیر', areas: { social: 3 } },
      { en: 'A messy process with no records', ur: 'بے ترتیب عمل بغیر ریکارڈ کے', areas: { business: 2 } },
    ],
  },
  {
    id: 'q14', en: 'If you had one free Saturday course, which would you pick?', ur: 'اگر ایک ہفتے کا مفت کورس ہو تو کون سا چنیں گے؟',
    options: [
      { en: 'First aid or basic nursing', ur: 'فرسٹ ایڈ یا بنیادی نرسنگ', areas: { medical: 3 } },
      { en: 'AutoCAD or electronics', ur: 'آٹوکیڈ یا الیکٹرانکس', areas: { engineering: 2, technical: 1 } },
      { en: 'Python or web development', ur: 'پائتھن یا ویب ڈیولپمنٹ', areas: { computing: 3 } },
      { en: 'Excel, accounting or selling online', ur: 'ایکسل، اکاؤنٹنگ یا آن لائن فروخت', areas: { business: 3 } },
      { en: 'Public speaking or journalism', ur: 'تقریر یا صحافت', areas: { humanities: 3 } },
      { en: 'Canva, photography or video', ur: 'کینوا، فوٹوگرافی یا ویڈیو', areas: { creative: 3 } },
      { en: 'Teaching younger students', ur: 'چھوٹے طلبہ کو پڑھانا', areas: { social: 3 } },
    ],
  },
];

function hashSeed(value) {
  const text = String(value || 'guest');
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rand) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function pick(list, count, rand) {
  return shuffle(list, rand).slice(0, Math.min(count, list.length));
}

export function allRiasecQuestions() {
  return [...RIASEC_QUESTIONS, ...EXTRA_RIASEC];
}

export function allSubjectQuestions() {
  return [...SUBJECT_QUESTIONS, ...EXTRA_SUBJECT];
}

/** Unique mix per student and per retake — not the same dummy sequence for everyone. */
export function buildPersonalQuiz(userId, attempt = 0) {
  const rand = rng(hashSeed(`${userId || 'guest'}:${attempt}`));
  const byType = { R: [], I: [], A: [], S: [], E: [], C: [] };
  for (const q of allRiasecQuestions()) {
    if (byType[q.category]) byType[q.category].push(q);
  }
  const riasec = ['R', 'I', 'A', 'S', 'E', 'C'].flatMap((type) => pick(byType[type], 5, rand));
  const subject = pick(allSubjectQuestions(), 8, rand);
  return {
    riasec: shuffle(riasec, rand),
    subject: shuffle(subject, rand),
    seed: `${userId || 'guest'}:${attempt}`,
  };
}
