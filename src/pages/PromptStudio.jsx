import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../services/api.js';

const DEFAULT_TEMPLATES = [
  {
    id: 'default-v1',
    label: 'v1 — Starter Template',
    active: true,
    openRate: '—',
    replyRate: '—',
    createdAt: new Date().toISOString(),
    content: `Subject: Quick question about {{company}}

Hi {{first_name}},

I came across {{company}} and noticed you're in the {{industry}} space — we've been helping similar businesses in {{city}} generate more leads through personalised outreach.

Would you be open to a quick 10-minute call this week to see if it's a fit?

Best regards,
[Your Name]
KOBIS Berhad`,
  },
];

const VARIABLES = ['{{first_name}}', '{{company}}', '{{industry}}', '{{city}}', '{{title}}', '{{phone}}'];

export function PromptStudio() {
  const { showToast, leads, campaigns } = useAppStore(useShallow(s => ({
    showToast: s.showToast,
    leads: s.leads,
    campaigns: s.campaigns,
  })));

  const [versions, setVersions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [previewLead, setPreviewLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [improving, setImproving] = useState(false);

  // Load templates from API
  useEffect(() => {
    apiFetch('/settings/prompt-templates')
      .then(data => {
        if (data.length === 0) {
          setVersions(DEFAULT_TEMPLATES);
          setSelectedId(DEFAULT_TEMPLATES[0].id);
          setEditContent(DEFAULT_TEMPLATES[0].content);
          setEditLabel(DEFAULT_TEMPLATES[0].label);
        } else {
          setVersions(data);
          const active = data.find(t => t.active) || data[0];
          setSelectedId(active.id);
          setEditContent(active.content);
          setEditLabel(active.label);
        }
      })
      .catch(() => {
        setVersions(DEFAULT_TEMPLATES);
        setSelectedId(DEFAULT_TEMPLATES[0].id);
        setEditContent(DEFAULT_TEMPLATES[0].content);
        setEditLabel(DEFAULT_TEMPLATES[0].label);
      })
      .finally(() => setLoading(false));
  }, []);

  // Pick a real lead for preview
  useEffect(() => {
    if (leads?.length > 0) setPreviewLead(leads[0]);
  }, [leads]);

  const selected = versions.find(v => v.id === selectedId) || versions[0];

  function handleSelect(v) {
    setSelectedId(v.id);
    setEditContent(v.content);
    setEditLabel(v.label);
    setPreviewMode(false);
  }

  async function handleSetActive(id) {
    try {
      await apiFetch(`/settings/prompt-templates/${id}`, { method: 'PATCH', body: { active: true } });
      setVersions(prev => prev.map(v => ({ ...v, active: v.id === id })));
      showToast('Template set as active', 'green');
    } catch (e) { showToast(e.message, 'red'); }
  }

  async function handleSaveNew() {
    if (!editContent.trim()) return;
    setSaving(true);
    try {
      const saved = await apiFetch('/settings/prompt-templates', {
        method: 'POST',
        body: { label: editLabel || `Version ${versions.length + 1}`, content: editContent },
      });
      setVersions(prev => [saved, ...prev]);
      setSelectedId(saved.id);
      showToast('New version saved', 'blue');
    } catch (e) { showToast(e.message, 'red'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (versions.length <= 1) { showToast("Can't delete the last template", 'amber'); return; }
    try {
      await apiFetch(`/settings/prompt-templates/${id}`, { method: 'DELETE' });
      const remaining = versions.filter(v => v.id !== id);
      setVersions(remaining);
      if (selectedId === id) {
        setSelectedId(remaining[0].id);
        setEditContent(remaining[0].content);
        setEditLabel(remaining[0].label);
      }
      showToast('Version deleted', 'amber');
    } catch (e) { showToast(e.message, 'red'); }
  }

  async function handleAIImprove() {
    setImproving(true);
    try {
      const campaign = campaigns?.[0];
      const res = await apiFetch('/ai/generate-email', {
        method: 'POST',
        body: {
          bizName: campaign?.bizName || 'KOBIS Berhad',
          campaignName: campaign?.name || 'Outreach Campaign',
          prompt: `Improve this email template while keeping the {{variables}} intact. Make it more engaging and personal:\n\n${editContent}`,
          lead: { name: 'Ahmad', company: 'Sample Corp', title: 'Manager', lang: 'EN' },
        },
      });
      const improved = `Subject: ${res.subject}\n\n${res.body}`;
      setEditContent(improved);
      showToast('AI improved the template ✓', 'green');
    } catch (e) { showToast('AI improve failed: ' + e.message, 'red'); }
    finally { setImproving(false); }
  }

  function insertVariable(tag) {
    setEditContent(prev => prev + tag);
  }

  // Real preview using actual lead data
  const previewContent = (() => {
    const lead = previewLead;
    return editContent
      .replace(/\{\{first_name\}\}/g, lead?.name?.split(' ')[0] || 'Ahmad')
      .replace(/\{\{company\}\}/g, lead?.company || 'Naim Holdings')
      .replace(/\{\{industry\}\}/g, lead?.title?.includes('Manager') ? 'Construction' : 'Services')
      .replace(/\{\{city\}\}/g, 'Kuching')
      .replace(/\{\{title\}\}/g, lead?.title || 'Director')
      .replace(/\{\{phone\}\}/g, lead?.phone || '+601X-XXXXXXX');
  })();

  // Real stats from leads
  const totalLeads = leads?.length || 0;
  const openedLeads = leads?.filter(l => ['opened','replied','hot'].includes(l.status)).length || 0;
  const repliedLeads = leads?.filter(l => ['replied','hot'].includes(l.status)).length || 0;
  const realOpenRate = totalLeads > 0 ? ((openedLeads / totalLeads) * 100).toFixed(1) + '%' : '—';
  const realReplyRate = totalLeads > 0 ? ((repliedLeads / totalLeads) * 100).toFixed(1) + '%' : '—';

  if (loading) return (
    <div className="page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:300}}>
      <div style={{color:'var(--muted)',fontSize:13}}>Loading templates…</div>
    </div>
  );

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-4 fade-up">
        <div>
          <div className="breadcrumb">Campaigns / <span>Prompt Studio</span></div>
          <h1 className="page-title" style={{marginTop:4}}>Prompt Studio</h1>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button className="btn" onClick={() => setPreviewMode(p => !p)} style={{fontSize:13}}>
            {previewMode ? '✎ Edit' : '👁 Preview'}
          </button>
          <button className="btn" onClick={handleAIImprove} disabled={improving} style={{fontSize:13, color:'var(--green)', borderColor:'rgba(0,255,128,0.3)'}}>
            {improving ? '⏳ Improving…' : '⚡ AI Improve'}
          </button>
          <button className="btn btn-blue" onClick={handleSaveNew} disabled={saving} style={{fontSize:13}}>
            {saving ? 'Saving…' : 'Save as New Version'}
          </button>
          {selected && !selected.active && (
            <button className="btn btn-green" onClick={() => handleSetActive(selectedId)} style={{fontSize:13}}>
              Set as Active
            </button>
          )}
        </div>
      </div>

      {/* Live stats banner */}
      <div style={{display:'flex', gap:12, marginBottom:16}} className="fade-up">
        {[
          { label:'Total Leads', val: totalLeads.toLocaleString(), color:'var(--fg)' },
          { label:'Open Rate (live)', val: realOpenRate, color:'var(--green)' },
          { label:'Reply Rate (live)', val: realReplyRate, color:'var(--blue)' },
          { label:'Active Campaigns', val: campaigns?.filter(c=>c.status==='active').length || 0, color:'var(--amber)' },
        ].map(s => (
          <div key={s.label} className="card" style={{flex:1, padding:'12px 16px'}}>
            <div style={{fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4}}>{s.label}</div>
            <div style={{fontSize:22, fontWeight:800, fontFamily:'var(--font-mono)', color:s.color}}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid', gridTemplateColumns:'260px 1fr', gap:16}}>
        {/* Version list */}
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          {versions.map((v, i) => (
            <div
              key={v.id}
              className={`card fade-up-${Math.min(i,4)}`}
              onClick={() => handleSelect(v)}
              style={{cursor:'pointer', border: selectedId===v.id ? '1px solid var(--blue)' : '1px solid var(--border)', padding:'12px'}}
            >
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4}}>
                <span style={{fontWeight:600, fontSize:12, flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{v.label}</span>
                <div style={{display:'flex', gap:4, flexShrink:0}}>
                  {v.active && <span className="badge badge-green" style={{fontSize:9}}>ACTIVE</span>}
                  {selectedId === v.id && !v.active && (
                    <span onClick={e=>{e.stopPropagation();handleDelete(v.id)}} style={{fontSize:10,color:'var(--muted)',cursor:'pointer',padding:'0 4px'}} title="Delete">✕</span>
                  )}
                </div>
              </div>
              <div style={{display:'flex', gap:12}}>
                <div>
                  <div style={{fontSize:9, color:'var(--muted)', marginBottom:2}}>Open Rate</div>
                  <div style={{fontFamily:'var(--font-mono)', fontSize:12, color:'var(--green)'}}>{v.openRate}</div>
                </div>
                <div>
                  <div style={{fontSize:9, color:'var(--muted)', marginBottom:2}}>Reply Rate</div>
                  <div style={{fontFamily:'var(--font-mono)', fontSize:12, color:'var(--blue)'}}>{v.replyRate}</div>
                </div>
              </div>
              {v.createdAt && (
                <div style={{fontSize:9,color:'var(--muted)',marginTop:4}}>
                  {new Date(v.createdAt).toLocaleDateString('en-MY',{day:'numeric',month:'short',year:'numeric'})}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Editor */}
        <div className="card fade-up-1" style={{display:'flex', flexDirection:'column', gap:0}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border)', paddingBottom:12, marginBottom:12, gap:12}}>
            <input
              value={editLabel}
              onChange={e => setEditLabel(e.target.value)}
              style={{background:'transparent', border:'none', outline:'none', fontWeight:600, fontSize:14, color:'var(--fg)', flex:1}}
              placeholder="Version name…"
              disabled={previewMode}
            />
            {previewLead && previewMode && (
              <div style={{fontSize:11, color:'var(--muted)'}}>
                Previewing with: <span style={{color:'var(--blue)'}}>{previewLead.name}</span> · {previewLead.company}
                <select
                  style={{marginLeft:8, background:'var(--surface)', border:'1px solid var(--border)', color:'var(--fg)', borderRadius:6, padding:'2px 6px', fontSize:11}}
                  onChange={e => setPreviewLead(leads.find(l=>l.id===parseInt(e.target.value)))}
                  value={previewLead?.id}
                >
                  {leads?.slice(0,10).map(l => <option key={l.id} value={l.id}>{l.name} · {l.company}</option>)}
                </select>
              </div>
            )}
          </div>

          {previewMode ? (
            <div style={{flex:1, fontFamily:'var(--font-mono)', fontSize:13, lineHeight:1.7, color:'var(--fg)', whiteSpace:'pre-wrap', padding:4, minHeight:380}}>
              {previewContent}
            </div>
          ) : (
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              style={{flex:1, background:'transparent', border:'none', outline:'none', color:'var(--fg)', fontFamily:'var(--font-mono)', fontSize:13, lineHeight:1.7, resize:'none', minHeight:380}}
            />
          )}

          <div style={{borderTop:'1px solid var(--border)', paddingTop:10, marginTop:10, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
            <span style={{fontSize:11, color:'var(--muted)', marginRight:4}}>Insert:</span>
            {VARIABLES.map(tag => (
              <span key={tag}
                style={{background:'var(--bg)', border:'1px solid var(--border)', padding:'3px 8px', borderRadius:4, cursor:'pointer', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--blue)'}}
                onClick={() => insertVariable(tag)}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
