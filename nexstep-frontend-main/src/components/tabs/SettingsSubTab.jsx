import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { motion, useReducedMotion } from 'motion/react';
import {
  User, Mail, Briefcase, GraduationCap, Target, MapPin, Calendar,
  Upload, Camera, X, Plus, CheckCircle2, Trash2,
  Sparkles, Save, Loader2, Compass, BookOpen, Languages, Settings2,
  ShieldCheck, Bell, Moon, Sun, Eye, EyeOff, KeyRound, AlertCircle,
  LogOut, UserCog, Globe, Smartphone, Users
} from 'lucide-react';
import { useAuth, getUserRole } from '../../context/AuthContext.jsx';
import { InstitutionPicker, SelectField } from '../common/SearchableSelect.jsx';
import { streamOptionsForProfile, profileStream, profileInstitution, normalizeStream } from '../../config/educationLevels.js';
import { provinceOptionsFor, normalizeProvince, skillNames, optionsWithSaved } from '../../utils/profileFields.js';
import { SaveNotice } from '../common/SaveNotice.jsx';

const SETTING_TABS = [
  { id: 'profile', label: 'Profile', icon: UserCog },
  { id: 'account', label: 'Account', icon: ShieldCheck },
  { id: 'preferences', label: 'Preferences', icon: Settings2 },
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
        className="ns-input min-h-[48px] flex flex-wrap gap-1.5 items-center p-2 rounded-2xl border cursor-text bg-slate-50 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-emerald-500/40 transition-all border-slate-200 dark:border-slate-700 focus-within:border-emerald-500"
      >
        {value.map(tag => (
          <motion.span
            key={typeof tag === 'string' ? tag : tag?.name}
            layout
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
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

function Toggle({ checked, onChange, label, description, Icon }) {
  return (
    <label className="flex items-start gap-3 sm:gap-4 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group">
      <div className="w-9 h-9 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center ring-1 ring-slate-200 dark:ring-slate-700 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
        {Icon && <Icon className="w-4.5 h-4.5" aria-hidden="true" />}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5 pt-0.5">
        <div className="text-xs font-black text-slate-800 dark:text-slate-200">{label}</div>
        {description && <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 mt-0.5 w-11 h-6 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 focus-visible:ring-emerald-500/50 ${
          checked ? ' bg-emerald-500 shadow-md' : 'bg-slate-200 dark:bg-slate-700'
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  );
}

const MENTOR_EXPERTISE = [
  'Medical admissions (MDCAT)', 'Engineering admissions (ECAT / NET)', 'Computer science & IT', 'Business & commerce',
  'Study abroad', 'Scholarships', 'Career counselling', 'Interview preparation', 'Resume review', 'Freelancing',
];
const MENTOR_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'English', 'Accounting', 'Economics', 'Urdu'];
const SESSION_MODES = [
  { value: 'Online', label: 'Online' },
  { value: 'In-person', label: 'In person' },
  { value: 'Both', label: 'Online & in person' },
];

const EMPTY_MENTOR = { headline: '', organization: '', expertise: [], subjects: [], yearsExperience: '', availability: '', sessionMode: '', maxMentees: '', linkedinUrl: '' };
const DEFAULT_PREFS = { emailNotif: true, alertEmails: true, inAppAlerts: true, pushNotif: false, mentorRequests: true, marketingOptin: false };

/** Turns the API profile into the editable form shape. */
function toForm(p = {}, user) {
  const mp = p.mentorProfile || {};
  return {
    firstName: p.firstName ?? user?.firstName ?? '',
    lastName: p.lastName ?? user?.lastName ?? '',
    phone: p.phone ?? '',
    city: p.city ?? '',
    province: normalizeProvince(p.province),
    institution: profileInstitution(p),
    preferredStream: profileStream(p),
    graduationYear: p.graduationYear ? String(p.graduationYear) : '',
    targetCareer: p.targetCareer ?? '',
    bio: p.bio ?? '',
    languages: Array.isArray(p.languages) && p.languages.length ? p.languages : [],
    interests: Array.isArray(p.interests) ? p.interests : [],
    skills: skillNames(p.skills),
    preferences: { ...DEFAULT_PREFS, ...(p.preferences || {}) },
    mentor: {
      ...EMPTY_MENTOR,
      ...mp,
      expertise: Array.isArray(mp.expertise) ? mp.expertise : [],
      subjects: Array.isArray(mp.subjects) ? mp.subjects : [],
      yearsExperience: mp.yearsExperience ?? '',
      maxMentees: mp.maxMentees ?? '',
      sessionMode: mp.sessionMode ?? '',
    },
  };
}

function ProfilePhoto({ url, name, onUpload, busy }) {
  const fileRef = useRef(null);
  const [error, setError] = useState('');
  const pick = async (file) => {
    setError('');
    if (!file) return;
    if (!file.type?.startsWith('image/')) return setError('Choose a JPG, PNG or WebP image.');
    if (file.size > 5 * 1024 * 1024) return setError('Image must be under 5 MB.');
    try { await onUpload(file); } catch (err) { setError(err?.errors?.[0]?.message || err?.message || 'Upload failed.'); }
  };
  return (
    <div className="flex items-center gap-4">
      <div className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 flex items-center justify-center text-2xl font-semibold text-slate-500">
        {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : (name || '?').charAt(0).toUpperCase()}
      </div>
      <div className="space-y-1.5 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Profile photo</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Square JPG or PNG, under 5 MB. Saved straight away.</p>
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 cursor-pointer">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} {url ? 'Change photo' : 'Upload photo'}
        </button>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
          onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
    </div>
  );
}

export function SettingsSubTab({ profile = {}, onProfileSaved, onNavigate, lang = "en", setLang }) {
  const { user, logout, openUserProfile, clerkEnabled, setProfileImage } = useAuth();
  const role = getUserRole(user);
  const isMentor = role === 'MENTOR';
  const reduceMotion = useReducedMotion();
  const { isDark, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState('profile');
  const [serverProfile, setServerProfile] = useState(profile && Object.keys(profile).length ? profile : null);
  const [form, setForm] = useState(() => toForm(profile, user));
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState(null);
  const [errors, setErrors] = useState({});
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(profile.avatarUrl || user?.avatarUrl || '');

  // Always start from what is stored in the database.
  const loadProfile = useCallback(async () => {
    const res = await fetch('/api/profile', { credentials: 'include' });
    if (!res.ok) throw new Error('Could not load your profile.');
    const json = await res.json();
    return json.data;
  }, []);

  useEffect(() => {
    let alive = true;
    loadProfile()
      .then((p) => { if (!alive) return; setServerProfile(p); setForm(toForm(p, user)); setPhotoUrl(p.avatarUrl || user?.avatarUrl || ''); })
      .catch((err) => alive && setSaveError(err.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [loadProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!profile || loading) return;
    setForm((f) => {
      const incoming = toForm({ ...(serverProfile || {}), ...profile }, user);
      return {
        ...f,
        province: f.province || incoming.province,
        preferredStream: f.preferredStream || incoming.preferredStream,
        institution: f.institution || incoming.institution,
        city: f.city || incoming.city,
        phone: f.phone || incoming.phone,
        targetCareer: f.targetCareer || incoming.targetCareer,
        graduationYear: f.graduationYear || incoming.graduationYear,
        languages: f.languages?.length ? f.languages : incoming.languages,
        interests: f.interests?.length ? f.interests : incoming.interests,
        skills: f.skills?.length ? f.skills : incoming.skills,
      };
    });
  }, [profile.province, profile.preferredStream, profile.city, profile.phone, profile.institution, profile.targetCareer, profile.graduationYear]); // eslint-disable-line react-hooks/exhaustive-deps

  const baseline = useMemo(() => JSON.stringify(toForm(serverProfile || {}, user)), [serverProfile, user]);
  const isDirty = !loading && JSON.stringify(form) !== baseline;

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setMentor = (key, value) => setForm((f) => ({ ...f, mentor: { ...f.mentor, [key]: value } }));
  const setPref = (key, value) => setForm((f) => ({ ...f, preferences: { ...f.preferences, [key]: value } }));

  // ── Preferences save on their own (no Save button) ──
  const [prefNotice, setPrefNotice] = useState(null);
  const [browserPermission, setBrowserPermission] = useState(() => (typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'));
  const savePrefs = async (patch) => {
    const before = form.preferences;
    const next = { ...(serverProfile?.preferences || {}), ...before, ...patch };
    setForm((f) => ({ ...f, preferences: { ...f.preferences, ...patch } }));
    try {
      const res = await fetch('/api/profile', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ preferences: next }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not save your preference.');
      setServerProfile((sp) => ({ ...(sp || {}), preferences: next }));
      onProfileSaved?.({ preferences: next });
      try { localStorage.setItem('ns_prefs', JSON.stringify(next)); } catch { /* ignore */ }
      setPrefNotice({ tone: 'ok', text: 'Saved.' });
      setTimeout(() => setPrefNotice((n) => (n?.tone === 'ok' ? null : n)), 1500);
    } catch (err) {
      setForm((f) => ({ ...f, preferences: before }));
      setPrefNotice({ tone: 'error', text: err.message });
    }
  };
  const toggleBrowserNotifications = async (on) => {
    if (!on) { savePrefs({ pushNotif: false }); return; }
    if (browserPermission === 'unsupported') return;
    let perm = Notification.permission;
    if (perm === 'default') { try { perm = await Notification.requestPermission(); } catch { perm = 'denied'; } }
    setBrowserPermission(perm);
    if (perm === 'granted') savePrefs({ pushNotif: true });
    else setPrefNotice({ tone: 'error', text: 'Your browser blocked notifications. Allow them for this site in the address bar, then try again.' });
  };

  const handleSave = async () => {
    const nextErrors = {
      graduationYear: !form.graduationYear || /^(19|20|21)\d\d$/.test(form.graduationYear) ? '' : 'Enter a 4-digit year.',
      linkedinUrl: !isMentor || !form.mentor.linkedinUrl || /^https?:\/\//i.test(form.mentor.linkedinUrl) ? '' : 'Link must start with https://',
    };
    setErrors(nextErrors);
    if (nextErrors.graduationYear || nextErrors.linkedinUrl) {
      setActiveTab('profile');
    }

    setSaveState('saving'); setSaveError('');
    const body = {
      phone: form.phone.trim(),
      city: form.city.trim(),
      province: normalizeProvince(form.province),
      bio: form.bio.trim(),
      languages: form.languages,
      preferences: form.preferences,
    };
    if (form.firstName.trim()) body.firstName = form.firstName.trim();
    if (form.lastName.trim()) body.lastName = form.lastName.trim();
    if (isMentor) {
      body.mentorProfile = {
        ...form.mentor,
        yearsExperience: form.mentor.yearsExperience === '' ? null : Number(form.mentor.yearsExperience),
        maxMentees: form.mentor.maxMentees === '' ? null : Number(form.mentor.maxMentees),
      };
    } else {
      Object.assign(body, {
        institution: form.institution.trim(),
        preferredStream: normalizeStream(form.preferredStream) || form.preferredStream,
        graduationYear: form.graduationYear ? Number(form.graduationYear) : null,
        targetCareer: form.targetCareer.trim(),
        skills: form.skills,
        interests: form.interests,
      });
    }
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not save your changes.');
      const fresh = await loadProfile();            // re-read what was actually stored
      setServerProfile(fresh);
      setForm(toForm(fresh, user));
      onProfileSaved?.(fresh);                       // keep the rest of the app in sync
      setSaveState('saved');
      setNotice({
        tone: 'success',
        title: 'Data updated and saved',
        message: 'Your profile has been saved. The options you selected will stay selected when you reopen this page.',
      });
    } catch (err) {
      setSaveError(err.message);
      setSaveState('error');
      setNotice({ tone: 'error', title: 'Could not save', message: err.message || 'Something went wrong while saving. Please try again.' });
    }
  };

  const uploadPhoto = async (file) => {
    setPhotoBusy(true);
    try {
      const url = await setProfileImage(file);
      if (url) setPhotoUrl(url);
    } finally { setPhotoBusy(false); }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserCog },
    { id: 'account', label: 'Account', icon: ShieldCheck },
    { id: 'preferences', label: 'Preferences', icon: Settings2 },
  ];
  const sectionMotion = reduceMotion ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25 } };
  const edu = profile?.education ?? serverProfile?.education;

  return (
    <div className="w-full space-y-6 pb-10">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Settings</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isMentor ? 'Your mentor profile, account and preferences.' : 'Your profile, account and preferences.'}
          </p>
        </div>
        <SaveStateBadge state={saveState} dirty={isDirty} onSave={handleSave} saving={saveState === 'saving'} />
      </header>

      <div role="tablist" aria-label="Settings sections" className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/70 w-full sm:w-fit">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button key={t.id} role="tab" aria-selected={active} type="button" onClick={() => setActiveTab(t.id)}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm cursor-pointer ${active ? 'bg-white dark:bg-slate-900 shadow-sm font-medium text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
              <Icon className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />{t.label}
            </button>
          );
        })}
      </div>

      {saveError && (
        <p role="alert" className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{saveError}
        </p>
      )}

      {loading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading your settings…</div>
      ) : (
        <>
          {activeTab === 'profile' && (
            <motion.div key="profile" {...sectionMotion} className="space-y-6">
              <section className="ns-card p-5 sm:p-6 space-y-5 border border-slate-200 dark:border-slate-800">
                <SectionHeader icon={User} title="Basic information" subtitle="Your name and contact details" />
                <ProfilePhoto url={photoUrl} name={form.firstName} onUpload={uploadPhoto} busy={photoBusy} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldInput id="st-firstname" label="First name" value={form.firstName} onChange={(v) => set('firstName', v)} error={errors.firstName} icon={User} />
                  <FieldInput id="st-lastname" label="Last name" value={form.lastName} onChange={(v) => set('lastName', v)} icon={User} />
                  <div className="sm:col-span-2 space-y-1.5">
                    <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Email</span>
                    <div className="flex items-center justify-between gap-2 h-11 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-2 min-w-0"><Mail className="w-4 h-4 text-slate-400 shrink-0" /><span className="truncate">{serverProfile?.email || user?.email}</span></span>
                      <button type="button" onClick={() => setActiveTab('account')} className="text-xs font-medium text-emerald-700 dark:text-emerald-400 shrink-0 cursor-pointer">Change</button>
                    </div>
                  </div>
                  <FieldInput id="st-phone" label="Phone (optional)" type="tel" value={form.phone} onChange={(v) => set('phone', v)} icon={Smartphone} placeholder="e.g. 0300 1234567" />
                  <FieldInput id="st-city" label="City" value={form.city} onChange={(v) => set('city', v)} icon={MapPin} />
                  <div className="sm:col-span-2"><SelectField id="st-province" label="Province / region" value={normalizeProvince(form.province)} onChange={(v) => set('province', normalizeProvince(v))} options={provinceOptionsFor(form.province)} placeholder="Select a province" icon={Globe} /></div>
                </div>
              </section>

              {isMentor ? (
                <section className="ns-card p-5 sm:p-6 space-y-5 border border-slate-200 dark:border-slate-800">
                  <SectionHeader icon={Briefcase} title="Mentor profile" subtitle="What students see when they look for a mentor" color="blue" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2"><FieldInput id="mt-headline" label="Headline" value={form.mentor.headline} onChange={(v) => setMentor('headline', v)} icon={Sparkles} placeholder="e.g. Software engineer helping ICS students into CS" /></div>
                    <FieldInput id="mt-org" label="Organisation / institution" value={form.mentor.organization} onChange={(v) => setMentor('organization', v)} icon={Briefcase} />
                    <FieldInput id="mt-years" label="Years of experience" type="number" value={String(form.mentor.yearsExperience ?? '')} onChange={(v) => setMentor('yearsExperience', v)} icon={Calendar} />
                    <div className="sm:col-span-2">
                      <TagInput id="mt-expertise" label="Areas you guide students in" value={form.mentor.expertise} onChange={(v) => setMentor('expertise', v)} suggestions={MENTOR_EXPERTISE} placeholder="Type and press Enter" maxTags={15} />
                    </div>
                    <div className="sm:col-span-2">
                      <TagInput id="mt-subjects" label="Subjects (optional)" value={form.mentor.subjects} onChange={(v) => setMentor('subjects', v)} suggestions={MENTOR_SUBJECTS} placeholder="Type and press Enter" maxTags={15} />
                    </div>
                    <SelectField id="mt-mode" label="Session type" value={form.mentor.sessionMode} onChange={(v) => setMentor('sessionMode', v)} options={optionsWithSaved(SESSION_MODES, form.mentor.sessionMode)} placeholder="Select session type" icon={Users} />
                    <FieldInput id="mt-max" label="Max. students at a time" type="number" value={String(form.mentor.maxMentees ?? '')} onChange={(v) => setMentor('maxMentees', v)} icon={Users} />
                    <div className="sm:col-span-2"><FieldInput id="mt-avail" label="Availability" value={form.mentor.availability} onChange={(v) => setMentor('availability', v)} icon={Calendar} placeholder="e.g. Weekdays after 6 pm, Saturdays" /></div>
                    <div className="sm:col-span-2"><FieldInput id="mt-linkedin" label="LinkedIn profile (optional)" type="url" value={form.mentor.linkedinUrl} onChange={(v) => setMentor('linkedinUrl', v)} error={errors.linkedinUrl} icon={Globe} placeholder="https://linkedin.com/in/…" /></div>
                  </div>
                </section>
              ) : (
                <section className="relative z-20 overflow-visible ns-card p-5 sm:p-6 space-y-5 border border-slate-200 dark:border-slate-800">
                  <SectionHeader icon={GraduationCap} title="Education" subtitle="Your class, stream and school" color="blue" />
                  {(edu?.levelLabel || form.preferredStream || form.institution) && (
                    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/30 px-4 py-3 text-sm text-slate-800 dark:text-slate-100">
                      <p className="font-semibold">
                        {edu?.levelLabel || 'Class not set'}
                        {form.preferredStream ? <span className="font-normal text-slate-600 dark:text-slate-300"> · {normalizeStream(form.preferredStream)}</span> : null}
                      </p>
                      {form.institution ? <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{form.institution}</p> : null}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-visible">
                    <div className="space-y-1.5">
                      <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">Class / level</span>
                      <div className="flex items-center justify-between gap-2 h-11 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200">
                        <span className="inline-flex items-center gap-2 min-w-0"><BookOpen className="w-4 h-4 text-slate-400 shrink-0" /><span className="truncate">{edu?.levelLabel || 'Not set'}</span></span>
                        <button type="button" onClick={() => onNavigate?.('pathway')} className="text-xs font-medium text-emerald-700 dark:text-emerald-400 shrink-0 cursor-pointer">Change</button>
                      </div>
                    </div>
                    <SelectField
                      id="st-stream"
                      label="Academic stream / group"
                      value={normalizeStream(form.preferredStream)}
                      onChange={(v) => set('preferredStream', normalizeStream(v) || v)}
                      options={streamOptionsForProfile({ ...serverProfile, ...profile, preferredStream: normalizeStream(form.preferredStream) || form.preferredStream, education: { ...(edu || {}), stream: normalizeStream(form.preferredStream) || form.preferredStream } })}
                      placeholder="Select stream"
                      icon={Compass}
                    />
                    <div className="sm:col-span-2 space-y-1.5 relative z-30 overflow-visible"><label htmlFor="st-institution" className="block text-xs font-bold text-slate-700 dark:text-slate-300">School / college / university</label><InstitutionPicker id="st-institution" value={form.institution} onChange={(v) => set('institution', v || '')} /></div>
                    <FieldInput id="st-graduation" label="Expected completion year" type="number" value={form.graduationYear} onChange={(v) => set('graduationYear', v)} error={errors.graduationYear} icon={Calendar} placeholder="e.g. 2028" />
                    <FieldInput id="st-career" label="Target career (optional)" value={form.targetCareer} onChange={(v) => set('targetCareer', v)} icon={Target} />
                    <div className="sm:col-span-2">
                      <TagInput id="st-skills" label="Skills" value={form.skills} onChange={(v) => set('skills', v)} suggestions={SKILL_SUGGESTIONS} placeholder="Type and press Enter" maxTags={15} />
                    </div>
                    <div className="sm:col-span-2">
                      <TagInput id="st-interests" label="Interests & hobbies" value={form.interests} onChange={(v) => set('interests', v)} suggestions={['Reading', 'Coding', 'Gaming', 'Photography', 'Volunteering', 'Sports', 'Music', 'Art', 'Robotics', 'Debates']} placeholder="Type and press Enter" maxTags={12} />
                    </div>
                  </div>
                </section>
              )}

              <section className="ns-card p-5 sm:p-6 space-y-4 border border-slate-200 dark:border-slate-800">
                <SectionHeader icon={Languages} title="About you" subtitle={isMentor ? 'A short introduction for students' : 'A short introduction for mentors'} color="violet" />
                <div className="space-y-1.5">
                  <label htmlFor="st-bio" className="block text-xs font-bold text-slate-700 dark:text-slate-300">Bio <span className="text-slate-400 font-normal">({form.bio.length}/{isMentor ? 600 : 280})</span></label>
                  <textarea id="st-bio" rows={4} maxLength={isMentor ? 600 : 280} value={form.bio} onChange={(e) => set('bio', e.target.value)}
                    className="ns-input w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/40 resize-none outline-hidden" />
                </div>
                <TagInput id="st-languages" label="Languages" value={form.languages} onChange={(v) => set('languages', v)}
                  suggestions={['English', 'Urdu', 'Punjabi', 'Sindhi', 'Pashto', 'Balochi', 'Saraiki', 'Arabic']} placeholder="Type and press Enter" maxTags={8} />
              </section>

              <StickySaveBar saveState={saveState} isDirty={isDirty} onSave={handleSave} />
            </motion.div>
          )}

          {activeTab === 'account' && (
            <motion.div key="account" {...sectionMotion} className="space-y-6">
              <section className="ns-card p-5 sm:p-6 space-y-4 border border-slate-200 dark:border-slate-800">
                <SectionHeader icon={ShieldCheck} title="Account & security" subtitle="Email, password, two-step verification and connected accounts" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Sign-in details are managed securely by Clerk. Use “Manage account” to change your email or password, turn on two-step verification, connect Google or sign out other devices.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <button type="button" onClick={() => openUserProfile()} disabled={!clerkEnabled} className="ns-btn-solid disabled:opacity-60">
                    <KeyRound className="w-4 h-4" strokeWidth={1.75} /> Manage account
                  </button>
                  <button type="button" onClick={logout} className="ns-btn-outline"><LogOut className="w-4 h-4" strokeWidth={1.75} /> Sign out</button>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'preferences' && (
            <motion.div key="preferences" {...sectionMotion} className="space-y-6">
              {prefNotice && (
                <p role={prefNotice.tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ${prefNotice.tone === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
                  {prefNotice.tone === 'error' ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}{prefNotice.text}
                </p>
              )}
              <section className="ns-card p-5 sm:p-6 space-y-4 border border-slate-200 dark:border-slate-800">
                <SectionHeader icon={Settings2} title="Appearance & language" subtitle="Applied straight away and remembered on every device you sign in on" color="violet" />
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="text-xs font-black text-slate-800 dark:text-slate-200">Theme</div>
                    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Theme">
                      {[{ id: 'light', label: 'Light', Icon: Sun }, { id: 'dark', label: 'Dark', Icon: Moon }].map(({ id, label, Icon: I }) => (
                        <button key={id} type="button" role="radio" aria-checked={(isDark ? 'dark' : 'light') === id}
                          onClick={() => { setTheme(id); savePrefs({ theme: id }); }}
                          className={`inline-flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-medium border cursor-pointer ${(isDark ? 'dark' : 'light') === id ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                          <I className="w-4 h-4" />{label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="text-xs font-black text-slate-800 dark:text-slate-200">Language</div>
                    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Language">
                      {[{ id: 'en', label: 'English' }, { id: 'ur', label: 'اردو' }].map(({ id, label }) => (
                        <button key={id} type="button" role="radio" aria-checked={lang === id} data-no-translate
                          onClick={() => { setLang?.(id); savePrefs({ language: id }); }}
                          className={`inline-flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-medium border cursor-pointer ${lang === id ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                          <Languages className="w-4 h-4" />{label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="ns-card p-5 sm:p-6 space-y-4 border border-slate-200 dark:border-slate-800">
                <SectionHeader icon={Bell} title="Notifications" subtitle="Changes save automatically" color="amber" />
                <Toggle checked={form.preferences.inAppAlerts !== false} onChange={(v) => savePrefs({ inAppAlerts: v })} Icon={Bell}
                  label="Pop-up alerts in NexStep" description="Show calendar reminders and new messages as pop-ups while NexStep is open. They always stay in the bell." />
                <Toggle checked={form.preferences.pushNotif === true && browserPermission === 'granted'} onChange={toggleBrowserNotifications} Icon={Smartphone}
                  label="Browser notifications"
                  description={browserPermission === 'unsupported' ? 'This browser does not support notifications.'
                    : browserPermission === 'denied' ? 'Blocked by your browser. Allow notifications for this site in the address bar, then turn this on.'
                      : 'Show reminders even when NexStep is in another tab.'} />
                <Toggle checked={form.preferences.emailNotif !== false} onChange={(v) => savePrefs({ emailNotif: v })} Icon={Mail}
                  label="Email notifications" description={isMentor ? 'Email me about session requests, interviews to review and admin messages.' : 'Email me about mentor replies, interview reviews and payments.'} />
                {form.preferences.emailNotif !== false && (
                  <Toggle checked={form.preferences.alertEmails !== false} onChange={(v) => savePrefs({ alertEmails: v })} Icon={Calendar}
                    label="Calendar alerts by email" description="Also email me my calendar reminders when they are due." />
                )}
                <Toggle checked={form.preferences.mentorRequests !== false} onChange={(v) => savePrefs({ mentorRequests: v })} Icon={Users}
                  label={isMentor ? 'Emails about students' : 'Emails about my mentor'} description={isMentor ? 'Session requests, cancellations and mock interviews from your students.' : 'Session replies and interview reviews from your mentor.'} />
                <Toggle checked={form.preferences.marketingOptin === true} onChange={(v) => savePrefs({ marketingOptin: v })} Icon={Sparkles}
                  label="Product updates" description="Occasional emails about new NexStep features." />
                {serverProfile && serverProfile.emailDelivery === false && (
                  <p className="text-xs text-slate-500 flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />Email sending is not set up on this server yet, so emails are not sent for now. Your choices are saved and apply once it is.</p>
                )}
              </section>
            </motion.div>
          )}
        </>
      )}
      <SaveNotice
        open={Boolean(notice)}
        tone={notice?.tone}
        title={notice?.title}
        message={notice?.message}
        onClose={() => { setNotice(null); if (saveState === 'saved' || saveState === 'error') setSaveState('idle'); }}
      />
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, color = 'emerald' }) {
  const colorMap = {
    emerald: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20',
    blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-blue-500/20',
    violet: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-blue-500/20',
    teal: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20',
    amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/20',
  };
  const classes = colorMap[color] || colorMap.emerald;
  return (
    <div className="flex items-center gap-3 pb-1 border-b border-slate-100 dark:border-slate-800">
      <div className={`w-9 h-9 rounded-xl  ${classes} flex items-center justify-center ring-1`}>
        <Icon className="w-4.5 h-4.5" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-sm font-black text-slate-900 dark:text-white">{title}</h2>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{subtitle}</p>
      </div>
    </div>
  );
}

function FieldInput({ id, label, value, onChange, type = 'text', error, icon: Icon, placeholder }) {
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={id} className="block text-xs font-bold text-slate-700 dark:text-slate-300">{label}</label>}
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />}
        <input
          id={id}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`ns-input w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-hidden transition-all bg-slate-50 dark:bg-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
            error ? 'border-red-400 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
          }`}
        />
      </div>
      {error && <p className="ns-input-error text-[11px] text-red-500 dark:text-red-400 font-semibold flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}

function FieldPassword({ id, label, value, onChange, show, toggleShow, autoComplete, placeholder }) {
  const hasToggle = typeof show === 'boolean';
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-bold text-slate-700 dark:text-slate-300">{label}</label>
      <div className="relative">
        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
        <input
          id={id}
          type={hasToggle && show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="ns-input w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-hidden transition-all bg-slate-50 dark:bg-slate-800 focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
        />
        {hasToggle && (
          <button type="button" onClick={toggleShow}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

function SaveStateBadge({ state, dirty, onSave, saving }) {
  if (state === 'saved') return (
    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
      <CheckCircle2 className="w-4 h-4" /><span className="text-[11px] font-black">All changes saved</span>
    </motion.div>
  );
  if (saving) return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
      <Loader2 className="w-4 h-4 animate-spin" /><span className="text-[11px] font-black">Saving…</span>
    </div>
  );
  if (dirty) return (
    <button type="button" onClick={onSave}
      className="ns-btn ns-btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 shadow-md bg-emerald-500 hover:bg-emerald-600 text-slate-950">
      <Save className="w-3.5 h-3.5" /><span>Save Changes</span>
    </button>
  );
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400">
      <CheckCircle2 className="w-4 h-4" /><span className="text-[11px] font-black">Up to date</span>
    </div>
  );
}

function StickySaveBar({ saveState, isDirty, onSave }) {
  if (saveState === 'saved' && !isDirty) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
      className="sticky bottom-4 z-30">
      <div className="ns-card p-4 sm:p-5 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <span>Profile Settings</span>
            {isDirty && saveState !== 'saving' && saveState !== 'saved' && (
              <span className="ns-badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[11px] font-black border border-amber-200 dark:border-amber-800/40">Unsaved</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">All changes are encrypted before being saved.</div>
        </div>
        <button type="button" onClick={onSave} disabled={saveState === 'saving'}
          className="ns-btn ns-btn-primary flex-1 sm:flex-none px-6 py-2.5 rounded-2xl text-xs font-black cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 shadow-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 flex items-center justify-center gap-2">
          {saveState === 'saving' ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>Saving…</span></>)
            : saveState === 'saved' ? (<><CheckCircle2 className="w-4 h-4" /><span>Saved!</span></>)
            : (<><Save className="w-4 h-4" /><span>Save Changes</span></>)}
        </button>
      </div>
    </motion.div>
  );
}

export default SettingsSubTab;
