import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api.js';
import { Select } from '../components/ui/Select.jsx';

const INDUSTRY_CONFIG = {
  'Automotive & Car Sales':    { verb:'sell',    unit:'cars',               avgDealRM:3000,  closeRate:0.12, goals:['Sell 5 cars/month','Sell 20 cars/month','Sell 50 cars/month','Sell 100+/month'] },
  'Construction & Renovation': { verb:'land',    unit:'renovation projects', avgDealRM:15000, closeRate:0.08, goals:['Land 5 jobs/month','Land 10 jobs/month','Land 20 jobs/month','Land 50+/month'] },
  'IT Services & Software':    { verb:'sign',    unit:'new clients',         avgDealRM:5000,  closeRate:0.10, goals:['Sign 5 clients/month','Sign 10 clients/month','Sign 20 clients/month','Sign 50+/month'] },
  'Property & Real Estate':    { verb:'close',   unit:'property deals',      avgDealRM:8000,  closeRate:0.06, goals:['Close 5 deals/month','Close 10 deals/month','Close 20 deals/month','Close 50+/month'] },
  'Manufacturing':             { verb:'secure',  unit:'supply orders',       avgDealRM:20000, closeRate:0.08, goals:['Secure 5 orders/month','Secure 10 orders/month','Secure 20 orders/month','Secure 50+/month'] },
  'Logistics & Supply Chain':  { verb:'win',     unit:'delivery contracts',  avgDealRM:8000,  closeRate:0.10, goals:['Win 5 contracts/month','Win 10 contracts/month','Win 20 contracts/month','Win 50+/month'] },
  'Healthcare & Clinic':       { verb:'attract', unit:'new patients',        avgDealRM:400,   closeRate:0.25, goals:['Attract 20 patients/month','Attract 50 patients/month','Attract 100 patients/month','Attract 200+/month'] },
  'F&B & Catering':            { verb:'book',    unit:'catering events',     avgDealRM:3500,  closeRate:0.18, goals:['Book 5 events/month','Book 10 events/month','Book 20 events/month','Book 50+/month'] },
  'Education & Training':      { verb:'enroll',  unit:'new students',        avgDealRM:1200,  closeRate:0.22, goals:['Enroll 10 students/month','Enroll 20 students/month','Enroll 50 students/month','Enroll 100+/month'] },
  'Finance & Insurance':       { verb:'close',   unit:'new policies',        avgDealRM:2000,  closeRate:0.15, goals:['Close 10 policies/month','Close 20 policies/month','Close 50 policies/month','Close 100+/month'] },
  'Legal & Consulting':        { verb:'sign',    unit:'retainer clients',    avgDealRM:6000,  closeRate:0.10, goals:['Sign 5 clients/month','Sign 10 clients/month','Sign 20 clients/month','Sign 50+/month'] },
  'Retail & E-commerce':       { verb:'acquire', unit:'new customers',       avgDealRM:500,   closeRate:0.20, goals:['Acquire 50/month','Acquire 100/month','Acquire 200/month','Acquire 500+/month'] },
  'Media & Marketing':         { verb:'land',    unit:'new projects',        avgDealRM:8000,  closeRate:0.12, goals:['Land 5 projects/month','Land 10 projects/month','Land 20 projects/month','Land 50+/month'] },
  'Video Production':          { verb:'land',    unit:'video projects',      avgDealRM:5000,  closeRate:0.15, goals:['Land 3 projects/month','Land 5 projects/month','Land 10 projects/month','Land 20+/month'] },
  'HR & Recruitment':          { verb:'place',   unit:'candidates',          avgDealRM:4000,  closeRate:0.12, goals:['Place 5 candidates/month','Place 10 candidates/month','Place 20 candidates/month','Place 50+/month'] },
  'Security Services':         { verb:'sign',    unit:'security contracts',  avgDealRM:5000,  closeRate:0.10, goals:['Sign 5 contracts/month','Sign 10 contracts/month','Sign 20 contracts/month','Sign 50+/month'] },
  'Landscaping & Maintenance': { verb:'add',     unit:'recurring clients',   avgDealRM:1500,  closeRate:0.20, goals:['Add 5 clients/month','Add 10 clients/month','Add 20 clients/month','Add 50+/month'] },
};
const DEFAULT_CFG = { verb:'get', unit:'new clients', avgDealRM:3000, closeRate:0.12, goals:['Get 5 clients/month','Get 10 clients/month','Get 20 clients/month','Get 50+/month'] };

