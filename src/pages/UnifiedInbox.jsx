import { useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../services/api.js';
import { Select } from '../components/ui/Select.jsx';
import { BizAvatar } from '../components/ui/BizAvatar.jsx';

const CH_ICON  = { wa:'💬', whatsapp:'💬', email:'✉', voice:'📞' };
const CH_COLOR = { wa:'var(--green)', whatsapp:'var(--green)', email:'var(--blue)', voice:'var(--amber)' };

function relTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getBizForReply(r, leads, campaigns, businesses) {
  const lead = leads.find(l => l.id === r.leadId);
  const camp = campaigns.find(c => c.id === lead?.campaignId);
  return businesses.find(b => b.id === camp?.bizId);
}

const TITLE_MAP = {
  All:   'Unified Inbox',
  email: 'Email Inbox',
  wa:    'WhatsApp Inbox',
  voice: 'Voice Outcomes',
};

const CHANNEL_TABS = [
  { key: 'All',   label: 'All' },
  { key: 'email', label: '✉ Email' },
  { key: 'wa',    label: '💬 WhatsApp' },
  { key: 'voice', label: '📞 Voice' },
];

const STATUS_TABS = [
  { key: 'All',     label: 'All' },
  { key: 'unread',  label: 'Unread' },
  { key: 'handled', label: 'Handled' },
];

export function UnifiedInbox({ defaultChannel = 'All' }) {
  const { replies, leads, campaigns, businesses, updateReply, showToast } = useAppStore(
    useShallow(s => ({
      replies:    s.replies,
      leads:      s.leads,
      campaigns:  s.campaigns,
      businesses: s.businesses,
      updateReply: s.updateReply,
      showToast:  s.showToast,
    }))
  );

  const [channelTab, setChannelTab]   = useState(defaultChannel);
  const [statusTab,  setStatusTab]    = useState('All');
  const [bizFilter,  setBizFilter]    = useState('All');
  const [selected,   setSelected]     = useState(null);
  const [draft,      setDraft]        = useState('');
  const [suggesting, setSuggesting]   = useState(false);

  const normaliseChannel = (ch = '') => ch.toLowerCase();

  const filtered = replies.filter(r => {
    const ch = normaliseChannel(r.channel);
    const matchCh =
      channelTab === 'All'   ? true :
      channelTab === 'email' ? (ch === 'email') :
      channelTab === 'wa'    ? (ch === 'wa' || ch === 'whatsapp') :
      channelTab === 'voice' ? (ch === 'voice') : true;

    const matchStatus =
      statusTab === 'All'     ? true :
      statusTab === 'unread'  ? r.status === 'unread' :
      statusTab === 'handled' ? r.status === 'handled' : true;

    const biz = getBizForReply(r, leads, campaigns, businesses);
    const matchBiz = bizFilter === 'All' || biz?.id === bizFilter;

    return matchCh && matchStatus && matchBiz;
  });

  const unreadCount = replies.filter(r => r.status === 'unread').length;
  const current     = selected ? filtered.find(r => r.id === selected) ?? null : null;

  const bizOptions = [
    { value: 'All', label: 'All Businesses' },
    ...businesses.map(b => ({ value: b.id, label: b.name })),
  ];

  function selectReply(id) {
    setSelected(id);
    setDraft('');
    const r = replies.find(x => x.id === id);
    if (r?.status === 'unread') {
      updateReply(id, { status: 'read' });
    }
  }

  async function handleSuggestReply() {
    if (!current || suggesting) return;
    setSuggesting(true);
    try {
      const result = await apiFetch('/ai/suggest-reply', {
        method: 'POST',
        body: {
          message:    current.msg,
          senderName: current.name,
          company:    current.company,
          channel:    current.channel,
        },
      });
      setDraft(result.reply || result.suggestion || '');
    } catch {
      showToast('Could not generate suggestion', 'red');
    } finally {
      setSuggesting(false);
    }
  }

  async function handleAction(status) {
    if (!current) return;
    try {
      await apiFetch('/replies/' + current.id, { method: 'PATCH', body: { status } });
      updateReply(current.id, { status });
      useAppStore.getState().showToast('Updated ✓', 'green');
    } catch {
      showToast('Update failed', 'red');
    }
  }

  function handleSendReply() {
    if (!draft.trim()) return;
    showToast('Reply sent ✓', 'green');
    setDraft('');
    handleAction('handled');
  }

  const pageTitle = TITLE_MAP[channelTab] ?? 'Unified Inbox';

  return (
    <div className="page" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100vh' }}>

      {/* Top header */}
      <div style={{ padding: '18px 24px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 className="page-title" style={{ margin: 0 }}>{pageTitle}</h1>
          {unreadCount > 0 && (
            <span style={{ background: 'var(--blue)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>
              {unreadCount}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Select
            value={bizFilter}
            onChange={setBizFilter}
            options={bizOptions}
          />
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left column — list */}
        <div style={{ width: 380, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

          {/* Filter row */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Channel tabs */}
            <div style={{ display: 'flex', gap: 4 }}>
              {CHANNEL_TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => { setChannelTab(t.key); setSelected(null); }}
                  style={{
                    flex: 1, padding: '5px 6px', borderRadius: 6, border: '1px solid var(--border)',
                    background: channelTab === t.key ? 'var(--blue)' : 'var(--s1)',
                    color: channelTab === t.key ? '#fff' : 'var(--muted)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {/* Status tabs */}
            <div style={{ display: 'flex', gap: 4 }}>
              {STATUS_TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => { setStatusTab(t.key); setSelected(null); }}
                  style={{
                    flex: 1, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)',
                    background: statusTab === t.key ? 'var(--s2)' : 'transparent',
                    color: statusTab === t.key ? 'var(--text)' : 'var(--muted)',
                    fontSize: 11, cursor: 'pointer', transition: 'all 0.12s',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reply list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                No messages in this view
              </div>
            )}
            {filtered.map(r => {
              const isActive  = r.id === selected;
              const ch        = normaliseChannel(r.channel);
              const chColor   = CH_COLOR[ch] || 'var(--muted)';
              const chIcon    = CH_ICON[ch]  || '💬';
              const biz       = getBizForReply(r, leads, campaigns, businesses);
              const preview   = (r.msg || '').slice(0, 60) + ((r.msg || '').length > 60 ? '…' : '');

              return (
                <div
                  key={r.id}
                  onClick={() => selectReply(r.id)}
                  style={{
                    padding: '11px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                    background: isActive ? 'var(--s1)' : 'transparent',
                    borderLeft: `3px solid ${isActive ? chColor : 'transparent'}`,
                    position: 'relative', transition: 'all 0.1s',
                  }}
                >
                  {/* Unread pulse dot */}
                  {r.status === 'unread' && (
                    <span style={{
                      position: 'absolute', top: 12, right: 12,
                      width: 7, height: 7, borderRadius: '50%', background: 'var(--blue)',
                      boxShadow: '0 0 0 2px var(--blue-dim)',
                    }} />
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: chColor, flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontWeight: r.status === 'unread' ? 700 : 600, fontSize: 13, color: 'var(--text)' }}>
                        {r.name || '—'}
                      </span>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>{relTime(r.createdAt)}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, paddingLeft: 13 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{r.company || '—'}</span>
                    {biz && (
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 4,
                        background: 'var(--s2)', color: 'var(--muted)', border: '1px solid var(--border)',
                      }}>
                        {biz.name}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: chColor, marginLeft: 'auto' }}>{chIcon}</span>
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--muted)', paddingLeft: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {preview || <em>No message</em>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panel — detail */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!current ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, flexDirection: 'column', gap: 10, color: 'var(--muted)' }}>
              <span style={{ fontSize: 28 }}>📬</span>
              <span style={{ fontSize: 13 }}>Select a conversation to reply</span>
            </div>
          ) : (
            <ConversationDetail
              reply={current}
              leads={leads}
              campaigns={campaigns}
              businesses={businesses}
              draft={draft}
              setDraft={setDraft}
              suggesting={suggesting}
              onSuggest={handleSuggestReply}
              onSend={handleSendReply}
              onAction={handleAction}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ConversationDetail({ reply: r, leads, campaigns, businesses, draft, setDraft, suggesting, onSuggest, onSend, onAction }) {
  const ch      = (r.channel || '').toLowerCase();
  const chColor = CH_COLOR[ch] || 'var(--blue)';
  const chIcon  = CH_ICON[ch]  || '💬';
  const biz     = getBizForReply(r, leads, campaigns, businesses);
  const lead    = leads.find(l => l.id === r.leadId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Conversation header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {biz ? (
              <BizAvatar id={biz.id} name={biz.name} color={biz.color || 'blue'} size={36} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: chColor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                {chIcon}
              </div>
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{r.name || '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {r.company || '—'}{biz ? ` · ${biz.name}` : ''}
              </div>
            </div>
          </div>
          <span style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 8,
            background: chColor + '22', color: chColor, fontWeight: 700,
          }}>
            {chIcon} {r.channel || '—'}
          </span>
        </div>

        {/* Lead status badges */}
        {lead && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {lead.status && (
              <span style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 700,
                background: lead.status === 'hot' ? 'var(--amber)' : lead.status === 'meeting_booked' ? 'var(--green)' : 'var(--s2)',
                color: lead.status === 'hot' ? '#fff' : lead.status === 'meeting_booked' ? '#fff' : 'var(--muted)',
              }}>
                {lead.status.replace(/_/g, ' ')}
              </span>
            )}
            {lead.score != null && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'var(--s2)', color: 'var(--muted)', fontWeight: 700 }}>
                Score: {lead.score}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Message body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Inbound message */}
        <div className="card" style={{ borderLeft: `3px solid ${chColor}` }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
            {chIcon} Inbound · {relTime(r.createdAt)}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
            {r.msg || <em style={{ color: 'var(--muted)' }}>No message body</em>}
          </div>
        </div>

        {/* Draft area */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)' }}>✦ Your Reply</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={onSuggest}
              disabled={suggesting}
              style={{ fontSize: 11 }}
            >
              {suggesting ? '✦ Generating…' : '✦ Suggest Reply'}
            </button>
          </div>
          <textarea
            className="input"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Type your reply or use Suggest Reply…"
            style={{ minHeight: 80, fontSize: 13, lineHeight: 1.7, fontFamily: 'inherit', resize: 'vertical', width: '100%', boxSizing: 'border-box', marginBottom: 10 }}
          />
          <button
            className="btn btn-blue btn-sm"
            onClick={onSend}
            disabled={!draft.trim()}
          >
            {chIcon} Send Reply
          </button>
        </div>

        {/* Action row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onAction('read')}
          >
            Mark Read
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onAction('handled')}
          >
            Mark Handled
          </button>
          <button
            className="btn btn-sm"
            onClick={() => onAction('hot')}
            style={{ background: 'var(--amber)', color: '#fff', border: 'none' }}
          >
            🔥 Hot
          </button>
          <button
            className="btn btn-green btn-sm"
            onClick={() => onAction('meeting_booked')}
          >
            📅 Booked
          </button>
        </div>
      </div>
    </div>
  );
}
