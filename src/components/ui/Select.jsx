import { useState, useRef, useEffect } from 'react';

// Fully CSS-controlled dropdown — no OS-native popup, works dark everywhere
export function Select({ value, onChange, options = [], style = {}, className = '', disabled = false, placeholder = '—' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const normalized = options.map(o => typeof o === 'string' ? { value: o, label: o } : o);
  const selected = normalized.find(o => String(o.value) === String(value));

  useEffect(() => {
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const isBlock = className.includes('input') || style.width === '100%' || style.display === 'block';

  return (
    <div ref={ref} style={{ position: 'relative', display: isBlock ? 'block' : 'inline-block' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(p => !p)}
        className={className}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, cursor: disabled ? 'not-allowed' : 'pointer',
          background: 'var(--s1)', border: '1px solid var(--border)', color: 'var(--text)',
          borderRadius: 6, padding: '5px 10px', fontSize: 12, fontFamily: 'var(--font-ui)',
          width: isBlock ? '100%' : 'auto', textAlign: 'left', opacity: disabled ? 0.5 : 1,
          ...style,
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label || placeholder}
        </span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ flexShrink: 0, opacity: 0.45, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 3, zIndex: 9999,
          background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 6,
          minWidth: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.55)', overflow: 'hidden',
          maxHeight: 260, overflowY: 'auto',
        }}>
          {normalized.map(o => {
            const isActive = String(o.value) === String(value);
            return (
              <div
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                style={{
                  padding: '7px 12px', fontSize: style.fontSize || 12, cursor: 'pointer',
                  color: isActive ? 'var(--text)' : 'var(--muted)',
                  background: isActive ? 'rgba(80,120,255,0.15)' : 'transparent',
                  transition: 'background 0.1s, color 0.1s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = isActive ? 'rgba(80,120,255,0.22)' : 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isActive ? 'rgba(80,120,255,0.15)' : 'transparent'; e.currentTarget.style.color = isActive ? 'var(--text)' : 'var(--muted)'; }}
              >
                {o.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
