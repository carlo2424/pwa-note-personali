import Dexie from 'dexie'

/** Svuota cache PWA e service worker (senza toccare IndexedDB) */
export async function clearPwaCache(): Promise<void> {
  sessionStorage.setItem('pwa-recovery', String(Date.now()))

  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map((r) => r.unregister()))
  }
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
  }
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

/** Se l'app è stata appena recuperata, salta la registrazione SW una volta */
export function shouldSkipServiceWorkerRegistration(): boolean {
  const flag = sessionStorage.getItem('pwa-recovery')
  if (!flag) return false
  sessionStorage.removeItem('pwa-recovery')
  return true
}
