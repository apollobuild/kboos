import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { BizAvatar } from '../components/ui/BizAvatar.jsx';
import { apiFetch } from '../services/api.js';
import { ImportLeadsModal } from '../components/ui/ImportLeadsModal.jsx';

const GEN_STEPS = [
  'Analyzing your business brief…',
  'Selecting optimal channels…',
  'Building outreach sequence…',
  'Configuring lead scoring…',
  'Finalizing campaign strategy…',
];

const CHANNEL_STRATEGIES = [
  {
    id: 'aggressive',
    icon: '🔥',
    label: 'Aggressive',
    channels: 'Email + WhatsApp + Voice',
    desc: 'Tier A: All 3 channels, Tier B: Email+WA, Tier C: Email only',
  },
  {
    id: 'balanced',
    icon: '⚖️',
    label: 'Balanced',
    channels: 'Email + WhatsApp',
    desc: 'Tier A+B: Email+WA, Tier C: Email only',
  },
  {
    id: 'low_risk',
    icon: '📧',
    label: 'Low Risk',
    channels: 'Email Only',
    desc: 'All tiers: Email only',
  },
];

const PERSONALIZATION_LEVELS = [
  {
    level: 1,
    label: 'Variable Merge',
    desc: '{{Name}}, {{Company}}, {{City}} — Zero AI cost, instant',
  },
  {
    level: 2,
    label: 'Smart Opening Line',
    desc: 'Haiku generates 1-2 personalized lines per lead — Recommended',
    default: true,
  },
  {
    level: 3,
    label: 'Deep Research',
    desc: 'Sonnet analyses website + reviews per lead — Premium quality',
  },
];

const LEAD_SOURCES = [
  { id: 'smart',       icon: '⚡', label: 'Smart Import',  desc: 'Apollo + Google Maps merged — best data quality' },
  { id: 'apollo',      icon: '👤', label: 'Apollo',        desc: 'Decision makers by title & seniority' },
  { id: 'google_maps', icon: '🗺', label: 'Google Maps',   desc: 'Local businesses by keyword & city' },
  { id: 'csv',         icon: '📁', label: 'CSV Upload',    desc: 'Upload your own lead list' },
  { id: 'manual',      icon: '✏️', label: 'Manual',        desc: 'Add leads one by one later' },
];

const IMPORT_SOURCES = new Set(['smart', 'apollo', 'google_maps']);

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 12, height: 12,
      border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
    }}/>
  );
}

