import { useRef, useEffect, useState, type KeyboardEvent, type ClipboardEvent } from 'react'
import { useAppStore, MIXING_MODELS, getActiveModel, isBlendMode } from '@/store/appStore'
import { v4 as uuid } from 'uuid'

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
  const [promptsOpen, setPromptsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveTitle, setSaveTitle] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { mode, selectedModels, savedPrompts, addPrompt, removePrompt } = useAppStore()

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px'
  }, [value])

  useEffect(() => {
    if (!promptsOpen) return
    const handler = (e: MouseEvent) => {
      const el = document.getElementById('prompt-library-popover')
      if (el && !el.contains(e.target as Node)) setPromptsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [promptsOpen])

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

  const handleSavePrompt = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    const title = saveTitle.trim() || trimmed.slice(0, 40)
    addPrompt({ id: uuid(), title, content: trimmed })
    setSaveTitle('')
    setSaving(false)
  }

  const canSend = (value.trim() || pastedImage) && !disabled && !streaming
  const blend = isBlendMode(selectedModels)
  const activeModelId = mode !== 'image' ? getActiveModel(selectedModels) : null
  const activeModel = activeModelId ? MIXING_MODELS.find(m => m.id === activeModelId) : null
  const estimatedTokens = Math.ceil(value.length / 4)

  return (
    <div className="composer-wrap">
      <div className="composer-frame">
        <div className="composer-head">
          {blend ? (
            <span className="composer-pill accent">⚡ BLEND ×{selectedModels.length}</span>
          ) : (
            activeModel && (
              <span className="composer-pill" style={{ borderColor: activeModel.color + '55' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: activeModel.color, display: 'inline-block', marginRight: '4px', verticalAlign: 'middle' }} />
                {activeModel.label}
              </span>
            )
          )}
          {pastedImage && (
            <span className="composer-pill" style={{ color: 'var(--accent2)', borderColor: 'rgba(255,212,122,.3)' }}>
              Image attached
            </span>
          )}

          {/* Prompt library */}
          <div style={{ position: 'relative' }} id="prompt-library-popover">
            <button
              className="composer-pill"
              style={{ cursor: 'pointer' }}
              onClick={() => { setPromptsOpen(p => !p); setSaving(false) }}
              title="Prompt library"
            >
              ⌘ Prompts{savedPrompts.length > 0 ? ` (${savedPrompts.length})` : ''}
            </button>

            {promptsOpen && (
              <div className="prompt-library-popover">
                <div className="pl-header">
                  <span>Prompt Library</span>
                  {value.trim() && (
                    <button className="pl-save-btn" onClick={() => setSaving(s => !s)}>+ Save current</button>
                  )}
                </div>
                {saving && (
                  <div className="pl-save-row">
                    <input
                      className="pl-title-input"
                      placeholder="Title (optional)…"
                      value={saveTitle}
                      onChange={e => setSaveTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSavePrompt() }}
                      autoFocus
                    />
                    <button className="send-btn" style={{ fontSize: '9px', padding: '3px 10px' }} onClick={handleSavePrompt}>Save</button>
                  </div>
                )}
                {savedPrompts.length === 0 && !saving && (
                  <div className="pl-empty">No saved prompts yet</div>
                )}
                {savedPrompts.map(p => (
                  <div key={p.id} className="pl-item" onClick={() => { setValue(p.content); setPromptsOpen(false); textareaRef.current?.focus() }}>
                    <span className="pl-item-title">{p.title}</span>
                    <button className="pl-delete-btn" onClick={e => { e.stopPropagation(); removePrompt(p.id) }} title="Remove">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <span style={{ marginLeft: 'auto', fontSize: '9px', letterSpacing: '.1em', color: 'var(--ink-faint)' }}>
            {value.length > 0 && <span style={{ color: 'var(--ink-dim)', marginRight: '6px' }}>~{estimatedTokens} tok</span>}
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
          id="composer-textarea"
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
          <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', color: 'var(--ink-faint)', textTransform: 'uppercase' }}>
            CTRL+V paste image
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
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
