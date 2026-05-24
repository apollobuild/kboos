import { useAppStore } from '../../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { useWalletStore } from '../../store/useWalletStore.js';
import { CreditWalletWidget } from '../ui/CreditWalletWidget.jsx';
import { useRole } from '../../hooks/useRole.js';
import { LATEST_VERSION } from '../../data/changelog.js';

const SIDEBAR_STYLE = `
  @keyframes livePulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.6)} }
  @keyframes sbIconPulse { 0%,100%{opacity:0.85} 50%{opacity:1} }
  @keyframes sbGradShift { from{background-position:0% center} to{background-position:200% center} }
`;

const LogoMark = () => (
  <span style={{ display:'block', animation:'sbIconPulse 4s ease-in-out infinite', flexShrink:0 }}>
    <svg width="28" height="20" viewBox="0 0 28 20" fill="none" style={{ display:'block', filter:'drop-shadow(0 0 8px oklch(70% 0.24 145 / 0.8))' }}>
      <path d="M2 10L8 3L14 10L8 17L2 10Z" fill="oklch(75% 0.24 145 / 0.95)" />
      <path d="M9 10L15 3L21 10L15 17L9 10Z" fill="oklch(65% 0.2 210 / 0.8)" />
      <path d="M16 10L22 3L28 10L22 17L16 10Z" fill="oklch(60% 0.2 260 / 0.55)" />
    </svg>
  </span>
);

const NAV = [
  { section:'OVERVIEW', items:[
    { id:'dashboard', icon:'⬡', label:'Command Center' },
  ]},
  { section:'BUSINESSES', items:[
    { id:'businesses', icon:'◈', label:'All Businesses', badgeColor:'green' },
  ]},
  { section:'CAMPAIGNS', items:[
    { id:'campaign-dashboard', icon:'▦', label:'Campaign Dashboard' },
    { id:'campaigns', icon:'◉', label:'Campaigns', badgeColor:'blue' },
    { id:'lead-intelligence', icon:'◈', label:'Lead Intelligence', badgeColor:'green' },
    { id:'ai-campaign-studio', icon:'✦', label:'AI Campaign Studio' },
    { id:'new-campaign', icon:'＋', label:'New Campaign' },
  ]},
  { section:'COMMUNICATIONS', items:[
    { id:'unified-inbox', icon:'◎', label:'Unified Inbox', badgeColor:'red' },
    { id:'meetings', icon:'📅', label:'Meetings', badgeColor:'green' },
    { id:'email-inbox', icon:'✉', label:'Email Inbox' },
    { id:'whatsapp-inbox', icon:'💬', label:'WhatsApp Inbox' },
    { id:'wa-connect-inbox', icon:'📲', label:'WA Connect Inbox', badgeColor:'green' },
    { id:'voice-outcomes', icon:'📞', label:'Voice Outcomes' },
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
    { id:'changelog', icon:'✦', label:"What's New" },
  ]},
];

const SearchIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

