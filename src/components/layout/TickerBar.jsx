const MOOD_DATA = {
  optimistic: { openRate:'38.2%', waResp:'54%', spend:'RM 167', tickerHot:'37 total', tickerLimit:'All APIs nominal', totalLeads:'1,972', apiStatus:{WATI:'ok'} },
  realistic: { openRate:'29.6%', waResp:'38%', spend:'RM 167', tickerHot:'19 total', tickerLimit:'WATI 78% rate limit', totalLeads:'1,441', apiStatus:{WATI:'warn'} },
  pressure: { openRate:'18.1%', waResp:'12%', spend:'RM 167', tickerHot:'4 total', tickerLimit:'SendGrid soft bounce 24%', totalLeads:'743', apiStatus:{WATI:'error'} },
};

export function TickerBar({ mood = 'realistic' }) {
  const md = MOOD_DATA[mood] || MOOD_DATA.realistic;
  const items = [
    { label:'GS Kuching Q2', val:'743/2400 leads', color:'green' },
    { label:'Open Rate', val:md.openRate, color:'text' },
    { label:'WA Response', val:md.waResp, color: parseFloat(md.waResp) > 40 ? 'green' : 'amber' },
    { label:'KOBIS Video GLCs', val:'156/1200', color:'blue' },
    { label:'Hot Leads', val:md.tickerHot, color:'amber' },
    { label:'Queue', val:'14 personalizing', color:'muted' },
    { label:'GreenBuild', val:'AWAITING REVIEW', color:'amber' },
    { label:'Spend Today', val:md.spend, color:'text' },
    { label:'API Status', val:md.tickerLimit, color: md.apiStatus.WATI === 'ok' ? 'green' : 'amber' },
    { label:'Leads', val:`${md.totalLeads.split(',')[0]} leads`, color:'blue' },
  ];
  const doubled = [...items, ...items];
  return (
    <div className="ticker-wrap">
      <div style={{padding:'0 12px',fontSize:10,fontFamily:'var(--font-mono)',color:'var(--green)',letterSpacing:'0.1em',flexShrink:0,borderRight:'1px solid var(--border)'}}>LIVE</div>
      <div style={{overflow:'hidden', flex:1}}>
        <div className="ticker-inner">
          {doubled.map((item, i) => (
            <div key={i} className="ticker-item">
              {item.label}: <span style={{color: item.color==='text'?'var(--text)': item.color==='muted'?'var(--muted)':`var(--${item.color})`}}>{item.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
