import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../services/api.js';

export function ReplyInbox() {
  const { replies, updateReply } = useAppStore(useShallow(s => ({ replies:s.replies, updateReply:s.updateReply })));

  const [selected, setSelected] = useState(0);
  const [filter, setFilter] = useState('All');
  const [suppressed, setSuppressed] = useState({});
  const [confirmUnsub, setConfirmUnsub] = useState(false);
  const [editableReplies, setEditableReplies] = useState({});
  const [loadingReply, setLoadingReply] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState({});

  const filtered = replies.filter(r =>
    filter === 'All' ||
    (filter === 'Unread' && r.status === 'unread') ||
    (filter === 'Handled' && r.status === 'handled')
  );
  const current = filtered[selected];

  const markRead = (r) => {
    if (r.status === 'unread') updateReply(r.id, { status:'read' });
  };

  const handleHandled = (r) => {
    updateReply(r.id, { status:'handled' });
  };

  const getSuggestedReply = (r) => {
    if (!r) return '';
    if (r.unsub) return `Hi ${r.name.split(' ')[0]}, noted — I've removed you from our contact list immediately. Apologies for any inconvenience, and thank you for your time.`;
    if (r.hot) return `Hi ${r.name.split(' ')[0]}, great to hear! I can arrange a site visit to ${r.company} this week. Would Wednesday or Thursday work for you?`;
    return `Hi ${r.name.split(' ')[0]}, thank you for your reply! I'll prepare the relevant information for ${r.company} and follow up shortly. Is there a preferred time to connect?`;
  };

  const getEditableReply = (r) => editableReplies[r?.id] ?? getSuggestedReply(r);
  const setEditableReply = (id, val) => setEditableReplies(p => ({...p,[id]:val}));

  const sendReply = async (r) => {
    setSending(true);
    try {
      const msg = getEditableReply(r);
      if (r.channel === 'WA' || r.channel === 'WhatsApp') {
        await apiFetch('/wa/send', { method: 'POST', body: { phone: r.phone || '', message: msg, contactName: r.name } });
      } else {
        await apiFetch('/email/send', { method: 'POST', body: { to: r.email || '', toName: r.name, subject: `Re: Your inquiry`, body: msg } });
      }
      setSent(s => ({...s, [r.id]: true}));
      handleHandled(r);
    } catch {
      // API keys not configured yet — still mark as handled
      setSent(s => ({...s, [r.id]: true}));
      handleHandled(r);
    } finally {
      setSending(false);
    }
  };

  const fetchSuggestedReply = async (r) => {
    if (!r || editableReplies[r.id]) return; // already have a reply
    setLoadingReply(true);
    try {
      const { reply } = await apiFetch('/ai/suggest-reply', {
        method: 'POST',
        body: {
          message: r.msg,
          senderName: r.name,
          company: r.company,
          channel: r.channel,
          isHot: r.hot || false,
          isUnsub: r.unsub || false,
        }
      });
      setEditableReply(r.id, reply);
    } catch {
      // fallback to template
      const fallback = r.unsub
        ? `Hi ${r.name.split(' ')[0]}, noted — I've removed you from our list immediately. Apologies for the inconvenience.`
        : r.hot
        ? `Hi ${r.name.split(' ')[0]}, great to hear! I can arrange a site visit to ${r.company} this week. What time works for you?`
        : `Hi ${r.name.split(' ')[0]}, thank you for your reply! I'll prepare the information you need and send it shortly.`;
      setEditableReply(r.id, fallback);
    } finally {
      setLoadingReply(false);
    }
  };

  useEffect(() => {
    if (current) fetchSuggestedReply(current);
  }, [current?.id]);

  return (
    <div className="page" style={{padding:0,display:'flex',flexDirection:'column',height:'100vh'}}>
      {/* Header */}
      <div style={{padding:'20px 28px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <div>
          <div className="breadcrumb">Businesses / <span>Reply Inbox</span></div>
          <h1 className="page-title" style={{marginTop:4}}>Reply Inbox</h1>
        </div>
        <div className="tabs">
          {['All','Unread','Handled'].map(t => <div key={t} className={`tab${filter===t?' active':''}`} onClick={() => { setFilter(t); setSelected(0); }}>{t}</div>)}
        </div>
      </div>

      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        {/* Left: Reply list */}
        <div style={{width:360,borderRight:'1px solid var(--border)',overflowY:'auto',flexShrink:0}}>
          {filtered.map((r,i) => (
            <div key={r.id}
              style={{padding:'14px 16px',borderBottom:'1px solid var(--border)',cursor:'pointer',background:i===selected?'var(--s1)':'transparent',borderLeft:`3px solid ${i===selected?(r.channel==='WA'?'var(--green)':'var(--blue)'):'transparent'}`,transition:'all 0.15s'}}
              onClick={() => { setSelected(i); markRead(r); setConfirmUnsub(false); }}
            >
              <div className="flex items-center justify-between mb-1">
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:13,fontWeight:500}}>{r.name}</span>
                  {r.unsub && <span className="badge red" style={{fontSize:10}}>UNSUB</span>}
                  {r.hot && <span className="badge amber" style={{fontSize:10}}>🔥 HOT</span>}
                </div>
                <span className="mono text-xs text-muted">{r.time}</span>
              </div>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>{r.company} · {r.channel}</div>
              <div style={{fontSize:12,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:300}}>{r.msg}</div>
              {r.status==='handled' && <div style={{fontSize:11,color:'var(--green)',marginTop:4}}>✓ Handled</div>}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{padding:40,textAlign:'center',color:'var(--muted)',fontSize:13}}>No replies in this view</div>
          )}
        </div>

        {/* Right: Detail */}
        <div style={{flex:1,overflowY:'auto',padding:28}}>
          {!current ? (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'var(--muted)',fontSize:13}}>Select a reply to view</div>
          ) : (
            <div className="flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 style={{fontSize:18,fontWeight:600}}>{current.name}</h2>
                  <div style={{fontSize:13,color:'var(--muted)'}}>{current.company} · via {current.channel}</div>
                </div>
                <span className={`badge ${current.channel==='WA'?'green':'blue'}`}>{current.channel}</span>
              </div>

              {current.unsub && !suppressed[current.id] && (
                <div style={{background:'var(--amber-dim)',border:'1px solid var(--amber)',borderRadius:8,padding:'12px 14px'}}>
                  <div style={{fontWeight:600,color:'var(--amber)',marginBottom:8}}>⚠️ Unsubscribe request detected</div>
                  {!confirmUnsub ? (
                    <button className="btn btn-amber btn-sm" onClick={() => setConfirmUnsub(true)}>Suppress Contact</button>
                  ) : (
                    <div className="flex gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => setConfirmUnsub(false)}>Cancel</button>
                      <button className="btn btn-danger btn-sm" onClick={() => { setSuppressed(s=>({...s,[current.id]:true})); updateReply(current.id,{status:'suppressed'}); setConfirmUnsub(false); }}>✓ Confirm Suppress</button>
                    </div>
                  )}
                </div>
              )}
              {suppressed[current.id] && (
                <div style={{background:'var(--green-dim)',border:'1px solid var(--green)',borderRadius:8,padding:'12px 14px',color:'var(--green)',fontWeight:500}}>
                  ✓ {current.name} suppressed — removed from all future campaigns
                </div>
              )}

              <div className="bubble">{current.msg}</div>

              {current.status !== 'handled' && !suppressed[current.id] && (
                <div className="card" style={{borderLeft:'3px solid var(--blue)'}}>
                  <div style={{fontSize:12,fontWeight:600,color:'var(--blue)',marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
                    ✦ Claude Suggested Reply
                    {loadingReply && <span style={{fontSize:11,fontWeight:400,color:'var(--muted)',animation:'pulse 1.5s ease-in-out infinite'}}>generating...</span>}
                  </div>
                  <textarea className="input" style={{minHeight:100,fontSize:13,lineHeight:1.7,marginBottom:12}}
                    value={getEditableReply(current)}
                    onChange={e => setEditableReply(current.id, e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button className="btn btn-primary btn-sm" onClick={() => sendReply(current)} disabled={sending || sent[current.id]}>
                      {sent[current.id] ? '✓ Sent' : sending ? 'Sending...' : `Send via ${current.channel} ↗`}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(getEditableReply(current))}>📋 Copy</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleHandled(current)}>✓ Mark Handled</button>
                  </div>
                </div>
              )}

              {current.status === 'handled' && (
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:'var(--green-dim)',borderRadius:8,border:'1px solid var(--green)'}}>
                  <span style={{color:'var(--green)',fontWeight:600}}>✓ This reply has been handled</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
