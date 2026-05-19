import { useEffect, useState, Component } from 'react';

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

const PAGE_MAP = {
  dashboard: Dashboard,
  businesses: Businesses,
  'add-business': AddBusiness,
  'new-campaign': NewCampaign,
  campaigns: AllCampaigns,
  leads: LeadManager,
  inbox: ReplyInbox,
  replies: ReplyInbox,
  approvals: Approvals,
  approval: Approvals,
  reporting: Reporting,
  'prompt-studio': PromptStudio,
  settings: Settings,
  portal: ClientPortal,
  'client-portal': ClientPortal,
};

export default function App() {
  const { page, init } = useAppStore(useShallow(s => ({ page: s.page, init: s.init })));

  const initWallet = useWalletStore(s => s.init);

  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('kboos_user');
    try { return stored ? JSON.parse(stored) : null; } catch { return null; }
  });
  const token = localStorage.getItem('kboos_token');
  const [loading, setLoading] = useState(!!(user && token));

  useEffect(() => {
    if (user && token) {
      Promise.all([init(), initWallet()]).finally(() => setLoading(false));
    }
  }, []);

  const inviteToken = new URLSearchParams(window.location.search).get('invite');
  if (!user || !token || inviteToken) {
    return <Login onLogin={(u) => {
      setUser(u);
      if (u.role === 'client') { setLoading(false); return; }
      setLoading(true);
      Promise.all([init(), initWallet()]).finally(() => setLoading(false));
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
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'var(--bg)',flexDirection:'column',gap:16}}>
        <svg width="36" height="26" viewBox="0 0 28 20" fill="none" style={{opacity:0.8}}>
          <path d="M2 10L8 3L14 10L8 17L2 10Z" fill="oklch(65% 0.2 145 / 0.9)" />
          <path d="M9 10L15 3L21 10L15 17L9 10Z" fill="oklch(62% 0.19 245 / 0.7)" />
          <path d="M16 10L22 3L28 10L22 17L16 10Z" fill="oklch(62% 0.19 245 / 0.5)" />
        </svg>
        <div style={{fontSize:12,color:'var(--muted)',fontFamily:'var(--font-mono)',letterSpacing:'0.08em'}}>Loading...</div>
      </div>
    );
  }

  const PageComponent = PAGE_MAP[page] || Dashboard;

  return (
    <ErrorBoundary>
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <ErrorBoundary>
            <PageComponent />
          </ErrorBoundary>
        </main>
        <TweaksPanel />
        <Toast />
      </div>
    </ErrorBoundary>
  );
}
