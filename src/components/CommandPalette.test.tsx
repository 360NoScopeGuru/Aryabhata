import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppStore } from '@/store/appStore'

import CommandPalette from './CommandPalette'

const initialState = useAppStore.getState()

beforeEach(() => {
  useAppStore.setState(initialState, true)
})

function renderPalette(overrides: Partial<React.ComponentProps<typeof CommandPalette>> = {}) {
  const props = {
    open: true,
    onClose: vi.fn(),
    onShowMultiverse: vi.fn(),
    onShowInsights: vi.fn(),
    onShowShortcuts: vi.fn(),
    onNewChat: vi.fn(),
    onExport: vi.fn(),
    ...overrides,
  }
  render(<CommandPalette {...props} />)
  return props
}

describe('CommandPalette', () => {
  it('renders nothing when closed', () => {
    renderPalette({ open: false })
    expect(screen.queryByPlaceholderText(/Run an action/)).not.toBeInTheDocument()
  })

  it('renders the search input and commands when open', () => {
    renderPalette()
    expect(screen.getByPlaceholderText(/Run an action/)).toBeInTheDocument()
    expect(screen.getByText('New chat')).toBeInTheDocument()
  })

  it('Escape calls onClose', async () => {
    const user = userEvent.setup()
    const props = renderPalette()
    await user.keyboard('{Escape}')
    expect(props.onClose).toHaveBeenCalledOnce()
  })

  it('typing filters the command list', async () => {
    // While a query is active, matched characters are highlighted in their
    // own <span>s (see the mode-switch test below), so query aggregated row
    // text via .cmd-row-label rather than exact getByText.
    const user = userEvent.setup()
    renderPalette()
    await user.type(screen.getByPlaceholderText(/Run an action/), 'export')
    const labels = Array.from(document.querySelectorAll('.cmd-row-label')).map(
      (el) => el.textContent,
    )
    expect(labels).toContain('Export current as Markdown')
    expect(labels).not.toContain('New chat')
  })

  it('clicking "New chat" triggers onNewChat and closes the palette', async () => {
    const user = userEvent.setup()
    const props = renderPalette()
    await user.click(screen.getByText('New chat'))
    expect(props.onNewChat).toHaveBeenCalledOnce()
    expect(props.onClose).toHaveBeenCalledOnce()
  })

  it('selecting a mode command switches the app mode via the store', async () => {
    // The matched query characters are highlighted in their own <span>s, so
    // the label text is split across nodes — query the row by data-idx
    // instead of matching the (now-fragmented) visible text.
    const user = userEvent.setup()
    renderPalette()
    await user.type(screen.getByPlaceholderText(/Run an action/), 'switch to code')
    // CommandPalette portals to document.body, so query the document
    // directly rather than RTL's default container.
    const row = document.querySelector('[data-idx="0"]')
    expect(row).not.toBeNull()
    await user.click(row!)
    expect(useAppStore.getState().mode).toBe('code')
  })

  it('shows "No matches" for a query with no results', async () => {
    const user = userEvent.setup()
    renderPalette()
    await user.type(screen.getByPlaceholderText(/Run an action/), 'zzzznonexistent')
    expect(screen.getByText('No matches')).toBeInTheDocument()
  })
})
