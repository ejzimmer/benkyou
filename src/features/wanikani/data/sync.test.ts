import { beforeEach, describe, expect, it } from 'vitest'
import { WaniKaniClient } from '../api/client'
import { clearDatabase, db } from './db'
import { sync } from './sync'

type Item = { id: number; updatedAt: string; data?: Record<string, unknown> }

function makeFakeWaniKani(server: Record<string, Item[]>) {
  const requestedUrls: string[] = []
  const fetch = (input: string | URL | Request) => {
    const url = new URL(String(input))
    requestedUrls.push(url.pathname + url.search)
    const path = url.pathname.replace('/v2', '')
    if (path === '/user') {
      return Promise.resolve(Response.json({ data: { username: 'erin', level: 12, subscription: { max_level_granted: 60 } } }))
    }
    const updatedAfter = url.searchParams.get('updated_after')
    const items = (server[path] ?? []).filter(
      (item) => !updatedAfter || Temporal.Instant.compare(item.updatedAt, updatedAfter) > 0,
    )
    return Promise.resolve(
      Response.json({
        object: 'collection',
        pages: { next_url: null },
        data: items.map((item) => ({ id: item.id, data_updated_at: item.updatedAt, data: item.data ?? {} })),
      }),
    )
  }
  return { client: new WaniKaniClient('t', { fetch: fetch as typeof globalThis.fetch }), requestedUrls }
}

describe('sync', () => {
  beforeEach(() => clearDatabase())

  it('downloads every collection and the user on the first run', async () => {
    const { client, requestedUrls } = makeFakeWaniKani({
      '/subjects': [
        { id: 1, updatedAt: '2026-01-01T00:00:00Z' },
        { id: 2, updatedAt: '2026-01-02T00:00:00Z' },
      ],
      '/assignments': [{ id: 10, updatedAt: '2026-02-01T00:00:00Z' }],
    })

    await sync(client)

    expect(await db.subjects.count()).toBe(2)
    expect(await db.assignments.count()).toBe(1)
    expect((await db.user.get('me'))?.user.username).toBe('erin')
    expect(requestedUrls).toContain('/v2/subjects')
    expect(requestedUrls).toContain('/v2/review_statistics')
    expect(requestedUrls).toContain('/v2/study_materials')
    expect(requestedUrls).toContain('/v2/spaced_repetition_systems')
  })

  it('asks only for changes since the newest record it holds', async () => {
    const server: Record<string, Item[]> = {
      '/assignments': [
        { id: 10, updatedAt: '2026-02-01T00:00:00Z', data: { srs_stage: 1 } },
        { id: 11, updatedAt: '2026-02-03T00:00:00Z', data: { srs_stage: 1 } },
      ],
    }
    const { client, requestedUrls } = makeFakeWaniKani(server)
    await sync(client)

    server['/assignments'][0] = { id: 10, updatedAt: '2026-02-05T00:00:00Z', data: { srs_stage: 2 } }
    await sync(client)

    expect(requestedUrls).toContain('/v2/assignments?updated_after=2026-02-03T00%3A00%3A00Z')
    expect((await db.assignments.get(10))?.data).toEqual({ srs_stage: 2 })
    expect((await db.assignments.get(11))?.data).toEqual({ srs_stage: 1 })
    expect((await db.syncState.get('assignments'))?.lastUpdatedAt).toBe('2026-02-05T00:00:00Z')
  })

  it('keeps its place when nothing has changed', async () => {
    const { client } = makeFakeWaniKani({ '/subjects': [{ id: 1, updatedAt: '2026-01-01T00:00:00Z' }] })
    await sync(client)
    await sync(client)

    expect((await db.syncState.get('subjects'))?.lastUpdatedAt).toBe('2026-01-01T00:00:00Z')
    expect(await db.subjects.count()).toBe(1)
  })
})
