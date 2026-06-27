/** Data locale in formato ISO (YYYY-MM-DD) */
export function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** True se la scadenza è prima di oggi */
export function isPastDue(dueDate?: string): boolean {
  return !!dueDate && dueDate < todayIso()
}

/** Scadenza carta MM/AA già passata */
export function isCardExpired(expiry: string): boolean {
  const m = expiry.trim().match(/^(\d{1,2})\/(\d{2})$/)
  if (!m) return false
  const month = parseInt(m[1], 10)
  const year = 2000 + parseInt(m[2], 10)
  if (month < 1 || month > 12) return false
  const lastDay = new Date(year, month, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return lastDay < today
}

/** Calcola giorni rimanenti fino a una data ISO (es. rinnovo abbonamento) */
export function daysUntil(dateIso: string): number {
  const target = new Date(dateIso + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

/** Testo leggibile per il countdown */
export function countdownLabel(dateIso: string): string {
  const days = daysUntil(dateIso)
  if (days < 0) return `Scaduto ${Math.abs(days)} giorni fa`
  if (days === 0) return 'Rinnovo oggi!'
  if (days === 1) return 'Rinnovo tra 1 giorno'
  return `Rinnovo tra ${days} giorni`
}

/** Urgenza visiva: scaduto, oggi, presto, ok */
export function countdownUrgency(dateIso: string): 'expired' | 'today' | 'soon' | 'ok' {
  const days = daysUntil(dateIso)
  if (days < 0) return 'expired'
  if (days === 0) return 'today'
  if (days <= 7) return 'soon'
  return 'ok'
}
