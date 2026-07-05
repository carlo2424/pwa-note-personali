import { useEffect, useMemo, useState } from 'react'
import { ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react'
import {
  buildStorageProtectionInfo,
  ensurePersistentStorage,
  formatBytes,
  getStorageStatus,
  type StorageStatus,
} from '../utils/storagePersistence'

export function StoragePersistencePanel() {
  const [status, setStatus] = useState<StorageStatus | null>(null)
  const [requesting, setRequesting] = useState(false)
  const [lastAttemptDenied, setLastAttemptDenied] = useState(false)

  async function refresh() {
    setStatus(await getStorageStatus())
  }

  useEffect(() => {
    void (async () => {
      const granted = await ensurePersistentStorage()
      await refresh()
      if (!granted) setLastAttemptDenied(true)
    })()
  }, [])

  const info = useMemo(
    () =>
      status
        ? buildStorageProtectionInfo(status)
        : null,
    [status],
  )

  async function handleRequest() {
    setRequesting(true)
    try {
      const granted = await ensurePersistentStorage()
      await refresh()
      setLastAttemptDenied(!granted)
    } finally {
      setRequesting(false)
    }
  }

  const persisted = info?.persisted ?? false
  const supported = info?.supported ?? false

  const accent = persisted
    ? 'bg-emerald-100 text-emerald-600'
    : 'bg-amber-100 text-amber-700'

  return (
    <section className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="mb-3 flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent}`}
        >
          {persisted ? (
            <ShieldCheck className="h-4 w-4" />
          ) : (
            <ShieldAlert className="h-4 w-4" />
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-800">
            Protezione dati sul dispositivo
          </h4>
          {info ? (
            <p className="mt-0.5 text-xs text-slate-500">{info.help}</p>
          ) : null}
        </div>
      </div>

      {status && info && (
        <p className="mb-3 text-xs text-slate-500">
          Stato:{' '}
          <span
            className={`font-semibold ${persisted ? 'text-emerald-600' : 'text-amber-700'}`}
          >
            {info.label}
          </span>
          {status.usageBytes != null && (
            <>
              {' · '}
              Spazio usato:{' '}
              <span className="font-medium text-slate-700">
                {formatBytes(status.usageBytes)}
              </span>
            </>
          )}
        </p>
      )}

      {supported && !persisted && lastAttemptDenied && (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-snug text-amber-900">
          {info?.isBrave
            ? 'Su Brave la risposta è immediata: se resti su «Non concessa», il browser non la attiverà. Non aspettare minuti — passa al backup.'
            : 'Il browser ha rifiutato l’ultimo tentativo. Non restare in attesa: esporta un backup.'}
        </p>
      )}

      {supported && !persisted && (
        <button
          type="button"
          disabled={requesting}
          onClick={() => void handleRequest()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          {requesting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifica…
            </>
          ) : (
            'Riprova (opzionale)'
          )}
        </button>
      )}
    </section>
  )
}
