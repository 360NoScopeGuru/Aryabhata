import { describe, expect, it } from 'vitest'

import { fuzzyMatch, highlight } from './fuzzyMatch'

describe('fuzzyMatch', () => {
  it('returns a zero-score match for an empty query', () => {
    expect(fuzzyMatch('anything', '')).toEqual({ score: 0, positions: [] })
  })

  it('returns null when the query characters are not all present in order', () => {
    expect(fuzzyMatch('llama', 'xyz')).toBeNull()
    expect(fuzzyMatch('abc', 'cab')).toBeNull() // right chars, wrong order
  })

  it('matches subsequences regardless of contiguity', () => {
    // "llama-3.1-70b-instruct" — l(0) l(1) a(2) m(3) a(4) -(5) 3(6) .(7) 1(8) -(9) 7(10) 0(11) b(12)...
    const result = fuzzyMatch('llama-3.1-70b-instruct', 'l3170')
    expect(result).not.toBeNull()
    expect(result!.positions).toEqual([0, 6, 8, 10, 11])
  })

  it('is case-insensitive', () => {
    expect(fuzzyMatch('Llama', 'LLAMA')).not.toBeNull()
    expect(fuzzyMatch('LLAMA', 'llama')).not.toBeNull()
  })

  it('scores word-boundary matches higher than mid-word matches', () => {
    // "m" at the start of "mistral" is a word-boundary match (bonus +6).
    const boundary = fuzzyMatch('mistral', 'm')
    // "m" inside "llama" (4th char) is not at a boundary.
    const midWord = fuzzyMatch('llama', 'm')
    expect(boundary!.score).toBeGreaterThan(midWord!.score)
  })

  it('scores consecutive matches higher than scattered ones (holding word-boundary status equal)', () => {
    // Neither string has boundary characters after the first, so this isolates
    // the consecutive-match bonus from the (separately tested) boundary bonus.
    const consecutive = fuzzyMatch('xabcxxx', 'abc')
    const scattered = fuzzyMatch('xaxbxcx', 'abc')
    expect(consecutive!.score).toBeGreaterThan(scattered!.score)
  })

  it('penalizes longer text so shorter labels rank higher for the same match', () => {
    const short = fuzzyMatch('gpt', 'gpt')
    const long = fuzzyMatch('gpt-extremely-long-model-name-suffix', 'gpt')
    expect(short!.score).toBeGreaterThan(long!.score)
  })
})

describe('highlight', () => {
  it('returns the whole text unmatched when there are no positions', () => {
    expect(highlight('hello', [])).toEqual([{ text: 'hello', matched: false }])
  })

  it('splits text into matched/unmatched segments at the given positions', () => {
    expect(highlight('hello', [0, 4])).toEqual([
      { text: 'h', matched: true },
      { text: 'ell', matched: false },
      { text: 'o', matched: true },
    ])
  })

  it('handles consecutive matched positions without an empty gap segment', () => {
    expect(highlight('ab', [0, 1])).toEqual([
      { text: 'a', matched: true },
      { text: 'b', matched: true },
    ])
  })
})
