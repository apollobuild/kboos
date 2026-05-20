import { useState, useRef } from 'react';
import { apiFetch } from '../services/api.js';

const INDUSTRIES = ['Landscaping','Construction','IT Services','Healthcare','Education','F&B','Retail','Property','Finance','Manufacturing','Logistics','Media','Legal','Consulting'];
const TONES = ['Professional','Friendly','Direct','Formal'];
const LANGS = [{ v:'EN', l:'English' },{ v:'MS', l:'Bahasa Malaysia' },{ v:'ZH', l:'Mandarin' }];

const LOG_KEY = 'kboos_demo_log';
function loadLog() { try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; } }
function saveLog(entry) {
  const log = loadLog();
  log.unshift(entry);
  localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 8)));
}

export function LiveDemo() {
  const [form, setForm] = useState({ name:'', phone:'+60', email:'', company:'', industry:'Construction', title:'', lang:'EN', tone:'Professional' });
  const [step, setStep] = useState('input'); // input | generating | preview | firing | done
  const [content, setContent] = useState(null);
  const [tab, setTab] = useState('whatsapp');
  const [firing, setFiring] = useState({});
  const [results, setResults] = useState({});
  const [error, setError] = useState('');
  const [log, setLog] = useState(loadLog);
  const doneRef = useRef(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function generate() {
    if (!form.name || !form.company) { setError('Name and company are required'); return; }
    setError(''); setStep('generating');
    try {
      const data = await apiFetch('/demo/generate', { method:'POST', body: form });
      setContent({ emailSubject: data.emailSubject, emailBody: data.emailBody, whatsapp: data.whatsapp, voiceScript: data.voiceScript });
      setStep('preview'); setTab('whatsapp');
    } catch (e) {
      setError(e.message); setStep('input');
    }
  }

  async function fire(channels) {
    setFiring(Object.fromEntries(channels.map(c => [c, 'sending'])));
    setStep('firing');
    try {
      const data = await apiFetch('/demo/fire', { method:'POST', body: { name: form.name, phone: form.phone, email: form.email, company: form.company, channels, content } });
      setResults(data.results || {});
      setFiring({});
      setStep('done');
      const entry = { name: form.name, company: form.company, channels, ts: new Date().toISOString(), results: data.results };
      saveLog(entry);
      setLog(loadLog());
    } catch (e) {
      setError(e.message); setFiring({}); setStep('preview');
    }
  }

  function reset() { setStep('input'); setContent(null); setResults({}); setFiring({}); setError(''); doneRef.current = false; }

  const channelReady = (ch) => {
    if (ch === 'email') return !!form.email;
    if (ch === 'whatsapp') return !!form.phone && form.phone.length > 5;
    if (ch === 'voice') return !!form.phone && form.phone.length > 5;
    return false;
  };

  const statusIcon = (ch) => {
    if (firing[ch] === 'sending') return <span style={{color:'var(--amber)'}}>⏳</span>;
    if (results[ch]?.ok) return <span style={{color:'var(--green)'}}>✓</span>;
    if (results[ch]?.ok === false) return <span style={{color:'var(--red)'}}>✗</span>;
    return null;
  };

  return (
    <div style={{padding:'28px 32px', maxWidth:1100, margin:'0 auto'}}>
      {/* Header */}
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28}}>
        <div>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:4}}>
            <span style={{width:8,height:8,borderRadius:'50%',background:'var(--green)',display:'inline-block',boxShadow:'0 0 8px var(--green)',animation:'pulse 2s infinite'}} />
            <h1 style={{fontSize:22, fontWeight:800, color:'var(--fg)'}}>Live Demo</h1>
            <span style={{fontSize:10, fontWeight:700, letterSpacing:'0.12em', color:'var(--green)', background:'rgba(0,255,128,0.08)', border:'1px solid rgba(0,255,128,0.2)', borderRadius:4, padding:'2px 7px'}}>LIVE</span>
          </div>
          <p style={{fontSize:13, color:'var(--muted)'}}>Generate personalised outreach for any prospect — then fire a real email, WhatsApp & AI voice call in seconds.</p>
        </div>
        {step !== 'input' && (
          <button className="btn btn-ghost btn-sm" onClick={reset}>↺ Reset</button>
        )}
      </div>

      <div style={{display:'grid', gridTemplateColumns:'380px 1fr', gap:24, alignItems:'start'}}>

        {/* LEFT — Input form */}
        <div style={{background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:24}}>
          <div style={{fontSize:11, fontWeight:700, letterSpacing:'0.1em', color:'var(--muted)', marginBottom:18, textTransform:'uppercase'}}>Prospect Details</div>

          {error && <div style={{background:'rgba(255,80,80,0.08)', border:'1px solid rgba(255,80,80,0.25)', borderRadius:8, padding:'10px 14px', marginBottom:16, color:'var(--red)', fontSize:13}}>{error}</div>}

          <div style={{display:'grid', gap:14}}>
            <Field label="Full Name" required>
              <input className="input" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Ahmad Razali" disabled={step==='generating'} />
            </Field>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
              <Field label="Phone (+60...)">
                <input className="input" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+601X-XXXXXXX" disabled={step==='generating'} />
              </Field>
              <Field label="Email">
                <input className="input" type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="email@company.com" disabled={step==='generating'} />
              </Field>
            </div>
            <Field label="Company" required>
              <input className="input" value={form.company} onChange={e=>set('company',e.target.value)} placeholder="e.g. Naim Holdings" disabled={step==='generating'} />
            </Field>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
              <Field label="Industry">
                <select className="input" value={form.industry} onChange={e=>set('industry',e.target.value)} disabled={step==='generating'}>
                  {INDUSTRIES.map(i=><option key={i}>{i}</option>)}
                </select>
              </Field>
              <Field label="Job Title">
                <input className="input" value={form.title} onChange={e=>set('title',e.target.value)} placeholder="e.g. CEO" disabled={step==='generating'} />
              </Field>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
              <Field label="Language">
                <div style={{display:'flex', gap:6}}>
                  {LANGS.map(l=>(
                    <button key={l.v} onClick={()=>set('lang',l.v)} disabled={step==='generating'}
                      style={{flex:1, padding:'7px 0', borderRadius:8, border:`1px solid ${form.lang===l.v?'var(--green)':'var(--border)'}`, background:form.lang===l.v?'rgba(0,255,128,0.1)':'transparent', color:form.lang===l.v?'var(--green)':'var(--muted)', fontSize:11, fontWeight:700, cursor:'pointer'}}>
                      {l.v}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Tone">
                <select className="input" value={form.tone} onChange={e=>set('tone',e.target.value)} disabled={step==='generating'}>
                  {TONES.map(t=><option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{width:'100%', marginTop:22, padding:'13px', fontSize:14, fontWeight:800, letterSpacing:'0.04em', display:'flex', alignItems:'center', justifyContent:'center', gap:8}}
            onClick={generate}
            disabled={step==='generating' || !form.name || !form.company}
          >
            {step==='generating' ? <><Spinner /> Generating...</> : '⚡ Generate Outreach'}
          </button>
        </div>

        {/* RIGHT — Generated content + fire panel */}
        <div style={{display:'flex', flexDirection:'column', gap:16}}>

          {/* Generating state */}
          {step === 'generating' && (
            <div style={{background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:40, textAlign:'center'}}>
              <div style={{fontSize:28, marginBottom:16}}>⚡</div>
              <div style={{fontSize:15, fontWeight:700, color:'var(--fg)', marginBottom:8}}>Claude is writing personalised outreach…</div>
              <div style={{fontSize:13, color:'var(--muted)'}}>WhatsApp message · Email · Voice script — for {form.name} at {form.company}</div>
              <div style={{marginTop:24, display:'flex', gap:12, justifyContent:'center'}}>
                {['WhatsApp','Email','Voice'].map((ch,i)=>(
                  <div key={ch} style={{display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--muted)'}}>
                    <span style={{width:6,height:6,borderRadius:'50%',background:'var(--green)',display:'inline-block',opacity:0.6,animation:`pulse 1s infinite ${i*0.3}s`}} />
                    {ch}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input idle state */}
          {step === 'input' && (
            <div style={{background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:40, textAlign:'center', opacity:0.5}}>
              <div style={{fontSize:28, marginBottom:12}}>📋</div>
              <div style={{fontSize:13, color:'var(--muted)'}}>Fill in prospect details and click Generate to create personalised outreach</div>
            </div>
          )}

          {/* Preview + fire */}
          {(step==='preview'||step==='firing'||step==='done') && content && (
            <>
              {/* Tabs */}
              <div style={{background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden'}}>
                <div style={{display:'flex', borderBottom:'1px solid var(--border)'}}>
                  {[
                    {id:'whatsapp', icon:'💬', label:'WhatsApp'},
                    {id:'email', icon:'✉', label:'Email'},
                    {id:'voice', icon:'📞', label:'Voice Script'},
                  ].map(t=>(
                    <button key={t.id} onClick={()=>setTab(t.id)}
                      style={{flex:1, padding:'12px', background:tab===t.id?'rgba(0,255,128,0.06)':'transparent', border:'none', borderBottom:tab===t.id?'2px solid var(--green)':'2px solid transparent', color:tab===t.id?'var(--green)':'var(--muted)', fontSize:13, fontWeight:tab===t.id?700:500, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6}}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>

                <div style={{padding:20}}>
                  {tab === 'whatsapp' && (
                    <>
                      <div style={{fontSize:11, color:'var(--muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:700}}>WhatsApp Message</div>
                      <textarea className="input" rows={5} style={{resize:'vertical', fontFamily:'var(--font-mono)', fontSize:13, lineHeight:1.6}}
                        value={content.whatsapp}
                        onChange={e=>setContent(c=>({...c, whatsapp:e.target.value}))} />
                      <div style={{fontSize:11, color:'var(--muted)', marginTop:6}}>{content.whatsapp.length} characters</div>
                    </>
                  )}
                  {tab === 'email' && (
                    <>
                      <div style={{fontSize:11, color:'var(--muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:700}}>Subject</div>
                      <input className="input" style={{marginBottom:12, fontWeight:600}} value={content.emailSubject} onChange={e=>setContent(c=>({...c, emailSubject:e.target.value}))} />
                      <div style={{fontSize:11, color:'var(--muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:700}}>Body</div>
                      <textarea className="input" rows={8} style={{resize:'vertical', fontFamily:'inherit', fontSize:13, lineHeight:1.7}}
                        value={content.emailBody}
                        onChange={e=>setContent(c=>({...c, emailBody:e.target.value}))} />
                    </>
                  )}
                  {tab === 'voice' && (
                    <>
                      <div style={{fontSize:11, color:'var(--muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:700}}>AI Voice Script</div>
                      <div style={{fontSize:12, color:'var(--muted)', marginBottom:10}}>What the AI agent will say when the call connects:</div>
                      <textarea className="input" rows={6} style={{resize:'vertical', fontFamily:'inherit', fontSize:13, lineHeight:1.7}}
                        value={content.voiceScript}
                        onChange={e=>setContent(c=>({...c, voiceScript:e.target.value}))} />
                    </>
                  )}
                </div>
              </div>

              {/* Fire panel */}
              <div style={{background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:20}}>
                <div style={{fontSize:11, fontWeight:700, letterSpacing:'0.1em', color:'var(--muted)', marginBottom:16, textTransform:'uppercase'}}>
                  Fire to {form.name} @ {form.company}
                </div>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14}}>
                  {[
                    {ch:'whatsapp', icon:'💬', label:'WhatsApp', need:'phone'},
                    {ch:'email',    icon:'✉',  label:'Email',     need:'email'},
                    {ch:'voice',    icon:'📞', label:'AI Call',   need:'phone'},
                  ].map(({ch,icon,label,need})=>(
                    <button key={ch}
                      onClick={()=>fire([ch])}
                      disabled={!channelReady(ch)||step==='firing'||step==='done'}
                      style={{padding:'11px 8px', borderRadius:10, border:`1px solid ${results[ch]?.ok?'var(--green)':results[ch]?.ok===false?'var(--red)':'var(--border)'}`, background:results[ch]?.ok?'rgba(0,255,128,0.08)':results[ch]?.ok===false?'rgba(255,80,80,0.06)':'transparent', color:'var(--fg)', cursor:(!channelReady(ch)||step==='firing'||step==='done')?'not-allowed':'pointer', opacity:(!channelReady(ch)&&step!=='done')?0.4:1, fontSize:12, fontWeight:600, display:'flex', flexDirection:'column', alignItems:'center', gap:5}}>
                      <span style={{fontSize:18}}>{icon}</span>
                      <span>{label}</span>
                      {statusIcon(ch)}
                      {!channelReady(ch) && <span style={{fontSize:10,color:'var(--red)'}}>no {need}</span>}
                    </button>
                  ))}
                </div>
                <button
                  onClick={()=>fire(['whatsapp','email','voice'].filter(channelReady))}
                  disabled={step==='firing'||step==='done'||['whatsapp','email','voice'].filter(channelReady).length===0}
                  style={{width:'100%', padding:'13px', borderRadius:10, border:'none', background:step==='done'?'rgba(0,255,128,0.15)':'linear-gradient(135deg,oklch(68% 0.22 145),oklch(62% 0.2 185))', color:step==='done'?'var(--green)':'#03050a', fontSize:14, fontWeight:800, cursor:step==='done'?'default':'pointer', letterSpacing:'0.04em', display:'flex', alignItems:'center', justifyContent:'center', gap:8}}>
                  {step==='firing' ? <><Spinner /> Firing...</> : step==='done' ? '✓ Sent!' : '🔥 Fire All Channels'}
                </button>

                {/* Results */}
                {step==='done' && Object.keys(results).length > 0 && (
                  <div style={{marginTop:14, display:'flex', flexDirection:'column', gap:7}}>
                    {Object.entries(results).map(([ch,r])=>(
                      <div key={ch} style={{display:'flex', alignItems:'center', gap:10, fontSize:13, padding:'8px 12px', borderRadius:8, background:r.ok?'rgba(0,255,128,0.06)':'rgba(255,80,80,0.06)', border:`1px solid ${r.ok?'rgba(0,255,128,0.2)':'rgba(255,80,80,0.2)'}`}}>
                        <span style={{color:r.ok?'var(--green)':'var(--red)', fontWeight:700}}>{r.ok?'✓':'✗'}</span>
                        <span style={{textTransform:'capitalize', fontWeight:600}}>{ch}</span>
                        <span style={{color:'var(--muted)', fontSize:12}}>{r.ok ? 'Sent successfully' : r.error}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Recent log */}
          {log.length > 0 && (
            <div style={{background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:20}}>
              <div style={{fontSize:11, fontWeight:700, letterSpacing:'0.1em', color:'var(--muted)', marginBottom:14, textTransform:'uppercase'}}>Recent Demos</div>
              <div style={{display:'flex', flexDirection:'column', gap:8}}>
                {log.map((entry,i)=>(
                  <div key={i} style={{display:'flex', alignItems:'center', gap:12, padding:'9px 12px', borderRadius:8, background:'rgba(255,255,255,0.02)', border:'1px solid var(--border)'}}>
                    <div style={{width:32, height:32, borderRadius:'50%', background:'rgba(0,255,128,0.1)', border:'1px solid rgba(0,255,128,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'var(--green)', flexShrink:0}}>
                      {entry.name.charAt(0)}
                    </div>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{fontSize:13, fontWeight:600, color:'var(--fg)'}}>{entry.name} <span style={{color:'var(--muted)', fontWeight:400}}>· {entry.company}</span></div>
                      <div style={{display:'flex', gap:6, marginTop:3}}>
                        {entry.channels.map(ch=>(
                          <span key={ch} style={{fontSize:10, padding:'1px 6px', borderRadius:4, background:entry.results?.[ch]?.ok?'rgba(0,255,128,0.1)':'rgba(255,255,255,0.05)', color:entry.results?.[ch]?.ok?'var(--green)':'var(--muted)', border:`1px solid ${entry.results?.[ch]?.ok?'rgba(0,255,128,0.2)':'var(--border)'}`, fontWeight:600, textTransform:'uppercase'}}>
                            {ch}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{fontSize:11, color:'var(--muted)', flexShrink:0}}>
                      {new Date(entry.ts).toLocaleTimeString('en-MY', {hour:'2-digit',minute:'2-digit'})}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.2)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <div style={{fontSize:11, fontWeight:700, color:'var(--muted)', marginBottom:6, letterSpacing:'0.08em', textTransform:'uppercase'}}>
        {label}{required && <span style={{color:'var(--red)',marginLeft:3}}>*</span>}
      </div>
      {children}
    </div>
  );
}

function Spinner() {
  return <span style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'spin 0.7s linear infinite'}} />;
}
