import { useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { BizAvatar } from '../components/ui/BizAvatar.jsx';
import { CampaignBadge } from '../components/ui/CampaignBadge.jsx';
import { apiFetch } from '../services/api.js';

const PAGE_SIZE = 8;

export function AllCampaigns() {
  const { campaigns, toggleCampaign, updateCampaign, removeCampaign, showToast, setPage } = useAppStore(useShallow(s => ({
    campaigns:s.campaigns, toggleCampaign:s.toggleCampaign, updateCampaign:s.updateCampaign, removeCampaign:s.removeCampaign, showToast:s.showToast, setPage:s.setPage,
  })));

  const [filter, setFilter] = useState('All');
  const [pg, setPg] = useState(0);
  const [scrapingId, setScrapingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  const tabs = ['All', 'Active', 'Paused', 'Awaiting Review'];
  const filtered = campaigns.filter(c =>
    filter === 'All' ||
    (filter === 'Active' && c.status === 'active') ||
    (filter === 'Paused' && c.status === 'paused') ||
    (filter === 'Awaiting Review' && c.status === 'awaiting_approval')
  );
  const total = filtered.length;
  const paged = filtered.slice(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE);

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-4 fade-up">
        <div>
          <div className="breadcrumb">Campaigns / <span>All Campaigns</span></div>
          <h1 className="page-title" style={{marginTop:4}}>All Campaigns</h1>
        </div>
        <button className="btn btn-green" onClick={() => setPage('new-campaign')}>＋ New Campaign</button>
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
                <th>Campaign</th><th>Business</th><th>Status</th>
                <th style={{minWidth:140}}>Progress</th>
                <th>Hot</th><th>Open Rate</th><th>WA Resp</th><th>Spend</th><th>Channels</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(c => {
                const pct = c.total > 0 ? Math.round((c.leads / c.total) * 100) : 0;
                const isToggling = togglingId === c.id;
                return (
                  <tr key={c.id} className={c.status==='awaiting_approval'?'row-awaiting':''} style={{opacity:c.status==='paused'?0.7:1}}>
                    <td>
                      <div style={{fontWeight:500,fontSize:13}}>{c.name}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{c.bizName}</div>
                    </td>
                    <td><BizAvatar id={c.bizId} name={c.bizName} color={c.color} size={24}/></td>
                    <td><CampaignBadge status={c.status}/></td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div className="prog-bar" style={{flex:1}}>
                          <div className="prog-fill" style={{width:`${pct}%`,background:`var(--${c.color})`}}/>
                        </div>
                        <span className="mono" style={{fontSize:10,color:'var(--muted)',whiteSpace:'nowrap'}}>{c.leads}/{c.total}</span>
                      </div>
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
                        {c.status === 'awaiting_approval' && (
                          <button className="btn btn-amber btn-xs" onClick={() => setPage('approval')}>Review</button>
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
                  <td colSpan={10} style={{textAlign:'center',color:'var(--muted)',padding:32,fontSize:13}}>
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

      {/* Delete confirm modal */}
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
