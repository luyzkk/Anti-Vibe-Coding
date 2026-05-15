// 2026-05-15 (Luiz/dev): Integration test — Plano 02 fase-03. Smoke test: dispatcher + JSON round-trip.
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { discoverCapabilities } from '../capabilities-writer'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), 'caps-int-'))
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

describe('capabilities-writer integration', () => {
  it('end-to-end discoverCapabilities + JSON.stringify produces valid shape for nextjs project', async () => {
    // Fixture: minimal nextjs project with app/api/health/route.ts
    const routeDir = path.join(tmpDir, 'app', 'api', 'health')
    await mkdir(routeDir, { recursive: true })
    await writeFile(
      path.join(routeDir, 'route.ts'),
      'export async function GET(req: Request) { return new Response("ok") }',
      'utf-8',
    )

    const result = await discoverCapabilities(tmpDir, 'nextjs-app-router')

    // JSON round-trip
    const serialized = JSON.stringify(result, null, 2)
    const parsed = JSON.parse(serialized) as Record<string, unknown>

    expect(parsed.schema_version).toBe('1.0')
    expect(Array.isArray(parsed.capabilities)).toBe(true)
    // GT-01: optional chaining to satisfy noUncheckedIndexedAccess
    const caps = parsed.capabilities as Array<Record<string, unknown>>
    expect(caps[0]?.kind).toBe('route')
    expect(caps[0]?.source).toBe('ast')
    expect(Array.isArray(parsed.coverage_gaps)).toBe(true)
    expect(parsed.profile_at_generation).toBe('nextjs-app-router')
    expect(!Number.isNaN(Date.parse(parsed.generated_at as string))).toBe(true)
  })

  it('output shape matches expected fields (basic schema compliance)', async () => {
    // No fixture — tmpDir is empty
    const output = await discoverCapabilities(tmpDir, 'nextjs-app-router')

    expect(typeof output.schema_version).toBe('string')
    expect(Array.isArray(output.capabilities)).toBe(true)
    expect(Array.isArray(output.coverage_gaps)).toBe(true)
    expect(typeof output.generated_at).toBe('string')
    expect(typeof output.profile_at_generation).toBe('string')
  })
})
