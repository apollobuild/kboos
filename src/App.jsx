import { useEffect, useState, Component, useCallback } from 'react';

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'var(--bg)',flexDirection:'column',gap:12}}>
        <div style={{fontSize:14,color:'var(--red)',fontWeight:600}}>Something went wrong</div>
        <div style={{fontSize:12,color:'var(--muted)',maxWidth:400,textAlign:'center'}}>{this.state.error.message}</div>
        <button className="btn btn-ghost btn-sm" onClick={() => this.setState({ error: null })}>Try Again</button>
      </div>
    );
    return this.props.children;
  }
}
import { useAppStore } from './store/useAppStore.js';
import { Login } from './pages/Login.jsx';
import { useShallow } from 'zustand/react/shallow';
import { useWalletStore } from './store/useWalletStore.js';
import { Sidebar } from './components/layout/Sidebar.jsx';
import { TweaksPanel } from './components/tweaks/TweaksPanel.jsx';
import { Toast } from './components/ui/Toast.jsx';
import { GlobalSearch } from './components/ui/GlobalSearch.jsx';

import { Dashboard } from './pages/Dashboard.jsx';
import { Businesses } from './pages/Businesses.jsx';
import { AddBusiness } from './pages/AddBusiness.jsx';
import { NewCampaign } from './pages/NewCampaign.jsx';
import { AllCampaigns } from './pages/AllCampaigns.jsx';
import { LeadManager } from './pages/LeadManager.jsx';
import { ReplyInbox } from './pages/ReplyInbox.jsx';
import { Approvals } from './pages/Approvals.jsx';
import { Reporting } from './pages/Reporting.jsx';
import { PromptStudio } from './pages/PromptStudio.jsx';
import { Settings } from './pages/Settings.jsx';
import { ClientPortal } from './pages/ClientPortal.jsx';
import { LiveDemo } from './pages/LiveDemo.jsx';
import { Onboard } from './pages/Onboard.jsx';
import { SelfServeDemo } from './pages/SelfServeDemo.jsx';
import { CampaignPipeline } from './pages/CampaignPipeline.jsx';
import { CampaignDashboard } from './pages/CampaignDashboard.jsx';
import { LeadIntelligence } from './pages/LeadIntelligence.jsx';
import { AiStudio } from './pages/AiStudio.jsx';
import { AiCampaignStudio } from './pages/AiCampaignStudio.jsx';
import { Revenue } from './pages/Revenue.jsx';
import { CampaignAnalytics } from './pages/CampaignAnalytics.jsx';
import { ChannelAnalytics } from './pages/ChannelAnalytics.jsx';
import { BusinessDetail } from './pages/BusinessDetail.jsx';
import { UnifiedInbox } from './pages/UnifiedInbox.jsx';
import { Meetings } from './pages/Meetings.jsx';
import { EmailInbox } from './pages/EmailInbox.jsx';
import { WhatsAppInbox } from './pages/WhatsAppInbox.jsx';
import { VoiceOutcomes } from './pages/VoiceOutcomes.jsx';

const PAGE_MAP = {
  dashboard: Dashboard,
  businesses: Businesses,
  'add-business': AddBusiness,
  'new-campaign': NewCampaign,
  campaigns: AllCampaigns,
  'campaign-dashboard': CampaignDashboard,
  'lead-intelligence': LeadIntelligence,
  leads: LeadIntelligence,
  'ai-studio': AiStudio,
  'ai-campaign-studio': AiCampaignStudio,
  revenue: Revenue,
  'revenue-analytics': Revenue,
  'campaign-analytics': CampaignAnalytics,
  reporting: CampaignAnalytics,
  'channel-analytics': ChannelAnalytics,
  inbox: ReplyInbox,
  replies: ReplyInbox,
  approvals: Approvals,
  approval: Approvals,
  'prompt-studio': PromptStudio,
  'live-demo': LiveDemo,
  settings: Settings,
  portal: ClientPortal,
  'client-portal': ClientPortal,
  pipeline: CampaignPipeline,
  'business-detail': BusinessDetail,
  'unified-inbox': UnifiedInbox,
  meetings: Meetings,
  'email-inbox': EmailInbox,
  'whatsapp-inbox': WhatsAppInbox,
  'voice-outcomes': VoiceOutcomes,
};

