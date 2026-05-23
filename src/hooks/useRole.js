const ROLE_ACCESS = {
  admin:    ['dashboard','businesses','add-business','campaigns','new-campaign','campaign-dashboard','lead-intelligence','ai-studio','ai-campaign-studio','revenue','revenue-analytics','campaign-analytics','channel-analytics','leads','replies','approvals','reporting','prompt-studio','live-demo','settings','client-portal','pipeline','business-detail','unified-inbox','email-inbox','whatsapp-inbox','voice-outcomes'],
  operator: ['dashboard','businesses','add-business','campaigns','new-campaign','campaign-dashboard','lead-intelligence','ai-studio','ai-campaign-studio','revenue','revenue-analytics','campaign-analytics','channel-analytics','leads','replies','approvals','reporting','prompt-studio','live-demo','settings','client-portal','pipeline','business-detail','unified-inbox','email-inbox','whatsapp-inbox','voice-outcomes'],
  viewer:   ['dashboard','businesses','campaigns','campaign-dashboard','lead-intelligence','leads','replies','reporting','campaign-analytics','revenue-analytics','channel-analytics','client-portal','business-detail','unified-inbox'],
};

const SETTINGS_TABS = {
  admin:    ['api','team','clients','wallet','drive','notifications','branding'],
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
