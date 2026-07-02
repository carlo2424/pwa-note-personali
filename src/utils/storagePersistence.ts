export interface StorageStatus {
  /** Il browser espone l'API Storage persistente */
  supported: boolean
  /** Lo storage è protetto dalla cancellazione automatica */
  persisted: boolean
  usageBytes?: number
  quotaBytes?: number
}

function storageManager(): StorageManager | undefined {
  return typeof navigator !== 'undefined' ? navigator.storage : undefined
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
