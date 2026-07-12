import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppStore } from '@/store/appStore'

import ChatInput from './ChatInput'

vi.mock('@/hooks/useAuthFetch', () => ({
  useAuthFetch: () => vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
}))

vi.mock('@/hooks/useVoice', () => ({
  useVoice: () => ({
    supported: false,
    listening: false,
    interim: '',
    start: vi.fn(),
    stop: vi.fn(),
    onFinal: vi.fn(),
  }),
}))

const initialState = useAppStore.getState()

beforeEach(() => {
  useAppStore.setState(initialState, true)
})

describe('ChatInput', () => {
  it('sends trimmed text on Enter and clears the composer', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} />)

    const textarea = screen.getByPlaceholderText(/Transmit a message/)
    await user.type(textarea, '  hello there  ')
    await user.keyboard('{Enter}')

    expect(onSend).toHaveBeenCalledWith('hello there', undefined)
    expect(textarea).toHaveValue('')
  })

  it('Shift+Enter does not send', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} />)

    const textarea = screen.getByPlaceholderText(/Transmit a message/)
    await user.type(textarea, 'line one{Shift>}{Enter}{/Shift}line two')

    expect(onSend).not.toHaveBeenCalled()
  })

  it('send button is disabled when the composer is empty', () => {
    render(<ChatInput onSend={vi.fn()} />)
    expect(screen.getByText('TRANSMIT →')).toBeDisabled()
  })

  it('send button is enabled once text is typed, and clicking it sends', async () => {
    const onSend = vi.fn()
    const user = userEvent.setup()
    render(<ChatInput onSend={onSend} />)

    await user.type(screen.getByPlaceholderText(/Transmit a message/), 'hi')
    const sendBtn = screen.getByText('TRANSMIT →')
    expect(sendBtn).toBeEnabled()
    await user.click(sendBtn)
    expect(onSend).toHaveBeenCalledWith('hi', undefined)
  })

  it('disables the composer entirely when no model is selected', () => {
    useAppStore.setState({ selectedModels: [], mode: 'chat' })
    render(<ChatInput onSend={vi.fn()} />)
    expect(screen.getByPlaceholderText('Select a model in the sidebar first…')).toBeDisabled()
  })

  it('typing "/" opens the slash command menu', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={vi.fn()} />)
    await user.type(screen.getByPlaceholderText(/Transmit a message/), '/eli5')
    expect(screen.getByText("Explain Like I'm 5")).toBeInTheDocument()
  })

  it('Tab autocompletes the selected slash trigger', async () => {
    const user = userEvent.setup()
    render(<ChatInput onSend={vi.fn()} />)
    const textarea = screen.getByPlaceholderText(/Transmit a message/)
    await user.type(textarea, '/eli5')
    await user.keyboard('{Tab}')
    expect(textarea).toHaveValue('/eli5 ')
  })

  it('shows streaming state with a Stop button instead of Transmit', () => {
    render(<ChatInput onSend={vi.fn()} onStop={vi.fn()} streaming />)
    expect(screen.getByText('■ Stop')).toBeInTheDocument()
    expect(screen.queryByText('TRANSMIT →')).not.toBeInTheDocument()
  })
})
