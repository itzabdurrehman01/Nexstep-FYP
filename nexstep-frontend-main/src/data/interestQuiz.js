/**
 * interestQuiz.js — the NexStep interest quiz.
 *   Part 1: Holland RIASEC statements (answered on a 5-point scale)
 *           — taken from riasecQuestions.js plus extra items.
 *   Part 2: Questions about school subjects, study style and goals.
 * Each student gets a unique mix (see quizPersonalize.js). The result ranks
 * study areas and is saved to the profile as the student's interest.
 */
import { RIASEC_QUESTIONS } from './riasecQuestions.js';

export { RIASEC_QUESTIONS };

export const RIASEC_TYPES = {
  R: { en: 'Realistic', ur: 'عملی', desc: 'You like hands-on work with tools, machines and practical tasks.', descUr: 'آپ اوزاروں، مشینوں اور عملی کاموں کو پسند کرتے ہیں۔' },
  I: { en: 'Investigative', ur: 'تحقیقی', desc: 'You enjoy science, research and solving problems by thinking them through.', descUr: 'آپ سائنس، تحقیق اور سوچ بچار سے مسائل حل کرنا پسند کرتے ہیں۔' },
  A: { en: 'Artistic', ur: 'تخلیقی', desc: 'You like creating, designing, writing and expressing ideas.', descUr: 'آپ تخلیق، ڈیزائن، تحریر اور خیالات کے اظہار کو پسند کرتے ہیں۔' },
  S: { en: 'Social', ur: 'سماجی', desc: 'You enjoy helping, teaching and caring for people.', descUr: 'آپ لوگوں کی مدد، تدریس اور خدمت کو پسند کرتے ہیں۔' },
  E: { en: 'Enterprising', ur: 'قائدانہ', desc: 'You like leading, persuading, selling and starting things.', descUr: 'آپ قیادت، قائل کرنے اور نئے کام شروع کرنے کو پسند کرتے ہیں۔' },
  C: { en: 'Conventional', ur: 'منظم', desc: 'You like organised work with data, numbers and clear rules.', descUr: 'آپ ڈیٹا، اعداد اور واضح اصولوں کے ساتھ منظم کام پسند کرتے ہیں۔' },
};

export const LIKERT = [
  { value: 1, en: 'Strongly disagree', ur: 'بالکل متفق نہیں' },
  { value: 2, en: 'Disagree', ur: 'متفق نہیں' },
  { value: 3, en: 'Not sure', ur: 'یقین نہیں' },
  { value: 4, en: 'Agree', ur: 'متفق' },
  { value: 5, en: 'Strongly agree', ur: 'بالکل متفق' },
];

/** The 8 study areas the quiz recommends. */
export const AREAS = {
  medical:     { en: 'Medicine & Health', ur: 'طب اور صحت', icon: 'Stethoscope' },
  engineering: { en: 'Engineering & Physical Sciences', ur: 'انجینئرنگ اور طبیعیاتی علوم', icon: 'Cog' },
  computing:   { en: 'Computing & IT', ur: 'کمپیوٹنگ اور آئی ٹی', icon: 'Laptop' },
  business:    { en: 'Business, Commerce & Finance', ur: 'کاروبار، کامرس اور مالیات', icon: 'Briefcase' },
  humanities:  { en: 'Law, Media & Public Service', ur: 'قانون، میڈیا اور سرکاری خدمات', icon: 'Scale' },
  creative:    { en: 'Art, Design & Architecture', ur: 'آرٹ، ڈیزائن اور آرکیٹیکچر', icon: 'Palette' },
  technical:   { en: 'Technical & Vocational Trades', ur: 'تکنیکی اور ہنرمندانہ شعبے', icon: 'Wrench' },
  social:      { en: 'Education, Psychology & Social Work', ur: 'تعلیم، نفسیات اور سماجی خدمت', icon: 'HeartHandshake' },
};

