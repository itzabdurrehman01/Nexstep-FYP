import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, UserCog, ShieldCheck, Database, UserRound, LogOut, Menu, X, Sun, Moon, Loader2, Library, Link2, CreditCard, CalendarClock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';
import { adminFetch } from './adminApi.js';
import { AdminSignIn } from './AdminSignIn.jsx';
import { Loading } from './AdminUi.jsx';
import logoImg from '../assets/images/nexstep_logo_1786045525796.png';

const AdminOverview = lazy(() => import('./AdminOverview.jsx'));
const AdminUsers = lazy(() => import('./AdminUsers.jsx'));
const AdminMentors = lazy(() => import('./AdminMentors.jsx'));
const AdminAdmins = lazy(() => import('./AdminAdmins.jsx'));
const AdminAccount = lazy(() => import('./AdminAccount.jsx'));
const AdminContent = lazy(() => import('./AdminContent.jsx'));
const AdminAssignments = lazy(() => import('./AdminAssignments.jsx'));
const AdminPayments = lazy(() => import('./AdminPayments.jsx'));
const AdminRefresh = lazy(() => import('./AdminRefresh.jsx'));
const DataReadinessDashboard = lazy(() => import('../components/admin/DataReadinessDashboard.jsx'));

const NAV = [
  { path: '/admin', label: 'Overview', icon: LayoutDashboard },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/mentors', label: 'Mentors', icon: UserCog },
  { path: '/admin/assignments', label: 'Assignments', icon: Link2 },
  { path: '/admin/payments', label: 'Payments', icon: CreditCard },
  { path: '/admin/content', label: 'Content', icon: Library },
  { path: '/admin/refresh', label: 'Annual refresh', icon: CalendarClock },
  { path: '/admin/admins', label: 'Admins', icon: ShieldCheck },
  { path: '/admin/data', label: 'Data', icon: Database },
  { path: '/admin/account', label: 'Account', icon: UserRound },
];

/** The separate admin portal at /#/admin — its own sign-in, layout and menu. */
export function AdminPortal() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [status, setStatus] = useState('loading'); // loading | setup | signedOut | signedIn | error
  const [admin, setAdmin] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const checkSession = useCallback(async () => {
    try {
      const s = await adminFetch('/admin-auth/status');
      if (s.setupRequired) { setStatus('setup'); return; }
      try {
        const me = await adminFetch('/admin-auth/me');
        setAdmin(me.admin); setStatus('signedIn');
      } catch { setAdmin(null); setStatus('signedOut'); }
    } catch { setStatus('error'); }
  }, []);

  useEffect(() => { checkSession(); }, [checkSession]);
  useEffect(() => { document.title = 'NexStep Admin'; return () => { document.title = 'NexStep — Career & Education Guidance'; }; }, []);
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  // Any admin API answering 401 (expired session, disabled account) returns to sign-in.
  useEffect(() => {
    if (status !== 'signedIn') return undefined;
    const onFocus = () => adminFetch('/admin-auth/me').catch(() => { setAdmin(null); setStatus('signedOut'); });
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [status]);

  const signOut = async () => {
    await adminFetch('/admin-auth/logout', { method: 'POST' }).catch(() => {});
    setAdmin(null); setStatus('signedOut');
    navigate('/admin', { replace: true });
  };

  const shell = (children) => <div className={`${isDark ? 'dark' : ''} min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100`}>{children}</div>;

  if (status === 'loading') {
    return shell(<div className="min-h-screen flex items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading admin portal…</div>);
  }
  if (status === 'error') {
    return shell(
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">Could not reach the NexStep server. Check that the backend is running.</p>
        <button type="button" onClick={() => { setStatus('loading'); checkSession(); }} className="h-9 px-4 rounded-xl bg-emerald-600 text-white text-sm font-medium">Try again</button>
      </div>
    );
  }
  if (status === 'setup' || status === 'signedOut') {
    return shell(<AdminSignIn mode={status === 'setup' ? 'setup' : 'login'} onSignedIn={(a) => { setAdmin(a); setStatus('signedIn'); navigate('/admin', { replace: true }); }} />);
  }

  const path = location.pathname.replace(/\/+$/, '') || '/admin';
  const current = NAV.find((n) => n.path === path) ?? NAV[0];
  const go = (p) => navigate(p);

  let page;
  switch (current.path) {
    case '/admin/users': page = <AdminUsers />; break;
    case '/admin/mentors': page = <AdminMentors />; break;
    case '/admin/content': page = <AdminContent />; break;
    case '/admin/refresh': page = <AdminRefresh />; break;
    case '/admin/assignments': page = <AdminAssignments />; break;
    case '/admin/payments': page = <AdminPayments />; break;
    case '/admin/admins': page = <AdminAdmins me={admin} />; break;
    case '/admin/data': page = <DataReadinessDashboard lang="en" />; break;
    case '/admin/account': page = <AdminAccount me={admin} />; break;
    default: page = <AdminOverview onNavigate={go} />;
  }

  const sidebar = (
    <aside className="ns-side flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800" style={{ width: 248 }} aria-label="Admin navigation">
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-slate-200 dark:border-slate-800">
        <img src={logoImg} alt="" className="w-7 h-7 rounded-md" />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">NexStep</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">Admin portal</p>
        </div>
      </div>
      <nav className="ns-side-scroll flex-1 pt-3">
        <div className="ns-side-items-inner">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.path === current.path;
            return (
              <button key={item.path} type="button" onClick={() => go(item.path)} aria-current={active ? 'page' : undefined} className={`ns-side-item${active ? ' is-active' : ''}`}>
                <Icon className="ns-side-icon" strokeWidth={1.75} aria-hidden="true" />
                <span className="ns-side-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <div className="ns-side-foot">
        <div className="ns-side-user" style={{ borderTop: 0, marginTop: 0, paddingTop: 0 }}>
          <span className="ns-side-avatar" aria-hidden="true">{(admin?.name || 'A').charAt(0).toUpperCase()}</span>
          <span className="min-w-0 flex-1">
            <b className="block truncate">{admin?.name}</b>
            <small className="block truncate">{admin?.email}</small>
          </span>
          <button type="button" onClick={signOut} className="ns-side-iconbtn is-danger" aria-label="Sign out" title="Sign out">
            <LogOut className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </aside>
  );

  return shell(
    <div className="flex min-h-screen">
      <div className="hidden lg:block sticky top-0 h-screen shrink-0">{sidebar}</div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" className="absolute inset-0 bg-slate-950/50" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <div className="relative h-full w-[248px]">{sidebar}</div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-14 flex items-center justify-between gap-3 px-4 sm:px-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <button type="button" className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate">{current.label}</span>
          </div>
          <button type="button" onClick={toggleTheme} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </header>
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 w-full min-w-0">
          <Suspense fallback={<Loading />}>{page}</Suspense>
        </main>
      </div>
    </div>
  );
}

export default AdminPortal;
