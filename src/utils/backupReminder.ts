const ENABLED_KEY = 'pwa-backup-reminder-enabled'
const LAST_BACKUP_KEY = 'pwa-backup-last-at'
const SNOOZE_UNTIL_KEY = 'pwa-backup-snooze-until'
const FIRST_SEEN_KEY = 'pwa-backup-first-seen'

/** Giorni tra un backup e il promemoria successivo */
export const BACKUP_REMINDER_INTERVAL_DAYS = 7

/** Giorni senza backup prima del primo promemoria */
const FIRST_REMINDER_AFTER_DAYS = 3

/** Durata “Più tardi” */
export const BACKUP_SNOOZE_DAYS = 3

function dayMs(): number {
  return 24 * 60 * 60 * 1000
}

function readNumber(key: string): number | null {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

export function isBackupReminderEnabled(): boolean {
  const raw = localStorage.getItem(ENABLED_KEY)
  return raw !== 'false'
}

export function setBackupReminderEnabled(enabled: boolean): void {
  localStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false')
  if (!enabled) localStorage.removeItem(SNOOZE_UNTIL_KEY)
}

export function getLastBackupAt(): number | null {
  return readNumber(LAST_BACKUP_KEY)
}

export function markBackupCompleted(at = Date.now()): void {
  localStorage.setItem(LAST_BACKUP_KEY, String(at))
  localStorage.removeItem(SNOOZE_UNTIL_KEY)
}

export function snoozeBackupReminder(days = BACKUP_SNOOZE_DAYS): void {
  localStorage.setItem(SNOOZE_UNTIL_KEY, String(Date.now() + days * dayMs()))
}

function ensureFirstSeen(): number {
  const existing = readNumber(FIRST_SEEN_KEY)
  if (existing != null) return existing
  const now = Date.now()
  localStorage.setItem(FIRST_SEEN_KEY, String(now))
  return now
}

function isSnoozed(): boolean {
  const until = readNumber(SNOOZE_UNTIL_KEY)
  return until != null && until > Date.now()
}

export function daysSinceLastBackup(): number | null {
  const last = getLastBackupAt()
  if (last == null) return null
  return Math.floor((Date.now() - last) / dayMs())
}

export function shouldShowBackupReminder(): boolean {
  if (!isBackupReminderEnabled()) return false
  if (isSnoozed()) return false

  const last = getLastBackupAt()
  if (last == null) {
    const firstSeen = ensureFirstSeen()
    const daysSinceFirst = Math.floor((Date.now() - firstSeen) / dayMs())
    return daysSinceFirst >= FIRST_REMINDER_AFTER_DAYS
  }

  const daysSince = Math.floor((Date.now() - last) / dayMs())
  return daysSince >= BACKUP_REMINDER_INTERVAL_DAYS
}

export function backupReminderMessage(): string {
  const days = daysSinceLastBackup()
  if (days == null) {
    return 'Non hai ancora fatto un backup. Esporta i dati per non perderli.'
  }
  if (days >= BACKUP_REMINDER_INTERVAL_DAYS) {
    return `Ultimo backup ${days} giorni fa. Ti consigliamo di esportare una copia.`
  }
  return 'È il momento di fare un backup dei tuoi dati.'
}

export function formatLastBackupLabel(at: number | null): string {
  if (at == null) return 'Mai eseguito'
  return new Date(at).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
