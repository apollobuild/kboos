import { useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../services/api.js';

export function AddBusiness() {
  const { setPage, addBusiness, showToast } = useAppStore(useShallow(s => ({ setPage:s.setPage, addBusiness:s.addBusiness, showToast:s.showToast })));

  const COLORS = ['green','blue','purple','amber','cyan'];
  const COLOR_HEX = { green:'#22c55e', blue:'#3b82f6', purple:'#a855f7', amber:'#f59e0b', cyan:'#06b6d4' };

  const [form, setForm] = useState({
    name:'', industry:'', contact:'', phone:'', email:'', website:'',
    color:'blue', commissionType:'percent', commissionValue:'', avgDealValue:'',
  });
  const [generatedContent, setGeneratedContent] = useState(null);
  const [brief, setBrief] = useState({ service:'', audience:'', usps:'', tone:'professional', lang:'EN', locations:['Kuching','Kota Samarahan'] });
  const [tagInput, setTagInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [editMode, setEditMode] = useState({});
  const [editContent, setEditContent] = useState({});
  const [approved, setApproved] = useState(false);
  const [flashGreen, setFlashGreen] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const result = await apiFetch('/ai/generate-brief', {
        method: 'POST',
        body: {
          name: form.name,
          industry: form.industry || 'General',
          website: form.website || '',
          service: brief.service,
          audience: brief.audience,
          usps: brief.usps,
          tone: brief.tone,
          lang: brief.lang,
        }
      });
      setGeneratedContent(result);
      setGenerated(true);
    } catch (e) {
      const msg = e.message || '';
      const isNoKey = msg.toLowerCase().includes('not configured') || msg.toLowerCase().includes('api key');
      showToast(isNoKey ? 'Claude API key not configured — go to Settings → API Keys' : `Generation failed: ${msg}`, 'red');
    } finally {
      setGenerating(false);
    }
  };

  const approve = async () => {
    if (!form.name) { showToast('Please enter a business name first.', 'red'); return; }
    setFlashGreen(true);
    await new Promise(r => setTimeout(r, 400));
    setApproved(true);
    try {
      const colors = ['green','blue','purple','amber','cyan'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const slug = form.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
      const id = slug + Math.random().toString(36).slice(2, 6);
      // Merge any edits into the generated content before saving
      const finalContent = generatedContent ? {
        email:   editContent.email   ?? (generatedContent.email   ? str(generatedContent.email)   : null),
        whatsapp:editContent.wa      ?? (generatedContent.whatsapp? str(generatedContent.whatsapp): null),
        voice:   editContent.voice   ?? (generatedContent.voice   ? str(generatedContent.voice)   : null),
        scoring: editContent.scoring ?? (generatedContent.scoring ? str(generatedContent.scoring) : null),
      } : null;
      await addBusiness({
        id, name:form.name, industry:form.industry||'General', color: form.color,
        contact: form.contact||'', phone: form.phone||'',
        email: form.email||'', website: form.website||'',
        commissionType: form.commissionType||'percent',
        commissionValue: form.commissionValue||'',
        avgDealValue: Number(form.avgDealValue)||0,
        campaigns:0, leads:0, hot:0, spend:'RM 0',
        brief: generated ? 'approved' : 'none',
        briefContent: finalContent,
      });
      setTimeout(() => setPage('businesses'), 500);
    } catch (e) {
      showToast(`Failed to save business: ${e.message}`, 'red');
      setApproved(false);
      setFlashGreen(false);
    }
  };

  const str = (v) => {
    if (!v) return null;
    if (typeof v === 'string') return v;
    if (typeof v === 'object') return Object.entries(v).map(([k, val]) => `${k.toUpperCase()}:\n${val}`).join('\n\n');
    return String(v);
  };

  const panels = [
    { key:'email', icon:'📧', color:'green', label:'Email Prompt', content: str(generatedContent?.email) || `You are a B2B outreach specialist for ${form.name||'{{business_name}}'}.\nSubject: Transform Your Facility's Outdoor Spaces\n\nHi {{first_name}},\n\nI noticed {{company}} manages significant commercial property in Kuching...\n\nAt ${form.name||'{{business_name}}'}, we specialize in ${form.industry||'our industry'} for businesses across Kuching.\n\nWould you be open to a 15-minute assessment this week?\n\nBest,\n{{sender_name}}` },
    { key:'wa', icon:'💬', color:'purple', label:'WhatsApp Template', content: str(generatedContent?.whatsapp) || `Hi {{name}}, saya dari ${form.name||'kami'} — kami bantu {{company}} dalam perkhidmatan ${form.industry||'kami'}. Boleh saya hantar info lebih lanjut? 🌿` },
    { key:'voice', icon:'📞', color:'blue', label:'Voice Script', content: str(generatedContent?.voice) || `OPENER: Hi, may I speak with {{name}}?\nPITCH: We help facilities like {{company}} with ${form.industry||'our services'}...\nOBJECTION: I understand — many clients felt the same before seeing results...\nCLOSE: Can I schedule a quick 10-min site assessment this week?` },
    { key:'scoring', icon:'📊', color:'amber', label:'Lead Scoring Rules', content: str(generatedContent?.scoring) || `Title match (Facilities/Property/GM): +3\nCompany type (GLC/Bank/Hotel): +2\nLocation (Kuching/Sarawak): +2\nReplied (any channel): +2\nLinkedIn profile found: +1` },
  ];

  return (
    <div className="page">
      <div className="flex items-center gap-3 mb-4 fade-up">
        <button className="btn btn-ghost btn-sm" onClick={() => setPage('businesses')}>← Back</button>
        <div>
          <div className="breadcrumb">Businesses / <span>Add Business</span></div>
          <h1 className="page-title" style={{marginTop:2}}>Add Business + AI Brief</h1>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,alignItems:'start'}}>
        {/* Left: Form */}
        <div className="flex-col gap-4 fade-up-1">
          <div className="card">
            <div style={{fontWeight:600,marginBottom:16,fontSize:13}}>Business Details</div>
            <div className="flex-col gap-3">
              {/* Name + Color on same row */}
              <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:12,alignItems:'end'}}>
                <div>
                  <label className="label">Business Name</label>
                  <input className="input" placeholder="e.g. Gadong Squad Landscaping" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
                </div>
                <div>
                  <label className="label">Colour</label>
                  <div style={{display:'flex',gap:6,paddingBottom:2}}>
                    {COLORS.map(c => (
                      <div key={c} onClick={() => setForm(p=>({...p,color:c}))}
                        style={{width:28,height:28,borderRadius:'50%',background:COLOR_HEX[c],cursor:'pointer',
                          outline: form.color===c ? `3px solid ${COLOR_HEX[c]}` : '3px solid transparent',
                          outlineOffset:2,transition:'outline 0.15s'}}/>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="label">Industry</label>
                <input className="input" placeholder="e.g. Landscaping, IT, Healthcare" value={form.industry} onChange={e=>setForm(p=>({...p,industry:e.target.value}))}/>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div>
                  <label className="label">Contact Person</label>
                  <input className="input" placeholder="e.g. Ali Hassan" value={form.contact} onChange={e=>setForm(p=>({...p,contact:e.target.value}))}/>
                </div>
                <div>
                  <label className="label">Phone / WhatsApp</label>
                  <input className="input" placeholder="+60 12-345 6789" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div>
                  <label className="label">Business Email</label>
                  <input className="input" type="email" placeholder="contact@business.com" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}/>
                </div>
                <div>
                  <label className="label">Website</label>
                  <input className="input" placeholder="https://gadong.my" value={form.website} onChange={e=>setForm(p=>({...p,website:e.target.value}))}/>
                </div>
              </div>

              {/* Commission + Deal Value */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div>
                  <label className="label">Commission Structure</label>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                    <select className="input" value={form.commissionType} onChange={e=>setForm(p=>({...p,commissionType:e.target.value}))}>
                      <option value="percent">% per sale</option>
                      <option value="flat_lead">Flat / lead</option>
                      <option value="flat_sale">Flat / sale</option>
                      <option value="retainer">Retainer</option>
                    </select>
                    <div style={{position:'relative'}}>
                      <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--muted)',fontSize:12,pointerEvents:'none'}}>
                        {form.commissionType==='percent' ? '%' : 'RM'}
                      </span>
                      <input className="input" style={{paddingLeft:28}}
                        placeholder={form.commissionType==='percent' ? '10' : '500'}
                        value={form.commissionValue}
                        onChange={e=>setForm(p=>({...p,commissionValue:e.target.value}))}/>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="label">Avg Deal Value (RM)</label>
                  <div style={{position:'relative'}}>
                    <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--muted)',fontSize:12,pointerEvents:'none'}}>RM</span>
                    <input className="input" style={{paddingLeft:30}} type="number" placeholder="5000"
                      value={form.avgDealValue} onChange={e=>setForm(p=>({...p,avgDealValue:e.target.value}))}/>
                  </div>
                  <div style={{fontSize:10,color:'var(--muted)',marginTop:3}}>Used to estimate pipeline value in client portal</div>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div style={{fontWeight:600,marginBottom:16,fontSize:13}}>AI Brief Configuration</div>
            <div className="flex-col gap-3">
              <div>
                <label className="label">Service Description</label>
                <textarea className="input" placeholder="What does this business do?" style={{minHeight:80}} value={brief.service} onChange={e=>setBrief(p=>({...p,service:e.target.value}))}/>
              </div>
              <div>
                <label className="label">Target Audience</label>
                <textarea className="input" placeholder="Who are the ideal customers? Job titles, company types..." style={{minHeight:60}} value={brief.audience} onChange={e=>setBrief(p=>({...p,audience:e.target.value}))}/>
              </div>
              <div>
                <label className="label">Key USPs</label>
                <textarea className="input" placeholder="3–5 key differentiators..." style={{minHeight:60}} value={brief.usps} onChange={e=>setBrief(p=>({...p,usps:e.target.value}))}/>
              </div>
              <div>
                <label className="label">Tone of Voice</label>
                <div style={{display:'flex',gap:8}}>
                  {['professional','friendly','direct','consultative'].map(t => (
                    <div key={t} className={`radio-card${brief.tone===t?' selected':''}`} onClick={() => setBrief(p=>({...p,tone:t}))}>
                      <div className="radio-card-title">{t.charAt(0).toUpperCase()+t.slice(1)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Primary Language</label>
                <div style={{display:'flex',gap:8}}>
                  {['EN','BM','EN+BM'].map(l => (
                    <div key={l} className={`radio-card${brief.lang===l?' selected':''}`} style={{flex:'none',padding:'8px 16px'}} onClick={() => setBrief(p=>({...p,lang:l}))}>
                      <div className="radio-card-title mono">{l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Target Locations</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
                  {brief.locations.map(t => (
                    <span key={t} className="chip">{t}<button onClick={() => setBrief(p=>({...p,locations:p.locations.filter(x=>x!==t)}))}>×</button></span>
                  ))}
                </div>
                <input className="input" placeholder="Type location + Enter" value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if(e.key==='Enter'&&tagInput.trim()) { setBrief(p=>({...p,locations:[...p.locations,tagInput.trim()]})); setTagInput(''); }}}
                />
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:16}}>
              <button className="btn btn-green btn-full" onClick={generate} disabled={generating}>
                {generating ? <><span style={{animation:'spin 1s linear infinite',display:'inline-block'}}>◌</span> Generating...</> : '⚡ Generate All Outreach Assets'}
              </button>
              {!generated && (
                <button className="btn btn-ghost" style={{flexShrink:0}} onClick={approve} disabled={approved || !form.name}>
                  Skip →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Generated panels */}
        <div className="fade-up-2">
          {!generating && !generated && (
            <div style={{border:'2px dashed var(--border)',borderRadius:12,padding:40,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,minHeight:400,color:'var(--muted)',fontSize:13}}>
              <div style={{fontSize:32}}>⚡</div>
              <div style={{fontWeight:500,color:'var(--text)'}}>AI Brief Engine</div>
              <div style={{textAlign:'center',maxWidth:260}}>Fill in the details and click Generate to create email, WhatsApp, voice, and scoring assets.</div>
            </div>
          )}
          {generating && (
            <div className="flex-col gap-3">
              {[220,160,180,140].map((h,i) => <div key={i} className="card shimmer" style={{height:h}}/>)}
            </div>
          )}
          {generated && !generating && (
            <div className="flex-col gap-3">
              {panels.map(panel => (
                <div key={panel.key} className="card slide-in-right" style={{borderLeft:`3px solid var(--${panel.color})`,background:flashGreen?'var(--green-dim)':'var(--s1)'}}>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{fontSize:12,fontWeight:600,color:`var(--${panel.color})`}}>{panel.icon} {panel.label}</span>
                    <div style={{display:'flex',gap:6}}>
                      {approved && <span style={{color:'var(--green)',fontSize:12}}>✓ Approved</span>}
                      {!approved && (
                        <button className="btn btn-ghost btn-xs" onClick={() => setEditMode(m=>({...m,[panel.key]:!m[panel.key]}))}>
                          {editMode[panel.key] ? 'Done' : '✏ Edit'}
                        </button>
                      )}
                    </div>
                  </div>
                  {editMode[panel.key] ? (
                    <textarea className="input mono" style={{fontSize:11,lineHeight:1.7,minHeight:100}}
                      value={editContent[panel.key] ?? panel.content}
                      onChange={e => setEditContent(c=>({...c,[panel.key]:e.target.value}))}
                    />
                  ) : (
                    <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--muted)',lineHeight:1.7,maxHeight:120,overflowY:'auto',whiteSpace:'pre-line'}}>
                      {editContent[panel.key] ?? panel.content}
                    </div>
                  )}
                </div>
              ))}
              {!approved && (
                <button className="btn btn-green btn-full" onClick={approve}>✓ Approve & Save Business</button>
              )}
              {approved && (
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:12,background:'var(--green-dim)',borderRadius:8,border:'1px solid var(--green)'}}>
                  <span style={{color:'var(--green)',fontWeight:600}}>✓ Business Saved — Redirecting...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
