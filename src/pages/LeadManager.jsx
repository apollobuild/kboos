import { useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { LeadStatusBadge } from '../components/ui/LeadStatusBadge.jsx';
import { ScoreDisplay } from '../components/ui/ScoreDisplay.jsx';
import { LeadSlideOver } from '../components/leads/LeadSlideOver.jsx';
import { leadsService } from '../services/leads.js';

export function LeadManager() {
  const { leads, updateLead, bulkUpdateLeads } = useAppStore(useShallow(s => ({ leads:s.leads, updateLead:s.updateLead, bulkUpdateLeads:s.bulkUpdateLeads })));

  const [selected, setSelected] = useState([]);
  const [slideOver, setSlideOver] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [scoreFilter, setScoreFilter] = useState('All');
  const [search, setSearch] = useState('');

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s,id]);
  const toggleAll = () => setSelected(s => s.length === filtered.length ? [] : filtered.map(l=>l.id));

  const filtered = leads.filter(l =>
    (statusFilter==='All' || l.status===statusFilter) &&
    (scoreFilter==='All' || l.scoreLabel===scoreFilter) &&
    (search==='' || l.name.toLowerCase().includes(search.toLowerCase()) || l.company.toLowerCase().includes(search.toLowerCase()))
  );

  const rowStyle = (l) => {
    if (l.status==='bounced') return {borderLeft:'2px solid var(--red)',background:'oklch(55% 0.22 25 / 0.04)'};
    if (l.status==='unsubscribed') return {opacity:0.5};
    if (l.status==='low_quality') return {opacity:0.4};
    return {};
  };

  const stats = [
    {label:'Total Leads',val:leads.length.toLocaleString(),color:'text'},
    {label:'Hot Leads',val:leads.filter(l=>l.status==='hot').length,color:'amber'},
    {label:'Meetings',val:leads.filter(l=>l.status==='meeting_booked').length,color:'green'},
    {label:'Replied',val:leads.filter(l=>l.status==='replied').length,color:'cyan'},
  ];

  const handleExport = () => {
    const toExport = selected.length > 0 ? leads.filter(l=>selected.includes(l.id)) : filtered;
    leadsService.exportCSV(toExport);
  };

  const handleBulkStatus = (status) => {
    bulkUpdateLeads(selected, { status });
    setSelected([]);
  };

  return (
    <div className="page">
      {slideOver && <LeadSlideOver lead={slideOver} onClose={() => setSlideOver(null)}/>}

      <div className="flex items-center justify-between mb-3 fade-up">
        <div>
          <div className="breadcrumb">Campaigns / <span>Lead Manager</span></div>
          <h1 className="page-title" style={{marginTop:4}}>Lead Manager</h1>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleExport}>⬇ Export CSV</button>
      </div>

      <div className="grid-4 mb-4 fade-up-1">
        {stats.map(s => (
          <div key={s.label} className="card-sm" style={{textAlign:'center'}}>
            <div className="mono" style={{fontSize:22,fontWeight:500,color:s.color==='text'?'var(--text)':`var(--${s.color})`}}>{s.val}</div>
            <div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-3 fade-up-2" style={{flexWrap:'wrap'}}>
        <input className="input" style={{maxWidth:240}} placeholder="Search leads..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <div className="tabs">
          {['All','hot','meeting_booked','email_sent','replied','bounced'].map(s => (
            <div key={s} className={`tab${statusFilter===s?' active':''}`} style={{fontSize:11,padding:'4px 10px'}} onClick={() => setStatusFilter(s)}>
              {s==='All'?'All':s.replace(/_/g,' ')}
            </div>
          ))}
        </div>
        <div className="tabs">
          {['All','High','Medium','Low'].map(s => (
            <div key={s} className={`tab${scoreFilter===s?' active':''}`} style={{fontSize:11,padding:'4px 10px'}} onClick={() => setScoreFilter(s)}>{s}</div>
          ))}
        </div>
      </div>

      {selected.length > 0 && (
        <div style={{background:'var(--blue-dim)',border:'1px solid oklch(62% 0.19 245 / 0.3)',borderRadius:8,padding:'10px 16px',display:'flex',alignItems:'center',gap:12,marginBottom:12,animation:'fadeUp 0.2s ease both'}}>
          <span style={{fontSize:13,color:'var(--blue)',fontWeight:500}}>{selected.length} leads selected</span>
          <div style={{flex:1}}/>
          <button className="btn btn-ghost btn-xs" onClick={handleExport}>⬇ Export CSV</button>
          <button className="btn btn-ghost btn-xs" onClick={() => handleBulkStatus('email_sent')}>📧 Send Email</button>
          <button className="btn btn-ghost btn-xs" onClick={() => handleBulkStatus('wa_sent')}>💬 Send WA</button>
          <button className="btn btn-ghost btn-xs" onClick={() => handleBulkStatus('call_initiated')}>📞 Call</button>
          <button className="btn btn-danger btn-xs" onClick={() => handleBulkStatus('unsubscribed')}>🗑 Remove</button>
          <button className="btn btn-ghost btn-xs" onClick={() => setSelected([])}>✕</button>
        </div>
      )}

      <div className="card fade-up-3" style={{padding:0}}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{width:36}}>
                  <input type="checkbox" checked={selected.length===filtered.length&&filtered.length>0} onChange={toggleAll} style={{accentColor:'var(--blue)'}}/>
                </th>
                <th>Lead</th><th>Company</th><th>Score</th><th>Priority</th><th>Status</th><th>Lang</th><th>Last</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} style={{cursor:'pointer',...rowStyle(l)}} onClick={() => setSlideOver(l)}>
                  <td onClick={e=>e.stopPropagation()}>
                    <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggle(l.id)} style={{accentColor:'var(--blue)'}}/>
                  </td>
                  <td>
                    <div style={{fontWeight:500,fontSize:13,textDecoration:l.status==='unsubscribed'?'line-through':'none'}}>{l.name}</div>
                    <div style={{fontSize:11,color:'var(--muted)'}}>{l.title}</div>
                  </td>
                  <td style={{fontSize:13}}>{l.company}</td>
                  <td><ScoreDisplay score={l.score}/></td>
                  <td>
                    <span className={`badge ${l.scoreLabel==='High'?'green':l.scoreLabel==='Medium'?'amber':'gray'}`}>
                      {l.scoreLabel}
                    </span>
                  </td>
                  <td><LeadStatusBadge status={l.status}/></td>
                  <td><span className={`badge ${l.lang==='BM'?'purple':'blue'}`}>{l.lang}</span></td>
                  <td><span className="mono text-xs text-muted">{l.last}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{padding:'12px 16px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:12,color:'var(--muted)'}}>Showing {filtered.length} of {leads.length} leads</span>
        </div>
      </div>
    </div>
  );
}
