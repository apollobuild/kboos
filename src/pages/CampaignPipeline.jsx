import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../services/api.js';

// ─────────────────────── Stage config ───────────────────────
const STAGE_ORDER = [
  'draft', 'scraping', 'scraped',
  'qualifying', 'ready_for_enrichment',
  'enriching', 'enrichment_complete',
  'ai_scoring', 'ai_generating', 'ai_error',
  'ai_content_ready',
  'personalizing', 'channels_configured',
  'deliverability_check', 'ready_to_launch',
  'active', 'completed',
];

const POLL_STAGES = new Set([
  'scraping', 'qualifying', 'enriching', 'ai_scoring', 'ai_generating', 'personalizing',
]);

function stageIndex(stage) { return STAGE_ORDER.indexOf(stage ?? 'draft'); }

// ─────────────────────── Shared UI ───────────────────────
function Spinner({ color = 'var(--blue)' }) {
  return (
    <span style={{
      display: 'inline-block', width: 12, height: 12,
      border: `2px solid var(--border)`, borderTopColor: color,
      borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0,
    }}/>
  );
}

function ProgressBar({ value, max, color = 'var(--blue)' }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div className="prog-bar" style={{ flex: 1, height: 6 }}>
        <div className="prog-fill" style={{ width: `${pct}%`, background: color }}/>
      </div>
      <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
        {value}/{max}
      </span>
    </div>
  );
}

function TierBadge({ tier }) {
  const color = tier === 'A' ? 'var(--green)' : tier === 'B' ? 'var(--amber)' : 'var(--muted)';
  return (
    <span style={{
      background: color, color: '#fff', borderRadius: 4,
      padding: '1px 7px', fontSize: 11, fontWeight: 700,
    }}>
      {tier}
    </span>
  );
}

function StageStatus({ stageKey, currentStage }) {
  const idx = stageIndex(stageKey);
  const cur = stageIndex(currentStage);
  if (idx < cur) return <span style={{ color: 'var(--green)', fontSize: 14 }}>✓</span>;
  if (idx === cur) return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)',
      display: 'inline-block', flexShrink: 0,
    }}/>
  );
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%', background: 'var(--border)',
      display: 'inline-block', flexShrink: 0,
    }}/>
  );
}

// ─────────────────────── LiveCampaignStats ───────────────────────
function LiveCampaignStats({ campaignId, setPage, dailyLimit }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    apiFetch(`/campaigns/${campaignId}/actions/today`).then(setStats).catch(() => {});
    apiFetch(`/analytics/campaign/${campaignId}`).then(d => setStats(prev => ({ ...prev, allTime: d?.stats }))).catch(() => {});
  }, [campaignId]);

  const sent = stats?.totalSent ?? 0;
  const limit = stats?.dailyLimit ?? dailyLimit;
  const pct = Math.min(100, Math.round((sent / limit) * 100));
  const ch = stats?.channels || {};

  return (
    <div>
      <div style={{ fontSize: 14, color: 'var(--green)', fontWeight: 600, marginBottom: 14 }}>
        ● Campaign is live — engine sending 9am–6pm KL daily
      </div>
      {/* Today's send progress */}
      <div style={{ marginBottom: 16, padding: 14, background: 'var(--s2)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
          <span>Today's sends</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{sent} / {limit}</span>
        </div>
        <div style={{ height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct >= 90 ? 'var(--amber)' : 'var(--green)', borderRadius: 3, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[['✉', 'email', 'var(--blue)'], ['💬', 'wa', 'var(--green)'], ['📞', 'voice', 'var(--amber)']].map(([icon, key, color]) => (
            <div key={key} style={{ fontSize: 11 }}>
              <span style={{ color }}>{icon}</span>
              <span style={{ color: 'var(--text)', marginLeft: 4, fontFamily: 'var(--font-mono)' }}>{ch[key]?.sent ?? 0} sent</span>
              {(ch[key]?.failed ?? 0) > 0 && <span style={{ color: 'var(--red)', marginLeft: 4 }}>✗ {ch[key].failed}</span>}
            </div>
          ))}
        </div>
      </div>
      {/* All-time stats */}
      {stats?.allTime && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Emails Sent',  val: stats.allTime.emailActions ?? 0 },
            { label: 'WA Sent',      val: stats.allTime.waActions ?? 0 },
            { label: 'Replies',      val: stats.allTime.replies ?? 0 },
            { label: 'Meetings',     val: stats.allTime.meetings ?? 0 },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'var(--s2)', borderRadius: 6, padding: '8px 12px', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{stat.val.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setPage('unified-inbox')}>Reply Inbox →</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setPage('lead-intelligence')}>Lead Manager →</button>
      </div>
    </div>
  );
}

// ─────────────────────── LeadAcquisition ───────────────────────
function LeadAcquisition({ campaignId, onImported, showToast }) {
  const [tab, setTab] = useState('gmaps');
  const [loading, setLoading] = useState(false);
  const [csvDragOver, setCsvDragOver] = useState(false);

  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('');
  const [limit, setLimit] = useState(50);

  const [jobTitles, setJobTitles] = useState('');
  const [apolloCity, setApolloCity] = useState('');
  const [apolloLimit, setApolloLimit] = useState(50);

  async function doScrape(mode) {
    setLoading(true);
    try {
      const body = mode === 'apollo'
        ? { mode: 'apollo', city: apolloCity, limit: apolloLimit, jobTitles: jobTitles.split(',').map(s => s.trim()).filter(Boolean) }
        : { mode, keyword, city, limit };
      await apiFetch(`/pipeline/${campaignId}/scrape`, { method: 'POST', body });
      showToast(mode === 'gmaps' ? 'Scraping Google Maps — takes ~90 seconds…' : 'Fetching B2B contacts…');
      await onImported();
    } catch (e) { showToast(e.message, 'red'); }
    setLoading(false);
  }

  async function doUploadCsv(file) {
    setLoading(true);
    try {
      const csvText = await file.text();
      const res = await apiFetch(`/pipeline/${campaignId}/upload-csv`, { method: 'POST', body: { csvText } });
      showToast(`Imported ${res.count} leads from CSV`);
      await onImported();
    } catch (e) { showToast(e.message, 'red'); }
    setLoading(false);
  }

  const tabBtn = (id, label) => (
    <button
      key={id}
      style={{
        padding: '6px 14px', fontSize: 12, fontWeight: tab === id ? 600 : 400,
        background: tab === id ? 'var(--s3,var(--s2))' : 'transparent',
        border: `1px solid ${tab === id ? 'var(--blue)' : 'var(--border)'}`,
        borderRadius: 6, cursor: 'pointer',
        color: tab === id ? 'var(--blue)' : 'var(--muted)',
      }}
      onClick={() => setTab(id)}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
        Choose a source to import leads for this campaign:
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabBtn('gmaps', '🗺 Google Maps')}
        {tabBtn('apollo', '👔 B2B Contacts')}
        {tabBtn('csv', '📄 Upload CSV')}
      </div>

      {tab === 'gmaps' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--s2)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', lineHeight: 1.5 }}>
            Scrapes Google Maps for local businesses. Best for SME outreach — restaurants, clinics, salons, contractors. Requires Outscraper API key in Settings.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3, fontWeight: 600 }}>KEYWORD</div>
              <input className="input" placeholder="e.g. dental clinic, gym, law firm" value={keyword} onChange={e => setKeyword(e.target.value)} style={{ fontSize: 12 }}/>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3, fontWeight: 600 }}>CITY</div>
              <input className="input" placeholder="e.g. Kuala Lumpur, Johor Bahru" value={city} onChange={e => setCity(e.target.value)} style={{ fontSize: 12 }}/>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3, fontWeight: 600 }}>MAX RESULTS</div>
            <select className="input" value={limit} onChange={e => setLimit(parseInt(e.target.value))} style={{ fontSize: 12 }}>
              {[25, 50, 100, 200, 300].map(n => <option key={n} value={n}>{n} leads</option>)}
            </select>
          </div>
          <button className="btn btn-green btn-sm" disabled={loading || !keyword.trim() || !city.trim()} onClick={() => doScrape('gmaps')}>
            {loading ? <><Spinner color="#fff"/> Scraping…</> : `Scrape ${limit} leads from Google Maps →`}
          </button>
        </div>
      )}

      {tab === 'apollo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--s2)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', lineHeight: 1.5 }}>
            Finds B2B decision makers with work emails. Requires Apollo.io API key in Settings. Best for corporate / SaaS outreach.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3, fontWeight: 600 }}>JOB TITLES <span style={{ fontStyle: 'italic', fontWeight: 400 }}>(comma-separated)</span></div>
              <input className="input" placeholder="e.g. Founder, CEO, HR Director" value={jobTitles} onChange={e => setJobTitles(e.target.value)} style={{ fontSize: 12 }}/>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3, fontWeight: 600 }}>CITY</div>
              <input className="input" placeholder="e.g. Kuala Lumpur" value={apolloCity} onChange={e => setApolloCity(e.target.value)} style={{ fontSize: 12 }}/>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3, fontWeight: 600 }}>MAX RESULTS</div>
            <select className="input" value={apolloLimit} onChange={e => setApolloLimit(parseInt(e.target.value))} style={{ fontSize: 12 }}>
              {[25, 50, 100].map(n => <option key={n} value={n}>{n} contacts</option>)}
            </select>
          </div>
          <button className="btn btn-green btn-sm" disabled={loading || !apolloCity.trim()} onClick={() => doScrape('apollo')}>
            {loading ? <><Spinner color="#fff"/> Fetching…</> : `Find ${apolloLimit} B2B contacts →`}
          </button>
        </div>
      )}

      {tab === 'csv' && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.5 }}>
            Upload a CSV with columns: <strong>Name, Company, Phone, Email</strong> (any order, extra columns ignored).
          </div>
          <label
            style={{
              display: 'block',
              border: `2px dashed ${csvDragOver ? 'var(--blue)' : 'var(--border)'}`,
              borderRadius: 8, padding: '28px 24px', textAlign: 'center', cursor: 'pointer',
              background: csvDragOver ? 'oklch(60% 0.2 260 / 0.05)' : 'var(--s2)',
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onDragOver={e => { e.preventDefault(); setCsvDragOver(true); }}
            onDragLeave={() => setCsvDragOver(false)}
            onDrop={e => { e.preventDefault(); setCsvDragOver(false); const f = e.dataTransfer.files[0]; if (f) doUploadCsv(f); }}
          >
            <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) doUploadCsv(f); }}/>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, color: 'var(--muted)' }}>
                <Spinner/> Importing leads…
              </div>
            ) : (
              <>
                <div style={{ fontSize: 22, marginBottom: 6 }}>📄</div>
                <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>Drop CSV here or click to browse</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Columns: Name, Company, Phone, Email, Title, Website, Address</div>
              </>
            )}
          </label>
        </div>
      )}
    </div>
  );
}

