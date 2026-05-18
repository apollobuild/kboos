import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import { initStorage } from './services/storage.js';
import App from './App.jsx';

initStorage();
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
