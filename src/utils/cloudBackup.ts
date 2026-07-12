import {
  countBackupPayload,
  exportBackup,
  hasBackupableData,
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
const OPFS_CREDS_FILE = 'pwa-cloud-creds.json'
const OPFS_SYNC_META_FILE = 'pwa-cloud-sync-meta.json'

interface CloudSyncMeta {
  total: number
  notes: number
  events: number
  expenses: number
  at: number
}

async function readSyncMeta(): Promise<CloudSyncMeta | null> {
  try {
    const raw = await readOpfsText(OPFS_SYNC_META_FILE)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CloudSyncMeta
    if (typeof parsed.total !== 'number') return null
    return parsed
  } catch {
    return null
  }
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

function payloadCounts(payload: BackupPayload) {
  return {
    notes: payload.data.notes.length,
    events: payload.data.events.length,
    expenses: payload.data.expenses.length,
    total: countBackupPayload(payload),
  }
}

/** True se il backup cloud ha più dati del locale (perdita parziale overnight). */
function isCloudRicherThanLocal(
  cloud: BackupPayload,
  local: BackupPayload,
): boolean {
  const c = payloadCounts(cloud)
  const l = payloadCounts(local)
  if (c.total > l.total) return true
  // Le note spariscono spesso per prime dopo una pulizia del browser.
  if (c.notes > l.notes) return true
  return false
}

/** Blocca upload se i dati locali sono calati rispetto all'ultimo salvataggio buono. */
async function isLocalBackupDegraded(
  payload: BackupPayload,
): Promise<boolean> {
  const meta = await readSyncMeta()
  if (!meta) return false
  const current = payloadCounts(payload)
  if (current.total < meta.total) return true
  if (current.notes < meta.notes) return true
  return false
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

/** Salva token e gistId in localStorage e copia ridondante OPFS. */
export async function persistCloudCredentials(
  token: string,
  gistId?: string | null,
): Promise<void> {
  localStorage.setItem(TOKEN_KEY, token)
  if (gistId) localStorage.setItem(GIST_ID_KEY, gistId)
  try {
    await writeOpfsText(
      OPFS_CREDS_FILE,
      JSON.stringify({ token, gistId: gistId ?? null }),
    )
  } catch {
    // best-effort
  }
}

/**
 * Ripristina le credenziali cloud dopo una cancellazione del browser:
 * 1) token nell'URL (segnalibro di ripristino)
 * 2) copia OPFS
 */
export async function hydrateCloudCredentials(): Promise<boolean> {
  seedCloudTokenFromUrl()

  if (getCloudToken()) {
    await ensureCloudGistLinked()
    return true
  }

  try {
    const raw = await readOpfsText(OPFS_CREDS_FILE)
    if (!raw) return false
    const parsed = JSON.parse(raw) as { token?: string; gistId?: string | null }
    const token = parsed.token?.trim()
    if (!token) return false
    localStorage.setItem(TOKEN_KEY, token)
    if (parsed.gistId) localStorage.setItem(GIST_ID_KEY, parsed.gistId)
    await ensureCloudGistLinked()
    return true
  } catch {
    return false
  }
}

async function ensureCloudGistLinked(): Promise<void> {
  const token = getCloudToken()
  if (!token || getCloudGistId()) return
  const existing = await findExistingBackupGist(token)
  if (existing) {
    localStorage.setItem(GIST_ID_KEY, existing)
    await persistCloudCredentials(token, existing)
  }
}

export type CloudStartupResult = 'restored' | 'pushed' | 'idle' | 'no-cloud'

/**
 * All'avvio: confronta locale e cloud. Se il cloud ha più dati (perdita
 * parziale overnight), ripristina. Altrimenti carica il locale su GitHub.
 */
export async function runCloudStartupSync(): Promise<CloudStartupResult> {
  if (!isCloudBackupEnabled()) return 'no-cloud'

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

      const localPayload = await exportBackup({ includeBlobs: true })
      if (isCloudRicherThanLocal(cloudPayload, localPayload)) {
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

  const existing = await findExistingBackupGist(token)
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

    // Ci sono dati locali: salvali nel cloud.
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
 *
 * Sicurezza dati: per impostazione predefinita NON sovrascrive con dati vuoti
 * (0 elementi), così un avvio "a vuoto" non può distruggere il backup. Usa
 * `force` solo quando il salvataggio di dati vuoti è voluto.
 */
export async function pushToCloud(options?: {
  keepalive?: boolean
  force?: boolean
}): Promise<boolean> {
  const token = getCloudToken()
  if (!token) return false

  const payload = await exportBackup({ includeBlobs: true })
  if (countBackupPayload(payload) === 0 && !options?.force) {
    return false
  }

  if (!options?.force && (await isLocalBackupDegraded(payload))) {
    console.warn(
      '[Cloud] Salvataggio bloccato: dati locali ridotti rispetto all\'ultimo backup noto.',
    )
    return false
  }

  const content = JSON.stringify(payload)
  const gistId = getCloudGistId()
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
  await writeSyncMeta(payload)
  return payload
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
  if (file.truncated && file.raw_url) {
    const rawRes = await fetch(file.raw_url, { headers: authHeaders(token) })
    if (!rawRes.ok) return null
    return rawRes.text()
  }
  return file.content ?? null
}

/**
 * Cerca nello storico del gist la versione **più completa** (con più note,
 * poi più elementi in totale) e la restituisce senza applicarla.
 * Utile quando l'ultima versione ha perso dei dati.
 */
export async function findMostCompleteCloudBackup(
  maxRevisions = 30,
): Promise<CloudRecoveryResult | null> {
  const token = getCloudToken()
  if (!token) return null
  let gistId = getCloudGistId()
  if (!gistId) {
    gistId = await findExistingBackupGist(token)
    if (gistId) localStorage.setItem(GIST_ID_KEY, gistId)
  }
  if (!gistId) return null

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
    if (!text) continue
    let payload: BackupPayload
    try {
      payload = parseBackupPayload(text)
    } catch {
      continue
    }
    // Priorità alle note, poi al totale degli elementi.
    const score = payload.data.notes.length * 1_000_000 + countBackupPayload(payload)
    if (score > bestScore) {
      bestScore = score
      best = payload
      bestIndex = i
    }
  }

  if (!best || countBackupPayload(best) === 0) return null
  return {
    payload: best,
    revisionsScanned: versions.length,
    fromHistory: bestIndex > 0,
  }
}

/**
 * Ripristina la versione più completa trovata nello storico del gist.
 */
export async function restoreMostCompleteFromCloud(): Promise<CloudRecoveryResult | null> {
  const result = await findMostCompleteCloudBackup()
  if (!result) return null
  await restoreBackupFromText(JSON.stringify(result.payload))
  return result
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
