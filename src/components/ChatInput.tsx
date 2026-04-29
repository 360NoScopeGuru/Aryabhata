import { useRef, useEffect, useState, type KeyboardEvent, type ClipboardEvent } from 'react'
import { useAppStore } from '@/store/appStore'

interface Props {
  onSend: (text: string, imageBase64?: string) => void
  onStop?: () => void
  streaming?: boolean
  placeholder?: string
  disabled?: boolean
  modelLabel?: string
}

export default function ChatInput({ onSend, onStop, streaming, placeholder, disabled, modelLabel }: Props) {
  const [value, setValue] = useState('')
  const [pastedImage, setPastedImage] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { mode } = useAppStore()

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px'
  }, [value])

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (!file) continue
        const reader = new FileReader()
        reader.onload = (ev) => setPastedImage(ev.target?.result as string)
        reader.readAsDataURL(file)
        return
      }
    }
  }

  const handleSend = () => {
    const trimmed = value.trim()
    if ((!trimmed && !pastedImage) || disabled) return
    onSend(trimmed || 'What is in this image?', pastedImage ?? undefined)
    setValue('')
    setPastedImage(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const canSend = (value.trim() || pastedImage) && !disabled && !streaming

  const modeLabel = mode === 'chat' ? 'CHAT' : mode === 'code' ? 'CODE' : 'IMAGE'

  return (
    <div className="composer-wrap">
      <div className="composer-frame">
        {/* Head */}
        <div className="composer-head">
          <span className="composer-pill">{modeLabel}</span>
          {modelLabel && <span className="composer-pill">{modelLabel}</span>}
          {pastedImage && (
            <span className="composer-pill" style={{ color: 'var(--accent2)', borderColor: 'rgba(255,212,122,.3)' }}>
              Image attached
            </span>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '9px', letterSpacing: '.1em', color: 'var(--ink-faint)' }}>
            ENTER to send · SHIFT+ENTER newline
          </span>
        </div>

        {/* Pasted image preview */}
        {pastedImage && (
          <div style={{ padding: '8px 14px 0', position: 'relative', display: 'inline-block' }}>
            <img src={pastedImage} alt="pasted" style={{ height: '72px', borderRadius: 'var(--r)', objectFit: 'cover', border: '.5px solid var(--line)' }} />
            <button
              onClick={() => setPastedImage(null)}
              style={{ position: 'absolute', top: '4px', right: '10px', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--surface2)', border: '.5px solid var(--line)', color: 'var(--ink-dim)', cursor: 'pointer', fontSize: '10px', display: 'grid', placeItems: 'center', fontFamily: 'var(--mono)' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Input */}
        <textarea
          ref={textareaRef}
          className="composer-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          onPaste={handlePaste}
          placeholder={placeholder ?? 'Transmit a message…'}
          disabled={disabled || streaming}
          rows={1}
        />

        {/* Foot */}
        <div className="composer-foot">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', color: 'var(--ink-faint)', textTransform: 'uppercase' }}>
            CTRL+V to paste image
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {streaming ? (
              <button className="stop-btn" onClick={onStop}>
                ■ Stop
              </button>
            ) : (
              <button className="send-btn" onClick={handleSend} disabled={!canSend}>
                Transmit →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
