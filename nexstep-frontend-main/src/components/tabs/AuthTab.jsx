import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSignIn, useSignUp } from '@clerk/react';
import { ArrowRight, CheckCircle2, KeyRound, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { getRoleHomePath, useAuth } from '../../context/AuthContext.jsx';
import { checkGmail, clerkAuthError, completePasswordSignUp, parseGmail, passwordProblem, PASSWORD_RULES } from '../../auth/accountRules.js';
import { startGoogleGmailSso } from '../../auth/googleSso.js';
import { GoogleGmailButton } from '../auth/GoogleGmailButton.jsx';

const POINTS = [
  'Career matches based on your interests, marks and skills',
  'Universities, merit estimates and scholarships in one place',
  'A step-by-step roadmap you can track',
];

function PasswordRules({ password, lang }) {
  return (
    <ul className="mt-2 space-y-1.5" aria-label={lang === 'ur' ? 'پاس ورڈ کے قواعد' : 'Password rules'}>
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <li key={rule.id} className={`flex items-center gap-2 text-xs ${ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
            <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${ok ? 'opacity-100' : 'opacity-35'}`} strokeWidth={2} />
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

function Field({ id, label, children }) {
  return (
    <label className="block space-y-1.5" htmlFor={id}>
      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</span>
      {children}
    </label>
  );
}

const inputClass = 'w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500';

export function AuthTab(props) {
  const { clerkEnabled } = useAuth();
  if (!clerkEnabled) {
    return (
      <div className="w-full max-w-xl mx-auto py-10">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 space-y-3">
          <KeyRound className="w-8 h-8 text-amber-600" />
          <h1 className="text-2xl font-semibold">Sign-in isn't configured yet</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Add your Clerk keys to the frontend and backend <code>.env</code> files, then restart.</p>
        </div>
      </div>
    );
  }
  return <ClerkAuthTab {...props} />;
}

function ClerkAuthTab({ initialView, lang = 'en' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { authStatus, authError, user, logout } = useAuth();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const isUr = lang === 'ur';

  const path = location.pathname.toLowerCase();
  const startView = initialView === 'register' || path.includes('register')
    ? 'signup'
    : initialView === 'forgot' || initialView === 'reset' || path.includes('forgot') || path.includes('reset')
      ? 'forgot'
      : 'signin';

  const [view, setView] = useState(startView);
  const [step, setStep] = useState('form');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const returnTo = typeof location.state?.from === 'string' && location.state.from !== '/auth' ? location.state.from : null;

  useEffect(() => {
    if (authStatus === 'authenticated' && user) {
      navigate(returnTo || getRoleHomePath(user), { replace: true });
    }
  }, [authStatus, user, returnTo, navigate]);

  useEffect(() => {
    setView(startView);
    setStep('form');
    setError('');
    setInfo('');
  }, [startView]);

  const go = (next) => {
    setView(next);
    setStep('form');
    setError('');
    setInfo('');
    setCode('');
    navigate(next === 'signup' ? '/register' : next === 'forgot' ? '/forgot-password' : '/login');
  };

  const continueWithGmail = async () => {
    if (!signIn) return;
    setBusy(true);
    setError('');
    try {
      await startGoogleGmailSso(signIn, signUp);
    } catch (err) {
      setError(clerkAuthError(err, 'Could not continue with Gmail. Enable Google in the Clerk dashboard, then try again.'));
    } finally {
      setBusy(false);
    }
  };

  const submitSignIn = async (event) => {
    event.preventDefault();
    if (!signIn) return;
    setBusy(true);
    setError('');
    try {
      const parsed = parseGmail(email);
      if (!parsed.ok) throw new Error(parsed.error);
      const { error: passwordError } = await signIn.password({ identifier: parsed.email, password });
      if (passwordError) throw passwordError;
      if (signIn.status === 'complete') {
        const { error: finalizeError } = await signIn.finalize();
        if (finalizeError) throw finalizeError;
        return;
      }
      throw new Error('Could not complete sign in. Check your password or use Forgot password.');
    } catch (err) {
      setError(clerkAuthError(err, 'This Gmail does not exist or the password is wrong.'));
    } finally {
      setBusy(false);
    }
  };

  const submitSignUp = async (event) => {
    event.preventDefault();
    if (!signUp) return;
    const parsed = parseGmail(email);
    if (!parsed.ok) { setError(parsed.error); return; }
    if (!firstName.trim()) { setError('Enter your first name.'); return; }
    const problem = passwordProblem(password);
    if (problem) { setError(problem); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true);
    setError('');
    try {
      const checked = await checkGmail(parsed.email, 'signup');
      if (!checked.ok) throw new Error(checked.error);
      const result = await completePasswordSignUp(signUp, signIn, {
        email: checked.email,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      if (result.next === 'done') return;
      setStep('otp');
      setInfo(`We sent a 6-digit OTP to ${checked.email}. If this Gmail does not exist, you will not receive a code.`);
    } catch (err) {
      setError(clerkAuthError(err, 'Could not create the account. Use a real Gmail and a password of 15 characters or more.'));
    } finally {
      setBusy(false);
    }
  };

  const submitSignUpOtp = async (event) => {
    event.preventDefault();
    if (!signUp) return;
    setBusy(true);
    setError('');
    try {
      const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (verifyError) throw verifyError;
      if (signUp.status === 'complete') {
        const { error: finalizeError } = await signUp.finalize();
        if (finalizeError) throw finalizeError;
        return;
      }
      if (signUp.missingFields?.length) {
        throw new Error(`Add the missing details to finish: ${signUp.missingFields.join(', ').replace(/_/g, ' ')}.`);
      }
      throw new Error('Invalid OTP. Check the code in your Gmail inbox.');
    } catch (err) {
      setError(clerkAuthError(err, 'Invalid OTP. Check the code in your Gmail inbox.'));
    } finally {
      setBusy(false);
    }
  };

  const submitForgot = async (event) => {
    event.preventDefault();
    if (!signIn) return;
    setBusy(true);
    setError('');
    try {
      const checked = await checkGmail(email, 'forgot');
      if (!checked.ok) throw new Error(checked.error);
      const { error: createError } = await signIn.create({ identifier: checked.email });
      if (createError) throw createError;
      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) throw sendError;
      setStep('otp');
      setInfo(`We sent a password-reset OTP to ${checked.email}.`);
    } catch (err) {
      setError(clerkAuthError(err, 'This Gmail does not exist.'));
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (event) => {
    event.preventDefault();
    if (!signIn) return;
    const problem = passwordProblem(password);
    if (problem) { setError(problem); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true);
    setError('');
    try {
      const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      if (verifyError) throw verifyError;
      const { error: resetError } = await signIn.resetPasswordEmailCode.submitPassword({ password });
      if (resetError) throw resetError;
      if (signIn.status === 'complete') {
        const { error: finalizeError } = await signIn.finalize();
        if (finalizeError) throw finalizeError;
        return;
      }
      setInfo('Password updated. Sign in with your new password.');
      setView('signin');
      setStep('form');
      setPassword('');
      setConfirm('');
      setCode('');
    } catch (err) {
      setError(clerkAuthError(err, 'Could not reset the password. Check the OTP and try again.'));
    } finally {
      setBusy(false);
    }
  };

  const copy = isUr
    ? {
      signIn: 'سائن اِن', signUp: 'اکاؤنٹ بنائیں', forgot: 'پاس ورڈ بھول گئے؟',
      titleIn: 'سائن اِن', titleUp: 'اکاؤنٹ بنائیں', titleForgot: 'پاس ورڈ ری سیٹ',
    }
    : {
      signIn: 'Sign in', signUp: 'Create account', forgot: 'Forgot password?',
      titleIn: 'Sign in with Gmail', titleUp: 'Create account', titleForgot: 'Reset password',
    };

  const title = view === 'signup' ? copy.titleUp : view === 'forgot' ? copy.titleForgot : copy.titleIn;

  return (
    <div className="w-full max-w-5xl mx-auto py-4 sm:py-10">
      <div className="grid lg:grid-cols-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <section className="hidden lg:flex flex-col justify-between gap-10 p-10 bg-slate-50 dark:bg-slate-950/40 border-r border-slate-200 dark:border-slate-800">
          <div>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">NexStep</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Plan your studies and career with confidence.</h2>
          </div>
          <ul className="space-y-3">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={2} />
                {point}
              </li>
            ))}
          </ul>
          <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4" strokeWidth={1.75} /> Only a real Gmail is accepted. We send an OTP to that inbox.
          </p>
        </section>

        <section className="p-6 sm:p-10 flex flex-col justify-center min-h-[420px]">
          {authStatus === 'loading' ? (
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" /> Checking your session…
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {view === 'signup'
                    ? 'Use your Gmail only. Fake or non-Gmail addresses are rejected. After the address is checked, we send an OTP to that inbox.'
                    : 'Use your Gmail only. Fake or non-Gmail addresses are rejected. If this Gmail is not registered, you will see “This Gmail does not exist.”'}
                </p>
              </div>

              {(authError || error) && (
                <div role="alert" className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300 space-y-2">
                  <p>{error || authError}</p>
                  {authError && <button type="button" onClick={logout} className="text-sm font-medium underline underline-offset-2">Sign out and try again</button>}
                </div>
              )}
              {info && !error && (
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200 flex gap-2">
                  <Mail className="w-4 h-4 mt-0.5 shrink-0" /> {info}
                </div>
              )}

              {view === 'signin' && (
                <form className="space-y-4" onSubmit={submitSignIn}>
                  <GoogleGmailButton onClick={continueWithGmail} busy={busy} disabled={!signIn} label={isUr ? 'Gmail سے جاری رکھیں' : 'Continue with Gmail'} />
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                    or use email and password
                    <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  </div>
                  <Field id="gmail" label="Gmail">
                    <input id="gmail" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" className={inputClass} required />
                  </Field>
                  <Field id="password" label="Password">
                    <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required />
                  </Field>
                  <button type="submit" disabled={busy} className="ns-btn-solid ns-btn-lg w-full">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : copy.signIn}
                  </button>
                  <div className="flex items-center justify-between text-sm">
                    <button type="button" onClick={() => go('forgot')} className="text-emerald-700 dark:text-emerald-400 font-medium">{copy.forgot}</button>
                    <button type="button" onClick={() => go('signup')} className="text-slate-600 dark:text-slate-300">{copy.signUp}</button>
                  </div>
                </form>
              )}

              {view === 'signup' && step === 'form' && (
                <form className="space-y-4" onSubmit={submitSignUp}>
                  <GoogleGmailButton onClick={continueWithGmail} busy={busy} disabled={!signIn} label={isUr ? 'Gmail سے اکاؤنٹ بنائیں' : 'Continue with Gmail'} />
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                    or create with email
                    <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field id="first" label="First name">
                      <input id="first" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} required />
                    </Field>
                    <Field id="last" label="Last name">
                      <input id="last" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
                    </Field>
                  </div>
                  <Field id="gmail-up" label="Gmail">
                    <input id="gmail-up" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" className={inputClass} required />
                  </Field>
                  <Field id="pw-up" label="Password">
                    <input id="pw-up" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required />
                    <PasswordRules password={password} lang={lang} />
                  </Field>
                  <Field id="pw-up2" label="Confirm password">
                    <input id="pw-up2" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} required />
                  </Field>
                  <button type="submit" disabled={busy} className="ns-btn-solid ns-btn-lg w-full">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify Gmail and send OTP'}
                  </button>
                  <button type="button" onClick={() => go('signin')} className="text-sm text-slate-600 dark:text-slate-300">{copy.signIn}</button>
                </form>
              )}

              {view === 'signup' && step === 'otp' && (
                <form className="space-y-4" onSubmit={submitSignUpOtp}>
                  <Field id="otp" label="OTP from Gmail">
                    <input id="otp" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} className={inputClass} required />
                  </Field>
                  <button type="submit" disabled={busy} className="ns-btn-solid ns-btn-lg w-full">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify OTP and create account'}
                  </button>
                </form>
              )}

              {view === 'forgot' && step === 'form' && (
                <form className="space-y-4" onSubmit={submitForgot}>
                  <Field id="gmail-fg" label="Registered Gmail">
                    <input id="gmail-fg" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" className={inputClass} required />
                  </Field>
                  <button type="submit" disabled={busy} className="ns-btn-solid ns-btn-lg w-full">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send reset OTP'}
                  </button>
                  <button type="button" onClick={() => go('signin')} className="text-sm text-slate-600 dark:text-slate-300">{copy.signIn}</button>
                </form>
              )}

              {view === 'forgot' && step === 'otp' && (
                <form className="space-y-4" onSubmit={submitReset}>
                  <Field id="otp-fg" label="OTP from Gmail">
                    <input id="otp-fg" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} className={inputClass} required />
                  </Field>
                  <Field id="pw-fg" label="New password">
                    <input id="pw-fg" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required />
                    <PasswordRules password={password} lang={lang} />
                  </Field>
                  <Field id="pw-fg2" label="Confirm new password">
                    <input id="pw-fg2" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} required />
                  </Field>
                  <button type="submit" disabled={busy} className="ns-btn-solid ns-btn-lg w-full">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update password'}
                  </button>
                </form>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                OTP is sent only after the Gmail is checked. Password: 15 characters or more.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default AuthTab;
