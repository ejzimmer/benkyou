import { useEffect, useEffectEvent } from 'react'

export function useKeyboardShortcut(key: string, onPress: () => void, isEnabled = true) {
  const handlePress = useEffectEvent(onPress)

  useEffect(() => {
    if (!isEnabled) return

    function pressIfShortcut(event: KeyboardEvent) {
      if (event.key !== key || hasModifier(event) || isHandledByTarget(event)) return
      event.preventDefault()
      handlePress()
    }

    window.addEventListener('keydown', pressIfShortcut)
    return () => window.removeEventListener('keydown', pressIfShortcut)
  }, [key, isEnabled])
}

function hasModifier(event: KeyboardEvent) {
  return event.ctrlKey || event.metaKey || event.altKey
}

function isHandledByTarget(event: KeyboardEvent) {
  if (!(event.target instanceof HTMLElement)) return false
  if (event.target.isContentEditable || event.target.closest('input, textarea, select')) return true
  return event.key === 'Enter' && event.target.closest('button, a') !== null
}
