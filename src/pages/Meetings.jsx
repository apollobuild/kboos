import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../services/api.js';

const TYPE_COLORS = {
  discovery: 'var(--blue)',
  demo: 'var(--green)',
  closing: 'var(--amber)',
  'follow-up': 'var(--muted)',
};

const OUTCOME_COLORS = {
  booked: 'var(--blue)',
  completed: 'var(--green)',
  no_show: 'var(--amber)',
  cancelled: 'var(--red)',
};

const OUTCOME_LABELS = {
  booked: '● Booked',
  completed: '✓ Done',
  no_show: '✗ No-show',
  cancelled: '— Cancelled',
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-MY', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kuala_Lumpur',
  });
}

function timeUntil(d) {
  if (!d) return '';
  const diff = new Date(d) - Date.now();
  if (diff < 0) return 'Past';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `in ${Math.floor(h / 24)}d`;
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

function LogMeetingModal({ leads, campaigns, onSave, onClose }) {
  const [form, setForm] = useState({
    leadId: '', campaignId: '', meetingDate: '', meetingType: 'discovery', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [showLeadList, setShowLeadList] = useState(false);
  const leadRef = useRef(null);

  const filteredLeads = leads
    .filter(l => !leadSearch || l.name.toLowerCase().includes(leadSearch.toLowerCase()) || l.company.toLowerCase().includes(leadSearch.toLowerCase()))
    .slice(0, 8);

  const selectedLead = leads.find(l => l.id === form.leadId);

  useEffect(() => {
    function handleClick(e) {
      if (leadRef.current && !leadRef.current.contains(e.target)) setShowLeadList(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleSave() {
    if (!form.leadId) return;
    setSaving(true);
    try {
      const body = {
        leadId: form.leadId,
        campaignId: form.campaignId ? parseInt(form.campaignId) : undefined,
        meetingDate: form.meetingDate || undefined,
        meetingType: form.meetingType,
        notes: form.notes,
      };
      const m = await apiFetch('/meetings', { method: 'POST', body });
      onSave(m);
    } catch (e) {
      alert('Failed to save meeting');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'var(--s1)', borderRadius:12, border:'1px solid var(--border)', padding:24, width:460, maxHeight:'90vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight:700, fontSize:16, marginBottom:20 }}>Log Meeting</div>

        {/* Lead picker */}
        <div style={{ marginBottom:14 }} ref={leadRef}>
          <div style={{ fontSize:11, color:'var(--muted)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>Lead *</div>
          <div style={{ position:'relative' }}>
            <input
              value={selectedLead ? `${selectedLead.name} · ${selectedLead.company}` : leadSearch}
              onChange={e => { setLeadSearch(e.target.value); setShowLeadList(true); if (selectedLead) setForm(f => ({ ...f, leadId: '' })); }}
              onFocus={() => setShowLeadList(true)}
              placeholder="Search lead by name or company..."
              className="input"
              style={{ width:'100%', boxSizing:'border-box' }}
            />
            {showLeadList && (
              <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'var(--s1)', border:'1px solid var(--border)', borderRadius:8, zIndex:100, maxHeight:220, overflowY:'auto', marginTop:4 }}>
                {filteredLeads.length === 0 ? (
                  <div style={{ padding:'12px 14px', fontSize:12, color:'var(--muted)' }}>No leads found</div>
                ) : filteredLeads.map(l => (
                  <div key={l.id} style={{ padding:'9px 14px', cursor:'pointer', fontSize:12, borderBottom:'1px solid var(--border)' }}
                    onMouseDown={() => { setForm(f => ({ ...f, leadId: l.id, campaignId: l.campaignId || '' })); setShowLeadList(false); setLeadSearch(''); }}>
                    <div style={{ fontWeight:600, color:'var(--text)' }}>{l.name}</div>
                    <div style={{ color:'var(--muted)', fontSize:10 }}>{l.company}{l.title ? ` · ${l.title}` : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Date & Time */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:'var(--muted)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>Date & Time</div>
          <input type="datetime-local" className="input" style={{ width:'100%', boxSizing:'border-box' }}
            value={form.meetingDate} onChange={e => setForm(f => ({ ...f, meetingDate: e.target.value }))} />
        </div>

        {/* Type */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:'var(--muted)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>Meeting Type</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {['discovery', 'demo', 'closing', 'follow-up'].map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, meetingType: t }))}
                style={{ padding:'5px 12px', borderRadius:6, border:'1px solid', fontSize:11, fontWeight:600, cursor:'pointer',
                  background: form.meetingType === t ? TYPE_COLORS[t] : 'transparent',
                  borderColor: form.meetingType === t ? TYPE_COLORS[t] : 'var(--border)',
                  color: form.meetingType === t ? '#fff' : 'var(--muted)',
                }}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Campaign */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:'var(--muted)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>Campaign (optional)</div>
          <select className="input" style={{ width:'100%', boxSizing:'border-box' }}
            value={form.campaignId} onChange={e => setForm(f => ({ ...f, campaignId: e.target.value }))}>
            <option value="">— None —</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Notes */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, color:'var(--muted)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>Notes</div>
          <textarea className="input" rows={3} style={{ width:'100%', boxSizing:'border-box', resize:'vertical' }}
            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Agenda, talking points, context..." />
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-green btn-sm" onClick={handleSave} disabled={!form.leadId || saving}>
            {saving ? 'Saving...' : '✓ Log Meeting'}
          </button>
        </div>
      </div>
    </div>
  );
}

function OutcomeModal({ meeting, onSave, onClose }) {
  const [outcome, setOutcome] = useState(meeting.outcome || 'booked');
  const [notes, setNotes] = useState(meeting.notes || '');
  const [revenue, setRevenue] = useState(meeting.revenue || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const body = { outcome, notes };
      if (outcome === 'completed' && revenue) body.revenue = parseFloat(revenue);
      if (outcome === 'completed') body.closedAt = new Date().toISOString();
      const updated = await apiFetch(`/meetings/${meeting.id}`, { method: 'PATCH', body });
      onSave(updated);
    } catch {
      alert('Failed to update');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'var(--s1)', borderRadius:12, border:'1px solid var(--border)', padding:24, width:400 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>Log Outcome</div>
        <div style={{ fontSize:12, color:'var(--muted)', marginBottom:18 }}>{meeting.leadName} · {meeting.bizName}</div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>Outcome</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[['completed', 'Won ✓', 'var(--green)'], ['no_show', 'No-show', 'var(--amber)'], ['cancelled', 'Cancelled', 'var(--red)'], ['booked', 'Reschedule', 'var(--blue)']].map(([val, label, color]) => (
              <button key={val} onClick={() => setOutcome(val)}
                style={{ padding:'5px 12px', borderRadius:6, border:'1px solid', fontSize:11, fontWeight:600, cursor:'pointer',
                  background: outcome === val ? color : 'transparent',
                  borderColor: outcome === val ? color : 'var(--border)',
                  color: outcome === val ? '#fff' : 'var(--muted)',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {outcome === 'completed' && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, color:'var(--muted)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>Deal Value (RM)</div>
            <input type="number" className="input" style={{ width:'100%', boxSizing:'border-box' }}
              value={revenue} onChange={e => setRevenue(e.target.value)} placeholder="e.g. 5000" />
          </div>
        )}

        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, color:'var(--muted)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>Notes</div>
          <textarea className="input" rows={3} style={{ width:'100%', boxSizing:'border-box', resize:'vertical' }}
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="How did it go? Next steps?" />
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-green btn-sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Outcome'}</button>
        </div>
      </div>
    </div>
  );
}

export function Meetings() {
  const { leads, campaigns, showToast } = useAppStore(useShallow(s => ({
    leads: s.leads, campaigns: s.campaigns, showToast: s.showToast,
  })));

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLog, setShowLog] = useState(false);
  const [outcomeFor, setOutcomeFor] = useState(null);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    apiFetch('/meetings').then(setMeetings).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const upcoming = meetings
    .filter(m => m.meetingDate && new Date(m.meetingDate) >= now && !['completed','no_show','cancelled'].includes(m.outcome))
    .sort((a, b) => new Date(a.meetingDate) - new Date(b.meetingDate));
  const past = meetings
    .filter(m => !upcoming.includes(m))
    .sort((a, b) => new Date(b.meetingDate || b.createdAt) - new Date(a.meetingDate || a.createdAt));

  const stats = {
    total: meetings.length,
    thisWeek: meetings.filter(m => {
      if (!m.meetingDate) return false;
      const d = new Date(m.meetingDate);
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
      return d >= weekStart && d <= weekEnd;
    }).length,
    completed: meetings.filter(m => m.outcome === 'completed').length,
    noShow: meetings.filter(m => m.outcome === 'no_show').length,
    revenue: meetings.reduce((s, m) => s + (m.revenue || 0), 0),
  };

  function handleSaved(m) {
    setMeetings(prev => [m, ...prev.filter(x => x.id !== m.id)]);
    setShowLog(false);
    showToast(`Meeting logged for ${m.leadName}`, 'green');
  }

  function handleOutcomeUpdated(m) {
    setMeetings(prev => prev.map(x => x.id === m.id ? m : x));
    setOutcomeFor(null);
    showToast('Outcome saved', 'green');
  }

  async function cancelMeeting(id) {
    try {
      const updated = await apiFetch(`/meetings/${id}`, { method: 'PATCH', body: { outcome: 'cancelled' } });
      setMeetings(prev => prev.map(m => m.id === id ? updated : m));
      showToast('Meeting cancelled', 'amber');
    } catch { alert('Failed to cancel'); }
  }

  function MeetingCard({ m, isUpcoming }) {
    const reminderCount = (m.remindersSent || []).filter(r => r !== 'booking_confirmation').length;
    return (
      <div style={{ padding:'14px 16px', background:'var(--s2)', borderRadius:10, border:'1px solid var(--border)', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{m.leadName}</span>
              <span style={{ fontSize:10, color:'var(--muted)' }}>·</span>
              <span style={{ fontSize:12, color:'var(--muted)' }}>{m.bizName}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span style={{ fontSize:11, color: TYPE_COLORS[m.meetingType] || 'var(--muted)', fontWeight:600, textTransform:'capitalize' }}>{m.meetingType}</span>
              <span style={{ fontSize:11, color:'var(--muted)' }}>·</span>
              <span style={{ fontSize:11, color:'var(--text)' }}>{formatDate(m.meetingDate)}</span>
              {isUpcoming && m.meetingDate && (
                <span style={{ fontSize:10, color:'var(--green)', fontWeight:600, background:'oklch(65% 0.2 145 / 0.12)', borderRadius:4, padding:'1px 6px' }}>
                  {timeUntil(m.meetingDate)}
                </span>
              )}
            </div>
            {m.notes && <div style={{ fontSize:11, color:'var(--muted)', marginTop:5, lineHeight:1.4 }}>{m.notes}</div>}
            {reminderCount > 0 && (
              <div style={{ fontSize:10, color:'var(--muted)', marginTop:4 }}>
                🔔 {reminderCount} reminder{reminderCount !== 1 ? 's' : ''} sent
              </div>
            )}
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
            <span style={{ fontSize:10, fontWeight:600, color: OUTCOME_COLORS[m.outcome] || 'var(--muted)' }}>
              {OUTCOME_LABELS[m.outcome] || m.outcome}
            </span>
            {m.revenue > 0 && (
              <span style={{ fontSize:11, color:'var(--green)', fontWeight:700, fontFamily:'var(--font-mono)' }}>
                RM {m.revenue.toLocaleString()}
              </span>
            )}
            <div style={{ display:'flex', gap:6 }}>
              {m.outcome === 'booked' && (
                <>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize:10, padding:'3px 8px' }} onClick={() => setOutcomeFor(m)}>
                    Log Outcome
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize:10, padding:'3px 8px', color:'var(--red)' }} onClick={() => cancelMeeting(m.id)}>
                    Cancel
                  </button>
                </>
              )}
              {m.outcome !== 'booked' && (
                <button className="btn btn-ghost btn-sm" style={{ fontSize:10, padding:'3px 8px' }} onClick={() => setOutcomeFor(m)}>
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-4 fade-up">
        <div>
          <h1 className="page-title">Meetings</h1>
          <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>
            {new Date().toLocaleDateString('en-MY', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
          </div>
        </div>
        <button className="btn btn-green btn-sm" onClick={() => setShowLog(true)}>＋ Log Meeting</button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }} className="fade-up">
        {[
          { label:'Total Meetings', value: stats.total, color:'var(--blue)' },
          { label:'This Week', value: stats.thisWeek, color:'var(--text)' },
          { label:'Upcoming', value: upcoming.length, color:'var(--green)' },
          { label:'Completed', value: stats.completed, color:'var(--green)' },
          { label:'No-shows', value: stats.noShow, color:'var(--amber)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:'14px 18px' }}>
            <div style={{ fontSize:22, fontWeight:700, color:s.color, fontFamily:'var(--font-mono)' }}>{s.value}</div>
            <div style={{ fontSize:10, color:'var(--muted)', marginTop:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {stats.revenue > 0 && (
        <div className="card fade-up" style={{ padding:'14px 20px', marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:18 }}>💰</span>
          <div>
            <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Total Revenue from Meetings</div>
            <div style={{ fontSize:20, fontWeight:700, color:'var(--green)', fontFamily:'var(--font-mono)' }}>RM {stats.revenue.toLocaleString()}</div>
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }}>
        {/* Upcoming */}
        <div className="fade-up-1">
          <div style={{ fontWeight:700, fontSize:13, color:'var(--text)', marginBottom:12, display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ color:'var(--green)', fontSize:8 }}>●</span> Upcoming ({upcoming.length})
          </div>
          {loading ? (
            <div className="shimmer" style={{ height:80, borderRadius:10 }} />
          ) : upcoming.length === 0 ? (
            <div className="card" style={{ padding:'24px', textAlign:'center', color:'var(--muted)', fontSize:13 }}>
              No upcoming meetings —{' '}
              <span style={{ color:'var(--blue)', cursor:'pointer' }} onClick={() => setShowLog(true)}>log one →</span>
            </div>
          ) : (
            upcoming.map(m => <MeetingCard key={m.id} m={m} isUpcoming />)
          )}
        </div>

        {/* Past / History */}
        <div className="fade-up-1">
          <div style={{ fontWeight:700, fontSize:13, color:'var(--text)', marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span>Past Meetings ({past.length})</span>
            {past.length > 5 && (
              <button className="btn btn-ghost btn-sm" style={{ fontSize:10 }} onClick={() => setShowPast(v => !v)}>
                {showPast ? 'Show less' : 'Show all'}
              </button>
            )}
          </div>
          {loading ? (
            <div className="shimmer" style={{ height:80, borderRadius:10 }} />
          ) : past.length === 0 ? (
            <div className="card" style={{ padding:'24px', textAlign:'center', color:'var(--muted)', fontSize:13 }}>No past meetings yet</div>
          ) : (
            (showPast ? past : past.slice(0, 5)).map(m => <MeetingCard key={m.id} m={m} isUpcoming={false} />)
          )}
        </div>
      </div>

      {showLog && (
        <LogMeetingModal leads={leads} campaigns={campaigns} onSave={handleSaved} onClose={() => setShowLog(false)} />
      )}
      {outcomeFor && (
        <OutcomeModal meeting={outcomeFor} onSave={handleOutcomeUpdated} onClose={() => setOutcomeFor(null)} />
      )}
    </div>
  );
}
