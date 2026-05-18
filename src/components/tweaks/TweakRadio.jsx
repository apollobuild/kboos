import { useRef, useState } from 'react';

export function TweakRadio({ value, options, onChange }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const opts = options.map(o => typeof o === 'object' ? o : { value:o, label:o });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const valueRef = useRef(value); valueRef.current = value;

  const segAt = cx => {
    const r = trackRef.current.getBoundingClientRect();
    const i = Math.floor(((cx - r.left - 2) / (r.width - 4)) * n);
    return opts[Math.max(0, Math.min(n-1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX); if (v0 !== valueRef.current) onChange(v0);
    const move = ev => { if (!trackRef.current) return; const v = segAt(ev.clientX); if (v !== valueRef.current) onChange(v); };
    const up = () => { setDragging(false); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  return (
    <div ref={trackRef} role="radiogroup" onPointerDown={onPointerDown}
      style={{position:'relative',display:'flex',padding:2,borderRadius:8,background:'rgba(255,255,255,0.06)',userSelect:'none',cursor:dragging?'grabbing':'pointer'}}>
      <div style={{position:'absolute',top:2,bottom:2,borderRadius:6,background:'rgba(255,255,255,0.12)',boxShadow:'0 1px 2px rgba(0,0,0,0.3)',transition:'left .15s,width .15s',left:`calc(2px + ${idx}*(100% - 4px)/${n})`,width:`calc((100% - 4px)/${n})`}}/>
      {opts.map(o => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value}
          style={{appearance:'none',position:'relative',zIndex:1,flex:1,border:0,background:'transparent',color:o.value===value?'#eef2ff':'rgba(238,242,255,0.6)',fontFamily:'var(--font-ui)',fontWeight:500,minHeight:22,borderRadius:6,cursor:'inherit',padding:'4px 6px',lineHeight:1.2,fontSize:11}}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
