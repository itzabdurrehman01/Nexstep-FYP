/**
 * levelGuides.js — general guidance for each stage of the Pakistani education system.
 *
 * Deliberately limited to stable, general facts (structure, pathways, test names,
 * official bodies). No dates, fees, cut-offs, seat counts or marks distributions:
 * those change every year and must come from the admin-managed listings or the
 * official sources linked below.
 */

const SOURCES = {
  fbise: { name: 'Federal Board (FBISE)', url: 'https://www.fbise.edu.pk' },
  ibcc: { name: 'IBCC — equivalence of O/A-Levels & foreign certificates', url: 'https://www.ibcc.edu.pk' },
  hec: { name: 'Higher Education Commission (HEC)', url: 'https://www.hec.gov.pk' },
  pmdc: { name: 'Pakistan Medical & Dental Council (PM&DC)', url: 'https://pmdc.pk' },
  pec: { name: 'Pakistan Engineering Council (PEC)', url: 'https://www.pec.org.pk' },
  navttc: { name: 'NAVTTC — national technical & vocational training', url: 'https://navttc.gov.pk' },
  digiskills: { name: 'DigiSkills.pk — free online skills training', url: 'https://digiskills.pk' },
  fpsc: { name: 'Federal Public Service Commission (FPSC)', url: 'https://www.fpsc.gov.pk' },
  nts: { name: 'National Testing Service (NTS)', url: 'https://www.nts.org.pk' },
};

const MATRIC_OPTIONS = [
  { title: 'FSc Pre-Medical', leadsTo: 'MBBS, BDS (via MDCAT), Pharm-D, DPT, nursing, BS biology, biotechnology, food & agriculture sciences.', needs: 'Matric Science with Biology.' },
  { title: 'FSc Pre-Engineering', leadsTo: 'BE / BSc engineering (via ECAT, NET and university tests), BS computer science, mathematics, physics, architecture.', needs: 'Matric Science (Biology or Computer Science).' },
  { title: 'ICS (Computer Science)', leadsTo: 'BS computer science, software engineering, IT, data science, mathematics and statistics.', needs: 'Usually Matric Science; some colleges also accept other groups with mathematics.' },
  { title: 'ICom (Commerce)', leadsTo: 'BCom, BBA, accounting and finance, professional routes such as CA, ACCA and banking.', needs: 'Open to most Matric groups.' },
  { title: 'FA / Humanities', leadsTo: 'BS / BA in social sciences, languages, media and journalism, psychology, education, fine arts, LLB (5 years) and civil-service preparation.', needs: 'Open to all Matric groups.' },
  { title: 'DAE (3-year diploma)', leadsTo: 'Associate engineer jobs, or a 4-year BSc / B.Tech engineering technology degree afterwards.', needs: 'Matric (Science preferred), at a government or private polytechnic institute.' },
  { title: 'A-Levels', leadsTo: 'Same university options as Intermediate once IBCC equivalence is obtained, plus easier admission abroad.', needs: 'O-Levels or Matric; mainly private schools.' },
];

