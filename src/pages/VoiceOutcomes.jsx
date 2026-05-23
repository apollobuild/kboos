import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { Select } from '../components/ui/Select.jsx';
import { BizAvatar } from '../components/ui/BizAvatar.jsx';

const CH_ICON  = { wa:'💬', whatsapp:'💬', email:'✉', voice:'📞' };
const CH_COLOR = { wa:'var(--green)', whatsapp:'var(--green)', email:'var(--blue)', voice:'var(--amber)' };

function relTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getBizForLead(lead, campaigns, businesses) {
  const camp = campaigns.find(c => c.id === lead?.campaignId);
  return businesses.find(b => b.id === camp?.bizId);
}

function getCampForLead(lead, campaigns) {
  return campaigns.find(c => c.id === lead?.campaignId);
}

function getOutcome(lead) {
  if (lead.status === 'meeting_booked') return { key: 'meeting_booked', label: '📅 Meeting Booked', color: 'var(--green)', textColor: '#fff' };
  if (lead.status === 'hot' || (lead.score != null && lead.score >= 8)) return { key: 'hot', label: '🔥 Interested', color: 'var(--amber)', textColor: '#fff' };
  if (lead.status === 'cold') return { key: 'cold', label: 'No Answer', color: 'var(--s2)', textColor: 'var(--muted)' };
  if (lead.status === 'engaged' || lead.status === 'call_made' || lead.status === 'call_initiated') return { key: 'engaged', label: 'Connected', color: 'var(--blue)', textColor: '#fff' };
  return { key: 'voicemail', label: 'Voicemail', color: 'var(--s2)', textColor: 'var(--muted)' };
}

const FILTER_TABS = [
  { key: 'All',            label: 'All' },
  { key: 'engaged',        label: 'Connected' },
  { key: 'voicemail',      label: 'Voicemail' },
  { key: 'hot',            label: 'Interested' },
  { key: 'meeting_booked', label: 'Meeting Booked' },
  { key: 'cold',           label: 'No Answer' },
];

const OUTCOME_OPTIONS = [
  { value: 'engaged',        label: 'Connected' },
  { value: 'voicemail',      label: 'Voicemail' },
  { value: 'hot',            label: '🔥 Interested' },
  { value: 'meeting_booked', label: '📅 Meeting Booked' },
  { value: 'cold',           label: 'No Answer' },
  { value: 'call_made',      label: 'Call Made' },
];

