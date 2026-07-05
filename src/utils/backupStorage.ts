const META_DB_NAME = 'note-personali-backup-meta'
const META_DB_VERSION = 1
const HANDLE_KEY = 'export'
const OPFS_FILE = 'note-personali-backup-latest.json'

type WritableFileHandle = FileSystemFileHandle & {
  queryPermission?(descriptor: {
    mode: 'readwrite'
  }): Promise<PermissionState>
  requestPermission?(descriptor: {
    mode: 'readwrite'
  }): Promise<PermissionState>
}

type SaveFilePickerOptions = {
  suggestedName?: string
  types?: Array<{
    description: string
    accept: Record<string, string[]>
  }>
}

type WindowWithFilePicker = Window & {
  showSaveFilePicker?(
    options?: SaveFilePickerOptions,
  ): Promise<FileSystemFileHandle>
}

function supportsOpfs(): boolean {
  return typeof navigator.storage?.getDirectory === 'function'
}

function openMetaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(META_DB_NAME, META_DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore('handles')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbPutHandle(handle: FileSystemFileHandle): Promise<void> {
  const db = await openMetaDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('handles', 'readwrite')
    tx.objectStore('handles').put(handle, HANDLE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

async function idbGetHandle(): Promise<FileSystemFileHandle | null> {
  const db = await openMetaDb()
  const handle = await new Promise<FileSystemFileHandle | null>((resolve, reject) => {
    const tx = db.transaction('handles', 'readonly')
    const req = tx.objectStore('handles').get(HANDLE_KEY)
    req.onsuccess = () => resolve((req.result as FileSystemFileHandle | undefined) ?? null)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return handle
}

async function idbClearHandle(): Promise<void> {
  const db = await openMetaDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('handles', 'readwrite')
    tx.objectStore('handles').delete(HANDLE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

async function ensureWritePermission(
  handle: FileSystemFileHandle,
): Promise<boolean> {
  const fileHandle = handle as WritableFileHandle
  if (!fileHandle.queryPermission || !fileHandle.requestPermission) {
    return true
  }
  let perm = await fileHandle.queryPermission({ mode: 'readwrite' })
  if (perm === 'granted') return true
  perm = await fileHandle.requestPermission({ mode: 'readwrite' })
  return perm === 'granted'
}

export function supportsBackupFilePicker(): boolean {
  return typeof (window as WindowWithFilePicker).showSaveFilePicker ===
    'function'
}

export async function linkBackupExportFile(): Promise<void> {
  const picker = (window as WindowWithFilePicker).showSaveFilePicker
  if (!picker) {
    throw new Error('Il browser non consente di collegare un file da aggiornare.')
  }
  const handle = await picker({
    suggestedName: 'note-personali-backup.json',
    types: [
      {
        description: 'Backup JSON',
        accept: { 'application/json': ['.json'] },
      },
    ],
  })
  await idbPutHandle(handle)
}

export async function unlinkBackupExportFile(): Promise<void> {
  await idbClearHandle()
}

export async function getLinkedBackupFileName(): Promise<string | null> {
  const handle = await idbGetHandle()
  return handle?.name ?? null
}

export async function writeLinkedBackupFile(content: string): Promise<
  'written' | 'no-handle' | 'denied'
> {
  const handle = await idbGetHandle()
  if (!handle) return 'no-handle'
  if (!(await ensureWritePermission(handle))) return 'denied'
  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
  return 'written'
}

export async function writeRollingLocalBackup(content: string): Promise<boolean> {
  if (!supportsOpfs()) return false
  const root = await navigator.storage.getDirectory()
  const fileHandle = await root.getFileHandle(OPFS_FILE, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
  return true
}

export async function hasRollingLocalBackup(): Promise<boolean> {
  if (!supportsOpfs()) return false
  try {
    const root = await navigator.storage.getDirectory()
    await root.getFileHandle(OPFS_FILE)
    return true
  } catch {
    return false
  }
}

export async function readRollingLocalBackupText(): Promise<string | null> {
  if (!supportsOpfs()) return null
  try {
    const root = await navigator.storage.getDirectory()
    const fileHandle = await root.getFileHandle(OPFS_FILE)
    const file = await fileHandle.getFile()
    return await file.text()
  } catch {
    return null
  }
}

export async function clearRollingLocalBackup(): Promise<void> {
  if (!supportsOpfs()) return
  try {
    const root = await navigator.storage.getDirectory()
    await root.removeEntry(OPFS_FILE)
  } catch {
    // ignora
  }
}
