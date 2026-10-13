/** Shared profile field helpers so every screen saves and reopens the same values. */

export const PROVINCE_OPTIONS = [
  { value: 'Punjab', label: 'Punjab' },
  { value: 'Sindh', label: 'Sindh' },
  { value: 'KPK', label: 'Khyber Pakhtunkhwa' },
  { value: 'Balochistan', label: 'Balochistan' },
  { value: 'Islamabad', label: 'Islamabad Capital' },
  { value: 'AJK/GB', label: 'Azad Jammu & Kashmir / Gilgit Baltistan' },
];

const PROVINCE_ALIASES = {
  punjab: 'Punjab',
  sindh: 'Sindh',
  kpk: 'KPK',
  kp: 'KPK',
  'khyber pakhtunkhwa': 'KPK',
  balochistan: 'Balochistan',
  islamabad: 'Islamabad',
  'islamabad capital': 'Islamabad',
  'islamabad capital territory': 'Islamabad',
  ajk: 'AJK/GB',
  gb: 'AJK/GB',
  'ajk/gb': 'AJK/GB',
  'azad jammu & kashmir': 'AJK/GB',
  'azad jammu and kashmir': 'AJK/GB',
  'gilgit baltistan': 'AJK/GB',
  'azad jammu & kashmir / gilgit baltistan': 'AJK/GB',
};

export function normalizeProvince(value) {
  if (value == null || value === '') return '';
  const raw = String(value).trim();
  if (!raw) return '';
  return PROVINCE_ALIASES[raw.toLowerCase()] || raw;
}

/** Keep a stored province visible in the dropdown even if it used an older code. */
export function provinceOptionsFor(value) {
  const normalized = normalizeProvince(value);
  if (normalized && !PROVINCE_OPTIONS.some((o) => o.value === normalized || o.label === normalized)) {
    return [{ value: normalized, label: String(value).trim() }, ...PROVINCE_OPTIONS];
  }
  return PROVINCE_OPTIONS;
}

/** Find a dropdown option by value or label, or keep the stored text visible. */
export function matchOption(value, options = []) {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  return options.find((o) => String(o.value) === raw || String(o.label) === raw)
    || options.find((o) => String(o.value).toLowerCase() === lower || String(o.label).toLowerCase() === lower)
    || { value: raw, label: raw };
}

/** Always include the saved choice in a dropdown so refresh cannot blank it. */
export function optionsWithSaved(options = [], value) {
  const matched = matchOption(value, options);
  if (!value || !matched) return options;
  if (options.some((o) => o.value === matched.value || o.label === matched.label)) return options;
  return [{ value: matched.value, label: matched.label }, ...options];
}

export function skillNames(list) {
  if (!Array.isArray(list)) return [];
  return list.map((s) => (typeof s === 'string' ? s : s?.name)).filter(Boolean);
}

/** Next page after a setup save: class → profile → quiz → dashboard. */
export function nextSetupPage(profile) {
  if (!profile?.education?.level && !profile?.educationLevel) return 'roleSelect';
  if (!profile?.topRiasecCluster) return 'quiz';
  return 'dashboard';
}

export async function fetchSavedProfile() {
  const res = await fetch('/api/profile', { credentials: 'include' });
  if (!res.ok) throw new Error('Could not load your profile.');
  const json = await res.json();
  return json.data;
}
