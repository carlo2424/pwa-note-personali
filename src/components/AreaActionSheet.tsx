import { createPortal } from 'react-dom'
import { Pencil, Trash2 } from 'lucide-react'

interface AreaActionSheetProps {
  areaName: string
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}

/** Menu Modifica / Elimina dopo pressione lunga su un chip area */
export function AreaActionSheet({
  areaName,
  onEdit,
  onDelete,
  onClose,
}: AreaActionSheetProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Azioni per ${areaName}`}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="border-b border-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-800">
          {areaName}
        </p>
        <button
          type="button"
          onClick={() => {
            onClose()
            onEdit()
          }}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          <Pencil className="h-4 w-4 text-indigo-600" />
          Modifica
        </button>
        <button
          type="button"
          onClick={() => {
            onClose()
            onDelete()
          }}
          className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
        >
          <Trash2 className="h-4 w-4" />
          Elimina
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-1 w-full border-t border-slate-100 py-3.5 text-center text-sm font-medium text-slate-500 hover:bg-slate-50"
        >
          Annulla
        </button>
      </div>
    </div>,
    document.body,
  )
}
