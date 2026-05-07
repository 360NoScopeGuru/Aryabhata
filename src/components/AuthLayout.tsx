import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { generateDNA } from '@/lib/dnaGenerator'
import { useAppStore } from '@/store/appStore'

interface Props {
  mode: 'signin' | 'signup'
  children: ReactNode
}

interface BootLine {
  prefix: string
  text: string
  status?: 'ok' | 'wait'
  delayMs: number
}

const BOOT_SEQUENCE: BootLine[] = [
  { prefix: 'SYS', text: 'aryabhata kernel · v3.0',          status: 'ok', delayMs: 320 },
  { prefix: 'NET', text: 'NVIDIA NIM gateway',                status: 'ok', delayMs: 220 },
  { prefix: 'DB',  text: 'neon postgres · pooled',            status: 'ok', delayMs: 220 },
  { prefix: 'IDX', text: 'fingerprint generator',             status: 'ok', delayMs: 180 },
  { prefix: 'AUT', text: 'clerk JWKS · awaiting identity',    status: 'wait', delayMs: 600 },
]

const STATS = [
  { k: 'MODELS',   v: '40' },
  { k: 'THEMES',   v: '05' },
  { k: 'STREAMS',  v: 'SSE' },
  { k: 'BLEND',    v: '×5' },
  { k: 'CTX',      v: '128K' },
]

// A drifting DNA particle with deterministic seed and animated trajectory.
interface Particle {
  id: number
  seed: string
  x: number          // 0–100 (vw %)
  y: number          // 0–100 (vh %)
  size: number       // px
  duration: number   // s — time to drift across viewport
  delay: number      // s — initial offset
  opacity: number
}

function buildParticles(count: number): Particle[] {
  const out: Particle[] = []
  for (let i = 0; i < count; i++) {
    out.push({
      id: i,
      seed: `auth-particle-${i}-${Math.random().toString(36).slice(2, 8)}`,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 24 + Math.random() * 56,
      duration: 38 + Math.random() * 40,
      delay: -Math.random() * 30,
      opacity: 0.12 + Math.random() * 0.18,
    })
  }
  return out
}

