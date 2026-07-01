import "fake-indexeddb/auto"
import "@testing-library/jest-dom/vitest"

// jsdom's Blob/File don't implement `.arrayBuffer()` (real browsers do), but
// media hashing (mediaBlobDigest) relies on it. Polyfill via FileReader,
// which jsdom does support, so tests exercise the same code path as prod.
if (typeof Blob !== "undefined" && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function (this: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = () => reject(reader.error)
      reader.readAsArrayBuffer(this)
    })
  }
}
