import { useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { BizAvatar } from '../components/ui/BizAvatar.jsx';
import { TickerBar } from '../components/layout/TickerBar.jsx';
import { HealthPills } from '../components/layout/HealthPills.jsx';
import { CampaignBadge } from '../components/ui/CampaignBadge.jsx';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function HotLeadsPanel({ leads, campaigns }) {
  const { setPage, setSelectedBiz } = useAppStore(useShallow(s => ({
    setPage: s.setPage,
    setSelectedBiz: s.setSelectedBiz,
  })));
  const [handed, setHanded] = useState({});
  const hot = leads.filter(l => l.status === 'hot' || l.score >= 8).slice(0, 4);

  function handOff(lead) {
    const camp = campaigns.find(c => c.id === lead.campaignId);
    if (camp?.bizId) setSelectedBiz(camp.bizId);
    setPage('leads');
    setHanded(h => ({ ...h, [lead.id]: true }));
  }

  return (
    <div className="card" style={{height:'100%'}}>
      <div className="flex items-center justify-between mb-3">
        <div style={{fontWeight:600, fontSize:13}}>🔥 Hot Leads</div>
        <span className="badge amber">{hot.length} ready</span>
      </div>
      <div className="flex-col gap-2">
        {hot.length === 0 && (
          <div style={{color:'var(--muted)',fontSize:12,textAlign:'center',padding:'20px 0'}}>No hot leads yet</div>
        )}
        {hot.map(l => (
          <div key={l.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',background:'var(--s2)',borderRadius:8,border:'1px solid var(--border)'}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:500}}>{l.name}</div>
              <div style={{fontSize:11,color:'var(--muted)'}}>{l.company} · <span className="mono">{l.score}/10</span></div>
            </div>
            <span className={`badge ${l.score >= 8 ? 'amber' : 'gray'}`}>{l.score >= 8 ? 'High' : 'Med'}</span>
            {handed[l.id]
              ? <span style={{fontSize:11,color:'var(--muted)'}}>✓ Sent</span>
              : <button className="btn btn-amber btn-xs" onClick={() => handOff(l)}>Hand Off →</button>
            }
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityFeed({ activity }) {
  const [filter, setFilter] = useState('All');
  const tabs = ['All','Leads','Campaigns','System'];
  const filtered = filter === 'All' ? activity : activity.filter(a => a.tag === filter);
  return (
    <div className="card flex-col" style={{height:'100%'}}>
      <div className="flex items-center justify-between mb-3">
        <div style={{fontWeight:600, fontSize:13}}>Activity Feed</div>
        <div className="tabs">
          {tabs.map(t => <div key={t} className={`tab${filter===t?' active':''}`} onClick={() => setFilter(t)} style={{padding:'4px 10px',fontSize:11}}>{t}</div>)}
        </div>
      </div>
      <div className="flex-col" style={{gap:1,overflowY:'auto',flex:1}}>
        {filtered.length === 0 && (
          <div style={{color:'var(--muted)',fontSize:12,textAlign:'center',padding:'20px 0'}}>No activity yet</div>
        )}
        {filtered.map((a, i) => (
          <div key={a.id ?? i} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:`var(--${a.color})`,marginTop:5,flexShrink:0}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,color:'var(--text)'}}>{a.msg}</div>
              <div style={{fontSize:11,color:'var(--muted)'}}><span className="mono">{timeAgo(a.createdAt)}</span> · {a.tag}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { campaigns, businesses, leads, activity, setPage, toggleCampaign } = useAppStore(useShallow(s => ({
    campaigns: s.campaigns, businesses: s.businesses, leads: s.leads,
    activity: s.activity, setPage: s.setPage, toggleCampaign: s.toggleCampaign,
  })));
  const [bizFilter, setBizFilter] = useState(null);

  const totalLeads = leads.length;
  const hotLeads = leads.filter(l => l.status === 'hot' || l.score >= 8).length;
  const meetings = leads.filter(l => l.status === 'meeting_booked').length;
  const totalSpend = campaigns.reduce((sum, c) => {
    return sum + (parseInt((c.spend || '0').replace(/[^\d]/g, ''), 10) || 0);
  }, 0);
  const ratesWithData = campaigns.filter(c => c.open && parseFloat(c.open) > 0);
  const avgOpen = ratesWithData.length > 0
    ? (ratesWithData.reduce((s, c) => s + parseFloat(c.open), 0) / ratesWithData.length).toFixed(1) + '%'
    : '—';

  const stats = [
    { label: 'Total Leads', val: totalLeads.toLocaleString(), color: 'text' },
    { label: 'Hot Leads', val: hotLeads, color: 'amber' },
    { label: 'Meetings Booked', val: meetings, color: 'green' },
    { label: 'Open Rate', val: avgOpen, color: parseFloat(avgOpen) > 30 ? 'blue' : 'red' },
    { label: 'Spend Today', val: `RM ${totalSpend}`, color: 'muted' },
  ];

  const visibleCampaigns = campaigns.filter(c => !bizFilter || c.bizId === bizFilter);

  return (
    <div className="page">
      <div className="fade-up">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="breadcrumb">Overview / <span>Command Center</span></div>
            <h1 className="page-title" style={{marginTop:4}}>Command Center</h1>
          </div>
          <HealthPills />
        </div>
        <TickerBar />
      </div>

      <div className="fade-up-1 mt-4" style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10}}>
        {stats.map(s => (
          <div key={s.label} className="card-sm" style={{textAlign:'center',padding:'10px 8px'}}>
            <div className="mono" style={{fontSize:20,fontWeight:600,letterSpacing:'-0.02em',color:s.color==='text'?'var(--text)':s.color==='muted'?'var(--muted)':`var(--${s.color})`}}>{s.val}</div>
            <div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* First-time empty state */}
      {businesses.length === 0 && campaigns.length === 0 && (
        <div className="card fade-up-1 mt-4" style={{padding:'32px 24px',textAlign:'center'}}>
          <div style={{fontSize:28,marginBottom:12}}>👋</div>
          <div style={{fontWeight:600,fontSize:15,marginBottom:6,color:'var(--text-1)'}}>Welcome to KBOOS — here's how to get started</div>
          <div style={{color:'var(--muted)',fontSize:13,marginBottom:24}}>Three steps to your first outreach campaign</div>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            {[
              { step:'1', icon:'◈', label:'Add a Business', desc:'Set up your first client business and generate an AI outreach brief', action:'businesses', btn:'Add Business' },
              { step:'2', icon:'◉', label:'Create a Campaign', desc:'Choose channels, set up lead scraping, and define your sequence', action:'new-campaign', btn:'New Campaign' },
              { step:'3', icon:'⏳', label:'Review & Approve', desc:'Review scraped leads and approve the campaign to start outreach', action:'approval', btn:'Go to Approvals' },
            ].map(s => (
              <div key={s.step} className="card" style={{maxWidth:220,textAlign:'left',padding:'16px'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <span style={{width:22,height:22,borderRadius:'50%',background:'var(--accent-bg)',border:'1px solid var(--accent-border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'var(--accent)',flexShrink:0}}>{s.step}</span>
                  <span style={{fontSize:13,fontWeight:600}}>{s.label}</span>
                </div>
                <div style={{fontSize:12,color:'var(--muted)',marginBottom:12,lineHeight:1.5}}>{s.desc}</div>
                <button className="btn btn-sm" style={{width:'100%',fontSize:12}} onClick={() => setPage(s.action)}>{s.btn} →</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="fade-up-2 mt-4" style={{overflowX:'auto',paddingBottom:8}}>
        <div style={{display:'flex',gap:10,minWidth:'max-content'}}>
          {businesses.map(b => (
            <div key={b.id} className="card-sm" style={{minWidth:160,cursor:'pointer',border:`1px solid ${bizFilter===b.id?`var(--${b.color})`:'var(--border)'}`,transition:'all 0.15s',transform:bizFilter===b.id?'translateY(-2px)':'none'}}
              onClick={() => setBizFilter(bizFilter===b.id ? null : b.id)}>
              <div className="flex items-center gap-2 mb-2">
                <BizAvatar id={b.id} color={b.color} size={24}/>
                <span style={{fontSize:12,fontWeight:600}}>{b.name}</span>
              </div>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:6}}>{b.industry}</div>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span className="mono text-xs">{b.leads}<span style={{color:'var(--muted)'}}> leads</span></span>
                <span className="mono text-xs text-amber">{b.hot>0?`🔥${b.hot}`:''}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fade-up-3 mt-4 card">
        <div className="flex items-center justify-between mb-3">
          <div style={{fontWeight:600,fontSize:13}}>Active Campaigns</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage('new-campaign')}>＋ New Campaign</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Campaign</th><th>Status</th><th style={{minWidth:160}}>Progress</th><th>Hot</th><th>Open</th><th>WA Resp</th><th>Spend</th><th>Tier</th><th></th></tr>
            </thead>
            <tbody>
              {visibleCampaigns.map(c => {
                const pct = c.total > 0 ? Math.round((c.leads / c.total) * 100) : 0;
                return (
                  <tr key={c.id} className={c.status==='awaiting_approval'?'row-awaiting':''} style={{opacity:c.status==='paused'?0.7:1,cursor:'pointer'}} onClick={() => setPage('campaigns')}>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <BizAvatar id={c.bizId} color={c.color} size={26}/>
                        <div><div style={{fontSize:13,fontWeight:500}}>{c.name}</div><div style={{fontSize:11,color:'var(--muted)'}}>{c.bizName}</div></div>
                      </div>
                    </td>
                    <td><CampaignBadge status={c.status}/></td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:8,minWidth:120}}>
                        <div className="prog-bar" style={{flex:1}}><div className="prog-fill" style={{width:`${pct}%`,background:`var(--${c.color})`}}/></div>
                        <span className="mono text-sm" style={{color:'var(--muted)',whiteSpace:'nowrap'}}>{c.leads}<span style={{opacity:.5}}>/{c.total}</span></span>
                      </div>
                    </td>
                    <td><span className="mono text-amber">{c.hot>0?`🔥 ${c.hot}`:'-'}</span></td>
                    <td><span className="mono text-sm">{c.open || '—'}</span></td>
                    <td><span className="mono text-sm">{c.wa||'-'}</span></td>
                    <td><span className="mono text-sm text-green">{c.spend}</span></td>
                    <td><span className="badge gray text-xs">{c.tier}</span></td>
                    <td onClick={e=>e.stopPropagation()}>
                      {c.status==='awaiting_approval'
                        ? <button className="btn btn-amber btn-xs" style={{animation:'pulse 1.4s ease-in-out infinite'}} onClick={() => setPage('approval')}>Review</button>
                        : (c.status==='active'||c.status==='paused')
                          ? <button className={`btn ${c.status==='active'?'btn-ghost':'btn-green'} btn-xs`} onClick={() => toggleCampaign(c.id)}>{c.status==='active'?'Pause':'Resume'}</button>
                          : null
                      }
                    </td>
                  </tr>
                );
              })}
              {visibleCampaigns.length === 0 && (
                <tr><td colSpan={9} style={{textAlign:'center',color:'var(--muted)',padding:'20px 0',fontSize:12}}>No campaigns{bizFilter ? ' for this business' : ''}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="fade-up-4 mt-4" style={{display:'grid',gridTemplateColumns:'1fr 0.65fr',gap:16,minHeight:280}}>
        <ActivityFeed activity={activity}/>
        <HotLeadsPanel leads={leads} campaigns={campaigns}/>
      </div>
    </div>
  );
}
