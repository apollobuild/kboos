import { apiFetch } from './api.js';

export const walletService = {
  get: () => apiFetch('/wallet'),
  initiateTopUp: (amountRm) => apiFetch('/wallet/topup/initiate', { method: 'POST', body: { amountRm } }),
};
