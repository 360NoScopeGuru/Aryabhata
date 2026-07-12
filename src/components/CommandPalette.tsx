import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { fuzzyMatch, highlight } from '@/lib/fuzzyMatch'
import { MIXING_MODELS, type Mode, type Theme, useAppStore } from '@/store/appStore'

interface Props {
  open: boolean
  onClose: () => void
  onShowMultiverse: () => void
  onShowInsights: () => void
  onShowShortcuts: () => void
  onNewChat: () => void
  onExport: () => void
}

type CommandCategory = 'Action' | 'Mode' | 'Theme' | 'Model' | 'Persona' | 'Conversation'

interface Command {
  id: string
  category: CommandCategory
  label: string
  hint?: string
  shortcut?: string
  color?: string
  run: () => void
}

const THEMES: { id: Theme; label: string; accent: string }[] = [
  { id: 'cad', label: 'VOID', accent: '#b44dff' },
  { id: 'orbit', label: 'EMBER', accent: '#ff6b1a' },
  { id: 'brutal', label: 'ARCTIC', accent: '#0066ff' },
  { id: 'liquid', label: 'MATRIX', accent: '#00ff41' },
  { id: 'prism', label: 'BLOOM', accent: '#e0198c' },
]

const BUILTIN_PERSONA_PROMPTS: { name: string; prompt: string }[] = [
  {
    name: 'Rubber Duck',
    prompt:
      'You are a rubber duck debugger. When the user describes a problem, ask clarifying questions that help them think through it themselves. Never give the answer directly — guide them to discover it. Use a friendly, curious tone.',
  },
  {
    name: 'Socratic',
    prompt:
      'You are a Socratic tutor. Never give direct answers. Instead, ask probing questions that lead the student to discover the truth themselves. Acknowledge correct reasoning with brief affirmations before pushing deeper.',
  },
  {
    name: 'Critic',
    prompt:
      'You are a snarky but brilliant code critic. Point out every flaw, anti-pattern, and missed optimization with sharp wit. Despite the snark, your feedback must be technically accurate and actionable. End each critique with one genuine compliment.',
  },
  {
    name: 'ELI5',
    prompt:
      'Explain everything as if the user is five years old. Use simple words, analogies involving toys or food, and short sentences. Never use technical jargon. If you must introduce a complex word, immediately define it with a fun comparison.',
  },
  {
    name: "Devil's Advocate",
    prompt:
      "You are the devil's advocate. Whatever position the user presents, argue the strongest possible counterargument. You do not necessarily believe your counterargument — you are stress-testing their thinking. Be rigorous and cite logic, not rhetoric.",
  },
  {
    name: 'Tech Writer',
    prompt:
      'You are a hyper-detailed technical writer. Produce exhaustive, structured documentation with sections, subsections, code examples, parameter tables, and edge-case notes. Use precise language. Never omit a detail that a developer might need.',
  },
  {
    name: 'Exec Summary',
    prompt:
      'Reply in 3 bullet points maximum. Lead with the business impact. Use plain English. Bold the most important word in each bullet. No technical details unless explicitly requested.',
  },
]

