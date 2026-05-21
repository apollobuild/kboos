import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// Renders dropdown via portal so it always floats above every card/stacking context
export function Select({ value, onChange, options = [], style = {}, className = '', disabled = false, placeholder = '—' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, left: 0, width: 0 });
  const triggerRef      = useRef(null);

  const normalized = options.map(o => typeof o === 'string' ? { value: o, label: o } : o);
  const selected   = normalized.find(o => String(o.value) === String(value));

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDown   = e => { if (!e.target.closest('[data-sel-drop]') && !triggerRef.current?.contains(e.target)) close(); };
    const onScroll = () => close();
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('scroll', onScroll, true); };
  }, [open, close]);

  function handleToggle() {
    if (disabled) return;
    if (!open) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 3, left: r.left, width: r.width });
    }
    setOpen(p => !p);
  }

  const isBlock = className.includes('input') || style.width === '100%';

  const triggerStyle = {
    display: 'flex', alignItems: 'center', gap: 6, cursor: disabled ? 'not-allowed' : 'pointer',
    background: 'var(--s1)', border: '1px solid var(--border)', color: 'var(--text)',
    borderRadius: 6, padding: '5px 10px', fontSize: 12, fontFamily: 'var(--font-ui)',
    width: isBlock ? '100%' : 'auto', textAlign: 'left', opacity: disabled ? 0.5 : 1,
    ...style,
  };

  return (
    <div ref={triggerRef} style={{ position: 'relative', display: isBlock ? 'block' : 'inline-block' }}>
      <button type="button" disabled={disabled} onClick={handleToggle} className={className} style={triggerStyle}>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label || placeholder}
        </span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ flexShrink: 0, opacity: 0.45, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && createPortal(
        <div data-sel-drop style={{
          position: 'fixed', top: pos.top, left: pos.left, minWidth: pos.width,
          zIndex: 99999, background: 'var(--s1)', border: '1px solid var(--border)',
          borderRadius: 6, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          maxHeight: 260, overflowY: 'auto',
        }}>
          {normalized.map(o => {
            const active = String(o.value) === String(value);
            return (
              <div key={o.value}
                onMouseDown={e => { e.preventDefault(); onChange(o.value); close(); }}
                style={{
                  padding: '7px 12px', fontSize: style.fontSize || 12, cursor: 'pointer',
                  color: active ? 'var(--text)' : 'var(--muted)',
                  background: active ? 'rgba(80,120,255,0.15)' : 'transparent',
                  whiteSpace: 'nowrap', transition: 'background 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = active ? 'rgba(80,120,255,0.22)' : 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = active ? 'rgba(80,120,255,0.15)' : 'transparent'; e.currentTarget.style.color = active ? 'var(--text)' : 'var(--muted)'; }}
              >
                {o.label}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
