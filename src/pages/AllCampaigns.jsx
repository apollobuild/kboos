import { useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { BizAvatar } from '../components/ui/BizAvatar.jsx';
import { CampaignBadge } from '../components/ui/CampaignBadge.jsx';
import { apiFetch } from '../services/api.js';

const PAGE_SIZE = 8;

function gradeColor(grade) {
  if (grade === 'A' || grade === 'B+') return 'var(--green)';
  if (grade === 'B' || grade === 'C') return 'var(--amber)';
  if (grade === 'D') return 'var(--red)';
  return 'var(--muted)';
}

function gradeBorder(grade) {
  if (grade === 'A' || grade === 'B+') return '3px solid var(--green)';
  if (grade === 'B' || grade === 'C') return '3px solid var(--amber)';
  if (grade === 'D') return '3px solid var(--red)';
  return undefined;
}

export function AllCampaigns() {
  const { campaigns, toggleCampaign, updateCampaign, removeCampaign, showToast, setPage, openCampaignPipeline } = useAppStore(useShallow(s => ({
    campaigns:s.campaigns, toggleCampaign:s.toggleCampaign, updateCampaign:s.updateCampaign, removeCampaign:s.removeCampaign, showToast:s.showToast, setPage:s.setPage, openCampaignPipeline:s.openCampaignPipeline,
  })));

  const [filter, setFilter] = useState('All');
  const [pg, setPg] = useState(0);
  const [scrapingId, setScrapingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [aiInsights, setAiInsights] = useState({});
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const [briefOpen, setBriefOpen] = useState(true);

  const loadAiInsights = async () => {
    const targets = campaigns
      .filter(c => c.status === 'active' || c.status === 'running')
      .slice(0, 5);
    if (targets.length === 0) return;
    setLoadingInsights(true);
    try {
      const results = await Promise.all(
        targets.map(c =>
          apiFetch('/ai/campaign-performance/' + c.id)
            .then(r => ({ id: c.id, data: r }))
            .catch(() => ({ id: c.id, data: null }))
        )
      );
      const map = {};
      for (const r of results) {
        if (r.data) map[r.id] = r.data;
      }
      setAiInsights(map);
      setShowInsights(true);
    } finally {
      setLoadingInsights(false);
    }
  };

  const doPause = async (id) => {
    setTogglingId(id);
    try {
      await toggleCampaign(id);
    } catch (e) {
      showToast(e.message || 'Failed to update campaign', 'red');
    } finally {
      setTogglingId(null);
    }
  };

  const doDelete = async (id) => {
    setDeleting(true);
    try {
      await removeCampaign(id);
      setConfirmDelete(null);
      showToast('Campaign deleted');
    } catch (e) {
      showToast(e.message || 'Delete failed', 'red');
    } finally {
      setDeleting(false);
    }
  };

  const scrape = async (c) => {
    const cfg = c.config || {};
    if (!cfg.leadSource || cfg.leadSource === 'manual') return;
    setScrapingId(c.id);
    try {
      const endpoint = cfg.leadSource === 'google_maps' ? '/scraper/google-maps' : '/scraper/apollo';
      const body = cfg.leadSource === 'google_maps'
        ? { campaignId: c.id, keyword: cfg.keyword, city: cfg.city, radius: cfg.radius || 50, limit: c.total }
        : { campaignId: c.id, jobTitles: cfg.tags || [], seniority: cfg.seniority || [], city: cfg.city, limit: c.total };
      const result = await apiFetch(endpoint, { method: 'POST', body });
      showToast(`✓ ${result.count} leads imported`);
      await updateCampaign(c.id, { leads: result.total });
    } catch (e) {
      showToast(e.message || 'Scrape failed', 'red');
    } finally {
      setScrapingId(null);
    }
  };

  function pipelineStage(c) {
    const s = c.status;
    if (s === 'active' && c.startedAt) {
      const days = Math.floor((Date.now() - new Date(c.startedAt).getTime()) / 86400000);
      return { label: `Day ${days + 1} · Live`, color: 'var(--green)', dot: true };
    }
    if (s === 'active')             return { label: 'Live', color: 'var(--green)', dot: true };
    if (s === 'awaiting_launch')    return { label: 'Ready to Launch', color: 'var(--amber)', dot: false };
    if (s === 'personalized')       return { label: '5 · Personalized', color: 'var(--blue)', dot: false };
    if (s === 'personalizing')      return { label: '5 · Personalizing…', color: 'var(--blue)', dot: true };
    if (s === 'ai_content_ready')   return { label: '4 · Review Assets', color: 'var(--amber)', dot: false };
    if (s === 'ai_generating')      return { label: '4 · AI Writing…', color: 'var(--blue)', dot: true };
    if (s === 'enriched')           return { label: '3 · Enriched', color: 'var(--blue)', dot: false };
    if (s === 'enriching')          return { label: '3 · Enriching…', color: 'var(--blue)', dot: true };
    if (s === 'validated')          return { label: '2 · Approve Tiers', color: 'var(--amber)', dot: false };
    if (s === 'validating')         return { label: '2 · Validating…', color: 'var(--blue)', dot: true };
    if (s === 'awaiting_approval')  return { label: '1 · Import Leads', color: 'var(--muted)', dot: false };
    if (s === 'paused')             return { label: 'Paused', color: 'var(--muted)', dot: false };
    return { label: '1 · Start Pipeline', color: 'var(--muted)', dot: false };
  }

  const tabs = ['All', 'Active', 'Paused', 'In Pipeline'];
  const filtered = campaigns.filter(c =>
    filter === 'All' ||
    (filter === 'Active' && c.status === 'active') ||
    (filter === 'Paused' && c.status === 'paused') ||
    (filter === 'In Pipeline' && !['active','paused'].includes(c.status))
  );
  const total = filtered.length;
  const paged = filtered.slice(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE);

  const hasInsights = Object.keys(aiInsights).length > 0;

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-4 fade-up">
        <div>
          <div className="breadcrumb">Campaigns / <span>All Campaigns</span></div>
          <h1 className="page-title" style={{marginTop:4}}>All Campaigns</h1>
        </div>
        <button className="btn btn-green" onClick={() => setPage('new-campaign')}>＋ New Campaign</button>
      </div>

      <div className="card fade-up-1 mb-4" style={{padding:'14px 18px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>AI Campaign Brief</span>
            {hasInsights && showInsights && (
              <span style={{fontSize:11,color:'var(--muted)'}}>
                {Object.keys(aiInsights).length} campaign{Object.keys(aiInsights).length !== 1 ? 's' : ''} analyzed
              </span>
            )}
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {hasInsights && showInsights && (
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => { setShowInsights(false); setAiInsights({}); }}
              >
                Dismiss
              </button>
            )}
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => setBriefOpen(o => !o)}
              style={{fontSize:12,color:'var(--muted)'}}
            >
              {briefOpen ? '▲ Collapse' : '▼ Expand'}
            </button>
          </div>
        </div>

        {briefOpen && (
          <div style={{marginTop:12}}>
            {!hasInsights || !showInsights ? (
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <button
                  className="btn btn-ghost btn-xs"
                  style={{fontSize:12,padding:'5px 14px',border:'1px solid var(--border)'}}
                  disabled={loadingInsights}
                  onClick={loadAiInsights}
                >
                  {loadingInsights ? (
                    <span style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{display:'inline-block',width:12,height:12,border:'2px solid var(--muted)',borderTopColor:'var(--text)',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
                      Loading AI Insights…
                    </span>
                  ) : 'Load AI Insights'}
                </button>
                {!loadingInsights && (
                  <span style={{fontSize:11,color:'var(--muted)'}}>
                    Analyzes up to 5 active campaigns
                  </span>
                )}
              </div>
            ) : (
              <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
                {Object.entries(aiInsights).map(([cid, insight]) => {
                  const camp = campaigns.find(x => x.id === cid);
                  const grade = insight?.grade;
                  const color = gradeColor(grade);
                  return (
                    <div
                      key={cid}
                      style={{
                        background:'var(--s2)',
                        border:'1px solid var(--border)',
                        borderLeft:`3px solid ${color}`,
                        borderRadius:8,
                        padding:'10px 14px',
                        minWidth:220,
                        maxWidth:280,
                        flex:'1 1 220px',
                      }}
                    >
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                        <span style={{fontSize:12,fontWeight:600,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:160}}>
                          {camp?.name || cid}
                        </span>
                        <span style={{
                          fontSize:11,fontWeight:700,color:'#fff',
                          background:color,
                          borderRadius:4,padding:'1px 7px',
                          flexShrink:0,marginLeft:6,
                        }}>
                          {grade || '?'}
                        </span>
                      </div>
                      {insight?.topInsight && (
                        <div style={{fontSize:11,color:'var(--muted)',lineHeight:1.5,marginBottom:6}}>
                          {insight.topInsight}
                        </div>
                      )}
                      {insight?.actions?.slice(0, 2).map((action, i) => (
                        <div key={i} style={{display:'flex',alignItems:'flex-start',gap:5,fontSize:11,color:'var(--text)',marginTop:3}}>
                          <span style={{color:color,flexShrink:0,marginTop:1}}>›</span>
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="tabs fade-up-1 mb-4">
        {tabs.map(t => (
          <div key={t} className={`tab${filter===t?' active':''}`} onClick={() => { setFilter(t); setPg(0); }}>{t}</div>
        ))}
      </div>

      <div className="card fade-up-2">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Campaign</th><th>Business</th><th>Pipeline Stage</th>
                <th style={{minWidth:140}}>Progress</th>
                <th>AI Grade</th>
                <th>Hot</th><th>Open Rate</th><th>WA Resp</th><th>Spend</th><th>Channels</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(c => {
                const pct = c.total > 0 ? Math.round((c.leads / c.total) * 100) : 0;
                const isToggling = togglingId === c.id;
                const insight = aiInsights[c.id];
                const grade = insight?.grade;
                const border = gradeBorder(grade);
                const isAwaiting = c.status === 'awaiting_approval' || c.status === 'awaiting_launch' || c.status === 'enriching';
                const rowStyle = {
                  opacity: c.status === 'paused' ? 0.7 : 1,
                  ...(border ? { borderLeft: border } : {}),
                  ...(isAwaiting ? { background: 'oklch(65% 0.2 55 / 0.06)' } : {}),
                };
                return (
                  <tr key={c.id} className={c.status==='awaiting_approval'?'row-awaiting':''} style={rowStyle}>
                    <td>
                      <div
                        style={{fontWeight:500,fontSize:13,cursor:'pointer',color:'var(--blue)'}}
                        onClick={() => openCampaignPipeline(c.id)}
                        title="View pipeline"
                      >
                        {c.name}
                      </div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{c.bizName}</div>
                    </td>
                    <td><BizAvatar id={c.bizId} name={c.bizName} color={c.color} size={24}/></td>
                    <td>
                      {(() => {
                        const ps = pipelineStage(c);
                        return (
                          <span
                            style={{fontSize:11,fontWeight:500,color:ps.color,cursor:'pointer',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:4}}
                            onClick={() => openCampaignPipeline(c.id)}
                            title="Open pipeline"
                          >
                            {ps.dot && <span style={{width:6,height:6,borderRadius:'50%',background:ps.color,display:'inline-block',flexShrink:0,animation:'pulse 1.5s ease-in-out infinite'}}/>}
                            {ps.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div className="prog-bar" style={{flex:1}}>
                          <div className="prog-fill" style={{width:`${pct}%`,background:`var(--${c.color})`}}/>
                        </div>
                        <span className="mono" style={{fontSize:10,color:'var(--muted)',whiteSpace:'nowrap'}}>{c.leads}/{c.total}</span>
                      </div>
                    </td>
                    <td>
                      {grade ? (
                        <span style={{fontSize:11,fontWeight:700,color:'#fff',background:gradeColor(grade),borderRadius:4,padding:'2px 8px',display:'inline-block'}}>
                          {grade}
                        </span>
                      ) : (
                        <span style={{color:'var(--muted)'}}>—</span>
                      )}
                    </td>
                    <td><span className="mono text-amber">{c.hot>0?`🔥 ${c.hot}`:'-'}</span></td>
                    <td><span className="mono text-sm">{c.open}</span></td>
                    <td><span className="mono text-sm">{c.wa||'-'}</span></td>
                    <td><span className="mono text-green text-sm">{c.spend}</span></td>
                    <td>
                      {c.channels?.length
                        ? <span style={{fontSize:14}}>{c.channels.includes('call') ? '💬📧📞' : c.channels.includes('email') ? '💬📧' : '💬'}</span>
                        : <span className="badge gray text-xs">{c.tier}</span>
                      }
                    </td>
                    <td>
                      <div style={{display:'flex',gap:6,alignItems:'center'}}>
                        {!['active','paused'].includes(c.status) && (
                          <button className="btn btn-ghost btn-xs" style={{color:'var(--blue)',borderColor:'var(--blue)'}} onClick={() => openCampaignPipeline(c.id)}>Pipeline →</button>
                        )}
                        {(c.status === 'active' || c.status === 'paused') && (
                          <button
                            className={`btn btn-xs ${c.status==='active'?'btn-ghost':'btn-green'}`}
                            disabled={isToggling}
                            onClick={() => doPause(c.id)}
                          >
                            {isToggling ? '◌' : c.status === 'active' ? 'Pause' : 'Resume'}
                          </button>
                        )}
                        {c.config?.leadSource && c.config.leadSource !== 'manual' && (
                          <button className="btn btn-ghost btn-xs" disabled={scrapingId===c.id}
                            onClick={() => scrape(c)}
                            title={c.config.leadSource==='google_maps'?'Scrape Google Maps':'Import from Apollo'}>
                            {scrapingId===c.id ? '◌' : c.config.leadSource==='google_maps' ? '📍' : '🔭'}
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDelete(c.id)}
                          style={{background:'none',border:'1px solid var(--red)',color:'var(--red)',borderRadius:4,cursor:'pointer',fontSize:11,padding:'3px 8px'}}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={11} style={{textAlign:'center',color:'var(--muted)',padding:32,fontSize:13}}>
                    No campaigns found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:16,paddingTop:12,borderTop:'1px solid var(--border)'}}>
          <span style={{fontSize:12,color:'var(--muted)'}}>Showing {Math.min((pg+1)*PAGE_SIZE,total)} of {total} campaigns</span>
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-xs" disabled={pg===0} onClick={() => setPg(p=>p-1)}>← Prev</button>
            <button className="btn btn-ghost btn-xs" disabled={(pg+1)*PAGE_SIZE>=total} onClick={() => setPg(p=>p+1)}>Next →</button>
          </div>
        </div>
      </div>

      {confirmDelete !== null && (
        <div
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}
          onClick={() => { if (!deleting) setConfirmDelete(null); }}
        >
          <div
            style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:12,padding:28,minWidth:340,boxShadow:'0 20px 60px rgba(0,0,0,0.5)'}}
            onClick={e => e.stopPropagation()}
          >
            <div style={{fontWeight:600,fontSize:15,marginBottom:8}}>Delete Campaign?</div>
            <div style={{fontSize:13,color:'var(--muted)',marginBottom:24,lineHeight:1.6}}>
              This will permanently delete the campaign and all its leads. This cannot be undone.
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn btn-ghost btn-sm" disabled={deleting} onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                disabled={deleting}
                style={{background:'var(--red)',color:'#fff',border:'none',borderRadius:6,padding:'6px 20px',fontSize:13,fontWeight:600,cursor:deleting?'not-allowed':'pointer'}}
                onClick={() => doDelete(confirmDelete)}
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
