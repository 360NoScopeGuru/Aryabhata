import { beforeEach, describe, expect, it } from 'vitest'

import { getActiveModel, isBlendMode, MIXING_MODELS, useAppStore } from './appStore'

const initialState = useAppStore.getState()

beforeEach(() => {
  useAppStore.setState(initialState, true)
  localStorage.clear()
})

describe('getActiveModel / isBlendMode', () => {
  it('returns the first selected model, or the default model if none selected', () => {
    expect(getActiveModel(['a', 'b'])).toBe('a')
    expect(getActiveModel([])).toBe(MIXING_MODELS[0].id)
  })

  it('is blend mode only with 2+ selected models', () => {
    expect(isBlendMode([])).toBe(false)
    expect(isBlendMode(['a'])).toBe(false)
    expect(isBlendMode(['a', 'b'])).toBe(true)
  })
})

describe('message actions', () => {
  it('addMessage appends to the correct conversation, creating the array if needed', () => {
    const msg = {
      id: 'm1',
      conversation_id: 'c1',
      role: 'user' as const,
      content: 'hi',
      mode: 'chat' as const,
      created_at: 't',
    }
    useAppStore.getState().addMessage(msg)
    expect(useAppStore.getState().messages.c1).toEqual([msg])
  })

  it('appendToLastMessage streams a delta onto the last message only', () => {
    const { addMessage, appendToLastMessage } = useAppStore.getState()
    addMessage({
      id: 'm1',
      conversation_id: 'c1',
      role: 'user',
      content: 'hi',
      mode: 'chat',
      created_at: 't',
    })
    addMessage({
      id: 'm2',
      conversation_id: 'c1',
      role: 'assistant',
      content: '',
      mode: 'chat',
      created_at: 't',
    })
    appendToLastMessage('c1', 'Hel')
    appendToLastMessage('c1', 'lo')
    const msgs = useAppStore.getState().messages.c1
    expect(msgs[0].content).toBe('hi') // first message untouched
    expect(msgs[1].content).toBe('Hello')
  })

  it('appendToLastMessage on a conversation with no messages is a no-op, not a crash', () => {
    useAppStore.getState().appendToLastMessage('nonexistent', 'x')
    expect(useAppStore.getState().messages.nonexistent).toBeUndefined()
  })

  it('updateLastMessageTelemetry patches only the last message', () => {
    const { addMessage, updateLastMessageTelemetry } = useAppStore.getState()
    addMessage({
      id: 'm1',
      conversation_id: 'c1',
      role: 'assistant',
      content: 'x',
      mode: 'chat',
      created_at: 't',
    })
    updateLastMessageTelemetry('c1', { ttft: 120, tpot: 45 })
    expect(useAppStore.getState().messages.c1[0]).toMatchObject({ ttft: 120, tpot: 45 })
  })

  it('truncateMessagesFrom cuts the array at the given index', () => {
    const { setMessages, truncateMessagesFrom } = useAppStore.getState()
    setMessages('c1', [
      {
        id: 'm1',
        conversation_id: 'c1',
        role: 'user',
        content: '1',
        mode: 'chat',
        created_at: 't',
      },
      {
        id: 'm2',
        conversation_id: 'c1',
        role: 'assistant',
        content: '2',
        mode: 'chat',
        created_at: 't',
      },
      {
        id: 'm3',
        conversation_id: 'c1',
        role: 'user',
        content: '3',
        mode: 'chat',
        created_at: 't',
      },
    ])
    truncateMessagesFrom('c1', 1)
    expect(useAppStore.getState().messages.c1.map((m) => m.id)).toEqual(['m1'])
  })

  it('updateMessageContent edits a specific message by id, leaving others untouched', () => {
    const { setMessages, updateMessageContent } = useAppStore.getState()
    setMessages('c1', [
      {
        id: 'm1',
        conversation_id: 'c1',
        role: 'user',
        content: 'old',
        mode: 'chat',
        created_at: 't',
      },
      {
        id: 'm2',
        conversation_id: 'c1',
        role: 'user',
        content: 'keep',
        mode: 'chat',
        created_at: 't',
      },
    ])
    updateMessageContent('c1', 'm1', 'new')
    const msgs = useAppStore.getState().messages.c1
    expect(msgs[0].content).toBe('new')
    expect(msgs[1].content).toBe('keep')
  })

  it('clearMessages empties a conversation without deleting the key', () => {
    useAppStore
      .getState()
      .addMessage({
        id: 'm1',
        conversation_id: 'c1',
        role: 'user',
        content: 'x',
        mode: 'chat',
        created_at: 't',
      })
    useAppStore.getState().clearMessages('c1')
    expect(useAppStore.getState().messages.c1).toEqual([])
  })
})

