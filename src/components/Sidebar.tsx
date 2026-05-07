import { useState, useRef } from 'react'
import { useAppStore, type Conversation, type Mode, MIXING_MODELS, isBlendMode } from '@/store/appStore'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { exportConversation } from '@/lib/exportConversation'
import { formatDate } from '@/lib/utils'
import ContextMenu from './ContextMenu'

const MODE_GLYPH: Record<string, string> = { chat: 'C', code: '{ }', image: '⬡' }

const PROVIDER_ORDER = ['META', 'MISTRAL', 'GOOGLE', 'MICROSOFT', 'QWEN', 'DEEPSEEK', 'NVIDIA', 'COHERE', 'IBM']

interface Props {
  onNewChat: () => void
  onSelectConversation: (c: Conversation) => void
  onDeleteConversation: (id: string) => void
  onDuplicateConversation: (conv: Conversation) => void
  onClearConversation: (id: string) => void
}

export default function Sidebar({ onNewChat, onSelectConversation, onDeleteConversation, onDuplicateConversation, onClearConversation }: Props) {
  const { conversations, activeConversationId, selectedModels, toggleModel, setSelectedModels, mode, setMode, messages, updateConversationTitle, pinConversation, addToast } = useAppStore()
  const authFetch = useAuthFetch()
  const [query, setQuery] = useState('')
  const [modelQuery, setModelQuery] = useState('')
  const [ctxMenu, setCtxMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  const blend = isBlendMode(selectedModels)

  const filteredModels = modelQuery.trim()
    ? MIXING_MODELS.filter(m =>
        m.label.toLowerCase().includes(modelQuery.toLowerCase()) ||
        m.provider.toLowerCase().includes(modelQuery.toLowerCase())
      )
    : MIXING_MODELS

  const providerGroups = PROVIDER_ORDER
    .map(p => ({ provider: p, models: filteredModels.filter(m => m.provider === p), total: MIXING_MODELS.filter(m => m.provider === p).length }))
    .filter(g => g.models.length > 0)

  const filtered = query.trim()
    ? conversations.filter(c => c.title.toLowerCase().includes(query.toLowerCase()))
    : conversations

  const handlePin = async (conv: Conversation) => {
    const newPinned = !conv.pinned
    pinConversation(conv.id, newPinned)
    try {
      await authFetch(`/api/conversations/${conv.id}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: newPinned }),
      })
    } catch { addToast({ kind: 'error', message: 'PIN FAILED' }) }
  }

  const commitRename = async (id: string, value: string) => {
    const trimmed = value.trim()
    if (!trimmed) { setRenamingId(null); return }
    updateConversationTitle(id, trimmed)
    setRenamingId(null)
    try {
      await authFetch(`/api/conversations/${id}/title`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      })
    } catch {}
  }

  const openCtx = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    setCtxMenu({ id, x: e.clientX, y: e.clientY })
  }

  const ctxConv = ctxMenu ? conversations.find(c => c.id === ctxMenu.id) : null

  return (
    <aside className="rail-left">
      {/* Mode tabs */}
      <div className="mode-tabs">
        {([['chat', 'CHAT'], ['code', 'CODE'], ['image', 'IMAGE']] as [Mode, string][]).map(([id, label]) => (
          <button key={id} className={`mode-tab ${mode === id ? 'active' : ''}`} onClick={() => setMode(id)}>
            {label}
          </button>
        ))}
      </div>

      {/* Models section — visible for chat/code only */}
      <div className="sidebar-models-section">
      {mode !== 'image' && (
        <>
          <div className="console-header">
            <h2>Models</h2>
            {blend && (
              <span className="engine-count" style={{ color: 'var(--ok)' }}>BLEND ×{selectedModels.length}</span>
            )}
            {selectedModels.length > 0 && (
              <button className="clear-sel-btn" onClick={() => setSelectedModels([])}>✕ Clear</button>
            )}
          </div>

          <div className="model-search-wrap">
            <input
              className="model-search-input"
              type="search"
              placeholder="Search models…"
              value={modelQuery}
              onChange={e => setModelQuery(e.target.value)}
            />
          </div>

          <div className="model-list">
            {filteredModels.length === 0 && (
              <div style={{ padding: '20px 14px', fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--ink-faint)', textAlign: 'center', letterSpacing: '.12em' }}>
                No models match
              </div>
            )}
            {providerGroups.map(({ provider, models, total }) => (
              <div key={provider}>
                {total > 1 && (
                  <div className="provider-group-header">
                    <span className="provider-dot" style={{ background: models[0].color }} />
                    <span>{provider}</span>
                    <span className="provider-count">{models.length}</span>
                  </div>
                )}
                {models.map(model => {
                  const selected = selectedModels.includes(model.id)
                  return (
                    <div
                      key={model.id}
                      className={`model-card ${selected ? 'selected' : ''}`}
                      onClick={() => toggleModel(model.id)}
                    >
                      <div className="model-card-avatar" style={{
                        background: model.color + '22',
                        border: `1.5px solid ${selected ? model.color : model.color + '44'}`,
                      }}>
                        <span style={{ color: model.color, fontWeight: 700, fontSize: '11px' }}>{model.initial}</span>
                      </div>
                      <div className="model-card-info">
                        <div className="model-card-name">{model.label}</div>
                        <div className="model-card-meta">{model.context} · {model.speed}</div>
                      </div>
                      <div className="model-card-check" style={{ borderColor: selected ? model.color : undefined }}>
                        {selected && (
                          <span style={{ color: model.color, fontSize: '9px', fontWeight: 700 }}>
                            {blend ? selectedModels.indexOf(model.id) + 1 : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
            {blend && (
              <div style={{ padding: '6px 14px 8px', fontFamily: 'var(--mono)', fontSize: '8.5px', letterSpacing: '.12em', color: 'var(--ok)', textTransform: 'uppercase', opacity: .8 }}>
                ⚡ Blend active — {selectedModels.length} models collaborate
              </div>
            )}
          </div>
        </>
      )}

      {/* Image mode hint */}
      {mode === 'image' && (
        <div style={{ padding: '12px 14px', fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--ink-faint)', letterSpacing: '.12em', lineHeight: 1.6 }}>
          <div style={{ color: 'var(--ink-dim)', fontWeight: 700, marginBottom: '6px' }}>IMAGE MODELS</div>
          <div>Select model + size in the right panel. FLUX.1 Schnell (fast) and FLUX.1 Dev (HD) via NVIDIA NIM.</div>
        </div>
      )}
      </div>{/* /sidebar-models-section */}

      {/* Sessions */}
      <div className="sidebar-sessions-section">
      <div className="console-header">
        <h2>Sessions</h2>
        <span className="engine-count">{conversations.length}</span>
      </div>

      <button className="new-session-btn" onClick={onNewChat}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="1.2"/>
          <line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
        New session
      </button>

      <div className="search-wrap">
        <input
          id="session-search"
          className="search-input"
          type="search"
          placeholder="Search sessions…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div className="session-list">
        {filtered.length === 0 && (
          <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--ink-faint)', fontFamily: 'var(--mono)', fontSize: '9.5px', letterSpacing: '.14em', textTransform: 'uppercase' }}>
            {query ? 'No matches' : 'No sessions yet'}
          </div>
        )}
        {filtered.map(conv => (
          <div
            key={conv.id}
            className={`session-item ${activeConversationId === conv.id ? 'active' : ''} ${conv.pinned ? 'pinned' : ''}`}
            onClick={() => renamingId !== conv.id && onSelectConversation(conv)}
            onContextMenu={e => openCtx(e, conv.id)}
          >
            <div className={`session-glyph ${conv.mode}`}>{MODE_GLYPH[conv.mode]}</div>
            {conv.pinned && <span className="session-pin-icon" title="Pinned">📌</span>}
            <div className="session-info">
              {renamingId === conv.id ? (
                <input
                  ref={renameInputRef}
                  className="session-rename-input"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitRename(conv.id, renameValue)
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  onBlur={() => commitRename(conv.id, renameValue)}
                  onClick={e => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <div className="session-title">{conv.title}</div>
              )}
              <div className="session-meta">
                {formatDate(conv.updated_at)}
                {messages[conv.id] !== undefined && (
                  <span className="session-msg-count"> · {messages[conv.id].length} msgs</span>
                )}
              </div>
            </div>
            <button
              className="session-del"
              onClick={e => { e.stopPropagation(); onDeleteConversation(conv.id) }}
              title="Delete"
            >✕</button>
          </div>
        ))}
      </div>

      </div>{/* /sidebar-sessions-section */}

      {ctxMenu && ctxConv && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
          items={[
            {
              label: ctxConv.pinned ? 'Unpin' : 'Pin',
              onSelect: () => {
                handlePin(ctxConv)
                setCtxMenu(null)
              },
            },
            {
              label: 'Rename',
              shortcut: 'F2',
              onSelect: () => {
                setRenamingId(ctxConv.id)
                setRenameValue(ctxConv.title)
                setCtxMenu(null)
              },
            },
            {
              label: 'Duplicate',
              onSelect: () => {
                onDuplicateConversation(ctxConv)
                setCtxMenu(null)
              },
            },
            {
              label: 'Export as Markdown',
              shortcut: 'Ctrl+E',
              onSelect: () => {
                exportConversation(ctxConv.id, conversations, messages)
                setCtxMenu(null)
              },
            },
            { label: '', separator: true, onSelect: () => {} },
            {
              label: 'Clear History',
              onSelect: () => {
                onClearConversation(ctxConv.id)
                setCtxMenu(null)
              },
            },
            {
              label: 'Delete',
              danger: true,
              onSelect: () => {
                onDeleteConversation(ctxConv.id)
                setCtxMenu(null)
              },
            },
          ]}
        />
      )}
    </aside>
  )
}
