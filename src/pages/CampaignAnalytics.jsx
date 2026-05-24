import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../services/api.js';

function pctNum(a, b) {
  if (!b || b === 0) return 0;
  return Math.round((a / b) * 100);
}
function safeNum(n) {
  return typeof n === 'number' && isFinite(n) ? n : 0;
}

function Shimmer({ h = 20, w = '100%', r = 6 }) {
  return (
    <div
      className="shimmer"
      style={{ height: h, width: w, borderRadius: r, background: 'var(--s2)', display: 'inline-block' }}
    />
  );
}

function FunnelCard({ label, value, ofPrev, prevLabel, color }) {
  return (
    <div className="card" style={{ padding: '16px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', color: color || 'var(--text)', lineHeight: 1 }}>
        {safeNum(value).toLocaleString()}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6 }}>
        {label}
      </div>
      {prevLabel !== null && ofPrev !== null && (
        <div style={{ fontSize: 11, marginTop: 6 }}>
          <span style={{
            color: ofPrev >= 50 ? 'var(--green)' : ofPrev >= 20 ? 'var(--amber)' : 'var(--red)',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
          }}>
            {ofPrev}%
          </span>
          <span style={{ color: 'var(--muted)' }}> of {prevLabel}</span>
        </div>
      )}
    </div>
  );
}

