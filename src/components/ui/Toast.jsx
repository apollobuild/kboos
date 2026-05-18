import { useAppStore } from '../../store/useAppStore.js';

export function Toast() {
  const toast = useAppStore(s => s.toast);
  if (!toast) return null;
  return (
    <div className={`toast ${toast.color || 'green'}`}>
      {toast.color === 'green' && '✓ '}
      {toast.color === 'red' && '✕ '}
      {toast.msg}
    </div>
  );
}
