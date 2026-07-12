import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { cn, formatDate } from './utils'

describe('cn', () => {
  it('merges class names and resolves Tailwind conflicts (last one wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('drops falsy values', () => {
    const disabled = false
    expect(cn('a', disabled && 'b', undefined, null, 'c')).toBe('a c')
  })
})

describe('formatDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" for timestamps under a minute old', () => {
    expect(formatDate('2026-01-01T11:59:30Z')).toBe('just now')
  })

  it('returns minutes for timestamps under an hour old', () => {
    expect(formatDate('2026-01-01T11:45:00Z')).toBe('15m ago')
  })

  it('returns hours for timestamps under a day old', () => {
    expect(formatDate('2026-01-01T09:00:00Z')).toBe('3h ago')
  })

  it('returns days for timestamps under a week old', () => {
    expect(formatDate('2025-12-30T12:00:00Z')).toBe('2d ago')
  })

  it('falls back to a locale date string for timestamps over a week old', () => {
    const result = formatDate('2025-12-01T12:00:00Z')
    expect(result).not.toContain('ago')
  })
})