describe('conversation actions', () => {
  const conv = {
    id: 'c1',
    title: 'Chat 1',
    mode: 'chat' as const,
    created_at: 't',
    updated_at: 't',
  }

  it('addConversation prepends to the list', () => {
    useAppStore.getState().addConversation(conv)
    useAppStore.getState().addConversation({ ...conv, id: 'c2', title: 'Chat 2' })
    expect(useAppStore.getState().conversations.map((c) => c.id)).toEqual(['c2', 'c1'])
  })

  it('removeConversation removes it and clears activeConversationId if it was active', () => {
    useAppStore.getState().addConversation(conv)
    useAppStore.getState().setActiveConversation('c1')
    useAppStore.getState().removeConversation('c1')
    expect(useAppStore.getState().conversations).toEqual([])
    expect(useAppStore.getState().activeConversationId).toBeNull()
  })

  it('removeConversation leaves activeConversationId alone if a different conversation was active', () => {
    useAppStore.getState().addConversation(conv)
    useAppStore.getState().setActiveConversation('other-conv')
    useAppStore.getState().removeConversation('c1')
    expect(useAppStore.getState().activeConversationId).toBe('other-conv')
  })

  it('updateConversationTitle updates only the matching conversation', () => {
    useAppStore.getState().addConversation(conv)
    useAppStore.getState().addConversation({ ...conv, id: 'c2', title: 'Chat 2' })
    useAppStore.getState().updateConversationTitle('c1', 'Renamed')
    const convs = useAppStore.getState().conversations
    expect(convs.find((c) => c.id === 'c1')?.title).toBe('Renamed')
    expect(convs.find((c) => c.id === 'c2')?.title).toBe('Chat 2')
  })

  it('pinConversation sorts pinned conversations to the top', () => {
    useAppStore.getState().addConversation({ ...conv, id: 'c1' })
    useAppStore.getState().addConversation({ ...conv, id: 'c2' })
    useAppStore.getState().addConversation({ ...conv, id: 'c3' })
    useAppStore.getState().pinConversation('c3', true)
    expect(useAppStore.getState().conversations[0].id).toBe('c3')
  })
})

describe('model selection (blend mode)', () => {
  it('toggleModel adds a model when not selected', () => {
    useAppStore.setState({ selectedModels: ['a'] })
    useAppStore.getState().toggleModel('b')
    expect(useAppStore.getState().selectedModels).toEqual(['a', 'b'])
  })

  it('toggleModel removes a model when already selected', () => {
    useAppStore.setState({ selectedModels: ['a', 'b'] })
    useAppStore.getState().toggleModel('a')
    expect(useAppStore.getState().selectedModels).toEqual(['b'])
  })

  it('toggleModel refuses to add a 6th model (blend caps at 5)', () => {
    useAppStore.setState({ selectedModels: ['a', 'b', 'c', 'd', 'e'] })
    useAppStore.getState().toggleModel('f')
    expect(useAppStore.getState().selectedModels).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('setSelectedModels caps at 5 even if more are passed in', () => {
    useAppStore.getState().setSelectedModels(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
    expect(useAppStore.getState().selectedModels).toHaveLength(5)
  })
})

describe('sampling parameters', () => {
  it('setSamplingPreset applies the preset values', () => {
    useAppStore.getState().setSamplingPreset('creative')
    const s = useAppStore.getState()
    expect(s.samplingPreset).toBe('creative')
    expect(s.temperature).toBe(1.2)
  })

  it('manually setting temperature resets the preset label to balanced', () => {
    useAppStore.getState().setSamplingPreset('creative')
    useAppStore.getState().setTemperature(0.42)
    const s = useAppStore.getState()
    expect(s.temperature).toBe(0.42)
    expect(s.samplingPreset).toBe('balanced')
  })

  it('resetSamplingParams restores all sampling fields to balanced defaults', () => {
    useAppStore.setState({ temperature: 1.9, frequencyPenalty: 1.5, maxTokens: 256 })
    useAppStore.getState().resetSamplingParams()
    const s = useAppStore.getState()
    expect(s.temperature).toBe(0.7)
    expect(s.frequencyPenalty).toBe(0)
    expect(s.maxTokens).toBe(4096)
  })
})

describe('custom personas', () => {
  it('addCustomPersona appends, removeCustomPersona removes by id', () => {
    const persona = { id: 'p1', name: 'Test', icon: '✦', prompt: 'be helpful' }
    useAppStore.getState().addCustomPersona(persona)
    expect(useAppStore.getState().customPersonas).toEqual([persona])
    useAppStore.getState().removeCustomPersona('p1')
    expect(useAppStore.getState().customPersonas).toEqual([])
  })
})

describe('toasts', () => {
  it('addToast assigns an id and appends', () => {
    useAppStore.getState().addToast({ kind: 'info', message: 'hi' })
    const toasts = useAppStore.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].id).toBeTruthy()
    expect(toasts[0].message).toBe('hi')
  })

  it('an error toast also sets lastError', () => {
    useAppStore.getState().addToast({ kind: 'error', message: 'STREAM FAILED' })
    expect(useAppStore.getState().lastError).toBe('STREAM FAILED')
  })

  it('a non-error toast does not touch lastError', () => {
    useAppStore.getState().setLastError('previous error')
    useAppStore.getState().addToast({ kind: 'ok', message: 'saved' })
    expect(useAppStore.getState().lastError).toBe('previous error')
  })

  it('dismissToast removes only the matching toast', () => {
    useAppStore.getState().addToast({ kind: 'info', message: 'one' })
    useAppStore.getState().addToast({ kind: 'info', message: 'two' })
    const [first] = useAppStore.getState().toasts
    useAppStore.getState().dismissToast(first.id)
    const remaining = useAppStore.getState().toasts
    expect(remaining).toHaveLength(1)
    expect(remaining[0].message).toBe('two')
  })
})

describe('localStorage persistence', () => {
  it('persists whitelisted fields (partialize) under the aryabhata-v3 key', () => {
    useAppStore.getState().setTheme('liquid')
    useAppStore.getState().setProjectName('My Project')

    const raw = localStorage.getItem('aryabhata-v3')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.state.projectName).toBe('My Project')
  })

  it('does NOT persist transient fields like conversations, messages, or toasts', () => {
    useAppStore.getState().addConversation({
      id: 'c1',
      title: 'x',
      mode: 'chat',
      created_at: 't',
      updated_at: 't',
    })
    useAppStore.getState().addToast({ kind: 'info', message: 'x' })

    const raw = localStorage.getItem('aryabhata-v3')
    const parsed = JSON.parse(raw!)
    expect(parsed.state.conversations).toBeUndefined()
    expect(parsed.state.messages).toBeUndefined()
    expect(parsed.state.toasts).toBeUndefined()
  })
})
