const KEY = 'yomu.token'

const listeners = new Set<() => void>()

function notifyListeners() {
  listeners.forEach((onChange) => onChange())
}

export function subscribeToToken(onChange: () => void) {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function saveToken(token: string) {
  localStorage.setItem(KEY, token)
  notifyListeners()
}

export function clearToken() {
  localStorage.removeItem(KEY)
  notifyListeners()
}
