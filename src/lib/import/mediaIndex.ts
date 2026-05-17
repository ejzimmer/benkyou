/** Anki v3 `media` file: protobuf `MediaEntries` (field 1 = repeated MediaEntry). */

function parseVarint(buf: Uint8Array, i: number): [number, number] {
  let x = 0
  let shift = 0
  while (true) {
    const b = buf[i]!
    i += 1
    x |= (b & 0x7f) << shift
    if (b < 128) return [x, i]
    shift += 7
  }
}

function parseMediaEntry(buf: Uint8Array): [string | null, number | null] {
  let name: string | null = null
  let legacy: number | null = null
  let i = 0
  while (i < buf.length) {
    let tag: number
    ;[tag, i] = parseVarint(buf, i)
    const field = tag >> 3
    const wire = tag & 7
    if (wire === 2) {
      let length: number
      ;[length, i] = parseVarint(buf, i)
      const data = buf.subarray(i, i + length)
      i += length
      if (field === 1) name = new TextDecoder().decode(data)
    } else if (wire === 0) {
      let value: number
      ;[value, i] = parseVarint(buf, i)
      if (field === 255) legacy = value
    } else break
  }
  return [name, legacy]
}

/** Returns list of [zipEntryName, mediaFilename]. */
export function parseMediaEntriesProtobuf(buf: Uint8Array): [string, string][] {
  const out: [string, string][] = []
  let i = 0
  let seq = 0
  while (i < buf.length) {
    let tag: number
    ;[tag, i] = parseVarint(buf, i)
    const field = tag >> 3
    const wire = tag & 7
    if (field === 1 && wire === 2) {
      let length: number
      ;[length, i] = parseVarint(buf, i)
      const chunk = buf.subarray(i, i + length)
      i += length
      const [name, legacy] = parseMediaEntry(chunk)
      if (name) {
        const zipName = String(legacy ?? seq)
        out.push([zipName, name])
      }
      seq += 1
    } else if (wire === 0) {
      ;[, i] = parseVarint(buf, i)
    } else if (wire === 2) {
      let length: number
      ;[length, i] = parseVarint(buf, i)
      i += length
    } else break
  }
  return out
}

export function isZstdMagic(buf: Uint8Array): boolean {
  return buf.length >= 4 && buf[0] === 0x28 && buf[1] === 0xb5 && buf[2] === 0x2f && buf[3] === 0xfd
}

export function parseMediaMapJson(buf: Uint8Array): Map<string, string> {
  const text = new TextDecoder().decode(buf)
  const raw = JSON.parse(text) as Record<string, string>
  const filenameToZip = new Map<string, string>()
  for (const [num, name] of Object.entries(raw)) {
    filenameToZip.set(name, String(num))
  }
  return filenameToZip
}
