import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { leadsService } from '../services/leads.js';
import { ImportLeadsModal } from '../components/ui/ImportLeadsModal.jsx';

const PAGE_SIZE = 25;

function isMobile(phone) {
  if (!phone) return false;
  const c = phone.replace(/[\s\-\(\)\+]/g, '');
  return /^601[0-9]{8,9}$/.test(c) || /^01[0-9]{8,9}$/.test(c);
}

const TABS = [
  { key: 'all',        label: 'All' },
  { key: 'tierA',      label: 'Tier A' },
  { key: 'tierB',      label: 'Tier B' },
  { key: 'email',      label: 'Email Ready' },
  { key: 'wa',         label: 'WA Ready' },
  { key: 'hasMobile',  label: '📱 Has Mobile' },
  { key: 'voice',      label: 'Voice Ready' },
  { key: 'hot',        label: 'Hot' },
  { key: 'noCampaign', label: 'No Campaign' },
];

function tabFilter(tab, l) {
  switch (tab) {
    case 'all':        return true;
    case 'tierA':      return l.tier === 'A';
    case 'tierB':      return l.tier === 'B';
    case 'email':      return l.emailEligible === true;
    case 'wa':         return l.waEligible === true;
    case 'hasMobile':  return isMobile(l.phone);
    case 'voice':      return l.voiceEligible === true;
    case 'hot':        return l.tier === 'A' || l.status === 'hot';
    case 'noCampaign': return !l.campaignId;
    default:           return true;
  }
}

function TierBadge({ tier }) {
  if (!tier) return <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>;
  const bg = tier === 'A' ? 'var(--green)' : tier === 'B' ? 'var(--amber)' : 'var(--muted)';
  return <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', borderRadius: 4, padding: '2px 7px', background: bg }}>{tier}</span>;
}

function ChannelBadges({ l }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {l.emailEligible && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--blue)', background: 'oklch(62% 0.19 245 / 0.12)', borderRadius: 3, padding: '1px 5px' }}>E</span>}
      {l.waEligible    && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--green)', background: 'oklch(70% 0.18 145 / 0.12)', borderRadius: 3, padding: '1px 5px' }}>W</span>}
      {l.voiceEligible && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--amber)', background: 'oklch(75% 0.18 70 / 0.12)', borderRadius: 3, padding: '1px 5px' }}>V</span>}
      {!l.emailEligible && !l.waEligible && !l.voiceEligible && <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>}
    </div>
  );
}

