import { useState } from 'react'
import { v4 as uuid } from 'uuid'

import { useAuthFetch } from '@/hooks/useAuthFetch'
import { type Message, useAppStore } from '@/store/appStore'

interface Props {
  conversationId: string
}

const PRESET_PROMPTS = [
  'A futuristic city at night with neon lights',
  'A serene Japanese garden at dawn',
  'An astronaut on an alien planet',
  'A cozy library with glowing books',
]

export default function ImageMode({ conversationId }: Props) {
  const { messages, addMessage, selectedImageModel, imageWidth, imageHeight, imageSteps } =
    useAppStore()
  const authFetch = useAuthFetch()
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const convMessages = messages[conversationId] ?? []
  const imageMessages = convMessages.filter((m) => m.role === 'assistant' && m.image_url)

  const generate = async (p?: string) => {
    const text = (p ?? prompt).trim()
    if (!text || loading) return
    setLoading(true)
    setError('')

    const userMsg: Message = {
      id: uuid(),
      conversation_id: conversationId,
      role: 'user',
      content: text,
      mode: 'image',
      created_at: new Date().toISOString(),
    }
    addMessage(userMsg)

    try {
      const res = await authFetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          prompt: text,
          model: selectedImageModel,
          width: imageWidth,
          height: imageHeight,
          steps: imageSteps,
        }),
      })

      if (!res.ok) {
        setError(`Generation failed: ${await res.text()}`)
        return
      }

      const data = await res.json()
      const imgMsg: Message = {
        id: data.id,
        conversation_id: conversationId,
        role: 'assistant',
        content: text,
        mode: 'image',
        model: selectedImageModel,
        image_url: data.image_url,
        created_at: new Date().toISOString(),
      }
      addMessage(imgMsg)
      setPrompt('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Head */}
      <div className="center-head">
        <span>Image Generation</span>
        <span style={{ color: 'var(--ink-faint)', fontSize: '9px' }}>
          {imageWidth}×{imageHeight} · {imageSteps} steps
        </span>
      </div>

      {/* Gallery */}
      <div className="img-gallery" style={{ flex: 1 }}>
        {imageMessages.length === 0 && !loading && (
          <div className="empty-state">
            <div>
              <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                style={{ margin: '0 auto 12px' }}
              >
                <rect
                  x="4"
                  y="10"
                  width="40"
                  height="30"
                  rx="2"
                  stroke="rgba(122,215,255,.4)"
                  strokeWidth="0.75"
                />
                <circle cx="15" cy="20" r="4" stroke="rgba(255,212,122,.5)" strokeWidth="0.75" />
                <path
                  d="M4 34 L16 24 L26 32 L34 26 L44 34"
                  stroke="rgba(122,215,255,.5)"
                  strokeWidth="0.75"
                />
              </svg>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '11px',
                  letterSpacing: '.14em',
                  color: 'var(--ink)',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  marginBottom: '4px',
                }}
              >
                FLUX 1 Dev
              </div>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '9px',
                  letterSpacing: '.2em',
                  color: 'var(--ink-dim)',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  marginBottom: '20px',
                }}
              >
                Via NVIDIA NIM
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                maxWidth: '400px',
                width: '100%',
              }}
            >
              {PRESET_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPrompt(p)
                    generate(p)
                  }}
                  style={{
                    textAlign: 'left',
                    padding: '10px 12px',
                    border: '.5px solid var(--line-soft)',
                    borderRadius: 'var(--r)',
                    background: 'transparent',
                    color: 'var(--ink-dim)',
                    fontSize: '11px',
                    lineHeight: 1.4,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'border-color .12s, color .12s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--line)'
                    e.currentTarget.style.color = 'var(--ink)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--line-soft)'
                    e.currentTarget.style.color = 'var(--ink-dim)'
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '12px',
          }}
        >
          {imageMessages.map((msg) => (
            <div key={msg.id} className="img-thumb fade-up">
              <img src={msg.image_url} alt={msg.content} />
              <div className="img-overlay">
                <p
                  style={{
                    flex: 1,
                    fontFamily: 'var(--mono)',
                    fontSize: '10px',
                    color: 'var(--ink-dim)',
                    letterSpacing: '.06em',
                    lineHeight: 1.5,
                  }}
                >
                  {msg.content}
                </p>
                <a
                  href={msg.image_url}
                  download={`aryabhata-${msg.id}.jpg`}
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '9.5px',
                    letterSpacing: '.14em',
                    textTransform: 'uppercase',
                    color: 'var(--accent)',
                    textDecoration: 'none',
                    border: '.5px solid var(--accent)',
                    padding: '4px 10px',
                    borderRadius: 'var(--r)',
                    flexShrink: 0,
                  }}
                >
                  Save
                </a>
              </div>
            </div>
          ))}

          {loading && (
            <div
              style={{
                border: '.5px solid var(--line-soft)',
                borderRadius: 'var(--r)',
                aspectRatio: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                background: 'var(--surface)',
              }}
            >
              <div style={{ position: 'relative', width: '40px', height: '40px' }}>
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 40 40"
                  fill="none"
                  style={{ animation: 'spin 2s linear infinite' }}
                >
                  <circle cx="20" cy="20" r="17" stroke="rgba(122,215,255,.15)" strokeWidth="1" />
                  <path
                    d="M20 3 A17 17 0 0 1 37 20"
                    stroke="var(--accent)"
                    strokeWidth="1"
                    strokeLinecap="round"
                  />
                </svg>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '9.5px',
                  letterSpacing: '.2em',
                  color: 'var(--ink-dim)',
                  textTransform: 'uppercase',
                }}
              >
                Generating…
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            margin: '0 24px',
            padding: '8px 12px',
            border: '.5px solid rgba(255,138,107,.3)',
            borderRadius: 'var(--r)',
            fontFamily: 'var(--mono)',
            fontSize: '10px',
            color: 'var(--warn)',
            letterSpacing: '.08em',
          }}
        >
          {error}
        </div>
      )}

      {/* Prompt input */}
      <div
        style={{
          padding: '16px 24px',
          borderTop: '.5px solid var(--line-soft)',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-end',
        }}
      >
        <div
          style={{
            flex: 1,
            border: '.5px solid var(--line)',
            borderRadius: 'var(--r)',
            background: 'var(--surface)',
          }}
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                generate()
              }
            }}
            placeholder="Describe the image…"
            rows={2}
            disabled={loading}
            style={{
              display: 'block',
              width: '100%',
              border: 0,
              background: 'transparent',
              outline: 'none',
              resize: 'none',
              padding: '10px 12px',
              fontFamily: 'inherit',
              fontSize: '13.5px',
              color: 'var(--ink)',
              lineHeight: 1.55,
            }}
          />
        </div>
        <button
          onClick={() => generate()}
          disabled={!prompt.trim() || loading}
          className="send-btn"
          style={{ flexShrink: 0, height: 'fit-content' }}
        >
          Generate →
        </button>
      </div>
    </div>
  )
}
