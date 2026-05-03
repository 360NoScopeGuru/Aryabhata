import { useState, useEffect } from 'react'
import { UserButton } from '@clerk/clerk-react'
import { dark } from '@clerk/themes'
import { useAppStore } from '@/store/appStore'

function UTCClock() {
  const [time, setTime] = useState(() => new Date().toISOString().slice(11, 19))
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toISOString().slice(11, 19)), 1000)
    return () => clearInterval(id)
  }, [])
  return <>{time}</>
}

export default function TopBar() {
  const { conversations, activeConversationId, projectName, threadCount } = useAppStore()
  const activeConv = conversations.find(c => c.id === activeConversationId)

  return (
    <header className="topbar">
      {/* Left: project / session breadcrumb */}
      <div className="topbar-left">
        <div className="topbar-crumb">
          <span className="status-dot" />
          <span className="crumb-project">{projectName}</span>
          {activeConv && (
            <>
              <span className="sep">/</span>
              <span className="crumb-active" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                {activeConv.title}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Center: brand */}
      <div className="topbar-center">
        <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
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

      {/* Right: meta + user */}
      <div className="topbar-meta">
        <div className="meta-cell">
          <span className="k">THR</span>
          <span className="v">{String(threadCount).padStart(3, '0')}</span>
        </div>
        <div className="meta-cell">
          <span className="k">UTC</span>
          <span className="v"><UTCClock /></span>
        </div>
        <UserButton
          appearance={{
            baseTheme: dark,
            elements: {
              avatarBox: { width: 22, height: 22 },
              userButtonPopoverCard: { background: '#0d0f12', border: '.5px solid rgba(122,215,255,.15)' },
            },
          }}
        />
      </div>
    </header>
  )
}
