/**
 * src/services/aiCounselorEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Intelligent Pakistan Career & Education AI Counselor Engine.
 *
 * Provides expert-level, deeply localized guidance on:
 * - MDCAT & Medical admissions (UHS, NUMS, SZABMU, D-Pharm, BDS)
 * - ECAT, FAST, NUST NET, GIKI & Computer Science / Engineering paths
 * - Stream choices: Matric -> FSc Pre-Med vs Pre-Eng vs ICS vs Commerce
 * - Merit formulas & Aggregate calculations (50% test + 40% FSc + 10% Matric)
 * - Higher education scholarships (Ehsaas, HEC Need-Based, PEEF, BEEF)
 * - Real Pakistani tech salaries (PKR 80k - 600k/mo) & in-demand skills
 * - TEVTA, NAVTTC, PITB e-Rozgaar & DigiSkills vocational training
 * - Full bilingual support: English & fluent Urdu (اردو)
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface StudentProfileData {
  name?: string;
  city?: string;
  province?: string;
  gradeLevel?: string;
  preferredStream?: string;
  topRiasecCluster?: string;
  targetCareer?: string;
  goals?: string;
  budgetAnnualPkr?: number;
  familyMonthlyIncomePkr?: number;
  certifications?: string[];
  skills?: any[];
  marks?: {
    matricPct?: number;
    fscPct?: number;
    entryTestScore?: number;
  };
}

export function generateCounselingResponse(
  query: string,
  profile: StudentProfileData = {},
  history: Array<{ role: string; content: string }> = [],
  language = 'en'
): string {
  const q = query.toLowerCase().trim();
  // Whole-word / phrase match (substring matching made "it" match "with", "write", …).
  const has = (term: string) => /[\u0600-\u06FF]/.test(term)
    ? q.includes(term)
    : new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(q);
  const name = profile.name?.trim() || (language === 'ur' ? 'پیارے طالب علم' : 'Student');
  const marks = profile.marks || {};
  const matric = marks.matricPct;
  const fsc = marks.fscPct;
  const entryTest = marks.entryTestScore;
  const stream = profile.preferredStream || '';
  const city = profile.city || '';

  const isUrdu = language === 'ur' || /[\u0600-\u06FF]/.test(query);

  // 1. MDCAT / Medical Admissions
  if (
    has('mdcat') ||
    has('mbbs') ||
    has('bds') ||
    has('medical') ||
    has('doctor') ||
    has('uhs') ||
    has('nums') ||
    has('ایم ڈی کیٹ') ||
    has('ڈاکٹر')
  ) {
    if (isUrdu) {
      let calcNote = '';
      if (fsc && matric) {
        const testEst = entryTest || 75;
        const agg = (fsc * 0.4) + (matric * 0.1) + (testEst * 0.5);
        calcNote = `\n\n**آپ کا تخمینہ شدہ میرٹ ایگریگیٹ**: آپ کے میٹرک (${matric}%) اور ایف ایس سی (${fsc}%) کے ساتھ متوقع ایگریگیٹ تقریباً **${agg.toFixed(2)}%** بنتا ہے۔`;
      }
      return `السلام علیکم ${name}! پاکستان میں **MDCAT اور میڈیکل داخلوں** کے متعلق مکمل رہنمائی درج ذیل ہے:

### 1. پی ایم ڈی سی (PMDC) کا میرٹ فارمولا:
- **MDCAT انٹری ٹیسٹ**: 50%
- **FSc پری میڈیکل (HSSC)**: 40%
- **میٹرک (SSC)**: 10%

### 2. متوقع کٹ آف اور میرٹ تجزیہ:
- **پبلک سیکٹر MBBS (پنجاب/سندھ/کے پی کے)**: کم از کم 90.5% سے 92.5% ایگریگیٹ درکار ہوتا ہے۔
- **BDS (ڈینٹسٹری)**: 89.0% سے 90.5% ایگریگیٹ۔
- **پرائیویٹ میڈیکل کالجز**: کم از کم 70% سے 80% ایگریگیٹ (سالانہ فیس 18 سے 28 لاکھ روپے)۔${calcNote}

### 3. MBBS کے بہترین متبادل کیریئرز:
اگر میرٹ چند فیصد سے رہ جائے تو مایوس نہ ہوں، یہ شعبے بہترین مستقبل رکھتے ہیں:
- **Pharm-D (ڈاکٹر آف فارمیسی)**: 5 سالہ ڈگری، دوا ساز کمپنیوں اور ہسپتالوں میں فوری جاب۔
- **DPT (ڈاکٹر آف فزیکل تھراپی)**: کلینکل پریکٹس اور بین الاقوامی مواقع۔
- **BS بایوٹیکنالوجی / مائیکرو بایولوجی**: ریسرچ، فارما اور جینیٹکس۔
- **BS میڈیکل لیب ٹیکنالوجی (MLT)**: ڈائیگناسٹک سینٹرز میں مسلسل مانگ۔

NexStep کے **Merit Calculator** ٹیب سے اپنا بالکل درست ایگریگیٹ چیک کریں!`;
    }

    let calcNote = '';
    if (fsc && matric) {
      const testEst = entryTest || 75;
      const agg = (fsc * 0.4) + (matric * 0.1) + (testEst * 0.5);
      calcNote = `\n\n**Your Estimated Aggregate**: Based on your Matric (${matric}%) and FSc (${fsc}%), with an estimated entry test score of ${testEst}%, your aggregate is approximately **${agg.toFixed(2)}%**.`;
    }
    return `Assalam-o-Alaikum ${name}! Here is a complete breakdown of **MDCAT & Medical Admissions in Pakistan**:

### 1. PMDC Official Merit Weightage Formula:
- **MDCAT Entry Test**: **50%**
- **FSc Pre-Medical (HSSC)**: **40%**
- **Matriculation (SSC)**: **10%**

### 2. Recent Merit Cutoffs & Trends:
- **Public Sector MBBS (King Edward, Allama Iqbal, Dow, RMU)**: **90.5% – 93.0%**
- **Public Sector BDS (Dentistry)**: **89.0% – 90.8%**
- **Private Sector Medical Colleges**: **70.0% – 82.0%** (Annual tuition: PKR 1.8M – 2.8M)${calcNote}

### 3. Top High-Growth Medical Alternatives:
If open merit cutoff is tough, these accredited allied healthcare fields offer exceptional clinical and financial careers:
- **Pharm-D (Doctor of Pharmacy)**: 5-year clinical degree with extensive pharmaceutical, QA, and hospital roles.
- **DPT (Doctor of Physical Therapy)**: Independent clinical rehabilitation and sports medicine practice.
- **BS Biotechnology & Bioinformatics**: Genetic engineering, molecular research, and diagnostics.
- **BS Medical Imaging / Radiology & MLT**: High global demand with straightforward migration pathways to Gulf / UK.

Explore our **Merit Calculator** sub-tab to test your exact score combinations!`;
  }

  // 2. ICS vs Pre-Engineering / Computer Science / IT Careers
  if (
    has('ics') ||
    has('pre-engineering') ||
    has('engineering') ||
    has('computer science') ||
    has('software') ||
    has('information technology') ||
    has('fast') ||
    has('nust') ||
    has('ecat') ||
    has('سافٹ ویئر') ||
    has('انجینئرنگ')
  ) {
    if (isUrdu) {
      return `السلام علیکم ${name}! **کمپیوٹر سائنس، سافٹ ویئر انجینئرنگ اور ICS بمقابلہ پری انجینئرنگ** کا تقابلی جائزہ درج ذیل ہے:

### 1. ICS بمقابلہ FSc پری انجینئرنگ:
- **ICS (فزکس یا شماریات)**: اگر آپ کا ہدف 100% آئی ٹی، سافٹ ویئر ڈویلپمنٹ یا اے آئی ہے تو ICS بہترین انتخاب ہے کیونکہ آپ کو شروع سے پروگرامنگ کا ایکسپوژر ملتا ہے۔
- **FSc پری انجینئرنگ**: یہ آپ کو لچک فراہم کرتا ہے—آپ الیکٹریکل، مکینیکل، سول کے ساتھ ساتھ تمام کمپیوٹنگ ڈگریوں (BS CS, BS SE, BS AI, BS Data Science) میں بھی داخلہ لے سکتے ہیں۔

### 2. پاکستان کی ٹاپ آئی ٹی یونیورسٹیاں:
- **FAST-NUCES**: کوڈنگ اور انڈسٹری پلیسمنٹ میں نمبر 1 (ایگریگیٹ: 74% - 82%)۔
- **NUST (SEECS)**: ریسرچ، انٹرپرینیورشپ اور عالمی رینکنگ (NET اسکور 145+ درکار)۔
- **COMSATS (اسلام آباد / لاہور)**: بہترین فیکلٹی اور متوازن فیس ڈھانچہ۔
- **GIKI**: پریمیم انجینئرنگ اور کمپیوٹنگ فیکلٹی۔
- **ITU / PUCIT لاہور**: پبلک سیکٹر میں انتہائی کم فیس اور شاندار اکیڈمکس۔

### 3. مارکیٹ تنخواہیں (PKR):
- **جونیئر سافٹ ویئر انجینئر**: 80,000 تا 150,000 روپے ماہانہ
- **مڈ لیول ڈویلپر (2-4 سال)**: 200,000 تا 350,000 روپے ماہانہ
- **سینئر انجینئر / ٹیک لیڈ**: 450,000 تا 800,000+ روپے ماہانہ
- **ریموٹ یو ایس / یورپ ڈویلپرز**: $1,500 تا $5,000 ماہانہ

NexStep کے **Jobs Portal** اور **Roadmap Builder** سے مارکیٹ میں مطلوبہ مہارتیں دیکھیں!`;
    }

    return `Assalam-o-Alaikum ${name}! Here is a strategic guide on **Computer Science, Software Engineering & Tech Pathways in Pakistan**:

### 1. ICS vs. FSc Pre-Engineering:
- **Choose ICS (with Physics or Stats)** if your primary ambition is Computer Science, Software Engineering, AI, or Cybersecurity. You build algorithmic thinking early.
- **Choose FSc Pre-Engineering** if you want maximum versatility—it qualifies you for all computing fields (BS CS/SE/AI) as well as Electrical, Mechanical, and Aerospace Engineering.

### 2. Top Tier CS Universities & Admission Criteria:
1. **FAST-NUCES (Islamabad, Lahore, Karachi, Peshawar)**: The undisputed benchmark for software engineering industry hiring. Merit relies heavily on their Advanced Math test.
2. **NUST (SEECS, Islamabad)**: Top research and international mobility. Target a **NET score of 145+/200**.
3. **COMSATS (Islamabad / Lahore)**: High-quality faculty with accessible fee structures and NTS NAT test.
4. **GIKI (Topi, Swabi)**: Premier engineering labs and stellar alumni network.
5. **PUCIT / ITU Lahore**: Exceptional ROI with affordable public sector fees.

### 3. Current Pakistani IT Salary Bands (2026):
- **Entry Level / Fresh Graduate**: **PKR 80,000 – 160,000 / month**
- **Mid-Level (2–4 Years)**: **PKR 220,000 – 400,000 / month**
- **Senior Architect / Tech Lead**: **PKR 450,000 – 850,000+ / month**
- **Remote International Contracts**: **$1,500 – $4,500 / month**

Check out our **Skill Gap** and **Roadmap** tabs to discover the exact tech stacks in demand!`;
  }

  // 3. Scholarships & Financial Aid
  if (
    has('scholarship') ||
    has('fee') ||
    has('financial') ||
    has('ehsaas') ||
    has('peef') ||
    has('hec') ||
    has('اسکالرشپ') ||
    has('فیس')
  ) {
    if (isUrdu) {
      return `السلام علیکم ${name}! پاکستان میں طلبہ کے لیے دستیاب اہم **اسکالرشپس اور مالی معاونت** کی تفصیل درج ذیل ہے:

### 1. احساس انڈرگریجویٹ اسکالرشپ (HEC Need-Based):
- **اہلیت**: پبلک سیکٹر یونیورسٹی میں میرٹ پر داخلہ اور خاندانی آمدنی 45,000 روپے ماہانہ سے کم ہو۔
- **فوائد**: 100% ٹیوشن فیس معافی + 4,000 تا 5,000 روپے ماہانہ وظیفہ۔
- **درخواست**: HEC احساس پورٹل یا یونیورسٹی کے فنانشل ایڈ آفس کے ذریعے۔

### 2. صوبائی ایجوکیشن اینڈومنٹ فنڈز (PEEF / BEEF / SEEF):
- **PEEF (پنجاب)**: میٹرک یا انٹرمیڈیٹ میں کم از کم 60% نمبرز، سرکاری اسکولوں کے طلبہ اور خصوصی کیٹیگریز (یتیم، اقلیتی) کے لیے کوٹہ۔
- **BEEF (بلوچستان)** & **SEEF (سندھ)**: مقامی طلبہ کے لیے مکمل فیس سپانسرشپ۔

### 3. یونیورسٹی مخصوص میرٹ اسکالرشپس:
- **IBA کراچی نیشنل ٹیلنٹ ہنٹ پروگرام (NTHP)**: 100% مفت تعلیم، ہاسٹل اور کتابیں برائے مستحق ذہین طلبہ۔
- **LUMS نیشنل آؤٹ ریچ پروگرام (NOP)**: مکمل مفت تعلیم برائے انڈرگریجویٹ۔
- **NUST / FAST نیڈ بیسڈ فنڈز**: داخلے کے وقت مالی معاونت کی درخواست قبول کی جاتی ہے۔

NexStep کے **Scholarships** ٹیب میں جا کر اپنی صوبائی اور آمدنی کے لحاظ سے فلٹر کریں!`;
    }

    return `Assalam-o-Alaikum ${name}! Here are the most valuable **Undergraduate Scholarships in Pakistan**:

### 1. HEC Need-Based & Ehsaas Undergraduate Scholarship:
- **Eligibility**: Admitted on open merit to any participating public sector university with family income under PKR 45,000/month.
- **Coverage**: **100% full tuition waiver** plus PKR 4,000–5,000 monthly living stipend throughout degree completion.

### 2. Provincial Endowment Funds (PEEF, BEEF, SEEF):
- **PEEF (Punjab)**: Minimum 60% marks in BISE Matric/Inter, with dedicated quotas for low-income families, orphans, and minorities.
- **BEEF (Balochistan)** & **SEEF (Sindh)**: Generous scholarship grants for local domicile holders in accredited universities.

### 3. Elite Institutional Talent Hunt Programs:
- **LUMS National Outreach Program (NOP)**: 100% free undergraduate education including tuition, accommodation, and living costs.
- **IBA National Talent Hunt Program (NTHP)**: Comprehensive sponsorship for matric/inter high-achievers.
- **FAST Financial Assistance & Qarz-e-Hasna**: Interest-free deferred loans repaid after starting employment.

Visit our **Scholarships** directory tab to view deadlines, application links, and eligibility criteria!`;
  }

  // 4. TEVTA / Vocational / Free IT Courses
  if (
    has('tevta') ||
    has('free course') ||
    has('course') ||
    has('courses') ||
    has('it courses') ||
    has('navttc') ||
    has('digiskills') ||
    has('skill') ||
    has('diploma') ||
    has('ٹوٹا') ||
    has('ہنر') ||
    has('کورس')
  ) {
    if (isUrdu) {
      return `السلام علیکم ${name}! پاکستان میں **مفت تکنیکی کورسز اور TEVTA ہنر مندانہ پروگرامز** کی معلومات یہ ہیں:

### 1. پنجاب TEVTA اور سندھ TEVTA کے ٹاپ کورسز:
- **DAE (ڈپلومہ آف ایسوسی ایٹ انجینئرنگ)**: 3 سالہ ڈپلومہ (سول، الیکٹریکل، میکینکل، سی اے ڈی)—میٹرک کے بعد ڈائریکٹ انڈسٹری جاب یا بی ایس انجینئرنگ کے لیے بہترین۔
- **ای کامرس، ویب ڈویلپمنٹ اور ڈیجیٹل مارکیٹنگ**: 3 تا 6 ماہ کے سرٹیفکیٹ کورسز (فیس مفت یا انتہائی برائے نام، ساتھ وظیفہ)۔

### 2. وزیر اعظم یوتھ اسکل ڈیولپمنٹ (NAVTTC):
- **ہائی ٹیک کورسز**: کلاؤڈ کمپیوٹنگ، آرٹیفیشل انٹیلیجنس، سائبر سیکیورٹی، پائتھن پروگرامنگ۔
- **فوائد**: بالکل مفت ٹریننگ، بین الاقوامی تسلیم شدہ سرٹیفکیٹ اور باقاعدہ ماہانہ وظیفہ۔

### 3. آن لائن مفت پروگرامز:
- **DigiSkills.pk**: وزارت آئی ٹی کا پروگرام—فری لانسنگ، گرافک ڈیزائننگ، ورڈپریس اور SEO گھر بیٹھے مفت سیکھیں۔
- **PITB e-Rozgaar**: پنجاب انفارمیشن ٹیکنالوجی بورڈ کا مفت ٹریننگ پروگرام۔

NexStep کے **TEVTA & Free IT** ٹیب میں ان کے تفصیلی داخلہ شیڈول دیکھیں!`;
    }

    return `Assalam-o-Alaikum ${name}! Here is the guide to **TEVTA, NAVTTC & Government-Funded Free IT Courses in Pakistan**:

### 1. TEVTA Technical Pathways:
- **DAE (Diploma of Associate Engineer)**: 3-year practical diploma in Electrical, Mechanical, Civil, or Software Technologies. Exceptional for early employment or lateral BS Engineering entry.
- **Short Technical Certifications (3–6 months)**: CNC Machining, Mobile Repair, Solar Installation, and Industrial Automation.

### 2. NAVTTC Prime Minister’s Youth Skills Program:
- **High-Tech Emerging Tracks**: AI & Machine Learning, Full-Stack Web Development, Cloud Computing (AWS/Azure), Cyber Defense.
- **Benefits**: 100% tuition-free, official certification, and monthly transport stipend.

### 3. Premier Free Online Training Programs:
- **DigiSkills.pk (Ministry of IT)**: Master Freelancing, Graphic Design, Digital Marketing, and WordPress with zero fee.
- **PITB e-Rozgaar Center**: Dedicated tracks for Creative Design, Technical Web, and Content Marketing across 40+ university campuses.

Visit our **TEVTA** and **Courses** explorer tabs to browse full curriculum outlines!`;
  }

  // 5. Anything else: the saved answers only cover a few admission topics, so say so
  //    honestly instead of returning the same generic text for every question.
  if (isUrdu) {
    return `معذرت ${name}، اس وقت NexStep کا اے آئی ٹیوٹر دستیاب نہیں ہے، اس لیے میں آپ کے اس سوال کا تفصیلی جواب نہیں دے سکتا۔

ابھی میں صرف ان موضوعات پر محفوظ شدہ رہنمائی دے سکتا ہوں:
- **MDCAT اور میڈیکل داخلے**
- **کمپیوٹر سائنس / انجینئرنگ اور ECAT / NUST NET**
- **اسکالرشپس اور فیس**
- **TEVTA، DAE اور مفت کورسز**

براہ کرم تھوڑی دیر بعد دوبارہ پوچھیں۔ اگر مسئلہ برقرار رہے تو ایڈمن کو بتائیں کہ Gemini API کی کلید چیک کریں۔`;
  }
  return `Sorry ${name}, NexStep's AI tutor is offline right now, so I can't give a proper answer to this question.

While it's offline I can only share saved guidance on:
- **MDCAT & medical admissions**
- **Computer science / engineering, ECAT and NUST NET**
- **Scholarships & fees**
- **TEVTA, DAE and free courses**

Please try again in a little while. If this keeps happening, ask the admin to check the Gemini API key.`;
}
