import { useEffect } from 'react';
import { ChevronRight, LogOut, ShieldCheck, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import LanguageSwitcher from '../common/LanguageSwitcher';

interface MobileDrawerProps { open: boolean; onClose: () => void; onNavigate: (destination: string) => void; onLogout?: () => void; isAuthenticated?: boolean; showAdminSignIn?: boolean; links: Array<[string, string]>; lang?: string; }

export function MobileDrawer({ open, onClose, onNavigate, onLogout, isAuthenticated = false, showAdminSignIn = false, links, lang = 'en' }: MobileDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => { document.body.style.overflow = originalOverflow; window.removeEventListener('keydown', onKeyDown); };
  }, [onClose, open]);

  const copy = lang === 'ur'
    ? { signIn: 'سائن اِن', start: 'شروع کریں', signOut: 'سائن آؤٹ', menu: 'مینو' }
    : { signIn: 'Sign in', start: 'Get started', signOut: 'Sign out', menu: 'Menu' };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button aria-label="Close menu overlay" onClick={onClose} className="ns-drawer-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} />
          <motion.aside aria-label="Mobile navigation" className="ns-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}>
            <div className="ns-drawer-head">
              <span>{copy.menu}</span>
              <button aria-label="Close menu" onClick={onClose} className="ns-icon-btn"><X className="h-5 w-5" strokeWidth={1.75} /></button>
            </div>
            <nav className="ns-drawer-links">
              {links.map(([label, destination]) => (
                <button key={label} type="button" onClick={() => { onNavigate(destination); onClose(); }}>
                  {label}<ChevronRight className="h-4 w-4" strokeWidth={1.75} />
                </button>
              ))}
            </nav>
            <div className="ns-drawer-actions">
              <LanguageSwitcher className="w-full" />
              {isAuthenticated ? (
                <button type="button" onClick={() => { onLogout?.(); onClose(); }} className="ns-btn-outline"><LogOut className="h-4 w-4" strokeWidth={1.75} />{copy.signOut}</button>
              ) : (
                <>
                  <button type="button" onClick={() => { onNavigate('auth'); onClose(); }} className="ns-btn-outline">{copy.signIn}</button>
                  <button type="button" onClick={() => { onNavigate('quiz'); onClose(); }} className="ns-btn-solid">{copy.start}</button>
                  {showAdminSignIn && (
                    <button type="button" onClick={() => { onNavigate('admin'); onClose(); }} className="ns-btn-outline">
                      <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />{lang === 'ur' ? 'ایڈمن سائن اِن' : 'Admin sign in'}
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default MobileDrawer;