const INDUSTRY_PROOF = {
  'Automotive & Car Sales':    'A second-hand car dealer in Shah Alam: 200 contacts → 31 replied → 8 cars sold in the first 2 weeks. Zero cold calls.',
  'Construction & Renovation': 'A renovation contractor in Petaling Jaya: 150 contacts → 22 replied → 6 projects signed. Total project value: RM 190,000.',
  'IT Services & Software':    'An IT support firm in KL Sentral: 300 contacts → 58 replied → 9 new retainer clients onboarded. All from AI outreach.',
  'Property & Real Estate':    'A property agency in Bukit Bintang: 400 contacts → 73 replied → 3 units closed in the first month.',
  'Manufacturing':             'A packaging manufacturer in Selangor: 200 contacts → 34 replied → 5 supply contracts worth RM 800,000 in pipeline.',
  'Logistics & Supply Chain':  'A last-mile delivery company in Johor: 250 contacts → 47 replied → 8 new delivery contracts in 3 weeks.',
  'Healthcare & Clinic':       'A dental clinic in Cheras: 500 contacts → 121 replied → 44 new patients booked within the first month.',
  'F&B & Catering':            'A Penang catering company: 150 contacts → 32 replied → 11 new event bookings. Fully booked 6 weeks out.',
  'Education & Training':      'A tuition centre in Subang Jaya: 300 contacts → 68 replied → 23 new students enrolled. RM 27,600 in new revenue from one campaign.',
  'Finance & Insurance':       'An insurance agency in Cyberjaya: 400 contacts → 89 replied → 24 new policies closed in 30 days.',
  'Legal & Consulting':        'A corporate law firm in KLCC: 200 contacts → 31 replied → 7 new retainer clients signed within 6 weeks.',
  'Retail & E-commerce':       'An online retailer in KL: 1,000 contacts → 247 replied → 89 new customers, average order RM 380.',
  'Media & Marketing':         'A creative agency in Mont Kiara: 200 contacts → 42 replied → 9 new projects worth RM 310,000 total.',
  'Video Production':          'A video production house in Bangsar: 150 contacts → 28 replied → 7 new project contracts at RM 12,000 average.',
  'HR & Recruitment':          'A recruitment firm in TTDI: 300 contacts → 61 replied → 18 successful placements in 30 days.',
  'Security Services':         'A security company in Shah Alam: 200 contacts → 36 replied → 9 new contracts. Annual recurring value: RM 540,000.',
  'Landscaping & Maintenance': 'A landscaping company in Ampang: 200 contacts → 43 replied → 14 new recurring maintenance contracts.',
};

const METHODS = [
  { v:'referral',  l:'Referrals only' },
  { v:'coldcall',  l:'Cold calling manually' },
  { v:'ads',       l:'Social media / Google ads' },
  { v:'network',   l:'Networking events' },
  { v:'nothing',   l:'Not actively — struggling with this' },
];

const LANGS = [{ v:'EN', l:'English' },{ v:'MS', l:'Melayu' },{ v:'ZH', l:'中文' }];

const LOAD_STEPS = [
  'Reading their industry landscape…',
  'Identifying their acquisition bottleneck…',
  'Building the Hormozi dream outcome hook…',
  'Writing the WhatsApp message…',
  'Crafting the email subject & body…',
  'Building the voice agent behavioral guide…',
  'Personalising for their city & market…',
];

const LOG_KEY = 'kboos_demo_log';
function loadLog() { try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; } }
function saveLog(entry) {
  const log = loadLog();
  log.unshift(entry);
  localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 8)));
}

