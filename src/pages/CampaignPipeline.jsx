import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../services/api.js';

const STAGE_ORDER = [
  'draft', 'scraping', 'scraped',
  'validating', 'validated',
  'enriching', 'enriched',
  'ai_generating', 'ai_content_ready',
  'personalizing', 'personalized',
  'eligibility_checking', 'awaiting_launch',
  'active', 'completed',
];
const STAGES_IN_PROGRESS = new Set(['scraping', 'validating', 'enriching', 'ai_generating', 'personalizing', 'eligibility_checking']);

function stageIndex(stage) { return STAGE_ORDER.indexOf(stage ?? 'draft'); }

function StageStatus({ stage, currentStage }) {
  const idx = stageIndex(stage);
  const cur = stageIndex(currentStage);
  if (idx < cur) return <span style={{color:'var(--green)',fontSize:14}}>✓</span>;
  if (idx === cur) return <span style={{width:8,height:8,borderRadius:'50%',background:'var(--blue)',display:'inline-block',flexShrink:0}}></span>;
  return <span style={{width:8,height:8,borderRadius:'50%',background:'var(--border)',display:'inline-block',flexShrink:0}}></span>;
}

function ProgressBar({ value, max, color = 'var(--blue)' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{display:'flex',alignItems:'center',gap:10}}>
      <div className="prog-bar" style={{flex:1,height:6}}>
        <div className="prog-fill" style={{width:`${pct}%`,background:color}}/>
      </div>
      <span className="mono" style={{fontSize:11,color:'var(--muted)',whiteSpace:'nowrap'}}>{value}/{max}</span>
    </div>
  );
}

function TierBadge({ tier }) {
  const color = tier === 'A' ? 'var(--green)' : tier === 'B' ? 'var(--amber)' : 'var(--muted)';
  return (
    <span style={{background:color,color:'#fff',borderRadius:4,padding:'1px 7px',fontSize:11,fontWeight:700}}>
      {tier}
    </span>
  );
}

