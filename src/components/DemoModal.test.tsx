import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import DemoModal from './DemoModal'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('DemoModal', () => {
  it('send is disabled with an empty prompt', () => {
    render(<DemoModal onClose={vi.fn()} />)
    expect(screen.getByText('Send →')).toBeDisabled()
  })

  it('renders the reply and cost/budget meta on success', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        reply: 'Hello from the demo!',
        model: 'meta/llama-3.2-3b-instruct',
        cost_usd: 0.00001,
        remaining_budget_usd: 0.98,
      }),
    })
    const user = userEvent.setup()
    render(<DemoModal onClose={vi.fn()} />)

    await user.type(screen.getByPlaceholderText('Ask anything…'), 'hi there')
    await user.click(screen.getByText('Send →'))

    await waitFor(() => expect(screen.getByText('Hello from the demo!')).toBeInTheDocument())
    expect(screen.getByText(/llama-3.2-3b-instruct/)).toBeInTheDocument()
    expect(screen.getByText(/remaining \$0.98/)).toBeInTheDocument()
  })

  it('shows the server error detail (e.g. daily cap reached) on failure', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Daily demo limit reached — sign up for unlimited access.' }),
    })
    const user = userEvent.setup()
    render(<DemoModal onClose={vi.fn()} />)

    await user.type(screen.getByPlaceholderText('Ask anything…'), 'hi')
    await user.click(screen.getByText('Send →'))

    await waitFor(() =>
      expect(screen.getByText(/Daily demo limit reached/)).toBeInTheDocument(),
    )
  })

  it('shows a network-error message if fetch itself rejects', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'))
    const user = userEvent.setup()
    render(<DemoModal onClose={vi.fn()} />)

    await user.type(screen.getByPlaceholderText('Ask anything…'), 'hi')
    await user.click(screen.getByText('Send →'))

    await waitFor(() => expect(screen.getByText(/Network error/)).toBeInTheDocument())
  })

  it('clicking the scrim (outside the modal) closes it', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    const { container } = render(<DemoModal onClose={onClose} />)
    await user.click(container.querySelector('.demo-scrim')!)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('clicking inside the modal does not close it', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<DemoModal onClose={onClose} />)
    await user.click(screen.getByText('Try Aryabhata — no sign-up'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
