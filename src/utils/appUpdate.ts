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

function versionJsonUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}version.json`.replace(/([^:]\/)\/+/g, '$1')
}

/** Build pubblicata su GitHub Pages (non dalla cache del bundle locale). */
export async function fetchRemoteBuildId(): Promise<string | null> {
  try {
    const res = await fetch(`${versionJsonUrl()}?_${Date.now()}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = (await res.json()) as { build?: string }
    return typeof data.build === 'string' && data.build.length > 0
      ? data.build
      : null
  } catch {
    return null
  }
}

export function isUpdateAvailable(remoteBuild: string | null): boolean {
  if (!remoteBuild) return false
  return remoteBuild !== appBuildId()
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

function reloadWithCacheBust(): void {
  const url = new URL(window.location.href)
  url.searchParams.set('_refresh', String(Date.now()))
  window.location.replace(url.toString())
}

export function applyAppUpdateReload(): void {
  reloadWithCacheBust()
}

/** Confronta con version.json online: rileva deploy anche con bundle PWA in cache. */
export async function prepareAppUpdate(): Promise<'reload' | 'continue'> {
  if (!import.meta.env.PROD) return 'continue'

  const remote = await fetchRemoteBuildId()
  if (!remote) {
    const stored = localStorage.getItem(BUILD_KEY)
    if (!stored) localStorage.setItem(BUILD_KEY, appBuildId())
    return 'continue'
  }

  const embedded = appBuildId()
  const stored = localStorage.getItem(BUILD_KEY)

  if (embedded !== remote || (stored && stored !== remote)) {
    localStorage.setItem(BUILD_KEY, remote)
    await purgeAppShellCache()
    return 'reload'
  }

  if (!stored) localStorage.setItem(BUILD_KEY, remote)
  return 'continue'
}

/** Aggiornamento manuale da Impostazioni: cache + reload senza bloccare IndexedDB. */
export async function forceAppUpdateAndReload(): Promise<void> {
  const remote = await fetchRemoteBuildId()
  if (remote) localStorage.setItem(BUILD_KEY, remote)
  else localStorage.removeItem(BUILD_KEY)
  await purgeAppShellCache()
  reloadWithCacheBust()
}

function scheduleServiceWorkerUpdateChecks(
  registration: ServiceWorkerRegistration,
): void {
  const check = () => void registration.update()
  check()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check()
  })
  window.setInterval(check, 5 * 60 * 1000)
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
            if (registration) scheduleServiceWorkerUpdateChecks(registration)
          },
          onNeedRefresh() {
            reloadWithCacheBust()
          },
        })
      })
      .catch(() => {})
  })
}
