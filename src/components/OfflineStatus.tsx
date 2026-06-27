import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineStatus() {
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const onOnline = () => setOffline(false)
    const onOffline = () => setOffline(true)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-1.5 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-800"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Sei offline — i dati restano salvati sul dispositivo
    </div>
  )
}
