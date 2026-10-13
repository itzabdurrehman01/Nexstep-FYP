import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, CalendarClock, AlertCircle } from 'lucide-react';
import { LEVELS, LEVEL_BY_ID, streamsForLevel, normalizeStream } from '../../config/educationLevels.js';
import { InstitutionPicker } from '../common/SearchableSelect.jsx';
import { SaveNotice } from '../common/SaveNotice.jsx';

const NEXT = { class8: 'class9', class9: 'class10', class10: 'class11', class11: 'class12', class12: 'university', dae: 'university', university: null };
const DURATION = { dae: 36 };

const todayIso = () => new Date().toISOString().slice(0, 10);
const addMonthsIso = (iso, m) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + m); return d.toISOString().slice(0, 10); };
const nice = (iso) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '');

const T = {
  en: {
    level: 'Which class are you in?', group: 'Your group / stream', groupHint: 'You can change this later.',
    institute: 'School / college / university', instituteHint: 'Type your institute name or pick from the list.',
    started: 'When did this class start?', startedHint: 'Your session start date (approximate is fine).',
    promotion: 'When do you move to the next class?', auto: 'Automatically, one year after the class started',
    autoDae: 'Automatically, three years after the diploma started', custom: 'I will pick the date',
    promotionHint: (d) => `Must be on or after ${d} (at least 10 months after your class started).`,
    willMove: (next, d) => `You will move to ${next} on ${d}.`, save: 'Save', saving: 'Saving…', last: 'This is the last level — no automatic promotion.',
  },
  ur: {
    level: 'آپ کس جماعت میں ہیں؟', group: 'آپ کا گروپ', groupHint: 'آپ بعد میں تبدیل کر سکتے ہیں۔',
    institute: 'اسکول / کالج / یونیورسٹی', instituteHint: 'اپنے ادارے کا نام لکھیں یا فہرست سے منتخب کریں۔',
    started: 'یہ جماعت کب شروع ہوئی؟', startedHint: 'سیشن شروع ہونے کی تاریخ (اندازاً بھی ٹھیک ہے)۔',
    promotion: 'اگلی جماعت میں کب جائیں گے؟', auto: 'خودبخود، جماعت شروع ہونے کے ایک سال بعد',
    autoDae: 'خودبخود، ڈپلومہ شروع ہونے کے تین سال بعد', custom: 'میں تاریخ خود منتخب کروں گا',
    promotionHint: (d) => `تاریخ ${d} یا اس کے بعد ہونی چاہیے (جماعت شروع ہونے کے کم از کم 10 ماہ بعد)۔`,
    willMove: (next, d) => `آپ ${d} کو ${next} میں چلے جائیں گے۔`, save: 'محفوظ کریں', saving: 'محفوظ ہو رہا ہے…', last: 'یہ آخری سطح ہے — خودکار ترقی نہیں۔',
  },
};

/**
 * Pick class / level, group, class start date and (optionally) a promotion date.
 * Saves to PUT /api/education and calls onSaved(educationState).
 */
