import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../services/api.js';

function Spinner() {
  return <span style={{display:'inline-block',width:12,height:12,border:'2px solid var(--border)',borderTopColor:'var(--blue)',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>;
}

export function AiStudio() {
  const { campaigns, businesses, showToast } = useAppStore(useShallow(s => ({
    campaigns: s.campaigns, businesses: s.businesses, showToast: s.showToast,
  })));

  const [form, setForm] = useState({ assetType: 'full', bizId: '', offer: '', targetAudience: '', goal: '', tone: 'Professional', lang: 'EN' });
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState([]); // [{assets:[]}]
  const [historyIdx, setHistoryIdx] = useState(0);
  const [expandedAsset, setExpandedAsset] = useState(null);
  const [editedBodies, setEditedBodies] = useState({});
  const [savingTo, setSavingTo] = useState(null);

  const biz = businesses.find(b => b.id === form.bizId);

  const ASSET_TYPES = [
    { id:'full', label:'Full Campaign Suite', channels:['email','wa','voice'] },
    { id:'email', label:'Email Sequence', channels:['email'] },
    { id:'wa', label:'WhatsApp Sequence', channels:['wa'] },
    { id:'voice', label:'Voice Agent Script', channels:['voice'] },
  ];

  async function generate() {
    if (!form.bizId || !form.offer || !form.targetAudience) {
      showToast('Fill in Business, Offer, and Target Audience', 'red');
      return;
    }
    setGenerating(true);
    try {
      const channels = ASSET_TYPES.find(t => t.id === form.assetType)?.channels || ['email','wa','voice'];
      const bizName = biz?.name || '';
      const industry = biz?.industry || '';
      const res = await apiFetch('/ai/generate-assets', {
        method: 'POST',
        body: { bizId: form.bizId, bizName, industry, offer: form.offer, targetAudience: form.targetAudience, goal: form.goal, tone: form.tone, lang: form.lang, channels, dreamOutcome: form.goal },
      });
      // Flatten assets from response
      const assets = [
        ...(res.emails || []).map((e,i) => ({...e, channel:'email', assetType: e.assetType||`email_${i+1}`, label: e.label||`Email ${i+1}`})),
        ...(res.whatsapps || []).map((e,i) => ({...e, channel:'wa', assetType: e.assetType||`wa_${i+1}`, label: e.label||`WhatsApp ${i+1}`})),
        ...(res.voice ? [
          typeof res.voice === 'object' && res.voice.warm ? res.voice.warm : null,
          typeof res.voice === 'object' && res.voice.direct ? res.voice.direct : null,
          typeof res.voice === 'string' ? { body: res.voice, channel:'voice', assetType:'voice_1', label:'Voice Script' } : null,
        ].filter(Boolean) : []),
      ];
      setHistory(prev => [{ assets, bizName, assetType: form.assetType }, ...prev.slice(0,2)]);
      setHistoryIdx(0);
      setExpandedAsset(null);
      setEditedBodies({});
      showToast(`Generated ${assets.length} assets`);
    } catch (e) { showToast(e.message, 'red'); }
    setGenerating(false);
  }

  async function saveAsset(asset, campaignId) {
    setSavingTo(asset.assetType);
    try {
      await apiFetch(`/pipeline/${campaignId}/assets/add`, {
        method: 'POST',
        body: { assetType: asset.assetType, channel: asset.channel, label: asset.label, subject: asset.subject, body: editedBodies[asset.assetType] ?? asset.body, approved: false },
      });
      showToast('Saved to campaign');
    } catch (e) { showToast(e.message, 'red'); }
    setSavingTo(null);
  }

  function copyAsset(asset) {
    const text = [asset.subject ? `Subject: ${asset.subject}` : '', editedBodies[asset.assetType] ?? asset.body].filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard')).catch(() => {});
  }

  const current = history[historyIdx];

  return (
    <div className="page">
      <div className="fade-up" style={{marginBottom:20}}>
        <h1 className="page-title">AI Studio</h1>
        <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>Generate outreach assets with Claude Opus — one generation, reuse across campaigns</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'340px 1fr',gap:16,alignItems:'start'}}>

        {/* Left: Form */}
        <div className="card fade-up" style={{padding:20}}>
          <div style={{fontWeight:600,fontSize:14,marginBottom:16}}>Build New Asset</div>

          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div>
              <div style={{fontSize:10,color:'var(--muted)',marginBottom:4,fontWeight:600}}>ASSET TYPE</div>
              <select className="input" style={{fontSize:12}} value={form.assetType} onChange={e => setForm(f=>({...f,assetType:e.target.value}))}>
                {ASSET_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <div style={{fontSize:10,color:'var(--muted)',marginBottom:4,fontWeight:600}}>BUSINESS</div>
              <select className="input" style={{fontSize:12}} value={form.bizId} onChange={e => setForm(f=>({...f,bizId:e.target.value}))}>
                <option value="">Select business</option>
                {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div>
              <div style={{fontSize:10,color:'var(--muted)',marginBottom:4,fontWeight:600}}>OFFER <span style={{color:'var(--red)'}}>*</span></div>
              <input className="input" style={{fontSize:12}} placeholder="What are you selling?" value={form.offer} onChange={e => setForm(f=>({...f,offer:e.target.value}))} />
            </div>

            <div>
              <div style={{fontSize:10,color:'var(--muted)',marginBottom:4,fontWeight:600}}>TARGET AUDIENCE <span style={{color:'var(--red)'}}>*</span></div>
              <input className="input" style={{fontSize:12}} placeholder="Who are you selling to?" value={form.targetAudience} onChange={e => setForm(f=>({...f,targetAudience:e.target.value}))} />
            </div>

            <div>
              <div style={{fontSize:10,color:'var(--muted)',marginBottom:4,fontWeight:600}}>GOAL</div>
              <input className="input" style={{fontSize:12}} placeholder="Desired outcome (e.g. Book a call)" value={form.goal} onChange={e => setForm(f=>({...f,goal:e.target.value}))} />
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div>
                <div style={{fontSize:10,color:'var(--muted)',marginBottom:4,fontWeight:600}}>TONE</div>
                <select className="input" style={{fontSize:12}} value={form.tone} onChange={e => setForm(f=>({...f,tone:e.target.value}))}>
                  {['Professional','Casual','Direct','Consultative'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <div style={{fontSize:10,color:'var(--muted)',marginBottom:4,fontWeight:600}}>LANGUAGE</div>
                <select className="input" style={{fontSize:12}} value={form.lang} onChange={e => setForm(f=>({...f,lang:e.target.value}))}>
                  <option value="EN">English</option>
                  <option value="MS">Bahasa Malaysia</option>
                  <option value="ZH">Mandarin</option>
                </select>
              </div>
            </div>

            <button className="btn btn-green" style={{marginTop:4}} disabled={generating || !form.offer || !form.targetAudience} onClick={generate}>
              {generating ? <><Spinner /> Claude is writing…</> : '⚡ Generate Assets'}
            </button>

            {generating && (
              <div style={{fontSize:11,color:'var(--muted)',textAlign:'center',lineHeight:1.5}}>
                Using Claude Opus — takes 15-30 seconds.<br/>Best quality, runs once.
              </div>
            )}
          </div>
        </div>

        {/* Right: Output */}
        <div className="fade-up-1">
          {/* History tabs */}
          {history.length > 1 && (
            <div style={{display:'flex',gap:6,marginBottom:12}}>
              {history.map((h,i) => (
                <button key={i} style={{
                  padding:'4px 12px',fontSize:11,borderRadius:6,cursor:'pointer',
                  background: historyIdx===i ? 'var(--s2)' : 'transparent',
                  border: `1px solid ${historyIdx===i ? 'var(--blue)' : 'var(--border)'}`,
                  color: historyIdx===i ? 'var(--blue)' : 'var(--muted)',
                }} onClick={() => setHistoryIdx(i)}>
                  {i === 0 ? 'Latest' : `Previous ${i}`}
                </button>
              ))}
            </div>
          )}

          {!current ? (
            <div className="card" style={{textAlign:'center',padding:'64px 24px'}}>
              <div style={{fontSize:32,marginBottom:12,color:'var(--border)'}}>◎</div>
              <div style={{fontWeight:600,fontSize:14,marginBottom:6}}>Generated assets will appear here</div>
              <div style={{fontSize:12,color:'var(--muted)'}}>Fill in the form and click Generate to create outreach copy with Claude Opus.</div>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                <div style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{current.assets.length} assets generated for {current.bizName}</div>
              </div>
              {current.assets.map(asset => {
                const isOpen = expandedAsset === asset.assetType;
                const icon = asset.channel === 'email' ? '◈' : asset.channel === 'wa' ? '✦' : '◉';
                return (
                  <div key={asset.assetType} className="card" style={{padding:0,overflow:'hidden'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',cursor:'pointer',background:'var(--s1)'}} onClick={() => setExpandedAsset(isOpen ? null : asset.assetType)}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:13,color:'var(--blue)'}}>{icon}</span>
                        <span style={{fontSize:12,fontWeight:500}}>{asset.label}</span>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <button className="btn btn-ghost btn-sm" style={{fontSize:10,padding:'2px 8px'}} onClick={e=>{e.stopPropagation();copyAsset(asset);}}>Copy</button>
                        <span style={{fontSize:11,color:'var(--muted)'}}>{isOpen ? '▲' : '▼'}</span>
                      </div>
                    </div>
                    {isOpen && (
                      <div style={{padding:'14px 16px',background:'var(--s2)',borderTop:'1px solid var(--border)'}}>
                        {asset.subject && (
                          <div style={{marginBottom:10}}>
                            <div style={{fontSize:10,color:'var(--muted)',marginBottom:3,fontWeight:600}}>SUBJECT</div>
                            <div style={{fontSize:12,fontWeight:500,color:'var(--text)'}}>{asset.subject}</div>
                          </div>
                        )}
                        <div style={{marginBottom:12}}>
                          <div style={{fontSize:10,color:'var(--muted)',marginBottom:4,fontWeight:600}}>BODY</div>
                          <textarea
                            style={{width:'100%',minHeight:120,background:'var(--s1)',border:'1px solid var(--border)',borderRadius:6,padding:'8px 10px',fontSize:12,color:'var(--text)',fontFamily:'inherit',resize:'vertical',boxSizing:'border-box'}}
                            value={editedBodies[asset.assetType] ?? asset.body}
                            onChange={e => setEditedBodies(prev => ({...prev, [asset.assetType]: e.target.value}))}
                          />
                        </div>
                        {asset.notes && <div style={{fontSize:11,color:'var(--muted)',fontStyle:'italic',marginBottom:12}}>Note: {asset.notes}</div>}
                        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                          <span style={{fontSize:11,color:'var(--muted)'}}>Save to campaign:</span>
                          {campaigns.slice(0,5).map(c => (
                            <button key={c.id} className="btn btn-ghost btn-sm" style={{fontSize:10,padding:'2px 10px'}} disabled={savingTo===asset.assetType} onClick={() => saveAsset(asset, c.id)}>
                              {savingTo===asset.assetType ? <Spinner/> : c.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
