import { apiFetch } from './api.js';
import Papa from 'papaparse';

export function calculateScoreLabel(lead) {
  let pts = 0;
  const titleLow = (lead.title || '').toLowerCase();
  if (/facilities|property|estate|building|procurement|gm|director|head/.test(titleLow)) pts += 3;
  const compLow = (lead.company || '').toLowerCase();
  if (/bank|hotel|glc|sedc|dbku|mbks|seb|naim|ijm|hsl/.test(compLow)) pts += 2;
  if (lead.channels && (lead.channels.includes('wa') || lead.status === 'replied' || lead.status === 'call_initiated')) pts += 2;
  if (lead.channels && lead.channels.includes('email_opened')) pts += 1;
  pts += Math.floor((lead.score || 0) / 3);
  if (pts >= 6) return 'High';
  if (pts >= 3) return 'Medium';
  return 'Low';
}

export const leadsService = {
  getAll: () => apiFetch('/leads'),
  add: (l) => apiFetch('/leads', { method: 'POST', body: l }),
  update: (id, patch) => apiFetch(`/leads/${id}`, { method: 'PATCH', body: patch }),
  remove: (id) => apiFetch(`/leads/${id}`, { method: 'DELETE' }),
  bulkUpdateStatus: (ids, status) => apiFetch('/leads/bulk', { method: 'PATCH', body: { ids, patch: { status } } }),
  exportCSV: (leads) => {
    const csv = Papa.unparse(leads.map(l => ({
      Name: l.name, Company: l.company, Title: l.title,
      Score: l.score, Status: l.status, Language: l.lang,
    })));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `kboos-leads-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
    return blob;
  },
};
