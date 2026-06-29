import Dexie from 'dexie'

/** Svuota cache PWA e service worker (senza toccare IndexedDB) */
export async function clearPwaCache(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations()
    await Promise.all(regs.map((r) => r.unregister()))
  }
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
  }
}

/** Ripristino completo: cache app + reload */
export async function clearPwaCacheAndReload(): Promise<void> {
  await clearPwaCache()
  window.location.reload()
}

/** Reset database + cache (ultima risorsa) */
export async function resetAppData(): Promise<void> {
  await Dexie.delete('PersonalNotesDB')
  await clearPwaCache()
  window.location.reload()
}
