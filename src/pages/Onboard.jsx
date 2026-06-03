import { useState, useEffect } from 'react';
import { API_BASE as API } from '../config/api.js';

const STEPS = [
  { id: 'offer',    label: 'Your Offer' },
  { id: 'customer', label: 'Best Customer' },
  { id: 'results',  label: 'Proof & Results' },
  { id: 'style',    label: 'Communication Style' },
  { id: 'goals',    label: 'Your Goals' },
];

const T = {
  EN: {
    settingUp: 'SETTING UP',
    outreachSystem: "'s Outreach System",
    tagline: 'Help us build the perfect sequence for your business. Takes about 5 minutes.',
    step: 'Step', of: 'of',
    back: '← Back', continue: 'Continue →', submit: 'Submit', sending: 'Sending…',
    receivedTitle: "We've got everything we need.",
    receivedBody: 'Your KOBIS team will review and build',
    receivedBody2: "'s personalised sequence within 24 hours.",
    receivedTag: 'Submission received',
    contactKobis: 'Please contact your KOBIS team for a new link.',
    // Step labels
    stepOfferTitle: 'Your Offer',
    stepCustomerTitle: 'Best Customer',
    stepResultsTitle: 'Proof & Results',
    stepStyleTitle: 'Communication Style',
    stepGoalsTitle: 'Your Goals',
    // Step 1
    whatSell: 'What exactly do you sell or offer?',
    whatSellHint: 'e.g. "We help F&B brands automate HR payroll and reduce compliance risk"',
    dreamOutcome: "What's the dream outcome for your best client?",
    dreamOutcomeHint: 'The transformation they get — not the features you sell',
    effortRemoved: 'What hard work do you take off their plate?',
    effortRemovedHint: 'What does the client NOT have to do anymore?',
    guarantee: "What's your guarantee or risk reversal?",
    guaranteeHint: 'What removes the fear of trying?',
    // Step 2
    describeBest: 'Describe your best customer',
    describeBestHint: 'The type of company and person who gets most value from you',
    industry: 'Industry / Sector',
    companySize: 'Company Size',
    geography: 'Geography / Location Focus',
    // Step 3
    whatProof: 'What results or proof do you have?',
    whatProofHint: 'Numbers, case studies, testimonials',
    timeResult: 'How long to see first results?',
    caseStudy: 'Any specific case study to reference?',
    // Step 4
    communicationStyle: "What's your brand communication style?",
    outreachLanguage: 'Primary language for outreach',
    neverSay: 'Anything we should NEVER say or do?',
    neverSayHint: 'Competitors not to mention, off-brand things, etc.',
    sampleMsg: 'Paste a sample message you normally send (optional)',
    sampleMsgHint: 'Helps us match your exact voice',
    // Step 5
    primaryGoal: "What's your primary goal from this campaign?",
    leadsPerMonth: 'How many new leads per month are you targeting?',
    biggestChallenge: 'Biggest challenge getting new clients right now?',
    anythingElse: 'Anything else we should know?',
    anythingElseHint: 'Seasonal factors, upcoming events, key context',
    // Style options
    stylePro: 'Professional & polished',
    styleWarm: 'Warm & relationship-first',
    styleDirect: 'Direct & no-nonsense',
    styleCasual: 'Casual & conversational',
  },
  MS: {
    settingUp: 'MENYEDIAKAN',
    outreachSystem: ' Sistem Jangkauan',
    tagline: 'Bantu kami membina urutan yang sempurna untuk perniagaan anda. Mengambil masa kira-kira 5 minit.',
    step: 'Langkah', of: 'daripada',
    back: '← Kembali', continue: 'Teruskan →', submit: 'Hantar', sending: 'Menghantar…',
    receivedTitle: 'Kami sudah mendapat semua yang diperlukan.',
    receivedBody: 'Pasukan KOBIS anda akan menyemak dan membina urutan peribadi',
    receivedBody2: ' dalam masa 24 jam.',
    receivedTag: 'Penerimaan disahkan',
    contactKobis: 'Sila hubungi pasukan KOBIS anda untuk pautan baru.',
    stepOfferTitle: 'Penawaran Anda',
    stepCustomerTitle: 'Pelanggan Terbaik',
    stepResultsTitle: 'Bukti & Hasil',
    stepStyleTitle: 'Gaya Komunikasi',
    stepGoalsTitle: 'Matlamat Anda',
    whatSell: 'Apakah yang anda jual atau tawarkan?',
    whatSellHint: 'cth: "Kami bantu jenama F&B automasikan gaji HR dan kurangkan risiko pematuhan"',
    dreamOutcome: 'Apakah hasil impian untuk pelanggan terbaik anda?',
    dreamOutcomeHint: 'Transformasi yang mereka perolehi — bukan ciri-ciri produk anda',
    effortRemoved: 'Kerja keras apa yang anda hapuskan untuk mereka?',
    effortRemovedHint: 'Apa yang pelanggan TIDAK perlu lakukan lagi?',
    guarantee: 'Apakah jaminan atau pembalikan risiko anda?',
    guaranteeHint: 'Apa yang menghilangkan ketakutan untuk mencuba?',
    describeBest: 'Terangkan pelanggan terbaik anda',
    describeBestHint: 'Jenis syarikat dan orang yang mendapat nilai paling tinggi daripada anda',
    industry: 'Industri / Sektor',
    companySize: 'Saiz Syarikat',
    geography: 'Fokus Lokasi / Geografi',
    whatProof: 'Apakah hasil atau bukti yang anda ada?',
    whatProofHint: 'Angka, kajian kes, testimoni',
    timeResult: 'Berapa lama untuk melihat hasil pertama?',
    caseStudy: 'Adakah kajian kes khusus yang ingin kami rujuk?',
    communicationStyle: 'Apakah gaya komunikasi jenama anda?',
    outreachLanguage: 'Bahasa utama untuk jangkauan',
    neverSay: 'Apa yang TIDAK boleh kami katakan atau lakukan?',
    neverSayHint: 'Pesaing yang tidak boleh disebutkan, perkara yang tidak sesuai dengan jenama, dsb.',
    sampleMsg: 'Tampal contoh mesej yang biasa anda hantar (pilihan)',
    sampleMsgHint: 'Membantu kami menepati suara anda dengan tepat',
    primaryGoal: 'Apakah matlamat utama anda daripada kempen ini?',
    leadsPerMonth: 'Berapa prospek baru sebulan yang anda sasarkan?',
    biggestChallenge: 'Cabaran terbesar mendapatkan pelanggan baru sekarang?',
    anythingElse: 'Ada apa-apa lagi yang kami perlu tahu?',
    anythingElseHint: 'Faktor musiman, acara akan datang, konteks penting',
    stylePro: 'Profesional & tersusun',
    styleWarm: 'Mesra & utamakan hubungan',
    styleDirect: 'Terus & tanpa basa-basi',
    styleCasual: 'Santai & perbualan biasa',
  },
};

function KboosLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <style>{`
        @keyframes obIconPulse { 0%,100%{opacity:0.85} 50%{opacity:1} }
        @keyframes obGradShift { from{background-position:0% center} to{background-position:200% center} }
      `}</style>
      <span style={{ display: 'block', animation: 'obIconPulse 4s ease-in-out infinite' }}>
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
          backgroundClip: 'text', animation: 'obGradShift 4s linear infinite',
        }}>KBOOS</div>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 1 }}>Outreach OS</div>
        <div style={{ fontSize: 8, color: 'var(--green)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 1, fontWeight: 700 }}>Onboarding</div>
      </div>
    </div>
  );
}

export function Onboard() {
  const token = window.location.pathname.split('/Onboarding/')[1]?.split('?')[0];
  const [lang, setLang] = useState('EN');
  const t = T[lang];
  const [bizName, setBizName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    service: '', dreamOutcome: '', effortRemoved: '', riskReversal: '',
    bestCustomer: '', industry: '', companySize: '', geography: '',
    proof: '', timeToResult: '', caseStudy: '',
    style: 'professional', lang: 'EN', doNot: '', sampleMessage: '',
    goals: '', targetLeadsPerMonth: '', currentChallenge: '', additionalNotes: '',
  });

  useEffect(() => {
    if (!token) { setError('Invalid link'); setLoading(false); return; }
    fetch(`${API}/onboard/token/${token}`)
      .then(r => r.json())
      .then(d => { if (d.error) { setError(d.error); return; } setBizName(d.bizName); })
      .catch(() => setError('Could not load this link. Please try again.'))
      .finally(() => setLoading(false));
  }, [token]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

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

  const stepTitles = [t.stepOfferTitle, t.stepCustomerTitle, t.stepResultsTitle, t.stepStyleTitle, t.stepGoalsTitle];
  const progress = ((step + 1) / STEPS.length) * 100;

  if (loading) return (
    <Wrap lang={lang} setLang={setLang}>
      <div style={{ padding: '80px 0', textAlign: 'center', fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
        Loading…
      </div>
    </Wrap>
  );

  if (error && !bizName) return (
    <Wrap lang={lang} setLang={setLang}>
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.3 }}>⚠</div>
        <div style={{ fontSize: 14, color: 'var(--red)', marginBottom: 8 }}>{error}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.contactKobis}</div>
      </div>
    </Wrap>
  );

  if (done) return (
    <Wrap lang={lang} setLang={setLang}>
      <div style={{ padding: '48px 24px', textAlign: 'center', maxWidth: 440, margin: '0 auto' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', margin: '0 auto 24px',
          background: 'rgba(80,200,100,0.12)', border: '1.5px solid var(--green)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, color: 'var(--green)',
        }}>✓</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 12, lineHeight: 1.3 }}>
          {t.receivedTitle}
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>
          {t.receivedBody} <strong style={{ color: 'var(--text)' }}>{bizName}</strong>{t.receivedBody2}
        </div>
        <div style={{ marginTop: 28, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'rgba(80,200,100,0.08)', border: '1px solid rgba(80,200,100,0.2)', borderRadius: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>{t.receivedTag}</span>
        </div>
      </div>
    </Wrap>
  );

  return (
    <Wrap lang={lang} setLang={setLang}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '32px 24px 0' }}>
        <div style={{ fontSize: 10, color: 'var(--blue)', fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', marginBottom: 8 }}>
          {t.settingUp}
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', lineHeight: 1.25, marginBottom: 10, textTransform: 'uppercase' }}>
          {bizName}{t.outreachSystem}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
          {t.tagline}
        </div>
      </div>

      {/* Progress */}
      <div style={{ padding: '24px 24px 0' }}>
        {/* Step dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 12 }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div
                onClick={() => i < step && setStep(i)}
                style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  border: `1.5px solid ${i === step ? 'var(--blue)' : i < step ? 'var(--green)' : 'var(--border)'}`,
                  background: i < step ? 'rgba(80,200,100,0.14)' : i === step ? 'rgba(80,120,255,0.14)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 600,
                  color: i < step ? 'var(--green)' : i === step ? 'var(--blue)' : 'var(--muted)',
                  cursor: i < step ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                }}>
                {i < step ? '✓' : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 1.5, background: i < step ? 'var(--green)' : 'var(--border)', transition: 'background 0.3s', opacity: 0.4 }} />
              )}
            </div>
          ))}
        </div>
        {/* Label + percent */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>
            {t.step} {step + 1} — {stepTitles[step]}
          </span>
          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            {Math.round(progress)}%
          </span>
        </div>
        {/* Progress bar */}
        <div style={{ height: 3, background: 'var(--s2)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'var(--blue)', borderRadius: 2, transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* Step content — no fixed height, natural scroll */}
      <div style={{ padding: '20px 24px 160px' }}>
        {step === 0 && <StepOffer  form={form} set={set} bizName={bizName} t={t} />}
        {step === 1 && <StepCustomer form={form} set={set} t={t} />}
        {step === 2 && <StepResults  form={form} set={set} t={t} />}
        {step === 3 && <StepStyle    form={form} set={set} t={t} />}
        {step === 4 && <StepGoals    form={form} set={set} t={t} />}
        {error && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--red)', textAlign: 'center' }}>{error}</div>}
      </div>

      {/* Sticky nav — always visible above browser chrome */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        padding: '12px 20px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        display: 'flex', gap: 10, justifyContent: 'flex-end',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.35)',
      }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={btnGhost}>
            {t.back}
          </button>
        )}
        <div style={{ flex: 1 }} />
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(s => s + 1)} style={{ ...btnPrimary, minWidth: 120 }}>
            {t.continue}
          </button>
        ) : (
          <button onClick={submit} disabled={submitting} style={{ ...btnPrimary, background: 'var(--green)', minWidth: 120, opacity: submitting ? 0.7 : 1 }}>
            {submitting ? t.sending : t.submit}
          </button>
        )}
      </div>
    </Wrap>
  );
}

