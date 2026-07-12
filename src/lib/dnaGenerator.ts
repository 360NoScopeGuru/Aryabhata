// Generative SVG fingerprint per conversation.
// Deterministic — same seed always produces the same pattern.

export interface DNAOptions {
  size?: number
  strokeWidth?: number
  density?: number
}

function fnv1a(seed: string): number {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function makeRng(seed: string) {
  let s = fnv1a(seed) || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

export function generateDNA(seed: string, opts: DNAOptions = {}): string {
  const { size = 28, strokeWidth = 0.55, density = 1 } = opts
  const rng = makeRng(seed)
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.42

  const out: string[] = []

  // Outer faint ring (always present — anchor)
  out.push(
    `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(2)}" fill="none" stroke="currentColor" stroke-width="${(strokeWidth * 0.6).toFixed(2)}" opacity="0.25"/>`,
  )

  // Asymmetric arc segments on the ring
  const arcCount = 2 + Math.floor(rng() * 4)
  for (let i = 0; i < arcCount; i++) {
    const start = rng() * 360
    const sweep = 18 + rng() * 90
    const end = start + sweep
    const sx = cx + Math.cos((start * Math.PI) / 180) * r
    const sy = cy + Math.sin((start * Math.PI) / 180) * r
    const ex = cx + Math.cos((end * Math.PI) / 180) * r
    const ey = cy + Math.sin((end * Math.PI) / 180) * r
    const large = sweep > 180 ? 1 : 0
    out.push(
      `<path d="M${sx.toFixed(2)},${sy.toFixed(2)} A${r.toFixed(2)},${r.toFixed(2)} 0 ${large} 1 ${ex.toFixed(2)},${ey.toFixed(2)}" fill="none" stroke="currentColor" stroke-width="${strokeWidth.toFixed(2)}" opacity="0.85"/>`,
    )
  }

  // Spokes — varying length from inner radius to outer
  const spokeCount = 5 + Math.floor(rng() * 8 * density)
  for (let i = 0; i < spokeCount; i++) {
    const a = (i / spokeCount) * 2 * Math.PI + rng() * 0.18
    const len = 0.18 + rng() * 0.6
    const x1 = cx + Math.cos(a) * r * 0.18
    const y1 = cy + Math.sin(a) * r * 0.18
    const x2 = cx + Math.cos(a) * r * len
    const y2 = cy + Math.sin(a) * r * len
    out.push(
      `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="currentColor" stroke-width="${(strokeWidth * 0.85).toFixed(2)}" opacity="${(0.4 + rng() * 0.4).toFixed(2)}"/>`,
    )
  }

  // Anchor pips outside the ring
  const pipCount = 2 + Math.floor(rng() * 4)
  for (let i = 0; i < pipCount; i++) {
    const a = rng() * 2 * Math.PI
    const px = cx + Math.cos(a) * (r + 1.2)
    const py = cy + Math.sin(a) * (r + 1.2)
    const radius = 0.5 + rng() * 0.6
    out.push(
      `<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="${radius.toFixed(2)}" fill="currentColor"/>`,
    )
  }

  // Inner core: ring + dot
  const coreR = r * 0.18 * (0.7 + rng() * 0.5)
  out.push(
    `<circle cx="${cx}" cy="${cy}" r="${coreR.toFixed(2)}" fill="none" stroke="currentColor" stroke-width="${(strokeWidth * 0.85).toFixed(2)}"/>`,
  )
  out.push(`<circle cx="${cx}" cy="${cy}" r="0.7" fill="currentColor"/>`)

  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${out.join('')}</svg>`
}
