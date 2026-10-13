import React, { useEffect, useRef, useState } from 'react';
import { LayoutDashboard, Settings, LogOut, ChevronDown } from 'lucide-react';
import { getUserRole, useAuth } from '../../context/AuthContext.jsx';

/** Round photo with an initial as fallback (also used when the photo fails to load). */
export function UserAvatar({ user, size = 32, className = '' }) {
  const [broken, setBroken] = useState(false);
  const name = user?.name || user?.email || '?';
  const src = !broken ? (user?.imageUrl || user?.avatarUrl) : null;
  useEffect(() => { setBroken(false); }, [user?.imageUrl, user?.avatarUrl]);
  return (
    <span className={`inline-flex items-center justify-center rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 font-semibold shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }} aria-hidden="true">
      {src ? <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="w-full h-full object-cover" /> : name.charAt(0).toUpperCase()}
    </span>
  );
}

/** Signed-in account button in the top bar: photo + first name, with a small menu. */
export function AccountMenu({ onNavigate, lang = 'en' }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const ur = lang === 'ur';

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  if (!user) return null;
  const mentor = getUserRole(user) === 'MENTOR';
  const go = (tab) => { setOpen(false); onNavigate(tab); };
  const item = 'w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer';

  return (
    <div className="relative" ref={ref} data-no-translate>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}
        className="inline-flex items-center gap-2 h-9 ps-1 pe-2 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
        title={user.name}>
        <UserAvatar user={user} size={28} />
        <span className="hidden md:block max-w-[8rem] truncate text-sm font-medium text-slate-800 dark:text-slate-100">{user.firstName || user.name}</span>
        <ChevronDown className="hidden md:block w-3.5 h-3.5 text-slate-500" />
      </button>
      {open && (
        <div role="menu" className="absolute end-0 mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-2 z-50">
          <div className="flex items-center gap-3 px-2 py-2.5 border-b border-slate-100 dark:border-slate-800 mb-1">
            <UserAvatar user={user} size={40} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button type="button" role="menuitem" onClick={() => go(mentor ? 'mentorPortal' : 'dashboard')} className={item}><LayoutDashboard className="w-4 h-4" />{ur ? 'ڈیش بورڈ' : mentor ? 'Mentor workspace' : 'Dashboard'}</button>
          <button type="button" role="menuitem" onClick={() => go('settings')} className={item}><Settings className="w-4 h-4" />{ur ? 'ترتیبات' : 'Settings'}</button>
          <button type="button" role="menuitem" onClick={async () => { setOpen(false); await logout(); onNavigate('landing'); }} className={`${item} text-red-600 dark:text-red-400`}><LogOut className="w-4 h-4" />{ur ? 'سائن آؤٹ' : 'Sign out'}</button>
        </div>
      )}
    </div>
  );
}

export default AccountMenu;
