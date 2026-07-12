import { describe, expect, it } from 'vitest'

import { applySlashCommand, findSlashMatches, SLASH_COMMANDS } from './slashCommands'

describe('findSlashMatches', () => {
  it('returns nothing for input not starting with /', () => {
    expect(findSlashMatches('hello')).toEqual([])
  })

  it('returns all commands for a bare slash', () => {
    expect(findSlashMatches('/')).toEqual(SLASH_COMMANDS)
  })

  it('filters by trigger prefix', () => {
    const matches = findSlashMatches('/cri')
    expect(matches.map((c) => c.trigger)).toEqual(['/critique'])
  })

  it('is case-insensitive', () => {
    expect(findSlashMatches('/ELI').map((c) => c.trigger)).toEqual(['/eli5'])
  })

  it('matches based on the first word only, ignoring trailing args', () => {
    const matches = findSlashMatches('/translate spanish hola')
    expect(matches.map((c) => c.trigger)).toEqual(['/translate'])
  })

  it('returns an empty array for an unknown trigger', () => {
    expect(findSlashMatches('/nonexistent')).toEqual([])
  })
})

describe('applySlashCommand', () => {
  const eli5 = SLASH_COMMANDS.find((c) => c.trigger === '/eli5')!
  const clear = SLASH_COMMANDS.find((c) => c.trigger === '/clear')!
  const translate = SLASH_COMMANDS.find((c) => c.trigger === '/translate')!

  it('applies a transform command to the text after the trigger', () => {
    const result = applySlashCommand('/eli5 how do black holes work', eli5)
    expect(result.kind).toBe('transform')
    expect(result.payload).toContain('how do black holes work')
    expect(result.payload).toContain('five years old')
  })

  it('falls back to the full input if there are no args after the trigger', () => {
    const result = applySlashCommand('/eli5', eli5)
    expect(result.kind).toBe('transform')
    expect(result.payload).toContain('/eli5')
  })

  it('returns an action payload with the actionKey for action commands', () => {
    const result = applySlashCommand('/clear', clear)
    expect(result).toEqual({ kind: 'action', payload: '', actionKey: 'clear' })
  })

  it('passes through translate-specific argument parsing via its own transform', () => {
    const result = applySlashCommand('/translate french bonjour is hello', translate)
    expect(result.payload).toContain('french')
    expect(result.payload).toContain('bonjour is hello')
  })
})
