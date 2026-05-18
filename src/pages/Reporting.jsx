import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { generateCampaignPDF } from '../services/reports.js';

const BIZ_DATA = {
  all: {
    name: 'All Businesses',
    funnel: { scraped:1972, contacted:1441, opened:489, replied:44, meetings:3 },
    campaigns: [
      { name:'Kuching Q2', status:'active', leads:743, opened:'38.2%', replied:'5.4%', hot:14, spend:'RM 46' },
      { name:'Kota Samarahan', status:'active', leads:301, opened:'31.4%', replied:'3.2%', hot:6, spend:'RM 28' },
      { name:'Sarawak GLCs', status:'active', leads:156, opened:'41.7%', replied:'7.1%', hot:9, spend:'RM 34' },
      { name:'SME Kuching', status:'active', leads:89, opened:'29.3%', replied:'2.8%', hot:3, spend:'RM 21' },
      { name:'Contractors', status:'active', leads:362, opened:'35.1%', replied:'6.2%', hot:7, spend:'RM 59' },
      { name:'Universities', status:'active', leads:201, opened:'33.5%', replied:'4.5%', hot:5, spend:'RM 44' },
    ],
    defaultMeetings: 3, defaultDeal: 5000, platformCost: 167,
    costs: { apollo:'RM 45', sendgrid:'RM 38', wati:'RM 52', retell:'RM 32' },
  },
  GS: {
    name: 'Gadong Squad',
    funnel: { scraped:1044, contacted:743, opened:284, replied:28, meetings:2 },
    campaigns: [
      { name:'Kuching Q2', status:'active', leads:743, opened:'38.2%', replied:'5.4%', hot:14, spend:'RM 46' },
      { name:'Kota Samarahan', status:'active', leads:301, opened:'31.4%', replied:'3.2%', hot:6, spend:'RM 28' },
    ],
    defaultMeetings: 2, defaultDeal: 6000, platformCost: 74,
    costs: { apollo:'RM 22', sendgrid:'RM 18', wati:'RM 24', retell:'RM 10' },
  },
  KV: {
    name: 'KOBIS Video',
    funnel: { scraped:156, contacted:120, opened:50, replied:8, meetings:1 },
    campaigns: [
      { name:'Sarawak GLCs', status:'active', leads:156, opened:'41.7%', replied:'7.1%', hot:9, spend:'RM 34' },
    ],
    defaultMeetings: 1, defaultDeal: 8000, platformCost: 34,
    costs: { apollo:'RM 10', sendgrid:'RM 8', wati:'RM 10', retell:'RM 6' },
  },
  GB: {
    name: 'GreenBuild Sarawak',
    funnel: { scraped:482, contacted:362, opened:127, replied:22, meetings:0 },
    campaigns: [
      { name:'Developers KCH', status:'awaiting_approval', leads:50, opened:'0%', replied:'0%', hot:0, spend:'RM 8' },
      { name:'Contractors', status:'active', leads:362, opened:'35.1%', replied:'6.2%', hot:7, spend:'RM 59' },
    ],
    defaultMeetings: 0, defaultDeal: 12000, platformCost: 67,
    costs: { apollo:'RM 18', sendgrid:'RM 16', wati:'RM 20', retell:'RM 13' },
  },
  SE: {
    name: 'Sarawak Edu Hub',
    funnel: { scraped:201, contacted:201, opened:67, replied:9, meetings:1 },
    campaigns: [
      { name:'Universities', status:'active', leads:201, opened:'33.5%', replied:'4.5%', hot:5, spend:'RM 44' },
    ],
    defaultMeetings: 1, defaultDeal: 4000, platformCost: 44,
    costs: { apollo:'RM 12', sendgrid:'RM 10', wati:'RM 14', retell:'RM 8' },
  },
};

const STATUS_COLORS = { active:'green', awaiting_approval:'amber', paused:'muted' };

export function Reporting() {
  const { campaigns } = useAppStore(useShallow(s => ({ campaigns: s.campaigns })));

  const [bizKey, setBizKey] = useState('all');
  const [meetings, setMeetings] = useState(3);
  const [dealVal, setDealVal] = useState(5000);
  const [generating, setGenerating] = useState(false);

  const biz = BIZ_DATA[bizKey] || BIZ_DATA.all;
  const { funnel, costs, platformCost } = biz;

  useEffect(() => {
    setMeetings(biz.defaultMeetings);
    setDealVal(biz.defaultDeal);
  }, [bizKey]);

  const revenue = meetings * dealVal;
  const roi = platformCost > 0 ? Math.round(((revenue - platformCost) / platformCost) * 100) : 0;

  const funnelMax = funnel.scraped;
  const funnelSteps = [
    { label:'Scraped', val: funnel.scraped, color:'var(--blue)' },
    { label:'Contacted', val: funnel.contacted, color:'var(--blue)' },
    { label:'Opened', val: funnel.opened, color:'var(--green)' },
    { label:'Replied', val: funnel.replied, color:'var(--amber)' },
    { label:'Meetings', val: funnel.meetings, color:'var(--amber)' },
  ];

  async function handlePDF() {
    setGenerating(true);
    try {
      await generateCampaignPDF(biz.name, {
        funnel: funnelSteps,
        campaigns: biz.campaigns,
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
            <option value="GS">Gadong Squad</option>
            <option value="KV">KOBIS Video</option>
            <option value="GB">GreenBuild Sarawak</option>
            <option value="SE">Sarawak Edu Hub</option>
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
                  color:'var(--bg-1)', minWidth:40,
                  transition:'width 0.5s cubic-bezier(.4,0,.2,1)'
                }}>
                  {step.val.toLocaleString()}
                </div>
              </div>
              <div style={{width:48, fontSize:12, color:'var(--text-3)', textAlign:'right', flexShrink:0, fontFamily:'var(--font-mono)'}}>
                {funnelMax > 0 ? `${Math.round((step.val/funnelMax)*100)}%` : '0%'}
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
            {biz.campaigns.map(c => (
              <tr key={c.name}>
                <td style={{fontWeight:500}}>{c.name}</td>
                <td><span className={`badge badge-${STATUS_COLORS[c.status]||'muted'}`}>{c.status.replace('_',' ')}</span></td>
                <td style={{fontFamily:'var(--font-mono)'}}>{c.leads.toLocaleString()}</td>
                <td style={{fontFamily:'var(--font-mono)'}}>{c.opened}</td>
                <td style={{fontFamily:'var(--font-mono)'}}>{c.replied}</td>
                <td style={{fontFamily:'var(--font-mono)', color:'var(--amber)'}}>{c.hot}</td>
                <td style={{fontFamily:'var(--font-mono)'}}>{c.spend}</td>
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
              { label:'Apollo.io (leads)', val: costs.apollo },
              { label:'SendGrid (email)', val: costs.sendgrid },
              { label:'WATI (WhatsApp)', val: costs.wati },
              { label:'Retell AI (calls)', val: costs.retell },
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
