import { Bell } from 'lucide-react'
import { useState } from 'react'
import {
  checkRenewalNotifications,
  getNotificationPermission,
  isRenewalNotifEnabled,
  requestNotificationPermission,
  setRenewalNotifEnabled,
} from '../utils/renewalNotifications'
import { BackupPanel } from './BackupPanel'
import { StoragePersistencePanel } from './StoragePersistencePanel'
import { FileImportPanel } from './FileImportPanel'
import { AreaGroupsSettings } from './AreaGroupsSettings'
import {
  appBuildLabel,
  forceAppUpdateAndReload,
} from '../utils/appUpdate'

interface SettingsPanelProps {
  onBackupDone?: () => void
}

export function SettingsPanel({ onBackupDone }: SettingsPanelProps) {
  const [notifEnabled, setNotifEnabled] = useState(isRenewalNotifEnabled())
  const [permission, setPermission] = useState(getNotificationPermission())

  async function handleNotifToggle(enabled: boolean) {
    if (enabled) {
      const result = await requestNotificationPermission()
      setPermission(result)
      if (result !== 'granted') {
        alert(
          'Per ricevere promemoria devi consentire le notifiche nelle impostazioni del browser.',
        )
        return
      }
    }
    setRenewalNotifEnabled(enabled)
    setNotifEnabled(enabled)
    if (enabled) await checkRenewalNotifications()
  }

  const permissionLabel =
    permission === 'unsupported'
      ? 'Non supportate su questo browser'
      : permission === 'granted'
        ? 'Permesso concesso'
        : permission === 'denied'
          ? 'Permesso negato — abilita nelle impostazioni browser'
          : 'Permesso non ancora richiesto'

  return (
    <div className="space-y-4">
      <StoragePersistencePanel />
      <BackupPanel onBackupDone={onBackupDone} />
      <FileImportPanel />
      <AreaGroupsSettings />

      <section className="rounded-xl border border-slate-100 bg-slate-50 p-4">
        <div className="mb-3 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800">
              Promemoria rinnovi
            </h4>
            <p className="mt-0.5 text-xs text-slate-500">
              Avviso 3 giorni prima, 1 giorno prima e il giorno del rinnovo.
            </p>
          </div>
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm text-slate-700">Attiva promemoria</span>
          <input
            type="checkbox"
            checked={notifEnabled}
            onChange={(e) => handleNotifToggle(e.target.checked)}
            className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
        </label>
        <p className="mt-2 text-xs text-slate-400">{permissionLabel}</p>
        <p className="mt-1 text-xs text-slate-400">
          Le notifiche funzionano quando l&apos;app è aperta o installata come
          PWA.
        </p>
      </section>

      <section className="rounded-xl border border-slate-100 bg-slate-50 p-4">
        <h4 className="text-sm font-semibold text-slate-800">Aggiornamento app</h4>
        <p className="mt-1 text-xs text-slate-500">
          Versione installata: <span className="font-mono">{appBuildLabel()}</span>
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Se vedi ancora la versione vecchia, usa il pulsante qui sotto. I tuoi
          dati locali non vengono cancellati.
        </p>
        <button
          type="button"
          onClick={() => void forceAppUpdateAndReload()}
          className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Scarica ultima versione
        </button>
      </section>
    </div>
  )
}
