import { useAppStore } from '../../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { useWalletStore } from '../../store/useWalletStore.js';
import { CreditWalletWidget } from '../ui/CreditWalletWidget.jsx';

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
    { id:'businesses', icon:'◈', label:'All Businesses', badge:'6', badgeColor:'green' },
    { id:'replies', icon:'✦', label:'Reply Inbox', badge:'8', badgeColor:'red', pulse:true },
    { id:'approval', icon:'⏳', label:'Approvals', badge:'2', badgeColor:'amber' },
  ]},
  { section:'CAMPAIGNS', items:[
    { id:'campaigns', icon:'◉', label:'All Campaigns', badge:'8', badgeColor:'blue' },
    { id:'leads', icon:'👥', label:'Lead Manager' },
    { id:'new-campaign', icon:'＋', label:'New Campaign' },
  ]},
  { section:'ANALYTICS', items:[
    { id:'reporting', icon:'↗', label:'Reporting & ROI' },
    { id:'prompt-studio', icon:'⚡', label:'Prompt Studio' },
  ]},
  { section:'SYSTEM', items:[
    { id:'settings', icon:'◎', label:'Settings' },
    { id:'client-portal', icon:'🌐', label:'Client Portal' },
  ]},
];

export function Sidebar() {
  const { page, setPage, replies } = useAppStore(useShallow(s => ({ page:s.page, setPage:s.setPage, replies:s.replies })));

  const user = (() => { try { return JSON.parse(localStorage.getItem('kboos_user') || 'null'); } catch { return null; } })();
  const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : 'KO';

  function logout() {
    localStorage.removeItem('kboos_token');
    localStorage.removeItem('kboos_user');
    window.location.reload();
  }

  const unreadReplies = replies.filter(r => r.status === 'unread').length;

  return (
    <div className="sidebar">
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
            {section.items.map(item => {
              const badge = item.id === 'replies' ? (unreadReplies || item.badge) : item.badge;
              return (
                <div
                  key={item.id}
                  className={`nav-item${page === item.id ? ' active' : ''}`}
                  onClick={() => setPage(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span style={{flex:1}}>{item.label}</span>
                  {badge && (
                    <span className={`nav-badge ${item.badgeColor || ''}${item.pulse ? ' pulse' : ''}`}>
                      {item.pulse && <span className="pulse-dot" style={{width:4,height:4,marginRight:2}}/>}
                      {badge}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <CreditWalletWidget onClick={() => setPage('settings')} />
      <div className="sidebar-footer">
        <div className="avatar">{initials}</div>
        <div style={{flex:1, minWidth:0}}>
          <div className="footer-name truncate">{user?.name || 'User'}</div>
          <div className="footer-role" style={{textTransform:'capitalize'}}>{user?.role || 'operator'}</div>
        </div>
        <button className="btn-ghost" style={{padding:4,borderRadius:6,background:'none',fontSize:14,color:'var(--muted)'}} title="Sign Out" onClick={logout}>⏻</button>
      </div>
    </div>
  );
}
