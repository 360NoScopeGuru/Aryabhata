import { useRef, useEffect, useState, type KeyboardEvent, type ClipboardEvent } from 'react'
import { useAppStore, MIXING_MODELS, getActiveModel } from '@/store/appStore'

interface Props {
  onSend: (text: string, imageBase64?: string) => void
  onStop?: () => void
  streaming?: boolean
  placeholder?: string
  disabled?: boolean
}

export default function ChatInput({ onSend, onStop, streaming, placeholder, disabled }: Props) {
  const [value, setValue] = useState('')
  const [pastedImage, setPastedImage] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { mode, modelWeights, routingMode } = useAppStore()

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

  const activeModelId = mode !== 'image' ? getActiveModel(modelWeights, mode as 'chat' | 'code') : null
  const activeModel = activeModelId ? MIXING_MODELS.find(m => m.id === activeModelId) : null

  return (
    <div className="composer-wrap">
      <div className="composer-frame">
        <div className="composer-head">
          <span className="composer-pill">{routingMode.toUpperCase()}</span>
          {activeModel && (
            <span className="composer-pill" style={{ borderColor: activeModel.color + '55' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: activeModel.color, display: 'inline-block', marginRight: '4px', verticalAlign: 'middle' }} />
              {activeModel.label}
            </span>
          )}
          {pastedImage && (
            <span className="composer-pill" style={{ color: 'var(--accent2)', borderColor: 'rgba(255,212,122,.3)' }}>
              Image attached
            </span>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '9px', letterSpacing: '.1em', color: 'var(--ink-faint)' }}>
            ENTER · SHIFT+ENTER↵
          </span>
        </div>

        {pastedImage && (
          <div style={{ padding: '8px 14px 0', position: 'relative', display: 'inline-block' }}>
            <img src={pastedImage} alt="pasted" style={{ height: '72px', borderRadius: 'var(--r)', objectFit: 'cover', border: '.5px solid var(--line)' }} />
            <button
              onClick={() => setPastedImage(null)}
              style={{ position: 'absolute', top: '4px', right: '10px', width: '18px', height: '18px', borderRadius: '50%', background: 'var(--surface2)', border: '.5px solid var(--line)', color: 'var(--ink-dim)', cursor: 'pointer', fontSize: '10px', display: 'grid', placeItems: 'center', fontFamily: 'var(--mono)' }}
            >✕</button>
          </div>
        )}

        <textarea
          ref={textareaRef}
          className="composer-input"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKey}
          onPaste={handlePaste}
          placeholder={placeholder ?? 'Transmit a message…'}
          disabled={disabled || streaming}
          rows={1}
        />

        <div className="composer-foot">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', color: 'var(--ink-faint)', textTransform: 'uppercase' }}>
            CTRL+V paste image
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {streaming ? (
              <button className="stop-btn" onClick={onStop}>■ Stop</button>
            ) : (
              <button className="send-btn" onClick={handleSend} disabled={!canSend}>
                TRANSMIT →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
