import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import ErrorBoundary from './ErrorBoundary'

function Bomb(): never {
  throw new Error('kaboom')
}

describe('ErrorBoundary', () => {
  it('renders children normally when nothing crashes', () => {
    render(
      <ErrorBoundary>
        <div>all good</div>
      </ErrorBoundary>,
    )
    expect(screen.getByText('all good')).toBeInTheDocument()
  })

  it('renders the fallback UI with the error message when a child throws', () => {
    // React logs the error to console.error during the render — suppress the noise.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Critical Error')).toBeInTheDocument()
    expect(screen.getByText('kaboom')).toBeInTheDocument()
    consoleSpy.mockRestore()
  })

  it('reload button calls window.location.reload', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const reloadSpy = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload: reloadSpy })

    const user = userEvent.setup()
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    await user.click(screen.getByText('Reload →'))
    expect(reloadSpy).toHaveBeenCalledOnce()

    consoleSpy.mockRestore()
    vi.unstubAllGlobals()
  })
})
