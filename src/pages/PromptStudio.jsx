import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../services/api.js';

const DEFAULT_SUBJECT = 'Quick question about {{company}}';
const DEFAULT_BODY = `Hi {{first_name}},

Noticed {{company}} is in the {{industry}} space — we've been helping similar businesses in {{city}} book more meetings through personalised outreach.

Would you be open to a quick 10-minute call this week to see if there's a fit?

Best regards,
[Your Name]
KOBIS Berhad

P.S. Takes less than 10 minutes — happy to work around your schedule.`;

const DEFAULT_TEMPLATES = [
  {
    id: 'default-v1',
    label: 'v1 — Starter Template',
    active: true,
    subject: DEFAULT_SUBJECT,
    body: DEFAULT_BODY,
    lang: 'all',
    stats: { opens: 0, replies: 0 },
    createdAt: new Date().toISOString(),
  },
];

const VARIABLES = ['{{first_name}}', '{{company}}', '{{industry}}', '{{city}}', '{{title}}', '{{phone}}'];
const LANGS = [
  { v: 'all', l: 'All' },
  { v: 'EN', l: 'English' },
  { v: 'MS', l: 'Melayu' },
  { v: 'ZH', l: '中文' },
];

function parseTemplateFields(v) {
  if (v.subject !== undefined) return { subject: v.subject || '', body: v.body || '', lang: v.lang || 'all' };
  // Legacy: extract from "Subject: ...\n\n..." content format
  const content = v.content || '';
  const m = content.match(/^Subject:\s*(.+?)\n\n([\s\S]*)$/);
  return { subject: m ? m[1].trim() : '', body: m ? m[2] : content, lang: v.lang || 'all' };
}

function fillVars(text, lead) {
  return (text || '')
    .replace(/\{\{first_name\}\}/g, lead?.name?.split(' ')[0] || 'Ahmad')
    .replace(/\{\{company\}\}/g, lead?.company || 'Naim Holdings')
    .replace(/\{\{industry\}\}/g, lead?.title?.includes('Manager') ? 'Construction' : 'Services')
    .replace(/\{\{city\}\}/g, 'Kuching')
    .replace(/\{\{title\}\}/g, lead?.title || 'Director')
    .replace(/\{\{phone\}\}/g, lead?.phone || '+601X-XXXXXXX');
}

