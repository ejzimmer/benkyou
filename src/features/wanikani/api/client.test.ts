import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WaniKaniClient } from './client'
import { ApiError } from './errors'

type Reply = { status?: number; body?: unknown; headers?: Record<string, string> }

function makeFakeFetch(replies: Reply[]) {
  const calls: { url: string; method: string; body: unknown; headers: Record<string, string>; at: Temporal.Instant }[] = []
  const fetch = (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), method: init?.method ?? 'GET', body: init?.body, headers: (init?.headers ?? {}) as Record<string, string>, at: Temporal.Now.instant() })
    const r = replies.shift() ?? { status: 500 }
    return Promise.resolve(
      new Response(r.status === 304 ? null : JSON.stringify(r.body ?? {}), {
        status: r.status ?? 200,
        headers: r.headers,
      }),
    )
  }
  return { fetch: fetch as typeof globalThis.fetch, calls }
}

const makePage = (ids: number[], next: string | null) => ({
  object: 'collection', url: '', total_count: 3, data_updated_at: null,
  pages: { next_url: next, previous_url: null, per_page: 2 },
  data: ids.map((id) => ({ id, object: 'subject', url: '', data_updated_at: null, data: {} })),
})

describe('WaniKaniClient', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('sends auth and revision headers', async () => {
    const f = makeFakeFetch([{ body: { data: { level: 5 } } }])
    const res = await new WaniKaniClient('tok', { fetch: f.fetch }).getUser()
    expect(res.data.level).toBe(5)
    expect(f.calls[0].url).toBe('https://api.wanikani.com/v2/user')
    expect(f.calls[0].headers.Authorization).toBe('Bearer tok')
    expect(f.calls[0].headers['Wanikani-Revision']).toBe('20170710')
  })

  it('posts JSON with the same headers', async () => {
    const f = makeFakeFetch([{ status: 201, body: { id: 0 } }])
    const res = await new WaniKaniClient('tok', { fetch: f.fetch }).post('/reviews', { review: { assignment_id: 5 } })
    expect(res).toEqual({ id: 0 })
    expect(f.calls[0].method).toBe('POST')
    expect(f.calls[0].body).toBe('{"review":{"assignment_id":5}}')
    expect(f.calls[0].headers.Authorization).toBe('Bearer tok')
    expect(f.calls[0].headers['Content-Type']).toBe('application/json')
  })

  it('follows pagination', async () => {
    const f = makeFakeFetch([
      { body: makePage([1, 2], 'https://api.wanikani.com/v2/subjects?page_after_id=2') },
      { body: makePage([3], null) },
    ])
    const items = await new WaniKaniClient('t', { fetch: f.fetch }).getAll('/subjects', { levels: '1' })
    expect(items.map((i) => i.id)).toEqual([1, 2, 3])
    expect(f.calls[0].url).toBe('https://api.wanikani.com/v2/subjects?levels=1')
    expect(f.calls[1].url).toContain('page_after_id=2')
  })

  it('serves a 304 from the cache', async () => {
    const f = makeFakeFetch([
      { body: { data: { level: 7 } }, headers: { ETag: 'W/"abc"' } },
      { status: 304 },
    ])
    const client = new WaniKaniClient('t', { fetch: f.fetch })
    await client.getUser()
    const again = await client.getUser()
    expect(f.calls[1].headers['If-None-Match']).toBe('W/"abc"')
    expect(again.data.level).toBe(7)
  })

  it('throws ApiError with the API message', async () => {
    const f = makeFakeFetch([{ status: 401, body: { error: 'Unauthorized', code: 401 } }])
    const err = await new WaniKaniClient('bad', { fetch: f.fetch }).getUser().catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(401)
    expect(err.message).toBe('Unauthorized')
  })

  it('waits for the reset time after a 429 and retries', async () => {
    // RateLimit-Reset is in epoch seconds
    const reset = String(Temporal.Now.instant().add({ seconds: 5 }).epochMilliseconds / 1000)
    const f = makeFakeFetch([
      { status: 429, headers: { 'RateLimit-Remaining': '0', 'RateLimit-Reset': reset } },
      { body: { data: { level: 2 } } },
    ])
    const pending = new WaniKaniClient('t', { fetch: f.fetch }).getUser()
    await vi.runAllTimersAsync()
    expect((await pending).data.level).toBe(2)
    expect(f.calls[0].at.until(f.calls[1].at).total('seconds')).toBe(5)
  })

  it('never sends more than 60 requests in a minute', async () => {
    const f = makeFakeFetch(Array.from({ length: 61 }, () => ({ body: {} })))
    const client = new WaniKaniClient('t', { fetch: f.fetch })
    for (let i = 0; i < 60; i++) {
      // Sequential on purpose: each request has to land before the clock moves on.
      // oxlint-disable-next-line no-await-in-loop
      await client.get('/user')
      vi.advanceTimersByTime(100)
    }
    const pending = client.get('/user')
    await vi.runAllTimersAsync()
    await pending
    expect(f.calls[0].at.until(f.calls[60].at).total('minutes')).toBe(1)
  })
})
