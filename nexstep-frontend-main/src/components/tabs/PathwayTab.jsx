import React, { useMemo, useState } from 'react';
import { Compass, Target, Route, ClipboardList, Lightbulb, ExternalLink, CalendarClock, Pencil, ArrowRight, X } from 'lucide-react';
import { EducationLevelForm } from '../onboarding/EducationLevelForm.jsx';
import { LEVEL_GUIDES } from '../../config/levelGuides.js';
import { LEVEL_BY_ID, levelLabel, normalizeStream } from '../../config/educationLevels.js';
import { getNavGroups, navLabel } from '../../config/navigation.js';

const nice = (iso) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '');

function Section({ icon: Icon, title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white mb-3">
        <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} aria-hidden="true" />{title}
      </h2>
      {children}
    </section>
  );
}

/** "My Pathway": the student's class / level, promotion date and general guidance for that stage. */
export function PathwayTab({ profile, onEducationSaved, onNavigate, lang = 'en' }) {
  const edu = profile?.education ?? null;
  const [editing, setEditing] = useState(!edu?.level);
  const guide = edu?.level ? LEVEL_GUIDES[edu.level] : null;
  const tools = useMemo(() => getNavGroups('STUDENT', edu?.level).flatMap((g) => g.items).filter((i) => !['dashboard', 'pathway'].includes(i.id)), [edu?.level]);
  const Icon = LEVEL_BY_ID[edu?.level]?.icon ?? Compass;

  return (
    <div className="space-y-6 w-full">
      <header>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{lang === 'ur' ? 'میرا راستہ' : 'My Pathway'}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {lang === 'ur' ? 'آپ کی جماعت کے مطابق رہنمائی اور ٹولز۔' : 'Guidance and tools matched to your class in the Pakistani education system.'}
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        {editing ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{edu?.level ? 'Change your class / level' : 'Tell us your class to personalise NexStep'}</h2>
              {edu?.level && (
                <button type="button" onClick={() => setEditing(false)} aria-label="Cancel" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-4 h-4" /></button>
              )}
            </div>
            <EducationLevelForm
              initial={{ ...edu, stream: normalizeStream(edu?.stream || profile?.preferredStream), institution: edu?.institution || profile?.institution }}
              initialMarks={profile?.marks}
              lang={lang}
              onSaved={(state) => { onEducationSaved?.(state); setEditing(false); }}
            />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="w-12 h-12 shrink-0 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <Icon className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {levelLabel(edu.level, lang)}{(edu.stream || profile?.preferredStream) ? <span className="text-slate-500 font-normal"> · {normalizeStream(edu.stream || profile.preferredStream)}</span> : null}
              </p>
              {(edu.institution || profile?.institution) ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{edu.institution || profile.institution}</p>
              ) : null}
              {edu.nextLevel && edu.promotionDate ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <CalendarClock className="w-4 h-4" aria-hidden="true" />
                  Moves to {levelLabel(edu.nextLevel, lang)} on {nice(edu.promotionDate)}{edu.customPromotionDate ? ' (your date)' : ''}
                </p>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Final level</p>
              )}
              {edu.needsStream && <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">Choose your group for this level to get better recommendations.</p>}
            </div>
            <button type="button" onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
              <Pencil className="w-4 h-4" aria-hidden="true" /> Change
            </button>
          </div>
        )}
      </section>

      {guide && (
        <>
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-900/50 p-5">
            <h2 className="text-base font-semibold text-emerald-900 dark:text-emerald-200">{guide.title}</h2>
            <p className="mt-1 text-sm text-emerald-900/80 dark:text-emerald-200/80">{guide.summary}</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Section icon={Target} title="Focus this year">
              <ul className="space-y-2">
                {guide.focus.map((f) => <li key={f} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />{f}</li>)}
              </ul>
            </Section>
            <Section icon={ClipboardList} title="Exams & tests to know">
              {guide.exams.length === 0 ? <p className="text-sm text-slate-500">No board exam this year — focus on choosing your Matric group.</p> : (
                <ul className="space-y-2">
                  {guide.exams.map((x) => <li key={x} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />{x}</li>)}
                </ul>
              )}
            </Section>
          </div>

          <Section icon={Route} title="Your options next">
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {guide.options.map((o) => (
                <div key={o.title} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{o.title}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{o.leadsTo}</p>
                  {o.needs && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400"><span className="font-medium">Requires:</span> {o.needs}</p>}
                </div>
              ))}
            </div>
          </Section>

          <div className="grid lg:grid-cols-2 gap-6">
            <Section icon={Lightbulb} title="Good to know">
              <ul className="space-y-2">
                {guide.tips.map((tip) => <li key={tip} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />{tip}</li>)}
              </ul>
            </Section>
            <Section icon={ExternalLink} title="Official sources">
              <ul className="space-y-2">
                {guide.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400 hover:underline">
                      {s.name}<ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-500">Dates, fees and merit change every year — always confirm on the official website.</p>
            </Section>
          </div>

          <Section icon={Compass} title="Tools for your level">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {tools.map((t) => {
                const TIcon = t.icon;
                return (
                  <button key={t.id} type="button" onClick={() => onNavigate?.(t.id)}
                    className="group flex items-center gap-3 p-3 rounded-xl text-start hover:bg-slate-50 dark:hover:bg-slate-800/70 cursor-pointer">
                    <span className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                      <TIcon className="w-[18px] h-[18px]" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-900 dark:text-white truncate">{navLabel(t, lang)}</span>
                      <span className="block text-xs text-slate-500 truncate">{t.desc}</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 rtl:rotate-180" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

export default PathwayTab;
