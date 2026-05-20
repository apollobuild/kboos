const ROLE_ACCESS = {
  admin:    ['dashboard','businesses','add-business','campaigns','new-campaign','leads','replies','approvals','reporting','prompt-studio','live-demo','settings','client-portal'],
  operator: ['dashboard','businesses','add-business','campaigns','new-campaign','leads','replies','approvals','reporting','prompt-studio','live-demo','settings','client-portal'],
  viewer:   ['dashboard','businesses','campaigns','leads','replies','reporting','client-portal'],
};

const SETTINGS_TABS = {
  admin:    ['api','team','clients','wallet','drive','billing'],
  operator: ['drive'],
  viewer:   [],
};

const READONLY_PAGES = {
  viewer: ['leads','replies'],
};

export function useRole() {
  const user = (() => { try { return JSON.parse(localStorage.getItem('kboos_user') || 'null'); } catch { return null; } })();
  const role = (user?.role || 'viewer').toLowerCase();

  return {
    role,
    user,
    canAccess: (page) => (ROLE_ACCESS[role] || ROLE_ACCESS.viewer).includes(page),
    canAccessSettingsTab: (tab) => (SETTINGS_TABS[role] || []).includes(tab),
    isReadOnly: (page) => (READONLY_PAGES[role] || []).includes(page),
    isAdmin: role === 'admin',
    isOperator: role === 'operator',
    isViewer: role === 'viewer',
  };
}
