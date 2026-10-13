import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Save, User, MapPin, GraduationCap, Award, Plus,
  Trash2, CheckCircle2, AlertCircle, Loader2, Target, BookOpen
} from 'lucide-react';
import { translations } from '../data/translations.js';
import { tr } from '../utils/translator.js';
import { streamsForLevel, profileStream, profileInstitution, normalizeStream } from '../config/educationLevels.js';
import { InstitutionPicker } from './common/SearchableSelect.jsx';
import { PROVINCE_OPTIONS, provinceOptionsFor, normalizeProvince, fetchSavedProfile } from '../utils/profileFields.js';
import { SaveNotice } from './common/SaveNotice.jsx';

// ── Reusable field wrapper ────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors';
const selectClass = inputClass;

// ── Skill level badge ─────────────────────────────────────────────────────────
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const SKILL_CATEGORIES = ['Technical', 'Academic', 'Soft Skill', 'Language', 'Other'];

function SkillRow({ skill, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-2">
      <input
        value={skill.name}
        onChange={e => onChange({ ...skill, name: e.target.value })}
        placeholder="e.g. Python, SQL…"
        className="flex-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <select
        value={skill.level}
        onChange={e => onChange({ ...skill, level: e.target.value })}
        className="px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none cursor-pointer"
      >
        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
      </select>
      <button type="button" onClick={onRemove}
        className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer transition-all"
        title="Remove skill">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Profile completion bar ────────────────────────────────────────────────────
function completionScore(fd) {
  const checks = [
    fd?.name?.trim(),
    fd?.city,
    fd?.preferredStream,
    fd?.institution,
    fd?.marks?.matricPct,
    fd?.marks?.fscPct,
    fd?.topRiasecCluster,
    fd?.targetCareer,
    fd?.goals,
    Array.isArray(fd?.skills) && fd.skills.length > 0,
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

// ── Main component ────────────────────────────────────────────────────────────
export function ProfileModal({ isOpen, onClose, profile, onSaveProfile, lang, onNavigate }) {
  const t = translations[lang];
  const [formData, setFormData] = useState({ ...profile });
  const [saving, setSaving]     = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // { type, msg }
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    let alive = true;
    const apply = (p) => {
      if (!alive || !p) return;
      setFormData({
        ...p,
        preferredStream: profileStream(p),
        institution: profileInstitution(p),
        province: normalizeProvince(p.province) || p.province || 'Punjab',
        phone: p.phone || '',
        languages: Array.isArray(p.languages) ? p.languages : [],
        graduationYear: p.graduationYear ? String(p.graduationYear) : '',
      });
    };
    apply(profile);
    fetchSavedProfile().then(apply).catch(() => {});
    return () => { alive = false; };
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const set = (field, value) => setFormData(p => ({ ...p, [field]: value }));
  const setNested = (parent, field, value) =>
    setFormData(p => ({ ...p, [parent]: { ...p[parent], [field]: value } }));

  // Skill helpers
  const skills = Array.isArray(formData.skills) ? formData.skills : [];
  const addSkill = () =>
    setFormData(p => ({
      ...p, skills: [...(p.skills || []), { name: '', level: 'Beginner', category: 'Technical' }],
    }));
  const updateSkill = (idx, updated) =>
    setFormData(p => ({ ...p, skills: p.skills.map((s, i) => i === idx ? updated : s) }));
  const removeSkill = (idx) =>
    setFormData(p => ({ ...p, skills: p.skills.filter((_, i) => i !== idx) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus(null);
    try {
      const payload = {
        name: formData.name,
        firstName: formData.firstName,
        lastName: formData.lastName,
        city: formData.city,
        phone: formData.phone || '',
        province: normalizeProvince(formData.province) || formData.province || '',
        preferredStream: normalizeStream(formData.preferredStream || formData.education?.stream || ''),
        institution: formData.institution || '',
        graduationYear: formData.graduationYear ? Number(formData.graduationYear) : null,
        languages: Array.isArray(formData.languages) ? formData.languages : [],
        familyMonthlyIncomePkr: formData.familyMonthlyIncomePkr,
        budgetAnnualPkr: formData.budgetAnnualPkr,
        targetCareer: formData.targetCareer,
        goals: formData.goals,
        skills: Array.isArray(formData.skills) ? formData.skills : [],
        marks: {
          matricPct: Number(formData.marks?.matricPct) || 0,
          fscPct: Number(formData.marks?.fscPct) || 0,
          entryTestScore: Number(formData.marks?.entryTestScore) || 0,
        },
      };
      await onSaveProfile(payload);
      setSaveStatus({ type: 'success', msg: 'Profile saved successfully.' });
      setNotice({
        tone: 'success',
        title: 'Data updated and saved',
        message: 'Your profile has been saved. The options you selected will stay selected when you reopen this page.',
      });
    } catch (err) {
      setSaveStatus({ type: 'error', msg: 'Failed to save. Please try again.' });
      setNotice({ tone: 'error', title: 'Could not save', message: err?.message || 'Failed to save. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const pct = completionScore(formData);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">{t.profile.title}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t.profile.setupHeadline}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Profile completion */}
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 shrink-0 space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span>Profile Completion</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Status banner */}
          {saveStatus && (
            <div className={`mx-6 mt-4 flex items-center gap-2 p-3 rounded-2xl border text-xs font-medium ${
              saveStatus.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
            }`}>
              {saveStatus.type === 'success'
                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                : <AlertCircle className="w-4 h-4 shrink-0" />}
              {saveStatus.msg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Personal info */}
            <div>
              <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <User className="w-3.5 h-3.5" /> Personal Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Field label={t.profile.name}>
                    <input type="text" value={formData.name || ''} onChange={e => set('name', e.target.value)}
                      className={inputClass} placeholder="e.g. Muhammad Ali" required />
                  </Field>
                </div>
                <Field label={t.profile.city}>
                  <input type="text" value={formData.city || ''} onChange={e => set('city', e.target.value)}
                    className={inputClass} placeholder="e.g. Islamabad" />
                </Field>
                <Field label="Phone">
                  <input type="tel" value={formData.phone || ''} onChange={e => set('phone', e.target.value)}
                    className={inputClass} placeholder="e.g. 0300 1234567" />
                </Field>
                <Field label={t.profile.province}>
                  <select value={normalizeProvince(formData.province) || ''} onChange={e => set('province', normalizeProvince(e.target.value))} className={selectClass}>
                    <option value="">Select a province</option>
                    {provinceOptionsFor(formData.province).map(p => (
                      <option key={p.value} value={p.value}>{tr(p.label, lang)}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            {/* Academic info */}
            <div>
              <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <GraduationCap className="w-3.5 h-3.5" /> Academic Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-visible relative z-20">
                <Field label={t.profile.grade}>
                  <a href="#/pathway" onClick={onClose} className={`${selectClass} flex items-center justify-between`}>
                    <span className="truncate">{profile?.education?.levelLabel || formData.gradeLevel || 'Not set'}</span>
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Change</span>
                  </a>
                </Field>
                <Field label={t.profile.fscStream}>
                  <select
                    value={normalizeStream(formData.preferredStream || formData.education?.stream || '')}
                    onChange={e => {
                      const next = normalizeStream(e.target.value) || e.target.value;
                      set('preferredStream', next);
                      setFormData((p) => ({ ...p, education: { ...p.education, stream: next } }));
                    }}
                    className={`${selectClass} relative z-30`}
                  >
                    <option value="">Select subject / stream</option>
                    {streamsForLevel(profile?.education?.level).map(s => (
                      <option key={s} value={s}>{tr(s, lang)}</option>
                    ))}
                    {normalizeStream(formData.preferredStream) && !streamsForLevel(profile?.education?.level).includes(normalizeStream(formData.preferredStream)) && (
                      <option value={normalizeStream(formData.preferredStream)}>{normalizeStream(formData.preferredStream)}</option>
                    )}
                  </select>
                </Field>
                <div className="sm:col-span-2 relative z-40">
                  <Field label={t.profile.institution || 'School / college / university'}>
                    <InstitutionPicker id="pm-institution" value={formData.institution || ''} onChange={(v) => set('institution', v || '')} />
                  </Field>
                </div>
                <Field label={t.profile.income}>
                  <input type="number" value={formData.familyMonthlyIncomePkr || ''}
                    onChange={e => set('familyMonthlyIncomePkr', parseInt(e.target.value) || 0)}
                    className={inputClass} placeholder="e.g. 80000 (PKR per month)" min={0} />
                </Field>
                <Field label={t.profile.annualBudget}>
                  <input type="number" value={formData.budgetAnnualPkr || ''}
                    onChange={e => set('budgetAnnualPkr', parseInt(e.target.value) || 0)}
                    className={inputClass} placeholder="e.g. 300000 (PKR per year)" min={0} />
                </Field>
                <Field label="Expected graduation year">
                  <input type="number" min="2010" max="2040" value={formData.graduationYear || ''}
                    onChange={e => set('graduationYear', e.target.value)}
                    className={inputClass} placeholder="e.g. 2028" />
                </Field>
              </div>
            </div>

            {/* Academic marks */}
            <div>
              <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Award className="w-3.5 h-3.5" /> Academic Marks
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ['Matric %',     'matricPct'],
                  ['FSc / Inter %','fscPct'],
                  ['Entry Test',   'entryTestScore'],
                ].map(([label, field]) => (
                  <div key={field} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">{label}</label>
                    <input type="number" min={0} max={100}
                      value={formData.marks?.[field] || ''}
                      onChange={e => setNested('marks', field, parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/30 p-4 space-y-2">
              <h3 className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Interest from quiz</h3>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {formData.topRiasecCluster || profile?.topRiasecCluster || 'Not taken yet'}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                This updates automatically when you finish or retake the interest quiz.
              </p>
              <button
                type="button"
                onClick={() => { onClose(); onNavigate?.('quiz'); }}
                className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {formData.topRiasecCluster || profile?.topRiasecCluster ? 'Retake quiz to change interest' : 'Take the interest quiz'}
              </button>
            </div>

            {/* Career goals */}
            <div>
              <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Target className="w-3.5 h-3.5" /> Career Goals
              </h3>
              <div className="space-y-3">
                <Field label="Target Career">
                  <input type="text" value={formData.targetCareer || ''} onChange={e => set('targetCareer', e.target.value)}
                    className={inputClass} placeholder="e.g. Software & AI Engineering" />
                </Field>
                <Field label="Career Goals">
                  <textarea rows={2} value={formData.goals || ''} onChange={e => set('goals', e.target.value)}
                    className={inputClass + ' resize-none'} placeholder="e.g. Gain admission to BS CS at NUST…" />
                </Field>
              </div>
            </div>

            {/* Skills */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5" /> Skills ({skills.length})
                </h3>
                <button type="button" onClick={addSkill}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-950 text-[11px] font-extrabold cursor-pointer transition-all">
                  <Plus className="w-3 h-3" /> Add Skill
                </button>
              </div>
              <div className="space-y-2">
                {skills.length === 0 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-3">
                    No skills added yet — click "Add Skill" to get started.
                  </p>
                )}
                {skills.map((sk, idx) => (
                  <SkillRow key={idx} skill={sk}
                    onChange={updated => updateSkill(idx, updated)}
                    onRemove={() => removeSkill(idx)} />
                ))}
              </div>
            </div>
          </form>

          {/* Footer actions */}
          <div className="flex justify-end gap-3 p-6 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs cursor-pointer transition-all">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-extrabold text-xs shadow-md cursor-pointer transition-all">
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : <><Save className="w-4 h-4" /> {t.profile.save}</>}
            </button>
          </div>
        </motion.div>
        <SaveNotice
          open={Boolean(notice)}
          tone={notice?.tone}
          title={notice?.title}
          message={notice?.message}
          onClose={() => {
            const go = notice?.tone === 'success';
            setNotice(null);
            if (go) onClose();
          }}
        />
      </div>
    </AnimatePresence>
  );
}
