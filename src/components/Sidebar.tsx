import { useState } from 'react'
import { useAppStore, type Conversation, type Mode } from '@/store/appStore'
import { formatDate } from '@/lib/utils'

const MODE_GLYPH: Record<Mode, string> = { chat: 'C', code: '{ }', image: '⬡' }

interface Props {
  onNewChat: () => void
  onSelectConversation: (c: Conversation) => void
  onDeleteConversation: (id: string) => void
}

export default function LeftRail({ onNewChat, onSelectConversation, onDeleteConversation }: Props) {
  const { conversations, activeConversationId } = useAppStore()
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? conversations.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()))
    : conversations

  return (
    <aside className="rail-left">
      <div className="rail-section">
        <span>Sessions</span>
        <span className="num">{conversations.length}</span>
      </div>

      <button className="new-btn" onClick={onNewChat}>
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <line x1="5.5" y1="0" x2="5.5" y2="11" stroke="currentColor" strokeWidth="1"/>
          <line x1="0" y1="5.5" x2="11" y2="5.5" stroke="currentColor" strokeWidth="1"/>
        </svg>
        New session
      </button>

      <div className="search-wrap">
        <input
          className="search-input"
          type="search"
          placeholder="Search sessions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="session-list">
        {filtered.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--ink-faint)', fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '.14em', textTransform: 'uppercase' }}>
            {query ? 'No matches' : 'No sessions'}
          </div>
        )}
        {filtered.map((conv) => (
          <div
            key={conv.id}
            className={`session-item ${activeConversationId === conv.id ? 'active' : ''}`}
            onClick={() => onSelectConversation(conv)}
          >
            <div className={`session-glyph ${conv.mode}`}>
              {MODE_GLYPH[conv.mode]}
            </div>
            <div className="session-info">
              <div className="session-title">{conv.title}</div>
              <div className="session-meta">{formatDate(conv.updated_at)}</div>
            </div>
            <button
              className="session-del"
              onClick={(e) => { e.stopPropagation(); onDeleteConversation(conv.id) }}
              title="Delete"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
