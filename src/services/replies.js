import { apiFetch } from './api.js';

export const repliesService = {
  getAll: () => apiFetch('/replies'),
  markRead: (id) => apiFetch(`/replies/${id}`, { method: 'PATCH', body: { status: 'read' } }),
  markHandled: (id) => apiFetch(`/replies/${id}`, { method: 'PATCH', body: { status: 'handled' } }),
  suppress: (id) => apiFetch(`/replies/${id}`, { method: 'PATCH', body: { status: 'suppressed' } }),
};
