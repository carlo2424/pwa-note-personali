import { db } from '../db'
import { isRecurringCommitment } from './recurring'
import { countdownLabel, daysUntil } from './countdown'

const ENABLED_KEY = 'pwa-renewal-notif-enabled'
const SENT_KEY = 'pwa-renewal-notif-sent'

/** Giorni prima del rinnovo in cui inviare promemoria */
const REMINDER_DAYS = [3, 1, 0]

type SentMap = Record<string, true>

function getSentMap(): SentMap {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) ?? '{}') as SentMap
  } catch {
    return {}
  }
}

function saveSentMap(map: SentMap): void {
  localStorage.setItem(SENT_KEY, JSON.stringify(map))
}

export function isRenewalNotifEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) === 'true'
}

export function setRenewalNotifEnabled(enabled: boolean): void {
  localStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false')
  if (!enabled) localStorage.removeItem(SENT_KEY)
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

function reminderBody(days: number, renewalDate: string): string {
  if (days === 0) return 'Il rinnovo scade oggi!'
  if (days === 1) return 'Il rinnovo scade domani'
  return countdownLabel(renewalDate)
}

/** Controlla rinnovi imminenti e mostra notifiche (se abilitate e permesso concesso) */
export async function checkRenewalNotifications(): Promise<void> {
  if (!isRenewalNotifEnabled()) return
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const events = await db.events
    .filter((e) => !!e.renewalDate && isRecurringCommitment(e))
    .toArray()

  const sent = getSentMap()
  let changed = false

  for (const event of events) {
    if (!event.renewalDate || !event.id) continue
    const days = daysUntil(event.renewalDate)
    if (!REMINDER_DAYS.includes(days)) continue

    const key = `${event.id}-${event.renewalDate}-${days}`
    if (sent[key]) continue

    try {
      new Notification(`Rinnovo: ${event.title}`, {
        body: reminderBody(days, event.renewalDate),
        icon: '/favicon.svg',
        tag: key,
      })
      sent[key] = true
      changed = true
    } catch (err) {
      console.warn('[Notifiche] Impossibile mostrare promemoria:', err)
    }
  }

  if (changed) saveSentMap(sent)
}

/** Pulisce chiavi di notifiche vecchie (> 60 giorni) */
export function pruneSentNotifications(): void {
  const sent = getSentMap()
  const keys = Object.keys(sent)
  if (keys.length < 100) return
  saveSentMap({})
}
