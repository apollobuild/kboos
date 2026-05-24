import { useAppStore } from '../../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { useTenant } from '../../hooks/useTenant.js';

export function TickerBar() {
  const { formatCurrency } = useTenant();
  const { campaigns, leads } = useAppStore(useShallow(s => ({
    campaigns: s.campaigns,
    leads: s.leads,
  })));

  const hotCount       = leads.filter(l => l.status === 'hot' || l.score >= 8).length;
  const meetingsCount  = leads.filter(l => l.status === 'meeting_booked').length;
  const qualifiedCount = leads.filter(l => l.score >= 6 || ['engaged', 'qualifying', 'committed'].includes(l.aiStage)).length;
  const totalSpend     = campaigns.reduce((sum, c) => sum + (parseInt((c.spend || '0').replace(/[^\d]/g, ''), 10) || 0), 0);
  const awaitingApproval = campaigns.filter(c => c.status === 'awaiting_approval');
  const activeCampaigns  = campaigns.filter(c => c.status === 'active');

  const ratesWithData = activeCampaigns.filter(c => c.open && parseFloat(c.open) > 0);
  const avgOpen = ratesWithData.length > 0
    ? (ratesWithData.reduce((s, c) => s + parseFloat(c.open), 0) / ratesWithData.length).toFixed(1) + '%'
    : '—';

  const waRates = activeCampaigns.filter(c => c.wa && c.wa !== '-' && c.wa !== '—');
  const avgWa   = waRates.length > 0
    ? (waRates.reduce((s, c) => s + parseFloat(c.wa), 0) / waRates.length).toFixed(0) + '%'
    : '—';

  const items = [
    ...activeCampaigns.slice(0, 3).map(c => ({ label: c.name, val: `${c.leads}/${c.total} leads`, color: c.color || 'blue' })),
    { label: 'Active Campaigns', val: `${activeCampaigns.length}`, color: activeCampaigns.length > 0 ? 'green' : 'muted' },
    { label: 'Open Rate',        val: avgOpen, color: 'text' },
    { label: 'WA Response',      val: avgWa,   color: parseFloat(avgWa) > 40 ? 'green' : 'amber' },
    { label: 'Hot Leads',        val: `${hotCount}`, color: 'amber' },
    { label: 'Meetings Booked',  val: `${meetingsCount}`, color: meetingsCount > 0 ? 'blue' : 'muted' },
    { label: 'Qualified',        val: `${qualifiedCount}`, color: qualifiedCount > 0 ? 'text' : 'muted' },
    ...(awaitingApproval.length > 0 ? awaitingApproval.map(c => ({ label: c.name, val: 'AWAITING REVIEW', color: 'amber' })) : []),
    { label: 'Total Spend',      val: formatCurrency(totalSpend), color: 'text' },
    { label: 'Total Leads',      val: `${leads.length}`, color: 'blue' },
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
