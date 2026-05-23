import { useAppStore } from '../../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { useWalletStore } from '../../store/useWalletStore.js';
import { CreditWalletWidget } from '../ui/CreditWalletWidget.jsx';
import { useRole } from '../../hooks/useRole.js';

const SIDEBAR_STYLE = `
  @keyframes livePulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.6)} }
  @keyframes sbIconPulse { 0%,100%{opacity:0.85} 50%{opacity:1} }
  @keyframes sbGradShift { from{background-position:0% center} to{background-position:200% center} }
`;

const KboosLogo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <span style={{ display: 'block', animation: 'sbIconPulse 4s ease-in-out infinite', flexShrink: 0 }}>
      <svg width="32" height="23" viewBox="0 0 28 20" fill="none" style={{ display: 'block', filter: 'drop-shadow(0 0 10px oklch(70% 0.24 145 / 0.8))' }}>
        <path d="M2 10L8 3L14 10L8 17L2 10Z" fill="oklch(75% 0.24 145 / 0.95)" />
        <path d="M9 10L15 3L21 10L15 17L9 10Z" fill="oklch(65% 0.2 210 / 0.8)" />
        <path d="M16 10L22 3L28 10L22 17L16 10Z" fill="oklch(60% 0.2 260 / 0.55)" />
      </svg>
    </span>
    <div>
      <div style={{
        fontSize: 18, fontWeight: 900, letterSpacing: '0.12em', lineHeight: 1,
        background: 'linear-gradient(90deg,oklch(78% 0.22 145) 0%,oklch(72% 0.2 185) 40%,oklch(65% 0.2 245) 70%,oklch(78% 0.22 145) 100%)',
        backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        backgroundClip: 'text', animation: 'sbGradShift 4s linear infinite',
      }}>KBOOS</div>
      <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 1 }}>Outreach OS</div>
      <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: 2 }}>by KOBIS Berhad</div>
    </div>
  </div>
);

const NAV = [
  { section:'OVERVIEW', items:[
    { id:'dashboard', icon:'⬡', label:'Command Center' },
  ]},
  { section:'BUSINESSES', items:[
    { id:'businesses', icon:'◈', label:'All Businesses', badgeColor:'green' },
    { id:'replies', icon:'✦', label:'Reply Inbox', badgeColor:'red' },
  ]},
  { section:'CAMPAIGNS', items:[
    { id:'campaign-dashboard', icon:'▦', label:'Campaign Dashboard' },
    { id:'campaigns', icon:'◉', label:'Campaigns', badgeColor:'blue' },
    { id:'lead-intelligence', icon:'◈', label:'Lead Intelligence', badgeColor:'green' },
    { id:'ai-campaign-studio', icon:'✦', label:'AI Campaign Studio' },
    { id:'new-campaign', icon:'＋', label:'New Campaign' },
  ]},
  { section:'ANALYTICS', items:[
    { id:'campaign-analytics', icon:'↗', label:'Campaign Analytics' },
    { id:'revenue-analytics', icon:'◎', label:'Revenue Analytics' },
    { id:'channel-analytics', icon:'▦', label:'Channel Analytics' },
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

  const totalLeads = useAppStore(s => s.leads?.length || 0);

  function getBadge(id) {
    if (id === 'businesses') return totalBusinesses || null;
    if (id === 'replies') return unreadReplies || null;
    if (id === 'approval') return pendingApprovals || null;
    if (id === 'campaigns') return totalCampaigns || null;
    if (id === 'lead-intelligence') return totalLeads || null;
    return null;
  }

  return (
    <div className={`sidebar${sidebarOpen ? ' mobile-open' : ''}`}>
      <style>{SIDEBAR_STYLE}</style>
      <div className="sidebar-logo">
        <KboosLogo />
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
                  <span style={{flex:1,textTransform:'uppercase',fontSize:10,letterSpacing:'0.07em',fontWeight:600}}>{item.label}</span>
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
