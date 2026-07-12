import { useEffect } from 'react'

import { type SlashCommand } from '@/lib/slashCommands'

interface Props {
  commands: SlashCommand[]
  activeIdx: number
  onPick: (cmd: SlashCommand) => void
  onSetIdx: (i: number) => void
}

export default function SlashMenu({ commands, activeIdx, onPick, onSetIdx }: Props) {
  // Keep selection in view when navigating with keyboard
  useEffect(() => {
    const el = document.querySelector<HTMLDivElement>(`.slash-menu [data-idx="${activeIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  if (commands.length === 0) return null

  return (
    <div className="slash-menu">
      <div className="slash-menu-head">SLASH COMMANDS</div>
      {commands.map((cmd, i) => (
        <div
          key={cmd.trigger}
          data-idx={i}
          className={`slash-row ${i === activeIdx ? 'active' : ''}`}
          onMouseEnter={() => onSetIdx(i)}
          onMouseDown={(e) => {
            e.preventDefault()
            onPick(cmd)
          }}
        >
          <span className="slash-trigger">{cmd.trigger}</span>
          <span className="slash-label">{cmd.label}</span>
          <span className="slash-desc">{cmd.description}</span>
          <span className={`slash-kind ${cmd.kind}`}>{cmd.kind === 'transform' ? '✎' : '⚡'}</span>
        </div>
      ))}
    </div>
  )
}
