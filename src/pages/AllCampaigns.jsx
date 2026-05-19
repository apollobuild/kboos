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
  const [confirmDelete, setConfirmDelete] = useState(null); // campaign id pending delete

  const doDelete = async (id) => {
    try {
      await removeCampaign(id);
      setConfirmDelete(null);
      showToast('Campaign deleted');
    } catch (e) {
      showToast(e.message || 'Delete failed', 'red');
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
  const tabs = ['All','Active','Paused','Awaiting Review'];

  const filtered = campaigns.filter(c =>
    filter === 'All' ||
    (filter === 'Active' && c.status === 'active') ||
    (filter === 'Paused' && c.status === 'paused') ||
    (filter === 'Awaiting Review' && c.status === 'awaiting_approval')
  );
  const total = filtered.length;
  const page = filtered.slice(pg*PAGE_SIZE, (pg+1)*PAGE_SIZE);

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
        {tabs.map(t => <div key={t} className={`tab${filter===t?' active':''}`} onClick={() => { setFilter(t); setPg(0); }}>{t}</div>)}
      </div>
      <div className="card fade-up-2">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Campaign</th><th>Business</th><th>Status</th><th style={{minWidth:140}}>Progress</th><th>Hot</th><th>Open Rate</th><th>WA Resp</th><th>Spend</th><th>Tier</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {page.map(c => {
                const pct = Math.round((c.leads/c.total)*100);
                return (
                  <tr key={c.id} className={c.status==='awaiting_approval'?'row-awaiting':''} style={{opacity:c.status==='paused'?0.7:1}}>
                    <td>
                      <div style={{fontWeight:500,fontSize:13}}>{c.name}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{c.bizName}</div>
                    </td>
                    <td><BizAvatar id={c.biz} color={c.color} size={24}/></td>
                    <td><CampaignBadge status={c.status}/></td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div className="prog-bar" style={{flex:1}}><div className="prog-fill" style={{width:`${pct}%`,background:`var(--${c.color})`}}/></div>
                        <span className="mono" style={{fontSize:10,color:'var(--muted)',whiteSpace:'nowrap'}}>{c.leads}/{c.total}</span>
                      </div>
                    </td>
                    <td><span className="mono text-amber">{c.hot>0?`🔥 ${c.hot}`:'-'}</span></td>
                    <td><span className="mono text-sm">{c.open}</span></td>
                    <td><span className="mono text-sm">{c.wa||'-'}</span></td>
                    <td><span className="mono text-green text-sm">{c.spend}</span></td>
                    <td><span className="badge gray text-xs">{c.tier}</span></td>
                    <td>
                      <div style={{display:'flex',gap:4,flexWrap:'wrap',alignItems:'center'}}>
                        {c.status==='awaiting_approval'
                          ? <button className="btn btn-amber btn-xs" onClick={() => setPage('approval')}>Review</button>
                          : (c.status==='active'||c.status==='paused')
                            ? <button className={`btn ${c.status==='active'?'btn-ghost':'btn-green'} btn-xs`} onClick={() => toggleCampaign(c.id)}>{c.status==='active'?'Pause':'Resume'}</button>
                            : null
                        }
                        {c.config?.leadSource && c.config.leadSource !== 'manual' && (
                          <button className="btn btn-ghost btn-xs" disabled={scrapingId===c.id} onClick={() => scrape(c)}
                            title={c.config.leadSource === 'google_maps' ? 'Scrape Google Maps' : 'Import from Apollo'}>
                            {scrapingId===c.id ? '◌' : c.config.leadSource === 'google_maps' ? '📍' : '🔭'}
                          </button>
                        )}
                        <button className="btn btn-xs" style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:14,padding:'2px 6px',lineHeight:1}} onClick={() => setConfirmDelete(c.id)} title="Delete campaign">×</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
      {confirmDelete && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={() => setConfirmDelete(null)}>
          <div style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:12,padding:28,minWidth:320,maxWidth:400}} onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:600,fontSize:15,marginBottom:8}}>Delete Campaign?</div>
            <div style={{fontSize:13,color:'var(--muted)',marginBottom:20}}>
              This will permanently delete the campaign and all its leads. This cannot be undone.
            </div>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-sm" style={{background:'var(--red)',color:'#fff',border:'none'}} onClick={() => doDelete(confirmDelete)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
