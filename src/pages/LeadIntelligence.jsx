import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { leadsService } from '../services/leads.js';

const PAGE_SIZE = 25;

const TABS = [
  { key: 'all',    label: 'All' },
  { key: 'tierA',  label: 'Tier A' },
  { key: 'tierB',  label: 'Tier B' },
  { key: 'email',  label: 'Email Ready' },
  { key: 'wa',     label: 'WA Ready' },
  { key: 'voice',  label: 'Voice Ready' },
  { key: 'hot',    label: 'Hot' },
];

function tabFilter(tab, l) {
  switch (tab) {
    case 'all':   return true;
    case 'tierA': return l.tier === 'A';
    case 'tierB': return l.tier === 'B';
    case 'email': return l.emailEligible === true;
    case 'wa':    return l.waEligible === true;
    case 'voice': return l.voiceEligible === true;
    case 'hot':   return l.tier === 'A' || l.status === 'hot';
    default:      return true;
  }
}

function TierBadge({ tier }) {
  if (!tier) return <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>;
  const bg = tier === 'A' ? 'var(--green)' : tier === 'B' ? 'var(--amber)' : 'var(--muted)';
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', borderRadius: 4, padding: '2px 7px', background: bg }}>
      {tier}
    </span>
  );
}

function ChannelBadges({ l }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {l.emailEligible && (
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--blue)', background: 'oklch(62% 0.19 245 / 0.12)', borderRadius: 3, padding: '1px 5px' }}>E</span>
      )}
      {l.waEligible && (
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--green)', background: 'oklch(70% 0.18 145 / 0.12)', borderRadius: 3, padding: '1px 5px' }}>W</span>
      )}
      {l.voiceEligible && (
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--amber)', background: 'oklch(75% 0.18 70 / 0.12)', borderRadius: 3, padding: '1px 5px' }}>V</span>
      )}
      {!l.emailEligible && !l.waEligible && !l.voiceEligible && (
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>
      )}
    </div>
  );
}

