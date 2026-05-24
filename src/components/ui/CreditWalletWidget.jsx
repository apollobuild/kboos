import { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api.js';
import { useTenant } from '../../hooks/useTenant.js';

export function CreditWalletWidget({ onClick }) {
  const { formatCurrency } = useTenant();
  const [spend, setSpend] = useState(null);

  useEffect(() => {
    apiFetch('/wallet/spend-summary').then(setSpend).catch(() => {});
  }, []);

  const total  = spend?.total  || 0;
  const budget = spend?.budget || 1000;
  const pct    = Math.min((total / budget) * 100, 100);
  const color  = pct > 80 ? 'var(--red)' : pct > 60 ? 'var(--amber)' : 'var(--green)';
  const pctLabel = pct < 1 && total > 0 ? '< 1%' : `${pct.toFixed(0)}%`;

  return (
    <div onClick={onClick} style={{
      margin: '0 16px 8px', padding: '8px 12px', borderRadius: 8,
      background: 'var(--s1)', border: `1px solid ${pct > 80 ? 'rgba(255,50,50,0.3)' : 'var(--border)'}`,
      cursor: 'pointer', transition: 'all 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          This Month
        </span>
        <span className="mono" style={{ fontSize: 12, color, fontWeight: 600 }}>
          {formatCurrency(total)}
        </span>
      </div>
      <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.5s' }} />
      </div>
      <div style={{ fontSize: 10, color: pct > 80 ? color : 'var(--muted)' }}>
        {spend ? `${pctLabel} of ${formatCurrency(budget)} budget` : 'API spend · click to view'}
      </div>
    </div>
  );
}
