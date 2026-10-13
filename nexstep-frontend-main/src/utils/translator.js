import { repairUrduText } from '../data/translations.js';

// Global translation helper utility for NexStep AI
// Translates strings, options, dropdown items, filter labels, and titles into Urdu when lang === 'ur'

export const URDU_DICT = {
  // Common Options & Dropdowns
  "Grade 8": "کلاس 8",
  "Grade 8 Student": "کلاس 8 طالب علم",
  "Matric (9-10)": "میٹرک (کلاس 9-10)",
  "Matric Student": "میٹرک طالب علم",
  "FSc / Inter (11-12)": "ایف ایس سی / انٹر (کلاس 11-12)",
  "FSc / Inter Student": "ایف ایس سی طالب علم",
  "Transnational (O/A-Levels)": "او / اے لیولز (بین الاقوامی)",
  "O/A Levels": "او / اے لیولز",
  "University Student": "یونیورسٹی طالب علم",
  "University": "یونیورسٹی",
  "Fresh Graduate": "تازہ ترین گریجویٹ",

  // Streams
  "Pre-Medical": "ایف ایس سی پری میڈیکل",
  "FSc Pre-Medical": "ایف ایس سی پری میڈیکل",
  "Pre-Engineering": "ایف ایس سی پری انجینئرنگ",
  "FSc Pre-Engineering": "ایف ایس سی پری انجینئرنگ",
  "ICS (Comp Sci)": "آئی سی ایس (کمپیوٹر سائنس)",
  "ICS (Computer Science)": "آئی سی ایس (کمپیوٹر سائنس)",
  "ICOM (Commerce)": "آئی کام (کامرس)",
  "Arts/FA": "آرٹس / ایف اے",
  "Arts / FA": "آرٹس / ایف اے",
  "DAE (Diploma)": "ڈی اے ای (3 سالہ ٹیکنیکل ڈپلومہ)",
  "DAE (3-Year Technical Diploma)": "ڈی اے ای (3 سالہ ٹیکنیکل ڈپلومہ)",
  "TEVTA Trade": "ٹیوٹا فنی تربیت",
  "A-Levels": "اے لیولز",
  "Cambridge A-Levels": "کیمبرج اے لیولز",
  "Science (Biology)": "سائنس (بیالوجی)",
  "Science (Computer)": "سائنس (کمپیوٹر)",
  "Humanities / Arts": "ہومینیٹیز / آرٹس",
  "Commerce": "کامرس",

  // Filters & Options
  "All Streams": "تمام گروپس",
  "All Categories": "تمام اقسام",
  "All Cities": "تمام شہر",
  "All Provinces": "تمام صوبے",
  "All Sectors": "تمام شعبے",
  "All Tiers": "تمام رینکنگ ڈگریز",
  "All Types": "تمام قسمیں",
  "All Grades": "تمام کلاسز",

  // Provinces
  "Punjab": "پنجاب",
  "Sindh": "سندھ",
  "KPK": "خیبر پختونخوا",
  "Khyber Pakhtunkhwa": "خیبر پختونخوا",
  "Balochistan": "بلوچستان",
  "Islamabad": "اسلام آباد (وفاق)",
  "Islamabad (Federal)": "اسلام آباد (وفاق)",
  "Islamabad Capital Territory": "اسلام آباد (وفاق)",
  "AJK/GB": "آزاد کشمیر / گلگت بلتستان",
  "AJK / Gilgit-Baltistan": "آزاد کشمیر / گلگت بلتستان",
  "Gilgit-Baltistan": "گلگت بلتستان",
  "Azad Kashmir": "آزاد کشمیر",

  // Cities
  "Lahore": "لاہور",
  "Karachi": "کراچی",
  "Rawalpindi": "راولپنڈی",
  "Peshawar": "پشاور",
  "Quetta": "کوئٹہ",
  "Multan": "ملتان",
  "Faisalabad": "فیصل آباد",
  "Gujranwala": "گوجرانوالہ",
  "Sialkot": "سیالکوٹ",
  "Hyderabad": "حیدرآباد",
  "Abbottabad": "ایبٹ آباد",
  "Bahawalpur": "بہاولپور",
  "Sukkur": "سکھر",
  "Taxila": "ٹیکسلا",
  "Jamshoro": "جامشورو",

  // Scholarship Types & Categories
  "Need-Based": "ضرورت کے تحت (Need-Based)",
  "Need Based": "ضرورت کے تحت (Need-Based)",
  "Merit-Based": "میرٹ کی بنیاد پر (Merit-Based)",
  "Merit Based": "میرٹ کی بنیاد پر (Merit-Based)",
  "Provincial": "صوبائی سکالرشپ",
  "Federal": "وفاقی سکالرشپ",
  "International": "بین الاقوامی سکالرشپ",
  "Minority / Special": "اقلیت / خصوصی رعایت",
  "Sports": "کھیل / اسپورٹس",

  // Sectors & Tiers
  "Public": "سرکاری (Public)",
  "Public / Federal": "سرکاری (Public)",
  "Public / Government": "سرکاری (Public)",
  "Private": "پرائیویٹ (Private)",
  "Private / Autonomous": "پرائیویٹ (Private)",
  "Semi-Government": "نیم سرکاری",
  "W-4 (Top)": "ڈبلیو-4 (ٹاپ رینک)",
  "W-3 (High)": "ڈبلیو-3 (اعلیٰ رینک)",
  "W-2": "ڈبلیو-2 (درمیانی رینک)",
  "W-1": "ڈبلیو-1",

  // Actions & Buttons
  "Save Profile": "پروفائل محفوظ کریں",
  "Save Changes": "تبدیلیاں محفوظ کریں",
  "Cancel": "منسوخ کریں",
  "Close": "بند کریں",
  "Apply Online": "آن لائن اپلائی کریں",
  "Apply Now": "ابھی اپلائی کریں",
  "View Details": "تفصیلات دیکھیں",
  "Official Website": "آفیشل ویب سائٹ",
  "Download Guide": "رہنما ڈاؤن لوڈ کریں",
  "Filter": "فلٹر کریں",
  "Reset": "ری سیٹ",
  "Search": "تلاش کریں",
  "Select Grade": "درجہ منتخب کریں",
  "Select City": "شہر منتخب کریں",
  "Select Stream": "گروپ منتخب کریں",
  "Select Province": "صوبہ منتخب کریں",
  "Select Category": "قسم منتخب کریں",
  "Select Option": "آپشن منتخب کریں",
  "Light Mode": "روشن موڈ (Light)",
  "Dark Mode": "ڈارک موڈ (Dark)",
  "Switch Theme": "تھیم تبدیل کریں",
  "Edit Profile": "پروفائل تبدیل کریں",
  "View Mobile App": "موبائل ایپ کا نظارہ",
  "Mobile App": "موبائل ایپ",
  "Ask NexStep AI Counselor": "اے آئی کونسلر سے پوچھیں",
  "Analyze BISE Thresholds & Suggest Streams": "نمبروں کا تجزیہ کریں اور ایف ایس سی بتائیں",
  "Match Eligible Careers & Merit Cutoffs": "مناسب پیشے اور میرٹ دیکھیں",
  "Compare Selected (Max 3)": "موازنہ کریں (زیادہ سے زیادہ 3)",
  "Retake Assessment": "دوبارہ ٹیسٹ دیں",
  "Send": "بھیجیں",
  "Search by university name, program or city...": "یونیورسٹی کا نام، پروگرام یا شہر تلاش کریں...",
  "Type your career question in English or Urdu...": "اپنا سوال اردو یا انگریزی میں لکھیں..."
};

// Synchronous translation for common text or option values
export function tr(text, lang = 'en') {
  if (!text) return '';
  if (lang !== 'ur') return text;

  // Check static dictionary
  const trimmed = String(text).trim();
  if (URDU_DICT[trimmed]) {
    return repairUrduText(URDU_DICT[trimmed]);
  }

  // Partial or rule-based fallback if available
  return URDU_DICT[trimmed] || text;
}

// React helper component to automatically translate option or text
export function Tr({ children, lang = 'en' }) {
  if (typeof children !== 'string') return children;
  return tr(children, lang);
}
