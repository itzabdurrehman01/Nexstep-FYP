import React, { useCallback, useEffect, useState } from 'react';
import {
  Crown, Check, Loader2, AlertCircle, CheckCircle2, Copy, Smartphone, Landmark, X, Upload, Clock, Receipt, ArrowLeft, LogIn, Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAutoRefresh } from '../../hooks/useAutoRefresh.js';

const card = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900';
const inputCls = 'w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white';
const btnPrimary = 'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';
const btnGhost = 'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer';
const rs = (n) => `Rs ${Number(n || 0).toLocaleString('en-PK')}`;
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const PERIOD = { MONTHLY: '/ month', QUARTERLY: '/ 3 months', ANNUAL: '/ year', LIFETIME: 'once' };
const STATUS = {
  COMPLETED: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
  PROCESSING: { label: 'Waiting for approval', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
  PENDING: { label: 'Started', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  FAILED: { label: 'Not approved', cls: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300' },
  CANCELLED: { label: 'Withdrawn', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  REFUNDED: { label: 'Refunded', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};
const METHOD_ICON = { JAZZCASH: Smartphone, EASYPAISA: Smartphone, BANK_TRANSFER: Landmark };
const METHOD_LABEL = { JAZZCASH: 'JazzCash', EASYPAISA: 'Easypaisa', BANK_TRANSFER: 'Bank transfer', CARD: 'Card' };

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, { method, credentials: 'include', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Something went wrong.');
  return json;
}

const nowLocal = () => {
  const d = new Date(); const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

function CopyRow({ label, value }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0"><p className="text-xs text-slate-500">{label}</p><p className="text-sm font-semibold text-slate-900 dark:text-white break-all" data-no-translate>{value}</p></div>
      <button type="button" onClick={() => { navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
        className="shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}{copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

function Checkout({ plan, methods, instructions, email, onClose, onDone }) {
  const [method, setMethod] = useState(methods[0]?.method || '');
  const [form, setForm] = useState({ transactionId: '', senderName: '', senderAccount: '', paidAt: nowLocal(), note: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const m = methods.find((x) => x.method === method);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (file && file.size > 3 * 1024 * 1024) { setError('The screenshot must be 3 MB or smaller.'); return; }
    setBusy(true);
    try {
      const res = await api('/api/payments/manual', { method: 'POST', body: { ...form, planSlug: plan.slug, method, paidAt: new Date(form.paidAt).toISOString() } });
      if (file) {
        await fetch(`/api/payments/manual/${res.data.id}/receipt`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': file.type }, body: file }).catch(() => {});
      }
      onDone();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={`Pay for ${plan.name}`}>
      <div className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-slate-900 dark:text-white">{plan.name}</p>
            <p className="text-sm text-slate-500">{rs(plan.price_pkr)} {PERIOD[plan.billing_period] || ''}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">1. Choose how you will pay</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {methods.map((x) => {
              const I = METHOD_ICON[x.method] || Smartphone;
              return (
                <button key={x.method} type="button" onClick={() => setMethod(x.method)} aria-pressed={method === x.method}
                  className={`inline-flex items-center gap-2 h-11 px-3 rounded-xl border text-sm font-medium cursor-pointer ${method === x.method ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                  <I className="w-4 h-4" />{x.label}
                </button>
              );
            })}
          </div>
        </div>

        {m && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">2. Send {rs(plan.price_pkr)} to</p>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 px-4 divide-y divide-slate-200 dark:divide-slate-700">
              {m.bankName && <CopyRow label="Bank" value={m.bankName} />}
              <CopyRow label="Account title" value={m.accountTitle} />
              <CopyRow label={m.method === 'BANK_TRANSFER' ? 'Account number' : `${m.label} number`} value={m.accountNumber} />
              {m.iban && <CopyRow label="IBAN" value={m.iban} />}
              <CopyRow label="Amount" value={String(plan.price_pkr)} />
            </div>
            <p className="mt-2 text-xs text-slate-500">If the app lets you add a message, write your NexStep email{email ? <> (<span data-no-translate>{email}</span>)</> : ''} so we can match the payment faster.</p>
            {instructions && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line">{instructions}</p>}
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">3. Enter your payment details</p>
          <label className="block space-y-1"><span className="text-xs font-medium text-slate-600 dark:text-slate-300">Transaction ID (TID)</span>
            <input value={form.transactionId} onChange={(e) => set('transactionId', e.target.value)} required maxLength={40} placeholder="e.g. 0123456789 (from your SMS or receipt)" className={inputCls} /></label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block space-y-1"><span className="text-xs font-medium text-slate-600 dark:text-slate-300">Paid from (account name)</span>
              <input value={form.senderName} onChange={(e) => set('senderName', e.target.value)} required maxLength={120} placeholder="e.g. Muhammad Ali" className={inputCls} /></label>
            <label className="block space-y-1"><span className="text-xs font-medium text-slate-600 dark:text-slate-300">{method === 'BANK_TRANSFER' ? 'Your account (last 4 digits)' : 'Your mobile account number'}</span>
              <input value={form.senderAccount} onChange={(e) => set('senderAccount', e.target.value)} required maxLength={40} inputMode={method === 'BANK_TRANSFER' ? 'text' : 'tel'}
                placeholder={method === 'BANK_TRANSFER' ? 'e.g. 4521' : 'e.g. 0300 1234567'} className={inputCls} /></label>
          </div>
          <label className="block space-y-1"><span className="text-xs font-medium text-slate-600 dark:text-slate-300">When did you pay?</span>
            <input type="datetime-local" value={form.paidAt} max={nowLocal()} onChange={(e) => set('paidAt', e.target.value)} required className={inputCls} /></label>
          <label className="block space-y-1"><span className="text-xs font-medium text-slate-600 dark:text-slate-300">Receipt screenshot (optional, speeds up approval)</span>
            <span className="flex items-center gap-2">
              <span className={`${btnGhost} h-9 relative`}><Upload className="w-4 h-4" />{file ? 'Change file' : 'Choose image'}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" /></span>
              {file && <span className="text-xs text-slate-500 truncate" data-no-translate>{file.name}</span>}
            </span></label>
          <label className="block space-y-1"><span className="text-xs font-medium text-slate-600 dark:text-slate-300">Note for the admin (optional)</span>
            <input value={form.note} onChange={(e) => set('note', e.target.value)} maxLength={500} placeholder="e.g. Paid from my father's JazzCash account" className={inputCls} /></label>
          {error && <p role="alert" className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="submit" disabled={busy || !method} className={btnPrimary}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}Submit payment</button>
            <button type="button" onClick={onClose} className={btnGhost}>Cancel</button>
          </div>
          <p className="text-xs text-slate-500">An admin checks the payment, usually within 24 hours. Premium switches on as soon as it is approved and you get a notification.</p>
        </form>
      </div>
    </div>
  );
}

/** Plans, checkout (manual JazzCash / Easypaisa / bank with admin approval) and payment history. */
export function PricingTab({ onNavigate }) {
  const { user, authStatus } = useAuth();
  const signedIn = authStatus === 'authenticated';
  const [plans, setPlans] = useState(null);
  const [me, setMe] = useState(null);
  const [methods, setMethods] = useState([]);
  const [instructions, setInstructions] = useState('');
  const [history, setHistory] = useState([]);
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadAccount = useCallback(async () => {
    if (!signedIn) return;
    try {
      const [m, mm, h] = await Promise.all([api('/api/payments/me'), api('/api/payments/manual-methods'), api('/api/payments/history')]);
      setMe(m.data); setMethods(mm.data || []); setInstructions(mm.instructions || ''); setHistory(h.data || []);
    } catch (e) { setError(e.message); }
  }, [signedIn]);

  useEffect(() => { api('/api/payments/plans').then((d) => setPlans(d.data || [])).catch((e) => { setError(e.message); setPlans([]); }); }, []);
  useEffect(() => { loadAccount(); }, [loadAccount]);
  useAutoRefresh(loadAccount, { enabled: signedIn });

  const premium = me?.tier === 'premium';
  const pending = me?.pending;
  const monthly = plans?.find((p) => p.slug === 'premium');

  const withdraw = async () => {
    setBusy(true);
    try { await api(`/api/payments/manual/${pending.id}/withdraw`, { method: 'POST' }); setNotice('Your payment submission was withdrawn.'); await loadAccount(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const choose = (plan) => {
    setNotice(''); setError('');
    if (!signedIn) { onNavigate?.('auth'); return; }
    setCheckoutPlan(plan);
  };

  return (
    <div className="space-y-6 w-full">
      <header>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white inline-flex items-center gap-2"><Crown className="w-6 h-6 text-amber-500" aria-hidden="true" />Plans</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Start free. Upgrade to Premium for every career match, full skill plans and unlimited mentor-reviewed interviews.</p>
      </header>

      {notice && <p role="status" className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />{notice}</p>}
      {error && <p role="alert" className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</p>}

      {signedIn && me && (
        <section className={`${card} p-5 flex flex-wrap items-center justify-between gap-4`}>
          <div className="flex items-center gap-3">
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${premium ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}><Crown className="w-5 h-5" /></span>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{premium ? me.planName : 'Free plan'}</p>
              <p className="text-xs text-slate-500">{premium ? `Active until ${fmtDate(me.expiresAt)}. Paying again adds time to your plan.` : 'You are on the Free plan.'}</p>
            </div>
          </div>
        </section>
      )}

      {pending && (
        <section className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 p-5 space-y-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2"><Clock className="w-4 h-4 text-amber-600" />Payment waiting for approval</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">{pending.plan_name} · {rs(pending.amount_pkr)} · {METHOD_LABEL[pending.provider] || pending.provider} · TID <span data-no-translate>{pending.manual_details?.transactionId}</span> · sent {fmtDate(pending.initiated_at)}</p>
          <p className="text-xs text-slate-500">You will get a notification when an admin approves it.</p>
          <button type="button" onClick={withdraw} disabled={busy} className={`${btnGhost} h-9`}>{busy && <Loader2 className="w-4 h-4 animate-spin" />}Withdraw submission</button>
        </section>
      )}

      {!plans ? <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div> : (
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const paid = Number(p.price_pkr) > 0;
            const saving = p.billing_period === 'ANNUAL' && monthly ? monthly.price_pkr * 12 - p.price_pkr : 0;
            const highlight = p.slug === 'premium';
            return (
              <article key={p.id} className={`${card} p-5 flex flex-col ${highlight ? 'ring-2 ring-emerald-500' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">{p.name}</h2>
                  {saving > 0 && <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Save {rs(saving)}</span>}
                </div>
                <p className="mt-2"><span className="text-3xl font-bold text-slate-900 dark:text-white">{paid ? rs(p.price_pkr) : 'Free'}</span>{paid && <span className="text-sm text-slate-500"> {PERIOD[p.billing_period] || ''}</span>}</p>
                {p.description && <p className="mt-2 text-sm text-slate-500">{p.description}</p>}
                <ul className="mt-4 space-y-2 flex-1">
                  {(p.features || []).map((f) => <li key={f} className="flex gap-2 text-sm text-slate-700 dark:text-slate-200"><Check className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />{f}</li>)}
                </ul>
                <div className="mt-5">
                  {!paid ? (
                    <p className="h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300">{premium ? 'Included' : signedIn ? 'Your current plan' : 'Free forever'}</p>
                  ) : !signedIn ? (
                    <button type="button" onClick={() => choose(p)} className={`${btnPrimary} w-full`}><LogIn className="w-4 h-4" />Sign in to upgrade</button>
                  ) : (
                    <button type="button" onClick={() => choose(p)} disabled={!!pending || methods.length === 0} className={`${btnPrimary} w-full`}><Crown className="w-4 h-4" />{premium ? 'Extend Premium' : 'Get Premium'}</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {signedIn && me && methods.length === 0 && (
        <p className="flex items-start gap-2 text-sm text-slate-500"><Info className="w-4 h-4 mt-0.5 shrink-0" />Online payment is not open yet — the admin has not added payment accounts.</p>
      )}

      {signedIn && history.length > 0 && (
        <section className={`${card} p-5 space-y-3`}>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2"><Receipt className="w-4 h-4" />Payment history</h2>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[620px] text-sm">
              <thead><tr className="text-start text-xs text-slate-500">{['Date', 'Plan', 'Amount', 'Method', 'Transaction ID', 'Status'].map((h) => <th key={h} className="text-start font-medium py-2 pe-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((h) => {
                  const st = STATUS[h.status] || STATUS.PENDING;
                  return (
                    <tr key={h.id} className="align-top">
                      <td className="py-2.5 pe-3 text-slate-700 dark:text-slate-200 whitespace-nowrap">{fmtDate(h.initiated_at)}</td>
                      <td className="py-2.5 pe-3 text-slate-700 dark:text-slate-200">{h.plan_name}</td>
                      <td className="py-2.5 pe-3 text-slate-700 dark:text-slate-200 whitespace-nowrap">{rs(h.amount_pkr)}</td>
                      <td className="py-2.5 pe-3 text-slate-700 dark:text-slate-200">{METHOD_LABEL[h.provider] || h.provider}</td>
                      <td className="py-2.5 pe-3 text-slate-500" data-no-translate>{h.manual_details?.transactionId || h.provider_txn_id || '—'}</td>
                      <td className="py-2.5 pe-3"><span className={`px-2 py-0.5 rounded-md text-xs font-medium ${st.cls}`}>{st.label}</span>
                        {h.status === 'FAILED' && h.failure_reason && <p className="mt-1 text-xs text-slate-500">{h.failure_reason}</p>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className={`${card} p-5 space-y-3`}>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">How payment works</h2>
        <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-300 list-decimal ps-5">
          <li>Choose a Premium plan and a payment method (JazzCash, Easypaisa or bank transfer).</li>
          <li>Send the exact amount to the account shown, from your own app or a shop.</li>
          <li>Enter the transaction ID from your SMS or receipt. A screenshot helps.</li>
          <li>An admin verifies it, usually within 24 hours, and Premium switches on. If something does not match, you get the reason and can submit again.</li>
        </ol>
      </section>

      {checkoutPlan && (
        <Checkout plan={checkoutPlan} methods={methods} instructions={instructions} email={user?.email}
          onClose={() => setCheckoutPlan(null)}
          onDone={() => { setCheckoutPlan(null); setNotice('Payment submitted. An admin will verify it, usually within 24 hours — you will get a notification.'); loadAccount(); }} />
      )}
    </div>
  );
}

export default PricingTab;
