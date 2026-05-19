import { useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { BizAvatar } from '../components/ui/BizAvatar.jsx';
import { apiFetch } from '../services/api.js';

const TIERS = [
  {
    name: 'Starter', leads: 600, color: 'muted',
    channels: ['email'],
    tagline: 'Email outreach',
    features: ['600 leads scraped', 'AI-personalized emails', 'Google Maps scraping', 'Basic reporting'],
    sequence: [{ type:'email', icon:'📧', day:0, label:'Email Day 0', desc:'Personalized cold email sent' }],
  },
  {
    name: 'Growth', leads: 1200, color: 'blue',
    channels: ['email','wa'],
    tagline: 'Email + WhatsApp',
    features: ['1,200 leads scraped', 'AI-personalized emails', 'Google Maps + Apollo', 'WhatsApp follow-up on Day 3', 'Full analytics'],
    sequence: [
      { type:'email', icon:'📧', day:0, label:'Email Day 0', desc:'Personalized cold email sent' },
      { type:'wa',    icon:'💬', day:3, label:'WhatsApp Day 3', desc:'WA follow-up if no reply' },
    ],
  },
  {
    name: 'Enterprise', leads: 2400, color: 'purple',
    channels: ['email','wa','call'],
    tagline: 'Email + WhatsApp + Voice',
    features: ['2,400 leads scraped', 'AI-personalized emails', 'Google Maps + Apollo', 'WhatsApp follow-up', 'AI voice call Day 6', 'Priority support'],
    sequence: [
      { type:'email', icon:'📧', day:0, label:'Email Day 0', desc:'Personalized cold email sent' },
      { type:'wa',    icon:'💬', day:3, label:'WhatsApp Day 3', desc:'WA follow-up if no reply' },
      { type:'call',  icon:'📞', day:6, label:'Voice Call Day 6', desc:'AI call if still no reply', skipIfReplied:true },
    ],
  },
];

const CHANNEL_ICONS = { email:'📧', wa:'💬', call:'📞' };
const CHANNEL_LABELS = { email:'Email', wa:'WhatsApp', call:'Voice Call' };

export function NewCampaign() {
  const { businesses, addCampaign, setPage, showToast } = useAppStore(useShallow(s => ({
    businesses: s.businesses, addCampaign: s.addCampaign, setPage: s.setPage, showToast: s.showToast,
  })));

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('kboos_user') || '{}'); } catch { return {}; }
  })();

  const [step, setStep] = useState(0);
  const [bizSel, setBizSel] = useState(null);
  const [campaignName, setCampaignName] = useState('');
  const [region, setRegion] = useState('Kuching, Sarawak');
  const [tier, setTier] = useState(0);

  // Lead sources — multi-select
  const [sources, setSources] = useState({ google_maps: true, apollo: false });
  const toggleSource = (src) => setSources(s => ({ ...s, [src]: !s[src] }));
  // Google Maps
  const [keyword, setKeyword] = useState('');
  const [gmCity, setGmCity] = useState('Kuching');
  const [radius, setRadius] = useState(50);
  // Apollo
  const [tags, setTags] = useState(['Property Manager','Facilities Manager']);
  const [tagInput, setTagInput] = useState('');
  const [seniority, setSeniority] = useState(['Manager','Director']);
  const [apolloCity, setApolloCity] = useState('Kuching');

  // Sequence (auto-set from tier)
  const [seqSteps, setSeqSteps] = useState(TIERS[0].sequence);
  const [recycleLeads, setRecycleLeads] = useState(false);
  const [fromName, setFromName] = useState(currentUser.name || '');
  const [fromEmail, setFromEmail] = useState(currentUser.email || '');

  // Prompt & preview
  const [prompt, setPrompt] = useState(`You are a B2B outreach specialist writing for {{business_name}}.\nContact: {{first_name}} at {{company}} ({{title}})\n\nWrite a personalized cold email that:\n- References their industry: {{industry}}\n- Addresses a pain point they likely have\n- Clearly explains what we offer\n- Ends with a soft CTA (15-min call or site visit)\n\nTone: Professional but conversational\nLength: 120-150 words\nLanguage: {{language}}`);
  const [previewing, setPreviewing] = useState(false);
  const [previewDone, setPreviewDone] = useState(false);
  const [previewEmail, setPreviewEmail] = useState(null);
  const [driveSync, setDriveSync] = useState(false);

  // Launch state
  const [created, setCreated] = useState(false);
  const [scrapeLog, setScrapeLog] = useState([]);
  const [scraping, setScraping] = useState(false);

  const selBiz = businesses.find(b => b.id === bizSel);
  const tierDef = TIERS[tier];
  const steps = ['Business & Tier', 'Lead Sources', 'Sequence', 'Review & Launch'];

  const selectTier = (i) => {
    setTier(i);
    setSeqSteps(TIERS[i].sequence);
  };

  const addSeqStep = () => setSeqSteps(s => [...s, {
    type:'email', icon:'📧', day:(s[s.length-1]?.day||0)+2, label:'Follow-up Email', desc:'Follow-up message'
  }]);
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
      setPreviewEmail({ subject: 'Preview unavailable', body: e.message });
      setPreviewDone(true);
    } finally {
      setPreviewing(false);
    }
  };

  const doCreate = async () => {
    const selBizData = businesses.find(b => b.id === bizSel);
    const config = {
      sources,
      google_maps: sources.google_maps ? { keyword, city: gmCity, radius } : null,
      apollo: sources.apollo ? { tags, seniority, city: apolloCity } : null,
      region, fromName, fromEmail, recycleLeads,
      // keep legacy leadSource for scraper compat
      leadSource: sources.google_maps ? 'google_maps' : sources.apollo ? 'apollo' : 'manual',
      keyword, city: gmCity, tags, seniority,
    };

    let newCampaign;
    try {
      newCampaign = await addCampaign({
        bizId:    bizSel,
        bizName:  selBizData?.name || 'Unknown',
        name:     campaignName || `${selBizData?.name || 'Campaign'} Q${Math.floor(Math.random()*4)+1}`,
        status:   'awaiting_approval',
        color:    selBizData?.color || 'blue',
        leads:    0,
        total:    tierDef.leads,
        hot:      0,
        spend:    'RM 0',
        open:     '0%',
        wa:       '-',
        tier:     tierDef.name,
        sequence: seqSteps,
        config,
        driveSync,
      });
    } catch (e) {
      showToast(`Failed to save campaign: ${e.message}`, 'red');
      return;
    }

    setCreated(true);

    // Auto-scrape all enabled sources
    if (!newCampaign?.id) return;
    const toScrape = [];
    if (sources.google_maps && keyword) toScrape.push('google_maps');
    if (sources.apollo) toScrape.push('apollo');
    if (!toScrape.length) return;

    setScraping(true);
    for (const src of toScrape) {
      setScrapeLog(l => [...l, { src, status: 'running' }]);
      try {
        const endpoint = src === 'google_maps' ? '/scraper/google-maps' : '/scraper/apollo';
        const body = src === 'google_maps'
          ? { campaignId: newCampaign.id, keyword, city: gmCity, radius, limit: tierDef.leads }
          : { campaignId: newCampaign.id, jobTitles: tags, seniority, city: apolloCity, limit: tierDef.leads };
        const result = await apiFetch(endpoint, { method: 'POST', body });
        setScrapeLog(l => l.map(x => x.src === src ? { ...x, status:'done', count: result.count } : x));
      } catch (e) {
        setScrapeLog(l => l.map(x => x.src === src ? { ...x, status:'error', error: e.message } : x));
      }
    }
    setScraping(false);
  };

  // ── Success screen ──
  if (created) return (
    <div className="success-overlay">
      <svg className="check-svg" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="24" stroke="var(--green)" strokeWidth="2" fill="none" className="check-circle"/>
        <path d="M18 30l8 8 16-16" stroke="var(--green)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="check-mark"/>
      </svg>
      <div style={{fontWeight:600,fontSize:18,color:'var(--text)'}}>Campaign Created!</div>

      {(scraping || scrapeLog.length > 0) && (
        <div style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:8,padding:'12px 20px',minWidth:280}}>
          <div style={{fontSize:12,fontWeight:600,marginBottom:8,color:'var(--muted)'}}>IMPORTING LEADS</div>
          {scrapeLog.map(entry => (
            <div key={entry.src} style={{display:'flex',alignItems:'center',gap:10,marginBottom:6,fontSize:13}}>
              <span>{entry.src === 'google_maps' ? '📍' : '🔭'}</span>
              <span style={{flex:1}}>{entry.src === 'google_maps' ? 'Google Maps' : 'Apollo'}</span>
              {entry.status === 'running' && <span style={{animation:'spin 1s linear infinite',display:'inline-block',color:'var(--blue)'}}>◌</span>}
              {entry.status === 'done' && <span style={{color:'var(--green)',fontWeight:600}}>✓ {entry.count} leads</span>}
              {entry.status === 'error' && <span style={{color:'var(--red)',fontSize:11}}>{entry.error}</span>}
            </div>
          ))}
          {scraping && <div style={{fontSize:11,color:'var(--muted)',marginTop:6}}>This may take 30–90 seconds…</div>}
        </div>
      )}

      {!scraping && (
        <>
          <div style={{color:'var(--muted)',fontSize:13,textAlign:'center'}}>
            Awaiting approval — go to <strong>Approvals</strong> to activate.
          </div>
          <div style={{display:'flex',gap:10}}>
            <button className="btn btn-green" onClick={() => setPage('approval')}>Go to Approvals →</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage('leads')}>View Leads</button>
          </div>
        </>
      )}
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

      {/* Step bar */}
      <div className="steps-bar fade-up-1" style={{maxWidth:700,marginBottom:28}}>
        {steps.map((s,i) => (
          <div key={i} style={{display:'flex',alignItems:'center',flex:1}}>
            <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
              <div className={`step-dot ${i<step?'done':i===step?'active':''}`}>{i<step?'✓':i+1}</div>
              <div style={{fontSize:12,fontWeight:i===step?600:400,color:i===step?'var(--text)':i<step?'var(--green)':'var(--muted)'}}>{s}</div>
            </div>
            {i<steps.length-1 && <div className={`step-line${i<step?' done':''}`} style={{flex:1,margin:'0 8px'}}/>}
          </div>
        ))}
      </div>

      <div className="card fade-up-2" style={{maxWidth:860}}>

        {/* ── Step 0: Business & Tier ── */}
        {step===0 && (
          <div className="flex-col gap-5">
            <div>
              <div style={{fontWeight:600,marginBottom:12}}>Select Business</div>
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
                  <div style={{color:'var(--muted)',fontSize:13}}>No approved businesses yet — add a business first.</div>
                )}
              </div>
              {selBiz && (
                <div style={{background:'var(--green-dim)',border:'1px solid var(--green)',borderRadius:8,padding:'8px 14px',display:'flex',alignItems:'center',gap:8,marginTop:10}}>
                  <span style={{color:'var(--green)'}}>✓</span>
                  <span style={{fontSize:13,color:'var(--green)'}}>AI Brief loaded for <strong>{selBiz.name}</strong></span>
                </div>
              )}
            </div>

            <div className="grid-2">
              <div><label className="label">Campaign Name</label><input className="input" placeholder="e.g. Kuching Q3 Push" value={campaignName} onChange={e=>setCampaignName(e.target.value)}/></div>
              <div><label className="label">Target Region</label><input className="input" placeholder="e.g. Kuching, Samarahan" value={region} onChange={e=>setRegion(e.target.value)}/></div>
            </div>

            {/* Tier cards with real value */}
            <div>
              <label className="label">Campaign Package</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
                {TIERS.map((t,i) => (
                  <div key={t.name}
                    onClick={() => selectTier(i)}
                    style={{
                      border: `2px solid ${tier===i ? `var(--${t.color === 'muted' ? 'border' : t.color})` : 'var(--border)'}`,
                      borderRadius:10, padding:'14px 16px', cursor:'pointer',
                      background: tier===i ? (t.color === 'muted' ? 'var(--s2)' : `oklch(from var(--${t.color}) l c h / 0.08)`) : 'var(--s1)',
                      transition:'all 0.15s',
                    }}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                      <span style={{fontWeight:700,fontSize:14,color: t.color === 'muted' ? 'var(--text)' : `var(--${t.color})`}}>{t.name}</span>
                      {tier===i && <span style={{fontSize:10,color: t.color === 'muted' ? 'var(--muted)' : `var(--${t.color})`,fontWeight:600}}>SELECTED</span>}
                    </div>
                    <div style={{fontSize:22,fontWeight:700,marginBottom:2}}>{t.leads.toLocaleString()}</div>
                    <div style={{fontSize:11,color:'var(--muted)',marginBottom:10}}>leads · {t.tagline}</div>
                    <div style={{borderTop:'1px solid var(--border)',paddingTop:10}}>
                      {t.features.map(f => (
                        <div key={f} style={{fontSize:11,color:'var(--text)',marginBottom:3,display:'flex',gap:6,alignItems:'flex-start'}}>
                          <span style={{color:'var(--green)',flexShrink:0}}>✓</span>{f}
                        </div>
                      ))}
                    </div>
                    <div style={{marginTop:10,display:'flex',gap:6,flexWrap:'wrap'}}>
                      {t.channels.map(ch => (
                        <span key={ch} style={{fontSize:10,background:`oklch(from var(--${ch==='email'?'green':ch==='wa'?'blue':'purple'}) l c h / 0.15)`,color:`var(--${ch==='email'?'green':ch==='wa'?'blue':'purple'})`,borderRadius:4,padding:'2px 6px',fontWeight:500}}>
                          {CHANNEL_ICONS[ch]} {CHANNEL_LABELS[ch]}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 1: Lead Sources ── */}
        {step===1 && (
          <div className="flex-col gap-5">
            <div>
              <div style={{fontWeight:600,marginBottom:4}}>Lead Sources</div>
              <div style={{fontSize:12,color:'var(--muted)',marginBottom:14}}>
                Enable multiple sources for a complete lead profile — Google Maps gets the phone number, Apollo gets the decision maker's email.
              </div>

              {/* Google Maps toggle card */}
              <div style={{border:`2px solid ${sources.google_maps?'var(--green)':'var(--border)'}`,borderRadius:10,padding:'14px 16px',marginBottom:12,cursor:'pointer',transition:'all 0.15s'}}
                onClick={() => toggleSource('google_maps')}>
                <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                  <input type="checkbox" checked={sources.google_maps} onChange={() => toggleSource('google_maps')} style={{accentColor:'var(--green)',marginTop:3}} onClick={e=>e.stopPropagation()}/>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <span style={{fontSize:16}}>📍</span>
                      <span style={{fontWeight:600,fontSize:13}}>Google Maps</span>
                      <span style={{fontSize:10,background:'var(--green-dim)',color:'var(--green)',borderRadius:4,padding:'2px 6px',fontWeight:600}}>PHONE / WHATSAPP</span>
                    </div>
                    <div style={{fontSize:12,color:'var(--muted)',marginBottom: sources.google_maps ? 12 : 0}}>
                      Scrapes local Malaysian businesses — gets business name, phone, WhatsApp number, address, website.
                    </div>
                    {sources.google_maps && (
                      <div className="flex-col gap-3" onClick={e=>e.stopPropagation()}>
                        <div>
                          <label className="label">Business Keyword</label>
                          <input className="input" placeholder="e.g. landscaping company, IT services, property developer" value={keyword} onChange={e=>setKeyword(e.target.value)}/>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                          <div>
                            <label className="label">City</label>
                            <input className="input" value={gmCity} onChange={e=>setGmCity(e.target.value)} placeholder="e.g. Kuching"/>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="label" style={{marginBottom:0}}>Radius</label>
                              <span className="mono text-blue" style={{fontSize:12}}>{radius} km</span>
                            </div>
                            <input type="range" min="10" max="200" step="10" value={radius} onChange={e=>setRadius(+e.target.value)} style={{width:'100%',accentColor:'var(--green)'}}/>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Apollo toggle card */}
              <div style={{border:`2px solid ${sources.apollo?'var(--blue)':'var(--border)'}`,borderRadius:10,padding:'14px 16px',marginBottom:12,cursor:'pointer',transition:'all 0.15s'}}
                onClick={() => toggleSource('apollo')}>
                <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                  <input type="checkbox" checked={sources.apollo} onChange={() => toggleSource('apollo')} style={{accentColor:'var(--blue)',marginTop:3}} onClick={e=>e.stopPropagation()}/>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <span style={{fontSize:16}}>🔭</span>
                      <span style={{fontWeight:600,fontSize:13}}>Apollo.io</span>
                      <span style={{fontSize:10,background:'var(--blue-dim)',color:'var(--blue)',borderRadius:4,padding:'2px 6px',fontWeight:600}}>DECISION MAKER EMAIL</span>
                    </div>
                    <div style={{fontSize:12,color:'var(--muted)',marginBottom: sources.apollo ? 12 : 0}}>
                      Finds the actual decision maker inside the company — name, title, work email, LinkedIn.
                    </div>
                    {sources.apollo && (
                      <div className="flex-col gap-3" onClick={e=>e.stopPropagation()}>
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
                          <label className="label">Seniority</label>
                          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                            {['C-Level','VP','Director','Manager','Owner'].map(s => (
                              <label key={s} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12}}>
                                <input type="checkbox" checked={seniority.includes(s)} style={{accentColor:'var(--blue)'}}
                                  onChange={e => setSeniority(prev => e.target.checked ? [...prev,s] : prev.filter(x=>x!==s))}/>
                                {s}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="label">City</label>
                          <input className="input" value={apolloCity} onChange={e=>setApolloCity(e.target.value)} placeholder="e.g. Kuching"/>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Manual CSV */}
              <div style={{border:'1px solid var(--border)',borderRadius:10,padding:'12px 16px',color:'var(--muted)',fontSize:12,display:'flex',gap:10,alignItems:'center'}}>
                <span>📋</span>
                <span><strong style={{color:'var(--text)'}}>Manual / CSV</strong> — You can always import a CSV file from Lead Manager after launching.</span>
              </div>
            </div>

            {/* Combined capability summary */}
            {(sources.google_maps || sources.apollo) && (
              <div style={{background:'var(--s2)',borderRadius:8,padding:'12px 16px',fontSize:12}}>
                <div style={{fontWeight:600,marginBottom:8,color:'var(--text)'}}>What you'll get per lead:</div>
                <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
                  {sources.google_maps && (
                    <div>
                      <div style={{color:'var(--green)',fontWeight:600,marginBottom:4}}>📍 From Google Maps</div>
                      {['Business name','Phone / WhatsApp','Address','Website'].map(f=><div key={f}>· {f}</div>)}
                    </div>
                  )}
                  {sources.apollo && (
                    <div>
                      <div style={{color:'var(--blue)',fontWeight:600,marginBottom:4}}>🔭 From Apollo</div>
                      {['Decision maker name','Job title','Work email','LinkedIn URL'].map(f=><div key={f}>· {f}</div>)}
                    </div>
                  )}
                </div>
                <div style={{marginTop:10,padding:'8px 10px',background:'var(--s1)',borderRadius:6,color:'var(--text)'}}>
                  <strong>Combined:</strong> WhatsApp the business number + Email the decision maker directly
                </div>
              </div>
            )}

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
            <div>
              <div style={{fontWeight:600,marginBottom:4}}>Outreach Sequence</div>
              <div style={{fontSize:12,color:'var(--muted)'}}>
                Set to <strong style={{color:`var(--${tierDef.color==='muted'?'text':tierDef.color})`}}>{tierDef.name}</strong> — {tierDef.tagline}. This is what happens to each lead after import.
              </div>
            </div>

            <div className="grid-2">
              <div><label className="label">From Name</label><input className="input" value={fromName} onChange={e=>setFromName(e.target.value)} placeholder="Your name"/></div>
              <div><label className="label">From Email</label><input className="input" value={fromEmail} onChange={e=>setFromEmail(e.target.value)} placeholder="your@email.com"/></div>
            </div>

            {/* Sequence timeline */}
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
                            <input type="number" value={s.day} min={1} max={30} onChange={e=>updateStepDay(i,+e.target.value)}
                              style={{width:44,fontFamily:'var(--font-mono)',fontSize:11,background:'var(--s2)',border:'1px solid var(--border)',borderRadius:4,color:'var(--text)',padding:'2px 6px'}}/>
                            <span style={{fontSize:11,color:'var(--muted)'}}>days after previous</span>
                          </>
                        )}
                        {i===0 && <span style={{fontSize:11,color:'var(--muted)'}}>Sent immediately after import</span>}
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
                          Skip if lead already replied
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {tier >= 1 && <button className="btn btn-ghost btn-xs mt-2" onClick={addSeqStep}>＋ Add Step</button>}
            </div>

            {/* Locked channels note for Starter */}
            {tier === 0 && (
              <div style={{background:'var(--s2)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'var(--muted)',display:'flex',gap:8,alignItems:'center'}}>
                <span>🔒</span>
                <span>WhatsApp and Voice Call steps are available on <strong>Growth</strong> and <strong>Enterprise</strong> packages.</span>
              </div>
            )}
            {tier === 1 && (
              <div style={{background:'var(--s2)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'var(--muted)',display:'flex',gap:8,alignItems:'center'}}>
                <span>🔒</span>
                <span>AI Voice Call is available on <strong>Enterprise</strong> package.</span>
              </div>
            )}

            <label style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--s2)',borderRadius:8,cursor:'pointer',fontSize:13}}>
              <input type="checkbox" checked={recycleLeads} onChange={e=>setRecycleLeads(e.target.checked)} style={{accentColor:'var(--blue)'}}/>
              <div>
                <div style={{fontWeight:500}}>Recycle leads after sequence ends</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>Re-engage leads with a fresh round after the sequence completes</div>
              </div>
            </label>
          </div>
        )}

        {/* ── Step 3: Review & Launch ── */}
        {step===3 && (
          <div className="flex-col gap-5">
            {/* Campaign summary */}
            <div style={{background:'var(--s2)',borderRadius:10,padding:'16px 18px'}}>
              <div style={{fontWeight:600,marginBottom:14,fontSize:13}}>Campaign Summary</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,fontSize:12}}>
                <div><span style={{color:'var(--muted)'}}>Business: </span><strong>{selBiz?.name || '—'}</strong></div>
                <div><span style={{color:'var(--muted)'}}>Package: </span><strong>{tierDef.name} · {tierDef.leads.toLocaleString()} leads</strong></div>
                <div><span style={{color:'var(--muted)'}}>Lead sources: </span><strong>{[sources.google_maps&&'Google Maps',sources.apollo&&'Apollo'].filter(Boolean).join(' + ') || 'Manual'}</strong></div>
                <div><span style={{color:'var(--muted)'}}>Channels: </span><strong>{tierDef.channels.map(c=>CHANNEL_LABELS[c]).join(' → ')}</strong></div>
                <div><span style={{color:'var(--muted)'}}>From: </span><strong>{fromName} &lt;{fromEmail}&gt;</strong></div>
                <div><span style={{color:'var(--muted)'}}>Sequence: </span><strong>{seqSteps.length} steps over {seqSteps[seqSteps.length-1]?.day || 0} days</strong></div>
              </div>

              <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid var(--border)'}}>
                <div style={{fontWeight:500,fontSize:12,marginBottom:8,color:'var(--muted)'}}>WHAT HAPPENS AFTER APPROVAL:</div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {sources.google_maps && keyword && (
                    <div style={{fontSize:12,display:'flex',gap:8}}>
                      <span style={{color:'var(--green)'}}>1.</span>
                      <span>Scrape up to {tierDef.leads} businesses matching <strong>"{keyword}"</strong> in {gmCity} ({radius}km radius) from Google Maps → saves phone/WhatsApp numbers</span>
                    </div>
                  )}
                  {sources.apollo && (
                    <div style={{fontSize:12,display:'flex',gap:8}}>
                      <span style={{color:'var(--blue)'}}>{sources.google_maps ? '2.' : '1.'}</span>
                      <span>Find <strong>{tags.join(', ')}</strong> contacts in {apolloCity} from Apollo → saves work emails</span>
                    </div>
                  )}
                  {seqSteps.map((s,i) => (
                    <div key={i} style={{fontSize:12,display:'flex',gap:8}}>
                      <span style={{color:'var(--text)'}}>{(sources.google_maps?1:0)+(sources.apollo?1:0)+i+1}.</span>
                      <span>{s.icon} <strong>{i===0?'Immediately':`Day ${s.day}`}</strong>: {s.desc} to each lead</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Email prompt editor */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
              <div className="flex-col gap-3">
                <div style={{fontWeight:600,fontSize:13}}>Email Prompt (AI will use this)</div>
                <textarea className="input mono" style={{minHeight:180,fontSize:11,lineHeight:1.8}} value={prompt} onChange={e=>setPrompt(e.target.value)}/>
                <div>
                  <div style={{fontSize:11,color:'var(--muted)',marginBottom:6}}>Click to insert variable:</div>
                  {['{{first_name}}','{{company}}','{{industry}}','{{title}}','{{language}}','{{location}}'].map(v => (
                    <span key={v} className="chip" style={{margin:'0 4px 4px 0',cursor:'pointer',fontSize:10}} onClick={() => setPrompt(p=>p+' '+v)}>{v}</span>
                  ))}
                </div>
              </div>
              <div className="flex-col gap-3">
                <div style={{fontWeight:600,fontSize:13}}>Preview Generated Email</div>
                <button className="btn btn-primary btn-sm" onClick={doPreview}>
                  {previewing ? <><span style={{animation:'spin 1s linear infinite',display:'inline-block'}}>◌</span> Generating…</> : '⚡ Generate Preview'}
                </button>
                {previewing && <div className="shimmer" style={{height:160,borderRadius:8}}/>}
                {previewDone && !previewing && (
                  <div style={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:8,padding:12,fontSize:12,lineHeight:1.8,maxHeight:200,overflowY:'auto'}}>
                    <div style={{fontWeight:600,marginBottom:6,color:'var(--text)'}}>Subject: {previewEmail?.subject}</div>
                    <div style={{color:'var(--muted)',whiteSpace:'pre-line'}}>{previewEmail?.body}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nav buttons */}
      <div className="flex items-center justify-between mt-4 fade-up-3" style={{maxWidth:860}}>
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
