import { useState } from 'react'
import { Cloud, CloudOff, Loader2, RefreshCw, Download } from 'lucide-react'
import {
  connectCloudBackup,
  disconnectCloudBackup,
  getCloudStatus,
  pushToCloud,
  restoreFromCloud,
} from '../utils/cloudBackup'
import { summarizeBackup } from '../utils/backup'
import { clearDataFingerprint } from '../utils/dataFingerprint'

const TOKEN_URL =
  'https://github.com/settings/tokens/new?scopes=gist&description=Note%20Personali%20backup'

function formatSync(at: number | null): string {
  if (!at) return 'mai'
  const date = new Date(at)
  return date.toLocaleString('it-IT', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CloudBackupPanel() {
  const [status, setStatus] = useState(getCloudStatus())
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState<'connect' | 'push' | 'restore' | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function refresh() {
    setStatus(getCloudStatus())
  }

  async function handleConnect() {
    if (!token.trim()) return
    setBusy('connect')
    setMessage(null)
    try {
      await connectCloudBackup(token)
      setToken('')
      refresh()
      setMessage('Backup cloud collegato e primo salvataggio eseguito.')
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : 'Collegamento non riuscito.',
      )
    } finally {
      setBusy(null)
    }
  }

  async function handlePush() {
    setBusy('push')
    setMessage(null)
    try {
      await pushToCloud()
      refresh()
      setMessage('Backup salvato nel cloud.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Salvataggio non riuscito.')
    } finally {
      setBusy(null)
    }
  }

  async function handleRestore() {
    const ok = window.confirm(
      'Ripristinare dal cloud sostituirà tutti i dati attuali con quelli salvati online.\n\nContinuare?',
    )
    if (!ok) return
    setBusy('restore')
    setMessage(null)
    try {
      const payload = await restoreFromCloud()
      if (!payload) {
        setMessage('Nessun backup trovato nel cloud.')
        return
      }
      clearDataFingerprint()
      refresh()
      setMessage(`Ripristinato dal cloud: ${summarizeBackup(payload)}.`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Ripristino non riuscito.')
    } finally {
      setBusy(null)
    }
  }

  function handleDisconnect() {
    const ok = window.confirm(
      'Scollegare il backup cloud? I dati già salvati online restano nel tuo gist.',
    )
    if (!ok) return
    disconnectCloudBackup()
    refresh()
    setMessage('Backup cloud scollegato.')
  }

  const accent = status.connected
    ? 'bg-emerald-100 text-emerald-600'
    : 'bg-slate-200 text-slate-500'

  return (
    <section className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="mb-3 flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent}`}
        >
          {status.connected ? (
            <Cloud className="h-4 w-4" />
          ) : (
            <CloudOff className="h-4 w-4" />
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-800">
            Backup cloud (GitHub Gist)
          </h4>
          <p className="mt-0.5 text-xs text-slate-500">
            Copia gratuita e privata online. Sopravvive anche se il browser
            cancella tutti i dati del sito.
          </p>
        </div>
      </div>

      {status.connected ? (
        <>
          <p className="mb-3 text-xs text-slate-500">
            Stato:{' '}
            <span className="font-semibold text-emerald-600">Collegato</span>
            {' · '}Ultimo salvataggio:{' '}
            <span className="font-medium text-slate-700">
              {formatSync(status.lastSyncAt)}
            </span>
          </p>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void handlePush()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy === 'push' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Salva ora nel cloud
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void handleRestore()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
            >
              {busy === 'restore' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Ripristina dal cloud
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={handleDisconnect}
              className="w-full rounded-xl px-3 py-2 text-xs font-medium text-slate-500 hover:text-rose-600"
            >
              Scollega backup cloud
            </button>
          </div>
        </>
      ) : (
        <>
          <ol className="mb-3 list-decimal space-y-1 pl-4 text-[11px] leading-snug text-slate-600">
            <li>
              Apri{' '}
              <a
                href={TOKEN_URL}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-sky-700 underline"
              >
                questa pagina GitHub
              </a>{' '}
              (lo scope «gist» è già selezionato).
            </li>
            <li>In fondo premi «Generate token» e copia il token.</li>
            <li>Incollalo qui sotto e premi «Collega».</li>
          </ol>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Incolla qui il token GitHub"
            autoComplete="off"
            className="mb-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-sky-400 focus:ring-sky-500"
          />
          <button
            type="button"
            disabled={busy !== null || !token.trim()}
            onClick={() => void handleConnect()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50"
          >
            {busy === 'connect' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Cloud className="h-4 w-4" />
            )}
            Collega
          </button>
        </>
      )}

      {message && (
        <p className="mt-2 text-xs font-medium text-slate-600">{message}</p>
      )}
    </section>
  )
}
