import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../services/api.js';
import { Select } from '../components/ui/Select.jsx';

// ─── constants ────────────────────────────────────────────────────────────────

const CHANNEL_COLORS = { email: 'blue', whatsapp: 'green', voice: 'amber' };
const CHANNEL_ICONS  = { email: '✉', whatsapp: '💬', voice: '📞' };
const STATUS_COLORS  = { draft: 'muted', review: 'amber', active: 'green', empty: 'muted' };

const BRIEF_FIELDS = [
  { key: 'service',           label: 'Offer / Service',         type: 'textarea', rows: 2 },
  { key: 'dreamOutcome',      label: 'Dream Outcome',           type: 'textarea', rows: 2 },
  { key: 'bestCustomer',      label: 'Best Customer Profile',   type: 'textarea', rows: 2 },
  { key: 'industry',          label: 'Target Industry',         type: 'input' },
  { key: 'companySize',       label: 'Company Size',            type: 'input' },
  { key: 'geography',         label: 'Geography Focus',         type: 'input' },
  { key: 'proof',             label: 'Proof / Results',         type: 'textarea', rows: 2 },
  { key: 'timeToResult',      label: 'Time to First Result',    type: 'input' },
  { key: 'effortRemoved',     label: 'Effort We Remove',        type: 'input' },
  { key: 'riskReversal',      label: 'Guarantee / Risk Reversal', type: 'input' },
  { key: 'goals',             label: 'Campaign Goals',          type: 'textarea', rows: 2 },
  { key: 'style',             label: 'Communication Style',     type: 'input' },
  { key: 'lang',              label: 'Language',                type: 'select', opts: ['EN','MS','ZH','MIXED'] },
  { key: 'doNot',             label: 'Do NOT Say / Do',         type: 'textarea', rows: 2 },
  { key: 'additionalNotes',   label: 'Additional Notes',        type: 'textarea', rows: 2 },
];

// ─── main component ───────────────────────────────────────────────────────────

