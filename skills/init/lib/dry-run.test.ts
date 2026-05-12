// 2026-05-12 (Luiz/dev): valida recorder + writer factory — Plano 03 fase-06.

import { describe, it, expect } from 'bun:test'
import { WriteRecorder, makeWriter } from './dry-run'

describe('WriteRecorder', () => {
  it('records writes in memory', async () => {
    const r = new WriteRecorder()
    const w = makeWriter({ dryRun: true, recorder: r })
    await w('/tmp/foo', 'hello')
    await w('/tmp/bar', 'world')
    expect(r.count()).toBe(2)
    expect(r.list()[0]!.path).toBe('/tmp/foo')
    expect(r.list()[0]!.bodyPreview).toBe('hello')
    expect(r.totalBytes()).toBeGreaterThan(0)
  })

  it('truncates bodyPreview to 200 chars', async () => {
    const r = new WriteRecorder()
    const w = makeWriter({ dryRun: true, recorder: r })
    const big = 'x'.repeat(500)
    await w('/tmp/big', big)
    expect(r.list()[0]!.bodyPreview.length).toBe(200)
    expect(r.list()[0]!.bytes).toBe(500)
  })

  it('clear resets recorder', async () => {
    const r = new WriteRecorder()
    const w = makeWriter({ dryRun: true, recorder: r })
    await w('/tmp/a', 'x')
    r.clear()
    expect(r.count()).toBe(0)
  })
})

describe('makeWriter — real mode', () => {
  it('returns a real writer when dryRun=false', async () => {
    const w = makeWriter({ dryRun: false })
    // Does not invoke w() here — expensive. Verifies it returned a function.
    expect(typeof w).toBe('function')
  })
})