export default function CommandPalette({
  open,
  onClose,
  onShowMultiverse,
  onShowInsights,
  onShowShortcuts,
  onNewChat,
  onExport,
}: Props) {
  const {
    setMode,
    setTheme,
    setSelectedModels,
    setSystemPrompt,
    setActiveConversation,
    conversations,
    activeConversationId,
    autoRoute,
    setAutoRoute,
    customPersonas,
    resetSamplingParams,
    addToast,
    clearMessages,
  } = useAppStore()
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Build the universe of commands every render — cheap because it's
  // mostly static lookups.
  const commands: Command[] = useMemo(() => {
    const list: Command[] = []

    // Actions
    list.push(
      {
        id: 'new',
        category: 'Action',
        label: 'New chat',
        shortcut: 'Ctrl+N',
        run: () => {
          onNewChat()
          onClose()
        },
      },
      {
        id: 'export',
        category: 'Action',
        label: 'Export current as Markdown',
        shortcut: 'Ctrl+E',
        run: () => {
          onExport()
          onClose()
        },
      },
      {
        id: 'shortcuts',
        category: 'Action',
        label: 'Show keyboard shortcuts',
        shortcut: 'Ctrl+/',
        run: () => {
          onShowShortcuts()
          onClose()
        },
      },
      {
        id: 'multiverse',
        category: 'Action',
        label: 'Open Multiverse — fork tree',
        run: () => {
          onShowMultiverse()
          onClose()
        },
      },
      {
        id: 'insights',
        category: 'Action',
        label: 'Open Insights — personal analytics',
        run: () => {
          onShowInsights()
          onClose()
        },
      },
      {
        id: 'auto',
        category: 'Action',
        label: `Auto-Route: ${autoRoute ? 'disable' : 'enable'}`,
        run: () => {
          setAutoRoute(!autoRoute)
          onClose()
        },
      },
      {
        id: 'reset',
        category: 'Action',
        label: 'Reset sampling parameters to defaults',
        run: () => {
          resetSamplingParams()
          addToast({ kind: 'ok', message: 'SAMPLING RESET' })
          onClose()
        },
      },
    )
    if (activeConversationId) {
      list.push({
        id: 'clear-current',
        category: 'Action',
        label: 'Clear messages in current chat',
        run: () => {
          clearMessages(activeConversationId)
          addToast({ kind: 'ok', message: 'CHAT CLEARED' })
          onClose()
        },
      })
    }

    // Modes
    ;(['chat', 'code', 'image'] as Mode[]).forEach((m) => {
      list.push({
        id: `mode-${m}`,
        category: 'Mode',
        label: `Switch to ${m.toUpperCase()} mode`,
        run: () => {
          setMode(m)
          onClose()
        },
      })
    })

    // Themes
    THEMES.forEach((t) => {
      list.push({
        id: `theme-${t.id}`,
        category: 'Theme',
        label: `Theme: ${t.label}`,
        color: t.accent,
        run: () => {
          setTheme(t.id)
          onClose()
        },
      })
    })

    // Models — single-select
    MIXING_MODELS.forEach((m) => {
      list.push({
        id: `model-${m.id}`,
        category: 'Model',
        label: m.label,
        hint: `${m.provider} · ${m.context} · ${m.speed}`,
        color: m.color,
        run: () => {
          setSelectedModels([m.id])
          addToast({ kind: 'ok', message: `MODEL · ${m.label}` })
          onClose()
        },
      })
    })

    // Personas
    BUILTIN_PERSONA_PROMPTS.forEach((p) => {
      list.push({
        id: `persona-${p.name}`,
        category: 'Persona',
        label: `Persona: ${p.name}`,
        run: () => {
          setSystemPrompt(p.prompt)
          onClose()
        },
      })
    })
    customPersonas.forEach((p) => {
      list.push({
        id: `persona-${p.id}`,
        category: 'Persona',
        label: `Persona: ${p.name} (custom)`,
        run: () => {
          setSystemPrompt(p.prompt)
          onClose()
        },
      })
    })
    list.push({
      id: 'persona-clear',
      category: 'Persona',
      label: 'Clear persona / system prompt',
      run: () => {
        setSystemPrompt('')
        onClose()
      },
    })

    // Conversations — most recent 50
    conversations.slice(0, 50).forEach((c) => {
      list.push({
        id: `conv-${c.id}`,
        category: 'Conversation',
        label: c.title,
        hint: c.mode.toUpperCase(),
        run: () => {
          setActiveConversation(c.id)
          setMode(c.mode)
          onClose()
        },
      })
    })

    return list
  }, [autoRoute, conversations, activeConversationId, customPersonas])

  // Filter + score
  const results = useMemo(() => {
    if (!query) {
      // Default ordering: actions first, then modes, themes, recent conversations, models, personas
      const order: CommandCategory[] = [
        'Action',
        'Mode',
        'Theme',
        'Conversation',
        'Persona',
        'Model',
      ]
      return [...commands].sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category))
    }
    const scored = commands
      .map((c) => {
        const labelMatch = fuzzyMatch(c.label, query)
        const hintMatch = c.hint ? fuzzyMatch(c.hint, query) : null
        const catMatch = fuzzyMatch(c.category, query)
        const best = [labelMatch, hintMatch, catMatch].filter(Boolean) as {
          score: number
          positions: number[]
        }[]
        if (best.length === 0) return null
        const top = best.sort((a, b) => b.score - a.score)[0]
        return { cmd: c, score: top.score, positions: labelMatch?.positions ?? [] }
      })
      .filter(Boolean) as { cmd: Command; score: number; positions: number[] }[]
    scored.sort((a, b) => b.score - a.score)
    return scored.map((s) => s.cmd).slice(0, 50)
  }, [commands, query])

  // Reset selection when the query changes — adjusted during render rather
  // than in an effect, per https://react.dev/learn/you-might-not-need-an-effect
  const [prevQuery, setPrevQuery] = useState(query)
  if (query !== prevQuery) {
    setPrevQuery(query)
    setActiveIdx(0)
  }

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const cmd = results[activeIdx]
        if (cmd) cmd.run()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, results, activeIdx, onClose])

  // Ensure selected row stays in view
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector<HTMLDivElement>(`[data-idx="${activeIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  if (!open) return null

  return createPortal(
    <div className="cmd-scrim" onClick={onClose}>
      <div className="cmd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-search-row">
          <span className="cmd-prompt-icon">⌘</span>
          <input
            ref={inputRef}
            className="cmd-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Run an action, switch model, jump to chat…"
          />
          <span className="cmd-kbd">ESC</span>
        </div>

        <div className="cmd-list" ref={listRef}>
          {results.length === 0 && <div className="cmd-empty">No matches</div>}
          {results.map((c, i) => {
            const isActive = i === activeIdx
            const showHeader = !query && (i === 0 || results[i - 1].category !== c.category)
            const labelMatch = query ? fuzzyMatch(c.label, query) : null
            const segments = labelMatch ? highlight(c.label, labelMatch.positions) : null
            return (
              <div key={c.id}>
                {showHeader && <div className="cmd-section">{c.category}</div>}
                <div
                  className={`cmd-row ${isActive ? 'active' : ''}`}
                  data-idx={i}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => c.run()}
                >
                  {c.color && <span className="cmd-row-dot" style={{ background: c.color }} />}
                  <span className="cmd-row-label">
                    {segments
                      ? segments.map((s, k) => (
                          <span key={k} className={s.matched ? 'cmd-hit' : ''}>
                            {s.text}
                          </span>
                        ))
                      : c.label}
                  </span>
                  {c.hint && <span className="cmd-row-hint">{c.hint}</span>}
                  <span className="cmd-row-cat">{c.category}</span>
                  {c.shortcut && <span className="cmd-kbd">{c.shortcut}</span>}
                </div>
              </div>
            )
          })}
        </div>

        <div className="cmd-foot">
          <span>
            <span className="cmd-kbd">↑↓</span> navigate
          </span>
          <span>
            <span className="cmd-kbd">↵</span> select
          </span>
          <span>
            <span className="cmd-kbd">esc</span> close
          </span>
          <span style={{ marginLeft: 'auto', opacity: 0.4 }}>{results.length} commands</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
