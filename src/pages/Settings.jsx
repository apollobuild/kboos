import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { useWalletStore } from '../store/useWalletStore.js';
import { useRole } from '../hooks/useRole.js';
import { settingsService } from '../services/settings.js';
import { TeamMemberSlideOver } from '../components/ui/TeamMemberSlideOver.jsx';
import { apiFetch } from '../services/api.js';

const APIS = ['claude', 'sendgrid', 'wati', 'apollo', 'outscraper', 'billplz_api_key', 'billplz_collection_id', 'billplz_x_signature_key', 'vapi', 'vapi_phone_number_id'];
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
  exact:        { label: 'Exact',        color: '#00d97e' },
  calculated:   { label: 'Calculated',   color: '#0078ff' },
  live:         { label: 'Live API',     color: '#00d97e' },
  subscription: { label: 'Subscription', color: '#a855f7' },
  none:         { label: 'No data',      color: '#666' },
};

function Toggle({ on, onChange }) {
  return (
    <div onClick={() => onChange(!on)} style={{
      width: 44, height: 24, borderRadius: 12, cursor: 'pointer', flexShrink: 0,
      background: on ? 'var(--green)' : 'var(--border)',
      position: 'relative', transition: 'background 0.2s',
    }}>
      <div style={{
        position: 'absolute', top: 3, left: on ? 22 : 3, width: 18, height: 18,
        borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function Settings() {
  const { showToast, businesses } = useAppStore(useShallow(s => ({ showToast: s.showToast, businesses: s.businesses })));
  const { canAccessSettingsTab } = useRole();
  const { wallet, init: initWallet } = useWalletStore();

  const [tab,           setTab]          = useState('api');
  const [apiKeys,       setApiKeys]      = useState({});
  const [showKey,       setShowKey]      = useState({});
  const [driveConnected,setDriveConnected] = useState(false);
  const [driveJsonText, setDriveJsonText] = useState('');
  const [driveUploading,setDriveUploading] = useState(false);
  const [newMember,     setNewMember]    = useState({ name:'', email:'', role:'Operator' });
  const [newClient,     setNewClient]    = useState({ name:'', email:'', bizId:'' });
  const [spend,         setSpend]        = useState({ total:0, budget:1000, breakdown:{}, usdRmRate:4.70 });
  const [budget,        setBudget]       = useState(1000);
  const [budgetSaving,  setBudgetSaving] = useState(false);
  const [inviteLink,    setInviteLink]   = useState('');
  const [users,         setUsers]        = useState([]);
  const [openMember,    setOpenMember]   = useState(null);

  // Notifications state
  const [notif, setNotif] = useState({
    hotLead: true, budgetAlert: true, weeklyDigest: false, digestEmail: '',
  });
  const [notifSaving, setNotifSaving] = useState(false);

  // Branding state
  const [branding, setBranding] = useState({
    companyName: 'KOBIS Outreach', logoUrl: '', accentColor: '#aa3bff',
  });
  const [brandingSaving, setBrandingSaving] = useState(false);

  // Vapi phone numbers
  const [vapiNumbers, setVapiNumbers] = useState([]);
  const [vapiNumLoading, setVapiNumLoading] = useState(false);

  async function fetchVapiNumbers() {
    setVapiNumLoading(true);
    try {
      const nums = await apiFetch('/voice/phone-numbers');
      setVapiNumbers(nums);
      if (nums.length === 0) showToast('No phone numbers found — create a free number in Vapi dashboard first', 'amber');
    } catch (e) {
      showToast(e.message || 'Failed to fetch Vapi numbers', 'red');
    } finally {
      setVapiNumLoading(false);
    }
  }

  useEffect(() => {
    const pendingTab = sessionStorage.getItem('settingsTab');
    if (pendingTab) { setTab(pendingTab); sessionStorage.removeItem('settingsTab'); }
    const params = new URLSearchParams(window.location.search);
    if (params.get('topup') === 'done') {
      setTab('wallet');
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
      await apiFetch('/wallet/budget', { method: 'PATCH', body: { budget } });
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
      await apiFetch('/settings/drive-service-account', { method: 'POST', body: { serviceAccountKey: parsed } });
      setDriveConnected(true);
      setDriveJsonText('');
      showToast('Google Drive service account connected ✓', 'green');
    } catch (e) { showToast(e.message || 'Failed to save', 'red'); }
    finally { setDriveUploading(false); }
  }

  async function loadUsers() {
    try { setUsers(await apiFetch('/settings/users') || []); } catch { /* not admin */ }
  }

  async function addClient() {
    if (!newClient.name || !newClient.email || !newClient.bizId) { showToast('Fill in name, email, and select a business', 'amber'); return; }
    try {
      const result = await settingsService.saveTeamMember({ ...newClient, role: 'client' });
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
    try { await apiFetch(`/settings/users/${id}`, { method: 'DELETE' }); await loadUsers(); showToast('Removed', 'amber'); }
    catch { showToast('Failed to remove', 'red'); }
  }

  async function saveNotifications() {
    setNotifSaving(true);
    try {
      await apiFetch('/settings/preferences', { method: 'PATCH', body: { notifications: notif } });
      showToast('Notification preferences saved', 'green');
    } catch { showToast('Saved locally — backend update pending', 'amber'); }
    finally { setNotifSaving(false); }
  }

  async function saveBranding() {
    setBrandingSaving(true);
    try {
      await apiFetch('/settings/preferences', { method: 'PATCH', body: { branding } });
      showToast('Branding saved', 'green');
    } catch { showToast('Saved locally — backend update pending', 'amber'); }
    finally { setBrandingSaving(false); }
  }

  const tabs = [
    { id:'api',           label:'API Keys' },
    { id:'team',          label:'Team' },
    { id:'clients',       label:'Clients' },
    { id:'wallet',        label:'Wallet' },
    { id:'drive',         label:'Google Drive' },
    { id:'notifications', label:'Notifications' },
    { id:'branding',      label:'Branding' },
  ].filter(t => canAccessSettingsTab(t.id));

  const pct        = Math.min((spend.total / spend.budget) * 100, 100);
  const gaugeColor = pct > 80 ? 'var(--red)' : pct > 60 ? 'var(--amber)' : 'var(--green)';
  const remaining  = Math.max(0, spend.budget - spend.total);
  const monthLabel = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const rmRate     = spend.usdRmRate || 4.70;
  const cardYear   = new Date().getFullYear() + 1;
  const cardMM     = String(new Date().getMonth() + 1).padStart(2, '0');

  const API_ROWS = [
    { key:'wa',     label:'WhatsApp (Meta)',    icon:'💬', color:'#00d97e', rate:`$0.045/conv × RM ${rmRate}`, sub:'WATI RM 245/mo separate' },
    { key:'email',  label:'Email (SendGrid)',   icon:'📧', color:'#0078ff', rate:`$0.0004/email × RM ${rmRate}` },
    { key:'claude', label:'Claude AI Writing', icon:'🤖', color:'#a855f7', rate:'Exact token cost (Sonnet 4.6)' },
    { key:'call',   label:'AI Voice (Vapi)',    icon:'📞', color:'#f5a623', rate:'Exact cost from Vapi API per call' },
    { key:'enrich', label:'Apollo Enrichment', icon:'🔭', color:'#7c3aed', rate:'Flat subscription', sub:'Apollo Professional RM 465/mo' },
    { key:'scraper',label:'Outscraper (Maps)',  icon:'📍', color:'#06b6d4', rate:`$0.001/record × RM ${rmRate}` },
  ];

  return (
    <>
    <div className="page">
      <div className="fade-up mb-4">
        <div className="breadcrumb">System / <span>Settings</span></div>
        <h1 className="page-title" style={{ marginTop:4 }}>Settings</h1>
      </div>

      <div className="tabs fade-up-1 mb-4" style={{ flexWrap:'wrap' }}>
        {tabs.map(t => (
          <div key={t.id} className={`tab${tab===t.id?' active':''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </div>
        ))}
      </div>

      {/* ── API Keys ── */}
      {tab === 'api' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {APIS.map(api => (
            <div key={api} className="card fade-up">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ fontWeight:600 }}>{API_LABELS[api]}</div>
                {api !== 'vapi_phone_number_id' && (
                  <button className="btn" style={{ fontSize:12, padding:'3px 10px' }} onClick={() => testConnection(api)}>Test Connection</button>
                )}
              </div>

              {/* Special UI for Vapi phone number — fetch & pick from list */}
              {api === 'vapi_phone_number_id' ? (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.6 }}>
                    Enter a phone number ID from your Vapi dashboard, or click <strong style={{color:'var(--text)'}}>Fetch Numbers</strong> to load your list.
                    Don't have one yet? In Vapi dashboard → <strong style={{color:'var(--text)'}}>Phone Numbers → Create Phone Number</strong> — Vapi provides a <span style={{color:'var(--green)'}}>free number</span> for testing.
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <div style={{ position:'relative', flex:1 }}>
                      <input
                        type={showKey[api] ? 'text' : 'password'}
                        value={apiKeys[api] || ''}
                        onChange={e => setApiKeys(prev => ({ ...prev, [api]: e.target.value }))}
                        placeholder="e.g. ph_xxxxxxxxxxxxxxxxxxxxxxxx"
                        className="input"
                        style={{ fontFamily: showKey[api] ? 'var(--font-mono)' : 'inherit', paddingRight:36 }}
                      />
                      <button style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:14 }}
                        onClick={() => setShowKey(prev => ({ ...prev, [api]: !prev[api] }))}>
                        {showKey[api] ? '🙈' : '👁'}
                      </button>
                    </div>
                    <button className="btn btn-ghost" style={{ flexShrink:0, whiteSpace:'nowrap' }}
                      disabled={vapiNumLoading} onClick={fetchVapiNumbers}>
                      {vapiNumLoading ? '◌' : '📱 Fetch Numbers'}
                    </button>
                    <button className="btn btn-green" style={{ flexShrink:0 }} onClick={() => saveApiKey(api)}>Save</button>
                  </div>
                  {vapiNumbers.length > 0 && (
                    <div style={{ background:'var(--s1)', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
                      <div style={{ fontSize:11, color:'var(--muted)', padding:'8px 12px', borderBottom:'1px solid var(--border)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600 }}>
                        Your Vapi Phone Numbers — click to select
                      </div>
                      {vapiNumbers.map(n => (
                        <div key={n.id}
                          onClick={() => setApiKeys(prev => ({ ...prev, vapi_phone_number_id: n.id }))}
                          style={{
                            display:'flex', alignItems:'center', gap:12, padding:'10px 12px',
                            cursor:'pointer', borderBottom:'1px solid var(--border)',
                            background: apiKeys.vapi_phone_number_id === n.id ? 'var(--green-dim)' : 'transparent',
                            transition:'background 0.15s',
                          }}>
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
                </div>
              ) : (
                <div style={{ display:'flex', gap:8 }}>
                  <div style={{ position:'relative', flex:1 }}>
                    <input
                      type={showKey[api] ? 'text' : 'password'}
                      value={apiKeys[api] || ''}
                      onChange={e => setApiKeys(prev => ({ ...prev, [api]: e.target.value }))}
                      placeholder={`Enter ${API_LABELS[api]} API key`}
                      style={{ width:'100%', background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)', padding:'8px 36px 8px 12px', borderRadius:6, fontSize:13, fontFamily: showKey[api] ? 'var(--font-mono)' : 'inherit' }}
                    />
                    <button style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:14 }}
                      onClick={() => setShowKey(prev => ({ ...prev, [api]: !prev[api] }))}>
                      {showKey[api] ? '🙈' : '👁'}
                    </button>
                  </div>
                  <button className="btn btn-green" style={{ flexShrink:0 }} onClick={() => saveApiKey(api)}>Save</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Team ── */}
      {tab === 'team' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div className="card fade-up">
            <div style={{ fontWeight:600, marginBottom:12 }}>Invite Team Member</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto auto', gap:8 }}>
              <input placeholder="Name" value={newMember.name} onChange={e => setNewMember(p => ({ ...p, name:e.target.value }))}
                style={{ background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)', padding:'8px 12px', borderRadius:6, fontSize:13 }} />
              <input placeholder="Email" value={newMember.email} onChange={e => setNewMember(p => ({ ...p, email:e.target.value }))}
                style={{ background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)', padding:'8px 12px', borderRadius:6, fontSize:13 }} />
              <select value={newMember.role} onChange={e => setNewMember(p => ({ ...p, role:e.target.value }))}
                style={{ background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)', padding:'8px 12px', borderRadius:6, fontSize:13 }}>
                <option>Admin</option><option>Operator</option><option>Viewer</option>
              </select>
              <button className="btn btn-blue" onClick={addTeamMember}>Invite</button>
            </div>
          </div>
          <div className="card fade-up-1">
            <div style={{ fontWeight:600, marginBottom:12 }}>Current Team</div>
            {users.filter(u => u.role !== 'client').length === 0 ? (
              <div style={{ color:'var(--text-3)', fontSize:13 }}>No team members yet.</div>
            ) : (
              <table className="table" style={{ width:'100%' }}>
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {users.filter(u => u.role !== 'client').map(m => (
                    <tr key={m.id} style={{ cursor:'pointer' }} onClick={() => setOpenMember(m)}>
                      <td style={{ fontWeight:500 }}>{m.name}</td>
                      <td style={{ color:'var(--text-2)' }}>{m.email}</td>
                      <td><span className="badge badge-blue" style={{ textTransform:'capitalize' }}>{m.role}</span></td>
                      <td><span className={`badge badge-${m.pending ? 'amber' : 'green'}`}>{m.pending ? 'Invite Pending' : 'Active'}</span></td>
                      <td><button className="btn" style={{ fontSize:11, padding:'3px 8px', color:'var(--muted)', border:'1px solid var(--border)' }} onClick={e => { e.stopPropagation(); setOpenMember(m); }}>View →</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Clients ── */}
      {tab === 'clients' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div className="card fade-up">
            <div style={{ fontWeight:600, marginBottom:4 }}>Add Client Portal Access</div>
            <div style={{ color:'var(--text-3)', fontSize:12, marginBottom:14 }}>
              Client receives an invite link to set their password. They log in and see only their business data.
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:8 }}>
              <input placeholder="Contact name" value={newClient.name} onChange={e => setNewClient(p => ({ ...p, name:e.target.value }))}
                style={{ background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)', padding:'8px 12px', borderRadius:6, fontSize:13 }} />
              <input placeholder="Email address" value={newClient.email} onChange={e => setNewClient(p => ({ ...p, email:e.target.value }))}
                style={{ background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)', padding:'8px 12px', borderRadius:6, fontSize:13 }} />
              <select value={newClient.bizId} onChange={e => setNewClient(p => ({ ...p, bizId:e.target.value }))}
                style={{ background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)', padding:'8px 12px', borderRadius:6, fontSize:13 }}>
                <option value="">— Select Business —</option>
                {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <button className="btn btn-green" onClick={addClient}>Send Invite</button>
            </div>
          </div>
          <div className="card fade-up-1">
            <div style={{ fontWeight:600, marginBottom:12 }}>Client Portal Users</div>
            {users.filter(u => u.role === 'client').length === 0 ? (
              <div style={{ color:'var(--text-3)', fontSize:13 }}>No client users yet.</div>
            ) : (
              <table className="table" style={{ width:'100%' }}>
                <thead><tr><th>Name</th><th>Email</th><th>Business</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {users.filter(u => u.role === 'client').map(m => {
                    const biz = businesses.find(b => b.id === m.bizId);
                    return (
                      <tr key={m.id}>
                        <td style={{ fontWeight:500 }}>{m.name}</td>
                        <td style={{ color:'var(--text-2)' }}>{m.email}</td>
                        <td>{biz ? <span className={`badge badge-${biz.color||'blue'}`}>{biz.name}</span> : <span style={{ color:'var(--text-3)', fontSize:12 }}>—</span>}</td>
                        <td><span className={`badge badge-${m.pending?'amber':'green'}`}>{m.pending ? 'Invite Pending' : 'Active'}</span></td>
                        <td>
                          <button className="btn" style={{ fontSize:11, padding:'3px 8px', color:'var(--red)', border:'1px solid var(--red)' }}
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

      {/* ── Wallet ── */}
      {tab === 'wallet' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Holographic spend card */}
          <div className="fade-up" style={{
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
                RM {spend.total.toFixed(2)}
              </div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:6 }}>
                {pct.toFixed(0)}% of RM {spend.budget.toFixed(0)} budget · RM {remaining.toFixed(2)} remaining
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
          <div className="card fade-up-1" style={{ padding:'16px 20px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div>
                <div style={{ fontWeight:600, fontSize:14 }}>Monthly Budget</div>
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Campaigns auto-pause when budget is exceeded</div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <span style={{ fontSize:13, color:'var(--muted)' }}>RM</span>
                <input type="number" min={100} step={100} value={budget} onChange={e => setBudget(Number(e.target.value))}
                  style={{ width:100, background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)', padding:'6px 10px', borderRadius:6, fontFamily:'var(--font-mono)', fontSize:14, textAlign:'right' }} />
                <button className="btn btn-green btn-sm" onClick={saveBudget} disabled={budgetSaving}>{budgetSaving ? '…' : 'Save'}</button>
              </div>
            </div>
            <div style={{ background:'var(--bg)', borderRadius:6, height:10, overflow:'hidden', marginBottom:8 }}>
              <div style={{ height:'100%', borderRadius:6, transition:'width 0.6s ease', width:`${pct}%`, background:gaugeColor }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
              <span style={{ color:gaugeColor, fontWeight:500 }}>RM {spend.total.toFixed(2)} used</span>
              <span style={{ color:'var(--muted)' }}>RM {remaining.toFixed(2)} left of RM {spend.budget.toFixed(0)}</span>
            </div>
            {pct > 80 && (
              <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(255,50,50,0.08)', border:'1px solid rgba(255,50,50,0.25)', borderRadius:6, fontSize:12, color:'var(--red)' }}>
                ⚠ Budget over 80% — top up API accounts or increase budget
              </div>
            )}
          </div>

          {/* Per-API breakdown */}
          <div className="card fade-up-2">
            <div style={{ fontWeight:600, marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span>API Usage — {monthLabel}</span>
              <span style={{ fontSize:11, color:'var(--muted)', fontWeight:400 }}>Estimated cost per action</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {API_ROWS.map(row => {
                const d       = spend.breakdown?.[row.key] || { count:0, costRm:0, source:'none' };
                const costRm  = d.costRm || 0;
                const rowPct  = spend.budget > 0 ? Math.min((costRm / spend.budget) * 100, 100) : 0;
                const badge   = SOURCE_BADGE[d.source] || SOURCE_BADGE.none;
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
                          {d.note && <div style={{ fontSize:10, color:'#a855f7', marginTop:1 }}>{d.note}</div>}
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontFamily:'var(--font-mono)', fontSize:15, fontWeight:600, color: costRm > 0 ? 'var(--text-1)' : 'var(--muted)' }}>
                          {d.source === 'subscription' ? '—' : `RM ${costRm.toFixed(2)}`}
                        </div>
                        {d.count > 0 && <div style={{ fontSize:10, color:'var(--muted)' }}>{d.count.toLocaleString()} actions</div>}
                        {d.tokens > 0 && <div style={{ fontSize:10, color:'var(--muted)' }}>{d.tokens.toLocaleString()} tokens</div>}
                      </div>
                    </div>
                    {costRm > 0 && (
                      <div style={{ background:'var(--bg)', borderRadius:3, height:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${rowPct}%`, background:row.color, borderRadius:3, transition:'width 0.5s' }}/>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid var(--border)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <span style={{ fontSize:12, color:'var(--muted)' }}>Usage cost this month (excl. fixed subscriptions)</span>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:15, fontWeight:700 }}>RM {spend.total.toFixed(2)}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--muted)' }}>
                <span>USD/RM rate:</span>
                <input type="number" step="0.01" min="1" value={rmRate}
                  onChange={e => setSpend(p => ({ ...p, usdRmRate: parseFloat(e.target.value) }))}
                  style={{ width:70, background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)', padding:'3px 6px', borderRadius:4, fontFamily:'var(--font-mono)', fontSize:12 }} />
                <button className="btn btn-sm" style={{ fontSize:11 }} onClick={async () => {
                  await apiFetch('/wallet/budget', { method:'PATCH', body:{ budget, usdRmRate: rmRate } }).catch(()=>{});
                  showToast('Rate saved', 'green');
                }}>Save rate</button>
                <span style={{ opacity:0.5 }}>· WATI RM 245 + Apollo RM 465 billed directly to your card</span>
              </div>
            </div>
          </div>

          {/* Client Billing — read-only payment ledger */}
          <div className="card fade-up-3">
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                  <span style={{ fontWeight:600, fontSize:15 }}>💳 Client Billing</span>
                  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, background:'#0078ff22', color:'#0078ff', fontWeight:600 }}>Billplz FPX</span>
                </div>
                <div style={{ fontSize:12, color:'var(--muted)' }}>
                  Payments collected from clients via online banking
                </div>
              </div>
            </div>

            {/* Balance card */}
            <div style={{
              borderRadius:16, padding:'20px 24px', marginBottom:16,
              background:'linear-gradient(135deg, #0a1628 0%, #0d2240 100%)',
              border:'1px solid rgba(0,120,255,0.2)', position:'relative', overflow:'hidden',
            }}>
              <div style={{ position:'absolute', top:-30, right:-30, width:120, height:120, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,120,255,0.15) 0%,transparent 70%)', pointerEvents:'none' }}/>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:6 }}>Total Collected</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:32, fontWeight:700, color:'#fff', letterSpacing:'-0.5px', lineHeight:1, marginBottom:6 }}>
                RM {((wallet.balance || 0) / 100).toFixed(2)}
              </div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)' }}>
                via Billplz FPX · transfers to your bank account
              </div>
            </div>

            {/* Transaction ledger */}
            {wallet.transactions?.length > 0 ? (
              <div>
                <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10, fontWeight:600 }}>
                  Transaction History
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  {wallet.transactions.slice(0, 15).map((tx, i) => (
                    <div key={tx.id} style={{
                      display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'10px 14px', borderRadius:10,
                      background: i % 2 === 0 ? 'var(--bg-2)' : 'transparent',
                      transition:'background 0.1s',
                    }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{
                          width:34, height:34, borderRadius:10, flexShrink:0,
                          background: tx.status==='paid' ? '#22c55e22' : tx.status==='pending' ? '#f59e0b22' : '#ef444422',
                          display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
                        }}>
                          {tx.status==='paid' ? '✓' : tx.status==='pending' ? '⏳' : '✕'}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:500, color:'var(--text-1)' }}>{tx.note || 'Top-up'}</div>
                          <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>{fmtDate(tx.createdAt)}</div>
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{
                          fontSize:10, padding:'2px 8px', borderRadius:10, fontWeight:600,
                          background: tx.status==='paid' ? '#22c55e22' : tx.status==='pending' ? '#f59e0b22' : '#ef444422',
                          color: tx.status==='paid' ? '#22c55e' : tx.status==='pending' ? '#f59e0b' : '#ef4444',
                        }}>
                          {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                        </span>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:15, fontWeight:700, color: tx.status==='paid' ? 'var(--green)' : 'var(--text-2)' }}>
                          RM {(tx.amountSen/100).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:'28px 0', color:'var(--muted)' }}>
                <div style={{ fontSize:28, marginBottom:8, opacity:0.4 }}>💳</div>
                <div style={{ fontSize:13, fontWeight:500 }}>No transactions yet</div>
                <div style={{ fontSize:12, marginTop:4, opacity:0.7 }}>Client payments will appear here once received via Billplz FPX</div>
              </div>
            )}

            <div style={{ marginTop:14, paddingTop:12, borderTop:'1px solid var(--border)', fontSize:11, color:'var(--muted)' }}>
              Requires Billplz API Key, Collection ID and X-Signature Key in the API Keys tab.
            </div>
          </div>
        </div>
      )}

      {/* ── Google Drive ── */}
      {tab === 'drive' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div className="card fade-up" style={{ border: driveConnected ? '1px solid var(--green)' : '1px solid var(--border)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom: driveConnected ? 0 : 16 }}>
              <div style={{ width:48, height:48, borderRadius:12, background: driveConnected ? 'oklch(65% 0.2 145 / 0.15)' : 'var(--bg-2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>📁</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, marginBottom:2 }}>Google Drive — Service Account</div>
                <div style={{ color:'var(--text-2)', fontSize:13 }}>
                  {driveConnected ? 'Connected — campaign lead sheets will be created automatically in your Drive' : 'Paste your Google service account JSON key below to enable auto-sheet creation'}
                </div>
              </div>
              {driveConnected && <span style={{ fontSize:12, color:'var(--green)', fontWeight:600, border:'1px solid var(--green)', borderRadius:6, padding:'4px 10px' }}>✓ Connected</span>}
            </div>
            {!driveConnected && (
              <>
                <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:8, lineHeight:1.6 }}>
                  1. Go to <strong>console.cloud.google.com</strong> → IAM & Admin → Service Accounts<br/>
                  2. Create a service account, enable Drive API + Sheets API, create a JSON key<br/>
                  3. Paste the entire JSON key file contents below
                </div>
                <textarea value={driveJsonText} onChange={e => setDriveJsonText(e.target.value)}
                  placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  ...\n}'} rows={8}
                  style={{ width:'100%', background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)', borderRadius:6, padding:'10px 12px', fontSize:12, fontFamily:'var(--font-mono)', resize:'vertical', boxSizing:'border-box' }} />
                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:10 }}>
                  <button className="btn btn-green" onClick={handleDriveSave} disabled={driveUploading || !driveJsonText.trim()}>
                    {driveUploading ? 'Saving…' : 'Save & Connect'}
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="card fade-up-1">
            <div style={{ fontWeight:600, marginBottom:12 }}>How It Works</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                'Google Maps scrapes leads → sheet created in your Drive automatically',
                'Apollo enrichment updates the same sheet with decision maker emails',
                'You get a direct link to the sheet in the Approvals page to review before launch',
                'No manual export needed — it\'s always up to date',
              ].map((text, i) => (
                <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--blue-dim)', color:'var(--blue)', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</div>
                  <div style={{ color:'var(--text-2)', fontSize:13, paddingTop:3 }}>{text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Notifications ── */}
      {tab === 'notifications' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div className="card fade-up">
            <div style={{ fontWeight:600, marginBottom:4 }}>Alert Preferences</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginBottom:20 }}>
              Choose when KBOOS should notify you or your team.
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {[
                { key:'hotLead',      icon:'🔥', title:'Hot Lead Alert',     desc:'Get notified when a lead is marked as hot or books a meeting' },
                { key:'budgetAlert',  icon:'💰', title:'Budget Alert',        desc:'Alert when API spend reaches 80% of your monthly budget' },
                { key:'weeklyDigest', icon:'📊', title:'Weekly Digest',       desc:'Summary of outreach performance every Monday morning' },
              ].map((item, i) => (
                <div key={item.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:'var(--bg-2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{item.icon}</div>
                    <div>
                      <div style={{ fontWeight:500, fontSize:14 }}>{item.title}</div>
                      <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>{item.desc}</div>
                    </div>
                  </div>
                  <Toggle on={notif[item.key]} onChange={val => setNotif(p => ({ ...p, [item.key]: val }))} />
                </div>
              ))}
            </div>
          </div>

          {notif.weeklyDigest && (
            <div className="card fade-up-1">
              <div style={{ fontWeight:500, marginBottom:10 }}>Weekly Digest — Send To</div>
              <div style={{ display:'flex', gap:8 }}>
                <input
                  type="email" placeholder="Email address for digest reports"
                  value={notif.digestEmail}
                  onChange={e => setNotif(p => ({ ...p, digestEmail: e.target.value }))}
                  style={{ flex:1, background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)', padding:'8px 12px', borderRadius:6, fontSize:13 }}
                />
              </div>
            </div>
          )}

          <div className="card fade-up-2" style={{ background:'var(--bg-2)', border:'1px solid var(--border)' }}>
            <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.7 }}>
              <strong style={{ color:'var(--text-1)' }}>Note:</strong> Alerts are sent to the admin email address. Ensure SendGrid is configured in the API Keys tab for email delivery to work.
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button className="btn btn-blue" onClick={saveNotifications} disabled={notifSaving}>
              {notifSaving ? 'Saving…' : 'Save Preferences'}
            </button>
          </div>
        </div>
      )}

      {/* ── Branding ── */}
      {tab === 'branding' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div className="card fade-up">
            <div style={{ fontWeight:600, marginBottom:4 }}>Client Portal Branding</div>
            <div style={{ fontSize:12, color:'var(--muted)', marginBottom:20 }}>
              Customise how your brand appears to clients when they log into their portal.
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ fontSize:12, color:'var(--text-2)', display:'block', marginBottom:6 }}>Company Display Name</label>
                <input
                  type="text" placeholder="e.g. KOBIS Outreach"
                  value={branding.companyName}
                  onChange={e => setBranding(p => ({ ...p, companyName: e.target.value }))}
                  style={{ width:'100%', background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)', padding:'9px 12px', borderRadius:6, fontSize:14, boxSizing:'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize:12, color:'var(--text-2)', display:'block', marginBottom:6 }}>Logo URL</label>
                <input
                  type="url" placeholder="https://your-domain.com/logo.png"
                  value={branding.logoUrl}
                  onChange={e => setBranding(p => ({ ...p, logoUrl: e.target.value }))}
                  style={{ width:'100%', background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)', padding:'9px 12px', borderRadius:6, fontSize:14, boxSizing:'border-box' }}
                />
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>Leave blank to use the KBOOS logo</div>
              </div>
              <div>
                <label style={{ fontSize:12, color:'var(--text-2)', display:'block', marginBottom:6 }}>Portal Accent Colour</label>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <input type="color" value={branding.accentColor} onChange={e => setBranding(p => ({ ...p, accentColor: e.target.value }))}
                    style={{ width:44, height:40, borderRadius:6, border:'1px solid var(--border)', cursor:'pointer', padding:2, background:'var(--bg-2)' }} />
                  <input type="text" value={branding.accentColor} onChange={e => setBranding(p => ({ ...p, accentColor: e.target.value }))}
                    style={{ width:120, background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)', padding:'8px 12px', borderRadius:6, fontSize:13, fontFamily:'var(--font-mono)' }} />
                  <span style={{ fontSize:12, color:'var(--muted)' }}>Used for buttons and highlights in the client portal</span>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="card fade-up-1" style={{ border:'1px solid var(--border)' }}>
            <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12, fontWeight:600 }}>Portal Preview</div>
            <div style={{ borderRadius:12, overflow:'hidden', border:'1px solid var(--border)' }}>
              <div style={{ padding:'14px 20px', background:'var(--bg-2)', display:'flex', alignItems:'center', gap:12, borderBottom:'1px solid var(--border)' }}>
                {branding.logoUrl ? (
                  <img src={branding.logoUrl} alt="logo" style={{ height:28, borderRadius:4 }} onError={e => { e.target.style.display='none'; }} />
                ) : (
                  <div style={{ width:28, height:28, borderRadius:6, background: branding.accentColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:'#fff', fontWeight:700 }}>K</div>
                )}
                <span style={{ fontWeight:600, fontSize:14 }}>{branding.companyName || 'KOBIS Outreach'}</span>
                <span style={{ marginLeft:'auto', fontSize:11, color:'var(--muted)' }}>Client Portal</span>
              </div>
              <div style={{ padding:'16px 20px' }}>
                <div style={{ height:8, background:'var(--border)', borderRadius:4, width:'60%', marginBottom:8 }}/>
                <div style={{ height:8, background:'var(--border)', borderRadius:4, width:'40%', marginBottom:16, opacity:0.5 }}/>
                <div style={{ display:'inline-block', padding:'8px 18px', borderRadius:8, background: branding.accentColor, color:'#fff', fontSize:12, fontWeight:600 }}>View Campaign →</div>
              </div>
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button className="btn btn-blue" onClick={saveBranding} disabled={brandingSaving}>
              {brandingSaving ? 'Saving…' : 'Save Branding'}
            </button>
          </div>
        </div>
      )}
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
          <div style={{ color:'var(--text-2)', fontSize:13, marginBottom:16, lineHeight:1.6 }}>
            Copy this link and send it via WhatsApp, email, or any platform. The team member clicks it to set their own password.
          </div>
          <div style={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', fontFamily:'var(--font-mono)', fontSize:12, wordBreak:'break-all', color:'var(--text-1)', marginBottom:14 }}>
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
