import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, Building2, GraduationCap, BookOpen, Briefcase, Compass, X, Calculator } from 'lucide-react';
import { adminFetch, formatDate } from './adminApi.js';
import { Badge, Button, Card, ConfirmButton, Empty, Field, Loading, Notice, PageHeader, inputClass } from './AdminUi.jsx';
import { AdminCutoffs } from './AdminCutoffs.jsx';

const LEVELS = [
  ['class8', 'Class 8'], ['class9', 'Class 9'], ['class10', 'Class 10'], ['class11', 'Class 11'],
  ['class12', 'Class 12'], ['dae', 'DAE'], ['university', 'University'],
];
const LEVEL_NAME = Object.fromEntries(LEVELS);

/** Field definitions per content type. Keys match the backend content manager. */
const TYPES = {
  universities: {
    label: 'Universities', singular: 'university', icon: Building2, titleKey: 'name', subtitle: (r) => [r.city, r.province, r.type].filter(Boolean).join(' · '),
    defaultLevels: ['class11', 'class12', 'dae', 'university'],
    fields: [
      ['name', 'Name', 'text', true], ['shortName', 'Short name', 'text'], ['city', 'City', 'text', true], ['province', 'Province', 'select', true, ['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad Capital Territory', 'Gilgit-Baltistan', 'Azad Jammu & Kashmir']],
      ['type', 'Sector', 'select', false, ['Public', 'Private']], ['hecRankTier', 'HEC category', 'text'], ['isHecRecognized', 'HEC recognised', 'bool'],
      ['annualFeePkr', 'Approx. annual fee (PKR)', 'int'], ['officialWebsite', 'Official website', 'url'], ['admissionsUrl', 'Admissions page', 'url'],
      ['programs', 'Programmes (one per line)', 'list'], ['lastMeritCutoffPct', 'Last merit cut-off (%)', 'int'], ['hasHostel', 'Hostel available', 'bool'],
      ['description', 'Description', 'longtext'], ['verifiedYear', 'Verified year (e.g. 2026)', 'int'],
    ],
  },
  scholarships: {
    label: 'Scholarships', singular: 'scholarship', icon: GraduationCap, titleKey: 'name', subtitle: (r) => [r.provider, r.deadline ? `deadline ${formatDate(r.deadline)}` : null].filter(Boolean).join(' · '),
    defaultLevels: [],
    fields: [
      ['name', 'Name', 'text', true], ['provider', 'Provider', 'text', true], ['description', 'Description', 'longtext'],
      ['province', 'Province / region', 'text'], ['category', 'Category', 'select', false, ['Merit Based', 'Need Based', 'Merit & Need Based', 'Sports', 'Minorities', 'Special Quota', 'Other']],
      ['coverage', 'Coverage', 'text'], ['amountPkr', 'Amount (PKR)', 'int'], ['maxFamilyIncome', 'Max. family income (PKR / month)', 'int'],
      ['deadline', 'Deadline', 'date'], ['applicationUrl', 'Application link', 'url'], ['officialUrl', 'Official page', 'url'],
      ['minAcademicPct', 'Minimum marks (%)', 'int'], ['verifiedYear', 'Verified year (e.g. 2026)', 'int'],
    ],
  },
  courses: {
    label: 'Courses', singular: 'course', icon: BookOpen, titleKey: 'title', subtitle: (r) => [r.provider, r.duration, r.format].filter(Boolean).join(' · '),
    defaultLevels: [],
    fields: [
      ['title', 'Title', 'text', true], ['provider', 'Provider', 'text', true], ['description', 'Description', 'longtext'],
      ['skillsCovered', 'Skills covered (one per line)', 'list'], ['duration', 'Duration', 'text'], ['format', 'Format', 'select', false, ['Online', 'In-person', 'Hybrid']],
      ['pricePkr', 'Price (PKR, 0 = free)', 'int'], ['enrollmentUrl', 'Enrolment link', 'url'],
    ],
  },
  careers: {
    label: 'Careers', singular: 'career', icon: Compass, titleKey: 'title', subtitle: (r) => [r.category, r.riasecCode && `Interests ${r.riasecCode}`].filter(Boolean).join(' · '),
    defaultLevels: [],
    fields: [
      ['title', 'Career title', 'text', true], ['category', 'Category', 'select', false, ['Computing & IT', 'Medical & Health', 'Engineering', 'Business & Finance', 'Law & Public Service', 'Education', 'Creative & Media', 'Technical & Vocational', 'Other']],
      ['riasecCode', 'Interest code (1–3 of R I A S E C, e.g. ICR)', 'text', true], ['description', 'Description', 'longtext'],
      ['streams', 'Usual groups (one per line, e.g. ICS, FSc Pre-Engineering, DAE)', 'list'], ['degrees', 'Degrees / qualifications (one per line)', 'list'],
      ['requiredSkills', 'Key skills (one per line)', 'list'], ['pathway', 'How to get there', 'longtext'],
      ['demandLevel', 'Demand in Pakistan', 'select', false, ['Very High', 'High', 'Moderate', 'Low']],
      ['startingSalaryPkr', 'Starting salary (PKR / month, optional)', 'int'], ['avgSalaryPkr', 'Experienced salary (PKR / month, optional)', 'int'],
    ],
  },
  jobs: {
    label: 'Jobs & internships', singular: 'job', icon: Briefcase, titleKey: 'title', subtitle: (r) => [r.company, r.city, r.employmentType].filter(Boolean).join(' · '),
    defaultLevels: ['dae', 'university'],
    fields: [
      ['title', 'Job title', 'text', true], ['company', 'Company', 'text', true], ['description', 'Description', 'longtext'],
      ['city', 'City', 'text'], ['province', 'Province', 'text'], ['location', 'Location / remote', 'text'],
      ['employmentType', 'Type', 'select', false, ['Full-Time', 'Part-Time', 'Internship', 'Contract', 'Remote']],
      ['experienceLevel', 'Experience', 'select', false, ['Internship', 'Entry Level', 'Mid Level', 'Senior']],
      ['requiredSkills', 'Required skills (one per line)', 'list'], ['salaryMin', 'Salary from (PKR / month)', 'int'], ['salaryMax', 'Salary to (PKR / month)', 'int'],
      ['applicationUrl', 'Apply link', 'url'], ['expiresAt', 'Closes on', 'date'],
    ],
  },
};

