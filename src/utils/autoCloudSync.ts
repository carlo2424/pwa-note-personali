import { db } from '../db'
import { saveAutoSnapshot, scheduleAutoSnapshot } from './backup'
import { isCloudBackupEnabled, pushToCloud } from './cloudBackup'

let cloudPushTimer: ReturnType<typeof setTimeout> | undefined
let hooksInstalled = false
let reloadGuardsInstalled = false

/** Dopo ogni modifica locale: snapshot + upload GitHub (debounced). */
export function notifyLocalDataChanged(delayMs = 400): void {
  scheduleAutoSnapshot(300)
  if (!isCloudBackupEnabled()) return
  if (cloudPushTimer) clearTimeout(cloudPushTimer)
  cloudPushTimer = setTimeout(() => {
    cloudPushTimer = undefined
    void pushToCloud().catch((err) => {
      console.warn('[Cloud] Salvataggio automatico non riuscito:', err)
    })
  }, delayMs)
}

/** Salva subito locale + GitHub (chiusura app, pull-to-refresh, cambio tab). */
export function flushBeforePageLeave(): void {
  if (cloudPushTimer) {
    clearTimeout(cloudPushTimer)
    cloudPushTimer = undefined
  }
  void saveAutoSnapshot()
  if (!isCloudBackupEnabled()) return
  void pushToCloud({ keepalive: true }).catch(() => {})
}

/** @deprecated Usa flushBeforePageLeave */
export function flushCloudPush(): void {
  flushBeforePageLeave()
}

/**
 * Prima di ricaricare la pagina (pull-to-refresh, chiusura tab, ecc.)
 * salva snapshot locale e backup GitHub con keepalive.
 */
export function installReloadPersistenceGuards(): void {
  if (reloadGuardsInstalled || typeof window === 'undefined') return
  reloadGuardsInstalled = true

  const flush = () => {
    flushBeforePageLeave()
  }

  window.addEventListener('pagehide', flush)
  window.addEventListener('beforeunload', flush)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })

  // Gesto pull-to-refresh: in cima alla pagina, al primo trascinamento verso il basso.
  let touchStartY = 0
  let pullFlushDone = false
  window.addEventListener(
    'touchstart',
    (e) => {
      if (window.scrollY > 2) return
      touchStartY = e.touches[0]?.clientY ?? 0
      pullFlushDone = false
    },
    { passive: true },
  )
  window.addEventListener(
    'touchmove',
    (e) => {
      if (pullFlushDone || window.scrollY > 2) return
      const y = e.touches[0]?.clientY ?? 0
      if (y - touchStartY > 48) {
        pullFlushDone = true
        flush()
      }
    },
    { passive: true },
  )
}

/**
 * Ogni scrittura sul database locale → backup automatico su GitHub Gist
 * (sovrascrive sempre l'ultima versione nel cloud).
 */
export function installAutoCloudSyncHooks(): void {
  if (hooksInstalled) return
  hooksInstalled = true

  const tables = [
    db.notes,
    db.expenses,
    db.archive,
    db.events,
    db.tasks,
    db.taskLists,
    db.paymentCards,
    db.areas,
  ]

  const onChange = () => {
    notifyLocalDataChanged()
  }

  for (const table of tables) {
    table.hook('creating', onChange)
    table.hook('updating', onChange)
    table.hook('deleting', onChange)
  }
}
