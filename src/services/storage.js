import { SEED_DATA, SEED_WALLET, SEED_SETTINGS } from '../data/seed.js';

const KEYS = {
  businesses: 'kboos_businesses',
  campaigns: 'kboos_campaigns',
  leads: 'kboos_leads',
  replies: 'kboos_replies',
  activity: 'kboos_activity',
  wallet: 'kboos_wallet',
  settings: 'kboos_settings',
  prompts: 'kboos_prompts',
};

function get(key) {
  try {
    const raw = localStorage.getItem(KEYS[key] || key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function set(key, val) {
  try {
    localStorage.setItem(KEYS[key] || key, JSON.stringify(val));
  } catch {}
}

export function initStorage() {
  if (!get('businesses')) set('businesses', SEED_DATA.businesses);
  if (!get('campaigns')) set('campaigns', SEED_DATA.campaigns);
  if (!get('leads')) set('leads', SEED_DATA.leads);
  if (!get('replies')) set('replies', SEED_DATA.replies);
  if (!get('activity')) set('activity', SEED_DATA.activity);
  if (!get('wallet')) set('wallet', SEED_WALLET);
  if (!get('settings')) set('settings', SEED_SETTINGS);
  if (!get('prompts')) set('prompts', {});
}

export function getAll(key) { return get(key) || []; }
export function setAll(key, arr) { set(key, arr); }

export function addItem(key, item) {
  const arr = getAll(key);
  const newItem = { ...item, id: item.id || Date.now() };
  arr.push(newItem);
  set(key, arr);
  return newItem;
}

export function updateItem(key, id, patch) {
  const arr = getAll(key);
  const idx = arr.findIndex(x => x.id === id);
  if (idx === -1) return;
  arr[idx] = { ...arr[idx], ...patch };
  set(key, arr);
  return arr[idx];
}

export function removeItem(key, id) {
  const arr = getAll(key).filter(x => x.id !== id);
  set(key, arr);
}

export function getObj(key) { return get(key) || {}; }
export function setObj(key, obj) { set(key, obj); }
export function patchObj(key, patch) {
  const cur = getObj(key);
  set(key, { ...cur, ...patch });
}
