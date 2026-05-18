export function ScoreDisplay({ score }) {
  const color = score >= 8 ? 'var(--green)' : score >= 6 ? 'var(--amber)' : 'var(--muted)';
  return (
    <div style={{display:'flex', alignItems:'center', gap:6}}>
      <span className="mono" style={{color, fontSize:13, fontWeight:500}}>{score}/10</span>
      <div className="score-dots">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="score-dot" style={{background: i <= Math.ceil(score/2) ? color : 'var(--border)'}} />
        ))}
      </div>
    </div>
  );
}
