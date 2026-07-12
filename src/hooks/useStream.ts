import { useCallback, useRef, useState } from 'react'

interface StreamOptions {
  onDelta: (delta: string) => void
  onFirstToken?: (ttftMs: number) => void
  onDone?: (id?: string, outputTokens?: number) => void
  onError?: (err: string) => void
  // Blend-mode callbacks
  onModelStart?: (modelId: string) => void
  onModelDone?: (modelId: string, fullText: string) => void
}

export function useStream() {
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const stream = useCallback(
    async (
      url: string,
      body: object,
      opts: StreamOptions,
      extraHeaders: Record<string, string> = {},
    ) => {
      abortRef.current?.abort()
      abortRef.current = new AbortController()
      setStreaming(true)

      const startTime = Date.now()
      let firstToken = false

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...extraHeaders },
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
                if (data.error) {
                  opts.onError?.(data.error)
                } else if (data.model_start) {
                  opts.onModelStart?.(data.model_start)
                } else if (data.model_done !== undefined) {
                  opts.onModelDone?.(data.model_done, data.text ?? '')
                } else if (data.delta) {
                  if (!firstToken) {
                    firstToken = true
                    opts.onFirstToken?.(Date.now() - startTime)
                  }
                  opts.onDelta(data.delta)
                }
                if (data.done) opts.onDone?.(data.id, data.output_tokens)
              } catch {
                /* malformed SSE frame — skip */
              }
            }
          }
        }
      } catch (e) {
        const err = e as { name?: string; message?: string } | undefined
        if (err?.name !== 'AbortError') opts.onError?.(err?.message ?? 'Stream error')
      } finally {
        setStreaming(false)
      }
    },
    [],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setStreaming(false)
  }, [])

  return { stream, stop, streaming }
}
