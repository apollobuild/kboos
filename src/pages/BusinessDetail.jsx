import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../services/api.js';
import { BizAvatar } from '../components/ui/BizAvatar.jsx';
import { Select } from '../components/ui/Select.jsx';
import { LeadSlideOver } from '../components/leads/LeadSlideOver.jsx';

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function truncate(str, n) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n) + '…' : str;
}

const CHANNEL_ICON = { email: '✉', wa: '💬', whatsapp: '💬', voice: '📞', call: '📞' };
const CHANNEL_COLOR = { email: 'var(--blue)', wa: 'var(--green)', whatsapp: 'var(--green)', voice: 'var(--amber)', call: 'var(--amber)' };

const STATUS_COLOR = {
  active: 'var(--green)', draft: 'var(--muted)', paused: 'var(--amber)',
  completed: 'var(--blue)', archived: 'var(--muted)',
};

// ─── Tab Bar ─────────────────────────────────────────────────────────────────

const TABS = ['Overview', 'Campaigns', 'Sequences', 'Assets', 'Contacts', 'Conversations'];

function TabBar({ active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
      {TABS.map((t, i) => (
        <button
          key={t}
          onClick={() => onChange(i)}
          style={{
            background: 'none', border: 'none', borderBottom: active === i ? '2px solid var(--blue)' : '2px solid transparent',
            color: active === i ? 'var(--text)' : 'var(--muted)',
            padding: '8px 16px', fontSize: 13, fontWeight: active === i ? 600 : 400,
            cursor: 'pointer', marginBottom: -1, transition: 'all 0.15s',
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: `var(--${color || 'text'})` }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ─── Tab 1: Overview ─────────────────────────────────────────────────────────

function OverviewTab({ biz, bizCampaigns, bizLeads, bizReplies }) {
  const { showToast } = useAppStore(useShallow(s => ({ showToast: s.showToast })));

  const activeCampaignsCount = bizCampaigns.filter(c => c.status === 'active').length;
  const hotLeadsCount = bizLeads.filter(l => l.status === 'hot' || l.score >= 8).length;
  const meetingsCount = bizLeads.filter(l => l.status === 'meeting_booked').length;

  const [editForm, setEditForm] = useState({
    name: biz.name || '', industry: biz.industry || '',
    contact: biz.contact || '', email: biz.email || '', phone: biz.phone || '',
  });
  const [savingBiz, setSavingBiz] = useState(false);

  const [brief, setBrief] = useState({
    offer: '', audience: '', usp: '', style: '', language: 'EN',
    doNotSay: '', proof: '', goals: '',
  });
  const [briefLoading, setBriefLoading] = useState(true);
  const [savingBrief, setSavingBrief] = useState(false);

  const [onboardUrl, setOnboardUrl] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);

  useEffect(() => {
    apiFetch('/sequences/' + biz.id)
      .then(data => {
        if (data?.brief) setBrief(b => ({ ...b, ...data.brief }));
      })
      .catch(() => {})
      .finally(() => setBriefLoading(false));
  }, [biz.id]);

  async function handleSaveBiz() {
    setSavingBiz(true);
    try {
      await apiFetch('/businesses/' + biz.id, { method: 'PATCH', body: editForm });
      showToast('Business updated', 'green');
    } catch {
      showToast('Failed to update business', 'red');
    } finally {
      setSavingBiz(false);
    }
  }

  async function handleSaveBrief() {
    setSavingBrief(true);
    try {
      await apiFetch('/sequences/' + biz.id + '/brief', { method: 'PATCH', body: { brief } });
      showToast('Brief saved', 'green');
    } catch {
      showToast('Failed to save brief', 'red');
    } finally {
      setSavingBrief(false);
    }
  }

  async function handleGenerateLink() {
    setGeneratingLink(true);
    try {
      const res = await apiFetch('/onboard/generate-token', { method: 'POST', body: { bizId: biz.id } });
      setOnboardUrl(res?.url || res?.token || '');
    } catch {
      showToast('Failed to generate link', 'red');
    } finally {
      setGeneratingLink(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(onboardUrl);
    showToast('Link copied', 'green');
  }

  return (
    <div>
      {/* KPIs */}
      <div className="grid-2 fade-up" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <KpiCard label="Active Campaigns" value={activeCampaignsCount} color="blue" />
        <KpiCard label="Total Leads" value={bizLeads.length} />
        <KpiCard label="Hot Leads" value={hotLeadsCount} color="amber" />
        <KpiCard label="Meetings Booked" value={meetingsCount} color="green" />
      </div>

      {/* Edit Business */}
      <div className="card fade-up-1 mb-4">
        <div className="card-title" style={{ marginBottom: 14 }}>Edit Business</div>
        <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Business Name</div>
            <input className="input" style={{ width: '100%' }} value={editForm.name}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Industry</div>
            <input className="input" style={{ width: '100%' }} value={editForm.industry}
              onChange={e => setEditForm(f => ({ ...f, industry: e.target.value }))} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Contact Person</div>
            <input className="input" style={{ width: '100%' }} value={editForm.contact}
              onChange={e => setEditForm(f => ({ ...f, contact: e.target.value }))} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Email</div>
            <input className="input" style={{ width: '100%' }} value={editForm.email}
              onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Phone</div>
            <input className="input" style={{ width: '100%' }} value={editForm.phone}
              onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
        </div>
        <button className="btn btn-blue btn-sm" onClick={handleSaveBiz} disabled={savingBiz}>
          {savingBiz ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Brief */}
      <div className="card fade-up-1 mb-4">
        <div className="card-title" style={{ marginBottom: 14 }}>Outreach Brief</div>
        {briefLoading ? (
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading brief…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { key: 'offer', label: 'Service / Offer', type: 'textarea', placeholder: 'What does this business sell or offer?' },
              { key: 'audience', label: 'Target Audience', type: 'textarea', placeholder: 'Who are the ideal customers?' },
              { key: 'usp', label: 'Unique Selling Points', type: 'textarea', placeholder: 'What makes this business stand out?' },
              { key: 'style', label: 'Communication Style', type: 'input', placeholder: 'e.g. Professional, Friendly, Direct…' },
              { key: 'doNotSay', label: 'Do NOT Say', type: 'textarea', placeholder: 'Words, phrases, or topics to avoid…' },
              { key: 'proof', label: 'Proof / Results', type: 'textarea', placeholder: 'Case studies, testimonials, numbers…' },
              { key: 'goals', label: 'Goals', type: 'textarea', placeholder: 'What should the outreach achieve?' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
                {type === 'textarea' ? (
                  <textarea className="input" rows={2} style={{ width: '100%', resize: 'vertical' }}
                    placeholder={placeholder} value={brief[key] || ''}
                    onChange={e => setBrief(b => ({ ...b, [key]: e.target.value }))} />
                ) : (
                  <input className="input" style={{ width: '100%' }}
                    placeholder={placeholder} value={brief[key] || ''}
                    onChange={e => setBrief(b => ({ ...b, [key]: e.target.value }))} />
                )}
              </div>
            ))}
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Language</div>
              <Select value={brief.language} onChange={v => setBrief(b => ({ ...b, language: v }))}
                options={['EN', 'MS', 'ZH', 'MIXED'].map(v => ({ value: v, label: v }))} />
            </div>
            <div>
              <button className="btn btn-blue btn-sm" onClick={handleSaveBrief} disabled={savingBrief}>
                {savingBrief ? 'Saving…' : 'Save Brief'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Onboard Link */}
      <div className="card fade-up-2">
        <div className="card-title" style={{ marginBottom: 10 }}>Client Onboard Link</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
          Generate a secure link to send to the client for self-onboarding.
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleGenerateLink} disabled={generatingLink}>
          {generatingLink ? 'Generating…' : '🔗 Generate Client Link'}
        </button>
        {onboardUrl && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input className="input mono" style={{ flex: 1, fontSize: 11 }} readOnly value={onboardUrl} />
            <button className="btn btn-sm btn-ghost" onClick={copyLink}>Copy</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab 2: Campaigns ─────────────────────────────────────────────────────────

function CampaignsTab({ bizCampaigns }) {
  const { setPage, openCampaignPipeline } = useAppStore(useShallow(s => ({
    setPage: s.setPage,
    openCampaignPipeline: s.openCampaignPipeline,
  })));

  return (
    <div className="fade-up">
      <div className="flex items-center justify-between mb-4">
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{bizCampaigns.length} campaign{bizCampaigns.length !== 1 ? 's' : ''}</div>
        <button className="btn btn-green btn-sm" onClick={() => setPage('new-campaign')}>＋ New Campaign</button>
      </div>

      {bizCampaigns.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 13 }}>No campaigns yet</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Status', 'Leads', 'Hot', 'Open Rate', 'Spend', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bizCampaigns.map(c => {
                const total = c.leads || 0;
                const done = c.contacted || 0;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <tr key={c.id}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--s2)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                    onClick={() => { setPage('campaign-dashboard', { campaignId: c.id }); }}
                  >
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{c.name}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="badge" style={{ color: STATUS_COLOR[c.status] || 'var(--muted)', background: 'transparent', border: `1px solid ${STATUS_COLOR[c.status] || 'var(--border)'}`, fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>
                        {c.status || 'draft'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', minWidth: 100 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 4, background: 'var(--s2)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: pct + '%', height: '100%', background: 'var(--blue)', borderRadius: 2 }} />
                        </div>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{done}/{total}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="mono" style={{ color: 'var(--amber)' }}>{c.hot ?? '—'}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="mono">{c.openRate != null ? c.openRate + '%' : '—'}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="mono">{c.spend != null ? 'RM ' + c.spend : '—'}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button className="btn btn-ghost btn-sm"
                        onClick={e => { e.stopPropagation(); openCampaignPipeline(c.id); }}>
                        Launch Pipeline
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Sequences ─────────────────────────────────────────────────────────

function SequencesTab({ bizId }) {
  const { showToast } = useAppStore(useShallow(s => ({ showToast: s.showToast })));
  const [seq, setSeq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editingTp, setEditingTp] = useState(null);
  const [regenId, setRegenId] = useState(null);
  const [editDraft, setEditDraft] = useState({ subject: '', body: '' });

  useEffect(() => {
    apiFetch('/sequences/' + bizId)
      .then(data => setSeq(data || { status: 'empty', touchpoints: [], brief: {} }))
      .catch(() => setSeq({ status: 'empty', touchpoints: [], brief: {} }))
      .finally(() => setLoading(false));
  }, [bizId]);

  async function generate() {
    setGenerating(true);
    try {
      const data = await apiFetch('/sequences/' + bizId + '/generate', { method: 'POST', body: { brief: seq?.brief } });
      setSeq(data);
      showToast('Sequence generated', 'green');
    } catch {
      showToast('Generation failed', 'red');
    } finally {
      setGenerating(false);
    }
  }

  async function approve() {
    setApproving(true);
    try {
      const data = await apiFetch('/sequences/' + bizId + '/approve', { method: 'POST' });
      setSeq(data);
      showToast('Sequence activated', 'green');
    } catch {
      showToast('Failed to activate', 'red');
    } finally {
      setApproving(false);
    }
  }

  async function reset() {
    try {
      const data = await apiFetch('/sequences/' + bizId + '/reset', { method: 'POST' });
      setSeq(data);
      showToast('Reset to draft', 'amber');
    } catch {
      showToast('Reset failed', 'red');
    }
  }

  async function regenTp(tpId) {
    setRegenId(tpId);
    try {
      const data = await apiFetch('/sequences/' + bizId + '/regenerate/' + tpId, { method: 'POST' });
      setSeq(data);
      showToast('Touchpoint regenerated', 'green');
    } catch {
      showToast('Regen failed', 'red');
    } finally {
      setRegenId(null);
    }
  }

  function openEdit(tp) {
    setEditingTp(tp.id);
    setEditDraft({ subject: tp.subject || '', body: tp.body || '' });
  }

  function saveEdit(tpId) {
    setSeq(s => ({
      ...s,
      touchpoints: s.touchpoints.map(t => t.id === tpId ? { ...t, ...editDraft } : t),
    }));
    setEditingTp(null);
    showToast('Touchpoint updated', 'green');
  }

  const statusColor = { empty: 'var(--muted)', draft: 'var(--amber)', review: 'var(--blue)', active: 'var(--green)' };

  if (loading) return <div className="card" style={{ color: 'var(--muted)', padding: 32 }}>Loading sequence…</div>;

  return (
    <div className="fade-up">
      {/* Header controls */}
      <div className="flex items-center justify-between mb-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Sequence</span>
          <span className="badge" style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, color: statusColor[seq?.status], border: `1px solid ${statusColor[seq?.status]}`, background: 'transparent' }}>
            {seq?.status || 'empty'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-blue btn-sm" onClick={generate} disabled={generating}>
            {generating ? 'Generating…' : '⚡ Generate Sequence'}
          </button>
          {seq?.status === 'review' && (
            <button className="btn btn-green btn-sm" onClick={approve} disabled={approving}>
              {approving ? 'Activating…' : '✓ Approve & Activate'}
            </button>
          )}
          {seq?.status === 'active' && (
            <button className="btn btn-ghost btn-sm" onClick={reset}>Reset to Draft</button>
          )}
        </div>
      </div>

      {/* Touchpoints */}
      {!seq?.touchpoints?.length ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>✉</div>
          <div style={{ fontSize: 13 }}>No touchpoints yet — generate a sequence to get started.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {seq.touchpoints.map(tp => {
            const chColor = CHANNEL_COLOR[tp.channel] || 'var(--muted)';
            const chIcon = CHANNEL_ICON[tp.channel] || '•';
            const isExpanded = expandedId === tp.id;
            const isEditing = editingTp === tp.id;

            return (
              <div key={tp.id} className="card" style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : tp.id)}>
                  <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--s2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 16 }}>{chIcon}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="badge mono" style={{ fontSize: 10, padding: '1px 6px', background: 'var(--s2)', color: 'var(--muted)', borderRadius: 3 }}>
                        Day {tp.day}
                      </span>
                      <span style={{ fontSize: 11, color: chColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tp.channel}</span>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{tp.label}</span>
                    </div>
                    {tp.subject && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{truncate(tp.subject, 80)}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                      onClick={e => { e.stopPropagation(); openEdit(tp); }}>✎ Edit</button>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                      disabled={regenId === tp.id}
                      onClick={e => { e.stopPropagation(); regenTp(tp.id); }}>
                      {regenId === tp.id ? '…' : '↺ Regen'}
                    </button>
                    <span style={{ color: 'var(--muted)', fontSize: 12, padding: '0 4px' }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isExpanded && !isEditing && (
                  <div style={{ marginTop: 12, padding: '12px', background: 'var(--s2)', borderRadius: 6, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {tp.body || <span style={{ color: 'var(--muted)' }}>No body content.</span>}
                  </div>
                )}

                {isEditing && (
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Subject</div>
                      <input className="input" style={{ width: '100%' }} value={editDraft.subject}
                        onChange={e => setEditDraft(d => ({ ...d, subject: e.target.value }))} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Body</div>
                      <textarea className="input" rows={6} style={{ width: '100%', resize: 'vertical' }} value={editDraft.body}
                        onChange={e => setEditDraft(d => ({ ...d, body: e.target.value }))} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-blue btn-sm" onClick={() => saveEdit(tp.id)}>Save</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingTp(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Tab 4: Assets ────────────────────────────────────────────────────────────

function AssetsTab({ bizId }) {
  const { showToast } = useAppStore(useShallow(s => ({ showToast: s.showToast })));

  const storageKey = `kboos_assets_${bizId}`;

  function loadAssets() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { brandVoice: '', offers: '', scripts: '', objections: [] };
  }

  const [assets, setAssetsState] = useState(loadAssets);

  const saveTimeout = useRef(null);
  function setAssets(updater) {
    setAssetsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        localStorage.setItem(storageKey, JSON.stringify(next));
      }, 600);
      return next;
    });
  }

  function addObjection() {
    setAssets(a => ({ ...a, objections: [...(a.objections || []), { trigger: '', response: '' }] }));
  }

  function removeObjection(i) {
    setAssets(a => ({ ...a, objections: a.objections.filter((_, idx) => idx !== i) }));
  }

  function updateObjection(i, key, val) {
    setAssets(a => ({
      ...a,
      objections: a.objections.map((o, idx) => idx === i ? { ...o, [key]: val } : o),
    }));
  }

  function saveNow() {
    localStorage.setItem(storageKey, JSON.stringify(assets));
    showToast('Assets saved', 'green');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="fade-up">
      {/* Brand Voice */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 10 }}>Brand Voice</div>
        <textarea className="input" rows={4} style={{ width: '100%', resize: 'vertical' }}
          placeholder="How should AI write for this client? Describe tone, style, vocabulary…"
          value={assets.brandVoice}
          onChange={e => setAssets(a => ({ ...a, brandVoice: e.target.value }))}
          onBlur={saveNow} />
      </div>

      {/* Offers */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 10 }}>Offers</div>
        <textarea className="input" rows={4} style={{ width: '100%', resize: 'vertical' }}
          placeholder="List current offers, pricing, packages…"
          value={assets.offers}
          onChange={e => setAssets(a => ({ ...a, offers: e.target.value }))}
          onBlur={saveNow} />
      </div>

      {/* Objection Handlers */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="card-title">Objection Handlers</div>
          <button className="btn btn-ghost btn-sm" onClick={addObjection}>＋ Add</button>
        </div>
        {(!assets.objections || assets.objections.length === 0) ? (
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>No objection handlers yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {assets.objections.map((o, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Trigger / Objection</div>
                  <input className="input" style={{ width: '100%' }} placeholder="e.g. Too expensive"
                    value={o.trigger} onChange={e => updateObjection(i, 'trigger', e.target.value)} onBlur={saveNow} />
                </div>
                <div style={{ flex: 2 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Response</div>
                  <input className="input" style={{ width: '100%' }} placeholder="How to handle this…"
                    value={o.response} onChange={e => updateObjection(i, 'response', e.target.value)} onBlur={saveNow} />
                </div>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 20, color: 'var(--red)' }}
                  onClick={() => removeObjection(i)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sales Scripts */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 10 }}>Sales Scripts</div>
        <textarea className="input" rows={5} style={{ width: '100%', resize: 'vertical' }}
          placeholder="Call scripts, follow-up scripts…"
          value={assets.scripts}
          onChange={e => setAssets(a => ({ ...a, scripts: e.target.value }))}
          onBlur={saveNow} />
        <button className="btn btn-blue btn-sm" style={{ marginTop: 10 }} onClick={saveNow}>Save All Assets</button>
      </div>
    </div>
  );
}

// ─── Tab 5: Contacts ──────────────────────────────────────────────────────────

const CONTACT_FILTERS = [
  { label: 'All', match: () => true },
  { label: 'New', match: l => ['personalizing', 'new', null, undefined].includes(l.status) },
  { label: 'Contacted', match: l => ['contacted', 'cold'].includes(l.status) },
  { label: 'Replied', match: l => ['engaged', 'replied'].includes(l.status) },
  { label: 'Qualified', match: l => ['qualifying', 'committed', 'hot'].includes(l.status) },
  { label: 'Customer', match: l => ['meeting_booked', 'closed', 'customer'].includes(l.status) },
];

function ScoreBar({ score }) {
  const pct = Math.max(0, Math.min(10, score || 0)) * 10;
  const color = score >= 8 ? 'var(--green)' : score >= 5 ? 'var(--blue)' : score >= 3 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 48, height: 4, background: 'var(--s2)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span className="mono" style={{ fontSize: 11, color }}>{score ?? '—'}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    hot: { label: 'Hot', color: 'var(--amber)' },
    new: { label: 'New', color: 'var(--blue)' },
    contacted: { label: 'Contacted', color: 'var(--muted)' },
    cold: { label: 'Cold', color: 'var(--muted)' },
    engaged: { label: 'Engaged', color: 'var(--blue)' },
    replied: { label: 'Replied', color: 'var(--blue)' },
    qualifying: { label: 'Qualifying', color: 'var(--green)' },
    committed: { label: 'Committed', color: 'var(--green)' },
    meeting_booked: { label: 'Meeting', color: 'var(--green)' },
    closed: { label: 'Closed', color: 'var(--green)' },
    customer: { label: 'Customer', color: 'var(--green)' },
    personalizing: { label: 'Personalizing', color: 'var(--muted)' },
  };
  const s = map[status] || { label: status || 'Unknown', color: 'var(--muted)' };
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', border: `1px solid ${s.color}`, color: s.color, borderRadius: 4 }}>
      {s.label}
    </span>
  );
}

function ContactsTab({ bizLeads }) {
  const [filter, setFilter] = useState(0);
  const [selectedLead, setSelectedLead] = useState(null);

  const filtered = bizLeads.filter(CONTACT_FILTERS[filter].match);

  return (
    <div className="fade-up">
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
        {CONTACT_FILTERS.map((f, i) => {
          const count = bizLeads.filter(f.match).length;
          return (
            <button key={f.label}
              onClick={() => setFilter(i)}
              style={{
                background: 'none', border: 'none',
                borderBottom: filter === i ? '2px solid var(--blue)' : '2px solid transparent',
                color: filter === i ? 'var(--text)' : 'var(--muted)',
                padding: '6px 14px', fontSize: 12, fontWeight: filter === i ? 600 : 400,
                cursor: 'pointer', marginBottom: -1,
              }}>
              {f.label} <span className="mono" style={{ fontSize: 10, opacity: 0.7 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>👥</div>
          <div style={{ fontSize: 13 }}>No contacts in this filter</div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Company', 'Title', 'Score', 'Status', 'Channels', 'Last Contact'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--s2)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                  onClick={() => setSelectedLead(l)}>
                  <td style={{ padding: '10px 14px', fontWeight: 500 }}>{l.name || '—'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>{l.company || '—'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--muted)', fontSize: 12 }}>{l.title || '—'}</td>
                  <td style={{ padding: '10px 14px' }}><ScoreBar score={l.score} /></td>
                  <td style={{ padding: '10px 14px' }}><StatusBadge status={l.status} /></td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {(l.channels || []).map(ch => (
                        <span key={ch} style={{ fontSize: 13, color: CHANNEL_COLOR[ch] || 'var(--muted)' }}>{CHANNEL_ICON[ch] || ch}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--muted)', fontSize: 12 }}>{timeAgo(l.lastContact)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedLead && (
        <LeadSlideOver lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
}

// ─── Tab 6: Conversations ─────────────────────────────────────────────────────

const REPLY_STATUS_STYLE = {
  unread: { label: 'Unread', color: 'var(--blue)', pulse: true },
  read: { label: 'Read', color: 'var(--muted)', pulse: false },
  handled: { label: 'Handled', color: 'var(--green)', pulse: false },
  hot: { label: 'Hot', color: 'var(--amber)', pulse: false },
};

function ConversationsTab({ bizReplies, bizLeads }) {
  const { showToast } = useAppStore(useShallow(s => ({ showToast: s.showToast })));
  const [selected, setSelected] = useState(null);
  const [suggesting, setSuggesting] = useState(false);
  const [draft, setDraft] = useState('');

  const sorted = [...bizReplies].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const leadMap = Object.fromEntries(bizLeads.map(l => [l.id, l]));

  function markAllRead() {
    showToast('Marked all as read', 'green');
  }

  async function suggestReply(r) {
    setSuggesting(true);
    try {
      const lead = leadMap[r.leadId] || {};
      const res = await apiFetch('/ai/suggest-reply', {
        method: 'POST',
        body: {
          message: r.msg || r.message,
          senderName: lead.name || r.name,
          company: lead.company || r.company,
          channel: r.channel,
        },
      });
      setDraft(res?.reply || res?.text || '');
    } catch {
      showToast('Failed to generate suggestion', 'red');
    } finally {
      setSuggesting(false);
    }
  }

  async function markHandled(r) {
    try {
      await apiFetch('/replies/' + r.id, { method: 'PATCH', body: { status: 'handled' } });
      showToast('Marked as handled', 'green');
      setSelected(null);
    } catch {
      showToast('Failed to update', 'red');
    }
  }

  return (
    <div className="fade-up" style={{ display: 'flex', gap: 16, minHeight: 400 }}>
      {/* List */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center justify-between mb-3">
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{sorted.length} conversation{sorted.length !== 1 ? 's' : ''}</div>
          <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>
        </div>

        {sorted.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>💬</div>
            <div style={{ fontSize: 13 }}>No conversations yet</div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Lead', 'Company', 'Ch', 'Message', 'Status', 'Time'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => {
                  const lead = leadMap[r.leadId] || {};
                  const name = lead.name || r.name || '—';
                  const company = lead.company || r.company || '—';
                  const status = r.status || 'read';
                  const style = REPLY_STATUS_STYLE[status] || REPLY_STATUS_STYLE.read;
                  const isSelected = selected?.id === r.id;

                  return (
                    <tr key={r.id}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.12s', background: isSelected ? 'var(--s2)' : '' }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--s2)'; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = ''; }}
                      onClick={() => { setSelected(r); setDraft(''); }}>
                      <td style={{ padding: '10px 14px', fontWeight: status === 'unread' ? 600 : 400 }}>{name}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--muted)', fontSize: 12 }}>{company}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ color: CHANNEL_COLOR[r.channel] || 'var(--muted)' }}>{CHANNEL_ICON[r.channel] || '•'}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--muted)', fontSize: 12 }}>{truncate(r.msg || r.message || '', 80)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 4,
                          border: `1px solid ${style.color}`, color: style.color,
                        }}>{style.label}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--muted)', fontSize: 12, whiteSpace: 'nowrap' }}>{timeAgo(r.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reply panel */}
      {selected && (
        <div className="card" style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, height: 'fit-content', position: 'sticky', top: 16 }}>
          <div style={{ display: 'flex', items: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                {leadMap[selected.leadId]?.name || selected.name || '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {leadMap[selected.leadId]?.company || selected.company || '—'}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 18, padding: '2px 8px' }} onClick={() => setSelected(null)}>✕</button>
          </div>

          <div style={{ background: 'var(--s2)', borderRadius: 6, padding: '10px 12px', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
            {selected.msg || selected.message || '(no message)'}
          </div>

          <button className="btn btn-ghost btn-sm" onClick={() => suggestReply(selected)} disabled={suggesting}>
            {suggesting ? 'Generating…' : '✨ Suggest Reply'}
          </button>

          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Draft Reply</div>
            <textarea className="input" rows={4} style={{ width: '100%', resize: 'vertical' }}
              placeholder="Write your reply…" value={draft} onChange={e => setDraft(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-blue btn-sm" style={{ flex: 1 }}
              onClick={() => { showToast('Reply sent ✓', 'green'); setSelected(null); }}>
              Send
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => markHandled(selected)}>
              Mark Handled
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function BusinessDetail({ bizId }) {
  const { businesses, campaigns, leads, replies, setPage } = useAppStore(useShallow(s => ({
    businesses: s.businesses,
    campaigns: s.campaigns,
    leads: s.leads,
    replies: s.replies,
    setPage: s.setPage,
  })));

  const [tab, setTab] = useState(0);

  const biz = businesses.find(b => b.id === bizId);
  const bizCampaigns = campaigns.filter(c => c.bizId === bizId);
  const bizLeads = leads.filter(l => bizCampaigns.some(c => c.id === l.campaignId));
  const bizLeadIds = bizLeads.map(l => l.id);
  const bizReplies = replies.filter(r => bizLeadIds.includes(r.leadId));

  if (!bizId || !biz) {
    return (
      <div className="page">
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>◈</div>
          <div style={{ fontSize: 14, marginBottom: 16 }}>Business not found</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage('businesses')}>← All Businesses</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="fade-up" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, padding: '2px 8px' }}
            onClick={() => setPage('businesses')}>
            ← All Businesses
          </button>
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>/</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{biz.name}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <BizAvatar id={biz.id} name={biz.name} color={biz.color} size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 className="page-title" style={{ margin: 0 }}>{biz.name}</h1>
              {biz.industry && (
                <span className="badge" style={{
                  fontSize: 11, padding: '2px 10px', borderRadius: 4,
                  background: 'var(--s2)', color: 'var(--muted)', border: '1px solid var(--border)',
                }}>
                  {biz.industry}
                </span>
              )}
              {biz.color && (
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: `var(--${biz.color}, var(--blue))`, display: 'inline-block',
                }} />
              )}
            </div>
            {biz.contact && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                👤 {biz.contact}{biz.email ? ` · ${biz.email}` : ''}{biz.phone ? ` · ${biz.phone}` : ''}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <TabBar active={tab} onChange={setTab} />

      {/* Tab content */}
      {tab === 0 && (
        <OverviewTab
          biz={biz}
          bizCampaigns={bizCampaigns}
          bizLeads={bizLeads}
          bizReplies={bizReplies}
        />
      )}
      {tab === 1 && <CampaignsTab bizCampaigns={bizCampaigns} />}
      {tab === 2 && <SequencesTab bizId={bizId} />}
      {tab === 3 && <AssetsTab bizId={bizId} />}
      {tab === 4 && <ContactsTab bizLeads={bizLeads} />}
      {tab === 5 && <ConversationsTab bizReplies={bizReplies} bizLeads={bizLeads} />}
    </div>
  );
}
