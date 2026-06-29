import Dexie from 'dexie'

const SW_BLOCKED_KEY = 'pwa-sw-blocked'

export function isServiceWorkerBlocked(): boolean {
  return localStorage.getItem(SW_BLOCKED_KEY) === '1'
}

function markServiceWorkerBlocked(): void {
  localStorage.setItem(SW_BLOCKED_KEY, '1')
}

/** True se il browser consente l'uso dei service worker */
export async function canUseServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  if (isServiceWorkerBlocked()) return false
  try {
    await navigator.serviceWorker.getRegistrations()
    return true
  } catch (err) {
    console.warn('[PWA] Service worker non disponibile:', err)
    markServiceWorkerBlocked()
    return false
  }
}

async function safeUnregisterServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map((r) => r.unregister()))
  } catch (err) {
    console.warn('[PWA] Impossibile rimuovere service worker:', err)
    markServiceWorkerBlocked()
  }
}

async function safeClearCaches(): Promise<void> {
  if (!('caches' in window)) return
  try {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
  } catch (err) {
    console.warn('[PWA] Impossibile svuotare cache:', err)
  }
}

/** Svuota cache PWA (non tocca IndexedDB). Non lancia errori. */
export async function clearPwaCache(): Promise<void> {
  sessionStorage.setItem('pwa-recovery', String(Date.now()))
  markServiceWorkerBlocked()
  await safeUnregisterServiceWorkers()
  await safeClearCaches()
}

function recoveryUrl(): string {
  const url = new URL(window.location.href)
  url.searchParams.set('_recover', String(Date.now()))
  return url.toString()
}

/** Ripristino completo: cache app + reload forzato */
export async function clearPwaCacheAndReload(): Promise<void> {
  await clearPwaCache()
  window.location.replace(recoveryUrl())
}

/** Reset database + cache (ultima risorsa) */
export async function resetAppData(): Promise<void> {
  await Dexie.delete('PersonalNotesDB')
  await clearPwaCache()
  window.location.replace(recoveryUrl())
}

/** Salta registrazione SW subito dopo un recupero */
export function shouldSkipServiceWorkerRegistration(): boolean {
  const flag = sessionStorage.getItem('pwa-recovery')
  if (!flag) return false
  sessionStorage.removeItem('pwa-recovery')
  return true
}
