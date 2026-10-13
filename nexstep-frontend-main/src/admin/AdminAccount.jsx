import React, { useState } from 'react';
import { adminFetch, formatDateTime, passwordProblem } from './adminApi.js';
import { Button, Card, Field, Notice, PageHeader, PasswordInput } from './AdminUi.jsx';

export function AdminAccount({ me }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setNotice('');
    const problem = passwordProblem(next);
    if (problem) return setError(problem);
    if (next !== confirm) return setError('New passwords do not match.');
    setBusy(true);
    try {
      await adminFetch('/admin-auth/change-password', { method: 'POST', body: { currentPassword: current, newPassword: next } });
      setNotice('Password changed. Other devices signed in to this account were signed out.');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title="Account" description="Your admin profile and password." />
      <div className="grid lg:grid-cols-2 gap-6 max-w-4xl">
        <Card title="Profile" className="self-start">
          <dl className="space-y-3 text-sm">
            <div><dt className="text-xs text-slate-500">Name</dt><dd className="font-medium text-slate-900 dark:text-white">{me?.name}</dd></div>
            <div><dt className="text-xs text-slate-500">Email</dt><dd className="font-medium text-slate-900 dark:text-white">{me?.email}</dd></div>
            <div><dt className="text-xs text-slate-500">Last sign-in</dt><dd className="text-slate-700 dark:text-slate-300">{formatDateTime(me?.lastLoginAt)}</dd></div>
          </dl>
        </Card>
        <Card title="Change password">
          <form onSubmit={submit} className="space-y-3">
            <Notice>{error}</Notice>
            <Notice kind="success">{notice}</Notice>
            <Field label="Current password" id="cp-cur"><PasswordInput id="cp-cur" value={current} onChange={setCurrent} autoComplete="current-password" /></Field>
            <Field label="New password" id="cp-new" hint="At least 10 characters with letters and numbers."><PasswordInput id="cp-new" value={next} onChange={setNext} /></Field>
            <Field label="Confirm new password" id="cp-conf"><PasswordInput id="cp-conf" value={confirm} onChange={setConfirm} /></Field>
            <Button type="submit" loading={busy}>Update password</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default AdminAccount;