export function PromptStudio() {
  const { showToast, businesses } = useAppStore(useShallow(s => ({
    showToast: s.showToast,
    businesses: s.businesses,
  })));

  const [selectedBizId, setSelectedBizId] = useState(null);
  const [subTab, setSubTab] = useState('sequence'); // sequence | brief | objections | link
  const [seq, setSeq] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [linkData, setLinkData] = useState(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [briefEdit, setBriefEdit] = useState({});
  const [briefDirty, setBriefDirty] = useState(false);
  const [savingBrief, setSavingBrief] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editingTp, setEditingTp] = useState(null);
  const [regenId, setRegenId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const biz = businesses.find(b => b.id === selectedBizId);

  // Auto-select first business
  useEffect(() => {
    if (businesses.length && !selectedBizId) setSelectedBizId(businesses[0].id);
  }, [businesses]);

  // Load sequence when biz changes
  useEffect(() => {
    if (!selectedBizId) return;
    setSeq(null);
    setLoading(true);
    setBriefDirty(false);
    apiFetch(`/sequences/${selectedBizId}`)
      .then(d => {
        setSeq(d);
        setBriefEdit(d.brief || {});
      })
      .catch(() => {
        setSeq({ bizId: selectedBizId, status: 'empty', brief: {}, touchpoints: [], objections: [] });
      })
      .finally(() => setLoading(false));

    // Load existing link
    apiFetch(`/onboard/link/${selectedBizId}`)
      .then(d => setLinkData(d.url ? d : null))
      .catch(() => setLinkData(null));
  }, [selectedBizId]);

  async function generateSequence() {
    if (!selectedBizId) return;
    setGenerating(true);
    try {
      const d = await apiFetch(`/sequences/${selectedBizId}/generate`, {
        method: 'POST',
        body: { brief: briefEdit, persona: seq?.persona || {} },
      });
      setSeq(d);
      showToast('Sequence generated — review each touchpoint', 'green');
    } catch (e) {
      showToast('Generation failed: ' + e.message, 'red');
    } finally {
      setGenerating(false);
    }
  }

  async function approveSequence() {
    setApproving(true);
    try {
      const d = await apiFetch(`/sequences/${selectedBizId}/approve`, { method: 'POST' });
      setSeq(d);
      showToast('Sequence activated ✓', 'green');
    } catch (e) {
      showToast(e.message, 'red');
    } finally {
      setApproving(false);
    }
  }

  async function resetSequence() {
    try {
      const d = await apiFetch(`/sequences/${selectedBizId}/reset`, { method: 'POST' });
      setSeq(d);
      showToast('Sequence reset to draft', 'amber');
    } catch (e) {
      showToast(e.message, 'red');
    }
  }

  async function deleteSequence() {
    setDeleting(true);
    try {
      await apiFetch(`/sequences/${selectedBizId}`, { method: 'DELETE' });
      setSeq({ bizId: selectedBizId, status: 'empty', brief: {}, touchpoints: [], objections: [] });
      setBriefEdit({});
      setConfirmDelete(false);
      showToast('Sequence deleted', 'red');
    } catch (e) {
      showToast(e.message, 'red');
    } finally {
      setDeleting(false);
    }
  }

  async function regenTouchpoint(tp) {
    setRegenId(tp.id);
    try {
      const d = await apiFetch(`/sequences/${selectedBizId}/regenerate/${tp.id}`, { method: 'POST' });
      setSeq(d.sequence);
      showToast('Touchpoint rewritten ↺', 'blue');
    } catch (e) {
      showToast('Regen failed: ' + e.message, 'red');
    } finally {
      setRegenId(null);
    }
  }

  async function saveTouchpoint(tp) {
    try {
      const d = await apiFetch(`/sequences/${selectedBizId}/touchpoint/${tp.id}`, {
        method: 'PATCH',
        body: tp,
      });
      setSeq(d);
      setEditingTp(null);
      showToast('Saved ✓', 'green');
    } catch (e) {
      showToast(e.message, 'red');
    }
  }

  async function saveBrief() {
    setSavingBrief(true);
    try {
      const d = await apiFetch(`/sequences/${selectedBizId}/brief`, {
        method: 'PATCH',
        body: { brief: briefEdit },
      });
      setSeq(d);
      setBriefDirty(false);
      showToast('Brief saved ✓', 'green');
    } catch (e) {
      showToast(e.message, 'red');
    } finally {
      setSavingBrief(false);
    }
  }

  async function saveInternalBrief() {
    setSavingBrief(true);
    try {
      await apiFetch(`/onboard/internal/${selectedBizId}`, {
        method: 'POST',
        body: { ...briefEdit, bizName: biz?.name },
      });
      const d = await apiFetch(`/sequences/${selectedBizId}`);
      setSeq(d);
      setBriefDirty(false);
      showToast('Brief saved and ready for generation', 'green');
    } catch (e) {
      showToast(e.message, 'red');
    } finally {
      setSavingBrief(false);
    }
  }

  async function generateLink() {
    setGeneratingLink(true);
    try {
      const d = await apiFetch('/onboard/generate-token', { method: 'POST', body: { bizId: selectedBizId } });
      setLinkData(d);
      showToast('Link created — copy and send to client', 'green');
    } catch (e) {
      showToast(e.message, 'red');
    } finally {
      setGeneratingLink(false);
    }
  }

  async function saveObjections(objections) {
    try {
      const d = await apiFetch(`/sequences/${selectedBizId}/objections`, {
        method: 'PATCH',
        body: { objections },
      });
      setSeq(d);
      showToast('Objections saved ✓', 'green');
    } catch (e) {
      showToast(e.message, 'red');
    }
  }

  const touchpoints = Array.isArray(seq?.touchpoints) ? seq.touchpoints : [];
  const objections  = Array.isArray(seq?.objections)  ? seq.objections  : [];
  const status      = seq?.status || 'empty';

  if (!businesses.length) return (
    <div style={{ padding: 32, color: 'var(--muted)', fontSize: 13 }}>
      No businesses found. Add a business first.
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Business tabs */}
      <div style={{
        display: 'flex', gap: 6, padding: '12px 20px 0', overflowX: 'auto',
        borderBottom: '1px solid var(--border)', background: 'var(--s1)', flexShrink: 0,
        scrollbarWidth: 'none',
      }}>
        {businesses.map(b => {
          const active = b.id === selectedBizId;
          return (
            <button key={b.id} onClick={() => setSelectedBizId(b.id)} style={{
              padding: '7px 16px', borderRadius: '8px 8px 0 0', fontSize: 12, fontWeight: active ? 600 : 400,
              background: active ? 'var(--bg)' : 'transparent',
              border: `1px solid ${active ? 'var(--border)' : 'transparent'}`,
              borderBottom: active ? '1px solid var(--bg)' : '1px solid transparent',
              color: active ? 'var(--text)' : 'var(--muted)',
              cursor: 'pointer', flexShrink: 0, position: 'relative', top: 1,
              transition: 'all 0.15s',
            }}>
              <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: `var(--${b.color || 'blue'})`, marginRight: 7, verticalAlign: 'middle' }} />
              {b.name}
            </button>
          );
        })}
      </div>

      {/* Workspace */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Main area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          {/* Sub-tab bar */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
            {[
              { id: 'sequence',   label: 'Sequence' },
              { id: 'brief',      label: 'Brief' },
              { id: 'objections', label: 'Objections' },
              { id: 'link',       label: 'Onboard Link' },
            ].map(t => (
              <button key={t.id} onClick={() => setSubTab(t.id)} style={{
                padding: '7px 14px', fontSize: 12, fontWeight: subTab === t.id ? 600 : 400,
                borderRadius: '6px 6px 0 0', cursor: 'pointer', border: 'none',
                background: subTab === t.id ? 'var(--s2)' : 'transparent',
                color: subTab === t.id ? 'var(--text)' : 'var(--muted)',
                borderBottom: subTab === t.id ? '2px solid var(--blue)' : '2px solid transparent',
                transition: 'all 0.15s',
              }}>
                {t.label}
                {t.id === 'sequence' && touchpoints.length > 0 && (
                  <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 10, background: 'var(--s2)', color: 'var(--muted)' }}>
                    {touchpoints.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ display: 'flex', gap: 10, flexDirection: 'column', padding: 20 }}>
              {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 80, borderRadius: 8 }} />)}
            </div>
          ) : (
            <>
              {subTab === 'sequence' && (
                <SequenceTab
                  touchpoints={touchpoints}
                  status={status}
                  expandedId={expandedId}
                  setExpandedId={setExpandedId}
                  editingTp={editingTp}
                  setEditingTp={setEditingTp}
                  regenId={regenId}
                  onRegen={regenTouchpoint}
                  onSave={saveTouchpoint}
                  bizName={biz?.name}
                />
              )}

              {subTab === 'brief' && (
                <BriefTab
                  briefEdit={briefEdit}
                  setBriefEdit={(k, v) => { setBriefEdit(f => ({ ...f, [k]: v })); setBriefDirty(true); }}
                  briefDirty={briefDirty}
                  saving={savingBrief}
                  onSave={saveInternalBrief}
                  bizName={biz?.name}
                />
              )}

              {subTab === 'objections' && (
                <ObjectionsTab
                  objections={objections}
                  onSave={saveObjections}
                />
              )}

              {subTab === 'link' && (
                <LinkTab
                  bizName={biz?.name}
                  linkData={linkData}
                  generatingLink={generatingLink}
                  onGenerate={generateLink}
                  showToast={showToast}
                />
              )}
            </>
          )}
        </div>

        {/* Right panel */}
        <div style={{
          width: 240, flexShrink: 0, borderLeft: '1px solid var(--border)',
          padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16,
          background: 'var(--s1)', overflow: 'auto',
        }}>
          {/* Status badge */}
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 6 }}>STATUS</div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: `rgba(var(--${STATUS_COLORS[status]}-rgb, 120,120,120), 0.12)`,
              color: `var(--${STATUS_COLORS[status]})`,
              border: `1px solid var(--${STATUS_COLORS[status]})`,
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: `var(--${STATUS_COLORS[status]})`, display: 'inline-block' }} />
              {status === 'empty' ? 'No Brief' : status}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* Primary action */}
          {(status === 'draft' || status === 'review' || status === 'empty') && (
            <button
              onClick={generateSequence}
              disabled={generating}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: 'var(--blue)', color: '#fff', border: 'none', cursor: generating ? 'wait' : 'pointer',
                opacity: generating ? 0.7 : 1, lineHeight: 1.4,
              }}>
              {generating ? '⏳ Generating…' : touchpoints.length ? '↺ Re-generate All' : '⚡ Generate Sequence'}
            </button>
          )}

          {status === 'review' && touchpoints.length > 0 && (
            <button
              onClick={approveSequence}
              disabled={approving}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: 'var(--green)', color: '#fff', border: 'none', cursor: 'pointer',
              }}>
              {approving ? '…' : '✓ Approve & Activate'}
            </button>
          )}

          {status === 'active' && (
            <>
              <div style={{ fontSize: 11, color: 'var(--green)', textAlign: 'center', padding: '4px 0' }}>
                ✓ Sequence is live
              </div>
              <button onClick={resetSequence} style={{
                width: '100%', padding: '8px', borderRadius: 7, fontSize: 11,
                background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)',
                cursor: 'pointer',
              }}>
                Reset to Draft
              </button>
            </>
          )}

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* Brief summary */}
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 8 }}>BRIEF SUMMARY</div>
            {briefEdit.service ? (
              <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
                {briefEdit.service?.slice(0, 80)}{briefEdit.service?.length > 80 ? '…' : ''}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
                No brief yet — fill the Brief tab first
              </div>
            )}
            <button onClick={() => setSubTab('brief')} style={{
              marginTop: 8, fontSize: 11, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}>
              {briefEdit.service ? 'Edit brief →' : 'Fill brief →'}
            </button>
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* Client onboard link */}
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 8 }}>CLIENT LINK</div>
            {linkData?.url ? (
              <>
                <div style={{ fontSize: 10, color: 'var(--green)', marginBottom: 6 }}>✓ Active link</div>
                <button
                  onClick={() => { navigator.clipboard.writeText(linkData.url); showToast('Link copied!', 'green'); }}
                  style={{
                    width: '100%', padding: '7px', borderRadius: 7, fontSize: 11,
                    background: 'rgba(80,200,100,0.08)', color: 'var(--green)',
                    border: '1px solid rgba(80,200,100,0.2)', cursor: 'pointer',
                  }}>
                  Copy Link
                </button>
                <button onClick={() => setSubTab('link')} style={{
                  marginTop: 6, width: '100%', padding: '6px', borderRadius: 7, fontSize: 11,
                  background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', cursor: 'pointer',
                }}>
                  Manage →
                </button>
              </>
            ) : (
              <button onClick={() => setSubTab('link')} style={{
                width: '100%', padding: '7px', borderRadius: 7, fontSize: 11,
                background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', cursor: 'pointer',
              }}>
                Generate Link →
              </button>
            )}
          </div>

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* Sequence stats */}
          {touchpoints.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 8 }}>SEQUENCE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {['email','whatsapp','voice'].map(ch => {
                  const count = touchpoints.filter(t => t.channel === ch).length;
                  if (!count) return null;
                  return (
                    <div key={ch} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ color: 'var(--muted)' }}>{CHANNEL_ICONS[ch]} {ch}</span>
                      <span style={{ color: `var(--${CHANNEL_COLORS[ch]})`, fontWeight: 600 }}>{count}</span>
                    </div>
                  );
                })}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--muted)' }}>Total span</span>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                    {Math.max(...touchpoints.map(t => t.day || 0))} days
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Delete sequence */}
          {status !== 'empty' && (
            <>
              <div style={{ height: 1, background: 'var(--border)' }} />
              {confirmDelete ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600, textAlign: 'center' }}>Delete this sequence?</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center' }}>This cannot be undone.</div>
                  <button
                    onClick={deleteSequence}
                    disabled={deleting}
                    style={{ width: '100%', padding: '8px', borderRadius: 7, fontSize: 11, fontWeight: 700, background: 'var(--red)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    {deleting ? 'Deleting…' : 'Yes, Delete'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    style={{ width: '100%', padding: '7px', borderRadius: 7, fontSize: 11, background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{ width: '100%', padding: '7px', borderRadius: 7, fontSize: 11, background: 'transparent', color: 'var(--red)', border: '1px solid oklch(55% 0.22 25 / 0.3)', cursor: 'pointer' }}>
                  🗑 Delete Sequence
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit touchpoint modal */}
      {editingTp && (
        <EditModal
          tp={editingTp}
          onClose={() => setEditingTp(null)}
          onSave={saveTouchpoint}
        />
      )}
    </div>
  );
}

