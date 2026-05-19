import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api.js';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';

const STATUS_CONFIG = {
  '':              { label: 'New',           color: 'var(--muted)',  bg: 'var(--s2)' },
  contacted:       { label: 'Contacted',     color: 'var(--blue)',   bg: 'var(--blue-dim)' },
  meeting_booked:  { label: 'Meeting Set',   color: 'var(--purple)', bg: 'oklch(from var(--purple) l c h / 0.12)' },
  closed_won:      { label: '✓ Closed',      color: 'var(--green)',  bg: 'var(--green-dim)' },
  not_interested:  { label: 'Not Interested',color: 'var(--red)',    bg: 'oklch(from var(--red) l c h / 0.12)' },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function exportCSV(leads, bizName) {
  const headers = ['Name', 'Company', 'Title', 'Phone', 'Score', 'Channel', 'Message', 'Your Status'];
  const rows = leads.map(l => [
    l.name, l.company, l.title || '', l.phone || '', l.score,
    (l.channels || []).join('/'),
    l.latestReply?.msg || '',
    STATUS_CONFIG[l.clientStatus || '']?.label || 'New',
  ]);
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${bizName.replace(/\s+/g, '-')}-hot-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ClientPortal() {
  const { businesses } = useAppStore(useShallow(s => ({ businesses: s.businesses })));
  const user = (() => { try { return JSON.parse(localStorage.getItem('kboos_user') || '{}'); } catch { return {}; } })();
  const isClient = user.role === 'client';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewBizId, setPreviewBizId] = useState('');
  const [updatingLead, setUpdatingLead] = useState(null);

  const bizId = isClient ? user.bizId : previewBizId;

  useEffect(() => {
    if (!bizId) { setLoading(false); return; }
    setLoading(true);
    setError('');
    apiFetch(`/portal/data?bizId=${bizId}`)
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [bizId]);

  const updateLeadStatus = async (leadId, clientStatus) => {
    setUpdatingLead(leadId);
    // Optimistic update
    setData(d => ({ ...d, hotLeads: d.hotLeads.map(l => l.id === leadId ? { ...l, clientStatus } : l) }));
    try {
      await apiFetch(`/portal/leads/${leadId}`, { method: 'PATCH', body: { clientStatus } });
    } catch {
      // Revert on failure — refetch
      apiFetch(`/portal/data?bizId=${bizId}`).then(d => setData(d)).catch(() => {});
    } finally {
      setUpdatingLead(null);
    }
  };

  const signOut = () => {
    localStorage.removeItem('kboos_token');
    localStorage.removeItem('kboos_user');
    window.location.reload();
  };

  // ── Admin preview selector ──
  if (!isClient && !previewBizId) {
    return (
      <div className="page">
        <div className="breadcrumb mb-2">Client Portal / <span>Preview</span></div>
        <h1 className="page-title" style={{marginBottom:16}}>Client Portal Preview</h1>
        <div className="card" style={{maxWidth:400}}>
          <div style={{fontSize:13,color:'var(--muted)',marginBottom:12}}>Select a business to preview their client portal:</div>
          <div className="flex-col gap-2">
            {businesses.map(b => (
              <button key={b.id} className="btn btn-ghost" style={{justifyContent:'flex-start',gap:10}}
                onClick={() => setPreviewBizId(b.id)}>
                <span style={{width:10,height:10,borderRadius:'50%',background:`var(--${b.color})`,flexShrink:0,display:'inline-block'}}/>
                {b.name} · {b.industry}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Loading / error ──
  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:12}}>
      <span style={{fontSize:28,animation:'spin 1s linear infinite',display:'inline-block'}}>◌</span>
      <div style={{fontSize:13,color:'var(--muted)'}}>Loading your dashboard…</div>
    </div>
  );

  if (error || !data) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:12}}>
      <div style={{fontSize:13,color:'var(--red)'}}>{error || 'Failed to load data'}</div>
      <button className="btn btn-ghost btn-sm" onClick={() => { setLoading(true); apiFetch(`/portal/data?bizId=${bizId}`).then(d=>setData(d)).catch(e=>setError(e.message)).finally(()=>setLoading(false)); }}>
        Try Again
      </button>
    </div>
  );

  const { biz, campaigns, hotLeads, activity } = data;

  // ── Stats calculations ──
  const totalLeads = campaigns.reduce((s, c) => s + (c.leads || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const avgOpen = campaigns.length > 0
    ? (campaigns.reduce((s, c) => s + parseFloat((c.open || '0').replace('%', '')), 0) / campaigns.length).toFixed(1)
    : '0';
  const avgWa = campaigns.filter(c => c.wa && c.wa !== '-').length > 0
    ? (campaigns.filter(c => c.wa && c.wa !== '-').reduce((s, c) => s + parseFloat(c.wa.replace('%', '')), 0) / campaigns.filter(c => c.wa && c.wa !== '-').length).toFixed(1)
    : null;
  const pipelineValue = biz.avgDealValue > 0 ? hotLeads.length * biz.avgDealValue : 0;

  const actionableLeads = hotLeads.filter(l => l.clientStatus !== 'closed_won' && l.clientStatus !== 'not_interested');
  const closedCount = hotLeads.filter(l => l.clientStatus === 'closed_won').length;

  return (
    <div style={{maxWidth:960, margin:'0 auto', padding:'0 20px 60px'}}>

      {/* ── Header ── */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 0 24px',borderBottom:'1px solid var(--border)',marginBottom:28}}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
            <path d="M2 10L8 3L14 10L8 17L2 10Z" fill="oklch(65% 0.2 145 / 0.9)"/>
            <path d="M9 10L15 3L21 10L15 17L9 10Z" fill="oklch(62% 0.19 245 / 0.7)"/>
            <path d="M16 10L22 3L28 10L22 17L16 10Z" fill="oklch(62% 0.19 245 / 0.5)"/>
          </svg>
          <div>
            <div style={{fontWeight:700,fontSize:15}}>{biz.name}</div>
            <div style={{fontSize:11,color:'var(--muted)'}}>{biz.industry} · Outreach by KOBIS</div>
          </div>
          <span style={{fontSize:10,fontWeight:600,background:'var(--green-dim)',color:'var(--green)',borderRadius:10,padding:'3px 10px',fontFamily:'var(--font-mono)',letterSpacing:'0.08em'}}>
            READ-ONLY
          </span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {!isClient && (
            <button className="btn btn-ghost btn-sm" onClick={() => setPreviewBizId('')}>← All Businesses</button>
          )}
          {isClient && (
            <button onClick={signOut}
              style={{background:'none',border:'1px solid var(--border)',color:'var(--muted)',borderRadius:6,padding:'6px 14px',fontSize:12,cursor:'pointer'}}>
              Sign Out
            </button>
          )}
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          { label:'Leads Reached', val:totalLeads.toLocaleString(), color:'var(--blue)', sub:`${activeCampaigns} active campaign${activeCampaigns !== 1 ? 's' : ''}` },
          { label:'🔥 Hot Leads', val:hotLeads.length, color:'var(--amber)', sub: closedCount > 0 ? `${closedCount} already closed` : 'Ready for you to contact' },
          { label:'Email Open Rate', val:`${avgOpen}%`, color:'var(--green)', sub:'Avg across all campaigns' },
          avgWa
            ? { label:'WhatsApp Replies', val:`${avgWa}%`, color:'var(--green)', sub:'Response rate' }
            : { label:'Campaigns', val:campaigns.length, color:'var(--text)', sub:`${activeCampaigns} active` },
        ].map((s, i) => (
          <div key={i} className="card">
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:6,fontWeight:500}}>{s.label}</div>
            <div style={{fontSize:26,fontWeight:700,color:s.color,fontFamily:'var(--font-mono)',marginBottom:4}}>{s.val}</div>
            <div style={{fontSize:11,color:'var(--muted)'}}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Pipeline value banner ── */}
      {pipelineValue > 0 && (
        <div style={{background:'oklch(from var(--amber) l c h / 0.08)',border:'1px solid oklch(from var(--amber) l c h / 0.3)',borderRadius:10,padding:'14px 20px',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:12,color:'var(--amber)',fontWeight:600,marginBottom:2}}>💰 Estimated Pipeline Value</div>
            <div style={{fontSize:22,fontWeight:700,color:'var(--text)',fontFamily:'var(--font-mono)'}}>
              RM {pipelineValue.toLocaleString()}
            </div>
          </div>
          <div style={{fontSize:12,color:'var(--muted)',textAlign:'right'}}>
            <div>{hotLeads.length} hot leads</div>
            <div>× RM {biz.avgDealValue.toLocaleString()} avg deal</div>
          </div>
        </div>
      )}

      {/* ── Hot leads ── */}
      <div style={{marginBottom:28}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <div>
            <div style={{fontWeight:600,fontSize:14}}>🔥 Hot Leads — Ready for You</div>
            <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>
              {actionableLeads.length} lead{actionableLeads.length !== 1 ? 's' : ''} waiting · Track your progress below
            </div>
          </div>
          {hotLeads.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(hotLeads, biz.name)}>
              ↓ Download CSV
            </button>
          )}
        </div>

        {hotLeads.length === 0 ? (
          <div className="card" style={{textAlign:'center',padding:40,color:'var(--muted)',fontSize:13}}>
            No hot leads yet — outreach is in progress. Check back soon.
          </div>
        ) : (
          <div className="flex-col gap-3">
            {hotLeads.map(lead => {
              const cfg = STATUS_CONFIG[lead.clientStatus || ''];
              return (
                <div key={lead.id} className="card"
                  style={{borderLeft:`3px solid ${lead.clientStatus === 'closed_won' ? 'var(--green)' : lead.clientStatus === 'not_interested' ? 'var(--border)' : 'var(--amber)'}`,
                    opacity: lead.clientStatus === 'not_interested' ? 0.6 : 1}}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                        <span style={{fontWeight:600,fontSize:13}}>{lead.name}</span>
                        <span style={{color:'var(--muted)',fontSize:12}}>·</span>
                        <span style={{fontSize:12,color:'var(--muted)'}}>{lead.company}</span>
                        {lead.title && <span style={{fontSize:11,color:'var(--muted)',background:'var(--s2)',borderRadius:4,padding:'1px 6px'}}>{lead.title}</span>}
                      </div>

                      {lead.latestReply ? (
                        <div style={{fontSize:12,color:'var(--text)',background:'var(--s2)',borderRadius:6,padding:'8px 12px',marginBottom:8,borderLeft:'2px solid var(--amber)',fontStyle:'italic'}}>
                          "{lead.latestReply.msg}"
                          <span style={{fontSize:10,color:'var(--muted)',marginLeft:8,fontStyle:'normal'}}>
                            via {lead.latestReply.channel} · {timeAgo(lead.latestReply.createdAt)}
                          </span>
                        </div>
                      ) : (
                        <div style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>
                          Marked as interested · Score {lead.score}/10
                        </div>
                      )}

                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} style={{fontSize:11,color:'var(--green)',fontFamily:'var(--font-mono)',textDecoration:'none'}}>
                            📞 {lead.phone}
                          </a>
                        )}
                        <span style={{fontSize:11,padding:'2px 6px',borderRadius:4,background:cfg.bg,color:cfg.color,fontWeight:500}}>
                          {cfg.label}
                        </span>
                        <span style={{fontSize:11,color:'var(--muted)'}}>Score: {lead.score}/10</span>
                      </div>
                    </div>

                    {/* Status action buttons */}
                    <div style={{display:'flex',flexDirection:'column',gap:4,flexShrink:0}}>
                      {[
                        { key:'contacted',      label:'Contacted',    color:'var(--blue)' },
                        { key:'meeting_booked', label:'Meeting Set',  color:'var(--purple)' },
                        { key:'closed_won',     label:'Closed ✓',    color:'var(--green)' },
                        { key:'not_interested', label:'Not Interested',color:'var(--muted)' },
                      ].map(opt => (
                        <button key={opt.key}
                          disabled={updatingLead === lead.id}
                          onClick={() => updateLeadStatus(lead.id, lead.clientStatus === opt.key ? '' : opt.key)}
                          style={{
                            fontSize:11, padding:'4px 10px', borderRadius:4, cursor:'pointer',
                            border: `1px solid ${lead.clientStatus === opt.key ? opt.color : 'var(--border)'}`,
                            background: lead.clientStatus === opt.key ? `oklch(from ${opt.color} l c h / 0.15)` : 'var(--s1)',
                            color: lead.clientStatus === opt.key ? opt.color : 'var(--muted)',
                            fontWeight: lead.clientStatus === opt.key ? 600 : 400,
                            transition: 'all 0.15s',
                            whiteSpace: 'nowrap',
                          }}>
                          {updatingLead === lead.id ? '◌' : opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Campaigns ── */}
      <div style={{marginBottom:28}}>
        <div style={{fontWeight:600,fontSize:14,marginBottom:14}}>📋 Campaign Progress</div>
        {campaigns.length === 0 ? (
          <div className="card" style={{textAlign:'center',padding:32,color:'var(--muted)',fontSize:13}}>No campaigns yet.</div>
        ) : (
          <div className="flex-col gap-3">
            {campaigns.map(c => {
              const pct = c.total > 0 ? Math.round((c.leads / c.total) * 100) : 0;
              const milestones = [
                { label: 'Leads Imported', done: c.leads > 0 },
                { label: 'Outreach Started', done: c.status === 'active' || c.status === 'paused' },
                { label: `${c.hot || 0} Hot Leads`, done: (c.hot || 0) > 0 },
              ];
              const channelEmoji = c.channels?.includes('call') ? '💬📧📞' : c.channels?.includes('email') ? '💬📧' : '💬';
              return (
                <div key={c.id} className="card">
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                    <div>
                      <span style={{fontWeight:600,fontSize:13}}>{c.name}</span>
                      <span style={{fontSize:12,color:'var(--muted)',marginLeft:8}}>{channelEmoji}</span>
                    </div>
                    <span style={{fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:10,
                      background: c.status==='active' ? 'var(--green-dim)' : c.status==='paused' ? 'var(--s2)' : 'oklch(from var(--amber) l c h / 0.12)',
                      color: c.status==='active' ? 'var(--green)' : c.status==='paused' ? 'var(--muted)' : 'var(--amber)'}}>
                      {c.status === 'awaiting_approval' ? 'Under Review' : c.status}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                    <div style={{flex:1,height:6,background:'var(--s2)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${pct}%`,background:`var(--${c.color || 'green'})`,borderRadius:3,transition:'width 0.3s'}}/>
                    </div>
                    <span style={{fontSize:11,color:'var(--muted)',fontFamily:'var(--font-mono)',whiteSpace:'nowrap'}}>
                      {(c.leads||0).toLocaleString()} / {(c.total||0).toLocaleString()} leads ({pct}%)
                    </span>
                  </div>

                  {/* Milestone timeline */}
                  <div style={{display:'flex',gap:0}}>
                    {milestones.map((m, i) => (
                      <div key={i} style={{display:'flex',alignItems:'center',flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                          <div style={{width:18,height:18,borderRadius:'50%',
                            background: m.done ? 'var(--green)' : 'var(--s2)',
                            border: `2px solid ${m.done ? 'var(--green)' : 'var(--border)'}`,
                            display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff',fontWeight:700}}>
                            {m.done ? '✓' : ''}
                          </div>
                          <span style={{fontSize:10,color:m.done?'var(--green)':'var(--muted)',whiteSpace:'nowrap'}}>{m.label}</span>
                        </div>
                        {i < milestones.length - 1 && (
                          <div style={{flex:1,height:2,background:milestones[i+1].done?'var(--green)':'var(--border)',margin:'0 8px'}}/>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Mini stats */}
                  <div style={{display:'flex',gap:16,marginTop:12,paddingTop:12,borderTop:'1px solid var(--border)'}}>
                    {[
                      { label:'Open Rate', val: c.open || '0%' },
                      { label:'WA Response', val: c.wa || '—' },
                      { label:'Hot Leads', val: c.hot || 0 },
                    ].map(s => (
                      <div key={s.label}>
                        <div style={{fontSize:10,color:'var(--muted)'}}>{s.label}</div>
                        <div style={{fontSize:13,fontWeight:600,fontFamily:'var(--font-mono)'}}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Activity feed ── */}
      <div>
        <div style={{fontWeight:600,fontSize:14,marginBottom:14}}>📅 Recent Activity</div>
        <div className="card">
          {activity.length === 0 ? (
            <div style={{textAlign:'center',padding:24,color:'var(--muted)',fontSize:13}}>No activity yet.</div>
          ) : (
            <div className="flex-col gap-0">
              {activity.map((a, i) => (
                <div key={a.id} style={{display:'flex',gap:12,alignItems:'flex-start',padding:'10px 0',
                  borderBottom: i < activity.length - 1 ? '1px solid var(--border)' : 'none'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:`var(--${a.color})`,flexShrink:0,marginTop:4}}/>
                  <div style={{flex:1,fontSize:12,color:'var(--text)',lineHeight:1.5}}>{a.msg}</div>
                  <div style={{fontSize:10,color:'var(--muted)',whiteSpace:'nowrap'}}>{timeAgo(a.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{textAlign:'center',marginTop:40,fontSize:11,color:'var(--muted)'}}>
        Powered by KOBIS Outreach OS · {new Date().toLocaleDateString('en-MY', { month:'long', year:'numeric' })}
      </div>
    </div>
  );
}
