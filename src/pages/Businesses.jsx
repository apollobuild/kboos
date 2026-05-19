import { useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { BizAvatar } from '../components/ui/BizAvatar.jsx';
import { BizSlideOver } from '../components/ui/BizSlideOver.jsx';

export function Businesses() {
  const { businesses, setPage, setSelectedBiz, removeBusiness } = useAppStore(useShallow(s => ({
    businesses: s.businesses,
    setPage: s.setPage,
    setSelectedBiz: s.setSelectedBiz,
    removeBusiness: s.removeBusiness,
  })));

  const [openBiz, setOpenBiz] = useState(null);

  function handleManage(bizId) {
    setSelectedBiz(bizId);
    setPage('leads');
  }

  function handleRemove(e, biz) {
    e.stopPropagation();
    if (!window.confirm(`Remove "${biz.name}"? This cannot be undone.`)) return;
    removeBusiness(biz.id);
    setOpenBiz(null);
  }

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-4 fade-up">
        <div>
          <div className="breadcrumb">Businesses / <span>All Businesses</span></div>
          <h1 className="page-title" style={{marginTop:4}}>All Businesses</h1>
        </div>
        <button className="btn btn-green" onClick={() => setPage('add-business')}>＋ Add Business</button>
      </div>
      <div className="grid-3 fade-up-1">
        {businesses.map(b => (
          <div key={b.id} className="card" style={{transition:'all 0.2s',cursor:'pointer'}}
            onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform=''}
            onClick={() => setOpenBiz(b)}
          >
            <div className="flex items-center gap-3 mb-3">
              <BizAvatar id={b.id} name={b.name} color={b.color} size={40}/>
              <div style={{minWidth:0,flex:1}}>
                <div style={{fontWeight:600,fontSize:14}}>{b.name}</div>
                <div style={{fontSize:12,color:'var(--muted)'}}>{b.industry}</div>
                {b.contact && <div style={{fontSize:11,color:'var(--muted)',marginTop:1}}>👤 {b.contact}</div>}
              </div>
            </div>
            <div className="grid-2 mb-3" style={{gap:8}}>
              {[
                {label:'Campaigns',val:b.campaigns},
                {label:'Total Leads',val:(b.leads||0).toLocaleString()},
                {label:'Hot Leads',val:b.hot,color:'amber'},
                {label:'Pipeline',val:b.hot && b.avgDealValue ? `RM ${((b.hot||0)*(b.avgDealValue||0)).toLocaleString()}` : '—',color:'green'},
              ].map(s => (
                <div key={s.label} style={{background:'var(--s2)',borderRadius:8,padding:'8px 10px'}}>
                  <div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:2}}>{s.label}</div>
                  <div className="mono" style={{fontSize:14,fontWeight:500,color:s.color?`var(--${s.color})`:'var(--text)'}}>{s.val}</div>
                </div>
              ))}
            </div>
            {b.commissionValue && (
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:8,padding:'5px 8px',background:'var(--s2)',borderRadius:6}}>
                Commission: {b.commissionType==='percent' ? `${b.commissionValue}% per sale` : b.commissionType==='flat_lead' ? `RM ${b.commissionValue}/lead` : b.commissionType==='flat_sale' ? `RM ${b.commissionValue}/sale` : `RM ${b.commissionValue}/mo retainer`}
              </div>
            )}
            <div className="flex items-center justify-between mb-3">
              <span style={{fontSize:11,color:'var(--muted)'}}>Brief</span>
              {b.brief==='approved' && <span className="badge green">✓ Approved</span>}
              {b.brief==='pending' && <span className="badge amber">Pending</span>}
              {b.brief==='none' && <span className="badge gray">None</span>}
            </div>
            {b.status==='setup' && <div className="badge amber mb-3" style={{width:'100%',justifyContent:'center'}}>In Setup</div>}
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" style={{flex:1}} onClick={e => { e.stopPropagation(); handleManage(b.id); }}>Manage →</button>
              <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setPage('client-portal'); }}>Portal ↗</button>
              <button
                className="btn btn-sm"
                style={{color:'var(--red)', border:'1px solid var(--red)', padding:'3px 8px'}}
                onClick={(e) => handleRemove(e, b)}
              >✕</button>
            </div>
          </div>
        ))}
      </div>

      {openBiz && (
        <BizSlideOver
          biz={openBiz}
          onClose={() => setOpenBiz(null)}
          onManage={() => { handleManage(openBiz.id); setOpenBiz(null); }}
          onPortal={() => { setPage('client-portal'); setOpenBiz(null); }}
          onRemove={(e) => handleRemove({ stopPropagation: () => {} }, openBiz)}
        />
      )}
    </div>
  );
}
