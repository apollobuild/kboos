import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { useWalletStore } from '../store/useWalletStore.js';
import { settingsService } from '../services/settings.js';
import { googleDriveService } from '../services/googleDrive.js';
import { apiFetch } from '../services/api.js';

const APIS = ['claude', 'sendgrid', 'wati', 'apollo', 'billplz_api_key', 'billplz_collection_id', 'billplz_x_signature_key'];
const API_LABELS = {
  claude: 'Claude (Anthropic)',
  sendgrid: 'SendGrid',
  wati: 'WATI (WhatsApp)',
  apollo: 'Apollo.io',
  billplz_api_key: 'Billplz — API Key',
  billplz_collection_id: 'Billplz — Collection ID',
  billplz_x_signature_key: 'Billplz — X-Signature Key',
};

export function Settings() {
  const { showToast } = useAppStore(useShallow(s => ({ showToast: s.showToast })));

  const { wallet, init: initWallet, initiateTopUp } = useWalletStore();

  const [tab, setTab] = useState('api');
  const [settings, setSettings] = useState({});
  const [apiKeys, setApiKeys] = useState({});
  const [showKey, setShowKey] = useState({});
  const [driveConnected, setDriveConnected] = useState(googleDriveService.isConnected());
  const [topUpAmt, setTopUpAmt] = useState(100);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [newMember, setNewMember] = useState({ name:'', email:'', role:'Operator' });
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFreq, setScheduleFreq] = useState('weekly');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('topup') === 'done') {
      setTab('wallet');
      showToast('Payment received — balance updated', 'green');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    initWallet();
    settingsService.get().then(s => {
      setSettings(s || {});
      if (s?.apiKeys) {
        const keys = {};
        APIS.forEach(api => { keys[api] = s.apiKeys[api] || ''; });
        setApiKeys(keys);
      }
    }).catch(() => {});
    setDriveConnected(googleDriveService.isConnected());
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

  function handleDriveConnect() {
    if (driveConnected) {
      googleDriveService.disconnect();
      setDriveConnected(false);
      showToast('Google Drive disconnected', 'amber');
    } else {
      googleDriveService.connect();
      setDriveConnected(true);
      showToast('Google Drive connected', 'green');
    }
  }

  const [inviteLink, setInviteLink] = useState('');

  async function addTeamMember() {
    if (!newMember.name || !newMember.email) return;
    try {
      const result = await settingsService.saveTeamMember(newMember);
      setNewMember({ name:'', email:'', role:'Operator' });
      if (result.inviteLink) {
        setInviteLink(result.inviteLink);
        showToast(`Invite sent to ${result.email}`, 'green');
      } else {
        showToast(`${newMember.name} added`, 'green');
      }
    } catch (e) {
      showToast(e.message || 'Failed to add team member', 'red');
    }
  }

  async function removeTeamMember(id) {
    try {
      await settingsService.removeTeamMember(id);
      const s = await settingsService.get();
      setSettings(s || {});
      showToast('Team member removed', 'amber');
    } catch {
      showToast('Failed to remove team member', 'red');
    }
  }

  const tabs = [
    { id:'api', label:'API Keys' },
    { id:'team', label:'Team' },
    { id:'wallet', label:'Wallet' },
    { id:'drive', label:'Google Drive' },
    { id:'billing', label:'Billing' },
  ];

  return (
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
            {inviteLink && (
              <div style={{marginTop:14, background:'oklch(65% 0.2 145 / 0.08)', border:'1px solid oklch(65% 0.2 145 / 0.3)', borderRadius:8, padding:'12px 14px'}}>
                <div style={{fontSize:12, color:'var(--text-2)', marginBottom:6}}>
                  Invite link (share this if email is not configured):
                </div>
                <div style={{display:'flex', gap:8}}>
                  <input readOnly value={inviteLink} style={{flex:1, background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)', padding:'6px 10px', borderRadius:6, fontSize:11, fontFamily:'var(--font-mono)'}} />
                  <button className="btn btn-green" style={{fontSize:12, flexShrink:0}} onClick={() => { navigator.clipboard.writeText(inviteLink); showToast('Link copied', 'green'); }}>Copy</button>
                  <button className="btn" style={{fontSize:12, flexShrink:0}} onClick={() => setInviteLink('')}>✕</button>
                </div>
              </div>
            )}
          </div>
          <div className="card fade-up-1">
            <div style={{fontWeight:600, marginBottom:12}}>Current Team</div>
            {(settings.team || []).length === 0 ? (
              <div style={{color:'var(--text-3)', fontSize:13}}>No team members yet.</div>
            ) : (
              <table className="table" style={{width:'100%'}}>
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
                <tbody>
                  {(settings.team || []).map(m => (
                    <tr key={m.email}>
                      <td style={{fontWeight:500}}>{m.name}</td>
                      <td style={{color:'var(--text-2)'}}>{m.email}</td>
                      <td><span className="badge badge-blue">{m.role}</span></td>
                      <td>
                        <button
                          className="btn"
                          style={{fontSize:11, padding:'3px 8px', color:'var(--red)', border:'1px solid var(--red)'}}
                          onClick={() => removeTeamMember(m.id)}
                        >Remove</button>
                      </td>
                    </tr>
                  ))}
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
          <div className="card fade-up" style={{
            border: driveConnected ? '1px solid var(--green)' : '1px solid var(--border)'
          }}>
            <div style={{display:'flex', alignItems:'center', gap:16}}>
              <div style={{
                width:48, height:48, borderRadius:12,
                background: driveConnected ? 'oklch(65% 0.2 145 / 0.15)' : 'var(--bg-2)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0
              }}>
                📁
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600, marginBottom:2}}>Google Drive</div>
                <div style={{color:'var(--text-2)', fontSize:13}}>
                  {driveConnected
                    ? 'Connected — leads CSVs and PDF reports will sync automatically'
                    : 'Connect to auto-save leads and reports to Google Drive per campaign'}
                </div>
              </div>
              <button
                className={driveConnected ? 'btn' : 'btn btn-green'}
                style={driveConnected ? {border:'1px solid var(--red)', color:'var(--red)'} : {}}
                onClick={handleDriveConnect}
              >
                {driveConnected ? 'Disconnect' : 'Connect Drive'}
              </button>
            </div>
          </div>

          <div className="card fade-up-1">
            <div style={{fontWeight:600, marginBottom:12}}>How It Works</div>
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {[
                { step:'1', text:'Connect your Google account via OAuth' },
                { step:'2', text:'A "KBOOS" folder is created in your Drive' },
                { step:'3', text:'Each campaign gets its own subfolder' },
                { step:'4', text:'Leads export as CSV and reports as PDF — auto-uploaded' },
              ].map(item => (
                <div key={item.step} style={{display:'flex', gap:12, alignItems:'flex-start'}}>
                  <div style={{
                    width:24, height:24, borderRadius:'50%', background:'var(--blue-dim)',
                    color:'var(--blue)', fontSize:12, fontWeight:700, display:'flex',
                    alignItems:'center', justifyContent:'center', flexShrink:0
                  }}>{item.step}</div>
                  <div style={{color:'var(--text-2)', fontSize:13, paddingTop:3}}>{item.text}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card fade-up-2" style={{background:'var(--bg-2)'}}>
            <div style={{fontWeight:600, marginBottom:8, color:'var(--amber)'}}>Production Setup Required</div>
            <div style={{color:'var(--text-2)', fontSize:13, lineHeight:1.6}}>
              To use real Google Drive sync:<br/>
              1. Go to <span style={{fontFamily:'var(--font-mono)'}}>console.cloud.google.com</span><br/>
              2. Enable the Google Drive API<br/>
              3. Create OAuth 2.0 credentials<br/>
              4. Add your domain to authorized redirect URIs<br/>
              5. Add the client ID and secret to your environment variables
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
  );
}
