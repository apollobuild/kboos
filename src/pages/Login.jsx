import { useState, useEffect, useRef } from 'react';

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');

  .lp-body {
    min-height: 100vh;
    background: #03050a;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Outfit', -apple-system, sans-serif;
    overflow: hidden;
    position: relative;
  }

  #lp-stars { position: fixed; inset: 0; pointer-events: none; z-index: 0; }

  .lp-aurora { position: fixed; inset: 0; pointer-events: none; z-index: 1; overflow: hidden; transform: translateZ(0); }
  .lp-blob { position: absolute; border-radius: 50%; filter: blur(110px); animation: lpDrift linear infinite; will-change: transform; }
  .lp-blob-1 { width:700px;height:700px; background:radial-gradient(circle,oklch(62% 0.24 145 / 0.5),transparent 65%); top:-200px;left:-200px; animation-duration:24s; }
  .lp-blob-2 { width:600px;height:600px; background:radial-gradient(circle,oklch(58% 0.22 245 / 0.4),transparent 65%); bottom:-150px;right:-150px; animation-duration:30s;animation-delay:-12s; }
  .lp-blob-3 { width:450px;height:450px; background:radial-gradient(circle,oklch(55% 0.26 305 / 0.32),transparent 65%); top:50%;left:55%; animation-duration:36s;animation-delay:-22s; }
  .lp-blob-4 { width:380px;height:380px; background:radial-gradient(circle,oklch(68% 0.2 175 / 0.35),transparent 65%); top:0%;right:8%; animation-duration:28s;animation-delay:-8s; }
  .lp-blob-5 { width:280px;height:280px; background:radial-gradient(circle,oklch(72% 0.18 60 / 0.2),transparent 65%); bottom:20%;left:5%; animation-duration:20s;animation-delay:-5s; }

  @keyframes lpDrift {
    0%   { transform:translate(0,0) scale(1); }
    25%  { transform:translate(70px,-55px) scale(1.08); }
    50%  { transform:translate(-35px,80px) scale(0.92); }
    75%  { transform:translate(-70px,-35px) scale(1.12); }
    100% { transform:translate(0,0) scale(1); }
  }

  .lp-tron-wrap { position:fixed;bottom:0;left:50%;width:220%;height:55%; transform:translateX(-50%) perspective(500px) rotateX(72deg); transform-origin:bottom center; -webkit-mask-image:linear-gradient(to top,rgba(0,0,0,0.5) 0%,transparent 80%); mask-image:linear-gradient(to top,rgba(0,0,0,0.5) 0%,transparent 80%); pointer-events:none;z-index:2;overflow:hidden; }
  .lp-tron-grid { position:absolute;inset:-70px 0 0; background-image:linear-gradient(oklch(65% 0.22 145 / 0.18) 1px,transparent 1px),linear-gradient(90deg,oklch(65% 0.22 145 / 0.18) 1px,transparent 1px); background-size:70px 70px; animation:lpGridScroll 4s linear infinite; will-change:transform; }
  @keyframes lpGridScroll { from{transform:translateY(0)} to{transform:translateY(70px)} }

  .lp-dots { position:fixed;inset:0; background-image:radial-gradient(circle,rgba(255,255,255,0.07) 1px,transparent 1px); background-size:30px 30px; pointer-events:none;z-index:2; }
  .lp-vignette { position:fixed;inset:0; background:radial-gradient(ellipse at 50% 45%,transparent 20%,#03050a 75%); pointer-events:none;z-index:3; }

  .lp-rings { position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:3; }
  .lp-ring { position:absolute;border-radius:50%;border:1px solid oklch(65% 0.22 145 / 0.15);transform:translate(-50%,-50%);animation:lpRipple 6s ease-out infinite; }
  .lp-ring:nth-child(1){width:400px;height:400px;animation-delay:0s}
  .lp-ring:nth-child(2){width:600px;height:600px;animation-delay:2s}
  .lp-ring:nth-child(3){width:800px;height:800px;animation-delay:4s}
  @keyframes lpRipple {
    0%  {opacity:0.6;transform:translate(-50%,-50%) scale(0.8)}
    100%{opacity:0;transform:translate(-50%,-50%) scale(1.2)}
  }

  .lp-glow { position:fixed;width:560px;height:560px;border-radius:50%; background:radial-gradient(circle,oklch(65% 0.22 145 / 0.22) 0%,transparent 65%); top:50%;left:50%;transform:translate(-50%,-50%); pointer-events:none;z-index:4;will-change:transform; animation:lpGlowPulse 7s ease-in-out infinite; }
  @keyframes lpGlowPulse {
    0%,100%{opacity:0.8;transform:translate(-50%,-50%) scale(1)}
    50%    {opacity:1;transform:translate(-50%,-50%) scale(1.12)}
  }

  .lp-particles { position:fixed;inset:0;pointer-events:none;z-index:5;overflow:hidden; }
  .lp-p { position:absolute;bottom:-6px;border-radius:50%;background:oklch(70% 0.22 145);box-shadow:0 0 8px oklch(70% 0.22 145 / 0.7);animation:lpRise linear infinite; }
  .lp-p:nth-child(1) {width:2px;height:2px;left:6%;animation-duration:14s;animation-delay:0s}
  .lp-p:nth-child(2) {width:3px;height:3px;left:14%;animation-duration:18s;animation-delay:-4s;opacity:.5}
  .lp-p:nth-child(3) {width:2px;height:2px;left:23%;animation-duration:11s;animation-delay:-8s}
  .lp-p:nth-child(4) {width:1px;height:1px;left:33%;animation-duration:16s;animation-delay:-2s;opacity:.7}
  .lp-p:nth-child(5) {width:2px;height:2px;left:42%;animation-duration:20s;animation-delay:-11s}
  .lp-p:nth-child(6) {width:3px;height:3px;left:51%;animation-duration:13s;animation-delay:-6s;opacity:.4}
  .lp-p:nth-child(7) {width:2px;height:2px;left:61%;animation-duration:15s;animation-delay:-3s}
  .lp-p:nth-child(8) {width:1px;height:1px;left:70%;animation-duration:19s;animation-delay:-9s;opacity:.6}
  .lp-p:nth-child(9) {width:2px;height:2px;left:80%;animation-duration:12s;animation-delay:-1s}
  .lp-p:nth-child(10){width:3px;height:3px;left:89%;animation-duration:22s;animation-delay:-13s;opacity:.35}
  .lp-p:nth-child(11){width:2px;height:2px;left:96%;animation-duration:10s;animation-delay:-7s}
  .lp-p:nth-child(12){width:1px;height:1px;left:28%;animation-duration:17s;animation-delay:-15s;opacity:.5}
  .lp-p:nth-child(13){width:2px;height:2px;left:75%;animation-duration:14s;animation-delay:-10s}
  .lp-p:nth-child(14){width:2px;height:2px;left:46%;animation-duration:21s;animation-delay:-5s;opacity:.6}
  @keyframes lpRise {
    0%  {transform:translateY(0) translateX(0);opacity:0}
    8%  {opacity:1}
    92% {opacity:0.7}
    100%{transform:translateY(-100vh) translateX(15px);opacity:0}
  }

  .lp-card-border {
    position:relative;z-index:10;border-radius:28px;width:100%;max-width:420px;
    box-shadow:0 0 60px oklch(65% 0.22 145 / 0.25),0 0 120px oklch(65% 0.22 145 / 0.1);
    isolation:isolate;
  }
  .lp-card-border::before {
    content:'';position:absolute;inset:-1.5px;border-radius:29px;
    background:conic-gradient(oklch(70% 0.24 145),oklch(62% 0.2 220),oklch(58% 0.22 270),oklch(55% 0.24 310),oklch(70% 0.24 145));
    animation:lpSpinBorder 5s linear infinite;z-index:-1;will-change:transform;
  }
  @keyframes lpSpinBorder { to{transform:rotate(360deg)} }

  .lp-card {
    background:rgba(6,10,16,0.96);
    backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
    border-radius:27px;padding:46px 42px 42px;
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.07),inset 0 -1px 0 rgba(0,0,0,0.3);
    transform:translateZ(0);isolation:isolate;
  }

  .lp-logo { text-align:center;margin-bottom:38px; }
  .lp-icon-wrap { display:block;margin:0 auto 16px;width:fit-content;animation:lpIconPulse 4s ease-in-out infinite;will-change:opacity; }
  @keyframes lpIconPulse { 0%,100%{opacity:0.85} 50%{opacity:1} }
  .lp-icon { display:block;filter:drop-shadow(0 0 14px oklch(70% 0.24 145 / 0.9)) drop-shadow(0 0 32px oklch(70% 0.24 145 / 0.5)); }

  .lp-kboos {
    font-size:44px;font-weight:900;letter-spacing:0.14em;line-height:1;
    font-family:'Outfit',sans-serif;
    background:linear-gradient(90deg,oklch(78% 0.22 145) 0%,oklch(72% 0.2 185) 25%,oklch(65% 0.2 245) 50%,oklch(72% 0.2 185) 75%,oklch(78% 0.22 145) 100%);
    background-size:200% auto;
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
    animation:lpGradShift 4s linear infinite;
  }
  @keyframes lpGradShift { from{background-position:0% center} to{background-position:200% center} }

  .lp-outreach { font-size:10px;font-weight:700;letter-spacing:0.35em;color:rgba(255,255,255,0.4);text-transform:uppercase;margin-top:7px; }
  .lp-line { width:70px;height:1px;margin:11px auto;background:linear-gradient(90deg,transparent,oklch(70% 0.22 145 / 0.55),transparent);animation:lpLineShimmer 3s ease-in-out infinite;will-change:transform; }
  @keyframes lpLineShimmer { 0%,100%{transform:scaleX(0.57);opacity:0.6} 50%{transform:scaleX(1);opacity:1} }
  .lp-sub { font-size:10px;color:rgba(255,255,255,0.22);letter-spacing:0.1em; }

  .lp-h2 { font-size:22px;font-weight:800;color:#fff;margin-bottom:5px;letter-spacing:-0.02em;font-family:'Outfit',sans-serif; }
  .lp-subtitle { font-size:13px;color:rgba(255,255,255,0.3);margin-bottom:30px;font-weight:400; }

  .lp-label { display:block;font-size:11px;font-weight:700;color:rgba(255,255,255,0.4);margin-bottom:7px;letter-spacing:0.09em;text-transform:uppercase; }
  .lp-input-wrap { margin-bottom:18px; }
  .lp-input {
    width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
    color:#fff;padding:13px 16px;border-radius:13px;font-size:14px;
    font-family:'Outfit',sans-serif;outline:none;
    transition:border-color 0.25s,box-shadow 0.25s,background 0.25s;
  }
  .lp-input:focus { border-color:oklch(68% 0.22 145 / 0.6);background:rgba(255,255,255,0.06);box-shadow:0 0 0 3px oklch(65% 0.22 145 / 0.12); }
  .lp-input::placeholder { color:rgba(255,255,255,0.15); }

  .lp-btn {
    position:relative;width:100%;padding:14px;
    background:linear-gradient(135deg,#ffffff 0%,#dfffee 100%);
    color:#03050a;border:none;border-radius:13px;font-size:15px;font-weight:800;
    font-family:'Outfit',sans-serif;cursor:pointer;letter-spacing:0.04em;margin-top:8px;
    overflow:hidden;transition:transform 0.18s,box-shadow 0.2s;
    box-shadow:0 4px 28px rgba(0,0,0,0.5),0 0 50px oklch(65% 0.22 145 / 0.22);
  }
  .lp-btn::after {
    content:'';position:absolute;top:0;left:0;width:60%;height:100%;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent);
    transform:translateX(-200%);animation:lpShine 3.5s ease-in-out infinite;will-change:transform;
  }
  @keyframes lpShine { 0%{transform:translateX(-200%)} 30%{transform:translateX(280%)} 100%{transform:translateX(280%)} }
  .lp-btn:hover { transform:translateY(-2px);box-shadow:0 10px 40px rgba(0,0,0,0.5),0 0 70px oklch(65% 0.22 145 / 0.3); }
  .lp-btn:active { transform:translateY(0); }
  .lp-btn:disabled { opacity:0.6;cursor:not-allowed;transform:none; }

  .lp-error {
    background:oklch(55% 0.22 25 / 0.1);border:1px solid oklch(55% 0.22 25 / 0.3);
    border-radius:8px;padding:10px 14px;margin-bottom:16px;
    color:oklch(70% 0.22 25);font-size:13px;
  }
`;

export function Login({ onLogin }) {
  const canvasRef = useRef(null);
  const inviteToken = new URLSearchParams(window.location.search).get('invite');
  const [mode, setMode] = useState(inviteToken ? 'set-password' : 'login');
  const [inviteUser, setInviteUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;
    fetch(`${BASE}/auth/invite/${inviteToken}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setMode('login'); }
        else setInviteUser(data);
      })
      .catch(() => { setError('Invalid invite link'); setMode('login'); });
  }, [inviteToken]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: 220 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight * 0.85,
      r: Math.random() * 1.4 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.006 + 0.002,
      color: Math.random() > 0.85 ? [140, 220, 255] : [255, 255, 255],
    }));

    const shoots = [];
    function spawnShoot() {
      shoots.push({
        x: Math.random() * canvas.width * 0.8 + canvas.width * 0.1,
        y: Math.random() * canvas.height * 0.4,
        len: Math.random() * 180 + 100,
        speed: Math.random() * 10 + 8,
        alpha: 1,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.25,
      });
    }
    spawnShoot();
    const shootInterval = setInterval(spawnShoot, 3500);

    function draw(t) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        const a = 0.25 + 0.75 * Math.abs(Math.sin(t * 0.001 * s.speed * 1000 + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${a * 0.85})`;
        ctx.fill();
      });
      for (let i = shoots.length - 1; i >= 0; i--) {
        const s = shoots[i];
        const dx = Math.cos(s.angle) * s.len;
        const dy = Math.sin(s.angle) * s.len;
        const g = ctx.createLinearGradient(s.x, s.y, s.x - dx, s.y - dy);
        g.addColorStop(0, `rgba(255,255,255,${s.alpha})`);
        g.addColorStop(0.3, `rgba(180,255,230,${s.alpha * 0.6})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - dx, s.y - dy);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.8;
        ctx.stroke();
        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed;
        s.alpha -= 0.013;
        if (s.alpha <= 0) shoots.splice(i, 1);
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(shootInterval);
      window.removeEventListener('resize', resize);
    };
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('kboos_token', data.token);
      localStorage.setItem('kboos_user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPassword(e) {
    e.preventDefault();
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${BASE}/auth/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inviteToken, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set password');
      localStorage.setItem('kboos_token', data.token);
      localStorage.setItem('kboos_user', JSON.stringify(data.user));
      window.history.replaceState({}, '', '/');
      onLogin(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="lp-body">
        <canvas id="lp-stars" ref={canvasRef} style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0}} />

        <div className="lp-aurora">
          <div className="lp-blob lp-blob-1" />
          <div className="lp-blob lp-blob-2" />
          <div className="lp-blob lp-blob-3" />
          <div className="lp-blob lp-blob-4" />
          <div className="lp-blob lp-blob-5" />
        </div>

        <div className="lp-tron-wrap"><div className="lp-tron-grid" /></div>
        <div className="lp-dots" />
        <div className="lp-vignette" />
        <div className="lp-rings">
          <div className="lp-ring" /><div className="lp-ring" /><div className="lp-ring" />
        </div>
        <div className="lp-glow" />
        <div className="lp-particles">
          {Array.from({length:14}).map((_,i) => <div key={i} className="lp-p" />)}
        </div>

        <div className="lp-card-border">
          <div className="lp-card">
            <div className="lp-logo">
              <span className="lp-icon-wrap">
                <svg className="lp-icon" width="44" height="32" viewBox="0 0 28 20" fill="none">
                  <path d="M2 10L8 3L14 10L8 17L2 10Z" fill="oklch(75% 0.24 145 / 0.95)"/>
                  <path d="M9 10L15 3L21 10L15 17L9 10Z" fill="oklch(65% 0.2 210 / 0.8)"/>
                  <path d="M16 10L22 3L28 10L22 17L16 10Z" fill="oklch(60% 0.2 260 / 0.55)"/>
                </svg>
              </span>
              <div className="lp-kboos">KBOOS</div>
              <div className="lp-outreach">Outreach OS</div>
              <div className="lp-line" />
              <div className="lp-sub">by KOBIS Berhad</div>
            </div>

            {mode === 'set-password' ? (
              <>
                <div className="lp-h2">Set Your Password</div>
                <div className="lp-subtitle">
                  {inviteUser ? `Welcome, ${inviteUser.name}! Create a password for ${inviteUser.email}` : 'Create a password to activate your account'}
                </div>
                <form onSubmit={handleSetPassword}>
                  <label className="lp-label">New Password</label>
                  <div className="lp-input-wrap">
                    <input className="lp-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" required />
                  </div>
                  <label className="lp-label">Confirm Password</label>
                  <div className="lp-input-wrap">
                    <input className="lp-input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" required />
                  </div>
                  {error && <div className="lp-error">{error}</div>}
                  <button className="lp-btn" type="submit" disabled={loading}>
                    {loading ? 'Activating...' : 'Set Password & Sign In'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="lp-h2">Sign In</div>
                <div className="lp-subtitle">Enter your team credentials to continue</div>
                <form onSubmit={handleLogin}>
                  <label className="lp-label">Email</label>
                  <div className="lp-input-wrap">
                    <input className="lp-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required />
                  </div>
                  <label className="lp-label">Password</label>
                  <div className="lp-input-wrap">
                    <input className="lp-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                  </div>
                  {error && <div className="lp-error">{error}</div>}
                  <button className="lp-btn" type="submit" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