// ─── Sequence tab ─────────────────────────────────────────────────────────────

function SequenceTab({ touchpoints, status, expandedId, setExpandedId, editingTp, setEditingTp, regenId, onRegen, onSave, bizName }) {
  if (touchpoints.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>◈</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
          {status === 'empty' ? 'No brief filled yet' : 'Sequence not generated yet'}
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.7 }}>
          {status === 'empty'
            ? 'Fill the Brief tab with the client\'s offer details, then click ⚡ Generate Sequence.'
            : 'The brief is ready. Click ⚡ Generate Sequence in the right panel.'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
        {touchpoints.length}-step sequence for {bizName} · Click any step to expand
      </div>
      {touchpoints.map((tp, i) => (
        <TouchpointCard
          key={tp.id}
          tp={tp}
          index={i}
          expanded={expandedId === tp.id}
          onToggle={() => setExpandedId(expandedId === tp.id ? null : tp.id)}
          onEdit={() => setEditingTp({ ...tp })}
          onRegen={() => onRegen(tp)}
          isRegening={regenId === tp.id}
        />
      ))}
    </div>
  );
}

function TouchpointCard({ tp, index, expanded, onToggle, onEdit, onRegen, isRegening }) {
  const color = CHANNEL_COLORS[tp.channel] || 'blue';
  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
      background: 'var(--s1)', transition: 'border-color 0.15s',
    }}>
      {/* Header */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
          cursor: 'pointer', background: expanded ? 'rgba(255,255,255,0.03)' : 'transparent',
        }}>
        {/* Day badge */}
        <div style={{
          minWidth: 38, height: 38, borderRadius: 8, display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexDirection: 'column', lineHeight: 1.1,
          background: `rgba(var(--${color}-rgb, 80,120,255), 0.10)`,
          border: `1px solid var(--${color})`,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 9, color: `var(--${color})`, fontFamily: 'var(--font-mono)' }}>DAY</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: `var(--${color})` }}>{tp.day}</span>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{tp.label}</span>
            <span style={{
              fontSize: 10, padding: '1px 8px', borderRadius: 10,
              background: `rgba(var(--${color}-rgb, 80,120,255), 0.12)`,
              color: `var(--${color})`, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {CHANNEL_ICONS[tp.channel]} {tp.channel}
            </span>
          </div>
          {tp.subject && (
            <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tp.subject}
            </div>
          )}
          {!tp.subject && tp.body && (
            <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tp.body?.slice(0, 80)}…
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button onClick={onRegen} disabled={isRegening} title="Rewrite" style={iconBtn}>
            {isRegening ? '⏳' : '↺'}
          </button>
          <button onClick={onEdit} title="Edit" style={iconBtn}>✎</button>
          <span style={{ fontSize: 14, color: 'var(--muted)', padding: '0 2px', userSelect: 'none' }}>
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          {tp.subject && (
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>SUBJECT</span>
              <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 3, fontWeight: 500 }}>{tp.subject}</div>
            </div>
          )}
          <div>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
              {tp.channel === 'voice' ? 'VOICE AGENT PROMPT' : 'MESSAGE'}
            </span>
            <pre style={{
              fontSize: 12, color: 'var(--text)', marginTop: 4, whiteSpace: 'pre-wrap',
              fontFamily: tp.channel === 'voice' ? 'var(--font-mono)' : 'var(--font-ui)',
              lineHeight: 1.65, background: 'var(--s2)', borderRadius: 7, padding: '10px 12px',
            }}>
              {tp.body}
            </pre>
          </div>
          {tp.notes && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(255,200,80,0.06)', borderRadius: 7, border: '1px solid rgba(255,200,80,0.15)' }}>
              <span style={{ fontSize: 10, color: 'var(--amber)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>NOTE</span>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{tp.notes}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Brief tab ────────────────────────────────────────────────────────────────

function BriefTab({ briefEdit, setBriefEdit, briefDirty, saving, onSave, bizName }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Business Brief</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            Fill this to generate {bizName}'s personalised sequence. You can also share the client link for them to fill it themselves.
          </div>
        </div>
        {briefDirty && (
          <button onClick={onSave} disabled={saving} style={{
            padding: '8px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            background: 'var(--blue)', color: '#fff', border: 'none', cursor: 'pointer',
            flexShrink: 0,
          }}>
            {saving ? '…' : 'Save Brief'}
          </button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {BRIEF_FIELDS.map(f => (
          <div key={f.key} style={{ gridColumn: f.type === 'textarea' ? 'span 2' : 'span 1' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4 }}>
              {f.label}
            </label>
            {f.type === 'textarea' ? (
              <textarea
                value={briefEdit[f.key] || ''}
                onChange={e => setBriefEdit(f.key, e.target.value)}
                rows={f.rows || 2}
                style={tAreaStyle}
              />
            ) : f.type === 'select' ? (
              <Select
                value={briefEdit[f.key] || ''}
                onChange={v => setBriefEdit(f.key, v)}
                options={f.opts}
              />
            ) : (
              <input
                value={briefEdit[f.key] || ''}
                onChange={e => setBriefEdit(f.key, e.target.value)}
                style={inpStyle}
              />
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onSave} disabled={saving} style={{
          padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: 'var(--blue)', color: '#fff', border: 'none', cursor: 'pointer',
        }}>
          {saving ? 'Saving…' : 'Save Brief'}
        </button>
      </div>
    </div>
  );
}

// ─── Objections tab ───────────────────────────────────────────────────────────

function ObjectionsTab({ objections, onSave }) {
  const [items, setItems] = useState(objections);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setItems(objections); setDirty(false); }, [objections]);

  function update(idx, field, val) {
    const next = items.map((o, i) => i === idx ? { ...o, [field]: val } : o);
    setItems(next);
    setDirty(true);
  }

  function addItem() {
    setItems(prev => [...prev, { id: `o${Date.now()}`, trigger: '', response: '' }]);
    setDirty(true);
  }

  function removeItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx));
    setDirty(true);
  }

  if (items.length === 0) return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
      <div style={{ fontSize: 13, marginBottom: 12 }}>No objection handlers yet.</div>
      <div style={{ fontSize: 11, marginBottom: 20 }}>Generate a sequence first — Claude will create these automatically.</div>
      <button onClick={addItem} style={{ ...primaryBtn, fontSize: 12 }}>+ Add Manually</button>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Objection Handlers ({items.length})</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={addItem} style={{ ...ghostBtn, fontSize: 12 }}>+ Add</button>
          {dirty && (
            <button onClick={() => onSave(items)} style={{ ...primaryBtn, fontSize: 12 }}>Save</button>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((obj, idx) => (
          <div key={obj.id || idx} style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>TRIGGER</label>
                <input value={obj.trigger} onChange={e => update(idx, 'trigger', e.target.value)} style={inpStyle} placeholder="e.g. Not interested" />
              </div>
              <button onClick={() => removeItem(idx)} style={{ ...ghostBtn, fontSize: 11, alignSelf: 'flex-end', color: 'var(--red)', borderColor: 'var(--red)' }}>✕</button>
            </div>
            <div>
              <label style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>RESPONSE</label>
              <textarea value={obj.response} onChange={e => update(idx, 'response', e.target.value)} rows={2} style={tAreaStyle} placeholder="How to reply…" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Link tab ─────────────────────────────────────────────────────────────────

function LinkTab({ bizName, linkData, generatingLink, onGenerate, showToast }) {
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
        Client Onboarding Link
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 20 }}>
        Share this link with <strong style={{ color: 'var(--text)' }}>{bizName}</strong> — they'll fill in their offer details directly, and the brief will automatically appear here for review.
        The link is one-time use and expires in 30 days.
      </div>

      {linkData?.url ? (
        <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>✓ Active link</span>
            {linkData.expiresAt && (
              <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                Expires {new Date(linkData.expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <div style={{
            fontSize: 12, color: 'var(--muted)', padding: '8px 12px',
            background: 'var(--s2)', borderRadius: 7, wordBreak: 'break-all',
            fontFamily: 'var(--font-mono)', marginBottom: 12,
          }}>
            {linkData.url}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { navigator.clipboard.writeText(linkData.url); showToast('Link copied!', 'green'); }}
              style={{ ...primaryBtn, flex: 1, fontSize: 12 }}>
              Copy Link
            </button>
            <button onClick={onGenerate} disabled={generatingLink} style={{ ...ghostBtn, fontSize: 12 }}>
              {generatingLink ? '…' : '↺ New Link'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>🔗</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>No active link for {bizName} yet.</div>
          <button onClick={onGenerate} disabled={generatingLink} style={{ ...primaryBtn }}>
            {generatingLink ? 'Generating…' : 'Generate Onboard Link'}
          </button>
        </div>
      )}

      <div style={{ marginTop: 24, padding: '14px 16px', background: 'rgba(80,120,255,0.06)', borderRadius: 9, border: '1px solid rgba(80,120,255,0.15)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', marginBottom: 6 }}>How it works</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.7 }}>
          1. Click <strong>Generate Link</strong> — unique link created for {bizName}<br/>
          2. Send to client via WhatsApp or email<br/>
          3. They fill 5 questions about their offer (takes ~5 min)<br/>
          4. Brief automatically saved here — status changes to <span style={{ color: 'var(--amber)' }}>REVIEW</span><br/>
          5. Click ⚡ Generate Sequence to build their personalised outreach
        </div>
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({ tp, onClose, onSave }) {
  const [draft, setDraft] = useState({ ...tp });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 12,
        width: '100%', maxWidth: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Edit Touchpoint</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{tp.label}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--muted)', padding: '0 4px' }}>✕</button>
        </div>
        <div style={{ padding: '16px 20px', overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Label</label>
            <input value={draft.label || ''} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} style={inpStyle} />
          </div>
          {draft.channel === 'email' && (
            <div>
              <label style={labelStyle}>Subject Line</label>
              <input value={draft.subject || ''} onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))} style={inpStyle} />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>
              {draft.channel === 'voice' ? 'Voice Agent System Prompt' : 'Message Body'}
            </label>
            <textarea
              value={draft.body || ''}
              onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
              rows={12}
              style={{ ...tAreaStyle, resize: 'vertical' }}
            />
          </div>
          <div>
            <label style={labelStyle}>Internal Note (optional)</label>
            <input value={draft.notes || ''} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} style={inpStyle} placeholder="Why this version works…" />
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={ghostBtn}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={primaryBtn}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── shared styles ────────────────────────────────────────────────────────────

const inpStyle = {
  width: '100%', padding: '7px 10px', fontSize: 12,
  background: 'var(--s2)', border: '1px solid var(--border)',
  borderRadius: 7, color: 'var(--text)', fontFamily: 'var(--font-ui)',
  outline: 'none', boxSizing: 'border-box',
};

const tAreaStyle = {
  ...inpStyle, resize: 'vertical', lineHeight: 1.55,
};

const labelStyle = {
  fontSize: 11, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 4,
};

const primaryBtn = {
  padding: '8px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
  background: 'var(--blue)', color: '#fff', border: 'none', cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
};

const ghostBtn = {
  padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500,
  background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)',
  cursor: 'pointer', fontFamily: 'var(--font-ui)',
};

const iconBtn = {
  padding: '4px 8px', borderRadius: 6, fontSize: 13,
  background: 'var(--s2)', color: 'var(--muted)', border: '1px solid var(--border)',
  cursor: 'pointer', transition: 'all 0.1s',
};
