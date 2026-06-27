import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { db } from './db'
import { syncExpensesForEvent } from './utils/eventExpenses'
import {
  checkRenewalNotifications,
  pruneSentNotifications,
} from './utils/renewalNotifications'
import { migrateTextToSentenceCase } from './utils/textCaseMigrate'

const TEXT_CASE_MIGRATED_KEY = 'textCaseMigratedV1'

/** In dev: rimuove SW e cache PWA che mostrano build vecchie su localhost */
async function clearPwaCacheInDev(): Promise<void> {
  if (!import.meta.env.DEV) return
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map((r) => r.unregister()))
  }
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
  }
}

void clearPwaCacheInDev()

// Sincronizza spese per eventi già salvati (dati precedenti)
db.open().then(async () => {
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

  pruneSentNotifications()
  await checkRenewalNotifications()
  setInterval(() => {
    checkRenewalNotifications()
  }, 60 * 60 * 1000)
})

// Registra il service worker PWA solo in produzione (build)
if (import.meta.env.PROD) {
  const updateSW = registerSW({
    immediate: true,
    onOfflineReady() {
      console.info('[PWA] App pronta per uso offline')
    },
    onNeedRefresh() {
      if (
        window.confirm(
          'È disponibile una nuova versione. Aggiornare ora?',
        )
      ) {
        updateSW(true)
      }
    },
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
