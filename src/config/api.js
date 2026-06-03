// Single source of truth for the backend API base URL.
// VITE_API_URL must be set in .env before building. Missing = hard startup error.

const url = import.meta.env.VITE_API_URL;
if (!url) throw new Error('[KBOOS] VITE_API_URL is not set. Set it in .env before running.');
export const API_BASE = url.replace(/\/$/, '');

// Log config identity on every page load so runtime URL is always visible in console
console.log(`[KBOOS CONFIG] API_BASE="${API_BASE}" mode="${import.meta.env.MODE}" VITE_API_URL=set`);
