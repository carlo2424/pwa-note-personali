import { useState } from 'react'
import { ShieldAlert, X } from 'lucide-react'
import {
  buildStorageProtectionInfo,
  ensurePersistentStorage,
  getStorageStatus,
} from '../utils/storagePersistence'
import {
  clearStorageProtectionBannerDismiss,
  dismissStorageProtectionBanner,
} from '../utils/storageProtectionBanner'

interface StorageProtectionBannerProps {
  onOpenSettings: () => void
  onDismiss: () => void
}

export function StorageProtectionBanner({
  onOpenSettings,
  onDismiss,
}: StorageProtectionBannerProps) {
  const [activating, setActivating] = useState(false)

  async function handleActivate() {
    setActivating(true)
    try {
      const granted = await ensurePersistentStorage()
      if (granted) {
        clearStorageProtectionBannerDismiss()
        onDismiss()
      } else {
        const info = buildStorageProtectionInfo(await getStorageStatus())
        alert(info.help)
      }
    } finally {
      setActivating(false)
    }
  }

  function handleDismiss() {
    dismissStorageProtectionBanner()
    onDismiss()
  }

  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-3 py-2.5"
    >
      <div className="flex items-start gap-2">
        <ShieldAlert
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-amber-900">
            Dati a rischio di cancellazione
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-amber-800">
            Su Brave spesso resta «Non concessa» anche con l’app in Home: non
            aspettare. Esporta un backup JSON da Impostazioni — è la protezione
            che funziona sempre.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={activating}
              onClick={() => void handleActivate()}
              className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
            >
              {activating ? 'Attivazione…' : 'Proteggi dati'}
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-800"
            >
              Backup
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-amber-700"
            >
              Più tardi
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded p-1 text-amber-600 hover:bg-amber-100"
          aria-label="Chiudi avviso protezione"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
