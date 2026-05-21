import { useAppStore } from '../../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { useWalletStore } from '../../store/useWalletStore.js';
import { CreditWalletWidget } from '../ui/CreditWalletWidget.jsx';
import { useRole } from '../../hooks/useRole.js';

const SIDEBAR_STYLE = `@keyframes livePulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.6)} }`;

const LogoMark = () => (
  <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
    <path d="M2 10L8 3L14 10L8 17L2 10Z" fill="oklch(65% 0.2 145 / 0.9)" />
    <path d="M9 10L15 3L21 10L15 17L9 10Z" fill="oklch(62% 0.19 245 / 0.7)" />
    <path d="M16 10L22 3L28 10L22 17L16 10Z" fill="oklch(62% 0.19 245 / 0.5)" />
  </svg>
);

const NAV = [
  { section:'OVERVIEW', items:[
    { id:'dashboard', icon:'⬡', label:'Command Center' },
  ]},
  { section:'BUSINESSES', items:[
    { id:'businesses', icon:'◈', label:'All Businesses', badgeColor:'green' },
    { id:'replies', icon:'✦', label:'Reply Inbox', badgeColor:'red' },
    { id:'approval', icon:'⏳', label:'Approvals', badgeColor:'amber' },
  ]},
  { section:'CAMPAIGNS', items:[
    { id:'campaigns', icon:'◉', label:'All Campaigns', badgeColor:'blue' },
    { id:'leads', icon:'👥', label:'Lead Manager' },
    { id:'new-campaign', icon:'＋', label:'New Campaign' },
  ]},
  { section:'ANALYTICS', items:[
    { id:'reporting', icon:'↗', label:'Reporting & ROI' },
    { id:'prompt-studio', icon:'⚡', label:'Prompt Studio' },
  ]},
  { section:'DEMO', items:[
    { id:'live-demo', icon:'●', label:'Live Demo' },
  ]},
  { section:'SYSTEM', items:[
    { id:'settings', icon:'◎', label:'Settings' },
    { id:'client-portal', icon:'🌐', label:'Client Portal' },
  ]},
];

export function Sidebar() {
  const { page, setPage, businesses, campaigns, replies, sidebarOpen, closeSidebar } = useAppStore(useShallow(s => ({
    page: s.page, setPage: s.setPage,
    businesses: s.businesses, campaigns: s.campaigns, replies: s.replies,
    sidebarOpen: s.sidebarOpen, closeSidebar: s.closeSidebar,
  })));
  const { canAccess, role, user } = useRole();
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : 'KO';

  function logout() {
    localStorage.removeItem('kboos_token');
    localStorage.removeItem('kboos_user');
    window.location.reload();
  }

  const unreadReplies = replies.filter(r => r.status === 'unread').length;
  const pendingApprovals = campaigns.filter(c => c.status === 'awaiting_approval').length;
  const totalCampaigns = campaigns.length;
  const totalBusinesses = businesses.length;

  function navTo(id) {
    setPage(id);
    closeSidebar();
  }

  function getBadge(id) {
    if (id === 'businesses') return totalBusinesses || null;
    if (id === 'replies') return unreadReplies || null;
    if (id === 'approval') return pendingApprovals || null;
    if (id === 'campaigns') return totalCampaigns || null;
    return null;
  }

  return (
    <div className={`sidebar${sidebarOpen ? ' mobile-open' : ''}`}>
      <style>{SIDEBAR_STYLE}</style>
      <div className="sidebar-logo">
        <div className="logo-mark">
          <LogoMark />
          <span className="logo-text serif">OUTREACH OS</span>
        </div>
        <div className="logo-sub">by KOBIS Berhad</div>
      </div>
      <div className="nav-scroll">
        {NAV.map(section => (
          <div key={section.section} className="nav-section">
            <div className="nav-label">{section.section}</div>
            {section.items.filter(item => canAccess(item.id)).map(item => {
              const badge = getBadge(item.id);
              const pulse = item.id === 'replies' && unreadReplies > 0;
              return (
                <div
                  key={item.id}
                  className={`nav-item${page === item.id ? ' active' : ''}`}
                  onClick={() => navTo(item.id)}
                >
                  <span className="nav-icon" style={item.id==='live-demo'?{color:'var(--green)',fontSize:8,animation:'livePulse 2s ease-in-out infinite'}:{}}>{item.icon}</span>
                  <span style={{flex:1}}>{item.label}</span>
                  {badge != null && (
                    <span className={`nav-badge ${item.badgeColor || ''}${pulse ? ' pulse' : ''}`}>
                      {pulse && <span className="pulse-dot" style={{width:4,height:4,marginRight:2}}/>}
                      {badge}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {role === 'admin' && <CreditWalletWidget onClick={() => { sessionStorage.setItem('settingsTab', 'wallet'); setPage('settings'); }} />}
      <div className="sidebar-footer">
        <div className="avatar">{initials}</div>
        <div style={{flex:1, minWidth:0}}>
          <div className="footer-name truncate">{user?.name || 'User'}</div>
          <div className="footer-role" style={{textTransform:'capitalize'}}>{user?.role || 'operator'}</div>
        </div>
        <button className="btn-ghost" style={{padding:4,borderRadius:6,background:'none',fontSize:14,color:'var(--muted)',display:'flex',alignItems:'center',justifyContent:'center'}} title="Sign Out" onClick={logout}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
