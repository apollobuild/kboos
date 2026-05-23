import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../services/api.js';

export function Revenue() {
  const { campaigns, setPage, showToast } = useAppStore(useShallow(s => ({
    campaigns: s.campaigns, setPage: s.setPage, showToast: s.showToast,
  })));

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ campaignId: '', leadId: '', meetingDate: '', meetingType: 'discovery', outcome: '', revenue: '' });

  useEffect(() => {
    apiFetch('/meetings').then(d => setMeetings(d || [])).catch(() => setMeetings([])).finally(() => setLoading(false));
  }, []);

  const totalRevenue = meetings.reduce((s, m) => s + (m.revenue || 0), 0);
  const closed = meetings.filter(m => m.closedAt || m.revenue);
  const opportunities = meetings.filter(m => m.outcome);

  async function saveMeeting() {
    setSaving(true);
    try {
      const body = { ...form, campaignId: parseInt(form.campaignId) || null, leadId: parseInt(form.leadId) || null, revenue: parseFloat(form.revenue) || null };
      const m = await apiFetch('/meetings', { method: 'POST', body });
      setMeetings(prev => [m, ...prev]);
      setShowForm(false);
      setForm({ campaignId: '', leadId: '', meetingDate: '', meetingType: 'discovery', outcome: '', revenue: '' });
      showToast('Meeting logged');
    } catch (e) { showToast(e.message, 'red'); }
    setSaving(false);
  }

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const stats = [
    { label: 'Meetings Booked', value: meetings.length, color: 'var(--blue)' },
    { label: 'Opportunities', value: opportunities.length, color: 'var(--amber)' },
    { label: 'Deals Closed', value: closed.length, color: 'var(--green)' },
    { label: 'Revenue Generated', value: `RM ${totalRevenue.toLocaleString()}`, color: 'var(--green)' },
  ];

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-4 fade-up">
        <div>
          <h1 className="page-title">Revenue</h1>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>Track meetings booked, opportunities, and closed deals</div>
        </div>
        <button className="btn btn-green btn-sm" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancel' : '＋ Log Meeting'}
        </button>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}} className="fade-up">
        {stats.map(s => (
          <div key={s.label} className="card" style={{padding:'16px 20px'}}>
            <div style={{fontSize:24,fontWeight:700,color:s.color,fontFamily:'var(--font-mono)'}}>{s.value}</div>
            <div style={{fontSize:11,color:'var(--muted)',marginTop:4,textTransform:'uppercase',letterSpacing:'0.05em'}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Log form */}
      {showForm && (
        <div className="card fade-up" style={{marginBottom:16,padding:20}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:14}}>Log a Meeting</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:10}}>
            <div>
              <div style={{fontSize:10,color:'var(--muted)',marginBottom:3,fontWeight:600}}>CAMPAIGN</div>
              <select className="input" style={{fontSize:12}} value={form.campaignId} onChange={e => setForm(f => ({...f, campaignId: e.target.value}))}>
                <option value="">Select campaign</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:10,color:'var(--muted)',marginBottom:3,fontWeight:600}}>LEAD ID</div>
              <input className="input" style={{fontSize:12}} type="number" placeholder="Lead ID" value={form.leadId} onChange={e => setForm(f => ({...f, leadId: e.target.value}))} />
            </div>
            <div>
              <div style={{fontSize:10,color:'var(--muted)',marginBottom:3,fontWeight:600}}>MEETING DATE</div>
              <input className="input" style={{fontSize:12}} type="date" value={form.meetingDate} onChange={e => setForm(f => ({...f, meetingDate: e.target.value}))} />
            </div>
            <div>
              <div style={{fontSize:10,color:'var(--muted)',marginBottom:3,fontWeight:600}}>TYPE</div>
              <select className="input" style={{fontSize:12}} value={form.meetingType} onChange={e => setForm(f => ({...f, meetingType: e.target.value}))}>
                {['discovery','follow-up','demo','close'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <div style={{fontSize:10,color:'var(--muted)',marginBottom:3,fontWeight:600}}>OUTCOME</div>
              <input className="input" style={{fontSize:12}} placeholder="e.g. Interested, follow up next week" value={form.outcome} onChange={e => setForm(f => ({...f, outcome: e.target.value}))} />
            </div>
            <div>
              <div style={{fontSize:10,color:'var(--muted)',marginBottom:3,fontWeight:600}}>REVENUE (RM)</div>
              <input className="input" style={{fontSize:12}} type="number" placeholder="0" value={form.revenue} onChange={e => setForm(f => ({...f, revenue: e.target.value}))} />
            </div>
          </div>
          <button className="btn btn-green btn-sm" disabled={saving} onClick={saveMeeting}>
            {saving ? 'Saving…' : 'Log Meeting'}
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{textAlign:'center',padding:40,color:'var(--muted)',fontSize:13}}>Loading...</div>
      ) : meetings.length === 0 ? (
        <div className="card" style={{textAlign:'center',padding:'48px 24px'}}>
          <div style={{fontSize:24,marginBottom:8,color:'var(--border)'}}>◎</div>
          <div style={{fontWeight:600,fontSize:14,marginBottom:6}}>No meetings logged yet</div>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>Start campaigns and track booked meetings here.</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setPage('campaigns')}>View Campaigns →</button>
        </div>
      ) : (
        <div className="card fade-up-1" style={{overflow:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--border)'}}>
                {['Lead','Campaign','Date','Type','Outcome','Revenue','Status'].map(h => (
                  <th key={h} style={{textAlign:'left',fontSize:10,color:'var(--muted)',fontWeight:600,padding:'0 12px 10px',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {meetings.map(m => {
                const isClosed = !!(m.closedAt || m.revenue);
                const isPast = m.meetingDate && new Date(m.meetingDate) < new Date();
                const statusLabel = isClosed ? 'Closed' : isPast ? 'Completed' : 'Booked';
                const statusColor = isClosed ? 'var(--green)' : isPast ? 'var(--blue)' : 'var(--amber)';
                return (
                  <tr key={m.id} style={{borderBottom:'1px solid var(--border)'}}>
                    <td style={{padding:'10px 12px',fontSize:12,color:'var(--text)'}}>Lead #{m.leadId}</td>
                    <td style={{padding:'10px 12px',fontSize:11,color:'var(--muted)'}}>{campaigns.find(c=>c.id===m.campaignId)?.name || `#${m.campaignId}`}</td>
                    <td style={{padding:'10px 12px',fontSize:12,fontFamily:'var(--font-mono)',color:'var(--text)'}}>{formatDate(m.meetingDate)}</td>
                    <td style={{padding:'10px 12px',fontSize:11,color:'var(--muted)',textTransform:'capitalize'}}>{m.meetingType}</td>
                    <td style={{padding:'10px 12px',fontSize:11,color:'var(--text)',maxWidth:200}}>{m.outcome || '—'}</td>
                    <td style={{padding:'10px 12px',fontSize:12,fontFamily:'var(--font-mono)',color:m.revenue?'var(--green)':'var(--muted)'}}>
                      {m.revenue ? `RM ${Number(m.revenue).toLocaleString()}` : '—'}
                    </td>
                    <td style={{padding:'10px 12px'}}>
                      <span style={{fontSize:10,background:`oklch(from ${statusColor} l c h / 0.12)`,color:statusColor,borderRadius:4,padding:'2px 8px',fontWeight:600}}>{statusLabel}</span>
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
