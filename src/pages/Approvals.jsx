import { useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';

const SAMPLE_EMAILS = [
  { id: 'e1', to: 'Ahmad Razali', company: 'Naim Holdings', subject: 'Professional Landscaping for Your Properties', preview: 'Dear Ahmad, I hope this message finds you well. We specialize in commercial landscaping...', campaignId: 5 },
  { id: 'e2', to: 'Sarah Lim', company: 'Maybank KCH', subject: 'Trusted Ground Maintenance Since 2015', preview: 'Hi Sarah, Our team has been maintaining corporate grounds across Kuching for 8 years...', campaignId: 5 },
  { id: 'e3', to: 'James Ong', company: 'Sarawak Plaza', subject: 'Landscaping Proposal — Sarawak Plaza', preview: 'Dear Mr. Ong, Following up on our services that have transformed many commercial properties...', campaignId: 5 },
  { id: 'e4', to: 'Lee Chen', company: 'CMS Group', subject: 'Professional Ground Care Services', preview: 'Hi Lee, Maintaining professional outdoor spaces is key to your brand image...', campaignId: 5 },
  { id: 'e5', to: 'Nurul Hana', company: 'Bintulu Port', subject: 'Commercial Landscaping — Customized Quote', preview: 'Dear Nurul, We work with several port authorities and industrial complexes in Sarawak...', campaignId: 5 },
];

export function Approvals() {
  const { campaigns, updateCampaign, showToast } = useAppStore(useShallow(s => ({

    campaigns: s.campaigns,
    updateCampaign: s.updateCampaign,
    showToast: s.showToast,
  })));

  const [flagged, setFlagged] = useState(new Set());
  const [approved, setApproved] = useState(new Set());
  const [showSuccess, setShowSuccess] = useState(false);
  const [approvedCount, setApprovedCount] = useState(0);

  const pendingCampaigns = campaigns.filter(c => c.status === 'awaiting_approval');

  function toggleFlag(id) {
    setFlagged(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function approveEmail(id) {
    setApproved(prev => new Set([...prev, id]));
  }

  function approveAll() {
    // Only approve emails that are NOT flagged
    const toApprove = SAMPLE_EMAILS.filter(e => !flagged.has(e.id));
    setApproved(new Set(toApprove.map(e => e.id)));
    setApprovedCount(toApprove.length);
    // Approve pending campaigns
    pendingCampaigns.forEach(c => updateCampaign(c.id, { status: 'active' }));
    setShowSuccess(true);
    showToast(`${toApprove.length} emails approved`, 'green');
  }

  return (
    <div className="page">
      {showSuccess && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:200,
          display:'flex', alignItems:'center', justifyContent:'center'
        }}>
          <div className="card" style={{
            padding:40, textAlign:'center', minWidth:320,
            background:'var(--card)', border:'1px solid var(--green)'
          }}>
            <div style={{ fontSize:48, marginBottom:16 }}>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{display:'block',margin:'0 auto'}}>
                <circle cx="32" cy="32" r="30" stroke="var(--green)" strokeWidth="2.5" fill="none"/>
                <path d="M20 33l8 8 16-16" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{strokeDasharray:40, strokeDashoffset:0, animation:'checkStroke 0.5s ease forwards'}}/>
              </svg>
            </div>
            <div style={{fontFamily:'var(--font-mono)', fontSize:32, color:'var(--green)', fontWeight:700}}>
              {approvedCount}
            </div>
            <div style={{color:'var(--text-2)', marginBottom:8}}>Emails approved & campaign activated</div>
            <button className="btn btn-green" style={{marginTop:16}} onClick={() => setShowSuccess(false)}>Done</button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4 fade-up">
        <div>
          <div className="breadcrumb">Campaigns / <span>Approvals</span></div>
          <h1 className="page-title" style={{marginTop:4}}>Email Approvals</h1>
        </div>
        <div style={{display:'flex', gap:8}}>
          <div style={{color:'var(--text-2)', fontSize:13, alignSelf:'center'}}>
            {flagged.size > 0 && <span style={{color:'var(--amber)'}}>{flagged.size} flagged</span>}
          </div>
          <button className="btn btn-green" onClick={approveAll}>
            Approve All Unflagged ({SAMPLE_EMAILS.filter(e => !flagged.has(e.id)).length})
          </button>
        </div>
      </div>

      {pendingCampaigns.length > 0 && (
        <div className="card fade-up-1 mb-4" style={{
          display:'flex', alignItems:'center', gap:12,
          background:'oklch(72% 0.18 65 / 0.08)', border:'1px solid oklch(72% 0.18 65 / 0.3)'
        }}>
          <div style={{width:8, height:8, borderRadius:'50%', background:'var(--amber)', flexShrink:0}}/>
          <div>
            <div style={{fontWeight:600, color:'var(--amber)'}}>Campaigns awaiting approval</div>
            <div style={{color:'var(--text-2)', fontSize:12}}>
              {pendingCampaigns.map(c => c.name).join(', ')} — will activate when emails are approved
            </div>
          </div>
        </div>
      )}

      <div style={{display:'flex', flexDirection:'column', gap:12}}>
        {SAMPLE_EMAILS.map((email, i) => {
          const isApproved = approved.has(email.id);
          const isFlagged = flagged.has(email.id);
          return (
            <div key={email.id} className={`card fade-up-${Math.min(i+2, 6)}`} style={{
              border: isApproved ? '1px solid var(--green)' : isFlagged ? '1px solid var(--amber)' : '1px solid var(--border)',
              opacity: isApproved ? 0.7 : 1,
              transition: 'all 0.2s'
            }}>
              <div style={{display:'flex', alignItems:'flex-start', gap:16}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:4}}>
                    <span style={{fontWeight:600}}>{email.to}</span>
                    <span style={{color:'var(--text-3)', fontSize:12}}>·</span>
                    <span style={{color:'var(--text-2)', fontSize:12}}>{email.company}</span>
                    {isFlagged && <span className="badge badge-amber" style={{fontSize:10}}>FLAGGED</span>}
                    {isApproved && <span className="badge badge-green" style={{fontSize:10}}>APPROVED</span>}
                  </div>
                  <div style={{fontWeight:500, marginBottom:4, fontSize:13}}>{email.subject}</div>
                  <div style={{color:'var(--text-2)', fontSize:12, lineHeight:1.5}}>{email.preview}</div>
                </div>
                <div style={{display:'flex', gap:8, flexShrink:0}}>
                  <button
                    className="btn"
                    style={{
                      fontSize:12, padding:'4px 12px',
                      border: isFlagged ? '1px solid var(--amber)' : '1px solid var(--border)',
                      color: isFlagged ? 'var(--amber)' : 'var(--text-2)',
                    }}
                    onClick={() => toggleFlag(email.id)}
                  >
                    {isFlagged ? '⚑ Flagged' : '⚐ Flag'}
                  </button>
                  {!isApproved && !isFlagged && (
                    <button className="btn btn-green" style={{fontSize:12, padding:'4px 12px'}} onClick={() => approveEmail(email.id)}>
                      Approve
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
