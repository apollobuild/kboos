import { useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const INDUSTRIES = [
  'Automotive & Car Sales','Construction & Renovation','IT Services & Software',
  'Property & Real Estate','Manufacturing','Logistics & Supply Chain',
  'Healthcare & Clinic','F&B & Catering','Education & Training',
  'Finance & Insurance','Legal & Consulting','Retail & E-commerce',
  'Media & Marketing','Video Production','HR & Recruitment',
  'Security Services','Landscaping & Maintenance','Other',
];

const T = {
  EN: {
    badge: 'FREE LIVE DEMO',
    headline: 'See KBOOS Send a Real Message\nTo You — Right Now.',
    sub: 'Fill in your details. AI generates personalised outreach for your business. It arrives on your phone and email in minutes.',
    name: 'Your Name', namePh: 'Ahmad Razif',
    company: 'Company Name', companyPh: 'XYZ Sdn Bhd',
    industry: 'Your Industry',
    phone: 'Your Phone (WhatsApp)', phonePh: '+60 12-345 6789',
    email: 'Your Email', emailPh: 'you@company.com',
    challenge: 'Biggest challenge getting new clients? (optional)', challengePh: 'e.g. Referrals are slowing down. Team too busy for follow-ups.',
    generate: 'Generate My Demo →',
    generating: 'AI is writing your messages…',
    previewTitle: 'Your Personalised Outreach — Ready to Send',
    previewSub: 'This is what will arrive on your phone and email. Review it, then confirm.',
    whatsapp: 'WhatsApp Message',
    email: 'Email',
    subject: 'Subject:',
    consent: 'I agree to receive this demo message on my phone and email.',
    send: 'Send to My Phone & Email →',
    sending: 'Sending…',
    doneTitle: 'Check Your Phone & Email.',
    doneSub: "Your personalised WhatsApp and email just landed. That's exactly how KBOOS works for your clients — AI writes and sends, you just close the deals.",
    doneWa: '✓ WhatsApp sent',
    doneEmail: '✓ Email sent',
    doneWaErr: '✗ WhatsApp failed',
    doneEmailErr: '✗ Email failed',
    bookCall: 'Book a Call with KOBIS →',
    tryAgain: 'Try Again',
    rateLimited: 'One demo per phone number per 24 hours.',
    poweredBy: 'Powered by Claude AI · Built by KOBIS Berhad',
    stats: ['23% avg reply rate', '3× industry average', 'First replies in 48 hrs', '7-day guarantee'],
    required: 'Please fill in Name, Company, Phone, and Email.',
    phoneFormat: 'Enter phone in format: +601X-XXXXXXX',
  },
  MS: {
    badge: 'DEMO PERCUMA',
    headline: 'Lihat KBOOS Hantar Mesej Sebenar\nKepada Anda — Sekarang.',
    sub: 'Isi maklumat anda. AI hasilkan jangkauan peribadi untuk perniagaan anda. Tiba di telefon dan e-mel anda dalam beberapa minit.',
    name: 'Nama Anda', namePh: 'Ahmad Razif',
    company: 'Nama Syarikat', companyPh: 'XYZ Sdn Bhd',
    industry: 'Industri Anda',
    phone: 'Telefon Anda (WhatsApp)', phonePh: '+60 12-345 6789',
    email: 'E-mel Anda', emailPh: 'anda@syarikat.com',
    challenge: 'Cabaran terbesar mendapatkan pelanggan baru? (pilihan)', challengePh: 'cth. Rujukan semakin berkurangan. Pasukan terlalu sibuk.',
    generate: 'Jana Demo Saya →',
    generating: 'AI sedang menulis mesej anda…',
    previewTitle: 'Jangkauan Peribadi Anda — Sedia untuk Dihantar',
    previewSub: 'Ini yang akan tiba di telefon dan e-mel anda. Semak, kemudian sahkan.',
    whatsapp: 'Mesej WhatsApp',
    email: 'E-mel',
    subject: 'Tajuk:',
    consent: 'Saya bersetuju menerima mesej demo ini di telefon dan e-mel saya.',
    send: 'Hantar ke Telefon & E-mel Saya →',
    sending: 'Menghantar…',
    doneTitle: 'Semak Telefon & E-mel Anda.',
    doneSub: 'WhatsApp dan e-mel peribadi anda baru sahaja tiba. Begitulah cara KBOOS bekerja untuk pelanggan anda — AI menulis dan menghantar, anda hanya tutup tawaran.',
    doneWa: '✓ WhatsApp dihantar',
    doneEmail: '✓ E-mel dihantar',
    doneWaErr: '✗ WhatsApp gagal',
    doneEmailErr: '✗ E-mel gagal',
    bookCall: 'Tempah Panggilan dengan KOBIS →',
    tryAgain: 'Cuba Lagi',
    rateLimited: 'Satu demo per nombor telefon setiap 24 jam.',
    poweredBy: 'Dikuasakan oleh Claude AI · Dibina oleh KOBIS Berhad',
    stats: ['23% kadar balasan avg', '3× purata industri', 'Balasan pertama dalam 48 jam', 'Jaminan 7 hari'],
    required: 'Sila isi Nama, Syarikat, Telefon, dan E-mel.',
    phoneFormat: 'Masukkan telefon dalam format: +601X-XXXXXXX',
  },
  ZH: {
    badge: '免费现场演示',
    headline: '看KBOOS实时发送真实消息\n直接到您的手机。',
    sub: '填写您的信息。AI为您的业务生成个性化推广。几分钟内到达您的手机和电子邮件。',
    name: '您的姓名', namePh: '张大明',
    company: '公司名称', companyPh: 'XYZ有限公司',
    industry: '您的行业',
    phone: '您的电话 (WhatsApp)', phonePh: '+60 12-345 6789',
    email: '您的电子邮件', emailPh: 'you@company.com',
    challenge: '获取新客户的最大挑战？（可选）', challengePh: '例如：转介绍越来越少。团队太忙无法跟进。',
    generate: '生成我的演示 →',
    generating: 'AI正在为您撰写消息…',
    previewTitle: '您的个性化推广 — 准备发送',
    previewSub: '这就是将到达您手机和电子邮件的内容。请查看，然后确认。',
    whatsapp: 'WhatsApp消息',
    email: '电子邮件',
    subject: '主题：',
    consent: '我同意在我的手机和电子邮件上接收此演示消息。',
    send: '发送到我的手机和邮箱 →',
    sending: '发送中…',
    doneTitle: '请查看您的手机和电子邮件。',
    doneSub: '您的个性化WhatsApp和电子邮件刚刚发送。这就是KBOOS为您的客户工作的方式——AI写作和发送，您只需成交。',
    doneWa: '✓ WhatsApp已发送',
    doneEmail: '✓ 电子邮件已发送',
    doneWaErr: '✗ WhatsApp发送失败',
    doneEmailErr: '✗ 电子邮件发送失败',
    bookCall: '与KOBIS预约通话 →',
    tryAgain: '重试',
    rateLimited: '每个电话号码每24小时只能演示一次。',
    poweredBy: '由 Claude AI 驱动 · KOBIS Berhad 开发',
    stats: ['平均23%回复率', '行业平均3倍', '48小时内首次回复', '7天保证'],
    required: '请填写姓名、公司、电话和电子邮件。',
    phoneFormat: '电话格式：+601X-XXXXXXX',
  },
};

function LogoMark({ size = 26 }) {
  return (
    <svg width={size} height={Math.round(size * 0.72)} viewBox="0 0 28 20" fill="none">
      <path d="M2 10L8 3L14 10L8 17L2 10Z" fill="oklch(65% 0.2 145 / 0.9)" />
      <path d="M9 10L15 3L21 10L15 17L9 10Z" fill="oklch(62% 0.19 245 / 0.7)" />
      <path d="M16 10L22 3L28 10L22 17L16 10Z" fill="oklch(62% 0.19 245 / 0.5)" />
    </svg>
  );
}

export function SelfServeDemo() {
  const [lang, setLang] = useState('EN');
  const t = T[lang];

  const [form, setForm] = useState({
    name: '', company: '', industry: INDUSTRIES[0], phone: '+60', email: '', challenge: '',
  });
  const [step, setStep] = useState('form'); // form | generating | preview | sending | done
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function generate() {
    setError('');
    if (!form.name.trim() || !form.company.trim() || !form.phone.trim() || !form.email.trim()) {
      setError(t.required); return;
    }
    if (!form.phone.startsWith('+')) { setError(t.phoneFormat); return; }

    setStep('generating');
    try {
      const r = await fetch(`${API}/demo/prospect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, company: form.company, industry: form.industry, phone: form.phone, email: form.email, lang, challenge: form.challenge }),
      });
      const d = await r.json();
      if (r.status === 429) { setError(t.rateLimited); setStep('form'); return; }
      if (!r.ok) throw new Error(d.error || 'Generation failed');
      setPreview(d.preview);
      setStep('preview');
    } catch (e) {
      setError(e.message);
      setStep('form');
    }
  }

  async function send() {
    setStep('sending');
    try {
      const r = await fetch(`${API}/demo/prospect/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, company: form.company, phone: form.phone, email: form.email, preview }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Send failed');
      setResults(d.results);
      setStep('done');
    } catch (e) {
      setError(e.message);
      setStep('preview');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-ui)' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', borderBottom: '1px solid var(--border)', background: 'var(--s1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark size={24} />
          <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', lineHeight: 1.4 }}>
            OUTREACH OS<br />KOBIS BERHAD
          </div>
        </div>
        <div style={{ display: 'flex', gap: '2px', background: 'var(--s2)', borderRadius: 20, padding: 2 }}>
          {['EN', 'MS', 'ZH'].map(l => (
            <button key={l} onClick={() => setLang(l)} style={{
              padding: '5px 10px', borderRadius: 18, fontSize: 11, fontWeight: 600,
              background: lang === l ? 'var(--s1)' : 'transparent',
              color: lang === l ? 'var(--text)' : 'var(--muted)',
              border: lang === l ? '1px solid var(--border)' : '1px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px 80px' }}>
        {step === 'form' && <FormStep t={t} form={form} set={set} lang={lang} error={error} onGenerate={generate} />}
        {step === 'generating' && <GeneratingStep t={t} />}
        {step === 'preview' && <PreviewStep t={t} form={form} preview={preview} consent={consent} setConsent={setConsent} onSend={send} error={error} />}
        {step === 'sending' && <GeneratingStep t={t} label={t.sending} />}
        {step === 'done' && <DoneStep t={t} results={results} form={form} onReset={() => { setStep('form'); setPreview(null); setResults(null); setConsent(false); setError(''); }} />}
      </div>

      <div style={{ textAlign: 'center', padding: '16px 0 32px', fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', opacity: 0.5 }}>
        {t.poweredBy}
      </div>
    </div>
  );
}

function FormStep({ t, form, set, lang, error, onGenerate }) {
  return (
    <>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '40px 0 32px' }}>
        <div style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, background: 'rgba(80,120,255,0.12)', border: '1px solid rgba(80,120,255,0.25)', fontSize: 10, color: 'var(--blue)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 16 }}>
          {t.badge}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', lineHeight: 1.25, marginBottom: 14, whiteSpace: 'pre-line' }}>
          {t.headline}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 420, margin: '0 auto' }}>
          {t.sub}
        </div>
        {/* Stats row */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
          {t.stats.map((s, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--muted)', padding: '4px 12px', background: 'var(--s2)', borderRadius: 20, border: '1px solid var(--border)' }}>
              {s}
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <F label={t.name} required>
            <input value={form.name} onChange={e => set('name', e.target.value)} style={inp} placeholder={t.namePh} />
          </F>
          <F label={t.company} required>
            <input value={form.company} onChange={e => set('company', e.target.value)} style={inp} placeholder={t.companyPh} />
          </F>
        </div>

        <F label={t.industry}>
          <select value={form.industry} onChange={e => set('industry', e.target.value)} style={{ ...inp, colorScheme: 'dark' }}>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </F>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <F label={t.phone} required>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} style={inp} placeholder={t.phonePh} type="tel" />
          </F>
          <F label={t.email} required>
            <input value={form.email} onChange={e => set('email', e.target.value)} style={inp} placeholder={t.emailPh} type="email" />
          </F>
        </div>

        <F label={t.challenge}>
          <textarea value={form.challenge} onChange={e => set('challenge', e.target.value)} rows={2} style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} placeholder={t.challengePh} />
        </F>

        {error && <div style={{ fontSize: 12, color: 'var(--red)', textAlign: 'center' }}>{error}</div>}

        <button onClick={onGenerate} style={{
          width: '100%', padding: '14px', borderRadius: 10, fontSize: 15, fontWeight: 700,
          background: 'var(--blue)', color: '#fff', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-ui)', letterSpacing: '0.01em',
        }}>
          {t.generate}
        </button>

        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)' }}>
          No spam. No subscription. Just the demo.
        </div>
      </div>
    </>
  );
}

function GeneratingStep({ t, label }) {
  const [dotCount, setDotCount] = useState(1);
  useState(() => {
    const id = setInterval(() => setDotCount(d => (d % 3) + 1), 500);
    return () => clearInterval(id);
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center', gap: 20 }}>
      <LogoMark size={40} />
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
          {label || t.generating}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          {'●'.repeat(dotCount)}{'○'.repeat(3 - dotCount)}
        </div>
      </div>
    </div>
  );
}

function PreviewStep({ t, form, preview, consent, setConsent, onSend, error }) {
  const [tab, setTab] = useState('whatsapp');
  return (
    <div style={{ padding: '32px 0 16px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{t.previewTitle}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.previewSub}</div>
      </div>

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[{ id: 'whatsapp', label: t.whatsapp, color: 'green' }, { id: 'email', label: t.email, color: 'blue' }].map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} style={{
            flex: 1, padding: '10px', borderRadius: 9, fontSize: 12, fontWeight: 600,
            background: tab === tb.id ? `rgba(var(--${tb.color}-rgb, 80,200,100), 0.10)` : 'var(--s1)',
            border: `1.5px solid ${tab === tb.id ? `var(--${tb.color})` : 'var(--border)'}`,
            color: tab === tb.id ? `var(--${tb.color})` : 'var(--muted)', cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}>
            {tb.id === 'whatsapp' ? '💬 ' : '✉ '}{tb.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', marginBottom: 16, minHeight: 180 }}>
        {tab === 'whatsapp' ? (
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{preview?.whatsapp}</div>
        ) : (
          <>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>{t.subject}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>{preview?.emailSubject}</div>
            <div style={{ height: 1, background: 'var(--border)', marginBottom: 14 }} />
            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{preview?.emailBody}</div>
          </>
        )}
      </div>

      {/* Sending to */}
      <div style={{ background: 'var(--s2)', borderRadius: 9, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 12 }}>
        <span>📱 {form.phone}</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>✉ {form.email}</span>
      </div>

      {/* Consent */}
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: 16 }}>
        <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 2, flexShrink: 0, accentColor: 'var(--blue)', width: 16, height: 16 }} />
        <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{t.consent}</span>
      </label>

      {error && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10, textAlign: 'center' }}>{error}</div>}

      <button onClick={onSend} disabled={!consent} style={{
        width: '100%', padding: '14px', borderRadius: 10, fontSize: 14, fontWeight: 700,
        background: consent ? 'var(--green)' : 'var(--s2)',
        color: consent ? '#fff' : 'var(--muted)',
        border: 'none', cursor: consent ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-ui)',
        transition: 'all 0.2s',
      }}>
        {t.send}
      </button>
    </div>
  );
}

