import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { adminFetch, formatDateTime, passwordProblem } from './adminApi.js';
import { Badge, Button, Card, ConfirmButton, Empty, Field, Loading, Notice, PageHeader, PasswordInput, inputClass } from './AdminUi.jsx';

function ResetPassword({ admin, onDone, onError }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) return <Button variant="secondary" onClick={() => setOpen(true)}>Reset password</Button>;
  return (
    <form className="flex items-center gap-2" onSubmit={async (e) => {
      e.preventDefault();
      const problem = passwordProblem(pw);
      if (problem) return onError(problem);
      setBusy(true);
      try {
        await adminFetch(`/admin/admins/${admin.id}/reset-password`, { method: 'POST', body: { password: pw } });
        onDone(`New password set for ${admin.email}. Share it with them privately.`);
        setOpen(false); setPw('');
      } catch (err) { onError(err.message); } finally { setBusy(false); }
    }}>
      <div className="w-48"><PasswordInput id={`pw-${admin.id}`} value={pw} onChange={setPw} placeholder="New password" /></div>
      <Button type="submit" loading={busy}>Save</Button>
      <Button type="button" variant="ghost" onClick={() => { setOpen(false); setPw(''); }}>Cancel</Button>
    </form>
  );
}

export function AdminAdmins({ me }) {
  const [list, setList] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try { setList((await adminFetch('/admin/admins')).data); } catch (err) { setError(err.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    setError(''); setNotice('');
    const problem = passwordProblem(form.password);
    if (problem) return setError(problem);
    setBusy(true);
    try {
      await adminFetch('/admin/admins', { method: 'POST', body: form });
      setNotice(`${form.email} can now sign in to the admin portal. Share the password with them privately.`);
      setForm({ name: '', email: '', password: '' });
      await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const act = async (id, fn, ok) => {
    setBusyId(id); setError(''); setNotice('');
    try { await fn(); setNotice(ok); await load(); } catch (err) { setError(err.message); } finally { setBusyId(null); }
  };

  return (
    <div>
      <PageHeader title="Admins" description="Admin accounts are separate from student and mentor accounts and can only sign in here." />

      <div className="grid xl:grid-cols-3 gap-6">
        <Card title="Add an admin" className="self-start">
          <form onSubmit={add} className="space-y-3">
            <Field label="Full name" id="na-name">
              <input id="na-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} required />
            </Field>
            <Field label="Email" id="na-email">
              <input id="na-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} autoComplete="off" required />
            </Field>
            <Field label="Temporary password" id="na-pass" hint="At least 10 characters with letters and numbers. They can change it under Account.">
              <PasswordInput id="na-pass" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
            </Field>
            <Button type="submit" loading={busy} className="w-full">Add admin</Button>
          </form>
        </Card>

        <div className="xl:col-span-2 space-y-4">
          <Notice>{error}</Notice>
          <Notice kind="success">{notice}</Notice>
          <Card title={`Admin accounts${list ? ` (${list.length})` : ''}`}>
            {!list ? <Loading /> : list.length === 0 ? <Empty icon={ShieldCheck} title="No admins" /> : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 -my-2">
                {list.map((a) => {
                  const isMe = a.id === me?.id;
                  return (
                    <li key={a.id} className="py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                          {a.name}
                          {isMe && <Badge tone="blue">You</Badge>}
                          {!a.isActive && <Badge tone="red">Disabled</Badge>}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{a.email} · last sign-in {formatDateTime(a.lastLoginAt)}{a.createdBy ? ` · added by ${a.createdBy}` : ''}</p>
                      </div>
                      {!isMe && (
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <ResetPassword admin={a} onDone={(m) => { setError(''); setNotice(m); }} onError={(m) => { setNotice(''); setError(m); }} />
                          <Button variant="secondary" loading={busyId === a.id}
                            onClick={() => act(a.id, () => adminFetch(`/admin/admins/${a.id}`, { method: 'PATCH', body: { isActive: !a.isActive } }),
                              a.isActive ? `${a.email} was disabled.` : `${a.email} was enabled.`)}>
                            {a.isActive ? 'Disable' : 'Enable'}
                          </Button>
                          <ConfirmButton disabled={busyId === a.id} confirmLabel="Confirm remove"
                            onConfirm={() => act(a.id, () => adminFetch(`/admin/admins/${a.id}`, { method: 'DELETE' }), `${a.email} was removed.`)}>
                            Remove
                          </ConfirmButton>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AdminAdmins;