function emptyForm(def) {
  const f = { educationLevels: [...def.defaultLevels] };
  for (const [key, , kind] of def.fields) f[key] = kind === 'bool' ? true : kind === 'list' ? '' : '';
  return f;
}

function toForm(def, row) {
  const f = { educationLevels: row.educationLevels ?? [] };
  for (const [key, , kind] of def.fields) {
    const v = row[key];
    f[key] = kind === 'list' ? (Array.isArray(v) ? v.join('\n') : '') : kind === 'bool' ? v !== false : (v ?? '');
  }
  return f;
}

function ItemForm({ def, initial, onCancel, onSave, busy }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleLevel = (id) => set('educationLevels', form.educationLevels.includes(id) ? form.educationLevels.filter((x) => x !== id) : [...form.educationLevels, id]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="space-y-5">
      <fieldset>
        <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">Show to students in</legend>
        <p className="text-xs text-slate-500 mb-2">Leave all unticked to show it to every level.</p>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map(([id, name]) => {
            const on = form.educationLevels.includes(id);
            return (
              <button key={id} type="button" onClick={() => toggleLevel(id)} aria-pressed={on}
                className={`h-8 px-3 rounded-lg border text-sm cursor-pointer ${on ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-medium' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                {name}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid sm:grid-cols-2 gap-4">
        {def.fields.map(([key, label, kind, required, options]) => {
          const id = `cf-${key}`;
          const wide = kind === 'longtext' || kind === 'list';
          let control;
          if (kind === 'longtext' || kind === 'list') {
            control = <textarea id={id} rows={kind === 'list' ? 4 : 4} value={form[key]} onChange={(e) => set(key, e.target.value)} className={`${inputClass} h-auto py-2`} required={required} />;
          } else if (kind === 'bool') {
            control = (
              <label className="flex items-center gap-2 h-10 text-sm text-slate-700 dark:text-slate-200">
                <input id={id} type="checkbox" checked={!!form[key]} onChange={(e) => set(key, e.target.checked)} /> Yes
              </label>
            );
          } else if (kind === 'select') {
            control = (
              <select id={id} value={form[key]} onChange={(e) => set(key, e.target.value)} className={inputClass} required={required}>
                <option value="">—</option>
                {options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            );
          } else {
            const type = kind === 'int' ? 'number' : kind === 'url' ? 'url' : kind === 'date' ? 'date' : 'text';
            control = <input id={id} type={type} min={kind === 'int' ? 0 : undefined} value={form[key]} onChange={(e) => set(key, e.target.value)} className={inputClass} required={required} placeholder={kind === 'url' ? 'https://' : undefined} />;
          }
          return <div key={key} className={wide ? 'sm:col-span-2' : ''}><Field label={`${label}${required ? ' *' : ''}`} id={id}>{control}</Field></div>;
        })}
      </div>

      <div className="flex gap-2">
        <Button type="submit" loading={busy}>Save</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

/** Demo content from the scope document: see how much is loaded, remove it or add it back. */
function SampleDataPanel({ onChanged }) {
  const [counts, setCounts] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const load = useCallback(() => adminFetch('/admin/sample-data').then((d) => setCounts(d.data)).catch(() => setCounts(null)), []);
  useEffect(() => { load(); }, [load]);
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
  const run = async (method) => {
    setBusy(true); setMsg(''); setErr('');
    try {
      const d = await adminFetch('/admin/sample-data', { method });
      setMsg(method === 'DELETE' ? 'All sample data was removed. Your own items were not touched.' : 'Sample data was added back (existing items were skipped).');
      await load(); onChanged?.();
      return d;
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  if (!counts) return null;
  const label = { universities: 'universities', scholarships: 'scholarships', courses: 'courses', jobs: 'jobs', merit_cutoffs: 'merit cut-offs', entry_test_questions: 'practice MCQs' };
  return (
    <Card className="mb-5">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Sample data</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {total ? `Demo content from the scope document is loaded: ${Object.entries(counts).filter(([, n]) => n).map(([k, n]) => `${n} ${label[k]}`).join(', ')}. Items marked "Sample" can be edited like real data.`
              : 'No sample data is loaded. Students only see the items you added.'}
          </p>
          {msg && <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">{msg}</p>}
          {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          {total > 0
            ? <ConfirmButton onConfirm={() => run('DELETE')} confirmLabel="Remove all sample data?" disabled={busy}>Remove sample data</ConfirmButton>
            : <Button variant="secondary" onClick={() => run('POST')} loading={busy}>Add sample data</Button>}
        </div>
      </div>
    </Card>
  );
}

export function AdminContent() {
  const [type, setType] = useState('universities');
  const isCutoffs = type === 'cutoffs';
  const def = TYPES[type] || TYPES.universities;
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | row
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (type === 'cutoffs') return;
    setRows(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (levelFilter) params.set('level', levelFilter);
      setRows((await adminFetch(`/admin/content/${type}?${params}`)).data);
    } catch (err) { setError(err.message); setRows([]); }
  }, [type, search, levelFilter]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { setEditing(null); setError(''); setNotice(''); }, [type]);

  const save = async (form) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const body = { ...form };
      for (const [key, , kind] of def.fields) if (kind === 'list') body[key] = String(form[key] || '').split('\n').map((x) => x.trim()).filter(Boolean);
      if (editing === 'new') await adminFetch(`/admin/content/${type}`, { method: 'POST', body });
      else await adminFetch(`/admin/content/${type}/${editing.id}`, { method: 'PUT', body });
      setNotice(`Saved "${form[def.titleKey]}".`);
      setEditing(null);
      await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const remove = async (row) => {
    setError(''); setNotice('');
    try {
      await adminFetch(`/admin/content/${type}/${row.id}`, { method: 'DELETE' });
      setNotice(`Deleted "${row[def.titleKey]}".`);
      await load();
    } catch (err) { setError(err.message); }
  };

  const formInitial = useMemo(() => (editing === 'new' ? emptyForm(def) : editing ? toForm(def, editing) : null), [editing, def]);

  return (
    <div>
      <PageHeader title="Content" description="Universities, scholarships, merit cut-offs, courses and jobs shown to students. Each listing can carry the year it was last verified."
        actions={!editing && !isCutoffs && <Button onClick={() => setEditing('new')}><Plus className="w-4 h-4" /> Add {def.singular}</Button>} />

      <div className="flex gap-1 p-1 mb-5 rounded-xl bg-slate-100 dark:bg-slate-800/70 w-full sm:w-fit overflow-x-auto">
        {Object.entries(TYPES).map(([id, t]) => {
          const Icon = t.icon;
          return (
            <button key={id} type="button" onClick={() => setType(id)} aria-pressed={type === id}
              className={`inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm whitespace-nowrap cursor-pointer ${type === id ? 'bg-white dark:bg-slate-900 shadow-sm font-medium text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
              <Icon className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />{t.label}
            </button>
          );
        })}
        <button type="button" onClick={() => setType('cutoffs')} aria-pressed={isCutoffs}
          className={`inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm whitespace-nowrap cursor-pointer ${isCutoffs ? 'bg-white dark:bg-slate-900 shadow-sm font-medium text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
          <Calculator className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />Merit cut-offs
        </button>
      </div>

      <SampleDataPanel onChanged={load} />

      {isCutoffs ? <AdminCutoffs /> : (
      <>
      <div className="space-y-3 mb-4">
        <Notice>{error}</Notice>
        <Notice kind="success">{notice}</Notice>
      </div>

      {editing ? (
        <Card title={editing === 'new' ? `New ${def.singular}` : `Edit ${def.singular}`} actions={
          <button type="button" onClick={() => setEditing(null)} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4" /></button>}>
          <ItemForm key={editing === 'new' ? 'new' : editing.id} def={def} initial={formInitial} busy={busy} onCancel={() => setEditing(null)} onSave={save} />
        </Card>
      ) : (
        <Card>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <label className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${def.label.toLowerCase()}`} className={`${inputClass} pl-9`} aria-label="Search" />
            </label>
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className={`${inputClass} sm:w-44`} aria-label="Filter by level">
              <option value="">All levels</option>
              {LEVELS.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>

          {!rows ? <Loading /> : rows.length === 0 ? (
            <Empty icon={def.icon} title={`No ${def.label.toLowerCase()} yet`} message={`Add the first ${def.singular} to show it to students.`} />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800 -my-2">
              {rows.map((r) => (
                <li key={r.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{r[def.titleKey]}</p>
                    <p className="text-xs text-slate-500 truncate">{def.subtitle(r) || '—'}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {r.isSample && <Badge tone="amber">Sample</Badge>}
                      {r.verifiedYear && <Badge tone="green">Verified {r.verifiedYear}</Badge>}
                      {(r.educationLevels?.length ? r.educationLevels : ['all']).map((l) => (
                        <Badge key={l} tone={l === 'all' ? 'slate' : 'green'}>{l === 'all' ? 'All levels' : LEVEL_NAME[l]}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="secondary" onClick={() => setEditing(r)}><Pencil className="w-4 h-4" /> Edit</Button>
                    <ConfirmButton onConfirm={() => remove(r)} confirmLabel="Confirm delete">Delete</ConfirmButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
      </>
      )}
    </div>
  );
}

export default AdminContent;