export const LEVEL_GUIDES = {
  class8: {
    title: 'Class 8 — choosing your Matric group',
    summary: 'Next year you start Matric (Class 9). The group you choose decides which Intermediate groups — and later which degrees — stay open to you.',
    focus: [
      'Build strong basics in Mathematics, English and Science; every later stage depends on them.',
      'Take the interest quiz to see whether you lean towards science, computers, business or arts.',
      'Talk to your teachers and family about the Matric groups your school offers.',
    ],
    options: [
      { title: 'Science (Biology)', leadsTo: 'Keeps medical (Pre-Medical) and engineering (Pre-Engineering) open after Matric.', needs: 'Physics, Chemistry, Mathematics and Biology.' },
      { title: 'Science (Computer Science)', leadsTo: 'Pre-Engineering or ICS after Matric; computer science and engineering degrees later.', needs: 'Physics, Chemistry, Mathematics and Computer Science.' },
      { title: 'Humanities / Arts', leadsTo: 'FA or ICom after Matric; social sciences, business, law and media later.', needs: 'General subjects with electives chosen by your school.' },
      { title: 'Technical / vocational Matric', leadsTo: 'DAE or skills training after Matric, where offered by your board.', needs: 'Available only at some schools and boards.' },
      { title: 'O-Levels (Cambridge)', leadsTo: 'A-Levels or local Intermediate; IBCC equivalence is needed for local admissions.', needs: 'Offered by private schools.' },
    ],
    exams: [],
    tips: [
      'Choosing Biology now keeps the medical route open; switching into Pre-Medical later without it is usually not possible.',
      'Science groups keep the most options open, but choose what you can actually enjoy and do well in.',
    ],
    sources: [SOURCES.fbise, SOURCES.ibcc],
  },
  class9: {
    title: 'Class 9 — Matric Part I (SSC-I)',
    summary: 'Matric is two years of board exams: Part I in Class 9 and Part II in Class 10, conducted by your provincial / area Board of Intermediate and Secondary Education (BISE) or the Federal Board.',
    focus: [
      'Your Class 9 board result counts towards your final Matric result, so treat it seriously.',
      'Many universities use Matric marks in their admission merit later, alongside Intermediate and entry-test scores.',
      'Start exploring which Intermediate group fits your interests and marks.',
    ],
    options: MATRIC_OPTIONS,
    exams: ['SSC Part I annual board exam (BISE / FBISE)'],
    tips: ['Practise with past papers from your own board — paper patterns differ between boards.'],
    sources: [SOURCES.fbise, SOURCES.ibcc],
  },
  class10: {
    title: 'Class 10 — Matric Part II (SSC-II)',
    summary: 'This year finishes Matric. After the result you apply to colleges for an Intermediate group, to a polytechnic for DAE, or continue to A-Levels.',
    focus: [
      'Decide your Intermediate group before results come out so you can apply to colleges quickly.',
      'Check the admission criteria of the colleges you want — government colleges usually admit on Matric merit.',
      'If Part I marks were low, ask your board about improvement exams.',
    ],
    options: MATRIC_OPTIONS,
    exams: ['SSC Part II annual board exam (BISE / FBISE)'],
    tips: [
      'Medical (MBBS/BDS) requires FSc Pre-Medical (or an equivalent A-Level combination).',
      'Engineering degrees normally require Pre-Engineering (or ICS at some universities). Check that the programme is PEC-accredited.',
    ],
    sources: [SOURCES.fbise, SOURCES.ibcc, SOURCES.navttc],
  },
  class11: {
    title: 'Class 11 — Intermediate Part I (HSSC-I, 1st year)',
    summary: 'Intermediate (FSc, ICS, ICom, FA) is two years of board exams. Its result, together with Matric and an entry test, decides most university admissions.',
    focus: [
      'Your 1st-year result is part of your Intermediate total — keep it strong.',
      'Shortlist degree programmes and the entry tests they need, so preparation starts early.',
      'Check scholarships that open for Intermediate students and first-year university students.',
    ],
    options: [
      { title: 'Medical & dental', leadsTo: 'MBBS / BDS through MDCAT; also Pharm-D, DPT, nursing and allied health.', needs: 'FSc Pre-Medical.' },
      { title: 'Engineering', leadsTo: 'BE / BSc engineering through ECAT, NUST NET and universities’ own tests.', needs: 'FSc Pre-Engineering (ICS at some universities).' },
      { title: 'Computing', leadsTo: 'BS CS, software engineering, AI, data science, cyber security.', needs: 'ICS or Pre-Engineering; some universities accept Pre-Medical with additional maths.' },
      { title: 'Business & commerce', leadsTo: 'BBA, BS accounting & finance, economics; CA / ACCA routes.', needs: 'ICom, ICS, FSc or FA depending on the university.' },
      { title: 'Social sciences, arts & law', leadsTo: 'BS psychology, mass communication, English, international relations, LLB (5 years), fine arts.', needs: 'Any Intermediate group for most programmes.' },
      { title: 'Study abroad', leadsTo: 'Undergraduate admission abroad; most countries ask for an English test such as IELTS.', needs: 'Strong Intermediate or A-Level results.' },
    ],
    exams: [
      'HSSC Part I annual board exam',
      'MDCAT — for MBBS / BDS (regulated by PM&DC)',
      'ECAT — UET and public engineering universities in Punjab',
      'NUST NET, and admission tests of FAST, GIKI, PIEAS and other universities',
      'NTS NAT / other aptitude tests used by some universities',
    ],
    tips: [
      'University merit usually combines Matric, Intermediate and entry-test marks with different weights — check each university’s formula.',
      'A-Level students need an IBCC equivalence certificate before applying to Pakistani universities.',
    ],
    sources: [SOURCES.hec, SOURCES.pmdc, SOURCES.pec, SOURCES.ibcc, SOURCES.nts],
  },
  class12: {
    title: 'Class 12 — Intermediate Part II (HSSC-II, 2nd year)',
    summary: 'Your final school year: board exams, entry tests and university applications usually overlap, so plan the year carefully.',
    focus: [
      'Register for the entry tests you need on time — registration often closes before board exams end.',
      'Prepare a shortlist of universities in three groups: ambitious, realistic and safe.',
      'Keep copies of your Matric and Intermediate documents, CNIC / B-Form and domicile ready for applications.',
    ],
    options: [
      { title: 'Medical & dental', leadsTo: 'MBBS / BDS through MDCAT; also Pharm-D, DPT, nursing and allied health.', needs: 'FSc Pre-Medical.' },
      { title: 'Engineering', leadsTo: 'BE / BSc engineering through ECAT, NUST NET and universities’ own tests.', needs: 'FSc Pre-Engineering (ICS at some universities).' },
      { title: 'Computing', leadsTo: 'BS CS, software engineering, AI, data science, cyber security.', needs: 'ICS or Pre-Engineering.' },
      { title: 'Business & commerce', leadsTo: 'BBA, BS accounting & finance, economics; CA / ACCA routes.', needs: 'Depends on the university.' },
      { title: 'Social sciences, arts & law', leadsTo: 'BS programmes in humanities and social sciences, LLB (5 years), fine arts.', needs: 'Any Intermediate group for most programmes.' },
      { title: 'Skills route', leadsTo: 'Short professional courses (IT, freelancing, trades) alongside or instead of a degree.', needs: 'Open to all.' },
    ],
    exams: [
      'HSSC Part II annual board exam',
      'MDCAT, ECAT, NUST NET and other university admission tests',
      'IELTS / similar English test if applying abroad',
    ],
    tips: [
      'Many universities give provisional admission on Part I marks — check whether yours do.',
      'Apply for need-based scholarships at the same time as admissions; many are linked to the university you join.',
    ],
    sources: [SOURCES.hec, SOURCES.pmdc, SOURCES.pec, SOURCES.ibcc, SOURCES.nts],
  },
  dae: {
    title: 'DAE — Diploma of Associate Engineer',
    summary: 'A 3-year technical diploma after Matric, offered by government and private polytechnic institutes and examined by provincial boards of technical education.',
    focus: [
      'Build hands-on skills in your technology and keep a record of your practical work.',
      'Look for internships / apprenticeships in your final year.',
      'Decide whether you will start work or continue to a degree after the diploma.',
    ],
    options: [
      { title: 'Associate engineer jobs', leadsTo: 'Technician and associate / sub-engineer roles in industry, construction, power and telecom.', needs: 'Completed DAE.' },
      { title: 'BSc / B.Tech engineering technology', leadsTo: 'A 4-year engineering technology degree; programmes are accredited by the National Technology Council (NTC).', needs: 'DAE in a related technology.' },
      { title: 'BE / BSc engineering', leadsTo: 'Some engineering universities reserve seats for DAE holders.', needs: 'Good DAE marks and the university’s entry test.' },
      { title: 'Short courses & certifications', leadsTo: 'Specialised skills through NAVTTC and industry certifications.', needs: 'Open to diploma holders.' },
    ],
    exams: ['Annual / semester exams of your provincial board of technical education', 'University entry tests if you continue to a degree'],
    tips: ['Check whether a degree is NTC- or PEC-accredited before you join — this affects jobs and registration later.'],
    sources: [SOURCES.navttc, SOURCES.hec, SOURCES.pec],
  },
  university: {
    title: 'University — undergraduate (BS) degree',
    summary: 'Degree years are about building skills, experience and a network for your first job or further study.',
    focus: [
      'Make sure your degree programme and university are HEC-recognised.',
      'Do at least one internship before graduating; build projects and a portfolio.',
      'Prepare a strong resume and practise interviews well before your final semester.',
    ],
    options: [
      { title: 'Private-sector jobs', leadsTo: 'Graduate trainee, management trainee and entry-level roles.', needs: 'Degree, internships and a good resume.' },
      { title: 'Government jobs', leadsTo: 'CSS through FPSC and provincial service commissions (PPSC, SPSC, KPPSC, BPSC).', needs: 'A bachelor’s degree; age limits and other rules apply.' },
      { title: 'MS / MPhil in Pakistan', leadsTo: 'Research and specialist roles, university teaching.', needs: 'A 16-year degree and the university’s graduate admission test (for example HEC’s or NTS’s tests).' },
      { title: 'Study abroad', leadsTo: 'Master’s and PhD abroad, often with scholarships such as HEC overseas scholarships, Fulbright, Chevening, Commonwealth, DAAD or Erasmus Mundus.', needs: 'Strong CGPA, English test, research or work experience.' },
      { title: 'Freelancing & entrepreneurship', leadsTo: 'Remote work and your own business.', needs: 'In-demand skills and a portfolio.' },
    ],
    exams: ['Semester exams and final-year project', 'CSS / provincial service exams (for government jobs)', 'Graduate admission tests and IELTS / GRE (for further study)'],
    tips: ['Free government programmes such as DigiSkills.pk can add practical, job-ready skills alongside your degree.'],
    sources: [SOURCES.hec, SOURCES.fpsc, SOURCES.digiskills, SOURCES.nts],
  },
};
