import { apiFetch } from './api.js';

export const settingsService = {
  get: () => apiFetch('/settings'),
  saveApiKey: (api, value) => apiFetch('/settings/api-key', { method: 'POST', body: { api, value } }),
  getApiKey: () => Promise.resolve(''), // keys are server-side only
  testConnection: (api) => apiFetch(`/settings/test-connection/${api}`),
  saveTeamMember: (member) => apiFetch('/settings/team', { method: 'POST', body: member }),
  removeTeamMember: (id) => apiFetch(`/settings/team/${id}`, { method: 'DELETE' }),
};
