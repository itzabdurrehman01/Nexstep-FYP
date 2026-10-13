import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, ChevronRight, ArrowLeft, ClipboardCheck, GraduationCap, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { miApi, fmtDate, MI_STATUS, scoreTone, AuthAudio, fmtSecs } from './shared.jsx';

const card = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900';

function ReviewForm({ id, onBack, onSaved }) {
  const [data, setData] = useState(null);
  const [scores, setScores] = useState({});
  const [notes, setNotes] = useState({});
  const [overall, setOverall] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    miApi(`/${id}`).then((d) => {
      setData(d.data);
      const s = {}; const n = {};
      d.data.answers.forEach((a) => { if (a.score != null) s[a.position] = a.score; n[a.position] = a.feedback || ''; });
      setScores(s); setNotes(n); setOverall(d.data.mentorFeedback || '');
    }).catch((e) => setError(e.message));
  }, [id]);

  const allScored = data && data.answers.every((a) => Number.isInteger(scores[a.position]));
  const avg = data && allScored ? Math.round((data.answers.reduce((t, a) => t + scores[a.position], 0) / data.answers.length) * 10) : null;

  const submit = async (e) => {
    e.preventDefault();
    if (!allScored) { setError('Give every answer a score from 0 to 10.'); return; }
    setBusy(true); setError('');
    try {
      const res = await miApi(`/${id}/review`, {
        method: 'POST',
        body: { feedback: overall, answers: data.answers.map((a) => ({ position: a.position, score: scores[a.position], feedback: notes[a.position] || '' })) },
      });
      setData(res.data); setSaved(true); onSaved();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"><ArrowLeft className="w-4 h-4" /> All interviews</button>
      {!data ? (error ? <p role="alert" className="rounded-xl px-3 py-2.5 text-sm bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>
        : <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>) : (
        <form onSubmit={submit} className="space-y-4">
          <div className={`${card} p-5 flex flex-wrap items-center justify-between gap-3`}>
            <div>
              <p className="text-base font-semibold text-slate-900 dark:text-white">{data.category}</p>
              <p className="text-xs text-slate-500 mt-0.5 inline-flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /><span data-no-translate>{data.student.name}</span>{data.student.level ? ` · ${data.student.level}` : ''} · {fmtDate(data.submittedAt)}</p>
            </div>
            <div className="text-end">
              <p className={`text-2xl font-bold ${avg != null ? scoreTone(avg) : 'text-slate-300 dark:text-slate-600'}`}>{avg != null ? `${avg}%` : '–'}</p>
              <p className="text-xs text-slate-500">Overall score</p>
            </div>
          </div>

          <ol className="space-y-3">
            {data.answers.map((a) => (
              <li key={a.position} className={`${card} p-5 space-y-3`}>
                <p className="text-sm font-semibold text-slate-900 dark:text-white" data-no-translate>{a.position}. {a.question}</p>
                {a.hasAudio ? <AuthAudio src={`/api/mock-interviews/${data.id}/answers/${a.position}/audio`} /> : <p className="text-xs text-slate-500">No recording — the student typed this answer.</p>}
                {a.durationSeconds ? <p className="text-xs text-slate-500">Length {fmtSecs(a.durationSeconds)}</p> : null}
                <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Transcript</p>
                  <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line" data-no-translate>{a.transcript || 'No transcript.'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Score (0 = poor, 10 = excellent)</p>
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Score for answer ${a.position}`}>
                    {Array.from({ length: 11 }, (_, n) => (
                      <button key={n} type="button" role="radio" aria-checked={scores[a.position] === n}
                        onClick={() => setScores((s) => ({ ...s, [a.position]: n }))}
                        className={`w-9 h-9 rounded-lg text-sm font-medium border cursor-pointer ${scores[a.position] === n ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{n}</button>
                    ))}
                  </div>
                </div>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Feedback on this answer</span>
                  <textarea value={notes[a.position] || ''} onChange={(e) => setNotes((x) => ({ ...x, [a.position]: e.target.value }))} rows={2} maxLength={2000}
                    placeholder="e.g. Good example, but give a clearer result at the end."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white resize-y" />
                </label>
              </li>
            ))}
          </ol>

          <div className={`${card} p-5 space-y-3`}>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Overall feedback for the student</span>
              <textarea value={overall} onChange={(e) => setOverall(e.target.value)} rows={3} maxLength={4000}
                placeholder="e.g. Confident delivery. Practise structuring answers with the STAR method and slow down a little."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white resize-y" />
            </label>
            {error && <p role="alert" className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</p>}
            {saved && <p role="status" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><CheckCircle2 className="w-4 h-4" />Review sent. The student has been notified.</p>}
            <button type="submit" disabled={busy || !allScored} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50 cursor-pointer">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{data.status === 'reviewed' ? 'Update review' : 'Send review'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Mentor: mock interviews sent by assigned students, to listen to and score. */
export function MentorReviews({ onCountChange }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);

  const load = useCallback(() => {
    miApi('/review-queue').then((d) => {
      setItems(d.data); setError('');
      onCountChange?.(d.data.filter((x) => x.status === 'submitted').length);
    }).catch((e) => { setError(e.message); setItems((x) => x || []); });
  }, [onCountChange]);
  useEffect(() => { load(); }, [load]);

  if (openId) return <ReviewForm id={openId} onBack={() => { setOpenId(null); load(); }} onSaved={load} />;
  if (!items) return <div className="py-12 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>;
  return (
    <div className="space-y-3">
      {error && <p role="alert" className="rounded-xl px-3 py-2.5 text-sm bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 py-12 text-center">
          <ClipboardCheck className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">No mock interviews to review</p>
          <p className="mt-1 text-xs text-slate-500">When an assigned student sends a recorded interview it appears here.</p>
        </div>
      ) : (
        <ul className={`${card} divide-y divide-slate-100 dark:divide-slate-800`}>
          {items.map((it) => {
            const st = MI_STATUS[it.status] || MI_STATUS.submitted;
            return (
              <li key={it.id}>
                <button type="button" onClick={() => setOpenId(it.id)} className="w-full text-start p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate"><span data-no-translate>{it.student.name}</span> · {it.category}</p>
                    <p className="text-xs text-slate-500 truncate">{it.answers} answers · {fmtDate(it.submittedAt)}</p>
                  </div>
                  {it.status === 'reviewed'
                    ? <span className={`text-sm font-bold ${scoreTone(it.overallScore)}`}>{it.overallScore}%</span>
                    : <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${st.cls}`}>Needs review</span>}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default MentorReviews;
