import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../services/api.js';

export function Approvals() {
  const { campaigns, updateCampaign, showToast, setPage, loadCampaigns } = useAppStore(useShallow(s => ({
    campaigns: s.campaigns,
    updateCampaign: s.updateCampaign,
    showToast: s.showToast,
    setPage: s.setPage,
    loadCampaigns: s.loadCampaigns,
  })));

  const [enrichProgress, setEnrichProgress] = useState({});
  const [launchLimits, setLaunchLimits] = useState({});
  const [approving, setApproving] = useState({});
  const [launching, setLaunching] = useState({});
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const stage1 = campaigns.filter(c => c.status === 'awaiting_approval');
  const enriching = campaigns.filter(c => c.status === 'enriching');
  const stage2 = campaigns.filter(c => c.status === 'awaiting_launch');
  const total = stage1.length + enriching.length + stage2.length;

  // Poll enrichment progress for enriching campaigns
  useEffect(() => {
    if (!enriching.length) return;
    const interval = setInterval(async () => {
      for (const c of enriching) {
        try {
          const status = await apiFetch(`/enrichment/status/${c.id}`);
          setEnrichProgress(prev => ({ ...prev, [c.id]: status }));
          if (status.complete && loadCampaigns) loadCampaigns();
        } catch {}
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [enriching.length]);

  async function handleApproveEnrich(campaignId) {
    setApproving(p => ({ ...p, [campaignId]: true }));
    try {
      await apiFetch(`/enrichment/start/${campaignId}`, { method: 'POST' });
      showToast('Apollo enrichment started — finding decision makers…', 'blue');
      if (loadCampaigns) loadCampaigns();
    } catch (e) { showToast(e.message, 'red'); }
    finally { setApproving(p => ({ ...p, [campaignId]: false })); }
  }

  async function handleReject(campaignId) {
    try {
      await updateCampaign(campaignId, {
        status: 'paused',
        ...(rejectReason.trim() ? { rejectReason: rejectReason.trim() } : {}),
      });
      showToast(rejectReason.trim() ? 'Campaign rejected with reason' : 'Campaign rejected', 'amber');
      setRejectingId(null);
      setRejectReason('');
    } catch (e) { showToast(e.message, 'red'); }
  }

  function startReject(id) {
    setRejectingId(id);
    setRejectReason('');
  }

  function cancelReject() {
    setRejectingId(null);
    setRejectReason('');
  }

  async function handleLaunch(campaignId) {
    const dailyLimit = launchLimits[campaignId] || 200;
    setLaunching(p => ({ ...p, [campaignId]: true }));
    try {
      await apiFetch(`/campaigns/${campaignId}/start`, { method: 'POST', body: { dailyLimit } });
      showToast(`Campaign launched! Engine running at ${dailyLimit}/day`, 'green');
      if (loadCampaigns) loadCampaigns();
    } catch (e) { showToast(e.message, 'red'); }
    finally { setLaunching(p => ({ ...p, [campaignId]: false })); }
  }

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-4 fade-up">
        <div>
          <div className="breadcrumb">Campaigns / <span>Approvals</span></div>
          <h1 className="page-title" style={{marginTop:4}}>Campaign Approvals</h1>
        </div>
        {total > 0 && (
          <div style={{fontSize:12, color:'var(--muted)'}}>
            {stage1.length > 0 && <span style={{marginRight:12}}>{stage1.length} awaiting review</span>}
            {enriching.length > 0 && <span style={{marginRight:12, color:'var(--blue)'}}>{enriching.length} enriching</span>}
            {stage2.length > 0 && <span style={{color:'var(--amber)'}}>{stage2.length} ready to launch</span>}
          </div>
        )}
      </div>

      {total === 0 ? (
        <div className="card fade-up-1" style={{textAlign:'center', padding:60}}>
          <div style={{fontSize:32, marginBottom:12}}>✓</div>
          <div style={{fontWeight:600, fontSize:15, marginBottom:8}}>No campaigns pending</div>
          <div style={{color:'var(--muted)', fontSize:13, marginBottom:20}}>All campaigns have been reviewed.</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage('campaigns')}>View All Campaigns</button>
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:16}}>

          {/* Stage 1: Review scraped leads */}
          {stage1.length > 0 && (
            <div>
              <div style={{fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10, fontWeight:600}}>
                Stage 1 — Review Scraped Leads ({stage1.length})
              </div>
              {stage1.map((c, i) => (
                <div key={c.id} className={`card fade-up-${Math.min(i+1,5)}`} style={{marginBottom:12, padding:20}}>
                  <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12}}>
                    <div>
                      <div style={{fontWeight:700, fontSize:15, marginBottom:4}}>{c.name}</div>
                      <div style={{fontSize:12, color:'var(--muted)'}}>
                        {c.bizName} · {c.leads} leads scraped · {c.total} target
                      </div>
                      {c.config?.keyword && (
                        <div style={{fontSize:11, color:'var(--muted)', marginTop:4}}>
                          📍 "{c.config.keyword}" in {c.config.google_maps?.city || c.config.city}
                        </div>
                      )}
                    </div>
                    <span style={{fontSize:10, padding:'3px 8px', borderRadius:4, background:'rgba(0,120,255,0.1)', color:'var(--blue)', fontWeight:600, flexShrink:0}}>
                      STAGE 1
                    </span>
                  </div>

                  {c.driveSheetUrl && (
                    <a href={c.driveSheetUrl} target="_blank" rel="noopener noreferrer"
                      style={{display:'inline-flex', alignItems:'center', gap:6, fontSize:12, color:'var(--blue)', marginBottom:12,
                        padding:'6px 12px', border:'1px solid rgba(0,120,255,0.3)', borderRadius:6, textDecoration:'none'}}>
                      📊 Open Google Sheet
                    </a>
                  )}

                  <div style={{fontSize:12, color:'var(--muted)', marginBottom:14, padding:'8px 12px', background:'var(--bg)', borderRadius:6, lineHeight:1.6}}>
                    Apollo will find the decision maker name, title &amp; email for each business.
                    {' '}Apollo Professional plan — people search is unlimited.
                  </div>

                  {rejectingId === c.id ? (
                    <div style={{background:'rgba(255,80,80,0.06)',border:'1px solid rgba(255,80,80,0.25)',borderRadius:8,padding:'12px 14px'}}>
                      <div style={{fontSize:12,color:'var(--red)',fontWeight:600,marginBottom:8}}>Reason for rejection (optional)</div>
                      <textarea
                        className="input" rows={2} placeholder="e.g. Leads look off-target — try 'restaurant manager' instead of 'F&B director'"
                        value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                        style={{fontSize:12,marginBottom:10,resize:'none'}}
                      />
                      <div style={{display:'flex',gap:8}}>
                        <button className="btn btn-danger btn-sm" onClick={() => handleReject(c.id)} style={{fontSize:12}}>Confirm Reject</button>
                        <button className="btn btn-ghost btn-sm" onClick={cancelReject} style={{fontSize:12}}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{display:'flex', gap:8}}>
                      <button className="btn" onClick={() => startReject(c.id)} style={{fontSize:13}}>Reject</button>
                      <button className="btn btn-blue" onClick={() => handleApproveEnrich(c.id)} disabled={approving[c.id]} style={{fontSize:13}}>
                        {approving[c.id] ? 'Starting…' : 'Approve & Enrich with Apollo →'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Enriching in progress */}
          {enriching.length > 0 && (
            <div>
              <div style={{fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10, fontWeight:600}}>
                Enriching — Apollo Running ({enriching.length})
              </div>
              {enriching.map((c, i) => {
                const prog = enrichProgress[c.id];
                const pct = prog ? Math.round((prog.done / Math.max(prog.total, 1)) * 100) : 0;
                return (
                  <div key={c.id} className={`card fade-up-${Math.min(i+1,5)}`} style={{marginBottom:12, padding:20}}>
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
                      <div>
                        <div style={{fontWeight:700, fontSize:15}}>{c.name}</div>
                        <div style={{fontSize:12, color:'var(--muted)'}}>{c.bizName}</div>
                      </div>
                      <span style={{fontSize:10, padding:'3px 8px', borderRadius:4, background:'rgba(0,120,255,0.1)', color:'var(--blue)', fontWeight:600}}>
                        ENRICHING…
                      </span>
                    </div>
                    <div style={{background:'var(--bg)', borderRadius:6, height:6, marginBottom:8, overflow:'hidden'}}>
                      <div style={{height:'100%', background:'var(--blue)', width:`${pct}%`, transition:'width 0.5s', borderRadius:6}}/>
                    </div>
                    <div style={{fontSize:12, color:'var(--muted)'}}>
                      {prog
                        ? `${prog.done}/${prog.total} processed · ${prog.enriched} got email · ${prog.noData} no match`
                        : 'Starting enrichment…'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Stage 2: Launch */}
          {stage2.length > 0 && (
            <div>
              <div style={{fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10, fontWeight:600}}>
                Stage 2 — Ready to Launch ({stage2.length})
              </div>
              {stage2.map((c, i) => {
                const limit = launchLimits[c.id] || 200;
                return (
                  <div key={c.id} className={`card fade-up-${Math.min(i+1,5)}`} style={{marginBottom:12, padding:20, border:'1px solid rgba(0,255,128,0.2)'}}>
                    <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12}}>
                      <div>
                        <div style={{fontWeight:700, fontSize:15, marginBottom:4}}>{c.name}</div>
                        <div style={{fontSize:12, color:'var(--muted)'}}>
                          {c.bizName} · {c.leads} leads ready
                        </div>
                      </div>
                      <span style={{fontSize:10, padding:'3px 8px', borderRadius:4, background:'rgba(0,255,128,0.12)', color:'var(--green)', fontWeight:600, flexShrink:0}}>
                        READY TO LAUNCH
                      </span>
                    </div>

                    {c.driveSheetUrl && (
                      <a href={c.driveSheetUrl} target="_blank" rel="noopener noreferrer"
                        style={{display:'inline-flex', alignItems:'center', gap:6, fontSize:12, color:'var(--blue)', marginBottom:14,
                          padding:'6px 12px', border:'1px solid rgba(0,120,255,0.3)', borderRadius:6, textDecoration:'none'}}>
                        📊 View Enriched Sheet
                      </a>
                    )}

                    {c.sequence?.length > 0 && (
                      <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:14}}>
                        {c.sequence.map((s, si) => (
                          <span key={si} style={{fontSize:11, background:'var(--bg)', borderRadius:4, padding:'3px 8px', color:'var(--muted)', border:'1px solid var(--border)'}}>
                            {s.icon} {s.label}{si > 0 ? ` · Day ${s.day}` : ' · Now'}
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={{marginBottom:14}}>
                      <div style={{fontSize:12, color:'var(--muted)', marginBottom:8}}>Daily send limit</div>
                      <div style={{display:'flex', alignItems:'center', gap:12}}>
                        <input type="range" min={50} max={500} step={50}
                          value={limit}
                          onChange={e => setLaunchLimits(p => ({ ...p, [c.id]: +e.target.value }))}
                          style={{flex:1, accentColor:'var(--green)'}}/>
                        <span style={{fontFamily:'var(--font-mono)', fontSize:18, fontWeight:700, color:'var(--green)', minWidth:60}}>{limit}/day</span>
                      </div>
                      <div style={{fontSize:11, color: limit <= 200 ? 'var(--green)' : 'var(--amber)', marginTop:4}}>
                        {limit <= 200 ? '✓ Safe for WhatsApp Tier 1 (1,000/day limit)' : '⚠ Approaching WhatsApp limits — pace carefully'}
                      </div>
                    </div>

                    {rejectingId === c.id ? (
                      <div style={{background:'rgba(255,80,80,0.06)',border:'1px solid rgba(255,80,80,0.25)',borderRadius:8,padding:'12px 14px'}}>
                        <div style={{fontSize:12,color:'var(--red)',fontWeight:600,marginBottom:8}}>Reason for rejection (optional)</div>
                        <textarea
                          className="input" rows={2} placeholder="e.g. Sequence needs tweaking before launch"
                          value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                          style={{fontSize:12,marginBottom:10,resize:'none'}}
                        />
                        <div style={{display:'flex',gap:8}}>
                          <button className="btn btn-danger btn-sm" onClick={() => handleReject(c.id)} style={{fontSize:12}}>Confirm Reject</button>
                          <button className="btn btn-ghost btn-sm" onClick={cancelReject} style={{fontSize:12}}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{display:'flex', gap:8}}>
                        <button className="btn" onClick={() => startReject(c.id)} style={{fontSize:13}}>Reject</button>
                        <button className="btn btn-green" onClick={() => handleLaunch(c.id)} disabled={launching[c.id]} style={{fontSize:13}}>
                          {launching[c.id] ? 'Launching…' : '🚀 Launch Campaign'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
