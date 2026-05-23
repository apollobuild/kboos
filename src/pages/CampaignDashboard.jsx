import { useAppStore } from '../store/useAppStore.js';
export function CampaignDashboard() {
  const setPage = useAppStore(s => s.setPage);
  return (
    <div className="page">
      <div className="page-title">Campaign Dashboard</div>
      <div style={{color:'var(--muted)',fontSize:13,marginTop:8}}>Loading dashboard...</div>
    </div>
  );
}
