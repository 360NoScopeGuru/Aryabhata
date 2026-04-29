import { useEffect, useRef, useState } from 'react'
import { useAppStore, type Message, getActiveModel, isBlendMode, MIXING_MODELS } from '@/store/appStore'
import { useStream } from '@/hooks/useStream'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import { v4 as uuid } from 'uuid'

interface Props { conversationId: string }

export default function ChatMode({ conversationId }: Props) {
  const {
    messages, addMessage, appendToLastMessage, setMessages,
    selectedModels, autoRoute, setMode, updateConversationTitle,
    addSessionTokens, updateLastMessageTelemetry, updateTelemetry, bumpThreadCount,
    temperature, topP, topK, frequencyPenalty, presencePenalty, maxTokens,
    telemetry,
  } = useAppStore()
  const { stream, stop, streaming } = useStream()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [thinkingModel, setThinkingModel] = useState<string | null>(null)
  const namedRef = useRef(false)
  const convMessages = messages[conversationId] ?? []

  const blend = isBlendMode(selectedModels)
  const activeModelId = getActiveModel(selectedModels)
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
    if (autoRoute && !blend) {
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
      content, mode: 'chat', model: blend ? 'blend' : activeModelId,
      created_at: new Date().toISOString(),
    }
    addMessage(userMsg)

    const isFirst = convMessages.length === 0
    const allMsgs = [...convMessages, userMsg].map(m => ({ role: m.role, content: m.content }))

    updateTelemetry({ streaming: true, tpot: 0, ttft: 0 })
    const startTime = Date.now()
    let ttftMs = 0
    const prevSpark = telemetry.spark

    if (blend) {
      // ── BLEND MODE ─────────────────────────────────────────
      // Each model gets its own assistant message, added when it starts
      await stream(
        '/api/blend/stream',
        {
          conversation_id: conversationId,
          messages: allMsgs,
          models: selectedModels,
          temperature, top_p: topP, top_k: topK,
          max_tokens: maxTokens,
        },
        {
          onModelStart: (modelId) => {
            setThinkingModel(modelId)
            addMessage({
              id: uuid(), conversation_id: conversationId, role: 'assistant',
              content: '', mode: 'chat', model: modelId, blend: true,
              created_at: new Date().toISOString(),
            })
          },
          onFirstToken: (ms) => {
            ttftMs = ms
            setThinkingModel(null)
            updateTelemetry({ ttft: ms })
          },
          onDelta: (delta) => {
            setThinkingModel(null)
            appendToLastMessage(conversationId, delta)
            addSessionTokens(Math.ceil(delta.length / 4))
          },
          onModelDone: () => {
            setThinkingModel(null)
            updateLastMessageTelemetry(conversationId, { finishReason: 'stop' })
          },
          onDone: (_id, outputTokens) => {
            const latencyMs = Date.now() - startTime
            const tokenCount = outputTokens ?? 0
            const genMs = Math.max(1, latencyMs - ttftMs)
            const tps = tokenCount > 0 ? (tokenCount / genMs) * 1000 : 0
            updateTelemetry({ streaming: false, tpot: tps, outputTokens: tokenCount, spark: [...prevSpark.slice(1), Math.min(100, tps)] })
            setThinkingModel(null)
            if (isFirst) tryAutoName(text)
          },
          onError: () => {
            setThinkingModel(null)
            updateTelemetry({ streaming: false })
          },
        }
      )
    } else {
      // ── NORMAL MODE ─────────────────────────────────────────
      addMessage({
        id: uuid(), conversation_id: conversationId, role: 'assistant',
        content: '', mode: 'chat', model: activeModelId,
        created_at: new Date().toISOString(),
      })
      setThinkingModel(activeModelId)

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
            setThinkingModel(null)
            updateTelemetry({ ttft: ms, streaming: true })
          },
          onDelta: (delta) => {
            setThinkingModel(null)
            appendToLastMessage(conversationId, delta)
            addSessionTokens(Math.ceil(delta.length / 4))
          },
          onDone: (_id, outputTokens) => {
            const latencyMs = Date.now() - startTime
            const tokenCount = outputTokens ?? 0
            const genMs = Math.max(1, latencyMs - ttftMs)
            const tps = tokenCount > 0 ? (tokenCount / genMs) * 1000 : 0
            updateTelemetry({ streaming: false, ttft: ttftMs, tpot: tps, outputTokens: tokenCount, spark: [...prevSpark.slice(1), Math.min(100, tps)] })
            updateLastMessageTelemetry(conversationId, { ttft: ttftMs, tpot: tps, latency: latencyMs, outputTokens: tokenCount, finishReason: 'stop' })
            setThinkingModel(null)
            if (isFirst) tryAutoName(text)
          },
          onError: () => {
            setThinkingModel(null)
            updateTelemetry({ streaming: false })
          },
        }
      )
    }
  }

  const thinkingModelInfo = thinkingModel ? MIXING_MODELS.find(m => m.id === thinkingModel) : null

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
                {blend ? `Blend · ${selectedModels.length} Models` : `Chat · ${activeModel?.label ?? activeModelId}`}
              </div>
            </div>
          </div>
        )}

        {convMessages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isStreaming={streaming && i === convMessages.length - 1 && msg.role === 'assistant' && !thinkingModel}
          />
        ))}

        {/* Thinking indicator — not a textbox, just a floating pulse */}
        {thinkingModel && (
          <div className="think-indicator">
            {thinkingModelInfo && (
              <span className="think-dot-model" style={{ background: thinkingModelInfo.color }} />
            )}
            <div className="think-dots">
              <div className="think-dot" />
              <div className="think-dot" />
              <div className="think-dot" />
            </div>
            <span className="think-label">
              {thinkingModelInfo?.label ?? 'Model'} thinking…
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <ChatInput
        onSend={handleSend}
        onStop={stop}
        streaming={streaming}
        placeholder={blend ? `Transmit to ${selectedModels.length} models…` : 'Transmit a message…'}
      />
    </div>
  )
}
