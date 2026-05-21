import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../services/api.js';

const CH_ICON  = { WA:'💬', WhatsApp:'💬', wa:'💬', whatsapp:'💬', Email:'📧', email:'📧', Call:'📞', call:'📞', voice:'📞', LinkedIn:'🔗' };
const CH_COLOR = { WA:'var(--green)', WhatsApp:'var(--green)', wa:'var(--green)', whatsapp:'var(--green)', Email:'var(--blue)', email:'var(--blue)', Call:'var(--amber)', call:'var(--amber)', voice:'var(--amber)' };

function relTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'yesterday';
  return `${d}d ago`;
}

function scoreLabel(score) {
  if (score >= 60) return { label: 'Maps + Apollo', color: '#a855f7' };
  if (score >= 40) return { label: 'Apollo', color: '#0078ff' };
  if (score >= 30) return { label: 'Maps', color: '#06b6d4' };
  return { label: 'Manual', color: '#888' };
}

const STATUS_ACTIONS = [
  { status: 'hot',           label: '🔥 Mark Hot',        color: '#f59e0b' },
  { status: 'meeting_booked',label: '📅 Book Meeting',    color: '#22c55e' },
  { status: 'replied',       label: '↩ Mark Replied',     color: '#0078ff' },
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
  const [editableReplies,setEditableReplies]= useState({});
  const [loadingReply,   setLoadingReply]   = useState(false);
  const [sending,        setSending]        = useState(false);
  const [sent,           setSent]           = useState({});
  const [leadData,       setLeadData]       = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const tabs = [
    { key: 'All',     label: 'All' },
    { key: 'Unread',  label: 'Unread',  count: replies.filter(r => r.status === 'unread').length },
    { key: 'Hot',     label: '🔥 Hot',  count: replies.filter(r => r.hot).length },
    { key: 'Handled', label: 'Handled' },
  ];

  const channels = ['All', ...new Set(replies.map(r => r.channel).filter(Boolean))];

  const filtered = replies.filter(r => {
    const matchTab =
      filter === 'All' ? true :
      filter === 'Unread' ? r.status === 'unread' :
      filter === 'Hot' ? r.hot :
      filter === 'Handled' ? r.status === 'handled' : true;
    const matchChannel = channelFilter === 'All' || r.channel === channelFilter;
    return matchTab && matchChannel;
  });

  const current = selected !== null ? filtered.find(r => r.id === selected) : filtered[0] || null;

  // Fetch lead data when selection changes
  useEffect(() => {
    setLeadData(null);
    if (!current?.leadId) return;
    apiFetch(`/leads/${current.leadId}`).then(setLeadData).catch(() => {});
  }, [current?.id]);

  // Auto-generate reply when reply selected
  useEffect(() => {
    if (current && !editableReplies[current.id]) fetchSuggestedReply(current);
  }, [current?.id]);

  // Auto-mark unread as read when opened
  useEffect(() => {
    if (current?.status === 'unread') updateReply(current.id, { status: 'read' });
  }, [current?.id]);

  const getEditableReply   = (r) => editableReplies[r?.id] ?? '';
  const setEditableReplyFn = (id, val) => setEditableReplies(p => ({ ...p, [id]: val }));

  async function fetchSuggestedReply(r) {
    if (!r) return;
    setLoadingReply(true);
    try {
      const { reply } = await apiFetch('/ai/suggest-reply', {
        method: 'POST',
        body: { message: r.msg, senderName: r.name, company: r.company, channel: r.channel, isHot: r.hot || false, isUnsub: r.unsub || false },
      });
      setEditableReplyFn(r.id, reply);
    } catch {
      const fallback = r.unsub
        ? `Hi ${r.name.split(' ')[0]}, noted — I've removed you from our list immediately. Apologies for the inconvenience.`
        : r.hot
        ? `Hi ${r.name.split(' ')[0]}, great to hear! I can arrange a call to discuss ${r.company} this week. What time works for you?`
        : `Hi ${r.name.split(' ')[0]}, thank you for your reply! I'll prepare the relevant information and follow up shortly.`;
      setEditableReplyFn(r.id, fallback);
    } finally {
      setLoadingReply(false);
    }
  }

  async function sendReply(r) {
    setSending(true);
    try {
      const msg = getEditableReply(r);
      if (r.channel === 'WA' || r.channel === 'WhatsApp') {
        await apiFetch('/wa/send', { method: 'POST', body: { phone: leadData?.phone || '', message: msg, contactName: r.name } });
      } else {
        await apiFetch('/email/send', { method: 'POST', body: { to: leadData?.email || '', toName: r.name, subject: `Re: Your inquiry`, body: msg } });
      }
    } catch { /* silently handle if API key not yet configured */ } finally {
      setSent(s => ({ ...s, [r.id]: true }));
      updateReply(r.id, { status: 'handled' });
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
    } catch { /* */ } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleUnsub() {
    setSuppressed(s => ({ ...s, [current.id]: true }));
    updateReply(current.id, { status: 'suppressed', unsub: true });
    if (leadData) {
      await apiFetch(`/leads/${leadData.id}`, { method: 'PATCH', body: { status: 'unsubscribed' } }).catch(() => {});
    }
    setConfirmUnsub(false);
  }

  const campaign = leadData ? campaigns.find(c => c.id === leadData.campaignId) : null;

  return (
    <div className="page" style={{ padding:0, display:'flex', flexDirection:'column', height:'100vh' }}>
      {/* Header */}
      <div style={{ padding:'20px 28px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <div className="breadcrumb">Businesses / <span>Reply Inbox</span></div>
          <h1 className="page-title" style={{ marginTop:4 }}>Reply Inbox</h1>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {channels.length > 2 && (
            <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)}
              style={{ background:'var(--card)', border:'1px solid var(--border)', color:'var(--text-1)', padding:'5px 10px', borderRadius:6, fontSize:12 }}>
              {channels.map(c => <option key={c}>{c}</option>)}
            </select>
          )}
          <div className="tabs">
            {tabs.map(t => (
              <div key={t.key} className={`tab${filter===t.key?' active':''}`} onClick={() => { setFilter(t.key); setSelected(null); }}
                style={{ display:'flex', alignItems:'center', gap:5 }}>
                {t.label}
                {t.count > 0 && (
                  <span style={{ background: t.key==='Hot' ? 'var(--amber)' : 'var(--blue)', color:'#fff', fontSize:10, fontWeight:700, padding:'1px 5px', borderRadius:10, lineHeight:1.4 }}>
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
        <div style={{ width:340, borderRight:'1px solid var(--border)', overflowY:'auto', flexShrink:0 }}>
          {filtered.length === 0 && (
            <div style={{ padding:40, textAlign:'center', color:'var(--muted)', fontSize:13 }}>No replies in this view</div>
          )}
          {filtered.map(r => {
            const isActive = r.id === (current?.id);
            const chColor  = CH_COLOR[r.channel] || 'var(--muted)';
            const chIcon   = CH_ICON[r.channel]  || '💬';
            return (
              <div key={r.id}
                onClick={() => { setSelected(r.id); setConfirmUnsub(false); }}
                style={{
                  padding:'12px 14px', borderBottom:'1px solid var(--border)', cursor:'pointer',
                  background: isActive ? 'var(--s1)' : 'transparent',
                  borderLeft: `3px solid ${isActive ? chColor : 'transparent'}`,
                  transition:'all 0.12s', position:'relative',
                }}
              >
                {/* Unread dot */}
                {r.status === 'unread' && (
                  <span style={{ position:'absolute', top:14, right:12, width:7, height:7, borderRadius:'50%', background:'var(--blue)' }} />
                )}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:3 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:13, fontWeight: r.status==='unread' ? 600 : 500 }}>{r.name}</span>
                    {r.hot   && <span style={{ fontSize:10, background:'#f59e0b22', color:'#f59e0b', padding:'1px 5px', borderRadius:6, fontWeight:600 }}>🔥 HOT</span>}
                    {r.unsub && <span style={{ fontSize:10, background:'var(--red-dim)', color:'var(--red)', padding:'1px 5px', borderRadius:6, fontWeight:600 }}>UNSUB</span>}
                  </div>
                  <span style={{ fontSize:10, color:'var(--muted)' }}>{relTime(r.createdAt)}</span>
                </div>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:4, display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ color:chColor }}>{chIcon}</span>
                  <span>{r.company}</span>
                  {r.status === 'handled' && <span style={{ color:'var(--green)', marginLeft:4 }}>· ✓ Handled</span>}
                </div>
                <div style={{ fontSize:12, color:'var(--text-2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:290 }}>
                  {r.msg}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Detail */}
        <div style={{ flex:1, overflowY:'auto', padding:'24px 28px' }}>
          {!current ? (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'var(--muted)', fontSize:13 }}>
              Select a reply to view
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:16, maxWidth:680 }}>

              {/* Lead header */}
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:42, height:42, borderRadius:'50%', background: CH_COLOR[current.channel]+'33', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                    {CH_ICON[current.channel] || '💬'}
                  </div>
                  <div>
                    <div style={{ fontWeight:600, fontSize:16 }}>{current.name}</div>
                    <div style={{ fontSize:12, color:'var(--muted)', marginTop:1 }}>
                      {current.company}
                      {leadData?.title && ` · ${leadData.title}`}
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  {leadData && (
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, background: scoreLabel(leadData.score).color+'22', color: scoreLabel(leadData.score).color, fontWeight:600 }}>
                      {scoreLabel(leadData.score).label}
                    </span>
                  )}
                  <span style={{ fontSize:11, padding:'3px 10px', borderRadius:10, background: (CH_COLOR[current.channel]||'#888')+'22', color: CH_COLOR[current.channel]||'#888', fontWeight:600 }}>
                    {CH_ICON[current.channel]} {current.channel}
                  </span>
                </div>
              </div>

              {/* Campaign context */}
              {(campaign || leadData) && (
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  {campaign && (
                    <div style={{ padding:'6px 12px', background:'var(--bg-2)', borderRadius:8, fontSize:12, border:'1px solid var(--border)' }}>
                      <span style={{ color:'var(--muted)', marginRight:4 }}>Campaign</span>
                      <span style={{ fontWeight:500 }}>{campaign.name}</span>
                    </div>
                  )}
                  {leadData?.status && (
                    <div style={{ padding:'6px 12px', background:'var(--bg-2)', borderRadius:8, fontSize:12, border:'1px solid var(--border)' }}>
                      <span style={{ color:'var(--muted)', marginRight:4 }}>Lead Status</span>
                      <span style={{ fontWeight:500, color: leadData.status === 'hot' ? 'var(--amber)' : leadData.status === 'meeting_booked' ? 'var(--green)' : 'var(--text-1)' }}>
                        {leadData.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}
                  {leadData?.phone && (
                    <a href={`https://wa.me/${leadData.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                      style={{ padding:'6px 12px', background:'var(--bg-2)', borderRadius:8, fontSize:12, border:'1px solid var(--border)', color:'var(--green)', textDecoration:'none' }}>
                      💬 {leadData.phone}
                    </a>
                  )}
                  {leadData?.email && (
                    <a href={`mailto:${leadData.email}`}
                      style={{ padding:'6px 12px', background:'var(--bg-2)', borderRadius:8, fontSize:12, border:'1px solid var(--border)', color:'var(--blue)', textDecoration:'none' }}>
                      📧 {leadData.email}
                    </a>
                  )}
                </div>
              )}

              {/* Unsub warning */}
              {current.unsub && !suppressed[current.id] && (
                <div style={{ background:'#f59e0b11', border:'1px solid var(--amber)', borderRadius:8, padding:'12px 14px' }}>
                  <div style={{ fontWeight:600, color:'var(--amber)', marginBottom:8 }}>⚠️ Unsubscribe request detected</div>
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
                <div style={{ background:'#22c55e11', border:'1px solid var(--green)', borderRadius:8, padding:'12px 14px', color:'var(--green)', fontWeight:500 }}>
                  ✓ {current.name} suppressed — removed from all future campaigns
                </div>
              )}

              {/* Message bubble */}
              <div style={{ background:'var(--bg-2)', borderRadius:12, borderTopLeftRadius:4, padding:'14px 16px', border:'1px solid var(--border)', fontSize:14, lineHeight:1.7, color:'var(--text-1)', position:'relative' }}>
                <div style={{ position:'absolute', top:10, right:12, fontSize:10, color:'var(--muted)' }}>{relTime(current.createdAt)}</div>
                {current.msg}
              </div>

              {/* Quick lead status actions */}
              {leadData && !suppressed[current.id] && leadData.status !== 'meeting_booked' && (
                <div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>Update Lead Status</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {STATUS_ACTIONS.filter(a => a.status !== leadData.status).map(a => (
                      <button key={a.status}
                        onClick={() => updateLeadStatus(a.status)}
                        disabled={updatingStatus}
                        style={{ padding:'7px 14px', borderRadius:8, border:`1px solid ${a.color}44`, background:`${a.color}11`, color:a.color, fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.15s' }}>
                        {updatingStatus ? '…' : a.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Claude Suggested Reply */}
              {current.status !== 'handled' && !suppressed[current.id] && (
                <div className="card" style={{ borderLeft:`3px solid ${CH_COLOR[current.channel]||'var(--blue)'}` }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--blue)', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
                    ✦ Claude Suggested Reply
                    {loadingReply && <span style={{ fontSize:11, fontWeight:400, color:'var(--muted)' }}>generating…</span>}
                  </div>
                  <textarea className="input" style={{ minHeight:100, fontSize:13, lineHeight:1.7, marginBottom:12 }}
                    value={getEditableReply(current)}
                    onChange={e => setEditableReplyFn(current.id, e.target.value)}
                    placeholder={loadingReply ? 'Generating reply…' : 'Reply will appear here'}
                  />
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => sendReply(current)} disabled={sending || sent[current.id]}>
                      {sent[current.id] ? '✓ Sent' : sending ? 'Sending…' : `${CH_ICON[current.channel]||'↗'} Send via ${current.channel}`}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(getEditableReply(current))}>
                      📋 Copy
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditableReplyFn(current.id, ''); fetchSuggestedReply(current); }}>
                      ↺ Regenerate
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => updateReply(current.id, { status:'handled' })}>
                      ✓ Mark Handled
                    </button>
                  </div>
                </div>
              )}

              {current.status === 'handled' && !suppressed[current.id] && (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'#22c55e11', borderRadius:8, border:'1px solid var(--green)' }}>
                  <span style={{ color:'var(--green)', fontWeight:600 }}>✓ This reply has been handled</span>
                  <button className="btn btn-ghost btn-sm" style={{ marginLeft:'auto' }} onClick={() => updateReply(current.id, { status:'read' })}>
                    Reopen
                  </button>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
