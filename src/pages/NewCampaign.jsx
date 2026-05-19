import { useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { BizAvatar } from '../components/ui/BizAvatar.jsx';
import { apiFetch } from '../services/api.js';

const STEP_PRESETS = {
  email_only: [{ type:'email', icon:'📧', day:0, label:'Email', desc:'Personalized cold email' }],
  wa_direct:  [{ type:'wa',    icon:'💬', day:0, label:'WhatsApp', desc:'Direct WhatsApp outreach' }],
  full: [
    { type:'email', icon:'📧', day:0, label:'Email', desc:'Personalized cold email' },
    { type:'wa',    icon:'💬', day:2, label:'WhatsApp', desc:'Follow-up WA if no reply' },
    { type:'call',  icon:'📞', day:4, label:'Voice Call', desc:'AI voice call attempt', skipIfReplied:true },
  ],
};

const LEAD_SOURCES = {
  google_maps: {
    label: 'Google Maps',
    icon: '📍',
    desc: 'Local Malaysian businesses — gets phone/WhatsApp, address, website',
    finds: ['Business name','Phone / WhatsApp','Address','Website','Category'],
    missing: ['Personal email','Job title','LinkedIn'],
    color: 'green',
  },
  apollo: {
    label: 'Apollo.io',
    icon: '🔭',
    desc: 'B2B professional contacts — gets name, title, email, LinkedIn',
    finds: ['Full name','Job title','Company','Work email (when available)','LinkedIn URL'],
    missing: ['Mobile/WhatsApp number (paid plan only)'],
    color: 'blue',
  },
  manual: {
    label: 'Manual / CSV',
    icon: '📋',
    desc: 'Upload your own lead list after campaign creation',
    finds: ['Whatever your CSV contains'],
    missing: [],
    color: 'muted',
  },
};

export function NewCampaign() {
  const { businesses, addCampaign, setPage } = useAppStore(useShallow(s => ({
    businesses: s.businesses, addCampaign: s.addCampaign, setPage: s.setPage,
  })));

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('kboos_user') || '{}'); } catch { return {}; }
  })();

  const [step, setStep] = useState(0);
  const [bizSel, setBizSel] = useState(null);
  const [campaignName, setCampaignName] = useState('');
  const [region, setRegion] = useState('Kuching, Sarawak');
  const [tier, setTier] = useState(0);

  // Lead source
  const [leadSource, setLeadSource] = useState('google_maps');
  // Google Maps fields
  const [keyword, setKeyword] = useState('');
  const [gmCity, setGmCity] = useState('Kuching');
  const [radius, setRadius] = useState(50);
  // Apollo fields
  const [tags, setTags] = useState(['Property Manager','Facilities Manager']);
  const [tagInput, setTagInput] = useState('');
  const [seniority, setSeniority] = useState(['Manager','Director']);
  const [apolloCity, setApolloCity] = useState('Kuching');

  // Sequence
  const [driveSync, setDriveSync] = useState(false);
  const [seqPreset, setSeqPreset] = useState('full');
  const [seqSteps, setSeqSteps] = useState(STEP_PRESETS.full);
  const [recycleLeads, setRecycleLeads] = useState(false);
  const [fromName, setFromName] = useState(currentUser.name || '');
  const [fromEmail, setFromEmail] = useState(currentUser.email || '');

  // Prompt & preview
  const [prompt, setPrompt] = useState(`You are a B2B outreach specialist.\n\nBusiness: {{business_name}}\nContact: {{first_name}} at {{company}}\n\nWrite a personalized cold email highlighting:\n- Their specific pain point: {{pain_point}}\n- Our solution for {{industry}}\n- Clear CTA for a site visit\n\nTone: Professional but warm\nLength: 150-200 words\nLanguage: {{language}}`);
  const [previewing, setPreviewing] = useState(false);
  const [previewDone, setPreviewDone] = useState(false);
  const [previewEmail, setPreviewEmail] = useState(null);
  const [created, setCreated] = useState(false);

  const steps = ['Business & Basics', 'Audience & Leads', 'Sequence', 'Prompts & Preview'];
  const selBiz = businesses.find(b => b.id === bizSel);
  const tierNames = ['Starter · 600 leads', 'Growth · 1,200 leads', 'Enterprise · 2,400 leads'];
  const tierTotals = [600, 1200, 2400];
  const tierLabels = ['Starter', 'Growth', 'Enterprise'];

  const addSeqStep = () => setSeqSteps(s => [...s, { type:'email', icon:'📧', day:(s[s.length-1]?.day||0)+2, label:'Follow-up Email', desc:'Follow-up message' }]);
  const removeSeqStep = (i) => setSeqSteps(s => s.filter((_,idx) => idx !== i));
  const moveStep = (i, dir) => setSeqSteps(s => { const a=[...s]; [a[i],a[i+dir]]=[a[i+dir],a[i]]; return a; });
  const updateStepDay = (i, day) => setSeqSteps(s => s.map((st,idx) => idx===i ? {...st,day} : st));

  const doPreview = async () => {
    setPreviewing(true);
    try {
      const result = await apiFetch('/ai/generate-email', {
        method: 'POST',
        body: {
          bizName: selBiz?.name || 'Your Business',
          campaignName: campaignName || 'Campaign',
          prompt,
          lead: { name:'Ahmad Razali', company:'Naim Holdings', title:'Property Manager', lang:'EN' }
        }
      });
      setPreviewEmail(result);
      setPreviewDone(true);
    } catch (e) {
      setPreviewEmail({
        subject: 'Preview failed',
        body: e.message || 'Check your Claude API key in Settings → API Keys',
      });
      setPreviewDone(true);
    } finally {
      setPreviewing(false);
    }
  };

  const doCreate = () => {
    const selBizData = businesses.find(b => b.id === bizSel);
    const audienceConfig = {
      leadSource,
      ...(leadSource === 'google_maps' ? { keyword, city: gmCity, radius } : {}),
      ...(leadSource === 'apollo' ? { tags, seniority, city: apolloCity } : {}),
      region,
      fromName,
      fromEmail,
      recycleLeads,
    };
    addCampaign({
      bizId:    bizSel,
      bizName:  selBizData?.name || 'Unknown',
      name:     campaignName || `${selBizData?.name || 'Campaign'} Q${Math.floor(Math.random()*4)+1}`,
      status:   'awaiting_approval',
      color:    selBizData?.color || 'blue',
      leads:    0,
      total:    tierTotals[tier],
      hot:      0,
      spend:    'RM 0',
      open:     '0%',
      wa:       '-',
      tier:     tierLabels[tier],
      sequence: seqSteps,
      config:   audienceConfig,
      driveSync,
    });
    setCreated(true);
  };

  if (created) return (
    <div className="success-overlay">
      <svg className="check-svg" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="24" stroke="var(--green)" strokeWidth="2" fill="none" className="check-circle"/>
        <path d="M18 30l8 8 16-16" stroke="var(--green)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="check-mark"/>
      </svg>
      <div style={{fontWeight:600,fontSize:18,color:'var(--text)'}}>Campaign Created!</div>
      <div style={{color:'var(--muted)',fontSize:13}}>Awaiting approval before going active.</div>
      <button className="btn btn-green" onClick={() => setPage('campaigns')}>View Campaigns →</button>
    </div>
  );

  return (
    <div className="page">
      <div className="flex items-center gap-3 mb-4 fade-up">
        <button className="btn btn-ghost btn-sm" onClick={() => setPage('campaigns')}>← Back</button>
        <div>
          <div className="breadcrumb">Campaigns / <span>New Campaign</span></div>
          <h1 className="page-title" style={{marginTop:2}}>Campaign Builder</h1>
        </div>
      </div>

      <div className="steps-bar fade-up-1" style={{maxWidth:600,marginBottom:28}}>
        {steps.map((s,i) => (
          <div key={i} style={{display:'flex',alignItems:'center',flex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
              <div className={`step-dot ${i<step?'done':i===step?'active':''}`}>{i<step?'✓':i+1}</div>
              <div className={`step-name${i===step?' active':''}`} style={{color:i===step?'var(--text)':i<step?'var(--green)':'var(--muted)'}}>{s}</div>
            </div>
            {i<steps.length-1 && <div className={`step-line${i<step?' done':''}`} style={{flex:1,margin:'0 8px'}}/>}
          </div>
        ))}
      </div>

      <div className="card fade-up-2" style={{maxWidth:800}}>

        {/* ── Step 0: Business & Basics ── */}
        {step===0 && (
          <div className="flex-col gap-4">
            <div style={{fontWeight:600,marginBottom:4}}>Select Business</div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {businesses.filter(b => b.brief==='approved').map(b => (
                <div key={b.id} className={`radio-card${bizSel===b.id?' selected':''}`} style={{flex:'none'}}
                  onClick={() => { setBizSel(b.id); setCampaignName(`${b.name} Q${Math.floor(Math.random()*4)+1}`); }}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <BizAvatar id={b.id} color={b.color} size={24}/>
                    <div><div className="radio-card-title">{b.name}</div><div className="radio-card-sub">{b.industry}</div></div>
                  </div>
                </div>
              ))}
              {businesses.filter(b => b.brief==='approved').length === 0 && (
                <div style={{color:'var(--muted)',fontSize:13}}>No approved businesses yet. Add a business first.</div>
              )}
            </div>
            {selBiz && (
              <div style={{background:'var(--green-dim)',border:'1px solid var(--green)',borderRadius:8,padding:'10px 14px',display:'flex',alignItems:'center',gap:8}}>
                <span style={{color:'var(--green)'}}>✓</span>
                <span style={{fontSize:13,color:'var(--green)'}}>AI Brief loaded for <strong>{selBiz.name}</strong></span>
              </div>
            )}
            <div className="grid-2">
              <div><label className="label">Campaign Name</label><input className="input" placeholder="e.g. Kuching Q3 Push" value={campaignName} onChange={e=>setCampaignName(e.target.value)}/></div>
              <div><label className="label">Target Region</label><input className="input" placeholder="e.g. Kuching, Samarahan" value={region} onChange={e=>setRegion(e.target.value)}/></div>
            </div>
            <div>
              <label className="label">Campaign Tier</label>
              <div style={{display:'flex',gap:10}}>
                {tierNames.map((t,i) => (
                  <div key={t} className={`radio-card${tier===i?' selected':''}`} style={{flex:1}} onClick={() => setTier(i)}>
                    <div className="radio-card-title">{t.split('·')[0]}</div>
                    <div className="radio-card-sub">{t.split('·')[1]}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 1: Audience & Leads ── */}
        {step===1 && (
          <div className="flex-col gap-4">
            <div style={{fontWeight:600}}>Lead Source</div>

            {/* Source selector */}
            <div style={{display:'flex',gap:10}}>
              {Object.entries(LEAD_SOURCES).map(([key, src]) => (
                <div key={key} className={`radio-card${leadSource===key?' selected':''}`} style={{flex:1}}
                  onClick={() => setLeadSource(key)}>
                  <div style={{fontSize:18,marginBottom:4}}>{src.icon}</div>
                  <div className="radio-card-title">{src.label}</div>
                  <div className="radio-card-sub" style={{fontSize:10,marginTop:2}}>{src.desc}</div>
                </div>
              ))}
            </div>

            {/* Source capability card */}
            <div style={{background:'var(--s2)',borderRadius:8,padding:'12px 14px',fontSize:12}}>
              <div style={{display:'flex',gap:16}}>
                <div style={{flex:1}}>
                  <div style={{color:'var(--green)',fontWeight:600,marginBottom:6}}>✓ Gets you</div>
                  {LEAD_SOURCES[leadSource].finds.map(f => <div key={f} style={{color:'var(--text)',marginBottom:2}}>· {f}</div>)}
                </div>
                {LEAD_SOURCES[leadSource].missing.length > 0 && (
                  <div style={{flex:1}}>
                    <div style={{color:'var(--muted)',fontWeight:600,marginBottom:6}}>✗ Won't get</div>
                    {LEAD_SOURCES[leadSource].missing.map(f => <div key={f} style={{color:'var(--muted)',marginBottom:2}}>· {f}</div>)}
                  </div>
                )}
              </div>
            </div>

            {/* Google Maps fields */}
            {leadSource === 'google_maps' && (
              <div className="flex-col gap-3">
                <div>
                  <label className="label">Business Keyword</label>
                  <input className="input" placeholder="e.g. landscaping company, IT services, clinic" value={keyword} onChange={e=>setKeyword(e.target.value)}/>
                  <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>What type of business are you targeting?</div>
                </div>
                <div className="grid-2" style={{gap:10}}>
                  <div>
                    <label className="label">City</label>
                    <input className="input" value={gmCity} onChange={e=>setGmCity(e.target.value)} placeholder="e.g. Kuching"/>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="label" style={{marginBottom:0}}>Radius</label>
                      <span className="mono text-blue" style={{fontSize:12}}>{radius} km</span>
                    </div>
                    <input type="range" min="10" max="200" step="10" value={radius} onChange={e=>setRadius(+e.target.value)} style={{width:'100%',accentColor:'var(--blue)'}}/>
                  </div>
                </div>
                <div style={{background:'var(--green-dim)',border:'1px solid oklch(65% 0.2 145 / 0.3)',borderRadius:6,padding:'8px 12px',fontSize:11,color:'var(--green)'}}>
                  📍 Scraping Google Maps within {radius}km of {gmCity} · ~{tierTotals[tier]} businesses · Includes phone/WhatsApp numbers
                </div>
              </div>
            )}

            {/* Apollo fields */}
            {leadSource === 'apollo' && (
              <div className="flex-col gap-3">
                <div>
                  <label className="label">Target Job Titles</label>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
                    {tags.map(t => <span key={t} className="chip">{t}<button onClick={() => setTags(tt=>tt.filter(x=>x!==t))}>×</button></span>)}
                  </div>
                  <input className="input" placeholder="Add title + Enter" value={tagInput}
                    onChange={e=>setTagInput(e.target.value)}
                    onKeyDown={e => { if(e.key==='Enter'&&tagInput.trim()){setTags(t=>[...t,tagInput.trim()]);setTagInput('');} }}
                  />
                </div>
                <div>
                  <label className="label">Seniority Level</label>
                  <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                    {['C-Level','VP','Director','Manager','Individual Contributor'].map(s => (
                      <label key={s} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:13}}>
                        <input type="checkbox" checked={seniority.includes(s)} onChange={e => setSeniority(prev => e.target.checked ? [...prev,s] : prev.filter(x=>x!==s))} style={{accentColor:'var(--blue)'}}/>
                        {s}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">City / Location</label>
                  <input className="input" value={apolloCity} onChange={e=>setApolloCity(e.target.value)} placeholder="e.g. Kuching"/>
                </div>
                <div style={{background:'var(--blue-dim)',border:'1px solid oklch(62% 0.19 245 / 0.3)',borderRadius:6,padding:'8px 12px',fontSize:11,color:'var(--blue)'}}>
                  🔭 Apollo search: {tags.join(', ')} · {seniority.join(', ')} · {apolloCity} · ~{tierTotals[tier]} contacts · Email + LinkedIn (no mobile on free plan)
                </div>
              </div>
            )}

            {/* Manual fields */}
            {leadSource === 'manual' && (
              <div style={{background:'var(--s2)',borderRadius:8,padding:'20px',textAlign:'center',color:'var(--muted)',fontSize:13}}>
                <div style={{fontSize:24,marginBottom:8}}>📋</div>
                <div style={{fontWeight:500,color:'var(--text)',marginBottom:4}}>CSV Upload</div>
                <div>After creating the campaign, go to Lead Manager → Import CSV to upload your leads.</div>
                <div style={{marginTop:8,fontSize:11}}>Required columns: name, company, phone or email</div>
              </div>
            )}

            {/* Volume summary — derived from tier, no duplicate slider */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'var(--s2)',borderRadius:8,fontSize:13}}>
              <span style={{color:'var(--muted)'}}>Target volume</span>
              <span className="mono text-green" style={{fontWeight:600}}>{tierTotals[tier].toLocaleString()} leads · {tierLabels[tier]}</span>
            </div>

            <label style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--s2)',borderRadius:8,cursor:'pointer',fontSize:13}}>
              <input type="checkbox" checked={driveSync} onChange={e=>setDriveSync(e.target.checked)} style={{accentColor:'var(--blue)'}}/>
              <div>
                <div style={{fontWeight:500}}>Auto-save leads to Google Drive</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>Saves CSV to campaign folder · Configure in Settings → Drive</div>
              </div>
            </label>
          </div>
        )}

        {/* ── Step 2: Sequence ── */}
        {step===2 && (
          <div className="flex-col gap-4">
            <div style={{fontWeight:600}}>Outreach Sequence</div>
            <div className="grid-2">
              <div>
                <label className="label">From Name</label>
                <input className="input" value={fromName} onChange={e=>setFromName(e.target.value)} placeholder="Your name"/>
              </div>
              <div>
                <label className="label">From Email</label>
                <input className="input" value={fromEmail} onChange={e=>setFromEmail(e.target.value)} placeholder="your@email.com"/>
              </div>
            </div>
            <div>
              <label className="label">Sequence Preset</label>
              <div style={{display:'flex',gap:8}}>
                {[['email_only','📧 Email Only'],['wa_direct','💬 WA Direct'],['full','⚡ Full Sequence']].map(([key,label]) => (
                  <div key={key} className={`radio-card${seqPreset===key?' selected':''}`} style={{flex:1}}
                    onClick={() => { setSeqPreset(key); setSeqSteps(STEP_PRESETS[key]); }}>
                    <div className="radio-card-title" style={{fontSize:12}}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Sequence Steps</label>
              <div className="seq-timeline mt-2">
                {seqSteps.map((s,i) => (
                  <div key={i} className="seq-stage">
                    <div className={`seq-dot ${i===0?'active':'pending'}`}>{s.icon}</div>
                    <div className="seq-body">
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{fontWeight:500,fontSize:13}}>{s.label}</span>
                        {i > 0 && (
                          <>
                            <input type="number" value={s.day} min={1} max={14} onChange={e=>updateStepDay(i,+e.target.value)}
                              style={{width:48,fontFamily:'var(--font-mono)',fontSize:11,background:'var(--s2)',border:'1px solid var(--border)',borderRadius:4,color:'var(--text)',padding:'2px 6px'}}/>
                            <span style={{fontSize:11,color:'var(--muted)'}}>days delay</span>
                          </>
                        )}
                        <div style={{marginLeft:'auto',display:'flex',gap:4}}>
                          {i > 0 && <button className="btn btn-ghost btn-xs" onClick={() => moveStep(i,-1)}>↑</button>}
                          {i < seqSteps.length-1 && <button className="btn btn-ghost btn-xs" onClick={() => moveStep(i,1)}>↓</button>}
                          {seqSteps.length > 1 && <button style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:12,padding:'2px 6px'}} onClick={() => removeSeqStep(i)}>×</button>}
                        </div>
                      </div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{s.desc}</div>
                      {s.type==='call' && (
                        <label style={{display:'flex',alignItems:'center',gap:6,marginTop:6,fontSize:11,color:'var(--muted)',cursor:'pointer'}}>
                          <input type="checkbox" checked={s.skipIfReplied||false}
                            onChange={e => setSeqSteps(ss=>ss.map((st,idx)=>idx===i?{...st,skipIfReplied:e.target.checked}:st))}
                            style={{accentColor:'var(--blue)'}}/>
                          Skip if already replied
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn btn-ghost btn-xs mt-2" onClick={addSeqStep}>＋ Add Step</button>
            </div>
            <label style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--s2)',borderRadius:8,cursor:'pointer',fontSize:13}}>
              <input type="checkbox" checked={recycleLeads} onChange={e=>setRecycleLeads(e.target.checked)} style={{accentColor:'var(--blue)'}}/>
              <div>
                <div style={{fontWeight:500}}>Recycle leads after sequence ends</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>Re-engage leads after Day 14 with a fresh round</div>
              </div>
            </label>
          </div>
        )}

        {/* ── Step 3: Prompts & Preview ── */}
        {step===3 && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            <div className="flex-col gap-3">
              <div style={{fontWeight:600}}>Email Prompt</div>
              {selBiz && (
                <div style={{background:'var(--blue-dim)',border:'1px solid oklch(62% 0.19 245 / 0.3)',borderRadius:8,padding:'8px 12px',fontSize:12,color:'var(--blue)'}}>
                  ⚡ AI Brief loaded from {selBiz.name}
                </div>
              )}
              <textarea className="input mono" style={{minHeight:200,fontSize:11,lineHeight:1.8}} value={prompt} onChange={e=>setPrompt(e.target.value)}/>
              <div>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:6}}>Available Variables</div>
                {['{{first_name}}','{{company}}','{{industry}}','{{pain_point}}','{{language}}','{{location}}'].map(v => (
                  <span key={v} className="chip" style={{margin:'0 4px 4px 0',cursor:'pointer'}} onClick={() => setPrompt(p=>p+' '+v)}>{v}</span>
                ))}
              </div>
            </div>
            <div className="flex-col gap-3">
              <div style={{fontWeight:600}}>Live Preview</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div><label className="label">Name</label><input className="input input-sm" defaultValue="Sarah Lim"/></div>
                <div><label className="label">Company</label><input className="input input-sm" defaultValue="Maybank KCH"/></div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={doPreview}>
                {previewing ? <><span style={{animation:'spin 1s linear infinite',display:'inline-block'}}>◌</span> Generating...</> : '⚡ Generate Preview'}
              </button>
              {previewing && <div className="shimmer" style={{height:200,borderRadius:8}}/>}
              {previewDone && !previewing && (
                <div style={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:8,padding:14,fontSize:12,lineHeight:1.8}}>
                  <div style={{fontWeight:600,marginBottom:8}}>Subject: {previewEmail?.subject}</div>
                  <div style={{color:'var(--muted)',whiteSpace:'pre-line'}}>{previewEmail?.body}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 fade-up-3" style={{maxWidth:800}}>
        <button className="btn btn-ghost" onClick={() => setStep(s=>Math.max(0,s-1))} disabled={step===0}>← Back</button>
        <span className="mono text-muted text-sm">Step {step+1} of {steps.length}</span>
        {step < steps.length-1
          ? <button className="btn btn-primary" disabled={step===0 && !bizSel} onClick={() => setStep(s=>s+1)}>Continue →</button>
          : <button className="btn btn-green" disabled={!bizSel} onClick={doCreate}>🚀 Launch Campaign</button>
        }
      </div>
    </div>
  );
}
