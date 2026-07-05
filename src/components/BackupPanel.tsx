import { useEffect, useRef, useState } from 'react'
import { Download, HardDriveDownload, Loader2, Link2, Upload } from 'lucide-react'
import {
  BACKUP_MIME,
  getLinkedBackupFileName,
  hasRollingLocalBackup,
  importBackupFile,
  linkBackupExportFile,
  restoreRollingLocalBackup,
  saveBackup,
  summarizeBackup,
  supportsBackupFilePicker,
  unlinkBackupExportFile,
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

function formatSaveStatus(result: Awaited<ReturnType<typeof saveBackup>>): string {
  const parts: string[] = []
  if (result.localCopyReplaced) {
    parts.push('copia interna sostituita')
  }
  if (result.linkedFileReplaced && result.linkedFileName) {
    parts.push(`file «${result.linkedFileName}» aggiornato`)
  } else if (result.downloaded) {
    parts.push('file scaricato con nome fisso (sostituisci quello vecchio se ne restano due)')
  }
  if (parts.length === 0) {
    return 'Backup esportato.'
  }
  return `Backup aggiornato: ${parts.join(' · ')}.`
}

export function BackupPanel({ onBackupDone }: BackupPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState<'export' | 'import' | 'local' | null>(
    null,
  )
  const [lastBackup, setLastBackup] = useState(getLastBackupAt())
  const [reminderEnabled, setReminderEnabled] = useState(isBackupReminderEnabled())
  const [replacePrevious, setReplacePrevious] = useState(true)
  const [linkedFileName, setLinkedFileName] = useState<string | null>(null)
  const [hasLocalCopy, setHasLocalCopy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLinkedFileName(await getLinkedBackupFileName())
      setHasLocalCopy(await hasRollingLocalBackup())
    })()
  }, [])

  async function refreshBackupMeta() {
    setLinkedFileName(await getLinkedBackupFileName())
    setHasLocalCopy(await hasRollingLocalBackup())
  }

  async function handleExport() {
    setLoading('export')
    setStatus(null)
    try {
      const result = await saveBackup({ replacePrevious })
      markBackupCompleted()
      setLastBackup(getLastBackupAt())
      await refreshBackupMeta()
      setStatus(formatSaveStatus(result))
      onBackupDone?.()
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Esportazione non riuscita.'
      alert(msg)
    } finally {
      setLoading(null)
    }
  }

  async function handleLinkFile() {
    try {
      await linkBackupExportFile()
      await refreshBackupMeta()
      setStatus('File collegato: i prossimi backup lo sostituiranno automaticamente.')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const msg =
        err instanceof Error ? err.message : 'Impossibile collegare il file.'
      alert(msg)
    }
  }

  async function handleUnlinkFile() {
    await unlinkBackupExportFile()
    await refreshBackupMeta()
    setStatus('File collegato scollegato.')
  }

  async function handleRestoreLocal() {
    const ok = window.confirm(
      'Ripristinare l’ultima copia locale sostituirà tutti i dati attuali.\n\nContinuare?',
    )
    if (!ok) return

    setLoading('local')
    setStatus(null)
    try {
      const payload = await restoreRollingLocalBackup()
      markBackupCompleted()
      setLastBackup(getLastBackupAt())
      setStatus(`Copia locale ripristinata: ${summarizeBackup(payload)}.`)
      onBackupDone?.()
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Ripristino locale non riuscito.'
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
            Esporta tutto in JSON. Con «un solo file» la copia precedente
            nell’app viene sostituita, senza accumulare versioni simili.
          </p>
        </div>
      </div>

      <p className="mb-3 text-xs text-slate-500">
        Ultimo backup:{' '}
        <span className="font-medium text-slate-700">
          {formatLastBackupLabel(lastBackup)}
        </span>
      </p>

      <label className="mb-3 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
        <input
          type="checkbox"
          checked={replacePrevious}
          onChange={(e) => setReplacePrevious(e.target.checked)}
          className="mt-0.5 h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
        />
        <span className="text-sm text-slate-700">
          <span className="font-medium">Un solo file</span>
          <span className="mt-0.5 block text-xs text-slate-500">
            Sostituisce la copia interna e, se collegato, lo stesso file sul
            telefono. Il download usa sempre lo stesso nome.
          </span>
        </span>
      </label>

      {linkedFileName ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-900">
          <span>
            File collegato:{' '}
            <span className="font-semibold">{linkedFileName}</span>
          </span>
          <button
            type="button"
            onClick={() => void handleUnlinkFile()}
            className="rounded-md border border-sky-200 bg-white px-2 py-0.5 font-medium text-sky-800"
          >
            Scollega
          </button>
        </div>
      ) : supportsBackupFilePicker() ? (
        <button
          type="button"
          onClick={() => void handleLinkFile()}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-sky-300 bg-white py-2.5 text-xs font-semibold text-sky-700 hover:bg-sky-50"
        >
          <Link2 className="h-3.5 w-3.5" />
          Collega file da sostituire ogni backup
        </button>
      ) : null}

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

        {hasLocalCopy && (
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => void handleRestoreLocal()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-300 bg-white py-3 text-sm font-semibold text-sky-800 hover:bg-sky-50 disabled:opacity-50"
          >
            {loading === 'local' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Ripristino…
              </>
            ) : (
              'Ripristina ultima copia locale'
            )}
          </button>
        )}

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
