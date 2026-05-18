export function LeadStatusBadge({ status }) {
  if (status === 'personalizing') return (
    <span className="badge gray" style={{gap:3}}>
      Personalizing <span className="dot-1"/><span className="dot-2"/><span className="dot-3"/>
    </span>
  );
  const map = {
    hot: { label:'🔥 HOT', color:'amber' },
    meeting_booked: { label:'✓ Meeting', color:'green' },
    email_sent: { label:'Email Sent', color:'blue' },
    wa_sent: { label:'WA Sent', color:'purple' },
    bounced: { label:'Bounced', color:'red' },
    unsubscribed: { label:'Unsubscribed', color:'gray' },
    low_quality: { label:'Low Quality', color:'gray' },
    replied: { label:'Replied', color:'cyan' },
    call_initiated: { label:'Call Active', color:'purple' },
  };
  const s = map[status] || { label: status, color:'gray' };
  return <span className={`badge ${s.color}`}>{s.label}</span>;
}
