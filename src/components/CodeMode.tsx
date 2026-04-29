import { useEffect, useRef, useState } from 'react'
import MonacoEditor from '@monaco-editor/react'
import { useAppStore, type Message, getActiveModel, MIXING_MODELS } from '@/store/appStore'
import { useStream } from '@/hooks/useStream'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import { v4 as uuid } from 'uuid'

interface Props { conversationId: string }

export default function CodeMode({ conversationId }: Props) {
  const {
    messages, addMessage, appendToLastMessage, setMessages,
    selectedModels, codeLanguage, updateConversationTitle, addSessionTokens,
    updateLastMessageTelemetry, updateTelemetry, bumpThreadCount,
    temperature, topP, topK, frequencyPenalty, presencePenalty, maxTokens,
    telemetry,
  } = useAppStore()
  const { stream, stop, streaming } = useStream()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [editorCode, setEditorCode] = useState('# Write your code here\n')
  const [thinkingModel, setThinkingModel] = useState<string | null>(null)
  const namedRef = useRef(false)
  const convMessages = messages[conversationId] ?? []
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

  const handleSend = async (text: string) => {
    addSessionTokens(Math.ceil(text.length / 4))
    bumpThreadCount()

    const userMsg: Message = {
      id: uuid(), conversation_id: conversationId, role: 'user',
      content: text, mode: 'code', model: activeModelId,
      created_at: new Date().toISOString(),
    }
    addMessage(userMsg)
    addMessage({
      id: uuid(), conversation_id: conversationId, role: 'assistant',
      content: '', mode: 'code', model: activeModelId,
      created_at: new Date().toISOString(),
    })
    setThinkingModel(activeModelId)
    updateTelemetry({ streaming: true, tpot: 0, ttft: 0 })

    const isFirst = convMessages.length === 0
    const allMsgs = [...convMessages, userMsg].map(m => ({ role: m.role, content: m.content }))
    const startTime = Date.now()
    let ttftMs = 0
    const prevSpark = telemetry.spark

    await stream(
      '/api/code/stream',
      {
        conversation_id: conversationId,
        messages: allMsgs,
        model: activeModelId,
        language: codeLanguage,
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

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ width: '50%', display: 'flex', flexDirection: 'column', borderRight: '.5px solid var(--line-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '.5px solid var(--line-soft)', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '9.5px', letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--ink-dim)' }}>
            Editor · {codeLanguage}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.12em', color: 'var(--ink-faint)', textTransform: 'uppercase' }}>Monaco</span>
        </div>
        <div style={{ flex: 1 }}>
          <MonacoEditor
            height="100%"
            language={codeLanguage}
            value={editorCode}
            onChange={v => setEditorCode(v ?? '')}
            theme="vs-dark"
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              padding: { top: 14, bottom: 14 },
              lineNumbers: 'on',
              folding: true,
              wordWrap: 'on',
              automaticLayout: true,
              bracketPairColorization: { enabled: true },
              smoothScrolling: true,
              renderLineHighlight: 'gutter',
              overviewRulerBorder: false,
              hideCursorInOverviewRuler: true,
              scrollbar: { verticalScrollbarSize: 4, horizontalScrollbarSize: 4 },
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div className="center-head">
          <span>Assistant</span>
          <span style={{ color: 'var(--ink-faint)', fontSize: '9px' }}>{activeModel?.label ?? activeModelId}</span>
        </div>

        <div className="thread">
          {convMessages.length === 0 && (
            <div className="empty-state">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', letterSpacing: '.14em', color: 'var(--ink)', textTransform: 'uppercase', marginBottom: '6px' }}>Code Assistant</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.2em', color: 'var(--ink-dim)', textTransform: 'uppercase' }}>{activeModel?.label ?? activeModelId}</div>
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

          {thinkingModel && (
            <div className="think-indicator">
              <div className="think-dots">
                <div className="think-dot" /><div className="think-dot" /><div className="think-dot" />
              </div>
              <span className="think-label">{activeModel?.label ?? 'Model'} thinking…</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <ChatInput
          onSend={handleSend}
          onStop={stop}
          streaming={streaming}
          placeholder="Ask about your code…"
        />
      </div>
    </div>
  )
}
