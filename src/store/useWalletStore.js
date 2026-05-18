import { create } from 'zustand';
import { walletService } from '../services/wallet.js';

export const useWalletStore = create((set) => ({
  wallet: { balance: 0, transactions: [] },

  init: async () => {
    try {
      const data = await walletService.get();
      set({ wallet: { balance: (data.balance || 0) / 100, transactions: data.transactions || [] } });
    } catch { /* not logged in yet */ }
  },

  initiateTopUp: async (amountRm) => {
    const data = await walletService.initiateTopUp(amountRm);
    if (data.url) window.location.href = data.url;
    return data;
  },
}));
