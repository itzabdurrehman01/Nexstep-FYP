import React, { useCallback, useEffect, useState } from 'react';
import { UserCog, Mail, Clock } from 'lucide-react';
import { adminFetch, formatDate } from './adminApi.js';
import { Badge, Button, Card, ConfirmButton, Empty, Field, Loading, Notice, PageHeader, inputClass } from './AdminUi.jsx';

export function AdminMentors() {
  const [email, setEmail] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyKey, setBusyKey] = useState(null);

  const load = useCallback(async () => {
    try { setData(await adminFetch('/admin/roles')); } catch (err) { setError(err.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const setRole = async (targetEmail, role) => {
    setError(''); setNotice('');
    const res = await adminFetch('/admin/roles', { method: 'POST', body: { email: targetEmail, role } });
    setNotice(res.message);
    await load();
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await setRole(email, 'MENTOR'); setEmail(''); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const act = async (key, fn) => {
    setBusyKey(key);
    try { await fn(); } catch (err) { setError(err.message); } finally { setBusyKey(null); }
  };

  const mentors = data?.mentors ?? [];
  const invites = data?.invites ?? [];

  return (
    <div>
      <PageHeader title="Mentors" description="Mentors sign up as students first. Enter their email here to give them mentor access." />

      <div className="grid xl:grid-cols-3 gap-6">
        <Card title="Make someone a mentor" description="They will go straight to the mentor portal next time they open NexStep, and lose access to student pages." className="xl:col-span-1 self-start">
          <form onSubmit={submit} className="space-y-3">
            <Field label="Their sign-in email (e.g. Gmail)" id="mentor-email">
              <input id="mentor-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@gmail.com" className={inputClass} required />
            </Field>
            <Button type="submit" loading={busy} className="w-full">Give mentor access</Button>
          </form>
          <div className="mt-4 space-y-2">
            <Notice>{error}</Notice>
            <Notice kind="success">{notice}</Notice>
          </div>
        </Card>

        <div className="xl:col-span-2 space-y-6">
          <Card title={`Mentors${mentors.length ? ` (${mentors.length})` : ''}`}>
            {!data ? <Loading /> : mentors.length === 0 ? (
              <Empty icon={UserCog} title="No mentors yet" message="Add a mentor by email to get started." />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 -my-2">
                {mentors.map((m) => (
                  <li key={m.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{`${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email}</p>
                      <p className="text-xs text-slate-500 truncate">{m.email} · joined {formatDate(m.joinedAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!m.isActive && <Badge tone="red">Suspended</Badge>}
                      <ConfirmButton variant="secondary" disabled={busyKey === m.email} confirmLabel="Confirm"
                        onConfirm={() => act(m.email, () => setRole(m.email, 'STUDENT'))}>
                        Make student
                      </ConfirmButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Waiting to sign up" description="These emails become mentors automatically the first time they sign in.">
            {!data ? <Loading /> : invites.length === 0 ? (
              <Empty icon={Mail} title="No pending invites" />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 -my-2">
                {invites.map((inv) => (
                  <li key={inv.email} className="py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{inv.email}</p>
                      <p className="text-xs text-slate-500 inline-flex items-center gap-1"><Clock className="w-3 h-3" aria-hidden="true" />Added {formatDate(inv.createdAt)}{inv.invitedBy ? ` by ${inv.invitedBy}` : ''}</p>
                    </div>
                    <Button variant="ghost" loading={busyKey === `inv-${inv.email}`}
                      onClick={() => act(`inv-${inv.email}`, async () => {
                        await adminFetch(`/admin/roles/invites/${encodeURIComponent(inv.email)}`, { method: 'DELETE' });
                        setNotice(`Invite for ${inv.email} cancelled.`);
                        await load();
                      })}>
                      Cancel
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AdminMentors;
