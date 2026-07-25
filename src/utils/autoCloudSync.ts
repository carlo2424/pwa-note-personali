import { db } from '../db'
import { saveAutoSnapshot, scheduleAutoSnapshot } from './backup'
import {
  ensureCloudCredentials,
  isCloudBackupEnabled,
  pushToCloud,
  reconcileCloudSync,
} from './cloudBackup'
import { isCloudSyncPaused } from './cloudSyncPause'

let cloudPushTimer: ReturnType<typeof setTimeout> | undefined
let hooksInstalled = false
let reloadGuardsInstalled = false
let pushInFlight: Promise<boolean> | null = null
let pushPending = false
let retryTimer: ReturnType<typeof setTimeout> | undefined

let reconcileInstalled = false

const PUSH_DEBOUNCE_MS = 150
const PUSH_MAX_ATTEMPTS = 5
const PUSH_RETRY_BACKOFF_MS = 800
const RECONCILE_INTERVAL_MS = 3 * 60 * 1000

async function executeCloudPush(options?: {
  keepalive?: boolean
}): Promise<boolean> {
  if (isCloudSyncPaused()) return false
  if (!(await ensureCloudCredentials()) || !isCloudBackupEnabled()) {
    return false
  }

  if (pushInFlight) {
    pushPending = true
    return pushInFlight
  }

  const run = async (): Promise<boolean> => {
    for (let attempt = 1; attempt <= PUSH_MAX_ATTEMPTS; attempt++) {
      try {
        return await pushToCloud({ keepalive: options?.keepalive })
      } catch (err) {
        if (attempt >= PUSH_MAX_ATTEMPTS) {
          console.warn('[Cloud] Salvataggio automatico non riuscito:', err)
          scheduleCloudPushRetry()
          return false
        }
        await new Promise((resolve) =>
          setTimeout(resolve, PUSH_RETRY_BACKOFF_MS * attempt),
        )
      }
    }
    return false
  }

  pushInFlight = run().finally(() => {
    pushInFlight = null
    if (pushPending) {
      pushPending = false
      void executeCloudPush(options)
    }
  })

  return pushInFlight
}

function scheduleCloudPushRetry(delayMs = 30_000): void {
  if (retryTimer || typeof window === 'undefined') return
  retryTimer = setTimeout(() => {
    retryTimer = undefined
    void executeCloudPush()
  }, delayMs)
}

/** Salvataggio cloud immediato (form, chiusura app, rete tornata online). */
export function flushCloudSyncNow(options?: { keepalive?: boolean }): void {
  if (cloudPushTimer) {
    clearTimeout(cloudPushTimer)
    cloudPushTimer = undefined
  }
  void saveAutoSnapshot()
  void executeCloudPush(options)
}

/** Dopo ogni modifica locale: snapshot + upload GitHub (debounced). */
export function notifyLocalDataChanged(delayMs = PUSH_DEBOUNCE_MS): void {
  if (isCloudSyncPaused()) return
  scheduleAutoSnapshot(200)
  if (cloudPushTimer) clearTimeout(cloudPushTimer)
  cloudPushTimer = setTimeout(() => {
    cloudPushTimer = undefined
    void executeCloudPush()
  }, delayMs)
}

/** Salva subito locale + GitHub (chiusura app, pull-to-refresh, cambio tab). */
export function flushBeforePageLeave(): void {
  flushCloudSyncNow({ keepalive: true })
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
  window.addEventListener('online', () => {
    void ensureCloudCredentials().then((ok) => {
      if (ok) flushCloudSyncNow()
    })
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flush()
      return
    }
    void ensureCloudCredentials()
  })

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

/**
 * Ogni 3 minuti (e al ritorno in primo piano) confronta locale/cloud e
 * ripristina o salva la versione più recente.
 */
export function installPeriodicCloudReconcile(): void {
  if (reconcileInstalled || typeof window === 'undefined') return
  reconcileInstalled = true

  const run = () => {
    if (isCloudSyncPaused() || !isCloudBackupEnabled()) return
    void reconcileCloudSync()
      .then((result) => {
        if (result === 'restored') window.location.reload()
      })
      .catch((err) => {
        console.warn('[Cloud] Riconciliazione periodica non riuscita:', err)
      })
  }

  window.setTimeout(run, 5_000)
  window.setInterval(run, RECONCILE_INTERVAL_MS)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') run()
  })
}