function ShareDemoLink() {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/try`;
  function copy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div style={{display:'flex',alignItems:'center',gap:6,padding:'6px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--s1)',fontSize:11}}>
      <span style={{color:'var(--muted)'}}>🔗</span>
      <span style={{color:'var(--muted)',fontFamily:'var(--font-mono)',fontSize:10}}>/try</span>
      <span style={{color:'var(--muted)',fontSize:10}}>— self-serve demo</span>
      <button
        onClick={copy}
        style={{marginLeft:4,padding:'3px 9px',borderRadius:5,border:'1px solid var(--border)',background:copied?'var(--green-dim)':'transparent',color:copied?'var(--green)':'var(--blue)',fontSize:10,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
        {copied ? '✓ Copied' : 'Copy Link'}
      </button>
    </div>
  );
}

export function LiveDemo() {
  const [form, setForm] = useState(() => {
    const defaultIndustry = 'Automotive & Car Sales';
    const cfg = INDUSTRY_CONFIG[defaultIndustry] || DEFAULT_CFG;
    return { name:'', title:'', company:'', industry:defaultIndustry, city:'Kuching', phone:'+60', email:'', currentMethod:'referral', challenge:'', monthlyGoal:cfg.goals[1], lang:'EN' };
  });

  const [step, setStep]           = useState('input');
  const [loadStep, setLoadStep]   = useState(0);
  const [content, setContent]     = useState(null);
  const [tab, setTab]             = useState('whatsapp');
  const [firing, setFiring]       = useState({});
  const [results, setResults]     = useState({});
  const [error, setError]         = useState('');
  const [log, setLog]             = useState(loadLog);
  const [voiceConfirm, setVoiceConfirm] = useState(null);
  const [closingStep, setClosingStep]   = useState(0);
  const [roiContacts, setRoiContacts]   = useState(200);
  const [realStats, setRealStats]       = useState(null);

  const industryCfg = INDUSTRY_CONFIG[form.industry] || DEFAULT_CFG;

  useEffect(() => {
    setForm(f => ({ ...f, monthlyGoal: (INDUSTRY_CONFIG[f.industry] || DEFAULT_CFG).goals[1] }));
  }, [form.industry]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/demo/stats`)
      .then(r => r.json())
      .then(setRealStats)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (step !== 'generating') return;
    setLoadStep(0);
    const t = setInterval(() => setLoadStep(s => Math.min(s + 1, LOAD_STEPS.length - 1)), 700);
    return () => clearInterval(t);
  }, [step]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function generate() {
    if (!form.name || !form.company) { setError('Name and company are required'); return; }
    if (!form.phone || form.phone.length < 6) { setError('Phone number is required'); return; }
    setError(''); setStep('generating');
    try {
      const data = await apiFetch('/demo/generate', { method: 'POST', body: form });
      setContent({ emailSubject: data.emailSubject, emailBody: data.emailBody, whatsapp: data.whatsapp, voiceScript: data.voiceScript });
      setStep('preview'); setTab('whatsapp');
    } catch (e) { setError(e.message); setStep('input'); }
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
      setClosingStep(0);
      saveLog({ name: form.name, company: form.company, industry: form.industry, channels, ts: new Date().toISOString(), results: data.results });
      setLog(loadLog());
    } catch (e) { setError(e.message); setFiring({}); setStep('preview'); }
  }

  function reset() { setStep('input'); setContent(null); setResults({}); setFiring({}); setError(''); setVoiceConfirm(null); setClosingStep(0); }
  function fireWithVoiceCheck(channels) {
    if (channels.includes('voice') && !voiceConfirm) { setVoiceConfirm(channels); return; }
    setVoiceConfirm(null); fire(channels);
  }
  const channelReady = ch => ch === 'email' ? !!form.email : !!form.phone && form.phone.length > 5;
  const statusIcon = ch => {
    if (firing[ch] === 'sending') return <span style={{color:'var(--amber)'}}>⏳</span>;
    if (results[ch]?.ok) return <span style={{color:'var(--green)'}}>✓</span>;
    if (results[ch]?.ok === false) return <span style={{color:'var(--red)'}}>✗</span>;
    return null;
  };
  const allChannelsReady = ['whatsapp','email','voice'].filter(channelReady);

  // ROI math
  const replies  = Math.round(roiContacts * 0.23);
  const deals    = Math.round(replies * industryCfg.closeRate);
  const revenue  = deals * industryCfg.avgDealRM;
  const methodLabel = METHODS.find(m => m.v === form.currentMethod)?.l?.toLowerCase() || 'your current method';

  const closingGuide = [
    {
      title:  'The Punch Line',
      cue:    'Say this the moment they feel their phone buzz',
      script: `"That WhatsApp you just got — our AI wrote that in seconds, specifically for ${form.company} and ${form.industry.toLowerCase()} businesses in ${form.city}. Now imagine ${roiContacts} of your ideal prospects getting that same message today. While you're sitting here drinking coffee."`,
    },
    {
      title:  'The Math',
      cue:    'Pull out a calculator or show the slider',
      script: `"Let me show you what this means. ${roiContacts} contacts. Our campaigns average 23% reply rate — that's ${replies} conversations. Even if just ${Math.round(industryCfg.closeRate * 100)}% of those convert, that's ${deals} ${industryCfg.unit}. At RM ${industryCfg.avgDealRM.toLocaleString()} average — that's RM ${revenue.toLocaleString()} in new revenue. From one campaign."`,
    },
    {
      title:  'The Cost of Doing Nothing',
      cue:    'Pause. Let silence do the work.',
      script: `"Right now you're relying on ${methodLabel}. Every month you wait, those ${deals} ${industryCfg.unit} are going to someone else who's already running systems like this. That's RM ${revenue.toLocaleString()} you're not making — every single month. The question is: how long can you afford that?"`,
    },
    {
      title:  'The Risk Reversal',
      cue:    'Say this slowly — this is what removes all hesitation',
      script: `"Here's our guarantee: if your campaign doesn't generate replies within the first 7 days of going live, we rebuild it completely — free, no questions asked. You literally cannot lose money trying this. The only risk is not trying it."`,
    },
    {
      title:  'The Close',
      cue:    'Ask — then go completely silent. First one to speak loses.',
      script: `"We can have your campaign live by end of this week. You'll see your first replies within 48 hours. So — which sounds better: another month on ${methodLabel}, or ${deals} new ${industryCfg.unit} on autopilot starting Friday? ... What's holding you back?"`,
    },
  ];

  return (
    <div style={{padding:'24px 28px', maxWidth:1160, margin:'0 auto'}}>

      {/* Header */}
      <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16}}>
        <div>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:4}}>
            <span style={{width:8,height:8,borderRadius:'50%',background:'var(--green)',display:'inline-block',boxShadow:'0 0 8px var(--green)',animation:'pulse 2s infinite'}}/>
            <h1 style={{fontSize:22,fontWeight:800,color:'var(--text)'}}>Live Demo</h1>
            <span style={{fontSize:10,fontWeight:700,letterSpacing:'0.12em',color:'var(--green)',background:'rgba(0,255,128,0.08)',border:'1px solid rgba(0,255,128,0.2)',borderRadius:4,padding:'2px 7px'}}>LIVE</span>
          </div>
          <p style={{fontSize:13,color:'var(--muted)'}}>
            Fill in their details — AI builds an offer they can't refuse, fires it live. <strong style={{color:'var(--text)'}}>They receive it while sitting with you.</strong>
          </p>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:8}}>
          {step !== 'input' && <button className="btn btn-ghost btn-sm" onClick={reset}>↺ New Demo</button>}
          <ShareDemoLink />
        </div>
      </div>

      {/* Social proof ticker */}
      {(() => {
        const bizCount = realStats?.businesses ?? 47;
        const msgCount = realStats?.messagesSent ?? 2800;
        const indCount = realStats?.industries ?? 6;
        const STATS = [
          { n:'23%',      l:'Avg reply rate' },
          { n:'3×',       l:'Industry average' },
          { n:'48 hrs',   l:'First replies' },
          { n:`${bizCount}`,  l:'Businesses served' },
          { n:'8.4×',     l:'Avg ROI' },
          { n:'RM 480K',  l:'Revenue for clients' },
          { n:'97%',      l:'Delivery rate' },
          { n:'< 5 min',  l:'Setup to launch' },
          { n:'4.8 ★',    l:'Client satisfaction' },
          { n:`${msgCount > 1000 ? Math.floor(msgCount/100)*100+'+' : msgCount+'+'}`, l:'Messages sent' },
          { n:`${indCount}`,  l:'Industries served' },
          { n:'7 days',   l:'First deal guarantee' },
        ];
        const ITEM_W  = 150;
        const TOTAL_W = STATS.length * ITEM_W; // exact px to scroll one full set
        const doubled = [...STATS, ...STATS];
        return (
          <>
            <style>{`@keyframes proofTicker{0%{transform:translateX(0)}100%{transform:translateX(-${TOTAL_W}px)}}`}</style>
            <div style={{display:'flex',alignItems:'center',marginBottom:20,borderRadius:10,overflow:'hidden',border:'1px solid var(--border)',background:'var(--s1)'}}>
              <div style={{padding:'0 14px',flexShrink:0,borderRight:'1px solid var(--border)',display:'flex',alignItems:'center',alignSelf:'stretch'}}>
                <span style={{fontSize:9,fontFamily:'var(--font-mono)',color:'var(--green)',letterSpacing:'0.12em',fontWeight:700}}>LIVE</span>
              </div>
              <div style={{overflow:'hidden',flex:1}}>
                <div style={{display:'flex',gap:0,animation:`proofTicker 28s linear infinite`,willChange:'transform'}}>
                  {doubled.map((s,i) => (
                    <div key={i} style={{flexShrink:0,width:ITEM_W,padding:'10px 14px',borderRight:'1px solid var(--border)',textAlign:'center'}}>
                      <div style={{fontSize:17,fontWeight:900,color:'var(--green)'}}>{s.n}</div>
                      <div style={{fontSize:10,color:'var(--muted)',fontWeight:600,letterSpacing:'0.04em'}}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        );
      })()}

      <div style={{display:'grid', gridTemplateColumns:'400px 1fr', gap:20, alignItems:'start'}}>

        {/* LEFT — Intake form */}
        <div style={{display:'flex', flexDirection:'column', gap:12}}>

          <div className="card">
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',color:'var(--blue)',textTransform:'uppercase',marginBottom:14}}>👤 About the Prospect</div>
            {error && <div style={{background:'var(--red-dim)',border:'1px solid var(--red)',borderRadius:6,padding:'8px 12px',marginBottom:12,color:'var(--red)',fontSize:12}}>{error}</div>}
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <Field label="Full Name" required>
                  <input className="input" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Ahmad Razali" disabled={step==='generating'}/>
                </Field>
                <Field label="Job Title">
                  <input className="input" value={form.title} onChange={e=>set('title',e.target.value)} placeholder="CEO / Director" disabled={step==='generating'}/>
                </Field>
              </div>
              <Field label="Company Name" required>
                <input className="input" value={form.company} onChange={e=>set('company',e.target.value)} placeholder="Naim Auto Trading" disabled={step==='generating'}/>
              </Field>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <Field label="Industry">
                  <Select className="input" value={form.industry} onChange={v=>set('industry',v)} disabled={step==='generating'}
                    options={Object.keys(INDUSTRY_CONFIG).map(i=>({value:i,label:i}))}
                  />
                </Field>
                <Field label="City">
                  <input className="input" value={form.city} onChange={e=>set('city',e.target.value)} placeholder="Kuching" disabled={step==='generating'}/>
                </Field>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',color:'var(--green)',textTransform:'uppercase',marginBottom:14}}>📲 How to Reach Them</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <Field label="WhatsApp / Phone" required>
                <input className="input" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+6013-5730946" disabled={step==='generating'}/>
              </Field>
              <Field label="Email Address">
                <input className="input" type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="ahmad@company.com.my" disabled={step==='generating'}/>
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

          <div className="card" style={{border:'1px solid oklch(72% 0.18 65 / 0.4)'}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',color:'var(--amber)',textTransform:'uppercase',marginBottom:4}}>🎯 Their Situation</div>
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:14}}>The more specific, the more personal the AI copy feels — the "how did you know?!" moment that closes the deal.</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <Field label="How they currently get clients">
                <Select className="input" value={form.currentMethod} onChange={v=>set('currentMethod',v)} disabled={step==='generating'}
                  options={METHODS.map(m=>({value:m.v,label:m.l}))}
                />
              </Field>
              <Field label="Their biggest challenge (optional)">
                <input className="input" value={form.challenge} onChange={e=>set('challenge',e.target.value)} placeholder="e.g. Inconsistent pipeline, slow season, can't scale…" disabled={step==='generating'}/>
              </Field>
              <Field label={`Dream outcome — ${industryCfg.unit}`}>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {industryCfg.goals.map(g=>(
                    <button key={g} onClick={()=>set('monthlyGoal',g)} disabled={step==='generating'}
                      style={{padding:'6px 12px',borderRadius:6,border:`1px solid ${form.monthlyGoal===g?'var(--amber)':'var(--border)'}`,
                        background:form.monthlyGoal===g?'var(--amber-dim)':'transparent',
                        color:form.monthlyGoal===g?'var(--amber)':'var(--muted)',fontSize:11,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
                      {g}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </div>

          <button
            className="btn btn-green"
            style={{width:'100%',padding:'14px',fontSize:15,fontWeight:800,letterSpacing:'0.04em',justifyContent:'center'}}
            onClick={generate}
            disabled={step==='generating' || !form.name || !form.company || !form.phone || form.phone.length < 6}
          >
            {step==='generating' ? <><Spinner/> Crafting offer…</> : '⚡ Generate Irresistible Offer'}
          </button>
        </div>

        {/* RIGHT — Output */}
        <div style={{display:'flex', flexDirection:'column', gap:16}}>

          {step === 'input' && (
            <div className="card" style={{padding:48, textAlign:'center', opacity:0.45}}>
              <div style={{fontSize:40, marginBottom:12}}>🎯</div>
              <div style={{fontWeight:700,fontSize:15,color:'var(--text)',marginBottom:6}}>Ready to impress</div>
              <div style={{fontSize:13,color:'var(--muted)'}}>Fill in their details → AI builds an irresistible offer → fires it live while they watch</div>
            </div>
          )}

          {/* Step-by-step loading */}
          {step === 'generating' && (
            <div className="card" style={{padding:'28px 24px'}}>
              <div style={{fontSize:14,fontWeight:700,color:'var(--text)',marginBottom:20}}>
                ⚡ Crafting for <span style={{color:'var(--green)'}}>{form.name}</span> at <span style={{color:'var(--blue)'}}>{form.company}</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {LOAD_STEPS.map((s, i) => (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:8,
                    background: i < loadStep ? 'var(--green-dim)' : i === loadStep ? 'var(--s2)' : 'transparent',
                    border: `1px solid ${i < loadStep ? 'oklch(65% 0.2 145 / 0.25)' : i === loadStep ? 'var(--border)' : 'transparent'}`,
                    opacity: i > loadStep ? 0.3 : 1, transition:'all 0.35s'}}>
                    <div style={{width:20,height:20,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',
                      background: i < loadStep ? 'var(--green)' : 'transparent',
                      border: `1px solid ${i < loadStep ? 'var(--green)' : 'var(--border)'}`,
                      flexShrink:0}}>
                      {i < loadStep
                        ? <span style={{fontSize:10,color:'#000',fontWeight:900}}>✓</span>
                        : i === loadStep
                          ? <Spinner size={10}/>
                          : <span style={{fontSize:9,color:'var(--muted)'}}>{i+1}</span>}
                    </div>
                    <span style={{fontSize:12,color: i < loadStep ? 'var(--green)' : i === loadStep ? 'var(--text)' : 'var(--muted)', fontWeight: i === loadStep ? 600 : 400}}>
                      {s}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {(step === 'preview' || step === 'firing' || step === 'done') && content && (
            <>
              <div className="card" style={{overflow:'hidden'}}>
                <div style={{display:'flex',borderBottom:'1px solid var(--border)'}}>
                  {[{id:'whatsapp',icon:'💬',label:'WhatsApp'},{id:'email',icon:'📧',label:'Email'},{id:'voice',icon:'📞',label:'Voice Script'}].map(t=>(
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
                      <div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:700,marginBottom:8}}>WhatsApp → {form.phone}</div>
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
                        Full conversational AI — handles objections, re-engages off-topic, goal is to book a call or transfer live to you.
                      </div>
                      <textarea className="input" rows={10} style={{resize:'vertical',fontSize:12,lineHeight:1.7}}
                        value={content.voiceScript} onChange={e=>setContent(c=>({...c,voiceScript:e.target.value}))}/>
                    </>
                  )}
                </div>
              </div>

              {/* Fire panel */}
              <div className="card">
                <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>🔥 Fire to {form.name} @ {form.company}</div>
                <div style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>
                  They'll receive this <strong style={{color:'var(--text)'}}>right now</strong> — while sitting across from you.
                </div>

                {voiceConfirm && (
                  <div style={{background:'var(--amber-dim)',border:'1px solid oklch(72% 0.18 65 / 0.4)',borderRadius:10,padding:'14px 16px',marginBottom:12}}>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--amber)',marginBottom:6}}>📞 Confirm AI Voice Call</div>
                    <div style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>Places a real AI call to <strong style={{color:'var(--text)'}}>{form.phone}</strong>. Agent introduces KOBIS and aims to book a discovery call.</div>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>fire(voiceConfirm)} style={{flex:1,padding:'9px',borderRadius:8,border:'none',background:'var(--amber)',color:'#000',fontSize:12,fontWeight:700,cursor:'pointer'}}>Yes, Call Now</button>
                      <button onClick={()=>setVoiceConfirm(null)} style={{flex:1,padding:'9px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',fontSize:12,cursor:'pointer'}}>Cancel</button>
                    </div>
                  </div>
                )}

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:12}}>
                  {[
                    {ch:'whatsapp',icon:'💬',label:'WhatsApp',color:'var(--green)',need:'phone'},
                    {ch:'email',   icon:'📧',label:'Email',   color:'var(--blue)', need:'email'},
                    {ch:'voice',   icon:'📞',label:'AI Call', color:'var(--purple)',need:'phone'},
                  ].map(({ch,icon,label,color,need})=>(
                    <button key={ch} onClick={()=>fireWithVoiceCheck([ch])}
                      disabled={!channelReady(ch)||step==='firing'||step==='done'}
                      style={{padding:'12px 8px',borderRadius:10,
                        border:`1px solid ${results[ch]?.ok?'var(--green)':results[ch]?.ok===false?'var(--red)':channelReady(ch)?color:'var(--border)'}`,
                        background:results[ch]?.ok?'var(--green-dim)':results[ch]?.ok===false?'var(--red-dim)':channelReady(ch)?`color-mix(in oklch, ${color} 10%, transparent)`:'transparent',
                        color:'var(--text)',cursor:(!channelReady(ch)||step==='firing'||step==='done')?'not-allowed':'pointer',
                        opacity:!channelReady(ch)?0.4:1,fontSize:12,fontWeight:600,display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
                      <span style={{fontSize:20}}>{icon}</span>
                      <span>{label}</span>
                      {statusIcon(ch)}
                      {!channelReady(ch) && <span style={{fontSize:10,color:'var(--red)'}}>add {need}</span>}
                    </button>
                  ))}
                </div>

                <button onClick={()=>fireWithVoiceCheck(allChannelsReady)}
                  disabled={step==='firing'||step==='done'||allChannelsReady.length===0}
                  style={{width:'100%',padding:'14px',borderRadius:10,border:'none',
                    background:step==='done'?'var(--green-dim)':'linear-gradient(135deg,var(--green),oklch(62% 0.2 185))',
                    color:step==='done'?'var(--green)':'#000',
                    fontSize:15,fontWeight:800,cursor:step==='done'?'default':'pointer',
                    letterSpacing:'0.04em',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  {step==='firing' ? <><Spinner/> Firing…</> : step==='done' ? '✓ Sent — now close the deal 👇' : `🔥 Fire All (${allChannelsReady.length} channels)`}
                </button>

                {step==='done' && Object.keys(results).length > 0 && (
                  <div style={{marginTop:12,display:'flex',flexDirection:'column',gap:6}}>
                    {Object.entries(results).map(([ch,r])=>{
                      const isIntl = !r.ok && r.error?.toLowerCase().includes('international');
                      return (
                        <div key={ch} style={{display:'flex',flexDirection:'column',gap:6,padding:'10px 12px',borderRadius:8,
                          background:r.ok?'var(--green-dim)':'var(--red-dim)',
                          border:`1px solid ${r.ok?'oklch(65% 0.2 145 / 0.3)':'oklch(55% 0.22 25 / 0.3)'}`}}>
                          <div style={{display:'flex',alignItems:'center',gap:10,fontSize:13}}>
                            <span style={{color:r.ok?'var(--green)':'var(--red)',fontWeight:700}}>{r.ok?'✓':'✗'}</span>
                            <span style={{textTransform:'capitalize',fontWeight:600}}>{ch}</span>
                            <span style={{color:'var(--muted)',fontSize:12}}>{r.ok?'Delivered':'Error: '+r.error}</span>
                          </div>
                          {isIntl && (
                            <div style={{marginLeft:22,padding:'8px 12px',background:'var(--amber-dim)',border:'1px solid oklch(72% 0.18 65 / 0.3)',borderRadius:6,fontSize:12,color:'var(--amber)',lineHeight:1.6}}>
                              <strong>Free Vapi numbers can't call international (+60).</strong> Import a Twilio Malaysian number → Settings → Vapi Phone Number ID.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Proof story */}
              {step === 'done' && (
                <div className="card" style={{border:'1px solid oklch(65% 0.2 145 / 0.3)',background:'var(--green-dim)'}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--green)',marginBottom:8}}>📊 Real Result — Similar Business</div>
                  <div style={{fontSize:13,color:'var(--text)',lineHeight:1.75,fontWeight:500}}>
                    {INDUSTRY_PROOF[form.industry] || `A ${form.industry.toLowerCase()} business in Malaysia: 200 contacts → 46 replies → 12 new clients in the first month.`}
                  </div>
                </div>
              )}

              {/* ROI Calculator */}
              {step === 'done' && (
                <div className="card" style={{border:'1px solid oklch(72% 0.18 65 / 0.35)'}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--amber)',marginBottom:12}}>📈 The Math — Show Them the Numbers</div>
                  <div style={{marginBottom:16}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <label className="label" style={{margin:0}}>Contacts in first campaign</label>
                      <span style={{fontSize:14,fontWeight:800,color:'var(--text)'}}>{roiContacts}</span>
                    </div>
                    <input type="range" min={50} max={1000} step={50} value={roiContacts}
                      onChange={e=>setRoiContacts(Number(e.target.value))}
                      style={{width:'100%',accentColor:'var(--amber)',cursor:'pointer'}}/>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
                    {[
                      { label:'Contacts',        value: roiContacts,                   color:'var(--muted)' },
                      { label:'Replies (23%)',    value: replies,                       color:'var(--blue)' },
                      { label:`Deals closed`,     value: deals,                         color:'var(--amber)' },
                      { label:'New revenue',      value: `RM ${revenue.toLocaleString()}`, color:'var(--green)' },
                    ].map(s=>(
                      <div key={s.label} style={{textAlign:'center',padding:'12px 8px',borderRadius:8,background:'var(--s1)',border:'1px solid var(--border)'}}>
                        <div style={{fontSize:20,fontWeight:900,color:s.color,lineHeight:1}}>{s.value}</div>
                        <div style={{fontSize:10,color:'var(--muted)',marginTop:4,fontWeight:600}}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{fontSize:12,padding:'10px 14px',background:'var(--s1)',borderRadius:8,lineHeight:1.7,color:'var(--muted)'}}>
                    Based on RM {industryCfg.avgDealRM.toLocaleString()} avg deal × {Math.round(industryCfg.closeRate*100)}% close rate.{' '}
                    <strong style={{color:'var(--green)'}}>Your first {industryCfg.verb} pays for KBOOS for the entire year.</strong>
                  </div>
                </div>
              )}

              {/* Hormozi Closing Guide */}
              {step === 'done' && (
                <div className="card" style={{border:'1px solid oklch(65% 0.2 290 / 0.35)'}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--purple)',marginBottom:4}}>🎤 Closing Guide — 5-Step Hormozi Close</div>
                  <div style={{fontSize:11,color:'var(--muted)',marginBottom:16}}>Work through in order. After asking a question — go completely silent. First one to speak loses.</div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {closingGuide.map((g, i) => (
                      <div key={i}
                        style={{borderRadius:10,border:`1px solid ${closingStep===i?'oklch(65% 0.2 290 / 0.5)':'var(--border)'}`,
                          background:closingStep===i?'oklch(65% 0.2 290 / 0.06)':'var(--s1)',overflow:'hidden'}}>
                        <div onClick={()=>setClosingStep(closingStep===i?-1:i)}
                          style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',cursor:'pointer'}}>
                          <div style={{width:26,height:26,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                            background:closingStep===i?'var(--purple)':'var(--s2)',
                            border:`1px solid ${closingStep===i?'var(--purple)':'var(--border)'}`,
                            fontSize:11,fontWeight:800,color:closingStep===i?'#fff':'var(--muted)'}}>
                            {i+1}
                          </div>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:700,fontSize:13,color:'var(--text)'}}>{g.title}</div>
                            <div style={{fontSize:11,color:'var(--muted)'}}>{g.cue}</div>
                          </div>
                          <span style={{color:'var(--muted)',fontSize:11}}>{closingStep===i?'▲':'▼'}</span>
                        </div>
                        {closingStep===i && (
                          <div style={{padding:'0 14px 14px',borderTop:'1px solid var(--border)'}}>
                            <div style={{fontSize:11,color:'var(--amber)',fontWeight:700,marginBottom:8,paddingTop:10}}>⏱ {g.cue}</div>
                            <div style={{fontSize:13,color:'var(--text)',lineHeight:1.85,fontStyle:'italic',background:'var(--s2)',padding:'14px 16px',borderRadius:8,border:'1px solid var(--border)'}}>
                              {g.script}
                            </div>
                            <button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(g.script.replace(/^"|"$/g,''));}}
                              style={{marginTop:8,padding:'5px 14px',borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--muted)',fontSize:11,cursor:'pointer'}}>
                              Copy script
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Recent log */}
          {log.length > 0 && step !== 'generating' && step !== 'done' && (
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
                        {entry.channels?.map(ch=>(
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
      <label className="label">{label}{required && <span style={{color:'var(--red)',marginLeft:3}}>*</span>}</label>
      {children}
    </div>
  );
}

function Spinner({ size = 14 }) {
  return <span style={{width:size,height:size,border:`2px solid rgba(255,255,255,0.25)`,borderTopColor:'currentColor',borderRadius:'50%',display:'inline-block',animation:'spin 0.7s linear infinite',flexShrink:0}}/>;
}
