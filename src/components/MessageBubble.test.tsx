import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { Message } from '@/store/appStore'

import MessageBubble from './MessageBubble'

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'm1',
    conversation_id: 'c1',
    role: 'user',
    content: 'hello world',
    mode: 'chat',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('MessageBubble', () => {
  it('renders a plain-text user message', () => {
    render(<MessageBubble message={makeMessage({ role: 'user', content: 'hi there' })} />)
    expect(screen.getByText('hi there')).toBeInTheDocument()
    expect(screen.getByText('YOU')).toBeInTheDocument()
  })

  it('renders an assistant message as markdown', () => {
    render(<MessageBubble message={makeMessage({ role: 'assistant', content: '**bold text**' })} />)
    expect(screen.getByText('ASST')).toBeInTheDocument()
    const bold = screen.getByText('bold text')
    expect(bold.tagName).toBe('STRONG')
  })

  it('renders an image message with the image and a save link', () => {
    render(
      <MessageBubble
        message={makeMessage({
          role: 'assistant',
          content: 'a cat',
          image_url: 'https://example.com/cat.png',
        })}
      />,
    )
    const img = screen.getByRole('img', { name: 'a cat' })
    expect(img).toHaveAttribute('src', 'https://example.com/cat.png')
    expect(screen.getByText('Save')).toHaveAttribute('href', 'https://example.com/cat.png')
  })

  it('entering edit mode and confirming calls onEdit with the trimmed new content', async () => {
    const onEdit = vi.fn()
    const user = userEvent.setup()
    render(
      <MessageBubble
        message={makeMessage({ role: 'user', content: 'original' })}
        onEdit={onEdit}
      />,
    )
    await user.click(screen.getByTitle('Edit'))
    const textarea = screen.getByDisplayValue('original')
    await user.clear(textarea)
    await user.type(textarea, '  edited text  ')
    await user.click(screen.getByText('Resend →'))
    expect(onEdit).toHaveBeenCalledWith('edited text')
  })

  it('editing to the same content (after trim) does not call onEdit', async () => {
    const onEdit = vi.fn()
    const user = userEvent.setup()
    render(
      <MessageBubble message={makeMessage({ role: 'user', content: 'same' })} onEdit={onEdit} />,
    )
    await user.click(screen.getByTitle('Edit'))
    await user.click(screen.getByText('Resend →'))
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('vote button calls onVote with the message model and reflects voted state', async () => {
    const onVote = vi.fn()
    const user = userEvent.setup()
    render(
      <MessageBubble
        message={makeMessage({ role: 'assistant', content: 'x', blend: true, model: 'model-a' })}
        showVoteButton
        onVote={onVote}
      />,
    )
    await user.click(screen.getByText('☆ Vote this response'))
    expect(onVote).toHaveBeenCalledWith('model-a')
  })

  it('shows VOTED state and disables the button once votedFor matches this message', () => {
    render(
      <MessageBubble
        message={makeMessage({ role: 'assistant', content: 'x', blend: true, model: 'model-a' })}
        showVoteButton
        votedFor="model-a"
      />,
    )
    const btn = screen.getByText('★ VOTED')
    expect(btn).toBeDisabled()
  })
})