// ─────────────────────── Main Component ───────────────────────
export function CampaignPipeline() {
  const { selectedCampaignId, campaigns, updateCampaign, showToast, setPage } = useAppStore(useShallow(s => ({
    selectedCampaignId: s.selectedCampaignId,
    campaigns: s.campaigns,
    updateCampaign: s.updateCampaign,
    showToast: s.showToast,
    setPage: s.setPage,
  })));

  const campaign = campaigns.find(c => c.id === selectedCampaignId);

  // ── State ──
  const [pipeline, setPipeline] = useState(null);
  const [totalLeads, setTotalLeads] = useState(0);
  const [assetCount, setAssetCount] = useState(0);
  const [approvedAssets, setApprovedAssets] = useState(0);
  const [personalizedLeads, setPersonalizedLeads] = useState(0);
  const [loading, setLoading] = useState(true);

  // Panel-specific state
  const [qualifySummary, setQualifySummary] = useState(null);
  const [selectedTiers, setSelectedTiers] = useState(['A', 'B']);
  const [channelEligibility, setChannelEligibility] = useState(null);
  const [deliverabilityResult, setDeliverabilityResult] = useState(null);

  // Assets
  const [assets, setAssets] = useState([]);
  const [expandedAsset, setExpandedAsset] = useState(null);
  const [editingAsset, setEditingAsset] = useState({});
  const [savingAsset, setSavingAsset] = useState(null);
  const [approvingAll, setApprovingAll] = useState(false);

  // Channel strategy (Panel 7)
  const [channelStrategy, setChannelStrategy] = useState(campaign?.channelStrategy || 'balanced');
  const [manualChannels, setManualChannels] = useState({ email: true, wa: false, voice: false });
  const [useManualChannels, setUseManualChannels] = useState(false);
  const [waNumbers, setWaNumbers] = useState([]);
  const [selectedWaNumberId, setSelectedWaNumberId] = useState(campaign?.waNumberId || null);

  // Studio modal
  const [showStudioModal, setShowStudioModal] = useState(false);
  const [studioSequences, setStudioSequences] = useState([]);
  const [studioOffers, setStudioOffers] = useState([]);

  // UI toggles
  const [showAddMore, setShowAddMore] = useState(false);
  const [acting, setActing] = useState(false);
  const [sendConfig, setSendConfig] = useState({
    fromName: campaign?.config?.fromName || '',
    fromEmail: campaign?.config?.fromEmail || '',
    replyTo: campaign?.config?.replyTo || '',
    dailyLimit: String(campaign?.dailyLimit || 200),
  });
  const [savingConfig, setSavingConfig] = useState(false);

  const pollRef = useRef(null);

  // ── Fetch pipeline status ──
  const fetchStatus = useCallback(async () => {
    if (!selectedCampaignId) return;
    try {
      const data = await apiFetch(`/pipeline/${selectedCampaignId}`);
      setPipeline(data.pipeline);
      setTotalLeads(data.totalLeads ?? 0);
      setAssetCount(data.assetCount ?? 0);
      setApprovedAssets(data.approvedAssets ?? 0);
      setPersonalizedLeads(data.personalizedLeads ?? 0);
    } catch (e) {
      console.error('Pipeline fetch failed:', e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCampaignId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // ── Poll in-progress stages ──
  useEffect(() => {
    clearInterval(pollRef.current);
    if (pipeline && POLL_STAGES.has(pipeline.stage)) {
      pollRef.current = setInterval(fetchStatus, 5000);
    }
    return () => clearInterval(pollRef.current);
  }, [pipeline?.stage, fetchStatus]);

  // ── Load qualify summary ──
  useEffect(() => {
    const s = pipeline?.stage;
    if (s === 'ready_for_enrichment' || s === 'qualifying') {
      apiFetch(`/pipeline/${selectedCampaignId}/qualify-summary`)
        .then(d => setQualifySummary(d))
        .catch(() => {});
    }
  }, [pipeline?.stage, selectedCampaignId]);

  // ── Load assets ──
  useEffect(() => {
    const s = pipeline?.stage;
    const assetStages = ['ai_content_ready','personalizing','channels_configured','deliverability_check','ready_to_launch','active','completed'];
    if (assetStages.includes(s)) {
      apiFetch(`/pipeline/${selectedCampaignId}/assets`)
        .then(d => setAssets(d || []))
        .catch(() => {});
    }
  }, [pipeline?.stage, selectedCampaignId]);

  // ── Load channel eligibility ──
  useEffect(() => {
    const s = pipeline?.stage;
    const eligStages = ['channels_configured','deliverability_check','ready_to_launch','active','completed'];
    if (eligStages.includes(s)) {
      apiFetch(`/pipeline/${selectedCampaignId}/channel-eligibility`)
        .then(d => setChannelEligibility(d))
        .catch(() => {});
    }
  }, [pipeline?.stage, selectedCampaignId]);

  // ── Load WA numbers for channel config ──
  useEffect(() => {
    const s = pipeline?.stage;
    const waStages = ['channels_configured','deliverability_check','ready_to_launch','personalizing'];
    if (waStages.includes(s) || stageIndex(s) >= stageIndex('channels_configured')) {
      apiFetch('/meta-wa/numbers').then(nums => setWaNumbers(nums || [])).catch(() => {});
    }
  }, [pipeline?.stage]);

  // ── Actions ──
  async function doAction(endpoint, body, successMsg, errorPrefix) {
    setActing(true);
    try {
      const res = await apiFetch(`/pipeline/${selectedCampaignId}/${endpoint}`, { method: 'POST', body });
      if (successMsg) showToast(successMsg);
      await fetchStatus();
      return res;
    } catch (e) {
      showToast(`${errorPrefix || 'Error'}: ${e.message}`, 'red');
    } finally {
      setActing(false);
    }
  }

  async function doQualify() {
    await doAction('qualify', {}, 'Qualifying leads…', 'Qualify failed');
  }

  async function doEnrichTiers() {
    await doAction('select-enrichment-tiers', { tiers: selectedTiers }, null, 'Error');
    await doAction('enrich', {}, 'Enrichment started', 'Enrich failed');
  }

  async function doAiScore() {
    await doAction('ai-score', {}, 'AI scoring started', 'AI Score failed');
  }

  async function doGenerateAssets() {
    await doAction('generate-assets', {}, 'Generating AI assets…', 'Generate failed');
  }

  async function doPersonalize() {
    await doAction('personalize', {}, 'Personalisation started', 'Personalise failed');
  }

  async function doConfigureChannels() {
    const channels = useManualChannels
      ? Object.entries(manualChannels).filter(([, v]) => v).map(([k]) => k)
      : channelStrategy === 'aggressive' ? ['email','wa','voice']
      : channelStrategy === 'balanced'   ? ['email','wa']
      : ['email'];
    const strategy = useManualChannels ? 'custom' : channelStrategy;
    const body = { strategy, channels };
    if (selectedWaNumberId) body.waNumberId = selectedWaNumberId;
    await doAction('configure-channels', body, 'Channel strategy saved', 'Config failed');
  }

  async function doRunDeliverability() {
    setActing(true);
    try {
      const res = await apiFetch(`/pipeline/${selectedCampaignId}/run-deliverability`, { method: 'POST' });
      setDeliverabilityResult(res);
      showToast('Deliverability check complete');
      await fetchStatus();
    } catch (e) {
      showToast(e.message, 'red');
    } finally {
      setActing(false);
    }
  }

  async function doSaveConfig() {
    setSavingConfig(true);
    try {
      const limit = Math.max(50, Math.min(1000, parseInt(sendConfig.dailyLimit) || 200));
      await apiFetch(`/campaigns/${selectedCampaignId}`, {
        method: 'PATCH',
        body: {
          dailyLimit: limit,
          config: {
            ...(campaign?.config || {}),
            fromName: sendConfig.fromName,
            fromEmail: sendConfig.fromEmail,
            replyTo: sendConfig.replyTo,
          },
        },
      });
      await updateCampaign(selectedCampaignId, {});
      showToast('Sending config saved', 'green');
    } catch (e) {
      showToast(e.message, 'red');
    } finally {
      setSavingConfig(false);
    }
  }

  async function doLaunch() {
    setActing(true);
    try {
      await apiFetch(`/pipeline/${selectedCampaignId}/launch`, { method: 'POST' });
      await updateCampaign(selectedCampaignId, { status: 'active' });
      showToast('Campaign launched! 🚀', 'green');
      await fetchStatus();
    } catch (e) {
      showToast(e.message, 'red');
    } finally {
      setActing(false);
    }
  }

  async function doSaveAsset(asset) {
    setSavingAsset(asset.id);
    try {
      const updated = await apiFetch(`/pipeline/${selectedCampaignId}/assets/${asset.id}`, {
        method: 'PATCH',
        body: {
          editedBody: editingAsset[asset.id]?.body ?? asset.editedBody ?? asset.body,
          subject: editingAsset[asset.id]?.subject ?? asset.subject,
          approved: true,
        },
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
      const fresh = await apiFetch(`/pipeline/${selectedCampaignId}/assets`);
      setAssets(fresh || []);
      setApprovedAssets(assetCount);
      showToast('All assets approved');
    } catch (e) { showToast(e.message, 'red'); }
    setApprovingAll(false);
  }

  // ── Guard ──
  if (!campaign) {
    return (
      <div className="page">
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>
          Campaign not found.{' '}
          <button className="btn btn-ghost btn-sm" onClick={() => setPage('campaigns')}>Back</button>
        </div>
      </div>
    );
  }

  const stage = pipeline?.stage || 'draft';
  const curIdx = stageIndex(stage);
  const isLive = stage === 'active' || stage === 'completed';

  // ── Sidebar nav items ──
  const NAV = [
    { label: '1. Import Leads',     stages: ['draft','scraping','scraped'],                  doneStage: 'scraped'              },
    { label: '2. Qualify & Score',  stages: ['qualifying','ready_for_enrichment'],            doneStage: 'ready_for_enrichment' },
    { label: '3. Enrich Leads',     stages: ['enriching','enrichment_complete'],              doneStage: 'enrichment_complete'  },
    { label: '4. AI Scoring',       stages: ['ai_scoring'],                                   doneStage: 'ai_scoring'           },
    { label: '5. AI Assets',        stages: ['ai_generating', 'ai_content_ready'],            doneStage: 'ai_content_ready'     },
    { label: '6. Personalize',      stages: ['personalizing'],                                doneStage: 'personalizing'        },
    { label: '7. Channel Strategy', stages: ['channels_configured'],                          doneStage: 'channels_configured'  },
    { label: '8. Deliverability',   stages: ['deliverability_check','ready_to_launch'],       doneStage: 'ready_to_launch'      },
    { label: '9. Launch',           stages: ['active','completed'],                           doneStage: 'active'               },
  ];

  // ── Helper: is section done? ──
  function sectionDone(item) {
    return stageIndex(item.doneStage) < curIdx;
  }
  function sectionCurrent(item) {
    return item.stages.some(s => s === stage);
  }
  function sectionLocked(item) {
    return stageIndex(item.stages[0]) > curIdx && !sectionDone(item);
  }

  // ── Personalization label ──
  const plvl = campaign.personalizationLevel || 2;
  const plvlLabel = plvl === 1 ? 'Variable Merge' : plvl === 3 ? 'Deep Research' : 'Smart Opening Line';
  const plvlSpinner = plvl === 3 ? 'Claude Sonnet deep research…' : plvl === 1 ? 'Merging variables…' : 'Claude Haiku personalizing leads…';

  // ── Estimated Apollo cost ──
  function enrichCost() {
    if (!qualifySummary?.tiers) return 0;
    return qualifySummary.tiers
      .filter(t => selectedTiers.includes(t.tier))
      .reduce((sum, t) => sum + (t.count || 0), 0);
  }

  // ── Deliverability score color ──
  function scoreColor(s) {
    if (s >= 80) return 'var(--green)';
    if (s >= 50) return 'var(--amber)';
    return 'var(--red, oklch(62% 0.22 25))';
  }

  // ── Channel strategy cadences ──
  const CADENCES = {
    aggressive: ['Day 1 → Email','Day 2 → WhatsApp','Day 4 → Voice (Tier A only)','Day 7 → Email follow-up','Day 10 → Voice retry (Tier A only)'],
    balanced:   ['Day 1 → Email','Day 2 → WhatsApp','Day 7 → Email follow-up','Day 14 → WhatsApp retry'],
    low_risk:   ['Day 1 → Email','Day 5 → Email follow-up','Day 12 → Email final'],
  };
  const STRATEGY_DESC = {
    aggressive: 'Tier A: Email+WA+Voice, Tier B: Email+WA, Tier C: Email',
    balanced:   'Tier A+B: Email+WA, Tier C: Email only',
    low_risk:   'All tiers: Email only',
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 fade-up">
        <div>
          <div className="breadcrumb">
            <span style={{ cursor: 'pointer', color: 'var(--blue)' }} onClick={() => setPage('campaigns')}>Campaigns</span>
            {' / '}<span>{campaign.name}</span>
            {' / '}<span>Pipeline</span>
          </div>
          <h1 className="page-title" style={{ marginTop: 4 }}>{campaign.name}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 12, fontWeight: 600,
            background: isLive ? 'var(--green-dim)' : stage === 'ready_to_launch' ? 'oklch(72% 0.18 65 / 0.15)' : 'var(--s2)',
            color: isLive ? 'var(--green)' : stage === 'ready_to_launch' ? 'var(--amber)' : 'var(--muted)',
            border: `1px solid ${isLive ? 'var(--green)' : stage === 'ready_to_launch' ? 'var(--amber)' : 'var(--border)'}`,
          }}>
            {isLive ? '● Live' : stage === 'ready_to_launch' ? '● Ready to Launch' : stage.replace(/_/g, ' ')}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage('campaigns')}>← Back</button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          <Spinner/> Loading pipeline…
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, alignItems: 'start' }}>

          {/* ── Left sidebar nav ── */}
          <div className="card fade-up-1" style={{ padding: '12px 0', position: 'sticky', top: 16 }}>
            {NAV.map(item => {
              const done = sectionDone(item);
              const current = sectionCurrent(item);
              const locked = sectionLocked(item);
              const inProgress = current && POLL_STAGES.has(stage);
              return (
                <div
                  key={item.label}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
                    fontSize: 12, fontWeight: current ? 600 : 400,
                    color: locked ? 'var(--muted)' : current ? 'var(--text)' : 'var(--muted)',
                    background: current ? 'var(--s2)' : 'transparent',
                    borderLeft: current ? '2px solid var(--blue)' : '2px solid transparent',
                    cursor: locked ? 'default' : 'pointer',
                  }}
                >
                  {done
                    ? <span style={{ color: 'var(--green)', fontSize: 12, flexShrink: 0 }}>✓</span>
                    : inProgress
                    ? <Spinner/>
                    : <span style={{ width: 8, height: 8, borderRadius: '50%', background: current ? 'var(--blue)' : 'var(--border)', display: 'inline-block', flexShrink: 0 }}/>
                  }
                  {item.label}
                </div>
              );
            })}
          </div>

          {/* ── Right panel area ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Error banner */}
            {pipeline?.lastError && (
              <div style={{ background: 'oklch(62% 0.22 25 / 0.12)', border: '1px solid oklch(62% 0.22 25)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'oklch(62% 0.22 25)' }}>
                ⚠ {pipeline.lastError}
              </div>
            )}

            {/* ══════════ Panel 1: Import Leads ══════════ */}
            {curIdx <= stageIndex('scraped') && (
              <div className="card fade-up-1">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div className="card-title">1. Import Leads</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>Source leads via Google Maps, Apollo B2B, or CSV upload</div>
                  </div>
                  <StageStatus stageKey="scraped" currentStage={stage}/>
                </div>

                {stage === 'scraping' ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                      <Spinner/> Scraping leads (~90s)
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>This page will update automatically when scraping completes.</div>
                  </div>
                ) : totalLeads > 0 ? (
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 22, color: 'var(--green)' }}>{totalLeads}</span>{' '}leads imported
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
                      You can add more leads before qualifying.
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {(stage === 'scraped' || stage === 'draft') && (
                        <button className="btn btn-green btn-sm" disabled={acting} onClick={doQualify}>
                          {acting ? <><Spinner color="#fff"/> Starting…</> : 'Start Qualifying →'}
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-xs"
                        style={{ fontSize: 11 }}
                        onClick={() => setShowAddMore(p => !p)}
                      >
                        {showAddMore ? 'Hide' : '+ Add More Leads'}
                      </button>
                    </div>
                    {showAddMore && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                        <LeadAcquisition campaignId={selectedCampaignId} showToast={showToast} onImported={fetchStatus}/>
                      </div>
                    )}
                  </div>
                ) : (
                  <LeadAcquisition campaignId={selectedCampaignId} showToast={showToast} onImported={fetchStatus}/>
                )}
              </div>
            )}

            {/* ══════════ Panel 2: Qualify & Score ══════════ */}
            {curIdx >= stageIndex('qualifying') && curIdx <= stageIndex('ready_for_enrichment') + 1 && (
              <div className="card fade-up-1">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div className="card-title">2. Qualify & Score</div>
                  <StageStatus stageKey="ready_for_enrichment" currentStage={stage}/>
                </div>

                {stage === 'qualifying' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--muted)' }}>
                      <Spinner/> Scoring leads by quality…
                    </div>
                    <button
                      className="btn btn-ghost btn-xs"
                      style={{ width: 'fit-content', fontSize: 11 }}
                      disabled={acting}
                      onClick={doQualify}
                    >
                      Taking too long? Retry →
                    </button>
                  </div>
                )}

                {(stage === 'ready_for_enrichment' || curIdx > stageIndex('ready_for_enrichment')) && qualifySummary && (
                  <div>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                      {qualifySummary.tiers?.map(t => (
                        <div key={t.tier} style={{
                          flex: 1, minWidth: 130, background: 'var(--s2)', borderRadius: 8, padding: '12px 14px',
                          border: '1px solid var(--border)',
                          borderLeft: `3px solid ${t.tier==='A'?'var(--green)':t.tier==='B'?'var(--amber)':'var(--border)'}`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <TierBadge tier={t.tier}/>
                            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{t.count}</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                            {t.tier === 'A' ? 'Score ≥60 · Hot prospects' : t.tier === 'B' ? 'Score 35-59 · Good leads' : 'Score <35 · Low quality'}
                          </div>
                          {t.samples?.slice(0, 3).map((s, i) => (
                            <div key={i} style={{ fontSize: 10, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.name}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    {stage === 'ready_for_enrichment' && (
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 8, fontWeight: 500 }}>Select tiers to enrich:</div>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                          {['A','B','C'].map(tier => {
                            const t = qualifySummary.tiers?.find(x => x.tier === tier);
                            const cnt = t?.count ?? 0;
                            const checked = selectedTiers.includes(tier);
                            return (
                              <label key={tier} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={e => setSelectedTiers(prev =>
                                    e.target.checked ? [...prev, tier] : prev.filter(x => x !== tier)
                                  )}
                                  style={{ accentColor: 'var(--blue)', width: 14, height: 14 }}
                                />
                                <TierBadge tier={tier}/>
                                <span style={{ color: 'var(--muted)' }}>Enrich Tier {tier} ({cnt} leads)</span>
                              </label>
                            );
                          })}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>
                          ~{enrichCost()} Apollo credits estimated
                        </div>
                        <button
                          className="btn btn-green btn-sm"
                          disabled={acting || selectedTiers.length === 0}
                          onClick={doEnrichTiers}
                        >
                          {acting ? <><Spinner color="#fff"/> Starting…</> : 'Enrich Selected Tiers →'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══════════ Panel 3: Enrich Leads ══════════ */}
            {curIdx >= stageIndex('enriching') && curIdx <= stageIndex('enrichment_complete') + 1 && (
              <div className="card fade-up-1">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div className="card-title">3. Enrich Leads</div>
                  <StageStatus stageKey="enrichment_complete" currentStage={stage}/>
                </div>

                {stage === 'enriching' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)' }}>
                      <Spinner/> Enriching via Apollo.io…
                    </div>
                    <ProgressBar value={pipeline?.enrichComplete || 0} max={pipeline?.enrichTotal || totalLeads}/>
                    <button
                      className="btn btn-ghost btn-xs"
                      style={{ width: 'fit-content', fontSize: 11 }}
                      disabled={acting}
                      onClick={doEnrichTiers}
                    >
                      Taking too long? Retry →
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 13, marginBottom: 10, color: 'var(--text)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--green)' }}>{pipeline?.enrichComplete || 0}</span>
                      {' '}leads enriched successfully
                    </div>
                    {stage === 'enrichment_complete' && (
                      <button className="btn btn-green btn-sm" disabled={acting} onClick={doAiScore}>
                        {acting ? <><Spinner color="#fff"/> Starting…</> : 'Start AI Scoring →'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══════════ Panel 4: AI Scoring ══════════ */}
            {curIdx >= stageIndex('ai_scoring') && curIdx <= stageIndex('ai_content_ready') && (
              <div className="card fade-up-1">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div className="card-title">4. AI Scoring</div>
                  <StageStatus stageKey="ai_scoring" currentStage={stage}/>
                </div>

                {stage === 'ai_scoring' ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
                      <Spinner/> Claude Sonnet is scoring and segmenting leads…
                    </div>
                    <ProgressBar
                      value={pipeline?.aiScoreComplete || 0}
                      max={pipeline?.aiScoreTotal || totalLeads}
                      color="var(--blue)"
                    />
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                      This page will update automatically when scoring completes.
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 500 }}>
                    ✓ AI scoring complete — assets ready to generate
                  </div>
                )}
              </div>
            )}

            {/* ══════════ Panel 5: AI Assets ══════════ */}
            {curIdx >= stageIndex('ai_generating') && curIdx <= stageIndex('personalizing') && (
              <div className="card fade-up-1">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div className="card-title">5. AI Assets</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>Written by Claude — review and approve before launch</div>
                  </div>
                  <StageStatus stageKey="ai_content_ready" currentStage={stage}/>
                </div>

                {/* Personalization level badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>Personalization:</span>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                    background: 'color-mix(in srgb, var(--blue) 12%, var(--s2))',
                    color: 'var(--blue)', border: '1px solid var(--blue)',
                  }}>
                    Level {plvl} — {plvlLabel}
                  </span>
                </div>

                {stage === 'ai_generating' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)' }}>
                      <Spinner/> Claude is generating email, WhatsApp and voice assets…
                    </div>
                    <button className="btn btn-ghost btn-xs" style={{ width: 'fit-content', fontSize: 11 }}
                      disabled={acting} onClick={doGenerateAssets}>
                      Taking too long? Retry →
                    </button>
                  </div>
                )}

                {stage === 'ai_error' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 12, color: 'oklch(62% 0.22 25)' }}>
                      ✗ Asset generation failed — {pipeline?.lastError || 'unknown error'}
                    </div>
                    <button className="btn btn-ghost btn-sm" disabled={acting} onClick={doGenerateAssets}>
                      {acting ? <><Spinner color="#fff"/> Retrying…</> : 'Retry Generate Assets →'}
                    </button>
                  </div>
                )}

                {assets.length === 0 && stage === 'ai_content_ready' && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        const seqs = JSON.parse(localStorage.getItem('kboos_sequences') || '[]');
                        const offs = JSON.parse(localStorage.getItem('kboos_offers') || '[]');
                        setStudioSequences(seqs);
                        setStudioOffers(offs);
                        setShowStudioModal(true);
                      }}
                    >
                      Load from Studio →
                    </button>
                    <button className="btn btn-green btn-sm" disabled={acting} onClick={doGenerateAssets}>
                      {acting ? <><Spinner color="#fff"/> Generating…</> : 'Generate AI Assets →'}
                    </button>

                    {/* Studio Modal */}
                    {showStudioModal && (
                      <>
                        {/* Backdrop */}
                        <div
                          onClick={() => setShowStudioModal(false)}
                          style={{
                            position: 'fixed', inset: 0,
                            background: 'rgba(0,0,0,0.5)',
                            zIndex: 49,
                          }}
                        />
                        {/* Modal */}
                        <div style={{
                          position: 'fixed',
                          top: '50%', left: '50%',
                          transform: 'translate(-50%, -50%)',
                          zIndex: 50,
                          width: 'min(560px, 92vw)',
                          maxHeight: '80vh',
                          overflowY: 'auto',
                          background: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: 12,
                          boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
                          padding: '20px 24px',
                        }}>
                          {/* Header */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                              Load from AI Campaign Studio
                            </div>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '3px 8px', fontSize: 14, lineHeight: 1 }}
                              onClick={() => setShowStudioModal(false)}
                            >
                              ✕
                            </button>
                          </div>

                          {studioSequences.length === 0 && studioOffers.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '24px 0' }}>
                              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
                                Nothing saved yet. Build sequences and offers in AI Campaign Studio first.
                              </div>
                              <button
                                className="btn btn-blue btn-sm"
                                onClick={() => { setShowStudioModal(false); setPage('ai-campaign-studio'); }}
                              >
                                Go to AI Campaign Studio →
                              </button>
                            </div>
                          ) : (
                            <>
                              {/* Section 1: Saved Sequences */}
                              <div style={{ marginBottom: 20 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, letterSpacing: '0.05em' }}>
                                  SAVED SEQUENCES
                                </div>
                                {studioSequences.length === 0 ? (
                                  <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                                    No saved sequences yet. Visit AI Campaign Studio to create some.
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {studioSequences.map(seq => {
                                      const uniqueChannels = [...new Set((seq.steps || []).map(s => s.channel).filter(Boolean))];
                                      const channelIcons = { email: '📧', wa: '💬', whatsapp: '💬', voice: '📞' };
                                      return (
                                        <div
                                          key={seq.id}
                                          onClick={() => {
                                            showToast('Sequence loaded');
                                            setShowStudioModal(false);
                                          }}
                                          style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                                            border: '1px solid var(--border)',
                                            background: 'var(--s1)',
                                            transition: 'border-color 0.15s',
                                          }}
                                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--blue)'}
                                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                        >
                                          <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                                              {seq.name}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                                              {(seq.steps || []).length} step{(seq.steps || []).length !== 1 ? 's' : ''}
                                              {uniqueChannels.length > 0 && (
                                                <span style={{ marginLeft: 8 }}>
                                                  {uniqueChannels.map(ch => channelIcons[ch] || ch).join(' ')}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <span style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 500 }}>Load →</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Section 2: Saved Offers */}
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, letterSpacing: '0.05em' }}>
                                  SAVED OFFERS
                                </div>
                                {studioOffers.length === 0 ? (
                                  <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                                    No saved offers yet. Visit AI Campaign Studio to create some.
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {studioOffers.map(offer => (
                                      <div
                                        key={offer.id}
                                        onClick={() => {
                                          showToast('Offer loaded — click Generate to build assets');
                                          setShowStudioModal(false);
                                        }}
                                        style={{
                                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                          padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                                          border: '1px solid var(--border)',
                                          background: 'var(--s1)',
                                          transition: 'border-color 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green)'}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                      >
                                        <div>
                                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>
                                            {offer.name}
                                          </div>
                                          {offer.targetAudience && (
                                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                                              Audience: {offer.targetAudience}
                                            </div>
                                          )}
                                          {offer.keyBenefit && (
                                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                                              Benefit: {offer.keyBenefit}
                                            </div>
                                          )}
                                        </div>
                                        <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 500 }}>Load →</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {assets.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {approvedAssets}/{assetCount} assets approved
                      </span>
                      {stage === 'ai_content_ready' && (
                        <button className="btn btn-ghost btn-xs" disabled={approvingAll} onClick={doApproveAll}>
                          {approvingAll ? <Spinner/> : 'Approve All'}
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {assets.map(asset => {
                        const isExpanded = expandedAsset === asset.id;
                        const isApproved = asset.approved;
                        const channelIcon = asset.channel === 'email' ? '📧' : asset.channel === 'wa' ? '💬' : '📞';
                        return (
                          <div key={asset.id} style={{ border: `1px solid ${isApproved ? 'var(--green)' : 'var(--border)'}`, borderRadius: 8, overflow: 'hidden' }}>
                            <div
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer', background: 'var(--s1)' }}
                              onClick={() => setExpandedAsset(isExpanded ? null : asset.id)}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 13 }}>{channelIcon}</span>
                                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{asset.label}</span>
                                {isApproved && <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>✓ Approved</span>}
                              </div>
                              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{isExpanded ? '▲' : '▼'}</span>
                            </div>
                            {isExpanded && (
                              <div style={{ padding: '12px 14px', background: 'var(--s2)' }}>
                                {asset.subject && (
                                  <div style={{ marginBottom: 8 }}>
                                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>SUBJECT</div>
                                    <input
                                      className="input"
                                      style={{ fontSize: 12, padding: '5px 8px' }}
                                      defaultValue={asset.subject}
                                      onChange={e => setEditingAsset(prev => ({ ...prev, [asset.id]: { ...prev[asset.id], subject: e.target.value } }))}
                                    />
                                  </div>
                                )}
                                <div style={{ marginBottom: 10 }}>
                                  <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>BODY</div>
                                  <textarea
                                    style={{ width: '100%', minHeight: 120, background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: 'var(--text)', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                                    defaultValue={asset.editedBody || asset.body}
                                    onChange={e => setEditingAsset(prev => ({ ...prev, [asset.id]: { ...prev[asset.id], body: e.target.value } }))}
                                  />
                                </div>
                                {asset.notes && (
                                  <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 10 }}>
                                    Note: {asset.notes}
                                  </div>
                                )}
                                {!isApproved && stage === 'ai_content_ready' && (
                                  <button className="btn btn-green btn-xs" disabled={savingAsset === asset.id} onClick={() => doSaveAsset(asset)}>
                                    {savingAsset === asset.id ? <><Spinner color="#fff"/> Saving…</> : '✓ Approve Asset'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {stage === 'ai_content_ready' && approvedAssets >= assetCount && assetCount > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <button className="btn btn-green btn-sm" disabled={acting} onClick={doPersonalize}>
                          {acting ? <><Spinner color="#fff"/> Starting…</> : 'Start Personalization →'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══════════ Panel 6: Personalize ══════════ */}
            {curIdx >= stageIndex('personalizing') && curIdx <= stageIndex('channels_configured') && (
              <div className="card fade-up-1">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div className="card-title">6. Personalize</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {plvlLabel} — Level {plvl}
                    </div>
                  </div>
                  <StageStatus stageKey="personalizing" currentStage={stage}/>
                </div>

                {stage === 'personalizing' ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
                      <Spinner/> {plvlSpinner}
                    </div>
                    <ProgressBar
                      value={pipeline?.personalizeComplete || 0}
                      max={pipeline?.personalizeTotal || totalLeads}
                      color="var(--green)"
                    />
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 13, marginBottom: 10, color: 'var(--text)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--green)' }}>{personalizedLeads}</span>{' '}leads personalized
                    </div>
                    {(stage === 'channels_configured' || curIdx === stageIndex('channels_configured')) && (
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>Proceed to configure channels below.</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══════════ Panel 7: Channel Strategy ══════════ */}
            {curIdx >= stageIndex('channels_configured') && curIdx <= stageIndex('deliverability_check') && (
              <div className="card fade-up-1">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div className="card-title">7. Channel Strategy</div>
                  <StageStatus stageKey="channels_configured" currentStage={stage}/>
                </div>

                {/* Strategy selector */}
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 8 }}>OUTREACH STRATEGY</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', opacity: useManualChannels ? 0.35 : 1, pointerEvents: useManualChannels ? 'none' : 'auto', transition: 'opacity 0.2s' }}>
                  {[
                    { id: 'aggressive', icon: '🔥', label: 'Aggressive' },
                    { id: 'balanced',   icon: '⚖️',  label: 'Balanced'   },
                    { id: 'low_risk',   icon: '📧', label: 'Low Risk'  },
                  ].map(s => (
                    <div
                      key={s.id}
                      onClick={() => setChannelStrategy(s.id)}
                      style={{
                        flex: 1, minWidth: 120, padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                        border: `2px solid ${channelStrategy === s.id ? 'var(--blue)' : 'var(--border)'}`,
                        background: channelStrategy === s.id ? 'color-mix(in srgb, var(--blue) 8%, var(--s2))' : 'var(--s2)',
                        textAlign: 'center', transition: 'border-color 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 18, marginBottom: 3 }}>{s.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: channelStrategy === s.id ? 700 : 500, color: channelStrategy === s.id ? 'var(--blue)' : 'var(--text)' }}>
                        {s.label}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3, lineHeight: 1.4 }}>
                        {STRATEGY_DESC[s.id]}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cadence preview */}
                {!useManualChannels && (
                  <>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>DEFAULT CADENCE</div>
                    <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                      {(CADENCES[channelStrategy] || []).map((line, i) => (
                        <div key={i} style={{ fontSize: 11, color: 'var(--text)', marginBottom: i < CADENCES[channelStrategy].length - 1 ? 5 : 0 }}>
                          {line}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Manual channel override */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: useManualChannels ? 12 : 0 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>MANUAL OVERRIDE</div>
                      {!useManualChannels && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Pick your own channel combination</div>}
                    </div>
                    <div
                      onClick={() => setUseManualChannels(v => !v)}
                      style={{
                        width: 36, height: 20, borderRadius: 10, cursor: 'pointer', flexShrink: 0,
                        background: useManualChannels ? 'var(--blue)' : 'var(--border)',
                        position: 'relative', transition: 'background 0.2s',
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: 3, left: useManualChannels ? 18 : 3,
                        width: 14, height: 14, borderRadius: '50%', background: '#fff',
                        transition: 'left 0.2s',
                      }}/>
                    </div>
                  </div>
                  {useManualChannels && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[
                        { key: 'email', icon: '📧', label: 'Email', note: 'Valid email required' },
                        { key: 'wa',    icon: '💬', label: 'WhatsApp', note: 'MY mobile required' },
                        { key: 'voice', icon: '📞', label: 'Voice', note: 'Any phone number' },
                      ].map(ch => {
                        const on = manualChannels[ch.key];
                        const eligCount = ch.key === 'email' ? channelEligibility?.eligibleEmail
                          : ch.key === 'wa' ? channelEligibility?.eligibleWa
                          : channelEligibility?.eligibleVoice;
                        return (
                          <div
                            key={ch.key}
                            onClick={() => setManualChannels(prev => {
                              const next = { ...prev, [ch.key]: !prev[ch.key] };
                              const anyOn = Object.values(next).some(Boolean);
                              return anyOn ? next : prev;
                            })}
                            style={{
                              flex: 1, padding: '10px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                              border: `2px solid ${on ? 'var(--blue)' : 'var(--border)'}`,
                              background: on ? 'color-mix(in srgb, var(--blue) 10%, var(--s2))' : 'var(--s2)',
                              transition: 'border-color 0.15s',
                            }}
                          >
                            <div style={{ fontSize: 20, marginBottom: 4 }}>{ch.icon}</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: on ? 'var(--blue)' : 'var(--text)' }}>{ch.label}</div>
                            {eligCount != null && (
                              <div style={{ fontSize: 10, color: 'var(--green)', marginTop: 3 }}>{eligCount} eligible</div>
                            )}
                            <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2, lineHeight: 1.3 }}>{ch.note}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {useManualChannels && !Object.values(manualChannels).some(Boolean) && (
                    <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 8 }}>Select at least one channel</div>
                  )}
                </div>

                {/* Channel eligibility */}
                {channelEligibility && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 8 }}>CHANNEL ELIGIBILITY</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[
                        { icon: '📧', label: 'Email',     eli: channelEligibility.eligibleEmail, ineli: channelEligibility.ineligibleEmail },
                        { icon: '💬', label: 'WhatsApp',  eli: channelEligibility.eligibleWa,    ineli: channelEligibility.ineligibleWa    },
                        { icon: '📞', label: 'Voice',     eli: channelEligibility.eligibleVoice, ineli: channelEligibility.ineligibleVoice },
                      ].map(ch => (
                        <div key={ch.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                          <span style={{ fontSize: 14, width: 20 }}>{ch.icon}</span>
                          <span style={{ color: 'var(--text)', minWidth: 80 }}>{ch.label}:</span>
                          <span style={{ color: 'var(--green)', fontWeight: 500 }}>{ch.eli ?? '—'} eligible</span>
                          <span style={{ color: 'var(--muted)' }}>/</span>
                          <span style={{ color: 'var(--muted)' }}>{ch.ineli ?? '—'} ineligible</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* WA number selector — shown when WA is part of the strategy */}
                {(() => {
                  const hasWa = useManualChannels ? manualChannels.wa : channelStrategy !== 'low_risk';
                  if (!hasWa || waNumbers.length === 0) return null;
                  return (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 8 }}>WHATSAPP NUMBER</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, padding: '8px 12px', borderRadius: 6, border: `1px solid ${!selectedWaNumberId ? 'var(--blue)' : 'var(--border)'}`, background: !selectedWaNumberId ? 'color-mix(in srgb, var(--blue) 8%, var(--s2))' : 'var(--s2)' }}>
                          <input type="radio" checked={!selectedWaNumberId} onChange={() => setSelectedWaNumberId(null)} style={{ accentColor: 'var(--blue)' }}/>
                          <span style={{ flex: 1, color: 'var(--text)' }}>Auto-select</span>
                          <span style={{ fontSize: 10, color: 'var(--muted)' }}>Picks number with most capacity</span>
                        </label>
                        {waNumbers.filter(n => n.active).map(num => (
                          <label key={num.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, padding: '8px 12px', borderRadius: 6, border: `1px solid ${selectedWaNumberId === num.id ? 'var(--green)' : 'var(--border)'}`, background: selectedWaNumberId === num.id ? 'color-mix(in srgb, var(--green) 8%, var(--s2))' : 'var(--s2)' }}>
                            <input type="radio" checked={selectedWaNumberId === num.id} onChange={() => setSelectedWaNumberId(num.id)} style={{ accentColor: 'var(--green)' }}/>
                            <span style={{ flex: 1, fontWeight: 500, color: 'var(--text)' }}>{num.label}</span>
                            <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{num.sentToday}/{num.dailyLimit} today</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {stage === 'channels_configured' && (
                  <button
                    className="btn btn-green btn-sm"
                    disabled={acting || (useManualChannels && !Object.values(manualChannels).some(Boolean))}
                    onClick={doConfigureChannels}
                  >
                    {acting ? <><Spinner color="#fff"/> Saving…</> : 'Save Channel Strategy →'}
                  </button>
                )}
              </div>
            )}

            {/* ══════════ Panel 8: Deliverability ══════════ */}
            {curIdx >= stageIndex('deliverability_check') && curIdx <= stageIndex('active') && (
              <div className="card fade-up-1">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div className="card-title">8. Deliverability Check</div>
                  <StageStatus stageKey="ready_to_launch" currentStage={stage}/>
                </div>

                {!deliverabilityResult && stage === 'deliverability_check' && (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
                      Run a deliverability check to validate DNS, SPF, DKIM, and email warm-up status before launch.
                    </div>
                    <button className="btn btn-blue btn-sm" disabled={acting} onClick={doRunDeliverability}>
                      {acting ? <><Spinner color="#fff"/> Checking…</> : 'Run Deliverability Check'}
                    </button>
                  </div>
                )}

                {deliverabilityResult && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                      <div style={{
                        fontSize: 48, fontWeight: 800, lineHeight: 1,
                        color: scoreColor(deliverabilityResult.score || 0),
                      }}>
                        {deliverabilityResult.score ?? '—'}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Readiness Score</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {(deliverabilityResult.score ?? 0) >= 80 ? 'Excellent — ready to launch' :
                           (deliverabilityResult.score ?? 0) >= 50 ? 'Acceptable — proceed with caution' :
                           'Poor — fix issues before launching'}
                        </div>
                      </div>
                    </div>

                    {deliverabilityResult.checks?.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                        {deliverabilityResult.checks.map((chk, i) => {
                          const icon = chk.pass === true ? '✓' : chk.pass === false ? '✗' : '⚠';
                          const color = chk.pass === true ? 'var(--green)' : chk.pass === false ? 'oklch(62% 0.22 25)' : 'var(--amber)';
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
                              <span style={{ color, flexShrink: 0, fontWeight: 700 }}>{icon}</span>
                              <div>
                                <span style={{ color: 'var(--text)', fontWeight: 500 }}>{chk.label}</span>
                                {chk.detail && <span style={{ color: 'var(--muted)', marginLeft: 6 }}>— {chk.detail}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {(deliverabilityResult.score ?? 0) >= 50 && stage !== 'active' && stage !== 'completed' && (
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        Score ≥ 50 — proceed to launch below.
                      </div>
                    )}
                  </div>
                )}

                {stage === 'ready_to_launch' && (
                  <div style={{ marginTop: deliverabilityResult ? 10 : 0, fontSize: 12, color: 'var(--green)', fontWeight: 500 }}>
                    ✓ Deliverability check passed — ready to launch
                  </div>
                )}
              </div>
            )}

            {/* ══════════ Panel 9: Launch ══════════ */}
            {curIdx >= stageIndex('ready_to_launch') && (
              <div className="card fade-up-1" style={{ border: (stage === 'ready_to_launch' || stage === 'active') ? '1px solid var(--green)' : '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div className="card-title">9. Launch</div>
                  <StageStatus stageKey="active" currentStage={stage}/>
                </div>

                {/* Pre-launch summary */}
                {!isLive && (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
                      All pipeline stages complete. The campaign engine will start sending within the 9am–6pm KL send window.
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
                      {[
                        { label: 'Total Leads',    val: totalLeads },
                        { label: 'Personalized',   val: personalizedLeads },
                        { label: 'AI Assets',      val: assetCount },
                        { label: 'Personalization', val: `Level ${plvl}` },
                        { label: 'Channels',        val: campaign.channels?.join(', ') || '—' },
                      ].map(stat => (
                        <div key={stat.label} style={{ background: 'var(--s2)', borderRadius: 6, padding: '8px 12px', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: 10, color: 'var(--muted)' }}>{stat.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{stat.val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Sending config */}
                    <div style={{ marginBottom: 20, padding: 16, background: 'var(--s2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div className="card-title" style={{ marginBottom: 12 }}>Sending Settings</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>FROM NAME</div>
                          <input
                            className="input"
                            placeholder={`${campaign.bizName} Team`}
                            value={sendConfig.fromName}
                            onChange={e => setSendConfig(s => ({ ...s, fromName: e.target.value }))}
                            style={{ width: '100%', fontSize: 12 }}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>FROM EMAIL</div>
                          <input
                            className="input"
                            placeholder="outreach@yourdomain.com"
                            value={sendConfig.fromEmail}
                            onChange={e => setSendConfig(s => ({ ...s, fromEmail: e.target.value }))}
                            style={{ width: '100%', fontSize: 12 }}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>REPLY-TO</div>
                          <input
                            className="input"
                            placeholder="replies@yourdomain.com"
                            value={sendConfig.replyTo}
                            onChange={e => setSendConfig(s => ({ ...s, replyTo: e.target.value }))}
                            style={{ width: '100%', fontSize: 12 }}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>DAILY LIMIT</div>
                          <input
                            className="input"
                            type="number"
                            min={50}
                            max={1000}
                            value={sendConfig.dailyLimit}
                            onChange={e => setSendConfig(s => ({ ...s, dailyLimit: e.target.value }))}
                            style={{ width: '100%', fontSize: 12 }}
                          />
                        </div>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={doSaveConfig} disabled={savingConfig}>
                        {savingConfig ? 'Saving…' : 'Save Config'}
                      </button>
                    </div>

                    <button
                      className="btn btn-green"
                      style={{ padding: '12px 32px', fontSize: 15, fontWeight: 700 }}
                      disabled={acting}
                      onClick={doLaunch}
                    >
                      {acting ? <><Spinner color="#fff"/> Launching…</> : '🚀 Launch Campaign'}
                    </button>
                  </div>
                )}

                {isLive && (
                  <LiveCampaignStats campaignId={selectedCampaignId} setPage={setPage} dailyLimit={campaign?.dailyLimit || 200} />
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
