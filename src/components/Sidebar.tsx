import { useState, useRef } from 'react'
import { useAppStore, type Conversation, MIXING_MODELS, isBlendMode } from '@/store/appStore'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { exportConversation } from '@/lib/exportConversation'
import { formatDate } from '@/lib/utils'
import ContextMenu from './ContextMenu'

const MODE_GLYPH: Record<string, string> = { chat: 'C', code: '{ }', image: '⬡' }

interface Props {
  onNewChat: () => void
  onSelectConversation: (c: Conversation) => void
  onDeleteConversation: (id: string) => void
  onDuplicateConversation: (conv: Conversation) => void
  onClearConversation: (id: string) => void
}

export default function Sidebar({ onNewChat, onSelectConversation, onDeleteConversation, onDuplicateConversation, onClearConversation }: Props) {
  const { conversations, activeConversationId, selectedModels, toggleModel, setSelectedModels, mode, messages, updateConversationTitle } = useAppStore()
  const authFetch = useAuthFetch()
  const [query, setQuery] = useState('')
  const [ctxMenu, setCtxMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  const blend = isBlendMode(selectedModels)

  const filtered = query.trim()
    ? conversations.filter(c => c.title.toLowerCase().includes(query.toLowerCase()))
    : conversations

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
      {/* Models section — visible for chat/code only */}
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

          <div className="model-list">
            {MIXING_MODELS.map(model => {
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
                    <div className="model-card-meta">{model.provider} · {model.context} · {model.speed}</div>
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
            {blend && (
              <div style={{ padding: '6px 14px 8px', fontFamily: 'var(--mono)', fontSize: '8.5px', letterSpacing: '.12em', color: 'var(--ok)', textTransform: 'uppercase', opacity: .8 }}>
                ⚡ Blend active — {selectedModels.length} models collaborate
              </div>
            )}
          </div>
        </>
      )}

      {/* Sessions */}
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
            className={`session-item ${activeConversationId === conv.id ? 'active' : ''}`}
            onClick={() => renamingId !== conv.id && onSelectConversation(conv)}
            onContextMenu={e => openCtx(e, conv.id)}
          >
            <div className={`session-glyph ${conv.mode}`}>{MODE_GLYPH[conv.mode]}</div>
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
              <div className="session-meta">{formatDate(conv.updated_at)}</div>
            </div>
            <button
              className="session-del"
              onClick={e => { e.stopPropagation(); onDeleteConversation(conv.id) }}
              title="Delete"
            >✕</button>
          </div>
        ))}
      </div>

      {ctxMenu && ctxConv && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
          items={[
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
