import { useEffect, useState } from 'react'
import { getCelebratedLevel, saveCelebratedLevel } from './celebratedLevel'

export function useLevelUp(level: number) {
  const [celebratedLevel, setCelebratedLevel] = useState(() => getCelebratedLevel() ?? level)

  useEffect(() => {
    if (getCelebratedLevel() === null) saveCelebratedLevel(celebratedLevel)
  }, [celebratedLevel])

  function dismissLevelUp() {
    saveCelebratedLevel(level)
    setCelebratedLevel(level)
  }

  return { isLevelUp: level > celebratedLevel, dismissLevelUp }
}
