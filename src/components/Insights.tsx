import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { useAuthFetch } from '@/hooks/useAuthFetch'
import { MIXING_MODELS, useAppStore } from '@/store/appStore'

interface Props {
  open: boolean
  onClose: () => void
}

interface ModelBenchmark {
  model_id: string
  message_count: number
  avg_ttft_ms: number | null
  avg_latency_ms: number | null
  tokens_per_sec: number
  total_cost_usd: number
  wins: number
  total_rounds: number
  win_rate: number | null
  last_used_at: string
}

const DAY_MS = 86_400_000
const WEEKS = 26 // ~6 months of contribution heatmap

function startOfDay(t: number): number {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export default function Insights({ open, onClose }: Props) {
  const { conversations, messages, sessionTokens, threadCount } = useAppStore()
  const authFetch = useAuthFetch()
  const [benchmarks, setBenchmarks] = useState<ModelBenchmark[]>([])
  const [benchmarksLoading, setBenchmarksLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- this is a data-fetching effect (React's own documented use case for effects), not the derived-state anti-pattern the rule targets
    setBenchmarksLoading(true)
    authFetch('/api/eval/models')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setBenchmarks(Array.isArray(data) ? data : []))
      .catch(() => setBenchmarks([]))
      .finally(() => setBenchmarksLoading(false))
  }, [open, authFetch])

  const stats = useMemo(() => {
    let totalMessages = 0
    let totalAssistant = 0
    let totalUser = 0
    let totalOutputTokens = 0
    let totalLatency = 0
    let latencyCount = 0
    let totalTtft = 0
    let ttftCount = 0
    const modelCount = new Map<string, number>()
    const modelTokens = new Map<string, number>()
    const dayActivity = new Map<number, number>() // day -> token count
    const hourActivity = new Array(24).fill(0) // local hour -> messages

    for (const list of Object.values(messages)) {
      for (const m of list) {
        totalMessages++
        if (m.role === 'assistant') totalAssistant++
        else totalUser++
        if (m.outputTokens) {
          totalOutputTokens += m.outputTokens
          if (m.model) {
            modelTokens.set(m.model, (modelTokens.get(m.model) ?? 0) + m.outputTokens)
          }
        }
        if (m.latency) {
          totalLatency += m.latency
          latencyCount++
        }
        if (m.ttft) {
          totalTtft += m.ttft
          ttftCount++
        }
        if (m.model) {
          modelCount.set(m.model, (modelCount.get(m.model) ?? 0) + 1)
        }
        const t = new Date(m.created_at).getTime()
        const day = startOfDay(t)
        dayActivity.set(
          day,
          (dayActivity.get(day) ?? 0) + (m.outputTokens ?? Math.ceil(m.content.length / 4)),
        )
        const hour = new Date(t).getHours()
        hourActivity[hour]++
      }
    }

    const topModels = Array.from(modelCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, count]) => ({
        id,
        info: MIXING_MODELS.find((m) => m.id === id),
        count,
        tokens: modelTokens.get(id) ?? 0,
      }))

    return {
      totalConversations: conversations.length,
      totalMessages,
      totalAssistant,
      totalUser,
      totalOutputTokens,
      avgLatency: latencyCount > 0 ? totalLatency / latencyCount : 0,
      avgTtft: ttftCount > 0 ? totalTtft / ttftCount : 0,
      topModels,
      dayActivity,
      hourActivity,
      pinnedCount: conversations.filter((c) => c.pinned).length,
      forkedCount: conversations.filter((c) => c.forked_from).length,
    }
  }, [conversations, messages])

  // Build the calendar heatmap grid (7 rows × WEEKS cols, ending today).
  // useState's lazy initializer computes this once at mount rather than on
  // every render, which is the sanctioned way to capture an impure value.
  const [today] = useState(() => startOfDay(Date.now()))
  const heatmap = useMemo(() => {
    // Find the start: WEEKS weeks ago, aligned to Sunday
    const todayDay = new Date(today).getDay()
    const start = today - todayDay * DAY_MS - (WEEKS - 1) * 7 * DAY_MS
    const max = Math.max(1, ...Array.from(stats.dayActivity.values()))
    const cells: { x: number; y: number; date: number; tokens: number; intensity: number }[] = []
    for (let w = 0; w < WEEKS; w++) {
      for (let d = 0; d < 7; d++) {
        const date = start + (w * 7 + d) * DAY_MS
        if (date > today) continue
        const tokens = stats.dayActivity.get(date) ?? 0
        cells.push({ x: w, y: d, date, tokens, intensity: Math.min(1, tokens / max) })
      }
    }
    return { cells, max }
  }, [stats.dayActivity, today])

  if (!open) return null

  const cellSize = 12
  const cellGap = 3
  const heatmapW = WEEKS * (cellSize + cellGap)
  const heatmapH = 7 * (cellSize + cellGap)

  const maxHourCount = Math.max(1, ...stats.hourActivity)
  const maxModelCount = Math.max(1, ...stats.topModels.map((m) => m.count))

  return createPortal(
    <div className="ins-scrim" onClick={onClose}>
      <div className="ins-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ins-head">
          <span className="ins-title">📊 Insights</span>
          <span className="ins-sub">Personal analytics across all your conversations</span>
          <button className="ins-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="ins-grid">
          {/* Top stat cards */}
          <div className="ins-card ins-stat">
            <div className="ins-stat-val">{stats.totalConversations}</div>
            <div className="ins-stat-key">Sessions</div>
          </div>
          <div className="ins-card ins-stat">
            <div className="ins-stat-val">{stats.totalMessages}</div>
            <div className="ins-stat-key">Messages</div>
          </div>
          <div className="ins-card ins-stat">
            <div className="ins-stat-val">{stats.totalOutputTokens.toLocaleString()}</div>
            <div className="ins-stat-key">Output Tokens</div>
          </div>
          <div className="ins-card ins-stat">
            <div className="ins-stat-val">
              {Math.round(stats.totalOutputTokens * 0.0023)}
              <span style={{ fontSize: 11, opacity: 0.6 }}> g</span>
            </div>
            <div className="ins-stat-key">CO₂ est.</div>
          </div>
          <div className="ins-card ins-stat">
            <div className="ins-stat-val">
              {stats.avgTtft > 0 ? Math.round(stats.avgTtft) + 'ms' : '—'}
            </div>
            <div className="ins-stat-key">Avg TTFT</div>
          </div>
          <div className="ins-card ins-stat">
            <div className="ins-stat-val">{threadCount}</div>
            <div className="ins-stat-key">Threads</div>
          </div>
          <div className="ins-card ins-stat">
            <div className="ins-stat-val">{stats.forkedCount}</div>
            <div className="ins-stat-key">Forks</div>
          </div>
          <div className="ins-card ins-stat">
            <div className="ins-stat-val">{sessionTokens.toLocaleString()}</div>
            <div className="ins-stat-key">Session tok</div>
          </div>

          {/* Activity heatmap */}
          <div className="ins-card ins-wide">
            <div className="ins-card-title">Activity · last {WEEKS} weeks</div>
            <svg width={heatmapW} height={heatmapH + 18} className="ins-heatmap">
              {heatmap.cells.map((cell, i) => (
                <rect
                  key={i}
                  x={cell.x * (cellSize + cellGap)}
                  y={cell.y * (cellSize + cellGap)}
                  width={cellSize}
                  height={cellSize}
                  rx={2}
                  fill="var(--accent)"
                  fillOpacity={cell.tokens === 0 ? 0.06 : 0.12 + cell.intensity * 0.85}
                >
                  <title>
                    {new Date(cell.date).toDateString()} — {cell.tokens.toLocaleString()} tokens
                  </title>
                </rect>
              ))}
              <text
                x={0}
                y={heatmapH + 14}
                fontSize={9}
                fill="var(--ink-faint)"
                fontFamily="var(--mono)"
              >
                less
              </text>
              {[0.1, 0.3, 0.6, 1].map((o, i) => (
                <rect
                  key={i}
                  x={28 + i * 14}
                  y={heatmapH + 5}
                  width={10}
                  height={10}
                  rx={2}
                  fill="var(--accent)"
                  fillOpacity={o}
                />
              ))}
              <text
                x={88}
                y={heatmapH + 14}
                fontSize={9}
                fill="var(--ink-faint)"
                fontFamily="var(--mono)"
              >
                more · peak {heatmap.max.toLocaleString()} tok
              </text>
            </svg>
          </div>

          {/* Top models */}
          <div className="ins-card ins-half">
            <div className="ins-card-title">Top Models · by message count</div>
            {stats.topModels.length === 0 ? (
              <div className="ins-empty">No model usage yet</div>
            ) : (
              <div className="ins-bar-list">
                {stats.topModels.map((m) => (
                  <div key={m.id} className="ins-bar-row">
                    <span
                      className="ins-bar-dot"
                      style={{ background: m.info?.color ?? 'var(--accent)' }}
                    />
                    <span className="ins-bar-label">{m.info?.label ?? m.id.split('/').pop()}</span>
                    <div className="ins-bar-track">
                      <div
                        className="ins-bar-fill"
                        style={{
                          width: `${(m.count / maxModelCount) * 100}%`,
                          background: m.info?.color ?? 'var(--accent)',
                        }}
                      />
                    </div>
                    <span className="ins-bar-val">{m.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Model eval / benchmarks — server-measured, not synthetic */}
          <div className="ins-card ins-wide">
            <div className="ins-card-title">
              Model Benchmarks · latency, cost &amp; win rate from real usage
            </div>
            {benchmarksLoading ? (
              <div className="ins-empty">Loading…</div>
            ) : benchmarks.length === 0 ? (
              <div className="ins-empty">
                No completed generations yet — send a message to start building benchmarks
              </div>
            ) : (
              <div className="ins-bench-table">
                <div className="ins-bench-row ins-bench-head">
                  <span>Model</span>
                  <span>Msgs</span>
                  <span>TTFT</span>
                  <span>Tok/s</span>
                  <span>Cost (est.)</span>
                  <span>Win rate</span>
                </div>
                {benchmarks.map((b) => {
                  const info = MIXING_MODELS.find((m) => m.id === b.model_id)
                  return (
                    <div key={b.model_id} className="ins-bench-row">
                      <span className="ins-bar-label">
                        <span
                          className="ins-bar-dot"
                          style={{ background: info?.color ?? 'var(--accent)' }}
                        />
                        {info?.label ?? b.model_id.split('/').pop()}
                      </span>
                      <span>{b.message_count}</span>
                      <span>{b.avg_ttft_ms != null ? `${b.avg_ttft_ms}ms` : '—'}</span>
                      <span>{b.tokens_per_sec.toFixed(1)}</span>
                      <span>${b.total_cost_usd.toFixed(4)}</span>
                      <span>{b.win_rate != null ? `${Math.round(b.win_rate * 100)}%` : '—'}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Hour-of-day radial */}
          <div className="ins-card ins-half">
            <div className="ins-card-title">Active Hours · local time</div>
            <svg
              viewBox="-110 -110 220 220"
              width="180"
              height="180"
              style={{ display: 'block', margin: '0 auto' }}
            >
              <circle
                r="100"
                fill="none"
                stroke="var(--line-soft)"
                strokeWidth="0.5"
                opacity="0.4"
              />
              <circle
                r="60"
                fill="none"
                stroke="var(--line-soft)"
                strokeWidth="0.5"
                opacity="0.25"
              />
              <circle
                r="20"
                fill="none"
                stroke="var(--line-soft)"
                strokeWidth="0.5"
                opacity="0.2"
              />
              {stats.hourActivity.map((count, h) => {
                const a = (h / 24) * 2 * Math.PI - Math.PI / 2
                const r = 20 + (count / maxHourCount) * 80
                const x1 = Math.cos(a) * 20
                const y1 = Math.sin(a) * 20
                const x2 = Math.cos(a) * r
                const y2 = Math.sin(a) * r
                return (
                  <line
                    key={h}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="var(--accent)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    opacity={count === 0 ? 0.15 : 0.85}
                  >
                    <title>
                      {h}:00 — {count} messages
                    </title>
                  </line>
                )
              })}
              {[0, 6, 12, 18].map((h) => {
                const a = (h / 24) * 2 * Math.PI - Math.PI / 2
                const x = Math.cos(a) * 105
                const y = Math.sin(a) * 105 + 3
                return (
                  <text
                    key={h}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    fill="var(--ink-faint)"
                    fontSize="8"
                    fontFamily="var(--mono)"
                  >
                    {String(h).padStart(2, '0')}
                  </text>
                )
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
