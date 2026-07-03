import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { RecoveryScreen } from './components/RecoveryScreen.tsx'
import { db } from './db'
import { syncExpensesForEvent } from './utils/eventExpenses'
import {
  checkRenewalNotifications,
  pruneSentNotifications,
} from './utils/renewalNotifications'
import { migrateTextToSentenceCase } from './utils/textCaseMigrate'
import { syncChecklistForNote } from './utils/noteTasks'
import { resolveNoteKind } from './utils/noteKind'
import { requestPersistentStorage } from './utils/storagePersistence'
import {
  applyAppUpdateReload,
  prepareAppUpdate,
  registerProductionServiceWorker,
} from './utils/appUpdate'

const TEXT_CASE_MIGRATED_KEY = 'textCaseMigratedV1'
const NOTE_CHECKLIST_MIGRATED_KEY = 'noteChecklistMigratedV1'
const BOOT_TIMEOUT_MS = 12_000

/** In dev: rimuove SW e cache PWA che mostrano build vecchie su localhost */
async function clearPwaCacheInDev(): Promise<void> {
  if (!import.meta.env.DEV) return
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
  } catch {
    // Brave / privacy: service worker non consentito
  }
  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
  } catch {
    // ignora
  }
}

void clearPwaCacheInDev()

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
}

function Bootstrap() {
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
        await db.open()
        if (cancelled) return
        setReady(true)
        void requestPersistentStorage().then((granted) => {
          if (!granted) {
            console.warn(
              '[Storage] Persistenza non concessa: il browser potrebbe cancellare i dati automaticamente.',
            )
          }
        })
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

async function startApp(): Promise<void> {
  const action = await prepareAppUpdate()
  if (action === 'reload') {
    applyAppUpdateReload()
    return
  }

  registerProductionServiceWorker()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Bootstrap />
    </StrictMode>,
  )
}

void startApp()
