import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, Image as ImageIcon, Check, X, Settings2, Receipt, Tag } from 'lucide-react';
import { adminFetch, formatDateTime } from './adminApi.js';
import { Badge, Button, Card, Empty, Field, Loading, Notice, PageHeader, inputClass } from './AdminUi.jsx';

const rs = (n) => `Rs ${Number(n || 0).toLocaleString('en-PK')}`;
const STATUS_TONE = { PROCESSING: 'amber', COMPLETED: 'green', FAILED: 'red', CANCELLED: 'slate', PENDING: 'slate', REFUNDED: 'slate' };
const STATUS_LABEL = { PROCESSING: 'Waiting', COMPLETED: 'Approved', FAILED: 'Rejected', CANCELLED: 'Withdrawn', PENDING: 'Started', REFUNDED: 'Refunded' };
const FILTERS = [['PROCESSING', 'Waiting'], ['COMPLETED', 'Approved'], ['FAILED', 'Rejected'], ['ALL', 'All']];

function ReceiptButton({ id }) {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const load = async () => {
    try {
      const res = await fetch(`/api/admin/payments/${id}/receipt`, { credentials: 'include', headers: { 'x-nexstep-admin': '1' } });
      if (!res.ok) throw new Error();
      setUrl(URL.createObjectURL(await res.blob()));
    } catch { setErr('Could not load the receipt.'); }
  };
  if (url) return <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="Payment receipt" className="max-h-72 rounded-xl border border-slate-200 dark:border-slate-700" /></a>;
  return (
    <span className="inline-flex items-center gap-2">
      <Button variant="secondary" onClick={load} className="h-8 text-xs"><ImageIcon className="w-3.5 h-3.5" /> View receipt</Button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </span>
  );
}

function PaymentRow({ p, onChanged }) {
  const [mode, setMode] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const d = p.details || {};
  const run = async (path, body) => {
    setBusy(true); setError('');
    try { await adminFetch(path, { method: 'POST', body }); onChanged(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <li className="p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{p.student.name} <span className="font-normal text-slate-500">· {p.student.email}</span></p>
          <p className="text-xs text-slate-500 mt-0.5">{p.planName} · submitted {formatDateTime(p.submittedAt)}</p>
        </div>
        <div className="flex items-center gap-2"><span className="text-base font-bold text-slate-900 dark:text-white">{rs(p.amountPkr)}</span><Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status] || p.status}</Badge></div>
      </div>
      <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2 text-sm">
        <div><dt className="text-xs text-slate-500">Method</dt><dd className="text-slate-800 dark:text-slate-100">{p.methodLabel}</dd></div>
        <div><dt className="text-xs text-slate-500">Transaction ID</dt><dd className="font-mono text-slate-800 dark:text-slate-100 break-all">{p.transactionId || '—'}</dd></div>
        <div><dt className="text-xs text-slate-500">Paid from</dt><dd className="text-slate-800 dark:text-slate-100">{d.senderName || '—'}{d.senderAccount ? ` · ${d.senderAccount}` : ''}</dd></div>
        <div><dt className="text-xs text-slate-500">Paid at (student says)</dt><dd className="text-slate-800 dark:text-slate-100">{d.paidAt ? formatDateTime(d.paidAt) : '—'}</dd></div>
      </dl>
      {d.note && <p className="text-sm text-slate-600 dark:text-slate-300 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-2">“{d.note}”</p>}
      {p.hasReceipt && <ReceiptButton id={p.id} />}
      {p.status === 'FAILED' && p.failureReason && <p className="text-xs text-slate-500">Reason: {p.failureReason}</p>}
      {p.reviewedBy && <p className="text-xs text-slate-500">Reviewed by {p.reviewedBy} · {formatDateTime(p.reviewedAt)}</p>}
      <Notice>{error}</Notice>
      {p.status === 'PROCESSING' && (
        mode === 'reject' ? (
          <form className="flex flex-col sm:flex-row gap-2" onSubmit={(e) => { e.preventDefault(); run(`/admin/payments/${p.id}/reject`, { reason }); }}>
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} required minLength={5} className={inputClass}
              placeholder="e.g. No payment with this transaction ID reached our account" aria-label="Reason shown to the student" />
            <Button type="submit" variant="danger" loading={busy} className="shrink-0"><X className="w-4 h-4" /> Reject</Button>
            <Button type="button" variant="secondary" onClick={() => setMode(null)} className="shrink-0">Back</Button>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => run(`/admin/payments/${p.id}/approve`)} loading={busy}><Check className="w-4 h-4" /> Approve & activate</Button>
            <Button variant="danger" onClick={() => setMode('reject')}><X className="w-4 h-4" /> Reject</Button>
          </div>
        )
      )}
      {p.status === 'PROCESSING' && mode !== 'reject' && <p className="text-xs text-slate-500">Check your {p.methodLabel} account for {rs(p.amountPkr)} with this transaction ID before approving.</p>}
    </li>
  );
}

