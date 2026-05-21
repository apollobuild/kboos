import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../services/api.js';
import { generateCampaignPDF } from '../services/reports.js';

function fmtRM(n) {
  if (!n || n === 0) return '—';
  return `RM ${n.toFixed(2)}`;
}
function pct(a, b) { return b > 0 ? `${Math.round((a / b) * 100)}%` : '0%'; }
function convPct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }

const CHANNEL_COLOR = { email:'#0078ff', whatsapp:'#25d366', call:'#f59e0b', linkedin:'#0a66c2' };

function engineLabel(c) {
  if (c.status === 'active' && c.startedAt) {
    const days = Math.floor((Date.now() - new Date(c.startedAt).getTime()) / 86400000);
    return { label: `Day ${days + 1} · Running`, color: 'var(--green)' };
  }
  if (c.status === 'awaiting_launch')   return { label: 'Ready to Launch', color: 'var(--amber)' };
  if (c.status === 'enriching')         return { label: 'Enriching…',      color: 'var(--blue)' };
  if (c.status === 'awaiting_approval') return { label: 'Pending Review',  color: 'var(--blue)' };
  if (c.status === 'paused')            return { label: 'Paused',          color: 'var(--muted)' };
  return null;
}

export function Reporting() {
  const { campaigns, leads, businesses } = useAppStore(useShallow(s => ({
    campaigns: s.campaigns, leads: s.leads, businesses: s.businesses,
  })));

  const [bizKey,     setBizKey]     = useState('all');
  const [period,     setPeriod]     = useState('month');
  const [meetings,   setMeetings]   = useState(0);
  const [dealVal,    setDealVal]    = useState(5000);
  const [generating, setGenerating] = useState(false);
  const [spendData,  setSpendData]  = useState(null);

  useEffect(() => {
    setSpendData(null);
    apiFetch(`/wallet/spend-summary?period=${period}`).then(setSpendData).catch(() => {});
  }, [period]);

  // Date boundary for period filter
  const periodStart = (() => {
    const now = new Date();
    if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === 'last') return new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return null; // 'all' — no filter
  })();
  const periodEnd = period === 'last'
    ? new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    : null;

  const inPeriod = (dateStr) => {
    if (!periodStart) return true;
    const d = new Date(dateStr);
    if (isNaN(d)) return true;
    if (periodEnd && d >= periodEnd) return false;
    return d >= periodStart;
  };

  const filteredCampaigns = campaigns.filter(c =>
    (bizKey === 'all' || c.bizId === bizKey) && inPeriod(c.createdAt)
  );
  const campaignIds = new Set(filteredCampaigns.map(c => c.id));
  const filteredLeads = leads.filter(l => campaignIds.has(l.campaignId) && inPeriod(l.createdAt));

  // Funnel counts
  const scraped     = filteredCampaigns.reduce((s, c) => s + (c.total || 0), 0);
  const enriched    = filteredLeads.filter(l => l.enriched).length;
  const contacted   = filteredCampaigns.reduce((s, c) => s + (c.leads || 0), 0);
  const openedCnt   = filteredLeads.filter(l => ['opened','replied','hot','meeting_booked'].includes(l.status)).length;
  const repliedCnt  = filteredLeads.filter(l => ['replied','hot','meeting_booked'].includes(l.status)).length;
  const hotCnt      = filteredLeads.filter(l => ['hot','meeting_booked'].includes(l.status)).length;
  const meetingsCnt = filteredLeads.filter(l => l.status === 'meeting_booked').length;

  // Funnel steps — no Enriched step in main bars (shown as badge on Scraped)
  // Bar width = % of scraped for visual scale; right label = step-to-step conversion
  const funnelSteps = [
    { label: 'Scraped',   val: scraped,    prev: null,       color: '#6366f1' },
    { label: 'Contacted', val: contacted,  prev: scraped,    color: '#0078ff' },
    { label: 'Opened',    val: openedCnt,  prev: contacted,  color: '#06b6d4' },
    { label: 'Replied',   val: repliedCnt, prev: openedCnt,  color: '#10b981' },
    { label: 'Hot',       val: hotCnt,     prev: repliedCnt, color: '#f59e0b' },
    { label: 'Meetings',  val: meetingsCnt,prev: hotCnt,     color: '#22c55e' },
  ];

  // Find the step with the worst conversion (bottleneck)
  let bottleneckIdx = -1;
  let lowestConv = 101;
  funnelSteps.forEach((s, i) => {
    if (s.prev === null || s.prev === 0) return;
    const c = convPct(s.val, s.prev);
    if (c < lowestConv) { lowestConv = c; bottleneckIdx = i; }
  });

  // Real costs from spend-summary
  const realTotal = spendData?.total || 0;

  // Cost efficiency metrics
  function costPer(denominator) {
    if (!realTotal || !denominator) return null;
    return realTotal / denominator;
  }

  const efficiencyRows = [
    { label: 'per Lead Contacted', val: costPer(contacted),  icon: '📨' },
    { label: 'per Open',           val: costPer(openedCnt),  icon: '👁' },
    { label: 'per Reply',          val: costPer(repliedCnt), icon: '↩' },
    { label: 'per Hot Lead',       val: costPer(hotCnt),     icon: '🔥' },
    { label: 'per Meeting Booked', val: costPer(meetingsCnt),icon: '📅' },
  ];

  // Best campaign by reply rate
  const bestCampaign = filteredCampaigns.reduce((best, c) => {
    const cLeads = filteredLeads.filter(l => l.campaignId === c.id);
    if (!cLeads.length) return best;
    const rate = cLeads.filter(l => ['replied','hot','meeting_booked'].includes(l.status)).length / cLeads.length;
    return (!best || rate > best.rate) ? { name: c.name, rate } : best;
  }, null);

  const revenue = meetings * dealVal;
  const roi = realTotal > 0 ? Math.round(((revenue - realTotal) / realTotal) * 100) : 0;

  function campaignRepliedPct(campaign) {
    const cLeads = filteredLeads.filter(l => l.campaignId === campaign.id);
    if (!cLeads.length) return campaign.open || '0%';
    const cnt = cLeads.filter(l => ['replied','hot','meeting_booked'].includes(l.status)).length;
    return `${((cnt / cLeads.length) * 100).toFixed(1)}%`;
  }

  const bizName = bizKey === 'all' ? 'All Businesses' : (businesses.find(b => b.id === bizKey)?.name || bizKey);
  useEffect(() => { setMeetings(meetingsCnt); }, [bizKey, meetingsCnt]);

  async function handlePDF() {
    setGenerating(true);
    try {
      await generateCampaignPDF(bizName, {
        funnel: funnelSteps.map(s => ({ ...s, pct: Math.round((s.val / (scraped || 1)) * 100) })),
        campaigns: filteredCampaigns.map(c => ({
          name: c.name, status: c.status, leads: c.leads,
          opened: c.open || '0%', replied: campaignRepliedPct(c), hot: c.hot, spend: c.spend,
        })),
        roi: { revenue, platformCost: Math.round(realTotal), roi, meetings, dealVal },
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
          <select value={period} onChange={e => setPeriod(e.target.value)}
            style={{ background:'var(--card)', border:'1px solid var(--border)', color:'var(--text-1)', padding:'6px 12px', borderRadius:6, fontSize:13 }}>
            <option value="month">This Month</option>
            <option value="last">Last Month</option>
            <option value="all">All Time</option>
          </select>
          <select value={bizKey} onChange={e => setBizKey(e.target.value)}
            style={{ background:'var(--card)', border:'1px solid var(--border)', color:'var(--text-1)', padding:'6px 12px', borderRadius:6, fontSize:13 }}>
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
        <KpiCard label="Total Leads"     value={filteredLeads.length.toLocaleString()} sub={`across ${filteredCampaigns.length} campaigns`} color="var(--blue)" />
        <KpiCard label="Hot Leads"       value={hotCnt}      sub={pct(hotCnt, contacted) + ' of contacted'} color="var(--amber)" />
        <KpiCard label="Meetings Booked" value={meetingsCnt} sub={pct(meetingsCnt, repliedCnt) + ' of replies'} color="var(--green)" />
        <KpiCard
          label="API Spend (MTD)"
          value={spendData ? `RM ${Math.round(realTotal).toLocaleString()}` : '—'}
          sub={spendData ? `${Math.round((realTotal / (spendData.budget || 1000)) * 100)}% of RM ${Math.round(spendData.budget || 1000).toLocaleString()} budget` : 'loading…'}
          color={realTotal / (spendData?.budget || 1000) > 0.8 ? 'var(--red)' : 'var(--green)'}
        />
      </div>

      {/* Conversion Funnel */}
      <div className="card fade-up-2 mb-4">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ fontWeight:600 }}>Conversion Funnel</div>
          {enriched > 0 && (
            <span style={{ fontSize:11, color:'#a855f7', background:'#a855f722', padding:'2px 8px', borderRadius:10 }}>
              {enriched} enriched via Apollo
            </span>
          )}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {funnelSteps.map((step, i) => {
            const barPct = scraped > 0 ? Math.max((step.val / scraped) * 100, step.val > 0 ? 1.5 : 0) : 0;
            const stepConv = step.prev !== null ? convPct(step.val, step.prev) : 100;
            const isBottleneck = i === bottleneckIdx && step.prev > 0;
            const dropped = step.prev !== null && step.prev > 0 ? step.prev - step.val : 0;

            return (
              <div key={step.label}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  {/* Label */}
                  <div style={{ width:76, fontSize:12, color: isBottleneck ? '#f59e0b' : 'var(--text-2)', textAlign:'right', flexShrink:0, fontWeight: isBottleneck ? 600 : 400 }}>
                    {step.label}
                    {isBottleneck && <span title="Biggest drop-off"> ⚠</span>}
                  </div>
                  {/* Bar */}
                  <div style={{ flex:1, background:'var(--bg-2)', borderRadius:4, height:26, overflow:'hidden', position:'relative' }}>
                    <div style={{
                      width: `${barPct}%`, height:'100%',
                      background: isBottleneck ? '#f59e0b' : step.color,
                      borderRadius:4, display:'flex', alignItems:'center', paddingLeft:8,
                      fontSize:12, fontFamily:'var(--font-mono)', fontWeight:600,
                      color:'#fff', minWidth: step.val > 0 ? 36 : 0,
                      transition:'width 0.6s cubic-bezier(.4,0,.2,1)',
                      opacity: isBottleneck ? 0.9 : 1,
                    }}>
                      {step.val > 0 ? step.val.toLocaleString() : ''}
                    </div>
                  </div>
                  {/* Step-to-step conversion */}
                  <div style={{ width:52, textAlign:'right', flexShrink:0 }}>
                    {step.prev !== null ? (
                      <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color: isBottleneck ? '#f59e0b' : stepConv >= 20 ? 'var(--green)' : stepConv >= 5 ? 'var(--text-3)' : 'var(--muted)', fontWeight:600 }}>
                        {stepConv}%
                      </span>
                    ) : (
                      <span style={{ fontSize:11, color:'var(--muted)' }}>base</span>
                    )}
                  </div>
                </div>
                {/* Drop-off hint between steps */}
                {i < funnelSteps.length - 1 && dropped > 0 && (
                  <div style={{ paddingLeft: 88, fontSize:10, color:'var(--muted)', marginTop:1, marginBottom:1 }}>
                    ↳ {dropped.toLocaleString()} dropped
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop:12, paddingTop:10, borderTop:'1px solid var(--border)', display:'flex', gap:20, fontSize:11, color:'var(--muted)' }}>
          <span>Bar width = % of scraped &nbsp;·&nbsp; Right % = conversion from previous step</span>
          {bottleneckIdx > 0 && <span style={{ color:'#f59e0b' }}>⚠ Bottleneck: {funnelSteps[bottleneckIdx].label} ({lowestConv}% from prev)</span>}
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
                      : <span style={{ color:'var(--muted)', fontSize:11 }}>—</span>}
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      {(c.channels || []).map(ch => (
                        <span key={ch} style={{ fontSize:10, padding:'1px 6px', borderRadius:10, background:(CHANNEL_COLOR[ch]||'#666')+'22', color:CHANNEL_COLOR[ch]||'#888', fontWeight:500 }}>{ch}</span>
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
              <input type="number" min={0} value={meetings} onChange={e => setMeetings(Number(e.target.value))}
                style={{ background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)', padding:'8px 12px', borderRadius:6, width:'100%', fontSize:14, fontFamily:'var(--font-mono)' }} />
            </div>
            <div>
              <label style={{ fontSize:12, color:'var(--text-2)', display:'block', marginBottom:4 }}>Avg Deal Value (RM)</label>
              <input type="number" min={0} value={dealVal} onChange={e => setDealVal(Number(e.target.value))}
                style={{ background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)', padding:'8px 12px', borderRadius:6, width:'100%', fontSize:14, fontFamily:'var(--font-mono)' }} />
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

        {/* Cost Efficiency — replaces Cost Breakdown (which lives in Settings → Wallet) */}
        <div className="card fade-up-4">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:4 }}>
            <div style={{ fontWeight:600 }}>Cost Efficiency</div>
            <span style={{ fontSize:10, color:'var(--muted)' }}>total spend ÷ result</span>
          </div>
          <div style={{ fontSize:11, color:'var(--muted)', marginBottom:14 }}>
            What each outcome actually costs you
          </div>

          {!spendData && (
            <div style={{ color:'var(--muted)', fontSize:12 }}>Loading…</div>
          )}

          {spendData && (
            <>
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                {efficiencyRows.map(row => (
                  <div key={row.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                    <span style={{ color:'var(--text-2)', fontSize:13 }}>
                      <span style={{ marginRight:6 }}>{row.icon}</span>{row.label}
                    </span>
                    <span style={{ fontFamily:'var(--font-mono)', fontWeight:600, color: row.val ? 'var(--text-1)' : 'var(--muted)' }}>
                      {row.val ? fmtRM(row.val) : '—'}
                    </span>
                  </div>
                ))}
              </div>

              {bestCampaign && (
                <div style={{ marginTop:14, padding:'10px 12px', background:'var(--bg-2)', borderRadius:8, border:'1px solid #22c55e33' }}>
                  <div style={{ fontSize:10, color:'#22c55e', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>
                    Best Performing Campaign
                  </div>
                  <div style={{ fontSize:13, fontWeight:500 }}>{bestCampaign.name}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                    {Math.round(bestCampaign.rate * 100)}% reply rate
                  </div>
                </div>
              )}
            </>
          )}
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
