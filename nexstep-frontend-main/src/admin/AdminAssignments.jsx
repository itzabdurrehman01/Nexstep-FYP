import React, { useCallback, useEffect, useState } from 'react';
import { Link2, Search, UserCog, GraduationCap } from 'lucide-react';
import { adminFetch, formatDate } from './adminApi.js';
import { Badge, Button, Card, ConfirmButton, Empty, Field, Loading, Notice, PageHeader, inputClass } from './AdminUi.jsx';

/** Admin assigns mentors to students. Students can only request sessions with their assigned mentors. */
export function AdminAssignments() {
  const [mentors, setMentors] = useState([]);
  const [rows, setRows] = useState(null);
  const [load, setLoad] = useState({});
  const [search, setSearch] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentHits, setStudentHits] = useState([]);
  const [mentorEmail, setMentorEmail] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [a, r] = await Promise.all([
        adminFetch(`/admin/assignments${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`),
        adminFetch('/admin/roles'),
      ]);
      setRows(a.data); setLoad(a.mentorLoad || {});
      setMentors((r.mentors || []).filter((m) => m.isActive !== false));
    } catch (err) { setError(err.message); setRows([]); }
  }, [search]);
  useEffect(() => { const t = setTimeout(loadAll, 250); return () => clearTimeout(t); }, [loadAll]);

  // Suggest students while typing
  useEffect(() => {
    const q = studentEmail.trim();
    if (q.length < 2) { setStudentHits([]); return undefined; }
    const t = setTimeout(() => {
      adminFetch(`/admin/users?role=STUDENT&limit=8&search=${encodeURIComponent(q)}`)
        .then((d) => setStudentHits(d.data || [])).catch(() => setStudentHits([]));
    }, 250);
    return () => clearTimeout(t);
  }, [studentEmail]);

  const assign = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await adminFetch('/admin/assignments', { method: 'POST', body: { studentEmail, mentorEmail, note } });
      setNotice(res.message);
      setStudentEmail(''); setNote(''); setStudentHits([]);
      await loadAll();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const remove = async (row) => {
    setError(''); setNotice('');
    try {
      await adminFetch(`/admin/assignments/${row.id}`, { method: 'DELETE' });
      setNotice(`${row.mentor.name} is no longer assigned to ${row.student.name}.`);
      await loadAll();
    } catch (err) { setError(err.message); }
  };

  const mentorName = (m) => `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email;

  return (
    <div>
      <PageHeader title="Assignments" description="Assign mentors to students. Students can request sessions only with the mentors assigned to them." />
      <div className="grid xl:grid-cols-3 gap-6">
        <Card title="Assign a mentor" className="self-start">
          {mentors.length === 0 ? (
            <Empty icon={UserCog} title="No mentors yet" message="Make someone a mentor on the Mentors page first." />
          ) : (
            <form onSubmit={assign} className="space-y-3">
              <Field label="Student email" id="as-student" hint="The student must have signed in to NexStep at least once.">
                <div className="relative">
                  <input id="as-student" type="email" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} className={inputClass} placeholder="student@gmail.com" autoComplete="off" required />
                  {studentHits.length > 0 && !studentHits.some((s) => s.email === studentEmail) && (
                    <ul className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg max-h-56 overflow-y-auto">
                      {studentHits.map((s) => (
                        <li key={s.id}>
                          <button type="button" onClick={() => { setStudentEmail(s.email); setStudentHits([]); }} className="w-full text-start px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                            <span className="block text-sm text-slate-900 dark:text-white">{`${s.first_name || ''} ${s.last_name || ''}`.trim() || s.email}</span>
                            <span className="block text-xs text-slate-500">{s.email}{s.gradeLevel ? ` · ${s.gradeLevel}` : ''}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Field>
              <Field label="Mentor" id="as-mentor">
                <select id="as-mentor" value={mentorEmail} onChange={(e) => setMentorEmail(e.target.value)} className={inputClass} required>
                  <option value="">Choose a mentor</option>
                  {mentors.map((m) => (
                    <option key={m.id} value={m.email}>{mentorName(m)} — {load[m.id] || 0} student{(load[m.id] || 0) === 1 ? '' : 's'}</option>
                  ))}
                </select>
              </Field>
              <Field label="Note (optional)" id="as-note">
                <input id="as-note" value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} placeholder="e.g. MDCAT preparation" maxLength={300} />
              </Field>
              <Button type="submit" loading={busy} className="w-full"><Link2 className="w-4 h-4" /> Assign mentor</Button>
            </form>
          )}
          <div className="mt-4 space-y-2">
            <Notice>{error}</Notice>
            <Notice kind="success">{notice}</Notice>
          </div>
        </Card>

        <Card title={`Current assignments${rows ? ` (${rows.length})` : ''}`} className="xl:col-span-2">
          <label className="relative block mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by student or mentor" className={`${inputClass} pl-9`} aria-label="Search assignments" />
          </label>
          {!rows ? <Loading /> : rows.length === 0 ? (
            <Empty icon={Link2} title="No assignments yet" message="Assign a mentor to a student to get started." />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800 -my-2">
              {rows.map((r) => (
                <li key={r.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="min-w-0 grid sm:grid-cols-2 gap-x-6 gap-y-1 flex-1">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 inline-flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Student</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{r.student.name}</p>
                      <p className="text-xs text-slate-500 truncate">{r.student.email}{r.student.level ? ` · ${r.student.level}` : ''}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 inline-flex items-center gap-1"><UserCog className="w-3 h-3" /> Mentor</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{r.mentor.name}</p>
                      <p className="text-xs text-slate-500 truncate">{r.mentor.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.note && <Badge>{r.note}</Badge>}
                    <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span>
                    <ConfirmButton variant="secondary" onConfirm={() => remove(r)} confirmLabel="Confirm">Remove</ConfirmButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

export default AdminAssignments;
