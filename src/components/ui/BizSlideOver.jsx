import { useAppStore } from '../../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { BizAvatar } from '../ui/BizAvatar.jsx';

export function BizSlideOver({ biz, onClose, onManage, onPortal, onRemove }) {
  const campaigns = useAppStore(useShallow(s => s.campaigns.filter(c => c.bizId === biz.id)));

  const stats = [
    { label: 'Campaigns', val: biz.campaigns || campaigns.length },
    { label: 'Total Leads', val: (biz.leads || 0).toLocaleString() },
    { label: 'Hot Leads', val: biz.hot || 0, color: 'amber' },
    { label: 'Spend', val: biz.spend || 'RM 0', color: 'green' },
  ];

  return (
    <div className="slide-over-overlay" onClick={onClose}>
      <div className="slide-over-panel" onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 20px 0' }}>
          <div className="flex items-center justify-between mb-4">
            <button className="btn btn-ghost btn-xs" onClick={onClose}>✕ Close</button>
            <button
              className="btn btn-sm"
              style={{ color: 'var(--red)', border: '1px solid var(--red)', fontSize: 12 }}
              onClick={onRemove}
            >Remove Business</button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <BizAvatar id={biz.id} color={biz.color} size={52} />
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.02 }}>{biz.name}</h2>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{biz.industry}</div>
              <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                {biz.brief === 'approved' && <span className="badge green">✓ Brief Approved</span>}
                {biz.brief === 'pending' && <span className="badge amber">Brief Pending</span>}
                {biz.brief === 'none' && <span className="badge gray">No Brief</span>}
                {biz.status === 'setup' && <span className="badge amber">In Setup</span>}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <button className="btn btn-blue" style={{ flex: 1 }} onClick={onManage}>Manage Leads →</button>
            <button className="btn btn-ghost" onClick={onPortal}>Client Portal ↗</button>
          </div>
        </div>

        <div style={{ padding: '0 20px 20px', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: 'var(--s2)', padding: '10px 12px', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-mono)', color: s.color ? `var(--${s.color})` : 'var(--text)' }}>{s.val}</div>
              </div>
            ))}
          </div>

          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Campaigns</div>
          {campaigns.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>No campaigns yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {campaigns.map(c => (
                <div key={c.id} style={{ background: 'var(--s2)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{c.leads} leads · {c.tier}</div>
                  </div>
                  <span className={`badge ${c.status === 'active' ? 'green' : 'gray'}`}>{c.status}</span>
                </div>
              ))}
            </div>
          )}

          {biz.brief && biz.brief !== 'none' && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Brief</div>
              <div style={{ background: 'var(--s2)', borderRadius: 8, padding: 12, fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
                {typeof biz.brief === 'string' && biz.brief !== 'approved' && biz.brief !== 'pending' ? biz.brief : 'Brief on file.'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
