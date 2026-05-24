import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../services/api.js';

function safeNum(n) {
  return typeof n === 'number' && isFinite(n) ? n : 0;
}
function pctNum(a, b) {
  if (!b || b === 0) return 0;
  return Math.round((a / b) * 100);
}
function pctStr(a, b) {
  return `${pctNum(a, b)}%`;
}

// ─── Heatmap mock data ────────────────────────────────────────────────────────
function generateHeatmapData() {
  const data = [];
  for (let day = 0; day < 7; day++) {
    const row = [];
    for (let hour = 0; hour < 24; hour++) {
      const isWeekday = day < 5;
      const isBusinessHour = hour >= 9 && hour <= 17;
      const isPeakHour = (hour >= 9 && hour <= 11) || (hour >= 13 && hour <= 16);
      let base = 0;
      if (isWeekday && isPeakHour)      base = 0.55 + Math.random() * 0.45;
      else if (isWeekday && isBusinessHour) base = 0.3 + Math.random() * 0.35;
      else if (isWeekday)               base = Math.random() * 0.15;
      else if (isBusinessHour)          base = Math.random() * 0.2;
      else                              base = Math.random() * 0.07;
      row.push(base);
    }
    data.push(row);
  }
  return data;
}

const HEATMAP_DATA = generateHeatmapData();
const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function heatColor(v) {
  if (v <= 0.02) return 'var(--s2)';
  if (v < 0.25)  return 'oklch(60% 0.12 145 / 0.3)';
  if (v < 0.6)   return 'oklch(65% 0.18 145 / 0.6)';
  return 'oklch(70% 0.22 145 / 0.9)';
}

