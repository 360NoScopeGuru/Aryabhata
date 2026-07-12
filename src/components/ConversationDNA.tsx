import { useMemo } from 'react'

import { generateDNA } from '@/lib/dnaGenerator'

interface Props {
  seed: string
  size?: number
  className?: string
  title?: string
}

// Renders a deterministic generative SVG fingerprint for a conversation.
// `seed` should be unique per conversation (typically the conversation ID,
// optionally combined with a content hash to make it evolve as messages
// are added).
export default function ConversationDNA({ seed, size = 22, className, title }: Props) {
  const svg = useMemo(() => generateDNA(seed, { size }), [seed, size])
  return (
    <span
      className={`conv-dna ${className ?? ''}`}
      style={{ width: size, height: size, display: 'inline-flex' }}
      title={title ?? 'Conversation fingerprint'}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
