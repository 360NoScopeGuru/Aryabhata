import { useEffect, useRef, useState } from 'react'

import { type Theme, useAppStore } from '@/store/appStore'

interface Props {
  onShowShortcuts?: () => void
  onShowInsights?: () => void
  onShowPalette?: () => void
}

const THEMES: { id: Theme; label: string; accent: string }[] = [
  { id: 'cad', label: 'VOID', accent: '#b44dff' },
  { id: 'orbit', label: 'EMBER', accent: '#ff6b1a' },
  { id: 'brutal', label: 'ARCTIC', accent: '#0066ff' },
  { id: 'liquid', label: 'MATRIX', accent: '#00ff41' },
  { id: 'prism', label: 'BLOOM', accent: '#e0198c' },
]

export default function StatusBar({ onShowShortcuts, onShowInsights, onShowPalette }: Props) {
  const { theme, setTheme, mode, telemetry, sessionTokens, lastError } = useAppStore()
  const [themesOpen, setThemesOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!themesOpen) return
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setThemesOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [themesOpen])

  return (
    <div className="status-bar">
      {/* Themes drop-up — bottom left */}
      <div
        className="status-cell themes-trigger-cell"
        ref={dropRef}
        style={{ position: 'relative' }}
      >
        <button className="themes-trigger-btn" onClick={() => setThemesOpen(!themesOpen)}>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: THEMES.find((t) => t.id === theme)?.accent ?? 'var(--accent)',
              flexShrink: 0,
              boxShadow: `0 0 6px ${THEMES.find((t) => t.id === theme)?.accent ?? 'var(--accent)'}88`,
            }}
          />
          Themes
          <span style={{ opacity: 0.5, fontSize: '7px' }}>{themesOpen ? '▼' : '▲'}</span>
        </button>

        {themesOpen && (
          <div className="themes-dropup">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={`themes-dropup-item ${theme === t.id ? 'active' : ''}`}
                onClick={() => {
                  setTheme(t.id)
                  setThemesOpen(false)
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: t.accent,
                    flexShrink: 0,
                    boxShadow: theme === t.id ? `0 0 8px ${t.accent}` : 'none',
                  }}
                />
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="status-cell">
        {lastError ? (
          <>
            <span className="status-err-dot" />
            <span className="status-err">SYS ERR</span>
          </>
        ) : (
          <>
            <span
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: 'var(--ok)',
                boxShadow: '0 0 6px var(--ok)',
                flexShrink: 0,
              }}
            />
            <span className="status-ok">SYS NOMINAL</span>
          </>
        )}
      </div>
      <div className="status-cell">
        <span>TTFT</span>
        <span className="sv">{telemetry.ttft > 0 ? `${telemetry.ttft}ms` : '—'}</span>
      </div>
      <div className="status-cell">
        <span>MODE</span>
        <span className="sv">{mode.toUpperCase()}</span>
      </div>
      <div className="status-cell">
        <span>SESS</span>
        <span className="sv">{sessionTokens.toLocaleString()} tok</span>
      </div>
      <div className="status-cell right">
        <span>PALETTE</span>
        <span className="sv">{theme.toUpperCase()}</span>
      </div>
      {onShowPalette && (
        <button
          className="status-shortcuts-btn"
          onClick={onShowPalette}
          title="Command Palette (Ctrl+P)"
        >
          ⌘
        </button>
      )}
      {onShowInsights && (
        <button className="status-shortcuts-btn" onClick={onShowInsights} title="Insights (Ctrl+I)">
          📊
        </button>
      )}
      {onShowShortcuts && (
        <button
          className="status-shortcuts-btn"
          onClick={onShowShortcuts}
          title="Keyboard shortcuts (Ctrl+/)"
        >
          ⌨
        </button>
      )}
    </div>
  )
}
