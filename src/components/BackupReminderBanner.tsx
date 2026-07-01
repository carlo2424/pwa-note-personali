import { useState } from 'react'
import { HardDriveDownload, X } from 'lucide-react'
import { downloadBackup } from '../utils/backup'
import {
  backupReminderMessage,
  markBackupCompleted,
  setBackupReminderEnabled,
  snoozeBackupReminder,
} from '../utils/backupReminder'

interface BackupReminderBannerProps {
  onOpenSettings: () => void
  onDismiss: () => void
}

export function BackupReminderBanner({
  onOpenSettings,
  onDismiss,
}: BackupReminderBannerProps) {
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      await downloadBackup()
      markBackupCompleted()
      onDismiss()
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Esportazione non riuscita.'
      alert(msg)
    } finally {
      setExporting(false)
    }
  }

  function handleSnooze() {
    snoozeBackupReminder()
    onDismiss()
  }

  function handleDisable() {
    setBackupReminderEnabled(false)
    onDismiss()
  }

  return (
    <div
      role="status"
      className="border-b border-sky-200 bg-sky-50 px-3 py-2.5"
    >
      <div className="flex items-start gap-2">
        <HardDriveDownload
          className="mt-0.5 h-4 w-4 shrink-0 text-sky-600"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-sky-900">Fai un backup</p>
          <p className="mt-0.5 text-[11px] leading-snug text-sky-800">
            {backupReminderMessage()}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={exporting}
              onClick={() => void handleExport()}
              className="rounded-lg bg-sky-600 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
            >
              {exporting ? 'Esportazione…' : 'Esporta ora'}
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded-lg border border-sky-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-sky-700"
            >
              Impostazioni
            </button>
            <button
              type="button"
              onClick={handleSnooze}
              className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-sky-600"
            >
              Più tardi
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDisable}
          className="shrink-0 rounded p-1 text-sky-500 hover:bg-sky-100"
          aria-label="Disattiva promemoria backup"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
