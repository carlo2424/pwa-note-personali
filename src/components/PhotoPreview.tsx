import { useState } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'

type PhotoPreviewVariant = 'form' | 'card' | 'card-compact'

const VARIANT_CLASS: Record<PhotoPreviewVariant, string> = {
  form: 'max-h-[min(70vh,28rem)]',
  card: 'max-h-96',
  'card-compact': 'max-h-72',
}

interface PhotoPreviewProps {
  src: string
  alt?: string
  variant?: PhotoPreviewVariant
  removable?: boolean
  onRemove?: () => void
}

export function PhotoPreview({
  src,
  alt = 'Foto allegata',
  variant = 'card',
  removable = false,
  onRemove,
}: PhotoPreviewProps) {
  const [fullscreen, setFullscreen] = useState(false)

  return (
    <>
      <div className="relative overflow-hidden rounded-xl bg-slate-100">
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="block w-full touch-manipulation"
          aria-label="Apri foto a schermo intero"
        >
          <img
            src={src}
            alt={alt}
            className={`mx-auto w-full ${VARIANT_CLASS[variant]} object-contain`}
          />
        </button>
        {removable && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white"
            aria-label="Rimuovi foto"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <p className="pointer-events-none absolute bottom-1.5 right-2 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-medium text-white">
          Tocca per ingrandire
        </p>
      </div>

      {fullscreen &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/92 p-3"
            onClick={() => setFullscreen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Foto a schermo intero"
          >
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="absolute right-3 top-3 rounded-full bg-white/15 p-2 text-white"
              aria-label="Chiudi"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={src}
              alt={alt}
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body,
        )}
    </>
  )
}
