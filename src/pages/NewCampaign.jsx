import { useState, useRef } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { BizAvatar } from '../components/ui/BizAvatar.jsx';
import { apiFetch } from '../services/api.js';

const CHANNELS = [
  {
    id: 'wa',
    icon: '💬',
    label: 'WhatsApp Only',
    desc: 'Best for local businesses, fast outreach, high open rates',
    channels: ['wa'],
    sequence: [
      { type:'wa', day:0, skipIfReplied:false },
      { type:'wa', day:3, skipIfReplied:true },
    ],
  },
  {
    id: 'wa_email',
    icon: '💬📧',
    label: 'WhatsApp + Email',
    desc: 'WA for attention, email for detail — best for corporate B2B',
    channels: ['wa','email'],
    sequence: [
      { type:'wa', day:0, skipIfReplied:false },
      { type:'email', day:2, skipIfReplied:true },
      { type:'wa', day:7, skipIfReplied:true },
      { type:'email', day:12, skipIfReplied:true },
    ],
  },
  {
    id: 'full',
    icon: '💬📧📞',
    label: 'Full Outreach',
    desc: 'Maximum reach — WA + Email + AI Voice for high-value deals',
    channels: ['wa','email','call'],
    sequence: [
      { type:'wa', day:0, skipIfReplied:false },
      { type:'email', day:3, skipIfReplied:true },
      { type:'wa', day:7, skipIfReplied:true },
      { type:'call', day:12, skipIfReplied:true },
    ],
  },
];

const GEN_STEPS = [
  'Analyzing your business brief…',
  'Selecting optimal channels…',
  'Building outreach sequence…',
  'Configuring lead sources…',
  'Finalizing campaign…',
];

