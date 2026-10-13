import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { adminFetch, passwordProblem } from './adminApi.js';
import { Button, Field, Notice, PasswordInput, inputClass } from './AdminUi.jsx';
import logoImg from '../assets/images/nexstep_logo_1786045525796.png';

/** Sign-in screen, or the one-time "create the first admin" screen when no admin exists. */
export function AdminSignIn({ mode, onSignedIn }) {
  const isSetup = mode === 'setup';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (isSetup) {
      const problem = passwordProblem(password);
      if (problem) return setError(problem);
      if (password !== confirm) return setError('Passwords do not match.');
    }
    setBusy(true);
    try {
      const data = isSetup
        ? await adminFetch('/admin-auth/setup', { method: 'POST', body: { name, email, password, setupToken: setupToken || undefined } })
        : await adminFetch('/admin-auth/login', { method: 'POST', body: { email, password } });
      onSignedIn(data.admin);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-6">
          <img src={logoImg} alt="" className="w-9 h-9 rounded-lg" />
          <div>
            <p className="text-base font-semibold text-slate-900 dark:text-white leading-tight">NexStep</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">Admin portal</p>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 shrink-0 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{isSetup ? 'Create the admin account' : 'Admin sign in'}</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isSetup ? 'No admin exists yet. This first account can add more admins later.' : 'Only NexStep administrators can sign in here.'}
              </p>
            </div>
          </div>

          <Notice>{error}</Notice>

          {isSetup && (
            <Field label="Full name" id="adm-name">
              <input id="adm-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoComplete="name" required />
            </Field>
          )}
          <Field label="Email" id="adm-email">
            <input id="adm-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} autoComplete="username" required />
          </Field>
          <Field label="Password" id="adm-pass" hint={isSetup ? 'At least 10 characters with letters and numbers.' : undefined}>
            <PasswordInput id="adm-pass" value={password} onChange={setPassword} autoComplete={isSetup ? 'new-password' : 'current-password'} />
          </Field>
          {isSetup && (
            <>
              <Field label="Confirm password" id="adm-pass2">
                <PasswordInput id="adm-pass2" value={confirm} onChange={setConfirm} />
              </Field>
              <Field label="Setup code (only if configured)" id="adm-token" hint="Leave empty unless ADMIN_SETUP_TOKEN is set in backend/.env.">
                <input id="adm-token" value={setupToken} onChange={(e) => setSetupToken(e.target.value)} className={inputClass} autoComplete="off" />
              </Field>
            </>
          )}

          <Button type="submit" loading={busy} className="w-full h-10">{isSetup ? 'Create admin account' : 'Sign in'}</Button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Student or mentor? <a href="#/auth" className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline">Sign in to NexStep</a>
        </p>
      </div>
    </div>
  );
}

export default AdminSignIn;
