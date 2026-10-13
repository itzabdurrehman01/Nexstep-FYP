import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, Building2, ChevronDown, Menu, ShieldCheck, Sparkles } from 'lucide-react';
import logoImg from '../../assets/images/nexstep_logo_1786045525796.png';
import { cn } from '../../utils/cn';
import { getUserRole, useAuth } from '../../context/AuthContext.jsx';
import { AccountMenu } from './AccountMenu.jsx';
import { MobileDrawer } from './MobileDrawer';
import { DropdownItem, NavDropdown } from './NavDropdown';
import LanguageSwitcher from '../common/LanguageSwitcher';
import ThemeSwitcher from '../common/ThemeSwitcher.jsx';
import { NotificationBell } from '../notifications/NotificationBell.jsx';

interface MarketingNavbarProps { onNavigate: (destination: string) => void; activeTab: string; lang?: string; }
interface NavLink { label: string; destination?: string; dropdown?: DropdownItem[]; }
const OPEN_DELAY = 80;
const CLOSE_DELAY = 120;
const landingExplore: DropdownItem[] = [
  { label: 'Career Intelligence', description: 'AI-guided paths built around you', icon: Sparkles, destination: 'careerAi' },
  { label: 'University Explorer', description: 'Compare recognised institutions', icon: Building2, destination: 'universities' },
  { label: 'Opportunity Finder', description: 'Scholarships, jobs, and practical skills', icon: BriefcaseBusiness, destination: 'scholarships' },
];

const URDU: Record<string, string> = {
  'Career Intelligence': 'کیریئر انٹیلیجنس', 'AI-guided paths built around you': 'آپ کے لیے تیار کردہ اے آئی رہنمائی',
  'University Explorer': 'یونیورسٹی ایکسپلورر', 'Compare recognised institutions': 'تسلیم شدہ اداروں کا موازنہ کریں',
  'Opportunity Finder': 'مواقع تلاش کریں', 'Scholarships, jobs, and practical skills': 'اسکالرشپس، نوکریاں اور عملی مہارتیں',
  Dashboard: 'ڈیش بورڈ', Career: 'کیریئر', Explore: 'دریافت کریں', 'AI Tools': 'اے آئی ٹولز',
  'Career AI': 'کیریئر اے آئی', 'Personalised recommendations': 'آپ کے لیے ذاتی سفارشات', Roadmap: 'روڈ میپ',
  'Your next best milestones': 'آپ کے اگلے اہم مراحل', 'Skill Gap': 'مہارتوں کا فرق', 'Skills to build next': 'اگلی سیکھنے والی مہارتیں',
  Universities: 'یونیورسٹیاں', 'Admissions and comparisons': 'داخلے اور موازنہ', Scholarships: 'اسکالرشپس',
  'Funding opportunities': 'فنڈنگ کے مواقع', 'Jobs & Internships': 'نوکریاں اور انٹرن شپس', 'Real market opportunities': 'حقیقی مارکیٹ مواقع',
  'Resume Intelligence': 'ریزیومے انٹیلیجنس', 'Make your resume stronger': 'اپنا ریزیومے بہتر بنائیں',
  'Mock Interview': 'پریکٹس انٹرویو', 'Practice with AI': 'اے آئی کے ساتھ مشق کریں', 'AI Counselor': 'اے آئی مشیر', 'Ask anything, anytime': 'کچھ بھی، کسی بھی وقت پوچھیں',
  'Mentor Hub': 'مینٹور ہب', Students: 'طلبہ', Sessions: 'سیشنز', Insights: 'بصیرتیں', Admin: 'ایڈمن',
  'Mentor View': 'مینٹور ویو', Operations: 'انتظام', Analytics: 'تجزیات',
  'Manage institution data': 'اداروں کا ڈیٹا منظم کریں', 'Manage funding opportunities': 'فنڈنگ مواقع منظم کریں', 'Manage market opportunities': 'مارکیٹ مواقع منظم کریں',
  Features: 'خصوصیات', Pathways: 'راستے', Pricing: 'قیمتیں', About: 'ہمارے بارے میں', Resources: 'وسائل', Settings: 'ترتیبات',
  'Admin Dashboard': 'ایڈمن ڈیش بورڈ', 'Mentor Workspace': 'مینٹور ورک اسپیس', 'Mentor Dashboard': 'مینٹور ڈیش بورڈ',
  'Student workspace': 'طالب علم ورک اسپیس', 'Mentor workspace': 'مینٹور ورک اسپیس', 'Admin workspace': 'ایڈمن ورک اسپیس',
  'Sign in': 'سائن اِن', 'Get started': 'شروع کریں', 'Ask NexStep': 'نیکسٹ اسٹیپ سے پوچھیں', 'Admin Console': 'ایڈمن کنسول',
};
const localize = (value: string, lang: string) => lang === 'ur' ? (URDU[value] || value) : value;
const localizeLinks = (items: NavLink[], lang: string): NavLink[] => items.map((item) => ({
  ...item,
  label: localize(item.label, lang),
  dropdown: item.dropdown?.map((entry) => ({ ...entry, label: localize(entry.label, lang), description: localize(entry.description, lang) })),
}));