function Spinner() {
  return <span style={{display:'inline-block',width:12,height:12,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>;
}

export function NewCampaign() {
  const { businesses, addCampaign, showToast, openCampaignPipeline } = useAppStore(useShallow(s => ({
    businesses: s.businesses, addCampaign: s.addCampaign, showToast: s.showToast, openCampaignPipeline: s.openCampaignPipeline,
  })));

  const approvedBizList = businesses.filter(b => b.status === 'approved' || !b.status);

  // ── Mode: null | 'fast' | 'quick'
  const [mode, setMode] = useState(null);

  // ── Fast Track state
  const [bizSel, setBizSel] = useState(null);
  const [goalText, setGoalText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [aiResult, setAiResult] = useState(null);
  const [aiName, setAiName] = useState('');
  const [creating, setCreating] = useState(false);
  const genTimer = useRef(null);

  // ── Quick Setup state
  const [qBiz, setQBiz] = useState(null);
  const [qName, setQName] = useState('');
  const [qChannel, setQChannel] = useState('wa_email');
  const [qLeads, setQLeads] = useState(200);
  const [qCreating, setQCreating] = useState(false);

  const selBiz = businesses.find(b => b.id === bizSel);

  // ── Fast Track: generate
  async function doGenerate() {
    if (!bizSel) { showToast('Select a business first', 'amber'); return; }
    if (goalText.trim().length < 15) { showToast('Describe your goal in more detail', 'amber'); return; }
    setGenerating(true);
    setGenStep(0);
    setAiResult(null);
    genTimer.current = setInterval(() => setGenStep(s => Math.min(s + 1, GEN_STEPS.length - 1)), 800);
    try {
      const result = await apiFetch('/ai/generate-campaign', {
        method: 'POST',
        body: { bizId: bizSel, goal: goalText, brief: selBiz?.briefContent || {}, industry: selBiz?.industry || '' },
      });
      setAiResult(result);
      setAiName(result.name || '');
    } catch (e) {
      showToast(e.message || 'Generation failed', 'red');
    } finally {
      clearInterval(genTimer.current);
      setGenerating(false);
    }
  }

  // ── Fast Track: create campaign → pipeline
  async function doFastCreate() {
    setCreating(true);
    try {
      const biz = businesses.find(b => b.id === bizSel);
      const newC = await addCampaign({
        bizId: bizSel,
        bizName: biz?.name || '',
        name: aiName || aiResult.name,
        status: 'awaiting_approval',
        color: biz?.color || 'blue',
        leads: 0, total: aiResult.total || 200,
        hot: 0, spend: 'RM 0', open: '0%', wa: '-',
        channels: aiResult.channels || ['wa'],
        sequence: aiResult.sequence || [],
        config: aiResult.config || {},
      });
      if (newC?.id) openCampaignPipeline(newC.id);
    } catch (e) {
      showToast(e.message || 'Failed to create', 'red');
    } finally {
      setCreating(false);
    }
  }

  // ── Quick Setup: create campaign → pipeline
  async function doQuickCreate() {
    if (!qBiz) { showToast('Select a business', 'amber'); return; }
    if (!qName.trim()) { showToast('Enter a campaign name', 'amber'); return; }
    setQCreating(true);
    try {
      const ch = CHANNELS.find(c => c.id === qChannel);
      const biz = businesses.find(b => b.id === qBiz);
      const newC = await addCampaign({
        bizId: qBiz,
        bizName: biz?.name || '',
        name: qName.trim(),
        status: 'awaiting_approval',
        color: biz?.color || 'blue',
        leads: 0, total: qLeads,
        hot: 0, spend: 'RM 0', open: '0%', wa: '-',
        channels: ch.channels,
        sequence: ch.sequence,
        config: {},
      });
      if (newC?.id) openCampaignPipeline(newC.id);
    } catch (e) {
      showToast(e.message || 'Failed to create', 'red');
    } finally {
      setQCreating(false);
    }
  }

  // ── Mode selector ──────────────────────────────────────────
  if (!mode) return (
    <div className="page">
      <div className="fade-up" style={{marginBottom:32}}>
        <div className="breadcrumb">Campaigns / <span>New Campaign</span></div>
        <h1 className="page-title" style={{marginTop:4}}>Campaign Builder</h1>
        <p style={{fontSize:13,color:'var(--muted)',marginTop:6}}>How would you like to build this campaign?</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,maxWidth:720}}>
        {/* Fast Track */}
        <div
          className="card fade-up-1"
          onClick={() => setMode('fast')}
          style={{cursor:'pointer',border:'2px solid var(--green)',padding:28,transition:'transform 0.15s',position:'relative',overflow:'hidden'}}
          onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
        >
          <div style={{position:'absolute',top:0,right:0,width:80,height:80,background:'var(--green)',opacity:0.06,borderRadius:'0 0 0 80px'}}/>
          <div style={{fontSize:28,marginBottom:10}}>⚡</div>
          <div style={{fontWeight:700,fontSize:16,color:'var(--green)',marginBottom:6}}>Tell AI what you want</div>
          <div style={{fontSize:12,color:'var(--muted)',lineHeight:1.6,marginBottom:14}}>
            Describe your goal in plain English — AI builds the complete campaign in seconds
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:5}}>
            {['AI picks the right channels','Auto-configures the sequence','Selects lead sources automatically'].map(t => (
              <div key={t} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text)'}}>
                <span style={{color:'var(--green)',fontSize:10}}>✓</span>{t}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Setup */}
        <div
          className="card fade-up-1"
          onClick={() => setMode('quick')}
          style={{cursor:'pointer',border:'2px solid var(--blue)',padding:28,transition:'transform 0.15s',position:'relative',overflow:'hidden'}}
          onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
        >
          <div style={{position:'absolute',top:0,right:0,width:80,height:80,background:'var(--blue)',opacity:0.06,borderRadius:'0 0 0 80px'}}/>
          <div style={{fontSize:28,marginBottom:10}}>🎯</div>
          <div style={{fontWeight:700,fontSize:16,color:'var(--blue)',marginBottom:6}}>Quick Setup</div>
          <div style={{fontSize:12,color:'var(--muted)',lineHeight:1.6,marginBottom:14}}>
            Pick your business, name it, choose channels — pipeline handles the rest
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:5}}>
            {['Choose channels manually','Set your lead target','Pipeline builds it step by step'].map(t => (
              <div key={t} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text)'}}>
                <span style={{color:'var(--blue)',fontSize:10}}>✓</span>{t}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{marginTop:20,fontSize:12,color:'var(--muted)'}}>
        Both paths lead to the Campaign Pipeline — validate, enrich, personalise, and launch from there.
      </div>
    </div>
  );

  // ── Fast Track ────────────────────────────────────────────
  if (mode === 'fast') return (
    <div className="page">
      <div className="flex items-center justify-between mb-4 fade-up">
        <div>
          <div className="breadcrumb">Campaigns / New Campaign / <span>Fast Track</span></div>
          <h1 className="page-title" style={{marginTop:4}}>Tell AI What You Want</h1>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => { setMode(null); setAiResult(null); setGenerating(false); clearInterval(genTimer.current); }}>← Back</button>
      </div>

      {/* Generating checklist */}
      {generating && (
        <div className="card fade-up-1" style={{maxWidth:520,padding:28}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:18,color:'var(--text)'}}>Building your campaign…</div>
          {GEN_STEPS.map((label, i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,fontSize:13}}>
              {i < genStep
                ? <span style={{color:'var(--green)',fontSize:14,width:18}}>✓</span>
                : i === genStep
                ? <Spinner />
                : <span style={{width:18,height:18,borderRadius:'50%',border:'2px solid var(--border)',display:'inline-block',flexShrink:0}}/>
              }
              <span style={{color: i <= genStep ? 'var(--text)' : 'var(--muted)'}}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* AI Result */}
      {aiResult && !generating && (
        <div className="fade-up-1" style={{display:'flex',flexDirection:'column',gap:12,maxWidth:680}}>
          <div className="card" style={{padding:20}}>
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:6}}>CAMPAIGN NAME</div>
            <input
              className="input"
              style={{fontSize:16,fontWeight:600,marginBottom:0}}
              value={aiName}
              onChange={e => setAiName(e.target.value)}
            />
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div className="card" style={{padding:16}}>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:8}}>CHANNELS</div>
              <div style={{fontSize:18}}>{aiResult.channels?.includes('call') ? '💬📧📞' : aiResult.channels?.includes('email') ? '💬📧' : '💬'}</div>
              <div style={{fontSize:12,color:'var(--text)',marginTop:4}}>{aiResult.channels?.join(' + ').toUpperCase() || 'WhatsApp'}</div>
            </div>
            <div className="card" style={{padding:16}}>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:8}}>TARGET LEADS</div>
              <div style={{fontSize:24,fontWeight:700,color:'var(--blue)',fontFamily:'var(--font-mono)'}}>{aiResult.total || 200}</div>
            </div>
          </div>

          <div className="card" style={{padding:16}}>
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:8}}>SEQUENCE</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {aiResult.sequence?.map((s, i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:6,background:'var(--s2)',borderRadius:6,padding:'6px 12px',fontSize:12}}>
                  <span>{s.type === 'email' ? '📧' : s.type === 'call' ? '📞' : '💬'}</span>
                  <span style={{color:'var(--muted)'}}>Day {s.day}</span>
                </div>
              ))}
            </div>
          </div>

          {aiResult.reasoning && (
            <div style={{background:'var(--green-dim)',border:'1px solid var(--green)',borderRadius:8,padding:'12px 16px',fontSize:12,color:'var(--text)',lineHeight:1.6}}>
              <span style={{color:'var(--green)',fontWeight:600}}>AI Reasoning: </span>{aiResult.reasoning}
            </div>
          )}

          <div style={{display:'flex',gap:10}}>
            <button className="btn btn-green" style={{padding:'10px 24px',fontSize:14,fontWeight:600}} disabled={creating} onClick={doFastCreate}>
              {creating ? <><Spinner /> Creating…</> : '🚀 Create & Open Pipeline'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAiResult(null); setGenStep(0); }}>↺ Regenerate</button>
          </div>
        </div>
      )}

      {/* Goal input — shown when no result yet */}
      {!aiResult && !generating && (
        <div className="card fade-up-1" style={{maxWidth:580,padding:24}}>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:12,color:'var(--muted)',display:'block',marginBottom:6}}>BUSINESS</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {approvedBizList.map(b => (
                <div
                  key={b.id}
                  onClick={() => setBizSel(b.id)}
                  style={{
                    display:'flex',alignItems:'center',gap:8,padding:'6px 12px',borderRadius:8,cursor:'pointer',
                    border:`2px solid ${bizSel === b.id ? 'var(--green)' : 'var(--border)'}`,
                    background: bizSel === b.id ? 'var(--green-dim)' : 'var(--s2)',
                    fontSize:12,fontWeight: bizSel === b.id ? 600 : 400,
                  }}
                >
                  <BizAvatar id={b.id} name={b.name} color={b.color} size={18}/>
                  {b.name}
                </div>
              ))}
            </div>
          </div>

          <div style={{marginBottom:16}}>
            <label style={{fontSize:12,color:'var(--muted)',display:'block',marginBottom:6}}>WHAT DO YOU WANT TO ACHIEVE?</label>
            <textarea
              style={{width:'100%',minHeight:100,background:'var(--s2)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',fontSize:13,color:'var(--text)',fontFamily:'inherit',resize:'vertical',boxSizing:'border-box',lineHeight:1.6}}
              placeholder='e.g. "I want to reach 300 restaurant owners in KL to offer our POS system. Focus on Chinese-owned restaurants."'
              value={goalText}
              onChange={e => setGoalText(e.target.value)}
            />
            <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>Minimum 15 characters. The more detail, the better the campaign.</div>
          </div>

          <button
            className="btn btn-green"
            style={{width:'100%',padding:'11px 0',fontSize:14,fontWeight:600}}
            disabled={!bizSel || goalText.trim().length < 15}
            onClick={doGenerate}
          >
            ⚡ Generate Campaign
          </button>
        </div>
      )}
    </div>
  );

  // ── Quick Setup ───────────────────────────────────────────
  return (
    <div className="page">
      <div className="flex items-center justify-between mb-4 fade-up">
        <div>
          <div className="breadcrumb">Campaigns / New Campaign / <span>Quick Setup</span></div>
          <h1 className="page-title" style={{marginTop:4}}>Quick Setup</h1>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setMode(null)}>← Back</button>
      </div>

      <div style={{maxWidth:560,display:'flex',flexDirection:'column',gap:16}}>

        {/* Business */}
        <div className="card fade-up-1" style={{padding:20}}>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:10,fontWeight:600}}>SELECT BUSINESS</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {approvedBizList.map(b => (
              <div
                key={b.id}
                onClick={() => setQBiz(b.id)}
                style={{
                  display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderRadius:8,cursor:'pointer',
                  border:`2px solid ${qBiz === b.id ? 'var(--blue)' : 'var(--border)'}`,
                  background: qBiz === b.id ? 'var(--blue-dim)' : 'var(--s2)',
                  fontSize:12,fontWeight: qBiz === b.id ? 600 : 400,
                  transition:'border-color 0.15s',
                }}
              >
                <BizAvatar id={b.id} name={b.name} color={b.color} size={20}/>
                {b.name}
              </div>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="card fade-up-1" style={{padding:20}}>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:8,fontWeight:600}}>CAMPAIGN NAME</div>
          <input
            className="input"
            placeholder='e.g. "KL Restaurant Owners Q3"'
            value={qName}
            onChange={e => setQName(e.target.value)}
          />
        </div>

        {/* Channels */}
        <div className="card fade-up-1" style={{padding:20}}>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:12,fontWeight:600}}>OUTREACH CHANNELS</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {CHANNELS.map(ch => (
              <div
                key={ch.id}
                onClick={() => setQChannel(ch.id)}
                style={{
                  display:'flex',alignItems:'center',gap:14,padding:'12px 16px',borderRadius:8,cursor:'pointer',
                  border:`2px solid ${qChannel === ch.id ? 'var(--blue)' : 'var(--border)'}`,
                  background: qChannel === ch.id ? 'var(--blue-dim)' : 'var(--s2)',
                  transition:'border-color 0.15s',
                }}
              >
                <span style={{fontSize:20,flexShrink:0}}>{ch.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color: qChannel === ch.id ? 'var(--blue)' : 'var(--text)'}}>{ch.label}</div>
                  <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{ch.desc}</div>
                </div>
                <div style={{
                  width:16,height:16,borderRadius:'50%',flexShrink:0,
                  border:`2px solid ${qChannel === ch.id ? 'var(--blue)' : 'var(--border)'}`,
                  background: qChannel === ch.id ? 'var(--blue)' : 'transparent',
                  display:'flex',alignItems:'center',justifyContent:'center',
                }}>
                  {qChannel === ch.id && <span style={{width:6,height:6,borderRadius:'50%',background:'#fff',display:'inline-block'}}/>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lead target */}
        <div className="card fade-up-1" style={{padding:20}}>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:8,fontWeight:600}}>TARGET LEAD COUNT</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {[100, 200, 500, 1000].map(n => (
              <button
                key={n}
                onClick={() => setQLeads(n)}
                style={{
                  padding:'8px 20px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,
                  border:`2px solid ${qLeads === n ? 'var(--blue)' : 'var(--border)'}`,
                  background: qLeads === n ? 'var(--blue-dim)' : 'var(--s2)',
                  color: qLeads === n ? 'var(--blue)' : 'var(--text)',
                  transition:'border-color 0.15s',
                }}
              >
                {n.toLocaleString()}
              </button>
            ))}
          </div>
          <div style={{fontSize:11,color:'var(--muted)',marginTop:8}}>
            Sequence: {CHANNELS.find(c => c.id === qChannel)?.sequence.map(s => `${s.type} Day ${s.day}`).join(' → ')}
          </div>
        </div>

        <button
          className="btn btn-blue"
          style={{padding:'12px 0',fontSize:15,fontWeight:700,borderRadius:10}}
          disabled={qCreating || !qBiz || !qName.trim()}
          onClick={doQuickCreate}
        >
          {qCreating ? <><Spinner /> Creating…</> : '🎯 Create Campaign & Open Pipeline'}
        </button>
      </div>
    </div>
  );
}
