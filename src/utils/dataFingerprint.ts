import { db } from '../db'

const FINGERPRINT_KEY = 'pwa-data-fingerprint'

export interface DataFingerprint {
  notes: number
  events: number
  expenses: number
  at: number
}

function readRaw(): DataFingerprint | null {
  try {
    const raw = localStorage.getItem(FINGERPRINT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DataFingerprint
    if (
      typeof parsed.notes !== 'number' ||
      typeof parsed.events !== 'number' ||
      typeof parsed.expenses !== 'number'
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function readDataFingerprint(): DataFingerprint | null {
  return readRaw()
}

export async function countLocalData(): Promise<{
  notes: number
  events: number
  expenses: number
  total: number
}> {
  const [notes, events, expenses] = await Promise.all([
    db.notes.count(),
    db.events.count(),
    db.expenses.count(),
  ])
  return { notes, events, expenses, total: notes + events + expenses }
}

/** Salva un’impronta dei dati quando ce n’è almeno uno (per rilevare cancellazioni del browser). */
export async function updateDataFingerprint(): Promise<void> {
  const counts = await countLocalData()
  if (counts.total === 0) return

  const fingerprint: DataFingerprint = {
    notes: counts.notes,
    events: counts.events,
    expenses: counts.expenses,
    at: Date.now(),
  }
  localStorage.setItem(FINGERPRINT_KEY, JSON.stringify(fingerprint))
}

/** True se prima c’erano più dati e ora ne mancano (totale o parziale). */
export async function detectPossibleDataLoss(): Promise<{
  lost: boolean
  partial?: boolean
  previous?: DataFingerprint
}> {
  const previous = readRaw()
  if (!previous) return { lost: false }

  const previousTotal = previous.notes + previous.events + previous.expenses
  if (previousTotal === 0) return { lost: false }

  const current = await countLocalData()
  if (current.total === 0) {
    return { lost: true, previous }
  }

  // Perdita parziale: calo evidente (es. note sparite overnight).
  const notesDropped = current.notes < previous.notes
  const totalDropped = current.total < previousTotal
  if (totalDropped && (notesDropped || current.total <= previousTotal * 0.85)) {
    return { lost: true, partial: true, previous }
  }

  return { lost: false }
}

export function clearDataFingerprint(): void {
  localStorage.removeItem(FINGERPRINT_KEY)
}
