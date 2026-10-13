/**
 * Official websites students can open directly. Used when a listing has no URL
 * (or a placeholder) so every university / scholarship still has a real link.
 */
const isHttp = (u: unknown) => typeof u === 'string' && /^https?:\/\/\S+$/i.test(u.trim());

const UNIVERSITY_SITES: [RegExp, string][] = [
  [/nust/i, 'https://nust.edu.pk'],
  [/fast|nuces/i, 'https://nu.edu.pk'],
  [/lums/i, 'https://lums.edu.pk'],
  [/comsats/i, 'https://www.comsats.edu.pk'],
  [/pieas/i, 'https://www.pieas.edu.pk'],
  [/giki/i, 'https://giki.edu.pk'],
  [/iba\b.*karachi|karachi.*iba/i, 'https://www.iba.edu.pk'],
  [/\biba\b/i, 'https://www.iba.edu.pk'],
  [/aga khan|\bakuh\b/i, 'https://www.aku.edu'],
  [/university of the punjab|\bpu\b/i, 'https://pu.edu.pk'],
  [/punjab university/i, 'https://pu.edu.pk'],
  [/quetta/i, 'https://www.uob.edu.pk'],
  [/karachi university|university of karachi|\buok\b/i, 'https://uok.edu.pk'],
  [/peshawar/i, 'https://www.uop.edu.pk'],
  [/university of engineering.*lahore|\buet lahore/i, 'https://uet.edu.pk'],
  [/\buet\b/i, 'https://uet.edu.pk'],
  [/ned university/i, 'https://www.neduet.edu.pk'],
  [/air university/i, 'https://au.edu.pk'],
  [/bahria/i, 'https://www.bahria.edu.pk'],
  [/riphah/i, 'https://www.riphah.edu.pk'],
  [/szabist/i, 'https://www.szabist.edu.pk'],
  [/itu\b|information technology university/i, 'https://itu.edu.pk'],
  [/qau|quaidi?[- ]?azam/i, 'https://qau.edu.pk'],
  [/numl/i, 'https://www.numl.edu.pk'],
  [/iiui|international islamic/i, 'https://www.iiu.edu.pk'],
  [/nca\b|national college of arts/i, 'https://www.nca.edu.pk'],
  [/uvas/i, 'https://www.uvas.edu.pk'],
  [/king edward/i, 'https://www.kemu.edu.pk'],
  [/dow university/i, 'https://www.duhs.edu.pk'],
  [/aga khan/i, 'https://www.aku.edu'],
  [/habib university/i, 'https://habib.edu.pk'],
  [/iba sukkur|sukkur/i, 'https://www.iba-suk.edu.pk'],
  [/university of lahore|\bul\b/i, 'https://www.uol.edu.pk'],
  [/umt\b|management and technology/i, 'https://www.umt.edu.pk'],
  [/ucp|central punjab/i, 'https://www.ucp.edu.pk'],
  [/gift university/i, 'https://gift.edu.pk'],
  [/bzu|bahauddin/i, 'https://www.bzu.edu.pk'],
  [/gc university|gcu lahore/i, 'https://www.gcu.edu.pk'],
  [/fccu|forman/i, 'https://www.fccollege.edu.pk'],
  [/kinnaird/i, 'https://www.kinnaird.edu.pk'],
  [/lcwu|lahore college/i, 'https://www.lcwu.edu.pk'],
  [/aiou|allama iqbal open/i, 'https://www.aiou.edu.pk'],
  [/vu\b|virtual university/i, 'https://www.vu.edu.pk'],
  [/namal/i, 'https://namal.edu.pk'],
  [/ist\b|space technology/i, 'https://www.ist.edu.pk'],
];

