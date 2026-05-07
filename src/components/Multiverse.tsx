import { useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore, type Conversation } from '@/store/appStore'
import { generateDNA } from '@/lib/dnaGenerator'

interface Props {
  open: boolean
  onClose: () => void
  onJump: (id: string) => void
}

interface NodeLayout {
  conv: Conversation
  x: number
  y: number
  depth: number
  parentId: string | null
}

interface TreeRoot {
  conv: Conversation
  children: TreeRoot[]
}

const MODE_COLORS: Record<string, string> = {
  chat: '#7ad7ff',
  code: '#a5b4fc',
  image: '#fed7aa',
}

function buildForest(conversations: Conversation[]): TreeRoot[] {
  const byId = new Map<string, TreeRoot>()
  conversations.forEach(c => byId.set(c.id, { conv: c, children: [] }))
  const roots: TreeRoot[] = []
  conversations.forEach(c => {
    const node = byId.get(c.id)!
    if (c.forked_from && byId.has(c.forked_from)) {
      byId.get(c.forked_from)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}

// Layout each tree using a simple recursive walker — depth on x-axis,
// in-order traversal on y. Returns absolute coordinates.
function layoutForest(forest: TreeRoot[]): { nodes: NodeLayout[]; width: number; height: number } {
  const nodes: NodeLayout[] = []
  const colW = 220
  const rowH = 56
  let cursorY = 0

  const walk = (node: TreeRoot, depth: number, parentId: string | null): number => {
    if (node.children.length === 0) {
      const y = cursorY * rowH
      nodes.push({ conv: node.conv, x: depth * colW, y, depth, parentId })
      cursorY++
      return y
    }
    const childYs = node.children.map(child => walk(child, depth + 1, node.conv.id))
    const y = (childYs[0] + childYs[childYs.length - 1]) / 2
    nodes.push({ conv: node.conv, x: depth * colW, y, depth, parentId })
    return y
  }

  forest.forEach(root => walk(root, 0, null))

  const maxX = nodes.reduce((m, n) => Math.max(m, n.x), 0)
  const maxY = nodes.reduce((m, n) => Math.max(m, n.y), 0)
  return { nodes, width: maxX + colW, height: maxY + rowH }
}

export default function Multiverse({ open, onClose, onJump }: Props) {
  const { conversations, activeConversationId } = useAppStore()
  const [hover, setHover] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const layout = useMemo(() => {
    const filtered = filter
      ? conversations.filter(c => c.title.toLowerCase().includes(filter.toLowerCase()))
      : conversations
    const forest = buildForest(filtered)
    return layoutForest(forest)
  }, [conversations, filter])

  const positionsById = useMemo(() => {
    const m = new Map<string, NodeLayout>()
    layout.nodes.forEach(n => m.set(n.conv.id, n))
    return m
  }, [layout])

  const stats = useMemo(() => {
    const forks = conversations.filter(c => c.forked_from).length
    const roots = conversations.length - forks
    const maxDepth = layout.nodes.reduce((m, n) => Math.max(m, n.depth), 0)
    return { total: conversations.length, forks, roots, maxDepth: maxDepth + 1 }
  }, [conversations, layout])

  if (!open) return null

  const padding = 40
  const svgW = layout.width + padding * 2
  const svgH = layout.height + padding * 2

  return createPortal(
    <div className="mv-scrim" onClick={onClose}>
      <div className="mv-modal" onClick={e => e.stopPropagation()}>
        <div className="mv-head">
          <div className="mv-title">
            <span className="mv-glyph">🌌</span>
            <span>Multiverse</span>
            <span className="mv-sub">{stats.total} sessions · {stats.roots} roots · {stats.forks} forks · max depth {stats.maxDepth}</span>
          </div>
          <input
            className="mv-filter-input"
            placeholder="Filter by title…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <button className="mv-close" onClick={onClose}>×</button>
        </div>

        <div className="mv-canvas-wrap">
          {layout.nodes.length === 0 ? (
            <div className="mv-empty">No conversations match</div>
          ) : (
            <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
              {/* Background grid for depth */}
              <defs>
                <pattern id="mv-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="20" cy="20" r="0.6" fill="currentColor" opacity="0.08"/>
                </pattern>
              </defs>
              <rect width={svgW} height={svgH} fill="url(#mv-grid)"/>

              {/* Edges (parent → child) */}
              {layout.nodes.map(n => {
                if (!n.parentId) return null
                const p = positionsById.get(n.parentId)
                if (!p) return null
                const x1 = p.x + padding + 14
                const y1 = p.y + padding + 18
                const x2 = n.x + padding - 14
                const y2 = n.y + padding + 18
                const midX = (x1 + x2) / 2
                return (
                  <path
                    key={`e-${n.conv.id}`}
                    d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="0.75"
                    opacity={hover === n.conv.id || hover === n.parentId ? 1 : 0.3}
                  />
                )
              })}

              {/* Nodes */}
              {layout.nodes.map(n => {
                const x = n.x + padding
                const y = n.y + padding
                const isActive = n.conv.id === activeConversationId
                const isHover = hover === n.conv.id
                const c = MODE_COLORS[n.conv.mode] ?? '#7ad7ff'
                return (
                  <g
                    key={n.conv.id}
                    transform={`translate(${x},${y})`}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHover(n.conv.id)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => { onJump(n.conv.id); onClose() }}
                  >
                    <rect
                      x={0} y={0} width={200} height={36} rx={6}
                      fill="var(--surface)"
                      stroke={isActive ? c : (isHover ? c : 'var(--line-soft)')}
                      strokeWidth={isActive ? 1.4 : 0.75}
                      opacity={0.95}
                    />
                    <g transform="translate(8,8)" style={{ color: c }}
                       dangerouslySetInnerHTML={{ __html: generateDNA(n.conv.id, { size: 20 }) }}
                    />
                    <text x={36} y={16} fill="var(--ink)" fontSize="10" fontFamily="var(--mono)" letterSpacing="0.06em">
                      {n.conv.title.length > 22 ? n.conv.title.slice(0, 21) + '…' : n.conv.title}
                    </text>
                    <text x={36} y={28} fill="var(--ink-faint)" fontSize="8" fontFamily="var(--mono)" letterSpacing="0.12em">
                      {n.conv.mode.toUpperCase()}
                      {n.conv.pinned && ' · 📌'}
                      {n.conv.forked_from && ' · ⑂'}
                    </text>
                  </g>
                )
              })}
            </svg>
          )}
        </div>

        <div className="mv-foot">
          <span>Click a node to jump to that conversation. Forks branch right.</span>
          <span style={{ marginLeft: 'auto' }}>
            <span className="mv-legend"><i style={{ background: MODE_COLORS.chat }}/> Chat</span>
            <span className="mv-legend"><i style={{ background: MODE_COLORS.code }}/> Code</span>
            <span className="mv-legend"><i style={{ background: MODE_COLORS.image }}/> Image</span>
          </span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
