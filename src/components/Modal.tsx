import { X } from 'lucide-react'
import { type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ErrorBoundary } from './ErrorBoundary'

interface ModalProps {
  title: string
  children: ReactNode
  onClose: () => void
}

export function Modal({ title, children, onClose }: ModalProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3
            id="modal-title"
            className="text-lg font-semibold text-slate-900"
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Chiudi"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[82vh] overflow-y-auto px-5 py-4">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </div>
    </div>,
    document.body,
  )
}
