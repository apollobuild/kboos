import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../../services/api.js';

const SENIORITY_OPTIONS = [
  { value: 'owner',    label: 'Owner' },
  { value: 'founder',  label: 'Founder' },
  { value: 'c_suite',  label: 'C-Suite' },
  { value: 'vp',       label: 'VP' },
  { value: 'director', label: 'Director' },
  { value: 'manager',  label: 'Manager' },
];

const TABS = [
  { id: 'smart',  label: '⚡ Smart Import' },
  { id: 'apollo', label: '👤 Apollo' },
  { id: 'maps',   label: '🗺 Google Maps' },
];

function SourceBadge({ source }) {
  const cfg = source === 'both'
    ? { label: 'Both ⚡', bg: 'oklch(72% 0.18 65 / 0.15)', color: 'oklch(72% 0.18 65)' }
    : source === 'apollo'
    ? { label: 'Apollo', bg: 'oklch(62% 0.19 245 / 0.12)', color: 'var(--blue)' }
    : { label: 'Maps', bg: 'oklch(65% 0.2 145 / 0.12)', color: 'var(--green)' };
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}

export function ImportLeadsModal({ onClose, defaultCampaignId }) {
  const { campaigns, showToast, refreshLeads } = useAppStore(useShallow(s => ({
    campaigns: s.campaigns,
    showToast: s.showToast,
    refreshLeads: s.refreshLeads,
  })));

  const [tab, setTab]             = useState('smart');
  const [campaignId, setCampaignId] = useState(defaultCampaignId ? String(defaultCampaignId) : '');
  const [city, setCity]           = useState('');
  const [keyword, setKeyword]     = useState('');
  const [jobTitles, setJobTitles] = useState('');
  const [seniority, setSeniority] = useState(['owner', 'founder', 'c_suite', 'director']);
  const [limit, setLimit]         = useState('50');
  const [mobileOnly, setMobileOnly] = useState(false);

  const [loading, setLoading]     = useState(false);
  const [results, setResults]     = useState(null);
  const [meta, setMeta]           = useState(null);
  const [selected, setSelected]   = useState(new Set());
  const [importing, setImporting] = useState(false);

  function toggleSeniority(val) {
    setSeniority(s => s.includes(val) ? s.filter(x => x !== val) : [...s, val]);
  }

  function handleTabChange(id) {
    setTab(id);
    setResults(null);
    setSelected(new Set());
    setMeta(null);
  }

  function handleMobileToggle() {
    const next = !mobileOnly;
    setMobileOnly(next);
    if (next && results) {
      const mobileIdxs = new Set(results.map((l, i) => l.hasMobile ? i : -1).filter(i => i !== -1));
      setSelected(s => new Set([...s].filter(i => mobileIdxs.has(i))));
    }
  }

  const displayResults = results
    ? results.map((l, i) => ({ ...l, _idx: i })).filter(l => !mobileOnly || l.hasMobile)
    : null;

  const canSearch = !!campaignId && (
    tab === 'apollo' ? true
    : tab === 'maps' ? !!(keyword.trim() && city.trim())
    : !!city.trim()
  );

  async function doSearch() {
    if (!canSearch) return;
    setLoading(true);
    setResults(null);
    setSelected(new Set());
    setMeta(null);
    try {
      const endpoint = tab === 'apollo' ? '/scraper/apollo-preview'
        : tab === 'maps' ? '/scraper/maps-preview'
        : '/scraper/smart-preview';
      const body = {
        city: city.trim() || undefined,
        limit: parseInt(limit),
        ...(tab !== 'maps' && {
          jobTitles: jobTitles.split(',').map(s => s.trim()).filter(Boolean),
          seniority,
        }),
        ...(tab !== 'apollo' && { keyword: keyword.trim() || undefined }),
      };
      const data = await apiFetch(endpoint, { method: 'POST', body });
      setResults(data.leads || []);
      setMeta(data);
      const allIdxs = new Set((data.leads || []).map((_, i) => i));
      setSelected(allIdxs);
    } catch (e) {
      showToast(e.message || 'Search failed', 'red');
    } finally {
      setLoading(false);
    }
  }

  function toggleAll() {
    if (!displayResults) return;
    const displayIdxs = displayResults.map(l => l._idx);
    const allSelected = displayIdxs.every(i => selected.has(i));
    setSelected(s => {
      const next = new Set(s);
      displayIdxs.forEach(i => allSelected ? next.delete(i) : next.add(i));
      return next;
    });
  }

  function toggleOne(idx) {
    setSelected(s => {
      const next = new Set(s);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  async function doImport() {
    if (!campaignId || selected.size === 0) return;
    setImporting(true);
    try {
      const selectedLeads = (results || []).filter((_, i) => selected.has(i));
      const data = await apiFetch('/scraper/import-selected', {
        method: 'POST',
        body: { campaignId: parseInt(campaignId), leads: selectedLeads },
      });
      await refreshLeads?.();
      showToast(`${data.count} leads imported!`, 'green');
      onClose();
    } catch (e) {
      showToast(e.message || 'Import failed', 'red');
    } finally {
      setImporting(false);
    }
  }

  const selectedCampaign = campaigns.find(c => String(c.id) === campaignId);
  const displayAllSelected = displayResults?.length > 0 && displayResults.every(l => selected.has(l._idx));

  const label = { compact: 11, base: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Import Leads</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Search Apollo & Google Maps, preview, then import to a campaign</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 18, cursor: 'pointer', padding: '2px 4px', lineHeight: 1 }}>✕</button>
        </div>

        {/* Campaign selector */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <label style={label}>Import to Campaign *</label>
          <select className="input" value={campaignId} onChange={e => setCampaignId(e.target.value)} style={{ maxWidth: 340 }}>
            <option value="">Select campaign…</option>
            {campaigns.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0, paddingLeft: 16 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              style={{
                padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: tab === t.id ? '2px solid var(--blue)' : '2px solid transparent',
                color: tab === t.id ? 'var(--blue)' : 'var(--muted)',
                fontWeight: tab === t.id ? 600 : 400,
                fontSize: 12, marginBottom: -1, whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
          <div style={{ flex: 1, borderBottom: '2px solid transparent' }} />
        </div>

        {/* Filters */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {/* Smart Import description */}
          {tab === 'smart' && (
            <div style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--s2)', borderRadius: 6, padding: '8px 12px', marginBottom: 12, border: '1px solid var(--border)' }}>
              ⚡ Searches Apollo (decision makers) + Google Maps (businesses) simultaneously. Matches companies from both sources and merges into one lead with full data.
            </div>
          )}

          {/* Filter grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={label}>City {tab !== 'apollo' && <span style={{ color: 'var(--red)' }}>*</span>}</label>
              <input className="input" placeholder="Kuala Lumpur" value={city} onChange={e => setCity(e.target.value)} />
            </div>
            {tab !== 'apollo' && (
              <div>
                <label style={label}>Keyword (Maps) {tab === 'maps' && <span style={{ color: 'var(--red)' }}>*</span>}</label>
                <input className="input" placeholder="e.g. accounting firm" value={keyword} onChange={e => setKeyword(e.target.value)} />
              </div>
            )}
            {tab !== 'maps' && (
              <div>
                <label style={label}>Job Titles (Apollo)</label>
                <input className="input" placeholder="CEO, Founder, Director" value={jobTitles} onChange={e => setJobTitles(e.target.value)} />
              </div>
            )}
            <div>
              <label style={label}>Limit</label>
              <select className="input" value={limit} onChange={e => setLimit(e.target.value)}>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>

          {/* Seniority */}
          {tab !== 'maps' && (
            <div style={{ marginBottom: 12 }}>
              <label style={label}>Seniority (Apollo)</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {SENIORITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => toggleSeniority(opt.value)}
                    style={{
                      padding: '4px 10px', fontSize: 11, fontWeight: 500, borderRadius: 4, cursor: 'pointer',
                      border: '1px solid var(--border)',
                      background: seniority.includes(opt.value) ? 'var(--blue-dim)' : 'var(--s2)',
                      color: seniority.includes(opt.value) ? 'var(--blue)' : 'var(--muted)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* WhatsApp Mode toggle */}
          <div
            onClick={handleMobileToggle}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              background: mobileOnly ? 'oklch(65% 0.2 145 / 0.07)' : 'var(--s2)',
              borderRadius: 8, border: `1px solid ${mobileOnly ? 'oklch(65% 0.2 145 / 0.3)' : 'var(--border)'}`,
              cursor: 'pointer', userSelect: 'none',
            }}
          >
            <div style={{ position: 'relative', width: 36, height: 20, flexShrink: 0 }}>
              <div style={{ width: 36, height: 20, borderRadius: 10, background: mobileOnly ? 'var(--green)' : 'var(--border)', transition: 'background 0.2s' }} />
              <div style={{ position: 'absolute', top: 2, left: mobileOnly ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>📱 WhatsApp Mode</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Only show leads with Malaysian mobile numbers (+601X) — ready for WhatsApp marketing</div>
            </div>
          </div>
        </div>

        {/* Results */}
        {displayResults !== null && (
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {/* Meta bar */}
            <div style={{ padding: '9px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--s1)', position: 'sticky', top: 0, zIndex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span><span style={{ color: 'var(--text)', fontWeight: 700 }}>{displayResults.length}</span>{mobileOnly ? ' leads with mobile' : ' leads found'}</span>
                {!mobileOnly && meta?.mobile > 0 && <span style={{ color: 'var(--green)' }}>📱 {meta.mobile} have mobile</span>}
                {meta?.merged > 0 && <span style={{ color: 'oklch(72% 0.18 65)' }}>⚡ {meta.merged} merged</span>}
                {meta?.gmaps > 0 && <span>Maps: {meta.gmaps}</span>}
                {meta?.apollo > 0 && <span>Apollo: {meta.apollo}</span>}
              </div>
              {displayResults.length > 0 && (
                <button onClick={toggleAll} className="btn btn-ghost btn-sm" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                  {displayAllSelected ? 'Deselect All' : `Select All (${displayResults.length})`}
                </button>
              )}
            </div>

            {displayResults.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ width: 32, padding: '8px 8px 8px 16px' }} />
                    {['Name / Company', 'Title', 'Phone', 'Source'].map(h => (
                      <th key={h} style={{ textAlign: 'left', fontSize: 10, color: 'var(--muted)', fontWeight: 600, padding: '8px 12px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayResults.map(lead => {
                    const isSelected = selected.has(lead._idx);
                    return (
                      <tr
                        key={lead._idx}
                        onClick={() => toggleOne(lead._idx)}
                        style={{
                          borderBottom: '1px solid var(--border)', cursor: 'pointer',
                          background: isSelected ? 'oklch(62% 0.19 245 / 0.05)' : 'transparent',
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--s2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'oklch(62% 0.19 245 / 0.05)' : 'transparent'; }}
                      >
                        <td style={{ padding: '9px 8px 9px 16px' }}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleOne(lead._idx)} onClick={e => e.stopPropagation()} style={{ cursor: 'pointer' }} />
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{lead.name}</div>
                          {lead.company && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{lead.company}</div>}
                        </td>
                        <td style={{ padding: '9px 12px', fontSize: 11, color: 'var(--muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {lead.title || '—'}
                        </td>
                        <td style={{ padding: '9px 12px', fontSize: 12, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                          {lead.phone
                            ? <span style={{ color: lead.hasMobile ? 'var(--green)' : 'var(--muted)' }}>{lead.hasMobile && '📱 '}{lead.phone}</span>
                            : <span style={{ color: 'var(--border)' }}>—</span>
                          }
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <SourceBadge source={lead.source} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                {mobileOnly ? 'No leads with mobile numbers found — try turning off WhatsApp Mode to see all results' : 'No leads found — try different search terms'}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {results !== null && selected.size > 0 && (
              <span>{selected.size} lead{selected.size !== 1 ? 's' : ''} selected</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {results !== null && selected.size > 0 && campaignId && (
              <button className="btn btn-primary" onClick={doImport} disabled={importing} style={{ fontSize: 12 }}>
                {importing ? 'Importing…' : `Import ${selected.size} → ${selectedCampaign?.name || 'Campaign'}`}
              </button>
            )}
            <button className="btn" onClick={doSearch} disabled={loading || !canSearch} style={{ fontSize: 12 }}>
              {loading ? 'Searching…' : results !== null ? '🔍 Search Again' : '🔍 Search'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