export function EducationLevelForm({ initial, lang = 'en', onSaved, submitLabel, initialMarks }) {
  const t = T[lang] || T.en;
  const [level, setLevel] = useState(initial?.level || '');
  const [stream, setStream] = useState(normalizeStream(initial?.stream) || initial?.stream || '');
  const [institution, setInstitution] = useState(initial?.institution || '');
  const [startedAt, setStartedAt] = useState(initial?.startedAt || todayIso());
  const [custom, setCustom] = useState(Boolean(initial?.customPromotionDate));
  const [promotionDate, setPromotionDate] = useState(initial?.customPromotionDate ? initial.promotionDate : '');
  const [matricPct, setMatricPct] = useState(initialMarks?.matricPct || '');
  const [fscPct, setFscPct] = useState(initialMarks?.fscPct || '');
  const [entryTestScore, setEntryTestScore] = useState(initialMarks?.entryTestScore || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [savedState, setSavedState] = useState(null);

  useEffect(() => {
    if (!level && initial?.level) setLevel(initial.level);
    if (!stream && initial?.stream) setStream(normalizeStream(initial.stream) || initial.stream);
    if (!institution && initial?.institution) setInstitution(initial.institution);
  }, [initial?.level, initial?.stream, initial?.institution]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!matricPct && initialMarks?.matricPct) setMatricPct(initialMarks.matricPct);
    if (!fscPct && initialMarks?.fscPct) setFscPct(initialMarks.fscPct);
    if (!entryTestScore && initialMarks?.entryTestScore) setEntryTestScore(initialMarks.entryTestScore);
  }, [initialMarks?.matricPct, initialMarks?.fscPct, initialMarks?.entryTestScore]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (notice?.tone !== 'success' || !savedState) return undefined;
    const timer = setTimeout(() => {
      const next = savedState;
      setNotice(null);
      setSavedState(null);
      onSaved?.(next);
    }, 1200);
    return () => clearTimeout(timer);
  }, [notice, savedState]); // eslint-disable-line react-hooks/exhaustive-deps

  const info = LEVEL_BY_ID[level];
  const next = level ? NEXT[level] : null;
  const months = DURATION[level] || 12;
  const minStart = level && next ? addMonthsIso(todayIso(), -months) : addMonthsIso(todayIso(), -60);
  const earliestPromotion = startedAt ? addMonthsIso(startedAt, 10) : '';
  const minPromotion = earliestPromotion > todayIso() ? earliestPromotion : todayIso();
  const autoDate = startedAt && next ? addMonthsIso(startedAt, months) : '';
  const effective = custom ? promotionDate : autoDate;

  const streams = streamsForLevel(level);
  const needsMatric = Boolean(level);
  const needsFsc = ['class11', 'class12', 'university'].includes(level);
  const needsEntry = ['class12', 'university'].includes(level);
  const canSave = level && (!streams.length || stream) && institution.trim() && startedAt && (!custom || promotionDate)
    && (!needsMatric || Number(matricPct) > 0)
    && (!needsFsc || Number(fscPct) > 0);

  const pickLevel = (id) => {
    setLevel(id);
    if (!LEVEL_BY_ID[id].streams.includes(normalizeStream(stream) || stream)) setStream('');
    setError('');
  };

  const save = async (e) => {
    e.preventDefault();
    if (!canSave) {
      setNotice({ tone: 'error', title: 'Could not save yet', message: 'Choose your class, group / stream, institute and marks, then tap Continue again.' });
      return;
    }
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/education', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          level, stream: normalizeStream(stream) || stream || null, institution: institution.trim() || null,
          startedAt, promotionDate: custom && next ? promotionDate : null,
          marks: {
            matricPct: Number(matricPct) || 0,
            fscPct: Number(fscPct) || 0,
            entryTestScore: Number(entryTestScore) || 0,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save.');
      const saved = data.data || data;
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          preferredStream: normalizeStream(stream) || stream || '',
          institution: institution.trim() || '',
          gradeLevel: info?.label || level,
          marks: {
            matricPct: Number(matricPct) || 0,
            fscPct: Number(fscPct) || 0,
            entryTestScore: Number(entryTestScore) || 0,
          },
        }),
      }).catch(() => {});
      setSavedState(saved);
      setNotice({
        tone: 'success',
        title: 'Data updated and saved',
        message: submitLabel
          ? 'Your class, stream and institute have been saved. Continuing to the next page.'
          : 'Your class, stream and institute have been saved. They will stay selected when you come back.',
        actionLabel: submitLabel || t.save,
      });
    } catch (err) {
      setError(err.message);
      setNotice({ tone: 'error', title: 'Could not save', message: err.message || 'Something went wrong while saving. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  const levelTiles = useMemo(() => LEVELS, []);

  return (
    <>
    <form onSubmit={save} className="space-y-6">
      <fieldset>
        <legend className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{t.level}</legend>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {levelTiles.map((l) => {
            const Icon = l.icon;
            const active = level === l.id;
            return (
              <button key={l.id} type="button" onClick={() => pickLevel(l.id)} aria-pressed={active}
                className={`relative text-start p-3 rounded-xl border transition-colors cursor-pointer ${
                  active ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
                }`}>
                <Icon className={`w-5 h-5 mb-2 ${active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} strokeWidth={1.75} aria-hidden="true" />
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">{lang === 'ur' ? l.labelUr : l.label}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{lang === 'ur' ? l.subUr : l.sub}</span>
                {active && <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute top-2.5 end-2.5" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </fieldset>

      {level && streams.length > 0 && (
        <fieldset className="relative z-30 overflow-visible">
          <legend className="text-sm font-semibold text-slate-900 dark:text-white">{t.group}</legend>
          <p className="text-xs text-slate-500 mb-2">{t.groupHint}</p>
          <div className="flex flex-wrap gap-2">
            {streams.map((s) => {
              const active = (normalizeStream(stream) || stream) === s;
              return (
              <button key={s} type="button" onClick={() => setStream(s)} aria-pressed={active}
                className={`h-9 px-3 rounded-lg border text-sm cursor-pointer transition-colors ${
                  active ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-medium'
                               : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}>{s}</button>
              );
            })}
          </div>
        </fieldset>
      )}

      {level && (
        <fieldset className="relative z-40 overflow-visible">
          <legend className="text-sm font-semibold text-slate-900 dark:text-white">{t.institute}</legend>
          <p className="text-xs text-slate-500 mb-2">{t.instituteHint}</p>
          <InstitutionPicker id="edu-institution" value={institution} onChange={(v) => setInstitution(v || '')} />
        </fieldset>
      )}

      {level && (
        <fieldset>
          <legend className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
            {lang === 'ur' ? 'بنیادی نمبر / فیصد' : 'Your latest marks / percentage'}
          </legend>
          <p className="text-xs text-slate-500 mb-3">
            {lang === 'ur'
              ? 'یہ نمبر کیریئر اور یونیورسٹی کی سفارش کے لیے استعمال ہوتے ہیں۔'
              : 'Used to rank careers and universities by academic fit. Approximate is fine.'}
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {needsMatric && (
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {['class8', 'class9'].includes(level) ? (lang === 'ur' ? 'آخری امتحان %' : 'Last exam %') : (lang === 'ur' ? 'میٹرک %' : 'Matric / O-Level %')}
                </span>
                <input type="number" min={1} max={100} step="0.1" required value={matricPct} onChange={(e) => setMatricPct(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white" />
              </label>
            )}
            {needsFsc && (
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{lang === 'ur' ? 'ایف ایس سی / انٹر %' : 'FSc / Inter %'}</span>
                <input type="number" min={1} max={100} step="0.1" required value={fscPct} onChange={(e) => setFscPct(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white" />
              </label>
            )}
            {needsEntry && (
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{lang === 'ur' ? 'اینٹری ٹیسٹ %' : 'Entry test % (optional)'}</span>
                <input type="number" min={0} max={100} step="0.1" value={entryTestScore} onChange={(e) => setEntryTestScore(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white" />
              </label>
            )}
          </div>
        </fieldset>
      )}

      {level && (
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className="block text-sm font-semibold text-slate-900 dark:text-white">{t.started}</span>
            <input type="date" value={startedAt} min={minStart} max={todayIso()} onChange={(e) => setStartedAt(e.target.value)} required
              className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white" />
            <span className="block text-xs text-slate-500">{t.startedHint}</span>
          </label>

          {next ? (
            <div className="space-y-1.5">
              <span className="block text-sm font-semibold text-slate-900 dark:text-white">{t.promotion}</span>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input type="radio" name="promo" checked={!custom} onChange={() => setCustom(false)} /> {level === 'dae' ? t.autoDae : t.auto}
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input type="radio" name="promo" checked={custom} onChange={() => setCustom(true)} /> {t.custom}
              </label>
              {custom && (
                <>
                  <input type="date" value={promotionDate} min={minPromotion} onChange={(e) => setPromotionDate(e.target.value)} required
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white" />
                  <span className="block text-xs text-slate-500">{t.promotionHint(nice(earliestPromotion))}</span>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500 self-end">{t.last}</p>
          )}
        </div>
      )}

      {level && next && effective && (
        <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <CalendarClock className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
          {t.willMove(lang === 'ur' ? LEVEL_BY_ID[next].labelUr : LEVEL_BY_ID[next].label, nice(effective))}
        </p>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />{error}
        </p>
      )}

      <button type="submit" disabled={busy}
        className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
        {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
        {busy ? t.saving : (submitLabel || t.save)}
      </button>
    </form>
      <SaveNotice
        open={Boolean(notice)}
        tone={notice?.tone}
        title={notice?.title}
        message={notice?.message}
        actionLabel={notice?.actionLabel || 'OK'}
        onClose={() => {
          const next = savedState;
          const go = notice?.tone === 'success';
          setNotice(null);
          setSavedState(null);
          if (go) onSaved?.(next);
        }}
      />
    </>
  );
}

export default EducationLevelForm;
