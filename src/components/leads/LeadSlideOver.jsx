import { useState, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { BizAvatar } from '../ui/BizAvatar.jsx';
import { ScoreDisplay } from '../ui/ScoreDisplay.jsx';
import { LeadScoreCard } from './LeadScoreCard.jsx';

export function LeadSlideOver({ lead, onClose }) {
  const updateLead = useAppStore(s => s.updateLead);
  const [tab, setTab] = useState(0);
  const [statusOverride, setStatusOverride] = useState(lead.status);
  const [noteSaved, setNoteSaved] = useState(false);
  const [note, setNote] = useState(`${new Date().toLocaleDateString()} — Lead shows strong intent. Facilities manager with budget authority. Mentioned current vendor issues.\n\nFollow up: ask specifically about branch count and maintenance schedule.`);
  const noteTimer = useRef(null);
  const tabs = ['Overview','Email Copy','Sequence','Notes'];

  const handleStatusChange = (val) => {
    setStatusOverride(val);
    updateLead(lead.id, { status: val });
  };

  const handleNote = (val) => {
    setNote(val);
    clearTimeout(noteTimer.current);
    setNoteSaved(false);
    noteTimer.current = setTimeout(() => {
      updateLead(lead.id, { note: val });
      setNoteSaved(true);
    }, 1200);
  };

  const initials = lead.name.split(' ').map(w=>w[0]).slice(0,2).join('');
  const avatarColor = lead.score>=8?'green':lead.score>=6?'amber':'purple';

  return (
    <div className="slide-over-overlay" onClick={onClose}>
      <div className="slide-over-panel" onClick={e => e.stopPropagation()}>
        <div style={{padding:'20px 20px 0'}}>
          <div className="flex items-center justify-between mb-4">
            <button className="btn btn-ghost btn-xs" onClick={onClose}>✕ Close</button>
            <select className="input" style={{width:'auto',fontSize:12,padding:'4px 8px'}} value={statusOverride} onChange={e=>handleStatusChange(e.target.value)}>
              {['hot','meeting_booked','email_sent','wa_sent','replied','call_initiated','unsubscribed'].map(s => (
                <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <BizAvatar id={initials} color={avatarColor} size={48}/>
            <div>
              <h2 style={{fontSize:20,fontWeight:700,letterSpacing:-0.02}}>{lead.name}</h2>
              <div style={{fontSize:13,color:'var(--muted)'}}>{lead.title} · {lead.company}</div>
              <div style={{marginTop:4,display:'flex',gap:6}}>
                <ScoreDisplay score={lead.score}/>
                <span className={`badge ${lead.lang==='BM'?'purple':'blue'}`}>{lead.lang}</span>
                <span className={`badge ${lead.scoreLabel==='High'?'green':lead.scoreLabel==='Medium'?'amber':'gray'}`}>{lead.scoreLabel}</span>
              </div>
            </div>
          </div>
          <div style={{display:'flex',borderBottom:'1px solid var(--border)',marginBottom:20}}>
            {tabs.map((t,i) => (
              <div key={t} className={`tab-bar-item${tab===i?' active':''}`} style={{padding:'8px 14px',fontSize:12}} onClick={() => setTab(i)}>{t}</div>
            ))}
          </div>
        </div>

        <div style={{padding:'0 20px 20px',overflowY:'auto'}}>
          {tab===0 && (
            <div className="flex-col gap-3">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {[
                  {label:'Company',val:lead.company},
                  {label:'Role',val:lead.title},
                  {label:'Language',val:lead.lang},
                  {label:'Last Activity',val:lead.last},
                  {label:'Niche',val:'Commercial Property'},
                  {label:'LinkedIn',val:'✓ Found',color:'green'},
                ].map(({label,val,color}) => (
                  <div key={label} style={{background:'var(--s2)',padding:'10px 12px',borderRadius:8}}>
                    <div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3}}>{label}</div>
                    <div style={{fontSize:13,color:color?`var(--${color})`:'var(--text)'}}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{background:'var(--s2)',padding:'12px',borderRadius:8}}>
                <div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>Pain Point</div>
                <div style={{fontSize:13,fontStyle:'italic',color:'var(--text)'}}>Managing multiple commercial branches across Kuching requires consistent landscape maintenance at scale. Current vendor unreliable.</div>
              </div>
              <LeadScoreCard lead={lead}/>
            </div>
          )}
          {tab===1 && (
            <div className="flex-col gap-3">
              <div style={{background:'var(--blue-dim)',borderRadius:8,padding:'10px 12px',fontWeight:500,fontSize:13}}>
                Subject: Elevating {lead.company}'s Commercial Outdoor Spaces
              </div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:11,lineHeight:1.9,color:'var(--muted)',background:'var(--s2)',borderRadius:8,padding:14,whiteSpace:'pre-line'}}>
                {`Hi ${lead.name.split(' ')[0]},\n\nI noticed ${lead.company} manages significant commercial property in Kuching — the kind that makes a first impression on clients and employees alike.\n\nAt Gadong Squad, we specialize in premium landscape maintenance for financial institutions across Kuching. Our clients typically see a 25–30% reduction in maintenance overhead while improving curb appeal.\n\nWould you be open to a 15-min site assessment this week?\n\nBest,\nAhmad Razali\nGadong Squad`}
              </div>
              <div className="flex gap-2">
                <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(`Hi ${lead.name.split(' ')[0]}, I noticed ${lead.company}...`)}>📋 Copy Email</button>
                <button className="btn btn-primary btn-sm">Send Now ↗</button>
              </div>
            </div>
          )}
          {tab===2 && (
            <div className="seq-timeline">
              {[
                {icon:'📧',label:'Email Sent',status:'done',time:'8h ago'},
                {icon:'👁',label:'Email Opened',status:'done',time:'6h ago'},
                {icon:'💬',label:'WhatsApp Sent',status:lead.channels.includes('wa')||lead.channels.includes('wa_pending')?'done':'pending',time:lead.channels.includes('wa')?'4h ago':'Scheduled Day 2'},
                {icon:'📞',label:'Voice Call',status:'pending',time:'Scheduled Day 4'},
                {icon:'🔁',label:'Follow-up Email',status:'pending',time:'Scheduled Day 7'},
                {icon:'🏁',label:'Sequence End',status:'pending',time:'Day 10'},
              ].map((s,i) => (
                <div key={i} className="seq-stage">
                  <div className={`seq-dot ${s.status}`}>{s.icon}</div>
                  <div className="seq-body">
                    <div style={{fontWeight:500,fontSize:13,marginBottom:2}}>{s.label}</div>
                    <div style={{fontSize:11,color:'var(--muted)'}} className="mono">{s.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab===3 && (
            <div className="flex-col gap-3">
              <div style={{fontSize:11,color:'var(--muted)'}}>Auto-saved as you type</div>
              <textarea className="input" style={{minHeight:180,fontSize:13,lineHeight:1.7}} value={note} onChange={e => handleNote(e.target.value)}/>
              {noteSaved && <div style={{fontSize:11,color:'var(--muted)',animation:'fadeUp 0.3s ease both'}}>✓ Saved just now</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
