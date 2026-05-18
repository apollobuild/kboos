import { useState } from 'react';

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

export function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      height:'100vh', background:'var(--page)'
    }}>
      <div style={{width:380}}>
        <div style={{textAlign:'center', marginBottom:32}}>
          <div style={{fontFamily:'var(--font-serif)', fontStyle:'italic', fontSize:24, marginBottom:4}}>
            OUTREACH OS
          </div>
          <div style={{color:'var(--text-2)', fontSize:13}}>by KOBIS Berhad</div>
        </div>
        <div className="card" style={{padding:32}}>
          <h2 style={{marginBottom:4, fontSize:18}}>Sign In</h2>
          <div style={{color:'var(--text-2)', fontSize:13, marginBottom:24}}>
            Enter your team credentials to continue
          </div>
          <form onSubmit={handleLogin}>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12, color:'var(--text-2)', display:'block', marginBottom:6}}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@kboos.app" required
                style={{
                  width:'100%', background:'var(--bg-2)', border:'1px solid var(--border)',
                  color:'var(--text-1)', padding:'10px 14px', borderRadius:6, fontSize:14
                }}
              />
            </div>
            <div style={{marginBottom:20}}>
              <label style={{fontSize:12, color:'var(--text-2)', display:'block', marginBottom:6}}>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                style={{
                  width:'100%', background:'var(--bg-2)', border:'1px solid var(--border)',
                  color:'var(--text-1)', padding:'10px 14px', borderRadius:6, fontSize:14
                }}
              />
            </div>
            {error && (
              <div style={{
                background:'oklch(55% 0.22 25 / 0.1)', border:'1px solid oklch(55% 0.22 25 / 0.3)',
                borderRadius:6, padding:'8px 12px', marginBottom:14,
                color:'var(--red)', fontSize:13
              }}>{error}</div>
            )}
            <button
              type="submit" className="btn btn-blue" disabled={loading}
              style={{width:'100%', padding:'10px', fontSize:14}}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div style={{color:'var(--text-3)', fontSize:11, textAlign:'center', marginTop:16}}>
            Default: admin@kboos.app / kboos2024
          </div>
        </div>
      </div>
    </div>
  );
}