/** How each RIASEC type feeds the study areas (added to the area score). */
export const RIASEC_TO_AREAS = {
  R: { technical: 2, engineering: 1.5 },
  I: { medical: 1.5, engineering: 1.5, computing: 1.5 },
  A: { creative: 2, humanities: 1 },
  S: { social: 2, medical: 1 },
  E: { business: 2, humanities: 1.5 },
  C: { business: 1.5, computing: 1 },
};

/** Part 2 — each option adds points to one or more areas. */
export const SUBJECT_QUESTIONS = [
  {
    id: 'q1', en: 'Which school subject do you enjoy the most?', ur: 'آپ کو اسکول کا کون سا مضمون سب سے زیادہ پسند ہے؟',
    options: [
      { en: 'Biology', ur: 'حیاتیات', areas: { medical: 3 } },
      { en: 'Mathematics', ur: 'ریاضی', areas: { engineering: 2, computing: 1, business: 1 } },
      { en: 'Physics', ur: 'طبیعیات', areas: { engineering: 3 } },
      { en: 'Computer Science', ur: 'کمپیوٹر سائنس', areas: { computing: 3 } },
      { en: 'Accounting / Business / Economics', ur: 'اکاؤنٹنگ / بزنس / معاشیات', areas: { business: 3 } },
      { en: 'English / Urdu literature', ur: 'انگریزی / اردو ادب', areas: { humanities: 2, social: 1 } },
      { en: 'History / Pakistan Studies / Civics', ur: 'تاریخ / مطالعہ پاکستان / شہریت', areas: { humanities: 3 } },
      { en: 'Art / Drawing', ur: 'آرٹ / ڈرائنگ', areas: { creative: 3 } },
    ],
  },
  {
    id: 'q2', en: 'In your free time you would rather…', ur: 'فارغ وقت میں آپ کیا کرنا پسند کریں گے؟',
    options: [
      { en: 'Open up and repair gadgets or machines', ur: 'آلات یا مشینیں کھول کر ٹھیک کرنا', areas: { technical: 3, engineering: 1 } },
      { en: 'Make apps, games or websites', ur: 'ایپس، گیمز یا ویب سائٹس بنانا', areas: { computing: 3 } },
      { en: 'Read about the human body and diseases', ur: 'انسانی جسم اور بیماریوں کے بارے میں پڑھنا', areas: { medical: 3 } },
      { en: 'Draw, design or edit videos', ur: 'ڈرائنگ، ڈیزائن یا ویڈیو ایڈیٹنگ', areas: { creative: 3 } },
      { en: 'Debate, write or follow the news', ur: 'مباحثہ، تحریر یا خبروں پر نظر رکھنا', areas: { humanities: 3 } },
      { en: 'Buy and sell things / plan a small business', ur: 'چیزیں خریدنا بیچنا / چھوٹا کاروبار سوچنا', areas: { business: 3 } },
      { en: 'Help or teach younger students', ur: 'چھوٹے طلبہ کی مدد یا تدریس', areas: { social: 3 } },
      { en: 'Solve puzzles and maths problems', ur: 'پہیلیاں اور ریاضی کے سوال حل کرنا', areas: { engineering: 2, computing: 1 } },
    ],
  },
  {
    id: 'q3', en: 'Which school project would you choose?', ur: 'آپ کون سا اسکول پراجیکٹ چنیں گے؟',
    options: [
      { en: 'A science experiment on plants or the human body', ur: 'پودوں یا انسانی جسم پر سائنسی تجربہ', areas: { medical: 3 } },
      { en: 'A working model, robot or bridge', ur: 'کام کرنے والا ماڈل، روبوٹ یا پل', areas: { engineering: 3 } },
      { en: 'A website or mobile app', ur: 'ویب سائٹ یا موبائل ایپ', areas: { computing: 3 } },
      { en: 'A business plan for a school tuck shop', ur: 'اسکول کینٹین کا کاروباری منصوبہ', areas: { business: 3 } },
      { en: 'A poster, short film or magazine', ur: 'پوسٹر، مختصر فلم یا رسالہ', areas: { creative: 3 } },
      { en: 'A debate or essay on a social issue', ur: 'کسی سماجی مسئلے پر مباحثہ یا مضمون', areas: { humanities: 2, social: 1 } },
      { en: 'Wiring a solar light or fixing a motor', ur: 'سولر لائٹ کی وائرنگ یا موٹر ٹھیک کرنا', areas: { technical: 3 } },
      { en: 'Organising a charity or awareness drive', ur: 'خیراتی یا آگاہی مہم کا انتظام', areas: { social: 3 } },
    ],
  },
  {
    id: 'q4', en: 'How do you learn best?', ur: 'آپ سب سے بہتر کیسے سیکھتے ہیں؟',
    options: [
      { en: 'Learning and remembering detailed facts', ur: 'تفصیلی حقائق سیکھنا اور یاد رکھنا', areas: { medical: 2, humanities: 1 } },
      { en: 'Solving numerical problems step by step', ur: 'عددی سوال مرحلہ وار حل کرنا', areas: { engineering: 2, computing: 1 } },
      { en: 'Trying things on a computer until they work', ur: 'کمپیوٹر پر آزما کر سیکھنا', areas: { computing: 3 } },
      { en: 'Discussing ideas and reading', ur: 'خیالات پر گفتگو اور مطالعہ', areas: { humanities: 2, social: 1 } },
      { en: 'Hands-on practical work in a lab or workshop', ur: 'لیب یا ورکشاپ میں عملی کام', areas: { technical: 3 } },
      { en: 'Creative projects with my own ideas', ur: 'اپنے خیالات کے ساتھ تخلیقی پراجیکٹ', areas: { creative: 3 } },
      { en: 'Real examples about money, markets and people', ur: 'پیسے، مارکیٹ اور لوگوں کی حقیقی مثالیں', areas: { business: 3 } },
      { en: 'Working in a group and helping others', ur: 'گروپ میں کام اور دوسروں کی مدد', areas: { social: 3 } },
    ],
  },
  {
    id: 'q5', en: 'Where would you like to work one day?', ur: 'آپ مستقبل میں کہاں کام کرنا چاہیں گے؟',
    options: [
      { en: 'Hospital, clinic or pharmacy', ur: 'ہسپتال، کلینک یا فارمیسی', areas: { medical: 3 } },
      { en: 'Construction site, factory or power plant', ur: 'تعمیراتی سائٹ، فیکٹری یا بجلی گھر', areas: { engineering: 2, technical: 1 } },
      { en: 'Software house or IT company', ur: 'سافٹ ویئر ہاؤس یا آئی ٹی کمپنی', areas: { computing: 3 } },
      { en: 'Bank, office or my own business', ur: 'بینک، دفتر یا اپنا کاروبار', areas: { business: 3 } },
      { en: 'Court, TV channel or government office', ur: 'عدالت، ٹی وی چینل یا سرکاری دفتر', areas: { humanities: 3 } },
      { en: 'Design studio or advertising agency', ur: 'ڈیزائن اسٹوڈیو یا اشتہاری ایجنسی', areas: { creative: 3 } },
      { en: 'Workshop or in the field fixing things', ur: 'ورکشاپ یا فیلڈ میں مرمت کا کام', areas: { technical: 3 } },
      { en: 'School, college or community centre', ur: 'اسکول، کالج یا کمیونٹی سینٹر', areas: { social: 3 } },
    ],
  },
  {
    id: 'q6', en: 'Which marks are usually your best?', ur: 'آپ کے سب سے اچھے نمبر عموماً کس میں آتے ہیں؟',
    options: [
      { en: 'Biology and Chemistry', ur: 'حیاتیات اور کیمسٹری', areas: { medical: 3 } },
      { en: 'Mathematics and Physics', ur: 'ریاضی اور طبیعیات', areas: { engineering: 3 } },
      { en: 'Computer Science and Mathematics', ur: 'کمپیوٹر سائنس اور ریاضی', areas: { computing: 3 } },
      { en: 'Accounting, Economics or Business', ur: 'اکاؤنٹنگ، معاشیات یا بزنس', areas: { business: 3 } },
      { en: 'English, Urdu or Social Studies', ur: 'انگریزی، اردو یا معاشرتی علوم', areas: { humanities: 2, social: 1 } },
      { en: 'Practicals and lab work more than written papers', ur: 'تحریری پرچوں سے زیادہ عملی کام', areas: { technical: 3 } },
      { en: 'Art and drawing', ur: 'آرٹ اور ڈرائنگ', areas: { creative: 3 } },
    ],
  },
  {
    id: 'q7', en: 'How do you feel about mathematics?', ur: 'ریاضی کے بارے میں آپ کیا محسوس کرتے ہیں؟',
    options: [
      { en: 'I love it and I am good at it', ur: 'مجھے بہت پسند ہے اور میں اچھا ہوں', areas: { engineering: 2, computing: 2, business: 1 } },
      { en: 'It is okay — I can manage', ur: 'ٹھیک ہے، گزارا ہو جاتا ہے', areas: { medical: 1, business: 1, technical: 1 } },
      { en: 'I prefer to avoid it', ur: 'میں اس سے بچنا پسند کرتا ہوں', areas: { humanities: 1.5, creative: 1.5, social: 1.5 } },
    ],
  },
  {
    id: 'q8', en: 'How long do you want to study before you start working?', ur: 'کام شروع کرنے سے پہلے آپ کتنا عرصہ پڑھنا چاہتے ہیں؟',
    pathway: true,
    options: [
      { en: 'A short course, then start earning soon (under 1 year)', ur: 'مختصر کورس، پھر جلد کمائی (ایک سال سے کم)', areas: { technical: 3 }, path: 'vocational' },
      { en: 'A 3-year diploma (DAE)', ur: 'تین سالہ ڈپلومہ (DAE)', areas: { technical: 2, engineering: 1 }, path: 'diploma' },
      { en: 'A 4-year bachelor degree (BS)', ur: 'چار سالہ بیچلر ڈگری (BS)', areas: { computing: 1, business: 1, social: 1 }, path: 'degree' },
      { en: 'A 5+ year professional degree (MBBS, LLB, B.Arch)', ur: 'پانچ سال یا زیادہ کی پیشہ ورانہ ڈگری (MBBS، LLB، B.Arch)', areas: { medical: 1.5, humanities: 1, creative: 0.5 }, path: 'professional' },
    ],
  },
  {
    id: 'q9', en: 'Which achievement would make you proudest?', ur: 'کون سی کامیابی آپ کو سب سے زیادہ فخر دے گی؟',
    options: [
      { en: 'Treating patients and saving lives', ur: 'مریضوں کا علاج اور جانیں بچانا', areas: { medical: 3 } },
      { en: 'Designing a machine, bridge or power system', ur: 'مشین، پل یا بجلی کا نظام ڈیزائن کرنا', areas: { engineering: 3 } },
      { en: 'Launching an app used by thousands', ur: 'ہزاروں لوگوں کے استعمال کی ایپ بنانا', areas: { computing: 3 } },
      { en: 'Building my own successful company', ur: 'اپنی کامیاب کمپنی بنانا', areas: { business: 3 } },
      { en: 'Winning a court case or becoming a CSS officer', ur: 'مقدمہ جیتنا یا سی ایس ایس افسر بننا', areas: { humanities: 3 } },
      { en: 'Designing a famous brand, building or film', ur: 'مشہور برانڈ، عمارت یا فلم ڈیزائن کرنا', areas: { creative: 3 } },
      { en: 'Installing solar power for homes in my area', ur: 'اپنے علاقے کے گھروں میں سولر لگانا', areas: { technical: 3 } },
      { en: 'Teaching children or counselling people', ur: 'بچوں کو پڑھانا یا لوگوں کی رہنمائی', areas: { social: 3 } },
    ],
  },
  {
    id: 'q10', en: 'Which of these careers sounds the most exciting?', ur: 'ان میں سے کون سا کیریئر سب سے دلچسپ لگتا ہے؟',
    options: [
      { en: 'Doctor, dentist or pharmacist', ur: 'ڈاکٹر، ڈینٹسٹ یا فارماسسٹ', areas: { medical: 3 } },
      { en: 'Engineer or architect', ur: 'انجینئر یا آرکیٹیکٹ', areas: { engineering: 2.5, creative: 0.5 } },
      { en: 'Software developer or data scientist', ur: 'سافٹ ویئر ڈویلپر یا ڈیٹا سائنٹسٹ', areas: { computing: 3 } },
      { en: 'Accountant, banker or entrepreneur', ur: 'اکاؤنٹنٹ، بینکر یا کاروباری', areas: { business: 3 } },
      { en: 'Lawyer, journalist or civil servant', ur: 'وکیل، صحافی یا سرکاری افسر', areas: { humanities: 3 } },
      { en: 'Graphic designer or animator', ur: 'گرافک ڈیزائنر یا اینیمیٹر', areas: { creative: 3 } },
      { en: 'Electrician, mechanic or technician', ur: 'الیکٹریشن، مکینک یا ٹیکنیشن', areas: { technical: 3 } },
      { en: 'Teacher or psychologist', ur: 'استاد یا ماہر نفسیات', areas: { social: 3 } },
    ],
  },
];

