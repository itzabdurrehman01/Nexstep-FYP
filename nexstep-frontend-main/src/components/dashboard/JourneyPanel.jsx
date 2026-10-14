import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, CalendarDays } from 'lucide-react';
import { academicJourney, deadlineReminders, journeyMilestones, saveGuidance } from '../../utils/academicJourney.js';
import { rankAllCareers } from '../../utils/careerMatchService.js';

export function JourneyPanel({ profile, onNavigate }) {
  const stages = academicJourney(profile?.education?.level);
  const [stored, setStored] = useState(profile?.guidance?.recommendations || []);
  useEffect(() => {
    let cancelled = false;
    const liveTitles = rankAllCareers(profile || {}).slice(0, 3).map((c) => c.title).filter(Boolean);
    const already = profile?.guidance?.recommendations || [];
    if (already.length) setStored(already);
    saveGuidance(profile, liveTitles).then((ok) => {
      if (!cancelled && ok && liveTitles.length) setStored(liveTitles);
    });
    return () => { cancelled = true; };
  }, [profile]);
  const steps = journeyMilestones(profile, stored);
  const deadlines = deadlineReminders(profile);
  const done = steps.filter((s) => s.done).length;

  return (
    <section className="ns-card p-5 sm:p-6 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">From your class to university</h2>
        <p className="text-xs text-slate-500 mt-0.5">{done} of {steps.length} milestones done</p>
      </div>

      <ol className="flex items-center gap-1 overflow-x-auto pb-1">
        {stages.map((stage, i) => (
          <li key={stage.id} className="flex items-center min-w-0 flex-1">
            <div className="flex flex-col items-center gap-1 min-w-[4.5rem]">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border ${
                stage.state === 'done' ? 'bg-emerald-600 text-white border-emerald-600'
                  : stage.state === 'current' ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
              }`}>{stage.state === 'done' ? '✓' : i + 1}</span>
              <span className={`text-[11px] text-center leading-tight ${stage.state === 'upcoming' ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200 font-medium'}`}>{stage.label}</span>
            </div>
            {i < stages.length - 1 && (
              <span className={`h-0.5 flex-1 mx-1 ${stage.state === 'done' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
          </li>
        ))}
      </ol>

      {stored.length > 0 && (
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Saved on your profile: {stored.join(' · ')}
          {profile?.topRiasecCluster ? ` · Quiz ${profile.topRiasecCluster}` : ''}
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Milestones</p>
          {steps.map((s) => (
            <button key={s.label} type="button" onClick={() => onNavigate?.(s.tab)}
              className="w-full flex items-center gap-2 text-left text-sm cursor-pointer">
              {s.done ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <Circle className="w-4 h-4 text-slate-300 shrink-0" />}
              <span className={s.done ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500'}>{s.label}</span>
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Deadline reminders</p>
          {deadlines.map((d) => (
            <div key={d.title} className="flex items-start gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
              <CalendarDays className="w-4 h-4 mt-0.5 text-rose-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{d.title}</p>
                <p className="text-xs text-slate-500">{d.date} · {d.days === 0 ? 'today' : `${d.days} days`} · {d.kind === 'entry-test' ? 'Entry test' : 'University application'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
