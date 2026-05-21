import { useState, useRef } from 'react';
import { apiFetch } from '../services/api.js';

const INDUSTRIES = [
  'Construction & Renovation','IT Services & Software','Property & Real Estate',
  'Manufacturing','Logistics & Supply Chain','Healthcare & Clinic','F&B & Catering',
  'Education & Training','Finance & Insurance','Legal & Consulting','Retail & E-commerce',
  'Media & Marketing','HR & Recruitment','Security Services','Landscaping & Maintenance',
];

const METHODS = [
  { v:'referral',  l:'Referrals only' },
  { v:'coldcall',  l:'Cold calling manually' },
  { v:'ads',       l:'Social media / Google ads' },
  { v:'network',   l:'Networking events' },
  { v:'nothing',   l:'Not actively — struggling with this' },
];

const GOALS = ['5 meetings/month','10 meetings/month','20 meetings/month','50+ meetings/month'];
const LANGS = [{ v:'EN', l:'English' },{ v:'MS', l:'Melayu' },{ v:'ZH', l:'中文' }];

const LOG_KEY = 'kboos_demo_log';
function loadLog() { try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; } }
function saveLog(entry) {
  const log = loadLog();
  log.unshift(entry);
  localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 8)));
}

export function LiveDemo() {
  const [form, setForm] = useState({
    name: '', title: '', company: '', industry: 'IT Services & Software', city: 'Kuching',
    phone: '+60', email: '',
    currentMethod: 'referral', challenge: '', monthlyGoal: '10 meetings/month',
    lang: 'EN',
  });

  const [step, setStep] = useState('input');
  const [content, setContent] = useState(null);
  const [tab, setTab] = useState('whatsapp');
  const [firing, setFiring] = useState({});
  const [results, setResults] = useState({});
  const [error, setError] = useState('');
  const [log, setLog] = useState(loadLog);
  const [voiceConfirm, setVoiceConfirm] = useState(null);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function generate() {
    if (!form.name || !form.company) { setError('Name and company are required'); return; }
    if (!form.phone || form.phone.length < 6) { setError('Phone number is required'); return; }
    setError(''); setStep('generating');
    try {
      const data = await apiFetch('/demo/generate', { method: 'POST', body: form });
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
      const data = await apiFetch('/demo/fire', {
        method: 'POST',
        body: { name: form.name, phone: form.phone, email: form.email, company: form.company, channels, content },
      });
      setResults(data.results || {});
      setFiring({});
      setStep('done');
      saveLog({ name: form.name, company: form.company, channels, ts: new Date().toISOString(), results: data.results });
      setLog(loadLog());
    } catch (e) {
      setError(e.message); setFiring({}); setStep('preview');
    }
  }

  function reset() { setStep('input'); setContent(null); setResults({}); setFiring({}); setError(''); setVoiceConfirm(null); }

  function fireWithVoiceCheck(channels) {
    if (channels.includes('voice') && !voiceConfirm) { setVoiceConfirm(channels); return; }
    setVoiceConfirm(null);
    fire(channels);
  }

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

  const allChannelsReady = ['whatsapp','email','voice'].filter(channelReady);

  return (
    <div style={{padding:'24px 28px', maxWidth:1140, margin:'0 auto'}}>

      {/* Header */}
      <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24}}>
        <div>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:4}}>
            <span style={{width:8,height:8,borderRadius:'50%',background:'var(--green)',display:'inline-block',boxShadow:'0 0 8px var(--green)',animation:'pulse 2s infinite'}}/>
            <h1 style={{fontSize:22,fontWeight:800,color:'var(--text)'}}>Live Demo</h1>
            <span style={{fontSize:10,fontWeight:700,letterSpacing:'0.12em',color:'var(--green)',background:'rgba(0,255,128,0.08)',border:'1px solid rgba(0,255,128,0.2)',borderRadius:4,padding:'2px 7px'}}>LIVE</span>
          </div>
          <p style={{fontSize:13,color:'var(--muted)'}}>
            Enter your prospect's details — AI generates a personalised offer then fires a real WhatsApp, email & AI voice call. <strong style={{color:'var(--text)'}}>They receive it while sitting with you.</strong>
          </p>
        </div>
        {step !== 'input' && (
          <button className="btn btn-ghost btn-sm" onClick={reset}>↺ New Demo</button>
        )}
      </div>

      <div style={{display:'grid', gridTemplateColumns:'420px 1fr', gap:20, alignItems:'start'}}>

        {/* LEFT — Prospect intake form */}
        <div style={{display:'flex', flexDirection:'column', gap:12}}>

          {/* Section 1: Who they are */}
          <div className="card">
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',color:'var(--blue)',textTransform:'uppercase',marginBottom:14}}>
              👤 About the Prospect
            </div>
            {error && (
              <div style={{background:'var(--red-dim)',border:'1px solid var(--red)',borderRadius:6,padding:'8px 12px',marginBottom:12,color:'var(--red)',fontSize:12}}>
                {error}
              </div>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <Field label="Full Name" required>
                  <input className="input" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Ahmad Razali" disabled={step==='generating'}/>
                </Field>
                <Field label="Job Title">
                  <input className="input" value={form.title} onChange={e=>set('title',e.target.value)} placeholder="CEO / Director / Manager" disabled={step==='generating'}/>
                </Field>
              </div>
              <Field label="Company Name" required>
                <input className="input" value={form.company} onChange={e=>set('company',e.target.value)} placeholder="Naim Holdings" disabled={step==='generating'}/>
              </Field>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <Field label="Industry">
                  <select className="input" value={form.industry} onChange={e=>set('industry',e.target.value)} disabled={step==='generating'}>
                    {INDUSTRIES.map(i=><option key={i}>{i}</option>)}
                  </select>
                </Field>
                <Field label="City">
                  <input className="input" value={form.city} onChange={e=>set('city',e.target.value)} placeholder="Kuching" disabled={step==='generating'}/>
                </Field>
              </div>
            </div>
          </div>

          {/* Section 2: How to reach them */}
          <div className="card">
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',color:'var(--green)',textTransform:'uppercase',marginBottom:14}}>
              📲 How to Reach Them
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <Field label="WhatsApp / Phone" required>
                <input className="input" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+6013-5730946" disabled={step==='generating'}/>
              </Field>
              <Field label="Email Address">
                <input className="input" type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="ahmad@naimholdings.com.my" disabled={step==='generating'}/>
              </Field>
              <div>
                <label className="label">Language</label>
                <div style={{display:'flex',gap:6}}>
                  {LANGS.map(l=>(
                    <button key={l.v} onClick={()=>set('lang',l.v)} disabled={step==='generating'}
                      style={{flex:1,padding:'7px 0',borderRadius:8,border:`1px solid ${form.lang===l.v?'var(--green)':'var(--border)'}`,
                        background:form.lang===l.v?'var(--green-dim)':'transparent',
                        color:form.lang===l.v?'var(--green)':'var(--muted)',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                      {l.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Their situation — the secret sauce */}
          <div className="card" style={{border:'1px solid oklch(72% 0.18 65 / 0.4)'}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',color:'var(--amber)',textTransform:'uppercase',marginBottom:4}}>
              🎯 Their Situation
            </div>
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:14}}>
              This makes the offer speak directly to their exact pain — the more specific, the more impressed they'll be.
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <Field label="How do they currently get clients?">
                <select className="input" value={form.currentMethod} onChange={e=>set('currentMethod',e.target.value)} disabled={step==='generating'}>
                  {METHODS.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
                </select>
              </Field>
              <Field label="Their biggest sales/growth challenge">
                <input className="input" value={form.challenge} onChange={e=>set('challenge',e.target.value)}
                  placeholder="e.g. Can't scale beyond referrals, inconsistent pipeline..."
                  disabled={step==='generating'}/>
              </Field>
              <Field label="Monthly meeting / client goal">
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {GOALS.map(g=>(
                    <button key={g} onClick={()=>set('monthlyGoal',g)} disabled={step==='generating'}
                      style={{padding:'6px 12px',borderRadius:6,border:`1px solid ${form.monthlyGoal===g?'var(--amber)':'var(--border)'}`,
                        background:form.monthlyGoal===g?'var(--amber-dim)':'transparent',
                        color:form.monthlyGoal===g?'var(--amber)':'var(--muted)',fontSize:11,fontWeight:600,cursor:'pointer'}}>
                      {g}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </div>

          {/* Generate button */}
          <button
            className="btn btn-green"
            style={{width:'100%',padding:'14px',fontSize:15,fontWeight:800,letterSpacing:'0.04em',justifyContent:'center'}}
            onClick={generate}
            disabled={step==='generating' || !form.name || !form.company || !form.phone || form.phone.length < 6}
          >
            {step==='generating'
              ? <><Spinner/> Claude is crafting the offer…</>
              : '⚡ Generate Personalised Offer'}
          </button>
        </div>

        {/* RIGHT — Generated content + fire panel */}
        <div style={{display:'flex', flexDirection:'column', gap:16}}>

          {/* Idle */}
          {step === 'input' && (
            <div className="card" style={{padding:40, textAlign:'center', opacity:0.5}}>
              <div style={{fontSize:36, marginBottom:12}}>🎯</div>
              <div style={{fontWeight:700,fontSize:14,color:'var(--text)',marginBottom:6}}>Ready to impress</div>
              <div style={{fontSize:13,color:'var(--muted)'}}>Fill in the prospect details → AI builds a personalised KBOOS offer → fires it to them live</div>
            </div>
          )}

          {/* Generating */}
          {step === 'generating' && (
            <div className="card" style={{padding:40, textAlign:'center'}}>
              <div style={{fontSize:28, marginBottom:16}}>⚡</div>
              <div style={{fontSize:15,fontWeight:700,color:'var(--text)',marginBottom:8}}>
                Claude is writing for {form.name} at {form.company}…
              </div>
              <div style={{fontSize:12,color:'var(--muted)',marginBottom:24}}>
                Personalising the KBOOS offer to their industry, city, and exact challenge
              </div>
              <div style={{display:'flex',gap:16,justifyContent:'center'}}>
                {['💬 WhatsApp','📧 Email','📞 Voice Agent'].map((ch,i)=>(
                  <div key={ch} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--muted)'}}>
                    <span style={{width:6,height:6,borderRadius:'50%',background:'var(--green)',display:'inline-block',animation:`pulse 1s infinite ${i*0.3}s`}}/>
                    {ch}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview + fire */}
          {(step==='preview'||step==='firing'||step==='done') && content && (
            <>
              {/* Offer preview */}
              <div className="card" style={{overflow:'hidden'}}>
                <div style={{display:'flex',borderBottom:'1px solid var(--border)'}}>
                  {[
                    {id:'whatsapp',icon:'💬',label:'WhatsApp'},
                    {id:'email',icon:'📧',label:'Email'},
                    {id:'voice',icon:'📞',label:'Voice Script'},
                  ].map(t=>(
                    <button key={t.id} onClick={()=>setTab(t.id)}
                      style={{flex:1,padding:'12px',background:tab===t.id?'var(--green-dim)':'transparent',
                        border:'none',borderBottom:tab===t.id?'2px solid var(--green)':'2px solid transparent',
                        color:tab===t.id?'var(--green)':'var(--muted)',
                        fontSize:13,fontWeight:tab===t.id?700:500,cursor:'pointer',
                        display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
                <div style={{padding:20}}>
                  {tab === 'whatsapp' && (
                    <>
                      <div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:700,marginBottom:8}}>WhatsApp Message → {form.phone}</div>
                      <textarea className="input" rows={5} style={{resize:'vertical',fontFamily:'var(--font-mono)',fontSize:13,lineHeight:1.7}}
                        value={content.whatsapp} onChange={e=>setContent(c=>({...c,whatsapp:e.target.value}))}/>
                      <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>{content.whatsapp.length} characters</div>
                    </>
                  )}
                  {tab === 'email' && (
                    <>
                      <div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:700,marginBottom:8}}>Email → {form.email || 'no email provided'}</div>
                      <input className="input" style={{marginBottom:10,fontWeight:600}} value={content.emailSubject} onChange={e=>setContent(c=>({...c,emailSubject:e.target.value}))}/>
                      <textarea className="input" rows={8} style={{resize:'vertical',fontSize:13,lineHeight:1.7}}
                        value={content.emailBody} onChange={e=>setContent(c=>({...c,emailBody:e.target.value}))}/>
                    </>
                  )}
                  {tab === 'voice' && (
                    <>
                      <div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:700,marginBottom:4}}>Voice Agent Behavioral Guide → {form.phone}</div>
                      <div style={{fontSize:11,color:'var(--blue)',background:'var(--blue-dim)',borderRadius:6,padding:'6px 10px',marginBottom:8}}>
                        Full conversational AI — handles objections, re-engages off-topic, goal is to book the meeting or transfer to you.
                      </div>
                      <textarea className="input" rows={10} style={{resize:'vertical',fontSize:12,lineHeight:1.7}}
                        value={content.voiceScript} onChange={e=>setContent(c=>({...c,voiceScript:e.target.value}))}/>
                    </>
                  )}
                </div>
              </div>

              {/* Fire panel */}
              <div className="card">
                <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>
                  🔥 Fire to {form.name} @ {form.company}
                </div>
                <div style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>
                  They'll receive this <strong style={{color:'var(--text)'}}>right now</strong> — while sitting with you.
                </div>

                {/* Voice confirm */}
                {voiceConfirm && (
                  <div style={{background:'var(--amber-dim)',border:'1px solid oklch(72% 0.18 65 / 0.4)',borderRadius:10,padding:'14px 16px',marginBottom:12}}>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--amber)',marginBottom:6}}>📞 Confirm AI Voice Call</div>
                    <div style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>
                      Places a real AI call to <strong style={{color:'var(--text)'}}>{form.phone}</strong>. The agent will introduce KOBIS and aim to book a discovery call.
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>fire(voiceConfirm)} style={{flex:1,padding:'9px',borderRadius:8,border:'none',background:'var(--amber)',color:'#000',fontSize:12,fontWeight:700,cursor:'pointer'}}>
                        Yes, Call Now
                      </button>
                      <button onClick={()=>setVoiceConfirm(null)} style={{flex:1,padding:'9px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',fontSize:12,cursor:'pointer'}}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Individual channel buttons */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:12}}>
                  {[
                    {ch:'whatsapp',icon:'💬',label:'WhatsApp',color:'var(--green)',need:'phone'},
                    {ch:'email',icon:'📧',label:'Email',color:'var(--blue)',need:'email'},
                    {ch:'voice',icon:'📞',label:'AI Call',color:'var(--purple)',need:'phone'},
                  ].map(({ch,icon,label,color,need})=>(
                    <button key={ch}
                      onClick={()=>fireWithVoiceCheck([ch])}
                      disabled={!channelReady(ch)||step==='firing'||step==='done'}
                      style={{
                        padding:'12px 8px',borderRadius:10,
                        border:`1px solid ${results[ch]?.ok?'var(--green)':results[ch]?.ok===false?'var(--red)':channelReady(ch)?color:'var(--border)'}`,
                        background:results[ch]?.ok?'var(--green-dim)':results[ch]?.ok===false?'var(--red-dim)':channelReady(ch)?`oklch(from ${color} l c h / 0.08)`:'transparent',
                        color:'var(--text)',cursor:(!channelReady(ch)||step==='firing'||step==='done')?'not-allowed':'pointer',
                        opacity:!channelReady(ch)?0.4:1,
                        fontSize:12,fontWeight:600,display:'flex',flexDirection:'column',alignItems:'center',gap:5,
                      }}>
                      <span style={{fontSize:20}}>{icon}</span>
                      <span>{label}</span>
                      {statusIcon(ch)}
                      {!channelReady(ch) && <span style={{fontSize:10,color:'var(--red)'}}>add {need}</span>}
                    </button>
                  ))}
                </div>

                {/* Fire all */}
                <button
                  onClick={()=>fireWithVoiceCheck(allChannelsReady)}
                  disabled={step==='firing'||step==='done'||allChannelsReady.length===0}
                  style={{
                    width:'100%',padding:'14px',borderRadius:10,border:'none',
                    background:step==='done'?'var(--green-dim)':'linear-gradient(135deg,var(--green),oklch(62% 0.2 185))',
                    color:step==='done'?'var(--green)':'#000',
                    fontSize:15,fontWeight:800,cursor:step==='done'?'default':'pointer',
                    letterSpacing:'0.04em',display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                  }}>
                  {step==='firing' ? <><Spinner/> Firing…</> : step==='done' ? '✓ Sent! Watch their reaction 👀' : `🔥 Fire All (${allChannelsReady.length} channels)`}
                </button>

                {/* Results */}
                {step==='done' && Object.keys(results).length > 0 && (
                  <div style={{marginTop:14,display:'flex',flexDirection:'column',gap:7}}>
                    {Object.entries(results).map(([ch,r])=>{
                      const isIntlLimit = !r.ok && r.error?.toLowerCase().includes('international');
                      return (
                        <div key={ch} style={{flexDirection:'column',display:'flex',gap:6,fontSize:13,padding:'10px 12px',borderRadius:8,
                          background:r.ok?'var(--green-dim)':'var(--red-dim)',
                          border:`1px solid ${r.ok?'oklch(65% 0.2 145 / 0.3)':'oklch(55% 0.22 25 / 0.3)'}`}}>
                          <div style={{display:'flex',alignItems:'center',gap:10}}>
                            <span style={{color:r.ok?'var(--green)':'var(--red)',fontWeight:700}}>{r.ok?'✓':'✗'}</span>
                            <span style={{textTransform:'capitalize',fontWeight:600}}>{ch}</span>
                            <span style={{color:'var(--muted)',fontSize:12}}>{r.ok?'Delivered ✓':r.error}</span>
                          </div>
                          {isIntlLimit && (
                            <div style={{marginLeft:22,padding:'8px 12px',background:'var(--amber-dim)',border:'1px solid oklch(72% 0.18 65 / 0.3)',borderRadius:6,fontSize:12,color:'var(--amber)',lineHeight:1.6}}>
                              <strong>Free Vapi numbers can't call international (+60).</strong> Import a Twilio Malaysian number in Vapi → Settings → Vapi Phone Number ID.
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div style={{marginTop:8,padding:'12px 14px',background:'var(--s2)',borderRadius:8,fontSize:12,color:'var(--muted)',lineHeight:1.7,border:'1px solid var(--border)'}}>
                      <strong style={{color:'var(--text)'}}>What to say now:</strong> "That message you just got on WhatsApp — our AI wrote that specifically for you, {form.company}, and {form.industry} businesses in {form.city}. Every lead in your campaign gets the same level of personalisation. That's what gets replies."
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Recent log */}
          {log.length > 0 && step !== 'generating' && (
            <div className="card">
              <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',color:'var(--muted)',marginBottom:12,textTransform:'uppercase'}}>Recent Demos</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {log.map((entry,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:8,background:'var(--s1)',border:'1px solid var(--border)'}}>
                    <div style={{width:30,height:30,borderRadius:'50%',background:'var(--green-dim)',border:'1px solid oklch(65% 0.2 145 / 0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'var(--green)',flexShrink:0}}>
                      {entry.name.charAt(0)}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600}}>{entry.name} · <span style={{color:'var(--muted)',fontWeight:400}}>{entry.company}</span></div>
                      <div style={{display:'flex',gap:4,marginTop:2}}>
                        {entry.channels.map(ch=>(
                          <span key={ch} style={{fontSize:9,padding:'1px 5px',borderRadius:3,
                            background:entry.results?.[ch]?.ok?'var(--green-dim)':'var(--s2)',
                            color:entry.results?.[ch]?.ok?'var(--green)':'var(--muted)',
                            border:`1px solid ${entry.results?.[ch]?.ok?'oklch(65% 0.2 145 / 0.3)':'var(--border)'}`,
                            fontWeight:700,textTransform:'uppercase'}}>
                            {ch}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{fontSize:10,color:'var(--muted)',flexShrink:0}}>
                      {new Date(entry.ts).toLocaleTimeString('en-MY',{hour:'2-digit',minute:'2-digit'})}
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
      <label className="label">
        {label}{required && <span style={{color:'var(--red)',marginLeft:3}}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Spinner() {
  return <span style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'spin 0.7s linear infinite'}}/>;
}
