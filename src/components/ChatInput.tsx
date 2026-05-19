import { useRef, useEffect, useState, type KeyboardEvent, type ClipboardEvent } from 'react'
import { useAppStore, MIXING_MODELS, getActiveModel, isBlendMode } from '@/store/appStore'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { useVoice } from '@/hooks/useVoice'
import { findSlashMatches, applySlashCommand, type SlashCommand } from '@/lib/slashCommands'
import SlashMenu from './SlashMenu'
import { v4 as uuid } from 'uuid'

interface Props {
  onSend: (text: string, imageBase64?: string) => void
  onStop?: () => void
  streaming?: boolean
  placeholder?: string
  disabled?: boolean
  onSlashAction?: (key: string) => void
}

const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
  py: 'python', rs: 'rust', go: 'go', java: 'java', cpp: 'cpp', c: 'c',
  cs: 'csharp', rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin',
  json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml', xml: 'xml',
  html: 'html', css: 'css', scss: 'scss', sh: 'bash', bash: 'bash',
  md: 'markdown', txt: '', csv: 'text', sql: 'sql',
}

const MAX_FILE_BYTES = 100 * 1024  // 100 KB

interface AttachedFile {
  name: string
  content: string
  lang: string
}

export default function ChatInput({ onSend, onStop, streaming, placeholder, disabled, onSlashAction }: Props) {
  const [value, setValue] = useState('')
  const [pastedImage, setPastedImage] = useState<string | null>(null)
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [promptsOpen, setPromptsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveTitle, setSaveTitle] = useState('')
  const [enhancing, setEnhancing] = useState(false)
  const [preEnhanceValue, setPreEnhanceValue] = useState<string | null>(null)
  const [slashIdx, setSlashIdx] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { mode, selectedModels, savedPrompts, addPrompt, removePrompt, addToast } = useAppStore()
  const authFetch = useAuthFetch()
  const voice = useVoice()
  const lastValueBeforeVoiceRef = useRef('')

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px'
  }, [value])

  // Close prompt library on outside click
  useEffect(() => {
    if (!promptsOpen) return
    const handler = (e: MouseEvent) => {
      const el = document.getElementById('prompt-library-popover')
      if (el && !el.contains(e.target as Node)) setPromptsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [promptsOpen])

  // Voice transcript pipeline — append finalized chunks to the textarea
  useEffect(() => {
    voice.onFinal((text: string) => {
      setValue(prev => {
        const sep = prev && !prev.endsWith(' ') ? ' ' : ''
        return prev + sep + text
      })
    })
  }, [voice])

  // Slash command detection
  const slashActive = value.startsWith('/') && !value.includes('\n')
  const slashMatches = slashActive ? findSlashMatches(value) : []

  // Reset slash selection when query changes
  useEffect(() => { setSlashIdx(0) }, [value])

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Slash menu nav
    if (slashActive && slashMatches.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIdx(i => Math.min(i + 1, slashMatches.length - 1)); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSlashIdx(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Tab' || (e.key === 'Enter' && slashMatches.length > 0 && value.split(/\s+/).length === 1)) {
        // Tab or Enter (with no args) → autocomplete the trigger
        e.preventDefault()
        const cmd = slashMatches[slashIdx]
        if (cmd) setValue(cmd.trigger + ' ')
        return
      }
      if (e.key === 'Escape') { e.preventDefault(); setValue(''); return }
    }
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

  const pickSlash = (cmd: SlashCommand) => {
    const result = applySlashCommand(value, cmd)
    if (result.kind === 'action') {
      onSlashAction?.(result.actionKey ?? '')
      setValue('')
      addToast({ kind: 'info', message: `${cmd.label.toUpperCase()}` })
      return
    }
    if (result.kind === 'transform') {
      // Transform commands need user content. If only the trigger was typed,
      // just autocomplete and wait for user to type.
      const argsStart = value.indexOf(' ')
      const args = argsStart > -1 ? value.slice(argsStart + 1).trim() : ''
      if (!args) {
        setValue(cmd.trigger + ' ')
        textareaRef.current?.focus()
        return
      }
      onSend(result.payload)
      setValue('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      addToast({ kind: 'error', message: `FILE TOO LARGE · max 100 KB` })
      e.target.value = ''
      return
    }
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const lang = EXT_TO_LANG[ext] ?? ''
    const reader = new FileReader()
    reader.onload = ev => {
      setAttachedFile({ name: file.name, content: ev.target?.result as string, lang })
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleSend = () => {
    // If a slash transform command is fully typed, apply it
    if (slashActive && slashMatches.length > 0) {
      const exact = slashMatches.find(c => value.toLowerCase().startsWith(c.trigger + ' ') || value.toLowerCase() === c.trigger)
      if (exact) {
        pickSlash(exact)
        return
      }
    }
    const trimmed = value.trim()
    if ((!trimmed && !pastedImage && !attachedFile) || disabled) return
    let payload = trimmed
    if (attachedFile) {
      const fence = attachedFile.lang ? `\`\`\`${attachedFile.lang}` : '```'
      payload = `${attachedFile.name}:\n${fence}\n${attachedFile.content}\n\`\`\`${payload ? '\n\n' + payload : ''}`
    }
    onSend(payload || 'What is in this image?', pastedImage ?? undefined)
    setValue('')
    setPastedImage(null)
    setAttachedFile(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleEnhance = async () => {
    const trimmed = value.trim()
    if (!trimmed || enhancing) return
    setEnhancing(true)
    setPreEnhanceValue(trimmed)
    try {
      const res = await authFetch('/api/prompt/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      })
      const data = await res.json()
      if (data.enhanced && !data.error) {
        setValue(data.enhanced)
      } else {
        setPreEnhanceValue(null)
      }
    } catch {
      setPreEnhanceValue(null)
    } finally {
      setEnhancing(false)
    }
  }

  const handleSavePrompt = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    const title = saveTitle.trim() || trimmed.slice(0, 40)
    addPrompt({ id: uuid(), title, content: trimmed })
    setSaveTitle('')
    setSaving(false)
  }

  const toggleVoice = () => {
    if (voice.listening) {
      voice.stop()
    } else {
      lastValueBeforeVoiceRef.current = value
      voice.start()
    }
  }

  const noModel = mode !== 'image' && selectedModels.length === 0
  const canSend = (value.trim() || pastedImage || attachedFile) && !disabled && !streaming && !noModel
  const blend = isBlendMode(selectedModels)
  const activeModelId = mode !== 'image' ? getActiveModel(selectedModels) : null
  const activeModel = activeModelId && !noModel ? MIXING_MODELS.find(m => m.id === activeModelId) : null
  const estimatedTokens = Math.ceil(value.length / 4)

  return (
    <div className="composer-wrap">
      {slashActive && slashMatches.length > 0 && (
        <SlashMenu
          commands={slashMatches}
          activeIdx={slashIdx}
          onPick={pickSlash}
          onSetIdx={setSlashIdx}
        />
      )}
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
          {attachedFile && (
            <span className="composer-pill" style={{ color: 'var(--ok)', borderColor: 'rgba(0,255,65,.25)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              📎 {attachedFile.name}
              <button
                style={{ background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', padding: 0, fontSize: '10px', lineHeight: 1 }}
                onClick={() => setAttachedFile(null)}
              >✕</button>
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

          {value.trim().length > 10 && !streaming && (
            <button
              className={`composer-pill enhance-btn ${enhancing ? 'enhancing' : ''}`}
              onClick={handleEnhance}
              disabled={enhancing}
              title="Rewrite this prompt for better results"
            >
              {enhancing ? '…' : '✨ Enhance'}
            </button>
          )}
          {preEnhanceValue !== null && (
            <button
              className="composer-pill"
              style={{ color: 'var(--ink-faint)', fontSize: '9px' }}
              onClick={() => { setValue(preEnhanceValue); setPreEnhanceValue(null) }}
              title="Restore original prompt"
            >
              ↩ Undo
            </button>
          )}

          <span style={{ marginLeft: 'auto', fontSize: '9px', letterSpacing: '.1em', color: 'var(--ink-faint)' }}>
            {value.length > 0 && <span style={{ color: 'var(--ink-dim)', marginRight: '6px' }}>~{estimatedTokens} tok</span>}
            {slashActive ? '/ SLASH MODE' : 'ENTER · SHIFT+ENTER↵'}
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
          className={`composer-input ${voice.listening ? 'voice-listening' : ''}`}
          value={voice.listening && voice.interim ? value + (value && !value.endsWith(' ') ? ' ' : '') + voice.interim : value}
          onChange={e => !voice.listening && setValue(e.target.value)}
          onKeyDown={handleKey}
          onPaste={handlePaste}
          placeholder={
            noModel ? 'Select a model in the sidebar first…'
              : voice.listening ? '🎙 Listening…'
              : (placeholder ?? 'Transmit a message… (try /eli5, /critique, /summarize)')
          }
          disabled={disabled || streaming || noModel}
          rows={1}
        />

        <div className="composer-foot">
          <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.1em', color: 'var(--ink-faint)', textTransform: 'uppercase' }}>
            CTRL+V paste · "/" for commands
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.py,.js,.ts,.jsx,.tsx,.json,.csv,.yaml,.yml,.toml,.html,.css,.scss,.sh,.rs,.go,.java,.c,.cpp,.cs,.rb,.php,.swift,.kt,.sql,.xml"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <button
              className="mic-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={streaming || noModel}
              title="Attach a file (text / code, max 100 KB)"
            >📎</button>
            {voice.supported && (
              <button
                className={`mic-btn ${voice.listening ? 'listening' : ''}`}
                onClick={toggleVoice}
                disabled={streaming || noModel}
                title={voice.listening ? 'Stop voice input' : 'Voice input'}
              >
                {voice.listening ? '● REC' : '🎙'}
              </button>
            )}
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
