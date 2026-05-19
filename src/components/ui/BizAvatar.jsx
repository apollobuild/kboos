export function BizAvatar({ id, name, color, size = 32 }) {
  const initials = name
    ? name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : (id || '?').slice(0, 2).toUpperCase();

  return (
    <div style={{
      width:size, height:size, borderRadius:'50%',
      background:`var(--${color}-dim, var(--blue-dim))`,
      border:`1px solid var(--${color}, var(--blue))`,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize: size > 40 ? 16 : size > 28 ? 13 : 11, fontWeight:700,
      color:`var(--${color}, var(--blue))`, flexShrink:0,
      letterSpacing:'-0.02em', userSelect:'none', overflow:'hidden',
    }}>
      {initials}
    </div>
  );
}
