import { Archive, Pencil, Trash2 } from 'lucide-react'

const btnClass =
  'rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-100 hover:text-indigo-600'
const deleteClass =
  'rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-100 hover:text-rose-600'
const archiveClass =
  'rounded-lg p-1.5 text-slate-400 transition hover:bg-amber-100 hover:text-amber-600'

interface ItemActionsProps {
  onEdit?: () => void
  onDelete?: () => void
  onArchive?: () => void
  editLabel?: string
  deleteLabel?: string
  archiveLabel?: string
}

/** Matita / cestino / archivio — stile uniforme in tutta l'app */
export function ItemActions({
  onEdit,
  onDelete,
  onArchive,
  editLabel = 'Modifica',
  deleteLabel = 'Elimina',
  archiveLabel = 'Archivia',
}: ItemActionsProps) {
  if (!onEdit && !onDelete && !onArchive) return null

  return (
    <div className="flex shrink-0 items-center">
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className={btnClass}
          aria-label={editLabel}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      {onArchive && (
        <button
          type="button"
          onClick={onArchive}
          className={archiveClass}
          aria-label={archiveLabel}
        >
          <Archive className="h-3.5 w-3.5" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className={deleteClass}
          aria-label={deleteLabel}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
