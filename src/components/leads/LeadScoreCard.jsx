export function LeadScoreCard({ lead }) {
  const label = lead.scoreLabel || 'Medium';
  const color = label === 'High' ? 'var(--green)' : label === 'Medium' ? 'var(--amber)' : 'var(--muted)';
  const pct = label === 'High' ? 80 : label === 'Medium' ? 50 : 20;
  return (
    <div style={{background:'var(--s2)', borderRadius:8, padding:'12px 14px'}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
        <span style={{fontSize:11, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em'}}>Lead Score</span>
        <span className="mono" style={{fontSize:14, fontWeight:600, color}}>{lead.score}/10 · {label}</span>
      </div>
      <div style={{height:4, background:'var(--border)', borderRadius:2, overflow:'hidden', marginBottom:8}}>
        <div style={{width:`${(lead.score/10)*100}%`, height:'100%', background:color, borderRadius:2}}/>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:4}}>
        {[
          ['Job Title', /facilities|property|estate|gm|director|head/.test((lead.title||'').toLowerCase()) ? '+3 pts' : '0 pts'],
          ['Company', /bank|hotel|glc|sedc|dbku|mbks|seb/.test((lead.company||'').toLowerCase()) ? '+2 pts' : '0 pts'],
          ['Replied', lead.status === 'replied' || lead.status === 'call_initiated' ? '+2 pts' : '0 pts'],
          ['Engagement', lead.channels?.includes('email_opened') ? '+1 pt' : '0 pts'],
        ].map(([k,v]) => (
          <div key={k} style={{display:'flex', justifyContent:'space-between', fontSize:11, padding:'3px 0'}}>
            <span style={{color:'var(--muted)'}}>{k}</span>
            <span className="mono" style={{color: v.startsWith('+') ? 'var(--green)' : 'var(--muted)'}}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
