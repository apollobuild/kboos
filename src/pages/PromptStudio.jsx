import { useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { useShallow } from 'zustand/react/shallow';

const INITIAL_VERSIONS = [
  {
    id: 'v3', label: 'v3 — Current', active: true,
    openRate: '41.2%', replyRate: '7.8%',
    content: `Subject: Professional {{industry}} Services for {{company}}

Hi {{first_name}},

I noticed {{company}} operates in the {{city}} area and thought you'd appreciate knowing about our specialized services.

We've helped similar organizations in {{industry}} achieve significant improvements in their operations. Our team of certified professionals has served 200+ commercial clients across Sarawak.

Would you be open to a 15-minute call this week to explore if we could add value for {{company}}?

Best regards,
[Your Name]
Gadong Squad Professional Services`,
  },
  {
    id: 'v2', label: 'v2 — Previous', active: false,
    openRate: '35.8%', replyRate: '5.2%',
    content: `Subject: Improving {{company}}'s facilities

Dear {{first_name}},

We specialize in professional facility management for companies like {{company}}. Our services include maintenance, cleaning, and ground management.

Can we schedule a brief call?

Best,
Gadong Squad`,
  },
  {
    id: 'v1', label: 'v1 — Baseline', active: false,
    openRate: '28.4%', replyRate: '3.1%',
    content: `Hi {{first_name}},

Please find attached our company profile for Gadong Squad. We offer professional services in Kuching.

Contact us at info@gadong.com.my

Thanks`,
  },
];

export function PromptStudio() {
  const { showToast } = useAppStore(useShallow(s => ({ showToast: s.showToast })));

  const [versions, setVersions] = useState(INITIAL_VERSIONS);
  const [selectedId, setSelectedId] = useState('v3');
  const [editContent, setEditContent] = useState(INITIAL_VERSIONS[0].content);
  const [previewMode, setPreviewMode] = useState(false);

  const selected = versions.find(v => v.id === selectedId) || versions[0];

  function handleSelect(v) {
    setSelectedId(v.id);
    setEditContent(v.content);
    setPreviewMode(false);
  }

  function handleSetActive(id) {
    setVersions(prev => prev.map(v => ({ ...v, active: v.id === id })));
    showToast('Prompt version set as active', 'green');
  }

  function handleSaveNew() {
    const newId = `v${versions.length + 1}-custom-${Date.now()}`;
    const newVersion = {
      id: newId,
      label: `v${versions.length + 1} — Custom edit`,
      active: false,
      openRate: '—',
      replyRate: '—',
      content: editContent,
    };
    setVersions(prev => [newVersion, ...prev]);
    setSelectedId(newId);
    showToast('New version saved', 'blue');
  }

  const previewContent = editContent
    .replace(/\{\{first_name\}\}/g, 'Ahmad')
    .replace(/\{\{company\}\}/g, 'Naim Holdings')
    .replace(/\{\{industry\}\}/g, 'Property')
    .replace(/\{\{city\}\}/g, 'Kuching');

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-4 fade-up">
        <div>
          <div className="breadcrumb">Campaigns / <span>Prompt Studio</span></div>
          <h1 className="page-title" style={{marginTop:4}}>Prompt Studio</h1>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button className="btn" onClick={() => setPreviewMode(p => !p)}>
            {previewMode ? '✎ Edit' : '👁 Preview'}
          </button>
          <button className="btn btn-blue" onClick={handleSaveNew}>Save as New Version</button>
          {!selected.active && (
            <button className="btn btn-green" onClick={() => handleSetActive(selectedId)}>Set as Active</button>
          )}
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'260px 1fr', gap:16}}>
        {/* Version List */}
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          {versions.map((v, i) => (
            <div
              key={v.id}
              className={`card ${selectedId === v.id ? 'fade-up' : `fade-up-${Math.min(i,4)}`}`}
              onClick={() => handleSelect(v)}
              style={{
                cursor:'pointer',
                border: selectedId === v.id ? '1px solid var(--blue)' : '1px solid var(--border)',
                padding:'12px',
              }}
            >
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6}}>
                <span style={{fontWeight:600, fontSize:13}}>{v.label}</span>
                {v.active && <span className="badge badge-green" style={{fontSize:10}}>ACTIVE</span>}
              </div>
              <div style={{display:'flex', gap:12}}>
                <div>
                  <div style={{fontSize:10, color:'var(--text-3)', marginBottom:2}}>Open Rate</div>
                  <div style={{fontFamily:'var(--font-mono)', fontSize:13, color:'var(--green)'}}>{v.openRate}</div>
                </div>
                <div>
                  <div style={{fontSize:10, color:'var(--text-3)', marginBottom:2}}>Reply Rate</div>
                  <div style={{fontFamily:'var(--font-mono)', fontSize:13, color:'var(--blue)'}}>{v.replyRate}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Editor / Preview */}
        <div className="card fade-up-1" style={{display:'flex', flexDirection:'column', gap:0}}>
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            borderBottom:'1px solid var(--border)', paddingBottom:12, marginBottom:12
          }}>
            <div style={{fontWeight:600}}>{selected.label}</div>
            <div style={{display:'flex', gap:16}}>
              {selected.openRate !== '—' && (
                <>
                  <div style={{fontSize:12}}>
                    <span style={{color:'var(--text-2)'}}>Open </span>
                    <span style={{fontFamily:'var(--font-mono)', color:'var(--green)'}}>{selected.openRate}</span>
                  </div>
                  <div style={{fontSize:12}}>
                    <span style={{color:'var(--text-2)'}}>Reply </span>
                    <span style={{fontFamily:'var(--font-mono)', color:'var(--blue)'}}>{selected.replyRate}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          {previewMode ? (
            <div style={{
              flex:1, fontFamily:'var(--font-mono)', fontSize:13, lineHeight:1.7,
              color:'var(--text-1)', whiteSpace:'pre-wrap', padding:4
            }}>
              {previewContent}
            </div>
          ) : (
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              style={{
                flex:1, background:'transparent', border:'none', outline:'none',
                color:'var(--text-1)', fontFamily:'var(--font-mono)', fontSize:13,
                lineHeight:1.7, resize:'none', minHeight:400
              }}
            />
          )}
          <div style={{
            borderTop:'1px solid var(--border)', paddingTop:8, marginTop:8,
            fontSize:12, color:'var(--text-3)', display:'flex', gap:16
          }}>
            {['{{first_name}}', '{{company}}', '{{industry}}', '{{city}}'].map(tag => (
              <span key={tag} style={{
                background:'var(--bg-2)', padding:'2px 6px', borderRadius:4,
                cursor:'pointer', fontFamily:'var(--font-mono)'
              }}
              onClick={() => setEditContent(prev => prev + tag)}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
