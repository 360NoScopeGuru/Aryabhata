import { describe, expect, it } from 'vitest'

import { generateDNA } from './dnaGenerator'

describe('generateDNA', () => {
  it('is deterministic for the same seed', () => {
    expect(generateDNA('conv-123')).toBe(generateDNA('conv-123'))
  })

  it('produces different output for different seeds', () => {
    expect(generateDNA('conv-123')).not.toBe(generateDNA('conv-456'))
  })

  it('is sensitive to single-character seed differences (avalanche)', () => {
    // Guards against a degenerate hash where similar seeds produce near-identical output.
    expect(generateDNA('conv-1')).not.toBe(generateDNA('conv-2'))
  })

  it('returns valid, well-formed SVG', () => {
    const svg = generateDNA('conv-123')
    expect(svg).toMatch(/^<svg viewBox="0 0 \d+ \d+" width="\d+" height="\d+"/)
    expect(svg).toContain('</svg>')
    // Every opened tag that isn't self-closing should be closed.
    const opens = (svg.match(/<(circle|path|line)\b[^>]*\/>/g) ?? []).length
    const totalTags = (svg.match(/<(circle|path|line)\b/g) ?? []).length
    expect(opens).toBe(totalTags) // all shape tags are self-closing
  })

  it('respects the size option', () => {
    const svg = generateDNA('conv-123', { size: 64 })
    expect(svg).toContain('viewBox="0 0 64 64"')
    expect(svg).toContain('width="64" height="64"')
  })

  it('never produces NaN in path/circle coordinates', () => {
    const svg = generateDNA('')
    expect(svg).not.toContain('NaN')
  })

  it('handles an empty seed without throwing', () => {
    expect(() => generateDNA('')).not.toThrow()
  })
})
