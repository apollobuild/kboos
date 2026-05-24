import { apiFetch } from './api.js';

export const googleDriveService = {
  isConnected: async () => {
    try {
      const r = await apiFetch('/settings/drive-status');
      return r.connected === true;
    } catch { return false; }
  },

  saveServiceAccount: async (serviceAccountKey) => {
    return apiFetch('/settings/drive-service-account', { method: 'POST', body: { serviceAccountKey } });
  },

  // Sheet creation and lead sync are handled automatically server-side
  // on import and enrichment — no client-side upload needed.
  uploadLeadsCSV: async () => null,
  uploadReport: async () => null,
};
