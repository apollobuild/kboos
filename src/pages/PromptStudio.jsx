import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';
import { apiFetch } from '../services/api.js';

const LANG_LABELS = {
  'all': 'English',
  'EN':  'English',
  'MS':  'Bahasa Malaysia',
  'ZH':  'Mandarin Chinese (简体中文)',
};

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
const WA_VARIABLES = ['{{first_name}}', '{{company}}', '{{industry}}', '{{city}}', '{{phone}}'];
const LANGS = [
  { v: 'all', l: 'All' },
  { v: 'EN', l: 'English' },
  { v: 'MS', l: 'Melayu' },
  { v: 'ZH', l: '中文' },
];

const DEFAULT_WA_BODY = `Hi {{first_name}}, saya dari KOBIS — kami bantu {{company}} dalam perkhidmatan outreach B2B di {{city}}. Boleh saya share info lebih? 🙏`;

const DEFAULT_WA_TEMPLATES = [
  {
    id: 'default-wa-v1',
    label: 'v1 — WA Starter',
    active: true,
    body: DEFAULT_WA_BODY,
    lang: 'all',
    type: 'whatsapp',
    stats: { opens: 0, replies: 0 },
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_VOICE_BODY = `Hello, may I speak with {{first_name}}?

Hi {{first_name}}, this is [Your Name] calling from KOBIS Berhad. I'm reaching out to businesses in {{city}}, particularly in the {{industry}} sector.

We help companies like {{company}} generate qualified B2B leads and book meetings — without your team having to do manual cold outreach.

I'd love to share how we've helped similar businesses here in Malaysia. Is this a good time for a quick 2-minute chat?

[If YES → continue pitch]
[If BUSY → "No problem — when would be a better time for me to call back?"]
[If NOT INTERESTED → "Understood, I appreciate your time {{first_name}}. Have a great day!"]`;

const DEFAULT_VOICE_TEMPLATES = [
  {
    id: 'default-voice-v1',
    label: 'v1 — Voice Starter Script',
    active: true,
    body: DEFAULT_VOICE_BODY,
    lang: 'EN',
    type: 'voice',
    stats: { opens: 0, replies: 0 },
    createdAt: new Date().toISOString(),
  },
];

const VOICE_VARIABLES = ['{{first_name}}', '{{company}}', '{{industry}}', '{{city}}', '{{title}}'];

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

  const [templateType, setTemplateType] = useState('email'); // 'email' | 'whatsapp' | 'voice'
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
  const isWA    = templateType === 'whatsapp';
  const isVoice = templateType === 'voice';

  useEffect(() => {
    setLoading(true);
    setVersions([]);
    setSelectedId(null);
    setSubjectVariants([]);
    setPreviewMode(false);
    const endpoint = isWA ? '/settings/wa-templates' : isVoice ? '/settings/voice-templates' : '/settings/prompt-templates';
    const defaults = isWA ? DEFAULT_WA_TEMPLATES : isVoice ? DEFAULT_VOICE_TEMPLATES : DEFAULT_TEMPLATES;
    apiFetch(endpoint)
      .then(data => {
        const list = (!data || data.length === 0) ? defaults : data;
        setVersions(list);
        const active = list.find(t => t.active) || list[0];
        setSelectedId(active.id);
        const { subject, body, lang } = parseTemplateFields(active);
        setEditSubject(isWA || isVoice ? '' : subject);
        setEditBody(body);
        setEditLang(lang);
        setEditLabel(active.label);
      })
      .catch(() => {
        setVersions(defaults);
        setSelectedId(defaults[0].id);
        setEditSubject(isWA || isVoice ? '' : DEFAULT_SUBJECT);
        setEditBody(isVoice ? DEFAULT_VOICE_BODY : isWA ? DEFAULT_WA_BODY : DEFAULT_BODY);
        setEditLang('all');
        setEditLabel(defaults[0].label);
      })
      .finally(() => setLoading(false));
  }, [templateType]);

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
    const base = isWA ? '/settings/wa-templates' : isVoice ? '/settings/voice-templates' : '/settings/prompt-templates';
    try {
      await apiFetch(`${base}/${id}`, { method: 'PATCH', body: { active: true } });
      setVersions(prev => prev.map(v => ({ ...v, active: v.id === id })));
      showToast('Template set as active', 'green');
    } catch (e) { showToast(e.message, 'red'); }
  }

  async function handleSaveNew() {
    if (!editBody.trim()) return;
    setSaving(true);
    try {
      const endpoint = isWA ? '/settings/wa-templates' : isVoice ? '/settings/voice-templates' : '/settings/prompt-templates';
      const saved = await apiFetch(endpoint, {
        method: 'POST',
        body: {
          label: editLabel || `Version ${versions.length + 1}`,
          subject: isWA || isVoice ? undefined : editSubject,
          body: editBody,
          content: isWA || isVoice ? editBody : `Subject: ${editSubject}\n\n${editBody}`,
          lang: editLang,
          type: templateType,
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
    const base = isWA ? '/settings/wa-templates' : isVoice ? '/settings/voice-templates' : '/settings/prompt-templates';
    try {
      await apiFetch(`${base}/${id}`, { method: 'DELETE' });
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
    const langName = LANG_LABELS[editLang] || 'English';
    const langInstruction = editLang === 'all'
      ? 'Write in English.'
      : `IMPORTANT: The entire output MUST be written in ${langName}. Do not switch to any other language.`;

    try {
      const campaign = campaigns?.[0];

      if (isVoice) {
        const res = await apiFetch('/ai/generate-email', {
          method: 'POST',
          body: {
            bizName: campaign?.bizName || 'KOBIS Berhad',
            campaignName: campaign?.name || 'Outreach Campaign',
            prompt: `You are rewriting a voice call script for a B2B outreach agent calling Malaysian businesses. ${langInstruction}\n\nKeep all {{variables}} exactly as-is. Make the script natural, conversational, and suitable for a real phone call. Include natural pause points and objection handling branches.\n\nCurrent script:\n${editBody}`,
            lead: { name: 'Ahmad', company: 'Sample Corp', title: 'Manager', lang: editLang === 'all' ? 'EN' : editLang },
          },
        });
        setEditBody(res.body || editBody);
        showToast('AI improved the voice script ✓', 'green');
        return;
      }

      const channelInstruction = isWA
        ? `You are rewriting a WhatsApp outreach message. ${langInstruction}\nKeep it under 160 characters. Casual, friendly, ends with a question. Keep all {{variables}} intact.`
        : `You are rewriting a cold email template for Malaysian B2B outreach. ${langInstruction}\nApply cold email best practices. Keep all {{variables}} intact.\n\nSubject: ${editSubject}\n\n${editBody}`;

      const res = await apiFetch('/ai/generate-email', {
        method: 'POST',
        body: {
          bizName: campaign?.bizName || 'KOBIS Berhad',
          campaignName: campaign?.name || 'Outreach Campaign',
          prompt: channelInstruction,
          lead: { name: 'Ahmad', company: 'Sample Corp', title: 'Manager', lang: editLang === 'all' ? 'EN' : editLang },
        },
      });

      if (!isWA) {
        if (Array.isArray(res.subjects) && res.subjects.length > 1) {
          setSubjectVariants(res.subjects);
          setEditSubject(res.subjects[0]);
        } else {
          setEditSubject(res.subject || editSubject);
        }
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
          <div style={{display:'flex',alignItems:'center',gap:12,marginTop:4}}>
            <h1 className="page-title" style={{margin:0}}>Prompt Studio</h1>
            <div style={{display:'flex',background:'var(--bg)',border:'1px solid var(--border)',borderRadius:8,padding:3,gap:2}}>
              {[{v:'email',icon:'📧',l:'Email'},{v:'whatsapp',icon:'💬',l:'WhatsApp'},{v:'voice',icon:'📞',l:'Voice Agent'}].map(t=>(
                <button key={t.v} onClick={()=>setTemplateType(t.v)}
                  style={{padding:'5px 14px',borderRadius:6,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,
                    background:templateType===t.v?'var(--accent-bg)':'transparent',
                    color:templateType===t.v?'var(--accent)':'var(--muted)',
                    transition:'all 0.15s'}}>
                  {t.icon} {t.l}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <button className="btn" onClick={() => setPreviewMode(p => !p)} style={{fontSize:13}}>
            {previewMode ? '✎ Edit' : '👁 Preview'}
          </button>
          <button className="btn" onClick={handleClone} style={{fontSize:13}} title="Duplicate this version to edit">
            ⎘ Clone
          </button>
          {!isVoice && (
            <button className="btn" onClick={handleTestSend} disabled={testSending} style={{fontSize:13}} title="Send test email to yourself">
              {testSending ? 'Sending…' : '✉ Test Send'}
            </button>
          )}
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

          {/* Subject line — email only */}
          {!isWA && !isVoice && (
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
          )}

          {/* Body */}
          <div style={{flex:1, display:'flex', flexDirection:'column'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5}}>
              <div style={{fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em'}}>
                {isVoice ? 'Voice Call Script' : isWA ? 'WhatsApp Message' : 'Email Body'}
              </div>
              {isWA && (
                <div style={{fontSize:10,color: editBody.length > 1024 ? 'var(--red)' : editBody.length > 800 ? 'var(--amber)' : 'var(--muted)', fontFamily:'var(--font-mono)'}}>
                  {editBody.length} / 1024 chars
                </div>
              )}
              {isVoice && (
                <div style={{fontSize:10,color:'var(--muted)',fontFamily:'var(--font-mono)'}}>
                  ~{Math.ceil(editBody.trim().split(/\s+/).length / 130)} min · {editBody.trim().split(/\s+/).length} words
                </div>
              )}
            </div>
            {previewMode ? (
              <div style={{flex:1, fontFamily:'var(--font-mono)', fontSize:13, lineHeight:1.7, color:'var(--fg)', whiteSpace:'pre-wrap', padding:4, minHeight: isWA ? 120 : 300}}>
                {previewBody}
              </div>
            ) : (
              <textarea
                value={editBody}
                onChange={e => setEditBody(e.target.value)}
                style={{flex:1, background:'transparent', border:'none', outline:'none', color:'var(--fg)', fontFamily:'var(--font-mono)', fontSize:13, lineHeight:1.7, resize:'none', minHeight: isWA ? 120 : 300}}
                placeholder={isVoice ? 'Hello, may I speak with {{first_name}}?…' : isWA ? 'Hi {{first_name}}, …' : undefined}
              />
            )}
          </div>

          <div style={{borderTop:'1px solid var(--border)', paddingTop:10, marginTop:10, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
            <span style={{fontSize:11, color:'var(--muted)', marginRight:4}}>Insert:</span>
            {(isVoice ? VOICE_VARIABLES : isWA ? WA_VARIABLES : VARIABLES).map(tag => (
              <span key={tag}
                style={{background:'var(--bg)', border:'1px solid var(--border)', padding:'3px 8px', borderRadius:4, cursor:'pointer', fontFamily:'var(--font-mono)', fontSize:11, color: isVoice ? 'var(--amber)' : isWA ? 'var(--green)' : 'var(--blue)'}}
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
