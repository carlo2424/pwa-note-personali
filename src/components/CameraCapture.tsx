import { Camera } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { PhotoPreview } from './PhotoPreview'

interface CameraCaptureProps {
  photo?: Blob
  onCapture: (blob: Blob | undefined) => void
}

/** Acquisizione foto dalla fotocamera del telefono */
export function CameraCapture({ photo, onCapture }: CameraCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const preview = useMemo(
    () => (photo ? URL.createObjectURL(photo) : undefined),
    [photo],
  )

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    onCapture(file)
  }

  function remove() {
    onCapture(undefined)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Foto (fotocamera)
      </label>
      {preview ? (
        <PhotoPreview
          src={preview}
          alt="Anteprima"
          variant="form"
          removable
          onRemove={remove}
        />
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
