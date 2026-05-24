import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../services/api.js';
import { Select } from '../components/ui/Select.jsx';

const CH_ICON  = { WA:'💬', WhatsApp:'💬', wa:'💬', whatsapp:'💬', whatsapp_connect:'📲', Email:'📧', email:'📧', Call:'📞', call:'📞', voice:'📞', LinkedIn:'🔗' };
const CH_COLOR = { WA:'var(--green)', WhatsApp:'var(--green)', wa:'var(--green)', whatsapp:'var(--green)', whatsapp_connect:'oklch(55% 0.18 145)', Email:'var(--blue)', email:'var(--blue)', Call:'var(--amber)', call:'var(--amber)', voice:'var(--amber)' };
const CH_LABEL = { whatsapp_connect: 'WA Connect' };

const STAGES = ['cold', 'engaged', 'qualifying', 'committed', 'closed'];
const STAGE_META = {
  cold:       { label:'Cold',       color:'var(--muted)',  desc:'Just replied — build rapport' },
  engaged:    { label:'Engaged',    color:'var(--blue)',   desc:'Interested — soft ask' },
  qualifying: { label:'Qualifying', color:'var(--amber)',  desc:'Wants details — direct CTA' },
  committed:  { label:'Committed!', color:'var(--green)',  desc:'Ready — hand off to team' },
  closed:     { label:'Closed',     color:'var(--green)',  desc:'Done' },
};

function relTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-MY', { hour:'2-digit', minute:'2-digit' });
}

const STATUS_ACTIONS = [
  { status:'hot',            label:'🔥 Mark Hot',     color:'#f59e0b' },
  { status:'meeting_booked', label:'📅 Book Meeting', color:'#22c55e' },
  { status:'replied',        label:'↩ Replied',       color:'#0078ff' },
];

