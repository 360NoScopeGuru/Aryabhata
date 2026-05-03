import { useEffect, useCallback } from 'react'
import { useAppStore, type Conversation } from '@/store/appStore'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import TopBar from '@/components/TopBar'
import Sidebar from '@/components/Sidebar'
import RightRail from '@/components/RightRail'
import ChatMode from '@/components/ChatMode'
import CodeMode from '@/components/CodeMode'
import ImageMode from '@/components/ImageMode'
import StatusBar from '@/components/StatusBar'
import { v4 as uuid } from 'uuid'

const MODE_LABELS: Record<string, string> = {
  chat: 'New Chat',
  code: 'New Code Session',
  image: 'New Image Session',
}

const RegMark = ({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) => {
  const style: React.CSSProperties = {
    position: 'absolute',
    width: 14,
    height: 14,
    zIndex: 20,
    opacity: 0.2,
    pointerEvents: 'none',
    ...(pos === 'tl' && { top: 8, left: 8 }),
    ...(pos === 'tr' && { top: 8, right: 8 }),
    ...(pos === 'bl' && { bottom: 8, left: 8 }),
    ...(pos === 'br' && { bottom: 8, right: 8 }),
  }
  const lines = {
    tl: 'M14,0 L0,0 L0,14',
    tr: 'M0,0 L14,0 L14,14',
    bl: 'M0,0 L0,14 L14,14',
    br: 'M14,0 L14,14 L0,14',
  }
  return (
    <div style={style}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d={lines[pos]} stroke="#7ad7ff" strokeWidth="0.75"/>
        <circle cx="7" cy="7" r="1.5" fill="#7ad7ff"/>
      </svg>
    </div>
  )
}

export default function App() {
  const { mode, setMode, activeConversationId, setActiveConversation, addConversation, removeConversation, setConversations, theme, conversations, messages } = useAppStore()
  const authFetch = useAuthFetch()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    authFetch('/api/conversations')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => Array.isArray(data) && setConversations(data))
      .catch(() => {})
  }, [authFetch])

  const handleNewChat = useCallback(async () => {
    const title = MODE_LABELS[mode]
    try {
      const res = await authFetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, mode }),
      })
      const conv: Conversation = await res.json()
      addConversation(conv)
      setActiveConversation(conv.id)
    } catch {
      const conv: Conversation = {
        id: uuid(), title, mode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      addConversation(conv)
      setActiveConversation(conv.id)
    }
  }, [mode, authFetch])

  const handleSelectConversation = useCallback((c: Conversation) => {
    setActiveConversation(c.id)
    setMode(c.mode)
  }, [setMode])

  const handleDeleteConversation = useCallback(async (id: string) => {
    try { await authFetch(`/api/conversations/${id}`, { method: 'DELETE' }) } catch {}
    removeConversation(id)
  }, [authFetch])

  const exportConversation = useCallback(() => {
    if (!activeConversationId) return
    const conv = conversations.find(c => c.id === activeConversationId)
    const msgs = messages[activeConversationId] ?? []
    if (!conv || msgs.length === 0) return
    const lines = [`# ${conv.title}\n`]
    msgs.forEach(m => {
      const role = m.role === 'user' ? '**You**' : `**Assistant** (${m.model ?? 'AI'})`
      lines.push(`${role}\n\n${m.content}\n\n---\n`)
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${conv.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [activeConversationId, conversations, messages])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') { e.preventDefault(); handleNewChat() }
      if (e.ctrlKey && e.key === 'e') { e.preventDefault(); exportConversation() }
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        const el = document.getElementById('session-search') as HTMLInputElement | null
        el?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleNewChat, exportConversation])

  const convId = activeConversationId

  return (
    <div className="app-grid">
      {/* Registration marks */}
      <RegMark pos="tl" />
      <RegMark pos="tr" />
      <RegMark pos="bl" />
      <RegMark pos="br" />

      <TopBar />

      <Sidebar
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      {/* Center */}
      <main style={{ gridArea: 'center', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, borderLeft: '.5px solid var(--line-soft)', borderRight: '.5px solid var(--line-soft)' }}>
        {!convId ? (
          <div className="empty-state" style={{ height: '100%' }}>
            <div>
              <svg width="72" height="72" viewBox="0 0 72 72" fill="none" style={{ margin: '0 auto 16px', display: 'block' }}>
                <circle cx="36" cy="36" r="32" stroke="rgba(122,215,255,.15)" strokeWidth="0.75"/>
                <circle cx="36" cy="36" r="22" stroke="rgba(122,215,255,.3)" strokeWidth="0.75"/>
                <circle cx="36" cy="36" r="12" stroke="#7ad7ff" strokeWidth="0.75"/>
                <circle cx="36" cy="36" r="4" fill="#7ad7ff"/>
                <line x1="0" y1="36" x2="13" y2="36" stroke="#7ad7ff" strokeWidth="0.75" opacity="0.4"/>
                <line x1="59" y1="36" x2="72" y2="36" stroke="#7ad7ff" strokeWidth="0.75" opacity="0.4"/>
                <line x1="36" y1="0" x2="36" y2="13" stroke="#7ad7ff" strokeWidth="0.75" opacity="0.4"/>
                <line x1="36" y1="59" x2="36" y2="72" stroke="#7ad7ff" strokeWidth="0.75" opacity="0.4"/>
              </svg>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '15px', letterSpacing: '.14em', color: 'var(--ink)', textTransform: 'uppercase', textAlign: 'center', marginBottom: '8px' }}>
                Aryabhata
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '9.5px', letterSpacing: '.24em', color: 'var(--ink-dim)', textTransform: 'uppercase', textAlign: 'center', marginBottom: '28px' }}>
                LLM · Instrument
              </div>
            </div>
            <button
              onClick={handleNewChat}
              className="send-btn"
              style={{ padding: '8px 24px', fontSize: '11px' }}
            >
              Initialize Session →
            </button>
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {mode === 'chat'  && <ChatMode  conversationId={convId} />}
            {mode === 'code'  && <CodeMode  conversationId={convId} />}
            {mode === 'image' && <ImageMode conversationId={convId} />}
          </div>
        )}
      </main>

      <RightRail />

      <StatusBar />
    </div>
  )
}
