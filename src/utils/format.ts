/** Testo utente: prima lettera maiuscola, resto minuscolo. */
export function sentenceCase(text: string | null | undefined): string {
  const trimmed = (text ?? '').trim()
  if (!trimmed) return ''
  const lower = trimmed.toLocaleLowerCase('it-IT')
  return lower.charAt(0).toLocaleUpperCase('it-IT') + lower.slice(1)
}

export function formatToday(): string {
  return new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Formatta un timestamp in data leggibile (es. "26 giu 2026") */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Formatta una data ISO (YYYY-MM-DD) in formato leggibile */
export function formatIsoDate(dateIso: string): string {
  return new Date(dateIso + 'T00:00:00').toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Intervallo date per note/eventi (ISO YYYY-MM-DD) */
export function formatDateRange(
  startDate?: string,
  endDate?: string,
): string | null {
  if (!startDate && !endDate) return null
  if (startDate && endDate) {
    return `${formatIsoDate(startDate)} – ${formatIsoDate(endDate)}`
  }
  if (startDate) return `Da ${formatIsoDate(startDate)}`
  return `Fino al ${formatIsoDate(endDate!)}`
}

export function formatAmount(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

/** Etichetta breve per ultima modifica (es. "Mod. 2 lug 2026") */
export function formatModifiedAt(timestamp: number): string {
  return `Mod. ${formatDate(timestamp)}`
}
