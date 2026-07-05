const DISMISS_KEY = 'pwa-storage-banner-dismissed'

export function isStorageProtectionBannerDismissed(): boolean {
  return sessionStorage.getItem(DISMISS_KEY) != null
}

export function dismissStorageProtectionBanner(): void {
  sessionStorage.setItem(DISMISS_KEY, String(Date.now()))
}

export function clearStorageProtectionBannerDismiss(): void {
  sessionStorage.removeItem(DISMISS_KEY)
}
