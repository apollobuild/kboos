import { useState } from 'react';
import { apiFetch } from '../../services/api.js';

const ROLE_DESCRIPTIONS = {
  admin:    { label: 'Admin', color: 'red', desc: 'Full access — manages team, billing, API keys, all campaigns and leads.' },
  operator: { label: 'Operator', color: 'blue', desc: 'Can manage businesses, campaigns, leads and replies. No access to billing or team settings.' },
  viewer:   { label: 'Viewer', color: 'green', desc: 'Read-only access to dashboard, businesses, campaigns, leads, replies and reports. Cannot create or delete anything.' },
};

const ROLE_ACCESS = {
  admin:    ['Dashboard', 'Businesses', 'Add/Remove Business', 'Campaigns', 'New Campaign', 'Lead Manager', 'Reply Inbox', 'Approvals', 'Reporting', 'Prompt Studio', 'Settings (all tabs)', 'Client Portal'],
  operator: ['Dashboard', 'Businesses', 'Add/Remove Business', 'Campaigns', 'New Campaign', 'Lead Manager', 'Reply Inbox', 'Approvals', 'Reporting', 'Prompt Studio', 'Settings (Drive only)', 'Client Portal'],
  viewer:   ['Dashboard', 'Businesses (view only)', 'Campaigns (view only)', 'Lead Manager (view only)', 'Reply Inbox (view only)', 'Reporting', 'Client Portal'],
};

const ROLE_NO_ACCESS = {
  admin:    [],
  operator: ['API Keys', 'Team Management', 'Wallet', 'Billing'],
  viewer:   ['Add/Remove Business', 'New Campaign', 'Approvals', 'Prompt Studio', 'All Settings tabs'],
};

function Avatar({ name, size = 48 }) {
  const initials = name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '??';
  const colors = ['blue', 'green', 'purple', 'amber', 'red'];
  const color = colors[name?.charCodeAt(0) % colors.length] || 'blue';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `oklch(62% 0.19 245 / 0.2)`, border: `2px solid oklch(62% 0.19 245 / 0.4)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.35, color: 'var(--blue)',
    }}>
      {initials}
    </div>
  );
}

function timeAgo(date) {
  if (!date) return 'Never';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-MY');
}

export function TeamMemberSlideOver({ member, onClose, onUpdated, onRemoved, showToast }) {
  const [role, setRole] = useState(member.role?.toLowerCase() || 'operator');
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [inviteLink, setInviteLink] = useState('');

  const roleInfo = ROLE_DESCRIPTIONS[role] || ROLE_DESCRIPTIONS.operator;

  async function handleRoleChange(newRole) {
    setRole(newRole);
    setSaving(true);
    try {
      const updated = await apiFetch(`/settings/users/${member.id}`, { method: 'PATCH', body: { role: newRole } });
      onUpdated(updated);
      showToast(`Role updated to ${newRole}`, 'green');
    } catch (e) {
      showToast(e.message || 'Failed to update role', 'red');
      setRole(member.role?.toLowerCase());
    } finally {
      setSaving(false);
    }
  }

  async function handleResendInvite() {
    setResending(true);
    try {
      const res = await apiFetch(`/settings/users/${member.id}/resend-invite`, { method: 'POST' });
      setInviteLink(res.inviteLink);
      showToast('New invite link generated', 'green');
    } catch (e) {
      showToast(e.message || 'Failed to resend invite', 'red');
    } finally {
      setResending(false);
    }
  }

  async function handleRemove() {
    if (!window.confirm(`Remove ${member.name} from the team? They will lose access immediately.`)) return;
    try {
      await apiFetch(`/settings/users/${member.id}`, { method: 'DELETE' });
      onRemoved(member.id);
      showToast(`${member.name} removed`, 'amber');
      onClose();
    } catch (e) {
      showToast(e.message || 'Failed to remove', 'red');
    }
  }

  return (
    <div className="slide-over-overlay" onClick={onClose}>
      <div className="slide-over-panel" onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 20px 0' }}>
          <div className="flex items-center justify-between mb-4">
            <button className="btn btn-ghost btn-xs" onClick={onClose}>✕ Close</button>
            <button className="btn btn-sm" style={{ color: 'var(--red)', border: '1px solid var(--red)', fontSize: 12 }} onClick={handleRemove}>
              Remove
            </button>
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar name={member.name} size={52} />
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.02 }}>{member.name}</h2>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{member.email}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <span className={`badge badge-${member.pending ? 'amber' : 'green'}`}>
                  {member.pending ? 'Invite Pending' : 'Active'}
                </span>
              </div>
            </div>
          </div>

          {/* Role selector */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Role</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {['admin', 'operator', 'viewer'].map(r => (
                <button
                  key={r}
                  className={`btn btn-sm${role === r ? ' btn-blue' : ''}`}
                  style={{ flex: 1, textTransform: 'capitalize', opacity: saving ? 0.6 : 1 }}
                  onClick={() => handleRoleChange(r)}
                  disabled={saving || role === r}
                >
                  {r}
                </button>
              ))}
            </div>
            <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
              {roleInfo.desc}
            </div>
          </div>
        </div>

        <div style={{ padding: '0 20px 20px', overflowY: 'auto' }}>
          {/* Account details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Joined', val: timeAgo(member.createdAt) },
              { label: 'Last Active', val: member.lastLoginAt ? timeAgo(member.lastLoginAt) : 'Never logged in' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--s2)', padding: '10px 12px', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Access list */}
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Access</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16 }}>
            {ROLE_ACCESS[role]?.map(item => (
              <div key={item} style={{ display: 'flex', gap: 8, fontSize: 12, alignItems: 'center' }}>
                <span style={{ color: 'var(--green)', fontSize: 10 }}>✓</span>
                <span style={{ color: 'var(--text-2)' }}>{item}</span>
              </div>
            ))}
            {ROLE_NO_ACCESS[role]?.length > 0 && ROLE_NO_ACCESS[role].map(item => (
              <div key={item} style={{ display: 'flex', gap: 8, fontSize: 12, alignItems: 'center' }}>
                <span style={{ color: 'var(--red)', fontSize: 10 }}>✗</span>
                <span style={{ color: 'var(--text-3)' }}>{item}</span>
              </div>
            ))}
          </div>

          {/* Resend invite (pending only) */}
          {member.pending && (
            <div style={{ background: 'oklch(72% 0.18 65 / 0.08)', border: '1px solid oklch(72% 0.18 65 / 0.3)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, color: 'var(--amber)' }}>Invite not accepted yet</div>
              {inviteLink ? (
                <>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, wordBreak: 'break-all', color: 'var(--text-2)', marginBottom: 8 }}>{inviteLink}</div>
                  <button className="btn btn-green" style={{ width: '100%', fontSize: 13 }} onClick={() => { navigator.clipboard.writeText(inviteLink); showToast('Link copied', 'green'); }}>
                    Copy New Link
                  </button>
                </>
              ) : (
                <button className="btn" style={{ width: '100%', fontSize: 13 }} onClick={handleResendInvite} disabled={resending}>
                  {resending ? 'Generating...' : 'Generate New Invite Link'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
