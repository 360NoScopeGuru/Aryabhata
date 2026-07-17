import { useState } from 'react'

interface Props {
  onClose: () => void
}

interface DemoResponse {
  reply: string
  model: string
  cost_usd: number
  remaining_budget_usd: number
}

export default function DemoModal({ onClose }: Props) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DemoResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    const trimmed = prompt.trim()
    if (!trimmed || loading) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/demo/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.detail ?? 'Demo request failed')
      } else {
        setResult(data)
      }
    } catch {
      setError('Network error — try again in a moment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="demo-scrim" onClick={onClose}>
      <div className="demo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="demo-head">
          <span className="demo-title">Try Aryabhata — no sign-up</span>
          <button className="ins-close" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="demo-sub">
          A single message, one small fast model, heavily rate-limited. Sign up for the full
          instrument — Blend Mode, Arena, Multiverse, personal analytics.
        </p>

        <textarea
          className="demo-textarea"
          placeholder="Ask anything…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
          rows={3}
        />

        <button className="send-btn" onClick={send} disabled={loading || !prompt.trim()}>
          {loading ? 'Thinking…' : 'Send →'}
        </button>

        {error && <div className="demo-error">{error}</div>}

        {result && (
          <div className="demo-result">
            <div className="demo-reply">{result.reply}</div>
            <div className="demo-meta">
              {result.model.split('/').pop()} · est. ${result.cost_usd.toFixed(5)} · demo budget
              remaining ${result.remaining_budget_usd.toFixed(2)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
