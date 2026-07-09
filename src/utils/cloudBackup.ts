import {
  buildBackupJson,
  countBackupPayload,
  parseBackupPayload,
  restoreBackupFromText,
  type BackupPayload,
} from './backup'

/**
 * Backup cloud gratuito su GitHub Gist (privato).
 *
 * L'utente crea una volta un token classico con il solo scope `gist` e lo
 * incolla in Impostazioni. Da quel momento l'app salva il backup nel gist a
 * ogni modifica e lo ripristina in automatico se i dati locali spariscono.
 */

const TOKEN_KEY = 'pwa-cloud-gist-token'
const GIST_ID_KEY = 'pwa-cloud-gist-id'
const LAST_SYNC_KEY = 'pwa-cloud-last-sync'

const API_BASE = 'https://api.github.com'
const GIST_FILENAME = 'note-personali-backup.json'
const GIST_DESCRIPTION = 'Note Personali – backup automatico (non modificare)'

export interface CloudStatus {
  connected: boolean
  gistId: string | null
  lastSyncAt: number | null
}

interface GistFile {
  filename?: string
  content?: string
  truncated?: boolean
  raw_url?: string
}

interface GistResponse {
  id: string
  description: string | null
  files: Record<string, GistFile>
  updated_at?: string
}

export function getCloudToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getCloudGistId(): string | null {
  return localStorage.getItem(GIST_ID_KEY)
}

export function getCloudLastSyncAt(): number | null {
  const raw = localStorage.getItem(LAST_SYNC_KEY)
  const value = raw ? Number(raw) : NaN
  return Number.isFinite(value) ? value : null
}

export function isCloudBackupEnabled(): boolean {
  return !!getCloudToken()
}

export function getCloudStatus(): CloudStatus {
  return {
    connected: isCloudBackupEnabled(),
    gistId: getCloudGistId(),
    lastSyncAt: getCloudLastSyncAt(),
  }
}

function setLastSyncNow(): void {
  localStorage.setItem(LAST_SYNC_KEY, String(Date.now()))
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function apiError(res: Response): Promise<Error> {
  let detail = ''
  try {
    const body = (await res.json()) as { message?: string }
    detail = body?.message ? ` (${body.message})` : ''
  } catch {
    // ignora
  }
  if (res.status === 401) {
    return new Error('Token non valido o scaduto. Ricollega il backup cloud.')
  }
  if (res.status === 403) {
    return new Error(
      `Accesso negato dal token${detail}. Verifica che abbia lo scope «gist».`,
    )
  }
  return new Error(`Errore GitHub ${res.status}${detail}.`)
}

/** Cerca un gist di backup già esistente sull'account (per riusarlo). */
async function findExistingBackupGist(token: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/gists?per_page=100`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw await apiError(res)
  const list = (await res.json()) as GistResponse[]
  const match = list.find(
    (g) =>
      g.description === GIST_DESCRIPTION ||
      Object.keys(g.files ?? {}).includes(GIST_FILENAME),
  )
  return match?.id ?? null
}

/**
 * Collega il backup cloud: valida il token, riusa un gist esistente se c'è,
 * altrimenti ne crea uno nuovo con lo stato attuale dei dati.
 */
export async function connectCloudBackup(rawToken: string): Promise<void> {
  const token = rawToken.trim()
  if (!token) throw new Error('Inserisci un token GitHub valido.')

  const existing = await findExistingBackupGist(token)
  localStorage.setItem(TOKEN_KEY, token)
  if (existing) {
    localStorage.setItem(GIST_ID_KEY, existing)
  } else {
    localStorage.removeItem(GIST_ID_KEY)
  }

  try {
    await pushToCloud()
  } catch (err) {
    // Rollback se il primo salvataggio fallisce, per non lasciare stato monco.
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(GIST_ID_KEY)
    throw err
  }
}

export function disconnectCloudBackup(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(GIST_ID_KEY)
  localStorage.removeItem(LAST_SYNC_KEY)
}

async function createGist(token: string, content: string): Promise<string> {
  const res = await fetch(`${API_BASE}/gists`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: { [GIST_FILENAME]: { content } },
    }),
  })
  if (!res.ok) throw await apiError(res)
  const gist = (await res.json()) as GistResponse
  return gist.id
}

async function updateGist(
  token: string,
  gistId: string,
  content: string,
  keepalive: boolean,
): Promise<void> {
  const res = await fetch(`${API_BASE}/gists/${gistId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      files: { [GIST_FILENAME]: { content } },
    }),
    keepalive,
  })
  if (res.status === 404) {
    // Gist eliminato: ne creiamo uno nuovo.
    const newId = await createGist(token, content)
    localStorage.setItem(GIST_ID_KEY, newId)
    return
  }
  if (!res.ok) throw await apiError(res)
}

/**
 * Salva il backup corrente nel gist. Non lancia se il cloud non è collegato.
 * `keepalive` consente il completamento anche quando l'app va in background.
 */
export async function pushToCloud(options?: {
  keepalive?: boolean
}): Promise<boolean> {
  const token = getCloudToken()
  if (!token) return false

  const content = await buildBackupJson()
  const gistId = getCloudGistId()
  const keepalive = options?.keepalive ?? false

  if (gistId) {
    await updateGist(token, gistId, content, keepalive)
  } else {
    const newId = await createGist(token, content)
    localStorage.setItem(GIST_ID_KEY, newId)
  }
  setLastSyncNow()
  return true
}

async function readGistContent(
  token: string,
  gistId: string,
): Promise<string | null> {
  const res = await fetch(`${API_BASE}/gists/${gistId}`, {
    headers: authHeaders(token),
  })
  if (res.status === 404) return null
  if (!res.ok) throw await apiError(res)
  const gist = (await res.json()) as GistResponse
  const file = gist.files?.[GIST_FILENAME]
  if (!file) return null
  if (file.truncated && file.raw_url) {
    const rawRes = await fetch(file.raw_url, { headers: authHeaders(token) })
    if (!rawRes.ok) throw await apiError(rawRes)
    return rawRes.text()
  }
  return file.content ?? null
}

/** Legge il backup dal cloud senza applicarlo (per anteprima/conteggio). */
export async function fetchCloudBackup(): Promise<BackupPayload | null> {
  const token = getCloudToken()
  if (!token) return null
  let gistId = getCloudGistId()
  if (!gistId) {
    gistId = await findExistingBackupGist(token)
    if (gistId) localStorage.setItem(GIST_ID_KEY, gistId)
  }
  if (!gistId) return null
  const text = await readGistContent(token, gistId)
  if (!text) return null
  return parseBackupPayload(text)
}

/** Ripristina i dati dal cloud. Restituisce il payload o null se assente. */
export async function restoreFromCloud(): Promise<BackupPayload | null> {
  const payload = await fetchCloudBackup()
  if (!payload || countBackupPayload(payload) === 0) return null
  await restoreBackupFromText(JSON.stringify(payload))
  return payload
}

let cloudPushTimer: ReturnType<typeof setTimeout> | undefined

/** Pianifica un salvataggio cloud unendo modifiche ravvicinate. */
export function scheduleCloudPush(delayMs = 4000): void {
  if (!isCloudBackupEnabled()) return
  if (typeof window === 'undefined') {
    void pushToCloud().catch(() => {})
    return
  }
  if (cloudPushTimer) clearTimeout(cloudPushTimer)
  cloudPushTimer = setTimeout(() => {
    cloudPushTimer = undefined
    void pushToCloud().catch((err) => {
      console.warn('[Cloud] Salvataggio automatico non riuscito:', err)
    })
  }, delayMs)
}
