import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppStore } from '@/store/appStore'

import Insights from './Insights'

const mockAuthFetch = vi.fn()
vi.mock('@/hooks/useAuthFetch', () => ({
  useAuthFetch: () => mockAuthFetch,
}))

const initialState = useAppStore.getState()

beforeEach(() => {
  useAppStore.setState(initialState, true)
  mockAuthFetch.mockReset()
})

describe('Insights — model benchmarks section', () => {
  it('renders nothing when closed', () => {
    render(<Insights open={false} onClose={vi.fn()} />)
    expect(screen.queryByText(/Model Benchmarks/)).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no benchmarks yet', async () => {
    mockAuthFetch.mockResolvedValue({ ok: true, json: async () => [] })
    render(<Insights open onClose={vi.fn()} />)
    await waitFor(() =>
      expect(screen.getByText(/No completed generations yet/)).toBeInTheDocument(),
    )
  })

  it('renders a row per model with latency, cost, and win rate', async () => {
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          model_id: 'meta/llama-3.1-70b-instruct',
          message_count: 5,
          avg_ttft_ms: 320,
          avg_latency_ms: 1200,
          tokens_per_sec: 42.5,
          total_cost_usd: 0.0123,
          wins: 3,
          total_rounds: 4,
          win_rate: 0.75,
          last_used_at: '2026-01-01T00:00:00Z',
        },
      ],
    })
    render(<Insights open onClose={vi.fn()} />)

    await waitFor(() => expect(screen.getByText('Llama 3.1 70B')).toBeInTheDocument())
    expect(screen.getByText('320ms')).toBeInTheDocument()
    expect(screen.getByText('42.5')).toBeInTheDocument()
    expect(screen.getByText('$0.0123')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('shows a dash for null ttft/win-rate rather than crashing', async () => {
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          model_id: 'model-x',
          message_count: 1,
          avg_ttft_ms: null,
          avg_latency_ms: null,
          tokens_per_sec: 0,
          total_cost_usd: 0,
          wins: 0,
          total_rounds: 0,
          win_rate: null,
          last_used_at: '2026-01-01T00:00:00Z',
        },
      ],
    })
    render(<Insights open onClose={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('model-x')).toBeInTheDocument())
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(2) // TTFT dash + win-rate dash
  })

  it('fails gracefully (empty list, no crash) when the fetch fails', async () => {
    mockAuthFetch.mockRejectedValue(new Error('network error'))
    render(<Insights open onClose={vi.fn()} />)
    await waitFor(() =>
      expect(screen.getByText(/No completed generations yet/)).toBeInTheDocument(),
    )
  })
})