function Spinner() {
  return (
    <span style={{display:'inline-block',width:12,height:12,border:'2px solid var(--border)',borderTopColor:'var(--blue)',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
  );
}

export function CampaignPipeline() {
  const { selectedCampaignId, campaigns, updateCampaign, showToast, setPage } = useAppStore(useShallow(s => ({
    selectedCampaignId: s.selectedCampaignId,
    campaigns: s.campaigns,
    updateCampaign: s.updateCampaign,
    showToast: s.showToast,
    setPage: s.setPage,
  })));

  const campaign = campaigns.find(c => c.id === selectedCampaignId);

  const [pipeline, setPipeline] = useState(null);
  const [assetCount, setAssetCount] = useState(0);
  const [approvedAssets, setApprovedAssets] = useState(0);
  const [personalizedLeads, setPersonalizedLeads] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loading, setLoading] = useState(true);

  // Validation
  const [validationSummary, setValidationSummary] = useState(null);
  const [approvedTiers, setApprovedTiers] = useState(['A', 'B']);
  const [approvingTiers, setApprovingTiers] = useState(false);

  // Assets
  const [assets, setAssets] = useState([]);
  const [expandedAsset, setExpandedAsset] = useState(null);
  const [editingAsset, setEditingAsset] = useState({});
  const [savingAsset, setSavingAsset] = useState(null);
  const [approvingAll, setApprovingAll] = useState(false);

  // Eligibility
  const [eligibility, setEligibility] = useState(null);

  // Actions
  const [acting, setActing] = useState(false);

  const pollRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    if (!selectedCampaignId) return;
    try {
      const data = await apiFetch(`/pipeline/${selectedCampaignId}`);
      setPipeline(data.pipeline);
      setAssetCount(data.assetCount ?? 0);
      setApprovedAssets(data.approvedAssets ?? 0);
      setPersonalizedLeads(data.personalizedLeads ?? 0);
      setTotalLeads(data.totalLeads ?? 0);
    } catch (e) {
      console.error('Pipeline fetch failed:', e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCampaignId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll while in-progress stage
  useEffect(() => {
    if (!pipeline) return;
    if (STAGES_IN_PROGRESS.has(pipeline.stage)) {
      pollRef.current = setInterval(fetchStatus, 4000);
    } else {
      clearInterval(pollRef.current);
    }
    return () => clearInterval(pollRef.current);
  }, [pipeline?.stage, fetchStatus]);

  // Load validation summary when validated
  useEffect(() => {
    const stage = pipeline?.stage;
    if (stage === 'validated' || stage === 'validating') {
      apiFetch(`/pipeline/${selectedCampaignId}/validation-summary`)
        .then(d => setValidationSummary(d))
        .catch(() => {});
    }
  }, [pipeline?.stage, selectedCampaignId]);

  // Load assets when ready
  useEffect(() => {
    const stage = pipeline?.stage;
    if (stage === 'ai_content_ready' || stage === 'personalizing' || stage === 'personalized' || stage === 'eligibility_checking' || stage === 'awaiting_launch' || stage === 'active') {
      apiFetch(`/pipeline/${selectedCampaignId}/assets`)
        .then(d => setAssets(d || []))
        .catch(() => {});
    }
  }, [pipeline?.stage, selectedCampaignId]);

  // Load eligibility when available
  useEffect(() => {
    const stage = pipeline?.stage;
    if (stage === 'awaiting_launch' || stage === 'active' || stage === 'eligibility_checking') {
      apiFetch(`/pipeline/${selectedCampaignId}/eligibility`)
        .then(d => setEligibility(d))
        .catch(() => {});
    }
  }, [pipeline?.stage, selectedCampaignId]);

  async function doValidate() {
    setActing(true);
    try {
      await apiFetch(`/pipeline/${selectedCampaignId}/validate`, { method: 'POST' });
      showToast('Validation started');
      await fetchStatus();
    } catch (e) { showToast(e.message, 'red'); }
    setActing(false);
  }

  async function doApproveTiers() {
    setApprovingTiers(true);
    try {
      const res = await apiFetch(`/pipeline/${selectedCampaignId}/approve-tiers`, { method: 'POST', body: { tiers: approvedTiers } });
      showToast(`Approved ${res.approved} leads, enrichment started`);
      await fetchStatus();
    } catch (e) { showToast(e.message, 'red'); }
    setApprovingTiers(false);
  }

  async function doGenerateAssets() {
    setActing(true);
    try {
      await apiFetch(`/pipeline/${selectedCampaignId}/generate-assets`, { method: 'POST' });
      showToast('Generating AI assets with Claude Opus…');
      await fetchStatus();
    } catch (e) { showToast(e.message, 'red'); }
    setActing(false);
  }

  async function doSaveAsset(asset) {
    setSavingAsset(asset.id);
    try {
      const updated = await apiFetch(`/pipeline/${selectedCampaignId}/assets/${asset.id}`, {
        method: 'PATCH',
        body: { editedBody: editingAsset[asset.id]?.body ?? asset.editedBody ?? asset.body, subject: editingAsset[asset.id]?.subject ?? asset.subject, approved: true },
      });
      setAssets(prev => prev.map(a => a.id === asset.id ? updated : a));
      setApprovedAssets(prev => prev + 1);
      showToast('Asset approved');
    } catch (e) { showToast(e.message, 'red'); }
    setSavingAsset(null);
  }

  async function doApproveAll() {
    setApprovingAll(true);
    try {
      await apiFetch(`/pipeline/${selectedCampaignId}/approve-all-assets`, { method: 'POST' });
      await apiFetch(`/pipeline/${selectedCampaignId}/assets`).then(d => setAssets(d || []));
      setApprovedAssets(assetCount);
      showToast('All assets approved');
    } catch (e) { showToast(e.message, 'red'); }
    setApprovingAll(false);
  }

  async function doPersonalize() {
    setActing(true);
    try {
      const res = await apiFetch(`/pipeline/${selectedCampaignId}/personalize`, { method: 'POST' });
      showToast(`Personalizing ${res.total} leads…`);
      await fetchStatus();
    } catch (e) { showToast(e.message, 'red'); }
    setActing(false);
  }

  async function doCheckEligibility() {
    setActing(true);
    try {
      await apiFetch(`/pipeline/${selectedCampaignId}/check-eligibility`, { method: 'POST' });
      showToast('Checking channel eligibility…');
      await fetchStatus();
    } catch (e) { showToast(e.message, 'red'); }
    setActing(false);
  }

  async function doLaunch() {
    setActing(true);
    try {
      await apiFetch(`/pipeline/${selectedCampaignId}/launch`, { method: 'POST' });
      await updateCampaign(selectedCampaignId, { status: 'active' });
      showToast('Campaign launched! 🚀', 'green');
      await fetchStatus();
    } catch (e) { showToast(e.message, 'red'); }
    setActing(false);
  }

  if (!campaign) {
    return (
      <div className="page">
        <div style={{color:'var(--muted)',fontSize:13}}>Campaign not found. <button className="btn btn-ghost btn-sm" onClick={() => setPage('campaigns')}>Back</button></div>
      </div>
    );
  }

  const stage = pipeline?.stage || 'draft';
  const curIdx = stageIndex(stage);
  const isActive = stage === 'active' || stage === 'completed';

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 fade-up">
        <div>
          <div className="breadcrumb">
            <span style={{cursor:'pointer',color:'var(--blue)'}} onClick={() => setPage('campaigns')}>Campaigns</span>
            {' / '}<span>{campaign.name}</span>
            {' / '}<span>Pipeline</span>
          </div>
          <h1 className="page-title" style={{marginTop:4}}>{campaign.name}</h1>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span style={{
            fontSize:11,padding:'3px 10px',borderRadius:12,fontWeight:600,
            background: isActive ? 'var(--green-dim)' : stage === 'awaiting_launch' ? 'oklch(72% 0.18 65 / 0.15)' : 'var(--s2)',
            color: isActive ? 'var(--green)' : stage === 'awaiting_launch' ? 'var(--amber)' : 'var(--muted)',
            border: `1px solid ${isActive ? 'var(--green)' : stage === 'awaiting_launch' ? 'var(--amber)' : 'var(--border)'}`,
          }}>
            {isActive ? '● Active' : stage === 'awaiting_launch' ? '● Ready to Launch' : stage.replace(/_/g,' ')}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage('campaigns')}>← Back</button>
        </div>
      </div>

      {loading ? (
        <div style={{padding:40,textAlign:'center',color:'var(--muted)',fontSize:13}}>
          <Spinner /> Loading pipeline…
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'220px 1fr',gap:16,alignItems:'start'}}>

          {/* Left: Stage list nav */}
          <div className="card fade-up-1" style={{padding:'12px 0',position:'sticky',top:16}}>
            {[
              { key:'scraped', label:'1. Import Leads', stages:['draft','scraping','scraped'] },
              { key:'validated', label:'2. Validate & Tier', stages:['validating','validated'] },
              { key:'enriched', label:'3. Enrich', stages:['enriching','enriched'] },
              { key:'ai_content_ready', label:'4. AI Assets', stages:['ai_generating','ai_content_ready'] },
              { key:'personalized', label:'5. Personalize', stages:['personalizing','personalized'] },
              { key:'awaiting_launch', label:'6. Eligibility', stages:['eligibility_checking','awaiting_launch'] },
              { key:'active', label:'7. Launch', stages:['active','completed'] },
            ].map(item => {
              const isDone = stageIndex(item.stages[item.stages.length - 1]) < curIdx;
              const isCurrentSection = item.stages.some(s => s === stage);
              const isLocked = stageIndex(item.stages[0]) > curIdx + 1;
              return (
                <div
                  key={item.key}
                  style={{
                    display:'flex',alignItems:'center',gap:10,padding:'8px 16px',
                    fontSize:12,fontWeight: isCurrentSection ? 600 : 400,
                    color: isLocked ? 'var(--muted)' : isCurrentSection ? 'var(--text)' : 'var(--muted)',
                    background: isCurrentSection ? 'var(--s2)' : 'transparent',
                    borderLeft: isCurrentSection ? '2px solid var(--blue)' : '2px solid transparent',
                    cursor: isLocked ? 'default' : 'pointer',
                  }}
                >
                  {isDone
                    ? <span style={{color:'var(--green)',fontSize:12,flexShrink:0}}>✓</span>
                    : isCurrentSection && STAGES_IN_PROGRESS.has(stage)
                    ? <Spinner />
                    : <span style={{width:8,height:8,borderRadius:'50%',background: isCurrentSection ? 'var(--blue)' : 'var(--border)',display:'inline-block',flexShrink:0}}/>
                  }
                  {item.label}
                </div>
              );
            })}
          </div>

          {/* Right: Active stage panel */}
          <div style={{display:'flex',flexDirection:'column',gap:12}}>

            {/* Stage 1: Import Leads */}
            {curIdx <= stageIndex('scraped') && (
              <div className="card fade-up-1">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                  <div style={{fontWeight:600,fontSize:14}}>Import Leads</div>
                  <StageStatus stage="scraped" currentStage={stage} />
                </div>
                {totalLeads > 0 ? (
                  <div>
                    <div style={{fontSize:13,color:'var(--text)',marginBottom:8}}>
                      <span style={{fontWeight:600,fontSize:18,color:'var(--green)'}}>{totalLeads}</span>
                      {' '}leads imported
                    </div>
                    {stage === 'scraped' && (
                      <button className="btn btn-green btn-sm" disabled={acting} onClick={doValidate}>
                        {acting ? <><Spinner /> Starting…</> : 'Start Validation →'}
                      </button>
                    )}
                    {stage === 'scraping' && <span style={{fontSize:12,color:'var(--muted)'}}>Importing leads…</span>}
                  </div>
                ) : (
                  <div style={{fontSize:12,color:'var(--muted)'}}>
                    <p style={{marginBottom:8}}>No leads imported yet. Go to Lead Manager to add leads, or trigger a scrape from the campaign config.</p>
                    {stage === 'draft' && (
                      <button className="btn btn-ghost btn-sm" onClick={() => setPage('leads')}>
                        Go to Lead Manager →
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Stage 2: Validate & Tier */}
            {curIdx >= stageIndex('validating') && curIdx <= stageIndex('validated') + 2 && (
              <div className="card fade-up-1">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                  <div style={{fontWeight:600,fontSize:14}}>Validate & Tier Leads</div>
                  <StageStatus stage="validated" currentStage={stage} />
                </div>

                {stage === 'validating' && (
                  <div style={{display:'flex',alignItems:'center',gap:10,fontSize:12,color:'var(--muted)'}}>
                    <Spinner />
                    Scoring leads by quality (phone, email, website, reviews, category match)…
                  </div>
                )}

                {(stage === 'validated' || curIdx > stageIndex('validated')) && validationSummary && (
                  <div>
                    <div style={{display:'flex',gap:10,marginBottom:16}}>
                      {validationSummary.tiers?.map(t => (
                        <div key={t.tier} style={{
                          flex:1,background:'var(--s2)',borderRadius:8,padding:'12px 14px',
                          border:`1px solid var(--border)`,
                          borderLeft:`3px solid ${t.tier==='A'?'var(--green)':t.tier==='B'?'var(--amber)':'var(--border)'}`,
                        }}>
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                            <TierBadge tier={t.tier} />
                            <span style={{fontSize:20,fontWeight:700,color:'var(--text)'}}>{t.count}</span>
                          </div>
                          <div style={{fontSize:11,color:'var(--muted)'}}>
                            {t.tier === 'A' ? 'Score ≥60 · Hot prospects' : t.tier === 'B' ? 'Score 35-59 · Good leads' : 'Score <35 · Low quality'}
                          </div>
                          {t.samples?.slice(0, 2).map(s => (
                            <div key={s.id} style={{fontSize:10,color:'var(--muted)',marginTop:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                              {s.name} · {s.company}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    {stage === 'validated' && (
                      <div>
                        <div style={{fontSize:12,color:'var(--text)',marginBottom:8,fontWeight:500}}>
                          Which tiers to include in outreach?
                        </div>
                        <div style={{display:'flex',gap:12,marginBottom:14}}>
                          {['A', 'B', 'C'].map(tier => (
                            <label key={tier} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12}}>
                              <input
                                type="checkbox"
                                checked={approvedTiers.includes(tier)}
                                onChange={e => setApprovedTiers(prev =>
                                  e.target.checked ? [...prev, tier] : prev.filter(t => t !== tier)
                                )}
                                style={{accentColor:'var(--blue)',width:14,height:14}}
                              />
                              <TierBadge tier={tier} />
                              <span style={{color:'var(--muted)'}}>
                                {validationSummary.tiers?.find(t => t.tier === tier)?.count ?? 0} leads
                              </span>
                            </label>
                          ))}
                        </div>
                        <button
                          className="btn btn-green btn-sm"
                          disabled={approvingTiers || approvedTiers.length === 0}
                          onClick={doApproveTiers}
                        >
                          {approvingTiers ? <><Spinner /> Approving…</> : `Approve & Start Enrichment →`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Stage 3: Enrich */}
            {curIdx >= stageIndex('enriching') && curIdx <= stageIndex('enriched') + 2 && (
              <div className="card fade-up-1">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                  <div style={{fontWeight:600,fontSize:14}}>Enrich Leads</div>
                  <StageStatus stage="enriched" currentStage={stage} />
                </div>
                {stage === 'enriching' ? (
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--muted)',marginBottom:10}}>
                      <Spinner /> Enriching via Apollo.io…
                    </div>
                    <ProgressBar value={pipeline?.enrichComplete || 0} max={pipeline?.enrichTotal || totalLeads} />
                  </div>
                ) : (
                  <div>
                    <div style={{fontSize:13,marginBottom:8,color:'var(--text)'}}>
                      <span style={{fontWeight:600,color:'var(--green)'}}>{pipeline?.enrichComplete || 0}</span>
                      /{pipeline?.enrichTotal || totalLeads} leads enriched
                    </div>
                    {stage === 'enriched' && (
                      <button className="btn btn-green btn-sm" disabled={acting} onClick={doGenerateAssets}>
                        {acting ? <><Spinner /> Starting…</> : 'Generate AI Assets →'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Stage 4: AI Assets */}
            {curIdx >= stageIndex('ai_generating') && curIdx <= stageIndex('ai_content_ready') + 2 && (
              <div className="card fade-up-1">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:14}}>AI-Generated Assets</div>
                    <div style={{fontSize:11,color:'var(--muted)'}}>Written by Claude Opus — review and approve before launch</div>
                  </div>
                  <StageStatus stage="ai_content_ready" currentStage={stage} />
                </div>

                {stage === 'ai_generating' && (
                  <div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--muted)'}}>
                    <Spinner /> Claude Opus is generating campaign assets…
                  </div>
                )}

                {(stage === 'ai_content_ready' || curIdx > stageIndex('ai_content_ready')) && assets.length > 0 && (
                  <div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                      <span style={{fontSize:12,color:'var(--muted)'}}>
                        {approvedAssets}/{assetCount} assets approved
                      </span>
                      {stage === 'ai_content_ready' && (
                        <div style={{display:'flex',gap:8}}>
                          <button className="btn btn-ghost btn-xs" disabled={approvingAll} onClick={doApproveAll}>
                            {approvingAll ? <Spinner /> : 'Approve All'}
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {assets.map(asset => {
                        const isExpanded = expandedAsset === asset.id;
                        const isApproved = asset.approved;
                        const channelIcon = asset.channel === 'email' ? '📧' : asset.channel === 'wa' ? '💬' : '📞';
                        return (
                          <div key={asset.id} style={{
                            border:`1px solid ${isApproved ? 'var(--green)' : 'var(--border)'}`,
                            borderRadius:8,overflow:'hidden',
                          }}>
                            <div
                              style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',cursor:'pointer',background:'var(--s1)'}}
                              onClick={() => setExpandedAsset(isExpanded ? null : asset.id)}
                            >
                              <div style={{display:'flex',alignItems:'center',gap:8}}>
                                <span style={{fontSize:13}}>{channelIcon}</span>
                                <span style={{fontSize:12,fontWeight:500,color:'var(--text)'}}>{asset.label}</span>
                                {isApproved && <span style={{fontSize:10,color:'var(--green)',fontWeight:600}}>✓ Approved</span>}
                              </div>
                              <span style={{fontSize:11,color:'var(--muted)'}}>{isExpanded ? '▲' : '▼'}</span>
                            </div>

                            {isExpanded && (
                              <div style={{padding:'12px 14px',background:'var(--s2)'}}>
                                {asset.subject && (
                                  <div style={{marginBottom:8}}>
                                    <div style={{fontSize:10,color:'var(--muted)',marginBottom:2}}>SUBJECT</div>
                                    <input
                                      className="input"
                                      style={{fontSize:12,padding:'5px 8px'}}
                                      defaultValue={asset.subject}
                                      onChange={e => setEditingAsset(prev => ({ ...prev, [asset.id]: { ...prev[asset.id], subject: e.target.value } }))}
                                    />
                                  </div>
                                )}
                                <div style={{marginBottom:10}}>
                                  <div style={{fontSize:10,color:'var(--muted)',marginBottom:2}}>BODY</div>
                                  <textarea
                                    style={{width:'100%',minHeight:120,background:'var(--s1)',border:'1px solid var(--border)',borderRadius:6,padding:'8px 10px',fontSize:12,color:'var(--text)',fontFamily:'inherit',resize:'vertical',boxSizing:'border-box'}}
                                    defaultValue={asset.editedBody || asset.body}
                                    onChange={e => setEditingAsset(prev => ({ ...prev, [asset.id]: { ...prev[asset.id], body: e.target.value } }))}
                                  />
                                </div>
                                {asset.notes && (
                                  <div style={{fontSize:11,color:'var(--muted)',fontStyle:'italic',marginBottom:10}}>
                                    Note: {asset.notes}
                                  </div>
                                )}
                                {!isApproved && stage === 'ai_content_ready' && (
                                  <button
                                    className="btn btn-green btn-xs"
                                    disabled={savingAsset === asset.id}
                                    onClick={() => doSaveAsset(asset)}
                                  >
                                    {savingAsset === asset.id ? <><Spinner /> Saving…</> : '✓ Approve Asset'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {stage === 'ai_content_ready' && approvedAssets >= assetCount && assetCount > 0 && (
                      <div style={{marginTop:14}}>
                        <button className="btn btn-green btn-sm" disabled={acting} onClick={doPersonalize}>
                          {acting ? <><Spinner /> Starting…</> : 'Start Personalisation →'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Stage 5: Personalize */}
            {curIdx >= stageIndex('personalizing') && curIdx <= stageIndex('personalized') + 2 && (
              <div className="card fade-up-1">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:14}}>AI Personalisation</div>
                    <div style={{fontSize:11,color:'var(--muted)'}}>Haiku writes a unique opening line per lead</div>
                  </div>
                  <StageStatus stage="personalized" currentStage={stage} />
                </div>

                {stage === 'personalizing' ? (
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--muted)',marginBottom:10}}>
                      <Spinner /> Claude Haiku personalizing leads…
                    </div>
                    <ProgressBar
                      value={pipeline?.personalizeComplete || 0}
                      max={pipeline?.personalizeTotal || totalLeads}
                      color="var(--green)"
                    />
                  </div>
                ) : (
                  <div>
                    <div style={{fontSize:13,marginBottom:10,color:'var(--text)'}}>
                      <span style={{fontWeight:600,color:'var(--green)'}}>{personalizedLeads}</span>
                      /{totalLeads} leads personalised
                    </div>
                    {stage === 'personalized' && (
                      <button className="btn btn-green btn-sm" disabled={acting} onClick={doCheckEligibility}>
                        {acting ? <><Spinner /> Starting…</> : 'Check Channel Eligibility →'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Stage 6: Eligibility */}
            {curIdx >= stageIndex('eligibility_checking') && curIdx <= stageIndex('awaiting_launch') + 1 && (
              <div className="card fade-up-1">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                  <div style={{fontWeight:600,fontSize:14}}>Channel Eligibility</div>
                  <StageStatus stage="awaiting_launch" currentStage={stage} />
                </div>

                {stage === 'eligibility_checking' && (
                  <div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--muted)'}}>
                    <Spinner /> Validating email addresses and phone numbers…
                  </div>
                )}

                {eligibility && (
                  <div>
                    <div style={{display:'flex',gap:12,marginBottom:14}}>
                      {[
                        { icon:'📧', label:'Email', count:eligibility.eligibleEmail },
                        { icon:'💬', label:'WhatsApp', count:eligibility.eligibleWa },
                        { icon:'📞', label:'Voice', count:eligibility.eligibleVoice },
                        { icon:'⛔', label:'Ineligible', count:eligibility.ineligibleCount },
                      ].map(ch => (
                        <div key={ch.label} style={{flex:1,background:'var(--s2)',borderRadius:8,padding:'10px 12px',border:'1px solid var(--border)',textAlign:'center'}}>
                          <div style={{fontSize:18,marginBottom:2}}>{ch.icon}</div>
                          <div style={{fontSize:18,fontWeight:700,color: ch.label==='Ineligible'?'var(--muted)':'var(--text)'}}>{ch.count}</div>
                          <div style={{fontSize:10,color:'var(--muted)'}}>{ch.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stage 7: Launch */}
            {curIdx >= stageIndex('awaiting_launch') && (
              <div className="card fade-up-1" style={{border: stage === 'awaiting_launch' ? '1px solid var(--green)' : '1px solid var(--border)'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                  <div style={{fontWeight:600,fontSize:14}}>Ready to Launch</div>
                  <StageStatus stage="active" currentStage={stage} />
                </div>

                {stage === 'awaiting_launch' && (
                  <div>
                    <div style={{fontSize:12,color:'var(--muted)',marginBottom:16,lineHeight:1.6}}>
                      All pipeline stages complete. The campaign engine will start sending within the 9am–6pm KL send window.
                    </div>
                    <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
                      {[
                        { label:'Total Leads', val: totalLeads },
                        { label:'Personalised', val: personalizedLeads },
                        { label:'AI Assets', val: assetCount },
                        { label:'Channels', val: campaign.channels?.join(', ') || 'wa' },
                      ].map(stat => (
                        <div key={stat.label} style={{background:'var(--s2)',borderRadius:6,padding:'8px 12px',border:'1px solid var(--border)'}}>
                          <div style={{fontSize:10,color:'var(--muted)'}}>{stat.label}</div>
                          <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{stat.val}</div>
                        </div>
                      ))}
                    </div>
                    <button
                      className="btn btn-green"
                      style={{padding:'10px 28px',fontSize:14,fontWeight:600}}
                      disabled={acting}
                      onClick={doLaunch}
                    >
                      {acting ? <><Spinner /> Launching…</> : '🚀 Launch Campaign'}
                    </button>
                  </div>
                )}

                {isActive && (
                  <div>
                    <div style={{fontSize:13,color:'var(--green)',fontWeight:500,marginBottom:10}}>
                      ● Campaign is live — engine sending 9am–6pm KL daily
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setPage('leads')}>
                        View Leads →
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setPage('inbox')}>
                        Reply Inbox →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