function SendingHeatmap() {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-title" style={{ marginBottom: 4 }}>Best sending times — Email replies by day and hour</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14 }}>
        Darker cells = more replies. Weekdays 9am–5pm are typically strongest.
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'inline-block', minWidth: 700 }}>
          {/* Hour axis */}
          <div style={{ display: 'flex', marginLeft: 38 }}>
            {HOURS.map(h => (
              <div key={h} style={{
                width: 28, fontSize: 9, color: 'var(--muted)', textAlign: 'center', flexShrink: 0,
                opacity: [0, 6, 12, 18].includes(h) ? 1 : 0,
                fontFamily: 'var(--font-mono)',
              }}>
                {h === 0 ? '12am' : h === 6 ? '6am' : h === 12 ? '12pm' : h === 18 ? '6pm' : ''}
              </div>
            ))}
          </div>
          {/* Rows */}
          {DAYS.map((day, di) => (
            <div key={day} style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
              <div style={{ width: 34, fontSize: 11, color: 'var(--muted)', flexShrink: 0, textAlign: 'right', paddingRight: 6, fontWeight: 500 }}>
                {day}
              </div>
              {HOURS.map(h => (
                <div
                  key={h}
                  title={`${day} ${h}:00 — density: ${Math.round(HEATMAP_DATA[di][h] * 100)}%`}
                  style={{
                    width: 28,
                    height: 18,
                    borderRadius: 3,
                    background: heatColor(HEATMAP_DATA[di][h]),
                    flexShrink: 0,
                    transition: 'background 0.2s',
                    cursor: 'default',
                    marginRight: 1,
                  }}
                />
              ))}
            </div>
          ))}
          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, marginLeft: 38 }}>
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>Few replies</span>
            {[0, 0.2, 0.5, 0.85].map(v => (
              <div key={v} style={{ width: 20, height: 12, borderRadius: 2, background: heatColor(v) }} />
            ))}
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>Most replies</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SVG Line Chart ───────────────────────────────────────────────────────────
function LineChart({ emailData, waData, voiceData }) {
  const W = 620, H = 160, PAD = { top: 12, right: 16, bottom: 28, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const len = emailData.length;

  if (len === 0) {
    return (
      <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
        No data available
      </div>
    );
  }

  const allVals = [...emailData, ...waData, ...voiceData].filter(v => v > 0);
  const maxVal  = allVals.length > 0 ? Math.max(...allVals) : 1;

  function toPoints(arr) {
    return arr.map((v, i) => {
      const x = PAD.left + (i / Math.max(len - 1, 1)) * innerW;
      const y = PAD.top + innerH - (v / maxVal) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  // X axis: show first, middle, last date labels
  const labelIdxs = [0, Math.floor(len / 2), len - 1];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map(frac => {
        const y = PAD.top + innerH - frac * innerH;
        return (
          <g key={frac}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="var(--border)" strokeWidth={0.5} />
            <text x={PAD.left - 4} y={y + 4} fontSize={9} fill="var(--muted)" textAnchor="end" fontFamily="var(--font-mono)">
              {Math.round(maxVal * frac)}
            </text>
          </g>
        );
      })}
      {/* Lines */}
      <polyline points={toPoints(emailData)} fill="none" stroke="var(--blue)"  strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={toPoints(waData)}    fill="none" stroke="var(--green)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={toPoints(voiceData)} fill="none" stroke="var(--amber)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* X axis labels */}
      {labelIdxs.map(i => {
        const x = PAD.left + (i / Math.max(len - 1, 1)) * innerW;
        return (
          <text key={i} x={x} y={H - 6} fontSize={9} fill="var(--muted)" textAnchor="middle" fontFamily="var(--font-mono)">
            Day {i + 1}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function HealthBar({ label, value, max = 100, warnAbove, dangerAbove, invert = false }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = invert
    ? (value >= 80 ? 'var(--green)' : value >= 60 ? 'var(--amber)' : 'var(--red)')
    : (dangerAbove && value > dangerAbove ? 'var(--red)' : warnAbove && value > warnAbove ? 'var(--amber)' : 'var(--green)');
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
        <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600, color }}>{value.toFixed(1)}%</span>
      </div>
      <div style={{ height: 8, background: 'var(--s2)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

// ─── Channel Overview Card ────────────────────────────────────────────────────
function OverviewCard({ icon, name, color, sent, replyRate, meetingRate, trend }) {
  const rateColor = replyRate >= 10 ? 'var(--green)' : replyRate >= 5 ? 'var(--amber)' : 'var(--red)';
  return (
    <div className="card" style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontWeight: 600, fontSize: 15, color }}>{name}</span>
        {trend !== undefined && (
          <span style={{ marginLeft: 'auto', fontSize: 13, color: trend >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Sent</div>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
          {safeNum(sent).toLocaleString()}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reply Rate</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: rateColor }}>{replyRate}%</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Meeting Conv.</div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{meetingRate}%</div>
        </div>
      </div>
    </div>
  );
}

// ─── Best channel badge ───────────────────────────────────────────────────────
function BestChannelBadge({ channel }) {
  const map = {
    email:     { label: 'Email',     bg: 'oklch(62% 0.19 245 / 0.15)', color: 'var(--blue)' },
    whatsapp:  { label: 'WhatsApp',  bg: 'oklch(65% 0.2 145 / 0.15)',  color: 'var(--green)' },
    voice:     { label: 'Voice',     bg: 'oklch(72% 0.18 65 / 0.15)',  color: 'var(--amber)' },
  };
  const cfg = map[channel] || { label: channel, bg: 'var(--s2)', color: 'var(--muted)' };
  return (
    <span style={{ fontSize: 10, background: cfg.bg, color: cfg.color, borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>
      {cfg.label}
    </span>
  );
}

function EmptyState({ setPage }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
      <div style={{ fontSize: 36, marginBottom: 12, color: 'var(--border)' }}>📈</div>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>No campaigns yet</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
        Create your first campaign to start tracking channel performance.
      </div>
      <button className="btn btn-blue btn-sm" onClick={() => setPage('new-campaign')}>
        Create your first campaign
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ChannelAnalytics() {
  const { campaigns, setPage } = useAppStore(useShallow(s => ({
    campaigns: s.campaigns,
    setPage: s.setPage,
  })));

  const [overview, setOverview] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch('/analytics/overview')
      .then(d => setOverview(d || {}))
      .catch(() => setOverview({}))
      .finally(() => setLoading(false));
  }, []);

  const ov = overview || {};

  // Channel totals from API
  const emailActions  = ov.emailActions  || [];
  const waActions     = ov.waActions     || [];
  const voiceActions  = ov.voiceActions  || [];

  const emailTotal   = safeNum(ov.emailSent   ?? emailActions.reduce((s, v) => s + safeNum(v), 0));
  const waTotal      = safeNum(ov.waSent      ?? waActions.reduce((s, v)    => s + safeNum(v), 0));
  const voiceTotal   = safeNum(ov.voiceDialed ?? voiceActions.reduce((s, v) => s + safeNum(v), 0));

  const emailReplyRate   = safeNum(ov.emailReplyRate   ?? (emailTotal > 0 ? pctNum(safeNum(ov.emailReplied),   emailTotal) : 0));
  const waReplyRate      = safeNum(ov.waReplyRate      ?? (waTotal    > 0 ? pctNum(safeNum(ov.waReplied),      waTotal)    : 0));
  const voiceReplyRate   = safeNum(ov.voiceAnswerRate  ?? (voiceTotal > 0 ? pctNum(safeNum(ov.voiceAnswered),  voiceTotal) : 0));

  const totalMeetings    = safeNum(ov.totalMeetings ?? 0);
  const emailMeetingRate = emailTotal > 0 ? pctNum(safeNum(ov.emailMeetings),  emailTotal) : 0;
  const waMeetingRate    = waTotal    > 0 ? pctNum(safeNum(ov.waMeetings),     waTotal)    : 0;
  const voiceMeetingRate = voiceTotal > 0 ? pctNum(safeNum(ov.voiceMeetings),  voiceTotal) : 0;

  // Chart data — pad to 30 points
  function padTo30(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return Array(30).fill(0);
    if (arr.length >= 30) return arr.slice(-30).map(safeNum);
    return [...Array(30 - arr.length).fill(0), ...arr.map(safeNum)];
  }
  const emailChart = padTo30(emailActions);
  const waChart    = padTo30(waActions);
  const voiceChart = padTo30(voiceActions);

  // ROI — meetings per 100 sent
  const emailRoi = emailTotal > 0 ? ((safeNum(ov.emailMeetings)  / emailTotal) * 100).toFixed(1) : '0.0';
  const waRoi    = waTotal    > 0 ? ((safeNum(ov.waMeetings)     / waTotal)    * 100).toFixed(1) : '0.0';
  const voiceRoi = voiceTotal > 0 ? ((safeNum(ov.voiceMeetings)  / voiceTotal) * 100).toFixed(1) : '0.0';
  const roiMax   = Math.max(parseFloat(emailRoi), parseFloat(waRoi), parseFloat(voiceRoi), 0.001);

  // Health metrics
  const bounceRate  = safeNum(ov.emailBounceRate  ?? (emailTotal > 0 ? pctNum(safeNum(ov.emailBounced),  emailTotal) : 0));
  const blockRate   = safeNum(ov.waBlockRate      ?? (waTotal    > 0 ? pctNum(safeNum(ov.waBlocked),     waTotal)    : 0));
  const unsubRate   = safeNum(ov.unsubRate        ?? 0);
  const healthScore = Math.max(0, Math.round(100 - bounceRate - blockRate - unsubRate));

  // Per-campaign stats for comparison table
  const campaignStats = useMemo(() => {
    if (!ov.campaigns) return [];
    return ov.campaigns.map(c => {
      const eSent   = safeNum(c.emailSent);
      const eReply  = safeNum(c.emailReplied);
      const wSent   = safeNum(c.waSent);
      const wReply  = safeNum(c.waReplied);
      const vDialed = safeNum(c.voiceDialed);
      const vAnsw   = safeNum(c.voiceAnswered);
      const mts     = safeNum(c.meetings);
      const eRate   = pctNum(eReply, eSent);
      const wRate   = pctNum(wReply, wSent);
      const vRate   = pctNum(vAnsw,  vDialed);
      const best    = eRate >= wRate && eRate >= vRate ? 'email'
                    : wRate >= eRate && wRate >= vRate ? 'whatsapp'
                    : 'voice';
      return { id: c.id, name: c.name, eSent, eRate, wSent, wRate, vDialed, vRate, mts, best };
    });
  }, [ov]);

  if (!loading && campaigns.length === 0) {
    return (
      <div className="page">
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <h1 className="page-title">Channel Analytics</h1>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Cross-campaign channel performance</div>
        </div>
        <EmptyState setPage={setPage} />
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="fade-up" style={{ marginBottom: 20 }}>
        <div className="breadcrumb">Analytics / <span>Channel Analytics</span></div>
        <h1 className="page-title" style={{ marginTop: 4 }}>Channel Analytics</h1>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
          Cross-campaign performance across Email, WhatsApp, and Voice
        </div>
      </div>

      {/* ── Overview Stats Row ────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }} className="fade-up">
        <OverviewCard
          icon="📧" name="Email"     color="var(--blue)"
          sent={emailTotal} replyRate={emailReplyRate} meetingRate={emailMeetingRate}
          trend={safeNum(ov.emailTrend)}
        />
        <OverviewCard
          icon="💬" name="WhatsApp"  color="var(--green)"
          sent={waTotal}    replyRate={waReplyRate}    meetingRate={waMeetingRate}
          trend={safeNum(ov.waTrend)}
        />
        <OverviewCard
          icon="📞" name="Voice"     color="var(--amber)"
          sent={voiceTotal} replyRate={voiceReplyRate} meetingRate={voiceMeetingRate}
          trend={safeNum(ov.voiceTrend)}
        />
      </div>

      {/* ── Performance Over Time ─────────────────────── */}
      <div className="card fade-up-1" style={{ marginBottom: 16 }}>
        <div className="card-title" style={{ marginBottom: 4 }}>Performance Over Time</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14 }}>Daily outreach volume — last 30 days</div>
        {loading ? (
          <div style={{ height: 160, background: 'var(--s1)', borderRadius: 8, animation: 'shimmer 1.5s infinite' }} />
        ) : (
          <LineChart emailData={emailChart} waData={waChart} voiceData={voiceChart} />
        )}
        {/* Legend */}
        <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
          {[
            { label: 'Email',     color: 'var(--blue)' },
            { label: 'WhatsApp',  color: 'var(--green)' },
            { label: 'Voice',     color: 'var(--amber)' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 16, height: 2, background: l.color, borderRadius: 2 }} />
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sending Heatmap ───────────────────────────── */}
      <SendingHeatmap />

      {/* ── Campaign Comparison Table ─────────────────── */}
      <div className="card fade-up-1" style={{ marginBottom: 16 }}>
        <div className="card-title" style={{ marginBottom: 14 }}>Campaign Comparison</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Campaign', 'Emails Sent', 'Email Reply%', 'WA Sent', 'WA Reply%', 'Voice Dialed', 'Voice Answer%', 'Meetings', 'Best Channel'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 10, color: 'var(--muted)', fontWeight: 600, padding: '0 12px 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 12 }}>Loading…</td>
                </tr>
              ) : campaignStats.length === 0 ? (
                /* Fall back to local campaign list with zero data */
                campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 12 }}>
                      No data yet
                    </td>
                  </tr>
                ) : (
                  campaigns.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500 }}>{c.name}</td>
                      {['—','—','—','—','—','—'].map((v, i) => (
                        <td key={i} style={{ padding: '10px 12px', fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{v}</td>
                      ))}
                      <td style={{ padding: '10px 12px' }}>
                        <BestChannelBadge channel="email" />
                      </td>
                    </tr>
                  ))
                )
              ) : (
                campaignStats.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500 }}>{c.name}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{c.eSent.toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'var(--font-mono)', color: c.eRate >= 10 ? 'var(--green)' : c.eRate >= 5 ? 'var(--amber)' : 'var(--red)' }}>{c.eRate}%</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{c.wSent.toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'var(--font-mono)', color: c.wRate >= 10 ? 'var(--green)' : c.wRate >= 5 ? 'var(--amber)' : 'var(--red)' }}>{c.wRate}%</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{c.vDialed.toLocaleString()}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'var(--font-mono)', color: c.vRate >= 20 ? 'var(--green)' : c.vRate >= 10 ? 'var(--amber)' : 'var(--red)' }}>{c.vRate}%</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--green)' }}>{c.mts}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <BestChannelBadge channel={c.best} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Channel ROI ───────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div className="card-title" style={{ marginBottom: 12 }}>Channel ROI — meetings per 100 sent</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Email ROI',     icon: '📧', roi: emailRoi, color: 'var(--blue)',  desc: 'per 100 emails sent' },
            { label: 'WhatsApp ROI',  icon: '💬', roi: waRoi,    color: 'var(--green)', desc: 'per 100 WA sent' },
            { label: 'Voice ROI',     icon: '📞', roi: voiceRoi, color: 'var(--amber)', desc: 'per 100 calls dialed' },
          ].map(r => {
            const isWinner = parseFloat(r.roi) >= roiMax && roiMax > 0;
            return (
              <div
                key={r.label}
                className="card"
                style={{
                  border: isWinner ? '2px solid var(--green)' : '1px solid var(--border)',
                  position: 'relative',
                }}
              >
                {isWinner && (
                  <div style={{
                    position: 'absolute', top: -10, right: 12,
                    background: 'var(--green)', color: '#fff',
                    fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>
                    Best ROI
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 20 }}>{r.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: 14, color: r.color }}>{r.label}</span>
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-mono)', color: isWinner ? 'var(--green)' : 'var(--text)', lineHeight: 1, marginBottom: 4 }}>
                  {r.roi}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>meetings {r.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bounce & Health ───────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="fade-up-2">
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Bounce & Health Metrics</div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 36, background: 'var(--s1)', borderRadius: 6 }} className="shimmer" />
              ))}
            </div>
          ) : (
            <>
              <HealthBar
                label="Email Bounce Rate"
                value={bounceRate}
                warnAbove={3}
                dangerAbove={5}
              />
              <HealthBar
                label="WhatsApp Block Rate"
                value={blockRate}
                warnAbove={2}
                dangerAbove={5}
              />
              <HealthBar
                label="Unsubscribe Rate"
                value={unsubRate}
                warnAbove={1}
                dangerAbove={3}
              />
            </>
          )}
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Overall List Health</div>
          {loading ? (
            <div style={{ height: 80, background: 'var(--s1)', borderRadius: 8 }} className="shimmer" />
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '20px 0' }}>
                <div style={{
                  fontSize: 56,
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1,
                  color: healthScore >= 80 ? 'var(--green)' : healthScore >= 60 ? 'var(--amber)' : 'var(--red)',
                }}>
                  {healthScore}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
                  out of 100
                </div>
                <div style={{
                  marginTop: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 14px',
                  borderRadius: 12,
                  background: healthScore >= 80
                    ? 'oklch(65% 0.2 145 / 0.15)'
                    : healthScore >= 60
                    ? 'oklch(72% 0.18 65 / 0.15)'
                    : 'oklch(60% 0.22 25 / 0.15)',
                  color: healthScore >= 80 ? 'var(--green)' : healthScore >= 60 ? 'var(--amber)' : 'var(--red)',
                }}>
                  {healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Fair — watch bounce rate' : 'At risk — review list quality'}
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 4 }}>
                Calculated as 100 − bounce% − block% − unsub%
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