function DoneStep({ t, results, form, onReset }) {
  const waOk = results?.whatsapp?.ok;
  const emailOk = results?.email?.ok;
  const anyOk = waOk || emailOk;

  return (
    <div style={{ padding: '48px 0 24px', textAlign: 'center' }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%', margin: '0 auto 24px',
        background: anyOk ? 'rgba(80,200,100,0.12)' : 'rgba(255,80,80,0.10)',
        border: `2px solid ${anyOk ? 'var(--green)' : 'var(--red)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 30, color: anyOk ? 'var(--green)' : 'var(--red)',
      }}>
        {anyOk ? '✓' : '!'}
      </div>

      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 10, lineHeight: 1.3 }}>
        {t.doneTitle}
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 400, margin: '0 auto 24px' }}>
        {t.doneSub}
      </div>

      {/* Channel status */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
        <div style={{
          padding: '8px 18px', borderRadius: 20, fontSize: 12, fontWeight: 600,
          background: waOk ? 'rgba(80,200,100,0.10)' : 'rgba(255,80,80,0.10)',
          color: waOk ? 'var(--green)' : 'var(--red)',
          border: `1px solid ${waOk ? 'rgba(80,200,100,0.3)' : 'rgba(255,80,80,0.3)'}`,
        }}>
          {waOk ? t.doneWa : t.doneWaErr}
        </div>
        <div style={{
          padding: '8px 18px', borderRadius: 20, fontSize: 12, fontWeight: 600,
          background: emailOk ? 'rgba(80,200,100,0.10)' : 'rgba(255,80,80,0.10)',
          color: emailOk ? 'var(--green)' : 'var(--red)',
          border: `1px solid ${emailOk ? 'rgba(80,200,100,0.3)' : 'rgba(255,80,80,0.3)'}`,
        }}>
          {emailOk ? t.doneEmail : t.doneEmailErr}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 340, margin: '0 auto' }}>
        <a href="https://wa.me/60XXXXXXXXX" target="_blank" rel="noreferrer" style={{
          display: 'block', padding: '13px', borderRadius: 10, fontSize: 14, fontWeight: 700,
          background: 'var(--green)', color: '#fff', textDecoration: 'none', textAlign: 'center',
        }}>
          {t.bookCall}
        </a>
        <button onClick={onReset} style={{
          padding: '12px', borderRadius: 10, fontSize: 13, fontWeight: 500,
          background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', cursor: 'pointer',
        }}>
          {t.tryAgain}
        </button>
      </div>
    </div>
  );
}

function F({ label, required, children }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 5, display: 'flex', gap: 4 }}>
        {label}{required && <span style={{ color: 'var(--blue)' }}>*</span>}
      </div>
      {children}
    </div>
  );
}

const inp = {
  width: '100%', padding: '10px 12px', fontSize: 13,
  background: 'var(--s2)', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text)', fontFamily: 'var(--font-ui)',
  outline: 'none', boxSizing: 'border-box',
};
