import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { v4 as uuid } from 'uuid'

const BUILTIN_PERSONAS = [
  {
    id: 'rubber-duck',
    name: 'Rubber Duck',
    icon: '🦆',
    prompt: 'You are a rubber duck debugger. When the user describes a problem, ask clarifying questions that help them think through it themselves. Never give the answer directly — guide them to discover it. Use a friendly, curious tone.',
  },
  {
    id: 'socratic',
    name: 'Socratic',
    icon: '🏛',
    prompt: 'You are a Socratic tutor. Never give direct answers. Instead, ask probing questions that lead the student to discover the truth themselves. Acknowledge correct reasoning with brief affirmations before pushing deeper.',
  },
  {
    id: 'snarky-critic',
    name: 'Critic',
    icon: '😤',
    prompt: 'You are a snarky but brilliant code critic. Point out every flaw, anti-pattern, and missed optimization with sharp wit. Despite the snark, your feedback must be technically accurate and actionable. End each critique with one genuine compliment.',
  },
  {
    id: 'eli5',
    name: 'ELI5',
    icon: '🧒',
    prompt: 'Explain everything as if the user is five years old. Use simple words, analogies involving toys or food, and short sentences. Never use technical jargon. If you must introduce a complex word, immediately define it with a fun comparison.',
  },
  {
    id: 'devils-advocate',
    name: "Devil's Adv",
    icon: '😈',
    prompt: "You are the devil's advocate. Whatever position the user presents, argue the strongest possible counterargument. You do not necessarily believe your counterargument — you are stress-testing their thinking. Be rigorous and cite logic, not rhetoric.",
  },
  {
    id: 'tech-writer',
    name: 'Tech Writer',
    icon: '📝',
    prompt: 'You are a hyper-detailed technical writer. Produce exhaustive, structured documentation with sections, subsections, code examples, parameter tables, and edge-case notes. Use precise language. Never omit a detail that a developer might need.',
  },
  {
    id: 'exec-summary',
    name: 'Exec Summary',
    icon: '📊',
    prompt: 'Reply in 3 bullet points maximum. Lead with the business impact. Use plain English. Bold the most important word in each bullet. No technical details unless explicitly requested.',
  },
]

interface Props {
  systemPrompt: string
  onSelect: (prompt: string) => void
}

export default function PersonaGallery({ systemPrompt, onSelect }: Props) {
  const { customPersonas, addCustomPersona, removeCustomPersona } = useAppStore()
  const allPersonas = [...BUILTIN_PERSONAS, ...customPersonas]

  const [activeId, setActiveId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('')
  const [newPrompt, setNewPrompt] = useState('')

  useEffect(() => {
    if (!activeId) return
    const selected = allPersonas.find(p => p.id === activeId)
    if (selected && systemPrompt !== selected.prompt) {
      setActiveId(null)
    }
  }, [systemPrompt, activeId])

  const handleSelect = (persona: typeof BUILTIN_PERSONAS[0]) => {
    if (activeId === persona.id) {
      setActiveId(null)
      onSelect('')
    } else {
      setActiveId(persona.id)
      onSelect(persona.prompt)
    }
  }

  const handleCreate = () => {
    const name = newName.trim()
    const prompt = newPrompt.trim()
    if (!name || !prompt) return
    addCustomPersona({ id: uuid(), name, icon: newIcon.trim() || '✦', prompt })
    setNewName('')
    setNewIcon('')
    setNewPrompt('')
    setCreating(false)
  }

  return (
    <div className="persona-gallery">
      <div className="persona-scroll">
        {allPersonas.map(p => (
          <div key={p.id} className="persona-card-wrap">
            <button
              className={`persona-card ${activeId === p.id ? 'active' : ''}`}
              onClick={() => handleSelect(p)}
              title={p.prompt}
            >
              <span className="persona-icon">{p.icon}</span>
              <span className="persona-name">{p.name}</span>
            </button>
            {customPersonas.some(c => c.id === p.id) && (
              <button
                className="persona-delete-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  if (activeId === p.id) { setActiveId(null); onSelect('') }
                  removeCustomPersona(p.id)
                }}
                title="Remove persona"
              >×</button>
            )}
          </div>
        ))}

        <button className="persona-card persona-add-btn" onClick={() => setCreating(true)} title="Create custom persona">
          <span className="persona-icon">+</span>
          <span className="persona-name">Custom</span>
        </button>
      </div>

      {creating && (
        <div className="persona-create-form">
          <div className="persona-form-row">
            <input
              className="persona-form-icon"
              value={newIcon}
              onChange={e => setNewIcon(e.target.value)}
              placeholder="✦"
              maxLength={4}
            />
            <input
              className="persona-form-name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Name"
            />
          </div>
          <textarea
            className="persona-form-prompt"
            value={newPrompt}
            onChange={e => setNewPrompt(e.target.value)}
            placeholder="System prompt for this persona…"
            rows={3}
          />
          <div className="persona-form-actions">
            <button className="send-btn" style={{ fontSize: '9px', padding: '4px 12px' }} onClick={handleCreate}>
              Save
            </button>
            <button className="stop-btn" style={{ fontSize: '9px', padding: '4px 10px' }} onClick={() => setCreating(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
