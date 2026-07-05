import { useEffect } from 'react'
import { syncAllAutomatedEventRenewals } from '../utils/impegnoDone'

/** All’avvio aggiorna rinnovi carta/bonifico già passati. */
export function useAutomatedEventSync() {
  useEffect(() => {
    void syncAllAutomatedEventRenewals()
  }, [])
}
