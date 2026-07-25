import {
  countBackupPayload,
  exportBackup,
  getLatestLocalChangeMs,
  hasBackupableData,
  parseBackupPayload,
  restoreBackupFromText,
  summarizeBackup,
  type BackupPayload,
} from './backup'
import { pauseCloudSync } from './cloudSyncPause'

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
const OPFS_CREDS_FILE = 'pwa-cloud-creds.json'
const OPFS_SYNC_META_FILE = 'pwa-cloud-sync-meta.json'
const CREDS_IDB_NAME = 'note-personali-cloud-creds'
const CREDS_IDB_VERSION = 1
const CREDS_IDB_KEY = 'github'

type StoredCloudCreds = { token: string; gistId: string | null }

interface CloudSyncMeta {
  total: number
  notes: number
  events: number
  expenses: number
  at: number
}

async function writeSyncMeta(payload: BackupPayload): Promise<void> {
  const meta: CloudSyncMeta = {
    notes: payload.data.notes.length,
    events: payload.data.events.length,
    expenses: payload.data.expenses.length,
    total: countBackupPayload(payload),
    at: Date.now(),
  }
  try {
    await writeOpfsText(OPFS_SYNC_META_FILE, JSON.stringify(meta))
  } catch {
    // best-effort
  }
}

function cloudExportedAtMs(payload: BackupPayload): number {
  const ms = Date.parse(payload.exportedAt)
  return Number.isFinite(ms) ? ms : 0
}

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

interface GistHistoryEntry {
  version: string
  committed_at?: string
}

interface GistResponse {
  id: string
  description: string | null
  files: Record<string, GistFile>
  updated_at?: string
  history?: GistHistoryEntry[]
}

export interface CloudBackupPreview {
  gistId: string
  total: number
  summary: string
  exportedAt: string
  backupGistsFound: number
}

