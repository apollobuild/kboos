import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const STEPS = [
  { id: 'offer',    label: 'Your Offer',       icon: '◈' },
  { id: 'customer', label: 'Best Customer',     icon: '◉' },
  { id: 'results',  label: 'Proof & Results',   icon: '◆' },
  { id: 'style',    label: 'How You Communicate', icon: '◇' },
  { id: 'goals',    label: 'Your Goals',        icon: '▶' },
];

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
          We've got everything we need.
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 400 }}>
          Your KOBIS team will review the details and build {bizName}'s personalised outreach sequence within 24 hours.
        </div>
        <div style={{ marginTop: 32, padding: '14px 24px', background: 'rgba(80,200,100,0.08)', border: '1px solid rgba(80,200,100,0.2)', borderRadius: 10, display: 'inline-block' }}>
          <span style={{ fontSize: 20 }}>✓</span>
          <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>Submission received</span>
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
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

      {/* Hero heading — personalised */}
      <div style={{ textAlign: 'center', marginBottom: 32, maxWidth: 520 }}>
        <div style={{ fontSize: 11, color: 'var(--blue)', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', marginBottom: 10, textTransform: 'uppercase' }}>
          Setting up
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, marginBottom: 8 }}>
          {bizName}'s Outreach System
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
          Help us build the perfect sequence for your business. This takes about 5 minutes.
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
            Step {step + 1} of {STEPS.length} — {currentStep.label}
          </span>
          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            {Math.round(((step + 1) / STEPS.length) * 100)}%
          </span>
        </div>
      </div>

      {/* Step card */}
      <div style={{ width: '100%', maxWidth: 520, background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px 28px', marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
          {currentStep.icon} {currentStep.label}
        </div>

        {step === 0 && <StepOffer form={form} set={setField} bizName={bizName} />}
        {step === 1 && <StepCustomer form={form} set={setField} />}
        {step === 2 && <StepResults form={form} set={setField} />}
        {step === 3 && <StepStyle form={form} set={setField} />}
        {step === 4 && <StepGoals form={form} set={setField} />}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 520 }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={btnGhost}>
            ← Back
          </button>
        )}
        <div style={{ flex: 1 }} />
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(s => s + 1)} style={btnPrimary}>
            Continue →
          </button>
        ) : (
          <button onClick={submit} disabled={submitting} style={{ ...btnPrimary, background: 'var(--green)', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Sending…' : 'Submit →'}
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

function StepOffer({ form, set, bizName }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
      <Field label="What exactly do you sell or offer?" hint={`e.g. "We help F&B brands automate their HR payroll and reduce compliance risk"`} required>
        <textarea value={form.service} onChange={e => set('service', e.target.value)} rows={3} style={textareaStyle}
          placeholder={`${bizName} offers…`} />
      </Field>
      <Field label="What's the dream outcome for your best client?" hint="The transformation they get — not the features you sell" required>
        <textarea value={form.dreamOutcome} onChange={e => set('dreamOutcome', e.target.value)} rows={2} style={textareaStyle}
          placeholder="e.g. 3× more qualified leads without hiring extra sales staff" />
      </Field>
      <Field label="What hard work do you take off their plate?" hint="What does the client NOT have to do anymore?">
        <input value={form.effortRemoved} onChange={e => set('effortRemoved', e.target.value)} style={inputStyle}
          placeholder="e.g. Cold calling, manual follow-ups, list building" />
      </Field>
      <Field label="What's your guarantee or risk reversal?" hint="What removes the fear of trying?">
        <input value={form.riskReversal} onChange={e => set('riskReversal', e.target.value)} style={inputStyle}
          placeholder="e.g. 10 qualified meetings or full refund" />
      </Field>
    </div>
  );
}

function StepCustomer({ form, set }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
      <Field label="Describe your best customer" hint="The type of company and person who gets the most value from you" required>
        <textarea value={form.bestCustomer} onChange={e => set('bestCustomer', e.target.value)} rows={3} style={textareaStyle}
          placeholder="e.g. SME owners in manufacturing sector, 20–200 staff, struggling with manual procurement" />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Industry / Sector">
          <input value={form.industry} onChange={e => set('industry', e.target.value)} style={inputStyle}
            placeholder="e.g. Logistics, F&B, Healthcare" />
        </Field>
        <Field label="Company Size">
          <input value={form.companySize} onChange={e => set('companySize', e.target.value)} style={inputStyle}
            placeholder="e.g. 10–100 staff, SME" />
        </Field>
      </div>
      <Field label="Geography / Location Focus">
        <input value={form.geography} onChange={e => set('geography', e.target.value)} style={inputStyle}
          placeholder="e.g. Klang Valley, Johor, all Malaysia" />
      </Field>
    </div>
  );
}

function StepResults({ form, set }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
      <Field label="What results or proof do you have?" hint="Numbers, case studies, testimonials" required>
        <textarea value={form.proof} onChange={e => set('proof', e.target.value)} rows={3} style={textareaStyle}
          placeholder="e.g. Helped ABC Sdn Bhd close 12 new clients in 60 days. Typical client sees 40% reduction in admin time." />
      </Field>
      <Field label="How long does it take to see first results?">
        <input value={form.timeToResult} onChange={e => set('timeToResult', e.target.value)} style={inputStyle}
          placeholder="e.g. First lead within 7 days, meaningful results in 30 days" />
      </Field>
      <Field label="Any specific case study you want us to reference?">
        <textarea value={form.caseStudy} onChange={e => set('caseStudy', e.target.value)} rows={2} style={textareaStyle}
          placeholder="e.g. Client XYZ in Penang — from 2 deals/month to 8 deals/month in 90 days" />
      </Field>
    </div>
  );
}

