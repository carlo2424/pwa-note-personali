import { useState } from 'react'
import { clearPwaCacheAndReload, resetAppData } from '../utils/appRecovery'

interface RecoveryScreenProps {
  title: string
  detail?: string
  showLoadingHint?: boolean
}

export function RecoveryScreen({
  title,
  detail,
  showLoadingHint = false,
}: RecoveryScreenProps) {
  const [busy, setBusy] = useState<'cache' | 'reset' | 'reload' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function runAction(
    kind: 'cache' | 'reset',
    fn: () => Promise<void>,
  ) {
    setBusy(kind)
    setActionError(null)
    try {
      await fn()
    } catch (err) {
      setBusy(null)
      setActionError(
        err instanceof Error ? err.message : 'Operazione non riuscita',
      )
    }
  }

  function handleReload() {
    setBusy('reload')
    window.location.reload()
  }

  const disabled = busy !== null

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
      <p className="text-lg font-semibold text-slate-800">{title}</p>
      {detail ? (
        <p className="max-w-sm text-xs font-mono text-slate-500">{detail}</p>
      ) : null}
      {showLoadingHint ? (
        <p className="max-w-xs text-sm text-slate-500">
          Se resta bloccata, usa i pulsanti qui sotto.
        </p>
      ) : null}
      {actionError ? (
        <p className="max-w-sm text-sm text-rose-600">{actionError}</p>
      ) : null}

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={handleReload}
          className="min-h-12 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md active:scale-[0.98] disabled:opacity-60"
        >
          {busy === 'reload' ? 'Ricarica…' : 'Ricarica'}
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => void runAction('cache', clearPwaCacheAndReload)}
          className="min-h-12 rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-md active:scale-[0.98] disabled:opacity-60"
        >
          {busy === 'cache' ? 'Svuotamento cache…' : 'Svuota cache app'}
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => void runAction('reset', resetAppData)}
          className="min-h-12 rounded-xl border-2 border-rose-300 bg-white px-6 py-3 text-sm font-semibold text-rose-600 active:scale-[0.98] disabled:opacity-60"
        >
          {busy === 'reset' ? 'Reset in corso…' : 'Reset database (cancella dati)'}
        </button>
      </div>
    </div>
  )
}
