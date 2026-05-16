// 2026-05-16 (Luiz/dev): RED→GREEN para RF-MH-01 (CA-01 + CA-02 do PRD v6.3.1)
import { describe, expect, test, afterEach } from 'bun:test'
import { discoverNextjsAppRouterCapabilities } from '../skills/lib/capabilities-writer'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const FIXTURES_ROOT = path.join(import.meta.dir, 'fixtures', 'ast-route-fixtures')

const tmpDirs: string[] = []

async function setupRoute(fixturesRoot: string, fixtureName: string, routeSlug: string): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-ast-'))
  tmpDirs.push(root)
  const routeDir = path.join(root, 'app', 'api', routeSlug)
  await fs.mkdir(routeDir, { recursive: true })
  await fs.copyFile(path.join(fixturesRoot, fixtureName), path.join(routeDir, 'route.ts'))
  return root
}

afterEach(async () => {
  await Promise.all(tmpDirs.splice(0).map(d => fs.rm(d, { recursive: true, force: true })))
})

describe('AST extraction in capabilities-writer', () => {
  test('detects export function GET as source ast', async () => {
    const root = await setupRoute(FIXTURES_ROOT, 'route-fn-declaration.ts', 'foo')
    const out = await discoverNextjsAppRouterCapabilities(root)
    expect(out.capabilities.length).toBe(1)
    expect(out.capabilities[0]?.method).toBe('GET')
    expect(out.capabilities[0]?.source).toBe('ast')
    expect(out.capabilities[0]?.confidence).toBe(1.0)
    expect(out.capabilities[0]?.handler).toMatch(/route\.ts:\d+$/)
  })

  test('detects export async function POST as source ast', async () => {
    const root = await setupRoute(FIXTURES_ROOT, 'route-async-fn.ts', 'bar')
    const out = await discoverNextjsAppRouterCapabilities(root)
    expect(out.capabilities[0]?.method).toBe('POST')
    expect(out.capabilities[0]?.source).toBe('ast')
  })

  test('detects export const PUT arrow assignment as source ast (regression positive)', async () => {
    // 2026-05-16 (Luiz/dev): caso que regex original em capabilities-writer.ts:44 missava
    const root = await setupRoute(FIXTURES_ROOT, 'route-arrow-const.ts', 'baz')
    const out = await discoverNextjsAppRouterCapabilities(root)
    expect(out.capabilities[0]?.method).toBe('PUT')
    expect(out.capabilities[0]?.source).toBe('ast')
  })
})
