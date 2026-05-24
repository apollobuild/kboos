import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../../services/api.js';

const ITEM = (isActive) => ({
  padding: '8px 16px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  background: isActive ? 'var(--s2)' : 'transparent',
  transition: 'background 0.1s',
});

export function GlobalSearch({ open, onClose }) {
  const { setPage, openCampaignPipeline } = useAppStore(useShallow(s => ({
    setPage: s.setPage,
    openCampaignPipeline: s.openCampaignPipeline,
  })));

  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults(null);
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [open]);

  function doSearch(q) {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!q || q.length < 2) { setResults(null); setLoading(false); return; }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const data = await apiFetch(`/search?q=${encodeURIComponent(q)}`);
        setResults(data);
        setCursor(0);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  const bizItems = results?.businesses || [];
  const campItems = results?.campaigns || [];
  const leadItems = results?.leads || [];
  const replyItems = results?.replies || [];

  const bizStart = 0;
  const campStart = bizItems.length;
  const leadStart = campStart + campItems.length;
  const replyStart = leadStart + leadItems.length;
  const total = replyStart + replyItems.length;

  function navigateTo(type, data) {
    if (type === 'business') setPage('business-detail', { bizId: data.id });
    else if (type === 'campaign') openCampaignPipeline(data.id);
    else if (type === 'lead') setPage('lead-intelligence');
    else if (type === 'reply') setPage('unified-inbox');
    onClose();
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, total - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Enter' && total > 0) {
      if (cursor < campStart) navigateTo('business', bizItems[cursor]);
      else if (cursor < leadStart) navigateTo('campaign', campItems[cursor - campStart]);
      else if (cursor < replyStart) navigateTo('lead', leadItems[cursor - leadStart]);
      else navigateTo('reply', replyItems[cursor - replyStart]);
    }
  }

  const GROUP_LABEL = {
    fontSize: 10, color: 'var(--muted)',
    textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600,
    padding: '8px 16px 4px',
  };

  if (!open) return null;

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:9999, background:'oklch(0% 0 0 / 0.55)', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:72 }}
      onClick={onClose}
    >
      <div
        style={{ width:'100%', maxWidth:600, margin:'0 16px', background:'var(--s1)', borderRadius:12, border:'1px solid var(--border)', boxShadow:'0 24px 60px rgba(0,0,0,0.55)', overflow:'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Input bar */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderBottom:'1px solid var(--border)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color:'var(--muted)', flexShrink:0 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); doSearch(e.target.value); }}
            onKeyDown={handleKeyDown}
            placeholder="Search leads, campaigns, businesses, conversations..."
            style={{ flex:1, background:'none', border:'none', outline:'none', color:'var(--text)', fontSize:14, fontFamily:'var(--font-sans)' }}
          />
          {loading && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color:'var(--muted)', flexShrink:0, animation:'spin 0.8s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          )}
          <kbd style={{ fontSize:10, color:'var(--muted)', background:'var(--s2)', border:'1px solid var(--border)', borderRadius:4, padding:'2px 6px', flexShrink:0 }}>esc</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight:440, overflowY:'auto' }}>
          {/* Empty state */}
          {!results && !loading && (
            <div style={{ padding:'24px 16px', textAlign:'center', color:'var(--muted)', fontSize:12, display:'flex', flexDirection:'column', gap:10, alignItems:'center' }}>
              <div>Type 2+ characters to search across your workspace</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'center' }}>
                {['Leads', 'Campaigns', 'Businesses', 'Conversations'].map(t => (
                  <span key={t} style={{ fontSize:10, background:'var(--s2)', color:'var(--muted)', borderRadius:4, padding:'2px 8px', border:'1px solid var(--border)' }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {results && total === 0 && (
            <div style={{ padding:'28px 16px', textAlign:'center', color:'var(--muted)', fontSize:13 }}>
              No results for "{query}"
            </div>
          )}

          {/* Businesses */}
          {bizItems.length > 0 && (
            <div>
              <div style={GROUP_LABEL}>Businesses</div>
              {bizItems.map((item, i) => {
                const isActive = cursor === bizStart + i;
                return (
                  <div key={item.id} style={ITEM(isActive)} onClick={() => navigateTo('business', item)}>
                    <div style={{ width:28, height:28, borderRadius:6, background:item.color||'var(--blue)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'#fff', fontWeight:700, flexShrink:0 }}>
                      {(item.name||'?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
                      <div style={{ fontSize:10, color:'var(--muted)' }}>{item.industry}</div>
                    </div>
                    <span style={{ fontSize:10, color:'var(--muted)' }}>Business →</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Campaigns */}
          {campItems.length > 0 && (
            <div>
              <div style={GROUP_LABEL}>Campaigns</div>
              {campItems.map((item, i) => {
                const isActive = cursor === campStart + i;
                return (
                  <div key={item.id} style={ITEM(isActive)} onClick={() => navigateTo('campaign', item)}>
                    <span style={{ fontSize:16, flexShrink:0, color:'var(--blue)' }}>▦</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
                      <div style={{ fontSize:10, color:'var(--muted)' }}>{item.bizName}</div>
                    </div>
                    <span style={{ fontSize:10, color: item.status === 'active' ? 'var(--green)' : 'var(--muted)', fontWeight:600 }}>
                      {item.status === 'active' ? '● Live' : item.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Leads */}
          {leadItems.length > 0 && (
            <div>
              <div style={GROUP_LABEL}>Leads</div>
              {leadItems.map((item, i) => {
                const isActive = cursor === leadStart + i;
                return (
                  <div key={item.id} style={ITEM(isActive)} onClick={() => navigateTo('lead', item)}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--s2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'var(--text)', fontWeight:700, flexShrink:0, border:'1px solid var(--border)' }}>
                      {(item.name||'?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
                      <div style={{ fontSize:10, color:'var(--muted)' }}>
                        {item.company}{item.title ? ` · ${item.title}` : ''}
                      </div>
                    </div>
                    {item.score > 0 && (
                      <span style={{ fontSize:10, color:'var(--blue)', background:'var(--blue-dim)', borderRadius:4, padding:'2px 6px', fontFamily:'var(--font-mono)', fontWeight:600 }}>{item.score}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Conversations */}
          {replyItems.length > 0 && (
            <div>
              <div style={GROUP_LABEL}>Conversations</div>
              {replyItems.map((item, i) => {
                const isActive = cursor === replyStart + i;
                const chanIcon = item.channel === 'email' ? '✉' : item.channel === 'wa' ? '💬' : '📞';
                return (
                  <div key={item.id} style={ITEM(isActive)} onClick={() => navigateTo('reply', item)}>
                    <span style={{ fontSize:14, flexShrink:0 }}>{chanIcon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{item.name} · {item.company}</div>
                      <div style={{ fontSize:10, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:360 }}>{item.msg}</div>
                    </div>
                    {item.status === 'unread' && (
                      <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--blue)', flexShrink:0 }}/>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        {total > 0 && (
          <div style={{ padding:'6px 16px', borderTop:'1px solid var(--border)', display:'flex', gap:12, fontSize:10, color:'var(--muted)' }}>
            <span>↑↓ navigate</span>
            <span>↵ open</span>
            <span>esc close</span>
            <span style={{ marginLeft:'auto' }}>{total} result{total !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}
