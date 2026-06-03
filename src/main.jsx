import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import { initStorage } from './services/storage.js';
import { API_BASE } from './config/api.js';
import App from './App.jsx';

initStorage();

if (import.meta.env.PROD) {
  fetch(`${API_BASE}/health`)
    .then(r => r.json())
    .then(d => console.log('[KBOOS] API HEALTH CHECK SUCCESS', d))
    .catch(e => console.error('[KBOOS] API HEALTH CHECK FAILED', e.message));
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
