import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { LeadStatusBadge } from '../components/ui/LeadStatusBadge.jsx';
import { ScoreDisplay } from '../components/ui/ScoreDisplay.jsx';
import { LeadSlideOver } from '../components/leads/LeadSlideOver.jsx';
import { Select } from '../components/ui/Select.jsx';
import { leadsService, calculateScoreLabel } from '../services/leads.js';
import { apiFetch } from '../services/api.js';

const PAGE_SIZE = 25;

const STATUS_TABS = [
  { key: 'All',            label: 'All' },
  { key: 'new',            label: 'New' },
  { key: 'wa_sent',        label: '💬 WA Sent' },
  { key: 'email_sent',     label: '📧 Email Sent' },
  { key: 'call_initiated', label: '📞 Called' },
  { key: 'replied',        label: 'Replied' },
  { key: 'hot',            label: '🔥 Hot' },
  { key: 'meeting_booked', label: 'Meeting' },
  { key: 'bounced',        label: 'Bounced' },
  { key: 'unsubscribed',   label: 'Unsub' },
];

const LAST_ACTION_ICON = {
  wa_sent:        '💬',
  email_sent:     '📧',
  call_initiated: '📞',
  replied:        '↩',
  hot:            '🔥',
  meeting_booked: '📅',
  bounced:        '✗',
  unsubscribed:   '∅',
  new:            '·',
};

const ACT_NOW_STATUSES   = new Set(['hot', 'meeting_booked', 'replied']);
const FOLLOW_UP_STATUSES = new Set(['email_sent', 'wa_sent', 'call_initiated']);

function getAiBucket(l) {
  const s = l.aiPriorityScore;
  if (s >= 70 || ACT_NOW_STATUSES.has(l.status))                      return 'act';
  if ((s >= 40 && s < 70) || FOLLOW_UP_STATUSES.has(l.status))        return 'follow';
  return 'monitor';
}

function AiScoreCell({ score, note }) {
  if (score == null) return <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>;
  const color = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--amber)' : 'var(--muted)';
  return (
    <span
      title={note || undefined}
      style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color, cursor: note ? 'help' : 'default' }}
    >
      {score}
    </span>
  );
}

function TriageCard({ lead, onClick }) {
  const score = lead.aiPriorityScore;
  const scoreColor = score >= 70 ? 'var(--green)' : score >= 40 ? 'var(--amber)' : 'var(--muted)';
  return (
    <div
      onClick={() => onClick(lead)}
      style={{
        background: 'var(--s1)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '10px 12px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--blue)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{lead.name}</div>
        {score != null && (
          <span
            title={lead.aiPriorityNote || undefined}
            style={{ fontSize: 10, fontWeight: 700, color: scoreColor, fontFamily: 'var(--font-mono)', flexShrink: 0 }}
          >
            {score}
          </span>
        )}
      </div>
      {lead.company && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{lead.company}</div>}
      {lead.title && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{lead.title}</div>}
      <div style={{ marginTop: 2 }}>
        <LeadStatusBadge status={lead.status} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
        {lead.phone && (
          <a
            href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ fontSize: 10, color: 'var(--blue)', textDecoration: 'none' }}
          >
            💬 {lead.phone}
          </a>
        )}
        {lead.email && (
          <a
            href={`mailto:${lead.email}`}
            onClick={e => e.stopPropagation()}
            style={{
              fontSize: 10,
              color: 'var(--blue)',
              textDecoration: 'none',
              maxWidth: 140,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'inline-block',
            }}
          >
            {lead.email}
          </a>
        )}
      </div>
    </div>
  );
}