export default function AuthLayout({ mode, children }: Props) {
  // Apply persisted theme on auth routes (App.tsx never mounts here)
  const theme = useAppStore(s => s.theme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // Boot-sequence typewriter
  const [bootStep, setBootStep] = useState(0)

  useEffect(() => {
    if (bootStep >= BOOT_SEQUENCE.length) return
    const t = setTimeout(() => setBootStep(s => s + 1), BOOT_SEQUENCE[bootStep].delayMs)
    return () => clearTimeout(t)
  }, [bootStep])

  // Drifting DNA particles — generated once per mount
  const particles = useMemo(() => buildParticles(7), [])

  // Live UTC clock for the readout
  const [utc, setUtc] = useState(() => new Date().toISOString().slice(11, 19))
  useEffect(() => {
    const id = setInterval(() => setUtc(new Date().toISOString().slice(11, 19)), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="auth-shell">
      {/* Drifting DNA particle field — sits behind everything */}
      <div className="auth-particles" aria-hidden>
        {particles.map(p => (
          <div
            key={p.id}
            className="auth-particle"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
            dangerouslySetInnerHTML={{ __html: generateDNA(p.seed, { size: p.size }) }}
          />
        ))}
      </div>

      {/* Vertical scan line — sweeps top→bottom */}
      <div className="auth-scanline" aria-hidden />

      {/* Horizontal grid wash */}
      <div className="auth-grid-wash" aria-hidden />

      {/* Registration marks (corners) */}
      {(['tl', 'tr', 'bl', 'br'] as const).map(p => (
        <div key={p} className={`auth-reg auth-reg-${p}`} aria-hidden>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d={p === 'tl' ? 'M14,0 L0,0 L0,14' : p === 'tr' ? 'M0,0 L14,0 L14,14' : p === 'bl' ? 'M0,0 L0,14 L14,14' : 'M14,0 L14,14 L0,14'} stroke="currentColor" strokeWidth="0.75"/>
            <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
          </svg>
        </div>
      ))}

      <div className="auth-grid">
        {/* ── HERO PANEL ─────────────────────────────────────────── */}
        <section className="auth-hero">
          {/* Big animated orbital reticle */}
          <div className="auth-orbital" aria-hidden>
            <svg viewBox="0 0 320 320" width="100%" height="100%">
              <defs>
                <radialGradient id="auth-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18"/>
                  <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.04"/>
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
                </radialGradient>
              </defs>

              {/* Outer halo */}
              <circle cx="160" cy="160" r="155" fill="url(#auth-glow)"/>

              {/* Slow outer ring with tick marks */}
              <g className="orbit-slow">
                <circle cx="160" cy="160" r="140" fill="none" stroke="var(--accent)" strokeWidth="0.5" opacity="0.25" strokeDasharray="2 8"/>
                {Array.from({ length: 24 }).map((_, i) => {
                  const a = (i / 24) * 2 * Math.PI
                  const x1 = 160 + Math.cos(a) * 140
                  const y1 = 160 + Math.sin(a) * 140
                  const x2 = 160 + Math.cos(a) * (i % 6 === 0 ? 130 : 134)
                  const y2 = 160 + Math.sin(a) * (i % 6 === 0 ? 130 : 134)
                  return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--accent)" strokeWidth="0.5" opacity={i % 6 === 0 ? 0.55 : 0.25}/>
                })}
              </g>

              {/* Mid ring — counter rotating, with arc sweep */}
              <g className="orbit-mid">
                <circle cx="160" cy="160" r="105" fill="none" stroke="var(--accent)" strokeWidth="0.5" opacity="0.4"/>
                <path d="M 160 55 A 105 105 0 0 1 245 130" fill="none" stroke="var(--accent)" strokeWidth="1.2" opacity="0.85"/>
                <circle cx="245" cy="130" r="3" fill="var(--accent)"/>
              </g>

              {/* Inner pulse ring */}
              <g className="orbit-fast">
                <circle cx="160" cy="160" r="65" fill="none" stroke="var(--accent)" strokeWidth="0.6" opacity="0.5" strokeDasharray="3 6"/>
              </g>

              {/* Crosshair lines */}
              <line x1="0"   y1="160" x2="40"  y2="160" stroke="var(--accent)" strokeWidth="0.5" opacity="0.5"/>
              <line x1="280" y1="160" x2="320" y2="160" stroke="var(--accent)" strokeWidth="0.5" opacity="0.5"/>
              <line x1="160" y1="0"   x2="160" y2="40"  stroke="var(--accent)" strokeWidth="0.5" opacity="0.5"/>
              <line x1="160" y1="280" x2="160" y2="320" stroke="var(--accent)" strokeWidth="0.5" opacity="0.5"/>

              {/* Center motif — pulsing core */}
              <circle cx="160" cy="160" r="32" fill="none" stroke="var(--accent)" strokeWidth="0.8"/>
              <circle cx="160" cy="160" r="14" fill="none" stroke="var(--accent)" strokeWidth="0.8"/>
              <circle cx="160" cy="160" r="5" fill="var(--accent)" className="orbit-core"/>
            </svg>
          </div>

          {/* Brand mark + product line */}
          <div className="auth-hero-brand">
            <div className="auth-hero-title">ARYABHATA</div>
            <div className="auth-hero-sub">LLM · INSTRUMENT — v3.0 MULTIVERSE</div>
          </div>

          {/* Boot sequence */}
          <div className="auth-boot">
            <div className="auth-boot-head">
              <span>SYSTEM CHECK · {utc} UTC</span>
              <span className="auth-boot-blink">●</span>
            </div>
            {BOOT_SEQUENCE.map((line, i) => {
              const visible = i < bootStep
              const status = i < bootStep
                ? (line.status === 'wait' ? 'WAIT' : 'OK')
                : '....'
              return (
                <div key={i} className={`auth-boot-line ${visible ? 'visible' : ''}`}>
                  <span className="auth-boot-prefix">[{line.prefix}]</span>
                  <span className="auth-boot-text">{line.text}</span>
                  <span className="auth-boot-dots" />
                  <span className={`auth-boot-status ${line.status === 'wait' && i < bootStep ? 'wait' : 'ok'}`}>
                    {status}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Stats ticker */}
          <div className="auth-stats">
            {STATS.map(s => (
              <div key={s.k} className="auth-stat">
                <span className="auth-stat-k">{s.k}</span>
                <span className="auth-stat-v">{s.v}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── FORM PANEL ─────────────────────────────────────────── */}
        <section className="auth-form-panel">
          {/* Top brand on mobile */}
          <div className="auth-form-brand">
            <svg width="36" height="36" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="11" stroke="var(--accent)" strokeWidth="0.75" opacity="0.45"/>
              <circle cx="14" cy="14" r="6.5" stroke="var(--accent)" strokeWidth="0.75"/>
              <circle cx="14" cy="14" r="2.5" fill="var(--accent)"/>
              <line x1="0" y1="14" x2="5.5" y2="14" stroke="var(--accent)" strokeWidth="0.75"/>
              <line x1="22.5" y1="14" x2="28" y2="14" stroke="var(--accent)" strokeWidth="0.75"/>
              <line x1="14" y1="0" x2="14" y2="5.5" stroke="var(--accent)" strokeWidth="0.75"/>
              <line x1="14" y1="22.5" x2="14" y2="28" stroke="var(--accent)" strokeWidth="0.75"/>
            </svg>
            <div>
              <div className="auth-mob-title">ARYABHATA</div>
              <div className="auth-mob-sub">LLM · INSTRUMENT</div>
            </div>
          </div>

          <div className="auth-card-stack">
            <div className="auth-card-frame">
              <span className="auth-card-corner tl"/>
              <span className="auth-card-corner tr"/>
              <span className="auth-card-corner bl"/>
              <span className="auth-card-corner br"/>

              <div className="auth-card-head">
                <span className="auth-card-icon">{mode === 'signin' ? '◉' : '◇'}</span>
                <span className="auth-card-title">
                  {mode === 'signin' ? 'AUTHENTICATE' : 'INITIALIZE'}
                </span>
                <span className="auth-card-meta">
                  {mode === 'signin' ? 'sign-in to continue' : 'create your instrument'}
                </span>
              </div>

              <div className="auth-card-body">
                {children}
              </div>
            </div>

            <div className="auth-card-foot">
              {mode === 'signin' ? (
                <>
                  No identity yet?
                  <Link to="/sign-up" className="auth-foot-link"> Initialize a new instrument →</Link>
                </>
              ) : (
                <>
                  Already commissioned?
                  <Link to="/sign-in" className="auth-foot-link"> Authenticate →</Link>
                </>
              )}
            </div>

            <div className="auth-trust-row">
              <span className="auth-trust"><i/> Clerk · RS256 JWT</span>
              <span className="auth-trust"><i/> Per-user isolation</span>
              <span className="auth-trust"><i/> NVIDIA NIM</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