export interface CloudRecoveryResult {
  payload: BackupPayload
  /** Numero di revisioni esaminate nello storico. */
  revisionsScanned: number
  /** True se la versione scelta è una precedente (non l'ultima). */
  fromHistory: boolean
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

function supportsOpfs(): boolean {
  return typeof navigator.storage?.getDirectory === 'function'
}

async function writeOpfsText(fileName: string, content: string): Promise<void> {
  if (!supportsOpfs()) return
  const root = await navigator.storage.getDirectory()
  const fileHandle = await root.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

async function readOpfsText(fileName: string): Promise<string | null> {
  if (!supportsOpfs()) return null
  try {
    const root = await navigator.storage.getDirectory()
    const fileHandle = await root.getFileHandle(fileName)
    const file = await fileHandle.getFile()
    return await file.text()
  } catch {
    return null
  }
}

async function removeOpfsFile(fileName: string): Promise<void> {
  if (!supportsOpfs()) return
  try {
    const root = await navigator.storage.getDirectory()
    await root.removeEntry(fileName)
  } catch {
    // ignora
  }
}

function openCredsIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(CREDS_IDB_NAME, CREDS_IDB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore('creds')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbPutCreds(creds: StoredCloudCreds): Promise<void> {
  const db = await openCredsIdb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('creds', 'readwrite')
    tx.objectStore('creds').put(creds, CREDS_IDB_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

async function idbGetCreds(): Promise<StoredCloudCreds | null> {
  const db = await openCredsIdb()
  const value = await new Promise<StoredCloudCreds | null>((resolve, reject) => {
    const tx = db.transaction('creds', 'readonly')
    const req = tx.objectStore('creds').get(CREDS_IDB_KEY)
    req.onsuccess = () =>
      resolve((req.result as StoredCloudCreds | undefined) ?? null)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return value
}

async function idbClearCreds(): Promise<void> {
  try {
    const db = await openCredsIdb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('creds', 'readwrite')
      tx.objectStore('creds').delete(CREDS_IDB_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // ignora
  }
}

async function applyStoredCreds(creds: StoredCloudCreds): Promise<boolean> {
  const token = creds.token?.trim()
  if (!token) return false
  localStorage.setItem(TOKEN_KEY, token)
  if (creds.gistId) localStorage.setItem(GIST_ID_KEY, creds.gistId)
  await ensureCloudGistLinked()
  return true
}

/** Ripara le copie ridondanti se localStorage ha il token ma OPFS/IDB no. */
async function repairRedundantCredentialCopies(): Promise<void> {
  const token = getCloudToken()
  if (!token) return
  const gistId = getCloudGistId()
  const payload = JSON.stringify({ token, gistId })

  const opfsRaw = await readOpfsText(OPFS_CREDS_FILE)
  if (!opfsRaw) {
    try {
      await writeOpfsText(OPFS_CREDS_FILE, payload)
    } catch {
      // best-effort
    }
  }

  const idb = await idbGetCreds().catch(() => null)
  if (!idb?.token) {
    try {
      await idbPutCreds({ token, gistId })
    } catch {
      // best-effort
    }
  }
}

/** Salva token e gistId in localStorage e copia ridondante OPFS. */
export async function persistCloudCredentials(
  token: string,
  gistId?: string | null,
): Promise<void> {
  localStorage.setItem(TOKEN_KEY, token)
  if (gistId) localStorage.setItem(GIST_ID_KEY, gistId)
  const stored: StoredCloudCreds = { token, gistId: gistId ?? getCloudGistId() }
  try {
    await writeOpfsText(OPFS_CREDS_FILE, JSON.stringify(stored))
  } catch {
    // best-effort
  }
  try {
    await idbPutCreds(stored)
  } catch {
    // best-effort
  }
}

/**
 * Garantisce che token e gistId siano in localStorage, recuperandoli se mancano.
 * Ordine: URL segnalibro → OPFS → IndexedDB dedicato.
 */
export async function ensureCloudCredentials(): Promise<boolean> {
  seedCloudTokenFromUrl()

  if (getCloudToken()) {
    await ensureCloudGistLinked()
    await repairRedundantCredentialCopies()
    return true
  }

  try {
    const raw = await readOpfsText(OPFS_CREDS_FILE)
    if (raw) {
      const parsed = JSON.parse(raw) as StoredCloudCreds
      if (await applyStoredCreds(parsed)) {
        console.info('[Cloud] Token reinserito automaticamente (copia OPFS).')
        await repairRedundantCredentialCopies()
        return true
      }
    }
  } catch {
    // prova la copia successiva
  }

  try {
    const stored = await idbGetCreds()
    if (stored && (await applyStoredCreds(stored))) {
      console.info('[Cloud] Token reinserito automaticamente (copia IndexedDB).')
      await repairRedundantCredentialCopies()
      return true
    }
  } catch {
    // nessuna copia disponibile
  }

  return false
}

/**
 * Ripristina le credenziali cloud dopo una cancellazione del browser.
 * Alias di ensureCloudCredentials per compatibilità.
 */
export async function hydrateCloudCredentials(): Promise<boolean> {
  return ensureCloudCredentials()
}

async function ensureCloudGistLinked(): Promise<void> {
  const token = getCloudToken()
  if (!token) return
  await resolveBackupGistId(token)
}

export type CloudStartupResult = 'restored' | 'pushed' | 'idle' | 'no-cloud'

/**
 * All'avvio: confronta locale e cloud per data. Il backup GitHub più recente
 * vince (modifiche reali dell'utente). Altrimenti carica il locale su GitHub.
 */
export async function runCloudStartupSync(): Promise<CloudStartupResult> {
  if (!(await ensureCloudCredentials())) return 'no-cloud'

  try {
    await ensureCloudGistLinked()

    const cloudPayload = await fetchCloudBackup()
    const cloudTotal = cloudPayload ? countBackupPayload(cloudPayload) : 0
    const localHasData = await hasBackupableData()

    if (cloudPayload && cloudTotal > 0) {
      if (!localHasData) {
        await restoreBackupFromText(JSON.stringify(cloudPayload))
        await writeSyncMeta(cloudPayload)
        return 'restored'
      }

      const cloudAt = cloudExportedAtMs(cloudPayload)
      const localAt = await getLatestLocalChangeMs()
      if (cloudAt > localAt) {
        await restoreBackupFromText(JSON.stringify(cloudPayload))
        await writeSyncMeta(cloudPayload)
        return 'restored'
      }
    }

    if (!localHasData) return 'idle'

    const pushed = await pushToCloud()
    if (pushed) {
      const localPayload = await exportBackup({ includeBlobs: false })
      await writeSyncMeta(localPayload)
    }
    return pushed ? 'pushed' : 'idle'
  } catch (err) {
    console.error('[Cloud] Sincronizzazione avvio non riuscita:', err)
    return 'idle'
  }
}

const URL_TOKEN_PARAM = 'cloudtoken'

/**
 * Legge un token dal parametro nell'URL (hash o query) e lo memorizza.
 * Serve al "collegamento di ripristino": aprendo l'app da quel segnalibro, il
 * token viene re-inserito anche dopo che Brave ha cancellato i dati del sito.
 * Restituisce true se un token è stato trovato e salvato.
 */
export function seedCloudTokenFromUrl(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const fromHash = new URLSearchParams(
      window.location.hash.replace(/^#/, ''),
    ).get(URL_TOKEN_PARAM)
    const fromQuery = new URLSearchParams(window.location.search).get(
      URL_TOKEN_PARAM,
    )
    const token = (fromHash ?? fromQuery ?? '').trim()
    if (!token) return false

    const previous = getCloudToken()
    localStorage.setItem(TOKEN_KEY, token)
    if (previous !== token) localStorage.removeItem(GIST_ID_KEY)
    void persistCloudCredentials(token, getCloudGistId())

    // Toglie il token dalla barra indirizzi visibile (il segnalibro conserva
    // comunque l'URL originale, quindi il riavvio successivo lo re-inserisce).
    try {
      const url = new URL(window.location.href)
      url.hash = ''
      url.searchParams.delete(URL_TOKEN_PARAM)
      window.history.replaceState(null, '', url.toString())
    } catch {
      // ignora
    }
    return true
  } catch {
    return false
  }
}

/** Costruisce il collegamento di ripristino con il token incorporato. */
export function buildCloudRecoveryLink(): string | null {
  const token = getCloudToken()
  if (!token || typeof window === 'undefined') return null
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#${URL_TOKEN_PARAM}=${encodeURIComponent(token)}`
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

function isBackupGist(gist: GistResponse): boolean {
  return (
    gist.description === GIST_DESCRIPTION ||
    Object.keys(gist.files ?? {}).includes(GIST_FILENAME)
  )
}

function scoreBackupPayload(payload: BackupPayload): number {
  return payload.data.notes.length * 1_000_000 + countBackupPayload(payload)
}

function tryParseGistBackupText(text: string | null): BackupPayload | null {
  if (!text?.trim()) return null
  try {
    const payload = parseBackupPayload(text)
    return countBackupPayload(payload) > 0 ? payload : null
  } catch {
    return null
  }
}

/** Elenco di tutti i gist di backup sull'account (max 100). */
async function findAllBackupGists(token: string): Promise<GistResponse[]> {
  const res = await fetch(`${API_BASE}/gists?per_page=100`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw await apiError(res)
  const list = (await res.json()) as GistResponse[]
  return list.filter(isBackupGist)
}

/**
 * Trova il gist con il backup più ricco. Se quello salvato localmente è vuoto
 * o errato, ne cerca un altro tra tutti i gist dell'account.
 */
async function resolveBackupGistId(token: string): Promise<string | null> {
  const candidates = new Set<string>()
  const stored = getCloudGistId()
  if (stored) candidates.add(stored)

  for (const gist of await findAllBackupGists(token)) {
    candidates.add(gist.id)
  }

  let bestId: string | null = null
  let bestScore = -1

  for (const gistId of candidates) {
    const text = await readGistContent(token, gistId)
    const payload = tryParseGistBackupText(text)
    if (!payload) continue
    const score = scoreBackupPayload(payload)
    if (score > bestScore) {
      bestScore = score
      bestId = gistId
    }
  }

  if (bestId && bestId !== stored) {
    localStorage.setItem(GIST_ID_KEY, bestId)
    await persistCloudCredentials(token, bestId)
  }

  return bestId
}

async function fetchGistFileContent(
  token: string,
  gistId: string,
  file: GistFile,
): Promise<string | null> {
  if (file.content && !file.truncated) {
    return file.content
  }

  if (file.raw_url) {
    try {
      const rawRes = await fetch(file.raw_url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.raw',
        },
      })
      if (rawRes.ok) {
        const text = await rawRes.text()
        if (text.trim()) return text
      }
    } catch {
      // prova il fallback API
    }
  }

  try {
    const rawRes = await fetch(`${API_BASE}/gists/${gistId}`, {
      headers: {
        ...authHeaders(token),
        Accept: 'application/vnd.github.v3.raw',
      },
    })
    if (rawRes.ok) {
      const text = await rawRes.text()
      if (text.trim()) return text
    }
  } catch {
    // ignora
  }

  return file.content ?? null
}

export interface CloudConnectResult {
  /** 'restored' se i dati sono stati recuperati dal cloud, 'pushed' se salvati. */
  action: 'restored' | 'pushed' | 'linked'
  payload: BackupPayload | null
}

/**
 * Collega il backup cloud: valida il token e riusa il gist esistente se c'è.
 *
 * Sicurezza dati: se i dati locali sono assenti (es. dopo una cancellazione del
 * browser) ma il gist contiene un backup, i dati vengono **ripristinati** dal
 * cloud, senza mai sovrascrivere il backup buono con dati vuoti.
 */
export async function connectCloudBackup(
  rawToken: string,
): Promise<CloudConnectResult> {
  const token = rawToken.trim()
  if (!token) throw new Error('Inserisci un token GitHub valido.')

  const existing = await resolveBackupGistId(token)
  const previousToken = localStorage.getItem(TOKEN_KEY)
  const previousGistId = localStorage.getItem(GIST_ID_KEY)
  await persistCloudCredentials(token, existing ?? null)

  try {
    const localHasData = await hasBackupableData()

    if (!localHasData && existing) {
      // Dati locali assenti: recupera dal cloud, NON sovrascrivere.
      const restored = await restoreFromCloud()
      if (restored) return { action: 'restored', payload: restored }
      // Gist collegato ma vuoto: nulla da ripristinare, nulla da salvare.
      return { action: 'linked', payload: null }
    }

    if (existing) {
      const cloudPayload = await fetchCloudBackup()
      if (cloudPayload && countBackupPayload(cloudPayload) > 0) {
        const cloudAt = cloudExportedAtMs(cloudPayload)
        const localAt = await getLatestLocalChangeMs()
        if (cloudAt > localAt) {
          const restored = await restoreFromCloud()
          if (restored) return { action: 'restored', payload: restored }
        }
      }
    }

    const pushed = await pushToCloud({ force: true })
    return { action: pushed ? 'pushed' : 'linked', payload: null }
  } catch (err) {
    // Rollback allo stato precedente, per non lasciare configurazione monca.
    if (previousToken) localStorage.setItem(TOKEN_KEY, previousToken)
    else localStorage.removeItem(TOKEN_KEY)
    if (previousGistId) localStorage.setItem(GIST_ID_KEY, previousGistId)
    else localStorage.removeItem(GIST_ID_KEY)
    throw err
  }
}

export function disconnectCloudBackup(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(GIST_ID_KEY)
  localStorage.removeItem(LAST_SYNC_KEY)
  void removeOpfsFile(OPFS_CREDS_FILE)
  void removeOpfsFile(OPFS_SYNC_META_FILE)
  void idbClearCreds()
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
    const recovered = await resolveBackupGistId(token)
    if (recovered && recovered !== gistId) {
      await updateGist(token, recovered, content, keepalive)
      return
    }
    const newId = await createGist(token, content)
    localStorage.setItem(GIST_ID_KEY, newId)
    await persistCloudCredentials(token, newId)
    return
  }
  if (!res.ok) throw await apiError(res)
}

/**
 * Salva il backup corrente nel gist. Non lancia se il cloud non è collegato.
 * `keepalive` consente il completamento anche quando l'app va in background.
 *
 * Sicurezza dati: per impostazione predefinita NON sovrascrive con dati vuoti
 * (0 elementi), così un avvio "a vuoto" non può distruggere il backup. Usa
 * `force` solo quando il salvataggio di dati vuoti è voluto.
 */
export async function pushToCloud(options?: {
  keepalive?: boolean
  force?: boolean
}): Promise<boolean> {
  if (!(await ensureCloudCredentials())) return false

  const token = getCloudToken()
  if (!token) return false

  const payload = await exportBackup({ includeBlobs: true })
  if (countBackupPayload(payload) === 0 && !options?.force) {
    return false
  }

  const content = JSON.stringify(payload)
  const gistId = (await resolveBackupGistId(token)) ?? getCloudGistId()
  const keepalive = options?.keepalive ?? false

  if (gistId) {
    await updateGist(token, gistId, content, keepalive)
  } else {
    const newId = await createGist(token, content)
    localStorage.setItem(GIST_ID_KEY, newId)
    await persistCloudCredentials(token, newId)
  }
  setLastSyncNow()
  await writeSyncMeta(payload)
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
  return fetchGistFileContent(token, gistId, file)
}

/** Anteprima del backup cloud (conteggi, senza applicare). */
export async function previewCloudBackup(): Promise<CloudBackupPreview | null> {
  if (!(await ensureCloudCredentials())) return null
  const token = getCloudToken()
  if (!token) return null

  const backupGists = await findAllBackupGists(token)
  const gistId = await resolveBackupGistId(token)
  if (!gistId) return null

  const payload = await fetchCloudBackup()
  if (!payload) return null

  return {
    gistId,
    total: countBackupPayload(payload),
    summary: summarizeBackup(payload),
    exportedAt: payload.exportedAt,
    backupGistsFound: backupGists.length,
  }
}

/** Legge il backup dal cloud senza applicarlo (per anteprima/conteggio). */
export async function fetchCloudBackup(): Promise<BackupPayload | null> {
  if (!(await ensureCloudCredentials())) return null
  const token = getCloudToken()
  if (!token) return null

  const gistId = await resolveBackupGistId(token)
  if (!gistId) return null

  const text = await readGistContent(token, gistId)
  return tryParseGistBackupText(text)
}

/** Ripristina i dati dal cloud. Restituisce il payload o null se assente. */
export async function restoreFromCloud(): Promise<BackupPayload | null> {
  if (!(await ensureCloudCredentials())) {
    throw new Error('Token cloud non configurato.')
  }

  const resume = pauseCloudSync()
  try {
    const payload = await fetchCloudBackup()
    if (!payload) return null
    await restoreBackupFromText(JSON.stringify(payload))
    await writeSyncMeta(payload)
    return payload
  } finally {
    resume()
  }
}

async function readRevisionText(
  token: string,
  gistId: string,
  version: string,
): Promise<string | null> {
  const res = await fetch(`${API_BASE}/gists/${gistId}/${version}`, {
    headers: authHeaders(token),
  })
  if (!res.ok) return null
  const gist = (await res.json()) as GistResponse
  const file = gist.files?.[GIST_FILENAME]
  if (!file) return null
  return fetchGistFileContent(token, gistId, file)
}

async function scanGistHistoryForBest(
  token: string,
  gistId: string,
  maxRevisions: number,
): Promise<{ best: BackupPayload | null; bestIndex: number; scanned: number }> {
  const res = await fetch(`${API_BASE}/gists/${gistId}`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw await apiError(res)
  const gist = (await res.json()) as GistResponse

  const versions = (gist.history ?? [])
    .map((h) => h.version)
    .slice(0, maxRevisions)

  let best: BackupPayload | null = null
  let bestScore = -1
  let bestIndex = -1

  for (let i = 0; i < versions.length; i++) {
    const text = await readRevisionText(token, gistId, versions[i])
    const payload = tryParseGistBackupText(text)
    if (!payload) continue
    const score = scoreBackupPayload(payload)
    if (score > bestScore) {
      bestScore = score
      best = payload
      bestIndex = i
    }
  }

  if (!best) {
    const head = tryParseGistBackupText(await readGistContent(token, gistId))
    if (head) {
      best = head
      bestIndex = 0
    }
  }

  return { best, bestIndex, scanned: versions.length }
}

/**
 * Cerca nello storico del gist la versione **più completa** (con più note,
 * poi più elementi in totale) e la restituisce senza applicarla.
 * Utile quando l'ultima versione ha perso dei dati.
 */
export async function findMostCompleteCloudBackup(
  maxRevisions = 30,
): Promise<CloudRecoveryResult | null> {
  if (!(await ensureCloudCredentials())) return null
  const token = getCloudToken()
  if (!token) return null

  const gists = await findAllBackupGists(token)
  const gistIds =
    gists.length > 0 ? gists.map((g) => g.id) : [await resolveBackupGistId(token)].filter(Boolean) as string[]

  let best: BackupPayload | null = null
  let bestScore = -1
  let bestIndex = -1
  let revisionsScanned = 0

  for (const gistId of gistIds) {
    const result = await scanGistHistoryForBest(token, gistId, maxRevisions)
    revisionsScanned += result.scanned
    if (!result.best) continue
    const score = scoreBackupPayload(result.best)
    if (score > bestScore) {
      bestScore = score
      best = result.best
      bestIndex = result.bestIndex
      localStorage.setItem(GIST_ID_KEY, gistId)
      await persistCloudCredentials(token, gistId)
    }
  }

  if (!best) return null
  return {
    payload: best,
    revisionsScanned,
    fromHistory: bestIndex > 0,
  }
}

/**
 * Ripristina la versione più completa trovata nello storico del gist.
 */
export async function restoreMostCompleteFromCloud(): Promise<CloudRecoveryResult | null> {
  const resume = pauseCloudSync()
  try {
    const result = await findMostCompleteCloudBackup()
    if (!result) return null
    await restoreBackupFromText(JSON.stringify(result.payload))
    await writeSyncMeta(result.payload)
    return result
  } finally {
    resume()
  }
}