export function LeadManager() {
  const { leads, campaigns, updateLead, bulkUpdateLeads, selectedBizId, setSelectedBiz, businesses, showToast, init } = useAppStore(useShallow(s => ({
    leads:           s.leads,
    campaigns:       s.campaigns,
    updateLead:      s.updateLead,
    bulkUpdateLeads: s.bulkUpdateLeads,
    selectedBizId:   s.selectedBizId,
    setSelectedBiz:  s.setSelectedBiz,
    businesses:      s.businesses,
    showToast:       s.showToast,
    init:            s.init,
  })));

  const selectedBiz = businesses.find(b => b.id === selectedBizId);

  const [selected, setSelected]             = useState([]);
  const [slideOver, setSlideOver]           = useState(null);
  const [statusFilter, setStatusFilter]     = useState('All');
  const [scoreFilter, setScoreFilter]       = useState('All');
  const [tierFilter, setTierFilter]         = useState('All');
  const [campaignFilter, setCampaignFilter] = useState('All');
  const [search, setSearch]                 = useState('');
  const [callingId, setCallingId]           = useState(null);
  const [page, setPage]                     = useState(0);
  const [viewMode, setViewMode]             = useState('table');
  const [prioritizing, setPrioritizing]     = useState(false);

  const handleVoiceCall = async (e, lead) => {
    e.stopPropagation();
    setCallingId(lead.id);
    try {
      const result = await apiFetch('/voice/call', { method: 'POST', body: { leadId: lead.id } });
      showToast(`Call placed to ${lead.name} (ID: ${result.callId})`, 'green');
    } catch (err) {
      showToast(err.message || 'Failed to place call', 'red');
    } finally {
      setCallingId(null);
    }
  };

  const handlePrioritize = async (leadIds) => {
    setPrioritizing(true);
    try {
      const body = { campaignId: parseInt(campaignFilter) || undefined };
      if (leadIds && leadIds.length > 0) body.leadIds = leadIds;
      await apiFetch('/ai/prioritize-leads', { method: 'POST', body });
      if (init) {
        await init();
        showToast('Leads prioritized', 'green');
      } else {
        showToast('Refresh the page to see updated scores', 'amber');
      }
    } catch (err) {
      showToast(err.message || 'Prioritization failed', 'red');
    } finally {
      setPrioritizing(false);
    }
  };

  useEffect(() => { setPage(0); }, [statusFilter, scoreFilter, tierFilter, campaignFilter, search, selectedBizId]);

  const toggle    = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = ()   => setSelected(s => s.length === filtered.length ? [] : filtered.map(l => l.id));

  const filtered = leads.filter(l => {
    const lBizId      = l.bizId || campaigns.find(c => c.id === l.campaignId)?.bizId;
    const lScoreLabel = calculateScoreLabel(l);
    return (
      (!selectedBizId || lBizId === selectedBizId) &&
      (statusFilter   === 'All' || l.status === statusFilter) &&
      (scoreFilter    === 'All' || lScoreLabel === scoreFilter) &&
      (tierFilter     === 'All' || l.tier === tierFilter) &&
      (campaignFilter === 'All' || String(l.campaignId) === campaignFilter) &&
      (search === '' ||
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.company.toLowerCase().includes(search.toLowerCase()) ||
        (l.phone || '').includes(search) ||
        (l.email || '').toLowerCase().includes(search.toLowerCase()))
    );
  });

  const rowStyle = (l) => {
    if (l.status === 'bounced')      return { borderLeft: '2px solid var(--red)', background: 'oklch(55% 0.22 25 / 0.04)' };
    if (l.status === 'unsubscribed') return { opacity: 0.45 };
    if (l.status === 'low_quality')  return { opacity: 0.35 };
    return {};
  };

  const tierACount = leads.filter(l => l.tier === 'A').length;
  const personalizedCount = leads.filter(l => l.personalized).length;

  const stats = [
    { label: 'Total Leads',  val: leads.length.toLocaleString(), color: 'text' },
    { label: 'Tier A',       val: tierACount,                    color: 'green' },
    { label: 'Hot Leads',    val: leads.filter(l => l.status === 'hot').length, color: 'amber' },
    { label: 'Personalised', val: personalizedCount,             color: 'blue' },
  ];

  const handleExport = () => {
    const toExport = selected.length > 0 ? leads.filter(l => selected.includes(l.id)) : filtered;
    leadsService.exportCSV(toExport);
  };

  const handleBulkStatus = (status) => {
    bulkUpdateLeads(selected, { status });
    setSelected([]);
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged      = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const campaignMap = {};
  campaigns.forEach(c => { campaignMap[c.id] = c; });

  const activeCampaignIds = [...new Set(leads.map(l => l.campaignId).filter(Boolean))];
  const leadCampaigns     = activeCampaignIds.map(id => campaignMap[id]).filter(Boolean);

  const actNow   = filtered.filter(l => getAiBucket(l) === 'act');
  const followUp = filtered.filter(l => getAiBucket(l) === 'follow');
  const monitor  = filtered.filter(l => getAiBucket(l) === 'monitor');

  const triage_buckets = [
    { key: 'act',     label: 'Act Now',    count: actNow.length,   color: 'var(--green)', leads: actNow,   statusKey: 'hot' },
    { key: 'follow',  label: 'Follow Up',  count: followUp.length, color: 'var(--amber)', leads: followUp, statusKey: 'email_sent' },
    { key: 'monitor', label: 'Monitoring', count: monitor.length,  color: 'var(--muted)', leads: monitor,  statusKey: 'All' },
  ];

  return (
    <div className="page">
      {slideOver && <LeadSlideOver lead={slideOver} onClose={() => setSlideOver(null)} />}

      <div className="flex items-center justify-between mb-3 fade-up">
        <div>
          <div className="breadcrumb">Campaigns / <span>Lead Manager</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <h1 className="page-title">{selectedBiz ? selectedBiz.name : 'All Leads'}</h1>
            {selectedBiz && (
              <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={() => setSelectedBiz(null)}>✕ Clear filter</button>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '5px 12px',
                fontSize: 12,
                background: viewMode === 'table' ? 'var(--blue)' : 'transparent',
                color: viewMode === 'table' ? '#fff' : 'var(--muted)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: viewMode === 'table' ? 600 : 400,
              }}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('triage')}
              style={{
                padding: '5px 12px',
                fontSize: 12,
                background: viewMode === 'triage' ? 'var(--blue)' : 'transparent',
                color: viewMode === 'triage' ? '#fff' : 'var(--muted)',
                border: 'none',
                borderLeft: '1px solid var(--border)',
                cursor: 'pointer',
                fontWeight: viewMode === 'triage' ? 600 : 400,
              }}
            >
              Triage
            </button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleExport}>⬇ Export CSV</button>
        </div>
      </div>

      <div className="grid-4 mb-4 fade-up-1">
        {stats.map(s => (
          <div key={s.label} className="card-sm" style={{ textAlign: 'center' }}>
            <div className="mono" style={{ fontSize: 22, fontWeight: 500, color: s.color === 'text' ? 'var(--text)' : `var(--${s.color})` }}>{s.val}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="fade-up-2" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {triage_buckets.map(b => (
          <div
            key={b.key}
            onClick={() => setStatusFilter(b.statusKey)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              background: 'var(--s1)',
              border: `1px solid ${b.color}`,
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'background 0.15s',
              flex: '1 1 0',
              minWidth: 140,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--s2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--s1)'}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: b.color }}>{b.label}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: b.color, marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>{b.count}</span>
          </div>
        ))}
        <button
          className="btn btn-sm"
          disabled={prioritizing}
          onClick={() => handlePrioritize(null)}
          style={{ background: 'var(--blue)', color: '#fff', border: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          {prioritizing
            ? <span style={{ display: 'inline-block', animation: 'spin 0.8s linear infinite' }}>◌</span>
            : '⚡'
          } AI Prioritize
        </button>
      </div>

      <div className="fade-up-2" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="input"
            style={{ maxWidth: 220 }}
            placeholder="Search name, company, phone, email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {leadCampaigns.length > 1 && (
            <Select
              value={campaignFilter}
              onChange={v => setCampaignFilter(v)}
              options={[{ value: 'All', label: 'All Campaigns' }, ...leadCampaigns.map(c => ({ value: String(c.id), label: c.name }))]}
              style={{ background: 'var(--s1)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 10px', borderRadius: 6, fontSize: 12 }}
            />
          )}

          <div className="tabs">
            {['All', 'High', 'Medium', 'Low'].map(s => (
              <div key={s} className={`tab${scoreFilter === s ? ' active' : ''}`} style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setScoreFilter(s)}>
                {s}
              </div>
            ))}
          </div>
          <div className="tabs">
            {[
              { key:'All', label:'All Tiers' },
              { key:'A', label:'A — Hot' },
              { key:'B', label:'B — Good' },
              { key:'C', label:'C — Low' },
            ].map(t => (
              <div
                key={t.key}
                className={`tab${tierFilter === t.key ? ' active' : ''}`}
                style={{ fontSize: 11, padding: '4px 10px', color: tierFilter === t.key ? undefined : t.key==='A'?'var(--green)':t.key==='B'?'var(--amber)':t.key==='C'?'var(--muted)':undefined }}
                onClick={() => setTierFilter(t.key)}
              >
                {t.label}
              </div>
            ))}
          </div>
        </div>

        <div className="tabs" style={{ flexWrap: 'wrap', gap: 4 }}>
          {STATUS_TABS.map(({ key, label }) => {
            const count = key === 'All' ? null : leads.filter(l => l.status === key).length;
            return (
              <div
                key={key}
                className={`tab${statusFilter === key ? ' active' : ''}`}
                style={{ fontSize: 11, padding: '4px 10px' }}
                onClick={() => setStatusFilter(key)}
              >
                {label}
                {count != null && count > 0 && (
                  <span style={{ marginLeft: 4, fontSize: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '0 5px' }}>{count}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selected.length > 0 && (
        <div style={{
          background: 'var(--blue-dim)',
          border: '1px solid oklch(62% 0.19 245 / 0.3)',
          borderRadius: 8,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
          animation: 'fadeUp 0.2s ease both',
        }}>
          <span style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 500 }}>{selected.length} leads selected</span>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-xs" onClick={handleExport}>⬇ Export</button>
          <button
            className="btn btn-ghost btn-xs"
            disabled={prioritizing}
            onClick={() => handlePrioritize(selected)}
          >
            {prioritizing ? '◌' : '⚡'} AI Prioritize
          </button>
          <button className="btn btn-ghost btn-xs" onClick={() => handleBulkStatus('email_sent')}>📧 Mark Emailed</button>
          <button className="btn btn-ghost btn-xs" onClick={() => handleBulkStatus('wa_sent')}>💬 Mark WA'd</button>
          <button className="btn btn-ghost btn-xs" onClick={() => handleBulkStatus('call_initiated')}>📞 Mark Called</button>
          <button className="btn btn-danger btn-xs" onClick={() => handleBulkStatus('unsubscribed')}>Unsub</button>
          <button className="btn btn-ghost btn-xs" onClick={() => setSelected([])}>✕</button>
        </div>
      )}

      {viewMode === 'triage' ? (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          {triage_buckets.map(b => (
            <div
              key={b.key}
              className="card"
              style={{ flex: 1, minWidth: 240, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: b.color }}>{b.label}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                  {b.count > 30 ? `30 / ${b.count}` : b.count}
                </span>
              </div>
              {b.leads.slice(0, 30).map(l => (
                <TriageCard key={l.id} lead={l} onClick={setSlideOver} />
              ))}
              {b.count > 30 && (
                <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', padding: '6px 0' }}>
                  + {b.count - 30} more — use filters to narrow
                </div>
              )}
              {b.count === 0 && (
                <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', padding: '20px 0' }}>No leads</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card fade-up-3" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={selected.length === filtered.length && filtered.length > 0}
                      onChange={toggleAll}
                      style={{ accentColor: 'var(--blue)' }}
                    />
                  </th>
                  <th>Lead</th>
                  <th>Company &amp; Campaign</th>
                  <th>Email</th>
                  <th>Tier</th>
                  <th>Score</th>
                  <th>AI</th>
                  <th>Status</th>
                  <th>Enriched</th>
                  <th>Lang</th>
                  <th>Last Action</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paged.map(l => {
                  const campaign   = l.campaignId ? campaignMap[l.campaignId] : null;
                  const actionIcon = LAST_ACTION_ICON[l.status] || '·';
                  return (
                    <tr key={l.id} style={{ cursor: 'pointer', ...rowStyle(l) }} onClick={() => setSlideOver(l)}>
                      <td onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.includes(l.id)}
                          onChange={() => toggle(l.id)}
                          style={{ accentColor: 'var(--blue)' }}
                        />
                      </td>

                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13, textDecoration: l.status === 'unsubscribed' ? 'line-through' : 'none' }}>{l.name}</div>
                        {l.title && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{l.title}</div>}
                        {l.phone && (
                          <a
                            href={`https://wa.me/${l.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ fontSize: 11, color: 'var(--blue)', fontFamily: 'var(--font-mono)', marginTop: 1, textDecoration: 'none', display: 'block' }}
                          >
                            💬 {l.phone}
                          </a>
                        )}
                      </td>

                      <td>
                        <div style={{ fontSize: 13 }}>{l.company}</div>
                        {campaign && (
                          <div style={{ marginTop: 3 }}>
                            <span style={{
                              fontSize: 10,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: `var(--${campaign.color || 'blue'}-dim, rgba(0,120,255,0.1))`,
                              color: `var(--${campaign.color || 'blue'})`,
                              border: `1px solid var(--${campaign.color || 'blue'}-dim, rgba(0,120,255,0.2))`,
                              fontWeight: 500,
                            }}>
                              {campaign.name}
                            </span>
                          </div>
                        )}
                      </td>

                      <td style={{
                        fontSize: 12,
                        color: l.email ? 'var(--text-1)' : 'var(--muted)',
                        fontFamily: l.email ? 'var(--font-mono)' : 'inherit',
                        maxWidth: 180,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {l.email || '—'}
                      </td>

                      <td>
                        {l.tier ? (
                          <span style={{
                            fontSize:10,fontWeight:700,color:'#fff',borderRadius:4,padding:'2px 7px',
                            background: l.tier==='A' ? 'var(--green)' : l.tier==='B' ? 'var(--amber)' : 'var(--muted)',
                          }}>{l.tier}</span>
                        ) : <span style={{color:'var(--muted)',fontSize:12}}>—</span>}
                      </td>

                      <td><ScoreDisplay score={l.score} /></td>

                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          <AiScoreCell score={l.aiPriorityScore} note={l.aiPriorityNote} />
                          {l.personalized && <span title="AI personalised" style={{fontSize:9,color:'var(--green)',fontWeight:700}}>✦</span>}
                        </div>
                      </td>

                      <td><LeadStatusBadge status={l.status} /></td>

                      <td>
                        <span style={{
                          fontSize: 10,
                          padding: '2px 7px',
                          borderRadius: 4,
                          fontWeight: 600,
                          background: l.enriched ? 'rgba(0,120,255,0.1)' : 'var(--bg-2)',
                          color: l.enriched ? 'var(--blue)' : 'var(--muted)',
                          border: `1px solid ${l.enriched ? 'rgba(0,120,255,0.3)' : 'var(--border)'}`,
                        }}>
                          {l.enriched ? 'Enriched' : 'Raw'}
                        </span>
                      </td>

                      <td><span className={`badge ${l.lang === 'BM' ? 'purple' : 'blue'}`}>{l.lang}</span></td>

                      <td>
                        <span className="mono text-xs" style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                          {actionIcon} {l.last}
                        </span>
                      </td>

                      <td onClick={e => e.stopPropagation()}>
                        {l.phone && (
                          <button
                            className="btn btn-ghost btn-xs"
                            disabled={callingId === l.id}
                            onClick={e => handleVoiceCall(e, l)}
                            title={`Call ${l.phone}`}
                            style={{ fontSize: 11, whiteSpace: 'nowrap' }}
                          >
                            {callingId === l.id ? '◌' : '📞 Call'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', color: 'var(--muted)', padding: 40, fontSize: 13 }}>
                      {leads.length === 0 ? 'No leads yet — create a campaign and scrape some leads' : 'No leads match your filters'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>
              {filtered.length === 0
                ? 'No leads'
                : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length} leads`
              }
              {filtered.length !== leads.length && ` (${leads.length} total)`}
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {filtered.length !== leads.length && (
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => { setStatusFilter('All'); setScoreFilter('All'); setCampaignFilter('All'); setSearch(''); }}
                >
                  Clear filters
                </button>
              )}
              {totalPages > 1 && (
                <>
                  <button className="btn btn-ghost btn-xs" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
                  <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{page + 1} / {totalPages}</span>
                  <button className="btn btn-ghost btn-xs" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
