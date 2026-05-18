export function BizAvatar({ id, color, size = 32 }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%',
      background:`var(--${color}-dim, var(--blue-dim))`,
      border:`1px solid var(--${color}, var(--blue))`,
      display:'flex', alignItems:'center', justifyContent:'center',
      fontSize: size > 40 ? 16 : 11, fontWeight:600,
      color:`var(--${color}, var(--blue))`, flexShrink:0,
    }}>
      {id}
    </div>
  );
}
