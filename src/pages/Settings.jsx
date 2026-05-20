import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { useWalletStore } from '../store/useWalletStore.js';
import { useRole } from '../hooks/useRole.js';
import { settingsService } from '../services/settings.js';
import { TeamMemberSlideOver } from '../components/ui/TeamMemberSlideOver.jsx';
import { googleDriveService } from '../services/googleDrive.js';
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

export function Settings() {
  const { showToast, businesses } = useAppStore(useShallow(s => ({ showToast: s.showToast, businesses: s.businesses })));
  const { canAccessSettingsTab, isAdmin } = useRole();

  const { wallet, init: initWallet, initiateTopUp } = useWalletStore();

  const [tab, setTab] = useState('api');
  const [settings, setSettings] = useState({});
  const [apiKeys, setApiKeys] = useState({});
  const [showKey, setShowKey] = useState({});
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveJsonText, setDriveJsonText] = useState('');
  const [driveUploading, setDriveUploading] = useState(false);
  const [topUpAmt, setTopUpAmt] = useState(100);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [newMember, setNewMember] = useState({ name:'', email:'', role:'Operator' });
  const [newClient, setNewClient] = useState({ name:'', email:'', bizId:'' });
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFreq, setScheduleFreq] = useState('weekly');

  useEffect(() => {
    const pendingTab = sessionStorage.getItem('settingsTab');
    if (pendingTab) {
      setTab(pendingTab);
      sessionStorage.removeItem('settingsTab');
    }
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
      setSettings(s || {});
      if (s?.apiKeys) {
        const keys = {};
        APIS.forEach(api => { keys[api] = s.apiKeys[api] || ''; });
        setApiKeys(keys);
      }
    }).catch(() => {});
    apiFetch('/settings/drive-status').then(r => setDriveConnected(r.connected)).catch(() => {});
  }, []);

  async function saveApiKey(api) {
    const val = apiKeys[api] || '';
    if (!val || val.startsWith('••••')) {
      showToast('Clear the field and enter a new key to update', 'amber');
      return;
    }
    try {
      await settingsService.saveApiKey(api, val);
      showToast(`${API_LABELS[api]} key saved`, 'green');
      setApiKeys(prev => ({ ...prev, [api]: '••••••••' + val.slice(-4) }));
    } catch {
      showToast('Failed to save key', 'red');
    }
  }

  async function testConnection(api) {
    showToast(`Testing ${API_LABELS[api]}...`, 'blue');
    try {
      const result = await settingsService.testConnection(api);
      showToast(result.ok ? `${API_LABELS[api]} connected ✓` : `${API_LABELS[api]} failed: ${result.error}`, result.ok ? 'green' : 'red');
    } catch {
      showToast(`${API_LABELS[api]} connection failed`, 'red');
    }
  }

  async function handleTopUp() {
    if (topUpAmt < 1) return;
    setTopUpLoading(true);
    try {
      await initiateTopUp(topUpAmt);
    } catch (e) {
      showToast(e.message || 'Top-up failed', 'red');
      setTopUpLoading(false);
    }
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

  const [inviteLink, setInviteLink] = useState('');
  const [users, setUsers] = useState([]);
  const [openMember, setOpenMember] = useState(null);

  async function loadUsers() {
    try {
      const list = await apiFetch('/settings/users');
      setUsers(list || []);
    } catch { /* not admin */ }
  }

  async function addClient() {
    if (!newClient.name || !newClient.email || !newClient.bizId) {
      showToast('Fill in name, email, and select a business', 'amber');
      return;
    }
    try {
      const result = await settingsService.saveTeamMember({ ...newClient, role: 'client' });
      setNewClient({ name:'', email:'', bizId:'' });
      await loadUsers();
      if (result.inviteLink) {
        setInviteLink(result.inviteLink);
      } else {
        showToast(`${newClient.name} added as client`, 'green');
      }
    } catch (e) {
      showToast(e.message || 'Failed to add client', 'red');
    }
  }

  async function addTeamMember() {
    if (!newMember.name || !newMember.email) return;
    try {
      const result = await settingsService.saveTeamMember(newMember);
      setNewMember({ name:'', email:'', role:'Operator' });
      await loadUsers();
      if (result.inviteLink) {
        setInviteLink(result.inviteLink);
      } else {
        showToast(`${newMember.name} added`, 'green');
      }
    } catch (e) {
      showToast(e.message || 'Failed to add team member', 'red');
    }
  }

  async function removeTeamMember(id) {
    try {
      await apiFetch(`/settings/users/${id}`, { method: 'DELETE' });
      await loadUsers();
      showToast('Team member removed', 'amber');
    } catch {
      showToast('Failed to remove team member', 'red');
    }
  }

  const tabs = [
    { id:'api', label:'API Keys' },
    { id:'team', label:'Team' },
    { id:'clients', label:'Clients' },
    { id:'wallet', label:'Wallet' },
    { id:'drive', label:'Google Drive' },
    { id:'billing', label:'Billing' },
  ].filter(t => canAccessSettingsTab(t.id));

  return (
    <>
    <div className="page">
      <div className="fade-up mb-4">
        <div className="breadcrumb">System / <span>Settings</span></div>
        <h1 className="page-title" style={{marginTop:4}}>Settings</h1>
      </div>

      <div className="tabs fade-up-1 mb-4">
        {tabs.map(t => (
          <div key={t.id} className={`tab${tab===t.id?' active':''}`} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === 'wallet' && (
              <span style={{marginLeft:6, fontFamily:'var(--font-mono)', fontSize:11, color:'var(--green)'}}>
                RM {wallet.balance}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* API Keys */}
      {tab === 'api' && (
        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          {APIS.map(api => (
            <div key={api} className="card fade-up">
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
                <div style={{fontWeight:600}}>{API_LABELS[api]}</div>
                <button className="btn" style={{fontSize:12, padding:'3px 10px'}} onClick={() => testConnection(api)}>
                  Test Connection
                </button>
              </div>
              <div style={{display:'flex', gap:8}}>
                <div style={{position:'relative', flex:1}}>
                  <input
                    type={showKey[api] ? 'text' : 'password'}
                    value={apiKeys[api] || ''}
                    onChange={e => setApiKeys(prev => ({...prev, [api]: e.target.value}))}
                    placeholder={`Enter ${API_LABELS[api]} API key`}
                    style={{
                      width:'100%', background:'var(--bg-2)', border:'1px solid var(--border)',
                      color:'var(--text-1)', padding:'8px 36px 8px 12px', borderRadius:6, fontSize:13,
                      fontFamily: showKey[api] ? 'var(--font-mono)' : 'inherit',
                    }}
                  />
                  <button
                    style={{
                      position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                      background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:14
                    }}
                    onClick={() => setShowKey(prev => ({...prev, [api]: !prev[api]}))}
                  >
                    {showKey[api] ? '🙈' : '👁'}
                  </button>
                </div>
                <button className="btn btn-green" style={{flexShrink:0}} onClick={() => saveApiKey(api)}>Save</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Team */}
      {tab === 'team' && (
        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          <div className="card fade-up">
            <div style={{fontWeight:600, marginBottom:12}}>Invite Team Member</div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr auto auto', gap:8}}>
              <input
                placeholder="Name"
                value={newMember.name}
                onChange={e => setNewMember(p => ({...p, name:e.target.value}))}
                style={{
                  background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)',
                  padding:'8px 12px', borderRadius:6, fontSize:13
                }}
              />
              <input
                placeholder="Email"
                value={newMember.email}
                onChange={e => setNewMember(p => ({...p, email:e.target.value}))}
                style={{
                  background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)',
                  padding:'8px 12px', borderRadius:6, fontSize:13
                }}
              />
              <select
                value={newMember.role}
                onChange={e => setNewMember(p => ({...p, role:e.target.value}))}
                style={{
                  background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)',
                  padding:'8px 12px', borderRadius:6, fontSize:13
                }}
              >
                <option>Admin</option>
                <option>Operator</option>
                <option>Viewer</option>
              </select>
              <button className="btn btn-blue" onClick={addTeamMember}>Invite</button>
            </div>
          </div>
          <div className="card fade-up-1">
            <div style={{fontWeight:600, marginBottom:12}}>Current Team</div>
            {users.filter(u => u.role !== 'client').length === 0 ? (
              <div style={{color:'var(--text-3)', fontSize:13}}>No team members yet.</div>
            ) : (
              <table className="table" style={{width:'100%'}}>
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {users.filter(u => u.role !== 'client').map(m => (
                    <tr key={m.id} style={{cursor:'pointer'}} onClick={() => setOpenMember(m)}>
                      <td style={{fontWeight:500}}>{m.name}</td>
                      <td style={{color:'var(--text-2)'}}>{m.email}</td>
                      <td><span className="badge badge-blue" style={{textTransform:'capitalize'}}>{m.role}</span></td>
                      <td><span className={`badge badge-${m.pending ? 'amber' : 'green'}`}>{m.pending ? 'Invite Pending' : 'Active'}</span></td>
                      <td>
                        <button
                          className="btn"
                          style={{fontSize:11, padding:'3px 8px', color:'var(--muted)', border:'1px solid var(--border)'}}
                          onClick={e => { e.stopPropagation(); setOpenMember(m); }}
                        >View →</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Clients */}
      {tab === 'clients' && (
        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          <div className="card fade-up">
            <div style={{fontWeight:600, marginBottom:4}}>Add Client Portal Access</div>
            <div style={{color:'var(--text-3)', fontSize:12, marginBottom:14}}>
              Client receives an invite link to set their password. They log in and see only their business data.
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:8}}>
              <input
                placeholder="Contact name"
                value={newClient.name}
                onChange={e => setNewClient(p => ({...p, name:e.target.value}))}
                style={{
                  background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)',
                  padding:'8px 12px', borderRadius:6, fontSize:13
                }}
              />
              <input
                placeholder="Email address"
                value={newClient.email}
                onChange={e => setNewClient(p => ({...p, email:e.target.value}))}
                style={{
                  background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)',
                  padding:'8px 12px', borderRadius:6, fontSize:13
                }}
              />
              <select
                value={newClient.bizId}
                onChange={e => setNewClient(p => ({...p, bizId:e.target.value}))}
                style={{
                  background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)',
                  padding:'8px 12px', borderRadius:6, fontSize:13
                }}
              >
                <option value="">— Select Business —</option>
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <button className="btn btn-green" onClick={addClient}>Send Invite</button>
            </div>
          </div>
          <div className="card fade-up-1">
            <div style={{fontWeight:600, marginBottom:12}}>Client Portal Users</div>
            {users.filter(u => u.role === 'client').length === 0 ? (
              <div style={{color:'var(--text-3)', fontSize:13}}>No client users yet. Add one above to give a business client access to their portal.</div>
            ) : (
              <table className="table" style={{width:'100%'}}>
                <thead><tr><th>Name</th><th>Email</th><th>Business</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {users.filter(u => u.role === 'client').map(m => {
                    const biz = businesses.find(b => b.id === m.bizId);
                    return (
                      <tr key={m.id}>
                        <td style={{fontWeight:500}}>{m.name}</td>
                        <td style={{color:'var(--text-2)'}}>{m.email}</td>
                        <td>
                          {biz
                            ? <span className={`badge badge-${biz.color || 'blue'}`}>{biz.name}</span>
                            : <span style={{color:'var(--text-3)',fontSize:12}}>—</span>
                          }
                        </td>
                        <td><span className={`badge badge-${m.pending ? 'amber' : 'green'}`}>{m.pending ? 'Invite Pending' : 'Active'}</span></td>
                        <td>
                          <button
                            className="btn"
                            style={{fontSize:11, padding:'3px 8px', color:'var(--red)', border:'1px solid var(--red)'}}
                            onClick={() => { if (window.confirm(`Remove ${m.name}?`)) removeTeamMember(m.id); }}
                          >Remove</button>
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

      {/* Wallet */}
      {tab === 'wallet' && (
        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          <div className="card fade-up" style={{
            background:'oklch(65% 0.2 145 / 0.08)', border:'1px solid oklch(65% 0.2 145 / 0.3)'
          }}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <div>
                <div style={{color:'var(--text-2)', fontSize:12, marginBottom:4}}>Current Balance</div>
                <div style={{fontFamily:'var(--font-mono)', fontSize:32, fontWeight:700, color:'var(--green)'}}>
                  RM {wallet.balance?.toFixed(2) || '0.00'}
                </div>
              </div>
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                <input
                  type="number" min={1} value={topUpAmt}
                  onChange={e => setTopUpAmt(Number(e.target.value))}
                  style={{
                    background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)',
                    padding:'8px 12px', borderRadius:6, width:100, fontFamily:'var(--font-mono)', fontSize:14
                  }}
                />
                <button className="btn btn-green" onClick={handleTopUp} disabled={topUpLoading}>
                  {topUpLoading ? 'Redirecting...' : 'Top Up'}
                </button>
              </div>
            </div>
            <div style={{color:'var(--text-3)', fontSize:11, marginTop:10}}>
              You will be redirected to Billplz FPX to complete the payment. Balance updates automatically after payment.
            </div>
          </div>

          {wallet.transactions?.length > 0 && (
            <div className="card fade-up-1">
              <div style={{fontWeight:600, marginBottom:12}}>Transaction History</div>
              <table className="table" style={{width:'100%'}}>
                <thead><tr><th>Date</th><th>Type</th><th>Amount (RM)</th><th>Status</th><th>Note</th></tr></thead>
                <tbody>
                  {wallet.transactions.slice(0, 20).map(tx => (
                    <tr key={tx.id}>
                      <td style={{color:'var(--text-2)', fontSize:12}}>{new Date(tx.createdAt).toLocaleDateString('en-MY')}</td>
                      <td><span className={`badge badge-${tx.type==='topup'?'green':'amber'}`}>{tx.type}</span></td>
                      <td style={{fontFamily:'var(--font-mono)', color:'var(--green)'}}>
                        +{(tx.amountSen / 100).toFixed(2)}
                      </td>
                      <td>
                        <span className={`badge badge-${tx.status==='paid'?'green':tx.status==='pending'?'amber':'red'}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td style={{color:'var(--text-2)', fontSize:12}}>{tx.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="card fade-up-2" style={{background:'var(--bg-2)'}}>
            <div style={{fontWeight:600, marginBottom:8, color:'var(--amber)'}}>Setup Required</div>
            <div style={{color:'var(--text-2)', fontSize:13, lineHeight:1.6}}>
              To enable Billplz top-up, go to <strong>API Keys</strong> tab and add:<br/>
              • <span style={{fontFamily:'var(--font-mono)'}}>Billplz API Key</span><br/>
              • <span style={{fontFamily:'var(--font-mono)'}}>Billplz Collection ID</span><br/>
              • <span style={{fontFamily:'var(--font-mono)'}}>Billplz X-Signature Key</span> (from Billplz → My Account → Webhooks)
            </div>
          </div>
        </div>
      )}

      {/* Google Drive */}
      {tab === 'drive' && (
        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          <div className="card fade-up" style={{border: driveConnected ? '1px solid var(--green)' : '1px solid var(--border)'}}>
            <div style={{display:'flex', alignItems:'center', gap:16, marginBottom: driveConnected ? 0 : 16}}>
              <div style={{width:48,height:48,borderRadius:12,background:driveConnected?'oklch(65% 0.2 145 / 0.15)':'var(--bg-2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>
                📁
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,marginBottom:2}}>Google Drive — Service Account</div>
                <div style={{color:'var(--text-2)',fontSize:13}}>
                  {driveConnected
                    ? 'Connected — campaign lead sheets will be created automatically in your Drive'
                    : 'Paste your Google service account JSON key below to enable auto-sheet creation'}
                </div>
              </div>
              {driveConnected && (
                <span style={{fontSize:12,color:'var(--green)',fontWeight:600,border:'1px solid var(--green)',borderRadius:6,padding:'4px 10px'}}>✓ Connected</span>
              )}
            </div>

            {!driveConnected && (
              <>
                <div style={{fontSize:12,color:'var(--text-3)',marginBottom:8,lineHeight:1.6}}>
                  1. Go to <strong>console.cloud.google.com</strong> → IAM & Admin → Service Accounts<br/>
                  2. Create a service account, enable Drive API + Sheets API, create a JSON key<br/>
                  3. Paste the entire JSON key file contents below
                </div>
                <textarea
                  value={driveJsonText}
                  onChange={e => setDriveJsonText(e.target.value)}
                  placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  ...\n}'}
                  rows={8}
                  style={{
                    width:'100%', background:'var(--bg-2)', border:'1px solid var(--border)',
                    color:'var(--text-1)', borderRadius:6, padding:'10px 12px', fontSize:12,
                    fontFamily:'var(--font-mono)', resize:'vertical', boxSizing:'border-box',
                  }}
                />
                <div style={{display:'flex',justifyContent:'flex-end',marginTop:10}}>
                  <button className="btn btn-green" onClick={handleDriveSave} disabled={driveUploading || !driveJsonText.trim()}>
                    {driveUploading ? 'Saving…' : 'Save & Connect'}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="card fade-up-1">
            <div style={{fontWeight:600,marginBottom:12}}>How It Works</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[
                { step:'1', text:'Google Maps scrapes leads → sheet created in your Drive automatically' },
                { step:'2', text:'Apollo enrichment updates the same sheet with decision maker emails' },
                { step:'3', text:'You get a direct link to the sheet in the Approvals page to review before launch' },
                { step:'4', text:'No manual export needed — it\'s always up to date' },
              ].map(item => (
                <div key={item.step} style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                  <div style={{width:24,height:24,borderRadius:'50%',background:'var(--blue-dim)',color:'var(--blue)',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{item.step}</div>
                  <div style={{color:'var(--text-2)',fontSize:13,paddingTop:3}}>{item.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Billing */}
      {tab === 'billing' && (
        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12}}>
            {[
              { name:'Starter', price:'RM 167', contacts:600, features:['1 Business','1 Campaign','Email only'], current: false },
              { name:'Growth', price:'RM 297', contacts:2400, features:['3 Businesses','5 Campaigns','Email + WA'], current: true },
              { name:'Pro', price:'RM 497', contacts:5000, features:['Unlimited','10 Campaigns','Email+WA+Call+AI'], current: false },
            ].map(tier => (
              <div key={tier.name} className="card fade-up" style={{
                border: tier.current ? '1px solid var(--blue)' : '1px solid var(--border)',
                position:'relative'
              }}>
                {tier.current && (
                  <div style={{
                    position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)',
                    background:'var(--blue)', color:'#000', fontSize:10, fontWeight:700,
                    padding:'2px 10px', borderRadius:10
                  }}>CURRENT</div>
                )}
                <div style={{fontWeight:700, fontSize:16, marginBottom:4}}>{tier.name}</div>
                <div style={{fontFamily:'var(--font-mono)', fontSize:24, color:'var(--blue)', fontWeight:700, marginBottom:8}}>
                  {tier.price}<span style={{fontSize:14, color:'var(--text-2)'}}>/mo</span>
                </div>
                <div style={{color:'var(--text-2)', fontSize:12, marginBottom:12}}>
                  {tier.contacts.toLocaleString()} contacts/mo
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:6}}>
                  {tier.features.map(f => (
                    <div key={f} style={{display:'flex', gap:8, fontSize:12}}>
                      <span style={{color:'var(--green)'}}>✓</span>
                      <span style={{color:'var(--text-2)'}}>{f}</span>
                    </div>
                  ))}
                </div>
                {!tier.current && (
                  <button className="btn btn-blue" style={{width:'100%', marginTop:16, fontSize:13}}>
                    Upgrade
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="card fade-up-1">
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <div>
                <div style={{fontWeight:600, marginBottom:4}}>Automated PDF Reports</div>
                <div style={{color:'var(--text-2)', fontSize:13}}>Auto-generate and send reports on a schedule</div>
              </div>
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                <select
                  value={scheduleFreq}
                  onChange={e => setScheduleFreq(e.target.value)}
                  disabled={!scheduleEnabled}
                  style={{
                    background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)',
                    padding:'6px 10px', borderRadius:6, fontSize:12
                  }}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
                <button
                  className={scheduleEnabled ? 'btn btn-green' : 'btn'}
                  onClick={() => {
                    setScheduleEnabled(p => !p);
                    showToast(!scheduleEnabled ? `${scheduleFreq} reports enabled` : 'Report schedule disabled', 'green');
                  }}
                >
                  {scheduleEnabled ? 'Enabled' : 'Enable'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

      {openMember && (
        <TeamMemberSlideOver
          member={openMember}
          onClose={() => setOpenMember(null)}
          onUpdated={(updated) => {
            setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
            setOpenMember(prev => ({ ...prev, ...updated }));
          }}
          onRemoved={(id) => setUsers(prev => prev.filter(u => u.id !== id))}
          showToast={showToast}
        />
      )}

      {/* Invite link modal — rendered outside page div so it overlays everything */}
      {inviteLink && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24}}>
          <div className="card" style={{width:'100%', maxWidth:500, border:'1px solid oklch(65% 0.2 145 / 0.5)'}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16}}>
              <div style={{fontWeight:700, fontSize:16, color:'var(--green)'}}>Invite Link Ready</div>
              <button className="btn" style={{fontSize:12}} onClick={() => setInviteLink('')}>✕ Close</button>
            </div>
            <div style={{color:'var(--text-2)', fontSize:13, marginBottom:16, lineHeight:1.6}}>
              Copy this link and send it via WhatsApp, email, or any platform. The team member clicks it to set their own password.
            </div>
            <div style={{background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', fontFamily:'var(--font-mono)', fontSize:12, wordBreak:'break-all', color:'var(--text-1)', marginBottom:14}}>
              {inviteLink}
            </div>
            <div style={{display:'flex', gap:8}}>
              <button
                className="btn btn-green"
                style={{flex:1, fontSize:14, padding:'10px'}}
                onClick={() => { navigator.clipboard.writeText(inviteLink); showToast('Link copied — paste it in WhatsApp or email', 'green'); }}
              >
                Copy Link
              </button>
              <button className="btn" style={{fontSize:13}} onClick={() => setInviteLink('')}>Done</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
