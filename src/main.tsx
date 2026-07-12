import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { installReloadPersistenceGuards } from './utils/autoCloudSync'
import { ensureCloudCredentials } from './utils/cloudBackup'
import { Bootstrap } from './components/Bootstrap.tsx'
import {
  applyAppUpdateReload,
  prepareAppUpdate,
  registerProductionServiceWorker,
  scheduleRemoteBuildChecks,
} from './utils/appUpdate'

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

installReloadPersistenceGuards()

async function startApp(): Promise<void> {
  const action = await prepareAppUpdate()
  if (action === 'reload') {
    applyAppUpdateReload()
    return
  }

  registerProductionServiceWorker()
  scheduleRemoteBuildChecks()

  try {
    await ensureCloudCredentials()
  } catch (err) {
    console.error('[Cloud] Credenziali non recuperate:', err)
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Bootstrap />
    </StrictMode>,
  )
}

void startApp()
