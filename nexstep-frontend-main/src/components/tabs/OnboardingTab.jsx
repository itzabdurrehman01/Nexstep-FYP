import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { InstitutionPicker, SelectField } from '../common/SearchableSelect.jsx';
import { streamOptionsForProfile, profileStream, profileInstitution, normalizeStream } from '../../config/educationLevels.js';
import { provinceOptionsFor, normalizeProvince, skillNames, fetchSavedProfile, nextSetupPage } from '../../utils/profileFields.js';
import { SaveNotice } from '../common/SaveNotice.jsx';
import { motion, useReducedMotion } from 'motion/react';
import {
  User, Mail, Briefcase, GraduationCap, Target, MapPin, Calendar,
  Upload, Camera, X, Plus, CheckCircle2, Trash2,
  Sparkles, Save, Loader2, Compass, BookOpen, Languages, AlertCircle
} from 'lucide-react';

const CAREER_SUGGESTIONS = [
  'Software Engineer', 'Data Scientist', 'Doctor (MBBS)', 'Mechanical Engineer',
  'Civil Engineer', 'AI / ML Engineer', 'Chartered Accountant', 'Product Designer',
  'Cyber Security Analyst', 'Full Stack Developer', 'Business Analyst', 'Researcher',
];

const SKILL_SUGGESTIONS = [
  'Python', 'JavaScript', 'React', 'TypeScript', 'Java', 'C++',
  'Machine Learning', 'Data Analysis', 'SQL', 'UI/UX Design', 'Problem Solving',
  'Communication', 'Leadership', 'Project Management', 'Research',
];


