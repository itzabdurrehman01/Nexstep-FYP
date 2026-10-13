/**
 * backend/src/data/realData/sources.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Canonical list of all data sources used in Phase 26 ingestion.
 *
 * PROVENANCE HONESTY POLICY:
 *   - source_type OFFICIAL  → only if the publisher is a government/regulatory body
 *   - source_type KAGGLE    → only if data originates from a real Kaggle dataset
 *   - source_type THIRD_PARTY → verified non-government organisations
 *   - source_type INTERNAL_SEED → curated by NexStep team, not an external feed
 *
 * All URLs are real publicly accessible pages verified at time of authoring.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface DataSourceDef {
  slug: string;
  name: string;
  publisher: string;
  source_type: 'OFFICIAL' | 'THIRD_PARTY' | 'INTERNAL_SEED';
  is_official: boolean;
  base_url: string | null;
  official_url: string | null;
  license: string | null;
  description: string;
  refresh_frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'MANUAL';
  ingestion_method: 'MANUAL_SEED' | 'MANUAL_DOWNLOAD' | 'API';
  verification_status: 'VERIFIED' | 'UNVERIFIED';
}

export const DATA_SOURCES: DataSourceDef[] = [
  {
    slug:                'hec-pakistan',
    name:                'Higher Education Commission Pakistan',
    publisher:           'Higher Education Commission of Pakistan',
    source_type:         'OFFICIAL',
    is_official:         true,
    base_url:            'https://hec.gov.pk',
    official_url:        'https://hec.gov.pk/english/universities/Pages/Universities.aspx',
    license:             'Government Public Open Data',
    description:         'Official HEC list of recognised universities, degree programmes, and academic standards.',
    refresh_frequency:   'QUARTERLY',
    ingestion_method:    'MANUAL_SEED',
    verification_status: 'VERIFIED',
  },
  {
    slug:                'hec-scholarships',
    name:                'HEC Scholarships Portal',
    publisher:           'Higher Education Commission of Pakistan',
    source_type:         'OFFICIAL',
    is_official:         true,
    base_url:            'https://scholarships.hec.gov.pk',
    official_url:        'https://scholarships.hec.gov.pk',
    license:             'Government Public Open Data',
    description:         'Official HEC scholarship programmes including Need-Based, IRSIP, and overseas scholarships.',
    refresh_frequency:   'MONTHLY',
    ingestion_method:    'MANUAL_SEED',
    verification_status: 'VERIFIED',
  },
  {
    slug:                'navttc',
    name:                'NAVTTC — National Vocational & Technical Training Commission',
    publisher:           'National Vocational & Technical Training Commission (NAVTTC)',
    source_type:         'OFFICIAL',
    is_official:         true,
    base_url:            'https://navttc.gov.pk',
    official_url:        'https://navttc.gov.pk/training-providers/',
    license:             'Government Public Open Data',
    description:         'Official NAVTTC list of accredited vocational and technical training centres across Pakistan.',
    refresh_frequency:   'QUARTERLY',
    ingestion_method:    'MANUAL_SEED',
    verification_status: 'VERIFIED',
  },
  {
    slug:                'njp-pakistan',
    name:                'National Job Portal Pakistan',
    publisher:           'Ministry of IT & Telecom — National Internship Programme',
    source_type:         'OFFICIAL',
    is_official:         true,
    base_url:            'https://njp.gov.pk',
    official_url:        'https://njp.gov.pk',
    license:             'Government Public Open Data',
    description:         'NJP lists government and public-sector jobs and internships across Pakistan.',
    refresh_frequency:   'WEEKLY',
    ingestion_method:    'MANUAL_SEED',
    verification_status: 'VERIFIED',
  },
  {
    slug:                'digiskills',
    name:                'DigiSkills.pk',
    publisher:           'Ministry of IT & Telecom (IGNITE)',
    source_type:         'OFFICIAL',
    is_official:         true,
    base_url:            'https://digiskills.pk',
    official_url:        'https://digiskills.pk/courses',
    license:             'Government Public Open Data',
    description:         'Free government-backed digital skills training platform with certified courses.',
    refresh_frequency:   'MONTHLY',
    ingestion_method:    'MANUAL_SEED',
    verification_status: 'VERIFIED',
  },
  {
    slug:                'pseb',
    name:                'Pakistan Software Export Board (PSEB)',
    publisher:           'Ministry of IT & Telecom — PSEB',
    source_type:         'OFFICIAL',
    is_official:         true,
    base_url:            'https://pseb.org.pk',
    official_url:        'https://pseb.org.pk/it-companies',
    license:             'Government Public Open Data',
    description:         'PSEB registry of registered IT companies and employers in Pakistan.',
    refresh_frequency:   'QUARTERLY',
    ingestion_method:    'MANUAL_SEED',
    verification_status: 'VERIFIED',
  },
  {
    slug:                'nexstep-career-seed',
    name:                'NexStep Career Intelligence Seed',
    publisher:           'NexStep AI — Air University FYP',
    source_type:         'INTERNAL_SEED',
    is_official:         false,
    base_url:            null,
    official_url:        null,
    license:             'Internal Use Only',
    description:         'Curated career, skill, and occupation data assembled by NexStep team from publicly available career guidance resources. NOT an external verified dataset.',
    refresh_frequency:   'MANUAL',
    ingestion_method:    'MANUAL_SEED',
    verification_status: 'UNVERIFIED',
  },
];
