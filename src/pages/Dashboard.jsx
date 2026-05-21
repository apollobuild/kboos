import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { BizAvatar } from '../components/ui/BizAvatar.jsx';
import { TickerBar } from '../components/layout/TickerBar.jsx';
import { CampaignBadge } from '../components/ui/CampaignBadge.jsx';
import { LeadSlideOver } from '../components/leads/LeadSlideOver.jsx';
import { apiFetch } from '../services/api.js';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function HotLeadsPanel({ leads, campaigns }) {
  const [openLead, setOpenLead] = useState(null);
  const hot = leads.filter(l => l.status === 'hot' || l.score >= 8).slice(0, 5);

  return (
    <>
      <div className="card" style={{ height: '100%' }}>
        <div className="flex items-center justify-between mb-3">
          <div style={{ fontWeight: 600, fontSize: 13 }}>🔥 Hot Leads</div>
          <span className="badge amber">{hot.length} ready</span>
        </div>
        <div className="flex-col gap-2">
          {hot.length === 0 && (
            <div style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No hot leads yet</div>
          )}
          {hot.map(l => {
            const camp = campaigns.find(c => c.id === l.campaignId);
            return (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--s2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0, fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(245,166,35,0.12)', color: 'var(--amber)', border: '1px solid rgba(245,166,35,0.25)',
                }}>
                  {l.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{l.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{l.company} · <span className="mono">{l.score}/10</span></div>
                </div>
                <span className={`badge ${l.score >= 8 ? 'amber' : 'gray'}`}>{l.score >= 8 ? 'High' : 'Med'}</span>
                <button
                  className="btn btn-amber btn-xs"
                  onClick={() => setOpenLead(l)}
                >
                  View →
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {openLead && (
        <LeadSlideOver lead={openLead} onClose={() => setOpenLead(null)} />
      )}
    </>
  );
}

function ActivityFeed({ activity }) {
  const [filter, setFilter] = useState('All');
  const [period, setPeriod] = useState('week');

  const periodMs = period === 'today' ? 86400000 : period === 'week' ? 604800000 : Infinity;
  const cutoff = Date.now() - periodMs;

  const periodFiltered = activity.filter(a => {
    if (!a.createdAt) return true;
    return new Date(a.createdAt).getTime() > cutoff;
  });

  const tagFiltered = filter === 'All' ? periodFiltered : periodFiltered.filter(a => a.tag === filter);

  // Deduplicate: collapse consecutive identical messages
  const deduped = tagFiltered.reduce((acc, a) => {
    const prev = acc[acc.length - 1];
    if (prev && prev.msg === a.msg) {
      prev._count = (prev._count || 1) + 1;
      prev.createdAt = a.createdAt; // keep most recent timestamp
    } else {
      acc.push({ ...a, _count: 1 });
    }
    return acc;
  }, []);

  const tabs = ['All', 'Leads', 'Campaigns', 'System'];

  return (
    <div className="card flex-col" style={{ height: '100%' }}>
      <div className="flex items-center justify-between mb-3">
        <div style={{ fontWeight: 600, fontSize: 13 }}>Activity Feed</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            style={{ fontSize: 11, background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 5, padding: '3px 6px', cursor: 'pointer' }}
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="all">All Time</option>
          </select>
          <div className="tabs">
            {tabs.map(t => (
              <div key={t} className={`tab${filter === t ? ' active' : ''}`} onClick={() => setFilter(t)} style={{ padding: '4px 10px', fontSize: 11 }}>{t}</div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-col" style={{ gap: 1, overflowY: 'auto', flex: 1 }}>
        {deduped.length === 0 && (
          <div style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No activity yet</div>
        )}
        {deduped.map((a, i) => (
          <div key={a.id ?? i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: `var(--${a.color})`, marginTop: 5, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {a.msg}
                {a._count > 1 && (
                  <span style={{ fontSize: 10, background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 10, padding: '1px 6px', color: 'var(--muted)', flexShrink: 0 }}>×{a._count}</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}><span className="mono">{timeAgo(a.createdAt)}</span> · {a.tag}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { campaigns, businesses, leads, replies, activity, setPage, toggleCampaign } = useAppStore(useShallow(s => ({
    campaigns: s.campaigns, businesses: s.businesses, leads: s.leads,
    replies: s.replies, activity: s.activity, setPage: s.setPage, toggleCampaign: s.toggleCampaign,
  })));
  const [bizFilter, setBizFilter] = useState(null);
  const [walletSpend, setWalletSpend] = useState(null);

  useEffect(() => {
    apiFetch('/wallet/spend-summary').then(setWalletSpend).catch(() => {});
  }, []);

  const totalLeads = leads.length;
  const hotLeads = leads.filter(l => l.status === 'hot' || l.score >= 8).length;
  const meetings = leads.filter(l => l.status === 'meeting_booked').length;
  const unreadReplies = replies.filter(r => r.status === 'unread').length;
  const pendingApprovals = campaigns.filter(c => c.status === 'awaiting_approval').length;
  const spendVal = walletSpend?.total != null ? `RM ${walletSpend.total < 1 ? walletSpend.total.toFixed(2) : walletSpend.total < 10 ? walletSpend.total.toFixed(1) : Math.round(walletSpend.total)}` : '—';

  const ratesWithData = campaigns.filter(c => c.open && parseFloat(c.open) > 0);
  const avgOpen = ratesWithData.length > 0
    ? (ratesWithData.reduce((s, c) => s + parseFloat(c.open), 0) / ratesWithData.length).toFixed(1) + '%'
    : '—';

  const stats = [
    { icon: '👥', label: 'Total Leads', val: totalLeads.toLocaleString(), color: 'text', page: 'leads' },
    { icon: '🔥', label: 'Hot Leads', val: hotLeads, color: 'amber', page: 'leads' },
    { icon: '📅', label: 'Meetings', val: meetings, color: 'green', page: 'leads' },
    { icon: '💬', label: 'Unread Replies', val: unreadReplies, color: unreadReplies > 0 ? 'blue' : 'muted', page: 'replies', pulse: unreadReplies > 0 },
    { icon: '⏳', label: 'Pending Approval', val: pendingApprovals, color: pendingApprovals > 0 ? 'amber' : 'muted', page: 'approval', pulse: pendingApprovals > 0 },
    { icon: '📬', label: 'Open Rate', val: avgOpen, color: parseFloat(avgOpen) > 30 ? 'green' : avgOpen === '—' ? 'muted' : 'red', page: 'reporting' },
    { icon: '💰', label: 'API Spend', val: spendVal, color: 'muted', page: 'settings' },
  ];

  // Compute per-biz lead counts from actual leads data
  const bizLeadCounts = {};
  const bizHotCounts = {};
  leads.forEach(l => {
    const camp = campaigns.find(c => c.id === l.campaignId);
    if (!camp?.bizId) return;
    bizLeadCounts[camp.bizId] = (bizLeadCounts[camp.bizId] || 0) + 1;
    if (l.status === 'hot' || l.score >= 8) bizHotCounts[camp.bizId] = (bizHotCounts[camp.bizId] || 0) + 1;
  });

  const visibleCampaigns = campaigns.filter(c => !bizFilter || c.bizId === bizFilter);

  return (
    <div className="page">
      <div className="fade-up">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="breadcrumb">Overview / <span>Command Center</span></div>
            <h1 className="page-title" style={{ marginTop: 4 }}>Command Center</h1>
          </div>
        </div>
        <TickerBar />
      </div>

      {/* Stat cards */}
      <div className="fade-up-1 mt-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 10 }}>
        {stats.map(s => (
          <div
            key={s.label}
            className="card-sm"
            onClick={() => setPage(s.page)}
            style={{
              textAlign: 'center', padding: '12px 8px', cursor: 'pointer',
              transition: 'transform 0.12s, box-shadow 0.12s',
              position: 'relative', overflow: 'hidden',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.07),0 12px 36px rgba(0,0,10,0.65)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            {s.pulse && (
              <div style={{
                position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%',
                background: s.color === 'amber' ? 'var(--amber)' : 'var(--blue)',
                animation: 'pulse 1.4s ease-in-out infinite',
              }} />
            )}
            <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
            <div className="mono" style={{
              fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em',
              color: s.color === 'text' ? 'var(--text)' : s.color === 'muted' ? 'var(--muted)' : `var(--${s.color})`,
            }}>{s.val}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* First-time empty state */}
      {businesses.length === 0 && campaigns.length === 0 && (
        <div className="card fade-up-1 mt-4" style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>👋</div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Welcome to KBOOS — here's how to get started</div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>Three steps to your first outreach campaign</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { step: '1', icon: '◈', label: 'Add a Business', desc: 'Set up your first client business and generate an AI outreach brief', action: 'businesses', btn: 'Add Business' },
              { step: '2', icon: '◉', label: 'Create a Campaign', desc: 'Choose channels, set up lead scraping, and define your sequence', action: 'new-campaign', btn: 'New Campaign' },
              { step: '3', icon: '⏳', label: 'Review & Approve', desc: 'Review scraped leads and approve the campaign to start outreach', action: 'approvals', btn: 'Go to Approvals' },
            ].map(s => (
              <div key={s.step} className="card" style={{ maxWidth: 220, textAlign: 'left', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>{s.step}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>{s.desc}</div>
                <button className="btn btn-sm" style={{ width: '100%', fontSize: 12 }} onClick={() => setPage(s.action)}>{s.btn} →</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Business filter */}
      <div className="fade-up-2 mt-4" style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <div style={{ display: 'flex', gap: 10, minWidth: 'max-content' }}>
          {businesses.map(b => {
            const bLeads = bizLeadCounts[b.id] || 0;
            const bHot = bizHotCounts[b.id] || 0;
            const isActive = bizFilter === b.id;
            return (
              <div
                key={b.id}
                className="card-sm"
                style={{
                  minWidth: 160, cursor: 'pointer',
                  border: `1px solid ${isActive ? `var(--${b.color})` : 'var(--border)'}`,
                  transition: 'all 0.15s', transform: isActive ? 'translateY(-2px)' : 'none',
                  boxShadow: isActive ? `0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px var(--${b.color})` : '',
                }}
                onClick={() => setBizFilter(isActive ? null : b.id)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <BizAvatar id={b.id} color={b.color} size={24} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{b.name}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>{b.industry}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="mono text-xs">{bLeads}<span style={{ color: 'var(--muted)' }}> leads</span></span>
                  {bHot > 0 && <span className="mono text-xs" style={{ color: 'var(--amber)' }}>🔥 {bHot}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Campaigns table */}
      <div className="fade-up-3 mt-4 card">
        <div className="flex items-center justify-between mb-3">
          <div style={{ fontWeight: 600, fontSize: 13 }}>Active Campaigns</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {pendingApprovals > 0 && (
              <button className="btn btn-amber btn-sm" style={{ animation: 'pulse 1.4s ease-in-out infinite' }} onClick={() => setPage('approvals')}>
                ⏳ {pendingApprovals} Awaiting Review
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => setPage('new-campaign')}>＋ New Campaign</button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Campaign</th><th>Status</th><th style={{ minWidth: 160 }}>Progress</th><th>Hot</th><th>Open</th><th>WA Resp</th><th>Spend</th><th>Tier</th><th></th></tr>
            </thead>
            <tbody>
              {visibleCampaigns.map(c => {
                const pct = c.total > 0 ? Math.round((c.leads / c.total) * 100) : 0;
                return (
                  <tr key={c.id} className={c.status === 'awaiting_approval' ? 'row-awaiting' : ''} style={{ opacity: c.status === 'paused' ? 0.7 : 1, cursor: 'pointer' }} onClick={() => setPage('campaigns')}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BizAvatar id={c.bizId} color={c.color} size={26} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.bizName}</div>
                        </div>
                      </div>
                    </td>
                    <td><CampaignBadge status={c.status} /></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
                        <div className="prog-bar" style={{ flex: 1 }}><div className="prog-fill" style={{ width: `${pct}%`, background: `var(--${c.color})` }} /></div>
                        <span className="mono text-sm" style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{c.leads}<span style={{ opacity: .5 }}>/{c.total}</span></span>
                      </div>
                    </td>
                    <td><span className="mono text-amber">{c.hot > 0 ? `🔥 ${c.hot}` : '-'}</span></td>
                    <td><span className="mono text-sm">{c.open || '—'}</span></td>
                    <td><span className="mono text-sm">{c.wa || '-'}</span></td>
                    <td><span className="mono text-sm text-green">{c.spend}</span></td>
                    <td><span className="badge gray text-xs">{c.tier}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      {c.status === 'awaiting_approval'
                        ? <button className="btn btn-amber btn-xs" style={{ animation: 'pulse 1.4s ease-in-out infinite' }} onClick={() => setPage('approvals')}>Review</button>
                        : (c.status === 'active' || c.status === 'paused')
                          ? <button className={`btn ${c.status === 'active' ? 'btn-ghost' : 'btn-green'} btn-xs`} onClick={() => toggleCampaign(c.id)}>{c.status === 'active' ? 'Pause' : 'Resume'}</button>
                          : null
                      }
                    </td>
                  </tr>
                );
              })}
              {visibleCampaigns.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px 0', fontSize: 12 }}>No campaigns{bizFilter ? ' for this business' : ''}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity + Hot Leads */}
      <div className="fade-up-4 mt-4" style={{ display: 'grid', gridTemplateColumns: '1fr 0.65fr', gap: 16, minHeight: 280 }}>
        <ActivityFeed activity={activity} />
        <HotLeadsPanel leads={leads} campaigns={campaigns} />
      </div>
    </div>
  );
}