const MAX_RETRIES = 3;

export default function App() {
  if (window.location.pathname.startsWith('/Onboarding/')) {
    return <Onboard />;
  }
  if (window.location.pathname === '/try' || window.location.pathname === '/demo') {
    return <SelfServeDemo />;
  }

  const { page, pageParams, init, sidebarOpen, toggleSidebar, closeSidebar } = useAppStore(useShallow(s => ({
    page: s.page, pageParams: s.pageParams, init: s.init,
    sidebarOpen: s.sidebarOpen, toggleSidebar: s.toggleSidebar, closeSidebar: s.closeSidebar,
  })));

  const initWallet = useWalletStore(s => s.init);

  const [searchOpen, setSearchOpen] = useState(false);

  const handleGlobalKey = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setSearchOpen(v => !v);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKey);
    return () => document.removeEventListener('keydown', handleGlobalKey);
  }, [handleGlobalKey]);

  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('kboos_user');
    try { return stored ? JSON.parse(stored) : null; } catch { return null; }
  });
  const token = localStorage.getItem('kboos_token');
  const [loading, setLoading] = useState(!!(user && token));
  const [retryCount, setRetryCount] = useState(0);

  async function loadWithRetry(attempt = 0) {
    try {
      await Promise.all([init(), initWallet()]);
      setLoading(false);
    } catch {
      if (attempt < MAX_RETRIES - 1) {
        setRetryCount(attempt + 1);
        setTimeout(() => loadWithRetry(attempt + 1), 1500 * (attempt + 1));
      } else {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (user && token) {
      loadWithRetry(0);
    }
  }, []);

  const inviteToken = new URLSearchParams(window.location.search).get('invite');
  if (!user || !token || inviteToken) {
    return <Login onLogin={(u) => {
      setUser(u);
      if (u.role === 'client') { setLoading(false); return; }
      setLoading(true);
      setRetryCount(0);
      loadWithRetry(0);
    }} />;
  }

  // Client role — full-screen portal, no sidebar
  if (user.role === 'client') {
    return (
      <ErrorBoundary>
        <div style={{minHeight:'100vh',background:'var(--bg)',overflowY:'auto'}}>
          <ClientPortal />
        </div>
        <Toast />
      </ErrorBoundary>
    );
  }

  if (loading) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'var(--page)',flexDirection:'column',gap:16}}>
        <svg width="36" height="26" viewBox="0 0 28 20" fill="none" style={{opacity:0.8}}>
          <path d="M2 10L8 3L14 10L8 17L2 10Z" fill="oklch(65% 0.2 145 / 0.9)" />
          <path d="M9 10L15 3L21 10L15 17L9 10Z" fill="oklch(62% 0.19 245 / 0.7)" />
          <path d="M16 10L22 3L28 10L22 17L16 10Z" fill="oklch(62% 0.19 245 / 0.5)" />
        </svg>
        <div style={{fontSize:12,color:'var(--muted)',fontFamily:'var(--font-mono)',letterSpacing:'0.08em'}}>
          {retryCount > 0 ? `Reconnecting... (${retryCount}/${MAX_RETRIES - 1})` : 'Loading...'}
        </div>
        {/* Skeleton shimmer cards */}
        <div style={{display:'flex',gap:12,marginTop:8}}>
          {[80,110,90,100].map((w,i) => (
            <div key={i} className="shimmer" style={{width:w,height:56,borderRadius:8,opacity:0.35}}/>
          ))}
        </div>
      </div>
    );
  }

  const PageComponent = PAGE_MAP[page] || Dashboard;

  return (
    <ErrorBoundary>
      <div className="app-shell">
        {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar}/>}
        <button className="hamburger-btn" onClick={toggleSidebar} aria-label="Menu">☰</button>
        <Sidebar onSearch={() => setSearchOpen(true)} />
        <main className="main-content" onClick={() => sidebarOpen && closeSidebar()}>
          <ErrorBoundary key={page}>
            <PageComponent {...(pageParams || {})} />
          </ErrorBoundary>
        </main>
        <TweaksPanel />
        <Toast />
        <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </ErrorBoundary>
  );
}
