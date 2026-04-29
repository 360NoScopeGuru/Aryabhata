import { useAppStore } from '@/store/appStore'

export default function StatusBar() {
  const { theme, mode, telemetry, sessionTokens } = useAppStore()

  return (
    <div className="status-bar">
      <div className="status-cell">
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--ok)', boxShadow: '0 0 6px var(--ok)', flexShrink: 0 }} />
        <span className="status-ok">SYS NOMINAL</span>
      </div>
      <div className="status-cell">
        <span>REGION</span>
        <span className="sv">us-east-1</span>
      </div>
      <div className="status-cell">
        <span>RTT</span>
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
    </div>
  )
}
