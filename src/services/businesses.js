import { apiFetch } from './api.js';

export const businessesService = {
  getAll: () => apiFetch('/businesses'),
  add: (biz) => apiFetch('/businesses', { method: 'POST', body: biz }),
  update: (id, patch) => apiFetch(`/businesses/${id}`, { method: 'PATCH', body: patch }),
  remove: (id) => apiFetch(`/businesses/${id}`, { method: 'DELETE' }),
};