function StepStyle({ form, set }) {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
      <Field label="What's your brand communication style?">
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
      <Field label="Primary language for outreach">
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
      <Field label="Anything we should NEVER say or do in your outreach?" hint="Competitors not to mention, things that feel off-brand, etc.">
        <textarea value={form.doNot} onChange={e => set('doNot', e.target.value)} rows={2} style={textareaStyle}
          placeholder="e.g. Don't mention competitor names. Avoid aggressive urgency tactics." />
      </Field>
      <Field label="Paste a sample of how you normally message clients (optional)" hint="This helps us match your voice exactly">
        <textarea value={form.sampleMessage} onChange={e => set('sampleMessage', e.target.value)} rows={3} style={textareaStyle}
          placeholder="Paste a WhatsApp or email you've sent before…" />
      </Field>
    </div>
  );
}

function StepGoals({ form, set }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
      <Field label="What's your primary goal from this outreach campaign?" required>
        <textarea value={form.goals} onChange={e => set('goals', e.target.value)} rows={2} style={textareaStyle}
          placeholder="e.g. Book discovery calls, generate WhatsApp enquiries, get referrals from existing clients" />
      </Field>
      <Field label="How many new leads per month are you targeting?">
        <input value={form.targetLeadsPerMonth} onChange={e => set('targetLeadsPerMonth', e.target.value)} style={inputStyle}
          placeholder="e.g. 20 qualified leads / month" />
      </Field>
      <Field label="What's your biggest challenge in getting new clients right now?">
        <textarea value={form.currentChallenge} onChange={e => set('currentChallenge', e.target.value)} rows={2} style={textareaStyle}
          placeholder="e.g. People don't reply to cold messages. Our team is too busy to follow up consistently." />
      </Field>
      <Field label="Anything else you want us to know?" hint="Seasonal considerations, specific events, important context">
        <textarea value={form.additionalNotes} onChange={e => set('additionalNotes', e.target.value)} rows={2} style={textareaStyle}
          placeholder="Any other context that would help us build the best possible sequence for you…" />
      </Field>
    </div>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <div>
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
