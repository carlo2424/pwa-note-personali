/** Sospende temporaneamente i push automatici (es. durante un ripristino). */
let pauseDepth = 0

export function pauseCloudSync(): () => void {
  pauseDepth += 1
  return () => {
    pauseDepth = Math.max(0, pauseDepth - 1)
  }
}

export function isCloudSyncPaused(): boolean {
  return pauseDepth > 0
}
