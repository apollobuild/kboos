import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../services/api.js';

// ─── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 12, height: 12,
      border: '2px solid var(--border)', borderTopColor: 'var(--blue)',
      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
    }} />
  );
}

// ─── Channel icon helper ────────────────────────────────────────────────────────
function channelIcon(ch) {
  if (ch === 'email') return '◈';
  if (ch === 'wa') return '✦';
  return '◉';
}
function channelLabel(ch) {
  if (ch === 'email') return 'Email';
  if (ch === 'wa') return 'WhatsApp';
  return 'Voice';
}
function channelColor(ch) {
  if (ch === 'email') return 'var(--blue)';
  if (ch === 'wa') return 'var(--green)';
  return 'var(--amber)';
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 1 — GENERATED ASSETS (ported from AiStudio.jsx)
// ════════════════════════════════════════════════════════════════════════════════
const ASSET_TYPES = [
  { id: 'full',  label: 'Full Campaign Suite',  channels: ['email', 'wa', 'voice'] },
  { id: 'email', label: 'Email Sequence',        channels: ['email'] },
  { id: 'wa',    label: 'WhatsApp Sequence',     channels: ['wa'] },
  { id: 'voice', label: 'Voice Agent Script',    channels: ['voice'] },
];

function GeneratedAssetsTab({ businesses, campaigns, showToast, injectedAssets, onInjectedConsumed }) {
  const [form, setForm] = useState({
    assetType: 'full', bizId: '', offer: '', targetAudience: '', goal: '', tone: 'Professional', lang: 'EN',
  });
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [expandedAsset, setExpandedAsset] = useState(null);
  const [editedBodies, setEditedBodies] = useState({});
  const [savingTo, setSavingTo] = useState(null);

  // Consume injected assets from Templates tab
  useEffect(() => {
    if (injectedAssets) {
      setHistory(prev => [injectedAssets, ...prev.slice(0, 2)]);
      setHistoryIdx(0);
      setExpandedAsset(null);
      setEditedBodies({});
      if (onInjectedConsumed) onInjectedConsumed();
    }
  }, [injectedAssets]);

  const biz = businesses.find(b => b.id === form.bizId);

  async function generate() {
    if (!form.bizId || !form.offer || !form.targetAudience) {
      showToast('Fill in Business, Offer, and Target Audience', 'red');
      return;
    }
    setGenerating(true);
    try {
      const channels = ASSET_TYPES.find(t => t.id === form.assetType)?.channels || ['email', 'wa', 'voice'];
      const bizName = biz?.name || '';
      const industry = biz?.industry || '';
      const res = await apiFetch('/ai/generate-assets', {
        method: 'POST',
        body: {
          bizId: form.bizId, bizName, industry, offer: form.offer,
          targetAudience: form.targetAudience, goal: form.goal, tone: form.tone,
          lang: form.lang, channels, dreamOutcome: form.goal,
        },
      });
      const assets = [
        ...(res.emails || []).map((e, i) => ({ ...e, channel: 'email', assetType: e.assetType || `email_${i + 1}`, label: e.label || `Email ${i + 1}` })),
        ...(res.whatsapps || []).map((e, i) => ({ ...e, channel: 'wa', assetType: e.assetType || `wa_${i + 1}`, label: e.label || `WhatsApp ${i + 1}` })),
        ...(res.voice ? [
          typeof res.voice === 'object' && res.voice.warm   ? res.voice.warm   : null,
          typeof res.voice === 'object' && res.voice.direct ? res.voice.direct : null,
          typeof res.voice === 'string' ? { body: res.voice, channel: 'voice', assetType: 'voice_1', label: 'Voice Script' } : null,
        ].filter(Boolean) : []),
      ];
      setHistory(prev => [{ assets, bizName, assetType: form.assetType }, ...prev.slice(0, 2)]);
      setHistoryIdx(0);
      setExpandedAsset(null);
      setEditedBodies({});
      showToast(`Generated ${assets.length} assets`);
    } catch (e) { showToast(e.message, 'red'); }
    setGenerating(false);
  }

  async function saveAsset(asset, campaignId) {
    setSavingTo(asset.assetType);
    try {
      await apiFetch(`/pipeline/${campaignId}/assets/add`, {
        method: 'POST',
        body: {
          assetType: asset.assetType, channel: asset.channel, label: asset.label,
          subject: asset.subject, body: editedBodies[asset.assetType] ?? asset.body, approved: false,
        },
      });
      showToast('Saved to campaign');
    } catch (e) { showToast(e.message, 'red'); }
    setSavingTo(null);
  }

  function copyAsset(asset) {
    const text = [asset.subject ? `Subject: ${asset.subject}` : '', editedBodies[asset.assetType] ?? asset.body].filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard')).catch(() => {});
  }

  const current = history[historyIdx];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>
      {/* Left: form */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Build New Asset</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}>ASSET TYPE</div>
            <select className="input" style={{ fontSize: 12 }} value={form.assetType} onChange={e => setForm(f => ({ ...f, assetType: e.target.value }))}>
              {ASSET_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}>BUSINESS</div>
            <select className="input" style={{ fontSize: 12 }} value={form.bizId} onChange={e => setForm(f => ({ ...f, bizId: e.target.value }))}>
              <option value="">Select business</option>
              {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}>OFFER <span style={{ color: 'var(--red)' }}>*</span></div>
            <input className="input" style={{ fontSize: 12 }} placeholder="What are you selling?" value={form.offer} onChange={e => setForm(f => ({ ...f, offer: e.target.value }))} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}>TARGET AUDIENCE <span style={{ color: 'var(--red)' }}>*</span></div>
            <input className="input" style={{ fontSize: 12 }} placeholder="Who are you selling to?" value={form.targetAudience} onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}>GOAL</div>
            <input className="input" style={{ fontSize: 12 }} placeholder="Desired outcome (e.g. Book a call)" value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}>TONE</div>
              <select className="input" style={{ fontSize: 12 }} value={form.tone} onChange={e => setForm(f => ({ ...f, tone: e.target.value }))}>
                {['Professional', 'Casual', 'Direct', 'Consultative'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}>LANGUAGE</div>
              <select className="input" style={{ fontSize: 12 }} value={form.lang} onChange={e => setForm(f => ({ ...f, lang: e.target.value }))}>
                <option value="EN">English</option>
                <option value="MS">Bahasa Malaysia</option>
                <option value="ZH">Mandarin</option>
              </select>
            </div>
          </div>
          <button className="btn btn-green" style={{ marginTop: 4 }} disabled={generating || !form.offer || !form.targetAudience} onClick={generate}>
            {generating ? <><Spinner /> Claude is writing…</> : '⚡ Generate Assets'}
          </button>
          {generating && (
            <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>
              Using Claude Opus — takes 15–30 seconds.<br />Best quality, runs once.
            </div>
          )}
        </div>
      </div>

      {/* Right: output */}
      <div>
        {history.length > 1 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {history.map((h, i) => (
              <button key={i} style={{
                padding: '4px 12px', fontSize: 11, borderRadius: 6, cursor: 'pointer',
                background: historyIdx === i ? 'var(--s2)' : 'transparent',
                border: `1px solid ${historyIdx === i ? 'var(--blue)' : 'var(--border)'}`,
                color: historyIdx === i ? 'var(--blue)' : 'var(--muted)',
              }} onClick={() => setHistoryIdx(i)}>
                {i === 0 ? 'Latest' : `Previous ${i}`}
              </button>
            ))}
          </div>
        )}

        {!current ? (
          <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
            <div style={{ fontSize: 32, marginBottom: 12, color: 'var(--border)' }}>◎</div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Generated assets will appear here</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Fill in the form and click Generate to create outreach copy with Claude Opus.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
              {current.assets.length} assets generated for {current.bizName}
            </div>
            {current.assets.map(asset => {
              const isOpen = expandedAsset === asset.assetType;
              return (
                <div key={asset.assetType} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer', background: 'var(--s1)' }}
                    onClick={() => setExpandedAsset(isOpen ? null : asset.assetType)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, color: channelColor(asset.channel) }}>{channelIcon(asset.channel)}</span>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{asset.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 8px' }} onClick={e => { e.stopPropagation(); copyAsset(asset); }}>Copy</button>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{ padding: '14px 16px', background: 'var(--s2)', borderTop: '1px solid var(--border)' }}>
                      {asset.subject && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3, fontWeight: 600 }}>SUBJECT</div>
                          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{asset.subject}</div>
                        </div>
                      )}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}>BODY</div>
                        <textarea
                          style={{ width: '100%', minHeight: 120, background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: 'var(--text)', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                          value={editedBodies[asset.assetType] ?? asset.body}
                          onChange={e => setEditedBodies(prev => ({ ...prev, [asset.assetType]: e.target.value }))}
                        />
                      </div>
                      {asset.notes && <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 12 }}>Note: {asset.notes}</div>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>Save to campaign:</span>
                        {campaigns.slice(0, 5).map(c => (
                          <button key={c.id} className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 10px' }} disabled={savingTo === asset.assetType} onClick={() => saveAsset(asset, c.id)}>
                            {savingTo === asset.assetType ? <Spinner /> : c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 2 — SEQUENCES
// ════════════════════════════════════════════════════════════════════════════════
const CHANNELS = ['email', 'wa', 'voice'];
const STEP_TYPES = ['intro', 'followup', 'closing'];

const defaultStep = () => ({ id: Date.now() + Math.random(), day: 1, channel: 'email', type: 'intro', notes: '' });

function SequencesTab({ showToast }) {
  const [sequences, setSequences] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kboos_sequences') || '[]'); } catch { return []; }
  });
  const [selectedId, setSelectedId] = useState(null);
  const [name, setName] = useState('');
  const [steps, setSteps] = useState([defaultStep()]);
  const [editing, setEditing] = useState(false); // true = builder open

  function saveSequences(next) {
    setSequences(next);
    localStorage.setItem('kboos_sequences', JSON.stringify(next));
  }

  function openNew() {
    setSelectedId(null);
    setName('');
    setSteps([defaultStep()]);
    setEditing(true);
  }

  function openExisting(seq) {
    setSelectedId(seq.id);
    setName(seq.name);
    setSteps(seq.steps.map(s => ({ ...s, id: s.id || Date.now() + Math.random() })));
    setEditing(true);
  }

  function saveSequence() {
    if (!name.trim()) { showToast('Give your sequence a name', 'red'); return; }
    if (steps.length === 0) { showToast('Add at least one step', 'red'); return; }
    const cleanSteps = steps.map(({ id, ...s }) => ({ ...s }));
    if (selectedId) {
      saveSequences(sequences.map(s => s.id === selectedId ? { ...s, name, steps: cleanSteps } : s));
      showToast('Sequence updated');
    } else {
      const newSeq = { id: Date.now(), name, steps: cleanSteps };
      saveSequences([...sequences, newSeq]);
      setSelectedId(newSeq.id);
      showToast('Sequence saved');
    }
  }

  function deleteSequence(id) {
    saveSequences(sequences.filter(s => s.id !== id));
    if (selectedId === id) { setEditing(false); setSelectedId(null); }
    showToast('Sequence deleted', 'amber');
  }

  function addStep() {
    const last = steps[steps.length - 1];
    setSteps(prev => [...prev, { ...defaultStep(), day: last ? last.day + 3 : 1 }]);
  }

  function updateStep(tmpId, patch) {
    setSteps(prev => prev.map(s => s.id === tmpId ? { ...s, ...patch } : s));
  }

  function removeStep(tmpId) {
    setSteps(prev => prev.filter(s => s.id !== tmpId));
  }

  const channelIconMap = { email: '◈', wa: '✦', voice: '◉' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>
      {/* Left: saved list */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Saved Sequences</div>
          <button className="btn btn-sm btn-blue" style={{ fontSize: 11 }} onClick={openNew}>+ New</button>
        </div>
        {sequences.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
            No sequences yet.<br />Click + New to build one.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {sequences.map(seq => (
              <div
                key={seq.id}
                onClick={() => openExisting(seq)}
                style={{
                  padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                  background: selectedId === seq.id ? 'var(--s2)' : 'transparent',
                  borderLeft: selectedId === seq.id ? '2px solid var(--blue)' : '2px solid transparent',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{seq.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
                  <span>{seq.steps.length} steps</span>
                  <span>·</span>
                  <span>{[...new Set(seq.steps.map(s => s.channel))].map(ch => channelIconMap[ch]).join(' ')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: builder */}
      {!editing ? (
        <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
          <div style={{ fontSize: 28, marginBottom: 12, color: 'var(--border)' }}>⇄</div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Build a multi-step sequence</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>Chain emails, WhatsApp messages, and voice calls across days to maximise reply rates.</div>
          <button className="btn btn-blue" onClick={openNew}>+ New Sequence</button>
        </div>
      ) : (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Sequence Builder</div>
            {selectedId && (
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--red)' }} onClick={() => deleteSequence(selectedId)}>Delete</button>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}>SEQUENCE NAME</div>
            <input className="input" style={{ fontSize: 12 }} placeholder="e.g. 14-Day F&B Warm-Up" value={name} onChange={e => setName(e.target.value)} />
          </div>

          {/* Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 16, position: 'relative' }}>
            {steps.map((step, idx) => (
              <div key={step.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingBottom: 12 }}>
                {/* Dot + line */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--s2)', border: `2px solid ${channelColor(step.channel)}`,
                    fontSize: 11, fontWeight: 700, color: channelColor(step.channel), flexShrink: 0,
                  }}>
                    {idx + 1}
                  </div>
                  {idx < steps.length - 1 && (
                    <div style={{ width: 2, flexGrow: 1, minHeight: 24, background: 'var(--border)', margin: '3px 0' }} />
                  )}
                </div>

                {/* Step fields */}
                <div style={{ flex: 1, background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 3, fontWeight: 600 }}>DAY</div>
                      <input
                        type="number" min={1} className="input" style={{ fontSize: 12, padding: '4px 6px' }}
                        value={step.day} onChange={e => updateStep(step.id, { day: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 3, fontWeight: 600 }}>CHANNEL</div>
                      <select className="input" style={{ fontSize: 12, padding: '4px 6px' }} value={step.channel} onChange={e => updateStep(step.id, { channel: e.target.value })}>
                        {CHANNELS.map(ch => <option key={ch} value={ch}>{channelLabel(ch)}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 3, fontWeight: 600 }}>TYPE</div>
                      <select className="input" style={{ fontSize: 12, padding: '4px 6px' }} value={step.type} onChange={e => updateStep(step.id, { type: e.target.value })}>
                        {STEP_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <button
                      style={{ marginTop: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 14, padding: '4px 2px' }}
                      onClick={() => removeStep(step.id)} title="Remove step"
                    >✕</button>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 3, fontWeight: 600 }}>NOTES (optional)</div>
                    <input className="input" style={{ fontSize: 12, padding: '4px 8px' }} placeholder="e.g. Mention their recent promo" value={step.notes} onChange={e => updateStep(step.id, { notes: e.target.value })} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={addStep}>+ Add Step</button>
            <button className="btn btn-green" style={{ fontSize: 12 }} onClick={saveSequence}>Save Sequence</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 3 — TEMPLATES
// ════════════════════════════════════════════════════════════════════════════════
const INDUSTRY_TEMPLATES = [
  {
    id: 'fnb',
    industry: 'F&B / Restaurant',
    icon: '🍜',
    targetAudience: 'Restaurant owners, cafe operators, F&B chain managers',
    emails: [
      {
        label: 'Email 1 — Cold Intro',
        subject: 'More tables filled during off-peak hours — without ad spend',
        body: `Hi [Name],

Running a restaurant in Malaysia means weekday afternoons and early weeknights often sit half-empty while Friday dinner is overflowing.

KBOOS helps F&B operators fill those quiet slots using AI-powered outreach — reaching corporate lunch groups, event organisers, and regulars who haven't visited in 60+ days.

We set it up in under a day. No ad budget needed.

Would a quick 20-minute call make sense this week?

Best,
[Your Name]`,
      },
      {
        label: 'Email 2 — Value Add Follow-up',
        subject: 'How Kafe Murni filled 40 extra pax on Tuesdays',
        body: `Hi [Name],

Quick follow-up. Wanted to share a case study relevant to your situation.

Kafe Murni (KL Sentral) used our AI outreach system to re-engage 300 lapsed customers. Result: 40 extra covers every Tuesday within 6 weeks. Their cost per seated guest was RM4.

The system runs on autopilot — no extra staff, no ads.

Worth 20 minutes to see if it fits your operation?

[Your Name]`,
      },
      {
        label: 'Email 3 — Soft Close',
        subject: 'Last note from me — re: filling your quiet slots',
        body: `Hi [Name],

I won't keep following up after this — I respect your inbox.

If filling off-peak tables with no ad spend is something you'd want to explore before the next quarter, I'm happy to walk you through it in 20 minutes.

If the timing isn't right, no worries at all.

Either way — hope business is going well.

[Your Name]`,
      },
    ],
    whatsapps: [
      {
        label: 'WA 1 — Intro',
        body: `Hi [Name], I help F&B operators in Malaysia fill off-peak tables using AI outreach — no ad budget needed. Would love to show you a quick demo. Free for a 15-min call this week? 🙏`,
      },
      {
        label: 'WA 2 — Follow-up',
        body: `Hi [Name], just checking in. We helped a KL cafe add 40 extra covers per week on slow days — all automated. Happy to share how. Worth a quick 15 mins?`,
      },
    ],
    voice: {
      label: 'Voice Script',
      body: `Hi, may I speak with [Name]?

Hi [Name], this is [Your Name] calling from KBOOS. We help restaurant operators in Malaysia fill empty seats during off-peak hours using AI-powered outreach — no ad spend required.

We recently helped a cafe in KL Sentral add 40 extra covers on Tuesdays alone. Takes less than a day to set up.

Do you have 10 minutes this week for a quick walkthrough? I promise it won't be a sales pitch — just a look at how the system works for F&B.`,
    },
  },
  {
    id: 'realestate',
    industry: 'Real Estate',
    icon: '🏠',
    targetAudience: 'Property agents, developers, real estate agencies',
    emails: [
      {
        label: 'Email 1 — Cold Intro',
        subject: 'Qualified buyer leads on autopilot — for property agents in Malaysia',
        body: `Hi [Name],

Most agents spend 80% of their time chasing unqualified leads. KBOOS flips that.

Our AI outreach system targets verified property seekers — filtered by budget, location, and timeline — and warms them up before they ever speak to you.

Agents using KBOOS typically cut their lead-to-meeting time by 60%.

Would a 20-minute demo be worth your time this week?

[Your Name]`,
      },
      {
        label: 'Email 2 — Value Add Follow-up',
        subject: 'How Janice closed 3 units in 45 days using AI outreach',
        body: `Hi [Name],

Following up with a real story.

Janice, a negotiator in Petaling Jaya, used KBOOS for 45 days. In that time, she had 22 qualified appointments and closed 3 units — with no cold calling and zero ad spend.

The AI handled the initial outreach and follow-ups. She just showed up to meetings.

Happy to show you the same system. 20 minutes?

[Your Name]`,
      },
      {
        label: 'Email 3 — Soft Close',
        subject: 'One last note — qualified property leads',
        body: `Hi [Name],

I'll leave this as my last note.

If generating a consistent pipeline of qualified buyers or tenants — without cold calling — is something you want before Q3, let's talk.

Just reply "yes" and I'll send over a calendar link.

[Your Name]`,
      },
    ],
    whatsapps: [
      {
        label: 'WA 1 — Intro',
        body: `Hi [Name], I help property agents in Malaysia get qualified buyer appointments without cold calling. Our AI does the outreach — you just show up to meetings. Worth a quick 15-min call? 🏡`,
      },
      {
        label: 'WA 2 — Follow-up',
        body: `Hi [Name], following up! One of our agents closed 3 units in 45 days using KBOOS — zero cold calls. Happy to walk you through it. Free this week for 15 mins?`,
      },
    ],
    voice: {
      label: 'Voice Script',
      body: `Hi, is this [Name]?

Hi [Name], this is [Your Name] from KBOOS. We help property agents in Malaysia build a consistent pipeline of qualified buyers — using AI-powered outreach that runs in the background while you focus on closing.

One of our agents had 22 qualified appointments and closed 3 units in 45 days — without any cold calling.

I'd love to walk you through how it works. Do you have 15 minutes this week?`,
    },
  },
  {
    id: 'saas',
    industry: 'SaaS / Technology',
    icon: '💻',
    targetAudience: 'SME business owners, operations managers, department heads',
    emails: [
      {
        label: 'Email 1 — Cold Intro',
        subject: 'Your sales team is probably wasting 60% of their time',
        body: `Hi [Name],

If your sales team is manually prospecting, writing one-off emails, and chasing cold leads — they're spending most of their day on tasks that AI can do better and faster.

KBOOS automates your B2B outreach from prospecting to follow-up. We integrate with your CRM and start generating qualified meetings within the first week.

Would a 20-minute walkthrough be useful?

[Your Name]`,
      },
      {
        label: 'Email 2 — Value Add Follow-up',
        subject: '37 demos booked in one month — with 1 SDR',
        body: `Hi [Name],

A quick data point you might find useful.

One of our SaaS clients (HR tech, KL) ran KBOOS for 30 days with a single SDR. They booked 37 demos — up from 9 the previous month. Pipeline grew 4x.

The system handles targeting, personalised outreach, and follow-up sequences. The SDR focused on running demos.

Would this be relevant to your team?

[Your Name]`,
      },
      {
        label: 'Email 3 — Soft Close',
        subject: 'Re: Growing your pipeline',
        body: `Hi [Name],

Last nudge from me.

If scaling your outbound pipeline without scaling your headcount is on your Q3 agenda, I think KBOOS can help.

Reply with a good time and I'll send over a short deck and calendar invite.

[Your Name]`,
      },
    ],
    whatsapps: [
      {
        label: 'WA 1 — Intro',
        body: `Hi [Name], I help SaaS companies in Malaysia automate B2B prospecting so their sales teams only talk to warm leads. Interested in seeing how it works? Takes 20 mins 🚀`,
      },
      {
        label: 'WA 2 — Follow-up',
        body: `Hi [Name]! One of our clients went from 9 to 37 demos/month with the same SDR headcount. Worth a quick look? Happy to share details over a 20-min call.`,
      },
    ],
    voice: {
      label: 'Voice Script',
      body: `Hi, may I speak with [Name]?

Hi [Name], this is [Your Name] calling from KBOOS. We help SaaS companies in Malaysia automate their B2B outreach so sales teams spend more time closing and less time prospecting.

One of our clients went from 9 to 37 demos a month with the same SDR team.

I'd love to show you how the system works — would you have 20 minutes this week?`,
    },
  },
  {
    id: 'professional_services',
    industry: 'Professional Services',
    icon: '📋',
    targetAudience: 'SME owners needing accounting, legal, HR, or business consulting',
    emails: [
      {
        label: 'Email 1 — Cold Intro',
        subject: 'Done-for-you [accounting/HR/legal] — measurable results, fixed monthly fee',
        body: `Hi [Name],

Most SMEs in Malaysia pay for professional services and get slow turnarounds, unclear deliverables, and invoices that keep growing.

We do it differently. Our done-for-you service model comes with fixed monthly pricing, SLA-backed delivery, and a dashboard so you always know what's happening.

We work with 50+ SMEs in the Klang Valley across accounting, HR, and compliance.

Would a 20-minute intro call be worth your time?

[Your Name]`,
      },
      {
        label: 'Email 2 — Value Add Follow-up',
        subject: 'How Tech SME cut compliance costs by 40%',
        body: `Hi [Name],

A quick case study to follow up.

A 25-person tech company in Shah Alam was spending RM6,000/month on fragmented accounting and HR support. After switching to our integrated service, they cut that cost by 40% and reduced late submissions to zero.

We'd be happy to do a free 45-minute business review to see where you're currently losing time and money.

Interested?

[Your Name]`,
      },
      {
        label: 'Email 3 — Soft Close',
        subject: 'Last note — professional services for your SME',
        body: `Hi [Name],

I'll wrap up here.

If you're spending too much time managing multiple service providers — or worried about compliance gaps — I think a quick conversation would be useful.

Happy to do a free 45-minute review of your current setup. No obligation.

Just reply and I'll get a time sorted.

[Your Name]`,
      },
    ],
    whatsapps: [
      {
        label: 'WA 1 — Intro',
        body: `Hi [Name], we offer done-for-you accounting, HR, and compliance services for SMEs in Malaysia — fixed monthly fee, measurable outcomes. Worth a quick 20-min call to see if we're a fit? 📊`,
      },
      {
        label: 'WA 2 — Follow-up',
        body: `Hi [Name], following up! We helped a Shah Alam SME cut compliance costs by 40%. Happy to do a free 45-min review of your current setup. Free this week?`,
      },
    ],
    voice: {
      label: 'Voice Script',
      body: `Hi, could I speak with [Name]?

Hi [Name], this is [Your Name] from [Company]. We provide done-for-you accounting, HR, and compliance services for Malaysian SMEs on a fixed monthly retainer — so you always know what you're paying and what you're getting.

We recently helped a 25-person tech company in Shah Alam reduce their professional services costs by 40%.

I'd love to offer you a free 45-minute business review. Would this week work for you?`,
    },
  },
  {
    id: 'healthcare',
    industry: 'Healthcare / Clinic',
    icon: '🏥',
    targetAudience: 'Clinic operators, dental practices, private medical centres',
    emails: [
      {
        label: 'Email 1 — Cold Intro',
        subject: 'Patient acquisition system for private clinics — no marketing agency needed',
        body: `Hi [Name],

Most private clinics in Malaysia rely on walk-ins and referrals. It works — until it doesn't.

KBOOS builds a patient acquisition system using digital outreach: targeted by geography, service type, and patient profile. We've helped clinics in KL and Selangor consistently fill their appointment books without a marketing agency.

Would a 20-minute demo be useful?

[Your Name]`,
      },
      {
        label: 'Email 2 — Value Add Follow-up',
        subject: 'From 60% to 92% appointment fill rate in 8 weeks',
        body: `Hi [Name],

A case study worth sharing.

A dental clinic in Subang Jaya was running at 60% capacity despite being in a high-footfall area. We set up a targeted outreach campaign to residents within 5km. Eight weeks later, they were at 92% fill rate and had a waiting list for Saturdays.

The system runs automatically. The clinic team didn't change a thing.

Happy to show you how it works for your practice.

[Your Name]`,
      },
      {
        label: 'Email 3 — Soft Close',
        subject: 'Re: Filling your appointment book',
        body: `Hi [Name],

My last note on this.

If filling your appointment book consistently — without relying on referrals alone — is a priority, I'd love to connect.

Reply with a good time and I'll share the details.

[Your Name]`,
      },
    ],
    whatsapps: [
      {
        label: 'WA 1 — Intro',
        body: `Hi [Name], we help private clinics and dental practices in Malaysia fill their appointment books using digital outreach — no agency needed. Worth a quick 20-min demo? 🏥`,
      },
      {
        label: 'WA 2 — Follow-up',
        body: `Hi [Name]! A dental clinic in Subang went from 60% to 92% fill rate in 8 weeks using our system. Happy to walk you through it — free this week?`,
      },
    ],
    voice: {
      label: 'Voice Script',
      body: `Hi, may I speak with [Name]?

Hi [Name], this is [Your Name] from KBOOS. We help private clinics and dental practices in Malaysia fill their appointment books using a targeted digital outreach system — no marketing agency required.

A dental clinic in Subang Jaya went from 60% to 92% fill rate in just 8 weeks with our system.

Would you have 20 minutes this week to see how it works for your practice?`,
    },
  },
  {
    id: 'ecommerce',
    industry: 'E-commerce / Retail',
    icon: '🛒',
    targetAudience: 'Retail store owners, online sellers, marketplace merchants',
    emails: [
      {
        label: 'Email 1 — Cold Intro',
        subject: 'Turn one-time buyers into repeat customers — automatically',
        body: `Hi [Name],

The most expensive customer is a new one. The most profitable is the one who's already bought from you.

KBOOS builds automated re-engagement sequences for your existing customer base — personalised by purchase history, timing, and product category. Most retailers see a 20–35% increase in repeat purchase rate within 60 days.

Would a quick walkthrough be useful?

[Your Name]`,
      },
      {
        label: 'Email 2 — Value Add Follow-up',
        subject: 'RM180,000 in reactivated revenue — from dormant customers',
        body: `Hi [Name],

Following up with a result I thought you'd find interesting.

A Shopee seller in Johor Bahru had 8,000 past customers who hadn't bought in 6+ months. We ran a 3-step re-engagement sequence. Within 45 days, 12% reactivated — generating RM180,000 in revenue from customers they thought were gone.

Zero ad spend. All outreach.

Happy to show you how this works for your store.

[Your Name]`,
      },
      {
        label: 'Email 3 — Soft Close',
        subject: 'Re: Repeat purchases and customer reactivation',
        body: `Hi [Name],

Last note from me.

If growing repeat purchases from your existing customer base is on your list, I think a 20-minute call would be worth your time.

Just reply and I'll sort out a time that suits you.

[Your Name]`,
      },
    ],
    whatsapps: [
      {
        label: 'WA 1 — Intro',
        body: `Hi [Name], we help online and retail sellers in Malaysia turn dormant customers into repeat buyers — automatically. Most see 20–35% more repeat sales within 60 days. Worth a quick chat? 🛍️`,
      },
      {
        label: 'WA 2 — Follow-up',
        body: `Hi [Name]! A Shopee seller reactivated 12% of dormant customers in 45 days — RM180k in revenue, zero ad spend. Happy to show you how. Free this week?`,
      },
    ],
    voice: {
      label: 'Voice Script',
      body: `Hi, is this [Name]?

Hi [Name], this is [Your Name] from KBOOS. We help e-commerce and retail businesses in Malaysia increase repeat purchases from their existing customer base — using automated outreach sequences personalised by purchase history.

One of our clients reactivated 12% of dormant customers in 45 days, generating RM180,000 with zero ad spend.

Would you have 20 minutes this week to see if this is a fit for your business?`,
    },
  },
  {
    id: 'manufacturing',
    industry: 'Manufacturing / Industrial',
    icon: '🏭',
    targetAudience: 'Factory owners, procurement managers, B2B supply chain decision-makers',
    emails: [
      {
        label: 'Email 1 — Cold Intro',
        subject: 'Find verified B2B buyers for your products — without a sales team',
        body: `Hi [Name],

Building a sales pipeline in manufacturing takes time — trade shows, broker fees, cold calls. KBOOS cuts that process down.

We use AI to identify, qualify, and reach out to verified B2B buyers in your target sector — so your team only speaks to companies already interested in what you make.

Would a 20-minute call make sense?

[Your Name]`,
      },
      {
        label: 'Email 2 — Value Add Follow-up',
        subject: '14 new B2B accounts in 90 days — for a Penang manufacturer',
        body: `Hi [Name],

A case study relevant to your business.

A plastic component manufacturer in Penang spent years relying on trade shows and referrals. With KBOOS, they ran a 90-day outreach campaign targeting procurement leads in their buyer profile. They landed 14 new accounts — with an average order value of RM35,000.

No trade show booth. No broker fees. Just targeted outreach.

Would this work for your product line?

[Your Name]`,
      },
      {
        label: 'Email 3 — Soft Close',
        subject: 'Last note — finding new B2B buyers',
        body: `Hi [Name],

I'll leave this as my last message.

If growing your B2B buyer base without increasing your sales headcount is something you're working on, I'd value a 20-minute conversation.

Reply when it suits you and I'll take it from there.

[Your Name]`,
      },
    ],
    whatsapps: [
      {
        label: 'WA 1 — Intro',
        body: `Hi [Name], we help Malaysian manufacturers find and close new B2B buyers using AI outreach — no trade shows, no broker fees. Happy to share how it works in 20 mins? 🏭`,
      },
      {
        label: 'WA 2 — Follow-up',
        body: `Hi [Name]! A Penang manufacturer landed 14 new accounts in 90 days using KBOOS — avg RM35k per order. Worth a quick 20-min walk-through?`,
      },
    ],
    voice: {
      label: 'Voice Script',
      body: `Hi, may I speak with [Name]?

Hi [Name], this is [Your Name] from KBOOS. We help manufacturers in Malaysia build a B2B sales pipeline using AI-powered outreach — reaching procurement decision-makers directly, without trade shows or broker fees.

A plastic component manufacturer in Penang landed 14 new accounts in 90 days with an average order size of RM35,000.

Would you have 20 minutes this week to explore whether this fits your business?`,
    },
  },
  {
    id: 'education',
    industry: 'Education / Training',
    icon: '🎓',
    targetAudience: 'Training providers, education centres, corporate L&D managers',
    emails: [
      {
        label: 'Email 1 — Cold Intro',
        subject: 'Fill your next intake — without spending more on ads',
        body: `Hi [Name],

Running training programmes in Malaysia is competitive. Getting consistent enrolments — especially for corporate clients — requires a system, not just ads.

KBOOS builds a targeted outreach system for training providers: reaching HR managers, L&D leads, and department heads who have training budgets and timelines.

We've helped training centres increase enrolment by 40% within a single intake cycle.

Worth a 20-minute call?

[Your Name]`,
      },
      {
        label: 'Email 2 — Value Add Follow-up',
        subject: 'From 18 to 61 participants in one intake — how we did it',
        body: `Hi [Name],

Quick follow-up with a real result.

A certified soft-skills training provider in KL had been averaging 18 participants per intake. After we set up targeted outreach to corporate HR contacts in their sector, the next intake had 61 participants — 12 of them on a company-wide contract.

The difference was reaching the right people before their training budget decisions were made.

Would a similar approach work for your programmes?

[Your Name]`,
      },
      {
        label: 'Email 3 — Soft Close',
        subject: 'Re: Filling your next training intake',
        body: `Hi [Name],

Last note from me.

If growing enrolments for your next intake — especially from corporate clients — is a priority, I'd love to show you what we've built.

Just reply with a good time and I'll send a calendar invite.

[Your Name]`,
      },
    ],
    whatsapps: [
      {
        label: 'WA 1 — Intro',
        body: `Hi [Name], we help training providers in Malaysia fill intakes by reaching corporate HR and L&D contacts directly — before they lock in budgets. Worth a quick 20-min call? 🎓`,
      },
      {
        label: 'WA 2 — Follow-up',
        body: `Hi [Name]! A KL training centre went from 18 to 61 participants in one intake using our outreach system. Happy to show you how — free this week for 20 mins?`,
      },
    ],
    voice: {
      label: 'Voice Script',
      body: `Hi, could I speak with [Name]?

Hi [Name], this is [Your Name] from KBOOS. We help training providers in Malaysia fill their intakes by reaching corporate HR managers and L&D decision-makers directly — before they finalise their training calendars.

One of our clients went from 18 to 61 participants in a single intake — including 12 on a company-wide contract.

I'd love to show you how the system works. Would 20 minutes this week suit you?`,
    },
  },
  {
    id: 'financial_services',
    industry: 'Financial Services',
    icon: '💰',
    targetAudience: 'SME owners, investors, business decision-makers needing financing or planning',
    emails: [
      {
        label: 'Email 1 — Cold Intro',
        subject: 'SME financing options most business owners don\'t know exist',
        body: `Hi [Name],

Most SME owners in Malaysia know about bank loans — but miss out on government-backed financing, grant matching, and working capital facilities that can be approved in days, not months.

We help SMEs identify and access the right financial instruments for their stage and sector.

If you're planning to grow, hire, or invest in the next 6 months, a 20-minute financial discovery session might save you significant time and cost.

[Your Name]`,
      },
      {
        label: 'Email 2 — Value Add Follow-up',
        subject: 'RM500k approved in 18 days — for a Selangor SME',
        body: `Hi [Name],

A quick case study worth reading.

A logistics SME in Selangor needed working capital to take on a large contract. Through our financing advisory, they accessed a SJPP-guaranteed facility and received RM500,000 approval in 18 days — without approaching a single bank directly.

We handle the matching, documentation, and bank liaison.

Would a free discovery session be useful?

[Your Name]`,
      },
      {
        label: 'Email 3 — Soft Close',
        subject: 'Last note — SME financing and financial planning',
        body: `Hi [Name],

My last note on this.

If accessing the right financing — or getting a clearer picture of your business finances before the year-end — is useful, I'd be happy to offer a complimentary 30-minute session.

No commitment. Just useful information.

Reply when suits and I'll arrange it.

[Your Name]`,
      },
    ],
    whatsapps: [
      {
        label: 'WA 1 — Intro',
        body: `Hi [Name], I help Malaysian SMEs access the right financing — grants, working capital, government-backed schemes — faster than going through banks alone. Worth a free 20-min session? 💼`,
      },
      {
        label: 'WA 2 — Follow-up',
        body: `Hi [Name], following up! We helped a Selangor SME get RM500k approved in 18 days. Happy to show you what's available for your business — free 20-min session?`,
      },
    ],
    voice: {
      label: 'Voice Script',
      body: `Hi, may I speak with [Name]?

Hi [Name], this is [Your Name] calling. We help Malaysian SMEs access the right financial instruments — working capital, grant matching, government-backed financing — faster and with less paperwork than going direct to banks.

We recently helped a logistics company in Selangor secure RM500,000 in 18 days.

Would you be open to a free 30-minute financial discovery session? No commitment — just useful insights for your business.`,
    },
  },
  {
    id: 'hospitality',
    industry: 'Hospitality / Events',
    icon: '🏨',
    targetAudience: 'Hotel operators, event venue managers, MICE and corporate event organisers',
    emails: [
      {
        label: 'Email 1 — Cold Intro',
        subject: 'Fill corporate bookings and event packages — before Q4 budgets close',
        body: `Hi [Name],

Corporate event budgets in Malaysia are typically decided in Q3. Hotels and venues that reach the right procurement and admin contacts before the decision is made win the booking.

KBOOS automates outreach to corporate accounts — targeting event planners, company secretaries, and department heads in your catchment area.

Would a 20-minute call to explore this be worth your time?

[Your Name]`,
      },
      {
        label: 'Email 2 — Value Add Follow-up',
        subject: 'How a Shah Alam hotel filled 80% of MICE slots for Q4',
        body: `Hi [Name],

Following up with a relevant result.

A 4-star hotel in Shah Alam ran a targeted outreach campaign in August, reaching 600 corporate accounts in Selangor. By September, 80% of their Q4 meeting and event rooms were booked — compared to 45% the previous year.

The key was reaching decision-makers early, before they locked in other venues.

Could a similar campaign work for your property?

[Your Name]`,
      },
      {
        label: 'Email 3 — Soft Close',
        subject: 'Re: Corporate bookings for your venue',
        body: `Hi [Name],

My last note on this.

If filling your event calendar — especially for Q4 corporate bookings — is a priority, I think a 20-minute conversation would be useful.

Reply with a good time and I'll take it from there.

[Your Name]`,
      },
    ],
    whatsapps: [
      {
        label: 'WA 1 — Intro',
        body: `Hi [Name], we help hotels and event venues in Malaysia fill corporate bookings and MICE packages using targeted outreach — before Q4 budgets close. Worth a 20-min call? 🏨`,
      },
      {
        label: 'WA 2 — Follow-up',
        body: `Hi [Name]! A Shah Alam hotel filled 80% of Q4 MICE slots early using our outreach system. Happy to walk you through it — free this week for 20 mins?`,
      },
    ],
    voice: {
      label: 'Voice Script',
      body: `Hi, could I speak with [Name]?

Hi [Name], this is [Your Name] from KBOOS. We help hotels and event venues in Malaysia secure corporate bookings earlier in the sales cycle — by reaching event planners and corporate accounts with targeted outreach before they finalise their venues.

A 4-star hotel in Shah Alam filled 80% of their Q4 MICE calendar by September last year using our system.

I'd love to show you how it could work for your property. Do you have 20 minutes this week?`,
    },
  },
];

function TemplatesTab({ showToast, setPage, onSaveToAssets }) {
  const [selectedId, setSelectedId] = useState(null);

  const selected = INDUSTRY_TEMPLATES.find(t => t.id === selectedId);

  function copy(text) {
    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard')).catch(() => {});
  }

  function useInCampaign() {
    setPage('new-campaign');
    showToast('Template loaded — start a new campaign');
  }

  function saveToAssets(tpl) {
    const assets = [
      ...tpl.emails.map((e, i) => ({ channel: 'email', assetType: `tpl_email_${i}`, label: e.label, subject: e.subject, body: e.body })),
      ...tpl.whatsapps.map((w, i) => ({ channel: 'wa', assetType: `tpl_wa_${i}`, label: w.label, body: w.body })),
      { channel: 'voice', assetType: 'tpl_voice', label: tpl.voice.label, body: tpl.voice.body },
    ];
    onSaveToAssets({ assets, bizName: tpl.industry, assetType: 'full' });
    showToast(`${tpl.industry} template saved to Generated Assets`);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedId ? '340px 1fr' : '1fr', gap: 16, alignItems: 'start' }}>
      {/* Grid of cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {INDUSTRY_TEMPLATES.map(tpl => (
          <div
            key={tpl.id}
            className="card"
            onClick={() => setSelectedId(selectedId === tpl.id ? null : tpl.id)}
            style={{
              padding: 16, cursor: 'pointer',
              border: `1px solid ${selectedId === tpl.id ? 'var(--blue)' : 'var(--border)'}`,
              background: selectedId === tpl.id ? 'var(--s2)' : 'var(--card)',
              transition: 'border-color 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ fontSize: 28, flexShrink: 0 }}>{tpl.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{tpl.industry}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.4 }}>{tpl.targetAudience}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--s1)', border: '1px solid var(--border)', color: 'var(--blue)' }}>
                    {tpl.emails.length} Emails
                  </span>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--s1)', border: '1px solid var(--border)', color: 'var(--green)' }}>
                    {tpl.whatsapps.length} WA
                  </span>
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--s1)', border: '1px solid var(--border)', color: 'var(--amber)' }}>
                    1 Voice
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview panel */}
      {selected && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'sticky', top: 16 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>{selected.icon}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{selected.industry}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{selected.targetAudience}</div>
            </div>
            <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16 }} onClick={() => setSelectedId(null)}>✕</button>
          </div>

          <div style={{ padding: '16px 20px', maxHeight: 520, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Emails */}
            {selected.emails.map((email, i) => (
              <AssetPreviewBlock
                key={`email_${i}`}
                channel="email"
                label={email.label}
                subject={email.subject}
                body={email.body}
                onCopy={() => copy(`Subject: ${email.subject}\n\n${email.body}`)}
              />
            ))}
            {/* WhatsApps */}
            {selected.whatsapps.map((wa, i) => (
              <AssetPreviewBlock
                key={`wa_${i}`}
                channel="wa"
                label={wa.label}
                body={wa.body}
                onCopy={() => copy(wa.body)}
              />
            ))}
            {/* Voice */}
            <AssetPreviewBlock
              channel="voice"
              label={selected.voice.label}
              body={selected.voice.body}
              onCopy={() => copy(selected.voice.body)}
            />
          </div>

          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <button className="btn btn-green" style={{ flex: 1, fontSize: 12 }} onClick={() => saveToAssets(selected)}>
              Save to Generated Assets
            </button>
            <button className="btn btn-blue" style={{ flex: 1, fontSize: 12 }} onClick={useInCampaign}>
              Use in Campaign
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AssetPreviewBlock({ channel, label, subject, body, onCopy }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--s1)', cursor: 'pointer' }}
        onClick={() => setOpen(v => !v)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 12, color: channelColor(channel) }}>{channelIcon(channel)}</span>
          <span style={{ fontSize: 11, fontWeight: 500 }}>{label}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 8px' }} onClick={e => { e.stopPropagation(); onCopy(); }}>Copy</button>
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: '10px 12px', background: 'var(--s2)', fontSize: 11, color: 'var(--text)', lineHeight: 1.6 }}>
          {subject && <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--muted)', fontSize: 10 }}>SUBJECT: <span style={{ color: 'var(--text)', fontWeight: 400, fontSize: 11 }}>{subject}</span></div>}
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{body}</pre>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 4 — OFFER LIBRARY
// ════════════════════════════════════════════════════════════════════════════════
function OfferLibraryTab({ businesses, showToast }) {
  const [offers, setOffers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kboos_offers') || '[]'); } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', bizId: '', targetAudience: '', keyBenefit: '', proofPoint: '', cta: '' });
  const [editId, setEditId] = useState(null);

  function saveOffers(next) {
    setOffers(next);
    localStorage.setItem('kboos_offers', JSON.stringify(next));
  }

  function openNew() {
    setForm({ name: '', bizId: '', targetAudience: '', keyBenefit: '', proofPoint: '', cta: '' });
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(offer) {
    setForm({ name: offer.name, bizId: offer.bizId, targetAudience: offer.targetAudience, keyBenefit: offer.keyBenefit, proofPoint: offer.proofPoint, cta: offer.cta });
    setEditId(offer.id);
    setShowForm(true);
  }

  function saveOffer() {
    if (!form.name || !form.keyBenefit || !form.targetAudience) {
      showToast('Fill in Name, Target Audience, and Key Benefit', 'red');
      return;
    }
    if (editId) {
      saveOffers(offers.map(o => o.id === editId ? { ...o, ...form } : o));
      showToast('Offer updated');
    } else {
      saveOffers([...offers, { id: Date.now(), ...form, createdAt: new Date().toISOString() }]);
      showToast('Offer saved');
    }
    setShowForm(false);
    setEditId(null);
  }

  function deleteOffer(id) {
    saveOffers(offers.filter(o => o.id !== id));
    showToast('Offer removed', 'amber');
  }

  const bizName = (id) => businesses.find(b => b.id === id)?.name || '—';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: showForm ? '1fr 380px' : '1fr', gap: 16, alignItems: 'start' }}>
      {/* Left: list */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Offer Library</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{offers.length} saved offer{offers.length !== 1 ? 's' : ''}</div>
          </div>
          <button className="btn btn-green" style={{ fontSize: 12 }} onClick={openNew}>+ New Offer</button>
        </div>

        {offers.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 28, marginBottom: 10, color: 'var(--border)' }}>◇</div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>No offers yet</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>An offer defines the core value proposition you promote in your campaigns. Save common offers to reuse across businesses.</div>
            <button className="btn btn-blue" onClick={openNew}>+ Create First Offer</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {offers.map(offer => (
              <div key={offer.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{offer.name}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }} onClick={() => openEdit(offer)}>Edit</button>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, color: 'var(--red)' }} onClick={() => deleteOffer(offer.id)}>Delete</button>
                  </div>
                </div>
                {offer.bizId && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                    Business: <span style={{ color: 'var(--text)' }}>{bizName(offer.bizId)}</span>
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                  Audience: <span style={{ color: 'var(--text)' }}>{offer.targetAudience}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text)', marginBottom: 6, lineHeight: 1.5, borderLeft: '2px solid var(--blue)', paddingLeft: 8 }}>
                  {offer.keyBenefit}
                </div>
                {offer.proofPoint && (
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 4 }}>"{offer.proofPoint}"</div>
                )}
                {offer.cta && (
                  <div style={{ fontSize: 11, marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>CTA: </span>
                    <span style={{ color: 'var(--green)' }}>{offer.cta}</span>
                  </div>
                )}
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8 }}>
                  Saved {new Date(offer.createdAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: form */}
      {showForm && (
        <div className="card" style={{ padding: 20, position: 'sticky', top: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{editId ? 'Edit Offer' : 'New Offer'}</div>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16 }} onClick={() => setShowForm(false)}>✕</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}>OFFER NAME <span style={{ color: 'var(--red)' }}>*</span></div>
              <input className="input" style={{ fontSize: 12 }} placeholder="e.g. Off-Peak Table Filling Package" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}>BUSINESS</div>
              <select className="input" style={{ fontSize: 12 }} value={form.bizId} onChange={e => setForm(f => ({ ...f, bizId: e.target.value }))}>
                <option value="">No specific business</option>
                {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}>TARGET AUDIENCE <span style={{ color: 'var(--red)' }}>*</span></div>
              <input className="input" style={{ fontSize: 12 }} placeholder="e.g. Restaurant owners in Klang Valley" value={form.targetAudience} onChange={e => setForm(f => ({ ...f, targetAudience: e.target.value }))} />
            </div>

            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}>KEY BENEFIT <span style={{ color: 'var(--red)' }}>*</span></div>
              <textarea
                className="input" style={{ fontSize: 12, resize: 'vertical', minHeight: 64, fontFamily: 'inherit' }}
                placeholder="The #1 outcome you deliver (e.g. Fill off-peak tables using AI outreach — no ad spend)"
                value={form.keyBenefit}
                onChange={e => setForm(f => ({ ...f, keyBenefit: e.target.value }))}
              />
            </div>

            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}>PROOF POINT</div>
              <input className="input" style={{ fontSize: 12 }} placeholder="e.g. Helped 50+ F&B operators add 30% more covers" value={form.proofPoint} onChange={e => setForm(f => ({ ...f, proofPoint: e.target.value }))} />
            </div>

            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}>CTA</div>
              <input className="input" style={{ fontSize: 12 }} placeholder="e.g. Book a 20-min demo call" value={form.cta} onChange={e => setForm(f => ({ ...f, cta: e.target.value }))} />
            </div>

            <button className="btn btn-green" style={{ marginTop: 4, fontSize: 12 }} onClick={saveOffer}>
              {editId ? 'Update Offer' : 'Save Offer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'assets',    label: 'Generated Assets' },
  { id: 'sequences', label: 'Sequences' },
  { id: 'templates', label: 'Templates' },
  { id: 'offers',    label: 'Offer Library' },
];

export function AiCampaignStudio() {
  const { campaigns, businesses, showToast, setPage } = useAppStore(useShallow(s => ({
    campaigns: s.campaigns,
    businesses: s.businesses,
    showToast: s.showToast,
    setPage: s.setPage,
  })));

  const [activeTab, setActiveTab] = useState('assets');
  // Shared generated assets history — so Templates "Save to Assets" feeds into tab 1
  const [injectedAssets, setInjectedAssets] = useState(null);

  function handleSaveToAssets(entry) {
    setInjectedAssets(entry);
    setActiveTab('assets');
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="fade-up" style={{ marginBottom: 20 }}>
        <h1 className="page-title">AI Campaign Studio</h1>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
          Generate assets, build sequences, browse industry templates, and manage your offer library — all in one place.
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 18px', fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab.id ? 'var(--blue)' : 'var(--muted)',
              borderBottom: `2px solid ${activeTab === tab.id ? 'var(--blue)' : 'transparent'}`,
              marginBottom: -1, transition: 'color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="fade-up-1">
        {activeTab === 'assets' && (
          <GeneratedAssetsTab
            businesses={businesses}
            campaigns={campaigns}
            showToast={showToast}
            injectedAssets={injectedAssets}
            onInjectedConsumed={() => setInjectedAssets(null)}
          />
        )}
        {activeTab === 'sequences' && (
          <SequencesTab showToast={showToast} />
        )}
        {activeTab === 'templates' && (
          <TemplatesTab
            showToast={showToast}
            setPage={setPage}
            onSaveToAssets={handleSaveToAssets}
          />
        )}
        {activeTab === 'offers' && (
          <OfferLibraryTab businesses={businesses} showToast={showToast} />
        )}
      </div>
    </div>
  );
}
