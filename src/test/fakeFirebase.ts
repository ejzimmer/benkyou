/**
 * In-memory fakes for `firebase/firestore` and `firebase/storage` used by the
 * sync test suite. Two "devices" share the same module-scoped backend; reset
 * the backend between tests with `resetFakeBackend()`.
 *
 * Also installs a minimal `localStorage` polyfill when running under the
 * vitest `node` environment so that `runSync.ts` (which reads
 * `benkyou:lastSyncedAt` from localStorage) can be exercised end-to-end.
 */

if (typeof (globalThis as { localStorage?: Storage }).localStorage === "undefined") {
  const store = new Map<string, string>()
  ;(globalThis as { localStorage: Storage }).localStorage = {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(k: string) {
      return store.has(k) ? store.get(k)! : null
    },
    setItem(k: string, v: string) {
      store.set(k, String(v))
    },
    removeItem(k: string) {
      store.delete(k)
    },
    key(i: number) {
      return [...store.keys()][i] ?? null
    },
  }
}

export type FakeFirestoreBackend = {
  /** collectionPath ("users/u/decks") -> docId -> arbitrary data */
  docs: Map<string, Map<string, unknown>>
}

export type FakeStorageBackend = {
  /** "users/u/media/{id}" -> stored bytes + contentType */
  blobs: Map<string, { bytes: Uint8Array; contentType: string }>
  /** Upload calls recorded for assertions (path + contentType + size). */
  uploads: Array<{ path: string; contentType: string; size: number }>
}

export type FakeBackend = {
  firestore: FakeFirestoreBackend
  storage: FakeStorageBackend
}

const backend: FakeBackend = {
  firestore: { docs: new Map() },
  storage: { blobs: new Map(), uploads: [] },
}

export function getFakeBackend(): FakeBackend {
  return backend
}

/** Wipe in place so mocks that captured a reference still see the same store. */
export function resetFakeBackend(): void {
  backend.firestore.docs.clear()
  backend.storage.blobs.clear()
  backend.storage.uploads.length = 0
  if (typeof globalThis.localStorage !== "undefined") {
    globalThis.localStorage.clear()
  }
}

// ---------------------------------------------------------------------------
// Firestore fake
// ---------------------------------------------------------------------------

type FsRef = { __path: string }

function fsSplitDocPath(path: string): {
  collectionPath: string
  docId: string
} {
  const parts = path.split("/")
  const docId = parts.pop()!
  return { collectionPath: parts.join("/"), docId }
}

export function fakeCollection(_fs: unknown, ...segs: string[]): FsRef {
  return { __path: segs.join("/") }
}

export function fakeDoc(parent: FsRef, docId?: string): FsRef {
  if (docId == null) return { __path: parent.__path }
  return { __path: `${parent.__path}/${docId}` }
}

export async function fakeGetDocs(collRef: FsRef) {
  const docs = backend.firestore.docs.get(collRef.__path) ?? new Map()
  return {
    docs: [...docs.entries()].map(([id, data]) => ({
      id: id as string,
      data: () => structuredCloneSafe(data),
    })),
  }
}

export async function fakeSetDoc(docRef: FsRef, data: unknown) {
  const { collectionPath, docId } = fsSplitDocPath(docRef.__path)
  let coll = backend.firestore.docs.get(collectionPath)
  if (!coll) {
    coll = new Map()
    backend.firestore.docs.set(collectionPath, coll)
  }
  coll.set(docId, structuredCloneSafe(data))
}

export async function fakeDeleteDoc(docRef: FsRef) {
  const { collectionPath, docId } = fsSplitDocPath(docRef.__path)
  const coll = backend.firestore.docs.get(collectionPath)
  if (coll) coll.delete(docId)
}

export function fakeWriteBatch(_fs: unknown) {
  type Op =
    | { kind: "set"; ref: FsRef; data: unknown }
    | { kind: "delete"; ref: FsRef }
  const ops: Op[] = []
  return {
    set(ref: FsRef, data: unknown) {
      ops.push({ kind: "set", ref, data })
      return this
    },
    delete(ref: FsRef) {
      ops.push({ kind: "delete", ref })
      return this
    },
    async commit() {
      for (const op of ops) {
        if (op.kind === "set") await fakeSetDoc(op.ref, op.data)
        else await fakeDeleteDoc(op.ref)
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Storage fake
// ---------------------------------------------------------------------------

type StorageRef = { __path: string; __isStorage: true }

function notFoundError() {
  return Object.assign(new Error("storage/object-not-found"), {
    code: "storage/object-not-found",
  })
}

export function fakeRef(_storage: unknown, path: string): StorageRef {
  return { __path: path, __isStorage: true }
}

export async function fakeUploadBytes(
  r: StorageRef,
  data: Blob | Uint8Array | ArrayBuffer,
  metadata?: { contentType?: string },
) {
  let bytes: Uint8Array
  let blobType = ""
  if (data instanceof Blob) {
    bytes = new Uint8Array(await data.arrayBuffer())
    blobType = data.type ?? ""
  } else if (data instanceof Uint8Array) {
    bytes = data.slice()
  } else {
    bytes = new Uint8Array(data)
  }
  const contentType =
    metadata?.contentType || blobType || "application/octet-stream"
  backend.storage.blobs.set(r.__path, { bytes, contentType })
  backend.storage.uploads.push({
    path: r.__path,
    contentType,
    size: bytes.byteLength,
  })
  return { ref: r, metadata: { contentType, size: bytes.byteLength } }
}

export async function fakeGetBlob(r: StorageRef): Promise<Blob> {
  const entry = backend.storage.blobs.get(r.__path)
  if (!entry) throw notFoundError()
  return new Blob([entry.bytes], { type: entry.contentType })
}

export async function fakeGetBytes(r: StorageRef): Promise<ArrayBuffer> {
  const entry = backend.storage.blobs.get(r.__path)
  if (!entry) throw notFoundError()
  return entry.bytes.slice().buffer
}

export async function fakeDeleteObject(r: StorageRef): Promise<void> {
  if (!backend.storage.blobs.has(r.__path)) throw notFoundError()
  backend.storage.blobs.delete(r.__path)
}

// ---------------------------------------------------------------------------

function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value)
    } catch {
      /* fall through */
    }
  }
  return JSON.parse(JSON.stringify(value)) as T
}
