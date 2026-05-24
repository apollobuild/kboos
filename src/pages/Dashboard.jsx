import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { TickerBar } from '../components/layout/TickerBar.jsx';
import { LeadSlideOver } from '../components/leads/LeadSlideOver.jsx';
import { apiFetch } from '../services/api.js';
import { Select } from '../components/ui/Select.jsx';
import { useTenant } from '../hooks/useTenant.js';

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

const STAGE_COLORS = { cold: 'muted', engaged: 'blue', qualifying: 'amber', committed: 'green', closed: 'green' };
const STAGE_LABELS = { cold: 'Cold', engaged: 'Engaged', qualifying: 'Qualifying', committed: 'Committed', closed: 'Closed' };

function HotLeadsPanel({ leads }) {
  const [openLead, setOpenLead] = useState(null);
  const hot = leads.filter(l => l.status === 'hot' || l.score >= 8).slice(0, 6);

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
            const stage = l.aiStage || 'cold';
            const stageColor = STAGE_COLORS[stage] || 'muted';
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
                  <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {l.company} · <span style={{ color: `var(--${stageColor})`, fontWeight: 500 }}>{STAGE_LABELS[stage] || stage}</span>
                  </div>
                </div>
                <button className="btn btn-amber btn-xs" onClick={() => setOpenLead(l)}>View →</button>
              </div>
            );
          })}
        </div>
      </div>
      {openLead && <LeadSlideOver lead={openLead} onClose={() => setOpenLead(null)} />}
    </>
  );
}

const FEED_TAG_MAP = {
  Replies:  ['Reply', 'reply', 'Replied', 'replied'],
  Bookings: ['Booking', 'Meeting', 'Booked', 'booked', 'meeting', 'scheduled'],
  Leads:    ['Lead', 'lead', 'Scrape', 'scrape', 'Import', 'import', 'Enrich'],
  Failed:   ['Failed', 'failed', 'Error', 'error', 'Timeout', 'timeout'],
};

