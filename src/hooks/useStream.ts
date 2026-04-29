import { useCallback, useRef, useState } from 'react'

interface StreamOptions {
  onDelta: (delta: string) => void
  onDone?: (id?: string) => void
  onError?: (err: string) => void
}

export function useStream() {
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const stream = useCallback(async (url: string, body: object, opts: StreamOptions) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setStreaming(true)

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const text = await res.text()
        opts.onError?.(text)
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.delta) opts.onDelta(data.delta)
              if (data.done) opts.onDone?.(data.id)
            } catch {}
          }
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') opts.onError?.(e?.message ?? 'Stream error')
    } finally {
      setStreaming(false)
    }
  }, [])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setStreaming(false)
  }, [])

  return { stream, stop, streaming }
}
