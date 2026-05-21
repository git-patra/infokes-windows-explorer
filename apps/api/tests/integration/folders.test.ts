import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { createApp } from '../../src/composition-root'

// These tests hit the real DB — requires Postgres running
// Run with: bun test tests/integration

const app = createApp()

describe('GET /api/v1/folders/tree', () => {
  it('returns 200 with tree data', async () => {
    const res = await app.handle(new Request('http://localhost/api/v1/folders/tree'))
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.data.children).toBeDefined()
    expect(Array.isArray(body.data.children)).toBe(true)
    expect(body.meta.totalFolders).toBeGreaterThan(0)
  })

  it('returns lazy tree with depth=1', async () => {
    const res = await app.handle(new Request('http://localhost/api/v1/folders/tree?depth=1'))
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.meta.mode).toBe('lazy')
    expect(body.meta.depthLoaded).toBe(1)
  })
})

describe('GET /api/v1/folders/:id', () => {
  it('returns 404 for non-existent folder', async () => {
    const res = await app.handle(new Request('http://localhost/api/v1/folders/99999999'))
    expect(res.status).toBe(404)
    const body = await res.json() as any
    expect(body.error.code).toBe('FOLDER_NOT_FOUND')
  })
})

describe('GET /api/v1/folders/:id/children', () => {
  it('returns 404 for non-existent folder', async () => {
    const res = await app.handle(new Request('http://localhost/api/v1/folders/99999999/children'))
    expect(res.status).toBe(404)
    const body = await res.json() as any
    expect(body.error.code).toBe('FOLDER_NOT_FOUND')
  })
})