function AccountFields({ title, value, onChange, bank }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
      <label className="flex items-center justify-between gap-3 cursor-pointer">
        <span className="text-sm font-semibold text-slate-900 dark:text-white">{title}</span>
        <input type="checkbox" checked={!!value.enabled} onChange={(e) => set('enabled', e.target.checked)} className="w-4 h-4 accent-emerald-600" aria-label={`Accept ${title}`} />
      </label>
      {value.enabled && (
        <div className="grid sm:grid-cols-2 gap-3">
          {bank && <Field label="Bank name"><input value={value.bankName || ''} onChange={(e) => set('bankName', e.target.value)} className={inputClass} placeholder="e.g. Meezan Bank" /></Field>}
          <Field label="Account title"><input value={value.accountTitle || ''} onChange={(e) => set('accountTitle', e.target.value)} className={inputClass} placeholder="Name exactly as on the account" /></Field>
          <Field label={bank ? 'Account number' : 'Mobile account number'}><input value={value.accountNumber || ''} onChange={(e) => set('accountNumber', e.target.value)} className={inputClass} placeholder={bank ? 'Account number' : 'e.g. 0300 1234567'} /></Field>
          {bank && <Field label="IBAN (optional)"><input value={value.iban || ''} onChange={(e) => set('iban', e.target.value)} className={inputClass} placeholder="PK00XXXX0000000000000000" /></Field>}
        </div>
      )}
    </div>
  );
}

