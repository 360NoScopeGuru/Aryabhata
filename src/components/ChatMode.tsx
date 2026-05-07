import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useAppStore, type Message, type Mode, getActiveModel, isBlendMode, MIXING_MODELS } from '@/store/appStore'
import { useStream } from '@/hooks/useStream'
import { useAuthFetch } from '@/hooks/useAuthFetch'
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
    telemetry, systemPrompt, truncateMessagesFrom, updateMessageContent,
    addConversation, setActiveConversation,
    arenaVotes, castVote, setLeaderboard,
    addToast, setLastError,
  } = useAppStore()
  const { stream, stop, streaming } = useStream()
  const { getToken } = useAuth()
  const authFetch = useAuthFetch()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [thinkingModel, setThinkingModel] = useState<string | null>(null)
  const [blendRoundDone, setBlendRoundDone] = useState(false)
  const [promptHash, setPromptHash] = useState('')
  const [streamError, setStreamError] = useState(false)
  const namedRef = useRef(false)
  const convMessages = messages[conversationId] ?? []

  const blend = isBlendMode(selectedModels)
  const activeModelId = getActiveModel(selectedModels)
  const activeModel = MIXING_MODELS.find(m => m.id === activeModelId)

  useEffect(() => {
    namedRef.current = false
    authFetch(`/api/conversations/${conversationId}/messages`)
      .then(r => r.ok ? r.json() : [])
      .then(msgs => {
        if (!Array.isArray(msgs)) return
        setMessages(conversationId, msgs)
        namedRef.current = msgs.length > 0
      })
      .catch(() => addToast({ kind: 'error', message: 'LOAD FAILED · Messages' }))
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [convMessages.length, streaming])

  const tryAutoName = async (firstUserMessage: string) => {
    if (namedRef.current) return
    namedRef.current = true
    try {
      const res = await authFetch('/api/chat/name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, first_message: firstUserMessage }),
      })
      const data = await res.json()
      if (data.title) updateConversationTitle(conversationId, data.title)
    } catch {}
  }

  const handleFork = async (msgId: string) => {
    try {
      const res = await authFetch(`/api/conversations/${conversationId}/fork/${msgId}`, { method: 'POST' })
      if (!res.ok) { addToast({ kind: 'error', message: 'FORK FAILED' }); return }
      const newConv = await res.json()
      addConversation(newConv)
      setActiveConversation(newConv.id)
      setMode(newConv.mode as Mode)
    } catch { addToast({ kind: 'error', message: 'FORK FAILED' }) }
  }

  const handleVote = async (modelId: string) => {
    if (!promptHash) return
    const key = `${conversationId}:${promptHash}`
    try {
      await authFetch('/api/arena/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conv_id: conversationId, msg_id: modelId, model_id: modelId, prompt_hash: promptHash }),
      })
      castVote(key, modelId)
      const lb = await authFetch('/api/arena/leaderboard')
      if (lb.ok) setLeaderboard(await lb.json())
    } catch { addToast({ kind: 'error', message: 'VOTE FAILED' }) }
  }

  const handleSend = async (text: string, imageBase64?: string) => {
    setBlendRoundDone(false)
    setStreamError(false)
    setLastError(null)
    if (autoRoute && !blend) {
      try {
        const res = await authFetch('/api/route', {
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

    const token = await getToken()
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

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
          system_prompt: systemPrompt || undefined,
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
            updateTelemetry({ streaming: false, tpot: tps, outputTokens: tokenCount, carbon: tokenCount * 0.0023, spark: [...prevSpark.slice(1), Math.min(100, tps)] })
            setLastError(null)
            setThinkingModel(null)
            if (isFirst) tryAutoName(text)
            // Compute SHA-256 of user text for Arena dedup, then show vote buttons
            crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(buf => {
              const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
              setPromptHash(hash)
              setBlendRoundDone(true)
            })
          },
          onError: (err) => {
            setThinkingModel(null)
            updateTelemetry({ streaming: false })
            setStreamError(true)
            addToast({ kind: 'error', message: `STREAM ERROR · ${err ?? 'Unknown'}` })
          },
        },
        authHeaders,
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
          system_prompt: systemPrompt || undefined,
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
            updateTelemetry({ streaming: false, ttft: ttftMs, tpot: tps, outputTokens: tokenCount, carbon: tokenCount * 0.0023, spark: [...prevSpark.slice(1), Math.min(100, tps)] })
            updateLastMessageTelemetry(conversationId, { ttft: ttftMs, tpot: tps, latency: latencyMs, outputTokens: tokenCount, finishReason: 'stop' })
            setLastError(null)
            setThinkingModel(null)
            if (isFirst) tryAutoName(text)
          },
          onError: (err) => {
            setThinkingModel(null)
            updateTelemetry({ streaming: false })
            setStreamError(true)
            addToast({ kind: 'error', message: `STREAM ERROR · ${err ?? 'Unknown'}` })
          },
        },
        authHeaders,
      )
    }
  }

  const restream = async (msgsToSend: Message[]) => {
    const allMsgs = msgsToSend.map(m => ({ role: m.role, content: m.content }))
    updateTelemetry({ streaming: true, tpot: 0, ttft: 0 })
    const startTime = Date.now()
    let ttftMs = 0
    const prevSpark = telemetry.spark
    const token = await getToken()
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

    if (blend) {
      await stream('/api/blend/stream', {
        conversation_id: conversationId, messages: allMsgs,
        models: selectedModels, temperature, top_p: topP, top_k: topK,
        max_tokens: maxTokens, system_prompt: systemPrompt || undefined,
      }, {
        onModelStart: (modelId) => {
          setThinkingModel(modelId)
          addMessage({ id: uuid(), conversation_id: conversationId, role: 'assistant', content: '', mode: 'chat', model: modelId, blend: true, created_at: new Date().toISOString() })
        },
        onFirstToken: (ms) => { ttftMs = ms; setThinkingModel(null); updateTelemetry({ ttft: ms }) },
        onDelta: (delta) => { setThinkingModel(null); appendToLastMessage(conversationId, delta); addSessionTokens(Math.ceil(delta.length / 4)) },
        onModelDone: () => { setThinkingModel(null); updateLastMessageTelemetry(conversationId, { finishReason: 'stop' }) },
        onDone: (_id, outputTokens) => {
          const tokenCount = outputTokens ?? 0
          const tps = tokenCount > 0 ? (tokenCount / Math.max(1, Date.now() - startTime - ttftMs)) * 1000 : 0
          updateTelemetry({ streaming: false, tpot: tps, outputTokens: tokenCount, carbon: tokenCount * 0.0023, spark: [...prevSpark.slice(1), Math.min(100, tps)] })
          setLastError(null)
          setThinkingModel(null)
        },
        onError: (err) => { setThinkingModel(null); updateTelemetry({ streaming: false }); setStreamError(true); addToast({ kind: 'error', message: `STREAM ERROR · ${err ?? 'Unknown'}` }) },
      }, authHeaders)
    } else {
      addMessage({ id: uuid(), conversation_id: conversationId, role: 'assistant', content: '', mode: 'chat', model: activeModelId, created_at: new Date().toISOString() })
      setThinkingModel(activeModelId)
      await stream('/api/chat/stream', {
        conversation_id: conversationId, messages: allMsgs, model: activeModelId,
        temperature, top_p: topP, top_k: topK,
        frequency_penalty: frequencyPenalty, presence_penalty: presencePenalty,
        max_tokens: maxTokens, system_prompt: systemPrompt || undefined,
      }, {
        onFirstToken: (ms) => { ttftMs = ms; setThinkingModel(null); updateTelemetry({ ttft: ms, streaming: true }) },
        onDelta: (delta) => { setThinkingModel(null); appendToLastMessage(conversationId, delta); addSessionTokens(Math.ceil(delta.length / 4)) },
        onDone: (_id, outputTokens) => {
          const latencyMs = Date.now() - startTime
          const tokenCount = outputTokens ?? 0
          const tps = tokenCount > 0 ? (tokenCount / Math.max(1, latencyMs - ttftMs)) * 1000 : 0
          updateTelemetry({ streaming: false, ttft: ttftMs, tpot: tps, outputTokens: tokenCount, carbon: tokenCount * 0.0023, spark: [...prevSpark.slice(1), Math.min(100, tps)] })
          updateLastMessageTelemetry(conversationId, { ttft: ttftMs, tpot: tps, latency: latencyMs, outputTokens: tokenCount, finishReason: 'stop' })
          setLastError(null)
          setThinkingModel(null)
        },
        onError: (err) => { setThinkingModel(null); updateTelemetry({ streaming: false }); setStreamError(true); addToast({ kind: 'error', message: `STREAM ERROR · ${err ?? 'Unknown'}` }) },
      }, authHeaders)
    }
  }

  const handleRegenerate = async () => {
    const msgs = convMessages
    let lastUserIdx = -1
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') { lastUserIdx = i; break }
    }
    if (lastUserIdx === -1) return
    const firstAfter = msgs[lastUserIdx + 1]
    if (firstAfter) {
      try { await authFetch(`/api/conversations/${conversationId}/messages/${firstAfter.id}/onwards`, { method: 'DELETE' }) } catch {}
    }
    truncateMessagesFrom(conversationId, lastUserIdx + 1)
    await restream(msgs.slice(0, lastUserIdx + 1))
  }

  const handleEdit = async (msgId: string, msgIndex: number, newContent: string) => {
    try { await authFetch(`/api/conversations/${conversationId}/messages/${msgId}/onwards`, { method: 'DELETE' }) } catch {}
    updateMessageContent(conversationId, msgId, newContent)
    truncateMessagesFrom(conversationId, msgIndex + 1)
    const updatedMsgs = [...convMessages.slice(0, msgIndex), { ...convMessages[msgIndex], content: newContent }]
    await restream(updatedMsgs)
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
            isLast={i === convMessages.length - 1}
            onRegenerate={!streaming ? handleRegenerate : undefined}
            onEdit={!streaming && msg.role === 'user' ? (newContent) => handleEdit(msg.id, i, newContent) : undefined}
            onFork={!streaming ? () => handleFork(msg.id) : undefined}
            showVoteButton={blendRoundDone}
            votedFor={promptHash ? (arenaVotes[`${conversationId}:${promptHash}`] ?? null) : null}
            onVote={handleVote}
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

      {streamError && !streaming && (
        <div className="stream-error-banner">
          <span>⚠ Generation failed</span>
          <button className="retry-btn" onClick={() => { setStreamError(false); handleRegenerate() }}>↺ Retry</button>
          <button className="retry-dismiss" onClick={() => setStreamError(false)}>×</button>
        </div>
      )}

      <ChatInput
        onSend={(text, img) => { setStreamError(false); handleSend(text, img) }}
        onStop={stop}
        streaming={streaming}
        placeholder={blend ? `Transmit to ${selectedModels.length} models…` : 'Transmit a message…'}
      />
    </div>
  )
}
