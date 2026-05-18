import { useWalletStore } from '../../store/useWalletStore.js';

export function CreditWalletWidget({ onClick }) {
  const wallet = useWalletStore(s => s.wallet);
  const bal = wallet.balance || 0;
  const color = bal > 200 ? 'var(--green)' : bal > 50 ? 'var(--amber)' : 'var(--red)';
  return (
    <div onClick={onClick} style={{
      margin:'0 16px 8px', padding:'8px 12px', borderRadius:8,
      background:'var(--s1)', border:'1px solid var(--border)',
      cursor:'pointer', transition:'background 0.15s',
    }}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4}}>
        <span style={{fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em'}}>Credit Wallet</span>
        <span className="mono" style={{fontSize:12, color, fontWeight:600}}>RM {bal}</span>
      </div>
      <div style={{height:3, background:'var(--border)', borderRadius:2, overflow:'hidden'}}>
        <div style={{width:`${Math.min(100,(bal/500)*100)}%`, height:'100%', background:color, borderRadius:2, transition:'width 0.4s'}}/>
      </div>
    </div>
  );
}
