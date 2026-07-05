import { useEffect, useState } from 'react'
import { ShieldAlert, ShieldCheck, Loader2 } from 'lucide-react'
import {
  ensurePersistentStorage,
  formatBytes,
  getStorageStatus,
  type StorageStatus,
} from '../utils/storagePersistence'

export function StoragePersistencePanel() {
  const [status, setStatus] = useState<StorageStatus | null>(null)
  const [requesting, setRequesting] = useState(false)

  async function refresh() {
    setStatus(await getStorageStatus())
  }

  useEffect(() => {
    void (async () => {
      await ensurePersistentStorage()
      await refresh()
    })()
  }, [])

  async function handleRequest() {
    setRequesting(true)
    try {
      await ensurePersistentStorage()
      await refresh()
    } finally {
      setRequesting(false)
    }
  }

  const persisted = status?.persisted ?? false
  const supported = status?.supported ?? false

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
          <p className="mt-0.5 text-xs text-slate-500">
            {!supported
              ? 'Questo browser non espone la protezione dello storage.'
              : persisted
                ? 'Protezione attiva: i dati sono protetti dalla cancellazione automatica del browser.'
                : 'Protezione richiesta all’avvio, ma il browser non l’ha ancora concessa. Tocca lo schermo o riprova sotto.'}
          </p>
        </div>
      </div>

      {status && supported && (
        <p className="mb-3 text-xs text-slate-500">
          Stato:{' '}
          <span
            className={`font-semibold ${persisted ? 'text-emerald-600' : 'text-amber-700'}`}
          >
            {persisted ? 'Protetto' : 'In attesa'}
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
              Attivazione…
            </>
          ) : (
            'Riprova attivazione'
          )}
        </button>
      )}

      {supported && !persisted && (
        <p className="mt-2 text-xs text-slate-400">
          Suggerimento: installa l&apos;app nella schermata Home e usala qualche
          volta. Il browser concede la protezione più facilmente alle app
          installate. Fai comunque backup periodici.
        </p>
      )}
    </section>
  )
}