// Outer wrapper shared across all states
function Wrap({ children, lang, setLang }) {
  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: 'var(--bg)', fontFamily: 'var(--font-ui)' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--s1)',
      }}>
        <KboosLogo />
        {/* Language toggle */}
        <div style={{ display: 'flex', background: 'var(--s2)', borderRadius: 20, padding: '2px', gap: '2px' }}>
          {['EN', 'MS'].map(l => (
            <button key={l} onClick={() => setLang(l)} style={{
              padding: '5px 12px', borderRadius: 18, fontSize: 11, fontWeight: 600,
              background: lang === l ? 'var(--s1)' : 'transparent',
              color: lang === l ? 'var(--text)' : 'var(--muted)',
              border: lang === l ? '1px solid var(--border)' : '1px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {l === 'EN' ? 'EN' : 'BM'}
            </button>
          ))}
        </div>
      </div>

      {/* Page content */}
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function StepOffer({ form, set, bizName, t }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <F label={t.whatSell} hint={t.whatSellHint} required>
        <textarea value={form.service} onChange={e => set('service', e.target.value)} rows={3} style={ta} placeholder={`${bizName} offers…`} />
      </F>
      <F label={t.dreamOutcome} hint={t.dreamOutcomeHint} required>
        <textarea value={form.dreamOutcome} onChange={e => set('dreamOutcome', e.target.value)} rows={2} style={ta}
          placeholder="e.g. 3× more qualified leads without hiring extra staff" />
      </F>
      <F label={t.effortRemoved} hint={t.effortRemovedHint}>
        <input value={form.effortRemoved} onChange={e => set('effortRemoved', e.target.value)} style={inp}
          placeholder="e.g. Cold calling, manual follow-ups, list building" />
      </F>
      <F label={t.guarantee} hint={t.guaranteeHint}>
        <input value={form.riskReversal} onChange={e => set('riskReversal', e.target.value)} style={inp}
          placeholder="e.g. 10 qualified meetings or full refund" />
      </F>
    </div>
  );
}

function StepCustomer({ form, set, t }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <F label={t.describeBest} hint={t.describeBestHint} required>
        <textarea value={form.bestCustomer} onChange={e => set('bestCustomer', e.target.value)} rows={3} style={ta}
          placeholder="e.g. SME owners in manufacturing, 20–200 staff, struggling with manual procurement" />
      </F>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <F label={t.industry}>
          <input value={form.industry} onChange={e => set('industry', e.target.value)} style={inp} placeholder="e.g. Logistics, F&B" />
        </F>
        <F label={t.companySize}>
          <input value={form.companySize} onChange={e => set('companySize', e.target.value)} style={inp} placeholder="e.g. 10–100 staff" />
        </F>
      </div>
      <F label={t.geography}>
        <input value={form.geography} onChange={e => set('geography', e.target.value)} style={inp} placeholder="e.g. Klang Valley, Johor, all Malaysia" />
      </F>
    </div>
  );
}