function ChannelStatRow({ label, value, rate, rateLabel, loading }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        {loading ? (
          <Shimmer h={14} w={60} />
        ) : (
          <>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text)' }}>
              {safeNum(value).toLocaleString()}
            </span>
            {rate !== undefined && (
              <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 5 }}>
                ({rate}% {rateLabel})
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ChannelCard({ title, icon, color, rows, loading }) {
  return (
    <div className="card" style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontWeight: 600, fontSize: 14, color }}>{title}</span>
      </div>
      <div>
        {rows.map(row => (
          <ChannelStatRow
            key={row.label}
            label={row.label}
            value={row.value}
            rate={row.rate}
            rateLabel={row.rateLabel}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ setPage }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
      <div style={{ fontSize: 36, marginBottom: 12, color: 'var(--border)' }}>📊</div>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>No campaigns yet</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
        Create your first campaign to start seeing analytics here.
      </div>
      <button className="btn btn-blue btn-sm" onClick={() => setPage('new-campaign')}>
        Create your first campaign
      </button>
    </div>
  );
}

export function CampaignAnalytics() {
  const { campaigns, leads, setPage } = useAppStore(useShallow(s => ({
    campaigns: s.campaigns,
    leads: s.leads,
    setPage: s.setPage,
  })));

  const [selectedId, setSelectedId] = useState('');
  const [dateRange, setDateRange] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (campaigns.length > 0 && !selectedId) {
      setSelectedId(String(campaigns[0].id));
    }
  }, [campaigns]);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    apiFetch(`/analytics/campaign/${selectedId}?range=${dateRange}`)
      .then(d => setData(d || {}))
      .catch(() => setData({}))
      .finally(() => setLoading(false));
  }, [selectedId, dateRange]);

  if (campaigns.length === 0) {
    return (
      <div className="page">
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <h1 className="page-title">Campaign Analytics</h1>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Per-campaign performance drilldown</div>
        </div>
        <EmptyState setPage={setPage} />
      </div>
    );
  }

  // Local funnel from store data
  const campaignLeads = leads.filter(l => String(l.campaignId) === selectedId);
  const imported  = campaignLeads.length;
  const qualified = campaignLeads.filter(l => ['A', 'B', 'C'].includes(l.tier)).length;
  const enriched  = campaignLeads.filter(l => safeNum(l.enrichmentConfidence) > 0).length;
  const contacted = campaignLeads.filter(l => l.status === 'contacted' || safeNum(l.actionsSent) > 0).length;
  const replied   = campaignLeads.filter(l => ['replied', 'hot', 'meeting_booked'].includes(l.status)).length;
  const meetings  = campaignLeads.filter(l => l.meetingBooked === true || l.status === 'meeting_booked').length;

  const d       = data || {};
  const email   = d.email    || {};
  const wa      = d.whatsapp || {};
  const voice   = d.voice    || {};
  const ai      = d.ai       || {};

  const emailSent       = safeNum(email.sent);
  const emailOpened     = safeNum(email.opened);
  const emailClicked    = safeNum(email.clicked);
  const emailReplied    = safeNum(email.replied);
  const emailBounced    = safeNum(email.bounced);

  const waSent          = safeNum(wa.sent);
  const waDelivered     = safeNum(wa.delivered);
  const waRead          = safeNum(wa.read);
  const waReplied       = safeNum(wa.replied);
  const waBlocked       = safeNum(wa.blocked);

  const voiceDialed     = safeNum(voice.dialed);
  const voiceAnswered   = safeNum(voice.answered);
  const voiceVoicemail  = safeNum(voice.voicemail);
  const voiceInterested = safeNum(voice.interested);
  const voiceCallbacks  = safeNum(voice.callbacks);

  const personalization = ai.personalizationLevel || '—';
  const avgScore        = safeNum(ai.avgScore);
  const tierA           = safeNum(ai.tierA);
  const tierB           = safeNum(ai.tierB);
  const tierC           = safeNum(ai.tierC);
  const bestDay         = ai.bestDay  || null;
  const bestHour        = ai.bestHour !== undefined ? ai.bestHour : null;
  const tierTotal       = (tierA + tierB + tierC) || 1;

  const funnelSteps = [
    { label: 'Imported',  value: imported,  prevVal: null,      prevLabel: null,        color: '#6366f1' },
    { label: 'Qualified', value: qualified, prevVal: imported,  prevLabel: 'imported',  color: 'var(--blue)' },
    { label: 'Enriched',  value: enriched,  prevVal: qualified, prevLabel: 'qualified', color: '#8b5cf6' },
    { label: 'Contacted', value: contacted, prevVal: enriched,  prevLabel: 'enriched',  color: 'var(--blue)' },
    { label: 'Replied',   value: replied,   prevVal: contacted, prevLabel: 'contacted', color: 'var(--amber)' },
    { label: 'Meetings',  value: meetings,  prevVal: replied,   prevLabel: 'replied',   color: 'var(--green)' },
  ];

  const emailRows = [
    { label: 'Sent',    value: emailSent },
    { label: 'Opened',  value: emailOpened,  rate: pctNum(emailOpened,  emailSent), rateLabel: 'open rate' },
    { label: 'Clicked', value: emailClicked, rate: pctNum(emailClicked, emailSent), rateLabel: 'click rate' },
    { label: 'Replied', value: emailReplied, rate: pctNum(emailReplied, emailSent), rateLabel: 'reply rate' },
    { label: 'Bounced', value: emailBounced, rate: pctNum(emailBounced, emailSent), rateLabel: 'bounce rate' },
  ];

  const waRows = [
    { label: 'Sent',                 value: waSent },
    { label: 'Delivered',            value: waDelivered,  rate: pctNum(waDelivered, waSent), rateLabel: 'delivery rate' },
    { label: 'Read',                 value: waRead,       rate: pctNum(waRead,      waSent), rateLabel: 'read rate' },
    { label: 'Replied',              value: waReplied,    rate: pctNum(waReplied,   waSent), rateLabel: 'reply rate' },
    { label: 'Blocked/Unsubscribed', value: waBlocked,    rate: pctNum(waBlocked,   waSent), rateLabel: 'block rate' },
  ];

  const voiceRows = [
    { label: 'Dialed',              value: voiceDialed },
    { label: 'Answered',            value: voiceAnswered,  rate: pctNum(voiceAnswered, voiceDialed), rateLabel: 'answer rate' },
    { label: 'Voicemail',           value: voiceVoicemail },
    { label: 'Interested (hot)',    value: voiceInterested },
    { label: 'Callbacks scheduled', value: voiceCallbacks },
  ];

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 fade-up">
        <div>
          <div className="breadcrumb">Analytics / <span>Campaign Analytics</span></div>
          <h1 className="page-title" style={{ marginTop: 4 }}>Campaign Analytics</h1>
        </div>
      </div>

      {/* Selectors row */}
      <div className="card fade-up" style={{ marginBottom: 16, padding: '14px 16px', display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
            Campaign
          </div>
          <select
            className="input"
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            style={{ fontSize: 13, width: '100%' }}
          >
            {campaigns.map(c => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
            Date Range
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { value: '7d',  label: 'Last 7d' },
              { value: '30d', label: 'Last 30d' },
              { value: '90d', label: 'Last 90d' },
              { value: 'all', label: 'All time' },
            ].map(opt => (
              <button
                key={opt.value}
                className={dateRange === opt.value ? 'btn btn-blue btn-sm' : 'btn btn-ghost btn-sm'}
                onClick={() => setDateRange(opt.value)}
                style={{ fontSize: 12 }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!selectedId ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--muted)', fontSize: 14 }}>
          Select a campaign above to view analytics.
        </div>
      ) : (
        <>
          {/* Funnel row — 6 cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 16 }} className="fade-up-1">
            {funnelSteps.map(step => (
              <FunnelCard
                key={step.label}
                label={step.label}
                value={step.value}
                ofPrev={step.prevVal !== null ? pctNum(step.value, step.prevVal) : null}
                prevLabel={step.prevLabel}
                color={step.color}
              />
            ))}
          </div>

          {/* 3-column channel breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }} className="fade-up-1">
            <ChannelCard title="Email"     icon="📧" color="var(--blue)"  rows={emailRows} loading={loading} />
            <ChannelCard title="WhatsApp"  icon="💬" color="var(--green)" rows={waRows}    loading={loading} />
            <ChannelCard title="Voice"     icon="📞" color="var(--amber)" rows={voiceRows} loading={loading} />
          </div>

          {/* AI Performance */}
          <div className="card fade-up-2">
            <div className="card-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🤖</span>
              AI Performance
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>

              {/* Personalization level */}
              <div style={{ background: 'var(--s1)', borderRadius: 8, padding: 14, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Personalization Level
                </div>
                {loading ? <Shimmer h={24} /> : (
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue)', textTransform: 'capitalize' }}>
                    {personalization}
                  </div>
                )}
              </div>

              {/* Avg AI score */}
              <div style={{ background: 'var(--s1)', borderRadius: 8, padding: 14, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Avg AI Score (Contacted)
                </div>
                {loading ? <Shimmer h={24} /> : (
                  <div style={{
                    fontSize: 24,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: avgScore >= 70 ? 'var(--green)' : avgScore >= 40 ? 'var(--amber)' : avgScore > 0 ? 'var(--red)' : 'var(--muted)',
                  }}>
                    {avgScore > 0 ? avgScore : '—'}
                  </div>
                )}
              </div>

              {/* Tier breakdown */}
              <div style={{ background: 'var(--s1)', borderRadius: 8, padding: 14, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Tier Breakdown
                </div>
                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <Shimmer h={12} /><Shimmer h={12} /><Shimmer h={12} />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { label: 'Tier A', count: tierA, color: '#22c55e' },
                      { label: 'Tier B', count: tierB, color: 'var(--blue)' },
                      { label: 'Tier C', count: tierC, color: 'var(--muted)' },
                    ].map(t => (
                      <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: t.color, fontWeight: 600, width: 38, flexShrink: 0 }}>{t.label}</span>
                        <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 3, height: 6, overflow: 'hidden' }}>
                          <div style={{
                            width: `${pctNum(t.count, tierTotal)}%`,
                            height: '100%',
                            background: t.color,
                            borderRadius: 3,
                            transition: 'width 0.4s ease',
                          }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--muted)', width: 30, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          {pctNum(t.count, tierTotal)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Best day/time */}
              <div style={{ background: 'var(--s1)', borderRadius: 8, padding: 14, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Best Sending Window
                </div>
                {loading ? <Shimmer h={24} /> : (
                  (bestDay || bestHour !== null) ? (
                    <div>
                      {bestDay && <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>{bestDay}</div>}
                      {bestHour !== null && (
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                          {bestHour}:00 – {bestHour + 1}:00
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>Not enough data yet</div>
                  )
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
