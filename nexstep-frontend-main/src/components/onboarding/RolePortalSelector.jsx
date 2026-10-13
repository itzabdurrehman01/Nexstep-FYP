/**
 * RolePortalSelector.jsx
 * First screen for a new student: pick their class / level in the Pakistani
 * education system (Class 8 … University, DAE), group and class start date.
 * Saved to /api/education; the whole portal is then filtered to that level.
 */
import React from 'react';
import { GraduationCap } from 'lucide-react';
import { EducationLevelForm } from './EducationLevelForm.jsx';

export function RolePortalSelector({ lang = 'en', onComplete, onNavigate, initial, initialMarks }) {
  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8">
      <div className="flex items-start gap-3 mb-6">
        <span className="w-11 h-11 shrink-0 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
          <GraduationCap className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {lang === 'ur' ? 'نیکسٹ اسٹیپ میں خوش آمدید!' : 'Welcome to NexStep'}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {lang === 'ur'
              ? 'اپنی جماعت بتائیں تاکہ ہم صرف وہی دکھائیں جو آپ کے لیے ضروری ہے۔'
              : 'Tell us your class so we only show what matters at your stage. We will move you up automatically each year.'}
          </p>
        </div>
      </div>
      <div className="relative z-20 overflow-visible rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
        <EducationLevelForm
          initial={initial}
          initialMarks={initialMarks}
          lang={lang}
          submitLabel={lang === 'ur' ? 'آگے بڑھیں' : 'Continue'}
          onSaved={(state) => {
            try { sessionStorage.setItem('ns_start_quiz', '1'); } catch { /* ignore */ }
            onComplete?.(state);
            onNavigate?.('onboarding');
          }}
        />
      </div>
    </div>
  );
}

export default RolePortalSelector;
