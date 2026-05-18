import { useAppStore } from '../../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';

export function TickerBar() {
  const { campaigns, leads } = useAppStore(useShallow(s => ({
    campaigns: s.campaigns,
    leads: s.leads,
  })));

  const hotCount = leads.filter(l => l.status === 'hot' || l.score >= 8).length;
  const queueCount = leads.filter(l => l.status === 'personalizing').length;
  const totalSpend = campaigns.reduce((sum, c) => {
    return sum + (parseInt((c.spend || '0').replace(/[^\d]/g, ''), 10) || 0);
  }, 0);
  const awaitingApproval = campaigns.filter(c => c.status === 'awaiting_approval');
  const activeCampaigns = campaigns.filter(c => c.status === 'active');

  const ratesWithData = activeCampaigns.filter(c => c.open && parseFloat(c.open) > 0);
  const avgOpen = ratesWithData.length > 0
    ? (ratesWithData.reduce((s, c) => s + parseFloat(c.open), 0) / ratesWithData.length).toFixed(1) + '%'
    : '—';

  const waRates = activeCampaigns.filter(c => c.wa && c.wa !== '-' && c.wa !== '—');
  const avgWa = waRates.length > 0
    ? (waRates.reduce((s, c) => s + parseFloat(c.wa), 0) / waRates.length).toFixed(0) + '%'
    : '—';

  const items = [
    ...activeCampaigns.slice(0, 3).map(c => ({
      label: c.name,
      val: `${c.leads}/${c.total} leads`,
      color: c.color || 'blue',
    })),
    { label: 'Open Rate', val: avgOpen, color: 'text' },
    { label: 'WA Response', val: avgWa, color: parseFloat(avgWa) > 40 ? 'green' : 'amber' },
    { label: 'Hot Leads', val: `${hotCount} total`, color: 'amber' },
    { label: 'Queue', val: `${queueCount} personalizing`, color: 'muted' },
    ...(awaitingApproval.length > 0 ? awaitingApproval.map(c => ({
      label: c.name, val: 'AWAITING REVIEW', color: 'amber',
    })) : []),
    { label: 'Spend', val: `RM ${totalSpend}`, color: 'text' },
    { label: 'Total Leads', val: `${leads.length} leads`, color: 'blue' },
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
