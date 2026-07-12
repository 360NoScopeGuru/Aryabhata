import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Conversation, Message } from '@/store/appStore'

import { exportConversation } from './exportConversation'

function makeConv(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'c1',
    title: 'My Test Chat!',
    mode: 'chat',
    pinned: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Conversation
}

function makeMsg(overrides: Partial<Message> = {}): Message {
  return {
    id: 'm1',
    conversation_id: 'c1',
    role: 'user',
    content: 'hello',
    mode: 'chat',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Message
}

describe('exportConversation', () => {
  const realCreateElement = document.createElement.bind(document)
  let capturedAnchor: HTMLAnchorElement | undefined

  beforeEach(() => {
    capturedAnchor = undefined
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreateElement(tag) as HTMLAnchorElement
      if (tag === 'a') {
        el.click = vi.fn(() => {
          capturedAnchor = el
        })
      }
      return el
    })
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('does nothing when the conversation is not found', () => {
    exportConversation('missing', [], {})
    expect(capturedAnchor).toBeUndefined()
  })

  it('does nothing when the conversation has no messages', () => {
    exportConversation('c1', [makeConv()], { c1: [] })
    expect(capturedAnchor).toBeUndefined()
  })

  it('triggers a download for a conversation with messages', () => {
    exportConversation('c1', [makeConv({ title: 'My Test Chat!' })], {
      c1: [
        makeMsg({ role: 'user', content: 'hi there' }),
        makeMsg({ role: 'assistant', content: 'hello!', model: 'llama-3.1' }),
      ],
    })
    expect(capturedAnchor).toBeDefined()
    expect(capturedAnchor!.download.endsWith('.md')).toBe(true)
  })

  it('sanitizes the title into a filesystem-safe, lowercase .md filename', () => {
    exportConversation('c1', [makeConv({ title: 'Weird Title!! @#$ 123' })], {
      c1: [makeMsg()],
    })
    const name = capturedAnchor!.download
    expect(name).toMatch(/^[a-z0-9-]+\.md$/)
    expect(name).toContain('weird')
    expect(name).toContain('title')
    expect(name).toContain('123')
  })
})