export function ReplyInbox() {
  const { replies, updateReply, campaigns } = useAppStore(useShallow(s => ({
    replies: s.replies, updateReply: s.updateReply, campaigns: s.campaigns,
  })));

  const [selected,       setSelected]       = useState(null);
  const [filter,         setFilter]         = useState('All');
  const [channelFilter,  setChannelFilter]  = useState('All');
  const [confirmUnsub,   setConfirmUnsub]   = useState(false);
  const [suppressed,     setSuppressed]     = useState({});
  const [draftEdits,     setDraftEdits]     = useState({});
  const [generating,     setGenerating]     = useState(false);
  const [sending,        setSending]        = useState(false);
  const [sent,           setSent]           = useState({});
  const [leadData,       setLeadData]       = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [escalateReasons,setEscalateReasons]= useState({});
  const [takeover,       setTakeover]       = useState({});
  const threadEndRef = useRef(null);

  const tabs = [
    { key:'All',     label:'All' },
    { key:'Unread',  label:'Unread',   count: replies.filter(r => r.status === 'unread').length },
    { key:'Hot',     label:'🔥 Hot',   count: replies.filter(r => r.hot).length },
    { key:'Escalate',label:'🚨 Escalate', count: replies.filter(r => r.aiEscalate).length },
    { key:'Handled', label:'Handled' },
  ];

  const channels = ['All', ...new Set(replies.map(r => r.channel).filter(Boolean))];

  const filtered = replies.filter(r => {
    const matchTab =
      filter === 'All'      ? true :
      filter === 'Unread'   ? r.status === 'unread' :
      filter === 'Hot'      ? r.hot :
      filter === 'Escalate' ? r.aiEscalate :
      filter === 'Handled'  ? r.status === 'handled' : true;
    const matchCh = channelFilter === 'All' || r.channel === channelFilter;
    return matchTab && matchCh;
  });

  const current = selected !== null ? filtered.find(r => r.id === selected) : filtered[0] || null;

  useEffect(() => {
    setLeadData(null);
    if (!current?.leadId) return;
    apiFetch(`/leads/${current.leadId}`).then(setLeadData).catch(() => {});
  }, [current?.id]);

  // Auto-generate draft when a reply is selected (if no draft yet and not handled)
  useEffect(() => {
    if (!current) return;
    if (current.status === 'handled' || suppressed[current.id]) return;
    if (current.aiDraft && !draftEdits[current.id]) {
      setDraftEdits(e => ({ ...e, [current.id]: current.aiDraft }));
      return;
    }
    if (!current.aiDraft && !draftEdits[current.id] && !generating) {
      generateDraft(current);
    }
  }, [current?.id]);

  useEffect(() => {
    if (current?.status === 'unread') updateReply(current.id, { status: 'read' });
  }, [current?.id]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [current?.id, (current?.thread || []).length]);

  const getDraft = (r) => draftEdits[r?.id] ?? r?.aiDraft ?? '';
  const setDraft = (id, val) => setDraftEdits(e => ({ ...e, [id]: val }));

  async function generateDraft(r) {
    if (!r || generating) return;
    setGenerating(true);
    try {
      const result = await apiFetch(`/replies/${r.id}/generate-draft`, { method: 'POST' });
      setDraft(r.id, result.reply);
      updateReply(r.id, { aiDraft: result.reply, aiStage: result.stage, aiEscalate: result.escalate });
      if (result.escalateReason) setEscalateReasons(e => ({ ...e, [r.id]: result.escalateReason }));
    } catch { /* silently fail */ } finally {
      setGenerating(false);
    }
  }

  async function sendDraft(r) {
    const message = getDraft(r);
    if (!message.trim()) return;
    setSending(true);
    try {
      await apiFetch(`/replies/${r.id}/send-draft`, { method: 'POST', body: { message } });
      updateReply(r.id, { status: 'handled', aiDraft: null, aiEscalate: false });
      setSent(s => ({ ...s, [r.id]: true }));
    } catch { /* */ } finally {
      setSending(false);
    }
  }

  async function updateLeadStatus(status) {
    if (!leadData) return;
    setUpdatingStatus(true);
    try {
      await apiFetch(`/leads/${leadData.id}`, { method: 'PATCH', body: { status } });
      setLeadData(l => ({ ...l, status }));
      if (status === 'hot') updateReply(current.id, { hot: true });
    } catch { } finally { setUpdatingStatus(false); }
  }

  async function handleUnsub() {
    setSuppressed(s => ({ ...s, [current.id]: true }));
    updateReply(current.id, { status: 'suppressed', unsub: true });
    if (leadData) await apiFetch(`/leads/${leadData.id}`, { method: 'PATCH', body: { status: 'unsubscribed' } }).catch(() => {});
    setConfirmUnsub(false);
  }

  const campaign   = leadData ? campaigns.find(c => c.id === leadData.campaignId) : null;
  const stage      = current?.aiStage || 'cold';
  const stageMeta  = STAGE_META[stage] || STAGE_META.cold;
  const thread     = Array.isArray(current?.thread) ? current.thread : [];

  // Build display thread: past messages + highlight latest inbound if not in thread
  const lastInThread = thread[thread.length - 1];
  const latestIsLead = lastInThread?.role === 'lead' && lastInThread?.content === current?.msg;
  const displayThread = thread;
  const showCurrentMsg = current && !latestIsLead;

  return (
    <div className="page" style={{ padding:0, display:'flex', flexDirection:'column', height:'100vh' }}>

      {/* Header */}
      <div style={{ padding:'18px 24px 12px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <div className="breadcrumb">Inbox / <span>Smart Reply</span></div>
          <h1 className="page-title" style={{ marginTop:4 }}>Reply Inbox</h1>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {channels.length > 2 && (
            <Select value={channelFilter} onChange={v => setChannelFilter(v)}
              options={channels}
              style={{ background:'var(--s1)', border:'1px solid var(--border)', color:'var(--text)', padding:'5px 10px', borderRadius:6, fontSize:12 }}
            />
          )}
          <div className="tabs">
            {tabs.map(t => (
              <div key={t.key} className={`tab${filter===t.key?' active':''}`}
                onClick={() => { setFilter(t.key); setSelected(null); }}
                style={{ display:'flex', alignItems:'center', gap:5 }}>
                {t.label}
                {t.count > 0 && (
                  <span style={{ background: t.key==='Hot'?'var(--amber)':t.key==='Escalate'?'var(--red)':'var(--blue)', color:'#fff', fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:10 }}>
                    {t.count}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

        {/* Left: Reply list */}
        <div style={{ width:320, borderRight:'1px solid var(--border)', overflowY:'auto', flexShrink:0 }}>
          {filtered.length === 0 && (
            <div style={{ padding:40, textAlign:'center', color:'var(--muted)', fontSize:13 }}>No replies in this view</div>
          )}
          {filtered.map(r => {
            const isActive = r.id === current?.id;
            const chColor  = CH_COLOR[r.channel] || 'var(--muted)';
            const chIcon   = CH_ICON[r.channel]  || '💬';
            const rStage   = STAGE_META[r.aiStage || 'cold'];
            return (
              <div key={r.id} onClick={() => { setSelected(r.id); setConfirmUnsub(false); }}
                style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', cursor:'pointer',
                  background: isActive ? 'var(--s1)' : 'transparent',
                  borderLeft: `3px solid ${isActive ? chColor : 'transparent'}`,
                  transition:'all 0.12s', position:'relative' }}>

                {/* Unread dot */}
                {r.status === 'unread' && (
                  <span style={{ position:'absolute', top:14, right:12, width:7, height:7, borderRadius:'50%', background:'var(--blue)' }}/>
                )}
                {/* Escalate indicator */}
                {r.aiEscalate && r.status !== 'handled' && (
                  <span style={{ position:'absolute', top:12, right:r.status==='unread'?24:12, fontSize:11 }}>🚨</span>
                )}

                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:3 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ fontSize:13, fontWeight: r.status==='unread' ? 700 : 500 }}>{r.name}</span>
                    {r.hot   && <span style={{ fontSize:9, background:'#f59e0b22', color:'#f59e0b', padding:'1px 5px', borderRadius:4, fontWeight:700 }}>HOT</span>}
                    {r.unsub && <span style={{ fontSize:9, background:'var(--red-dim)', color:'var(--red)', padding:'1px 5px', borderRadius:4, fontWeight:700 }}>UNSUB</span>}
                  </div>
                  <span style={{ fontSize:10, color:'var(--muted)' }}>{relTime(r.createdAt)}</span>
                </div>

                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                  <div style={{ fontSize:11, color:'var(--muted)', display:'flex', alignItems:'center', gap:4 }}>
                    <span style={{ color:chColor }}>{chIcon}</span>
                    <span>{r.company}</span>
                    {r.status === 'handled' && <span style={{ color:'var(--green)', marginLeft:4 }}>✓</span>}
                  </div>
                  {r.aiStage && r.aiStage !== 'cold' && (
                    <span style={{ fontSize:9, padding:'1px 6px', borderRadius:4, background:`${rStage.color}22`, color:rStage.color, fontWeight:700 }}>
                      {rStage.label}
                    </span>
                  )}
                </div>

                <div style={{ fontSize:12, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:275 }}>
                  {r.msg}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Detail */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {!current ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', flex:1, color:'var(--muted)', fontSize:13 }}>
              Select a reply to start
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

              {/* Lead header */}
              <div style={{ padding:'16px 24px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:40, height:40, borderRadius:'50%', background:(CH_COLOR[current.channel]||'#888')+'33',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                      {CH_ICON[current.channel] || '💬'}
                    </div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15 }}>{current.name}</div>
                      <div style={{ fontSize:12, color:'var(--muted)' }}>
                        {current.company}{leadData?.title ? ` · ${leadData.title}` : ''}
                      </div>
                    </div>
                  </div>

                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {leadData?.phone && (
                      <a href={`https://wa.me/${leadData.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                        style={{ padding:'5px 10px', borderRadius:8, background:'var(--green-dim)', border:'1px solid oklch(65% 0.2 145 / 0.3)', color:'var(--green)', fontSize:11, textDecoration:'none', fontWeight:600 }}>
                        💬 {leadData.phone}
                      </a>
                    )}
                    {leadData?.email && (
                      <a href={`mailto:${leadData.email}`}
                        style={{ padding:'5px 10px', borderRadius:8, background:'var(--blue-dim)', border:'1px solid var(--blue)', color:'var(--blue)', fontSize:11, textDecoration:'none', fontWeight:600 }}>
                        📧 {leadData.email}
                      </a>
                    )}
                    <span style={{ fontSize:11, padding:'4px 10px', borderRadius:8, background:(CH_COLOR[current.channel]||'#888')+'22', color:CH_COLOR[current.channel]||'#888', fontWeight:700 }}>
                      {CH_ICON[current.channel]} {CH_LABEL[current.channel] || current.channel}
                    </span>
                  </div>
                </div>

                {/* Stage tracker */}
                <div style={{ display:'flex', alignItems:'center', gap:0, marginTop:12, background:'var(--s1)', borderRadius:8, padding:'6px 8px', border:'1px solid var(--border)' }}>
                  {STAGES.filter(s => s !== 'closed').map((s, i) => {
                    const sm = STAGE_META[s];
                    const idx = STAGES.indexOf(stage);
                    const sIdx = STAGES.indexOf(s);
                    const done = sIdx < idx;
                    const active = s === stage;
                    return (
                      <div key={s} style={{ display:'flex', alignItems:'center', flex:1 }}>
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1 }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', marginBottom:3,
                            background: done||active ? sm.color : 'var(--border)',
                            boxShadow: active ? `0 0 6px ${sm.color}` : 'none',
                            transition:'all 0.3s' }}/>
                          <span style={{ fontSize:9, fontWeight: active ? 700 : 400, color: active ? sm.color : 'var(--muted)' }}>
                            {sm.label}
                          </span>
                        </div>
                        {i < 3 && <div style={{ height:1, width:20, background: done ? 'var(--green)' : 'var(--border)', transition:'all 0.3s' }}/>}
                      </div>
                    );
                  })}
                  <div style={{ marginLeft:8, fontSize:10, color:stageMeta.color, fontWeight:600, flexShrink:0 }}>
                    {stageMeta.desc}
                  </div>
                </div>
              </div>

              {/* Thread + Draft area */}
              <div style={{ flex:1, overflowY:'auto', padding:'16px 24px', display:'flex', flexDirection:'column', gap:10 }}>

                {/* Context tags */}
                {(campaign || leadData?.status) && (
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                    {campaign && (
                      <div style={{ padding:'4px 10px', background:'var(--s1)', borderRadius:6, fontSize:11, border:'1px solid var(--border)' }}>
                        <span style={{ color:'var(--muted)' }}>Campaign </span><span style={{ fontWeight:600 }}>{campaign.name}</span>
                      </div>
                    )}
                    {leadData?.status && (
                      <div style={{ padding:'4px 10px', background:'var(--s1)', borderRadius:6, fontSize:11, border:'1px solid var(--border)' }}>
                        <span style={{ color:'var(--muted)' }}>Lead </span>
                        <span style={{ fontWeight:600, color: leadData.status==='hot'?'var(--amber)':leadData.status==='meeting_booked'?'var(--green)':'var(--text)' }}>
                          {leadData.status.replace(/_/g,' ')}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Unsub warning */}
                {current.unsub && !suppressed[current.id] && (
                  <div style={{ background:'var(--amber-dim)', border:'1px solid var(--amber)', borderRadius:8, padding:'12px 14px' }}>
                    <div style={{ fontWeight:700, color:'var(--amber)', marginBottom:8 }}>⚠️ Unsubscribe request</div>
                    {!confirmUnsub ? (
                      <button className="btn btn-amber btn-sm" onClick={() => setConfirmUnsub(true)}>Suppress Contact</button>
                    ) : (
                      <div style={{ display:'flex', gap:8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setConfirmUnsub(false)}>Cancel</button>
                        <button className="btn btn-danger btn-sm" onClick={handleUnsub}>✓ Confirm — Remove from All Campaigns</button>
                      </div>
                    )}
                  </div>
                )}
                {suppressed[current.id] && (
                  <div style={{ background:'var(--green-dim)', border:'1px solid var(--green)', borderRadius:8, padding:'12px 14px', color:'var(--green)', fontWeight:600 }}>
                    ✓ {current.name} suppressed — removed from all future campaigns
                  </div>
                )}

                {/* Conversation thread */}
                {displayThread.length > 0 && (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', textAlign:'center' }}>Conversation History</div>
                    {displayThread.map((msg, i) => {
                      const isLead  = msg.role === 'lead';
                      const chColor = CH_COLOR[msg.channel] || 'var(--blue)';
                      return (
                        <div key={i} style={{ display:'flex', justifyContent: isLead ? 'flex-start' : 'flex-end' }}>
                          <div style={{ maxWidth:'72%' }}>
                            <div style={{ fontSize:9, color:'var(--muted)', marginBottom:3, textAlign: isLead ? 'left' : 'right', padding:'0 4px' }}>
                              {isLead ? current.name : (msg.persona || 'You')} · {fmtTime(msg.ts)}
                              {!isLead && msg.sentVia === 'auto' && <span style={{ color:'var(--blue)', marginLeft:4 }}>· AI</span>}
                            </div>
                            <div style={{ padding:'10px 14px', borderRadius:12,
                              borderTopLeftRadius: isLead ? 4 : 12,
                              borderTopRightRadius: isLead ? 12 : 4,
                              background: isLead ? 'var(--s2)' : `${chColor}22`,
                              border: `1px solid ${isLead ? 'var(--border)' : chColor+'44'}`,
                              fontSize:13, lineHeight:1.65, color:'var(--text)', wordBreak:'break-word' }}>
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Current inbound message (latest from lead, not yet in thread) */}
                {showCurrentMsg && (
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {thread.length > 0 && <div style={{ height:1, background:'var(--border)', margin:'4px 0' }}/>}
                    <div style={{ display:'flex', justifyContent:'flex-start' }}>
                      <div style={{ maxWidth:'72%' }}>
                        <div style={{ fontSize:9, color:'var(--muted)', marginBottom:3, padding:'0 4px' }}>
                          {current.name} · {relTime(current.createdAt)} {current.status === 'unread' && <span style={{ color:'var(--blue)', marginLeft:4 }}>· New</span>}
                        </div>
                        <div style={{ padding:'12px 16px', borderRadius:12, borderTopLeftRadius:4,
                          background:'var(--s2)', border:'1px solid var(--border)',
                          fontSize:13, lineHeight:1.7, color:'var(--text)' }}>
                          {current.msg}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={threadEndRef}/>

                {/* Escalation alert */}
                {current.aiEscalate && current.status !== 'handled' && !suppressed[current.id] && (
                  <div style={{ background:'var(--red-dim)', border:'1px solid var(--red)', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ fontWeight:700, color:'var(--red)', marginBottom:4, fontSize:13 }}>🚨 Human needed — take over this conversation</div>
                    <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.6 }}>
                      {escalateReasons[current.id] || 'This lead appears ready to commit, or the conversation needs a human touch. Review and reply personally.'}
                    </div>
                    <button className="btn btn-sm" onClick={() => { setTakeover(t => ({ ...t, [current.id]: true })); updateReply(current.id, { aiEscalate: false }); }}
                      style={{ marginTop:10, background:'var(--red)', color:'#fff', border:'none' }}>
                      I'll Take Over
                    </button>
                  </div>
                )}

                {/* Lead status actions */}
                {leadData && !suppressed[current.id] && leadData.status !== 'meeting_booked' && current.status !== 'handled' && (
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {STATUS_ACTIONS.filter(a => a.status !== leadData.status).map(a => (
                      <button key={a.status} onClick={() => updateLeadStatus(a.status)} disabled={updatingStatus}
                        style={{ padding:'6px 12px', borderRadius:8, border:`1px solid ${a.color}44`, background:`${a.color}11`, color:a.color, fontSize:11, fontWeight:600, cursor:'pointer' }}>
                        {updatingStatus ? '…' : a.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* AI Draft Card */}
                {current.status !== 'handled' && !suppressed[current.id] && (
                  <div className="card" style={{ borderLeft:`3px solid ${CH_COLOR[current.channel]||'var(--blue)'}`, marginTop:4 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:'var(--blue)' }}>✦ AI Draft</span>
                        <span style={{ fontSize:10, color:stageMeta.color, background:`${stageMeta.color}22`, padding:'1px 7px', borderRadius:4, fontWeight:700 }}>
                          {stageMeta.label} stage
                        </span>
                        {generating && <span style={{ fontSize:11, color:'var(--muted)' }}>generating…</span>}
                      </div>
                      <div style={{ fontSize:10, color:'var(--muted)' }}>
                        Pilot mode — review before sending
                      </div>
                    </div>

                    <textarea className="input"
                      style={{ minHeight:110, fontSize:13, lineHeight:1.75, marginBottom:12, fontFamily:'inherit', resize:'vertical' }}
                      value={getDraft(current)}
                      onChange={e => setDraft(current.id, e.target.value)}
                      placeholder={generating ? 'Claude is drafting a reply…' : 'Draft will appear here'}
                    />

                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                      <button className="btn btn-primary btn-sm"
                        onClick={() => sendDraft(current)}
                        disabled={sending || sent[current.id] || !getDraft(current).trim() || generating}
                        style={{ minWidth:130 }}>
                        {sent[current.id] ? '✓ Sent' : sending ? 'Sending…' : `${CH_ICON[current.channel]||'↗'} Send via ${CH_LABEL[current.channel] || current.channel}`}
                      </button>
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => { setDraft(current.id, ''); generateDraft(current); }}
                        disabled={generating}>
                        {generating ? '…' : '↺ Regenerate'}
                      </button>
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => navigator.clipboard?.writeText(getDraft(current))}>
                        📋 Copy
                      </button>
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => updateReply(current.id, { status:'handled' })}>
                        ✓ Mark Handled
                      </button>
                    </div>

                    {/* Stage nudge */}
                    {stage === 'committed' && (
                      <div style={{ marginTop:10, padding:'8px 12px', background:'var(--green-dim)', borderRadius:6, border:'1px solid oklch(65% 0.2 145 / 0.3)', fontSize:12, color:'var(--green)' }}>
                        🎯 This lead is committed — after sending, book the meeting and mark them Hot.
                      </div>
                    )}
                  </div>
                )}

                {current.status === 'handled' && !suppressed[current.id] && (
                  <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'var(--green-dim)', borderRadius:8, border:'1px solid oklch(65% 0.2 145 / 0.3)' }}>
                    <span style={{ color:'var(--green)', fontWeight:600 }}>✓ Handled</span>
                    <button className="btn btn-ghost btn-sm" style={{ marginLeft:'auto' }} onClick={() => { updateReply(current.id, { status:'read' }); setSent(s => ({ ...s, [current.id]: false })); }}>
                      Reopen
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
