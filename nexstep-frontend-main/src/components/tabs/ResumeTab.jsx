import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Download, Plus, Trash2, ChevronDown, ChevronRight,
  X, Mail, Phone, MapPin, Linkedin, Globe, Printer,
  RotateCcw, User, GraduationCap, Briefcase, Code2,
  FolderKanban, Award, AlignLeft, Eye, Edit3,
  Check, AlertTriangle, Sparkles, Save, ExternalLink
} from 'lucide-react';

const STORAGE_KEY = 'nexstep_resume_data';

const defaultResumeData = {
  personal: {
    fullName: '',
    jobTitle: '',
    email: '',
    phone: '',
    city: '',
    linkedin: '',
    portfolio: ''
  },
  objective: '',
  education: [],
  experience: [],
  skills: [],
  projects: [],
  certifications: []
};

function skillName(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') return String(value.name ?? value.skill ?? value.title ?? '').trim();
  return '';
}

function normalizeSkills(value, fallback = defaultResumeData.skills) {
  const source = Array.isArray(value) ? value : fallback;
  return [...new Set(source.map(skillName).filter(Boolean))];
}

function normalizeResumeData(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    ...defaultResumeData,
    ...value,
    personal: { ...defaultResumeData.personal, ...(value.personal ?? {}) },
    education: Array.isArray(value.education) ? value.education : defaultResumeData.education,
    experience: (Array.isArray(value.experience) ? value.experience : defaultResumeData.experience)
      .map((entry) => ({ ...entry, bullets: Array.isArray(entry?.bullets) ? entry.bullets : [] })),
    skills: normalizeSkills(value.skills),
    projects: (Array.isArray(value.projects) ? value.projects : defaultResumeData.projects)
      .map((entry) => ({ ...entry, techStack: Array.isArray(entry?.techStack) ? entry.techStack : [] })),
    certifications: Array.isArray(value.certifications) ? value.certifications : defaultResumeData.certifications,
  };
}

function genId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function EmptyState({ icon: Icon, title, description, color = 'primary' }) {
  const colorMap = {
    primary: 'bg-[var(--ns-primary-500)]/15 text-[var(--ns-primary-600)] dark:text-[var(--ns-primary-400)]',
    accent: 'bg-[var(--ns-accent-500)]/15 text-[var(--ns-accent-600)] dark:text-[var(--ns-accent-400)]',
    muted: 'bg-slate-500/10 text-slate-500 dark:text-slate-400'
  };
  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 rounded-2xl border-2 border-dashed border-[var(--ns-border)] bg-[var(--ns-surface-2)]/50 text-center gap-2">
      <div className={`w-10 h-10 rounded-xl  ${colorMap[color]} flex items-center justify-center shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-bold text-[var(--ns-text)]">{title}</p>
        {description && (
          <p className="text-[11px] text-[var(--ns-text-subtle)] mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  );
}

function AccordionSection({ title, icon: Icon, isOpen, onToggle, children, countBadge, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="ns-card overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 p-4 text-left cursor-pointer hover:bg-[var(--ns-surface-2)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ns-primary-500)] focus-visible:ring-inset group"
        aria-expanded={isOpen}
        aria-label={`${title} section - ${isOpen ? 'Collapse' : 'Expand'}`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-[var(--ns-primary-500)]/15 dark:bg-[var(--ns-primary-500)]/20 text-[var(--ns-primary-700)] dark:text-[var(--ns-primary-400)] flex items-center justify-center shrink-0 ring-1 ring-[var(--ns-primary-500)]/20 group-hover:ring-[var(--ns-primary-500)]/40 transition-all">
            <Icon className="w-4.5 h-4.5" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-extrabold text-[var(--ns-text)] truncate tracking-tight">{title}</h3>
          </div>
          {typeof countBadge === 'number' && countBadge > 0 && (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center justify-center min-w-[24px] h-[22px] px-2 rounded-full bg-[var(--ns-accent-500)]/15 dark:bg-[var(--ns-accent-500)]/25 text-[var(--ns-accent-700)] dark:text-[var(--ns-accent-400)] text-[11px] font-black shrink-0 ring-1 ring-[var(--ns-accent-500)]/25"
            >
              {countBadge}
            </motion.span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 0 : -90 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="shrink-0 w-7 h-7 rounded-lg bg-[var(--ns-surface-2)] flex items-center justify-center"
        >
          <ChevronDown className="w-4 h-4 text-[var(--ns-text-subtle)]" strokeWidth={2.5} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-[var(--ns-border-soft)]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SkillsTagInput({ skills, onChange }) {
  const safeSkills = normalizeSkills(skills, []);
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  const addSkill = (raw) => {
    const val = raw.trim().replace(/,$/, '').trim();
    if (!val) return;
    if (safeSkills.some(s => s.toLowerCase() === val.toLowerCase())) return;
    onChange([...safeSkills, val]);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(e.target.value);
      setInput('');
    } else if (e.key === 'Backspace' && !e.target.value && safeSkills.length > 0) {
      onChange(safeSkills.slice(0, -1));
    }
  };

  const removeSkill = (idx) => {
    onChange(safeSkills.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2.5">
      <label className="ns-input-label">Core Skills</label>
      <div className="ns-input flex flex-wrap gap-1.5 min-h-[44px] items-start py-2">
        {safeSkills.map((s, i) => (
          <motion.span
            key={`${s}-${i}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.02 }}
            className="ns-tag pr-1.5 gap-1.5 group"
          >
            {s}
            <button
              onClick={(e) => { e.stopPropagation(); removeSkill(i); }}
              className="w-4 h-4 rounded-full hover:bg-[var(--ns-danger-bg)] text-[var(--ns-text-subtle)] hover:text-[var(--ns-danger)] flex items-center justify-center shrink-0 transition-colors cursor-pointer opacity-60 group-hover:opacity-100"
              aria-label={`Remove skill: ${s}`}
            >
              <X className="w-3 h-3" strokeWidth={3} />
            </button>
          </motion.span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => { if (input) { addSkill(input); setInput(''); } }}
          placeholder={safeSkills.length === 0 ? 'Type a skill, press Enter or comma...' : 'Add more...'}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-[var(--ns-text)] placeholder:text-[var(--ns-text-faint)] text-sm py-1"
          aria-label="Add new skill"
        />
      </div>
      <span className="ns-input-helper">Press Enter or comma to add · Click × to remove · Backspace to delete last</span>
    </div>
  );
}

