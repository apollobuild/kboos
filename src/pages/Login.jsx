import { useState, useEffect } from 'react';

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

export function Login({ onLogin }) {
  const inviteToken = new URLSearchParams(window.location.search).get('invite');
  const [mode, setMode] = useState(inviteToken ? 'set-password' : 'login');
  const [inviteUser, setInviteUser] = useState(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

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

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
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
    setLoading(true);
    setError('');
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

  const inputStyle = {
    width: '100%', background: 'var(--bg-2)', border: '1px solid var(--border)',
    color: 'var(--text-1)', padding: '10px 14px', borderRadius: 6, fontSize: 14,
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--page)' }}>
      <div style={{ width: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 24, marginBottom: 4 }}>
            OUTREACH OS
          </div>
          <div style={{ color: 'var(--text-2)', fontSize: 13 }}>by KOBIS Berhad</div>
        </div>

        <div className="card" style={{ padding: 32 }}>
          {mode === 'set-password' ? (
            <>
              <h2 style={{ marginBottom: 4, fontSize: 18 }}>Set Your Password</h2>
              <div style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 24 }}>
                {inviteUser ? `Welcome, ${inviteUser.name}! Create a password for ${inviteUser.email}` : 'Create a password to activate your account'}
              </div>
              <form onSubmit={handleSetPassword}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>New Password</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters" required style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Confirm Password</label>
                  <input
                    type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password" required style={inputStyle}
                  />
                </div>
                {error && (
                  <div style={{
                    background: 'oklch(55% 0.22 25 / 0.1)', border: '1px solid oklch(55% 0.22 25 / 0.3)',
                    borderRadius: 6, padding: '8px 12px', marginBottom: 14, color: 'var(--red)', fontSize: 13,
                  }}>{error}</div>
                )}
                <button type="submit" className="btn btn-blue" disabled={loading} style={{ width: '100%', padding: '10px', fontSize: 14 }}>
                  {loading ? 'Activating...' : 'Set Password & Sign In'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 style={{ marginBottom: 4, fontSize: 18 }}>Sign In</h2>
              <div style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 24 }}>
                Enter your team credentials to continue
              </div>
              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="admin@kboos.app" required style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Password</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required style={inputStyle}
                  />
                </div>
                {error && (
                  <div style={{
                    background: 'oklch(55% 0.22 25 / 0.1)', border: '1px solid oklch(55% 0.22 25 / 0.3)',
                    borderRadius: 6, padding: '8px 12px', marginBottom: 14, color: 'var(--red)', fontSize: 13,
                  }}>{error}</div>
                )}
                <button type="submit" className="btn btn-blue" disabled={loading} style={{ width: '100%', padding: '10px', fontSize: 14 }}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
