import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { useState } from 'react'
import type { Message } from '@/store/appStore'
import 'highlight.js/styles/github-dark.css'

interface Props {
  message: Message
  isStreaming?: boolean
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

export default function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === 'user'

  const toStr = (c: any): string =>
    typeof c === 'string' ? c :
    Array.isArray(c) ? c.map(toStr).join('') :
    c?.props?.children ? toStr(c.props.children) : ''

  if (message.image_url) {
    return (
      <div className="msg fade-up">
        <div className="msg-gutter">
          <span className="who">ASST</span>
          <span className="ts">{formatTime(message.created_at)}</span>
        </div>
        <div>
          <div className="img-thumb" style={{ maxWidth: '480px' }}>
            <img src={message.image_url} alt={message.content} />
            <div className="img-overlay">
              <p style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--ink-dim)', letterSpacing: '.08em' }}>
                {message.content}
              </p>
              <a
                href={message.image_url}
                download={`aryabhata-${message.id}.jpg`}
                style={{ fontFamily: 'var(--mono)', fontSize: '9.5px', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--accent)', textDecoration: 'none', border: '.5px solid var(--accent)', padding: '4px 10px', borderRadius: 'var(--r)' }}
              >
                Save
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="msg fade-up">
      <div className="msg-gutter">
        <span className="who">{isUser ? 'YOU' : 'ASST'}</span>
        <span className="ts">{formatTime(message.created_at)}</span>
      </div>

      <div className={`msg-body${isStreaming ? ' streaming' : ''}`}>
        {isUser ? (
          <span>{message.content}</span>
        ) : (
          <div className="prose-ai">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                code({ className, children, ...props }: any) {
                  const inline = !className
                  if (inline) return <code className={className} {...props}>{children}</code>
                  return (
                    <CodeBlock className={className}>
                      {toStr(children).replace(/\n$/, '')}
                    </CodeBlock>
                  )
                },
                pre({ children }) { return <>{children}</> },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
