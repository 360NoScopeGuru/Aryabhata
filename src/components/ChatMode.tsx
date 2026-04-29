import { useEffect, useRef, useState } from 'react'
import { useAppStore, type Message, CHAT_MODELS } from '@/store/appStore'
import { useStream } from '@/hooks/useStream'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import { v4 as uuid } from 'uuid'

interface Props { conversationId: string }

export default function ChatMode({ conversationId }: Props) {
  const {
    messages, addMessage, appendToLastMessage, setMessages,
    selectedChatModel, autoRoute, setMode, updateConversationTitle, addSessionTokens,
  } = useAppStore()
  const { stream, stop, streaming } = useStream()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [isThinking, setIsThinking] = useState(false)
  const namedRef = useRef(false)
  const convMessages = messages[conversationId] ?? []

  useEffect(() => {
    fetch(`/api/conversations/${conversationId}/messages`)
      .then((r) => r.json())
      .then((msgs) => {
        setMessages(conversationId, msgs)
        if (msgs.length > 0) namedRef.current = true
      })
      .catch(() => {})
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [convMessages.length, streaming])

  const tryAutoName = async (firstUserMessage: string) => {
    if (namedRef.current) return
    namedRef.current = true
    try {
      const res = await fetch('/api/chat/name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, first_message: firstUserMessage }),
      })
      const data = await res.json()
      if (data.title) updateConversationTitle(conversationId, data.title)
    } catch {}
  }

  const handleSend = async (text: string, imageBase64?: string) => {
    if (autoRoute) {
      try {
        const res = await fetch('/api/route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: text }),
        })
        const data = await res.json()
        if (data.mode && data.mode !== 'chat') { setMode(data.mode); return }
      } catch {}
    }

    const content = imageBase64 ? `${text}\n\n![pasted image](${imageBase64})` : text
    addSessionTokens(Math.ceil(content.length / 4))

    const userMsg: Message = {
      id: uuid(), conversation_id: conversationId, role: 'user',
      content, mode: 'chat', model: selectedChatModel,
      created_at: new Date().toISOString(),
    }
    addMessage(userMsg)

    const asstMsg: Message = {
      id: uuid(), conversation_id: conversationId, role: 'assistant',
      content: '', mode: 'chat', model: selectedChatModel,
      created_at: new Date().toISOString(),
    }
    addMessage(asstMsg)
    setIsThinking(true)

    const isFirst = convMessages.length === 0
    const allMsgs = [...convMessages, userMsg].map((m) => ({ role: m.role, content: m.content }))

    await stream(
      '/api/chat/stream',
      { conversation_id: conversationId, messages: allMsgs, model: selectedChatModel },
      {
        onDelta: (delta) => {
          setIsThinking(false)
          appendToLastMessage(conversationId, delta)
          addSessionTokens(Math.ceil(delta.length / 4))
        },
        onDone: () => {
          setIsThinking(false)
          if (isFirst) tryAutoName(text)
        },
        onError: () => setIsThinking(false),
      }
    )
  }

  const modelLabel = CHAT_MODELS.find((m) => m.id === selectedChatModel)?.label ?? selectedChatModel

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Thread head */}
      <div className="center-head">
        <span>Thread</span>
        <span style={{ color: 'var(--ink-faint)', fontSize: '9px' }}>
          {convMessages.filter((m) => m.role === 'user').length} turns
        </span>
      </div>

      {/* Messages */}
      <div className="thread">
        {convMessages.length === 0 && (
          <div className="empty-state">
            <div className="orbital-icon">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="28" stroke="rgba(122,215,255,.2)" strokeWidth="0.75"/>
                <circle cx="32" cy="32" r="18" stroke="rgba(122,215,255,.4)" strokeWidth="0.75"/>
                <circle cx="32" cy="32" r="8" stroke="#7ad7ff" strokeWidth="0.75"/>
                <circle cx="32" cy="32" r="3" fill="#7ad7ff"/>
                <line x1="0" y1="32" x2="11" y2="32" stroke="#7ad7ff" strokeWidth="0.75" opacity="0.5"/>
                <line x1="53" y1="32" x2="64" y2="32" stroke="#7ad7ff" strokeWidth="0.75" opacity="0.5"/>
                <line x1="32" y1="0" x2="32" y2="11" stroke="#7ad7ff" strokeWidth="0.75" opacity="0.5"/>
                <line x1="32" y1="53" x2="32" y2="64" stroke="#7ad7ff" strokeWidth="0.75" opacity="0.5"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', letterSpacing: '.14em', color: 'var(--ink)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Aryabhata
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '9.5px', letterSpacing: '.2em', color: 'var(--ink-dim)', textTransform: 'uppercase' }}>
                Chat · {modelLabel}
              </div>
            </div>
          </div>
        )}

        {convMessages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isStreaming={streaming && i === convMessages.length - 1 && msg.role === 'assistant'}
          />
        ))}

        {isThinking && (
          <div className="msg fade-up">
            <div className="msg-gutter">
              <span className="who">ASST</span>
            </div>
            <div className="msg-body" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px' }}>
              <div className="think-dots">
                <div className="think-dot" />
                <div className="think-dot" />
                <div className="think-dot" />
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '9.5px', letterSpacing: '.14em', color: 'var(--ink-faint)', textTransform: 'uppercase' }}>
                Processing
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <ChatInput
        onSend={handleSend}
        onStop={stop}
        streaming={streaming}
        placeholder="Transmit a message…"
        modelLabel={modelLabel}
      />
    </div>
  )
}
