import { useState, useEffect } from 'react'
import { useAppStore, type Theme } from '@/store/appStore'

const THEME_TABS: { id: Theme; label: string }[] = [
  { id: 'cad',    label: 'CAD'    },
  { id: 'orbit',  label: 'ORBIT'  },
  { id: 'brutal', label: 'BRUTAL' },
  { id: 'liquid', label: 'LIQUID' },
  { id: 'prism',  label: 'PRISM'  },
]

function UTCClock() {
  const [time, setTime] = useState(() => new Date().toISOString().slice(11, 19))
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toISOString().slice(11, 19)), 1000)
    return () => clearInterval(id)
  }, [])
  return <>{time}</>
}

export default function TopBar() {
  const { theme, setTheme, conversations, activeConversationId, projectName, threadCount, telemetry } = useAppStore()
  const activeConv = conversations.find(c => c.id === activeConversationId)

  const spend = telemetry.cost.toFixed(4)

  return (
    <header className="topbar">
      {/* Brand */}
      <div className="brand">
        <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="11" stroke="var(--accent)" strokeWidth="0.75" opacity="0.45"/>
          <circle cx="14" cy="14" r="6.5" stroke="var(--accent)" strokeWidth="0.75"/>
          <circle cx="14" cy="14" r="2.5" fill="var(--accent)"/>
          <line x1="0" y1="14" x2="5.5" y2="14" stroke="var(--accent)" strokeWidth="0.75"/>
          <line x1="22.5" y1="14" x2="28" y2="14" stroke="var(--accent)" strokeWidth="0.75"/>
          <line x1="14" y1="0" x2="14" y2="5.5" stroke="var(--accent)" strokeWidth="0.75"/>
          <line x1="14" y1="22.5" x2="14" y2="28" stroke="var(--accent)" strokeWidth="0.75"/>
        </svg>
        <span className="brand-name">Aryabhata</span>
        <span className="brand-sub">LLM · Studio</span>
      </div>

      {/* Theme tabs */}
      <div className="theme-tabs">
        {THEME_TABS.map(t => (
          <button
            key={t.id}
            className={`theme-tab ${theme === t.id ? 'active' : ''}`}
            onClick={() => setTheme(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Breadcrumb */}
      <div className="topbar-crumb">
        <span className="status-dot" />
        <span className="crumb-project">{projectName}</span>
        {activeConv && (
          <>
            <span className="sep">/</span>
            <span className="crumb-active" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeConv.title}
            </span>
          </>
        )}
      </div>

      {/* Right meta */}
      <div className="topbar-meta">
        <div className="meta-cell">
          <span className="k">THR</span>
          <span className="v">{String(threadCount).padStart(3, '0')}</span>
        </div>
        <div className="meta-cell">
          <span className="k">SPEND</span>
          <span className="v">${spend}</span>
        </div>
        <div className="meta-cell">
          <span className="k">UTC</span>
          <span className="v"><UTCClock /></span>
        </div>
      </div>
    </header>
  )
}
