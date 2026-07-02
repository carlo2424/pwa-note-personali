import {
  canUseServiceWorker,
  isServiceWorkerBlocked,
  shouldSkipServiceWorkerRegistration,
} from './appRecovery'

const BUILD_KEY = 'pwa-app-build'

export function appBuildId(): string {
  return import.meta.env.VITE_APP_BUILD ?? 'dev'
}

export function appBuildLabel(): string {
  const id = appBuildId()
  return id.length > 7 ? id.slice(0, 7) : id
}

async function purgeAppShellCache(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    } catch {
      // ignora
    }
  }
  if ('caches' in window) {
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    } catch {
      // ignora
    }
  }
}

/** Se la build online è cambiata, svuota cache e chiedi un reload (non tocca IndexedDB). */
export async function prepareAppUpdate(): Promise<'reload' | 'continue'> {
  if (!import.meta.env.PROD) return 'continue'

  const build = appBuildId()
  const prev = localStorage.getItem(BUILD_KEY)

  if (prev && prev !== build) {
    localStorage.setItem(BUILD_KEY, build)
    await purgeAppShellCache()
    return 'reload'
  }

  if (!prev) localStorage.setItem(BUILD_KEY, build)
  return 'continue'
}

/** Aggiornamento manuale da Impostazioni: cache + reload senza bloccare il service worker. */
export async function forceAppUpdateAndReload(): Promise<void> {
  localStorage.setItem(BUILD_KEY, appBuildId())
  await purgeAppShellCache()
  const url = new URL(window.location.href)
  url.searchParams.set('_refresh', String(Date.now()))
  window.location.replace(url.toString())
}

export function registerProductionServiceWorker(): void {
  if (!import.meta.env.PROD) return
  if (shouldSkipServiceWorkerRegistration()) return
  if (isServiceWorkerBlocked()) return

  void canUseServiceWorker().then((ok) => {
    if (!ok) return
    void import('virtual:pwa-register')
      .then(({ registerSW }) => {
        registerSW({
          immediate: true,
          onRegisteredSW(_swUrl, registration) {
            if (registration) {
              window.setInterval(() => {
                void registration.update()
              }, 60 * 60 * 1000)
            }
          },
          onNeedRefresh() {
            window.location.reload()
          },
        })
      })
      .catch(() => {})
  })
}
