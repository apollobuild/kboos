import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (user && token) {
      init();
      initWallet();
    }
  }, []);

  const PageComponent = PAGE_MAP[page] || Dashboard;

  if (!user || !token) {
    return <Login onLogin={(u) => setUser(u)} />;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <PageComponent />
      </main>
      <TweaksPanel />
      <Toast />
    </div>
  );
}
