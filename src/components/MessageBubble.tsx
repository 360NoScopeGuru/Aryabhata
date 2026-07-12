import 'highlight.js/styles/github-dark.css'

import * as Tooltip from '@radix-ui/react-tooltip'
import { type ComponentPropsWithoutRef, isValidElement, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'

import type { Message } from '@/store/appStore'
import { MIXING_MODELS } from '@/store/appStore'

import ContextMenu from './ContextMenu'

interface Props {
  message: Message
  isStreaming?: boolean
  isLast?: boolean
  onRegenerate?: () => void
  onEdit?: (newContent: string) => void
  onFork?: () => void
  showVoteButton?: boolean
  votedFor?: string | null
  onVote?: (modelId: string) => void
}

function CodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const lang = className?.replace('language-', '') ?? ''
  const copy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="code-block-wrap">
      <div className="code-block-head">
        <span className="lang">{lang || 'code'}</span>
        <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={copy}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="code-block">
        <code className={className}>{children}</code>
      </pre>
    </div>
  )
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const toStr = (c: unknown): string =>
  typeof c === 'string'
    ? c
    : Array.isArray(c)
      ? c.map(toStr).join('')
      : isValidElement<{ children?: unknown }>(c)
        ? toStr(c.props.children)
        : ''

export default function MessageBubble({
  message,
  isStreaming,
  isLast,
  onRegenerate,
  onEdit,
  onFork,
  showVoteButton,
  votedFor,
  onVote,
}: Props) {
  const isUser = message.role === 'user'
  const [traceOpen, setTraceOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(message.content)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressPos = useRef({ x: 0, y: 0 })

  const openCtx = (e: React.MouseEvent) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY })
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    pressPos.current = { x: t.clientX, y: t.clientY }
    pressTimer.current = setTimeout(() => {
      pressTimer.current = null
      setCtxMenu({ x: pressPos.current.x, y: pressPos.current.y })
    }, 500)
  }

  const handleTouchEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  const handleTouchMove = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  const ctxItems = [
    {
      label: 'Copy text',
      onSelect: () => navigator.clipboard.writeText(message.content),
    },
    ...(isUser && onEdit && !isStreaming
      ? [
          {
            label: 'Edit',
            onSelect: () => {
              setEditValue(message.content)
              setEditing(true)
            },
          },
        ]
      : []),
    ...(isLast && !isUser && onRegenerate && !isStreaming
      ? [
          {
            label: 'Regenerate',
            onSelect: () => onRegenerate(),
          },
        ]
      : []),
    ...(onFork && !isStreaming
      ? [
          {
            label: 'Fork from here →',
            onSelect: () => onFork(),
          },
        ]
      : []),
  ]

  const modelInfo = message.model ? MIXING_MODELS.find((m) => m.id === message.model) : null
  const hasMetadata =
    !isUser && !isStreaming && (message.latency || message.ttft || message.outputTokens)

  const confirmEdit = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== message.content) onEdit?.(trimmed)
    setEditing(false)
  }

  const cancelEdit = () => {
    setEditValue(message.content)
    setEditing(false)
  }

  if (message.image_url) {
    return (
      <div className="msg fade-up">
        <div className="msg-who">
          <span className="who-label">ASST</span>
          <Tooltip.Provider delayDuration={400}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <span className="who-time">{formatTime(message.created_at)}</span>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="msg-time-tooltip" sideOffset={4}>
                  {new Date(message.created_at).toLocaleString()}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
        <div className="img-thumb" style={{ maxWidth: '480px' }}>
          <img src={message.image_url} alt={message.content} />
          <div className="img-overlay">
            <p
              style={{
                flex: 1,
                fontFamily: 'var(--mono)',
                fontSize: '10px',
                color: 'var(--ink-dim)',
                letterSpacing: '.08em',
              }}
            >
              {message.content}
            </p>
            <a
              href={message.image_url}
              download={`aryabhata-${message.id}.jpg`}
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '9.5px',
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                textDecoration: 'none',
                border: '.5px solid var(--accent)',
                padding: '4px 10px',
                borderRadius: 'var(--r)',
              }}
            >
              Save
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`msg fade-up ${isUser ? 'user' : ''}`}
      onContextMenu={openCtx}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      <div className="msg-who">
        <span className="who-label">{isUser ? 'YOU' : 'ASST'}</span>
        <Tooltip.Provider delayDuration={400}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <span className="who-time">{formatTime(message.created_at)}</span>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content className="msg-time-tooltip" sideOffset={4}>
                {new Date(message.created_at).toLocaleString()}
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>

        {/* Action buttons */}
        {!isStreaming && (
          <div className="msg-actions">
            {isUser && onEdit && (
              <button
                className="msg-action-btn"
                onClick={() => {
                  setEditValue(message.content)
                  setEditing(true)
                }}
                title="Edit"
              >
                ✎
              </button>
            )}
            {!isUser && isLast && onRegenerate && (
              <button className="msg-action-btn" onClick={onRegenerate} title="Regenerate">
                ↺
              </button>
            )}
          </div>
        )}
      </div>

      {!isUser && modelInfo && (
        <div className="attribution-row">
          <div className="attribution-pill" style={{ borderColor: modelInfo.color + '55' }}>
            <span className="attribution-dot" style={{ background: modelInfo.color }} />
            <span>{modelInfo.label}</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{ opacity: 0.6 }}>{modelInfo.provider}</span>
          </div>
        </div>
      )}

      <div className={`msg-body${isStreaming ? ' streaming' : ''}`}>
        {editing ? (
          <div className="edit-mode">
            <textarea
              className="edit-textarea"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoFocus
              rows={Math.max(3, editValue.split('\n').length)}
            />
            <div className="edit-actions">
              <button
                className="send-btn"
                style={{ fontSize: '10px', padding: '4px 14px' }}
                onClick={confirmEdit}
              >
                Resend →
              </button>
              <button
                className="stop-btn"
                style={{ fontSize: '10px', padding: '4px 10px' }}
                onClick={cancelEdit}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : isUser ? (
          <span>{message.content}</span>
        ) : (
          <div className="prose-ai">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                code({ className, children, ...props }: ComponentPropsWithoutRef<'code'>) {
                  const inline = !className
                  if (inline)
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    )
                  return (
                    <CodeBlock className={className}>
                      {toStr(children).replace(/\n$/, '')}
                    </CodeBlock>
                  )
                },
                pre({ children }) {
                  return <>{children}</>
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {hasMetadata && (
        <div className="msg-meta">
          {message.latency && (
            <div className="msg-meta-cell">
              <span className="mk">LAT</span>
              <span className="mv">{message.latency}ms</span>
            </div>
          )}
          {message.ttft && (
            <div className="msg-meta-cell">
              <span className="mk">TTFT</span>
              <span className="mv">{message.ttft}ms</span>
            </div>
          )}
          {message.tpot && (
            <div className="msg-meta-cell">
              <span className="mk">T/S</span>
              <span className="mv">{message.tpot.toFixed(1)}</span>
            </div>
          )}
          {message.outputTokens && (
            <div className="msg-meta-cell">
              <span className="mk">TOK</span>
              <span className="mv">{message.outputTokens}</span>
            </div>
          )}
          {message.finishReason && (
            <div className="msg-meta-cell">
              <span className="mk">FINISH</span>
              <span className="mv">{message.finishReason}</span>
            </div>
          )}
          <button className="expand-trace-btn" onClick={() => setTraceOpen(!traceOpen)}>
            {traceOpen ? '▲' : '▼'} TRACE
          </button>
        </div>
      )}

      {traceOpen && (
        <div className="trace-panel">
          <pre>
            {JSON.stringify(
              {
                model: message.model,
                ttft: message.ttft,
                tpot: message.tpot,
                latency: message.latency,
                outputTokens: message.outputTokens,
                finishReason: message.finishReason,
                cost: message.cost,
              },
              null,
              2,
            )}
          </pre>
        </div>
      )}

      {showVoteButton && !isUser && message.blend && (
        <button
          className={`vote-btn ${votedFor === message.model ? 'voted' : ''} ${votedFor && votedFor !== message.model ? 'vote-lost' : ''}`}
          onClick={() => onVote?.(message.model!)}
          disabled={!!votedFor}
        >
          {votedFor === message.model ? '★ VOTED' : '☆ Vote this response'}
        </button>
      )}

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={ctxItems}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  )
}
