import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { BizAvatar } from '../components/ui/BizAvatar.jsx';
import { apiFetch } from '../services/api.js';

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
  { id: 'google_maps', label: 'Google Maps' },
  { id: 'csv', label: 'CSV Upload' },
  { id: 'manual', label: 'Manual' },
];

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

  // Mode: null | 'fast' | 'quick'
  const [mode, setMode] = useState(null);

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
      if (newC?.id) openCampaignPipeline(newC.id);
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
      if (newC?.id) openCampaignPipeline(newC.id);
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
          <button className="btn btn-blue" onClick={() => setPage('businesses')}>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 680 }}>
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
      </div>

      <div style={{ marginTop: 20, fontSize: 12, color: 'var(--muted)' }}>
        Both paths lead to the Campaign Pipeline — import, enrich, personalise, and launch from there.
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
        <div style={{ display: 'flex', gap: 10 }}>
          {LEAD_SOURCES.map(ls => (
            <label key={ls.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="radio"
                name="leadSource"
                value={ls.id}
                checked={leadSource === ls.id}
                onChange={() => setLeadSource(ls.id)}
                style={{ accentColor: 'var(--blue)' }}
              />
              {ls.label}
            </label>
          ))}
        </div>
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
    </div>
  );

  // Quick Setup page
  return (
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
          className="btn btn-blue"
          style={{ padding: '13px 0', fontSize: 15, fontWeight: 700, borderRadius: 10, width: '100%' }}
          disabled={creating}
          onClick={doQuickCreate}
        >
          {creating ? <><Spinner /> Creating…</> : 'Create Campaign →'}
        </button>
      </div>
    </div>
  );
}
