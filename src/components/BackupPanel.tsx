import { useRef, useState } from 'react'
import { Download, HardDriveDownload, Loader2, Upload } from 'lucide-react'
import {
  BACKUP_MIME,
  downloadBackup,
  importBackupFile,
  summarizeBackup,
} from '../utils/backup'
import {
  formatLastBackupLabel,
  getLastBackupAt,
  isBackupReminderEnabled,
  markBackupCompleted,
  setBackupReminderEnabled,
} from '../utils/backupReminder'

interface BackupPanelProps {
  onBackupDone?: () => void
}

export function BackupPanel({ onBackupDone }: BackupPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState<'export' | 'import' | null>(null)
  const [lastBackup, setLastBackup] = useState(getLastBackupAt())
  const [reminderEnabled, setReminderEnabled] = useState(isBackupReminderEnabled())
  const [status, setStatus] = useState<string | null>(null)

  async function handleExport() {
    setLoading('export')
    setStatus(null)
    try {
      await downloadBackup()
      markBackupCompleted()
      setLastBackup(getLastBackupAt())
      setStatus('Backup esportato sul dispositivo.')
      onBackupDone?.()
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Esportazione non riuscita.'
      alert(msg)
    } finally {
      setLoading(null)
    }
  }

  async function handleImport(file: File) {
    setLoading('import')
    setStatus(null)
    try {
      const payload = await importBackupFile(file)
      markBackupCompleted()
      setLastBackup(getLastBackupAt())
      setStatus(`Backup ripristinato: ${summarizeBackup(payload)}.`)
      onBackupDone?.()
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Importazione non riuscita.'
      alert(msg)
    } finally {
      setLoading(null)
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return

    const ok = window.confirm(
      'Il ripristino sostituisce tutti i dati attuali con quelli del file di backup.\n\nContinuare?',
    )
    if (!ok) return
    await handleImport(file)
  }

  function handleReminderToggle(enabled: boolean) {
    setBackupReminderEnabled(enabled)
    setReminderEnabled(enabled)
  }

  return (
    <section className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
          <HardDriveDownload className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-800">
            Backup dati
          </h4>
          <p className="mt-0.5 text-xs text-slate-500">
            Esporta tutto in un file JSON sul dispositivo. Conservalo in un posto
            sicuro (cloud, email, PC).
          </p>
        </div>
      </div>

      <p className="mb-3 text-xs text-slate-500">
        Ultimo backup:{' '}
        <span className="font-medium text-slate-700">
          {formatLastBackupLabel(lastBackup)}
        </span>
      </p>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => void handleExport()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50"
        >
          {loading === 'export' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Esportazione…
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Esporta backup
            </>
          )}
        </button>

        <button
          type="button"
          disabled={loading !== null}
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 hover:border-sky-400 hover:text-sky-700 disabled:opacity-50"
        >
          {loading === 'import' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Ripristino…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Ripristina da file
            </>
          )}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={`${BACKUP_MIME},.json,application/json`}
        className="hidden"
        onChange={(e) => void onFileChange(e)}
      />

      {status && (
        <p className="mt-2 text-xs font-medium text-sky-700">{status}</p>
      )}

      <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 border-t border-slate-200/80 pt-3">
        <span className="text-sm text-slate-700">
          Promemoria periodico backup
        </span>
        <input
          type="checkbox"
          checked={reminderEnabled}
          onChange={(e) => handleReminderToggle(e.target.checked)}
          className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
        />
      </label>
      <p className="mt-1 text-xs text-slate-400">
        Avviso ogni 7 giorni se non hai esportato un backup di recente.
      </p>
    </section>
  )
}