function SettingsPanel() {
  const [s, setS] = useState(null);
  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    adminFetch('/admin/payment-settings').then((d) => setS(d.data)).catch((e) => setError(e.message));
    adminFetch('/admin/plans').then((d) => setPlans(d.data)).catch(() => {});
  }, []);
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { const d = await adminFetch('/admin/payment-settings', { method: 'PUT', body: s }); setS(d.data); setNotice('Payment accounts saved.'); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const savePlan = async (p) => {
    setError(''); setNotice('');
    try { await adminFetch(`/admin/plans/${p.id}`, { method: 'PUT', body: { pricePkr: Number(p.pricePkr), isActive: p.isActive } }); setNotice(`${p.name} saved.`); }
    catch (err) { setError(err.message); }
  };
  if (!s) return error ? <Notice>{error}</Notice> : <Loading />;
  return (
    <div className="space-y-6">
      <Notice kind="success">{notice}</Notice>
      <Notice>{error}</Notice>
      <Card title="Where students send money" description="Only methods you switch on are shown on the Plans page.">
        <form onSubmit={save} className="space-y-4">
          <AccountFields title="JazzCash" value={s.jazzcash} onChange={(v) => setS({ ...s, jazzcash: v })} />
          <AccountFields title="Easypaisa" value={s.easypaisa} onChange={(v) => setS({ ...s, easypaisa: v })} />
          <AccountFields title="Bank transfer" bank value={s.bank} onChange={(v) => setS({ ...s, bank: v })} />
          <Field label="Extra instructions for students (optional)">
            <textarea value={s.instructions} onChange={(e) => setS({ ...s, instructions: e.target.value })} rows={3} maxLength={1000} className={`${inputClass} h-auto py-2`} placeholder="e.g. Payments are checked daily between 10 am and 6 pm." />
          </Field>
          <Button type="submit" loading={busy}>Save payment accounts</Button>
        </form>
      </Card>
      <Card title="Plans and prices">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 -m-5">
          {plans.map((p, i) => (
            <li key={p.id} className="p-5 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-40"><p className="text-sm font-semibold text-slate-900 dark:text-white">{p.name}</p><p className="text-xs text-slate-500">{p.billingPeriod.toLowerCase()}</p></div>
              {p.slug !== 'free' && (
                <>
                  <Field label="Price (PKR)"><input type="number" min={0} value={p.pricePkr} onChange={(e) => setPlans(plans.map((x, j) => (j === i ? { ...x, pricePkr: e.target.value } : x)))} className={`${inputClass} w-32`} /></Field>
                  <label className="flex items-center gap-2 h-10 text-sm text-slate-700 dark:text-slate-200 cursor-pointer"><input type="checkbox" checked={p.isActive} onChange={(e) => setPlans(plans.map((x, j) => (j === i ? { ...x, isActive: e.target.checked } : x)))} className="w-4 h-4 accent-emerald-600" />Offered</label>
                  <Button variant="secondary" onClick={() => savePlan(p)}>Save</Button>
                </>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/** Admin → Payments: verify manual payments and manage payment accounts / prices. */
export default function AdminPayments() {
  const [view, setView] = useState('queue');
  const [status, setStatus] = useState('PROCESSING');
  const [rows, setRows] = useState(null);
  const [counts, setCounts] = useState({});
  const [error, setError] = useState('');
  const load = useCallback(() => {
    adminFetch(`/admin/payments?status=${status}`).then((d) => { setRows(d.data); setCounts(d.counts || {}); setError(''); }).catch((e) => { setError(e.message); setRows([]); });
  }, [status]);
  useEffect(() => { if (view === 'queue') load(); }, [load, view]);

  return (
    <div className="space-y-5">
      <PageHeader title="Payments" description="Check JazzCash, Easypaisa and bank payments, then approve them to switch on Premium."
        actions={(
          <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/70">
            {[['queue', 'Payments', Receipt], ['settings', 'Accounts & prices', Settings2]].map(([id, label, I]) => (
              <button key={id} type="button" onClick={() => setView(id)} aria-pressed={view === id}
                className={`inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm cursor-pointer ${view === id ? 'bg-white dark:bg-slate-900 shadow-sm font-medium text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}><I className="w-4 h-4" />{label}</button>
            ))}
          </div>
        )} />
      {view === 'settings' ? <SettingsPanel /> : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map(([id, label]) => (
              <button key={id} type="button" onClick={() => { setRows(null); setStatus(id); }} aria-pressed={status === id}
                className={`h-8 px-3 rounded-lg text-xs font-medium cursor-pointer ${status === id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}>
                {label}{id !== 'ALL' && counts[id] ? ` (${counts[id]})` : ''}
              </button>
            ))}
          </div>
          <Notice>{error}</Notice>
          <Card>
            {!rows ? <Loading /> : rows.length === 0 ? (
              <Empty icon={status === 'PROCESSING' ? CreditCard : Tag} title={status === 'PROCESSING' ? 'No payments waiting' : 'Nothing here yet'} message={status === 'PROCESSING' ? 'When a student submits a payment it appears here for you to check.' : 'Payments in this state will be listed here.'} />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 -m-5">{rows.map((p) => <PaymentRow key={p.id} p={p} onChanged={load} />)}</ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