function LeadDrawer({ lead, onClose, campaigns }) {
  if (!lead) return null;
  const camp = campaigns.find(c => c.id === lead.campaignId);

  const field = (label, value, color) => {
    if (!value && value !== 0) return null;
    return (
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 110, flexShrink: 0, paddingTop: 1 }}>{label}</span>
        <span style={{ fontSize: 12, color: color || 'var(--text)', wordBreak: 'break-word' }}>{value}</span>
      </div>
    );
  };

  const badge = (label, color, bg) => (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: bg, color, border: `1px solid ${color}33`, marginRight: 4 }}>{label}</span>
  );

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300 }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
        background: 'var(--s1)', borderLeft: '1px solid var(--border)',
        zIndex: 301, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{lead.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{lead.company}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, padding: 4, marginLeft: 8, flexShrink: 0 }}>✕</button>
          </div>
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {lead.tier && badge(`Tier ${lead.tier}`, lead.tier === 'A' ? 'var(--green)' : lead.tier === 'B' ? 'var(--amber)' : 'var(--muted)', lead.tier === 'A' ? 'oklch(70% 0.18 145 / 0.12)' : lead.tier === 'B' ? 'oklch(75% 0.18 70 / 0.12)' : 'var(--s2)')}
            {lead.aiScore != null && badge(`AI Score: ${lead.aiScore}`, lead.aiScore >= 70 ? 'var(--green)' : lead.aiScore >= 40 ? 'var(--amber)' : 'var(--muted)', 'var(--s2)')}
            {lead.status && badge(lead.status.replace(/_/g, ' '), 'var(--muted)', 'var(--s2)')}
            {lead.enriched && badge('Enriched', 'var(--green)', 'oklch(70% 0.18 145 / 0.12)')}
            {lead.personalized && badge('Personalized', 'var(--blue)', 'oklch(62% 0.19 245 / 0.12)')}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 20, flex: 1 }}>

          {/* Contact Info */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Contact Info</div>
            {field('Title', lead.title)}
            {field('Phone', lead.phone)}
            {field('Email', lead.email)}
            {field('Website', lead.website)}
            {field('Address', lead.address)}
            {field('Language', lead.lang)}
            {field('Category', lead.category)}
            {!lead.phone && !lead.email && !lead.website && (
              <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>No contact data collected</div>
            )}
          </div>

          {/* Scraper Data */}
          {(lead.rating != null || lead.reviewCount != null) && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Scraped Data</div>
              {field('Rating', lead.rating != null ? `${lead.rating} ★` : null, 'var(--amber)')}
              {field('Reviews', lead.reviewCount != null ? lead.reviewCount.toLocaleString() : null)}
              {field('Raw Score', lead.rawQualityScore)}
            </div>
          )}

          {/* AI Intelligence */}
          {(lead.aiScore != null || lead.aiScoreReason || lead.aiNextAction) && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>AI Intelligence</div>
              {field('AI Score', lead.aiScore != null ? `${lead.aiScore} / 100` : null, lead.aiScore >= 70 ? 'var(--green)' : lead.aiScore >= 40 ? 'var(--amber)' : 'var(--muted)')}
              {lead.aiScoreReason && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Score reason</div>
                  <div style={{ fontSize: 12, color: 'var(--text)', background: 'var(--s2)', borderRadius: 6, padding: '8px 10px', lineHeight: 1.5 }}>{lead.aiScoreReason}</div>
                </div>
              )}
              {field('Next action', lead.aiNextAction)}
              {lead.enrichmentConfidence != null && field('Enrich confidence', `${Math.round(lead.enrichmentConfidence * 100)}%`)}
            </div>
          )}

          {/* Personalization */}
          {lead.openingLine && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>AI Opening Line</div>
              <div style={{ fontSize: 12, color: 'var(--text)', background: 'oklch(62% 0.19 245 / 0.08)', border: '1px solid oklch(62% 0.19 245 / 0.2)', borderRadius: 6, padding: '10px 12px', lineHeight: 1.6, fontStyle: 'italic' }}>
                "{lead.openingLine}"
              </div>
            </div>
          )}

          {/* Enrichment Note */}
          {lead.enrichmentNote && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Enrichment Note</div>
              <div style={{ fontSize: 12, color: 'var(--text)', background: 'var(--s2)', borderRadius: 6, padding: '8px 10px', lineHeight: 1.5 }}>{lead.enrichmentNote}</div>
            </div>
          )}

          {/* Channel Eligibility */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Channel Eligibility</div>
            {[
              { label: 'Email', eligible: lead.emailEligible },
              { label: 'WhatsApp', eligible: lead.waEligible },
              { label: 'Voice', eligible: lead.voiceEligible },
            ].map(({ label, eligible }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: eligible ? 'var(--green)' : 'var(--border)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: eligible ? 'var(--text)' : 'var(--muted)' }}>{label}</span>
                <span style={{ fontSize: 11, color: eligible ? 'var(--green)' : 'var(--muted)', marginLeft: 'auto' }}>{eligible ? 'Eligible' : 'Not eligible'}</span>
              </div>
            ))}
            {!lead.eligibilityChecked && (
              <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', marginTop: 4 }}>Eligibility not yet checked</div>
            )}
          </div>

          {/* Notes */}
          {lead.note && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Notes</div>
              <div style={{ fontSize: 12, color: 'var(--text)', background: 'var(--s2)', borderRadius: 6, padding: '8px 10px', lineHeight: 1.5 }}>{lead.note}</div>
            </div>
          )}

          {/* Campaign / Meta */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Meta</div>
            {field('Campaign', camp?.name || (lead.campaignId ? `Campaign #${lead.campaignId}` : 'Unassigned'))}
            {field('Deal value', lead.dealValue != null ? `RM ${lead.dealValue.toLocaleString()}` : null, 'var(--green)')}
            {field('Score', lead.score != null ? lead.score : null)}
            {field('Added', lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : null)}
            {field('Enriched', lead.enrichedAt ? new Date(lead.enrichedAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : null)}
            {field('Personalized', lead.personalizedAt ? new Date(lead.personalizedAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : null)}
          </div>
        </div>
      </div>
    </>
  );
}

export function LeadIntelligence() {
  const { leads, campaigns, selectedBizId, showToast, refreshLeads } = useAppStore(useShallow(s => ({
    leads:         s.leads,
    campaigns:     s.campaigns,
    selectedBizId: s.selectedBizId,
    showToast:     s.showToast,
    refreshLeads:  s.refreshLeads,
  })));

  const [tab, setTab]                       = useState('all');
  const [search, setSearch]                 = useState('');
  const [campaignFilter, setCampaignFilter] = useState('All');
  const [page, setPage]                     = useState(0);
  const [importOpen, setImportOpen]         = useState(false);
  const [selectedLead, setSelectedLead]     = useState(null);

  // Bulk selection
  const [selected, setSelected]     = useState(new Set());
  const [enriching, setEnriching]   = useState(false);
  const [assigning, setAssigning]   = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignCampaignId, setAssignCampaignId] = useState('');
  const assignRef = useRef(null);

  useEffect(() => { setPage(0); setSelected(new Set()); }, [tab, search, campaignFilter, selectedBizId]);

  // Close assign dropdown when clicking outside
  useEffect(() => {
    if (!assignOpen) return;
    function handleClick(e) { if (assignRef.current && !assignRef.current.contains(e.target)) setAssignOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [assignOpen]);

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

  // Checkbox helpers
  const pageAllSelected = paged.length > 0 && paged.every(l => selected.has(l.id));
  const pagePartial     = !pageAllSelected && paged.some(l => selected.has(l.id));

  function toggleSelectAll() {
    setSelected(s => {
      const n = new Set(s);
      pageAllSelected ? paged.forEach(l => n.delete(l.id)) : paged.forEach(l => n.add(l.id));
      return n;
    });
  }

  function toggleOne(id) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  // Action handlers
  async function handleEnrich() {
    setEnriching(true);
    try {
      const data = await leadsService.bulkEnrich([...selected]);
      await refreshLeads?.();
      showToast(`${data.enriched} of ${data.total} leads enriched with Apollo data`, 'green');
      setSelected(new Set());
    } catch (e) {
      showToast(e.message || 'Enrichment failed — check Apollo API key in Settings', 'red');
    } finally {
      setEnriching(false);
    }
  }

  async function handleAssign() {
    if (!assignCampaignId) return;
    setAssigning(true);
    try {
      await leadsService.bulkAssign([...selected], parseInt(assignCampaignId));
      await refreshLeads?.();
      const camp = campaigns.find(c => String(c.id) === assignCampaignId);
      showToast(`${selected.size} leads assigned to "${camp?.name || 'Campaign'}"`, 'green');
      setSelected(new Set());
      setAssignOpen(false);
      setAssignCampaignId('');
    } catch (e) {
      showToast(e.message || 'Assignment failed', 'red');
    } finally {
      setAssigning(false);
    }
  }

  async function handleBulkDelete() {
    if (!window.confirm(`Delete ${selected.size} lead${selected.size !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    try {
      await leadsService.bulkDelete([...selected]);
      await refreshLeads?.();
      showToast(`${selected.size} leads deleted`, 'amber');
      setSelected(new Set());
    } catch (e) {
      showToast(e.message || 'Delete failed', 'red');
    }
  }

  function handleExport() { leadsService.exportCSV(filtered); }

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
    { label: 'Total Leads', value: leads.length,  color: 'var(--text)' },
    { label: 'Tier A',      value: tierA,          color: 'var(--green)' },
    { label: 'Email Ready', value: emailReady,     color: 'var(--blue)' },
    { label: 'WA Ready',    value: waReady,        color: 'var(--green)' },
    { label: 'Hot',         value: hot,            color: 'var(--amber)' },
  ];

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-4 fade-up">
        <div>
          <h1 className="page-title">Lead Intelligence</h1>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Enriched profiles, tier scores, and channel eligibility</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setImportOpen(true)}>⬆ Import Leads</button>
          <button className="btn btn-ghost btn-sm" onClick={handleExport}>⬇ Export CSV</button>
        </div>
      </div>

      {/* Score distribution bar */}
      <div className="card fade-up" style={{ padding: '14px 20px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score Distribution</div>
        <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', gap: 2 }}>
          {tierA > 0 && <div style={{ flex: tierA, background: 'var(--green)', borderRadius: 4, minWidth: 4 }} title={`Tier A: ${tierA}`} />}
          {tierB > 0 && <div style={{ flex: tierB, background: 'var(--amber)', borderRadius: 4, minWidth: 4 }} title={`Tier B: ${tierB}`} />}
          {tierC > 0 && <div style={{ flex: Math.max(tierC, 1), background: 'var(--border)', borderRadius: 4, minWidth: 4 }} title={`Tier C / Unscored: ${tierC}`} />}
          {leads.length === 0 && <div style={{ flex: 1, background: 'var(--s2)', borderRadius: 4 }} />}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--green)' }}>A: {tierA} ({Math.round((tierA / total) * 100)}%)</span>
          <span style={{ fontSize: 11, color: 'var(--amber)' }}>B: {tierB} ({Math.round((tierB / total) * 100)}%)</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>C/Other: {tierC} ({Math.round((tierC / total) * 100)}%)</span>
        </div>
      </div>

      {/* Stats */}
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
          <select className="input" style={{ fontSize: 12, maxWidth: 200 }} value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)}>
            <option value="All">All Campaigns</option>
            {leadCampaigns.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, borderBottom: '1px solid var(--border)', overflowX: 'auto' }} className="fade-up-1">
        {TABS.map(t => {
          const count = leads.filter(l => tabFilter(t.key, l)).length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '6px 12px', fontSize: 12, fontWeight: tab === t.key ? 600 : 400,
                color: tab === t.key ? 'var(--blue)' : 'var(--muted)',
                background: 'transparent', border: 'none',
                borderBottom: tab === t.key ? '2px solid var(--blue)' : '2px solid transparent',
                cursor: 'pointer', marginBottom: -1, whiteSpace: 'nowrap',
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
                <th style={{ width: 36, padding: '0 8px 10px 16px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={pageAllSelected}
                    ref={el => { if (el) el.indeterminate = pagePartial; }}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                    title="Select all on this page"
                  />
                </th>
                {['Name / Company', 'Title', 'Tier', 'AI Score', 'Channels', 'Enriched', 'Personalized', 'Status', 'Last'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 10, color: 'var(--muted)', fontWeight: 600, padding: '0 12px 10px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map(l => {
                const isSelected = selected.has(l.id);
                return (
                  <tr
                    key={l.id}
                    onClick={() => setSelectedLead(l)}
                    style={{ borderBottom: '1px solid var(--border)', background: isSelected ? 'oklch(62% 0.19 245 / 0.05)' : 'transparent', cursor: 'pointer' }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--s2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'oklch(62% 0.19 245 / 0.05)' : 'transparent'; }}
                  >
                    <td style={{ padding: '10px 8px 10px 16px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleOne(l.id)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--blue)' }}>{l.name}</div>
                      {l.company && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{l.company}</div>}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title || '—'}</td>
                    <td style={{ padding: '10px 12px' }}><TierBadge tier={l.tier} /></td>
                    <td style={{ padding: '10px 12px' }}>
                      {l.aiScore != null
                        ? <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', color: l.aiScore >= 70 ? 'var(--green)' : l.aiScore >= 40 ? 'var(--amber)' : 'var(--muted)' }}>{l.aiScore}</span>
                        : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '10px 12px' }}><ChannelBadges l={l} /></td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: l.enriched ? 'var(--green)' : 'var(--border)' }} title={l.enriched ? 'Enriched' : 'Not enriched'} />
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: l.personalized ? 'var(--green)' : 'var(--muted)' }}>{l.personalized ? '✦' : '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {l.status
                        ? <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 600, background: l.status === 'hot' ? 'oklch(75% 0.18 70 / 0.15)' : 'var(--s2)', color: l.status === 'hot' ? 'var(--amber)' : 'var(--muted)', border: '1px solid var(--border)', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{l.status.replace(/_/g, ' ')}</span>
                        : <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{l.last ? timeAgo(l.last) : '—'}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', color: 'var(--muted)', padding: 40, fontSize: 13 }}>
                    {leads.length === 0 ? 'No leads yet — click "Import Leads" to get started' : 'No leads match your filters'}
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
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => { setTab('all'); setSearch(''); setCampaignFilter('All'); }}>Clear filters</button>
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

      {/* Floating bulk action bar */}
      {selected.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 12,
          padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'center',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)', zIndex: 200, whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', paddingRight: 4, borderRight: '1px solid var(--border)', marginRight: 4 }}>
            {selected.size} selected
          </span>

          {/* Enrich */}
          <button
            className="btn btn-sm"
            onClick={handleEnrich}
            disabled={enriching}
            style={{ fontSize: 11, background: 'oklch(62% 0.19 245 / 0.12)', color: 'var(--blue)', border: '1px solid oklch(62% 0.19 245 / 0.3)' }}
            title="Fill in missing email, title, phone via Apollo"
          >
            {enriching ? '⏳ Enriching…' : '⚡ Enrich with Apollo'}
          </button>

          {/* Assign to Campaign */}
          <div style={{ position: 'relative' }} ref={assignRef}>
            <button
              className="btn btn-sm"
              onClick={() => setAssignOpen(o => !o)}
              style={{ fontSize: 11, background: 'oklch(65% 0.2 145 / 0.12)', color: 'var(--green)', border: '1px solid oklch(65% 0.2 145 / 0.3)' }}
            >
              📋 Assign to Campaign
            </button>
            {assignOpen && (
              <div style={{
                position: 'absolute', bottom: 'calc(100% + 8px)', left: 0,
                background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 10,
                padding: 12, minWidth: 240, boxShadow: '0 4px 20px rgba(0,0,0,0.4)', zIndex: 201,
              }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Assign {selected.size} leads to:
                </div>
                <select
                  className="input"
                  value={assignCampaignId}
                  onChange={e => setAssignCampaignId(e.target.value)}
                  style={{ width: '100%', marginBottom: 8 }}
                  autoFocus
                >
                  <option value="">Select campaign…</option>
                  {campaigns.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 10 }}>
                  Leads will be set to "new" status and enter the campaign sequence.
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleAssign}
                  disabled={!assignCampaignId || assigning}
                  style={{ width: '100%', fontSize: 12 }}
                >
                  {assigning ? 'Assigning…' : `Assign ${selected.size} leads`}
                </button>
              </div>
            )}
          </div>

          {/* Delete */}
          <button
            className="btn btn-sm"
            onClick={handleBulkDelete}
            style={{ fontSize: 11, background: 'oklch(55% 0.22 20 / 0.1)', color: 'var(--red)', border: '1px solid oklch(55% 0.22 20 / 0.3)' }}
            title="Permanently delete selected leads"
          >
            🗑 Delete
          </button>

          {/* Clear */}
          <button
            onClick={() => setSelected(new Set())}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 14, cursor: 'pointer', padding: '2px 4px', marginLeft: 2 }}
            title="Clear selection"
          >
            ✕
          </button>
        </div>
      )}

      {importOpen && <ImportLeadsModal onClose={() => setImportOpen(false)} />}
      {selectedLead && <LeadDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} campaigns={campaigns} />}
    </div>
  );
}
