// Slash commands available inside the composer. Typing "/" at the start
// of a message reveals the menu. Selecting a command either:
//   - transforms the next message (prepends a directive: kind = 'transform')
//   - triggers an app action immediately (kind = 'action')

export type SlashKind = 'transform' | 'action'

export interface SlashCommand {
  trigger: string // e.g. "/eli5"
  label: string // display name
  description: string // what it does
  kind: SlashKind
  // For transform: takes user text, returns the actual message to send
  transform?: (text: string) => string
  // For action: a key the parent component dispatches on
  actionKey?: string
}

export const SLASH_COMMANDS: SlashCommand[] = [
  // ── Transform commands ─────────────────────────────────────────────
  {
    trigger: '/eli5',
    label: "Explain Like I'm 5",
    description: 'Reframes your question for the simplest possible answer',
    kind: 'transform',
    transform: (t) =>
      `Explain this like I'm five years old, using simple words and analogies. No jargon.\n\nQuestion: ${t}`,
  },
  {
    trigger: '/critique',
    label: 'Brutal Critique',
    description: 'Asks the model to find every flaw in what follows',
    kind: 'transform',
    transform: (t) =>
      `Critique this rigorously. Find every weakness, flaw, anti-pattern, missed optimization, or logical gap. Be sharp but constructive.\n\n${t}`,
  },
  {
    trigger: '/summarize',
    label: 'Summarize',
    description: 'Condense the input to its essential points',
    kind: 'transform',
    transform: (t) =>
      `Summarize the following in 3-5 bullet points, leading with the most important takeaway:\n\n${t}`,
  },
  {
    trigger: '/translate',
    label: 'Translate',
    description: 'Translate to another language (specify after the command)',
    kind: 'transform',
    transform: (t) => {
      // /translate spanish hello world → "Translate to spanish:\n\nhello world"
      const match = t.match(/^(\S+)\s+([\s\S]+)$/)
      if (match)
        return `Translate the following to ${match[1]}. Provide only the translation, no explanation.\n\n${match[2]}`
      return `Translate the following. State the source and target languages, then provide the translation.\n\n${t}`
    },
  },
  {
    trigger: '/code',
    label: 'Code',
    description: 'Frame as a code-generation request',
    kind: 'transform',
    transform: (t) =>
      `Write production-quality code for the following. Include brief inline comments only where the logic is non-obvious.\n\nRequirement: ${t}`,
  },
  {
    trigger: '/expand',
    label: 'Expand',
    description: 'Take a short note and develop it into a full response',
    kind: 'transform',
    transform: (t) =>
      `Expand the following note into a complete, well-structured response. Preserve the original intent, add depth, examples, and context.\n\nNote: ${t}`,
  },
  {
    trigger: '/refactor',
    label: 'Refactor',
    description: 'Refactor code for clarity and modern idioms',
    kind: 'transform',
    transform: (t) =>
      `Refactor this code for clarity, modern idioms, and minimal complexity. Preserve behavior. Show the refactored version with a brief summary of what changed.\n\n${t}`,
  },
  {
    trigger: '/whatif',
    label: 'What If…',
    description: 'Explore counterfactuals and alternate scenarios',
    kind: 'transform',
    transform: (t) =>
      `Explore counterfactuals for the following. What are 3-5 plausible alternative outcomes or scenarios? Reason about each.\n\n${t}`,
  },

  // ── Action commands ────────────────────────────────────────────────
  {
    trigger: '/clear',
    label: 'Clear conversation',
    description: 'Wipe all messages in this session',
    kind: 'action',
    actionKey: 'clear',
  },
  {
    trigger: '/fork',
    label: 'Fork from last message',
    description: 'Branch a new conversation from the most recent message',
    kind: 'action',
    actionKey: 'fork',
  },
  {
    trigger: '/new',
    label: 'New chat',
    description: 'Start a fresh conversation',
    kind: 'action',
    actionKey: 'new',
  },
  {
    trigger: '/multiverse',
    label: 'Open Multiverse',
    description: 'Visualize the full conversation fork tree',
    kind: 'action',
    actionKey: 'multiverse',
  },
]

export function findSlashMatches(input: string): SlashCommand[] {
  if (!input.startsWith('/')) return []
  const parts = input.slice(1).split(/\s+/)
  const trigger = parts[0].toLowerCase()
  if (!trigger) return SLASH_COMMANDS
  return SLASH_COMMANDS.filter((c) => c.trigger.slice(1).startsWith(trigger))
}

export function applySlashCommand(
  input: string,
  cmd: SlashCommand,
): { kind: SlashKind; payload: string; actionKey?: string } {
  const argsStart = input.indexOf(' ')
  const args = argsStart > -1 ? input.slice(argsStart + 1) : ''
  if (cmd.kind === 'transform' && cmd.transform) {
    return { kind: 'transform', payload: cmd.transform(args.trim() || input) }
  }
  return { kind: 'action', payload: args, actionKey: cmd.actionKey }
}