/**
 * Level-specific next steps for each area.
 * links: tab ids the result page offers as buttons.
 */
export const RECOMMENDATIONS = {
  class8: {
    medical:     { title: 'Matric: Science (Biology) group', text: 'Biology, Chemistry and Physics keep the medical route open (FSc Pre-Medical → MBBS, BDS, Pharm-D, Nursing).', links: ['grade8Matric', 'degreeCareer'] },
    engineering: { title: 'Matric: Science group (Computer Science or Biology)', text: 'Take Mathematics and Physics seriously — they lead to FSc Pre-Engineering or DAE and then engineering.', links: ['grade8Matric', 'degreeCareer'] },
    computing:   { title: 'Matric: Science (Computer Science) group', text: 'Computer Science with Mathematics leads to ICS or Pre-Engineering and then BS Computer Science / Software Engineering.', links: ['grade8Matric', 'degreeCareer'] },
    business:    { title: 'Matric: Science (Computer) or Humanities with Mathematics', text: 'Keep Mathematics — it leads to ICom, then BBA, Accounting (CA/ACCA) or Economics.', links: ['grade8Matric', 'degreeCareer'] },
    humanities:  { title: 'Matric: Humanities / Arts group', text: 'Leads to FA and then law (LLB), media, international relations or civil services.', links: ['grade8Matric', 'degreeCareer'] },
    creative:    { title: 'Matric: Humanities / Arts group (with Art or Computer)', text: 'Leads to FA with Fine Arts or to A-Levels Art, then design, architecture or media.', links: ['grade8Matric', 'degreeCareer'] },
    technical:   { title: 'Matric: Technical group or Science', text: 'After Matric you can join DAE (3-year diploma) or a TEVTA trade course and start earning sooner.', links: ['grade8Matric', 'tevtaIt'] },
    social:      { title: 'Matric: Humanities or Science (Biology)', text: 'Leads to FA / Pre-Medical and then education, psychology, nursing or social work.', links: ['grade8Matric', 'degreeCareer'] },
  },
  matric: {
    medical:     { title: 'Inter: FSc Pre-Medical', text: 'Then MDCAT for MBBS / BDS, or Pharm-D, DPT, Nursing and allied health degrees.', links: ['fscMapper', 'careerAi', 'scholarships'] },
    engineering: { title: 'Inter: FSc Pre-Engineering (or DAE)', text: 'Then ECAT / NUST NET for BE / BSc Engineering. DAE is a practical 3-year route with lateral entry later.', links: ['fscMapper', 'careerAi', 'tevtaIt'] },
    computing:   { title: 'Inter: ICS (or FSc Pre-Engineering)', text: 'Then BS Computer Science, Software Engineering, AI or Data Science through NTS-NAT / NET / university tests.', links: ['fscMapper', 'careerAi'] },
    business:    { title: 'Inter: ICom (or ICS with Statistics)', text: 'Then BBA, BS Accounting & Finance, Economics, or CA / ACCA professional exams.', links: ['fscMapper', 'careerAi'] },
    humanities:  { title: 'Inter: FA / Humanities', text: 'Then LLB (5 years), Mass Communication, International Relations or BS English — and CSS later.', links: ['fscMapper', 'careerAi'] },
    creative:    { title: 'Inter: FA (Fine Arts) or A-Levels', text: 'Then BFA, Graphic Design or Architecture — most art schools hold an aptitude test.', links: ['fscMapper', 'careerAi'] },
    technical:   { title: 'DAE diploma or a TEVTA trade', text: 'A 3-year DAE or a 3–12 month TEVTA course (many pay a stipend) leads to skilled jobs quickly.', links: ['tevtaIt', 'careerAi', 'scholarships'] },
    social:      { title: 'Inter: FA (Psychology / Education) or Pre-Medical', text: 'Then BS Psychology, Education, Social Work or Nursing.', links: ['fscMapper', 'careerAi'] },
  },
  inter: {
    medical:     { title: 'Degrees: MBBS, BDS, Pharm-D, DPT, Nursing', text: 'Prepare for MDCAT (or NUMS). Check public and private medical college merit lists.', links: ['careerAi', 'universities', 'entryTestPrep', 'meritCalculator'] },
    engineering: { title: 'Degrees: BE / BSc Engineering (Civil, Electrical, Mechanical…)', text: 'Prepare for ECAT, NUST NET or ETEA and compare engineering universities.', links: ['careerAi', 'universities', 'entryTestPrep', 'meritCalculator'] },
    computing:   { title: 'Degrees: BS Computer Science, Software Engineering, AI, Data Science', text: 'Prepare for NTS-NAT, NUST NET or FAST tests. Start a small coding portfolio now.', links: ['careerAi', 'universities', 'entryTestPrep', 'courses'] },
    business:    { title: 'Degrees: BBA, Accounting & Finance, Economics, CA / ACCA', text: 'Compare business schools and professional routes; many have their own admission tests.', links: ['careerAi', 'universities', 'scholarships'] },
    humanities:  { title: 'Degrees: LLB, Mass Communication, International Relations, English', text: 'Law needs the LAT test. A strong English and general-knowledge base helps for CSS later.', links: ['careerAi', 'universities', 'scholarships'] },
    creative:    { title: 'Degrees: BFA, Design, Architecture, Media', text: 'Build a portfolio and prepare for aptitude tests (NCA, BNU, IVS and others).', links: ['careerAi', 'universities'] },
    technical:   { title: 'BSc Engineering Technology or a skills route', text: 'Engineering technology degrees and NAVTTC / TEVTA programmes lead to practical careers.', links: ['careerAi', 'universities', 'tevtaIt'] },
    social:      { title: 'Degrees: Psychology, Education, Social Work, Nursing', text: 'Look for universities offering these programmes and related scholarships.', links: ['careerAi', 'universities', 'scholarships'] },
  },
  dae: {
    medical:     { title: 'Allied health and lab technology', text: 'Consider medical lab, biomedical or health technology programmes and certifications.', links: ['careerAi', 'courses', 'jobs'] },
    engineering: { title: 'BSc Engineering Technology / BE (lateral entry)', text: 'DAE holders can join engineering technology degrees, or start as a sub-engineer.', links: ['careerAi', 'universities', 'jobs'] },
    computing:   { title: 'BS IT / Computer Science or IT certifications', text: 'Free certifications (Google, Cisco, DigiSkills) plus a degree open software and networking jobs.', links: ['careerAi', 'courses', 'jobs'] },
    business:    { title: 'Supervisory roles, BBA or your own workshop', text: 'Combine your technical diploma with business skills or a BBA.', links: ['careerAi', 'courses', 'jobs'] },
    humanities:  { title: 'Technical training, teaching or public sector', text: 'Consider technical teaching, training roles or public-sector technical jobs.', links: ['careerAi', 'jobs'] },
    creative:    { title: 'CAD, 3D design and drafting', text: 'AutoCAD, 3D modelling and product design build on a DAE well.', links: ['careerAi', 'courses'] },
    technical:   { title: 'Skilled jobs and advanced trade certificates', text: 'Look at jobs for technicians and advanced TEVTA / NAVTTC certifications.', links: ['jobs', 'tevtaIt', 'courses'] },
    social:      { title: 'Technical teaching and training', text: 'Instructor roles at technical institutes suit people who like helping others learn.', links: ['careerAi', 'jobs'] },
  },
  university: {
    medical:     { title: 'Health careers, house job, FCPS / MS', text: 'Plan your specialisation and look at postgraduate scholarships.', links: ['careerAi', 'scholarships', 'jobs'] },
    engineering: { title: 'Engineering jobs, PEC registration, MS', text: 'Build internships and consider MS abroad with funded scholarships.', links: ['careerAi', 'jobs', 'scholarships'] },
    computing:   { title: 'Software, data and cloud careers', text: 'Add free certifications and a project portfolio; apply for internships.', links: ['careerAi', 'courses', 'jobs', 'skillGap'] },
    business:    { title: 'Finance, marketing and management careers', text: 'Consider CA/ACCA, MBA later and management trainee programmes.', links: ['careerAi', 'jobs', 'courses'] },
    humanities:  { title: 'Law, media, policy and CSS', text: 'Prepare for CSS/PMS or the bar; build writing and research experience.', links: ['careerAi', 'jobs', 'scholarships'] },
    creative:    { title: 'Design, architecture and media careers', text: 'Grow your portfolio; freelancing and studio jobs are common starts.', links: ['careerAi', 'courses', 'jobs'] },
    technical:   { title: 'Technical specialist and field roles', text: 'Professional certifications and field experience lead to senior technical roles.', links: ['careerAi', 'courses', 'jobs'] },
    social:      { title: 'Teaching, counselling and development work', text: 'Look at MPhil options, NGO roles and teaching positions.', links: ['careerAi', 'jobs', 'scholarships'] },
  },
};

