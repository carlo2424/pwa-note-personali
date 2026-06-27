import { useRef } from 'react'

const LONG_PRESS_MS = 550

/** Tap normale + pressione lunga (o click destro) su chip mobile */
export function useChipPress(onTap: () => void, onLongPress: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressRef = useRef(false)

  function clearTimer() {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function handleStart() {
    longPressRef.current = false
    clearTimer()
    timerRef.current = setTimeout(() => {
      longPressRef.current = true
      onLongPress()
      if ('vibrate' in navigator) navigator.vibrate(12)
    }, LONG_PRESS_MS)
  }

  function handleEnd() {
    clearTimer()
  }

  function handleClick() {
    if (longPressRef.current) {
      longPressRef.current = false
      return
    }
    onTap()
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    onLongPress()
  }

  return {
    onMouseDown: handleStart,
    onMouseUp: handleEnd,
    onMouseLeave: handleEnd,
    onTouchStart: handleStart,
    onTouchEnd: handleEnd,
    onClick: handleClick,
    onContextMenu: handleContextMenu,
  }
}
