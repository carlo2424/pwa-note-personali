import { Mic, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { appendSpeechSegment } from '../utils/speechText'

interface SpeechDictationProps {
  onTranscript: (text: string) => void
  onListeningChange?: (listening: boolean) => void
  disabled?: boolean
  variant?: 'default' | 'icon'
}

function getSpeechRecognition(): SpeechRecognitionConstructor | undefined {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition
}

/** Dettatura vocale → testo (Web Speech API) */
export function SpeechDictation({
  onTranscript,
  onListeningChange,
  disabled = false,
  variant = 'default',
}: SpeechDictationProps) {
  const [listening, setListening] = useState(false)
  const supported = !!getSpeechRecognition()
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const listeningRef = useRef(false)
  const finalTranscriptRef = useRef('')
  const lastEmittedRef = useRef('')

  useEffect(() => {
    return () => {
      listeningRef.current = false
      recognitionRef.current?.abort()
    }
  }, [])

  function stop() {
    listeningRef.current = false
    setListening(false)
    recognitionRef.current?.stop()
    onListeningChange?.(false)
  }

  function emitMergedTranscript(merged: string) {
    const text = merged.trim()
    if (!text || text === lastEmittedRef.current) return
    lastEmittedRef.current = text
    onTranscript(text)
  }

  function start() {
    const SpeechRecognitionCtor = getSpeechRecognition()
    if (!SpeechRecognitionCtor) return

    finalTranscriptRef.current = ''
    lastEmittedRef.current = ''

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'it-IT'
    recognition.continuous = true
    recognition.interimResults = false

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (!result.isFinal) continue
        const segment = result[0]?.transcript?.trim()
        if (!segment) continue
        finalTranscriptRef.current = appendSpeechSegment(
          finalTranscriptRef.current,
          segment,
        )
      }
      emitMergedTranscript(finalTranscriptRef.current)
    }

    recognition.onerror = (event) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        alert('Dettatura non disponibile. Verifica i permessi del microfono.')
      }
      stop()
    }

    recognition.onend = () => {
      if (listeningRef.current) {
        try {
          recognition.start()
        } catch {
          stop()
        }
      } else {
        setListening(false)
      }
    }

    recognitionRef.current = recognition
    listeningRef.current = true
    setListening(true)
    onListeningChange?.(true)

    try {
      recognition.start()
    } catch {
      alert('Impossibile avviare la dettatura.')
      stop()
    }
  }

  function toggle() {
    if (listening) stop()
    else start()
  }

  if (!supported) {
    if (variant === 'icon') return null
    return (
      <span className="text-xs text-slate-400">Dettatura non supportata</span>
    )
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition disabled:opacity-40 ${
          listening
            ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
        }`}
        aria-label={listening ? 'Ferma dettatura' : 'Detta a voce'}
      >
        {listening ? (
          <Square className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
        listening
          ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
      } disabled:opacity-40`}
      aria-label={listening ? 'Ferma dettatura' : 'Detta a voce'}
    >
      {listening ? (
        <>
          <Square className="h-3.5 w-3.5" />
          Stop
        </>
      ) : (
        <>
          <Mic className="h-3.5 w-3.5" />
          Detta
        </>
      )}
    </button>
  )
}