export const recommendationGroup = (level) =>
  level === 'class8' ? 'class8' : level === 'class9' || level === 'class10' ? 'matric'
    : level === 'class11' || level === 'class12' ? 'inter' : level === 'dae' ? 'dae' : level === 'university' ? 'university' : 'matric';

/** Scores the answers. riasecAnswers: { [questionId]: 1..5 }, subjectAnswers: { [qid]: optionIndex } */
export function scoreQuiz(riasecAnswers, subjectAnswers) {
  const riasec = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  const counts = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  for (const q of RIASEC_QUESTIONS) {
    const v = riasecAnswers[q.id];
    if (v) { riasec[q.category] += v; counts[q.category] += 1; }
  }
  // percentage of the maximum (5 points × number of questions of that type)
  const riasecPct = Object.fromEntries(Object.keys(riasec).map((k) => [k, counts[k] ? Math.round((riasec[k] / (counts[k] * 5)) * 100) : 0]));
  const code = Object.keys(riasecPct).sort((a, b) => riasecPct[b] - riasecPct[a]).slice(0, 3).join('');

  const areas = Object.fromEntries(Object.keys(AREAS).map((k) => [k, 0]));
  let pathway = null;
  for (const q of SUBJECT_QUESTIONS) {
    const idx = subjectAnswers[q.id];
    const opt = q.options[idx];
    if (!opt) continue;
    for (const [a, pts] of Object.entries(opt.areas)) areas[a] += pts;
    if (q.pathway) pathway = opt.path;
  }
  // RIASEC adds up to ~3 points per type, weighted by how strongly it scored
  for (const [type, map] of Object.entries(RIASEC_TO_AREAS)) {
    for (const [a, w] of Object.entries(map)) areas[a] += (riasecPct[type] / 100) * w * 2;
  }
  const max = Math.max(...Object.values(areas), 1);
  const areaPct = Object.fromEntries(Object.entries(areas).map(([k, v]) => [k, Math.round((v / max) * 100)]));
  const ranked = Object.keys(areaPct).sort((a, b) => areaPct[b] - areaPct[a]);
  return { riasecPct, code, areaPct, ranked, pathway };
}
