import { useState, useEffect } from 'react';

const PAGE_SIZE = 25;
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { LeadStatusBadge } from '../components/ui/LeadStatusBadge.jsx';
import { ScoreDisplay } from '../components/ui/ScoreDisplay.jsx';
import { LeadSlideOver } from '../components/leads/LeadSlideOver.jsx';
import { leadsService } from '../services/leads.js';
import { apiFetch } from '../services/api.js';

const STATUS_TABS = [
  { key: 'All',              label: 'All' },
  { key: 'new',              label: 'New' },
  { key: 'wa_sent',          label: '💬 WA Sent' },
  { key: 'email_sent',       label: '📧 Email Sent' },
  { key: 'call_initiated',   label: '📞 Called' },
  { key: 'replied',          label: 'Replied' },
  { key: 'hot',              label: '🔥 Hot' },
  { key: 'meeting_booked',   label: 'Meeting' },
  { key: 'bounced',          label: 'Bounced' },
  { key: 'unsubscribed',     label: 'Unsub' },
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

export function LeadManager() {
  const { leads, campaigns, updateLead, bulkUpdateLeads, selectedBizId, setSelectedBiz, businesses, showToast } = useAppStore(useShallow(s => ({
    leads: s.leads,
    campaigns: s.campaigns,
    updateLead: s.updateLead,
    bulkUpdateLeads: s.bulkUpdateLeads,
    selectedBizId: s.selectedBizId,
    setSelectedBiz: s.setSelectedBiz,
    businesses: s.businesses,
    showToast: s.showToast,
  })));

  const selectedBiz = businesses.find(b => b.id === selectedBizId);

  const [selected, setSelected]         = useState([]);
  const [slideOver, setSlideOver]       = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [scoreFilter, setScoreFilter]   = useState('All');
  const [campaignFilter, setCampaignFilter] = useState('All');
  const [search, setSearch]             = useState('');
  const [callingId, setCallingId]       = useState(null);
  const [page, setPage]                 = useState(0);

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

  // Reset to page 0 whenever filters change
  useEffect(() => { setPage(0); }, [statusFilter, scoreFilter, campaignFilter, search, selectedBizId]);

  const toggle    = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = ()   => setSelected(s => s.length === filtered.length ? [] : filtered.map(l => l.id));

  const filtered = leads.filter(l =>
    (!selectedBizId || l.bizId === selectedBizId) &&
    (statusFilter === 'All'   || l.status === statusFilter) &&
    (scoreFilter  === 'All'   || l.scoreLabel === scoreFilter) &&
    (campaignFilter === 'All' || String(l.campaignId) === campaignFilter) &&
    (search === '' ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.company.toLowerCase().includes(search.toLowerCase()) ||
      (l.phone || '').includes(search) ||
      (l.email || '').toLowerCase().includes(search.toLowerCase()))
  );

  const rowStyle = (l) => {
    if (l.status === 'bounced')      return { borderLeft: '2px solid var(--red)', background: 'oklch(55% 0.22 25 / 0.04)' };
    if (l.status === 'unsubscribed') return { opacity: 0.45 };
    if (l.status === 'low_quality')  return { opacity: 0.35 };
    return {};
  };

  const stats = [
    { label: 'Total Leads', val: leads.length.toLocaleString(), color: 'text' },
    { label: 'Hot Leads',   val: leads.filter(l => l.status === 'hot').length,             color: 'amber' },
    { label: 'Meetings',    val: leads.filter(l => l.status === 'meeting_booked').length,   color: 'green' },
    { label: 'Replied',     val: leads.filter(l => l.status === 'replied').length,          color: 'cyan' },
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
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Build campaign lookup map
  const campaignMap = {};
  campaigns.forEach(c => { campaignMap[c.id] = c; });

  // Campaigns that have at least one lead (for filter dropdown)
  const activeCampaignIds = [...new Set(leads.map(l => l.campaignId).filter(Boolean))];
  const leadCampaigns = activeCampaignIds.map(id => campaignMap[id]).filter(Boolean);

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
        <button className="btn btn-ghost btn-sm" onClick={handleExport}>⬇ Export CSV</button>
      </div>

      {/* Stats */}
      <div className="grid-4 mb-4 fade-up-1">
        {stats.map(s => (
          <div key={s.label} className="card-sm" style={{ textAlign: 'center' }}>
            <div className="mono" style={{ fontSize: 22, fontWeight: 500, color: s.color === 'text' ? 'var(--text)' : `var(--${s.color})` }}>{s.val}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="fade-up-2" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="input" style={{ maxWidth: 220 }}
            placeholder="Search name, company, phone, email…"
            value={search} onChange={e => setSearch(e.target.value)}
          />

          {/* Campaign filter */}
          {leadCampaigns.length > 1 && (
            <select
              value={campaignFilter}
              onChange={e => setCampaignFilter(e.target.value)}
              style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text-1)', padding: '6px 10px', borderRadius: 6, fontSize: 12 }}
            >
              <option value="All">All Campaigns</option>
              {leadCampaigns.map(c => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          )}

          {/* Score filter */}
          <div className="tabs">
            {['All', 'High', 'Medium', 'Low'].map(s => (
              <div key={s} className={`tab${scoreFilter === s ? ' active' : ''}`} style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setScoreFilter(s)}>{s}</div>
            ))}
          </div>
        </div>

        {/* Status filter */}
        <div className="tabs" style={{ flexWrap: 'wrap', gap: 4 }}>
          {STATUS_TABS.map(({ key, label }) => {
            const count = key === 'All' ? null : leads.filter(l => l.status === key).length;
            return (
              <div key={key} className={`tab${statusFilter === key ? ' active' : ''}`}
                style={{ fontSize: 11, padding: '4px 10px' }}
                onClick={() => setStatusFilter(key)}>
                {label}
                {count != null && count > 0 && (
                  <span style={{ marginLeft: 4, fontSize: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '0 5px' }}>{count}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.length > 0 && (
        <div style={{ background: 'var(--blue-dim)', border: '1px solid oklch(62% 0.19 245 / 0.3)', borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, animation: 'fadeUp 0.2s ease both' }}>
          <span style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 500 }}>{selected.length} leads selected</span>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-xs" onClick={handleExport}>⬇ Export</button>
          <button className="btn btn-ghost btn-xs" onClick={() => handleBulkStatus('email_sent')}>📧 Mark Emailed</button>
          <button className="btn btn-ghost btn-xs" onClick={() => handleBulkStatus('wa_sent')}>💬 Mark WA'd</button>
          <button className="btn btn-ghost btn-xs" onClick={() => handleBulkStatus('call_initiated')}>📞 Mark Called</button>
          <button className="btn btn-danger btn-xs" onClick={() => handleBulkStatus('unsubscribed')}>Unsub</button>
          <button className="btn btn-ghost btn-xs" onClick={() => setSelected([])}>✕</button>
        </div>
      )}

      {/* Table */}
      <div className="card fade-up-3" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} style={{ accentColor: 'var(--blue)' }} />
                </th>
                <th>Lead</th>
                <th>Company &amp; Campaign</th>
                <th>Email</th>
                <th>Score</th>
                <th>Status</th>
                <th>Enriched</th>
                <th>Lang</th>
                <th>Last Action</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.map(l => {
                const campaign = l.campaignId ? campaignMap[l.campaignId] : null;
                const actionIcon = LAST_ACTION_ICON[l.status] || '·';
                return (
                  <tr key={l.id} style={{ cursor: 'pointer', ...rowStyle(l) }} onClick={() => setSlideOver(l)}>
                    <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggle(l.id)} style={{ accentColor: 'var(--blue)' }} />
                    </td>

                    {/* Lead: name + title + phone */}
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

                    {/* Company + campaign badge */}
                    <td>
                      <div style={{ fontSize: 13 }}>{l.company}</div>
                      {campaign && (
                        <div style={{ marginTop: 3 }}>
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: `var(--${campaign.color || 'blue'}-dim, rgba(0,120,255,0.1))`, color: `var(--${campaign.color || 'blue'})`, border: `1px solid var(--${campaign.color || 'blue'}-dim, rgba(0,120,255,0.2))`, fontWeight: 500 }}>
                            {campaign.name}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Email */}
                    <td style={{ fontSize: 12, color: l.email ? 'var(--text-1)' : 'var(--muted)', fontFamily: l.email ? 'var(--font-mono)' : 'inherit', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.email || '—'}
                    </td>

                    {/* Score */}
                    <td><ScoreDisplay score={l.score} /></td>

                    {/* Status */}
                    <td><LeadStatusBadge status={l.status} /></td>

                    {/* Enriched */}
                    <td>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 600, background: l.enriched ? 'rgba(0,120,255,0.1)' : 'var(--bg-2)', color: l.enriched ? 'var(--blue)' : 'var(--muted)', border: `1px solid ${l.enriched ? 'rgba(0,120,255,0.3)' : 'var(--border)'}` }}>
                        {l.enriched ? 'Enriched' : 'Raw'}
                      </span>
                    </td>

                    {/* Lang */}
                    <td><span className={`badge ${l.lang === 'BM' ? 'purple' : 'blue'}`}>{l.lang}</span></td>

                    {/* Last Action */}
                    <td>
                      <span className="mono text-xs" style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {actionIcon} {l.last}
                      </span>
                    </td>

                    {/* Actions */}
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
                  <td colSpan={10} style={{ textAlign: 'center', color: 'var(--muted)', padding: 40, fontSize: 13 }}>
                    {leads.length === 0 ? 'No leads yet — create a campaign and scrape some leads' : 'No leads match your filters'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>
            {filtered.length === 0 ? 'No leads' : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length} leads`}
            {filtered.length !== leads.length && ` (${leads.length} total)`}
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {filtered.length !== leads.length && (
              <button className="btn btn-ghost btn-xs" onClick={() => { setStatusFilter('All'); setScoreFilter('All'); setCampaignFilter('All'); setSearch(''); }}>
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
    </div>
  );
}
