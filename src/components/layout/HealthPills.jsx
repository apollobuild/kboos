import { useAppStore } from '../../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';

const MOOD_PILLS = {
  optimistic: [
    {label:'Active', dot:'green', val:'7 campaigns'},
    {label:'APIs', dot:'green', val:'6/6 OK'},
    {label:'Replies', dot:'red', val:'8 unread', pulse:true, action:'replies'},
    {label:'Queue', dot:'green', val:'14 processing'},
    {label:'Approvals', dot:'amber', val:'2 pending', action:'approval'},
  ],
  realistic: [
    {label:'Active', dot:'green', val:'6 campaigns'},
    {label:'APIs', dot:'amber', val:'5/6 OK'},
    {label:'Replies', dot:'red', val:'7 unread', pulse:true, action:'replies'},
    {label:'Queue', dot:'green', val:'8 processing'},
    {label:'Approvals', dot:'amber', val:'2 pending', action:'approval'},
  ],
  pressure: [
    {label:'Active', dot:'amber', val:'3 campaigns'},
    {label:'APIs', dot:'red', val:'3/6 OK'},
    {label:'Replies', dot:'red', val:'14 unread', pulse:true, action:'replies'},
    {label:'Queue', dot:'amber', val:'0 processing'},
    {label:'Bounces', dot:'red', val:'24% rate'},
  ],
};

export function HealthPills({ mood = 'realistic' }) {
  const setPage = useAppStore(s => s.setPage);
  const pills = MOOD_PILLS[mood] || MOOD_PILLS.realistic;
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
