import React from 'react';
import {
  Compass, Sparkles, Target, GraduationCap, Users, CalendarClock, Mic, ShieldCheck, ArrowRight, Building2, Lock, FileText, Cookie,
} from 'lucide-react';

const wrap = 'lp-container max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-12';
const h1 = 'text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white';
const h2 = 'text-xl font-semibold text-slate-900 dark:text-white';
const p = 'text-base leading-relaxed text-slate-600 dark:text-slate-300';
const card = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5';

function PageHead({ icon: Icon, eyebrow, title, intro }) {
  return (
    <header className="space-y-4">
      <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400"><Icon className="w-4 h-4" aria-hidden="true" />{eyebrow}</p>
      <h1 className={h1}>{title}</h1>
      {intro && <p className={`${p} max-w-2xl`}>{intro}</p>}
    </header>
  );
}

const FEATURES = [
  { icon: Compass, title: 'Guidance for every class', text: 'Pages and advice change with your level — Class 8, Matric, Inter, DAE or university.' },
  { icon: Sparkles, title: 'Career AI', text: 'Careers ranked against your interests, group, skills and marks, with the reasons explained.' },
  { icon: Target, title: 'Skill Gap', text: 'See which skills a career needs, which you already have and how to learn the rest.' },
  { icon: Building2, title: 'Universities & scholarships', text: 'Explore institutions and funding added and checked by our team.' },
  { icon: Users, title: 'Real mentors', text: 'An admin assigns you a mentor. Book sessions and get your mock interviews scored.' },
  { icon: CalendarClock, title: 'Alerts that matter', text: 'Set reminders for exams, admissions and deadlines and get notified on time.' },
  { icon: Mic, title: 'Voice & Urdu', text: 'Use the whole portal in English or Urdu and practise speaking with the voice tools.' },
  { icon: ShieldCheck, title: 'Your data stays yours', text: 'Sign in securely with Google or email. Recordings are shared only with your own mentor.' },
];

/** Public "About us" page — no sign-in needed. */
export function AboutPage({ onNavigate }) {
  return (
    <div className={wrap}>
      <PageHead icon={Compass} eyebrow="About NexStep" title="Helping Pakistani students choose their next step with confidence"
        intro="NexStep is a career and education guidance platform for students from Class 8 to university, including DAE and technical students. It brings interest assessment, career matching, mentors and planning tools together in one place, in English and Urdu." />

      <section className="space-y-4">
        <h2 className={h2}>Why we built it</h2>
        <p className={p}>Choosing a group after Matric, an Inter stream or a university degree is one of the biggest decisions a student makes, and good guidance is hard to find — especially outside big cities. NexStep gives every student a clear, personal starting point: what suits them, what the path looks like and what to do next.</p>
      </section>

      <section className="space-y-4">
        <h2 className={h2}>What you can do</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className={`${card} flex gap-3`}>
              <span className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0"><Icon className="w-5 h-5" aria-hidden="true" /></span>
              <div><p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{text}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className={h2}>How it works</h2>
        <ol className="grid sm:grid-cols-3 gap-4">
          {[['Tell us about you', 'Pick your class, group and interests, and take the interest quiz.'], ['Get your matches', 'Career AI ranks careers for you and Skill Gap shows what to learn.'], ['Plan and act', 'Set alerts, talk to your mentor and track your progress.']].map(([t, d], i) => (
            <li key={t} className={card}><span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Step {i + 1}</span><p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{t}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{d}</p></li>
          ))}
        </ol>
      </section>

      <section className={`${card} space-y-2`}>
        <h2 className={`${h2} inline-flex items-center gap-2`}><GraduationCap className="w-5 h-5 text-emerald-600" aria-hidden="true" />The team</h2>
        <p className={p}>NexStep is a Final Year Project at Air University, Islamabad, built by <span data-no-translate>Muhammad Abdur Rehman, Areej Fatima and Faria Ahmed</span>.</p>
      </section>

      <section className="flex flex-wrap gap-3">
        <button type="button" onClick={() => onNavigate?.('auth')} className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium cursor-pointer">Get started free <ArrowRight className="w-4 h-4" /></button>
        <button type="button" onClick={() => onNavigate?.('helpCenter')} className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">Help centre</button>
      </section>
    </div>
  );
}

