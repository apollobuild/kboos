import { useEffect } from 'react';
import { CHANGELOG, LATEST_VERSION } from '../data/changelog.js';

const TAG_STYLE = {
  'New Feature': { bg: 'oklch(65% 0.2 145 / 0.15)', color: 'var(--green)', border: 'oklch(65% 0.2 145 / 0.3)' },
  'Improvement': { bg: 'oklch(62% 0.19 245 / 0.12)', color: 'var(--blue)',  border: 'oklch(62% 0.19 245 / 0.25)' },
  'Fix':         { bg: 'oklch(72% 0.18 65 / 0.12)',  color: 'oklch(72% 0.18 65)', border: 'oklch(72% 0.18 65 / 0.25)' },
};

function TagBadge({ tag }) {
  const s = TAG_STYLE[tag] || TAG_STYLE['Fix'];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>
      {tag}
    </span>
  );
}

function VersionBadge({ version }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'var(--s2)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '4px 12px',
    }}>
      <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>v{version}</span>
    </div>
  );
}

export function Changelog({ isPublic = false }) {
  useEffect(() => {
    localStorage.setItem('kboos_changelog_seen', LATEST_VERSION);
  }, []);

  const header = isPublic ? (
    <div style={{ borderBottom: '1px solid var(--border)', padding: '20px 0 20px', marginBottom: 48 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="24" height="17" viewBox="0 0 28 20" fill="none">
          <path d="M2 10L8 3L14 10L8 17L2 10Z" fill="oklch(75% 0.24 145 / 0.95)" />
          <path d="M9 10L15 3L21 10L15 17L9 10Z" fill="oklch(65% 0.2 210 / 0.8)" />
          <path d="M16 10L22 3L28 10L22 17L16 10Z" fill="oklch(60% 0.2 260 / 0.55)" />
        </svg>
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--text)' }}>KBOOS</span>
        <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4 }}>/ Changelog</span>
      </div>
    </div>
  ) : null;

  return (
    <div style={{ background: isPublic ? 'var(--bg, #0e1117)' : 'transparent', minHeight: isPublic ? '100vh' : 0, color: 'var(--text, #f0f0f0)' }}>
      {isPublic && (
        <style>{`
          :root { --bg:#0e1117; --s1:#141820; --s2:#1a2030; --border:rgba(255,255,255,0.08); --text:#f0f0f0; --muted:rgba(255,255,255,0.45); --green:oklch(65% 0.2 145); --blue:oklch(62% 0.19 245); --amber:oklch(72% 0.18 65); --red:oklch(55% 0.22 20); --font-mono:'JetBrains Mono',monospace; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        `}</style>
      )}

      {header}

      <div style={{ maxWidth: 720, margin: '0 auto', padding: isPublic ? '0 24px 80px' : '0 0 80px' }}>

        {/* Hero */}
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: isPublic ? 32 : 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 10 }}>
            What's New
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
            Every feature, improvement, and fix — in the order it shipped.
          </p>
        </div>

        {/* Timeline */}
        {CHANGELOG.map((release, ri) => (
          <div key={release.version} style={{ display: 'flex', gap: 0, marginBottom: 56 }}>

            {/* Left column — version + date */}
            <div style={{ width: 120, flexShrink: 0, paddingTop: 2 }}>
              <VersionBadge version={release.version} />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, fontWeight: 500 }}>{release.date}</div>
              {ri === 0 && (
                <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: 'var(--green)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Latest</div>
              )}
            </div>

            {/* Divider line */}
            <div style={{ width: 1, background: 'var(--border)', margin: '6px 24px 0', flexShrink: 0, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 8, height: 8, borderRadius: '50%', background: ri === 0 ? 'var(--green)' : 'var(--border)', border: '2px solid var(--s1, #141820)' }} />
            </div>

            {/* Right column — entries */}
            <div style={{ flex: 1, paddingTop: 0 }}>
              {release.entries.map((entry, ei) => (
                <div
                  key={ei}
                  style={{
                    background: 'var(--s1, #141820)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '18px 20px',
                    marginBottom: ei < release.entries.length - 1 ? 12 : 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                    <TagBadge tag={entry.tag} />
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{entry.title}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, marginBottom: entry.bullets.length ? 12 : 0 }}>
                    {entry.desc}
                  </p>
                  {entry.bullets.length > 0 && (
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {entry.bullets.map((b, bi) => (
                        <li key={bi} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                          <span style={{ color: 'var(--blue)', marginTop: 1, flexShrink: 0 }}>›</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
            KBOOS Outreach OS — by KOBIS Berhad
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
            Questions? Contact your account manager.
          </div>
        </div>
      </div>
    </div>
  );
}
