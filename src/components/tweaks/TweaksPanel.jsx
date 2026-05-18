import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { TweakRadio } from './TweakRadio.jsx';

const STYLE = `
.twk-panel{position:fixed;right:16px;bottom:16px;z-index:2000;width:280px;max-height:calc(100vh - 32px);display:flex;flex-direction:column;background:rgba(20,25,40,.92);color:#eef2ff;backdrop-filter:blur(24px) saturate(160%);border:.5px solid rgba(255,255,255,.12);border-radius:14px;box-shadow:0 1px 0 rgba(255,255,255,.08) inset,0 12px 40px rgba(0,0,0,.5);font:11.5px/1.4 'DM Sans',ui-sans-serif,system-ui,sans-serif;overflow:hidden}
.twk-hd{display:flex;align-items:center;justify-content:space-between;padding:10px 8px 10px 14px;cursor:move;user-select:none;border-bottom:1px solid rgba(255,255,255,.07)}
.twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em;color:#eef2ff}
.twk-x{appearance:none;border:0;background:transparent;color:rgba(255,255,255,.4);width:22px;height:22px;border-radius:6px;cursor:pointer;font-size:13px;line-height:1}
.twk-x:hover{background:rgba(255,255,255,.08);color:#eef2ff}
.twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;overflow-x:hidden;min-height:0}
.twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:rgba(238,242,255,.35);padding:10px 0 0}
.twk-sect:first-child{padding-top:4px}
.twk-sub{font-size:10px;color:rgba(238,242,255,.35);margin-top:-4px;margin-bottom:2px}
`;

function Section({ title, subtitle, children }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      <div className="twk-sect">{title}</div>
      {subtitle && <div className="twk-sub">{subtitle}</div>}
      {children}
    </div>
  );
}

export function TweaksPanel({ open, onClose }) {
  const { tweaks, setTweak } = useAppStore(useShallow(s => ({ tweaks:s.tweaks, setTweak:s.setTweak })));

  const { accent, density, mood } = tweaks;
  const dragRef = useRef(null);
  const offsetRef = useRef({ x:16, y:16 });

  const clamp = useCallback(() => {
    const p = dragRef.current; if (!p) return;
    const w = p.offsetWidth, h = p.offsetHeight;
    offsetRef.current = {
      x: Math.min(Math.max(16, offsetRef.current.x), Math.max(16, window.innerWidth-w-16)),
      y: Math.min(Math.max(16, offsetRef.current.y), Math.max(16, window.innerHeight-h-16)),
    };
    p.style.right = offsetRef.current.x + 'px';
    p.style.bottom = offsetRef.current.y + 'px';
  }, []);

  useEffect(() => { if (open) clamp(); }, [open, clamp]);

  const onDragStart = e => {
    const p = dragRef.current; if (!p) return;
    const r = p.getBoundingClientRect(), sx = e.clientX, sy = e.clientY;
    const sr = window.innerWidth - r.right, sb = window.innerHeight - r.bottom;
    const move = ev => { offsetRef.current = {x:sr-(ev.clientX-sx), y:sb-(ev.clientY-sy)}; clamp(); };
    const up = () => { window.removeEventListener('mousemove',move); window.removeEventListener('mouseup',up); };
    window.addEventListener('mousemove',move); window.addEventListener('mouseup',up);
  };

  if (!open) return null;

  const accentOptions = ['blue','violet','emerald','amber','rose'];
  const accentColors = { blue:'oklch(62% 0.19 245)', violet:'oklch(62% 0.22 280)', emerald:'oklch(65% 0.2 160)', amber:'oklch(72% 0.18 65)', rose:'oklch(62% 0.22 10)' };
  const accentLabels = { blue:'Cobalt', violet:'Violet', emerald:'Emerald', amber:'Amber', rose:'Rose' };

  return (
    <>
      <style>{STYLE}</style>
      <div ref={dragRef} className="twk-panel" style={{right:offsetRef.current.x, bottom:offsetRef.current.y}}>
        <div className="twk-hd" onMouseDown={onDragStart}>
          <b>Tweaks</b>
          <button className="twk-x" onMouseDown={e=>e.stopPropagation()} onClick={onClose}>✕</button>
        </div>
        <div className="twk-body">
          <Section title="Accent Color" subtitle="Remaps primary + active states app-wide">
            <TweakRadio value={accent} options={accentOptions.map(v=>({value:v,label:accentLabels[v]}))} onChange={v=>setTweak('accent',v)} />
            <div style={{display:'flex',gap:4,marginTop:6}}>
              {accentOptions.map(a => (
                <div key={a} onClick={() => setTweak('accent',a)} style={{flex:1,height:20,borderRadius:4,background:accentColors[a],cursor:'pointer',opacity:accent===a?1:0.4,border:accent===a?'2px solid #fff':'2px solid transparent',transition:'all 0.15s'}}/>
              ))}
            </div>
          </Section>
          <Section title="Interface Density" subtitle="Scales padding, spacing, and type size">
            <TweakRadio value={density} options={[{value:'compact',label:'Compact'},{value:'default',label:'Default'},{value:'spacious',label:'Spacious'}]} onChange={v=>setTweak('density',v)} />
          </Section>
          <Section title="Data Mood" subtitle="Shifts all numbers + health status app-wide">
            {[
              { value:'optimistic', icon:'↗', label:'Optimistic', sub:'Strong opens, healthy pipeline', color:'var(--green)' },
              { value:'realistic', icon:'→', label:'Realistic', sub:'Mixed results, some friction', color:'var(--amber)' },
              { value:'pressure', icon:'↘', label:'Under Pressure', sub:'Low rates, API issues', color:'var(--red)' },
            ].map(m => (
              <div key={m.value} onClick={() => setTweak('mood', m.value)} style={{
                display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,cursor:'pointer',marginBottom:4,
                background: mood===m.value ? `color-mix(in oklch, ${m.color} 10%, transparent)` : 'rgba(255,255,255,0.03)',
                border:`1px solid ${mood===m.value ? m.color : 'rgba(255,255,255,0.06)'}`,transition:'all 0.2s',
              }}>
                <div style={{width:24,height:24,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',background:`color-mix(in oklch, ${m.color} 15%, transparent)`,color:m.color,fontSize:13,flexShrink:0,fontFamily:'var(--font-mono)'}}>
                  {m.icon}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:600,color:mood===m.value?m.color:'var(--text)'}}>{m.label}</div>
                  <div style={{fontSize:10,color:'rgba(238,242,255,0.4)',marginTop:1}}>{m.sub}</div>
                </div>
                {mood===m.value && <div style={{width:5,height:5,borderRadius:'50%',background:m.color,flexShrink:0}}/>}
              </div>
            ))}
          </Section>
        </div>
      </div>
    </>
  );
}
