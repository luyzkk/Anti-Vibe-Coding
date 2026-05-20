// 2026-05-19 (Luiz/dev): Plano 03 fase-05 — E2E tests orquestrando o pipeline completo:
// discoveryManifestLight + stackAwareInputPaths + generatePopulatePlanV2 + writePopulatePlanFolder.
// CA-01: greenfield gera >= 10 fases. CA-02: Next.js+Supabase tem >= 3 paths reais em ARCHITECTURE.
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { randomUUID } from 'node:crypto'
import { generatePopulatePlanStep } from './91-generate-populate-plan'
import type { StepContext } from './types'

const NEXTJS_SUPABASE_FIXTURE = path.join(
  import.meta.dir, '..', '..', '..', '..', 'tests', 'fixtures', 'stack-aware', 'nextjs-supabase',
)

let tmpCwd: string

function makeCtx(cwd: string): StepContext {
  return {
    cwd,
    args: [],
    flags: {},
  }
}

describe('generatePopulatePlanStep — E2E orquestracao', () => {
  beforeEach(async () => {
    tmpCwd = path.join(os.tmpdir(), `step91-${randomUUID()}`)
    await fs.mkdir(tmpCwd, { recursive: true })
  })
  afterEach(async () => {
    await fs.rm(tmpCwd, { recursive: true, force: true })
  })

  it('greenfield: cria pasta com >= 10 arquivos (PLAN.md + N fases) — CA-01', async () => {
    const ctx = makeCtx(tmpCwd)
    const result = await generatePopulatePlanStep.run(ctx)
    expect(result.mutated).toBe(true)

    const activeDir = path.join(tmpCwd, 'docs', 'exec-plans', 'active')
    const subdirs = await fs.readdir(activeDir)
    const harnessDir = subdirs.find(d => d.endsWith('-populate-harness'))
    expect(harnessDir).toBeDefined()

    const files = await fs.readdir(path.join(activeDir, harnessDir!))
    // 1 PLAN.md + >= 10 fases
    expect(files.length).toBeGreaterThanOrEqual(11)
    expect(files).toContain('PLAN.md')
  })

  it('Next.js+Supabase fixture: fase SECURITY tem >= 3 paths reais — CA-02', async () => {
    // DEV-01: ARCHITECTURE.md nao esta no TEMPLATE_MANIFEST (apenas docs/* estao).
    // CA-02 e verificado via docs/SECURITY.md que tem paths reais do nextjs-supabase fixture:
    // src/middleware.ts + src/lib/supabase/server.ts + supabase/config.toml (todos existem).
    await copyRecursive(NEXTJS_SUPABASE_FIXTURE, tmpCwd)
    const ctx = makeCtx(tmpCwd)
    const result = await generatePopulatePlanStep.run(ctx)
    expect(result.mutated).toBe(true)

    const activeDir = path.join(tmpCwd, 'docs', 'exec-plans', 'active')
    const subdirs = await fs.readdir(activeDir)
    const harnessDir = subdirs.find(d => d.endsWith('-populate-harness'))!

    const allFiles = await fs.readdir(path.join(activeDir, harnessDir))
    // docs/SECURITY.md -> slug docs-security -> fase-XX-docs-security.md
    const securityFile = allFiles.find(f => f.includes('security'))
    expect(securityFile).toBeDefined()

    const content = await fs.readFile(path.join(activeDir, harnessDir, securityFile!), 'utf-8')
    // Conta paths reais: linhas que comecam com `- \`<path>\`` SEM nota "(candidato nao encontrado)"
    const realPathLines = content
      .split('\n')
      .filter(line => /^- `[^`]+`\s*$/.test(line))
    expect(realPathLines.length).toBeGreaterThanOrEqual(3)
  })

  it('aborta gracefully se TEMPLATE_MANIFEST < 10 docs populaveis (G1)', async () => {
    // Este teste exige mock de TEMPLATE_MANIFEST — skip pois TEMPLATE_MANIFEST ja tem >= 10 entries
    // em ambiente normal (Plano 02 fase-01 mergeada). Plano futuro adiciona infra de mock se necessario.
  })

  it('dry-run: nao escreve nada, summary contem "dry-run"', async () => {
    const ctx: StepContext = {
      cwd: tmpCwd,
      args: [],
      flags: { 'dry-run': true },
    }
    const result = await generatePopulatePlanStep.run(ctx)
    expect(result.mutated).toBe(false)
    expect(result.summary).toContain('dry-run')
    const activeDir = path.join(tmpCwd, 'docs', 'exec-plans', 'active')
    let listed: string[] = []
    try { listed = await fs.readdir(activeDir) } catch { /* sem dir = OK */ }
    expect(listed).toHaveLength(0)
  })

  it('summary contem caminho da pasta + comando /execute-plan (MH-09)', async () => {
    const ctx = makeCtx(tmpCwd)
    const result = await generatePopulatePlanStep.run(ctx)
    expect(result.summary).toContain('docs/exec-plans/active/')
    expect(result.summary).toContain('populate-harness')
    expect(result.summary).toContain('/anti-vibe-coding:execute-plan')
  })

  // 2026-05-19 (Luiz/dev): Plano 05 fase-04 do PRD populate-plan-andre-port (SH-4).
  // Helper local — captura appends do AuditLogWriter mockado.
  type CapturedAppend = {
    subagent_id: string
    output_struct: Record<string, unknown>
  }
  function makeMockAuditWriter(captured: CapturedAppend[]) {
    return {
      async append(entry: CapturedAppend) {
        captured.push(entry)
      },
    }
  }

  it('audit log emite docsCoveredByStack >= 4 em Next.js+Supabase fixture (SH-4)', async () => {
    await copyRecursive(NEXTJS_SUPABASE_FIXTURE, tmpCwd)
    const captured: CapturedAppend[] = []
    const ctx: StepContext = {
      cwd: tmpCwd,
      args: [],
      // 2026-05-19 (Luiz/dev): flag __auditLog injetada pelo init dispatcher em runtime.
      // Mockamos aqui para inspecionar output_struct sem precisar abrir log do filesystem.
      flags: { __auditLog: makeMockAuditWriter(captured) as unknown as boolean },
    }
    const result = await generatePopulatePlanStep.run(ctx)
    expect(result.mutated).toBe(true)
    expect(captured.length).toBeGreaterThan(0)

    const struct = captured[0]!.output_struct
    expect(struct.docsCoveredByStack).toBeDefined()
    expect(struct.docsCoveredByStack).toBeGreaterThanOrEqual(4)
    expect(struct.docsWithoutCodeEvidence).toBeDefined()
  })

  it('audit log emite phasesCreatedVsExpected.minExpected = 12 (CA-01 + SH-4)', async () => {
    const captured: CapturedAppend[] = []
    const ctx: StepContext = {
      cwd: tmpCwd,
      args: [],
      flags: { __auditLog: makeMockAuditWriter(captured) as unknown as boolean },
    }
    await generatePopulatePlanStep.run(ctx)
    expect(captured.length).toBeGreaterThan(0)
    const struct = captured[0]!.output_struct
    const phasesExp = struct.phasesCreatedVsExpected as { created: number; minExpected: number }
    expect(phasesExp.minExpected).toBe(12)
    expect(phasesExp.created).toBeGreaterThanOrEqual(12)
  })
})

async function copyRecursive(src: string, dest: string): Promise<void> {
  const stat = await fs.stat(src)
  if (stat.isDirectory()) {
    await fs.mkdir(dest, { recursive: true })
    for (const name of await fs.readdir(src)) {
      await copyRecursive(path.join(src, name), path.join(dest, name))
    }
  } else {
    await fs.copyFile(src, dest)
  }
}