function TagInput({ id, label, value = [], onChange, suggestions = [], placeholder, maxTags = 12 }) {
  const [input, setInput] = useState('');
  const inputRef = useRef(null);
  const filtered = suggestions
    .filter(s => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s))
    .slice(0, 6);

  const addTag = (tag) => {
    const clean = tag.trim();
    if (!clean || value.includes(clean) || value.length >= maxTags) return;
    onChange([...value, clean]);
    setInput('');
  };

  const removeTag = (tag) => onChange(value.filter(t => t !== tag));

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          {label}
          <span className="ml-1 text-slate-400 font-medium">({value.length}/{maxTags})</span>
        </label>
      )}
      <div
        onClick={() => inputRef.current?.focus()}
        className={`ns-input min-h-[48px] flex flex-wrap gap-1.5 items-center p-2 rounded-2xl border cursor-text bg-slate-50 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-emerald-500/40 transition-all border-slate-200 dark:border-slate-700 focus-within:border-emerald-500`}
      >
        {value.map(tag => (
          <motion.span
            key={typeof tag === 'string' ? tag : tag?.name}
            layout
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
          >
            <span>{typeof tag === 'string' ? tag : tag?.name}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              className="rounded-full hover:bg-emerald-500/20 p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
              aria-label={`Remove ${typeof tag === 'string' ? tag : tag?.name}`}
            >
              <X className="w-3 h-3" />
            </button>
          </motion.span>
        ))}

        {value.length < maxTags && (
          <div className="relative flex-1 min-w-[120px]">
            <input
              ref={inputRef}
              id={id}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addTag(input);
                } else if (e.key === 'Backspace' && !input && value.length > 0) {
                  removeTag(value[value.length - 1]);
                }
              }}
              onBlur={() => { if (input.trim()) addTag(input); }}
              placeholder={value.length === 0 ? placeholder : ''}
              className="w-full bg-transparent border-0 outline-hidden text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 py-1 px-1"
            />
            {input.trim() && filtered.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-0 right-0 mt-1.5 z-20 rounded-xl ns-card p-1.5 shadow-xl border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto"
              >
                {filtered.map(s => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); addTag(s); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                  >
                    <Plus className="w-3 h-3 text-emerald-500" aria-hidden="true" />
                    <span>{s}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AvatarUpload({ value, onChange }) {
  const fileRef = useRef(null);

  const handleFile = (file) => {
    if (!file || !file.type || !file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target && e.target.result;
      if (result) onChange(String(result));
    };
    reader.readAsDataURL(file);
  };

  const fallback = value || 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&auto=format&fit=crop&q=80';

  return (
    <div className="space-y-2">
      <div className="block text-xs font-bold text-slate-700 dark:text-slate-300">
        Profile Photo
      </div>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0 group">
          <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl ring-1 ring-slate-200 dark:ring-slate-700 transition-transform group-hover:scale-[1.03]">
            <img
              src={fallback}
              alt="Profile avatar preview"
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          </div>
          <button
            type="button"
            onClick={() => fileRef.current && fileRef.current.click()}
            aria-label="Upload profile photo"
            className="ns-badge absolute -bottom-1 -right-1 w-9 h-9 rounded-2xl bg-emerald-500 text-slate-950 shadow-lg ring-4 ring-white dark:ring-slate-900 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          >
            <Camera className="w-4 h-4" aria-hidden="true" />
          </button>
          {value ? (
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label="Remove profile photo"
              className="absolute -top-1 -left-1 w-7 h-7 rounded-xl bg-white dark:bg-slate-800 text-red-500 shadow-md ring-2 ring-white dark:ring-slate-800 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Upload a photo</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Square JPG or PNG under 5MB. Helps mentors and recruiters recognize you.
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => fileRef.current && fileRef.current.click()}
              className="ns-btn ns-btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              Choose file
            </button>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            handleFile(files && files[0]);
          }}
        />
      </div>
    </div>
  );
}

export function OnboardingTab({ profile: rawProfile = {}, onSave, onUpdateProfile, onSkip, onNavigate }) {
  const reduceMotion = useReducedMotion();
  // Prefill from the signed-in identity (Google name, email and photo) when the profile is still empty.
  const { user: authUser } = useAuth();
  const profile = useMemo(() => ({
    ...rawProfile,
    firstName: rawProfile.firstName || authUser?.firstName || '',
    lastName: rawProfile.lastName || authUser?.lastName || '',
    email: rawProfile.email || authUser?.email || '',
    avatarUrl: rawProfile.avatarUrl || authUser?.imageUrl || '',
  }), [rawProfile, authUser]);

  const [firstName, setFirstName] = useState(profile.firstName ?? '');
  const [lastName, setLastName] = useState(profile.lastName ?? '');
  const [email, setEmail] = useState(profile.email ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [city, setCity] = useState(profile.city ?? '');
  const [province, setProvince] = useState(normalizeProvince(profile.province));
  const [stream, setStream] = useState(profileStream(profile));
  const [educationLevel, setEducationLevel] = useState(profile.education?.level || profile.educationLevel || '');
  const [institution, setInstitution] = useState(profileInstitution(profile));
  const [graduationYear, setGraduationYear] = useState(profile.graduationYear ? String(profile.graduationYear) : '');
  const [targetCareer, setTargetCareer] = useState(profile.targetCareer ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? '');
  const [languages, setLanguages] = useState(Array.isArray(profile.languages) && profile.languages.length ? profile.languages : ['English', 'Urdu']);
  const [skills, setSkills] = useState(skillNames(profile.skills));
  const [interests, setInterests] = useState(Array.isArray(profile.interests) ? profile.interests : []);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [matricPct, setMatricPct] = useState(profile.marks?.matricPct ? String(profile.marks.matricPct) : '');
  const [fscPct, setFscPct] = useState(profile.marks?.fscPct ? String(profile.marks.fscPct) : '');
  const [budgetAnnualPkr, setBudgetAnnualPkr] = useState(profile.budgetAnnualPkr ? String(profile.budgetAnnualPkr) : '');

  const applySaved = (p) => {
    if (!p) return;
    setFirstName(p.firstName ?? '');
    setLastName(p.lastName ?? '');
    setEmail(p.email ?? profile.email ?? '');
    setPhone(p.phone ?? '');
    setCity(p.city ?? '');
    setProvince(normalizeProvince(p.province));
    setStream(profileStream(p));
    setEducationLevel(p.education?.level || p.educationLevel || '');
    setInstitution(profileInstitution(p));
    setGraduationYear(p.graduationYear ? String(p.graduationYear) : '');
    setTargetCareer(p.targetCareer ?? '');
    setAvatarUrl(p.avatarUrl ?? '');
    setLanguages(Array.isArray(p.languages) && p.languages.length ? p.languages : ['English', 'Urdu']);
    setSkills(skillNames(p.skills));
    setInterests(Array.isArray(p.interests) ? p.interests : []);
    setBio(p.bio ?? '');
    setMatricPct(p.marks?.matricPct ? String(p.marks.matricPct) : '');
    setFscPct(p.marks?.fscPct ? String(p.marks.fscPct) : '');
    setBudgetAnnualPkr(p.budgetAnnualPkr ? String(p.budgetAnnualPkr) : '');
  };

  useEffect(() => {
    let alive = true;
    fetchSavedProfile()
      .then((p) => { if (alive && p) applySaved(p); })
      .catch(() => { if (alive) applySaved(profile); });
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (profile.province) setProvince(normalizeProvince(profile.province));
    if (profile.city) setCity(profile.city);
    if (profile.phone) setPhone(profile.phone);
    if (profile.institution || profile.education?.institution) setInstitution(profileInstitution(profile));
    if (profile.preferredStream || profile.education?.stream) setStream(profileStream(profile));
    if (profile.targetCareer) setTargetCareer(profile.targetCareer);
    if (profile.graduationYear) setGraduationYear(String(profile.graduationYear));
    if (Array.isArray(profile.languages) && profile.languages.length) setLanguages(profile.languages);
    if (profile.firstName) setFirstName(profile.firstName);
    if (profile.lastName) setLastName(profile.lastName);
    if (profile.email) setEmail(profile.email);
    if (profile.education?.level || profile.educationLevel) setEducationLevel(profile.education?.level || profile.educationLevel);
    if (Array.isArray(profile.interests)) setInterests(profile.interests);
    if (profile.skills) setSkills(skillNames(profile.skills));
    if (profile.bio) setBio(profile.bio);
    if (profile.avatarUrl) setAvatarUrl(profile.avatarUrl);
  }, [profile.province, profile.city, profile.phone, profile.institution, profile.preferredStream, profile.education?.stream, profile.education?.institution, profile.targetCareer, profile.graduationYear, profile.firstName, profile.lastName, profile.email, profile.education?.level, profile.educationLevel, profile.interests, profile.skills, profile.bio, profile.avatarUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState(null);

  const goNext = (tab) => {
    if (!tab) return;
    if (typeof onNavigate === 'function') onNavigate(tab);
    else window.location.hash = `#/${tab === 'roleSelect' ? 'role-select' : tab}`;
  };

  useEffect(() => {
    if (notice?.tone !== 'success' || !notice.next) return undefined;
    const timer = setTimeout(() => goNext(notice.next), 1200);
    return () => clearTimeout(timer);
  }, [notice]); // eslint-disable-line react-hooks/exhaustive-deps

  const isDirty = useMemo(() => {
    const base = profile;
    return (
      (firstName || '') !== (base.firstName || '') ||
      (lastName || '') !== (base.lastName || '') ||
      (email || '') !== (base.email || '') ||
      (phone || '') !== (base.phone || '') ||
      (city || '') !== (base.city || '') ||
      province !== normalizeProvince(base.province) ||
      stream !== profileStream(base) ||
      educationLevel !== (base.education?.level || base.educationLevel || '') ||
      (institution || '') !== profileInstitution(base) ||
      graduationYear !== String(base.graduationYear || '') ||
      (targetCareer || '') !== (base.targetCareer || '') ||
      avatarUrl !== (base.avatarUrl || '') ||
      JSON.stringify(languages) !== JSON.stringify(base.languages || ['English', 'Urdu']) ||
      JSON.stringify(skills) !== JSON.stringify(base.skills || []) ||
      JSON.stringify(interests) !== JSON.stringify(base.interests || []) ||
      (bio || '') !== (base.bio || '') ||
      String(matricPct || '') !== String(base.marks?.matricPct || '') ||
      String(fscPct || '') !== String(base.marks?.fscPct || '') ||
      String(budgetAnnualPkr || '') !== String(base.budgetAnnualPkr || '')
    );
  }, [profile, firstName, lastName, email, phone, city, province, stream, educationLevel, institution, graduationYear, targetCareer, avatarUrl, languages, skills, interests, bio, matricPct, fscPct, budgetAnnualPkr]);

  const handleSave = async () => {
    const nameFirst = firstName.trim() || profile.firstName || authUser?.firstName || '';
    const nameLast = lastName.trim() || profile.lastName || authUser?.lastName || '';
    setErrors({});

    setSaveState('saving');
    setNotice(null);
    try {
      if (nameFirst && nameFirst !== firstName) setFirstName(nameFirst);
      if (nameLast && nameLast !== lastName) setLastName(nameLast);
      const payload = {
        phone,
        city,
        province: normalizeProvince(province),
        preferredStream: normalizeStream(stream) || stream,
        institution,
        graduationYear: graduationYear ? parseInt(graduationYear, 10) : null,
        targetCareer,
        avatarUrl,
        languages,
        skills,
        interests,
        bio,
        marks: {
          matricPct: matricPct === '' ? null : Number(matricPct),
          fscPct: fscPct === '' ? null : Number(fscPct),
        },
        budgetAnnualPkr: budgetAnnualPkr === '' ? null : Number(budgetAnnualPkr),
      };
      if (nameFirst) payload.firstName = nameFirst;
      if (nameLast) payload.lastName = nameLast;
      const persist = onUpdateProfile || onSave;
      let saved = null;
      if (persist) {
        saved = await persist(payload);
      } else {
        const res = await fetch('/api/profile', {
          method: 'PUT', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Could not save.');
        saved = json.data;
      }
      if (saved) applySaved(saved);
      const fresh = await fetchSavedProfile().catch(() => saved);
      if (fresh) applySaved(fresh);
      const next = nextSetupPage(fresh || saved || profile);
      setSaveState('saved');
      setNotice({
        tone: 'success',
        title: 'Data updated and saved',
        message: 'Your profile details have been saved. Continuing to the next page.',
        actionLabel: 'Continue',
        next,
      });
    } catch (err) {
      setSaveState('error');
      setNotice({
        tone: 'error',
        title: 'Could not save',
        message: err?.message || 'Something went wrong while saving. Check your connection and try again.',
      });
    }
  };

  const sectionMotion = (delay) => reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay } };

  return (
    <div className="w-full space-y-6 pb-10">
      <motion.section
        {...sectionMotion(0)}
        className="relative overflow-hidden rounded-3xl ns-hero text-white p-6 md:p-8 shadow-2xl border border-slate-800"
      >
        <div className="absolute top-0 right-0 w-[32rem] h-[32rem] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" aria-hidden="true" />
        <div className="absolute -bottom-10 -left-10 w-56 h-56 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-5 md:gap-6">
          <motion.div
            whileHover={{ scale: 1.03, rotate: -1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-2xl ring-4 ring-white/10"
          >
            <Sparkles className="w-8 h-8 md:w-10 md:h-10" aria-hidden="true" />
          </motion.div>
          <div className="space-y-2 flex-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-black uppercase tracking-widest">
              <Compass className="w-3 h-3" aria-hidden="true" />
              Setup Wizard · Profile
            </span>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
              Tell us about yourself
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
              Fill in a few details to build your personalized career roadmap. We&apos;ll use this to match you with careers, skills, and opportunities across Pakistan.
            </p>
          </div>
          <SaveStateBadge state={saveState} dirty={isDirty} />
        </div>
      </motion.section>

      <motion.section {...sectionMotion(0.06)} className="ns-card p-5 sm:p-7 space-y-5 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 pb-1 border-b border-slate-100 dark:border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center ring-1 ring-emerald-500/20">
            <User className="w-4.5 h-4.5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">Basic Information</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Your identity and contact details</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-7">
          <div className="shrink-0">
            <AvatarUpload value={avatarUrl} onChange={setAvatarUrl} />
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="ob-firstname" className="block text-xs font-bold text-slate-700 dark:text-slate-300">First Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
                <input
                  id="ob-firstname"
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className={`ns-input w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-hidden transition-all bg-slate-50 dark:bg-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                    errors.firstName ? 'border-red-400 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                  }`}
                  placeholder="e.g. Muhammad"
                />
              </div>
              {errors.firstName && <p className="ns-input-error text-[11px] text-red-500 dark:text-red-400 font-semibold">{errors.firstName}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ob-lastname" className="block text-xs font-bold text-slate-700 dark:text-slate-300">Last Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
                <input
                  id="ob-lastname"
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className={`ns-input w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-hidden transition-all bg-slate-50 dark:bg-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                    errors.lastName ? 'border-red-400 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                  }`}
                  placeholder="e.g. Ali"
                />
              </div>
              {errors.lastName && <p className="ns-input-error text-[11px] text-red-500 dark:text-red-400 font-semibold">{errors.lastName}</p>}
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="ob-email" className="block text-xs font-bold text-slate-700 dark:text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
                <input
                  id="ob-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={`ns-input w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-hidden transition-all bg-slate-50 dark:bg-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                    errors.email ? 'border-red-400 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                  }`}
                  placeholder="student@example.com"
                />
              </div>
              {errors.email && <p className="ns-input-error text-[11px] text-red-500 dark:text-red-400 font-semibold">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ob-phone" className="block text-xs font-bold text-slate-700 dark:text-slate-300">Phone (Optional)</label>
              <input
                id="ob-phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="ns-input w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-hidden transition-all bg-slate-50 dark:bg-slate-800 focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                placeholder="e.g. 0300 1234567"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ob-city" className="block text-xs font-bold text-slate-700 dark:text-slate-300">City</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
                <input
                  id="ob-city"
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="ns-input w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-hidden transition-all bg-slate-50 dark:bg-slate-800 focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                  placeholder="e.g. Lahore"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <SelectField
                id="ob-province"
                label="Province / Region"
                value={normalizeProvince(province)}
                onChange={(v) => setProvince(normalizeProvince(v))}
                options={provinceOptionsFor(province)}
                placeholder="Select a province"
                icon={MapPin}
              />
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section {...sectionMotion(0.12)} className="relative z-20 overflow-visible ns-card p-5 sm:p-7 space-y-5 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 pb-1 border-b border-slate-100 dark:border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center ring-1 ring-blue-500/20">
            <GraduationCap className="w-4.5 h-4.5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">Education Background</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Your current academic standing</p>
          </div>
        </div>

        {(profile?.education?.levelLabel || stream || institution) && (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/30 px-4 py-3 text-sm text-slate-800 dark:text-slate-100">
            <p className="font-semibold">
              {profile?.education?.levelLabel || 'Class not set'}
              {stream ? <span className="font-normal text-slate-600 dark:text-slate-300"> · {stream}</span> : null}
            </p>
            {institution ? <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{institution}</p> : null}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-visible">
          <div className="space-y-1.5">
            <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Current class / level</span>
            <a href="#/pathway" className="flex items-center justify-between gap-2 h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 hover:border-emerald-400">
              <span className="inline-flex items-center gap-2 min-w-0"><BookOpen className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" /><span className="truncate">{profile?.education?.levelLabel || 'Not set'}</span></span>
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 shrink-0">Change</span>
            </a>
          </div>
          <SelectField
            id="ob-stream"
            label="Academic Stream / Major"
            value={normalizeStream(stream)}
            onChange={(v) => setStream(normalizeStream(v) || v)}
            options={streamOptionsForProfile({ ...profile, preferredStream: normalizeStream(stream) || stream, education: { ...profile.education, stream: normalizeStream(stream) || stream } })}
            placeholder="Select stream"
            icon={Compass}
          />
          <div className="sm:col-span-2 space-y-1.5 relative z-30 overflow-visible">
            <label htmlFor="ob-institution" className="block text-xs font-bold text-slate-700 dark:text-slate-300">School / College / University</label>
            <InstitutionPicker id="ob-institution" value={institution} onChange={(v) => setInstitution(v || '')} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ob-matric" className="block text-xs font-bold text-slate-700 dark:text-slate-300">Matric / current marks %</label>
            <input id="ob-matric" type="number" min="0" max="100" value={matricPct} onChange={(e) => setMatricPct(e.target.value)}
              className="ns-input w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-hidden bg-slate-50 dark:bg-slate-800 focus:border-emerald-500"
              placeholder="e.g. 82" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ob-fsc" className="block text-xs font-bold text-slate-700 dark:text-slate-300">FSc / Inter marks %</label>
            <input id="ob-fsc" type="number" min="0" max="100" value={fscPct} onChange={(e) => setFscPct(e.target.value)}
              className="ns-input w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-hidden bg-slate-50 dark:bg-slate-800 focus:border-emerald-500"
              placeholder="Leave blank if not in Inter yet" />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <label htmlFor="ob-budget" className="block text-xs font-bold text-slate-700 dark:text-slate-300">Annual education budget (PKR)</label>
            <input id="ob-budget" type="number" min="0" value={budgetAnnualPkr} onChange={(e) => setBudgetAnnualPkr(e.target.value)}
              className="ns-input w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-hidden bg-slate-50 dark:bg-slate-800 focus:border-emerald-500"
              placeholder="e.g. 250000" />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <label htmlFor="ob-graduation" className="block text-xs font-bold text-slate-700 dark:text-slate-300">Expected Graduation Year</label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
              <input
                id="ob-graduation"
                type="number"
                min="2010"
                max="2040"
                value={graduationYear}
                onChange={e => setGraduationYear(e.target.value)}
                className="ns-input w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-hidden transition-all bg-slate-50 dark:bg-slate-800 focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                placeholder="e.g. 2028"
              />
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section {...sectionMotion(0.18)} className="ns-card p-5 sm:p-7 space-y-5 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 pb-1 border-b border-slate-100 dark:border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center ring-1 ring-blue-500/20">
            <Target className="w-4.5 h-4.5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">Career Goals &amp; Profile</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Shape your personalized NexStep roadmap</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="ob-career" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Target Career <span className="text-slate-400 font-normal">(Where do you want to be in 5 years?)</span>
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
              <input
                id="ob-career"
                type="text"
                list="ob-career-options"
                value={targetCareer}
                onChange={e => setTargetCareer(e.target.value)}
                className="ns-input w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-hidden transition-all bg-slate-50 dark:bg-slate-800 focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                placeholder="e.g. Software Engineer, Doctor, Architect…"
              />
              <datalist id="ob-career-options">
                {CAREER_SUGGESTIONS.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ob-bio" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Short Bio <span className="text-slate-400 font-normal">({bio.length}/280)</span>
            </label>
            <textarea
              id="ob-bio"
              rows={3}
              maxLength={280}
              value={bio}
              onChange={e => setBio(e.target.value)}
              className="ns-input w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-hidden transition-all bg-slate-50 dark:bg-slate-800 focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/40 resize-none"
              placeholder="e.g. Class 11 ICS student from Multan, interested in software engineering and preparing for NUST NET."
            />
          </div>

          <TagInput
            id="ob-languages"
            label="Languages"
            value={languages}
            onChange={setLanguages}
            suggestions={['English', 'Urdu', 'Punjabi', 'Sindhi', 'Pashto', 'Balochi', 'Saraiki', 'Arabic', 'Spanish', 'French', 'Mandarin', 'German']}
            placeholder="Type and press Enter to add languages"
            maxTags={8}
          />

          <TagInput
            id="ob-skills"
            label="Current Skills"
            value={skills}
            onChange={setSkills}
            suggestions={SKILL_SUGGESTIONS}
            placeholder="Add skills like Python, React, Data Analysis…"
            maxTags={15}
          />

          <TagInput
            id="ob-interests"
            label="Interests &amp; Hobbies"
            value={interests}
            onChange={setInterests}
            suggestions={['Reading', 'Coding', 'Gaming', 'Photography', 'Volunteering', 'Sports', 'Music', 'Art', 'Robotics', 'Debates', 'Community Work', 'Tutoring']}
            placeholder="Add interests and areas of curiosity"
            maxTags={12}
          />
        </div>
      </motion.section>

      <motion.div
        initial={reduceMotion ? {} : { opacity: 0, y: 10 }}
        animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.24 }}
        className="sticky bottom-4 z-30"
      >
        <div className="ns-card p-4 sm:p-5 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>Profile Progress</span>
              {isDirty && <span className="ns-badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[11px] font-black border border-amber-200 dark:border-amber-800/40">Unsaved changes</span>}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Save your info and we&apos;ll generate a personalized career roadmap for you.
            </div>
          </div>
          <div className="flex gap-2.5 sm:flex-shrink-0">
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="ns-btn ns-btn-ghost flex-1 sm:flex-none px-5 py-2.5 rounded-2xl text-xs font-black cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                Skip for now
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saveState === 'saving'}
              className="ns-btn ns-btn-primary flex-1 sm:flex-none px-6 py-2.5 rounded-2xl text-xs font-black cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 shadow-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center justify-center gap-2"
            >
              {saveState === 'saving' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Saving…</span>
                </>
              ) : saveState === 'saved' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" aria-hidden="true" />
                  <span>Save &amp; Continue</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
      <SaveNotice
        open={Boolean(notice)}
        tone={notice?.tone}
        title={notice?.title}
        message={notice?.message}
        actionLabel={notice?.actionLabel || 'OK'}
        onClose={() => {
          const next = notice?.tone === 'success' ? notice.next : '';
          setNotice(null);
          setSaveState('idle');
          if (next) goNext(next);
        }}
      />
    </div>
  );
}

function SaveStateBadge({ state, dirty }) {
  if (state === 'saved') {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
      >
        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
        <span className="text-[11px] font-black">All changes saved</span>
      </motion.div>
    );
  }
  if (state === 'saving') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        <span className="text-[11px] font-black">Saving…</span>
      </div>
    );
  }
  if (state === 'error') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300">
        <AlertCircle className="w-4 h-4" aria-hidden="true" />
        <span className="text-[11px] font-black">Couldn&apos;t save</span>
      </div>
    );
  }
  if (dirty) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
        <Sparkles className="w-4 h-4" aria-hidden="true" />
        <span className="text-[11px] font-black">Unsaved changes</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-400">
      <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
      <span className="text-[11px] font-black">Up to date</span>
    </div>
  );
}

export default OnboardingTab;
