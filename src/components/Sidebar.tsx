import { useState } from 'react'
import { useAppStore, type Conversation, MIXING_MODELS, isBlendMode } from '@/store/appStore'
import { formatDate } from '@/lib/utils'

const MODE_GLYPH: Record<string, string> = { chat: 'C', code: '{ }', image: '⬡' }

interface Props {
  onNewChat: () => void
  onSelectConversation: (c: Conversation) => void
  onDeleteConversation: (id: string) => void
}

export default function Sidebar({ onNewChat, onSelectConversation, onDeleteConversation }: Props) {
  const { conversations, activeConversationId, selectedModels, toggleModel, mode } = useAppStore()
  const [query, setQuery] = useState('')

  const blend = isBlendMode(selectedModels)

  const filtered = query.trim()
    ? conversations.filter(c => c.title.toLowerCase().includes(query.toLowerCase()))
    : conversations

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
            onClick={() => onSelectConversation(conv)}
          >
            <div className={`session-glyph ${conv.mode}`}>{MODE_GLYPH[conv.mode]}</div>
            <div className="session-info">
              <div className="session-title">{conv.title}</div>
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
    </aside>
  )
}