export function Sidebar({ onSearch }) {
  const {
    page, setPage, businesses, campaigns, replies,
    sidebarOpen, closeSidebar,
    sidebarCollapsed, toggleSidebarCollapsed,
  } = useAppStore(useShallow(s => ({
    page: s.page, setPage: s.setPage,
    businesses: s.businesses, campaigns: s.campaigns, replies: s.replies,
    sidebarOpen: s.sidebarOpen, closeSidebar: s.closeSidebar,
    sidebarCollapsed: s.sidebarCollapsed, toggleSidebarCollapsed: s.toggleSidebarCollapsed,
  })));

  const { canAccess, role, user } = useRole();
  const hasUnreadChangelog = localStorage.getItem('kboos_changelog_seen') !== LATEST_VERSION;
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : 'KO';

  function logout() {
    localStorage.removeItem('kboos_token');
    localStorage.removeItem('kboos_user');
    window.location.reload();
  }

  function navTo(id) {
    setPage(id);
    closeSidebar();
  }

  function handleCollapseToggle() {
    if (window.innerWidth <= 768) {
      closeSidebar();
    } else {
      toggleSidebarCollapsed();
    }
  }

  const unreadReplies = replies.filter(r => r.status === 'unread').length;
  const pendingApprovals = campaigns.filter(c => c.status === 'awaiting_approval').length;
  const totalCampaigns = campaigns.length;
  const totalBusinesses = businesses.length;
  const totalLeads = useAppStore(s => s.leads?.length || 0);
  const upcomingMeetings = useAppStore(s =>
    (s.meetings || []).filter(m => m.meetingDate && new Date(m.meetingDate) >= new Date() && m.outcome === 'booked').length
  );

  function getBadge(id) {
    if (id === 'businesses') return totalBusinesses || null;
    if (id === 'unified-inbox') return unreadReplies || null;
    if (id === 'wa-connect-inbox') return unreadReplies || null;
    if (id === 'replies') return unreadReplies || null;
    if (id === 'approval') return pendingApprovals || null;
    if (id === 'campaigns') return totalCampaigns || null;
    if (id === 'lead-intelligence') return totalLeads || null;
    if (id === 'meetings') return upcomingMeetings || null;
    if (id === 'changelog') return hasUnreadChangelog ? '•' : null;
    return null;
  }

  const c = sidebarCollapsed;

  return (
    <div className={`sidebar${sidebarOpen ? ' mobile-open' : ''}${c ? ' collapsed' : ''}`}>
      <style>{SIDEBAR_STYLE}</style>

      {/* Logo */}
      <div className="sidebar-logo" style={{ display:'flex', alignItems:'center', justifyContent: c ? 'center' : 'flex-start', gap: c ? 0 : 10, padding: c ? '16px 0' : '20px 16px 16px' }}>
        <LogoMark />
        {!c && (
          <div>
            <div style={{
              fontSize:18, fontWeight:900, letterSpacing:'0.12em', lineHeight:1,
              background:'linear-gradient(90deg,oklch(78% 0.22 145) 0%,oklch(72% 0.2 185) 40%,oklch(65% 0.2 245) 70%,oklch(78% 0.22 145) 100%)',
              backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              backgroundClip:'text', animation:'sbGradShift 4s linear infinite',
            }}>KBOOS</div>
            <div style={{ fontSize:7, color:'rgba(255,255,255,0.35)', letterSpacing:'0.2em', textTransform:'uppercase', marginTop:1 }}>Outreach OS</div>
            <div style={{ fontSize:7, color:'rgba(255,255,255,0.25)', letterSpacing:'0.15em', textTransform:'uppercase', marginTop:2 }}>by KOBIS Berhad</div>
          </div>
        )}
      </div>

      {/* Scrollable nav */}
      <div className="nav-scroll">

        {/* Search button */}
        {c ? (
          <button onClick={onSearch} title="Search (⌘K)"
            style={{ display:'flex', alignItems:'center', justifyContent:'center', width:'calc(100% - 16px)', margin:'0 8px 8px', padding:'8px', borderRadius:7, background:'var(--s2)', border:'1px solid var(--border)', color:'var(--muted)', cursor:'pointer' }}>
            <SearchIcon />
          </button>
        ) : (
          <button onClick={onSearch}
            style={{ display:'flex', alignItems:'center', gap:8, width:'calc(100% - 16px)', margin:'0 8px 8px', padding:'7px 10px', borderRadius:7, background:'var(--s2)', border:'1px solid var(--border)', color:'var(--muted)', cursor:'pointer', textAlign:'left', fontSize:11 }}>
            <SearchIcon />
            <span style={{ flex:1 }}>Search...</span>
            <kbd style={{ fontSize:9, background:'var(--s1)', border:'1px solid var(--border)', borderRadius:3, padding:'1px 5px', color:'var(--muted)' }}>⌘K</kbd>
          </button>
        )}

        {/* Nav sections */}
        {NAV.map(section => (
          <div key={section.section} className="nav-section">
            {!c && <div className="nav-label">{section.section}</div>}
            {section.items.filter(item => canAccess(item.id)).map(item => {
              const badge = getBadge(item.id);
              const pulse = (item.id === 'replies' || item.id === 'unified-inbox') && unreadReplies > 0;
              return (
                <div
                  key={item.id}
                  className={`nav-item${page === item.id ? ' active' : ''}`}
                  onClick={() => navTo(item.id)}
                  data-label={item.label}
                  title={c ? item.label : undefined}
                >
                  <span className="nav-icon" style={item.id === 'live-demo' ? { color:'var(--green)', fontSize:8, animation:'livePulse 2s ease-in-out infinite' } : {}}>{item.icon}</span>
                  {!c && <span style={{ flex:1, textTransform:'uppercase', fontSize:10, letterSpacing:'0.07em', fontWeight:600 }}>{item.label}</span>}
                  {!c && badge != null && (
                    <span className={`nav-badge ${item.badgeColor || ''}${pulse ? ' pulse' : ''}`}>
                      {pulse && <span className="pulse-dot" style={{ width:4, height:4, marginRight:2 }}/>}
                      {badge}
                    </span>
                  )}
                  {c && badge != null && (
                    <span style={{ position:'absolute', top:4, right:4, width:6, height:6, borderRadius:'50%', background: item.badgeColor === 'red' ? 'var(--red)' : item.badgeColor === 'green' ? 'var(--green)' : 'var(--blue)', flexShrink:0 }}/>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Wallet — only when expanded */}
      {role === 'admin' && !c && (
        <CreditWalletWidget onClick={() => { sessionStorage.setItem('settingsTab', 'wallet'); setPage('settings'); }} />
      )}

      {/* Collapse toggle button */}
      <button
        onClick={handleCollapseToggle}
        title={c ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          display:'flex', alignItems:'center', justifyContent: c ? 'center' : 'flex-start',
          gap:8, padding: c ? '10px 0' : '10px 16px',
          background:'none', border:'none', borderTop:'1px solid rgba(80,120,255,0.08)',
          color:'var(--muted)', cursor:'pointer', width:'100%', fontSize:11,
          flexShrink:0, transition:'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
      >
        <span style={{ fontSize:10, lineHeight:1 }}>{c ? '▶' : '◀'}</span>
        {!c && <span style={{ textTransform:'uppercase', letterSpacing:'0.07em', fontWeight:600, fontSize:10 }}>Collapse</span>}
      </button>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="avatar" title={c ? (user?.name || 'User') : undefined}>{initials}</div>
        {!c && (
          <>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="footer-name truncate">{user?.name || 'User'}</div>
              <div className="footer-role" style={{ textTransform:'capitalize' }}>{user?.role || 'operator'}</div>
            </div>
            <button className="btn-ghost" style={{ padding:4, borderRadius:6, background:'none', fontSize:14, color:'var(--muted)', display:'flex', alignItems:'center', justifyContent:'center' }} title="Sign Out" onClick={logout}>
              <LogoutIcon />
            </button>
          </>
        )}
        {c && (
          <button className="btn-ghost" style={{ padding:4, borderRadius:6, background:'none', fontSize:14, color:'var(--muted)', display:'flex', alignItems:'center', justifyContent:'center', marginTop:6 }} title="Sign Out" onClick={logout}>
            <LogoutIcon />
          </button>
        )}
      </div>
    </div>
  );
}
