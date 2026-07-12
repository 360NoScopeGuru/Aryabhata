import type { Conversation, Message } from '@/store/appStore'

export function exportConversation(
  convId: string,
  conversations: Conversation[],
  messages: Record<string, Message[]>,
) {
  const conv = conversations.find((c) => c.id === convId)
  const msgs = messages[convId] ?? []
  if (!conv || msgs.length === 0) return
  const lines = [`# ${conv.title}\n`]
  msgs.forEach((m) => {
    const role = m.role === 'user' ? '**You**' : `**Assistant** (${m.model ?? 'AI'})`
    lines.push(`${role}\n\n${m.content}\n\n---\n`)
  })
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${conv.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`
  a.click()
  URL.revokeObjectURL(a.href)
}
