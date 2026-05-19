import { useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { CampaignBadge } from '../components/ui/CampaignBadge.jsx';

export function Approvals() {
  const { campaigns, updateCampaign, showToast, setPage } = useAppStore(useShallow(s => ({
    campaigns: s.campaigns,
    updateCampaign: s.updateCampaign,
    showToast: s.showToast,
    setPage: s.setPage,
  })));

  const [approving, setApproving] = useState(new Set());
  const [approved, setApproved] = useState(new Set());

  const pendingCampaigns = campaigns.filter(c => c.status === 'awaiting_approval');

  const approveCampaign = async (id) => {
    setApproving(prev => new Set([...prev, id]));
    try {
      await updateCampaign(id, { status: 'active' });
      setApproved(prev => new Set([...prev, id]));
      showToast('Campaign activated');
    } catch (e) {
      showToast(e.message || 'Failed to approve', 'red');
    } finally {
      setApproving(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const approveAll = async () => {
    for (const c of pendingCampaigns) {
      await approveCampaign(c.id);
    }
  };

  const rejectCampaign = async (id) => {
    try {
      await updateCampaign(id, { status: 'paused' });
      showToast('Campaign rejected — set to paused', 'amber');
    } catch (e) {
      showToast(e.message || 'Failed', 'red');
    }
  };

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-4 fade-up">
        <div>
          <div className="breadcrumb">Campaigns / <span>Approvals</span></div>
          <h1 className="page-title" style={{marginTop:4}}>Campaign Approvals</h1>
        </div>
        {pendingCampaigns.length > 0 && (
          <button className="btn btn-green" onClick={approveAll}>
            Approve All ({pendingCampaigns.length})
          </button>
        )}
      </div>

      {pendingCampaigns.length === 0 ? (
        <div className="card fade-up-1" style={{textAlign:'center',padding:60}}>
          <div style={{fontSize:32,marginBottom:12}}>✓</div>
          <div style={{fontWeight:600,fontSize:15,marginBottom:8}}>No campaigns awaiting approval</div>
          <div style={{color:'var(--muted)',fontSize:13,marginBottom:20}}>All campaigns have been reviewed.</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage('campaigns')}>View All Campaigns</button>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {pendingCampaigns.map((c, i) => {
            const isApproving = approving.has(c.id);
            const isApproved = approved.has(c.id);
            return (
              <div key={c.id} className={`card fade-up-${Math.min(i+1,5)}`}
                style={{
                  border: isApproved ? '1px solid var(--green)' : '1px solid var(--border)',
                  opacity: isApproved ? 0.7 : 1,
                  transition:'all 0.2s',
                }}>
                <div style={{display:'flex',alignItems:'flex-start',gap:16}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                      <span style={{fontWeight:600,fontSize:14}}>{c.name}</span>
                      <CampaignBadge status={c.status}/>
                    </div>
                    <div style={{display:'flex',gap:20,fontSize:12,color:'var(--muted)'}}>
                      <span>Business: <strong style={{color:'var(--text)'}}>{c.bizName}</strong></span>
                      <span>Tier: <strong style={{color:'var(--text)'}}>{c.tier}</strong></span>
                      <span>Total leads target: <strong style={{color:'var(--text)'}}>{c.total?.toLocaleString()}</strong></span>
                    </div>
                    {c.config?.leadSource && (
                      <div style={{marginTop:8,fontSize:12,color:'var(--muted)'}}>
                        Lead source: <strong style={{color:'var(--text)'}}>
                          {c.config.leadSource === 'google_maps' ? '📍 Google Maps' : c.config.leadSource === 'apollo' ? '🔭 Apollo' : '📋 Manual'}
                        </strong>
                        {c.config.keyword && <span> · {c.config.keyword} in {c.config.city}</span>}
                      </div>
                    )}
                    {c.sequence?.length > 0 && (
                      <div style={{marginTop:8,display:'flex',gap:8,flexWrap:'wrap'}}>
                        {c.sequence.map((s, si) => (
                          <span key={si} style={{fontSize:11,background:'var(--s2)',borderRadius:4,padding:'2px 8px',color:'var(--muted)'}}>
                            {s.icon} {s.label}{si > 0 ? ` +${s.day}d` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{display:'flex',gap:8,flexShrink:0,alignItems:'center'}}>
                    {isApproved ? (
                      <span style={{color:'var(--green)',fontSize:13,fontWeight:600}}>✓ Approved</span>
                    ) : (
                      <>
                        <button
                          className="btn btn-ghost btn-sm"
                          disabled={isApproving}
                          onClick={() => rejectCampaign(c.id)}
                        >
                          Reject
                        </button>
                        <button
                          className="btn btn-green btn-sm"
                          disabled={isApproving}
                          onClick={() => approveCampaign(c.id)}
                        >
                          {isApproving ? '◌ Approving...' : 'Approve & Activate'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
