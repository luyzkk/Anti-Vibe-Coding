// skills/init/lib/steps/04-migrate-planning-and-manifest.test.ts
// 2026-05-21 (Luiz/dev): Step 4 — migrate-planning + manifest writer (Plano 02 fase-03 init-refactor-v7).
// Cobertura: CA-03 (planning moved), CA-05 (greenfield), D6 (manifest em disco),
// D7 (progress.txt vira compound entry), D8 (lessons/decisions reference-only), CA-02 (CLAUDE.md preserved).
//
// DI-Plano02-fase03-id-sem-prefixo: id do step e 'migrate-planning-and-manifest' (sem prefixo '04-')
// para manter compatibilidade com registry.test.ts (linha 18). Spec do Plano 02 indicava
// '04-migrate-planning-and-manifest' mas o codigo real usa o id sem prefixo numerico.
//
// DI-Plano02-fase03-migratePlanning-destino: migratePlanning() le de .planning.v5-backup/.planning/
// (nao de .claude/planning/) e escreve em docs/exec-plans/ e docs/product-specs/ (nao docs/specs/).
// Teste CA-03 cria o backup no lugar correto e verifica docs/exec-plans/.
import { expect, test, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { migratePlanningAndManifestStep } from './04-migrate-planning-and-manifest'
import { parseLegacyManifest } from '../../../_shared/legacy-manifest-schema'
import type { StepContext } from './types'
import type { DetectedStack } from '../detect-stack'
import { BACKUP_DIR } from '../backup-planning'

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'init-step4-'))
}

const STACK_NODE: DetectedStack = {
  primary: 'node-ts',
  secondary: [],
  signalSource: 'package.json#devDependencies.typescript',
  anchorFiles: ['package.json'],
}

function makeCtx(cwd: string, overrides: Partial<StepContext> = {}): StepContext {
  return {
    cwd,
    args: [],
    flags: {},
    // 2026-05-21 (Luiz/dev): DV-4 — legacy/stack opcionais no tipo, mas garantidos pelo Step 2
    // no pipeline real. Testes populam diretamente.
    stack: STACK_NODE,
    legacy: { isLegacy: false, alreadyMigrated: false, artifacts: [], paths: {} },
    ...overrides,
  } as StepContext
}

async function readManifest(cwd: string) {
  const raw = await fs.readFile(path.join(cwd, '.claude', 'legacy-manifest.json'), 'utf8')
  return parseLegacyManifest(JSON.parse(raw))
}