export function LeadIntelligence() {
  const { leads, campaigns, selectedBizId } = useAppStore(useShallow(s => ({
    leads:         s.leads,
    campaigns:     s.campaigns,
    selectedBizId: s.selectedBizId,
  })));

  const [tab, setTab]                       = useState('all');
  const [search, setSearch]                 = useState('');
  const [campaignFilter, setCampaignFilter] = useState('All');
  const [page, setPage]                     = useState(0);

  useEffect(() => { setPage(0); }, [tab, search, campaignFilter, selectedBizId]);

  // Score distribution
  const tierA = leads.filter(l => l.tier === 'A').length;
  const tierB = leads.filter(l => l.tier === 'B').length;
  const tierC = leads.filter(l => l.tier === 'C' || (!l.tier && leads.length > 0)).length;
  const total = leads.length || 1;

  const emailReady = leads.filter(l => l.emailEligible === true).length;
  const waReady    = leads.filter(l => l.waEligible === true).length;
  const hot        = leads.filter(l => l.tier === 'A' || l.status === 'hot').length;

  const campaignMap = {};
  campaigns.forEach(c => { campaignMap[c.id] = c; });
  const activeCampaignIds = [...new Set(leads.map(l => l.campaignId).filter(Boolean))];
  const leadCampaigns     = activeCampaignIds.map(id => campaignMap[id]).filter(Boolean);

  const filtered = leads.filter(l => {
    const lBizId = l.bizId || campaigns.find(c => c.id === l.campaignId)?.bizId;
    return (
      (!selectedBizId || lBizId === selectedBizId) &&
      (campaignFilter === 'All' || String(l.campaignId) === campaignFilter) &&
      tabFilter(tab, l) &&
      (search === '' ||
        (l.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.company || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.phone || '').includes(search) ||
        (l.email || '').toLowerCase().includes(search.toLowerCase()))
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged      = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleExport() {
    leadsService.exportCSV(filtered);
  }

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

  const stats = [
    { label: 'Total Leads',  value: leads.length,  color: 'var(--text)' },
    { label: 'Tier A',       value: tierA,          color: 'var(--green)' },
    { label: 'Email Ready',  value: emailReady,     color: 'var(--blue)' },
    { label: 'WA Ready',     value: waReady,        color: 'var(--green)' },
    { label: 'Hot',          value: hot,            color: 'var(--amber)' },
  ];

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-4 fade-up">
        <div>
          <h1 className="page-title">Lead Intelligence</h1>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Enriched profiles, tier scores, and channel eligibility</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleExport}>⬇ Export CSV</button>
      </div>

      {/* Score distribution bar */}
      <div className="card fade-up" style={{ padding: '14px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score Distribution</div>
        <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', gap: 2 }}>
          {tierA > 0 && (
            <div style={{ flex: tierA, background: 'var(--green)', borderRadius: 4, minWidth: 4 }} title={`Tier A: ${tierA}`} />
          )}
          {tierB > 0 && (
            <div style={{ flex: tierB, background: 'var(--amber)', borderRadius: 4, minWidth: 4 }} title={`Tier B: ${tierB}`} />
          )}
          {tierC > 0 && (
            <div style={{ flex: Math.max(tierC, 1), background: 'var(--border)', borderRadius: 4, minWidth: 4 }} title={`Tier C / Unscored: ${tierC}`} />
          )}
          {leads.length === 0 && (
            <div style={{ flex: 1, background: 'var(--s2)', borderRadius: 4 }} />
          )}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--green)' }}>A: {tierA} ({Math.round((tierA / total) * 100)}%)</span>
          <span style={{ fontSize: 11, color: 'var(--amber)' }}>B: {tierB} ({Math.round((tierB / total) * 100)}%)</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>C/Other: {tierC} ({Math.round((tierC / total) * 100)}%)</span>
        </div>
      </div>

      {/* 5 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 16 }} className="fade-up">
        {stats.map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="fade-up-1" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          className="input"
          style={{ maxWidth: 220 }}
          placeholder="Search name, company, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {leadCampaigns.length > 1 && (
          <select
            className="input"
            style={{ fontSize: 12, maxWidth: 200 }}
            value={campaignFilter}
            onChange={e => setCampaignFilter(e.target.value)}
          >
            <option value="All">All Campaigns</option>
            {leadCampaigns.map(c => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 0 }} className="fade-up-1">
        {TABS.map(t => {
          const count = leads.filter(l => tabFilter(t.key, l)).length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: tab === t.key ? 600 : 400,
                color: tab === t.key ? 'var(--blue)' : 'var(--muted)',
                background: 'transparent',
                border: 'none',
                borderBottom: tab === t.key ? '2px solid var(--blue)' : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: -1,
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
              {t.key !== 'all' && count > 0 && (
                <span style={{ marginLeft: 5, fontSize: 10, background: 'var(--s2)', borderRadius: 8, padding: '1px 6px', color: 'var(--muted)' }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="card fade-up-2" style={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Name / Company', 'Title', 'Tier', 'AI Score', 'Channels', 'Enriched', 'Personalized', 'Status', 'Last'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 10, color: 'var(--muted)', fontWeight: 600, padding: '0 12px 10px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{l.name}</div>
                    {l.company && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{l.company}</div>}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.title || '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <TierBadge tier={l.tier} />
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {l.aiScore != null ? (
                      <span style={{
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: 'var(--font-mono)',
                        color: l.aiScore >= 70 ? 'var(--green)' : l.aiScore >= 40 ? 'var(--amber)' : 'var(--muted)',
                      }}>
                        {l.aiScore}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <ChannelBadges l={l} />
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: l.enriched ? 'var(--green)' : 'var(--border)',
                    }} title={l.enriched ? 'Enriched' : 'Not enriched'} />
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: l.personalized ? 'var(--green)' : 'var(--muted)' }}>
                    {l.personalized ? '✦' : '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {l.status ? (
                      <span style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontWeight: 600,
                        background: l.status === 'hot' ? 'oklch(75% 0.18 70 / 0.15)' : 'var(--s2)',
                        color: l.status === 'hot' ? 'var(--amber)' : 'var(--muted)',
                        border: '1px solid var(--border)',
                        textTransform: 'capitalize',
                        whiteSpace: 'nowrap',
                      }}>
                        {l.status.replace(/_/g, ' ')}
                      </span>
                    ) : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {l.last ? timeAgo(l.last) : '—'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)', padding: 40, fontSize: 13 }}>
                    {leads.length === 0 ? 'No leads yet — create a campaign and scrape some leads' : 'No leads match your filters'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11 }}
                onClick={() => { setTab('all'); setSearch(''); setCampaignFilter('All'); }}
              >
                Clear filters
              </button>
            )}
            {totalPages > 1 && (
              <>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{page + 1} / {totalPages}</span>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
