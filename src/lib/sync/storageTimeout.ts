const DEFAULT_MS = 120_000

export class StorageOperationTimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms}ms`)
    this.name = "StorageOperationTimeoutError"
  }
}

export function withStorageTimeout<T>(
  label: string,
  fn: () => Promise<T>,
  ms = DEFAULT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new StorageOperationTimeoutError(label, ms))
    }, ms)
    fn()
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((e) => {
        clearTimeout(timer)
        reject(e)
      })
  })
}