describe('migratePlanningAndManifestStep (Step 4 real)', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('id contratual estavel = migrate-planning-and-manifest', () => {
    expect(migratePlanningAndManifestStep.id).toBe('migrate-planning-and-manifest')
  })

  test('CA-05: greenfield (sem legacy) escreve manifest com legacy: []', async () => {
    const report = await migratePlanningAndManifestStep.run(makeCtx(tmp))
    expect(report.mutated).toBe(true)

    const manifest = await readManifest(tmp)
    expect(manifest.schemaVersion).toBe('1.0')
    expect(manifest.stack.primary).toBe('node-ts')
    expect(manifest.legacy).toHaveLength(0)
  })

  test('CA-03: .planning.v5-backup/.planning presente -> moved + entry planning no manifest', async () => {
    // Setup: criar backup de planning com 1 arquivo CONTEXT (que migratePlanning suporta)
    // DI-Plano02-fase03-migratePlanning-destino: migratePlanning le de BACKUP_DIR/.planning/
    const backupPlanningDir = path.join(tmp, BACKUP_DIR, '.planning')
    await fs.mkdir(backupPlanningDir, { recursive: true })
    await fs.writeFile(path.join(backupPlanningDir, 'CONTEXT-foo.md'), '# context foo')

    const ctx = makeCtx(tmp, {
      legacy: {
        isLegacy: true,
        alreadyMigrated: false,
        artifacts: ['planning-dir'],
        paths: { 'planning-dir': path.join(tmp, '.planning') },
      },
    })
    const report = await migratePlanningAndManifestStep.run(ctx)
    expect(report.mutated).toBe(true)

    // docs/exec-plans/active/ existe (destino real de CONTEXT-foo.md)
    const execPlansExists = await fs.access(path.join(tmp, 'docs', 'exec-plans', 'active')).then(() => true).catch(() => false)
    expect(execPlansExists).toBe(true)

    // manifest tem entry planning moved
    const manifest = await readManifest(tmp)
    const planningEntry = manifest.legacy.find((e) => e.type === 'planning')
    expect(planningEntry).toBeDefined()
    expect(planningEntry?.action).toBe('moved')
    expect(planningEntry?.migratedTo).toBe('docs/exec-plans/ + docs/product-specs/')
  })

  test('CA-02: .claude/CLAUDE.md presente -> preserved + lines count no manifest', async () => {
    const claudeMdContent = Array.from({ length: 42 }, (_, i) => `linha ${String(i + 1)}`).join('\n')
    await fs.mkdir(path.join(tmp, '.claude'), { recursive: true })
    await fs.writeFile(path.join(tmp, '.claude', 'CLAUDE.md'), claudeMdContent)

    const ctx = makeCtx(tmp, {
      legacy: {
        isLegacy: true,
        alreadyMigrated: false,
        artifacts: [],
        paths: {},
      },
    })
    const report = await migratePlanningAndManifestStep.run(ctx)
    expect(report.mutated).toBe(true)

    // CLAUDE.md NAO foi modificado (byte-identico)
    const after = await fs.readFile(path.join(tmp, '.claude', 'CLAUDE.md'), 'utf8')
    expect(after).toBe(claudeMdContent)

    // manifest tem entry claude-md preserved + lines: 42
    const manifest = await readManifest(tmp)
    const claudeMdEntry = manifest.legacy.find((e) => e.type === 'claude-md')
    expect(claudeMdEntry?.action).toBe('preserved')
    expect(claudeMdEntry?.lines).toBe(42)
  })

  test('D7: .claude/progress.txt presente -> entry type compound reference-only', async () => {
    await fs.mkdir(path.join(tmp, '.claude'), { recursive: true })
    await fs.writeFile(path.join(tmp, '.claude', 'progress.txt'), 'gotcha 1\ngotcha 2')

    const ctx = makeCtx(tmp, {
      legacy: { isLegacy: true, alreadyMigrated: false, artifacts: [], paths: {} },
    })
    await migratePlanningAndManifestStep.run(ctx)

    // arquivo NAO importado (escopo D7) — apenas referenciado
    const stillThere = await fs.access(path.join(tmp, '.claude', 'progress.txt')).then(() => true).catch(() => false)
    expect(stillThere).toBe(true)

    const manifest = await readManifest(tmp)
    const compoundEntry = manifest.legacy.find((e) => e.type === 'compound')
    expect(compoundEntry?.action).toBe('reference-only')
    expect(compoundEntry?.sourcePath).toBe('.claude/progress.txt')
  })

  test('D8: lessons-learned.md (raiz) -> entry type lessons reference-only', async () => {
    await fs.writeFile(path.join(tmp, 'lessons-learned.md'), '# lessons')

    const ctx = makeCtx(tmp, {
      legacy: {
        isLegacy: true,
        alreadyMigrated: false,
        artifacts: ['lessons-learned'],
        paths: { 'lessons-learned': path.join(tmp, 'lessons-learned.md') },
      },
    })
    await migratePlanningAndManifestStep.run(ctx)

    // arquivo NAO movido (escopo D8) — execute-plan usa como contexto
    const stillThere = await fs.access(path.join(tmp, 'lessons-learned.md')).then(() => true).catch(() => false)
    expect(stillThere).toBe(true)

    const manifest = await readManifest(tmp)
    const lessonsEntry = manifest.legacy.find((e) => e.type === 'lessons')
    expect(lessonsEntry?.action).toBe('reference-only')
    expect(lessonsEntry?.sourcePath).toBe('lessons-learned.md')
  })
})
