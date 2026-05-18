import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { generateCampaignPDF } from '../services/reports.js';

const STATUS_COLORS = { active:'green', awaiting_approval:'amber', paused:'muted' };

// Cost split ratios: Apollo 27%, SendGrid 23%, WATI 31%, Retell 19%
const COST_RATIOS = { apollo: 0.269, sendgrid: 0.228, wati: 0.311, retell: 0.192 };

function fmtRM(n) { return `RM ${Math.round(n)}`; }

export function Reporting() {
  const { campaigns, leads, businesses } = useAppStore(useShallow(s => ({
    campaigns: s.campaigns, leads: s.leads, businesses: s.businesses,
  })));

  const [bizKey, setBizKey] = useState('all');
  const [meetings, setMeetings] = useState(0);
  const [dealVal, setDealVal] = useState(5000);
  const [generating, setGenerating] = useState(false);

  // Filtered campaigns and leads for selected business
  const filteredCampaigns = bizKey === 'all'
    ? campaigns
    : campaigns.filter(c => c.bizId === bizKey);

  const campaignIds = new Set(filteredCampaigns.map(c => c.id));
  const filteredLeads = leads.filter(l => campaignIds.has(l.campaignId));

  // Funnel from real data
  const scraped    = filteredCampaigns.reduce((s, c) => s + (c.total || 0), 0);
  const contacted  = filteredCampaigns.reduce((s, c) => s + (c.leads || 0), 0);
  const openedCnt  = filteredLeads.filter(l => ['opened','replied','hot','meeting_booked'].includes(l.status)).length;
  const repliedCnt = filteredLeads.filter(l => ['replied','hot','meeting_booked'].includes(l.status)).length;
  const meetingsCnt = filteredLeads.filter(l => l.status === 'meeting_booked').length;

  const platformCost = filteredCampaigns.reduce((s, c) => {
    return s + (parseInt((c.spend || '0').replace(/[^\d]/g, ''), 10) || 0);
  }, 0);

  const costs = {
    apollo:   fmtRM(platformCost * COST_RATIOS.apollo),
    sendgrid: fmtRM(platformCost * COST_RATIOS.sendgrid),
    wati:     fmtRM(platformCost * COST_RATIOS.wati),
    retell:   fmtRM(platformCost * COST_RATIOS.retell),
  };

  // Reset meetings to real count when business changes
  useEffect(() => {
    setMeetings(meetingsCnt);
  }, [bizKey, meetingsCnt]);

  const revenue = meetings * dealVal;
  const roi = platformCost > 0 ? Math.round(((revenue - platformCost) / platformCost) * 100) : 0;

  const funnelMax = scraped || 1;
  const funnelSteps = [
    { label:'Scraped',   val: scraped,    color:'var(--blue)' },
    { label:'Contacted', val: contacted,  color:'var(--blue)' },
    { label:'Opened',    val: openedCnt,  color:'var(--green)' },
    { label:'Replied',   val: repliedCnt, color:'var(--amber)' },
    { label:'Meetings',  val: meetingsCnt,color:'var(--amber)' },
  ];

  function campaignRepliedPct(campaign) {
    const cLeads = filteredLeads.filter(l => l.campaignId === campaign.id);
    if (!cLeads.length) return campaign.open || '0%';
    const cnt = cLeads.filter(l => ['replied','hot','meeting_booked'].includes(l.status)).length;
    return `${((cnt / cLeads.length) * 100).toFixed(1)}%`;
  }

  const bizName = bizKey === 'all'
    ? 'All Businesses'
    : (businesses.find(b => b.id === bizKey)?.name || bizKey);

  async function handlePDF() {
    setGenerating(true);
    try {
      await generateCampaignPDF(bizName, {
        funnel: funnelSteps,
        campaigns: filteredCampaigns.map(c => ({
          name: c.name, status: c.status, leads: c.leads,
          opened: c.open || '0%', replied: campaignRepliedPct(c),
          hot: c.hot, spend: c.spend,
        })),
        roi: { revenue, cost: platformCost, roi, meetings, dealVal },
        costs,
        date: new Date().toLocaleDateString(),
      });
    } catch(e) { console.error(e); }
    setGenerating(false);
  }

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-4 fade-up">
        <div>
          <div className="breadcrumb">Reports / <span>Reporting & ROI</span></div>
          <h1 className="page-title" style={{marginTop:4}}>Reporting & ROI</h1>
        </div>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <select
            value={bizKey}
            onChange={e => setBizKey(e.target.value)}
            style={{
              background:'var(--card)', border:'1px solid var(--border)', color:'var(--text-1)',
              padding:'6px 12px', borderRadius:6, fontSize:13
            }}
          >
            <option value="all">All Businesses</option>
            {businesses.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button className="btn btn-blue" onClick={handlePDF} disabled={generating}>
            {generating ? 'Generating...' : '↓ PDF Report'}
          </button>
        </div>
      </div>

      {/* Funnel */}
      <div className="card fade-up-1 mb-4">
        <div style={{fontWeight:600, marginBottom:16}}>Conversion Funnel</div>
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {funnelSteps.map(step => (
            <div key={step.label} style={{display:'flex', alignItems:'center', gap:12}}>
              <div style={{width:80, fontSize:12, color:'var(--text-2)', textAlign:'right', flexShrink:0}}>{step.label}</div>
              <div style={{flex:1, background:'var(--bg-2)', borderRadius:4, height:28, overflow:'hidden'}}>
                <div style={{
                  width: `${(step.val / funnelMax) * 100}%`,
                  height:'100%', background:step.color, borderRadius:4,
                  display:'flex', alignItems:'center', paddingLeft:8,
                  fontSize:12, fontFamily:'var(--font-mono)', fontWeight:600,
                  color:'var(--bg-1)', minWidth:step.val > 0 ? 40 : 0,
                  transition:'width 0.5s cubic-bezier(.4,0,.2,1)'
                }}>
                  {step.val > 0 ? step.val.toLocaleString() : ''}
                </div>
              </div>
              <div style={{width:48, fontSize:12, color:'var(--text-3)', textAlign:'right', flexShrink:0, fontFamily:'var(--font-mono)'}}>
                {funnelMax > 1 ? `${Math.round((step.val / funnelMax) * 100)}%` : '0%'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Campaign Table */}
      <div className="card fade-up-2 mb-4">
        <div style={{fontWeight:600, marginBottom:12}}>Campaign Performance</div>
        <table className="table" style={{width:'100%'}}>
          <thead>
            <tr>
              <th>Campaign</th><th>Status</th><th>Leads</th>
              <th>Open Rate</th><th>Replied</th><th>Hot</th><th>Spend</th>
            </tr>
          </thead>
          <tbody>
            {filteredCampaigns.length === 0 && (
              <tr><td colSpan={7} style={{textAlign:'center',color:'var(--muted)',padding:'16px 0',fontSize:12}}>No campaigns</td></tr>
            )}
            {filteredCampaigns.map(c => (
              <tr key={c.id}>
                <td style={{fontWeight:500}}>{c.name}</td>
                <td><span className={`badge badge-${STATUS_COLORS[c.status]||'muted'}`}>{c.status.replace(/_/g,' ')}</span></td>
                <td style={{fontFamily:'var(--font-mono)'}}>{(c.leads||0).toLocaleString()}</td>
                <td style={{fontFamily:'var(--font-mono)'}}>{c.open || '—'}</td>
                <td style={{fontFamily:'var(--font-mono)'}}>{campaignRepliedPct(c)}</td>
                <td style={{fontFamily:'var(--font-mono)', color:'var(--amber)'}}>{c.hot || 0}</td>
                <td style={{fontFamily:'var(--font-mono)'}}>{c.spend || 'RM 0'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
        {/* ROI Calculator */}
        <div className="card fade-up-3">
          <div style={{fontWeight:600, marginBottom:16}}>ROI Calculator</div>
          <div style={{display:'flex', flexDirection:'column', gap:12}}>
            <div>
              <label style={{fontSize:12, color:'var(--text-2)', display:'block', marginBottom:4}}>Meetings Booked</label>
              <input
                type="number" min={0} value={meetings}
                onChange={e => setMeetings(Number(e.target.value))}
                style={{
                  background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)',
                  padding:'8px 12px', borderRadius:6, width:'100%', fontSize:14, fontFamily:'var(--font-mono)'
                }}
              />
            </div>
            <div>
              <label style={{fontSize:12, color:'var(--text-2)', display:'block', marginBottom:4}}>Avg Deal Value (RM)</label>
              <input
                type="number" min={0} value={dealVal}
                onChange={e => setDealVal(Number(e.target.value))}
                style={{
                  background:'var(--bg-2)', border:'1px solid var(--border)', color:'var(--text-1)',
                  padding:'8px 12px', borderRadius:6, width:'100%', fontSize:14, fontFamily:'var(--font-mono)'
                }}
              />
            </div>
            <div style={{background:'var(--bg-2)', borderRadius:8, padding:16, marginTop:4}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:6}}>
                <span style={{color:'var(--text-2)', fontSize:13}}>Revenue</span>
                <span style={{fontFamily:'var(--font-mono)', color:'var(--green)', fontWeight:700}}>RM {revenue.toLocaleString()}</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:6}}>
                <span style={{color:'var(--text-2)', fontSize:13}}>Cost</span>
                <span style={{fontFamily:'var(--font-mono)'}}>RM {platformCost}</span>
              </div>
              <div style={{height:1, background:'var(--border)', margin:'8px 0'}}/>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span style={{fontWeight:600}}>ROI</span>
                <span style={{
                  fontFamily:'var(--font-mono)', fontWeight:700, fontSize:18,
                  color: roi > 0 ? 'var(--green)' : 'var(--red)'
                }}>
                  {roi > 0 ? '+' : ''}{roi.toLocaleString()}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="card fade-up-4">
          <div style={{fontWeight:600, marginBottom:16}}>Cost Breakdown</div>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            {[
              { label:'Apollo.io (leads)',  val: costs.apollo },
              { label:'SendGrid (email)',   val: costs.sendgrid },
              { label:'WATI (WhatsApp)',    val: costs.wati },
              { label:'Retell AI (calls)',  val: costs.retell },
            ].map(row => (
              <div key={row.label} style={{display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)'}}>
                <span style={{color:'var(--text-2)', fontSize:13}}>{row.label}</span>
                <span style={{fontFamily:'var(--font-mono)', fontWeight:600}}>{row.val}</span>
              </div>
            ))}
            <div style={{display:'flex', justifyContent:'space-between', paddingTop:8}}>
              <span style={{fontWeight:600}}>Total</span>
              <span style={{fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--blue)'}}>RM {platformCost}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
