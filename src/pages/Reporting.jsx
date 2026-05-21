import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../services/api.js';
import { generateCampaignPDF } from '../services/reports.js';

const STATUS_BADGE = {
  active: 'green', awaiting_launch: 'amber', enriching: 'blue',
  awaiting_approval: 'blue', paused: 'muted', completed: 'muted',
};

const SOURCE_BADGE = {
  exact:        { label: 'Exact',        color: '#00d97e' },
  calculated:   { label: 'Calculated',   color: '#0078ff' },
  live:         { label: 'Live API',     color: '#00d97e' },
  subscription: { label: 'Subscription', color: '#a855f7' },
};

function fmtRM(n) { return `RM ${Math.round(n).toLocaleString()}`; }
function pct(a, b) { return b > 0 ? `${Math.round((a / b) * 100)}%` : '0%'; }

function engineLabel(c) {
  if (c.status === 'active' && c.startedAt) {
    const days = Math.floor((Date.now() - new Date(c.startedAt).getTime()) / 86400000);
    return { label: `Day ${days + 1} · Running`, color: 'var(--green)' };
  }
  if (c.status === 'awaiting_launch')    return { label: 'Ready to Launch', color: 'var(--amber)' };
  if (c.status === 'enriching')          return { label: 'Enriching…',       color: 'var(--blue)' };
  if (c.status === 'awaiting_approval')  return { label: 'Pending Review',   color: 'var(--blue)' };
  if (c.status === 'paused')             return { label: 'Paused',           color: 'var(--muted)' };
  return null;
}

const CHANNEL_COLOR = { email:'#0078ff', whatsapp:'#25d366', call:'#f59e0b', linkedin:'#0a66c2' };