function StepResults({ form, set, t }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <F label={t.whatProof} hint={t.whatProofHint} required>
        <textarea value={form.proof} onChange={e => set('proof', e.target.value)} rows={3} style={ta}
          placeholder="e.g. Helped ABC Sdn Bhd close 12 new clients in 60 days. Typical client sees 40% reduction in admin time." />
      </F>
      <F label={t.timeResult}>
        <input value={form.timeToResult} onChange={e => set('timeToResult', e.target.value)} style={inp}
          placeholder="e.g. First lead within 7 days, results in 30 days" />
      </F>
      <F label={t.caseStudy}>
        <textarea value={form.caseStudy} onChange={e => set('caseStudy', e.target.value)} rows={2} style={ta}
          placeholder="e.g. XYZ Sdn Bhd, Penang — from 2 deals/month to 8 in 90 days" />
      </F>
    </div>
  );
}

function StepStyle({ form, set, t }) {
  const styleOpts = [
    { value: 'professional', label: t.stylePro },
    { value: 'warm',         label: t.styleWarm },
    { value: 'direct',       label: t.styleDirect },
    { value: 'casual',       label: t.styleCasual },
  ];
  const langOpts = [
    { value: 'EN',    label: 'English' },
    { value: 'MS',    label: 'Bahasa Malaysia' },
    { value: 'ZH',    label: '中文 Mandarin' },
    { value: 'MIXED', label: 'Manglish (EN+BM)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <F label={t.communicationStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 2 }}>
          {styleOpts.map(o => (
            <button key={o.value} type="button" onClick={() => set('style', o.value)} style={{
              padding: '11px 14px', borderRadius: 9, fontSize: 12, textAlign: 'left',
              border: `1.5px solid ${form.style === o.value ? 'var(--blue)' : 'var(--border)'}`,
              background: form.style === o.value ? 'rgba(80,120,255,0.10)' : 'var(--s2)',
              color: form.style === o.value ? 'var(--text)' : 'var(--muted)',
              cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'all 0.15s',
            }}>
              {o.label}
            </button>
          ))}
        </div>
      </F>
      <F label={t.outreachLanguage}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
          {langOpts.map(o => (
            <button key={o.value} type="button" onClick={() => set('lang', o.value)} style={{
              padding: '7px 14px', borderRadius: 20, fontSize: 12,
              border: `1.5px solid ${form.lang === o.value ? 'var(--blue)' : 'var(--border)'}`,
              background: form.lang === o.value ? 'rgba(80,120,255,0.10)' : 'var(--s2)',
              color: form.lang === o.value ? 'var(--text)' : 'var(--muted)',
              cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'all 0.15s',
            }}>
              {o.label}
            </button>
          ))}
        </div>
      </F>
      <F label={t.neverSay} hint={t.neverSayHint}>
        <textarea value={form.doNot} onChange={e => set('doNot', e.target.value)} rows={2} style={ta}
          placeholder="e.g. Don't mention competitor names. Avoid aggressive urgency tactics." />
      </F>
      <F label={t.sampleMsg} hint={t.sampleMsgHint}>
        <textarea value={form.sampleMessage} onChange={e => set('sampleMessage', e.target.value)} rows={3} style={ta}
          placeholder="Paste a WhatsApp or email you normally send…" />
      </F>
    </div>
  );
}

function StepGoals({ form, set, t }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <F label={t.primaryGoal} required>
        <textarea value={form.goals} onChange={e => set('goals', e.target.value)} rows={2} style={ta}
          placeholder="e.g. Book discovery calls, generate WhatsApp enquiries, get referrals" />
      </F>
      <F label={t.leadsPerMonth}>
        <input value={form.targetLeadsPerMonth} onChange={e => set('targetLeadsPerMonth', e.target.value)} style={inp}
          placeholder="e.g. 20 qualified leads / month" />
      </F>
      <F label={t.biggestChallenge}>
        <textarea value={form.currentChallenge} onChange={e => set('currentChallenge', e.target.value)} rows={2} style={ta}
          placeholder="e.g. People don't reply to cold messages. Team too busy to follow up consistently." />
      </F>
      <F label={t.anythingElse} hint={t.anythingElseHint}>
        <textarea value={form.additionalNotes} onChange={e => set('additionalNotes', e.target.value)} rows={2} style={ta}
          placeholder="Any other context that would help us build the best sequence…" />
      </F>
    </div>
  );
}

function F({ label, hint, required, children }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: hint ? 3 : 6, display: 'flex', gap: 4, alignItems: 'baseline' }}>
        {label}
        {required && <span style={{ color: 'var(--blue)', fontSize: 11 }}>*</span>}
      </div>
      {hint && <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 7, lineHeight: 1.5 }}>{hint}</div>}
      {children}
    </div>
  );
}

// ─── shared styles ────────────────────────────────────────────────────────────

const inp = {
  width: '100%', padding: '10px 12px', fontSize: 13,
  background: 'var(--s2)', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text)', fontFamily: 'var(--font-ui)',
  outline: 'none', boxSizing: 'border-box',
};

const ta = { ...inp, resize: 'vertical', lineHeight: 1.55 };

const btnPrimary = {
  padding: '11px 24px', borderRadius: 9, fontSize: 13, fontWeight: 600,
  background: 'var(--blue)', color: '#fff', border: 'none', cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
};

const btnGhost = {
  padding: '11px 18px', borderRadius: 9, fontSize: 13, fontWeight: 500,
  background: 'transparent', color: 'var(--muted)',
  border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font-ui)',
};
