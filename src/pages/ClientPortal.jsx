import { useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../services/api.js';

export function ClientPortal() {
  const { businesses, campaigns, leads } = useAppStore(useShallow(s => ({
    businesses: s.businesses,
    campaigns: s.campaigns,
    leads: s.leads,
  })));

  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [email, setEmail] = useState('client@gadong.my');
  const [selectedBiz, setSelectedBiz] = useState('GS');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function tryLogin() {
    setLoading(true);
    setError('');
    try {
      await apiFetch('/auth/login', { method: 'POST', body: { email, password: pw } });
      setAuthed(true);
    } catch {
      setError('Incorrect email or password');
    } finally {
      setLoading(false);
    }
  }

  if (!authed) {
    return (
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'center',
        minHeight:'60vh'
      }}>
        <div className="card" style={{width:360, padding:32, textAlign:'center'}}>
          <div style={{marginBottom:8, fontSize:13, color:'var(--text-3)', fontFamily:'var(--font-mono)'}}>
            CLIENT PORTAL
          </div>
          <h2 style={{marginBottom:4}}>Client Portal</h2>
          <div style={{color:'var(--text-2)', fontSize:13, marginBottom:24}}>Sign in to view your campaign stats</div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && tryLogin()}
            style={{
              width:'100%', background:'var(--bg-2)', border:'1px solid var(--border)',
              color:'var(--text-1)', padding:'10px 14px', borderRadius:6,
              fontSize:14, marginBottom:8
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && tryLogin()}
            style={{
              width:'100%', background:'var(--bg-2)', border:'1px solid var(--border)',
              color:'var(--text-1)', padding:'10px 14px', borderRadius:6,
              fontSize:14, marginBottom:8
            }}
          />
          {error && <div style={{color:'var(--red)', fontSize:12, marginBottom:8}}>{error}</div>}
          <button className="btn btn-blue" style={{width:'100%'}} onClick={tryLogin} disabled={loading}>
            {loading ? 'Signing in...' : 'View My Dashboard'}
          </button>
          <div style={{color:'var(--text-3)', fontSize:11, marginTop:12}}>
            Default: client@gadong.my / gadong123
          </div>
        </div>
      </div>
    );
  }

  // Derive stats from real store data
  const bizCampaigns = campaigns.filter(c => c.biz === selectedBiz);
  const totalLeads = bizCampaigns.reduce((sum, c) => sum + (c.leads || 0), 0);
  const hotLeads = bizCampaigns.reduce((sum, c) => sum + (c.hot || 0), 0);
  const totalSpend = bizCampaigns.reduce((sum, c) => {
    const val = parseInt((c.spend || 'RM 0').replace('RM','').replace(' ',''));
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
  const activeCampaigns = bizCampaigns.filter(c => c.status === 'active').length;
  const avgOpen = bizCampaigns.length > 0
    ? Math.round(bizCampaigns.reduce((sum, c) => {
        const pct = parseFloat((c.open || '0').replace('%',''));
        return sum + (isNaN(pct) ? 0 : pct);
      }, 0) / bizCampaigns.length * 10) / 10
    : 0;
  const biz = businesses.find(b => b.id === selectedBiz);

  const stats = [
    { label:'Total Leads', val: totalLeads.toLocaleString(), color:'var(--blue)' },
    { label:'Hot Leads', val: hotLeads, color:'var(--amber)' },
    { label:'Active Campaigns', val: activeCampaigns, color:'var(--green)' },
    { label:'Avg Open Rate', val: `${avgOpen}%`, color:'var(--green)' },
    { label:'Total Spend', val: `RM ${totalSpend}`, color:'var(--text-1)' },
  ];

  return (
    <div className="page">
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24
      }}>
        <div>
          <div className="breadcrumb">Client Portal</div>
          <h1 className="page-title" style={{marginTop:4}}>
            {biz?.name || selectedBiz} — Campaign Overview
          </h1>
          <div style={{
            display:'inline-block', background:'var(--green-dim)', color:'var(--green)',
            fontSize:11, fontWeight:600, padding:'2px 10px', borderRadius:10, marginTop:6,
            fontFamily:'var(--font-mono)', letterSpacing:'0.08em'
          }}>READ-ONLY VIEW</div>
        </div>
        <button
          className="btn"
          style={{border:'1px solid var(--red)', color:'var(--red)', fontSize:13}}
          onClick={() => { setAuthed(false); setPw(''); }}
        >
          Sign Out
        </button>
      </div>

      {/* Stat Grid */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:12, marginBottom:20}}>
        {stats.map((s, i) => (
          <div key={s.label} className={`card fade-up-${i}`}>
            <div style={{color:'var(--text-2)', fontSize:11, marginBottom:6}}>{s.label}</div>
            <div style={{fontFamily:'var(--font-mono)', fontSize:22, fontWeight:700, color:s.color}}>
              {s.val}
            </div>
          </div>
        ))}
      </div>

      {/* Campaign Cards */}
      <div style={{display:'flex', flexDirection:'column', gap:10}}>
        {bizCampaigns.map((c, i) => (
          <div key={c.id} className={`card fade-up-${Math.min(i+1,5)}`}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
              <div>
                <div style={{fontWeight:600}}>{c.name}</div>
                <div style={{color:'var(--text-2)', fontSize:12}}>{c.tier} tier · {c.bizName}</div>
              </div>
              <span className={`badge badge-${c.status === 'active' ? 'green' : c.status === 'awaiting_approval' ? 'amber' : 'muted'}`}>
                {c.status === 'awaiting_approval' ? 'Under Review' : c.status}
              </span>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:8}}>
              {[
                { label:'Leads', val: (c.leads||0).toLocaleString() },
                { label:'Hot', val: c.hot || 0 },
                { label:'Open Rate', val: c.open || '0%' },
                { label:'WA Response', val: c.wa || '—' },
                { label:'Spend', val: c.spend || 'RM 0' },
              ].map(stat => (
                <div key={stat.label} style={{background:'var(--bg-2)', borderRadius:6, padding:'8px 10px'}}>
                  <div style={{color:'var(--text-3)', fontSize:10, marginBottom:3}}>{stat.label}</div>
                  <div style={{fontFamily:'var(--font-mono)', fontWeight:600, fontSize:14}}>{stat.val}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {bizCampaigns.length === 0 && (
        <div className="card" style={{textAlign:'center', padding:48, color:'var(--text-3)'}}>
          No campaigns found for this business.
        </div>
      )}
    </div>
  );
}
