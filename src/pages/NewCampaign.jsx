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

const CHANNELS = [
  { id: 'email', icon: '📧', label: 'Email', desc: 'Cold email outreach' },
  { id: 'wa',    icon: '💬', label: 'WhatsApp', desc: 'WhatsApp messages' },
  { id: 'voice', icon: '📞', label: 'Voice Agent', desc: 'AI voice calls' },
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
  const [waMsgMode,    setWaMsgMode]    = useState('write'); // 'write' | 'ai'
  const [waManualMsgs, setWaManualMsgs] = useState(['']); // manual message texts per step
  const [waSavedId,    setWaSavedId]    = useState(null);  // id after save — shows launch button
  const [waLaunching,  setWaLaunching]  = useState(false);
  const [waLaunchResult,setWaLaunchResult]= useState(null);
  const [waLeadMode,   setWaLeadMode]   = useState('paste'); // 'paste' | 'upload' | 'pick'
  const [allLeads,     setAllLeads]     = useState([]);
  const [selectedLeads,setSelectedLeads]= useState([]);
  const [leadSearch,   setLeadSearch]   = useState('');
  const [uploadedLeads,setUploadedLeads]= useState([]);
  const [uploadFileName,setUploadFileName]= useState('');

  // Meta WA state
  const [metaTemplates,   setMetaTemplates]   = useState([]);
  const [metaTemplate,    setMetaTemplate]     = useState(null); // selected template object
  const [metaVarMap,      setMetaVarMap]       = useState({}); // { '1': 'name', '2': 'company' }
  const [metaLeads,       setMetaLeads]        = useState('');
  const [metaLeadMode,    setMetaLeadMode]     = useState('paste');
  const [metaUpLeads,     setMetaUpLeads]      = useState([]);
  const [metaUpFileName,  setMetaUpFileName]   = useState('');
  const [metaSelLeads,    setMetaSelLeads]     = useState([]);
  const [metaAllLeads,    setMetaAllLeads]     = useState([]);
  const [metaSearch,      setMetaSearch]       = useState('');
  const [metaStep,        setMetaStep]         = useState(1);
  const [metaName,        setMetaName]         = useState('');
  const [metaSending,     setMetaSending]      = useState(false);
  const [metaResult,      setMetaResult]       = useState(null);
  const [metaLoadingTpl,  setMetaLoadingTpl]   = useState(false);
  const [waStep,       setWaStep]       = useState(1); // wizard step 1-4

  // Shared fields
  const [bizId, setBizId] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [offer, setOffer] = useState('');
  const [goal, setGoal] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [leadSource, setLeadSource] = useState('google_maps');

  // Quick Setup extra fields
  const [selectedChannels, setSelectedChannels] = useState(['email', 'wa']);
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
    if (selectedChannels.length === 0) { showToast('Select at least one channel', 'amber'); return; }
    setCreating(true);
    try {
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
        channels: selectedChannels,
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, maxWidth: 1360 }}>
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
        {/* Meta WA */}
        <div
          className="card fade-up-1"
          onClick={() => { setMode('meta'); setMetaLoadingTpl(true); apiFetch('/meta-wa/templates').then(t => { setMetaTemplates(t); setMetaLoadingTpl(false); }).catch(() => setMetaLoadingTpl(false)); }}
          style={{
            cursor: 'pointer', border: '2px solid #1877f2', padding: 28,
            transition: 'transform 0.15s', position: 'relative', overflow: 'hidden',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: '#1877f2', opacity: 0.06, borderRadius: '0 0 0 80px' }}/>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📱</div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1877f2' }}>Meta WhatsApp</div>
            <span style={{ fontSize:9, background:'#1877f215', color:'#1877f2', border:'1px solid #1877f230', borderRadius:4, padding:'1px 6px', fontWeight:700 }}>NO BAN</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 14 }}>
            Official Meta Cloud API — zero IP ban risk
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {['Uses approved message templates', 'Free 1000 conversations/month', 'Delivery receipts + reply inbox'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text)' }}>
                <span style={{ color: '#1877f2', fontSize: 10 }}>✓</span>{t}
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

        {/* Channel Selection */}
        <div className="card fade-up-1" style={{ padding: 20, marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 12 }}>CHANNELS — pick any combination</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {CHANNELS.map(ch => {
              const active = selectedChannels.includes(ch.id);
              return (
                <div
                  key={ch.id}
                  onClick={() => setSelectedChannels(prev =>
                    active ? prev.filter(c => c !== ch.id) : [...prev, ch.id]
                  )}
                  style={{
                    flex: 1, padding: '16px 10px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                    border: `2px solid ${active ? 'var(--blue)' : 'var(--border)'}`,
                    background: active ? 'color-mix(in srgb, var(--blue) 8%, var(--s2))' : 'var(--s2)',
                    transition: 'border-color 0.15s, background 0.15s',
                    position: 'relative',
                  }}
                >
                  {active && (
                    <div style={{ position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 900 }}>✓</div>
                  )}
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{ch.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: active ? 'var(--blue)' : 'var(--text)', marginBottom: 3 }}>{ch.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.4 }}>{ch.desc}</div>
                </div>
              );
            })}
          </div>
          {selectedChannels.length === 0 && (
            <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 10 }}>⚠ Select at least one channel</div>
          )}
          {selectedChannels.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
              Selected: {selectedChannels.map(c => CHANNELS.find(ch => ch.id === c)?.label).join(' + ')}
            </div>
          )}
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

  // ── Meta WhatsApp Campaign ─────────────────────────────────────────────────
  if (mode === 'meta') {
    const BLUE = '#1877f2';
    const META_STEPS = ['Template', 'Variables', 'Leads', 'Send'];

    const metaParsedLeads = metaLeads.split('\n').filter(l => l.trim()).map(line => {
      const parts = line.split(',').map(p => p.trim());
      return { name: parts[0] || '', phone: parts[1] || '', company: parts[2] || '' };
    }).filter(l => l.phone && l.phone.replace(/\D/g,'').length >= 7);

    const metaLeadCount = metaLeadMode === 'paste' ? metaParsedLeads.length
      : metaLeadMode === 'upload' ? metaUpLeads.length
      : metaSelLeads.length;

    const metaLeadList = metaLeadMode === 'paste' ? metaParsedLeads
      : metaLeadMode === 'upload' ? metaUpLeads
      : metaAllLeads.filter(l => metaSelLeads.includes(l.id)).map(l => ({ name: l.name, phone: l.phone, company: l.company }));

    const canStep2 = metaName.trim() && metaTemplate;
    const canStep3 = metaTemplate && Object.keys(metaVarMap).length === (metaTemplate.variables?.length || 0);
    const canStep4 = metaLeadCount > 0;

    async function doMetaSend() {
      if (!metaTemplate || !metaLeadList.length) return;
      setMetaSending(true);
      setMetaResult(null);
      try {
        const result = await apiFetch('/meta-wa/send-bulk', {
          method: 'POST',
          body: { templateName: metaTemplate.name, languageCode: metaTemplate.language || 'en', varMap: metaVarMap, leads: metaLeadList },
        });
        setMetaResult(result);
        showToast(`Sent ${result.sent} messages via Meta WA`, 'green');
      } catch (e) {
        showToast('Send failed: ' + e.message, 'red');
      } finally {
        setMetaSending(false);
      }
    }

    async function handleMetaFileUpload(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      setMetaUpFileName(file.name);
      try {
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());
        const first = lines[0]?.split(',').map(s => s.trim().toLowerCase()) || [];
        const hasHeader = first.some(h => ['name','phone','company','mobile'].includes(h));
        const dataLines = hasHeader ? lines.slice(1) : lines;
        const ni = hasHeader ? Math.max(0, first.findIndex(h => h.includes('name'))) : 0;
        const pi = hasHeader ? first.findIndex(h => ['phone','mobile','tel','hp'].some(k => h.includes(k))) : 1;
        const ci = hasHeader ? first.findIndex(h => ['company','biz','org'].some(k => h.includes(k))) : 2;
        const parsed = dataLines.map(line => {
          const p = line.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
          return { name: p[ni] || '', phone: p[pi >= 0 ? pi : 1] || '', company: p[ci >= 0 ? ci : 2] || '' };
        }).filter(l => l.phone.replace(/\D/g,'').length >= 7);
        setMetaUpLeads(parsed);
      } catch { showToast('Could not parse file', 'red'); }
    }

    return (
      <div className="page">
        <div className="fade-up" style={{ marginBottom: 20 }}>
          <div className="breadcrumb">Campaigns / New Campaign / <span>Meta WhatsApp</span></div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:4 }}>
            <h1 className="page-title" style={{ margin:0 }}>Meta WA Campaign</h1>
            <button className="btn btn-ghost btn-sm" onClick={() => { setMode(null); setMetaStep(1); }}>← Back</button>
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ display:'flex', alignItems:'center', maxWidth:480, marginBottom:28 }}>
          {META_STEPS.map((label, i) => {
            const step = i + 1;
            const done = metaStep > step;
            const active = metaStep === step;
            return (
              <div key={step} style={{ display:'contents' }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, minWidth:60 }}>
                  <div onClick={() => done && setMetaStep(step)} style={{
                    width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                    fontWeight:700, fontSize: done ? 14 : 13, cursor: done ? 'pointer' : 'default',
                    background: done || active ? BLUE : 'var(--s2)',
                    color: done || active ? '#fff' : 'var(--muted)',
                    border: `2px solid ${done || active ? BLUE : 'var(--border)'}`, transition:'all 0.2s',
                  }}>
                    {done ? '✓' : step}
                  </div>
                  <span style={{ fontSize:10, fontWeight: active ? 700 : 400, color: active ? BLUE : done ? 'var(--text)' : 'var(--muted)', whiteSpace:'nowrap' }}>{label}</span>
                </div>
                {i < 3 && <div style={{ flex:1, height:2, marginBottom:14, background: metaStep > i+1 ? BLUE : 'var(--border)', transition:'background 0.3s' }}/>}
              </div>
            );
          })}
        </div>

        <div style={{ maxWidth: 560 }}>

          {/* STEP 1: TEMPLATE */}
          {metaStep === 1 && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="card" style={{ padding:20 }}>
                <label style={{ fontSize:11, color:'var(--muted)', fontWeight:600, display:'block', marginBottom:8 }}>CAMPAIGN NAME</label>
                <input className="input" style={{ width:'100%', boxSizing:'border-box', marginBottom:14 }}
                  placeholder="e.g. Lawyer Outreach June"
                  value={metaName} onChange={e => setMetaName(e.target.value)} />

                <label style={{ fontSize:11, color:'var(--muted)', fontWeight:600, display:'block', marginBottom:8 }}>SELECT APPROVED TEMPLATE</label>
                {metaLoadingTpl ? (
                  <div style={{ fontSize:12, color:'var(--muted)', padding:'16px 0' }}><Spinner/> Loading templates…</div>
                ) : metaTemplates.length === 0 ? (
                  <div style={{ fontSize:12, color:'var(--amber)', padding:'12px 14px', background:'oklch(80% 0.15 80 / 0.08)', borderRadius:8, border:'1px solid oklch(80% 0.15 80 / 0.2)', lineHeight:1.7 }}>
                    ⚠️ No approved templates found.<br/>
                    Add your Meta WA credentials in <strong>Settings → API Keys</strong> first, then submit templates in Meta Business Manager.
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {metaTemplates.map(t => {
                      const sel = metaTemplate?.name === t.name;
                      return (
                        <div key={t.name} onClick={() => { setMetaTemplate(t); setMetaVarMap({}); }}
                          style={{ padding:'12px 14px', borderRadius:8, border:`1.5px solid ${sel ? BLUE : 'var(--border)'}`,
                            background: sel ? `${BLUE}0f` : 'var(--s2)', cursor:'pointer', transition:'all 0.12s' }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                            <span style={{ fontSize:13, fontWeight:700, color: sel ? BLUE : 'var(--text)' }}>{t.name}</span>
                            <span style={{ fontSize:10, color:'var(--muted)', fontFamily:'var(--font-mono)' }}>{t.language}</span>
                          </div>
                          <div style={{ fontSize:11, color:'var(--muted)', lineHeight:1.5 }}>{t.bodyText}</div>
                          {t.variables?.length > 0 && (
                            <div style={{ marginTop:6, fontSize:10, color: BLUE }}>{t.variables.length} variable{t.variables.length !== 1 ? 's' : ''}: {t.variables.map(v => `{{${v}}}`).join(', ')}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <button className="btn" style={{ padding:'13px', fontSize:14, fontWeight:700, background: BLUE, color:'#fff', border:'none', borderRadius:8 }}
                disabled={!canStep2} onClick={() => setMetaStep(2)}>
                Next: Map Variables →
              </button>
            </div>
          )}

          {/* STEP 2: VARIABLES */}
          {metaStep === 2 && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="card" style={{ padding:20 }}>
                <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600, marginBottom:4 }}>MAP TEMPLATE VARIABLES</div>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:14, lineHeight:1.6 }}>
                  Tell KBOOS which lead field to use for each variable in your template.
                </div>
                <div style={{ fontSize:12, color:'var(--text)', background:'var(--s2)', borderRadius:8, padding:'10px 12px', marginBottom:16, lineHeight:1.7, fontStyle:'italic' }}>
                  "{metaTemplate?.bodyText}"
                </div>
                {metaTemplate?.variables?.length === 0 ? (
                  <div style={{ fontSize:12, color:'var(--green)' }}>✓ No variables — template sends as-is</div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {metaTemplate?.variables?.map(v => (
                      <div key={v} style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <span style={{ fontSize:13, fontWeight:700, color: BLUE, minWidth:36, fontFamily:'var(--font-mono)' }}>{`{{${v}}}`}</span>
                        <select className="input" style={{ flex:1, fontSize:12 }}
                          value={metaVarMap[v] || ''}
                          onChange={e => setMetaVarMap(prev => ({ ...prev, [v]: e.target.value }))}>
                          <option value="">— pick a field —</option>
                          <option value="name">Name</option>
                          <option value="company">Company</option>
                          <option value="title">Job Title</option>
                          <option value="phone">Phone</option>
                          <option value="email">Email</option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-ghost" style={{ padding:'13px 20px' }} onClick={() => setMetaStep(1)}>← Back</button>
                <button className="btn" style={{ flex:1, padding:'13px', fontSize:14, fontWeight:700, background: BLUE, color:'#fff', border:'none', borderRadius:8 }}
                  disabled={!canStep3 && metaTemplate?.variables?.length > 0} onClick={() => setMetaStep(3)}>
                  Next: Add Leads →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: LEADS */}
          {metaStep === 3 && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="card" style={{ padding:20 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600 }}>ADD LEADS</div>
                    {metaLeadCount > 0 && <span style={{ fontSize:11, fontWeight:700, color: BLUE, background:`${BLUE}12`, borderRadius:4, padding:'2px 8px' }}>{metaLeadCount} ready</span>}
                  </div>
                  <div style={{ display:'flex', background:'var(--s2)', borderRadius:6, padding:2, gap:2 }}>
                    {[['paste','Paste CSV'],['upload','Upload'],['pick','Lead Manager']].map(([v,l]) => (
                      <button key={v} onClick={() => { setMetaLeadMode(v); if (v==='pick' && !metaAllLeads.length) apiFetch('/leads').then(r => setMetaAllLeads(Array.isArray(r) ? r.filter(x => x.phone) : [])).catch(() => {}); }}
                        style={{ padding:'3px 9px', borderRadius:4, fontSize:10, fontWeight:600, cursor:'pointer', border:'none',
                          background: metaLeadMode===v ? BLUE : 'transparent', color: metaLeadMode===v ? '#fff' : 'var(--muted)' }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {metaLeadMode === 'paste' && (
                  <>
                    <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8 }}>One per line: <code style={{ background:'var(--s2)', padding:'1px 5px', borderRadius:3, fontSize:10 }}>Name, Phone, Company</code></div>
                    <textarea className="input" rows={7} style={{ width:'100%', boxSizing:'border-box', resize:'vertical', fontSize:12, fontFamily:'var(--font-mono)', lineHeight:1.6 }}
                      placeholder={'Ahmad Zul, 60123456789, Gadong Sdn Bhd\nSarah Lee, 60198765432, Tech Corp'}
                      value={metaLeads} onChange={e => setMetaLeads(e.target.value)} />
                    <div style={{ fontSize:11, marginTop:6, color: metaParsedLeads.length > 0 ? 'var(--green)' : 'var(--muted)', fontWeight: metaParsedLeads.length > 0 ? 700 : 400 }}>
                      {metaParsedLeads.length > 0 ? `✓ ${metaParsedLeads.length} leads detected` : 'No valid leads yet'}
                    </div>
                  </>
                )}

                {metaLeadMode === 'upload' && (
                  <>
                    <label style={{ display:'block', border:'2px dashed var(--border)', borderRadius:10, padding:'24px', textAlign:'center', cursor:'pointer' }}>
                      <input type="file" accept=".csv,.txt,.xlsx" style={{ display:'none' }} onChange={handleMetaFileUpload} />
                      <div style={{ fontSize:28, marginBottom:8 }}>📂</div>
                      <div style={{ fontSize:13, fontWeight:600 }}>{metaUpFileName || 'Drop file or click to browse'}</div>
                      <div style={{ fontSize:11, color:'var(--muted)' }}>Supports .csv · .txt · .xlsx</div>
                    </label>
                    {metaUpLeads.length > 0 && <div style={{ fontSize:12, fontWeight:700, color:'var(--green)', marginTop:8 }}>✓ {metaUpLeads.length} leads loaded</div>}
                  </>
                )}

                {metaLeadMode === 'pick' && (
                  <>
                    <input className="input" style={{ width:'100%', boxSizing:'border-box', marginBottom:8 }}
                      placeholder="Search by name or company…" value={metaSearch} onChange={e => setMetaSearch(e.target.value)} />
                    <div style={{ maxHeight:200, overflowY:'auto', display:'flex', flexDirection:'column', gap:4 }}>
                      {metaAllLeads.filter(l => !metaSearch || l.name?.toLowerCase().includes(metaSearch.toLowerCase()) || l.company?.toLowerCase().includes(metaSearch.toLowerCase())).slice(0,50).map(l => {
                        const sel = metaSelLeads.includes(l.id);
                        return (
                          <div key={l.id} onClick={() => setMetaSelLeads(prev => sel ? prev.filter(id => id !== l.id) : [...prev, l.id])}
                            style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:6, cursor:'pointer',
                              background: sel ? `${BLUE}0d` : 'var(--s2)', border:`1px solid ${sel ? `${BLUE}55` : 'var(--border)'}` }}>
                            <span style={{ width:15, height:15, borderRadius:3, border:`2px solid ${sel ? BLUE : 'var(--border)'}`, background: sel ? BLUE : 'transparent',
                              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:9, color:'#fff', fontWeight:900 }}>{sel ? '✓' : ''}</span>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:12, fontWeight:600 }}>{l.name}</div>
                              <div style={{ fontSize:10, color:'var(--muted)' }}>{l.company} · {l.phone}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {metaSelLeads.length > 0 && <div style={{ fontSize:11, color: BLUE, fontWeight:700, marginTop:6 }}>✓ {metaSelLeads.length} selected</div>}
                  </>
                )}
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-ghost" style={{ padding:'13px 20px' }} onClick={() => setMetaStep(2)}>← Back</button>
                <button className="btn" style={{ flex:1, padding:'13px', fontSize:14, fontWeight:700, background: BLUE, color:'#fff', border:'none', borderRadius:8 }}
                  disabled={!canStep4} onClick={() => setMetaStep(4)}>
                  Next: Review & Send →
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SEND */}
          {metaStep === 4 && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="card" style={{ padding:20 }}>
                <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600, marginBottom:14 }}>CAMPAIGN SUMMARY</div>
                {[
                  ['Campaign', metaName],
                  ['Template', metaTemplate?.name],
                  ['Language', metaTemplate?.language || 'en'],
                  ['Leads', `${metaLeadCount} contacts`],
                  ['Variables', Object.entries(metaVarMap).map(([k,v]) => `{{${k}}}→${v}`).join(', ') || 'None'],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                    <span style={{ fontSize:12, color:'var(--muted)' }}>{k}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{v}</span>
                  </div>
                ))}
              </div>

              {metaResult ? (
                <div style={{ padding:'14px 16px', borderRadius:10, background:`${BLUE}0d`, border:`1px solid ${BLUE}30` }}>
                  <div style={{ fontSize:14, fontWeight:700, color: BLUE, marginBottom:8 }}>🚀 Campaign sent!</div>
                  <div style={{ fontSize:13 }}>Sent: <strong style={{ color:'var(--green)' }}>{metaResult.sent}</strong> · Failed: <strong style={{ color: metaResult.failed > 0 ? 'var(--amber)' : 'var(--text)' }}>{metaResult.failed}</strong></div>
                  {metaResult.note && <div style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>{metaResult.note}</div>}
                </div>
              ) : (
                <>
                  <button className="btn" style={{ padding:'14px', fontSize:15, fontWeight:800, width:'100%', background: BLUE, color:'#fff', border:'none', borderRadius:10 }}
                    disabled={metaSending} onClick={doMetaSend}>
                    {metaSending ? <><Spinner/> Sending…</> : '📱 Send via Meta WhatsApp'}
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ width:'100%' }} onClick={() => setMetaStep(3)}>← Back</button>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    );
  }

  // ── WA Connect Campaign ───────────────────────────────────────────────────
  if (mode === 'wa') {
    if (waSessions.length === 0 && !waCreating) {
      apiFetch('/openwa/sessions').then(s => { setWaSessions(s); if (s.length) setWaSession(s[0].id); }).catch(() => {});
    }

    // Live-parse pasted CSV
    const parsedPasteLeads = waLeads.split('\n').filter(l => l.trim()).map(line => {
      const parts = line.split(',').map(p => p.trim());
      return { name: parts[0] || '', phone: parts[1] || '', company: parts[2] || '' };
    }).filter(l => l.phone && l.phone.replace(/\D/g,'').length >= 7);

    const leadCount = waLeadMode === 'paste' ? parsedPasteLeads.length
      : waLeadMode === 'upload' ? uploadedLeads.length
      : selectedLeads.length;

    async function generateSequence() {
      if (!waGoal) return;
      setWaGenerating(true);
      try {
        const result = await apiFetch('/ai/wa-sequence', { method:'POST', body:{ goal: waGoal, steps: waSteps } });
        setWaSequence(Array.isArray(result) ? result : []);
      } catch (e) { showToast('AI generation failed: ' + e.message, 'red'); }
      finally { setWaGenerating(false); }
    }

    async function handleFileUpload(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadFileName(file.name);
      setUploadedLeads([]);
      try {
        if (file.name.match(/\.(xlsx|xls)$/i)) {
          const { read, utils } = await import('xlsx');
          const buf = await file.arrayBuffer();
          const wb = read(buf);
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = utils.sheet_to_json(ws, { header: 1 });
          const header = (rows[0] || []).map(h => String(h).toLowerCase().trim());
          const hasHeader = header.some(h => ['name','phone','company','mobile','tel'].includes(h));
          const dataRows = hasHeader ? rows.slice(1) : rows;
          const ni = Math.max(0, hasHeader ? header.findIndex(h => h.includes('name')) : 0);
          const pi = hasHeader ? header.findIndex(h => ['phone','mobile','tel','contact','hp'].some(k => h.includes(k))) : 1;
          const ci = hasHeader ? header.findIndex(h => ['company','biz','org','business'].some(k => h.includes(k))) : 2;
          const parsed = dataRows.map(row => ({
            name: String(row[ni] || '').trim(),
            phone: String(row[pi >= 0 ? pi : 1] || '').trim(),
            company: String(row[ci >= 0 ? ci : 2] || '').trim(),
          })).filter(l => l.phone.replace(/\D/g,'').length >= 7);
          setUploadedLeads(parsed);
        } else {
          const text = await file.text();
          const lines = text.split('\n').filter(l => l.trim());
          const first = lines[0]?.split(',').map(s => s.trim().toLowerCase()) || [];
          const hasHeader = first.some(h => ['name','phone','company','mobile'].includes(h));
          const dataLines = hasHeader ? lines.slice(1) : lines;
          const ni = hasHeader ? Math.max(0, first.findIndex(h => h.includes('name'))) : 0;
          const pi = hasHeader ? first.findIndex(h => ['phone','mobile','tel','hp'].some(k => h.includes(k))) : 1;
          const ci = hasHeader ? first.findIndex(h => ['company','biz','org'].some(k => h.includes(k))) : 2;
          const parsed = dataLines.map(line => {
            const p = line.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
            return { name: p[ni] || '', phone: p[pi >= 0 ? pi : 1] || '', company: p[ci >= 0 ? ci : 2] || '' };
          }).filter(l => l.phone.replace(/\D/g,'').length >= 7);
          setUploadedLeads(parsed);
        }
      } catch { showToast('Could not parse file', 'red'); }
    }

    // Build sequence from manual messages (used in 'write' mode)
    const manualSequence = waManualMsgs.slice(0, waSteps).map((msg, i) => ({
      day: [1, 3, 7][i],
      label: ['Intro', 'Follow-up', 'Final'][i],
      message: msg,
    }));

    // The sequence to actually save — either AI-generated or manually written
    const activeSequence = waMsgMode === 'ai' ? waSequence : manualSequence;

    // Whether the sequence is ready (has at least one non-empty message)
    const sequenceReady = activeSequence.length > 0 && activeSequence.some(s => s.message?.trim());

    async function createWACampaign() {
      if (!waName || !waSession) return;
      setWaCreating(true);
      try {
        let leads = [];
        if (waLeadMode === 'paste') leads = parsedPasteLeads;
        else if (waLeadMode === 'upload') leads = uploadedLeads;
        else leads = allLeads.filter(l => selectedLeads.includes(l.id)).map(l => ({ name: l.name || '', phone: l.phone || '', company: l.company || '' }));
        const created = await apiFetch('/openwa/campaigns', {
          method:'POST',
          body:{ name: waName, sessionId: waSession, goal: waGoal, sequence: activeSequence, leads, sendLimit: waSendLimit, sequenceSteps: waSteps, abEnabled: waABEnabled, abVariantB: waSequenceB }
        });
        showToast(`Campaign "${waName}" saved — ready to launch`, 'green');
        setWaSavedId(created.id);
        setWaLaunchResult(null);
      } catch (e) { showToast('Failed: ' + e.message, 'red'); }
      finally { setWaCreating(false); }
    }

    async function launchWACampaign() {
      if (!waSavedId) return;
      setWaLaunching(true);
      setWaLaunchResult(null);
      try {
        const result = await apiFetch(`/openwa/campaigns/${waSavedId}/launch`, { method: 'POST' });
        setWaLaunchResult(result);
        showToast(`Launched — ${result.sent} message${result.sent !== 1 ? 's' : ''} sent`, 'green');
      } catch (e) { showToast('Launch failed: ' + e.message, 'red'); setWaLaunchResult({ error: e.message }); }
      finally { setWaLaunching(false); }
    }

    const connectedSessions = waSessions.filter(s => s.liveStatus === 'WORKING' || s.status === 'connected');
    const GREEN = 'oklch(65% 0.2 145)';
    const BLUE  = 'var(--blue)';
    const WA_WIZARD_STEPS = ['Setup', 'Message', 'Leads', 'Launch'];
    const canGoStep2 = waName.trim() && waSession;
    const canGoStep3 = sequenceReady;
    const canGoStep4 = leadCount > 0;

    return (
      <div className="page">
        <div className="fade-up" style={{ marginBottom:20 }}>
          <div className="breadcrumb">Campaigns / New Campaign / <span>WA Connect</span></div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:4 }}>
            <h1 className="page-title" style={{ margin:0 }}>WA Connect Campaign</h1>
            <button className="btn btn-ghost btn-sm" onClick={() => { setMode(null); setWaStep(1); }}>← Back</button>
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ display:'flex', alignItems:'center', maxWidth:480, marginBottom:28 }}>
          {WA_WIZARD_STEPS.map((label, i) => {
            const step = i + 1;
            const done = waStep > step;
            const active = waStep === step;
            return (
              <div key={step} style={{ display:'contents' }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, minWidth:60 }}>
                  <div
                    onClick={() => done && setWaStep(step)}
                    style={{
                      width:32, height:32, borderRadius:'50%',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontWeight:700, fontSize: done ? 14 : 13,
                      cursor: done ? 'pointer' : 'default',
                      background: done || active ? GREEN : 'var(--s2)',
                      color: done || active ? '#fff' : 'var(--muted)',
                      border: `2px solid ${done || active ? GREEN : 'var(--border)'}`,
                      transition:'all 0.2s',
                    }}
                  >
                    {done ? '✓' : step}
                  </div>
                  <span style={{ fontSize:10, fontWeight: active ? 700 : 400, color: active ? GREEN : done ? 'var(--text)' : 'var(--muted)', whiteSpace:'nowrap' }}>{label}</span>
                </div>
                {i < 3 && (
                  <div style={{ flex:1, height:2, marginBottom:14, background: waStep > i + 1 ? GREEN : 'var(--border)', transition:'background 0.3s' }}/>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ maxWidth:560 }}>

          {/* ── STEP 1: SETUP ── */}
          {waStep === 1 && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="card" style={{ padding:20 }}>
                <label style={{ fontSize:11, color:'var(--muted)', fontWeight:600, display:'block', marginBottom:8 }}>CAMPAIGN NAME</label>
                <input className="input" style={{ width:'100%', boxSizing:'border-box' }}
                  placeholder="e.g. Web Design Outreach May"
                  value={waName} onChange={e => setWaName(e.target.value)} />
                <div style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>No business needed — runs standalone</div>
              </div>

              <div className="card" style={{ padding:20 }}>
                <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600, marginBottom:10 }}>WHATSAPP NUMBER</div>
                {connectedSessions.length === 0 ? (
                  <div style={{ fontSize:12, color:'var(--amber)', lineHeight:1.7, padding:'10px 12px', background:'oklch(80% 0.15 80 / 0.08)', borderRadius:8, border:'1px solid oklch(80% 0.15 80 / 0.2)' }}>
                    ⚠️ No connected numbers yet.<br/>
                    Go to <strong>Settings → Integrations → Communications</strong> and connect a WhatsApp number first.
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {connectedSessions.map(s => {
                      const sel = waSession === s.id;
                      const pct = Math.round((s.sentToday / (s.dailyLimit || 200)) * 100);
                      const health = s.healthScore ?? 100;
                      const hColor = health >= 80 ? 'var(--green)' : health >= 50 ? 'var(--amber)' : 'var(--red)';
                      return (
                        <div key={s.id} onClick={() => setWaSession(s.id)}
                          style={{ padding:'10px 12px', borderRadius:8, border:`1.5px solid ${sel ? GREEN : 'var(--border)'}`, background: sel ? `${GREEN}0f` : 'var(--s2)', cursor:'pointer', transition:'all 0.12s' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                            <span style={{ width:7, height:7, borderRadius:'50%', background:GREEN, flexShrink:0 }} />
                            <div style={{ flex:1 }}>
                              <span style={{ fontSize:13, fontWeight:700 }}>{s.label}</span>
                              {s.phone && <span style={{ fontSize:11, color:'var(--muted)', marginLeft:6 }}>{s.phone}</span>}
                            </div>
                            {sel && <span style={{ fontSize:13, color:GREEN }}>✓</span>}
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ flex:1, height:4, background:'var(--border)', borderRadius:2, overflow:'hidden' }}>
                              <div style={{ width:`${pct}%`, height:'100%', background:GREEN, borderRadius:2 }} />
                            </div>
                            <span style={{ fontSize:10, color:'var(--muted)', whiteSpace:'nowrap' }}>{s.sentToday}/{s.dailyLimit}</span>
                            <span style={{ fontSize:10, fontWeight:700, color:hColor }}>♥ {health}</span>
                            {s.warmupEnabled && <span style={{ fontSize:9, color:GREEN, fontWeight:700, background:`${GREEN}15`, borderRadius:3, padding:'1px 5px' }}>Wk{(s.warmupWeek||0)+1}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="card" style={{ padding:20 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600 }}>MESSAGES TO SEND TODAY</div>
                  <div style={{ fontSize:28, fontWeight:800, color:GREEN, fontFamily:'var(--font-mono)' }}>{waSendLimit}</div>
                </div>
                <input type="range" min="1" max="200" value={waSendLimit}
                  onChange={e => setWaSendLimit(parseInt(e.target.value))}
                  style={{ width:'100%', accentColor:GREEN }} />
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--muted)', marginTop:4 }}>
                  <span>1</span><span>~30s gap between sends</span><span>200</span>
                </div>
              </div>

              <button className="btn btn-green" style={{ padding:'13px', fontSize:14, fontWeight:700 }}
                disabled={!canGoStep2}
                onClick={() => setWaStep(2)}>
                Next: Write Message →
              </button>
              {!canGoStep2 && (
                <div style={{ fontSize:11, color:'var(--muted)', textAlign:'center', marginTop:-8 }}>
                  {!waName.trim() ? 'Enter a campaign name to continue' : 'Select a WhatsApp number to continue'}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: MESSAGE ── */}
          {waStep === 2 && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="card" style={{ padding:20 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                  <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600 }}>MESSAGE TYPE</div>
                  <div style={{ display:'flex', background:'var(--s2)', borderRadius:6, padding:2, gap:2 }}>
                    {[['write','✍️ Write my own'],['ai','✨ AI write for me']].map(([v,l]) => (
                      <button key={v} onClick={() => setWaMsgMode(v)}
                        style={{ padding:'5px 14px', borderRadius:4, fontSize:11, fontWeight:600, cursor:'pointer', border:'none',
                          background: waMsgMode === v ? GREEN : 'transparent',
                          color: waMsgMode === v ? '#fff' : 'var(--muted)', transition:'all 0.1s' }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600, marginBottom:8 }}>HOW MANY MESSAGES?</div>
                <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                  {[1,2,3].map(n => (
                    <button key={n} onClick={() => {
                      setWaSteps(n);
                      setWaManualMsgs(prev => {
                        const arr = [...prev];
                        while (arr.length < n) arr.push('');
                        return arr;
                      });
                    }}
                      style={{ flex:1, padding:'10px 8px', borderRadius:8, border:`1.5px solid ${waSteps === n ? GREEN : 'var(--border)'}`,
                        background: waSteps === n ? `${GREEN}12` : 'var(--s2)',
                        color: waSteps === n ? GREEN : 'var(--muted)',
                        fontWeight: waSteps === n ? 700 : 400, cursor:'pointer', fontSize:12, lineHeight:1.3, transition:'all 0.12s' }}>
                      {n === 1 ? '1 message' : `${n} messages`}
                      <div style={{ fontSize:10, marginTop:3, opacity:0.8 }}>{n === 1 ? 'One-shot' : n === 2 ? 'Intro + Follow-up' : 'Full sequence'}</div>
                    </button>
                  ))}
                </div>

                {/* WRITE MODE */}
                {waMsgMode === 'write' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {Array.from({ length: waSteps }, (_, i) => (
                      <div key={i} style={{ background:'var(--s2)', borderRadius:8, padding:'12px 14px', border:'1px solid var(--border)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                          <span style={{ fontSize:10, fontWeight:700, color:BLUE, background:'oklch(62% 0.19 245 / 0.12)', borderRadius:4, padding:'2px 8px' }}>
                            Day {[1,3,7][i]}
                          </span>
                          <span style={{ fontSize:11, color:'var(--muted)' }}>{['Intro','Follow-up','Final'][i]}</span>
                          <span style={{ fontSize:10, color:'var(--muted)', marginLeft:'auto' }}>{(waManualMsgs[i]||'').length} chars</span>
                        </div>
                        <textarea
                          style={{ width:'100%', boxSizing:'border-box', background:'transparent', border:'none', color:'var(--text)', fontSize:12, resize:'vertical', lineHeight:1.6, outline:'none', minHeight:80 }}
                          placeholder={i === 0
                            ? 'Hi {name}, saw {company} online — wanted to reach out about...'
                            : i === 1
                            ? 'Hey {name}, just checking if you got my last message...'
                            : 'Last one from me {name} — happy to connect anytime if timing is better.'}
                          value={waManualMsgs[i] || ''}
                          onChange={e => setWaManualMsgs(prev => {
                            const arr = [...prev];
                            arr[i] = e.target.value;
                            return arr;
                          })}
                        />
                      </div>
                    ))}
                    <div style={{ fontSize:11, color:'var(--muted)' }}>Use {'{name}'} {'{company}'} {'{first_name}'} as variables</div>
                  </div>
                )}

                {/* AI MODE */}
                {waMsgMode === 'ai' && (
                  <>
                    <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8 }}>Describe your outreach goal and AI will write the messages</div>
                    <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                      <input className="input" style={{ flex:1, boxSizing:'border-box' }}
                        placeholder='e.g. "Follow up with SME owners about web design"'
                        value={waGoal} onChange={e => setWaGoal(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && generateSequence()} />
                      <button className="btn btn-sm" onClick={generateSequence} disabled={!waGoal || waGenerating}
                        style={{ background:GREEN, color:'#fff', border:'none', fontWeight:700, whiteSpace:'nowrap', minWidth:100 }}>
                        {waGenerating ? '✨ Writing…' : '✨ Generate'}
                      </button>
                    </div>
                    {waSequence.length > 0 && waABEnabled && (
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                        <span style={{ fontSize:10, fontWeight:700, color:GREEN, background:`${GREEN}12`, borderRadius:3, padding:'2px 8px' }}>VARIANT A</span>
                        <span style={{ fontSize:10, color:'var(--muted)' }}>Split 50/50 with B</span>
                      </div>
                    )}
                    {waSequence.length > 0 ? (
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {waSequence.slice(0, waSteps).map((step, i) => (
                          <div key={i} style={{ background:'var(--s2)', borderRadius:8, padding:'12px 14px', border:'1px solid var(--border)' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                              <span style={{ fontSize:10, fontWeight:700, color:BLUE, background:'oklch(62% 0.19 245 / 0.12)', borderRadius:4, padding:'2px 8px' }}>Day {step.day}</span>
                              <span style={{ fontSize:11, color:'var(--muted)' }}>{step.label}</span>
                              <span style={{ fontSize:10, color:'var(--muted)', marginLeft:'auto' }}>{(step.message||'').length} chars</span>
                            </div>
                            <textarea
                              style={{ width:'100%', boxSizing:'border-box', background:'transparent', border:'none', color:'var(--text)', fontSize:12, resize:'vertical', lineHeight:1.6, outline:'none', minHeight:72 }}
                              value={step.message}
                              onChange={e => setWaSequence(prev => prev.map((s,si) => si===i ? {...s,message:e.target.value} : s))}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign:'center', padding:'32px 0', color:'var(--muted)', fontSize:12, border:'1px dashed var(--border)', borderRadius:8 }}>
                        Enter your goal above and click ✨ Generate
                      </div>
                    )}
                    {waSequence.length > 0 && (
                      <div style={{ marginTop:12, borderRadius:8, border:`1px solid ${waABEnabled ? 'oklch(62% 0.19 245 / 0.35)' : 'var(--border)'}`, overflow:'hidden' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', background: waABEnabled ? 'oklch(62% 0.19 245 / 0.07)' : 'var(--s2)' }}>
                          <div>
                            <div style={{ fontSize:12, fontWeight:700 }}>🧪 A/B Test</div>
                            <div style={{ fontSize:10, color:'var(--muted)' }}>Second message angle — leads split 50/50</div>
                          </div>
                          <button className="btn btn-ghost btn-sm" style={{ fontSize:11 }} onClick={async () => {
                            if (!waABEnabled) {
                              setWaABEnabled(true);
                              if (!waSequenceB.length) {
                                setWaGeneratingB(true);
                                try {
                                  const r = await apiFetch('/ai/wa-sequence', { method:'POST', body:{ goal: waGoal + ' (variant B — different angle, different hook)', steps: waSteps } });
                                  setWaSequenceB(Array.isArray(r) ? r : []);
                                } catch { showToast('B generation failed', 'red'); }
                                finally { setWaGeneratingB(false); }
                              }
                            } else { setWaABEnabled(false); }
                          }}>
                            {waABEnabled ? '✕ Remove B' : waGeneratingB ? '✨ Generating B…' : '+ Add Variant B'}
                          </button>
                        </div>
                        {waABEnabled && waSequenceB.length > 0 && (
                          <div style={{ padding:'10px 12px', borderTop:'1px solid oklch(62% 0.19 245 / 0.2)', display:'flex', flexDirection:'column', gap:8 }}>
                            <div style={{ fontSize:10, fontWeight:700, color:BLUE }}>VARIANT B</div>
                            {waSequenceB.map((step, i) => (
                              <div key={i} style={{ background:'oklch(62% 0.19 245 / 0.05)', borderRadius:8, padding:'10px 12px', border:'1px solid oklch(62% 0.19 245 / 0.18)' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                                  <span style={{ fontSize:10, fontWeight:700, color:BLUE, background:'oklch(62% 0.19 245 / 0.12)', borderRadius:4, padding:'2px 8px' }}>Day {step.day}</span>
                                  <span style={{ fontSize:11, color:'var(--muted)' }}>{step.label}</span>
                                </div>
                                <textarea style={{ width:'100%', boxSizing:'border-box', background:'transparent', border:'none', color:'var(--text)', fontSize:12, resize:'vertical', lineHeight:1.6, outline:'none', minHeight:64 }}
                                  value={step.message}
                                  onChange={e => setWaSequenceB(prev => prev.map((s,si) => si===i ? {...s,message:e.target.value} : s))} />
                              </div>
                            ))}
                          </div>
                        )}
                        {waABEnabled && waGeneratingB && (
                          <div style={{ padding:'16px', textAlign:'center', fontSize:12, color:'var(--muted)' }}>✨ Writing variant B…</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-ghost" style={{ flex:'0 0 auto', padding:'13px 20px' }} onClick={() => setWaStep(1)}>← Back</button>
                <button className="btn btn-green" style={{ flex:1, padding:'13px', fontSize:14, fontWeight:700 }}
                  disabled={!canGoStep3}
                  onClick={() => setWaStep(3)}>
                  Next: Add Leads →
                </button>
              </div>
              {!canGoStep3 && (
                <div style={{ fontSize:11, color:'var(--muted)', textAlign:'center', marginTop:-8 }}>
                  {waMsgMode === 'write' ? 'Write at least one message to continue' : 'Generate messages to continue'}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: LEADS ── */}
          {waStep === 3 && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="card" style={{ padding:20 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600 }}>ADD LEADS</div>
                    {leadCount > 0 && (
                      <span style={{ fontSize:11, fontWeight:700, color:GREEN, background:`${GREEN}12`, borderRadius:4, padding:'2px 8px' }}>{leadCount} ready</span>
                    )}
                  </div>
                  <div style={{ display:'flex', background:'var(--s2)', borderRadius:6, padding:2, gap:2 }}>
                    {[['paste','Paste CSV'],['upload','Upload File'],['pick','Lead Manager']].map(([v,l]) => (
                      <button key={v} onClick={() => {
                      setWaLeadMode(v);
                      if (v === 'pick' && !allLeads.length) {
                        apiFetch('/leads').then(r => setAllLeads(Array.isArray(r) ? r.filter(x => x.phone) : [])).catch(() => {});
                      }
                    }}
                      style={{ padding:'3px 9px', borderRadius:4, fontSize:10, fontWeight:600, cursor:'pointer', border:'none',
                        background: waLeadMode === v ? BLUE : 'transparent',
                        color: waLeadMode === v ? '#fff' : 'var(--muted)', transition:'all 0.1s' }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {waLeadMode === 'paste' && (
                <>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8 }}>
                    One per line: <code style={{ background:'var(--s2)', padding:'1px 5px', borderRadius:3, fontSize:10 }}>Name, Phone, Company</code>
                  </div>
                  <textarea className="input" rows={7}
                    style={{ width:'100%', boxSizing:'border-box', resize:'vertical', fontSize:12, fontFamily:'var(--font-mono)', lineHeight:1.6 }}
                    placeholder={'Ahmad Zul, 60123456789, Gadong Sdn Bhd\nSarah Lee, 60198765432, Tech Corp\nAli Hassan, 60112345678, Maju Enterprise'}
                    value={waLeads} onChange={e => setWaLeads(e.target.value)} />
                  <div style={{ fontSize:11, marginTop:6, display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ color: parsedPasteLeads.length > 0 ? GREEN : 'var(--muted)', fontWeight: parsedPasteLeads.length > 0 ? 700 : 400 }}>
                      {parsedPasteLeads.length > 0 ? `✓ ${parsedPasteLeads.length} leads detected` : 'No valid leads yet — need Name, Phone, Company per line'}
                    </span>
                  </div>
                  {parsedPasteLeads.length > 0 && (
                    <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:3, maxHeight:120, overflowY:'auto' }}>
                      {parsedPasteLeads.slice(0,3).map((l,i) => (
                        <div key={i} style={{ fontSize:11, color:'var(--muted)', padding:'4px 8px', background:'var(--s2)', borderRadius:4 }}>
                          {l.name} · {l.phone} {l.company ? `· ${l.company}` : ''}
                        </div>
                      ))}
                      {parsedPasteLeads.length > 3 && <div style={{ fontSize:11, color:'var(--muted)', padding:'2px 8px' }}>+{parsedPasteLeads.length - 3} more</div>}
                    </div>
                  )}
                </>
              )}

              {waLeadMode === 'upload' && (
                <>
                  <label style={{ display:'block', border:'2px dashed var(--border)', borderRadius:10, padding:'24px', textAlign:'center', cursor:'pointer', transition:'border-color 0.15s' }}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = GREEN; }}
                    onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                    onDrop={async e => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = 'var(--border)';
                      const file = e.dataTransfer.files[0];
                      if (file) await handleFileUpload({ target: { files: [file] } });
                    }}>
                    <input type="file" accept=".xlsx,.xls,.csv,.txt" style={{ display:'none' }} onChange={handleFileUpload} />
                    <div style={{ fontSize:28, marginBottom:8 }}>📂</div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:4 }}>
                      {uploadFileName || 'Drop file here or click to browse'}
                    </div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>Supports .xlsx · .xls · .csv · .txt</div>
                  </label>
                  {uploadedLeads.length > 0 && (
                    <div style={{ marginTop:10 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:GREEN, marginBottom:6 }}>✓ {uploadedLeads.length} leads imported from {uploadFileName}</div>
                      <div style={{ border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                          <thead>
                            <tr style={{ background:'var(--s2)' }}>
                              {['Name','Phone','Company'].map(h => (
                                <th key={h} style={{ padding:'6px 10px', textAlign:'left', color:'var(--muted)', fontWeight:600, fontSize:10, letterSpacing:'0.04em' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {uploadedLeads.slice(0,5).map((l,i) => (
                              <tr key={i} style={{ borderTop:'1px solid var(--border)' }}>
                                <td style={{ padding:'6px 10px', color:'var(--text)' }}>{l.name || '—'}</td>
                                <td style={{ padding:'6px 10px', color:'var(--text)', fontFamily:'var(--font-mono)' }}>{l.phone}</td>
                                <td style={{ padding:'6px 10px', color:'var(--muted)' }}>{l.company || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {uploadedLeads.length > 5 && (
                          <div style={{ padding:'6px 10px', fontSize:11, color:'var(--muted)', background:'var(--s2)', borderTop:'1px solid var(--border)' }}>
                            +{uploadedLeads.length - 5} more rows
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {uploadFileName && uploadedLeads.length === 0 && (
                    <div style={{ marginTop:8, fontSize:12, color:'var(--amber)' }}>⚠️ No valid leads found. Check columns: Name, Phone, Company</div>
                  )}
                </>
              )}

              {waLeadMode === 'pick' && (
                <>
                  <input className="input" style={{ width:'100%', boxSizing:'border-box', marginBottom:8 }}
                    placeholder="Search by name or company…"
                    value={leadSearch} onChange={e => setLeadSearch(e.target.value)} />
                  <div style={{ maxHeight:220, overflowY:'auto', display:'flex', flexDirection:'column', gap:4 }}>
                    {allLeads.filter(l => !leadSearch || l.name?.toLowerCase().includes(leadSearch.toLowerCase()) || l.company?.toLowerCase().includes(leadSearch.toLowerCase())).slice(0,60).map(l => {
                      const sel = selectedLeads.includes(l.id);
                      return (
                        <div key={l.id} onClick={() => setSelectedLeads(prev => sel ? prev.filter(id => id !== l.id) : [...prev, l.id])}
                          style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:6, cursor:'pointer',
                            background: sel ? `${GREEN}0d` : 'var(--s2)', border:`1px solid ${sel ? `${GREEN}55` : 'var(--border)'}`, transition:'all 0.1s' }}>
                          <span style={{ width:15, height:15, borderRadius:3, border:`2px solid ${sel ? GREEN : 'var(--border)'}`, background: sel ? GREEN : 'transparent',
                            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:9, color:'#fff', fontWeight:900 }}>{sel ? '✓' : ''}</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:600 }}>{l.name}</div>
                            <div style={{ fontSize:10, color:'var(--muted)' }}>{l.company} · {l.phone}</div>
                          </div>
                        </div>
                      );
                    })}
                    {allLeads.length === 0 && <div style={{ color:'var(--muted)', fontSize:12, padding:16, textAlign:'center' }}>Loading leads…</div>}
                  </div>
                  <div style={{ fontSize:11, marginTop:6, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ color: selectedLeads.length > 0 ? GREEN : 'var(--muted)', fontWeight: selectedLeads.length > 0 ? 700 : 400 }}>
                      {selectedLeads.length > 0 ? `✓ ${selectedLeads.length} selected` : 'Click leads to select'}
                    </span>
                    <span style={{ color:'var(--muted)' }}>{allLeads.filter(l=>l.phone).length} total with phone</span>
                  </div>
                </>
              )}
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-ghost" style={{ flex:'0 0 auto', padding:'13px 20px' }} onClick={() => setWaStep(2)}>← Back</button>
              <button className="btn btn-green" style={{ flex:1, padding:'13px', fontSize:14, fontWeight:700 }}
                disabled={!canGoStep4}
                onClick={() => setWaStep(4)}>
                Next: Review & Launch →
              </button>
            </div>
            {!canGoStep4 && (
              <div style={{ fontSize:11, color:'var(--muted)', textAlign:'center', marginTop:-8 }}>Add at least one lead to continue</div>
            )}
          </div>
          )}

          {/* ── STEP 4: LAUNCH ── */}
          {waStep === 4 && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="card" style={{ padding:20 }}>
                <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600, marginBottom:14 }}>CAMPAIGN SUMMARY</div>
                {[
                  ['Campaign', waName],
                  ['From', connectedSessions.find(s => s.id === waSession)?.label || waSession],
                  ['Messages', `${waSteps} step${waSteps !== 1 ? 's' : ''} · ${waMsgMode === 'ai' ? 'AI written' : 'Manually written'}`],
                  ['Leads', `${leadCount} contact${leadCount !== 1 ? 's' : ''}`],
                  ['Send limit', `${waSendLimit} today`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                    <span style={{ fontSize:12, color:'var(--muted)' }}>{k}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{v}</span>
                  </div>
                ))}
              </div>

              {!waSavedId ? (
                <>
                  <button className="btn btn-green" style={{ padding:'14px', fontSize:14, fontWeight:700, width:'100%' }}
                    disabled={waCreating}
                    onClick={createWACampaign}>
                    {waCreating ? '⏳ Saving…' : '✓ Save Campaign'}
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ width:'100%' }} onClick={() => setWaStep(3)}>← Back</button>
                </>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  <div style={{ padding:'12px 16px', borderRadius:10, background:'oklch(65% 0.2 145 / 0.1)', border:'1px solid oklch(65% 0.2 145 / 0.3)', fontSize:12, color:GREEN, fontWeight:600, textAlign:'center' }}>
                    ✓ Campaign saved — ready to launch
                  </div>
                  {waLaunchResult && !waLaunchResult.error && (
                    <div style={{ padding:'10px 14px', borderRadius:8, fontSize:12,
                      background: waLaunchResult.sent > 0 ? 'oklch(65% 0.2 145 / 0.08)' : 'oklch(55% 0.22 25 / 0.06)',
                      border: `1px solid ${waLaunchResult.sent > 0 ? 'oklch(65% 0.2 145 / 0.2)' : 'oklch(55% 0.22 25 / 0.2)'}` }}>
                      <div style={{ fontWeight:700, color: waLaunchResult.sent > 0 ? GREEN : 'var(--red)', marginBottom:6 }}>
                        {waLaunchResult.sent > 0 ? '🚀 Launched!' : '✕ All messages failed'}
                      </div>
                      <div style={{ color:'var(--text)', marginBottom:2 }}>Sent: <strong>{waLaunchResult.sent}</strong> · Failed: <strong style={{ color: waLaunchResult.errors?.length > 0 ? 'var(--amber)' : 'inherit' }}>{waLaunchResult.errors?.length || 0}</strong></div>
                      {waLaunchResult.remaining !== undefined && <div style={{ color:'var(--muted)', marginBottom:2 }}>Remaining limit: {waLaunchResult.remaining}</div>}
                      {waLaunchResult.errors?.length > 0 && (
                        <div style={{ marginTop:8, padding:'8px 10px', background:'oklch(55% 0.22 25 / 0.08)', borderRadius:6, border:'1px solid oklch(55% 0.22 25 / 0.15)' }}>
                          <div style={{ fontSize:10, fontWeight:700, color:'var(--red)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>Error reason</div>
                          <div style={{ fontSize:11, color:'var(--text)', fontFamily:'var(--font-mono)', wordBreak:'break-all', lineHeight:1.5 }}>
                            {waLaunchResult.errors[0]?.error || 'Unknown error'}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {waLaunchResult?.error && (
                    <div style={{ padding:'12px 14px', borderRadius:8, background:'oklch(55% 0.22 25 / 0.08)', border:'1px solid oklch(55% 0.22 25 / 0.2)', fontSize:12 }}>
                      <div style={{ color:'var(--red)', fontWeight:700, marginBottom:6 }}>✕ Cannot launch</div>
                      <div style={{ color:'var(--text)', lineHeight:1.6, marginBottom: waLaunchResult.sessionStatus ? 10 : 0 }}>{waLaunchResult.error}</div>
                      {waLaunchResult.sessionStatus && (
                        <button className="btn btn-sm" style={{ fontSize:11, marginTop:2 }}
                          onClick={() => setPage('settings')}>
                          → Go to Settings to reconnect
                        </button>
                      )}
                    </div>
                  )}
                  <button className="btn btn-green" style={{ padding:'14px', fontSize:15, fontWeight:800, width:'100%' }}
                    disabled={waLaunching}
                    onClick={launchWACampaign}>
                    {waLaunching ? '🚀 Launching…' : '🚀 Launch Campaign'}
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ width:'100%', fontSize:11 }}
                    onClick={() => { setWaSavedId(null); setWaLaunchResult(null); }}>
                    ← Make changes
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    );
  }
}
