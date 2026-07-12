export type MobilePanel = 'chat' | 'models' | 'params' | 'sessions'

interface Props {
  active: MobilePanel
  onChange: (p: MobilePanel) => void
  mode: string
}

const TABS: { id: MobilePanel; label: string; icon: string }[] = [
  { id: 'models', label: 'Models', icon: '◈' },
  { id: 'chat', label: 'Chat', icon: '◉' },
  { id: 'params', label: 'Params', icon: '⊟' },
  { id: 'sessions', label: 'History', icon: '≡' },
]

export default function MobileNav({ active, onChange }: Props) {
  return (
    <nav className="mob-nav">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`mob-tab ${active === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          <span className="mob-tab-icon">{t.icon}</span>
          <span className="mob-tab-label">{t.label}</span>
        </button>
      ))}
    </nav>
  )
}
