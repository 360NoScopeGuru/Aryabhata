import { useEffect, useRef, useState } from 'react'
import { useAppStore, type Message, getActiveModel, MIXING_MODELS } from '@/store/appStore'
import { useStream } from '@/hooks/useStream'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import { v4 as uuid } from 'uuid'

interface Props { conversationId: string }

export default function ChatMode({ conversationId }: Props) {
  const {
    messages, addMessage, appendToLastMessage, setMessages,
    modelWeights, autoRoute, setMode, updateConversationTitle,
    addSessionTokens, updateLastMessageTelemetry, updateTelemetry, bumpThreadCount,
    temperature, topP, topK, frequencyPenalty, presencePenalty, maxTokens,
    telemetry,
  } = useAppStore()
  const { stream, stop, streaming } = useStream()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [isThinking, setIsThinking] = useState(false)
  const namedRef = useRef(false)
  const convMessages = messages[conversationId] ?? []
  const activeModelId = getActiveModel(modelWeights, 'chat')
  const activeModel = MIXING_MODELS.find(m => m.id === activeModelId)

  useEffect(() => {
    fetch(`/api/conversations/${conversationId}/messages`)
      .then(r => r.json())
      .then(msgs => {
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
    bumpThreadCount()

    const userMsg: Message = {
      id: uuid(), conversation_id: conversationId, role: 'user',
      content, mode: 'chat', model: activeModelId,
      created_at: new Date().toISOString(),
    }
    addMessage(userMsg)

    const asstMsg: Message = {
      id: uuid(), conversation_id: conversationId, role: 'assistant',
      content: '', mode: 'chat', model: activeModelId,
      created_at: new Date().toISOString(),
    }
    addMessage(asstMsg)
    setIsThinking(true)
    updateTelemetry({ streaming: true, tpot: 0, ttft: 0 })

    const isFirst = convMessages.length === 0
    const allMsgs = [...convMessages, userMsg].map(m => ({ role: m.role, content: m.content }))

    const startTime = Date.now()
    let ttftMs = 0
    const prevSpark = telemetry.spark

    await stream(
      '/api/chat/stream',
      {
        conversation_id: conversationId,
        messages: allMsgs,
        model: activeModelId,
        temperature, top_p: topP, top_k: topK,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        max_tokens: maxTokens,
      },
      {
        onFirstToken: (ms) => {
          ttftMs = ms
          setIsThinking(false)
          updateTelemetry({ ttft: ms, streaming: true })
        },
        onDelta: (delta) => {
          setIsThinking(false)
          appendToLastMessage(conversationId, delta)
          addSessionTokens(Math.ceil(delta.length / 4))
        },
        onDone: (_id, outputTokens) => {
          const latencyMs = Date.now() - startTime
          const tokenCount = outputTokens ?? 0
          const genMs = Math.max(1, latencyMs - ttftMs)
          const tps = tokenCount > 0 ? (tokenCount / genMs) * 1000 : 0
          const newSpark = [...prevSpark.slice(1), Math.min(100, tps)]

          updateTelemetry({
            streaming: false, ttft: ttftMs, tpot: tps,
            outputTokens: tokenCount, spark: newSpark,
          })
          updateLastMessageTelemetry(conversationId, {
            ttft: ttftMs, tpot: tps, latency: latencyMs,
            outputTokens: tokenCount, finishReason: 'stop',
          })
          setIsThinking(false)
          if (isFirst) tryAutoName(text)
        },
        onError: () => {
          setIsThinking(false)
          updateTelemetry({ streaming: false })
        },
      }
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="center-head">
        <span>Thread</span>
        <span style={{ color: 'var(--ink-faint)', fontSize: '9px' }}>
          {convMessages.filter(m => m.role === 'user').length} turns
        </span>
      </div>

      <div className="thread">
        {convMessages.length === 0 && (
          <div className="empty-state">
            <div>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ display: 'block', margin: '0 auto 16px' }}>
                <circle cx="32" cy="32" r="28" stroke="var(--accent)" strokeWidth="0.75" opacity="0.15"/>
                <circle cx="32" cy="32" r="18" stroke="var(--accent)" strokeWidth="0.75" opacity="0.35"/>
                <circle cx="32" cy="32" r="8" stroke="var(--accent)" strokeWidth="0.75"/>
                <circle cx="32" cy="32" r="3" fill="var(--accent)"/>
                <line x1="0" y1="32" x2="11" y2="32" stroke="var(--accent)" strokeWidth="0.75" opacity="0.5"/>
                <line x1="53" y1="32" x2="64" y2="32" stroke="var(--accent)" strokeWidth="0.75" opacity="0.5"/>
                <line x1="32" y1="0" x2="32" y2="11" stroke="var(--accent)" strokeWidth="0.75" opacity="0.5"/>
                <line x1="32" y1="53" x2="32" y2="64" stroke="var(--accent)" strokeWidth="0.75" opacity="0.5"/>
              </svg>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '13px', letterSpacing: '.14em', color: 'var(--ink)', textTransform: 'uppercase', textAlign: 'center', marginBottom: '6px' }}>
                Aryabhata
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: '9.5px', letterSpacing: '.2em', color: 'var(--ink-dim)', textTransform: 'uppercase', textAlign: 'center' }}>
                Chat · {activeModel?.label ?? activeModelId}
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
            <div className="msg-who"><span className="who-label">ASST</span></div>
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
      />
    </div>
  )
}
