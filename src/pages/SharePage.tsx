import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'

interface SharedMessage {
  role: string
  content: string
  image_url?: string
  created_at: string
}

interface SharedConversation {
  title: string
  mode: string
  model: string
  messages: SharedMessage[]
}

function MarkdownText({ text }: { text: string }) {
  // Very minimal inline rendering — code blocks and plain text
  const parts = text.split(/(```[\s\S]*?```)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).split('\n')
          const lang = lines[0].trim()
          const code = lines.slice(1).join('\n')
          return (
            <pre key={i} className="share-code-block">
              {lang && <div className="share-code-lang">{lang}</div>}
              <code>{code}</code>
            </pre>
          )
        }
        return <span key={i} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{part}</span>
      })}
    </>
  )
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>()
  const [conv, setConv] = useState<SharedConversation | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then(r => {
        if (!r.ok) throw new Error(r.status === 404 ? 'not_found' : 'error')
        return r.json()
      })
      .then(setConv)
      .catch(e => setError(e.message === 'not_found' ? 'not_found' : 'error'))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div className="share-page">
      <header className="share-header">
        <div className="share-brand">
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="11" stroke="var(--accent)" strokeWidth="0.75" opacity="0.45"/>
            <circle cx="14" cy="14" r="6.5" stroke="var(--accent)" strokeWidth="0.75"/>
            <circle cx="14" cy="14" r="2.5" fill="var(--accent)"/>
            <line x1="0" y1="14" x2="5.5" y2="14" stroke="var(--accent)" strokeWidth="0.75"/>
            <line x1="22.5" y1="14" x2="28" y2="14" stroke="var(--accent)" strokeWidth="0.75"/>
            <line x1="14" y1="0" x2="14" y2="5.5" stroke="var(--accent)" strokeWidth="0.75"/>
            <line x1="14" y1="22.5" x2="14" y2="28" stroke="var(--accent)" strokeWidth="0.75"/>
          </svg>
          <span className="share-brand-name">Aryabhata</span>
          <span className="share-brand-sub">shared conversation</span>
        </div>
        <Link to="/sign-in" className="share-cta">Try it free →</Link>
      </header>

      <main className="share-main">
        {loading && (
          <div className="share-loading">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ animation: 'spin 2s linear infinite' }}>
              <circle cx="14" cy="14" r="11" stroke="var(--accent)" strokeWidth="0.75" opacity="0.2"/>
              <path d="M14 3 A11 11 0 0 1 25 14" stroke="var(--accent)" strokeWidth="0.75" strokeLinecap="round"/>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </svg>
          </div>
        )}

        {error === 'not_found' && (
          <div className="share-error">
            <div className="share-error-title">Link expired or not found</div>
            <div className="share-error-sub">This share link may have been revoked or never existed.</div>
          </div>
        )}

        {error === 'error' && (
          <div className="share-error">
            <div className="share-error-title">Failed to load conversation</div>
            <div className="share-error-sub">Something went wrong. Try refreshing the page.</div>
          </div>
        )}

        {conv && (
          <>
            <div className="share-conv-meta">
              <div className="share-conv-title">{conv.title}</div>
              <div className="share-conv-info">
                <span className="share-badge">{conv.mode.toUpperCase()}</span>
                {conv.model && <span className="share-badge">{conv.model.split('/').pop()}</span>}
                <span className="share-badge">{conv.messages.length} msgs</span>
              </div>
            </div>

            <div className="share-messages">
              {conv.messages.map((m, i) => (
                <div key={i} className={`share-msg share-msg--${m.role}`}>
                  <div className="share-msg-role">{m.role === 'assistant' ? 'A' : 'U'}</div>
                  <div className="share-msg-body">
                    {m.image_url && (
                      <img src={m.image_url} alt="generated" className="share-msg-image" />
                    )}
                    <MarkdownText text={m.content} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="share-footer">
        <span>Built with Aryabhata LLM Studio · NVIDIA NIM · 40+ models</span>
        <Link to="/sign-up" className="share-cta share-cta--sm">Start for free →</Link>
      </footer>
    </div>
  )
}