const SCHOLARSHIP_SITES: [RegExp, string][] = [
  [/ehsaas/i, 'https://ehsaas.hec.gov.pk'],
  [/peef/i, 'https://www.peef.org.pk'],
  [/beef/i, 'https://www.beef.org.pk'],
  [/hec.*need|need[- ]based/i, 'https://www.hec.gov.pk/english/scholarshipsgrants/need'],
  [/hec.*overseas|ussrp|irsip/i, 'https://www.hec.gov.pk/english/scholarshipsgrants/Pages/default.aspx'],
  [/\bhec\b/i, 'https://www.hec.gov.pk/english/scholarshipsgrants/Pages/default.aspx'],
  [/digiskills/i, 'https://digiskills.pk'],
  [/british council/i, 'https://www.britishcouncil.pk'],
  [/fulbright|useFP/i, 'https://www.usefp.org'],
  [/chevening/i, 'https://www.chevening.org/scholarship/pakistan/'],
  [/commonwealth/i, 'https://cscuk.fcdo.gov.uk/scholarships/'],
  [/daad/i, 'https://www.daad.de/en/'],
  [/pmyp|prime minister.*youth/i, 'https://pmyp.gov.pk'],
  [/mora|zakat/i, 'https://www.mora.gov.pk'],
  [/sindh education/i, 'https://www.sindheducation.gov.pk'],
  [/\bkp\b|khyber/i, 'https://hed.kp.gov.pk'],
  [/punjab educational/i, 'https://www.peef.org.pk'],
  [/google.*cert/i, 'https://grow.google/certificates/'],
];

const HEC_UNIS = 'https://www.hec.gov.pk/english/universities/pages/recognised.aspx';
const HEC_SCHOLARSHIPS = 'https://www.hec.gov.pk/english/scholarshipsgrants/Pages/default.aspx';

function firstUrl(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (isHttp(c) && !/#$/.test(String(c).trim())) return String(c).trim();
  }
  return null;
}

function matchSite(name: string, table: [RegExp, string][], fallback: string) {
  const hit = table.find(([re]) => re.test(name));
  return hit ? hit[1] : fallback;
}

export function officialUniversityUrl(row: Record<string, any> = {}): string {
  return firstUrl(row.websiteUrl, row.officialWebsite, row.official_website, row.admissionsUrl, row.admissions_url, row.official_url, row.officialUrl)
    || matchSite(`${row.name || ''} ${row.shortName || row.short_name || ''}`, UNIVERSITY_SITES, HEC_UNIS);
}

export function officialScholarshipUrl(row: Record<string, any> = {}): string {
  return firstUrl(row.applicationUrl, row.application_url, row.officialUrl, row.official_url, row.link)
    || matchSite(`${row.name || row.title || ''} ${row.provider || ''}`, SCHOLARSHIP_SITES, HEC_SCHOLARSHIPS);
}

export function toUniversityDto(u: Record<string, any>) {
  const websiteUrl = officialUniversityUrl(u);
  const programs = Array.isArray(u.programs) ? u.programs
    : typeof u.programs === 'string' ? (() => { try { return JSON.parse(u.programs); } catch { return []; } })()
    : [];
  return {
    id: u.id,
    name: u.name,
    shortName: u.short_name || u.shortName || '',
    city: u.city || '',
    province: u.province || '',
    type: u.type || 'Public',
    hecRankTier: u.hec_rank_tier || u.hecRankTier || 'Recognized',
    isHecRecognized: u.is_hec_recognized ?? true,
    annualFeePkr: Number(u.annual_fee_pkr ?? u.annualFeePkr) || 0,
    lastMeritCutoffPct: Number(u.merit_cutoff_pct ?? u.lastMeritCutoffPct) || 0,
    programs,
    hasHostel: Boolean(u.has_hostel ?? u.hasHostel),
    description: u.description || '',
    websiteUrl,
    officialWebsite: websiteUrl,
    admissionsUrl: firstUrl(u.admissionsUrl, u.admissions_url) || websiteUrl,
    official_url: websiteUrl,
  };
}

export function toScholarshipDto(s: Record<string, any>) {
  const applicationUrl = officialScholarshipUrl(s);
  return {
    ...s,
    id: s.id,
    name: s.name || s.title,
    title: s.title || s.name,
    provider: s.provider || 'HEC Pakistan',
    category: s.category || 'Merit-Based',
    province: s.province || 'Pakistan',
    description: s.description || '',
    awardAmountPkr: s.awardAmountPkr ?? s.amount_pkr ?? s.amountPkr,
    maxFamilyIncomePkr: Number(s.maxFamilyIncomePkr ?? s.max_family_income ?? s.max_family_income_pkr) || 0,
    minAcademicPct: Number(s.minAcademicPct ?? s.min_academic_pct) || 0,
    eligibleGrades: s.eligibleGrades || s.education_levels || [],
    applicationUrl,
    officialUrl: applicationUrl,
    official_url: applicationUrl,
    deadline: s.deadline,
    deadlineNote: s.deadline_note || s.deadlineNote,
    coverage: s.coverage,
  };
}
