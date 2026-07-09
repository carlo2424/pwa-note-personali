import {
  getNotificationPermission,
  requestNotificationPermission,
} from './renewalNotifications'

export interface StorageStatus {
  /** Il browser espone l'API Storage persistente */
  supported: boolean
  /** Lo storage è protetto dalla cancellazione automatica */
  persisted: boolean
  usageBytes?: number
  quotaBytes?: number
}

export interface StorageProtectionInfo {
  supported: boolean
  persisted: boolean
  /** Etichetta breve per l'UI */
  label: 'Protetto' | 'Non concessa' | 'Non supportata'
  /** Spiegazione e consigli pratici */
  help: string
  isBrave: boolean
}

function storageManager(): StorageManager | undefined {
  return typeof navigator !== 'undefined' ? navigator.storage : undefined
}

export function isBraveBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  return /brave/i.test(navigator.userAgent)
}

export function buildStorageProtectionInfo(
  status: Pick<StorageStatus, 'supported' | 'persisted'>,
): StorageProtectionInfo {
  const isBrave = isBraveBrowser()

  if (!status.supported) {
    return {
      ...status,
      isBrave,
      label: 'Non supportata',
      help: 'Questo browser non espone la protezione automatica. Esporta backup regolari da Impostazioni.',
    }
  }

  if (status.persisted) {
    return {
      ...status,
      isBrave,
      label: 'Protetto',
      help: 'I dati sono protetti dalla cancellazione automatica del browser. Continua a fare backup periodici.',
    }
  }

  if (isBrave) {
    return {
      ...status,
      isBrave,
      label: 'Non concessa',
      help:
        'Brave decide da solo e spesso rifiuta la protezione, anche con l’app installata in Home. Non restare in attesa: i dati sono comunque sul telefono, ma Brave può cancellarli se liberi spazio o pulisci i dati del sito. Esporta un backup JSON ogni settimana — è la copia più affidabile.',
    }
  }

  return {
    ...status,
    isBrave,
    label: 'Non concessa',
    help:
      'Il browser non ha accettato la richiesta (non compare un messaggio di conferma). Usa spesso l’app installata in Home ed esporta backup regolari.',
  }
}

/** True se lo storage è già marcato come persistente */
export async function isStoragePersisted(): Promise<boolean> {
  const storage = storageManager()
  if (!storage?.persisted) return false
  try {
    return await storage.persisted()
  } catch {
    return false
  }
}

/**
 * Chiede al browser di rendere lo storage persistente (non cancellabile
 * automaticamente). Restituisce true se concesso.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  const storage = storageManager()
  if (!storage?.persist) return false
  try {
    if (storage.persisted && (await storage.persisted())) return true
    return await storage.persist()
  } catch {
    return false
  }
}

/** Attiva la protezione all'avvio (default). */
export async function ensurePersistentStorage(): Promise<boolean> {
  return requestPersistentStorage()
}

/**
 * Richiesta "rafforzata", da chiamare su un gesto utente (es. tap su un
 * pulsante). Se il browser nega la protezione, prova a ottenere il permesso
 * Notifiche — segnale forte che spinge Chromium/Brave a concedere `persist()` —
 * e poi ritenta. Restituisce true se la protezione è ora attiva.
 */
export async function requestPersistentStorageBoosted(): Promise<boolean> {
  if (await requestPersistentStorage()) return true

  try {
    if (getNotificationPermission() === 'default') {
      await requestNotificationPermission()
      return requestPersistentStorage()
    }
  } catch {
    // permesso notifiche non disponibile: nulla da fare
  }
  return false
}

let interactionHookInstalled = false

/** Ritenta al primo tocco se il browser non ha concesso la protezione in avvio. */
export function schedulePersistentStorageOnInteraction(): void {
  if (interactionHookInstalled || typeof window === 'undefined') return
  interactionHookInstalled = true

  const tryPersist = () => {
    void ensurePersistentStorage().then((granted) => {
      if (granted) {
        window.removeEventListener('pointerdown', tryPersist, true)
        window.removeEventListener('keydown', tryPersist, true)
      }
    })
  }

  window.addEventListener('pointerdown', tryPersist, true)
  window.addEventListener('keydown', tryPersist, true)
}

export async function getStorageStatus(): Promise<StorageStatus> {
  const storage = storageManager()
  const supported = !!storage?.persist
  let persisted = false
  let usageBytes: number | undefined
  let quotaBytes: number | undefined

  if (supported && storage) {
    try {
      if (storage.persisted) persisted = await storage.persisted()
    } catch {
      persisted = false
    }
    try {
      if (storage.estimate) {
        const estimate = await storage.estimate()
        usageBytes = estimate.usage
        quotaBytes = estimate.quota
      }
    } catch {
      // stima non disponibile
    }
  }

  return { supported, persisted, usageBytes, quotaBytes }
}

export function formatBytes(bytes?: number): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`
}
