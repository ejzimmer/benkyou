export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// WaniKani answers 4xx when a request can never succeed (e.g. 422: already started, or not available for
// review any more), so retrying can't help. 401 and 429 are the exceptions: they can succeed later.
export function isRejectedForGood(error: unknown) {
  return error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 401 && error.status !== 429
}
