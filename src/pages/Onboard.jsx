import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const STEPS = [
  { id: 'offer',    label: 'Your Offer',       icon: '◈' },
  { id: 'customer', label: 'Best Customer',     icon: '◉' },
  { id: 'results',  label: 'Proof & Results',   icon: '◆' },
  { id: 'style',    label: 'How You Communicate', icon: '◇' },
  { id: 'goals',    label: 'Your Goals',        icon: '▶' },
];

const T = {
  EN: {
    settingUp: 'Setting up',
    outreachSystem: "'s Outreach System",
    helpBuild: 'Help us build the perfect sequence for your business. This takes about 5 minutes.',
    step: 'Step',
    of: 'of',
    back: '← Back',
    continue: 'Continue →',
    submit: 'Submit →',
    sending: 'Sending…',
    received: 'Submission received',
    gotEverything: "We've got everything we need.",
    reviewDetails: 'Your KOBIS team will review the details and build',
    withinHours: "'s personalised outreach sequence within 24 hours.",
    offer: 'Your Offer',
    whatSell: 'What exactly do you sell or offer?',
    whatSellHint: "e.g. \"We help F&B brands automate their HR payroll and reduce compliance risk\"",
    dreamOutcome: "What's the dream outcome for your best client?",
    dreamOutcomeHint: 'The transformation they get — not the features you sell',
    effortRemoved: 'What hard work do you take off their plate?',
    effortRemovedHint: 'What does the client NOT have to do anymore?',
    guarantee: "What's your guarantee or risk reversal?",
    guaranteeHint: 'What removes the fear of trying?',
    customer: 'Best Customer',
    describeBest: 'Describe your best customer',
    describeBestHint: 'The type of company and person who gets the most value from you',
    industry: 'Industry / Sector',
    companySize: 'Company Size',
    geography: 'Geography / Location Focus',
    results: 'Proof & Results',
    whatProof: 'What results or proof do you have?',
    whatProofHint: 'Numbers, case studies, testimonials',
    timeResult: 'How long does it take to see first results?',
    caseStudy: 'Any specific case study you want us to reference?',
    style: 'How You Communicate',
    communicationStyle: "What's your brand communication style?",
    language: 'Primary language for outreach',
    neverSay: 'Anything we should NEVER say or do in your outreach?',
    neverSayHint: "Competitors not to mention, things that feel off-brand, etc.",
    sampleMessage: 'Paste a sample of how you normally message clients (optional)',
    sampleMessageHint: "This helps us match your voice exactly",
    goals: 'Your Goals',
    primaryGoal: 'What is your primary goal from this outreach campaign?',
    leadsPerMonth: 'How many new leads per month are you targeting?',
    currentChallenge: "What's your biggest challenge in getting new clients right now?",
    anythingElse: 'Anything else you want us to know?',
    anythingElseHint: 'Seasonal considerations, specific events, important context',
  },
  MS: {
    settingUp: 'Menyediakan',
    outreachSystem: ' Sistem Jangkauan Anda',
    helpBuild: 'Bantu kami membina urutan yang sempurna untuk perniagaan anda. Ini mengambil masa kira-kira 5 minit.',
    step: 'Langkah',
    of: 'daripada',
    back: '← Kembali',
    continue: 'Teruskan →',
    submit: 'Hantar →',
    sending: 'Menghantar…',
    received: 'Penerimaan disahkan',
    gotEverything: 'Kami sudah mendapat semua maklumat yang diperlukan.',
    reviewDetails: 'Pasukan KOBIS anda akan menyemak butiran dan membina',
    withinHours: ' urutan jangkauan peribadi anda dalam masa 24 jam.',
    offer: 'Penawaran Anda',
    whatSell: 'Apakah yang anda jual atau tawarkan?',
    whatSellHint: 'cth: "Kami membantu jenama F&B mengautomasikan gaji HR mereka dan mengurangkan risiko pematuhan"',
    dreamOutcome: 'Apakah hasil impian untuk pelanggan terbaik anda?',
    dreamOutcomeHint: 'Transformasi yang mereka perolehi — bukan ciri yang anda jual',
    effortRemoved: 'Kerja keras apa yang anda hapuskan dari piring mereka?',
    effortRemovedHint: 'Apa yang pelanggan TIDAK perlu lakukan lagi?',
    guarantee: 'Apakah jaminan atau pembalikan risiko anda?',
    guaranteeHint: 'Apa yang menghilangkan ketakutan mencuba?',
    customer: 'Pelanggan Terbaik',
    describeBest: 'Terangkan pelanggan terbaik anda',
    describeBestHint: 'Jenis syarikat dan orang yang mendapat nilai paling tinggi daripada anda',
    industry: 'Industri / Sektor',
    companySize: 'Saiz Syarikat',
    geography: 'Fokus Geografi / Lokasi',
    results: 'Bukti & Hasil',
    whatProof: 'Apakah hasil atau bukti yang anda miliki?',
    whatProofHint: 'Angka, kajian kes, testimoni',
    timeResult: 'Berapa lama masa untuk melihat hasil pertama?',
    caseStudy: 'Adakah ada kajian kes khusus yang ingin kami rujuk?',
    style: 'Cara Anda Berkomunikasi',
    communicationStyle: 'Apakah gaya komunikasi jenama anda?',
    language: 'Bahasa utama untuk jangkauan',
    neverSay: 'Apa yang TIDAK boleh kami katakan atau lakukan dalam jangkauan anda?',
    neverSayHint: 'Pesaing yang tidak boleh disebutkan, perkara yang terasa tidak sesuai dengan jenama, dsb.',
    sampleMessage: 'Tampal sampel bagaimana anda biasanya menghantar mesej kepada pelanggan (pilihan)',
    sampleMessageHint: 'Ini membantu kami sepadan dengan suara anda dengan tepat',
    goals: 'Matlamat Anda',
    primaryGoal: 'Apakah matlamat utama anda daripada kempen jangkauan ini?',
    leadsPerMonth: 'Berapa banyak prospek baru setiap bulan yang anda targetkan?',
    currentChallenge: 'Apakah cabaran terbesar anda dalam mendapatkan pelanggan baru sekarang?',
    anythingElse: 'Adakah apa-apa lagi yang anda ingin kami ketahui?',
    anythingElseHint: 'Pertimbangan musiman, acara khusus, konteks penting',
  },
};

