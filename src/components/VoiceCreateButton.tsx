import { Mic, Pencil, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Event, Expense, Note } from '../db'
import { parseVoiceCreateCommand } from '../utils/parseVoiceCreateCommand'
import {
  createFromVoiceCommand,
  loadVoiceCreatedItem,
  voiceCreateKindLabel,
  type VoiceCreateResult,
} from '../utils/voiceCreate'

interface VoiceCreateButtonProps {
  onEditNote: (note: Note) => void
  onEditEvent: (event: Event) => void
  onEditExpense: (expense: Expense) => void
}

function getSpeechRecognition(): SpeechRecognitionConstructor | undefined {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition
}

function appendSpeechSegment(base: string, segment: string): string {
  const b = base.trim()
  const s = segment.trim()
  if (!s) return b
  if (!b) return s
  if (b.toLowerCase().endsWith(s.toLowerCase())) return b
  if (s.toLowerCase().startsWith(b.toLowerCase())) return s
  return `${b} ${s}`.replace(/\s+/g, ' ').trim()
}

export function VoiceCreateButton({
  onEditNote,
  onEditEvent,
  onEditExpense,
}: VoiceCreateButtonProps) {
  const supported = !!getSpeechRecognition()
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{
    message: string
    result?: VoiceCreateResult
  } | null>(null)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const listeningRef = useRef(false)
  const finalTranscriptRef = useRef('')
  const transcriptRef = useRef('')

  useEffect(() => {
    return () => {
      listeningRef.current = false
      recognitionRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!feedback) return
    const t = window.setTimeout(() => setFeedback(null), 6000)
    return () => window.clearTimeout(t)
  }, [feedback])

  function stopListening() {
    listeningRef.current = false
    setListening(false)
    recognitionRef.current?.stop()
  }

  function startListening() {
    const SpeechRecognitionCtor = getSpeechRecognition()
    if (!SpeechRecognitionCtor) return

    setTranscript('')
    finalTranscriptRef.current = ''
    transcriptRef.current = ''
    setFeedback(null)

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'it-IT'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const segment = result[0]?.transcript?.trim()
        if (!segment) continue
        if (result.isFinal) {
          finalTranscriptRef.current = appendSpeechSegment(
            finalTranscriptRef.current,
            segment,
          )
        } else {
          interim = appendSpeechSegment(interim, segment)
        }
      }
      const display = appendSpeechSegment(finalTranscriptRef.current, interim)
      transcriptRef.current = display
      setTranscript(display)
    }

    recognition.onerror = (event) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setFeedback({
          message: 'Dettatura non disponibile. Controlla il microfono.',
        })
      }
      stopListening()
    }

    recognition.onend = () => {
      if (listeningRef.current) {
        try {
          recognition.start()
        } catch {
          stopListening()
        }
      }
    }

    recognitionRef.current = recognition
    listeningRef.current = true
    setListening(true)

    try {
      recognition.start()
    } catch {
      setFeedback({ message: 'Impossibile avviare il microfono.' })
      stopListening()
    }
  }

  async function finishAndCreate() {
    stopListening()
    const text = finalTranscriptRef.current.trim() || transcriptRef.current.trim()
    if (!text) {
      setFeedback({
        message:
          'Non ho sentito nulla. Riprova dettando tipo, titolo o messaggio in qualsiasi ordine.',
      })
      return
    }

    const parsed = parseVoiceCreateCommand(text)
    if (!parsed.ok) {
      setFeedback({ message: `${parsed.reason} ${parsed.hint}` })
      return
    }

    setBusy(true)
    try {
      const result = await createFromVoiceCommand(parsed.command)
      const kindLabel = voiceCreateKindLabel(result.kind)
      const review = result.needsReview ? ' — controlla importo' : ''
      setFeedback({
        message: `Creato: ${kindLabel} · ${result.title}${review}`,
        result,
      })
    } catch {
      setFeedback({ message: 'Errore durante il salvataggio. Riprova.' })
    } finally {
      setBusy(false)
    }
  }

  async function openCreatedForEdit() {
    if (!feedback?.result) return
    const item = await loadVoiceCreatedItem(feedback.result)
    if (!item) return
    setFeedback(null)
    if (feedback.result.kind === 'event') onEditEvent(item as Event)
    else if (feedback.result.kind === 'expense') onEditExpense(item as Expense)
    else onEditNote(item as Note)
  }

  if (!supported) return null

  return (
    <div className="flex flex-col items-center gap-1">
      {listening ? (
        <div className="mb-1 w-full max-w-sm rounded-xl border border-indigo-200 bg-white px-3 py-2.5 shadow-lg shadow-indigo-100/80">
          <p className="text-xs leading-snug text-slate-700">
            Inizia a parlare e descrivi cosa vuoi creare:{' '}
            <span className="text-slate-500">
              {transcript ||
                'bolletta luce impegno scadenza 15 luglio · oppure titolo spesa messaggio latte e pane…'}
            </span>
          </p>
        </div>
      ) : feedback ? (
        <div className="mb-1 w-full max-w-sm rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 shadow-sm">
          <p className="text-xs font-medium text-emerald-900">{feedback.message}</p>
          {feedback.result && (
            <button
              type="button"
              onClick={() => void openCreatedForEdit()}
              className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900"
            >
              <Pencil className="h-3 w-3" />
              Modifica dettagli
            </button>
          )}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => (listening ? void finishAndCreate() : startListening())}
        disabled={busy}
        className={`flex h-12 w-12 items-center justify-center rounded-full shadow-md transition active:scale-95 disabled:opacity-50 ${
          listening
            ? 'bg-rose-500 text-white shadow-rose-200 hover:bg-rose-600'
            : 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700'
        }`}
        aria-label={
          listening
            ? 'Termina e crea da dettatura'
            : 'Detta per creare nota, lista, impegno o spesa'
        }
      >
        {listening ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </button>
      <p className="text-[9px] font-medium text-slate-400">
        {listening ? 'Tap per creare' : 'Detta e crea'}
      </p>
    </div>
  )
}
