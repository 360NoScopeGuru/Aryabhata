import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--bg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          fontFamily: 'var(--mono)',
        }}
      >
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <circle cx="36" cy="36" r="32" stroke="rgba(122,215,255,.15)" strokeWidth="0.75" />
          <circle cx="36" cy="36" r="22" stroke="rgba(122,215,255,.3)" strokeWidth="0.75" />
          <circle cx="36" cy="36" r="12" stroke="#7ad7ff" strokeWidth="0.75" />
          <circle cx="36" cy="36" r="4" fill="#7ad7ff" />
          <line x1="0" y1="36" x2="13" y2="36" stroke="#7ad7ff" strokeWidth="0.75" opacity="0.4" />
          <line x1="59" y1="36" x2="72" y2="36" stroke="#7ad7ff" strokeWidth="0.75" opacity="0.4" />
          <line x1="36" y1="0" x2="36" y2="13" stroke="#7ad7ff" strokeWidth="0.75" opacity="0.4" />
          <line x1="36" y1="59" x2="36" y2="72" stroke="#7ad7ff" strokeWidth="0.75" opacity="0.4" />
        </svg>
        <div
          style={{
            fontSize: '11px',
            letterSpacing: '.2em',
            textTransform: 'uppercase',
            color: 'var(--warn)',
          }}
        >
          Critical Error
        </div>
        <div
          style={{
            fontSize: '9.5px',
            letterSpacing: '.1em',
            color: 'var(--ink-faint)',
            maxWidth: '480px',
            textAlign: 'center',
          }}
        >
          {error.message}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'none',
            border: '.5px solid var(--accent)',
            color: 'var(--accent)',
            fontFamily: 'var(--mono)',
            fontSize: '10px',
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            padding: '8px 20px',
            borderRadius: 'var(--r)',
            cursor: 'pointer',
          }}
        >
          Reload →
        </button>
      </div>
    )
  }
}