export function PromptStudio() {
  const { showToast, leads, campaigns } = useAppStore(useShallow(s => ({
    showToast: s.showToast,
    leads: s.leads,
    campaigns: s.campaigns,
  })));

  const [versions, setVersions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editLang, setEditLang] = useState('all');
  const [subjectVariants, setSubjectVariants] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewLead, setPreviewLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [improving, setImproving] = useState(false);
  const [testSending, setTestSending] = useState(false);

  useEffect(() => {
    apiFetch('/settings/prompt-templates')
      .then(data => {
        const list = data.length === 0 ? DEFAULT_TEMPLATES : data;
        setVersions(list);
        const active = list.find(t => t.active) || list[0];
        setSelectedId(active.id);
        const { subject, body, lang } = parseTemplateFields(active);
        setEditSubject(subject);
        setEditBody(body);
        setEditLang(lang);
        setEditLabel(active.label);
      })
      .catch(() => {
        setVersions(DEFAULT_TEMPLATES);
        setSelectedId(DEFAULT_TEMPLATES[0].id);
        setEditSubject(DEFAULT_SUBJECT);
        setEditBody(DEFAULT_BODY);
        setEditLang('all');
        setEditLabel(DEFAULT_TEMPLATES[0].label);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (leads?.length > 0) setPreviewLead(leads[0]);
  }, [leads]);

  const selected = versions.find(v => v.id === selectedId) || versions[0];

  function handleSelect(v) {
    setSelectedId(v.id);
    const { subject, body, lang } = parseTemplateFields(v);
    setEditSubject(subject);
    setEditBody(body);
    setEditLang(lang);
    setEditLabel(v.label);
    setPreviewMode(false);
    setSubjectVariants([]);
  }

  async function handleSetActive(id) {
    try {
      await apiFetch(`/settings/prompt-templates/${id}`, { method: 'PATCH', body: { active: true } });
      setVersions(prev => prev.map(v => ({ ...v, active: v.id === id })));
      showToast('Template set as active', 'green');
    } catch (e) { showToast(e.message, 'red'); }
  }

  async function handleSaveNew() {
    if (!editBody.trim()) return;
    setSaving(true);
    try {
      const saved = await apiFetch('/settings/prompt-templates', {
        method: 'POST',
        body: {
          label: editLabel || `Version ${versions.length + 1}`,
          subject: editSubject,
          body: editBody,
          content: `Subject: ${editSubject}\n\n${editBody}`,
          lang: editLang,
        },
      });
      setVersions(prev => [saved, ...prev]);
      setSelectedId(saved.id);
      setSubjectVariants([]);
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
      if (selectedId === id) handleSelect(remaining[0]);
      showToast('Version deleted', 'amber');
    } catch (e) { showToast(e.message, 'red'); }
  }

  function handleClone() {
    setEditLabel(`${editLabel} (copy)`);
    setSubjectVariants([]);
    showToast('Cloned — edit and save as new version', 'blue');
  }

  async function handleAIImprove() {
    setImproving(true);
    setSubjectVariants([]);
    try {
      const campaign = campaigns?.[0];
      const res = await apiFetch('/ai/generate-email', {
        method: 'POST',
        body: {
          bizName: campaign?.bizName || 'KOBIS Berhad',
          campaignName: campaign?.name || 'Outreach Campaign',
          prompt: `Improve this email template while keeping {{variables}} intact. Apply cold email best practices for Malaysian B2B:\n\nSubject: ${editSubject}\n\n${editBody}`,
          lead: { name: 'Ahmad', company: 'Sample Corp', title: 'Manager', lang: editLang === 'all' ? 'EN' : editLang },
        },
      });
      if (Array.isArray(res.subjects) && res.subjects.length > 1) {
        setSubjectVariants(res.subjects);
        setEditSubject(res.subjects[0]);
      } else {
        setEditSubject(res.subject || editSubject);
      }
      setEditBody(res.body || editBody);
      showToast('AI improved the template ✓', 'green');
    } catch (e) { showToast('AI improve failed: ' + e.message, 'red'); }
    finally { setImproving(false); }
  }

  async function handleTestSend() {
    if (!selectedId) return;
    setTestSending(true);
    try {
      const res = await apiFetch(`/settings/prompt-templates/${selectedId}/test-send`, { method: 'POST' });
      showToast(`Test sent to ${res.sentTo}`, 'green');
    } catch (e) { showToast('Test send failed: ' + e.message, 'red'); }
    finally { setTestSending(false); }
  }

  function insertVariable(tag) {
    setEditBody(prev => prev + tag);
  }

  const previewSubject = fillVars(editSubject, previewLead);
  const previewBody = fillVars(editBody, previewLead);

  // Real stats from leads (global — fallback when per-template stats are empty)
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
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <button className="btn" onClick={() => setPreviewMode(p => !p)} style={{fontSize:13}}>
            {previewMode ? '✎ Edit' : '👁 Preview'}
          </button>
          <button className="btn" onClick={handleClone} style={{fontSize:13}} title="Duplicate this version to edit">
            ⎘ Clone
          </button>
          <button className="btn" onClick={handleTestSend} disabled={testSending} style={{fontSize:13}} title="Send test email to yourself">
            {testSending ? 'Sending…' : '✉ Test Send'}
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
          {versions.map((v, i) => {
            const opens = v.stats?.opens || 0;
            const replies = v.stats?.replies || 0;
            const langTag = v.lang && v.lang !== 'all' ? v.lang : null;
            return (
              <div
                key={v.id}
                className={`card fade-up-${Math.min(i,4)}`}
                onClick={() => handleSelect(v)}
                style={{cursor:'pointer', border: selectedId===v.id ? '1px solid var(--blue)' : '1px solid var(--border)', padding:'12px'}}
              >
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4}}>
                  <span style={{fontWeight:600, fontSize:12, flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{v.label}</span>
                  <div style={{display:'flex', gap:4, flexShrink:0, alignItems:'center'}}>
                    {langTag && <span style={{fontSize:9, padding:'1px 5px', borderRadius:3, border:'1px solid var(--border)', color:'var(--muted)'}}>{langTag}</span>}
                    {v.active && <span className="badge badge-green" style={{fontSize:9}}>ACTIVE</span>}
                    {selectedId === v.id && !v.active && (
                      <span onClick={e=>{e.stopPropagation();handleDelete(v.id)}} style={{fontSize:10,color:'var(--muted)',cursor:'pointer',padding:'0 4px'}} title="Delete">✕</span>
                    )}
                  </div>
                </div>
                <div style={{display:'flex', gap:12}}>
                  <div>
                    <div style={{fontSize:9, color:'var(--muted)', marginBottom:2}}>Opens</div>
                    <div style={{fontFamily:'var(--font-mono)', fontSize:12, color:'var(--green)'}}>{opens > 0 ? opens : '—'}</div>
                  </div>
                  <div>
                    <div style={{fontSize:9, color:'var(--muted)', marginBottom:2}}>Replies</div>
                    <div style={{fontFamily:'var(--font-mono)', fontSize:12, color:'var(--blue)'}}>{replies > 0 ? replies : '—'}</div>
                  </div>
                </div>
                {v.createdAt && (
                  <div style={{fontSize:9,color:'var(--muted)',marginTop:4}}>
                    {new Date(v.createdAt).toLocaleDateString('en-MY',{day:'numeric',month:'short',year:'numeric'})}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Editor */}
        <div className="card fade-up-1" style={{display:'flex', flexDirection:'column', gap:0}}>
          {/* Header row: label + lang tags */}
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border)', paddingBottom:12, marginBottom:12, gap:12}}>
            <input
              value={editLabel}
              onChange={e => setEditLabel(e.target.value)}
              style={{background:'transparent', border:'none', outline:'none', fontWeight:600, fontSize:14, color:'var(--fg)', flex:1}}
              placeholder="Version name…"
              disabled={previewMode}
            />
            <div style={{display:'flex', gap:4}}>
              {LANGS.map(l => (
                <button key={l.v} onClick={() => !previewMode && setEditLang(l.v)}
                  style={{fontSize:10, padding:'2px 8px', borderRadius:4, border:'1px solid', cursor: previewMode ? 'default' : 'pointer',
                    borderColor: editLang===l.v ? 'var(--blue)' : 'var(--border)',
                    color: editLang===l.v ? 'var(--blue)' : 'var(--muted)',
                    background: editLang===l.v ? 'rgba(0,120,255,0.08)' : 'transparent',
                  }}>
                  {l.l}
                </button>
              ))}
            </div>
            {previewLead && previewMode && (
              <select
                style={{background:'var(--surface)', border:'1px solid var(--border)', color:'var(--fg)', borderRadius:6, padding:'2px 6px', fontSize:11}}
                onChange={e => setPreviewLead(leads.find(l=>l.id===parseInt(e.target.value)))}
                value={previewLead?.id}
              >
                {leads?.slice(0,10).map(l => <option key={l.id} value={l.id}>{l.name} · {l.company}</option>)}
              </select>
            )}
          </div>

          {/* Subject line */}
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5}}>Subject Line</div>
            {previewMode ? (
              <div style={{fontFamily:'var(--font-mono)', fontSize:13, color:'var(--fg)', padding:'8px 10px', background:'var(--bg)', borderRadius:6, border:'1px solid var(--border)'}}>
                {previewSubject}
              </div>
            ) : (
              <input
                value={editSubject}
                onChange={e => setEditSubject(e.target.value)}
                style={{width:'100%', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:6, padding:'8px 10px', color:'var(--fg)', fontFamily:'var(--font-mono)', fontSize:13, outline:'none', boxSizing:'border-box'}}
                placeholder="Subject line (under 7 words)…"
              />
            )}

            {/* Subject variants from AI Improve */}
            {subjectVariants.length > 1 && !previewMode && (
              <div style={{marginTop:8}}>
                <div style={{fontSize:10, color:'var(--muted)', marginBottom:5}}>AI suggested — pick one:</div>
                <div style={{display:'flex', flexDirection:'column', gap:5}}>
                  {subjectVariants.map((s, i) => (
                    <div key={i} onClick={() => { setEditSubject(s); setSubjectVariants([]); }}
                      style={{
                        padding:'6px 10px', borderRadius:5, cursor:'pointer', fontSize:12,
                        fontFamily:'var(--font-mono)',
                        border: editSubject === s ? '1px solid var(--green)' : '1px solid var(--border)',
                        color: editSubject === s ? 'var(--green)' : 'var(--fg)',
                        background: editSubject === s ? 'rgba(0,255,128,0.05)' : 'var(--bg)',
                      }}>
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Body */}
          <div style={{flex:1, display:'flex', flexDirection:'column'}}>
            <div style={{fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5}}>Email Body</div>
            {previewMode ? (
              <div style={{flex:1, fontFamily:'var(--font-mono)', fontSize:13, lineHeight:1.7, color:'var(--fg)', whiteSpace:'pre-wrap', padding:4, minHeight:300}}>
                {previewBody}
              </div>
            ) : (
              <textarea
                value={editBody}
                onChange={e => setEditBody(e.target.value)}
                style={{flex:1, background:'transparent', border:'none', outline:'none', color:'var(--fg)', fontFamily:'var(--font-mono)', fontSize:13, lineHeight:1.7, resize:'none', minHeight:300}}
              />
            )}
          </div>

          <div style={{borderTop:'1px solid var(--border)', paddingTop:10, marginTop:10, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
            <span style={{fontSize:11, color:'var(--muted)', marginRight:4}}>Insert:</span>
            {VARIABLES.map(tag => (
              <span key={tag}
                style={{background:'var(--bg)', border:'1px solid var(--border)', padding:'3px 8px', borderRadius:4, cursor:'pointer', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--blue)'}}
                onClick={() => !previewMode && insertVariable(tag)}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
