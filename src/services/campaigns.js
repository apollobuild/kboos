import { apiFetch } from './api.js';

export const campaignsService = {
  getAll: () => apiFetch('/campaigns'),
  add: (c) => apiFetch('/campaigns', { method: 'POST', body: c }),
  update: (id, patch) => apiFetch(`/campaigns/${id}`, { method: 'PATCH', body: patch }),
  remove: (id) => apiFetch(`/campaigns/${id}`, { method: 'DELETE' }),
  toggleStatus: (id) => apiFetch(`/campaigns/${id}/toggle`, { method: 'PATCH', body: {} }),
};
