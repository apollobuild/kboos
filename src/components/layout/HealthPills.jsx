import { useAppStore } from '../../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';

export function HealthPills() {
  const { campaigns, replies, leads, setPage } = useAppStore(useShallow(s => ({
    campaigns: s.campaigns,
    replies: s.replies,
    leads: s.leads,
    setPage: s.setPage,
  })));

  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const unreadReplies = replies.filter(r => r.status === 'unread').length;
  const pendingApprovals = campaigns.filter(c => c.status === 'awaiting_approval').length;
  const queueLeads = leads.filter(l => l.status === 'personalizing').length;

  const pills = [
    { label:'Active', dot:'green', val:`${activeCampaigns} campaign${activeCampaigns !== 1 ? 's' : ''}` },
    { label:'Replies', dot: unreadReplies > 0 ? 'red' : 'green', val:`${unreadReplies} unread`, pulse: unreadReplies > 0, action:'replies' },
    { label:'Queue', dot: queueLeads > 0 ? 'green' : 'muted', val:`${queueLeads} personalizing` },
    { label:'Approvals', dot: pendingApprovals > 0 ? 'amber' : 'green', val:`${pendingApprovals} pending`, action: pendingApprovals > 0 ? 'approval' : undefined },
  ];

  return (
    <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
      {pills.map(p => (
        <div key={p.label} className="health-pill"
          onClick={p.action ? () => setPage(p.action) : undefined}
          style={p.action ? {cursor:'pointer'} : {}}
        >
          <span className={`pulse-dot ${p.dot}`} style={p.pulse ? {animation:'pulse 1.4s ease-in-out infinite'} : {}} />
          <span style={{color:'var(--text)'}}>{p.label}</span>
          <span style={{color:'var(--muted)', marginLeft:2}}>· {p.val}</span>
        </div>
      ))}
    </div>
  );
}