function Section({ title, children, id }) {
  return <section id={id} className="space-y-3"><h2 className={h2}>{title}</h2><div className={`${p} space-y-3`}>{children}</div></section>;
}
const LIST = 'list-disc ps-5 space-y-1.5';

/** Public privacy page (includes cookies). */
export function PrivacyPage({ onNavigate }) {
  return (
    <div className={wrap}>
      <PageHead icon={Lock} eyebrow="Privacy" title="How NexStep handles your information" intro="This page explains, in plain words, what we store and why. Last updated October 2026." />
      <Section title="Signing in">
        <p>Sign-in is handled by Clerk. If you sign in with Google, we receive your name, email address and profile photo from your Google account so your profile is filled in for you. We never see your Google password.</p>
      </Section>
      <Section title="What we store">
        <ul className={LIST}>
          <li>Your profile: name, email, photo, class or level, group, city, marks, skills and goals you enter.</li>
          <li>Interest quiz results, saved careers, calendar alerts and your notification and display preferences.</li>
          <li>Mentor sessions and mock interviews, including the audio you record for your mentor.</li>
          <li>Payment submissions: plan, amount, transaction ID, the name and number you paid from and an optional receipt screenshot. We do not store card or bank passwords or PINs.</li>
        </ul>
      </Section>
      <Section title="Who can see it">
        <ul className={LIST}>
          <li>Your assigned mentor can see your basic profile, your session requests and the mock interviews you send them.</li>
          <li>NexStep administrators can see account and payment details to run the service, verify payments and help with support.</li>
          <li>When AI features are switched on, the text of your question is sent to Google's Gemini service to create an answer.</li>
          <li>We do not sell your information.</li>
        </ul>
      </Section>
      <Section title="Cookies and local storage" id="cookies">
        <p>We use a sign-in cookie from Clerk to keep you signed in, and a separate cookie for administrator sign-in. Your browser also keeps small settings on your device, such as theme, language and which notifications you have already seen. You can clear them from your browser settings at any time.</p>
      </Section>
      <Section title="Your choices">
        <ul className={LIST}>
          <li>Edit your profile and preferences any time in Settings.</li>
          <li>Turn email, pop-up and browser notifications on or off in Settings → Preferences.</li>
          <li>To delete your account or ask a question about your data, contact us through the Help centre.</li>
        </ul>
      </Section>
      <button type="button" onClick={() => onNavigate?.('helpCenter')} className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">Contact us via the Help centre</button>
    </div>
  );
}

/** Public terms of use page. */
export function TermsPage({ onNavigate }) {
  return (
    <div className={wrap}>
      <PageHead icon={FileText} eyebrow="Terms of use" title="Using NexStep" intro="By creating an account you agree to these terms. Last updated October 2026." />
      <Section title="Guidance, not guarantees">
        <p>Career matches, skill plans and other suggestions are guidance based on the information you give and the data we hold. They do not guarantee admission, scholarships, jobs or results. Always confirm dates, fees and requirements with the official institution.</p>
      </Section>
      <Section title="Your account">
        <ul className={LIST}>
          <li>Give accurate information and keep your sign-in secure.</li>
          <li>Be respectful in the community and with mentors. Do not post anything harmful, misleading or someone else's private information.</li>
          <li>We may suspend accounts that misuse the platform.</li>
        </ul>
      </Section>
      <Section title="Premium and payments">
        <ul className={LIST}>
          <li>Premium is paid by JazzCash, Easypaisa or bank transfer to the account shown on the Plans page.</li>
          <li>Premium starts after an administrator verifies your transaction ID. Submitting a false transaction ID may lead to the account being suspended.</li>
          <li>Paying again before your plan ends adds the new period to your remaining time.</li>
          <li>For questions about a payment, contact us through the Help centre.</li>
        </ul>
      </Section>
      <Section title="Mentors">
        <p>Mentors are volunteers or professionals assigned by NexStep administrators. Their advice is their own opinion. Sessions can be cancelled by either side.</p>
      </Section>
      <Section title="Changes">
        <p>We may update these terms as NexStep grows. The date at the top shows the latest version.</p>
      </Section>
      <button type="button" onClick={() => onNavigate?.('privacy')} className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"><Cookie className="w-4 h-4" />Read the privacy page</button>
    </div>
  );
}

export default AboutPage;