export function Reporting() {
  const { campaigns, leads, businesses } = useAppStore(useShallow(s => ({
    campaigns: s.campaigns, leads: s.leads, businesses: s.businesses,
  })));

  const [bizKey,      setBizKey]      = useState('all');
  const [period,      setPeriod]      = useState('month');
  const [meetings,    setMeetings]    = useState(0);
  const [dealVal,     setDealVal]     = useState(5000);
  const [generating,  setGenerating]  = useState(false);
  const [spendData,   setSpendData]   = useState(null);

  useEffect(() => {
    apiFetch('/wallet/spend-summary').then(setSpendData).catch(() => {});
  }, []);

  const filteredCampaigns = bizKey === 'all'
    ? campaigns
    : campaigns.filter(c => c.bizId === bizKey);

  const campaignIds = new Set(filteredCampaigns.map(c => c.id));
  const filteredLeads = leads.filter(l => campaignIds.has(l.campaignId));

  // Funnel counts from real lead statuses
  const scraped     = filteredCampaigns.reduce((s, c) => s + (c.total || 0), 0);
  const enriched    = filteredLeads.filter(l => l.enriched).length;
  const contacted   = filteredCampaigns.reduce((s, c) => s + (c.leads || 0), 0);
  const openedCnt   = filteredLeads.filter(l => ['opened','replied','hot','meeting_booked'].includes(l.status)).length;
  const repliedCnt  = filteredLeads.filter(l => ['replied','hot','meeting_booked'].includes(l.status)).length;
  const hotCnt      = filteredLeads.filter(l => ['hot','meeting_booked'].includes(l.status)).length;
  const meetingsCnt = filteredLeads.filter(l => l.status === 'meeting_booked').length;

  const funnelMax = scraped || 1;
  const funnelSteps = [
    { label: 'Scraped',   val: scraped,    color: 'var(--blue)' },
    { label: 'Enriched',  val: enriched,   color: 'var(--blue)' },
    { label: 'Contacted', val: contacted,  color: 'var(--blue)' },
    { label: 'Opened',    val: openedCnt,  color: 'var(--green)' },
    { label: 'Replied',   val: repliedCnt, color: 'var(--amber)' },
    { label: 'Hot',       val: hotCnt,     color: 'var(--amber)' },
    { label: 'Meetings',  val: meetingsCnt,color: 'var(--green)' },
  ];

  // Real costs from spend-summary — server returns breakdown as object, convert to array
  const realTotal = spendData?.total || 0;
  const bd = spendData?.breakdown || {};
  const breakdown = spendData ? [
    { label: 'Claude AI',            rm: bd.claude?.costRm  || 0, source: bd.claude?.source  || 'exact' },
    { label: 'SendGrid (email)',      rm: bd.email?.costRm   || 0, source: bd.email?.source   || 'calculated' },
    { label: 'WATI (WhatsApp)',       rm: bd.wa?.costRm      || 0, source: bd.wa?.source      || 'calculated' },
    { label: 'Vapi (calls)',          rm: bd.call?.costRm    || 0, source: bd.call?.source    || 'none' },
    { label: 'Apollo (enrichment)',   rm: bd.enrich?.costRm  || 0, source: bd.enrich?.source  || 'subscription' },
    { label: 'Outscraper (scraping)', rm: bd.scraper?.costRm || 0, source: bd.scraper?.source || 'exact' },
  ] : [];

  const revenue = meetings * dealVal;
  const roi = realTotal > 0 ? Math.round(((revenue - realTotal) / realTotal) * 100) : 0;

  function campaignRepliedPct(campaign) {
    const cLeads = filteredLeads.filter(l => l.campaignId === campaign.id);
    if (!cLeads.length) return campaign.open || '0%';
    const cnt = cLeads.filter(l => ['replied','hot','meeting_booked'].includes(l.status)).length;
    return `${((cnt / cLeads.length) * 100).toFixed(1)}%`;
  }

  const bizName = bizKey === 'all'
    ? 'All Businesses'
    : (businesses.find(b => b.id === bizKey)?.name || bizKey);

  useEffect(() => { setMeetings(meetingsCnt); }, [bizKey, meetingsCnt]);

  async function handlePDF() {
    setGenerating(true);
    try {
      await generateCampaignPDF(bizName, {
        funnel: funnelSteps.map(s => ({ ...s, pct: Math.round((s.val / funnelMax) * 100) })),
        campaigns: filteredCampaigns.map(c => ({
          name: c.name, status: c.status, leads: c.leads,
          opened: c.open || '0%', replied: campaignRepliedPct(c),
          hot: c.hot, spend: c.spend,
        })),
        roi: { revenue, platformCost: Math.round(realTotal), roi, meetings, dealVal },
        costs: breakdown,
        date: new Date().toLocaleDateString(),
      });
    } catch(e) { console.error(e); }
    setGenerating(false);
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 fade-up">
        <div>
          <div className="breadcrumb">Reports / <span>Reporting & ROI</span></div>
          <h1 className="page-title" style={{ marginTop: 4 }}>Reporting & ROI</h1>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <select
            value={period} onChange={e => setPeriod(e.target.value)}
            style={{ background:'var(--card)', border:'1px solid var(--border)', color:'var(--text-1)', padding:'6px 12px', borderRadius:6, fontSize:13 }}
          >
            <option value="month">This Month</option>
            <option value="last">Last Month</option>
            <option value="all">All Time</option>
          </select>
          <select
            value={bizKey} onChange={e => setBizKey(e.target.value)}
            style={{ background:'var(--card)', border:'1px solid var(--border)', color:'var(--text-1)', padding:'6px 12px', borderRadius:6, fontSize:13 }}
          >
            <option value="all">All Businesses</option>
            {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button className="btn btn-blue" onClick={handlePDF} disabled={generating}>
            {generating ? 'Generating…' : '↓ PDF Report'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:16 }} className="fade-up-1">
        <KpiCard label="Total Leads"     value={filteredLeads.length.toLocaleString()} sub={`${filteredCampaigns.length} campaigns`} color="var(--blue)" />
        <KpiCard label="Hot Leads"       value={hotCnt}      sub={pct(hotCnt, filteredLeads.length) + ' of contacted'} color="var(--amber)" />
        <KpiCard label="Meetings Booked" value={meetingsCnt} sub={pct(meetingsCnt, repliedCnt) + ' conversion'} color="var(--green)" />
        <KpiCard
          label="API Spend (MTD)"
          value={spendData ? fmtRM(realTotal) : '—'}
          sub={spendData ? `${Math.round((realTotal / (spendData.budget || 1000)) * 100)}% of ${fmtRM(spendData.budget || 1000)} budget` : 'loading…'}
          color={realTotal / (spendData?.budget || 1000) > 0.8 ? 'var(--red)' : 'var(--green)'}
        />
      </div>

      {/* Funnel */}
      <div className="card fade-up-2 mb-4">
        <div style={{ fontWeight:600, marginBottom:16 }}>Conversion Funnel</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {funnelSteps.map(step => (
            <div key={step.label} style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:80, fontSize:12, color:'var(--text-2)', textAlign:'right', flexShrink:0 }}>{step.label}</div>
              <div style={{ flex:1, background:'var(--bg-2)', borderRadius:4, height:28, overflow:'hidden' }}>
                <div style={{
                  width: `${Math.max((step.val / funnelMax) * 100, step.val > 0 ? 2 : 0)}%`,
                  height:'100%', background:step.color, borderRadius:4,
                  display:'flex', alignItems:'center', paddingLeft:8,
                  fontSize:12, fontFamily:'var(--font-mono)', fontWeight:600,
                  color:'var(--bg-1)', minWidth: step.val > 0 ? 40 : 0,
                  transition:'width 0.5s cubic-bezier(.4,0,.2,1)',
                }}>
                  {step.val > 0 ? step.val.toLocaleString() : ''}
                </div>
              </div>
              <div style={{ width:48, fontSize:12, color:'var(--text-3)', textAlign:'right', flexShrink:0, fontFamily:'var(--font-mono)' }}>
                {funnelMax > 1 ? `${Math.round((step.val / funnelMax) * 100)}%` : '0%'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Campaign Table */}
      <div className="card fade-up-3 mb-4">
        <div style={{ fontWeight:600, marginBottom:12 }}>Campaign Performance</div>
        <table className="table" style={{ width:'100%' }}>
          <thead>
            <tr>
              <th>Campaign</th><th>Engine</th><th>Channels</th>
              <th>Leads</th><th>Open Rate</th><th>Replied</th><th>Hot</th><th>Meetings</th>
            </tr>
          </thead>
          <tbody>
            {filteredCampaigns.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign:'center', color:'var(--muted)', padding:'16px 0', fontSize:12 }}>No campaigns</td></tr>
            )}
            {filteredCampaigns.map(c => {
              const eng = engineLabel(c);
              const cLeads = filteredLeads.filter(l => l.campaignId === c.id);
              const cMeetings = cLeads.filter(l => l.status === 'meeting_booked').length;
              return (
                <tr key={c.id}>
                  <td style={{ fontWeight:500 }}>{c.name}</td>
                  <td>
                    {eng
                      ? <span style={{ fontSize:11, color:eng.color, fontWeight:500 }}>{eng.label}</span>
                      : <span style={{ color:'var(--muted)', fontSize:11 }}>—</span>
                    }
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      {(c.channels || []).map(ch => (
                        <span key={ch} style={{
                          fontSize:10, padding:'1px 6px', borderRadius:10,
                          background: (CHANNEL_COLOR[ch] || '#666') + '22',
                          color: CHANNEL_COLOR[ch] || '#888', fontWeight:500,
                        }}>{ch}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontFamily:'var(--font-mono)' }}>{(c.leads||0).toLocaleString()}</td>
                  <td style={{ fontFamily:'var(--font-mono)' }}>{c.open || '—'}</td>
                  <td style={{ fontFamily:'var(--font-mono)' }}>{campaignRepliedPct(c)}</td>
                  <td style={{ fontFamily:'var(--font-mono)', color:'var(--amber)' }}>{c.hot || 0}</td>
                  <td style={{ fontFamily:'var(--font-mono)', color:'var(--green)', fontWeight:600 }}>{cMeetings}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* ROI Calculator */}
        <div className="card fade-up-4">
          <div style={{ fontWeight:600, marginBottom:16 }}>ROI Calculator</div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <label style={{ fontSize:12, color:'var(--text-2)', display:'block', marginBottom:4 }}>Meetings Booked</label>
              <input
                type="number" min={0} value={meetings}
                onChange={e => setMeetings(Number(e.target.value))}
                style={{ background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)', padding:'8px 12px', borderRadius:6, width:'100%', fontSize:14, fontFamily:'var(--font-mono)' }}
              />
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--text-2)', display:'block', marginBottom:4 }}>Avg Deal Value (RM)</label>
              <input
                type="number" min={0} value={dealVal}
                onChange={e => setDealVal(Number(e.target.value))}
                style={{ background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)', padding:'8px 12px', borderRadius:6, width:'100%', fontSize:14, fontFamily:'var(--font-mono)' }}
              />
            </div>
            <div style={{ background:'var(--bg-2)', borderRadius:8, padding:16, marginTop:4 }}>
              <Row label="Pipeline Revenue" val={<span style={{ color:'var(--green)', fontWeight:700 }}>RM {revenue.toLocaleString()}</span>} />
              <Row label="API Cost (real)" val={`RM ${Math.round(realTotal).toLocaleString()}`} />
              <Row label="Net Return" val={`RM ${(revenue - Math.round(realTotal)).toLocaleString()}`} />
              <div style={{ height:1, background:'var(--border)', margin:'8px 0' }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:600 }}>ROI</span>
                <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:20, color: roi > 0 ? 'var(--green)' : 'var(--red)' }}>
                  {roi > 0 ? '+' : ''}{roi.toLocaleString()}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Breakdown — real from ApiUsageLog */}
        <div className="card fade-up-4">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontWeight:600 }}>Cost Breakdown</div>
            <span style={{ fontSize:10, color:'var(--muted)' }}>This Month · RM = USD × {spendData?.usdRmRate || 4.70}</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {breakdown.length === 0 && !spendData && (
              <div style={{ color:'var(--muted)', fontSize:12, padding:'12px 0' }}>Loading…</div>
            )}
            {breakdown.map(row => {
              const badge = SOURCE_BADGE[row.source] || SOURCE_BADGE.calculated;
              return (
                <div key={row.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ color:'var(--text-2)', fontSize:13 }}>{row.label}</span>
                    <span style={{ fontSize:9, padding:'1px 5px', borderRadius:4, background: badge.color + '22', color: badge.color, fontWeight:600, letterSpacing:'0.04em' }}>
                      {badge.label}
                    </span>
                  </div>
                  <span style={{ fontFamily:'var(--font-mono)', fontWeight:600 }}>{fmtRM(row.rm)}</span>
                </div>
              );
            })}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:10 }}>
              <span style={{ fontWeight:600 }}>Total</span>
              <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--blue)', fontSize:15 }}>{fmtRM(realTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="card" style={{ padding:'14px 16px' }}>
      <div style={{ fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:700, fontFamily:'var(--font-mono)', color, lineHeight:1, marginBottom:4 }}>{value}</div>
      <div style={{ fontSize:11, color:'var(--text-3)' }}>{sub}</div>
    </div>
  );
}

function Row({ label, val }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
      <span style={{ color:'var(--text-2)', fontSize:13 }}>{label}</span>
      <span style={{ fontFamily:'var(--font-mono)' }}>{val}</span>
    </div>
  );
}
