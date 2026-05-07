import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export interface ContextMenuItem {
  label: string
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  separator?: boolean
  onSelect: () => void
}

interface Props {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Clamp to viewport so the menu never goes off-screen
  const vw = window.innerWidth
  const vh = window.innerHeight
  const estW = 200
  const estH = items.length * 34
  const left = Math.min(x, vw - estW - 8)
  const top  = Math.min(y, vh - estH - 8)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={menuRef}
      className="ctx-menu"
      style={{ position: 'fixed', top, left, zIndex: 9999 }}
      onMouseDown={e => e.stopPropagation()}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="ctx-sep" />
        ) : (
          <button
            key={i}
            className={`ctx-item${item.danger ? ' ctx-item-danger' : ''}`}
            disabled={item.disabled}
            onClick={() => { item.onSelect(); onClose() }}
          >
            <span>{item.label}</span>
            {item.shortcut && <span className="ctx-shortcut">{item.shortcut}</span>}
          </button>
        )
      )}
    </div>,
    document.body,
  )
}
