import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../services/api.js';

export function CampaignDashboard() {
  const { campaigns, setPage, openCampaignPipeline } = useAppStore(useShallow(s => ({
    campaigns: s.campaigns,
    setPage: s.setPage,
    openCampaignPipeline: s.openCampaignPipeline,
  })));

  const [overview, setOverview] = useState(null);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    apiFetch('/analytics/overview').then(setOverview).catch(() => {});
    apiFetch('/activity').then(d => setActivity(d || [])).catch(() => {});
  }, []);

  const active = campaigns.filter(c => c.status === 'active');
  const totalLeads = campaigns.reduce((s, c) => s + (c.leads || 0), 0);

  // Stage groupings for funnel
  const stageCounts = {
    'Import': campaigns.filter(c => ['draft','scraping','scraped'].includes(c._pipeline?.stage || 'draft')).length,
    'Qualify': campaigns.filter(c => ['qualifying','ready_for_enrichment'].includes(c._pipeline?.stage)).length,
    'Enrich': campaigns.filter(c => ['enriching','enrichment_complete'].includes(c._pipeline?.stage)).length,
    'AI Build': campaigns.filter(c => ['ai_scoring','ai_content_ready','personalizing'].includes(c._pipeline?.stage)).length,
    'Launch': campaigns.filter(c => ['channels_configured','deliverability_check','ready_to_launch'].includes(c._pipeline?.stage)).length,
    'Active': campaigns.filter(c => c._pipeline?.stage === 'active' || c.status === 'active').length,
  };
  const maxCount = Math.max(...Object.values(stageCounts), 1);

  function stageLabel(stage) {
    const map = { draft:'Import', scraping:'Scraping', scraped:'Ready to Qualify', qualifying:'Qualifying', ready_for_enrichment:'Awaiting Enrichment', enriching:'Enriching', enrichment_complete:'Enriched', ai_scoring:'AI Scoring', ai_content_ready:'Assets Ready', personalizing:'Personalizing', channels_configured:'Channels Set', deliverability_check:'Checking', ready_to_launch:'Ready', active:'Active', completed:'Completed' };
    return map[stage] || stage;
  }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  const stats = [
    { label: 'Active Campaigns', value: active.length, color: 'var(--green)' },
    { label: 'Total Leads', value: totalLeads.toLocaleString(), color: 'var(--blue)' },
    { label: 'Meetings Booked', value: overview?.meetingsBooked ?? '—', color: 'var(--amber)' },
    { label: 'Emails Sent', value: overview?.emailActions?.toLocaleString() ?? '—', color: 'var(--muted)' },
  ];

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-4 fade-up">
        <div>
          <h1 className="page-title">Campaign Dashboard</h1>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{new Date().toLocaleDateString('en-MY',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
        </div>
        <button className="btn btn-green btn-sm" onClick={() => setPage('new-campaign')}>＋ New Campaign</button>
      </div>

      {/* Stats row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}} className="fade-up">
        {stats.map(s => (
          <div key={s.label} className="card" style={{padding:'16px 20px'}}>
            <div style={{fontSize:24,fontWeight:700,color:s.color,fontFamily:'var(--font-mono)'}}>{s.value}</div>
            <div style={{fontSize:11,color:'var(--muted)',marginTop:4,textTransform:'uppercase',letterSpacing:'0.05em'}}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 360px',gap:16,alignItems:'start'}}>
        {/* Left column */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>

          {/* Active campaigns */}
          <div className="card fade-up-1">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <div style={{fontWeight:600,fontSize:14}}>Active Campaigns</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage('campaigns')} style={{fontSize:11}}>View all →</button>
            </div>
            {active.length === 0 ? (
              <div style={{fontSize:12,color:'var(--muted)',padding:'16px 0',textAlign:'center'}}>No active campaigns — <span style={{color:'var(--blue)',cursor:'pointer'}} onClick={() => setPage('new-campaign')}>start one →</span></div>
            ) : (
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{borderBottom:'1px solid var(--border)'}}>
                    {['Campaign','Business','Stage','Leads',''].map(h => (
                      <th key={h} style={{textAlign:'left',fontSize:10,color:'var(--muted)',fontWeight:600,padding:'0 8px 8px',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {active.slice(0,6).map(c => (
                    <tr key={c.id} style={{borderBottom:'1px solid var(--border)'}} className="table-row">
                      <td style={{padding:'10px 8px'}}>
                        <div style={{fontSize:12,fontWeight:500,color:'var(--blue)',cursor:'pointer'}} onClick={() => openCampaignPipeline(c.id)}>{c.name}</div>
                      </td>
                      <td style={{padding:'10px 8px',fontSize:11,color:'var(--muted)'}}>{c.bizName}</td>
                      <td style={{padding:'10px 8px'}}>
                        <span style={{fontSize:10,background:'var(--green-dim,oklch(70% 0.18 145 / 0.12))',color:'var(--green)',borderRadius:4,padding:'2px 8px',fontWeight:600}}>
                          {stageLabel(c._pipeline?.stage || 'active')}
                        </span>
                      </td>
                      <td style={{padding:'10px 8px',fontSize:12,fontFamily:'var(--font-mono)',color:'var(--text)'}}>{(c.leads||0).toLocaleString()}</td>
                      <td style={{padding:'10px 8px'}}>
                        <button className="btn btn-ghost btn-sm" style={{fontSize:10,padding:'3px 8px'}} onClick={() => openCampaignPipeline(c.id)}>Open →</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pipeline funnel */}
          <div className="card fade-up-1">
            <div style={{fontWeight:600,fontSize:14,marginBottom:16}}>Pipeline Funnel</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {Object.entries(stageCounts).map(([label, count]) => (
                <div key={label} style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:90,fontSize:11,color:'var(--muted)',textAlign:'right',flexShrink:0}}>{label}</div>
                  <div style={{flex:1,background:'var(--s2)',borderRadius:4,height:20,overflow:'hidden'}}>
                    <div style={{
                      width: `${Math.max((count/maxCount)*100,count>0?8:0)}%`,
                      height:'100%',
                      background: label === 'Active' ? 'var(--green)' : 'var(--blue)',
                      borderRadius:4,
                      transition:'width 0.5s ease',
                      display:'flex',alignItems:'center',paddingLeft:6,
                    }}>
                      {count > 0 && <span style={{fontSize:10,color:'#fff',fontWeight:600}}>{count}</span>}
                    </div>
                  </div>
                  {count === 0 && <span style={{fontSize:11,color:'var(--border)'}}>0</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{display:'flex',flexDirection:'column',gap:16}}>

          {/* Channel performance */}
          <div className="card fade-up-1">
            <div style={{fontWeight:600,fontSize:14,marginBottom:12}}>Channel Performance</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[
                { icon:'◈', label:'Email', value: overview?.emailActions ?? 0, color:'var(--blue)' },
                { icon:'✦', label:'WhatsApp', value: overview?.waActions ?? 0, color:'var(--green)' },
                { icon:'◉', label:'Voice', value: overview?.voiceActions ?? 0, color:'var(--amber)' },
              ].map(ch => (
                <div key={ch.label} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--s2)',borderRadius:8,border:'1px solid var(--border)'}}>
                  <span style={{color:ch.color,fontSize:14,flexShrink:0}}>{ch.icon}</span>
                  <span style={{flex:1,fontSize:12,color:'var(--text)'}}>{ch.label}</span>
                  <span style={{fontSize:13,fontWeight:600,fontFamily:'var(--font-mono)',color:'var(--text)'}}>{ch.value.toLocaleString()}</span>
                  <span style={{fontSize:10,color:'var(--muted)'}}>sent</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div className="card fade-up-1">
            <div style={{fontWeight:600,fontSize:14,marginBottom:12}}>Recent Activity</div>
            {activity.length === 0 ? (
              <div style={{fontSize:12,color:'var(--muted)',textAlign:'center',padding:'12px 0'}}>No recent activity</div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {activity.slice(0,6).map((a,i) => (
                  <div key={i} style={{display:'flex',alignItems:'flex-start',gap:8,fontSize:12}}>
                    <span style={{width:6,height:6,borderRadius:'50%',background:`var(--${a.color},var(--muted))`,flexShrink:0,marginTop:4}}/>
                    <div style={{flex:1}}>
                      <div style={{color:'var(--text)',lineHeight:1.4}}>{a.msg}</div>
                      <div style={{color:'var(--muted)',fontSize:10,marginTop:2}}>{timeAgo(a.createdAt)} · {a.tag}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="card fade-up-1" style={{display:'flex',flexDirection:'column',gap:8}}>
            <div style={{fontWeight:600,fontSize:14,marginBottom:4}}>Quick Actions</div>
            {[
              { label:'＋ New Campaign', page:'new-campaign', color:'var(--blue)' },
              { label:'Lead Intelligence →', page:'lead-intelligence', color:'var(--muted)' },
              { label:'AI Studio →', page:'ai-studio', color:'var(--muted)' },
              { label:'Revenue Tracking →', page:'revenue', color:'var(--muted)' },
            ].map(a => (
              <button key={a.label} className="btn btn-ghost btn-sm" style={{textAlign:'left',justifyContent:'flex-start',color:a.color}} onClick={() => setPage(a.page)}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
