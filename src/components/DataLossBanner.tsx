import { useRef, useState } from 'react'
import { AlertTriangle, Upload, X } from 'lucide-react'
import { importBackupFile, summarizeBackup } from '../utils/backup'
import {
  clearDataFingerprint,
  type DataFingerprint,
} from '../utils/dataFingerprint'

interface DataLossBannerProps {
  previous: DataFingerprint
  onOpenSettings: () => void
  onRestored: () => void
  onDismiss: () => void
}

export function DataLossBanner({
  previous,
  onOpenSettings,
  onRestored,
  onDismiss,
}: DataLossBannerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  const total = previous.notes + previous.events + previous.expenses

  async function handleImport(file: File) {
    const ok = window.confirm(
      'Ripristinare il backup sostituirà i dati attuali (vuoti) con quelli del file.\n\nContinuare?',
    )
    if (!ok) return

    setImporting(true)
    try {
      const payload = await importBackupFile(file)
      await clearDataFingerprint()
      onRestored()
      alert(`Backup ripristinato: ${summarizeBackup(payload)}.`)
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Importazione non riuscita.'
      alert(msg)
    } finally {
      setImporting(false)
    }
  }

  function handleDismissEmpty() {
    const ok = window.confirm(
      'Confermi che vuoi partire da zero? L’avviso non comparirà più finché non aggiungi nuovi dati.',
    )
    if (!ok) return
    clearDataFingerprint()
    onDismiss()
  }

  return (
    <div
      role="alert"
      className="border-b border-rose-300 bg-rose-50 px-3 py-3"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-rose-900">
            Dati locali non trovati
          </p>
          <p className="mt-1 text-[11px] leading-snug text-rose-800">
            Il browser potrebbe aver cancellato lo storage (Brave e altri lo
            fanno se la protezione non è attiva). In precedenza avevi{' '}
            <span className="font-semibold">
              {total} {total === 1 ? 'elemento' : 'elementi'}
            </span>{' '}
            ({previous.notes} note, {previous.events} impegni,{' '}
            {previous.expenses} spese).
          </p>
          <p className="mt-1 text-[11px] leading-snug text-rose-800">
            Se hai un file di backup JSON, ripristinalo ora. Apri sempre l’app
            dallo stesso collegamento (icona Home o stesso tab).
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={importing}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
            >
              <Upload className="h-3 w-3" />
              {importing ? 'Ripristino…' : 'Ripristina backup'}
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded-lg border border-rose-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700"
            >
              Impostazioni
            </button>
            <button
              type="button"
              onClick={handleDismissEmpty}
              className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-rose-600"
            >
              Parto da zero
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (inputRef.current) inputRef.current.value = ''
              if (file) void handleImport(file)
            }}
          />
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded p-1 text-rose-500 hover:bg-rose-100"
          aria-label="Chiudi avviso"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
