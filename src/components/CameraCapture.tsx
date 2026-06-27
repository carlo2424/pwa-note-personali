import { Camera, X } from 'lucide-react'
import { useRef, useState } from 'react'

interface CameraCaptureProps {
  photo?: Blob
  onCapture: (blob: Blob | undefined) => void
}

/** Acquisizione foto dalla fotocamera del telefono */
export function CameraCapture({ photo, onCapture }: CameraCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | undefined>(
    photo ? URL.createObjectURL(photo) : undefined,
  )

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    onCapture(file)
    setPreview(URL.createObjectURL(file))
  }

  function remove() {
    onCapture(undefined)
    setPreview(undefined)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Foto (fotocamera)
      </label>
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Anteprima"
            className="h-32 w-full rounded-xl object-cover"
          />
          <button
            type="button"
            onClick={remove}
            className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white"
            aria-label="Rimuovi foto"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-6 text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600"
        >
          <Camera className="h-5 w-5" />
          Scatta o carica foto
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}
