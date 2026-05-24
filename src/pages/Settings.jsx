import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { useWalletStore } from '../store/useWalletStore.js';
import { useRole } from '../hooks/useRole.js';
import { settingsService } from '../services/settings.js';
import { TeamMemberSlideOver } from '../components/ui/TeamMemberSlideOver.jsx';
import { apiFetch } from '../services/api.js';
import { Select } from '../components/ui/Select.jsx';
import { useTenant } from '../hooks/useTenant.js';

function timeAgoShort(iso) {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

const APIS = ['claude','sendgrid','wati','apollo','outscraper','billplz_api_key','billplz_collection_id','billplz_x_signature_key','vapi','vapi_phone_number_id'];
const API_LABELS = {
  claude: 'Claude (Anthropic)',
  sendgrid: 'SendGrid',
  wati: 'WATI (WhatsApp)',
  apollo: 'Apollo.io',
  outscraper: 'Outscraper (Google Maps)',
  billplz_api_key: 'Billplz — API Key',
  billplz_collection_id: 'Billplz — Collection ID',
  billplz_x_signature_key: 'Billplz — X-Signature Key',
  vapi: 'Vapi (AI Voice)',
  vapi_phone_number_id: 'Vapi — Phone Number ID',
};

const SOURCE_BADGE = {
  exact:        { label:'Exact',        color:'#00d97e' },
  calculated:   { label:'Calculated',   color:'#0078ff' },
  live:         { label:'Live API',     color:'#00d97e' },
  subscription: { label:'Subscription', color:'#a855f7' },
  none:         { label:'No data',      color:'#666' },
};

const INTEGRATION_GROUPS = [
  {
    id: 'ai',
    label: 'AI Providers',
    providers: [
      { key: 'claude', label: 'Claude (Anthropic)', icon: '🤖', color: '#a855f7', desc: 'AI email writing, reply suggestions, brief generation' },
    ],
  },
  {
    id: 'leads',
    label: 'Lead Providers',
    providers: [
      { key: 'apollo',     label: 'Apollo.io',            icon: '🔭', color: '#7c3aed', desc: 'Lead enrichment — emails, titles, LinkedIn' },
      { key: 'outscraper', label: 'Outscraper',           icon: '📍', color: '#06b6d4', desc: 'Google Maps business scraping' },
    ],
  },
  {
    id: 'comms',
    label: 'Communication Providers',
    providers: [
      { key: 'sendgrid', label: 'SendGrid', icon: '📧', color: '#0078ff', desc: 'Email delivery',
        webhookPaths: [
          { path: '/webhooks/sendgrid',          label: 'Event Webhook URL (opens, bounces, unsubscribes)' },
          { path: '/webhooks/sendgrid-inbound',  label: 'Inbound Parse URL (email replies → inbox)' },
        ],
      },
      { key: 'wati', label: 'WATI (WhatsApp)', icon: '💬', color: '#00d97e', desc: 'WhatsApp Business messaging',
        webhookPath: '/webhooks/wati', webhookLabel: 'Inbound Webhook URL (paste into WATI → Webhooks)',
      },
      { key: 'vapi',                  label: 'Vapi (AI Voice)',        icon: '📞', color: '#f5a623', desc: 'AI voice calls', extraKey: 'vapi_phone_number_id' },
      { key: 'billplz_api_key',       label: 'Billplz (Payments)',     icon: '💳', color: '#0078ff', desc: 'FPX client billing', extraKeys: ['billplz_collection_id','billplz_x_signature_key'] },
    ],
  },
  {
    id: 'storage',
    label: 'Storage',
    providers: [
      { key: 'drive', label: 'Google Drive', icon: '📁', color: '#00d97e', desc: 'Auto lead sheet creation' },
    ],
  },
];

// Old tab name → new tab name (for sessionStorage redirects from other pages)
const TAB_ALIAS = {
  wallet: 'billing-usage', api: 'integrations-ai', team: 'workspace-team',
  drive: 'integrations-storage', notifications: 'workspace-notifications',
  branding: 'workspace-branding', clients: 'admin-users',
};

const NAV_SECTIONS = [
  {
    label: 'WORKSPACE',
    items: [
      { id: 'workspace-company',       label: 'Company Profile',  icon: '🏢' },
      { id: 'workspace-branding',      label: 'Branding',         icon: '🎨' },
      { id: 'workspace-team',          label: 'Team',             icon: '👥' },
      { id: 'workspace-notifications', label: 'Notifications',    icon: '🔔' },
    ],
  },
  {
    label: 'INTEGRATIONS',
    items: [
      { id: 'integrations-ai',      label: 'AI Providers',       icon: '🤖' },
      { id: 'integrations-leads',   label: 'Lead Providers',     icon: '🔭' },
      { id: 'integrations-comms',   label: 'Communications',     icon: '📡' },
      { id: 'integrations-storage', label: 'Storage',            icon: '📁' },
    ],
  },
  {
    label: 'BILLING',
    items: [
      { id: 'billing-usage',  label: 'Usage & Spend',   icon: '📊' },
      { id: 'billing-client', label: 'Client Billing',  icon: '💳' },
    ],
  },
  {
    label: 'ADMINISTRATION',
    adminOnly: true,
    items: [
      { id: 'admin-users',    label: 'Users',       icon: '👤' },
      { id: 'admin-audit',    label: 'Audit Logs',  icon: '📋' },
      { id: 'admin-security', label: 'Security',    icon: '🔐' },
    ],
  },
];

function Toggle({ on, onChange }) {
  return (
    <div onClick={() => onChange(!on)} style={{
      width:44, height:24, borderRadius:12, cursor:'pointer', flexShrink:0,
      background: on ? 'var(--green)' : 'var(--border)', position:'relative', transition:'background 0.2s',
    }}>
      <div style={{
        position:'absolute', top:3, left: on ? 22 : 3, width:18, height:18,
        borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-MY', { day:'numeric', month:'short', year:'numeric' });
}

export function Settings() {
  const { formatCurrency, currencySymbol } = useTenant();
  const { showToast, businesses, activity, setPage } = useAppStore(useShallow(s => ({
    showToast: s.showToast, businesses: s.businesses, activity: s.activity, setPage: s.setPage,
  })));
  const { isAdmin } = useRole();
  const { wallet, init: initWallet } = useWalletStore();

  const [tab,            setTab]           = useState('workspace-team');
  const [navCollapsed,   setNavCollapsed]  = useState(() => localStorage.getItem('kboos_settings_nav') === 'collapsed');
  const [apiKeys,        setApiKeys]       = useState({});
  const [showKey,        setShowKey]       = useState({});
  const [expandedApi,    setExpandedApi]   = useState({});
  const [driveConnected, setDriveConnected]= useState(false);
  const [driveJsonText,  setDriveJsonText] = useState('');
  const [driveUploading, setDriveUploading]= useState(false);
  const [newMember,      setNewMember]     = useState({ name:'', email:'', role:'Operator' });
  const [newClient,      setNewClient]     = useState({ name:'', email:'', bizId:'' });
  const [spend,          setSpend]         = useState({ total:0, budget:1000, breakdown:{}, usdRmRate:4.70, rateUpdatedAt:null });
  const [budget,         setBudget]        = useState(1000);
  const [budgetSaving,   setBudgetSaving]  = useState(false);
  const [fxRefreshing,   setFxRefreshing]  = useState(false);
  const [inviteLink,     setInviteLink]    = useState('');
  const [users,          setUsers]         = useState([]);
  const [openMember,     setOpenMember]    = useState(null);
  const [company,        setCompany]       = useState({ name:'KOBIS Outreach', website:'', industry:'', timezone:'Asia/Kuala_Lumpur', currency:'MYR' });
  const [companySaving,  setCompanySaving] = useState(false);

  const [notif, setNotif] = useState({ hotLead:true, budgetAlert:true, weeklyDigest:false, digestEmail:'' });
  const [notifSaving, setNotifSaving] = useState(false);

  const [branding, setBranding] = useState({ companyName:'KOBIS Outreach', logoUrl:'', accentColor:'#aa3bff' });
  const [brandingSaving, setBrandingSaving] = useState(false);

  const [vapiNumbers,   setVapiNumbers]   = useState([]);
  const [vapiNumLoading, setVapiNumLoading] = useState(false);

  async function fetchVapiNumbers() {
    setVapiNumLoading(true);
    try {
      const nums = await apiFetch('/voice/phone-numbers');
      setVapiNumbers(nums);
      if (nums.length === 0) showToast('No phone numbers found — create a free number in Vapi dashboard first', 'amber');
    } catch (e) { showToast(e.message || 'Failed to fetch Vapi numbers', 'red'); }
    finally { setVapiNumLoading(false); }
  }

  useEffect(() => {
    const pendingTab = sessionStorage.getItem('settingsTab');
    if (pendingTab) {
      setTab(TAB_ALIAS[pendingTab] || pendingTab);
      sessionStorage.removeItem('settingsTab');
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('topup') === 'done') {
      setTab('billing-client');
      showToast('Payment received — balance updated', 'green');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    initWallet();
    loadUsers();
    settingsService.get().then(s => {
      if (!s) return;
      if (s.apiKeys) {
        const keys = {};
        APIS.forEach(api => { keys[api] = s.apiKeys[api] || ''; });
        setApiKeys(keys);
      }
      if (s.notifications) setNotif(prev => ({ ...prev, ...s.notifications }));
      if (s.branding)      setBranding(prev => ({ ...prev, ...s.branding }));
    }).catch(() => {});
    apiFetch('/settings/drive-status').then(r => setDriveConnected(r.connected)).catch(() => {});
    apiFetch('/wallet/spend-summary').then(r => { setSpend(r); setBudget(r.budget); }).catch(() => {});
  }, []);

  async function saveApiKey(api) {
    const val = apiKeys[api] || '';
    if (!val || val.startsWith('••••')) { showToast('Clear the field and enter a new key to update', 'amber'); return; }
    try {
      await settingsService.saveApiKey(api, val);
      showToast(`${API_LABELS[api]} key saved`, 'green');
      setApiKeys(prev => ({ ...prev, [api]: '••••••••' + val.slice(-4) }));
      setExpandedApi(prev => ({ ...prev, [api]: false }));
    } catch { showToast('Failed to save key', 'red'); }
  }

  async function testConnection(api) {
    showToast(`Testing ${API_LABELS[api]}...`, 'blue');
    try {
      const result = await settingsService.testConnection(api);
      showToast(result.ok ? `${API_LABELS[api]} connected ✓` : `${API_LABELS[api]} failed: ${result.error}`, result.ok ? 'green' : 'red');
    } catch { showToast(`${API_LABELS[api]} connection failed`, 'red'); }
  }

  async function saveBudget() {
    setBudgetSaving(true);
    try {
      await apiFetch('/wallet/budget', { method:'PATCH', body:{ budget } });
      setSpend(p => ({ ...p, budget }));
      showToast('Budget saved', 'green');
    } catch { showToast('Failed to save budget', 'red'); }
    finally { setBudgetSaving(false); }
  }

  async function handleDriveSave() {
    let parsed;
    try { parsed = JSON.parse(driveJsonText); } catch { showToast('Invalid JSON — paste the full service account key file', 'red'); return; }
    if (!parsed.type || parsed.type !== 'service_account') { showToast('This does not look like a service account key', 'red'); return; }
    setDriveUploading(true);
    try {
      await apiFetch('/settings/drive-service-account', { method:'POST', body:{ serviceAccountKey: parsed } });
      setDriveConnected(true);
      setDriveJsonText('');
      showToast('Google Drive service account connected ✓', 'green');
    } catch (e) { showToast(e.message || 'Failed to save', 'red'); }
    finally { setDriveUploading(false); }
  }

  async function loadUsers() {
    try { setUsers(await apiFetch('/settings/users') || []); } catch {}
  }

  async function addClient() {
    if (!newClient.name || !newClient.email || !newClient.bizId) { showToast('Fill in name, email, and select a business', 'amber'); return; }
    try {
      const result = await settingsService.saveTeamMember({ ...newClient, role:'client' });
      setNewClient({ name:'', email:'', bizId:'' });
      await loadUsers();
      if (result.inviteLink) setInviteLink(result.inviteLink);
      else showToast(`${newClient.name} added as client`, 'green');
    } catch (e) { showToast(e.message || 'Failed to add client', 'red'); }
  }

  async function addTeamMember() {
    if (!newMember.name || !newMember.email) return;
    try {
      const result = await settingsService.saveTeamMember(newMember);
      setNewMember({ name:'', email:'', role:'Operator' });
      await loadUsers();
      if (result.inviteLink) setInviteLink(result.inviteLink);
      else showToast(`${newMember.name} added`, 'green');
    } catch (e) { showToast(e.message || 'Failed to add team member', 'red'); }
  }

  async function removeTeamMember(id) {
    try {
      await apiFetch(`/settings/users/${id}`, { method:'DELETE' });
      await loadUsers();
      showToast('Removed', 'amber');
    } catch { showToast('Failed to remove', 'red'); }
  }

  async function saveNotifications() {
    setNotifSaving(true);
    try {
      await apiFetch('/settings/preferences', { method:'PATCH', body:{ notifications: notif } });
      showToast('Notification preferences saved', 'green');
    } catch { showToast('Saved locally — backend update pending', 'amber'); }
    finally { setNotifSaving(false); }
  }

  async function saveBranding() {
    setBrandingSaving(true);
    try {
      await apiFetch('/settings/preferences', { method:'PATCH', body:{ branding } });
      showToast('Branding saved', 'green');
    } catch { showToast('Saved locally — backend update pending', 'amber'); }
    finally { setBrandingSaving(false); }
  }

  async function saveCompany() {
    setCompanySaving(true);
    try {
      await apiFetch('/settings/preferences', { method:'PATCH', body:{ company } });
      showToast('Company profile saved', 'green');
    } catch { showToast('Saved locally — backend update pending', 'amber'); }
    finally { setCompanySaving(false); }
  }

  const pct        = Math.min((spend.total / spend.budget) * 100, 100);
  const gaugeColor = pct > 80 ? 'var(--red)' : pct > 60 ? 'var(--amber)' : 'var(--green)';
  const remaining  = Math.max(0, spend.budget - spend.total);
  const monthLabel = new Date().toLocaleString('default', { month:'long', year:'numeric' });
  const rmRate     = spend.usdRmRate || 4.70;
  const cardYear   = new Date().getFullYear() + 1;
  const cardMM     = String(new Date().getMonth() + 1).padStart(2, '0');

  const API_ROWS = [
    { key:'wa',      label:'WhatsApp (Meta)',   icon:'💬', color:'#00d97e', rate:`$0.045/conv × ${currencySymbol}${rmRate}`, sub:`WATI ${currencySymbol}245/mo separate` },
    { key:'email',   label:'Email (SendGrid)',  icon:'📧', color:'#0078ff', rate:`$0.0004/email × ${currencySymbol}${rmRate}` },
    { key:'claude',  label:'Claude AI Writing', icon:'🤖', color:'#a855f7', rate:'Exact token cost (Sonnet 4.6)' },
    { key:'call',    label:'AI Voice (Vapi)',   icon:'📞', color:'#f5a623', rate:'Exact cost from Vapi API per call' },
    { key:'enrich',  label:'Apollo Enrichment', icon:'🔭', color:'#7c3aed', rate:'Flat subscription', sub:`Apollo Professional ${currencySymbol}465/mo` },
    { key:'scraper', label:'Outscraper (Maps)', icon:'📍', color:'#06b6d4', rate:`$0.001/record × ${currencySymbol}${rmRate}` },
  ];

  function isConnected(key) {
    const val = apiKeys[key] || '';
    return val.startsWith('••••') || (val.length > 8 && !val.startsWith('Enter'));
  }

  function ApiKeyInput({ apiKey }) {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {apiKey === 'vapi_phone_number_id' ? (
          <>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'10px 14px', background:'var(--amber-dim)', border:'1px solid oklch(72% 0.18 65 / 0.35)', borderRadius:8 }}>
              <div style={{ fontSize:12, color:'var(--text)', lineHeight:1.6 }}>No Vapi number yet? Create a <strong>free</strong> one directly in Vapi — takes 10 seconds.</div>
              <a href="https://dashboard.vapi.ai/phone-numbers" target="_blank" rel="noreferrer"
                style={{ flexShrink:0, display:'inline-flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:6, background:'var(--amber)', color:'#000', fontSize:12, fontWeight:700, textDecoration:'none', whiteSpace:'nowrap' }}>
                📞 Create Free Number ↗
              </a>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <div style={{ position:'relative', flex:1 }}>
                <input type={showKey[apiKey] ? 'text' : 'password'} value={apiKeys[apiKey] || ''}
                  onChange={e => setApiKeys(prev => ({ ...prev, [apiKey]: e.target.value }))}
                  placeholder="e.g. ph_xxxxxxxxxxxxxxxxxxxxxxxx" className="input"
                  style={{ fontFamily: showKey[apiKey] ? 'var(--font-mono)' : 'inherit', paddingRight:36 }} />
                <button style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:14 }}
                  onClick={() => setShowKey(prev => ({ ...prev, [apiKey]: !prev[apiKey] }))}>
                  {showKey[apiKey] ? '🙈' : '👁'}
                </button>
              </div>
              <button className="btn btn-ghost" style={{ flexShrink:0, whiteSpace:'nowrap' }} disabled={vapiNumLoading} onClick={fetchVapiNumbers}>
                {vapiNumLoading ? '◌' : '📱 Fetch Numbers'}
              </button>
              <button className="btn btn-green" style={{ flexShrink:0 }} onClick={() => saveApiKey(apiKey)}>Save</button>
            </div>
            {vapiNumbers.length > 0 && (
              <div style={{ background:'var(--s1)', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
                <div style={{ fontSize:11, color:'var(--muted)', padding:'8px 12px', borderBottom:'1px solid var(--border)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600 }}>Your Vapi Numbers — click to select</div>
                {vapiNumbers.map(n => (
                  <div key={n.id} onClick={() => setApiKeys(prev => ({ ...prev, vapi_phone_number_id: n.id }))}
                    style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', cursor:'pointer', borderBottom:'1px solid var(--border)', background: apiKeys.vapi_phone_number_id === n.id ? 'var(--green-dim)' : 'transparent', transition:'background 0.15s' }}>
                    <span style={{ fontSize:16 }}>📞</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:500, fontSize:13 }}>{n.number}</div>
                      {n.name && <div style={{ fontSize:11, color:'var(--muted)' }}>{n.name}</div>}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:10, background:'var(--blue-dim)', color:'var(--blue)', borderRadius:4, padding:'2px 6px', fontWeight:600, textTransform:'uppercase' }}>{n.provider}</span>
                      {apiKeys.vapi_phone_number_id === n.id && <span style={{ color:'var(--green)', fontSize:13 }}>✓</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ position:'relative', flex:1 }}>
              <input type={showKey[apiKey] ? 'text' : 'password'} value={apiKeys[apiKey] || ''}
                onChange={e => setApiKeys(prev => ({ ...prev, [apiKey]: e.target.value }))}
                placeholder={`Enter ${API_LABELS[apiKey]} API key`} className="input"
                style={{ fontFamily: showKey[apiKey] ? 'var(--font-mono)' : 'inherit', paddingRight:36 }} />
              <button style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:14 }}
                onClick={() => setShowKey(prev => ({ ...prev, [apiKey]: !prev[apiKey] }))}>
                {showKey[apiKey] ? '🙈' : '👁'}
              </button>
            </div>
            <button className="btn btn-green" style={{ flexShrink:0 }} onClick={() => saveApiKey(apiKey)}>Save</button>
          </div>
        )}
      </div>
    );
  }

  function IntegrationProviderCard({ provider }) {
    const connected = provider.key === 'drive' ? driveConnected : isConnected(provider.key);
    const expanded  = expandedApi[provider.key];
    return (
      <div className="card" style={{ border: connected ? '1px solid oklch(65% 0.2 145 / 0.35)' : '1px solid var(--border)', transition:'border-color 0.2s' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:46, height:46, borderRadius:12, background:`${provider.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
            {provider.icon}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:600, fontSize:14 }}>{provider.label}</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>{provider.desc}</div>
            <div style={{ fontSize:11, marginTop:4, display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background: connected ? 'var(--green)' : 'var(--border)', display:'inline-block', flexShrink:0 }} />
              <span style={{ color: connected ? 'var(--green)' : 'var(--muted)', fontWeight:500 }}>{connected ? 'Connected' : 'Not connected'}</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            {provider.key !== 'drive' && (
              <button className="btn btn-ghost btn-sm" onClick={() => testConnection(provider.key)}>Test</button>
            )}
            <button className="btn btn-sm" onClick={() => setExpandedApi(prev => ({ ...prev, [provider.key]: !prev[provider.key] }))}>
              {expanded ? 'Close ✕' : 'Manage →'}
            </button>
          </div>
        </div>

        {expanded && (
          <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--border)' }}>
            {provider.key === 'drive' ? (
              driveConnected ? (
                <div style={{ display:'flex', alignItems:'center', gap:10, color:'var(--green)', fontSize:13 }}>
                  ✓ Google Drive service account connected — lead sheets will be created automatically
                </div>
              ) : (
                <>
                  <div style={{ fontSize:12, color:'var(--muted)', marginBottom:10, lineHeight:1.6 }}>
                    1. Go to <strong>console.cloud.google.com</strong> → IAM & Admin → Service Accounts<br/>
                    2. Create a service account, enable Drive API + Sheets API, create a JSON key<br/>
                    3. Paste the entire JSON key file contents below
                  </div>
                  <textarea value={driveJsonText} onChange={e => setDriveJsonText(e.target.value)}
                    placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  ...\n}'} rows={7}
                    style={{ width:'100%', background:'var(--s2)', border:'1px solid var(--border)', color:'var(--text)', borderRadius:6, padding:'10px 12px', fontSize:12, fontFamily:'var(--font-mono)', resize:'vertical', boxSizing:'border-box' }} />
                  <div style={{ display:'flex', justifyContent:'flex-end', marginTop:10 }}>
                    <button className="btn btn-green" onClick={handleDriveSave} disabled={driveUploading || !driveJsonText.trim()}>
                      {driveUploading ? 'Saving…' : 'Save & Connect'}
                    </button>
                  </div>
                </>
              )
            ) : (
              <>
                <div style={{ marginBottom: provider.extraKeys?.length ? 12 : 0 }}>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6, fontWeight:600 }}>{API_LABELS[provider.key]}</div>
                  <ApiKeyInput apiKey={provider.key} />
                </div>
                {provider.extraKey && (
                  <div style={{ marginTop:12 }}>
                    <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6, fontWeight:600 }}>{API_LABELS[provider.extraKey]}</div>
                    <ApiKeyInput apiKey={provider.extraKey} />
                  </div>
                )}
                {provider.extraKeys?.map(ek => (
                  <div key={ek} style={{ marginTop:12 }}>
                    <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6, fontWeight:600 }}>{API_LABELS[ek]}</div>
                    <ApiKeyInput apiKey={ek} />
                  </div>
                ))}
                {provider.webhookPath && (
                  <WebhookUrlCard path={provider.webhookPath} label={provider.webhookLabel} />
                )}
                {provider.webhookPaths?.map(wp => (
                  <WebhookUrlCard key={wp.path} path={wp.path} label={wp.label} />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  function WebhookUrlCard({ path, label }) {
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');
    const url = `${base}${path}`;
    const [copied, setCopied] = useState(false);
    function copy() {
      navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    }
    return (
      <div style={{ marginTop:14, padding:'10px 12px', background:'var(--s2)', borderRadius:6, border:'1px solid var(--border)' }}>
        <div style={{ fontSize:10, color:'var(--muted)', marginBottom:4, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <code style={{ flex:1, fontSize:10, color:'var(--text)', fontFamily:'var(--font-mono)', wordBreak:'break-all', background:'var(--bg)', padding:'4px 8px', borderRadius:4, border:'1px solid var(--border)' }}>{url}</code>
          <button className="btn btn-ghost btn-sm" style={{ flexShrink:0, fontSize:10 }} onClick={copy}>{copied ? '✓ Copied' : 'Copy'}</button>
        </div>
        <div style={{ fontSize:10, color:'var(--muted)', marginTop:6 }}>Append <code style={{ color:'var(--amber)' }}>?secret=YOUR_WEBHOOK_SECRET</code> from Railway env vars</div>
      </div>
    );
  }

  function AutoReplyConfigPanel() {
    const [cfg, setCfg]     = useState({ enabled: false, mode: 'autopilot', maxReplies: 5 });
    const [loaded, setLoaded] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      apiFetch('/settings/auto-reply').then(d => { setCfg(d); setLoaded(true); }).catch(() => setLoaded(true));
    }, []);

    async function save() {
      setSaving(true);
      try {
        const saved = await apiFetch('/settings/auto-reply', { method: 'POST', body: cfg });
        setCfg(saved);
        showToast('Auto-reply settings saved', 'green');
      } catch { showToast('Save failed', 'red'); }
      finally { setSaving(false); }
    }

    if (!loaded) return null;

    return (
      <div className="card" style={{ border: cfg.enabled ? '1px solid oklch(65% 0.2 145 / 0.35)' : '1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:46, height:46, borderRadius:12, background:'oklch(62% 0.19 245 / 0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>🤖</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600, fontSize:14 }}>AI Auto-Reply Engine</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>Claude Haiku handles replies autonomously, escalates HOT leads to humans</div>
            <div style={{ fontSize:11, marginTop:4, display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background: cfg.enabled ? 'var(--green)' : 'var(--border)', display:'inline-block' }} />
              <span style={{ color: cfg.enabled ? 'var(--green)' : 'var(--muted)', fontWeight:500 }}>{cfg.enabled ? 'Active' : 'Disabled'}</span>
            </div>
          </div>
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', flexShrink:0 }}>
            <span style={{ fontSize:12, color:'var(--muted)' }}>{cfg.enabled ? 'On' : 'Off'}</span>
            <div
              onClick={() => setCfg(s => ({ ...s, enabled: !s.enabled }))}
              style={{
                width:40, height:22, borderRadius:11, cursor:'pointer', transition:'all 0.2s',
                background: cfg.enabled ? 'var(--green)' : 'var(--s2)',
                border: `1px solid ${cfg.enabled ? 'var(--green)' : 'var(--border)'}`,
                position:'relative', flexShrink:0,
              }}
            >
              <div style={{
                position:'absolute', top:2, left: cfg.enabled ? 20 : 2,
                width:16, height:16, borderRadius:'50%', background:'#fff',
                transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)',
              }}/>
            </div>
          </label>
        </div>

        {cfg.enabled && (
          <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8, fontWeight:600 }}>MODE</div>
                {[
                  { val:'autopilot', label:'🚀 Autopilot', desc:'AI sends automatically' },
                  { val:'assist',    label:'✍ Assist',     desc:'AI drafts, human approves' },
                ].map(m => (
                  <div key={m.val} onClick={() => setCfg(s => ({ ...s, mode: m.val }))}
                    style={{ padding:'10px 12px', borderRadius:8, cursor:'pointer', marginBottom:6,
                      border:`1px solid ${cfg.mode === m.val ? 'var(--blue)' : 'var(--border)'}`,
                      background: cfg.mode === m.val ? 'var(--blue-dim)' : 'var(--s2)',
                    }}>
                    <div style={{ fontSize:12, fontWeight:600, color: cfg.mode === m.val ? 'var(--blue)' : 'var(--text)' }}>{m.label}</div>
                    <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>{m.desc}</div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8, fontWeight:600 }}>MAX AI REPLIES PER THREAD</div>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8, lineHeight:1.5 }}>
                  After this many AI replies, automatically escalate to human. Prevents infinite loops.
                </div>
                <input type="number" className="input" min={1} max={10} value={cfg.maxReplies}
                  onChange={e => setCfg(s => ({ ...s, maxReplies: parseInt(e.target.value) || 5 }))}
                  style={{ width:80, fontSize:13 }} />
                <div style={{ fontSize:10, color:'var(--muted)', marginTop:4 }}>Recommended: 3–5</div>
              </div>
            </div>
            <div style={{ fontSize:11, color:'var(--muted)', padding:'10px 12px', background:'var(--s2)', borderRadius:6, lineHeight:1.6 }}>
              ✓ Respects 9am–6pm KL send window &nbsp;·&nbsp; ✓ Auto-detects HOT leads &amp; escalates &nbsp;·&nbsp; ✓ Stops on unsubscribe
            </div>
            <button className="btn btn-green btn-sm" onClick={save} disabled={saving} style={{ alignSelf:'flex-start' }}>
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        )}
      </div>
    );
  }

  function WeeklyReportConfigPanel() {
    const [cfg, setCfg] = useState({ enabled: false, includeTeam: true });
    const [loaded, setLoaded] = useState(false);
    const [saving, setSaving] = useState(false);
    const [sending, setSending] = useState(false);
    const { businesses } = useAppStore(useShallow(s => ({ businesses: s.businesses })));

    useEffect(() => {
      apiFetch('/settings/report-config').then(d => { setCfg(d); setLoaded(true); }).catch(() => setLoaded(true));
    }, []);

    async function save() {
      setSaving(true);
      try {
        const saved = await apiFetch('/settings/report-config', { method: 'POST', body: cfg });
        setCfg(saved);
        showToast('Report settings saved', 'green');
      } catch { showToast('Save failed', 'red'); }
      finally { setSaving(false); }
    }

    async function sendPreview() {
      if (!businesses.length) return showToast('No businesses to report on', 'amber');
      setSending(true);
      try {
        const { queued } = await apiFetch('/reports/send-all', { method: 'POST' });
        showToast(`Preview sent for ${queued} business${queued !== 1 ? 'es' : ''}`, 'green');
      } catch { showToast('Send failed', 'red'); }
      finally { setSending(false); }
    }

    if (!loaded) return null;

    return (
      <div className="card" style={{ border: cfg.enabled ? '1px solid oklch(65% 0.2 145 / 0.35)' : '1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:46, height:46, borderRadius:12, background:'oklch(72% 0.18 65 / 0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>📊</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:600, fontSize:14 }}>Weekly Client Reports</div>
            <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>Branded weekly summary auto-sent to each client every Monday at 8am</div>
            <div style={{ fontSize:11, marginTop:4, display:'flex', alignItems:'center', gap:5 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background: cfg.enabled ? 'var(--green)' : 'var(--border)', display:'inline-block' }} />
              <span style={{ color: cfg.enabled ? 'var(--green)' : 'var(--muted)', fontWeight:500 }}>{cfg.enabled ? 'Active — sends every Monday 8am KL' : 'Disabled'}</span>
            </div>
          </div>
          <div
            onClick={() => setCfg(s => ({ ...s, enabled: !s.enabled }))}
            style={{ width:40, height:22, borderRadius:11, cursor:'pointer', transition:'all 0.2s', flexShrink:0,
              background: cfg.enabled ? 'var(--green)' : 'var(--s2)',
              border: `1px solid ${cfg.enabled ? 'var(--green)' : 'var(--border)'}`, position:'relative' }}
          >
            <div style={{ position:'absolute', top:2, left: cfg.enabled ? 20 : 2, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }}/>
          </div>
        </div>

        {cfg.enabled && (
          <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background:'var(--s2)', borderRadius:8 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:600 }}>CC KOBIS Team</div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Also send reports to team emails in Notifications settings</div>
              </div>
              <div onClick={() => setCfg(s => ({ ...s, includeTeam: !s.includeTeam }))}
                style={{ width:36, height:20, borderRadius:10, cursor:'pointer', transition:'all 0.2s', flexShrink:0,
                  background: cfg.includeTeam ? 'var(--blue)' : 'var(--s2)',
                  border:`1px solid ${cfg.includeTeam ? 'var(--blue)' : 'var(--border)'}`, position:'relative' }}>
                <div style={{ position:'absolute', top:2, left: cfg.includeTeam ? 18 : 2, width:14, height:14, borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }}/>
              </div>
            </div>
            <div style={{ fontSize:11, color:'var(--muted)', padding:'8px 12px', background:'var(--s2)', borderRadius:6, lineHeight:1.6 }}>
              ✓ Business-branded header &nbsp;·&nbsp; ✓ Sent stats + pipeline breakdown &nbsp;·&nbsp; ✓ Revenue summary
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-green btn-sm" onClick={save} disabled={saving} style={{ flex:1 }}>
                {saving ? 'Saving…' : 'Save Settings'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={sendPreview} disabled={sending} style={{ flex:1 }}>
                {sending ? 'Sending…' : '↗ Send Preview Now'}
              </button>
            </div>
          </div>
        )}
        {!cfg.enabled && (
          <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)', display:'flex', gap:10 }}>
            <button className="btn btn-green btn-sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
    <div className="page">
      <div className="fade-up mb-4">
        <div className="breadcrumb">System / <span>Settings</span></div>
        <h1 className="page-title" style={{ marginTop:4 }}>Settings</h1>
      </div>

      {/* 2-column layout: left nav + content */}
      <div className="card fade-up-1" style={{ display:'flex', padding:0, overflow:'hidden', minHeight:600 }}>

        {/* Left nav */}
        <div style={{
          width: navCollapsed ? 52 : 200, flexShrink:0,
          borderRight:'1px solid var(--border)', padding:'16px 0',
          background:'var(--s1)', display:'flex', flexDirection:'column',
          transition:'width 0.22s cubic-bezier(0.4,0,0.2,1)',
          overflow:'hidden',
        }}>
          <div style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
            {NAV_SECTIONS.map(section => {
              if (section.adminOnly && !isAdmin) return null;
              return (
                <div key={section.label} style={{ marginBottom: navCollapsed ? 8 : 20 }}>
                  {!navCollapsed && (
                    <div style={{ fontSize:9, color:'var(--muted)', letterSpacing:'0.12em', textTransform:'uppercase', padding:'0 16px', marginBottom:6, fontWeight:700 }}>
                      {section.label}
                    </div>
                  )}
                  {section.items.map(item => (
                    <div
                      key={item.id}
                      onClick={() => setTab(item.id)}
                      title={navCollapsed ? item.label : undefined}
                      style={{
                        padding: navCollapsed ? '10px 0' : '9px 16px',
                        cursor:'pointer', fontSize:13,
                        fontWeight: tab === item.id ? 700 : 500,
                        color: tab === item.id ? 'var(--text)' : 'var(--muted)',
                        background: tab === item.id ? 'var(--s2)' : 'transparent',
                        borderLeft: tab === item.id ? '2px solid var(--blue)' : '2px solid transparent',
                        display:'flex', alignItems:'center',
                        gap: navCollapsed ? 0 : 10,
                        justifyContent: navCollapsed ? 'center' : 'flex-start',
                        transition:'all 0.12s',
                        position:'relative',
                      }}
                    >
                      <span style={{ fontSize: navCollapsed ? 18 : 15, flexShrink:0 }}>{item.icon}</span>
                      {!navCollapsed && <span style={{ textTransform:'uppercase', letterSpacing:'0.07em', fontWeight: tab === item.id ? 700 : 500 }}>{item.label}</span>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => {
              const next = !navCollapsed;
              setNavCollapsed(next);
              localStorage.setItem('kboos_settings_nav', next ? 'collapsed' : 'expanded');
            }}
            style={{
              display:'flex', alignItems:'center', justifyContent: navCollapsed ? 'center' : 'flex-start',
              gap:8, padding: navCollapsed ? '10px 0' : '10px 16px',
              background:'none', border:'none', borderTop:'1px solid var(--border)',
              color:'var(--muted)', cursor:'pointer', width:'100%', fontSize:10,
              fontWeight:600, letterSpacing:'0.07em', textTransform:'uppercase',
              transition:'color 0.15s', flexShrink:0,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
            title={navCollapsed ? 'Expand menu' : 'Collapse menu'}
          >
            <span style={{ fontSize:10 }}>{navCollapsed ? '▶' : '◀'}</span>
            {!navCollapsed && 'Collapse'}
          </button>
        </div>

        {/* Content area */}
        <div style={{ flex:1, padding:'24px 28px', overflow:'auto' }}>

          {/* ── Company Profile ── */}
          {tab === 'workspace-company' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:600 }}>
              <div>
                <div className="card-title" style={{ marginBottom:4 }}>Company Profile</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>Basic information about your organisation</div>
              </div>
              {[
                { key:'name',     label:'Company Name',  type:'text',   placeholder:'KOBIS Outreach' },
                { key:'website',  label:'Website',       type:'url',    placeholder:'https://kobis.my' },
                { key:'industry', label:'Industry',      type:'text',   placeholder:'B2B Sales & Marketing' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:5, fontWeight:500 }}>{f.label}</label>
                  <input type={f.type} value={company[f.key] || ''} placeholder={f.placeholder}
                    onChange={e => setCompany(p => ({ ...p, [f.key]: e.target.value }))} className="input" />
                </div>
              ))}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:5, fontWeight:500 }}>Time Zone</label>
                  <Select value={company.timezone || 'Asia/Kuala_Lumpur'} onChange={v => setCompany(p => ({ ...p, timezone:v }))}
                    options={['Asia/Kuala_Lumpur','Asia/Singapore','Asia/Bangkok','Asia/Jakarta','UTC']} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:5, fontWeight:500 }}>Currency</label>
                  <Select value={company.currency || 'MYR'} onChange={v => setCompany(p => ({ ...p, currency:v }))}
                    options={['MYR','USD','SGD','THB','IDR']} />
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button className="btn btn-primary" onClick={saveCompany} disabled={companySaving}>
                  {companySaving ? 'Saving…' : 'Save Profile'}
                </button>
              </div>
            </div>
          )}

          {/* ── Branding ── */}
          {tab === 'workspace-branding' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:600 }}>
              <div>
                <div className="card-title" style={{ marginBottom:4 }}>Client Portal Branding</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>Customise how your brand appears to clients when they log in</div>
              </div>
              <div>
                <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:6, fontWeight:500 }}>Company Display Name</label>
                <input type="text" placeholder="e.g. KOBIS Outreach" value={branding.companyName}
                  onChange={e => setBranding(p => ({ ...p, companyName: e.target.value }))} className="input" />
              </div>
              <div>
                <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:6, fontWeight:500 }}>Logo URL</label>
                <input type="url" placeholder="https://your-domain.com/logo.png" value={branding.logoUrl}
                  onChange={e => setBranding(p => ({ ...p, logoUrl: e.target.value }))} className="input" />
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>Leave blank to use the KBOOS logo</div>
              </div>
              <div>
                <label style={{ fontSize:12, color:'var(--muted)', display:'block', marginBottom:6, fontWeight:500 }}>Portal Accent Colour</label>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <input type="color" value={branding.accentColor} onChange={e => setBranding(p => ({ ...p, accentColor: e.target.value }))}
                    style={{ width:44, height:40, borderRadius:6, border:'1px solid var(--border)', cursor:'pointer', padding:2, background:'var(--s2)' }} />
                  <input type="text" value={branding.accentColor} onChange={e => setBranding(p => ({ ...p, accentColor: e.target.value }))}
                    style={{ width:120, background:'var(--s2)', border:'1px solid var(--border)', color:'var(--text)', padding:'8px 12px', borderRadius:6, fontSize:13, fontFamily:'var(--font-mono)' }} />
                  <span style={{ fontSize:12, color:'var(--muted)' }}>Used for buttons and highlights in client portal</span>
                </div>
              </div>
              {/* Preview */}
              <div style={{ border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', padding:'8px 14px', borderBottom:'1px solid var(--border)', fontWeight:600 }}>Portal Preview</div>
                <div style={{ padding:'14px 20px', background:'var(--s2)', display:'flex', alignItems:'center', gap:12, borderBottom:'1px solid var(--border)' }}>
                  {branding.logoUrl ? (
                    <img src={branding.logoUrl} alt="logo" style={{ height:28, borderRadius:4 }} onError={e => { e.target.style.display='none'; }} />
                  ) : (
                    <div style={{ width:28, height:28, borderRadius:6, background:branding.accentColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:'#fff', fontWeight:700 }}>K</div>
                  )}
                  <span style={{ fontWeight:600, fontSize:14 }}>{branding.companyName || 'KOBIS Outreach'}</span>
                  <span style={{ marginLeft:'auto', fontSize:11, color:'var(--muted)' }}>Client Portal</span>
                </div>
                <div style={{ padding:'16px 20px' }}>
                  <div style={{ height:8, background:'var(--border)', borderRadius:4, width:'60%', marginBottom:8 }}/>
                  <div style={{ height:8, background:'var(--border)', borderRadius:4, width:'40%', marginBottom:16, opacity:0.5 }}/>
                  <div style={{ display:'inline-block', padding:'8px 18px', borderRadius:8, background:branding.accentColor, color:'#fff', fontSize:12, fontWeight:600 }}>View Campaign →</div>
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                <button className="btn btn-ghost" onClick={() => setPage('client-portal')}>
                  🌐 Preview Client Portal
                </button>
                <button className="btn btn-primary" onClick={saveBranding} disabled={brandingSaving}>
                  {brandingSaving ? 'Saving…' : 'Save Branding'}
                </button>
              </div>
            </div>
          )}

          {/* ── Team ── */}
          {tab === 'workspace-team' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <div className="card-title" style={{ marginBottom:4 }}>Team Members</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>Invite colleagues to access KBOOS. They will receive a link to set their password.</div>
              </div>
              <div className="card" style={{ padding:'16px' }}>
                <div className="card-title" style={{ marginBottom:12 }}>Invite Team Member</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto auto', gap:8 }}>
                  <input placeholder="Full name" value={newMember.name} onChange={e => setNewMember(p => ({ ...p, name:e.target.value }))} className="input" />
                  <input placeholder="Email address" value={newMember.email} onChange={e => setNewMember(p => ({ ...p, email:e.target.value }))} className="input" />
                  <Select value={newMember.role} onChange={v => setNewMember(p => ({ ...p, role:v }))}
                    options={['Admin','Operator','Viewer']} />
                  <button className="btn btn-primary" onClick={addTeamMember}>Invite</button>
                </div>
              </div>
              <div className="card" style={{ padding:'16px' }}>
                <div className="card-title" style={{ marginBottom:12 }}>Current Team</div>
                {users.filter(u => u.role !== 'client').length === 0 ? (
                  <div style={{ color:'var(--muted)', fontSize:13 }}>No team members yet.</div>
                ) : (
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom:'1px solid var(--border)' }}>
                        {['Name','Email','Role','Status',''].map(h => (
                          <th key={h} style={{ textAlign:'left', padding:'6px 10px', fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.filter(u => u.role !== 'client').map(m => (
                        <tr key={m.id} style={{ borderBottom:'1px solid var(--border)', cursor:'pointer' }} onClick={() => setOpenMember(m)}>
                          <td style={{ padding:'10px', fontWeight:500, fontSize:13 }}>{m.name}</td>
                          <td style={{ padding:'10px', fontSize:12, color:'var(--muted)' }}>{m.email}</td>
                          <td style={{ padding:'10px' }}><span className="badge blue" style={{ textTransform:'capitalize' }}>{m.role}</span></td>
                          <td style={{ padding:'10px' }}><span className={`badge ${m.pending ? 'amber' : 'green'}`}>{m.pending ? 'Pending' : 'Active'}</span></td>
                          <td style={{ padding:'10px' }}>
                            <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setOpenMember(m); }}>View →</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ── Notifications ── */}
          {tab === 'workspace-notifications' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:600 }}>
              <div>
                <div className="card-title" style={{ marginBottom:4 }}>Notifications</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>Choose when KBOOS should alert you or your team</div>
              </div>
              <div className="card">
                {[
                  { key:'hotLead',      icon:'🔥', title:'Hot Lead Alert',  desc:'Get notified when a lead is marked as hot or books a meeting' },
                  { key:'budgetAlert',  icon:'💰', title:'Budget Alert',     desc:'Alert when API spend reaches 80% of your monthly budget' },
                  { key:'weeklyDigest', icon:'📊', title:'Weekly Digest',    desc:'Summary of outreach performance every Monday morning' },
                ].map((item, i) => (
                  <div key={item.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                      <div style={{ width:40, height:40, borderRadius:10, background:'var(--s2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{item.icon}</div>
                      <div>
                        <div style={{ fontWeight:500, fontSize:13 }}>{item.title}</div>
                        <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{item.desc}</div>
                      </div>
                    </div>
                    <Toggle on={notif[item.key]} onChange={val => setNotif(p => ({ ...p, [item.key]: val }))} />
                  </div>
                ))}
              </div>
              {notif.weeklyDigest && (
                <div className="card">
                  <div className="card-title" style={{ marginBottom:10 }}>Weekly Digest — Send To</div>
                  <input type="email" placeholder="Email address for digest reports" value={notif.digestEmail}
                    onChange={e => setNotif(p => ({ ...p, digestEmail: e.target.value }))} className="input" />
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button className="btn btn-primary" onClick={saveNotifications} disabled={notifSaving}>
                  {notifSaving ? 'Saving…' : 'Save Preferences'}
                </button>
              </div>
              <WeeklyReportConfigPanel />
            </div>
          )}

          {/* ── Integrations: AI / Lead / Comms / Storage ── */}
          {['integrations-ai','integrations-leads','integrations-comms','integrations-storage'].includes(tab) && (() => {
            const groupId = tab.replace('integrations-', '');
            const group   = INTEGRATION_GROUPS.find(g => g.id === groupId);
            if (!group) return null;
            return (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <div className="card-title" style={{ marginBottom:4 }}>{group.label}</div>
                  <div style={{ fontSize:12, color:'var(--muted)' }}>
                    {groupId === 'storage' ? 'Connect storage providers for automatic lead sheet creation' : `Configure your ${group.label.toLowerCase()} connections`}
                  </div>
                </div>
                {group.providers.map(p => <IntegrationProviderCard key={p.key} provider={p} />)}
                {groupId === 'ai' && <AutoReplyConfigPanel />}
              </div>
            );
          })()}

          {/* ── Billing: Usage & Spend ── */}
          {tab === 'billing-usage' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <div className="card-title" style={{ marginBottom:4 }}>Usage & Spend</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>API usage costs for {monthLabel}</div>
              </div>

              {/* Holographic spend card */}
              <div style={{
                position:'relative', borderRadius:22, padding:'28px 30px 24px',
                background:'linear-gradient(135deg, #08081f 0%, #0d1b3e 45%, #150a30 100%)',
                border:'1px solid rgba(255,255,255,0.07)', overflow:'hidden', minHeight:190,
              }}>
                <div style={{ position:'absolute', top:-60, right:-60, width:220, height:220, borderRadius:'50%', background:'radial-gradient(circle,rgba(100,80,255,0.18) 0%,transparent 70%)', pointerEvents:'none' }}/>
                <div style={{ position:'absolute', bottom:-40, left:40, width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,200,130,0.12) 0%,transparent 70%)', pointerEvents:'none' }}/>
                <div style={{ position:'absolute', top:28, right:30 }}>
                  <div style={{ width:44, height:32, borderRadius:7, background:'linear-gradient(135deg,#c9a227,#f5d060,#b8891e)', boxShadow:'0 2px 8px rgba(201,162,39,0.4)' }}/>
                </div>
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)', letterSpacing:'0.18em', textTransform:'uppercase', marginBottom:2 }}>KBOOS ENGINE</div>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,0.25)', letterSpacing:'0.1em' }}>API SPEND TRACKER</div>
                </div>
                <div style={{ marginBottom:18 }}>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginBottom:4, letterSpacing:'0.08em' }}>THIS MONTH'S USAGE</div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:38, fontWeight:700, color:'#fff', letterSpacing:'-1px', lineHeight:1 }}>
                    {formatCurrency(spend.total)}
                  </div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:6 }}>
                    {pct.toFixed(0)}% of {formatCurrency(spend.budget)} budget · {formatCurrency(remaining)} remaining
                  </div>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'rgba(255,255,255,0.3)', letterSpacing:'0.12em' }}>
                    ···· ···· ···· {new Date().getFullYear()}
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:8, color:'rgba(255,255,255,0.25)', letterSpacing:'0.1em' }}>VALID THRU</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'rgba(255,255,255,0.45)' }}>{cardMM}/{String(cardYear).slice(-2)}</div>
                  </div>
                </div>
              </div>

              {/* Budget gauge */}
              <div className="card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <div>
                    <div className="card-title">Monthly Budget</div>
                    <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Campaigns auto-pause when budget is exceeded</div>
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <span style={{ fontSize:13, color:'var(--muted)' }}>{currencySymbol}</span>
                    <input type="number" min={100} step={100} value={budget} onChange={e => setBudget(Number(e.target.value))}
                      style={{ width:100, background:'var(--s2)', border:'1px solid var(--border)', color:'var(--text)', padding:'6px 10px', borderRadius:6, fontFamily:'var(--font-mono)', fontSize:14, textAlign:'right' }} />
                    <button className="btn btn-green btn-sm" onClick={saveBudget} disabled={budgetSaving}>{budgetSaving ? '…' : 'Save'}</button>
                  </div>
                </div>
                <div style={{ background:'var(--s2)', borderRadius:6, height:10, overflow:'hidden', marginBottom:8 }}>
                  <div style={{ height:'100%', borderRadius:6, transition:'width 0.6s ease', width:`${pct}%`, background:gaugeColor }}/>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                  <span style={{ color:gaugeColor, fontWeight:500 }}>{formatCurrency(spend.total)} used</span>
                  <span style={{ color:'var(--muted)' }}>{formatCurrency(remaining)} left of {formatCurrency(spend.budget)}</span>
                </div>
                {pct > 80 && (
                  <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(255,50,50,0.08)', border:'1px solid rgba(255,50,50,0.25)', borderRadius:6, fontSize:12, color:'var(--red)' }}>
                    ⚠ Budget over 80% — top up API accounts or increase budget
                  </div>
                )}
              </div>

              {/* Per-API breakdown */}
              <div className="card">
                <div style={{ fontWeight:600, marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span>API Usage — {monthLabel}</span>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <span style={{ fontSize:11, color:'var(--muted)', fontWeight:400 }}>USD/RM: </span>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text)', fontWeight:600 }}>{rmRate.toFixed(4)}</span>
                    <button className="btn btn-sm" style={{ fontSize:11, padding:'2px 8px' }} disabled={fxRefreshing} onClick={async () => {
                      setFxRefreshing(true);
                      try {
                        const r = await apiFetch('/wallet/fx-rate');
                        setSpend(p => ({ ...p, usdRmRate: r.rate, rateUpdatedAt: r.updatedAt }));
                        showToast(`Rate updated: 1 USD = ${currencySymbol}${r.rate.toFixed(4)}`, 'green');
                      } catch { showToast('Could not fetch rate', 'red'); }
                      setFxRefreshing(false);
                    }}>{fxRefreshing ? '…' : '↻ Refresh'}</button>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {API_ROWS.map(row => {
                    const d      = spend.breakdown?.[row.key] || { count:0, costRm:0, source:'none' };
                    const costRm = d.costRm || 0;
                    const rowPct = spend.budget > 0 ? Math.min((costRm / spend.budget) * 100, 100) : 0;
                    const badge  = SOURCE_BADGE[d.source] || SOURCE_BADGE.none;
                    return (
                      <div key={row.key}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: costRm > 0 ? 5 : 0 }}>
                          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                            <div style={{ width:34, height:34, borderRadius:10, background:`${row.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{row.icon}</div>
                            <div>
                              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                                <span style={{ fontSize:13, fontWeight:500 }}>{row.label}</span>
                                <span style={{ fontSize:9, padding:'1px 5px', borderRadius:3, background:`${badge.color}22`, color:badge.color, fontWeight:600, letterSpacing:'0.05em' }}>{badge.label}</span>
                              </div>
                              <div style={{ fontSize:10, color:'var(--muted)', lineHeight:1.4, marginTop:1 }}>
                                {row.rate}{row.sub ? <span style={{ opacity:0.5 }}> · {row.sub}</span> : ''}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign:'right', flexShrink:0 }}>
                            <div style={{ fontFamily:'var(--font-mono)', fontSize:15, fontWeight:600, color: costRm > 0 ? 'var(--text)' : 'var(--muted)' }}>
                              {d.source === 'subscription' ? '—' : formatCurrency(costRm)}
                            </div>
                            {d.count > 0 && <div style={{ fontSize:10, color:'var(--muted)' }}>{d.count.toLocaleString()} actions</div>}
                            {d.tokens > 0 && <div style={{ fontSize:10, color:'var(--muted)' }}>{d.tokens.toLocaleString()} tokens</div>}
                          </div>
                        </div>
                        {costRm > 0 && (
                          <div style={{ background:'var(--s2)', borderRadius:3, height:3, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${rowPct}%`, background:row.color, borderRadius:3, transition:'width 0.5s' }}/>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid var(--border)', fontSize:12, color:'var(--muted)' }}>
                  {`WATI ${currencySymbol}245 + Apollo ${currencySymbol}465 billed directly to your card · auto-updated via ECB${spend.rateUpdatedAt ? ` ${timeAgoShort(spend.rateUpdatedAt)}` : ''}`}
                </div>
              </div>
            </div>
          )}

          {/* ── Billing: Client Billing ── */}
          {tab === 'billing-client' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <div className="card-title" style={{ marginBottom:4 }}>Client Billing</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>Payments collected from clients via Billplz FPX online banking</div>
              </div>

              <div style={{
                borderRadius:16, padding:'20px 24px',
                background:'linear-gradient(135deg, #0a1628 0%, #0d2240 100%)',
                border:'1px solid rgba(0,120,255,0.2)', position:'relative', overflow:'hidden',
              }}>
                <div style={{ position:'absolute', top:-30, right:-30, width:120, height:120, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,120,255,0.15) 0%,transparent 70%)', pointerEvents:'none' }}/>
                <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6 }}>Total Collected</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:32, fontWeight:700, color:'#fff', letterSpacing:'-0.5px', lineHeight:1, marginBottom:6 }}>
                  {formatCurrency((wallet.balance || 0) / 100)}
                </div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>via Billplz FPX · transfers to your bank account</div>
              </div>

              <div className="card">
                {wallet.transactions?.length > 0 ? (
                  <>
                    <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12, fontWeight:600 }}>Transaction History</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      {wallet.transactions.slice(0, 15).map((tx, i) => (
                        <div key={tx.id} style={{
                          display:'flex', alignItems:'center', justifyContent:'space-between',
                          padding:'10px 14px', borderRadius:10,
                          background: i % 2 === 0 ? 'var(--s2)' : 'transparent',
                        }}>
                          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                            <div style={{ width:34, height:34, borderRadius:10, flexShrink:0, background: tx.status==='paid' ? '#22c55e22' : tx.status==='pending' ? '#f59e0b22' : '#ef444422', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
                              {tx.status==='paid' ? '✓' : tx.status==='pending' ? '⏳' : '✕'}
                            </div>
                            <div>
                              <div style={{ fontSize:13, fontWeight:500 }}>{tx.note || 'Top-up'}</div>
                              <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>{fmtDate(tx.createdAt)}</div>
                            </div>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, fontWeight:600, background: tx.status==='paid' ? '#22c55e22' : tx.status==='pending' ? '#f59e0b22' : '#ef444422', color: tx.status==='paid' ? '#22c55e' : tx.status==='pending' ? '#f59e0b' : '#ef4444' }}>
                              {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                            </span>
                            <span style={{ fontFamily:'var(--font-mono)', fontSize:15, fontWeight:700, color: tx.status==='paid' ? 'var(--green)' : 'var(--muted)' }}>
                              {formatCurrency(tx.amountSen/100)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign:'center', padding:'28px 0', color:'var(--muted)' }}>
                    <div style={{ fontSize:28, marginBottom:8, opacity:0.4 }}>💳</div>
                    <div style={{ fontSize:13, fontWeight:500 }}>No transactions yet</div>
                    <div style={{ fontSize:12, marginTop:4, opacity:0.7 }}>Client payments will appear here once received via Billplz FPX</div>
                  </div>
                )}
                <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid var(--border)', fontSize:11, color:'var(--muted)' }}>
                  Requires Billplz API Key, Collection ID and X-Signature Key in Integrations → Communications
                </div>
              </div>
            </div>
          )}

          {/* ── Admin: Users ── */}
          {tab === 'admin-users' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <div className="card-title" style={{ marginBottom:4 }}>User Management</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>Manage team members and client portal access</div>
              </div>

              {/* Add client */}
              <div className="card">
                <div className="card-title" style={{ marginBottom:4 }}>Add Client Portal Access</div>
                <div style={{ color:'var(--muted)', fontSize:12, marginBottom:14 }}>Client receives an invite link to set their password. They see only their business data.</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:8 }}>
                  <input placeholder="Contact name" value={newClient.name} onChange={e => setNewClient(p => ({ ...p, name:e.target.value }))} className="input" />
                  <input placeholder="Email address" value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email:e.target.value }))} className="input" />
                  <Select value={newClient.bizId} onChange={v => setNewClient(p => ({ ...p, bizId:v }))}
                    options={[{value:'',label:'— Select Business —'}, ...businesses.map(b => ({value:b.id,label:b.name}))]} />
                  <button className="btn btn-green" onClick={addClient}>Send Invite</button>
                </div>
              </div>

              {/* Client users */}
              <div className="card">
                <div className="card-title" style={{ marginBottom:12 }}>Client Portal Users</div>
                {users.filter(u => u.role === 'client').length === 0 ? (
                  <div style={{ color:'var(--muted)', fontSize:13 }}>No client users yet.</div>
                ) : (
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom:'1px solid var(--border)' }}>
                        {['Name','Email','Business','Status',''].map(h => (
                          <th key={h} style={{ textAlign:'left', padding:'6px 10px', fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.filter(u => u.role === 'client').map(m => {
                        const biz = businesses.find(b => b.id === m.bizId);
                        return (
                          <tr key={m.id} style={{ borderBottom:'1px solid var(--border)' }}>
                            <td style={{ padding:'10px', fontWeight:500, fontSize:13 }}>{m.name}</td>
                            <td style={{ padding:'10px', fontSize:12, color:'var(--muted)' }}>{m.email}</td>
                            <td style={{ padding:'10px' }}>{biz ? <span className={`badge ${biz.color||'blue'}`}>{biz.name}</span> : <span style={{ color:'var(--muted)', fontSize:12 }}>—</span>}</td>
                            <td style={{ padding:'10px' }}><span className={`badge ${m.pending?'amber':'green'}`}>{m.pending ? 'Pending' : 'Active'}</span></td>
                            <td style={{ padding:'10px' }}>
                              <button className="btn btn-sm" style={{ color:'var(--red)', border:'1px solid oklch(55% 0.22 25 / 0.4)', background:'transparent', fontSize:11 }}
                                onClick={() => { if (window.confirm(`Remove ${m.name}?`)) removeTeamMember(m.id); }}>Remove</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ── Admin: Audit Logs ── */}
          {tab === 'admin-audit' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <div className="card-title" style={{ marginBottom:4 }}>Audit Logs</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>System activity and user actions</div>
              </div>
              <div className="card">
                {activity.length === 0 ? (
                  <div style={{ color:'var(--muted)', fontSize:13, textAlign:'center', padding:'24px 0' }}>No activity recorded yet</div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                    {activity.slice(0, 50).map((a, i) => (
                      <div key={a.id ?? i} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                        <div style={{ width:7, height:7, borderRadius:'50%', background:`var(--${a.color})`, marginTop:5, flexShrink:0 }} />
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13 }}>{a.msg}</div>
                          <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                            <span className="mono">{a.createdAt ? new Date(a.createdAt).toLocaleString('en-MY') : ''}</span>
                            {a.tag && <span> · {a.tag}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                    {activity.length > 50 && (
                      <div style={{ fontSize:12, color:'var(--muted)', textAlign:'center', padding:'12px 0' }}>Showing 50 of {activity.length} events</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Admin: Security ── */}
          {tab === 'admin-security' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:600 }}>
              <div>
                <div className="card-title" style={{ marginBottom:4 }}>Security</div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>Advanced security settings</div>
              </div>
              {[
                { icon:'🔐', title:'Two-Factor Authentication', desc:'Require 2FA for all admin accounts', badge:'Coming Soon' },
                { icon:'📱', title:'Device Management',        desc:'View and revoke active sessions',  badge:'Coming Soon' },
                { icon:'📋', title:'Login History',            desc:'Track sign-in activity by user',   badge:'Coming Soon' },
                { icon:'💾', title:'Data Export',              desc:'Export all platform data as JSON',  badge:'Coming Soon' },
              ].map(item => (
                <div key={item.title} className="card" style={{ display:'flex', alignItems:'center', gap:14, opacity:0.7 }}>
                  <div style={{ width:42, height:42, borderRadius:10, background:'var(--s2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{item.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:500, fontSize:13, display:'flex', alignItems:'center', gap:8 }}>
                      {item.title}
                      <span style={{ fontSize:9, padding:'2px 7px', borderRadius:10, background:'var(--s2)', color:'var(--muted)', fontWeight:600, letterSpacing:'0.06em' }}>{item.badge}</span>
                    </div>
                    <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>

    {openMember && (
      <TeamMemberSlideOver member={openMember} onClose={() => setOpenMember(null)}
        onUpdated={updated => { setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u)); setOpenMember(prev => ({ ...prev, ...updated })); }}
        onRemoved={id => setUsers(prev => prev.filter(u => u.id !== id))}
        showToast={showToast} />
    )}

    {inviteLink && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div className="card" style={{ width:'100%', maxWidth:500, border:'1px solid oklch(65% 0.2 145 / 0.5)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ fontWeight:700, fontSize:16, color:'var(--green)' }}>Invite Link Ready</div>
            <button className="btn" style={{ fontSize:12 }} onClick={() => setInviteLink('')}>✕ Close</button>
          </div>
          <div style={{ color:'var(--muted)', fontSize:13, marginBottom:16, lineHeight:1.6 }}>
            Copy this link and send it via WhatsApp, email, or any platform. The recipient clicks it to set their own password.
          </div>
          <div style={{ background:'var(--s2)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', fontFamily:'var(--font-mono)', fontSize:12, wordBreak:'break-all', marginBottom:14 }}>
            {inviteLink}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-green" style={{ flex:1, fontSize:14, padding:'10px' }}
              onClick={() => { navigator.clipboard.writeText(inviteLink); showToast('Link copied — paste it in WhatsApp or email', 'green'); }}>
              Copy Link
            </button>
            <button className="btn" style={{ fontSize:13 }} onClick={() => setInviteLink('')}>Done</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
