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
    headline: 'AI Is About to Send You a WhatsApp, an Email — and Call Your Phone.',
    sub: 'Fill in your details. In under 3 minutes, personalised outreach fires across all 3 channels — written by KBOOS AI, delivered live. This is exactly what your prospects will experience.',
    channels: [
      { icon: '💬', label: 'WhatsApp', desc: 'Hits their phone instantly' },
      { icon: '📧', label: 'Email', desc: 'Professional, personalised' },
      { icon: '📞', label: 'AI Call', desc: 'Voice agent books the meeting' },
    ],
    name: 'Your Name', namePh: 'Ahmad Razif',
    company: 'Company Name', companyPh: 'XYZ Sdn Bhd',
    industry: 'Your Industry',
    city: 'Your City', cityPh: 'Kuala Lumpur',
    role: 'Your Role', rolePh: 'CEO / Director',
    phone: 'Your Phone (WhatsApp)', phonePh: '+60 12-345 6789',
    email: 'Your Email', emailPh: 'you@company.com',
    challenge: 'Biggest challenge getting new clients? (optional)', challengePh: 'e.g. Referrals slowing down. Too busy to follow up. No system.',
    generate: 'Generate My Demo — Fire All 3 Channels →',
    generating: 'KBOOS AI is writing your messages…',
    previewTitle: 'Your Personalised Outreach — Ready to Fire',
    previewSub: 'Review what\'s about to hit your phone, email, and be called by AI. Then confirm.',
    whatsapp: 'WhatsApp',
    email: 'Email',
    subject: 'Subject:',
    consent: 'I agree to receive a WhatsApp message, email, and AI voice call as part of this live demo.',
    send: '🚀 Fire All 3 Channels Now →',
    sending: 'Firing all 3 channels…',
    doneTitle: "Check Your Phone — It's Live.",
    doneSub: 'Your WhatsApp and email just landed. An AI voice agent is calling your number right now — answer it and feel exactly what your prospects will experience.',
    doneWa: '✓ WhatsApp delivered',
    doneEmail: '✓ Email delivered',
    doneVoice: '📞 AI calling now…',
    doneVoiceErr: '✗ Call failed',
    doneWaErr: '✗ WhatsApp failed',
    doneEmailErr: '✗ Email failed',
    voiceNote: '📞 An AI voice agent will also call your number right after — answer to feel the full experience',
    bookCall: 'Want This for Your Business? Book a Call →',
    tryAgain: 'Try Again',
    rateLimited: 'One demo per phone number per 24 hours.',
    poweredBy: 'Powered by KBOOS AI · Built by KOBIS Berhad',
    stats: [
      { text: '23% avg reply rate', color: 'green' },
      { text: '3× industry average', color: 'blue' },
      { text: 'First replies in 48 hrs', color: 'amber' },
      { text: '7-day money-back', color: 'green' },
    ],
    required: 'Please fill in Name, Company, Phone, and Email.',
    phoneFormat: 'Enter phone in format: +601X-XXXXXXX',
  },
  MS: {
    badge: 'DEMO PERCUMA',
    headline: 'AI Akan Hantar WhatsApp, E-mel — dan Telefon Anda Sekarang.',
    sub: 'Isi maklumat anda. Dalam 3 minit, jangkauan peribadi akan tiba di 3 saluran — ditulis oleh KBOOS AI, dihantar secara langsung. Ini pengalaman sebenar pelanggan anda.',
    channels: [
      { icon: '💬', label: 'WhatsApp', desc: 'Tiba di telefon serta-merta' },
      { icon: '📧', label: 'E-mel', desc: 'Profesional, diperibadikan' },
      { icon: '📞', label: 'Panggilan AI', desc: 'Ejen suara tempah temujanji' },
    ],
    name: 'Nama Anda', namePh: 'Ahmad Razif',
    company: 'Nama Syarikat', companyPh: 'XYZ Sdn Bhd',
    industry: 'Industri Anda',
    city: 'Bandar Anda', cityPh: 'Kuala Lumpur',
    role: 'Jawatan Anda', rolePh: 'Pengurus / Pengarah',
    phone: 'Telefon (WhatsApp)', phonePh: '+60 12-345 6789',
    email: 'E-mel Anda', emailPh: 'anda@syarikat.com',
    challenge: 'Cabaran terbesar mendapat pelanggan baru? (pilihan)', challengePh: 'cth. Rujukan semakin berkurangan. Tiada sistem susulan.',
    generate: 'Jana Demo Saya — Tembak 3 Saluran →',
    generating: 'KBOOS AI sedang menulis mesej anda…',
    previewTitle: 'Jangkauan Peribadi Anda — Sedia Dihantar',
    previewSub: 'Semak apa yang akan tiba di telefon, e-mel dan panggilan AI anda. Kemudian sahkan.',
    whatsapp: 'WhatsApp',
    email: 'E-mel',
    subject: 'Tajuk:',
    consent: 'Saya bersetuju menerima WhatsApp, e-mel dan panggilan suara AI sebagai demo langsung.',
    send: '🚀 Tembak 3 Saluran Sekarang →',
    sending: 'Menghantar 3 saluran…',
    doneTitle: 'Semak Telefon Anda — Ia Hidup.',
    doneSub: 'WhatsApp dan e-mel anda baru sahaja tiba. Ejen suara AI sedang menghubungi nombor anda sekarang — angkat untuk rasai pengalaman penuh.',
    doneWa: '✓ WhatsApp dihantar',
    doneEmail: '✓ E-mel dihantar',
    doneVoice: '📞 AI memanggil sekarang…',
    doneVoiceErr: '✗ Panggilan gagal',
    doneWaErr: '✗ WhatsApp gagal',
    doneEmailErr: '✗ E-mel gagal',
    voiceNote: '📞 Ejen AI juga akan menghubungi nombor anda selepas ini — angkat untuk rasai sistem penuh',
    bookCall: 'Mahu Ini untuk Perniagaan Anda? Tempah Panggilan →',
    tryAgain: 'Cuba Lagi',
    rateLimited: 'Satu demo per nombor telefon setiap 24 jam.',
    poweredBy: 'Dikuasakan oleh KBOOS AI · Dibina oleh KOBIS Berhad',
    stats: [
      { text: '23% kadar balasan avg', color: 'green' },
      { text: '3× purata industri', color: 'blue' },
      { text: 'Balasan pertama 48 jam', color: 'amber' },
      { text: 'Jaminan 7 hari', color: 'green' },
    ],
    required: 'Sila isi Nama, Syarikat, Telefon, dan E-mel.',
    phoneFormat: 'Masukkan telefon dalam format: +601X-XXXXXXX',
  },
  ZH: {
    badge: '免费现场演示',
    headline: 'AI即将向您发送WhatsApp、邮件 — 并打电话给您。',
    sub: '填写您的信息。在3分钟内，个性化推广将通过全部3个渠道触达您 — 由KBOOS AI撰写，即时发送。这正是您的客户将体验到的。',
    channels: [
      { icon: '💬', label: 'WhatsApp', desc: '即时到达手机' },
      { icon: '📧', label: '电子邮件', desc: '专业、个性化' },
      { icon: '📞', label: 'AI通话', desc: '语音代理预约会议' },
    ],
    name: '您的姓名', namePh: '张大明',
    company: '公司名称', companyPh: 'XYZ有限公司',
    industry: '您的行业',
    city: '您的城市', cityPh: '吉隆坡',
    role: '您的职位', rolePh: '总裁 / 总监',
    phone: '您的电话 (WhatsApp)', phonePh: '+60 12-345 6789',
    email: '您的电子邮件', emailPh: 'you@company.com',
    challenge: '获取新客户的最大挑战？（可选）', challengePh: '例如：转介绍越来越少。没有系统跟进。',
    generate: '生成我的演示 — 激活全部3个渠道 →',
    generating: 'KBOOS AI正在为您撰写消息…',
    previewTitle: '您的个性化推广 — 准备发送',
    previewSub: '查看即将到达您手机、邮箱和AI通话的内容。然后确认。',
    whatsapp: 'WhatsApp',
    email: '电子邮件',
    subject: '主题：',
    consent: '我同意接收WhatsApp消息、电子邮件和AI语音通话作为现场演示。',
    send: '🚀 立即激活全部3个渠道 →',
    sending: '正在激活所有渠道…',
    doneTitle: '查看您的手机 — 已上线。',
    doneSub: 'WhatsApp和电子邮件刚刚到达您的手机。AI语音代理正在拨打您的电话 — 接听以体验完整系统。',
    doneWa: '✓ WhatsApp已发送',
    doneEmail: '✓ 电子邮件已发送',
    doneVoice: '📞 AI正在拨打…',
    doneVoiceErr: '✗ 通话失败',
    doneWaErr: '✗ WhatsApp发送失败',
    doneEmailErr: '✗ 电子邮件发送失败',
    voiceNote: '📞 AI语音代理也将随后拨打您的号码 — 接听以体验完整系统',
    bookCall: '想为您的业务使用？立即预约通话 →',
    tryAgain: '重试',
    rateLimited: '每个电话号码每24小时只能演示一次。',
    poweredBy: '由 KBOOS AI 驱动 · KOBIS Berhad 开发',
    stats: [
      { text: '平均23%回复率', color: 'green' },
      { text: '行业平均3倍', color: 'blue' },
      { text: '48小时内首次回复', color: 'amber' },
      { text: '7天退款保证', color: 'green' },
    ],
    required: '请填写姓名、公司、电话和电子邮件。',
    phoneFormat: '电话格式：+601X-XXXXXXX',
  },
};

function KboosLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ display: 'block', animation: 'lpIconPulse 4s ease-in-out infinite' }}>
        <svg width="32" height="23" viewBox="0 0 28 20" fill="none" style={{ display: 'block', filter: 'drop-shadow(0 0 10px oklch(70% 0.24 145 / 0.8))' }}>
          <path d="M2 10L8 3L14 10L8 17L2 10Z" fill="oklch(75% 0.24 145 / 0.95)" />
          <path d="M9 10L15 3L21 10L15 17L9 10Z" fill="oklch(65% 0.2 210 / 0.8)" />
          <path d="M16 10L22 3L28 10L22 17L16 10Z" fill="oklch(60% 0.2 260 / 0.55)" />
        </svg>
      </span>
      <div>
        <div style={{
          fontSize: 18, fontWeight: 900, letterSpacing: '0.12em', lineHeight: 1,
          background: 'linear-gradient(90deg,oklch(78% 0.22 145) 0%,oklch(72% 0.2 185) 40%,oklch(65% 0.2 245) 70%,oklch(78% 0.22 145) 100%)',
          backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text', animation: 'lpGradShift 4s linear infinite',
        }}>KBOOS</div>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 1 }}>Outreach OS</div>
      </div>
    </div>
  );
}

export function SelfServeDemo() {
  const [lang, setLang] = useState('EN');
  const t = T[lang];

  const [form, setForm] = useState({
    name: '', company: '', industry: INDUSTRIES[0], city: '', role: '', phone: '+60', email: '', challenge: '',
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
        body: JSON.stringify({ name: form.name, company: form.company, industry: form.industry, city: form.city, title: form.role, phone: form.phone, email: form.email, lang, challenge: form.challenge }),
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
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: 'var(--bg)', fontFamily: 'var(--font-ui)' }}>
      <style>{`
        @keyframes lpIconPulse { 0%,100%{opacity:0.85} 50%{opacity:1} }
        @keyframes lpGradShift { from{background-position:0% center} to{background-position:200% center} }
      `}</style>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--s1)' }}>
        <KboosLogo />
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

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 20px' }}>
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
      <div style={{ textAlign: 'center', padding: '36px 0 28px' }}>
        <div style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, background: 'rgba(80,200,100,0.10)', border: '1px solid rgba(80,200,100,0.3)', fontSize: 10, color: 'var(--green)', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', marginBottom: 18 }}>
          {t.badge}
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', lineHeight: 1.3, marginBottom: 14 }}>
          {t.headline}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.75, maxWidth: 400, margin: '0 auto 20px' }}>
          {t.sub}
        </div>
        {/* 3 channel pills */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
          {t.channels.map((ch, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: i === 0 ? 'rgba(80,200,100,0.10)' : i === 1 ? 'rgba(80,120,255,0.10)' : 'rgba(120,80,255,0.10)',
              border: `1px solid ${i === 0 ? 'rgba(80,200,100,0.3)' : i === 1 ? 'rgba(80,120,255,0.3)' : 'rgba(120,80,255,0.3)'}`,
              color: i === 0 ? 'var(--green)' : i === 1 ? 'var(--blue)' : 'var(--purple)',
            }}>
              <span>{ch.icon}</span>
              <span>{ch.label}</span>
              <span style={{ fontSize: 10, opacity: 0.7 }}>— {ch.desc}</span>
            </div>
          ))}
        </div>
        {/* Stats row */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          {t.stats.map((s, i) => {
            const bg = { green: 'rgba(80,200,100,0.10)', blue: 'rgba(80,120,255,0.10)', amber: 'rgba(245,166,35,0.10)' };
            const border = { green: 'rgba(80,200,100,0.3)', blue: 'rgba(80,120,255,0.3)', amber: 'rgba(245,166,35,0.3)' };
            const textColor = { green: 'var(--green)', blue: 'var(--blue)', amber: 'var(--amber)' };
            return (
              <div key={i} style={{
                fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
                background: bg[s.color], border: `1px solid ${border[s.color]}`, color: textColor[s.color],
              }}>
                {s.text}
              </div>
            );
          })}
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
          <F label={t.city}>
            <input value={form.city} onChange={e => set('city', e.target.value)} style={inp} placeholder={t.cityPh} />
          </F>
          <F label={t.role}>
            <input value={form.role} onChange={e => set('role', e.target.value)} style={inp} placeholder={t.rolePh} />
          </F>
        </div>

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
      <svg width="48" height="35" viewBox="0 0 28 20" fill="none" style={{ filter: 'drop-shadow(0 0 14px oklch(70% 0.24 145 / 0.9))', animation: 'lpIconPulse 1.5s ease-in-out infinite' }}>
        <path d="M2 10L8 3L14 10L8 17L2 10Z" fill="oklch(75% 0.24 145 / 0.95)" />
        <path d="M9 10L15 3L21 10L15 17L9 10Z" fill="oklch(65% 0.2 210 / 0.8)" />
        <path d="M16 10L22 3L28 10L22 17L16 10Z" fill="oklch(60% 0.2 260 / 0.55)" />
      </svg>
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
      <div style={{ background: 'var(--s2)', borderRadius: 9, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <span>💬 {form.phone}</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>✉ {form.email}</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>📞 {form.phone}</span>
      </div>

      {/* Voice note */}
      <div style={{ background: 'rgba(120,80,255,0.08)', border: '1px solid rgba(120,80,255,0.2)', borderRadius: 9, padding: '9px 14px', marginBottom: 14, fontSize: 12, color: 'var(--purple)', lineHeight: 1.5 }}>
        {t.voiceNote}
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
  const voiceOk = results?.voice?.ok;
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
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
        <div style={{
          padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
          background: waOk ? 'rgba(80,200,100,0.10)' : 'rgba(255,80,80,0.10)',
          color: waOk ? 'var(--green)' : 'var(--red)',
          border: `1px solid ${waOk ? 'rgba(80,200,100,0.3)' : 'rgba(255,80,80,0.3)'}`,
        }}>
          {waOk ? t.doneWa : t.doneWaErr}
        </div>
        <div style={{
          padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
          background: emailOk ? 'rgba(80,200,100,0.10)' : 'rgba(255,80,80,0.10)',
          color: emailOk ? 'var(--green)' : 'var(--red)',
          border: `1px solid ${emailOk ? 'rgba(80,200,100,0.3)' : 'rgba(255,80,80,0.3)'}`,
        }}>
          {emailOk ? t.doneEmail : t.doneEmailErr}
        </div>
        <div style={{
          padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
          background: voiceOk === false ? 'rgba(255,80,80,0.10)' : 'rgba(120,80,255,0.10)',
          color: voiceOk === false ? 'var(--red)' : 'var(--purple)',
          border: `1px solid ${voiceOk === false ? 'rgba(255,80,80,0.3)' : 'rgba(120,80,255,0.3)'}`,
          animation: voiceOk !== false ? 'pulse 2s infinite' : 'none',
        }}>
          {voiceOk === false ? t.doneVoiceErr : t.doneVoice}
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
