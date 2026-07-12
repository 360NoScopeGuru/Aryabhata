// Fuzzy string matcher with positional scoring.
// Matches by sequential character matching; bonuses for word boundaries
// and consecutive matches; penalty for length.

export interface MatchResult {
  score: number
  positions: number[]
}

const WORD_BOUNDARY = /[\s\-_/.]/

export function fuzzyMatch(text: string, query: string): MatchResult | null {
  if (!query) return { score: 0, positions: [] }

  const t = text.toLowerCase()
  const q = query.toLowerCase()

  let score = 0
  let qi = 0
  let lastMatch = -2
  const positions: number[] = []

  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      positions.push(i)
      let bonus = 1
      if (i === lastMatch + 1) bonus += 4 // consecutive
      if (i === 0 || WORD_BOUNDARY.test(t[i - 1])) bonus += 6 // word boundary
      score += bonus
      lastMatch = i
      qi++
    }
  }

  if (qi < q.length) return null

  // Penalize unmatched length so shorter labels rank higher when content matches
  score -= text.length * 0.1
  return { score, positions }
}

export function highlight(
  text: string,
  positions: number[],
): Array<{ text: string; matched: boolean }> {
  if (positions.length === 0) return [{ text, matched: false }]
  const out: Array<{ text: string; matched: boolean }> = []
  let cursor = 0
  for (const pos of positions) {
    if (pos > cursor) out.push({ text: text.slice(cursor, pos), matched: false })
    out.push({ text: text[pos], matched: true })
    cursor = pos + 1
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), matched: false })
  return out
}