function AutoSaveIndicator({ status }) {
  const config = {
    saved: {
      icon: Check,
      label: 'Saved',
      className: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/15 ring-emerald-500/20'
    },
    saving: {
      icon: Save,
      label: 'Saving...',
      className: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/15 ring-amber-500/20 animate-pulse'
    },
    idle: {
      icon: Save,
      label: 'Auto-save enabled',
      className: 'text-slate-500 dark:text-slate-400 bg-slate-500/10 dark:bg-slate-500/15 ring-slate-500/20'
    }
  };
  const c = config[status] || config.idle;
  const Icon = c.icon;
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ring-1 text-[11px] font-bold ${c.className}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </div>
  );
}

function ResumePreview({ resumeData }) {
  const { personal, objective, education, experience, skills, projects, certifications } = resumeData;

  return (
    <div
      id="resume-print-area"
      className="w-full bg-white text-slate-900 shadow-xl rounded-sm"
      style={{
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        aspectRatio: '1 / 1.414',
        minHeight: '297mm',
        maxWidth: '210mm'
      }}
    >
      <div className="h-full flex flex-col p-10 sm:p-12 md:p-14 print:p-14">
        <header className="pb-6 mb-5 border-b-[2.5px] border-slate-900 resume-section print:break-inside-avoid">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="min-w-0 flex-1">
              <h1 className="text-[28px] md:text-[30px] font-black tracking-tight text-slate-900 uppercase leading-[1.05]">
                {personal.fullName || 'Your Name Here'}
              </h1>
              {personal.jobTitle && (
                <p className="text-sm font-semibold text-slate-600 mt-1.5 tracking-wide">
                  {personal.jobTitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-[11px] text-slate-600">
            {personal.email && (
              <span className="inline-flex items-center gap-1.5 shrink-0">
                <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                {personal.email}
              </span>
            )}
            {personal.phone && (
              <span className="inline-flex items-center gap-1.5 shrink-0">
                <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                {personal.phone}
              </span>
            )}
            {personal.city && (
              <span className="inline-flex items-center gap-1.5 shrink-0">
                <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                {personal.city}
              </span>
            )}
            {personal.linkedin && (
              <span className="inline-flex items-center gap-1.5 shrink-0">
                <Linkedin className="w-3 h-3 text-slate-500 shrink-0" />
                {personal.linkedin}
              </span>
            )}
            {personal.portfolio && (
              <span className="inline-flex items-center gap-1.5 shrink-0">
                <Globe className="w-3 h-3 text-slate-500 shrink-0" />
                {personal.portfolio}
              </span>
            )}
          </div>
        </header>

        {objective && (
          <section className="mb-5 resume-section print:break-inside-avoid">
            <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-900 border-b border-slate-200 pb-1.5 mb-2.5 flex items-center gap-2">
              <AlignLeft className="w-3 h-3 text-slate-700" />
              Professional Summary
            </h2>
            <p className="text-[11.5px] leading-[1.75] text-slate-700 font-medium">
              {objective}
            </p>
          </section>
        )}

        {education.length > 0 && (
          <section className="mb-5 resume-section print:break-inside-avoid">
            <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-900 border-b border-slate-200 pb-1.5 mb-3 flex items-center gap-2">
              <GraduationCap className="w-3 h-3 text-slate-700" />
              Education
            </h2>
            <div className="space-y-3.5">
              {education.map((edu, idx) => (
                <div key={edu.id} className="relative pl-6">
                  <div className="absolute left-0 top-1">
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-white shadow-sm" />
                    {idx < education.length - 1 && (
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[1.5px] h-[calc(100%+8px)] bg-emerald-300 " />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-black text-slate-900 leading-snug">
                          {edu.degree}
                        </p>
                        <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                          {edu.institution}
                        </p>
                      </div>
                      <div className="text-right shrink-0 space-y-0.5">
                        {edu.cgpa && (
                          <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            {edu.cgpa}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-500 font-bold whitespace-nowrap">
                          {edu.yearRange}
                        </p>
                      </div>
                    </div>
                    {edu.description && (
                      <p className="text-[11px] text-slate-600 leading-[1.7] pt-1">
                        {edu.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {experience.length > 0 && (
          <section className="mb-5 resume-section print:break-inside-avoid">
            <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-900 border-b border-slate-200 pb-1.5 mb-3 flex items-center gap-2">
              <Briefcase className="w-3 h-3 text-slate-700" />
              Experience
            </h2>
            <div className="space-y-4">
              {experience.map((exp) => (
                <div key={exp.id} className="space-y-1.5">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-black text-slate-900 leading-snug">
                        {exp.role}
                      </p>
                      <p className="text-[11px] text-slate-600 font-semibold mt-0.5 inline-flex items-center gap-1.5">
                        <span className="inline-block w-1 h-1 rounded-full bg-slate-400" />
                        {exp.company}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-500 font-bold shrink-0 text-right whitespace-nowrap">
                      {exp.dateRange}
                    </p>
                  </div>
                  {exp.bullets.length > 0 && (
                    <ul className="mt-1.5 space-y-1">
                      {exp.bullets.filter(Boolean).map((b, bi) => (
                        <li
                          key={bi}
                          className="text-[11px] text-slate-700 leading-[1.7] pl-4 relative font-medium before:content-['▸'] before:absolute before:left-0 before:text-emerald-500 before:font-black before:text-[11px]"
                        >
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {projects.length > 0 && (
          <section className="mb-5 resume-section print:break-inside-avoid">
            <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-900 border-b border-slate-200 pb-1.5 mb-3 flex items-center gap-2">
              <FolderKanban className="w-3 h-3 text-slate-700" />
              Projects
            </h2>
            <div className="space-y-3.5">
              {projects.map((proj) => (
                <div key={proj.id} className="space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[12px] font-black text-slate-900 leading-snug">
                      {proj.title}
                    </p>
                    {proj.link && (
                      <a
                        href={`https://${proj.link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-blue-700 font-bold shrink-0 hover:underline inline-flex items-center gap-1"
                        onClick={(e) => e.preventDefault()}
                      >
                        {proj.link}
                      </a>
                    )}
                  </div>
                  {proj.techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 py-0.5">
                      {proj.techStack.map((t, ti) => (
                        <span
                          key={ti}
                          className="resume-skill-tag inline-flex px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold tracking-tight"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {proj.description && (
                    <p className="text-[11px] text-slate-700 leading-[1.7] font-medium">
                      {proj.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {certifications.length > 0 && (
          <section className="mb-5 resume-section print:break-inside-avoid">
            <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-900 border-b border-slate-200 pb-1.5 mb-3 flex items-center gap-2">
              <Award className="w-3 h-3 text-slate-700" />
              Certifications
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              {certifications.map((cert) => (
                <div key={cert.id} className="flex justify-between items-start gap-3 text-[11px]">
                  <div className="min-w-0 flex-1">
                    <span className="font-black text-slate-900 block leading-snug">{cert.name}</span>
                    <span className="text-slate-600 font-medium text-[11px]">· {cert.issuer}</span>
                  </div>
                  <span className="text-slate-500 font-bold shrink-0 whitespace-nowrap">{cert.year}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {skills.length > 0 && (
          <section className="mt-auto resume-section print:break-inside-avoid">
            <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-900 border-b border-slate-200 pb-1.5 mb-3 flex items-center gap-2">
              <Code2 className="w-3 h-3 text-slate-700" />
              Core Skills
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s, si) => (
                <span
                  key={si}
                  className="resume-skill-tag px-2.5 py-1 rounded-md bg-slate-50 border border-slate-300 text-slate-700 text-[11px] font-bold tracking-tight shadow-sm"
                >
                  {s}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export function ResumeTab({ profile, lang = 'en' }) {
  const [openSections, setOpenSections] = useState({
    personal: true,
    objective: false,
    education: true,
    experience: false,
    skills: true,
    projects: false,
    certifications: false
  });
  const [mobileView, setMobileView] = useState('edit');
  const [loadedFromStorage, setLoadedFromStorage] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [resumeData, setResumeData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const normalized = normalizeResumeData(JSON.parse(saved));
        if (normalized) return normalized;
      }
    } catch {}
    return {
      ...defaultResumeData,
      personal: {
        ...defaultResumeData.personal,
        fullName: profile?.name || defaultResumeData.personal.fullName,
        email: profile?.email || defaultResumeData.personal.email,
        city: profile?.city ? `${profile.city}, Pakistan` : defaultResumeData.personal.city
      },
      skills: Array.isArray(profile?.skills) && profile.skills.length > 0
        ? normalizeSkills([...profile.skills, ...defaultResumeData.skills])
        : defaultResumeData.skills
    };
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!loadedFromStorage) {
      setLoadedFromStorage(true);
      setSaveStatus('saved');
      return;
    }
    setSaveStatus('saving');
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(resumeData));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1500);
      } catch {}
    }, 400);
    return () => clearTimeout(timeout);
  }, [resumeData, loadedFromStorage]);

  const toggleSection = (k) => setOpenSections(prev => ({ ...prev, [k]: !prev[k] }));

  const updatePersonal = (key, val) => {
    setResumeData(prev => ({ ...prev, personal: { ...prev.personal, [key]: val } }));
  };

  const addEducation = () => {
    setResumeData(prev => ({
      ...prev,
      education: [...prev.education, {
        id: genId('edu'),
        institution: 'New Institution Name',
        degree: 'Degree / Diploma',
        yearRange: '2024 - 2026',
        cgpa: '',
        description: ''
      }]
    }));
    setOpenSections(p => ({ ...p, education: true }));
  };

  const updateEducation = (id, key, val) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.map(e => e.id === id ? { ...e, [key]: val } : e)
    }));
  };

  const removeEducation = (id) => {
    setResumeData(prev => ({ ...prev, education: prev.education.filter(e => e.id !== id) }));
  };

  const addExperience = () => {
    setResumeData(prev => ({
      ...prev,
      experience: [...prev.experience, {
        id: genId('exp'),
        company: 'Company Name',
        role: 'Job Title / Role',
        dateRange: 'Jan 2026 - Present',
        bullets: ['Describe your key responsibilities and achievements']
      }]
    }));
    setOpenSections(p => ({ ...p, experience: true }));
  };

  const updateExperience = (id, key, val) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(e => e.id === id ? { ...e, [key]: val } : e)
    }));
  };

  const updateExpBullet = (expId, bulletIdx, val) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(e => {
        if (e.id !== expId) return e;
        const newBullets = [...e.bullets];
        newBullets[bulletIdx] = val;
        return { ...e, bullets: newBullets };
      })
    }));
  };

  const addExpBullet = (expId) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(e =>
        e.id === expId ? { ...e, bullets: [...e.bullets, 'New achievement or responsibility'] } : e
      )
    }));
  };

  const removeExpBullet = (expId, bulletIdx) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(e => {
        if (e.id !== expId) return e;
        if (e.bullets.length <= 1) return e;
        return { ...e, bullets: e.bullets.filter((_, i) => i !== bulletIdx) };
      })
    }));
  };

  const removeExperience = (id) => {
    setResumeData(prev => ({ ...prev, experience: prev.experience.filter(e => e.id !== id) }));
  };

  const addProject = () => {
    setResumeData(prev => ({
      ...prev,
      projects: [...prev.projects, {
        id: genId('proj'),
        title: 'Project Title',
        techStack: [],
        link: '',
        description: 'Brief description of the project, your role, and key outcomes.'
      }]
    }));
    setOpenSections(p => ({ ...p, projects: true }));
  };

  const updateProject = (id, key, val) => {
    setResumeData(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, [key]: val } : p)
    }));
  };

  const removeProject = (id) => {
    setResumeData(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== id) }));
  };

  const addCertification = () => {
    setResumeData(prev => ({
      ...prev,
      certifications: [...prev.certifications, {
        id: genId('cert'),
        name: 'Certification Name',
        issuer: 'Issuing Organization',
        year: '2026',
        link: ''
      }]
    }));
    setOpenSections(p => ({ ...p, certifications: true }));
  };

  const updateCert = (id, key, val) => {
    setResumeData(prev => ({
      ...prev,
      certifications: prev.certifications.map(c => c.id === id ? { ...c, [key]: val } : c)
    }));
  };

  const removeCert = (id) => {
    setResumeData(prev => ({ ...prev, certifications: prev.certifications.filter(c => c.id !== id) }));
  };

  const handlePrint = useCallback(() => {
    try { document.body.classList.add('printing-resume'); } catch {}
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        try { document.body.classList.remove('printing-resume'); } catch {}
      }, 500);
    }, 150);
  }, []);

  const handleReset = () => {
    const reset = {
      ...defaultResumeData,
      personal: {
        ...defaultResumeData.personal,
        fullName: profile?.name || defaultResumeData.personal.fullName,
        city: profile?.city ? `${profile.city}, Pakistan` : defaultResumeData.personal.city
      }
    };
    setResumeData(reset);
    setShowResetConfirm(false);
  };

  const handleImportFromProfile = () => {
    setResumeData(prev => {
      const next = { ...prev, personal: { ...prev.personal } };
      if (profile?.name) next.personal.fullName = profile.name;
      if (profile?.city) next.personal.city = `${profile.city}, Pakistan`;
      if (profile?.email) next.personal.email = profile.email;
      if (profile?.phone) next.personal.phone = profile.phone;
      if (Array.isArray(profile?.skills) && profile.skills.length > 0) {
        next.skills = normalizeSkills([...profile.skills, ...prev.skills]);
      }
      if (profile?.goals) {
        next.objective = prev.objective === defaultResumeData.objective
          ? `${profile.goals}. ${defaultResumeData.objective}`
          : prev.objective;
      }
      return next;
    });
  };

  const { personal, objective, education, experience, skills, projects, certifications } = resumeData;

  const sectionConfigs = [
    { key: 'personal', title: 'Personal Information', icon: User, index: 0 },
    { key: 'objective', title: 'Professional Objective / Summary', icon: AlignLeft, index: 1 },
    { key: 'education', title: 'Education', icon: GraduationCap, countBadge: education.length, index: 2 },
    { key: 'experience', title: 'Experience', icon: Briefcase, countBadge: experience.length, index: 3 },
    { key: 'skills', title: 'Core Skills', icon: Code2, countBadge: skills.length, index: 4 },
    { key: 'projects', title: 'Projects', icon: FolderKanban, countBadge: projects.length, index: 5 },
    { key: 'certifications', title: 'Certifications', icon: Award, countBadge: certifications.length, index: 6 },
  ];

  const editorPanel = (
    <div className="space-y-3">
      {sectionConfigs.map(({ key, title, icon, countBadge, index }) => (
        <AccordionSection
          key={key}
          title={title}
          icon={icon}
          isOpen={openSections[key]}
          onToggle={() => toggleSection(key)}
          countBadge={countBadge}
          index={index}
        >
          {key === 'personal' && (
            <div className="pt-3 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="ns-input-label">Full Name</label>
                  <input
                    type="text"
                    className="ns-input"
                    value={personal.fullName}
                    onChange={(e) => updatePersonal('fullName', e.target.value)}
                    aria-label="Full name"
                  />
                </div>
                <div>
                  <label className="ns-input-label">Job Title / Subtitle</label>
                  <input
                    type="text"
                    className="ns-input"
                    value={personal.jobTitle}
                    onChange={(e) => updatePersonal('jobTitle', e.target.value)}
                    aria-label="Job title"
                  />
                </div>
                <div>
                  <label className="ns-input-label">Email</label>
                  <input
                    type="email"
                    className="ns-input"
                    value={personal.email}
                    onChange={(e) => updatePersonal('email', e.target.value)}
                    aria-label="Email address"
                  />
                </div>
                <div>
                  <label className="ns-input-label">Phone</label>
                  <input
                    type="tel"
                    className="ns-input"
                    value={personal.phone}
                    onChange={(e) => updatePersonal('phone', e.target.value)}
                    aria-label="Phone number"
                  />
                </div>
                <div>
                  <label className="ns-input-label">City / Location</label>
                  <input
                    type="text"
                    className="ns-input"
                    value={personal.city}
                    onChange={(e) => updatePersonal('city', e.target.value)}
                    aria-label="City"
                  />
                </div>
                <div>
                  <label className="ns-input-label">LinkedIn</label>
                  <input
                    type="text"
                    className="ns-input"
                    value={personal.linkedin}
                    onChange={(e) => updatePersonal('linkedin', e.target.value)}
                    placeholder="linkedin.com/in/your-profile"
                    aria-label="LinkedIn URL"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="ns-input-label">Portfolio / Website</label>
                  <input
                    type="text"
                    className="ns-input"
                    value={personal.portfolio}
                    onChange={(e) => updatePersonal('portfolio', e.target.value)}
                    placeholder="yourdomain.dev or github.com/username"
                    aria-label="Portfolio website"
                  />
                </div>
              </div>
            </div>
          )}

          {key === 'objective' && (
            <div className="pt-3 space-y-2">
              <textarea
                className="ns-textarea"
                rows={4}
                value={objective}
                onChange={(e) => setResumeData(prev => ({ ...prev, objective: e.target.value }))}
                placeholder="A concise 2-3 sentence summary about your background, goals, and key strengths..."
                aria-label="Professional objective"
              />
              <div className="flex items-center justify-between">
                <span className="ns-input-helper">{objective.length} characters</span>
                <span className="ns-input-helper">Keep it focused and professional</span>
              </div>
            </div>
          )}

          {key === 'education' && (
            <div className="pt-3 space-y-3.5">
              {education.length === 0 ? (
                <EmptyState
                  icon={GraduationCap}
                  title="No education entries yet"
                  description="Add your academic qualifications below"
                />
              ) : (
                education.map((edu, idx) => (
                  <motion.div
                    key={edu.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="p-3.5 rounded-2xl bg-[var(--ns-surface-2)] border border-[var(--ns-border)] space-y-3 ring-1 ring-[var(--ns-surface-2)] hover:ring-[var(--ns-primary-500)]/20 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black uppercase tracking-widest text-[var(--ns-text-subtle)] inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--ns-primary-500)]" />
                        Entry {idx + 1}
                      </span>
                      <button
                        onClick={() => removeEducation(edu.id)}
                        disabled={education.length <= 1}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-[var(--ns-danger)] bg-[var(--ns-danger-bg)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer"
                        aria-label={`Remove education entry ${idx + 1}`}
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="ns-input-label">Degree / Qualification</label>
                        <input
                          type="text"
                          className="ns-input"
                          value={edu.degree}
                          onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="ns-input-label">Institution</label>
                        <input
                          type="text"
                          className="ns-input"
                          value={edu.institution}
                          onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="ns-input-label">Year Range</label>
                        <input
                          type="text"
                          className="ns-input"
                          value={edu.yearRange}
                          onChange={(e) => updateEducation(edu.id, 'yearRange', e.target.value)}
                          placeholder="e.g. 2022 – 2024"
                        />
                      </div>
                      <div>
                        <label className="ns-input-label">CGPA / Percentage / Marks</label>
                        <input
                          type="text"
                          className="ns-input"
                          value={edu.cgpa}
                          onChange={(e) => updateEducation(edu.id, 'cgpa', e.target.value)}
                          placeholder="e.g. 3.8 CGPA or 85%"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="ns-input-label">Description (optional)</label>
                        <textarea
                          className="ns-textarea"
                          rows={2}
                          value={edu.description}
                          onChange={(e) => updateEducation(edu.id, 'description', e.target.value)}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
              <button
                onClick={addEducation}
                className="w-full ns-btn ns-btn-secondary justify-center py-2.5"
                aria-label="Add education entry"
              >
                <Plus className="w-4 h-4" /> Add Education Entry
              </button>
            </div>
          )}

          {key === 'experience' && (
            <div className="pt-3 space-y-3.5">
              {experience.length === 0 ? (
                <EmptyState
                  icon={Briefcase}
                  title="No work experience yet"
                  description="Add internships, part-time jobs, or freelance work"
                />
              ) : (
                experience.map((exp, idx) => (
                  <motion.div
                    key={exp.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="p-3.5 rounded-2xl bg-[var(--ns-surface-2)] border border-[var(--ns-border)] space-y-3 ring-1 ring-[var(--ns-surface-2)] hover:ring-[var(--ns-primary-500)]/20 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black uppercase tracking-widest text-[var(--ns-text-subtle)] inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--ns-accent-500)]" />
                        Role {idx + 1}
                      </span>
                      <button
                        onClick={() => removeExperience(exp.id)}
                        disabled={experience.length <= 1}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-[var(--ns-danger)] bg-[var(--ns-danger-bg)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer"
                        aria-label={`Remove experience entry ${idx + 1}`}
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="ns-input-label">Role / Position</label>
                        <input
                          type="text"
                          className="ns-input"
                          value={exp.role}
                          onChange={(e) => updateExperience(exp.id, 'role', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="ns-input-label">Company / Organization</label>
                        <input
                          type="text"
                          className="ns-input"
                          value={exp.company}
                          onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="ns-input-label">Date Range</label>
                        <input
                          type="text"
                          className="ns-input"
                          value={exp.dateRange}
                          onChange={(e) => updateExperience(exp.id, 'dateRange', e.target.value)}
                          placeholder="e.g. Jan 2026 – Present"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="ns-input-label mb-0">Key Achievements / Responsibilities</label>
                        <button
                          onClick={() => addExpBullet(exp.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-[var(--ns-primary-700)] dark:text-[var(--ns-primary-400)] bg-[var(--ns-primary-100)] dark:bg-[var(--ns-primary-900)]/30 hover:opacity-90 transition-opacity cursor-pointer"
                          aria-label="Add bullet point"
                        >
                          <Plus className="w-3 h-3" /> Add Bullet
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {exp.bullets.map((b, bIdx) => (
                          <motion.div
                            key={bIdx}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: bIdx * 0.03 }}
                            className="flex items-start gap-1.5"
                          >
                            <span className="w-5 h-5 rounded-full bg-[var(--ns-primary-500)] text-white shrink-0 mt-2.5 flex items-center justify-center text-[11px] font-black shadow-sm">
                              {bIdx + 1}
                            </span>
                            <div className="flex-1 flex items-start gap-1.5">
                              <textarea
                                className="ns-textarea flex-1"
                                rows={2}
                                value={b}
                                onChange={(e) => updateExpBullet(exp.id, bIdx, e.target.value)}
                                aria-label={`Bullet point ${bIdx + 1}`}
                              />
                              <button
                                onClick={() => removeExpBullet(exp.id, bIdx)}
                                disabled={exp.bullets.length <= 1}
                                className="shrink-0 w-8 h-8 rounded-lg mt-0.5 flex items-center justify-center text-[var(--ns-text-subtle)] hover:text-[var(--ns-danger)] hover:bg-[var(--ns-danger-bg)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                aria-label={`Remove bullet ${bIdx + 1}`}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
              <button
                onClick={addExperience}
                className="w-full ns-btn ns-btn-secondary justify-center py-2.5"
                aria-label="Add experience entry"
              >
                <Plus className="w-4 h-4" /> Add Experience Entry
              </button>
            </div>
          )}

          {key === 'skills' && (
            <div className="pt-3">
              {skills.length === 0 ? (
                <div className="mb-3">
                  <EmptyState
                    icon={Code2}
                    title="No skills added yet"
                    description="Add your technical and soft skills below"
                  />
                </div>
              ) : null}
              <SkillsTagInput skills={skills} onChange={(s) => setResumeData(prev => ({ ...prev, skills: s }))} />
            </div>
          )}

          {key === 'projects' && (
            <div className="pt-3 space-y-3.5">
              {projects.length === 0 ? (
                <EmptyState
                  icon={FolderKanban}
                  title="No projects yet"
                  description="Showcase personal projects, classwork, or hackathons"
                />
              ) : (
                projects.map((proj, idx) => (
                  <motion.div
                    key={proj.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="p-3.5 rounded-2xl bg-[var(--ns-surface-2)] border border-[var(--ns-border)] space-y-3 ring-1 ring-[var(--ns-surface-2)] hover:ring-[var(--ns-primary-500)]/20 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black uppercase tracking-widest text-[var(--ns-text-subtle)] inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Project {idx + 1}
                      </span>
                      <button
                        onClick={() => removeProject(proj.id)}
                        disabled={projects.length <= 1}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-[var(--ns-danger)] bg-[var(--ns-danger-bg)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer"
                        aria-label={`Remove project ${idx + 1}`}
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      <div>
                        <label className="ns-input-label">Project Title</label>
                        <input
                          type="text"
                          className="ns-input"
                          value={proj.title}
                          onChange={(e) => updateProject(proj.id, 'title', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="ns-input-label">Tech Stack (comma-separated)</label>
                        <input
                          type="text"
                          className="ns-input"
                          value={proj.techStack.join(', ')}
                          onChange={(e) => updateProject(proj.id, 'techStack',
                            e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                          placeholder="e.g. React, Node.js, PostgreSQL"
                        />
                      </div>
                      <div>
                        <label className="ns-input-label">Link (optional)</label>
                        <input
                          type="text"
                          className="ns-input"
                          value={proj.link}
                          onChange={(e) => updateProject(proj.id, 'link', e.target.value)}
                          placeholder="github.com/your/project"
                        />
                      </div>
                      <div>
                        <label className="ns-input-label">Description</label>
                        <textarea
                          className="ns-textarea"
                          rows={3}
                          value={proj.description}
                          onChange={(e) => updateProject(proj.id, 'description', e.target.value)}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
              <button
                onClick={addProject}
                className="w-full ns-btn ns-btn-secondary justify-center py-2.5"
                aria-label="Add project"
              >
                <Plus className="w-4 h-4" /> Add Project
              </button>
            </div>
          )}

          {key === 'certifications' && (
            <div className="pt-3 space-y-3.5">
              {certifications.length === 0 ? (
                <EmptyState
                  icon={Award}
                  title="No certifications yet"
                  description="Add Coursera, freeCodeCamp, or professional certifications"
                />
              ) : (
                certifications.map((cert, idx) => (
                  <motion.div
                    key={cert.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="p-3.5 rounded-2xl bg-[var(--ns-surface-2)] border border-[var(--ns-border)] space-y-2.5 ring-1 ring-[var(--ns-surface-2)] hover:ring-[var(--ns-primary-500)]/20 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black uppercase tracking-widest text-[var(--ns-text-subtle)] inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Cert {idx + 1}
                      </span>
                      <button
                        onClick={() => removeCert(cert.id)}
                        disabled={certifications.length <= 1}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-[var(--ns-danger)] bg-[var(--ns-danger-bg)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer"
                        aria-label={`Remove certification ${idx + 1}`}
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="ns-input-label">Certification Name</label>
                        <input
                          type="text"
                          className="ns-input"
                          value={cert.name}
                          onChange={(e) => updateCert(cert.id, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="ns-input-label">Issuer / Platform</label>
                        <input
                          type="text"
                          className="ns-input"
                          value={cert.issuer}
                          onChange={(e) => updateCert(cert.id, 'issuer', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="ns-input-label">Year</label>
                        <input
                          type="text"
                          className="ns-input"
                          value={cert.year}
                          onChange={(e) => updateCert(cert.id, 'year', e.target.value)}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="ns-input-label">Credential URL (optional)</label>
                        <input
                          type="text"
                          className="ns-input"
                          value={cert.link}
                          onChange={(e) => updateCert(cert.id, 'link', e.target.value)}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
              <button
                onClick={addCertification}
                className="w-full ns-btn ns-btn-secondary justify-center py-2.5"
                aria-label="Add certification"
              >
                <Plus className="w-4 h-4" /> Add Certification
              </button>
            </div>
          )}
        </AccordionSection>
      ))}
    </div>
  );

  const previewPanel = (
    <div className="flex flex-col h-full w-full">
      <div className="flex-1 flex justify-center overflow-auto">
        <div className="w-full max-w-[210mm]">
          <div
            className="rounded-xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700 shadow-2xl"
          >
            <div className=" bg-slate-100 dark:bg-slate-800 px-3 py-2 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono">Resume · A4 · 210×297mm</span>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <Printer className="w-3 h-3" /> Print
              </button>
            </div>
            <div className="overflow-auto bg-slate-50 dark:bg-slate-900">
              <div className="p-4 sm:p-6">
                <ResumePreview resumeData={resumeData} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 pb-8 dark:text-white">
      <style>{`
        @media print {
          body.printing-resume * { visibility: hidden !important; }
          body.printing-resume #resume-print-area,
          body.printing-resume #resume-print-area * { visibility: visible !important; }
          body.printing-resume #resume-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            aspect-ratio: auto !important;
            max-width: none !important;
            min-height: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          body.printing-resume .resume-section {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          body.printing-resume .resume-skill-tag {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body.printing-resume {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            forced-color-adjust: none !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md ns-hero  "
      >
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-20 w-[28rem] h-[28rem] rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute bottom-0 -left-24 w-[22rem] h-[22rem] rounded-full bg-blue-500/5 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] rounded-full bg-emerald-500/[0.03] blur-3xl" />
        </div>
        <div className="relative z-10 p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shrink-0">
              <FileText className="w-5.5 h-5.5" strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-extrabold text-white tracking-tight">AI Resume Builder</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
                  <Sparkles className="w-2.5 h-2.5" /> Pro
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <AutoSaveIndicator status={saveStatus} />
                <p className="text-[11px] text-slate-400 font-medium">
                  Professional A4 resumes tailored for admissions, internships & jobs
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-5 sm:px-6 pb-5 sm:pb-6 border-t border-white/5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 backdrop-blur">
              <button
                onClick={() => { setMobileView('edit'); }}
                className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !isMobile || mobileView === 'edit'
                    ? ' bg-white/15 text-white shadow-lg ring-1 ring-white/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                aria-pressed={!isMobile || mobileView === 'edit'}
                aria-label="Switch to edit view"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                onClick={() => { setMobileView('preview'); }}
                className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !isMobile ? 'text-slate-400 hover:text-white hover:bg-white/5' :
                  mobileView === 'preview'
                    ? ' bg-white/15 text-white shadow-lg ring-1 ring-white/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                aria-pressed={isMobile && mobileView === 'preview'}
                aria-label="Switch to preview view"
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleImportFromProfile}
                className="ns-btn ns-btn-ghost bg-white/5 hover:bg-white/10 text-white border border-white/10 text-[11px] px-3 py-2 rounded-xl"
                aria-label="Import from profile"
              >
                <User className="w-3.5 h-3.5" /> Import From Profile
              </button>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-red-500/10 text-white border border-white/10 hover:border-red-500/30 text-[11px] font-bold transition-all cursor-pointer"
                aria-label="Reset template"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-extrabold shadow-lg flex-1 sm:flex-none justify-center transition-all cursor-pointer"
                aria-label="Print or save as PDF"
              >
                <Printer className="w-3.5 h-3.5" /> Print / Save PDF
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showResetConfirm && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.25 }}
                className="mt-4 overflow-hidden"
              >
                <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl bg-red-500/5 border border-red-500/20">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white">Reset Resume Template?</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">This will clear all your edits and restore the default template content.</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-[11px] border border-white/10 cursor-pointer transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-[11px] shadow-lg cursor-pointer transition-all"
                    >
                      Yes, Reset
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5 lg:gap-6">
        <AnimatePresence mode="wait">
          {(mobileView === 'edit' || !isMobile) && (
            <motion.div
              key="editor"
              initial={{ opacity: 0, x: isMobile ? 20 : -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isMobile ? -20 : 0 }}
              transition={{ duration: 0.25 }}
              className="lg:order-1"
            >
              <div className="lg:sticky lg:top-4 space-y-3 max-h-[calc(100vh-120px)] overflow-auto pr-1 custom-scrollbar">
                {editorPanel}
              </div>
            </motion.div>
          )}

          {(mobileView === 'preview' || !isMobile) && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: isMobile ? -20 : 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isMobile ? 20 : 0 }}
              transition={{ duration: 0.25 }}
              className="lg:order-2"
            >
              <div className="lg:sticky lg:top-4 lg:self-start">
                {previewPanel}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
