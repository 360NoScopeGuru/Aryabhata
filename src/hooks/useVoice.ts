import { useEffect, useRef, useState } from 'react'

// Wraps the Web Speech API (webkitSpeechRecognition / SpeechRecognition).
// Returns transcript chunks as they arrive — caller appends them to a textarea.

interface SpeechRecognitionEvent {
  resultIndex: number
  results: {
    length: number
    [index: number]: {
      isFinal: boolean
      [index: number]: { transcript: string }
    }
  }
}

interface SpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

export interface UseVoiceResult {
  supported: boolean
  listening: boolean
  interim: string
  start: () => void
  stop: () => void
  onFinal: (handler: (text: string) => void) => void
}

interface SpeechWindow extends Window {
  SpeechRecognition?: new () => SpeechRecognitionInstance
  webkitSpeechRecognition?: new () => SpeechRecognitionInstance
}

export function useVoice(): UseVoiceResult {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const finalHandlerRef = useRef<(text: string) => void>(() => {})

  const Ctor =
    typeof window !== 'undefined'
      ? ((window as SpeechWindow).SpeechRecognition ??
        (window as SpeechWindow).webkitSpeechRecognition ??
        null)
      : null
  const supported = !!Ctor

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop()
      } catch {
        /* already stopped/uninitialized — safe to ignore */
      }
    }
  }, [])

  const start = () => {
    if (!Ctor || listening) return
    const rec = new Ctor()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interimText = ''
      let finalText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        const t = r[0].transcript
        if (r.isFinal) finalText += t
        else interimText += t
      }
      if (finalText) {
        finalHandlerRef.current(finalText)
        setInterim('')
      } else {
        setInterim(interimText)
      }
    }
    rec.onerror = () => {
      setListening(false)
      setInterim('')
    }
    rec.onend = () => {
      setListening(false)
      setInterim('')
    }
    rec.start()
    recognitionRef.current = rec
    setListening(true)
  }

  const stop = () => {
    try {
      recognitionRef.current?.stop()
    } catch {
      /* already stopped/uninitialized — safe to ignore */
    }
    setListening(false)
    setInterim('')
  }

  const onFinal = (handler: (text: string) => void) => {
    finalHandlerRef.current = handler
  }

  return { supported, listening, interim, start, stop, onFinal }
}
