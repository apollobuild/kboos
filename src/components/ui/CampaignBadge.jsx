export function CampaignBadge({ status }) {
  const map = {
    active: { label:'Active', color:'green' },
    awaiting_approval: { label:'Awaiting Review', color:'amber' },
    paused: { label:'Paused', color:'amber' },
  };
  const s = map[status] || { label: status, color:'gray' };
  return <span className={`badge ${s.color}`}>{s.label}</span>;
}