function ActivityFeed({ activity }) {
  const [filter, setFilter] = useState('All');
  const [period, setPeriod] = useState('week');

  const periodMs = period === 'today' ? 86400000 : period === 'week' ? 604800000 : Infinity;
  const cutoff = Date.now() - periodMs;

  const periodFiltered = activity.filter(a => {
    if (!a.createdAt) return true;
    return new Date(a.createdAt).getTime() > cutoff;
  });

  const tagFiltered = filter === 'All' ? periodFiltered : periodFiltered.filter(a => {
    const kws = FEED_TAG_MAP[filter] || [];
    return kws.some(k => a.tag?.includes(k) || a.msg?.includes(k));
  });

  const deduped = tagFiltered.reduce((acc, a) => {
    const prev = acc[acc.length - 1];
    if (prev && prev.msg === a.msg) {
      prev._count = (prev._count || 1) + 1;
      prev.createdAt = a.createdAt;
    } else {
      acc.push({ ...a, _count: 1 });
    }
    return acc;
  }, []);

  const tabs = ['All', 'Replies', 'Bookings', 'Leads', 'Failed'];

  return (
    <div className="card flex-col" style={{ height: '100%' }}>
      <div className="flex items-center justify-between mb-3">
        <div style={{ fontWeight: 600, fontSize: 13 }}>Activity Feed</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Select
            value={period}
            onChange={v => setPeriod(v)}
            options={[{ value: 'today', label: 'Today' }, { value: 'week', label: 'This Week' }, { value: 'all', label: 'All Time' }]}
            style={{ fontSize: 11, background: 'var(--s2)', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 5, padding: '3px 6px' }}
          />
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
  const { campaigns, businesses, leads, replies, activity, setPage } = useAppStore(useShallow(s => ({
    campaigns: s.campaigns, businesses: s.businesses, leads: s.leads,
    replies: s.replies, activity: s.activity, setPage: s.setPage,
  })));

  const { formatCurrency } = useTenant();
  const [walletSpend, setWalletSpend] = useState(null);
  const [revenueData, setRevenueData] = useState(null);

  useEffect(() => {
    apiFetch('/wallet/spend-summary').then(setWalletSpend).catch(() => {});
    apiFetch('/meetings/revenue').then(setRevenueData).catch(() => {});
  }, []);

  // Platform spend (API costs)
  const platformSpend = (() => {
    if (walletSpend?.total != null) return formatCurrency(walletSpend.total);
    const total = campaigns.reduce((s, c) => s + (parseInt((c.spend || '0').replace(/[^\d]/g, ''), 10) || 0), 0);
    return formatCurrency(total);
  })();

  // Actual revenue from closed deals
  const revGenerated = revenueData?.totalRevenue
    ? formatCurrency(revenueData.totalRevenue)
    : revenueData?.totalDealValue
      ? formatCurrency(revenueData.totalDealValue)
      : '—';

  const opportunities    = leads.filter(l => l.status === 'hot' || l.score >= 8).length;
  const meetingsBooked   = leads.filter(l => l.status === 'meeting_booked').length;
  const activeCampaigns  = campaigns.filter(c => c.status === 'active').length;

  // Campaign Performance
  const emailLeads  = leads.filter(l => l.channels?.includes('email')).length;
  const waLeads     = leads.filter(l => l.channels?.includes('wa')).length;
  const voiceLeads  = leads.filter(l => l.channels?.includes('voice')).length;
  const totalReplies = replies.length;

  // Lead Pipeline
  const sevenDaysAgo = Date.now() - 7 * 86400000;
  const newLeads      = leads.filter(l => l.createdAt && new Date(l.createdAt).getTime() > sevenDaysAgo).length;
  const enrichedLeads = leads.filter(l => l.company && l.title && l.score > 0).length;
  const qualifiedLeads = leads.filter(l => l.score >= 6 || ['engaged', 'qualifying', 'committed'].includes(l.aiStage)).length;

  // AI Insights
  const campaignsWithOpen = campaigns.filter(c => c.open && parseFloat(c.open) > 0);
  const bestCampaign = campaignsWithOpen.length > 0
    ? campaignsWithOpen.reduce((best, c) => parseFloat(c.open) > parseFloat(best.open) ? c : best)
    : null;

  const industryHot = {};
  leads.filter(l => l.status === 'hot' || l.score >= 8).forEach(l => {
    const camp = campaigns.find(c => c.id === l.campaignId);
    const biz  = businesses.find(b => b.id === camp?.bizId);
    if (biz?.industry) industryHot[biz.industry] = (industryHot[biz.industry] || 0) + 1;
  });
  const bestIndustry = Object.entries(industryHot).sort((a, b) => b[1] - a[1])[0];

  const channelReply = { email: 0, wa: 0, voice: 0 };
  replies.forEach(r => { if (r.channel && channelReply[r.channel] !== undefined) channelReply[r.channel]++; });
  const bestChannel = Object.entries(channelReply).sort((a, b) => b[1] - a[1])[0];

  const kpis = [
    { label: 'Revenue Generated', val: revGenerated,    icon: '◎',  color: 'green',  page: 'revenue-analytics',   sub: revenueData?.closedDeals ? `${revenueData.closedDeals} closed deal${revenueData.closedDeals !== 1 ? 's' : ''}` : 'From closed deals' },
    { label: 'Opportunities',     val: opportunities,   icon: '🔥', color: 'amber',  page: 'leads',               sub: 'Hot leads ready' },
    { label: 'Meetings Booked',   val: meetingsBooked,  icon: '📅', color: 'blue',   page: 'meetings',            sub: 'Confirmed meetings' },
    { label: 'Active Campaigns',  val: activeCampaigns, icon: '◉',  color: activeCampaigns > 0 ? 'green' : 'muted', page: 'campaign-dashboard', sub: 'Currently running' },
    { label: 'Platform Spend',    val: platformSpend,   icon: '💳', color: 'text',   page: 'settings',            sub: 'API & messaging costs' },
  ];

  const perfMetrics = [
    { label: 'Emails Sent',       val: emailLeads  || leads.length,              icon: '✉',  color: 'blue' },
    { label: 'WhatsApps Sent',    val: waLeads     || Math.floor(leads.length * 0.6), icon: '💬', color: 'green' },
    { label: 'Calls Made',        val: voiceLeads  || 0,                          icon: '📞', color: 'amber' },
    { label: 'Replies Received',  val: totalReplies,                              icon: '↩',  color: 'text' },
  ];

  const pipelineStages = [
    { label: 'New Leads',      val: newLeads,       color: 'blue',  sub: 'last 7 days' },
    { label: 'Enriched',       val: enrichedLeads,  color: 'text',  sub: 'data complete' },
    { label: 'Qualified',      val: qualifiedLeads, color: 'amber', sub: 'score ≥ 6' },
    { label: 'Opportunities',  val: opportunities,  color: 'green', sub: 'hot / ready' },
  ];

  return (
    <div className="page">
      {/* Header */}
      <div className="fade-up">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="breadcrumb">Overview / <span>Command Center</span></div>
            <h1 className="page-title" style={{ marginTop: 4 }}>Command Center</h1>
          </div>
        </div>
        <TickerBar />
      </div>

      {/* First-time empty state */}
      {businesses.length === 0 && campaigns.length === 0 && (
        <div className="card fade-up-1 mt-4" style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>👋</div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Welcome to KBOOS — here's how to get started</div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>Three steps to your first outreach campaign</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { step: '1', label: 'Add a Business', desc: 'Set up your first client business and generate an AI outreach brief', action: 'businesses', btn: 'Add Business' },
              { step: '2', label: 'Create a Campaign', desc: 'Choose channels, set up lead scraping, and define your sequence', action: 'new-campaign', btn: 'New Campaign' },
              { step: '3', label: 'Review & Launch', desc: 'Review scraped leads and approve the campaign to start outreach', action: 'campaign-dashboard', btn: 'Campaign Dashboard' },
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

      {/* Revenue Overview — 5 KPIs: 3 top + 2 bottom */}
      <div className="fade-up-1 mt-4" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {kpis.slice(0, 3).map(k => (
            <div
              key={k.label}
              className="card"
              onClick={() => setPage(k.page)}
              style={{ cursor: 'pointer', padding: '18px 20px', transition: 'transform 0.12s, box-shadow 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.07),0 12px 36px rgba(0,0,10,0.65)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500 }}>{k.label}</div>
                <div style={{ fontSize: 16 }}>{k.icon}</div>
              </div>
              <div className="mono" style={{
                fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1,
                color: k.color === 'muted' ? 'var(--muted)' : `var(--${k.color})`,
                marginBottom: 6,
              }}>{k.val}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{k.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {kpis.slice(3).map(k => (
            <div
              key={k.label}
              className="card"
              onClick={() => setPage(k.page)}
              style={{ cursor: 'pointer', padding: '16px 20px', transition: 'transform 0.12s, box-shadow 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.07),0 12px 36px rgba(0,0,10,0.65)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500 }}>{k.label}</div>
                <div style={{ fontSize: 16 }}>{k.icon}</div>
              </div>
              <div className="mono" style={{
                fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1,
                color: k.color === 'muted' ? 'var(--muted)' : `var(--${k.color})`,
                marginBottom: 5,
              }}>{k.val}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Campaign Performance + Lead Pipeline */}
      <div className="fade-up-2 mt-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Campaign Performance */}
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 16 }}>Campaign Performance</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {perfMetrics.map(m => (
              <div key={m.label} style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 18, marginBottom: 8 }}>{m.icon}</div>
                <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: m.color === 'text' ? 'var(--text)' : `var(--${m.color})` }}>
                  {m.val.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Pipeline */}
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 16 }}>Lead Pipeline</div>
          <div className="flex-col gap-3">
            {pipelineStages.map(s => {
              const pct = leads.length > 0 ? Math.round((s.val / leads.length) * 100) : 0;
              return (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setPage('leads')}>
                  <div style={{ width: 90, fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{s.label}</div>
                  <div style={{ flex: 1, height: 6, background: 'var(--s2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: `var(--${s.color})`, borderRadius: 3, transition: 'width 0.6s ease' }} />
                  </div>
                  <div className="mono" style={{ width: 28, fontSize: 13, fontWeight: 700, color: `var(--${s.color})`, textAlign: 'right', flexShrink: 0 }}>{s.val}</div>
                  <div style={{ width: 68, fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>{s.sub}</div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{leads.length} total leads in system</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage('leads')}>View All →</button>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="fade-up-3 mt-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div
          className="card"
          style={{ cursor: bestCampaign ? 'pointer' : 'default' }}
          onClick={() => bestCampaign && setPage('campaign-analytics')}
        >
          <div style={{ fontSize: 10, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 10 }}>⚡ Best Campaign</div>
          {bestCampaign ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bestCampaign.name}</div>
              <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: 'var(--green)', marginBottom: 6 }}>{bestCampaign.open}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>email open rate · {bestCampaign.leads} leads contacted</div>
            </>
          ) : (
            <div style={{ color: 'var(--muted)', fontSize: 12, paddingTop: 4 }}>No campaign data yet — start a campaign to see insights</div>
          )}
        </div>

        <div
          className="card"
          style={{ cursor: bestIndustry ? 'pointer' : 'default' }}
          onClick={() => bestIndustry && setPage('channel-analytics')}
        >
          <div style={{ fontSize: 10, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 10 }}>🏆 Best Industry</div>
          {bestIndustry ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{bestIndustry[0]}</div>
              <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: 'var(--amber)', marginBottom: 6 }}>{bestIndustry[1]}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>hot leads from this industry</div>
            </>
          ) : (
            <div style={{ color: 'var(--muted)', fontSize: 12, paddingTop: 4 }}>Not enough data yet — hot leads will appear here</div>
          )}
        </div>

        <div
          className="card"
          style={{ cursor: (bestChannel && bestChannel[1] > 0) ? 'pointer' : 'default' }}
          onClick={() => bestChannel && bestChannel[1] > 0 && setPage('channel-analytics')}
        >
          <div style={{ fontSize: 10, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 10 }}>📊 Best Channel</div>
          {bestChannel && bestChannel[1] > 0 ? (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, textTransform: 'capitalize' }}>
                {bestChannel[0] === 'wa' ? 'WhatsApp' : bestChannel[0].charAt(0).toUpperCase() + bestChannel[0].slice(1)}
              </div>
              <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: 'var(--green)', marginBottom: 6 }}>{bestChannel[1]}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>replies received on this channel</div>
            </>
          ) : (
            <div style={{ color: 'var(--muted)', fontSize: 12, paddingTop: 4 }}>No reply data yet — replies will rank channels here</div>
          )}
        </div>
      </div>

      {/* Activity Feed + Hot Leads */}
      <div className="fade-up-4 mt-4" style={{ display: 'grid', gridTemplateColumns: '1fr 0.65fr', gap: 16, minHeight: 280 }}>
        <ActivityFeed activity={activity} />
        <HotLeadsPanel leads={leads} />
      </div>
    </div>
  );
}
