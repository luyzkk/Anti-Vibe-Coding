// 2026-05-16 (Luiz/dev): RNF performance — AST traversal de 50 route.ts < 500ms
// test.skip por padrão para não bloquear CI. Rodar manualmente: bun test tests/perf/capabilities-writer.bench.ts
import { describe, test, expect } from 'bun:test'
import { discoverNextjsAppRouterCapabilities } from '../../skills/lib/capabilities-writer'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const FIXTURE_CONTENT = `export async function GET() {
  return new Response('ok')
}
`

async function generate50Routes(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-bench-'))
  for (let i = 0; i < 50; i++) {
    const dir = path.join(root, 'app', 'api', `route-${i}`)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'route.ts'), FIXTURE_CONTENT, 'utf-8')
  }
  return root
}

describe('capabilities-writer performance', () => {
  // DI-3: test.skip — benchmark não deve bloquear CI (slow on cold runs). Rodar manualmente.
  test.skip('AST traversal of 50 route.ts under 500ms', async () => {
    const root = await generate50Routes()
    const start = performance.now()
    const out = await discoverNextjsAppRouterCapabilities(root)
    const elapsed = performance.now() - start
    await fs.rm(root, { recursive: true, force: true })
    expect(out.capabilities.length).toBe(50)
    expect(elapsed).toBeLessThan(500)
  })
})
