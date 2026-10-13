import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen, Search, Crown } from 'lucide-react';
import { getUserRole, useAuth } from '../context/AuthContext.jsx';
import { getAccountItems, getNavGroups, navLabel, NAV_ITEMS } from '../config/navigation.js';
import { profileLevel, levelLabel } from '../config/educationLevels.js';

const SECTIONS_KEY = 'ns_sidebar_sections_v2';

function readClosedSections() {
  try { return JSON.parse(localStorage.getItem(SECTIONS_KEY) || '[]'); } catch { return []; }
}

function NavItem({ item, active, collapsed, lang, onSelect }) {
  const Icon = item.icon;
  const label = navLabel(item, lang);
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      className={`ns-side-item${active ? ' is-active' : ''}`}
    >
      <Icon className="ns-side-icon" strokeWidth={1.75} aria-hidden="true" />
      {!collapsed && <span className="ns-side-label">{label}</span>}
      {collapsed && <span className="ns-side-tip" role="tooltip">{label}</span>}
    </button>
  );
}

export function Sidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  lang = 'en',
  profile,
  onOpenCommandPalette,
  onLogout,
}) {
  const { user } = useAuth();
  const role = getUserRole(user);
  const level = profileLevel(profile);
  const groups = useMemo(() => getNavGroups(role, level), [role, level]);
  const accountItems = useMemo(() => getAccountItems(role), [role]);
  const [closed, setClosed] = useState(readClosedSections);

  // Always open the section that holds the current page.
  useEffect(() => {
    const owner = groups.find((g) => g.items.some((i) => i.id === activeTab));
    if (owner && closed.includes(owner.id)) setClosed((c) => c.filter((id) => id !== owner.id));
  }, [activeTab, groups]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try { localStorage.setItem(SECTIONS_KEY, JSON.stringify(closed)); } catch { /* storage unavailable */ }
  }, [closed]);

  const toggleSection = (id) =>
    setClosed((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const roleLabel = role === 'ADMIN' ? 'Administrator' : role === 'MENTOR' ? 'Mentor' : role === 'RECRUITER' ? 'Recruiter' : 'Student';
  const accountName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email?.split('@')[0] || roleLabel
    : profile?.name || 'Guest';
  const accountSubtitle = (role === 'STUDENT' && level ? levelLabel(level, lang) : null) || user?.email || roleLabel;
  const canShowLogout = Boolean(user && onLogout && activeTab !== 'auth');
  const isRtl = lang === 'ur';
  const CollapseIcon = isCollapsed ? PanelLeftOpen : PanelLeftClose;
  const showUpgrade = role === 'STUDENT';

  return (
    <aside
      className={`nexstep-sidebar ns-side relative z-30 shrink-0 flex flex-col sticky ${isCollapsed ? 'is-collapsed' : ''}`}
      aria-label={isRtl ? 'سائیڈ بار' : 'Sidebar'}
    >
      {/* Header: search + collapse */}
      <div className="ns-side-head">
        {!isCollapsed && (
          <button type="button" onClick={onOpenCommandPalette} className="ns-side-search">
            <Search className="w-4 h-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span className="flex-1 text-start truncate">{isRtl ? 'تلاش کریں…' : 'Search'}</span>
            <kbd>Ctrl K</kbd>
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ns-side-iconbtn"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <CollapseIcon className={`w-[18px] h-[18px] ${isRtl ? '-scale-x-100' : ''}`} strokeWidth={1.75} />
        </button>
      </div>

      {/* Sections */}
      <nav className="ns-side-scroll no-scrollbar" aria-label="Main navigation">
        {isCollapsed && (
          <button type="button" onClick={onOpenCommandPalette} className="ns-side-item" aria-label="Search">
            <Search className="ns-side-icon" strokeWidth={1.75} aria-hidden="true" />
            <span className="ns-side-tip" role="tooltip">{isRtl ? 'تلاش' : 'Search'}</span>
          </button>
        )}
        {groups.map((group) => {
          const open = isCollapsed || !closed.includes(group.id);
          const hasActive = group.items.some((i) => i.id === activeTab);
          return (
            <section key={group.id} className="ns-side-section">
              {isCollapsed ? (
                <div className="ns-side-divider" aria-hidden="true" />
              ) : (
                <button
                  type="button"
                  className={`ns-side-heading${hasActive ? ' has-active' : ''}`}
                  onClick={() => toggleSection(group.id)}
                  aria-expanded={open}
                >
                  <span>{isRtl ? group.titleUr : group.title}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} strokeWidth={2} />
                </button>
              )}
              <div className={`ns-side-items${open ? '' : ' is-closed'}`}>
                <div className="ns-side-items-inner">
                  {group.items.map((item) => (
                    <NavItem key={item.id} item={item} active={activeTab === item.id} collapsed={isCollapsed} lang={lang} onSelect={setActiveTab} />
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </nav>

      {/* Footer: upgrade, account links, user */}
      <div className="ns-side-foot">
        {showUpgrade && !isCollapsed && (
          <button type="button" className="ns-side-upgrade" onClick={() => setActiveTab('pricing')}>
            <span className="ns-side-upgrade-icon"><Crown className="w-4 h-4" strokeWidth={1.75} /></span>
            <span className="min-w-0 text-start">
              <b>{isRtl ? 'پریمیم حاصل کریں' : 'Upgrade to Premium'}</b>
              <small>{isRtl ? 'تمام کیریئر نتائج اور مکمل منصوبے' : 'All matches and full skill plans'}</small>
            </span>
          </button>
        )}
        {showUpgrade && isCollapsed && (
          <NavItem item={{ id: 'pricing', ...NAV_ITEMS.pricing }} active={activeTab === 'pricing'} collapsed lang={lang} onSelect={setActiveTab} />
        )}

        {isCollapsed ? (
          <div className="ns-side-items-inner">
            {accountItems.map((item) => (
              <NavItem key={item.id} item={item} active={activeTab === item.id} collapsed lang={lang} onSelect={setActiveTab} />
            ))}
          </div>
        ) : (
          <div className="ns-side-quick">
            {accountItems.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} type="button" onClick={() => setActiveTab(item.id)} aria-current={activeTab === item.id ? 'page' : undefined} className={activeTab === item.id ? 'is-active' : ''}>
                  <Icon className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
                  <span>{navLabel(item, lang)}</span>
                </button>
              );
            })}
          </div>
        )}

        {user && (
          <div className={`ns-side-user${isCollapsed ? ' is-collapsed' : ''}`} data-no-translate>
            <span className="ns-side-avatar" aria-hidden="true">
              {user.imageUrl ? <img src={user.imageUrl} alt="" /> : accountName.charAt(0).toUpperCase()}
            </span>
            {!isCollapsed && (
              <span className="min-w-0 flex-1">
                <b className="block truncate">{accountName}</b>
                <small className="block truncate">{accountSubtitle}</small>
              </span>
            )}
            {canShowLogout && !isCollapsed && (
              <button type="button" onClick={onLogout} className="ns-side-iconbtn is-danger" aria-label="Sign out" title={isRtl ? 'سائن آؤٹ' : 'Sign out'}>
                <LogOut className="w-4 h-4" strokeWidth={1.75} />
              </button>
            )}
          </div>
        )}
        {canShowLogout && isCollapsed && (
          <button type="button" onClick={onLogout} className="ns-side-item is-danger" aria-label="Sign out">
            <LogOut className="ns-side-icon" strokeWidth={1.75} aria-hidden="true" />
            <span className="ns-side-tip" role="tooltip">{isRtl ? 'سائن آؤٹ' : 'Sign out'}</span>
          </button>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
