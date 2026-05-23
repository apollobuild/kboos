import { create } from 'zustand';
import { businessesService } from '../services/businesses.js';
import { campaignsService } from '../services/campaigns.js';
import { leadsService } from '../services/leads.js';
import { repliesService } from '../services/replies.js';
import { apiFetch } from '../services/api.js';

const ACCENT_PALETTES = {
  blue: { '--blue':'oklch(62% 0.19 245)', '--blue-dim':'oklch(62% 0.19 245 / 0.15)', '--green':'oklch(65% 0.2 145)', '--green-dim':'oklch(65% 0.2 145 / 0.15)' },
  violet: { '--blue':'oklch(62% 0.22 280)', '--blue-dim':'oklch(62% 0.22 280 / 0.15)', '--green':'oklch(65% 0.18 200)', '--green-dim':'oklch(65% 0.18 200 / 0.15)' },
  emerald: { '--blue':'oklch(65% 0.2 160)', '--blue-dim':'oklch(65% 0.2 160 / 0.15)', '--green':'oklch(68% 0.18 130)', '--green-dim':'oklch(68% 0.18 130 / 0.15)' },
  amber: { '--blue':'oklch(72% 0.18 65)', '--blue-dim':'oklch(72% 0.18 65 / 0.15)', '--green':'oklch(65% 0.2 145)', '--green-dim':'oklch(65% 0.2 145 / 0.15)' },
  rose: { '--blue':'oklch(62% 0.22 10)', '--blue-dim':'oklch(62% 0.22 10 / 0.15)', '--green':'oklch(65% 0.2 145)', '--green-dim':'oklch(65% 0.2 145 / 0.15)' },
};
const DENSITY_CONFIGS = {
  compact: { '--density-page-pad':'14px 18px', '--density-card-pad':'10px', '--density-card-sm-pad':'8px', '--density-nav-pad':'5px 14px', '--density-font-base':'13px', '--density-row-pad':'7px 12px', '--density-gap':'10px' },
  default: { '--density-page-pad':'24px 28px', '--density-card-pad':'16px', '--density-card-sm-pad':'12px', '--density-nav-pad':'7px 16px', '--density-font-base':'14px', '--density-row-pad':'10px 12px', '--density-gap':'16px' },
  spacious: { '--density-page-pad':'36px 44px', '--density-card-pad':'24px', '--density-card-sm-pad':'18px', '--density-nav-pad':'10px 20px', '--density-font-base':'15px', '--density-row-pad':'14px 16px', '--density-gap':'24px' },
};

function applyTweaks({ accent, density }) {
  const root = document.documentElement;
  Object.entries(ACCENT_PALETTES[accent] || ACCENT_PALETTES.blue).forEach(([k,v]) => root.style.setProperty(k,v));
  Object.entries(DENSITY_CONFIGS[density] || DENSITY_CONFIGS.default).forEach(([k,v]) => root.style.setProperty(k,v));
}

export const useAppStore = create((set, get) => ({
  page: 'dashboard',
  pageParams: {},
  selectedBizId: null,
  selectedCampaignId: null,
  businesses: [],
  campaigns: [],
  leads: [],
  replies: [],
  activity: [],
  tweaks: { accent:'violet', density:'default', mood:'realistic' },
  toast: null,
  sidebarOpen: false,

  init: async () => {
    try {
      const [businesses, campaigns, leads, replies, activity] = await Promise.all([
        businessesService.getAll(),
        campaignsService.getAll(),
        leadsService.getAll(),
        repliesService.getAll(),
        apiFetch('/activity').catch(() => []),
      ]);
      set({ businesses, campaigns, leads, replies, activity });
      applyTweaks(get().tweaks);
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  },

  setPage: (page, params = {}) => set({ page, pageParams: params || {} }),
  setSelectedCampaign: (id) => set({ selectedCampaignId: id }),
  openCampaignPipeline: (id) => set({ selectedCampaignId: id, page: 'pipeline' }),
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),
  loadCampaigns: async () => {
    const campaigns = await campaignsService.getAll().catch(() => null);
    if (campaigns) set({ campaigns });
  },
  setSelectedBiz: (bizId) => set({ selectedBizId: bizId }),

  setTweak: (key, val) => {
    const tweaks = { ...get().tweaks, [key]: val };
    set({ tweaks });
    applyTweaks(tweaks);
  },

  showToast: (msg, color='green') => {
    set({ toast: { msg, color } });
    setTimeout(() => set({ toast: null }), 3000);
  },

  // Businesses
  addBusiness: async (biz) => {
    const newBiz = await businessesService.add(biz);
    set(s => ({ businesses: [...s.businesses, newBiz] }));
    get().showToast(`${biz.name} added`);
    return newBiz;
  },
  updateBusiness: async (id, patch) => {
    const updated = await businessesService.update(id, patch);
    set(s => ({ businesses: s.businesses.map(b => b.id === id ? updated : b) }));
  },
  removeBusiness: async (id) => {
    await businessesService.remove(id);
    set(s => ({ businesses: s.businesses.filter(b => b.id !== id) }));
    get().showToast('Business removed', 'amber');
  },

  // Campaigns
  addCampaign: async (c) => {
    const newC = await campaignsService.add(c);
    set(s => ({ campaigns: [...s.campaigns, newC] }));
    get().showToast(`Campaign "${c.name}" created`);
    return newC;
  },
  updateCampaign: async (id, patch) => {
    const updated = await campaignsService.update(id, patch);
    set(s => ({ campaigns: s.campaigns.map(c => c.id === id ? updated : c) }));
  },
  toggleCampaign: async (id) => {
    const updated = await campaignsService.toggleStatus(id);
    if (updated) set(s => ({ campaigns: s.campaigns.map(c => c.id === id ? updated : c) }));
  },
  removeCampaign: async (id) => {
    await campaignsService.remove(id);
    set(s => ({ campaigns: s.campaigns.filter(c => c.id !== id) }));
  },

  // Leads
  updateLead: async (id, patch) => {
    const updated = await leadsService.update(id, patch);
    set(s => ({ leads: s.leads.map(l => l.id === id ? updated : l) }));
  },
  bulkUpdateLeads: async (ids, patch) => {
    await leadsService.bulkUpdateStatus(ids, patch.status);
    set(s => ({ leads: s.leads.map(l => ids.includes(l.id) ? { ...l, ...patch } : l) }));
  },

  // Replies
  updateReply: async (id, patch) => {
    const action = patch.status === 'handled' ? 'markHandled' : patch.status === 'suppressed' ? 'suppress' : 'markRead';
    await repliesService[action](id);
    set(s => ({ replies: s.replies.map(r => r.id === id ? { ...r, ...patch } : r) }));
  },

  refreshReplies: async () => {
    const fresh = await repliesService.getAll().catch(() => null);
    if (fresh) set({ replies: fresh });
  },
}));
