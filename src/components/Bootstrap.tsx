import { useEffect, useState } from 'react'
import App from '../App.tsx'
import { RecoveryScreen } from './RecoveryScreen.tsx'
import { db } from '../db'
import { syncExpensesForEvent } from '../utils/eventExpenses'
import {
  checkRenewalNotifications,
  pruneSentNotifications,
} from '../utils/renewalNotifications'
import { migrateTextToSentenceCase } from '../utils/textCaseMigrate'
import { syncChecklistForNote } from '../utils/noteTasks'
import { resolveNoteKind } from '../utils/noteKind'
import {
  ensurePersistentStorage,
  schedulePersistentStorageOnInteraction,
} from '../utils/storagePersistence'
import { updateDataFingerprint } from '../utils/dataFingerprint'
import { hasBackupableData, saveAutoSnapshot, tryAutoRestore } from '../utils/backup'
import {
  isCloudBackupEnabled,
  restoreFromCloud,
  seedCloudTokenFromUrl,
} from '../utils/cloudBackup'

const TEXT_CASE_MIGRATED_KEY = 'textCaseMigratedV1'
const NOTE_CHECKLIST_MIGRATED_KEY = 'noteChecklistMigratedV1'
const BOOT_TIMEOUT_MS = 12_000

async function runPostOpenTasks(): Promise<void> {
  const events = await db.events.toArray()
  for (const e of events) {
    if (!e.id) continue
    const hasLinked = await db.expenses.where('eventId').equals(e.id).count()
    if (hasLinked === 0 && (e.cost || e.received)) {
      await syncExpensesForEvent(e.id, e)
    }
  }

  if (!localStorage.getItem(TEXT_CASE_MIGRATED_KEY)) {
    await migrateTextToSentenceCase()
    localStorage.setItem(TEXT_CASE_MIGRATED_KEY, '1')
  }

  if (!localStorage.getItem(NOTE_CHECKLIST_MIGRATED_KEY)) {
    const notes = await db.notes.toArray()
    for (const note of notes) {
      if (!note.id) continue
      await syncChecklistForNote(
        note.id,
        note.content ?? '',
        resolveNoteKind(note),
      )
    }
    localStorage.setItem(NOTE_CHECKLIST_MIGRATED_KEY, '1')
  }

  pruneSentNotifications()
  await checkRenewalNotifications()
  setInterval(() => {
    checkRenewalNotifications()
  }, 60 * 60 * 1000)

  // Aggiorna lo snapshot automatico dopo aver aperto il DB.
  await saveAutoSnapshot()
}

export function Bootstrap() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slowBoot, setSlowBoot] = useState(false)

  useEffect(() => {
    let cancelled = false

    const timeout = window.setTimeout(() => {
      if (!cancelled) setSlowBoot(true)
    }, BOOT_TIMEOUT_MS)

    async function boot() {
      try {
        await ensurePersistentStorage()
        schedulePersistentStorageOnInteraction()
        await db.open()
        if (cancelled) return

        // Recupero automatico: se il DB è vuoto ma esiste uno snapshot,
        // ripristina prima di mostrare l'app (protezione perdita dati Brave).
        try {
          await tryAutoRestore()
        } catch (err) {
          console.error('[DB] Ripristino automatico non riuscito:', err)
        }
        if (cancelled) return

        // Se anche le copie locali sono vuote, prova il backup cloud.
        // Prima re-inserisce il token dall'URL (collegamento di ripristino),
        // così il recupero è automatico anche dopo una cancellazione di Brave.
        try {
          seedCloudTokenFromUrl()
          if (isCloudBackupEnabled() && !(await hasBackupableData())) {
            await restoreFromCloud()
          }
        } catch (err) {
          console.error('[Cloud] Ripristino dal cloud non riuscito:', err)
        }
        if (cancelled) return

        await updateDataFingerprint()
        if (cancelled) return
        setReady(true)
        void runPostOpenTasks().catch((err) => {
          console.error('[DB] Errore attività post-avvio:', err)
        })
      } catch (err) {
        console.error('[DB] Errore avvio:', err)
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Errore database sconosciuto',
          )
        }
      }
    }

    void boot()
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [])

  if (error) {
    return (
      <RecoveryScreen
        title="Impossibile aprire il database locale"
        detail={error}
      />
    )
  }

  if (!ready) {
    return (
      <RecoveryScreen
        title={
          slowBoot
            ? 'Caricamento lento…'
            : 'Caricamento Note Personali…'
        }
        showLoadingHint
      />
    )
  }

  return <App />
}
