import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

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
  return (
    <DropdownMenu.Root
      open
      onOpenChange={(open) => { if (!open) onClose() }}
    >
      <DropdownMenu.Trigger asChild>
        <div style={{ position: 'fixed', top: y, left: x, width: 0, height: 0, pointerEvents: 'none' }} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="ctx-menu"
          sideOffset={2}
          align="start"
          onEscapeKeyDown={onClose}
          onInteractOutside={onClose}
        >
          {items.map((item, i) =>
            item.separator ? (
              <DropdownMenu.Separator key={i} className="ctx-sep" />
            ) : (
              <DropdownMenu.Item
                key={i}
                className={`ctx-item${item.danger ? ' ctx-item-danger' : ''}`}
                disabled={item.disabled}
                onSelect={item.onSelect}
              >
                <span>{item.label}</span>
                {item.shortcut && <span className="ctx-shortcut">{item.shortcut}</span>}
              </DropdownMenu.Item>
            )
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