function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={Math.round(size * 0.72)} viewBox="0 0 28 20" fill="none">
      <path d="M2 10L8 3L14 10L8 17L2 10Z" fill="oklch(65% 0.2 145 / 0.9)" />
      <path d="M9 10L15 3L21 10L15 17L9 10Z" fill="oklch(62% 0.19 245 / 0.7)" />
      <path d="M16 10L22 3L28 10L22 17L16 10Z" fill="oklch(62% 0.19 245 / 0.5)" />
    </svg>
  );
}

export function Onboard() {
  const token = window.location.pathname.split('/onboard/')[1]?.split('?')[0];
  const [lang, setLang] = useState('EN');
  const t = T[lang];
  const [bizName, setBizName] = useState('');
  const [bizId, setBizId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    // Step 1 — Offer
    service: '',
    dreamOutcome: '',
    effortRemoved: '',
    riskReversal: '',
    // Step 2 — Best Customer
    bestCustomer: '',
    industry: '',
    companySize: '',
    geography: '',
    // Step 3 — Proof & Results
    proof: '',
    timeToResult: '',
    caseStudy: '',
    // Step 4 — Communication Style
    style: 'professional',
    lang: 'EN',
    doNot: '',
    sampleMessage: '',
    // Step 5 — Goals
    goals: '',
    targetLeadsPerMonth: '',
    currentChallenge: '',
    additionalNotes: '',
  });

  useEffect(() => {
    if (!token) { setError('Invalid link'); setLoading(false); return; }
    fetch(`${API}/onboard/token/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setBizName(d.bizName);
        setBizId(d.bizId);
      })
      .catch(() => setError('Could not load this link. Please try again.'))
      .finally(() => setLoading(false));
  }, [token]);

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function submit() {
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/onboard/submit/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, bizName }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Submission failed');
      setDone(true);
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div style={pageStyle}>
      <div style={{ fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>Loading…</div>
    </div>
  );

  if (error && !bizName) return (
    <div style={pageStyle}>
      <LogoMark size={32} />
      <div style={{ marginTop: 24, fontSize: 14, color: 'var(--red)', textAlign: 'center', maxWidth: 360 }}>{error}</div>
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>Please contact your KOBIS team for a new link.</div>
    </div>
  );

  if (done) return (
    <div style={pageStyle}>
      <LogoMark size={36} />
      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
          {t.gotEverything}
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 400 }}>
          {t.reviewDetails} {bizName}{t.withinHours}
        </div>
        <div style={{ marginTop: 32, padding: '14px 24px', background: 'rgba(80,200,100,0.08)', border: '1px solid rgba(80,200,100,0.2)', borderRadius: 10, display: 'inline-block' }}>
          <span style={{ fontSize: 20 }}>✓</span>
          <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>{t.received}</span>
        </div>
      </div>
      <div style={{ marginTop: 40, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
        OUTREACH OS · KOBIS BERHAD
      </div>
    </div>
  );

  const currentStep = STEPS[step];
  const progress = ((step) / STEPS.length) * 100;

  return (
    <div style={pageStyle}>
      {/* Header with language selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark size={28} />
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', lineHeight: 1 }}>
              OUTREACH OS · KOBIS BERHAD
            </div>
            <div style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginTop: 2 }}>
              ONBOARDING
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, borderRadius: 20, background: 'var(--s2)', padding: '3px' }}>
          {['EN', 'MS'].map(l => (
            <button key={l} onClick={() => setLang(l)} style={{
              padding: '6px 12px', borderRadius: 18, fontSize: 11, fontWeight: 600,
              background: lang === l ? 'var(--s1)' : 'transparent',
              color: lang === l ? 'var(--text)' : 'var(--muted)',
              border: 'none', cursor: 'pointer',
              transition: 'all 0.15s',
            }}>
              {l === 'EN' ? 'English' : 'Melayu'}
            </button>
          ))}
        </div>
      </div>

      {/* Hero heading — personalised */}
      <div style={{ textAlign: 'center', marginBottom: 32, maxWidth: 520 }}>
        <div style={{ fontSize: 11, color: 'var(--blue)', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', marginBottom: 10, textTransform: 'uppercase' }}>
          {t.settingUp}
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, marginBottom: 8 }}>
          {bizName}{t.outreachSystem}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
          {t.helpBuild}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: 520, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: i < step ? 'pointer' : 'default' }}
              onClick={() => i < step && setStep(i)}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', border: '1.5px solid',
                borderColor: i === step ? 'var(--blue)' : i < step ? 'var(--green)' : 'var(--border)',
                background: i < step ? 'rgba(80,200,100,0.12)' : i === step ? 'rgba(80,120,255,0.12)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, color: i < step ? 'var(--green)' : i === step ? 'var(--blue)' : 'var(--muted)',
                transition: 'all 0.2s',
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: 9, color: i === step ? 'var(--text)' : 'var(--muted)', fontFamily: 'var(--font-mono)', textAlign: 'center', maxWidth: 60, lineHeight: 1.2, display: 'none' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 3, background: 'var(--s2)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--blue)', borderRadius: 2, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            {t.step} {step + 1} {t.of} {STEPS.length} — {currentStep.label}
          </span>
          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            {Math.round(((step + 1) / STEPS.length) * 100)}%
          </span>
        </div>
      </div>

      {/* Step card with scrollable content */}
      <div style={{ width: '100%', maxWidth: 520, background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', marginBottom: 16, maxHeight: 'calc(100vh - 420px)' }}>
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
            {currentStep.icon} {currentStep.label}
          </div>
        </div>
        <div style={{ overflow: 'auto', flex: 1, padding: '24px 28px' }}>

          {step === 0 && <StepOffer form={form} set={setField} bizName={bizName} t={t} />}
          {step === 1 && <StepCustomer form={form} set={setField} t={t} />}
          {step === 2 && <StepResults form={form} set={setField} t={t} />}
          {step === 3 && <StepStyle form={form} set={setField} t={t} lang={lang} />}
          {step === 4 && <StepGoals form={form} set={setField} t={t} />}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 520 }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={btnGhost}>
            {t.back}
          </button>
        )}
        <div style={{ flex: 1 }} />
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(s => s + 1)} style={btnPrimary}>
            {t.continue}
          </button>
        ) : (
          <button onClick={submit} disabled={submitting} style={{ ...btnPrimary, background: 'var(--green)', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? t.sending : t.submit}
          </button>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--red)', textAlign: 'center' }}>{error}</div>
      )}

      <div style={{ marginTop: 40, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', opacity: 0.5 }}>
        OUTREACH OS · KOBIS BERHAD · POWERED BY CLAUDE AI
      </div>
    </div>
  );
}

function StepOffer({ form, set, bizName, t }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label={t.whatSell} hint={t.whatSellHint} required>
        <textarea value={form.service} onChange={e => set('service', e.target.value)} rows={3} style={textareaStyle}
          placeholder={`${bizName} offers…`} />
      </Field>
      <Field label={t.dreamOutcome} hint={t.dreamOutcomeHint} required>
        <textarea value={form.dreamOutcome} onChange={e => set('dreamOutcome', e.target.value)} rows={2} style={textareaStyle}
          placeholder="e.g. 3× more qualified leads without hiring extra sales staff" />
      </Field>
      <Field label={t.effortRemoved} hint={t.effortRemovedHint}>
        <input value={form.effortRemoved} onChange={e => set('effortRemoved', e.target.value)} style={inputStyle}
          placeholder="e.g. Cold calling, manual follow-ups, list building" />
      </Field>
      <Field label={t.guarantee} hint={t.guaranteeHint}>
        <input value={form.riskReversal} onChange={e => set('riskReversal', e.target.value)} style={inputStyle}
          placeholder="e.g. 10 qualified meetings or full refund" />
      </Field>
    </div>
  );
}

function StepCustomer({ form, set, t }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label={t.describeBest} hint={t.describeBestHint} required>
        <textarea value={form.bestCustomer} onChange={e => set('bestCustomer', e.target.value)} rows={3} style={textareaStyle}
          placeholder="e.g. SME owners in manufacturing sector, 20–200 staff, struggling with manual procurement" />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label={t.industry}>
          <input value={form.industry} onChange={e => set('industry', e.target.value)} style={inputStyle}
            placeholder="e.g. Logistics, F&B, Healthcare" />
        </Field>
        <Field label={t.companySize}>
          <input value={form.companySize} onChange={e => set('companySize', e.target.value)} style={inputStyle}
            placeholder="e.g. 10–100 staff, SME" />
        </Field>
      </div>
      <Field label={t.geography}>
        <input value={form.geography} onChange={e => set('geography', e.target.value)} style={inputStyle}
          placeholder="e.g. Klang Valley, Johor, all Malaysia" />
      </Field>
    </div>
  );
}

function StepResults({ form, set, t }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label={t.whatProof} hint={t.whatProofHint} required>
        <textarea value={form.proof} onChange={e => set('proof', e.target.value)} rows={3} style={textareaStyle}
          placeholder="e.g. Helped ABC Sdn Bhd close 12 new clients in 60 days. Typical client sees 40% reduction in admin time." />
      </Field>
      <Field label={t.timeResult}>
        <input value={form.timeToResult} onChange={e => set('timeToResult', e.target.value)} style={inputStyle}
          placeholder="e.g. First lead within 7 days, meaningful results in 30 days" />
      </Field>
      <Field label={t.caseStudy}>
        <textarea value={form.caseStudy} onChange={e => set('caseStudy', e.target.value)} rows={2} style={textareaStyle}
          placeholder="e.g. Client XYZ in Penang — from 2 deals/month to 8 deals/month in 90 days" />
      </Field>
    </div>
  );
}

function StepStyle({ form, set, t, lang }) {
  const styleOpts = [
    { value: 'professional', label: 'Professional & polished' },
    { value: 'warm', label: 'Warm & relationship-first' },
    { value: 'direct', label: 'Direct & no-nonsense' },
    { value: 'casual', label: 'Casual & conversational' },
  ];
  const langOpts = [
    { value: 'EN', label: 'English' },
    { value: 'MS', label: 'Bahasa Malaysia' },
    { value: 'ZH', label: 'Mandarin (中文)' },
    { value: 'MIXED', label: 'Mixed (EN + BM Manglish)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label={t.communicationStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {styleOpts.map(o => (
            <div key={o.value}
              onClick={() => set('style', o.value)}
              style={{
                padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                border: `1.5px solid ${form.style === o.value ? 'var(--blue)' : 'var(--border)'}`,
                background: form.style === o.value ? 'rgba(80,120,255,0.10)' : 'var(--s2)',
                color: form.style === o.value ? 'var(--text)' : 'var(--muted)',
                transition: 'all 0.15s',
              }}>
              {o.label}
            </div>
          ))}
        </div>
      </Field>
      <Field label={t.language}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {langOpts.map(o => (
            <div key={o.value}
              onClick={() => set('lang', o.value)}
              style={{
                padding: '7px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12,
                border: `1.5px solid ${form.lang === o.value ? 'var(--blue)' : 'var(--border)'}`,
                background: form.lang === o.value ? 'rgba(80,120,255,0.10)' : 'var(--s2)',
                color: form.lang === o.value ? 'var(--text)' : 'var(--muted)',
                transition: 'all 0.15s',
              }}>
              {o.label}
            </div>
          ))}
        </div>
      </Field>
      <Field label={t.neverSay} hint={t.neverSayHint}>
        <textarea value={form.doNot} onChange={e => set('doNot', e.target.value)} rows={2} style={textareaStyle}
          placeholder="e.g. Don't mention competitor names. Avoid aggressive urgency tactics." />
      </Field>
      <Field label={t.sampleMessage} hint={t.sampleMessageHint}>
        <textarea value={form.sampleMessage} onChange={e => set('sampleMessage', e.target.value)} rows={3} style={textareaStyle}
          placeholder="Paste a WhatsApp or email you've sent before…" />
      </Field>
    </div>
  );
}

function StepGoals({ form, set, t }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Field label={t.primaryGoal} required>
        <textarea value={form.goals} onChange={e => set('goals', e.target.value)} rows={2} style={textareaStyle}
          placeholder="e.g. Book discovery calls, generate WhatsApp enquiries, get referrals from existing clients" />
      </Field>
      <Field label={t.leadsPerMonth}>
        <input value={form.targetLeadsPerMonth} onChange={e => set('targetLeadsPerMonth', e.target.value)} style={inputStyle}
          placeholder="e.g. 20 qualified leads / month" />
      </Field>
      <Field label={t.currentChallenge}>
        <textarea value={form.currentChallenge} onChange={e => set('currentChallenge', e.target.value)} rows={2} style={textareaStyle}
          placeholder="e.g. People don't reply to cold messages. Our team is too busy to follow up consistently." />
      </Field>
      <Field label={t.anythingElse} hint={t.anythingElseHint}>
        <textarea value={form.additionalNotes} onChange={e => set('additionalNotes', e.target.value)} rows={2} style={textareaStyle}
          placeholder="Any other context that would help us build the best possible sequence for you…" />
      </Field>
    </div>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4, display: 'flex', gap: 4 }}>
        {label}
        {required && <span style={{ color: 'var(--blue)', fontSize: 11 }}>*</span>}
      </div>
      {hint && <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, lineHeight: 1.4 }}>{hint}</div>}
      {children}
    </div>
  );
}

const pageStyle = {
  minHeight: '100vh',
  background: 'var(--bg)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  padding: '48px 20px 80px',
  fontFamily: 'var(--font-ui)',
};

const inputStyle = {
  width: '100%', padding: '8px 12px', fontSize: 13,
  background: 'var(--s2)', border: '1px solid var(--border)',
  borderRadius: 7, color: 'var(--text)', fontFamily: 'var(--font-ui)',
  outline: 'none', boxSizing: 'border-box',
};

const textareaStyle = {
  ...inputStyle, resize: 'vertical', lineHeight: 1.5,
};

const btnPrimary = {
  padding: '10px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600,
  background: 'var(--blue)', color: '#fff', border: 'none', cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
};

const btnGhost = {
  padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
  background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)',
  cursor: 'pointer', fontFamily: 'var(--font-ui)',
};
