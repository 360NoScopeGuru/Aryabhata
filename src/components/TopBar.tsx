import { useAppStore, type Mode } from '@/store/appStore'

const BrandMark = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="11" stroke="#7ad7ff" strokeWidth="0.75" opacity="0.45"/>
    <circle cx="14" cy="14" r="6.5" stroke="#7ad7ff" strokeWidth="0.75"/>
    <circle cx="14" cy="14" r="2.5" fill="#7ad7ff"/>
    <line x1="0" y1="14" x2="5.5" y2="14" stroke="#7ad7ff" strokeWidth="0.75"/>
    <line x1="22.5" y1="14" x2="28" y2="14" stroke="#7ad7ff" strokeWidth="0.75"/>
    <line x1="14" y1="0" x2="14" y2="5.5" stroke="#7ad7ff" strokeWidth="0.75"/>
    <line x1="14" y1="22.5" x2="14" y2="28" stroke="#7ad7ff" strokeWidth="0.75"/>
  </svg>
)

const MODE_LABEL: Record<Mode, string> = { chat: 'CHAT', code: 'CODE', image: 'IMAGE' }

export default function TopBar() {
  const { mode, conversations, activeConversationId, sessionTokens } = useAppStore()
  const activeConv = conversations.find((c) => c.id === activeConversationId)

  return (
    <header className="topbar">
      <div className="brand">
        <BrandMark />
        <span className="brand-name">Aryabhata</span>
        <span className="brand-sub">LLM · Instrument</span>
      </div>

      <div className="topbar-crumb">
        <span className="status-dot" />
        {activeConv ? (
          <>
            <span style={{ color: 'var(--ink-dim)' }}>{MODE_LABEL[activeConv.mode]}</span>
            <span style={{ color: 'var(--ink-faint)' }}>/</span>
            <span className="crumb-title">{activeConv.title}</span>
          </>
        ) : (
          <span>No active session</span>
        )}
      </div>

      <div className="topbar-meta">
        <div className="meta-cell">
          <span className="k">Mode</span>
          <span className="v">{MODE_LABEL[mode]}</span>
        </div>
        <div className="meta-cell">
          <span className="k">Tokens</span>
          <span className="v">{sessionTokens.toLocaleString()}</span>
        </div>
      </div>
    </header>
  )
}
