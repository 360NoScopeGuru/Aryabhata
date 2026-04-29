import { useState } from 'react'
import { useAppStore, type Conversation, MIXING_MODELS, type RoutingMode } from '@/store/appStore'
import { formatDate } from '@/lib/utils'

const ROUTING_MODES: { id: RoutingMode; label: string; desc: string }[] = [
  { id: 'blend',   label: 'Blend',   desc: 'Weighted average'  },
  { id: 'cascade', label: 'Cascade', desc: 'Fallback chain'    },
  { id: 'moe',     label: 'MoE',     desc: 'Mixture of experts'},
  { id: 'boss',    label: 'Boss',    desc: 'Lead + assistants' },
]

const MODE_GLYPH: Record<string, string> = { chat: 'C', code: '{ }', image: '⬡' }

interface Props {
  onNewChat: () => void
  onSelectConversation: (c: Conversation) => void
  onDeleteConversation: (id: string) => void
}

export default function Sidebar({ onNewChat, onSelectConversation, onDeleteConversation }: Props) {
  const { mode, conversations, activeConversationId, modelWeights, setModelWeight, routingMode, setRoutingMode } = useAppStore()
  const [query, setQuery] = useState('')

  const modelsToShow = mode === 'image' ? [] : MIXING_MODELS.filter(m => m.modes.includes(mode as 'chat' | 'code'))

  const filtered = query.trim()
    ? conversations.filter(c => c.title.toLowerCase().includes(query.toLowerCase()))
    : conversations

  return (
    <aside className="rail-left">
      {/* Mixing console — only for chat/code */}
      {modelsToShow.length > 0 && (
        <>
          <div className="console-header">
            <h2>Engine Mix</h2>
            <span className="engine-count">{mode.toUpperCase()}</span>
          </div>

          <div className="engine-list">
            {modelsToShow.map(model => {
              const weight = modelWeights[model.id] ?? 0
              const isActive = weight > 0
              return (
                <div key={model.id} className="engine-row">
                  <div className="engine-top">
                    <div
                      className="engine-avatar"
                      style={{ background: model.color + '22', border: `1.5px solid ${model.color}55` }}
                    >
                      <span style={{ color: model.color, fontSize: '12px', fontWeight: 700 }}>{model.initial}</span>
                    </div>
                    <div className="engine-info">
                      <div className="engine-name">{model.label}</div>
                      <div className="engine-meta">{model.provider} · {model.context} · {model.speed}</div>
                    </div>
                    <div className={`engine-pct ${isActive ? 'active' : ''}`}>
                      {weight}
                    </div>
                  </div>
                  <div className="engine-slider-row">
                    <input
                      type="range"
                      className="engine-slider"
                      min={0} max={100} step={1}
                      value={weight}
                      onChange={e => setModelWeight(model.id, Number(e.target.value))}
                      style={isActive ? { '--accent': model.color } as React.CSSProperties : undefined}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="routing-block">
            <div className="routing-label">Routing Mode</div>
            {ROUTING_MODES.map(r => (
              <div
                key={r.id}
                className={`routing-option ${routingMode === r.id ? 'active' : ''}`}
                onClick={() => setRoutingMode(r.id)}
              >
                <div className={`routing-dot ${routingMode === r.id ? 'filled' : ''}`} />
                <span>{r.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: '8px', opacity: .5 }}>{r.desc}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Sessions */}
      <div className="console-header" style={{ marginTop: modelsToShow.length === 0 ? 0 : undefined }}>
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
