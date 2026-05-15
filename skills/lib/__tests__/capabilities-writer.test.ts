// 2026-05-15 (Luiz/dev): RED phase — Plano 02 fase-01. Tests specify discoverNextjsAppRouterCapabilities.
// Implementation does not exist yet. All tests must fail on import.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { discoverNextjsAppRouterCapabilities } from '../capabilities-writer'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), 'caps-test-'))
})

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true })
})

describe('discoverNextjsAppRouterCapabilities', () => {
  it('discovers GET and POST from a single route file', async () => {
    // Line 1-4: comments/padding so exports land on lines 5 and 14
    const routeContent = [
      '// line 1',
      '// line 2',
      '// line 3',
      '// line 4',
      'export async function GET(req: Request) { return new Response("ok") }', // line 5
      '// line 6',
      '// line 7',
      '// line 8',
      '// line 9',
      '// line 10',
      '// line 11',
      '// line 12',
      '// line 13',
      'export function POST(req: Request) { return new Response("created") }', // line 14
    ].join('\n')

    await mkdir(path.join(tmpDir, 'app', 'api', 'checkout'), { recursive: true })
    await writeFile(path.join(tmpDir, 'app', 'api', 'checkout', 'route.ts'), routeContent)

    const result = await discoverNextjsAppRouterCapabilities(tmpDir)

    expect(result.capabilities.length).toBe(2)

    const get = result.capabilities.find(c => c.method === 'GET')
    const post = result.capabilities.find(c => c.method === 'POST')

    expect(get).toBeDefined()
    expect(post).toBeDefined()

    expect(get!.path).toBe('/api/checkout')
    expect(post!.path).toBe('/api/checkout')

    expect(get!.source).toBe('ast')
    expect(post!.source).toBe('ast')

    expect(get!.confidence).toBe(1.0)
    expect(post!.confidence).toBe(1.0)

    expect(get!.handler).toContain(':5')
    expect(post!.handler).toContain(':14')

    expect(result.coverage_gaps).toEqual([])
  })

  it('returns coverage_gap when app/ folder does not exist', async () => {
    // tmpDir has no app/ subfolder
    const result = await discoverNextjsAppRouterCapabilities(tmpDir)

    expect(result.capabilities).toEqual([])
    expect(result.coverage_gaps.length).toBe(1)
    expect(result.coverage_gaps[0]).toContain('app/ folder not found or empty')
    expect(result.profile_at_generation).toBe('nextjs-app-router')
    expect(result.schema_version).toBe('1.0')
  })

  it('handles route.tsx files correctly', async () => {
    const routeContent = 'export function GET(req: Request) { return new Response("ok") }\n'

    await mkdir(path.join(tmpDir, 'app', 'dashboard'), { recursive: true })
    await writeFile(path.join(tmpDir, 'app', 'dashboard', 'route.tsx'), routeContent)

    const result = await discoverNextjsAppRouterCapabilities(tmpDir)

    expect(result.capabilities.length).toBe(1)
    expect(result.capabilities[0]?.path).toBe('/dashboard')
    expect(result.capabilities[0]?.handler).toContain('route.tsx:')
  })

  it('extracts line numbers correctly in handler field', async () => {
    // 21 comment lines, then DELETE on line 22
    const lines = Array.from({ length: 21 }, (_, i) => `// comment line ${i + 1}`)
    lines.push('export async function DELETE(req: Request) { return new Response(null, { status: 204 }) }')
    const routeContent = lines.join('\n')

    await mkdir(path.join(tmpDir, 'app', 'api', 'users'), { recursive: true })
    await writeFile(path.join(tmpDir, 'app', 'api', 'users', 'route.ts'), routeContent)

    const result = await discoverNextjsAppRouterCapabilities(tmpDir)

    expect(result.capabilities[0]?.handler).toBe('app/api/users/route.ts:22')
  })

  it('adds coverage_gap for route file with no HTTP method exports', async () => {
    const routeContent = [
      '// This file has no HTTP exports',
      'export const config = { runtime: "edge" }',
      'const helper = () => "helper"',
    ].join('\n')

    await mkdir(path.join(tmpDir, 'app', 'api', 'empty'), { recursive: true })
    await writeFile(path.join(tmpDir, 'app', 'api', 'empty', 'route.ts'), routeContent)

    const result = await discoverNextjsAppRouterCapabilities(tmpDir)

    expect(result.capabilities).toEqual([])
    expect(result.coverage_gaps[0]).toContain('no HTTP method exports found')
  })
})
