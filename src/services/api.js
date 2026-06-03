import { API_BASE as BASE } from '../config/api.js';

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('kboos_token');
  const method = options.method || 'GET';
  const fullUrl = `${BASE}${path}`;
  console.log(`[API] → ${method} ${fullUrl}`);
  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 401 && !path.startsWith('/auth/')) {
    localStorage.removeItem('kboos_token');
    localStorage.removeItem('kboos_user');
    window.location.reload();
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try { msg = JSON.parse(text).error || text; } catch {}
    console.log(`[API] ✗ ${method} ${fullUrl} → ${res.status}`);
    throw new Error(msg || `Request failed: ${res.status}`);
  }
  console.log(`[API] ✓ ${method} ${fullUrl} → ${res.status}`);
  return res.json();
}
