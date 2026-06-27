import { Mic, Square, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'

interface VoiceRecorderProps {
  voiceBlob?: Blob
  onRecord: (blob: Blob | undefined) => void
}

/** Registrazione nota vocale con MediaRecorder */
export function VoiceRecorder({ voiceBlob, onRecord }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | undefined>(
    voiceBlob ? URL.createObjectURL(voiceBlob) : undefined,
  )
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        onRecord(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((t) => t.stop())
      }

      mediaRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch {
      alert('Permesso microfono negato o non disponibile.')
    }
  }

  function stopRecording() {
    mediaRef.current?.stop()
    setRecording(false)
  }

  function remove() {
    onRecord(undefined)
    setAudioUrl(undefined)
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Nota vocale
      </label>
      <div className="flex items-center gap-2">
        {recording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-medium text-white"
          >
            <Square className="h-4 w-4" />
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white"
          >
            <Mic className="h-4 w-4" />
            Registra
          </button>
        )}
        {audioUrl && (
          <>
            <audio src={audioUrl} controls className="h-9 flex-1" />
            <button
              type="button"
              onClick={remove}
              className="rounded-lg p-2 text-slate-400 hover:text-rose-600"
              aria-label="Elimina audio"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
