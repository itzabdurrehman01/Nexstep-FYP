import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Building2, GraduationCap, Calculator, Check } from 'lucide-react';
import { adminFetch, formatDate } from './adminApi.js';
import { Badge, Button, Card, Empty, Loading, Notice, PageHeader, inputClass } from './AdminUi.jsx';

const TABS = [
  { id: 'universities', label: 'Fees & merit', icon: Building2 },
  { id: 'scholarships', label: 'Scholarship deadlines', icon: GraduationCap },
  { id: 'cutoffs', label: 'Merit lists', icon: Calculator },
];

function yearOptions(current) {
  const y = Number(current) || new Date().getFullYear();
  return [y - 1, y, y + 1];
}

export function AdminRefresh() {
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear());
  const [tab, setTab] = useState('universities');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState(false);
  const [onlyStale, setOnlyStale] = useState(true);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await adminFetch(`/admin/refresh?year=${seasonYear}`);
      setData(res.data);
      setSelected([]);
      setDrafts({});
    } catch (err) { setError(err.message); }
  }, [seasonYear]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const list = data?.[tab] || [];
    return onlyStale ? list.filter((r) => r.stale) : list;
  }, [data, tab, onlyStale]);

  const summary = data?.summary?.[tab];
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => setSelected(selected.length === rows.length ? [] : rows.map((r) => r.id));
  const setDraft = (id, key, value) => setDrafts((d) => ({ ...d, [id]: { ...d[id], [key]: value } }));

  const saveRow = async (row) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const draft = drafts[row.id] || {};
      if (tab === 'universities') {
        await adminFetch(`/admin/refresh/universities/${row.id}`, {
          method: 'PUT',
          body: {
            annualFeePkr: draft.annualFeePkr ?? row.annualFeePkr,
            lastMeritCutoffPct: draft.lastMeritCutoffPct ?? row.lastMeritCutoffPct,
            verifiedYear: seasonYear,
          },
        });
      } else if (tab === 'scholarships') {
        await adminFetch(`/admin/refresh/scholarships/${row.id}`, {
          method: 'PUT',
          body: {
            deadline: draft.deadline ?? (row.deadline ? String(row.deadline).slice(0, 10) : ''),
            amountPkr: draft.amountPkr ?? row.amountPkr,
            verifiedYear: seasonYear,
          },
        });
      } else {
        await adminFetch(`/admin/cutoffs/${row.id}`, {
          method: 'PUT',
          body: {
            universityName: row.universityName,
            programName: row.programName,
            academicYear: draft.academicYear ?? row.academicYear,
            meritPct: draft.meritPct ?? row.meritPct,
            verifiedYear: seasonYear,
          },
        });
      }
      setNotice('Saved and marked verified for this season.');
      await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const markVerified = async () => {
    if (!selected.length) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await adminFetch('/admin/refresh/verify', { method: 'POST', body: { type: tab, ids: selected, year: seasonYear } });
      setNotice(`Marked ${res.data.updated} items verified for ${seasonYear}.`);
      await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader
        title="Annual data refresh"
        description="Update merit lists, scholarship deadlines and university fees before the admissions season. Every row keeps the year it was last verified."
        actions={
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            Season
            <select value={seasonYear} onChange={(e) => setSeasonYear(Number(e.target.value))} className={`${inputClass} w-28`} aria-label="Admissions season year">
              {yearOptions(seasonYear).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
        }
      />

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {TABS.map((t) => {
            const s = data.summary[t.id];
            return (
              <button key={t.id} type="button" onClick={() => { setTab(t.id); setSelected([]); }}
                className={`text-left rounded-2xl border p-4 ${tab === t.id ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}>
                <p className="text-xs font-medium text-slate-500">{t.label}</p>
                <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">{s.stale} stale</p>
                <p className="text-xs text-slate-500">{s.total} total · {Math.max(0, s.total - s.stale)} verified for {seasonYear}</p>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-1 p-1 mb-4 rounded-xl bg-slate-100 dark:bg-slate-800/70 w-full sm:w-fit overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} type="button" onClick={() => { setTab(t.id); setSelected([]); }} aria-pressed={tab === t.id}
              className={`inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm whitespace-nowrap cursor-pointer ${tab === t.id ? 'bg-white dark:bg-slate-900 shadow-sm font-medium' : 'text-slate-600 dark:text-slate-300'}`}>
              <Icon className="w-4 h-4" strokeWidth={1.75} />{t.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-3 mb-4">
        <Notice>{error}</Notice>
        <Notice kind="success">{notice}</Notice>
      </div>

      <Card
        title={`${TABS.find((t) => t.id === tab)?.label} · ${seasonYear}`}
        description={summary ? `${summary.stale} of ${summary.total} need a ${seasonYear} check.` : ''}
        actions={
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={onlyStale} onChange={(e) => setOnlyStale(e.target.checked)} /> Stale only
            </label>
            <Button variant="secondary" onClick={markVerified} disabled={!selected.length} loading={busy}>
              <Check className="w-4 h-4" /> Mark {selected.length || ''} verified for {seasonYear}
            </Button>
          </div>
        }
      >
        {!data ? <Loading /> : rows.length === 0 ? (
          <Empty icon={CalendarClock} title={onlyStale ? 'Nothing is stale for this season' : 'No records'} message={onlyStale ? 'All listed items already carry this verification year.' : 'Add items under Content first.'} />
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2 pr-2 w-8"><input type="checkbox" checked={selected.length === rows.length} onChange={toggleAll} aria-label="Select all" /></th>
                  <th className="py-2 pr-3">Name</th>
                  {tab === 'universities' && <><th className="py-2 pr-3">Fee (PKR)</th><th className="py-2 pr-3">Merit %</th></>}
                  {tab === 'scholarships' && <><th className="py-2 pr-3">Deadline</th><th className="py-2 pr-3">Amount</th></>}
                  {tab === 'cutoffs' && <><th className="py-2 pr-3">Year</th><th className="py-2 pr-3">Merit %</th></>}
                  <th className="py-2 pr-3">Verified</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const draft = drafts[row.id] || {};
                  return (
                    <tr key={row.id} className="border-b border-slate-50 dark:border-slate-800/80">
                      <td className="py-2 pr-2"><input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} aria-label={`Select ${row.name || row.universityName}`} /></td>
                      <td className="py-2 pr-3 min-w-[12rem]">
                        <p className="font-medium text-slate-900 dark:text-white truncate">{row.name || row.universityName}</p>
                        <p className="text-xs text-slate-500 truncate">{row.city || row.provider || row.programName}</p>
                      </td>
                      {tab === 'universities' && (
                        <>
                          <td className="py-2 pr-3"><input type="number" min="0" className={`${inputClass} h-8 w-28`} value={draft.annualFeePkr ?? row.annualFeePkr ?? ''} onChange={(e) => setDraft(row.id, 'annualFeePkr', e.target.value)} /></td>
                          <td className="py-2 pr-3"><input type="number" min="0" max="100" className={`${inputClass} h-8 w-20`} value={draft.lastMeritCutoffPct ?? row.lastMeritCutoffPct ?? ''} onChange={(e) => setDraft(row.id, 'lastMeritCutoffPct', e.target.value)} /></td>
                        </>
                      )}
                      {tab === 'scholarships' && (
                        <>
                          <td className="py-2 pr-3"><input type="date" className={`${inputClass} h-8 w-40`} value={draft.deadline ?? (row.deadline ? String(row.deadline).slice(0, 10) : '')} onChange={(e) => setDraft(row.id, 'deadline', e.target.value)} /></td>
                          <td className="py-2 pr-3"><input type="number" min="0" className={`${inputClass} h-8 w-28`} value={draft.amountPkr ?? row.amountPkr ?? ''} onChange={(e) => setDraft(row.id, 'amountPkr', e.target.value)} /></td>
                        </>
                      )}
                      {tab === 'cutoffs' && (
                        <>
                          <td className="py-2 pr-3"><input className={`${inputClass} h-8 w-24`} value={draft.academicYear ?? row.academicYear ?? ''} onChange={(e) => setDraft(row.id, 'academicYear', e.target.value)} /></td>
                          <td className="py-2 pr-3"><input type="number" min="0" max="100" step="0.01" className={`${inputClass} h-8 w-20`} value={draft.meritPct ?? row.meritPct ?? ''} onChange={(e) => setDraft(row.id, 'meritPct', e.target.value)} /></td>
                        </>
                      )}
                      <td className="py-2 pr-3">
                        {row.stale ? <Badge tone="amber">Needs {seasonYear}</Badge> : <Badge tone="green">{row.verifiedYear}</Badge>}
                        {row.lastVerifiedAt && <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(row.lastVerifiedAt)}</p>}
                      </td>
                      <td className="py-2 text-right">
                        <Button variant="secondary" onClick={() => saveRow(row)} loading={busy}>Save</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default AdminRefresh;