function RadioCard({ selected, onClick, children, color = 'var(--blue)' }) {
  return (
    <div
      onClick={onClick}
      style={{
        border: `2px solid ${selected ? color : 'var(--border)'}`,
        background: selected ? `color-mix(in srgb, ${color} 8%, var(--s2))` : 'var(--s2)',
        borderRadius: 8, padding: '12px 14px', cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
    >
      {children}
    </div>
  );
}

export function NewCampaign() {
  const { businesses, addCampaign, showToast, openCampaignPipeline, setPage } = useAppStore(useShallow(s => ({
    businesses: s.businesses,
    addCampaign: s.addCampaign,
    showToast: s.showToast,
    openCampaignPipeline: s.openCampaignPipeline,
    setPage: s.setPage,
  })));

  const approvedBizList = businesses.filter(b => b.status === 'approved' || !b.status);

  // Mode: null | 'fast' | 'quick' | 'wa'
  const [mode, setMode] = useState(null);

  // WA Connect state
  const [waSessions,   setWaSessions]   = useState([]);
  const [waName,       setWaName]       = useState('');
  const [waSession,    setWaSession]    = useState('');
  const [waSendLimit,  setWaSendLimit]  = useState(50);
  const [waGoal,       setWaGoal]       = useState('');
  const [waSequence,   setWaSequence]   = useState([]);
  const [waLeads,      setWaLeads]      = useState('');
  const [waGenerating, setWaGenerating] = useState(false);
  const [waCreating,   setWaCreating]   = useState(false);
  const [waSteps,      setWaSteps]      = useState(2);
  const [waABEnabled,  setWaABEnabled]  = useState(false);
  const [waSequenceB,  setWaSequenceB]  = useState([]);
  const [waGeneratingB,setWaGeneratingB]= useState(false);
  const [waLeadMode,   setWaLeadMode]   = useState('paste'); // 'paste' | 'pick'
  const [allLeads,     setAllLeads]     = useState([]);
  const [selectedLeads,setSelectedLeads]= useState([]);
  const [leadSearch,   setLeadSearch]   = useState('');

  // Shared fields
  const [bizId, setBizId] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [offer, setOffer] = useState('');
  const [goal, setGoal] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [leadSource, setLeadSource] = useState('google_maps');

  // Quick Setup extra fields
  const [channelStrategy, setChannelStrategy] = useState('balanced');
  const [personalizationLevel, setPersonalizationLevel] = useState('2');
  const [maxLeads, setMaxLeads] = useState('200');

  // AI Fast Track state
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const genTimer = useRef(null);

  // Submission
  const [creating, setCreating] = useState(false);

  // Post-creation import flow
  const [importCampaignId, setImportCampaignId] = useState(null);

  function handleImportClose() {
    const id = importCampaignId;
    setImportCampaignId(null);
    if (id) openCampaignPipeline(id);
  }

  const selBiz = businesses.find(b => b.id === bizId);

  // Load first business by default
  useEffect(() => {
    if (approvedBizList.length === 1 && !bizId) {
      setBizId(approvedBizList[0].id);
    }
  }, [approvedBizList.length]);

  function validate() {
    if (!bizId) { showToast('Select a business first', 'amber'); return false; }
    if (!campaignName.trim()) { showToast('Enter a campaign name', 'amber'); return false; }
    if (!offer.trim()) { showToast('Describe your offer', 'amber'); return false; }
    if (!goal.trim()) { showToast('Describe your goal', 'amber'); return false; }
    if (!targetAudience.trim()) { showToast('Describe your target audience', 'amber'); return false; }
    return true;
  }

  // AI Fast Track submit
  async function doFastCreate() {
    if (!validate()) return;
    setCreating(true);
    setGenerating(true);
    setGenStep(0);
    genTimer.current = setInterval(() => setGenStep(s => Math.min(s + 1, GEN_STEPS.length - 1)), 900);
    try {
      const generated = await apiFetch('/ai/generate-campaign', {
        method: 'POST',
        body: { bizId, goal, offer, targetAudience },
      });
      clearInterval(genTimer.current);
      setGenerating(false);
      const biz = selBiz;
      const newC = await addCampaign({
        ...generated,
        bizId,
        bizName: biz?.name || '',
        name: campaignName.trim(),
        offer, goal, targetAudience,
        personalizationLevel: 2,
        leadSource,
        color: biz?.color || 'blue',
        status: 'active',
      });
      if (newC?.id) {
        if (IMPORT_SOURCES.has(leadSource)) {
          setImportCampaignId(newC.id);
        } else {
          openCampaignPipeline(newC.id);
        }
      }
    } catch (e) {
      clearInterval(genTimer.current);
      setGenerating(false);
      showToast(e.message || 'Generation failed', 'red');
    } finally {
      setCreating(false);
    }
  }

  // Quick Setup submit
  async function doQuickCreate() {
    if (!validate()) return;
    setCreating(true);
    try {
      const strategy = channelStrategy;
      const channels =
        strategy === 'aggressive' ? ['email', 'wa', 'voice'] :
        strategy === 'balanced' ? ['email', 'wa'] :
        ['email'];
      const biz = selBiz;
      const newC = await addCampaign({
        bizId,
        bizName: biz?.name || '',
        name: campaignName.trim(),
        offer,
        goal,
        targetAudience,
        personalizationLevel: parseInt(personalizationLevel),
        leadSource,
        channelStrategy: strategy,
        channels,
        color: biz?.color || 'blue',
        status: 'active',
        total: parseInt(maxLeads) || 200,
      });
      if (newC?.id) {
        if (IMPORT_SOURCES.has(leadSource)) {
          setImportCampaignId(newC.id);
        } else {
          openCampaignPipeline(newC.id);
        }
      }
    } catch (e) {
      showToast(e.message || 'Failed to create campaign', 'red');
    } finally {
      setCreating(false);
    }
  }

  // No businesses
  if (approvedBizList.length === 0) {
    return (
      <div className="page">
        <div className="breadcrumb">Campaigns / <span>New Campaign</span></div>
        <h1 className="page-title" style={{ marginTop: 4 }}>New Campaign</h1>
        <div className="card fade-up-1" style={{ padding: 28, maxWidth: 480, marginTop: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏢</div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>No businesses yet</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
            You need at least one approved business before creating a campaign.
          </div>
          <button className="btn btn-primary" onClick={() => setPage('businesses')}>
            Create a Business →
          </button>
        </div>
      </div>
    );
  }

  // Mode selector
  if (!mode) return (
    <div className="page">
      <div className="fade-up" style={{ marginBottom: 32 }}>
        <div className="breadcrumb">Campaigns / <span>New Campaign</span></div>
        <h1 className="page-title" style={{ marginTop: 4 }}>New Campaign</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
          How would you like to configure this campaign?
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, maxWidth: 1020 }}>
        {/* AI Fast Track */}
        <div
          className="card fade-up-1"
          onClick={() => setMode('fast')}
          style={{
            cursor: 'pointer', border: '2px solid var(--green)', padding: 28,
            transition: 'transform 0.15s', position: 'relative', overflow: 'hidden',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: 'var(--green)', opacity: 0.06, borderRadius: '0 0 0 80px' }}/>
          <div style={{ fontSize: 28, marginBottom: 10 }}>⚡</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--green)', marginBottom: 6 }}>AI Fast Track</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 14 }}>
            Describe your goal, AI configures everything
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {['AI picks channels & strategy', 'Auto-configures sequence', 'One prompt to launch'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text)' }}>
                <span style={{ color: 'var(--green)', fontSize: 10 }}>✓</span>{t}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Setup */}
        <div
          className="card fade-up-1"
          onClick={() => setMode('quick')}
          style={{
            cursor: 'pointer', border: '2px solid var(--blue)', padding: 28,
            transition: 'transform 0.15s', position: 'relative', overflow: 'hidden',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: 'var(--blue)', opacity: 0.06, borderRadius: '0 0 0 80px' }}/>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🔧</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--blue)', marginBottom: 6 }}>Quick Setup</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 14 }}>
            Pick your settings manually
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {['Choose channel strategy', 'Set personalization level', 'Full control over settings'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text)' }}>
                <span style={{ color: 'var(--blue)', fontSize: 10 }}>✓</span>{t}
              </div>
            ))}
          </div>
        </div>
        {/* WA Connect */}
        <div
          className="card fade-up-1"
          onClick={() => setMode('wa')}
          style={{
            cursor: 'pointer', border: '2px solid oklch(65% 0.2 145)', padding: 28,
            transition: 'transform 0.15s', position: 'relative', overflow: 'hidden',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: 'oklch(65% 0.2 145)', opacity: 0.06, borderRadius: '0 0 0 80px' }}/>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📲</div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'oklch(65% 0.2 145)' }}>WA Connect</div>
            <span style={{ fontSize:9, background:'oklch(65% 0.2 145 / 0.15)', color:'oklch(65% 0.2 145)', border:'1px solid oklch(65% 0.2 145 / 0.3)', borderRadius:4, padding:'1px 6px', fontWeight:700 }}>FREE</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 14 }}>
            Send via your own WhatsApp number — no WATI needed
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {['AI writes the message sequence', 'Set daily send limit (max 200)', 'No business name needed'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text)' }}>
                <span style={{ color: 'oklch(65% 0.2 145)', fontSize: 10 }}>✓</span>{t}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20, fontSize: 12, color: 'var(--muted)' }}>
        Choose Smart Import, Apollo, or Google Maps as your lead source and the import screen opens automatically after creation.
      </div>
    </div>
  );

  // Shared form fields section
  const sharedFields = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Business */}
      <div>
        <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 8 }}>BUSINESS</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {approvedBizList.map(b => (
            <div
              key={b.id}
              onClick={() => setBizId(b.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px',
                borderRadius: 8, cursor: 'pointer', fontSize: 12,
                border: `2px solid ${bizId === b.id ? 'var(--blue)' : 'var(--border)'}`,
                background: bizId === b.id ? 'color-mix(in srgb, var(--blue) 8%, var(--s2))' : 'var(--s2)',
                fontWeight: bizId === b.id ? 600 : 400,
                transition: 'border-color 0.15s',
              }}
            >
              <BizAvatar id={b.id} name={b.name} color={b.color} size={18}/>
              {b.name}
            </div>
          ))}
        </div>
      </div>

      {/* Campaign Name */}
      <div>
        <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>CAMPAIGN NAME</label>
        <input
          className="input"
          placeholder='e.g. "Q3 HR Directors Outreach"'
          value={campaignName}
          onChange={e => setCampaignName(e.target.value)}
        />
      </div>

      {/* Offer */}
      <div>
        <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>OFFER</label>
        <input
          className="input"
          placeholder='e.g. "HR payroll software for SMEs"'
          value={offer}
          onChange={e => setOffer(e.target.value)}
        />
      </div>

      {/* Goal */}
      <div>
        <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>GOAL</label>
        <input
          className="input"
          placeholder='e.g. "Book 20 demo calls per month"'
          value={goal}
          onChange={e => setGoal(e.target.value)}
        />
      </div>

      {/* Target Audience */}
      <div>
        <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>TARGET AUDIENCE</label>
        <input
          className="input"
          placeholder='e.g. "HR Directors at companies with 50-500 staff"'
          value={targetAudience}
          onChange={e => setTargetAudience(e.target.value)}
        />
      </div>

      {/* Lead Source */}
      <div>
        <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 8 }}>LEAD SOURCE</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
          {LEAD_SOURCES.map(ls => {
            const active = leadSource === ls.id;
            const isImport = IMPORT_SOURCES.has(ls.id);
            return (
              <div
                key={ls.id}
                onClick={() => setLeadSource(ls.id)}
                style={{
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  border: `2px solid ${active ? (isImport ? 'var(--green)' : 'var(--blue)') : 'var(--border)'}`,
                  background: active ? `color-mix(in srgb, ${isImport ? 'var(--green)' : 'var(--blue)'} 8%, var(--s2))` : 'var(--s2)',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <div style={{ fontSize: 16, marginBottom: 4 }}>{ls.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: active ? (isImport ? 'var(--green)' : 'var(--blue)') : 'var(--text)', marginBottom: 2 }}>{ls.label}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.4 }}>{ls.desc}</div>
              </div>
            );
          })}
        </div>
        {IMPORT_SOURCES.has(leadSource) && (
          <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 8 }}>
            ✓ After creation, the Import Leads screen will open automatically
          </div>
        )}
      </div>
    </div>
  );

  // AI Fast Track page
  if (mode === 'fast') return (
    <div className="page">
      <div className="flex items-center justify-between mb-4 fade-up">
        <div>
          <div className="breadcrumb">Campaigns / New Campaign / <span>AI Fast Track</span></div>
          <h1 className="page-title" style={{ marginTop: 4 }}>AI Fast Track</h1>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => { setMode(null); setGenerating(false); clearInterval(genTimer.current); }}>← Back</button>
      </div>

      {/* Generating state */}
      {generating && (
        <div className="card fade-up-1" style={{ maxWidth: 520, padding: 28 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 18, color: 'var(--text)' }}>Claude is building your campaign…</div>
          {GEN_STEPS.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: 13 }}>
              {i < genStep
                ? <span style={{ color: 'var(--green)', fontSize: 14, width: 18 }}>✓</span>
                : i === genStep
                ? <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }}/>
                : <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--border)', display: 'inline-block', flexShrink: 0 }}/>
              }
              <span style={{ color: i <= genStep ? 'var(--text)' : 'var(--muted)' }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Form — shown when not generating */}
      {!generating && (
        <div className="card fade-up-1" style={{ maxWidth: 600, padding: 24 }}>
          {sharedFields}
          <div style={{ marginTop: 20 }}>
            <button
              className="btn btn-green"
              style={{ width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 700 }}
              disabled={creating}
              onClick={doFastCreate}
            >
              {creating ? <><Spinner /> Generating…</> : '⚡ Generate & Create →'}
            </button>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
            Claude will configure channels, strategy, and sequence automatically
          </div>
        </div>
      )}

      {importCampaignId && (
        <ImportLeadsModal defaultCampaignId={importCampaignId} onClose={handleImportClose} />
      )}
    </div>
  );

  // Quick Setup page
  if (mode === 'quick') return (
    <div className="page">
      <div className="flex items-center justify-between mb-4 fade-up">
        <div>
          <div className="breadcrumb">Campaigns / New Campaign / <span>Quick Setup</span></div>
          <h1 className="page-title" style={{ marginTop: 4 }}>Quick Setup</h1>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setMode(null)}>← Back</button>
      </div>

      <div style={{ maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div className="card fade-up-1" style={{ padding: 24, marginBottom: 14 }}>
          {sharedFields}
        </div>

        {/* Channel Strategy */}
        <div className="card fade-up-1" style={{ padding: 20, marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 12 }}>CHANNEL STRATEGY</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CHANNEL_STRATEGIES.map(cs => (
              <RadioCard
                key={cs.id}
                selected={channelStrategy === cs.id}
                onClick={() => setChannelStrategy(cs.id)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{cs.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: channelStrategy === cs.id ? 'var(--blue)' : 'var(--text)' }}>
                        {cs.label}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{cs.channels}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>{cs.desc}</div>
                  </div>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                    border: `2px solid ${channelStrategy === cs.id ? 'var(--blue)' : 'var(--border)'}`,
                    background: channelStrategy === cs.id ? 'var(--blue)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {channelStrategy === cs.id && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }}/>}
                  </div>
                </div>
              </RadioCard>
            ))}
          </div>
        </div>

        {/* Personalization Level */}
        <div className="card fade-up-1" style={{ padding: 20, marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 12 }}>AI PERSONALIZATION LEVEL</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PERSONALIZATION_LEVELS.map(pl => (
              <RadioCard
                key={pl.level}
                selected={personalizationLevel === String(pl.level)}
                onClick={() => setPersonalizationLevel(String(pl.level))}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: personalizationLevel === String(pl.level) ? 'var(--blue)' : 'var(--border)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {pl.level}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: personalizationLevel === String(pl.level) ? 'var(--blue)' : 'var(--text)', marginBottom: 2 }}>
                      Level {pl.level}: {pl.label}
                      {pl.default && <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 500, marginLeft: 6 }}>Recommended</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>{pl.desc}</div>
                  </div>
                </div>
              </RadioCard>
            ))}
          </div>
        </div>

        {/* Max Leads */}
        <div className="card fade-up-1" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 8 }}>MAX LEADS</div>
          <input
            type="number"
            className="input"
            value={maxLeads}
            min={1}
            max={10000}
            onChange={e => setMaxLeads(e.target.value)}
            style={{ maxWidth: 160 }}
          />
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
            Default: 200 leads per campaign
          </div>
        </div>

        <button
          className="btn btn-primary"
          style={{ padding: '13px 0', fontSize: 15, fontWeight: 700, borderRadius: 10, width: '100%' }}
          disabled={creating}
          onClick={doQuickCreate}
        >
          {creating ? <><Spinner /> Creating…</> : IMPORT_SOURCES.has(leadSource) ? 'Create Campaign & Import Leads →' : 'Create Campaign →'}
        </button>
      </div>

      {importCampaignId && (
        <ImportLeadsModal defaultCampaignId={importCampaignId} onClose={handleImportClose} />
      )}
    </div>
  );

  // ── WA Connect Campaign ───────────────────────────────────────────────────
  if (mode === 'wa') {
    // Load sessions on first render
    if (waSessions.length === 0 && !waCreating) {
      apiFetch('/openwa/sessions').then(s => { setWaSessions(s); if (s.length) setWaSession(s[0].id); }).catch(() => {});
    }

    async function generateSequence() {
      if (!waGoal) return;
      setWaGenerating(true);
      try {
        const result = await apiFetch('/ai/wa-sequence', { method:'POST', body:{ goal: waGoal, steps: waSteps } });
        setWaSequence(Array.isArray(result) ? result : []);
      } catch (e) { alert('AI generation failed: ' + e.message); }
      finally { setWaGenerating(false); }
    }

    async function createWACampaign() {
      if (!waName || !waSession) return;
      setWaCreating(true);
      try {
        let leads = [];
        if (waLeadMode === 'paste') {
          leads = waLeads.split('\n').filter(Boolean).map(line => {
            const parts = line.split(',').map(p => p.trim());
            return { name: parts[0] || '', phone: parts[1] || '', company: parts[2] || '' };
          }).filter(l => l.phone);
        } else {
          const dbLeads = allLeads.filter(l => selectedLeads.includes(l.id));
          leads = dbLeads.map(l => ({ name: l.name || '', phone: l.phone || '', company: l.company || '' }));
        }
        await apiFetch('/openwa/campaigns', {
          method:'POST',
          body:{ name: waName, sessionId: waSession, goal: waGoal, sequence: waSequence, leads, sendLimit: waSendLimit, sequenceSteps: waSteps, abEnabled: waABEnabled, abVariantB: waSequenceB }
        });
        showToast(`Campaign "${waName}" created`, 'green');
        setPage('campaign-dashboard');
      } catch (e) { alert('Failed to create: ' + e.message); }
      finally { setWaCreating(false); }
    }

    const connectedSessions = waSessions.filter(s => s.liveStatus === 'WORKING' || s.status === 'connected');

    return (
      <div className="page">
        <div className="fade-up" style={{ marginBottom:24 }}>
          <div className="breadcrumb">Campaigns / New Campaign / <span>WA Connect</span></div>
          <h1 className="page-title" style={{ marginTop:4 }}>WA Connect Campaign</h1>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ marginBottom:20 }} onClick={() => setMode(null)}>← Back</button>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, maxWidth:900 }}>
          {/* Left col */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Campaign name */}
            <div className="card" style={{ padding:'18px' }}>
              <div className="card-title" style={{ marginBottom:10 }}>Campaign Name</div>
              <input className="input" style={{ width:'100%', boxSizing:'border-box' }}
                placeholder="e.g. Web Design Outreach May"
                value={waName} onChange={e => setWaName(e.target.value)} />
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>No business needed — this campaign runs standalone</div>
            </div>

            {/* Pick number */}
            <div className="card" style={{ padding:'18px' }}>
              <div className="card-title" style={{ marginBottom:10 }}>Send From</div>
              {connectedSessions.length === 0 ? (
                <div style={{ fontSize:12, color:'var(--amber)', lineHeight:1.6 }}>
                  ⚠️ No connected numbers yet. Go to <strong>Settings → Integrations → Communications</strong> and connect a WhatsApp number first.
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {connectedSessions.map(s => (
                    <div key={s.id} onClick={() => setWaSession(s.id)}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, border:`1px solid ${waSession === s.id ? 'var(--green)' : 'var(--border)'}`, background: waSession === s.id ? 'oklch(65% 0.2 145 / 0.08)' : 'var(--s2)', cursor:'pointer' }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--green)', flexShrink:0 }} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:600 }}>{s.label}</div>
                        <div style={{ fontSize:11, color:'var(--muted)' }}>{s.phone || 'Connected'} · {s.sentToday}/{s.dailyLimit} sent today</div>
                      </div>
                      {waSession === s.id && <span style={{ fontSize:12, color:'var(--green)' }}>✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Daily send limit */}
            <div className="card" style={{ padding:'18px' }}>
              <div className="card-title" style={{ marginBottom:10 }}>Messages to Send</div>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <input type="range" min="1" max="200" value={waSendLimit}
                  onChange={e => setWaSendLimit(parseInt(e.target.value))}
                  style={{ flex:1, accentColor:'var(--green)' }} />
                <div style={{ fontSize:22, fontWeight:700, color:'var(--green)', fontFamily:'var(--font-mono)', minWidth:40, textAlign:'right' }}>{waSendLimit}</div>
              </div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>Max 200/day per number · Sends spread ~30s apart to stay safe</div>
            </div>
          </div>

          {/* Right col */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* AI Sequence */}
            <div className="card" style={{ padding:'18px' }}>
              <div className="card-title" style={{ marginBottom:10 }}>AI Message Sequence</div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8 }}>How many messages in the sequence?</div>
                <div style={{ display:'flex', gap:8 }}>
                  {[1,2,3].map(n => (
                    <button key={n} onClick={() => setWaSteps(n)}
                      style={{ flex:1, padding:'8px', borderRadius:8, border:`1px solid ${waSteps === n ? 'oklch(65% 0.2 145)' : 'var(--border)'}`, background: waSteps === n ? 'oklch(65% 0.2 145 / 0.12)' : 'var(--s2)', color: waSteps === n ? 'oklch(65% 0.2 145)' : 'var(--muted)', fontWeight: waSteps === n ? 700 : 400, cursor:'pointer', fontSize:12 }}>
                      {n === 1 ? '1 message' : `${n} messages`}
                      <div style={{ fontSize:10, color:'var(--muted)', marginTop:2 }}>{n === 1 ? 'One-shot' : n === 2 ? 'Intro + Follow-up' : 'Full sequence'}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8 }}>Describe your goal — Claude writes the messages</div>
              <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                <input className="input" style={{ flex:1, boxSizing:'border-box' }}
                  placeholder="e.g. Follow up with SME owners about web design services"
                  value={waGoal} onChange={e => setWaGoal(e.target.value)} />
                <button className="btn btn-primary btn-sm" onClick={generateSequence} disabled={!waGoal || waGenerating}>
                  {waGenerating ? '✨ Writing…' : '✨ Generate'}
                </button>
              </div>
              {waSequence.length > 0 ? (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {waSequence.map((step, i) => (
                    <div key={i} style={{ background:'var(--s2)', borderRadius:8, padding:'10px 12px', border:'1px solid var(--border)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                        <span style={{ fontSize:10, fontWeight:700, color:'var(--blue)', background:'oklch(62% 0.19 245 / 0.12)', borderRadius:4, padding:'2px 7px' }}>Day {step.day}</span>
                        <span style={{ fontSize:11, color:'var(--muted)' }}>{step.label}</span>
                      </div>
                      <textarea
                        style={{ width:'100%', boxSizing:'border-box', background:'transparent', border:'none', color:'var(--text)', fontSize:12, resize:'vertical', lineHeight:1.5, outline:'none', minHeight:60 }}
                        value={step.message}
                        onChange={e => setWaSequence(prev => prev.map((s, si) => si === i ? { ...s, message: e.target.value } : s))}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign:'center', padding:'20px 0', color:'var(--muted)', fontSize:12 }}>
                  Enter your goal above and click Generate →
                </div>
              )}
              {waSequence.length > 0 && (
                <div style={{ marginTop:12, padding:'10px 12px', background:'var(--s2)', borderRadius:8, border:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600 }}>A/B Test</div>
                      <div style={{ fontSize:10, color:'var(--muted)' }}>Generate a second message variant — split leads 50/50</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={async () => {
                      if (!waABEnabled) {
                        setWaABEnabled(true);
                        if (!waSequenceB.length) {
                          setWaGeneratingB(true);
                          try {
                            const r = await apiFetch('/ai/wa-sequence', { method:'POST', body:{ goal: waGoal + ' (variant B — try different angle)', steps: waSteps } });
                            setWaSequenceB(Array.isArray(r) ? r : []);
                          } catch {}
                          finally { setWaGeneratingB(false); }
                        }
                      } else {
                        setWaABEnabled(false);
                      }
                    }}>
                      {waABEnabled ? '✕ Remove B' : waGeneratingB ? '✨ Generating…' : '+ Add Variant B'}
                    </button>
                  </div>
                  {waABEnabled && waSequenceB.length > 0 && (
                    <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'var(--blue)', marginBottom:4 }}>VARIANT B</div>
                      {waSequenceB.map((step, i) => (
                        <div key={i} style={{ background:'oklch(62% 0.19 245 / 0.06)', borderRadius:6, padding:'8px 10px', border:'1px solid oklch(62% 0.19 245 / 0.2)' }}>
                          <div style={{ fontSize:10, color:'var(--blue)', fontWeight:700, marginBottom:4 }}>Day {step.day} · {step.label}</div>
                          <textarea style={{ width:'100%', boxSizing:'border-box', background:'transparent', border:'none', color:'var(--text)', fontSize:12, resize:'vertical', lineHeight:1.5, outline:'none', minHeight:50 }}
                            value={step.message}
                            onChange={e => setWaSequenceB(prev => prev.map((s,si) => si===i ? {...s,message:e.target.value} : s))} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Leads */}
            <div className="card" style={{ padding:'18px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div className="card-title">Leads</div>
                <div style={{ display:'flex', background:'var(--s2)', borderRadius:6, padding:2, gap:2 }}>
                  {[['paste','Paste CSV'],['pick','From Lead Manager']].map(([v,l]) => (
                    <button key={v} onClick={() => {
                      setWaLeadMode(v);
                      if (v === 'pick' && !allLeads.length) {
                        apiFetch('/leads').then(r => setAllLeads(Array.isArray(r) ? r.filter(lead => lead.phone) : [])).catch(() => {});
                      }
                    }}
                      style={{ padding:'3px 10px', borderRadius:4, fontSize:10, fontWeight:600, cursor:'pointer', border:'none',
                        background: waLeadMode === v ? 'var(--blue)' : 'transparent',
                        color: waLeadMode === v ? '#fff' : 'var(--muted)' }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {waLeadMode === 'paste' ? (
                <>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8 }}>One per line: <code style={{ background:'var(--s2)', padding:'1px 4px', borderRadius:3 }}>Name, Phone, Company</code></div>
                  <textarea className="input" rows={6} style={{ width:'100%', boxSizing:'border-box', resize:'vertical', fontSize:12, fontFamily:'var(--font-mono)' }}
                    placeholder={"Ahmad Zul, 60123456789, Gadong Sdn Bhd\nSarah Lee, 60198765432, Tech Corp"}
                    value={waLeads} onChange={e => setWaLeads(e.target.value)} />
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>
                    {waLeads.split('\n').filter(l => l.includes(',') && l.trim()).length} leads entered
                  </div>
                </>
              ) : (
                <>
                  <input className="input" style={{ width:'100%', boxSizing:'border-box', marginBottom:8 }}
                    placeholder="Search by name or company..."
                    value={leadSearch} onChange={e => setLeadSearch(e.target.value)} />
                  <div style={{ maxHeight:200, overflowY:'auto', display:'flex', flexDirection:'column', gap:4 }}>
                    {allLeads.filter(l => !leadSearch || l.name?.toLowerCase().includes(leadSearch.toLowerCase()) || l.company?.toLowerCase().includes(leadSearch.toLowerCase())).slice(0,50).map(l => {
                      const sel = selectedLeads.includes(l.id);
                      return (
                        <div key={l.id} onClick={() => setSelectedLeads(prev => sel ? prev.filter(id => id !== l.id) : [...prev, l.id])}
                          style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:6, cursor:'pointer',
                            background: sel ? 'oklch(65% 0.2 145 / 0.1)' : 'var(--s2)', border:`1px solid ${sel ? 'oklch(65% 0.2 145 / 0.4)' : 'var(--border)'}` }}>
                          <span style={{ width:14, height:14, borderRadius:3, border:`2px solid ${sel ? 'var(--green)' : 'var(--border)'}`, background: sel ? 'var(--green)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:9, color:'#fff' }}>{sel ? '✓' : ''}</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{l.name}</div>
                            <div style={{ fontSize:10, color:'var(--muted)' }}>{l.company} · {l.phone}</div>
                          </div>
                        </div>
                      );
                    })}
                    {allLeads.length === 0 && <div style={{ color:'var(--muted)', fontSize:12, padding:'12px 0', textAlign:'center' }}>Loading leads…</div>}
                  </div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>{selectedLeads.length} leads selected · {allLeads.filter(l=>l.phone).length} total with phone</div>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop:20, maxWidth:900 }}>
          <button className="btn btn-green" style={{ padding:'13px 40px', fontSize:15, fontWeight:700 }}
            disabled={!waName || !waSession || waSequence.length === 0 || waCreating}
            onClick={createWACampaign}>
            {waCreating ? 'Creating…' : '✓ Save WA Campaign →'}
          </button>
          <div style={{ fontSize:11, color:'var(--muted)', marginTop:8 }}>Campaign is saved as draft — launch it from Campaign Dashboard when ready</div>
        </div>
      </div>
    );
  }
}
