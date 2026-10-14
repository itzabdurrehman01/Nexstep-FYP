import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, Calculator, X } from 'lucide-react';
import { adminFetch, formatDate } from './adminApi.js';
import { Badge, Button, Card, ConfirmButton, Empty, Field, Loading, Notice, inputClass } from './AdminUi.jsx';

const empty = {
  universityName: '', programName: '', degreeType: 'BS', entryTest: '',
  academicYear: `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`,
  meritPct: '', fscWeight: 50, testWeight: 50, city: '', sourceUrl: '',
  verifiedYear: new Date().getFullYear(),
};

export function AdminCutoffs() {
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setRows(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (year.trim()) params.set('year', year.trim());
      setRows((await adminFetch(`/admin/cutoffs?${params}`)).data);
    } catch (err) { setError(err.message); setRows([]); }
  }, [search, year]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const years = useMemo(() => [...new Set((rows || []).map((r) => r.academicYear).filter(Boolean))], [rows]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const startNew = () => { setEditing('new'); setForm(empty); setError(''); };
  const startEdit = (row) => {
    setEditing(row);
    setForm({
      universityName: row.universityName || '', programName: row.programName || '',
      degreeType: row.degreeType || 'BS', entryTest: row.entryTest || '',
      academicYear: row.academicYear || '', meritPct: row.meritPct ?? '',
      fscWeight: row.fscWeight ?? 50, testWeight: row.testWeight ?? 50,
      city: row.city || '', sourceUrl: row.sourceUrl || '',
      verifiedYear: row.verifiedYear || new Date().getFullYear(),
    });
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const body = { ...form, meritPct: Number(form.meritPct), fscWeight: Number(form.fscWeight), testWeight: Number(form.testWeight), verifiedYear: Number(form.verifiedYear) };
      if (editing === 'new') await adminFetch('/admin/cutoffs', { method: 'POST', body });
      else await adminFetch(`/admin/cutoffs/${editing.id}`, { method: 'PUT', body });
      setNotice(`Saved ${form.programName} at ${form.universityName}.`);
      setEditing(null);
      await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const remove = async (row) => {
    try {
      await adminFetch(`/admin/cutoffs/${row.id}`, { method: 'DELETE' });
      setNotice(`Deleted ${row.programName}.`);
      await load();
    } catch (err) { setError(err.message); }
  };

  if (editing) {
    return (
      <Card title={editing === 'new' ? 'New merit cut-off' : 'Edit merit cut-off'} actions={
        <button type="button" onClick={() => setEditing(null)} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4" /></button>}>
        <Notice>{error}</Notice>
        <form onSubmit={save} className="space-y-4 mt-3">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="University *" id="c-uni"><input id="c-uni" className={inputClass} required value={form.universityName} onChange={(e) => set('universityName', e.target.value)} /></Field>
            <Field label="Programme *" id="c-prog"><input id="c-prog" className={inputClass} required value={form.programName} onChange={(e) => set('programName', e.target.value)} /></Field>
            <Field label="Degree type" id="c-deg"><input id="c-deg" className={inputClass} value={form.degreeType} onChange={(e) => set('degreeType', e.target.value)} /></Field>
            <Field label="Entry test" id="c-test"><input id="c-test" className={inputClass} placeholder="MDCAT, ECAT, NET…" value={form.entryTest} onChange={(e) => set('entryTest', e.target.value)} /></Field>
            <Field label="Academic year *" id="c-year"><input id="c-year" className={inputClass} required placeholder="2026-27" value={form.academicYear} onChange={(e) => set('academicYear', e.target.value)} /></Field>
            <Field label="Merit cut-off (%) *" id="c-merit"><input id="c-merit" type="number" min="0" max="100" step="0.01" className={inputClass} required value={form.meritPct} onChange={(e) => set('meritPct', e.target.value)} /></Field>
            <Field label="FSc weight %" id="c-fsc"><input id="c-fsc" type="number" min="0" max="100" className={inputClass} value={form.fscWeight} onChange={(e) => set('fscWeight', e.target.value)} /></Field>
            <Field label="Test weight %" id="c-tw"><input id="c-tw" type="number" min="0" max="100" className={inputClass} value={form.testWeight} onChange={(e) => set('testWeight', e.target.value)} /></Field>
            <Field label="City" id="c-city"><input id="c-city" className={inputClass} value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
            <Field label="Verified year" id="c-vy"><input id="c-vy" type="number" min="2018" max="2035" className={inputClass} value={form.verifiedYear} onChange={(e) => set('verifiedYear', e.target.value)} /></Field>
            <div className="sm:col-span-2"><Field label="Source URL" id="c-url"><input id="c-url" type="url" className={inputClass} placeholder="https://" value={form.sourceUrl} onChange={(e) => set('sourceUrl', e.target.value)} /></Field></div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" loading={busy}>Save</Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <label className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search university or programme" className={`${inputClass} pl-9`} aria-label="Search cut-offs" />
        </label>
        <select value={year} onChange={(e) => setYear(e.target.value)} className={`${inputClass} sm:w-40`} aria-label="Filter by academic year">
          <option value="">All years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <Button onClick={startNew}><Plus className="w-4 h-4" /> Add cut-off</Button>
      </div>
      <Notice>{error}</Notice>
      <Notice kind="success">{notice}</Notice>
      {!rows ? <Loading /> : rows.length === 0 ? (
        <Empty icon={Calculator} title="No merit cut-offs yet" message="Add programme cut-offs so the merit calculator and FSc mapper can rank universities." />
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 -my-2">
          {rows.map((r) => (
            <li key={r.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{r.universityName}</p>
                <p className="text-xs text-slate-500 truncate">{r.programName} · {r.academicYear} · {r.meritPct}%</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {r.isSample && <Badge tone="amber">Sample</Badge>}
                  {r.entryTest && <Badge>{r.entryTest}</Badge>}
                  {r.verifiedYear && <Badge tone="green">Verified {r.verifiedYear}</Badge>}
                  {r.lastVerifiedAt && <Badge tone="slate">{formatDate(r.lastVerifiedAt)}</Badge>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="secondary" onClick={() => startEdit(r)}><Pencil className="w-4 h-4" /> Edit</Button>
                <ConfirmButton onConfirm={() => remove(r)} confirmLabel="Confirm delete">Delete</ConfirmButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
