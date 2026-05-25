// 2026-05-25 (Luiz/dev): CA-06 do PRD next-stack — atom supabase-integration deve ser
// copiado quando hasSupabaseSignal() bate. Fixture com pasta supabase/ + @supabase/ssr em deps.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import path from 'node:path'

import { detectStack } from '../../skills/init/lib/detect-stack'
import { detectMultiStack } from '../../skills/init/lib/detect-multi-stack'
import { writeStackJson } from '../../skills/init/lib/write-stack-json'
import { copyKnowledge } from '../../skills/init/lib/copy-knowledge'

const PLUGIN_ROOT = join(import.meta.dir, '..', '..')
const FIXTURE_DIR = join(PLUGIN_ROOT, 'tests', 'fixtures', 'nextjs-supabase-fixture')

async function cloneFixture(): Promise<string> {
  const dest = await fs.mkdtemp(path.join(tmpdir(), 'e2e-supabase-'))
  await fs.cp(FIXTURE_DIR, dest, { recursive: true })
  return dest
}

async function runPipeline(targetDir: string): Promise<{ elapsedMs: number }> {
  const start = performance.now()
  const detection = await detectMultiStack(targetDir)
  await writeStackJson(targetDir, detection)
  await copyKnowledge({
    targetDir,
    pluginRoot: PLUGIN_ROOT,
    primary: detection.primary,
    refresh: false,
  })
  return { elapsedMs: performance.now() - start }
}

describe('init Next.js + Supabase (CA-06)', () => {
  let project: string

  beforeEach(async () => {
    project = await cloneFixture()
  })

  afterEach(() => {
    fs.rm(project, { recursive: true, force: true }).catch(() => { /* best-effort */ })
  })

  it('detectStack returns primary nextjs for supabase fixture', async () => {
    const result = await detectStack(project)
    expect(result.primary).toBe('nextjs')
  })

  it('copies supabase-integration.md to .claude/knowledge/atoms/', async () => {
    await runPipeline(project)
    const atomPath = join(project, '.claude', 'knowledge', 'atoms', 'supabase-integration.md')
    expect(existsSync(atomPath)).toBe(true)
  })

  it('supabase-integration.md has tier: 3 and expected triggers', async () => {
    await runPipeline(project)
    const atomPath = join(project, '.claude', 'knowledge', 'atoms', 'supabase-integration.md')
    const content = await fs.readFile(atomPath, 'utf8')
    expect(content).toMatch(/tier:\s*3/)
    expect(content).toMatch(/supabase/)
    expect(content).toMatch(/RLS/)
    expect(content).toMatch(/SSR/)
  })
})
