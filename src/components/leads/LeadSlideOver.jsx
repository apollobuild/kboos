import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { ScoreDisplay } from '../ui/ScoreDisplay.jsx';
import { LeadStatusBadge } from '../ui/LeadStatusBadge.jsx';
import { apiFetch } from '../../services/api.js';
import { Select } from '../ui/Select.jsx';
import { calculateScoreLabel } from '../../services/leads.js';

const TYPE_ICON  = { wa: '💬', email: '📧', call: '📞' };
const TYPE_LABEL = { wa: 'WhatsApp', email: 'Email', call: 'Voice Call' };

function sourceLabel(score) {
  if (score >= 60) return { text: 'Maps + Apollo', color: 'var(--green)' };
  if (score >= 40) return { text: 'Apollo', color: 'var(--blue)' };
  if (score >= 30) return { text: 'Google Maps', color: 'var(--amber)' };
  return { text: 'Manual', color: 'var(--muted)' };
}

function fmt(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleString('en-MY', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function relDays(dateStr) {
  if (!dateStr) return '';
  const diff = Math.round((new Date(dateStr) - Date.now()) / 86400000);
  if (diff === 0) return 'today';
  if (diff > 0) return `in ${diff}d`;
  return `${Math.abs(diff)}d ago`;
}

export function LeadSlideOver({ lead: initialLead, onClose }) {
  const { campaigns, updateLead, showToast } = useAppStore(useShallow(s => ({
    campaigns: s.campaigns,
    updateLead: s.updateLead,
    showToast: s.showToast,
  })));

  const [tab, setTab]                   = useState(0);
  const [status, setStatus]             = useState(initialLead.status);
  const [note, setNote]                 = useState(initialLead.note || '');
  const [noteSaved, setNoteSaved]       = useState(false);
  const [actions, setActions]           = useState(null);
  const [generating, setGenerating]     = useState(false);
  const [genEmail, setGenEmail]         = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(0);
  const noteTimer = useRef(null);

  const lead     = initialLead;
  const campaign = campaigns.find(c => c.id === lead.campaignId);
  const scoreLabel = lead.scoreLabel || calculateScoreLabel(lead);
  const src = sourceLabel(lead.score);

  // Fetch actions when Timeline tab opens
  useEffect(() => {
    if (tab === 1 && actions === null) {
      apiFetch(`/leads/${lead.id}/actions`)
        .then(setActions)
        .catch(() => setActions([]));
    }
  }, [tab]);

  function handleStatusChange(val) {
    setStatus(val);
    updateLead(lead.id, { status: val });
  }

  function handleNote(val) {
    setNote(val);
    setNoteSaved(false);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => {
      updateLead(lead.id, { note: val });
      setNoteSaved(true);
    }, 1000);
  }

  async function handleGenerateEmail() {
    if (!campaign) { showToast('No campaign linked to this lead', 'amber'); return; }
    setGenerating(true);
    try {
      const result = await apiFetch('/ai/generate-email', {
        method: 'POST',
        body: {
          bizName: campaign.bizName || '',
          campaignName: campaign.name || '',
          prompt: campaign.config?.emailPrompt || '',
          lead: { name: lead.name, company: lead.company, title: lead.title, lang: lead.lang },
        },
      });
      setGenEmail(result);
      setSelectedSubject(0);
    } catch (e) { showToast(e.message || 'Generation failed', 'red'); }
    finally { setGenerating(false); }
  }

  // Build timeline from campaign sequence + real actions
  const timeline = (() => {
    const seq = campaign?.sequence || [];
    const startedAt = campaign?.startedAt ? new Date(campaign.startedAt) : null;
    const doneMap = {};
    (actions || []).forEach(a => { doneMap[`${a.stepDay}-${a.type}`] = a; });

    return seq.map(step => {
      const done = doneMap[`${step.day}-${step.type}`];
      const scheduledDate = startedAt
        ? new Date(startedAt.getTime() + step.day * 86400000)
        : null;
      const isPast = scheduledDate && scheduledDate < new Date();
      return {
        ...step,
        done:          !!done,
        failed:        done?.status === 'failed',
        sentAt:        done?.sentAt,
        openedAt:      done?.openedAt,
        errorMsg:      done?.errorMsg,
        scheduledDate,
        overdue:       !done && isPast,
      };
    });
  })();

  const TABS = ['Overview', 'Timeline', 'Email', 'Notes'];

  return (
    <div className="slide-over-overlay" onClick={onClose}>
      <div className="slide-over-panel" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '18px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button className="btn btn-ghost btn-xs" onClick={onClose}>✕ Close</button>
            <Select
              value={status}
              onChange={v => handleStatusChange(v)}
              options={['new','wa_sent','email_sent','call_initiated','replied','hot','meeting_booked','bounced','unsubscribed'].map(s => ({value:s, label:s.replace(/_/g,' ')}))}
              style={{ background: 'var(--s1)', border: '1px solid var(--border)', color: 'var(--text)', padding: '4px 8px', borderRadius: 6, fontSize: 12 }}
            />
          </div>

          {/* Lead identity */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, flexShrink: 0, fontSize: 18, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: scoreLabel === 'High' ? 'rgba(0,217,126,0.15)' : scoreLabel === 'Medium' ? 'rgba(245,166,35,0.15)' : 'rgba(120,120,120,0.15)',
              color: scoreLabel === 'High' ? 'var(--green)' : scoreLabel === 'Medium' ? 'var(--amber)' : 'var(--muted)',
              border: `1px solid ${scoreLabel === 'High' ? 'rgba(0,217,126,0.3)' : scoreLabel === 'Medium' ? 'rgba(245,166,35,0.3)' : 'var(--border)'}`,
            }}>
              {lead.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 2 }}>{lead.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{lead.title}{lead.title && lead.company ? ' · ' : ''}{lead.company}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <ScoreDisplay score={lead.score} />
                <LeadStatusBadge status={status} />
                {lead.enriched && (
                  <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(0,120,255,0.1)', color: 'var(--blue)', border: '1px solid rgba(0,120,255,0.3)', fontWeight: 600 }}>Enriched</span>
                )}
                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'var(--bg-2)', color: src.color, border: '1px solid var(--border)', fontWeight: 500 }}>{src.text}</span>
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {TABS.map((t, i) => (
              <button key={t} onClick={() => setTab(i)} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px', fontSize: 12, fontWeight: 500,
                color: tab === i ? 'var(--text-1)' : 'var(--muted)',
                borderBottom: tab === i ? '2px solid var(--blue)' : '2px solid transparent',
                marginBottom: -1,
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ padding: '16px 20px 24px', overflowY: 'auto', flex: 1 }}>

          {/* ── Overview ── */}
          {tab === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Contact grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Phone', val: lead.phone, icon: '💬', href: lead.phone ? `https://wa.me/${lead.phone.replace(/\D/g,'')}` : null, mono: true },
                  { label: 'Email', val: lead.email, icon: '📧', copy: true, mono: true },
                  { label: 'Address', val: lead.address, icon: '📍' },
                  { label: 'Website', val: lead.website, icon: '🌐', href: lead.website },
                  { label: 'Language', val: lead.lang === 'BM' ? 'Bahasa Malaysia' : lead.lang === 'ZH' ? 'Mandarin' : 'English', icon: '🗣' },
                  { label: 'Score', val: `${lead.score} · ${scoreLabel}`, icon: '📊', color: scoreLabel === 'High' ? 'var(--green)' : scoreLabel === 'Medium' ? 'var(--amber)' : 'var(--muted)' },
                ].map(({ label, val, icon, href, copy, mono, color }) => (
                  <div key={label} style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{icon} {label}</div>
                    {val ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {href
                          ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--blue)', fontFamily: mono ? 'var(--font-mono)' : 'inherit', wordBreak: 'break-all', textDecoration: 'none' }}>{val}</a>
                          : <span style={{ fontSize: 12, color: color || 'var(--text-1)', fontFamily: mono ? 'var(--font-mono)' : 'inherit', wordBreak: 'break-all' }}>{val}</span>
                        }
                        {copy && (
                          <button onClick={() => { navigator.clipboard.writeText(val); showToast('Copied', 'green'); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 11, flexShrink: 0 }}>📋</button>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Campaign + dates */}
              <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Campaign</div>
                  <div style={{ fontSize: 12, color: campaign ? 'var(--text-1)' : 'var(--muted)' }}>{campaign?.name || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Added</div>
                  <div style={{ fontSize: 12 }}>{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-MY') : '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Enriched</div>
                  <div style={{ fontSize: 12, color: lead.enriched ? 'var(--blue)' : 'var(--muted)' }}>
                    {lead.enriched ? (lead.enrichedAt ? new Date(lead.enrichedAt).toLocaleDateString('en-MY') : 'Yes') : 'Not yet'}
                  </div>
                </div>
              </div>

              {/* Enrichment note */}
              {lead.enrichmentNote && (
                <div style={{ background: 'rgba(0,120,255,0.06)', border: '1px solid rgba(0,120,255,0.2)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Apollo Note</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{lead.enrichmentNote}</div>
                </div>
              )}
            </div>
          )}

          {/* ── Timeline ── */}
          {tab === 1 && (
            <div>
              {!campaign ? (
                <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 40 }}>This lead is not linked to a campaign</div>
              ) : actions === null ? (
                <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 40 }}>Loading…</div>
              ) : timeline.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 40 }}>No sequence steps defined for this campaign</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {!campaign.startedAt && (
                    <div style={{ fontSize: 12, color: 'var(--amber)', background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>
                      Campaign not launched yet — timeline shows planned sequence
                    </div>
                  )}
                  {timeline.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: i < timeline.length - 1 ? 0 : 0 }}>
                      {/* Connector line + dot */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0,
                          background: step.failed ? 'rgba(255,50,50,0.15)' : step.done ? 'rgba(0,217,126,0.15)' : step.overdue ? 'rgba(245,166,35,0.12)' : 'var(--bg-2)',
                          border: `2px solid ${step.failed ? 'var(--red)' : step.done ? 'var(--green)' : step.overdue ? 'var(--amber)' : 'var(--border)'}`,
                          color: step.failed ? 'var(--red)' : step.done ? 'var(--green)' : step.overdue ? 'var(--amber)' : 'var(--muted)',
                        }}>
                          {step.failed ? '✗' : step.done ? '✓' : TYPE_ICON[step.type] || '·'}
                        </div>
                        {i < timeline.length - 1 && (
                          <div style={{ width: 2, flex: 1, minHeight: 20, background: step.done ? 'rgba(0,217,126,0.3)' : 'var(--border)', margin: '3px 0' }} />
                        )}
                      </div>

                      {/* Step details */}
                      <div style={{ flex: 1, paddingBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: step.done ? 'var(--text-1)' : 'var(--muted)' }}>
                              Day {step.day} — {TYPE_LABEL[step.type] || step.label}
                            </div>
                            {step.sentAt && (
                              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Sent {fmt(step.sentAt)}</div>
                            )}
                            {step.openedAt && (
                              <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 1 }}>👁 Opened {fmt(step.openedAt)}</div>
                            )}
                            {step.errorMsg && (
                              <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 1 }}>✗ {step.errorMsg}</div>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: step.overdue ? 'var(--amber)' : 'var(--muted)', flexShrink: 0, marginLeft: 8, textAlign: 'right' }}>
                            {step.scheduledDate ? (
                              step.done ? '' : <span>{new Date(step.scheduledDate).toLocaleDateString('en-MY')} <span style={{ opacity: 0.6 }}>({relDays(step.scheduledDate)})</span></span>
                            ) : `Day ${step.day}`}
                            {step.overdue && !step.done && <div style={{ color: 'var(--amber)', fontWeight: 600 }}>Overdue</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Email Copy ── */}
          {tab === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {!campaign ? (
                <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 40 }}>This lead is not linked to a campaign</div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Generate a personalised email for {lead.name.split(' ')[0]}</div>
                    <button className="btn btn-blue btn-sm" onClick={handleGenerateEmail} disabled={generating}>
                      {generating ? '◌ Writing…' : genEmail ? '↺ Regenerate' : '✦ Generate Email'}
                    </button>
                  </div>

                  {genEmail && (
                    <>
                      {/* Subject variants */}
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subject Lines (click to select)</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {(genEmail.subjects || [genEmail.subject]).map((s, i) => (
                            <div key={i} onClick={() => setSelectedSubject(i)}
                              style={{ padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                                background: selectedSubject === i ? 'var(--blue-dim)' : 'var(--bg-2)',
                                border: `1px solid ${selectedSubject === i ? 'rgba(0,120,255,0.4)' : 'var(--border)'}`,
                                color: selectedSubject === i ? 'var(--blue)' : 'var(--text-2)',
                              }}>
                              {selectedSubject === i ? '● ' : '○ '}{s}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Body */}
                      <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: 14 }}>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Body</div>
                        <div style={{ fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: 'var(--text-1)' }}>{genEmail.body}</div>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => {
                          const subject = (genEmail.subjects || [genEmail.subject])[selectedSubject];
                          navigator.clipboard.writeText(`Subject: ${subject}\n\n${genEmail.body}`);
                          showToast('Email copied to clipboard', 'green');
                        }}>📋 Copy Full Email</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => {
                          const subject = (genEmail.subjects || [genEmail.subject])[selectedSubject];
                          navigator.clipboard.writeText(subject);
                          showToast('Subject copied', 'green');
                        }}>Copy Subject</button>
                      </div>
                    </>
                  )}

                  {!genEmail && !generating && (
                    <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)', fontSize: 13 }}>
                      Click "Generate Email" to write a personalised cold email for {lead.name.split(' ')[0]} using Claude AI
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Notes ── */}
          {tab === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Private notes — only visible to your team</div>
                {noteSaved && <div style={{ fontSize: 11, color: 'var(--green)' }}>✓ Saved</div>}
              </div>
              <textarea
                value={note}
                onChange={e => handleNote(e.target.value)}
                placeholder={`Notes about ${lead.name}...\n\ne.g. Called on May 21 — said to follow up in June. Interested in the quarterly plan.`}
                style={{
                  minHeight: 220, width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)',
                  color: 'var(--text-1)', borderRadius: 8, padding: '12px 14px', fontSize: 13, lineHeight: 1.7,
                  resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