export function VoiceOutcomes() {
  const { leads, campaigns, businesses, showToast } = useAppStore(
    useShallow(s => ({
      leads:      s.leads,
      campaigns:  s.campaigns,
      businesses: s.businesses,
      showToast:  s.showToast,
    }))
  );

  const [filterTab,   setFilterTab]   = useState('All');
  const [selectedId,  setSelectedId]  = useState(null);
  const [panelNotes,  setPanelNotes]  = useState('');
  const [panelStatus, setPanelStatus] = useState('');

  const voiceLeads = leads.filter(l =>
    l.channels?.includes('voice') ||
    l.channels?.includes('Call') ||
    l.status === 'call_made' ||
    l.status === 'call_initiated'
  );

  function matchesTab(lead) {
    if (filterTab === 'All') return true;
    const outcome = getOutcome(lead);
    return outcome.key === filterTab;
  }

  const filtered = voiceLeads.filter(matchesTab);

  function countForTab(key) {
    if (key === 'All') return voiceLeads.length;
    return voiceLeads.filter(l => getOutcome(l).key === key).length;
  }

  const selectedLead = selectedId ? voiceLeads.find(l => l.id === selectedId) ?? null : null;

  function openPanel(lead) {
    setSelectedId(lead.id);
    const saved = localStorage.getItem(`kboos_voice_notes_${lead.id}`) || '';
    setPanelNotes(saved);
    setPanelStatus(lead.status || 'engaged');
  }

  function closePanel() {
    setSelectedId(null);
    setPanelNotes('');
    setPanelStatus('');
  }

  function saveNotes(leadId, notes) {
    localStorage.setItem(`kboos_voice_notes_${leadId}`, notes);
    setPanelNotes(notes);
  }

  function handleBookMeeting() {
    if (!selectedLead) return;
    setPanelStatus('meeting_booked');
    showToast('Meeting booked ✓', 'green');
  }

  function handleOutcomeChange(val) {
    setPanelStatus(val);
    showToast('Outcome updated ✓', 'green');
  }

  return (
    <div className="page" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' }}>

      {/* Page header */}
      <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 className="page-title" style={{ margin: 0 }}>📞 Voice Outcomes</h1>
          <span style={{
            background: 'var(--amber)', color: '#fff',
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
          }}>
            {voiceLeads.length}
          </span>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)' }}>
          Track call results and follow-up actions across all voice campaigns
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {FILTER_TABS.map(t => {
          const count = countForTab(t.key);
          const active = filterTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => { setFilterTab(t.key); setSelectedId(null); }}
              style={{
                padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer',
                background: active ? 'var(--blue)' : 'var(--s1)',
                color: active ? '#fff' : 'var(--muted)',
                fontSize: 12, fontWeight: active ? 700 : 400, transition: 'all 0.12s',
              }}
            >
              {t.label} <span style={{ opacity: 0.7, fontSize: 11 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* Main content area with optional side panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
          {voiceLeads.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: 300, gap: 12, color: 'var(--muted)', textAlign: 'center',
            }}>
              <span style={{ fontSize: 36 }}>📞</span>
              <p style={{ fontSize: 14, margin: 0, fontWeight: 600, color: 'var(--text)' }}>No voice campaign data yet</p>
              <p style={{ fontSize: 13, margin: 0, maxWidth: 360 }}>
                Add leads to campaigns with voice channel enabled to start tracking call outcomes here.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No leads match this filter
            </div>
          ) : (
            <div className="table-wrap" style={{ marginTop: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Lead', 'Company', 'Title', 'Business', 'Campaign', 'Outcome', 'Score', 'Last Contact'].map(col => (
                      <th key={col} style={{
                        padding: '8px 12px', textAlign: 'left', fontSize: 11,
                        color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap',
                        background: 'var(--s1)', borderBottom: '1px solid var(--border)',
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(lead => {
                    const biz      = getBizForLead(lead, campaigns, businesses);
                    const camp     = getCampForLead(lead, campaigns);
                    const outcome  = getOutcome(lead);
                    const isActive = lead.id === selectedId;

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => isActive ? closePanel() : openPanel(lead)}
                        style={{
                          borderBottom: '1px solid var(--border)', cursor: 'pointer',
                          background: isActive ? 'var(--s1)' : 'transparent',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--s1)'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                      >
                        {/* Lead name */}
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {biz ? (
                              <BizAvatar id={biz.id} name={biz.name} color={biz.color || 'blue'} size={26} />
                            ) : (
                              <div style={{
                                width: 26, height: 26, borderRadius: '50%', background: 'var(--s2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                              }}>
                                📞
                              </div>
                            )}
                            {lead.name || '—'}
                          </div>
                        </td>

                        {/* Company */}
                        <td style={{ padding: '10px 12px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                          {lead.company || '—'}
                        </td>

                        {/* Title */}
                        <td style={{ padding: '10px 12px', color: 'var(--muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {lead.title || lead.jobTitle || '—'}
                        </td>

                        {/* Business */}
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          {biz ? (
                            <span style={{ fontSize: 12, color: 'var(--text)' }}>{biz.name}</span>
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>—</span>
                          )}
                        </td>

                        {/* Campaign */}
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          {camp ? (
                            <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: 'var(--s2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                              {camp.name}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>—</span>
                          )}
                        </td>

                        {/* Outcome pill */}
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            fontSize: 11, padding: '3px 9px', borderRadius: 20, fontWeight: 700,
                            background: outcome.color, color: outcome.textColor,
                          }}>
                            {outcome.label}
                          </span>
                        </td>

                        {/* Score */}
                        <td style={{ padding: '10px 12px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>
                          {lead.score != null ? (
                            <span style={{ color: lead.score >= 8 ? 'var(--green)' : lead.score >= 5 ? 'var(--amber)' : 'var(--muted)' }}>
                              {lead.score}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>—</span>
                          )}
                        </td>

                        {/* Last Contact */}
                        <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                          {relTime(lead.lastContactedAt || lead.updatedAt || lead.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right slide panel */}
        {selectedLead && (
          <div style={{
            width: 340, borderLeft: '1px solid var(--border)', flexShrink: 0,
            display: 'flex', flexDirection: 'column', overflowY: 'auto',
            background: 'var(--bg)',
            animation: 'slideInRight 0.18s ease',
          }}>

            {/* Panel header */}
            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 3 }}>
                  {selectedLead.name || '—'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>
                  {selectedLead.title || selectedLead.jobTitle || 'No title'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {selectedLead.company || 'No company'}
                </div>
              </div>
              <button
                onClick={closePanel}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--muted)', fontSize: 18, lineHeight: 1, padding: '0 2px',
                }}
                aria-label="Close panel"
              >
                ×
              </button>
            </div>

            {/* Score badge */}
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {selectedLead.score != null && (
                <span style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700,
                  background: selectedLead.score >= 8 ? 'var(--green)' : selectedLead.score >= 5 ? 'var(--amber)' : 'var(--s2)',
                  color: selectedLead.score >= 5 ? '#fff' : 'var(--muted)',
                }}>
                  Score: {selectedLead.score}
                </span>
              )}
              {(() => {
                const outcome = getOutcome({ ...selectedLead, status: panelStatus });
                return (
                  <span style={{
                    fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700,
                    background: outcome.color, color: outcome.textColor,
                  }}>
                    {outcome.label}
                  </span>
                );
              })()}
              {selectedLead.email && (
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'var(--s2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                  ✉ {selectedLead.email}
                </span>
              )}
              {selectedLead.phone && (
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'var(--s2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                  📞 {selectedLead.phone}
                </span>
              )}
            </div>

            {/* Outcome selector */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Outcome
              </label>
              <Select
                value={panelStatus}
                onChange={handleOutcomeChange}
                options={OUTCOME_OPTIONS}
                style={{ width: '100%' }}
                className="input"
              />
            </div>

            {/* Notes textarea */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Notes
              </label>
              <textarea
                className="input"
                value={panelNotes}
                onChange={e => setPanelNotes(e.target.value)}
                onBlur={e => saveNotes(selectedLead.id, e.target.value)}
                placeholder="Add call notes, objections, follow-up details…"
                style={{
                  width: '100%', minHeight: 120, fontSize: 12, lineHeight: 1.7,
                  fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box',
                }}
              />
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => saveNotes(selectedLead.id, panelNotes)}
                style={{ marginTop: 6, fontSize: 11 }}
              >
                Save Notes
              </button>
            </div>

            {/* Book meeting button */}
            <div style={{ padding: '14px 18px' }}>
              <button
                className="btn btn-green"
                onClick={handleBookMeeting}
                style={{ width: '100%', fontSize: 13, fontWeight: 700 }}
              >
                📅 Book Meeting
              </button>
              {panelStatus === 'meeting_booked' && (
                <div style={{
                  marginTop: 10, fontSize: 11, color: 'var(--green)',
                  textAlign: 'center', fontWeight: 600,
                }}>
                  ✓ Meeting booked for this lead
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(20px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