export function MarketingNavbar({ onNavigate, activeTab, lang = 'en' }: MarketingNavbarProps) {
  const landing = ['landing', 'about', 'privacy', 'terms'].includes(activeTab);
  const { user, logout, authStatus, clerkSignedIn } = useAuth();
  // Admin sign-in is offered only on the landing page and only while nobody is signed in.
  const showAdminSignIn = landing && authStatus === 'unauthenticated' && !clerkSignedIn && !user;
  const role = getUserRole(user);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const links = useMemo<NavLink[]>(() => {
    const source: NavLink[] = landing
      ? [{ label: 'Explore', dropdown: landingExplore }, { label: 'Pricing', destination: 'pricing' }, { label: 'Resources', destination: 'helpCenter' }, { label: 'About', destination: 'about' }]
      : [];
    return localizeLinks(source, lang);
  }, [landing, role, lang]);

  const mobileLinks = useMemo<Array<[string, string]>>(() => {
    const source: Array<[string, string]> = landing
      ? [['Features', 'careerAi'], ['Pathways', 'universities'], ['Pricing', 'pricing'], ['About', 'about']]
      : role === 'MENTOR' ? [['Mentor Dashboard', 'mentorPortal'], ['Students', 'mentorship'], ['Sessions', 'calendarNotif'], ['Insights', 'analytics'], ['Settings', 'settings']]
      : [['Dashboard', 'dashboard'], ['Career AI', 'careerAi'], ['Explore', 'universities'], ['AI Tools', 'aiChatbot'], ['Settings', 'settings']];
    return source.map(([label, destination]) => [localize(label, lang), destination]);
  }, [landing, role, lang]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const scheduleOpen = (label: string) => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpenDropdown(label), OPEN_DELAY); };
  const scheduleClose = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpenDropdown(null), CLOSE_DELAY); };

  const workspaceLabel = localize(role === 'MENTOR' ? 'Mentor workspace' : 'Student workspace', lang);
  const isAuthScreen = activeTab === 'auth' || activeTab === 'login';
  const handleLogout = () => { logout(); onNavigate('landing'); };

  return (
    <>
      <header className={cn('ns-topbar', scrolled && 'is-scrolled', landing && 'is-landing')}>
        <div className="ns-topbar-inner">
          <button type="button" onClick={() => onNavigate('landing')} className="ns-brand" aria-label="NexStep home">
            <span className="ns-brand-mark"><img src={logoImg} alt="" /></span>
            <span className="ns-brand-text">
              <b>NexStep</b>
              {!landing && user && <small>{workspaceLabel}</small>}
            </span>
          </button>

          <nav aria-label="Primary navigation" className="ns-topbar-links">
            {links.map((link) => link.dropdown ? (
              <div key={link.label} className="ns-topbar-dropdown" onMouseEnter={() => scheduleOpen(link.label)} onMouseLeave={scheduleClose}>
                <button type="button" aria-expanded={openDropdown === link.label} onClick={() => setOpenDropdown((open) => open === link.label ? null : link.label)}>
                  {link.label}<ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
                <NavDropdown open={openDropdown === link.label} items={link.dropdown} onNavigate={(destination) => { setOpenDropdown(null); onNavigate(destination); }} onMouseEnter={() => scheduleOpen(link.label)} onMouseLeave={scheduleClose} />
              </div>
            ) : (
              <button key={link.label} type="button" aria-current={activeTab === link.destination ? 'page' : undefined} onClick={() => onNavigate(link.destination || 'dashboard')}>{link.label}</button>
            ))}
          </nav>

          <div className="ns-topbar-actions">
            {Boolean(user) && <NotificationBell onNavigate={onNavigate} />}
            <LanguageSwitcher className="ns-hide-xs" />
            <ThemeSwitcher />
            {showAdminSignIn && (
              <button type="button" onClick={() => onNavigate('admin')} className="ns-topbar-ghost ns-hide-sm" title={lang === 'ur' ? 'ایڈمن سائن اِن' : 'Admin sign in'}>
                <ShieldCheck className="h-4 w-4" strokeWidth={1.75} /><span>{lang === 'ur' ? 'ایڈمن' : 'Admin'}</span>
              </button>
            )}
            {Boolean(user) && <AccountMenu onNavigate={onNavigate} lang={lang} />}
            {!isAuthScreen && !user && (
              <button type="button" onClick={() => onNavigate(user ? 'dashboard' : 'auth')} className="ns-topbar-ghost ns-hide-sm">
                {user ? localize('Dashboard', lang) : localize('Sign in', lang)}
              </button>
            )}
            {landing && !user && (
              <button type="button" onClick={() => onNavigate('quiz')} className="ns-topbar-cta ns-hide-xs">
                {localize('Get started', lang)}<ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            )}
            {landing && (
              <button type="button" aria-label="Open menu" onClick={() => setMenuOpen(true)} className="ns-icon-btn ns-topbar-menu">
                <Menu className="h-5 w-5" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>
      </header>
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} onNavigate={onNavigate} onLogout={handleLogout} isAuthenticated={false} showAdminSignIn={showAdminSignIn} links={mobileLinks} lang={lang} />
    </>
  );
}

export default MarketingNavbar;
