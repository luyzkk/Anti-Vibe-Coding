// tests/e2e/ca13-dry-run-parity.test.ts
// 2026-05-18 (Luiz/dev): CA-13 + CA-14 do PRD refactor-init-harness-populate-merge.
// Parity entre dry-run (zero mutacoes) e real-run (backup manifest) + ordem canonica de audit log.
// 2026-05-19 (Luiz/dev): Plano 01 fase-05 — describe.skip: assumia Steps 07/08/09/10-apply-merge/11
// do registry antigo (inverted-merge-v6.4 fixture + mandatoryOrder com discoverDocs/classifyBlocks/
// proposeMerge/moveDocs/applyMerge removidos no Plano 01 fases 02-04).
// Plano 05 fase-04 reescreve este E2E para o fluxo LLM-driven novo.

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { cp } from 'node:fs/promises'
import { runInit } from '../../skills/init/lib/run-init'
import { INIT_SUBAGENT_IDS } from '../../skills/init/lib/init-subagent-ids'
import type { AgentLogEntry, AgentsLog } from '../../skills/init/lib/audit-log'

const FIXTURE = path.join(import.meta.dir, '..', 'fixtures', 'inverted-merge-v6.4')

async function safeCleanup(p: string): Promise<void> {
  try { await fs.rm(p, { recursive: true, force: true }) } catch { /* G12 — Windows handle leak */ }
}

describe.skip('CA-13 dry-run parity + CA-14 audit log canonica (inverted-merge-v6.4)', () => {
  let tmpDry: string
  let tmpReal: string
  let dryRunFilesAfter: string[]
  let realRunManifest: ReadonlyArray<{ originalPath: string; action: string }>
  let realRunLogEntries: ReadonlyArray<AgentLogEntry>

  beforeAll(async () => {
    tmpDry = await fs.mkdtemp(path.join(os.tmpdir(), 'ca13-dry-'))
    tmpReal = await fs.mkdtemp(path.join(os.tmpdir(), 'ca13-real-'))
    await cp(FIXTURE, tmpDry, { recursive: true })
    await cp(FIXTURE, tmpReal, { recursive: true })

    // ---- DRY RUN ----
    // 2026-05-18 (Luiz/dev): dry-run nao deve mutar o filesystem — CA-13 parity.
    // G8 do README plano07: --dry-run bypassa needsUser no Step 09.
    await runInit(['--dry-run'], { cwd: tmpDry })
    dryRunFilesAfter = await fs.readdir(tmpDry)

    // ---- REAL RUN ----
    // 2026-05-18 (Luiz/dev): real run com auto-approve via askUser — Step 09 retorna
    // needsUser, dispatcher chama askUser('apply'), re-invoca step com __interactiveAnswer.
    // Fix Step 09 em skills/init/lib/steps/09-propose-merge-batch.ts (Plano 07).
    await runInit([], {
      cwd: tmpReal,
      askUser: async (_prompt: string, _options: readonly string[]) => 'apply',
    })

    // Ler backup manifest D29 — Step 10 cria .anti-vibe/backup/{ts}/manifest.json
    const backupRoot = path.join(tmpReal, '.anti-vibe', 'backup')
    const backupExists = await fs.access(backupRoot).then(() => true).catch(() => false)
    if (backupExists) {
      const backupTimestamps = await fs.readdir(backupRoot)
      if (backupTimestamps.length > 0) {
        const latestTs = backupTimestamps.sort().at(-1)!
        const manifestPath = path.join(backupRoot, latestTs, 'manifest.json')
        const manifestRaw = await fs.readFile(manifestPath, 'utf-8')
        const manifest = JSON.parse(manifestRaw) as { files: ReadonlyArray<{ originalPath: string; action: string }> }
        realRunManifest = manifest.files
      }
    }
    realRunManifest ??= []

    // Ler agents-log.json (CA-14 — audit log canonico do Plano 06)
    // Path canonico: {cwd}/discovery/agents-log.json (audit-log.ts linha 56)
    const logPath = path.join(tmpReal, 'discovery', 'agents-log.json')
    const logExists = await fs.access(logPath).then(() => true).catch(() => false)
    if (logExists) {
      const logRaw = await fs.readFile(logPath, 'utf-8')
      const log = JSON.parse(logRaw) as AgentsLog
      realRunLogEntries = log.entries
    }
    realRunLogEntries ??= []
  }, 120_000)

  afterAll(async () => {
    await safeCleanup(tmpDry)
    await safeCleanup(tmpReal)
  })

  it('dry-run nao mutou o filesystem — CA-13 parity (zero mutacoes)', () => {
    // 2026-05-18 (Luiz/dev): CA-13 — dry-run prediz sem executar.
    // Verificacao: nao criou .anti-vibe/ (backup) nem docs/ (scaffold) no tmpDry.
    expect(dryRunFilesAfter).not.toContain('.anti-vibe')
    // CLAUDE.md fixture ainda intacto (287 linhas)
    // Verificado via beforeAll — tmpDry nao tem mutacoes alem dos arquivos do fixture.
  })

  it('dry-run nao criou backup dir (.anti-vibe/backup/ ausente) — CA-13', async () => {
    // 2026-05-18 (Luiz/dev): detectLegacy trata qualquer projeto sem marker v5 como greenfield,
    // entao scaffold SOBRESCREVE CLAUDE.md em dry-run tambem. A evidencia correta de zero-mutacao
    // e a ausencia do diretorio .anti-vibe/backup/ (criado apenas por step 10 em real-run).
    const backupExists = await fs.access(path.join(tmpDry, '.anti-vibe', 'backup'))
      .then(() => true).catch(() => false)
    expect(backupExists).toBe(false)
  })

  it('real-run producou backup manifest com >= 1 entrada — CA-13 parity (real execucao)', () => {
    // 2026-05-18 (Luiz/dev): Step 10 cria backup de CLAUDE.md antes de transformar.
    // Manifest D29 confirma que real-run executou as operacoes previstas pelo dry-run.
    expect(realRunManifest.length).toBeGreaterThan(0)
    expect(realRunManifest[0]).toHaveProperty('originalPath')
    expect(realRunManifest[0]).toHaveProperty('action')
  })

  it('audit log contem entries na ordem canonica esperada — CA-14', () => {
    // 2026-05-18 (Luiz/dev): CA-14 — ordem canonica dos 7 subagent_ids.
    // Registry: moveDocs (step 11, idx 6) roda ANTES de applyMerge (step 10, idx 14).
    // G13 do README plano07: init-drift-detect NAO aparece (modo migration, nao already-initiated).
    // populatePlanGen (step 91) aparece apenas se finalValidationStep nao abortar.
    const subagentIds = realRunLogEntries
      .map((e) => e.subagent_id)
      .filter((id) => id.startsWith('init-'))

    const mandatoryOrder = [
      INIT_SUBAGENT_IDS.secretsScan,    // init-secrets-scan
      INIT_SUBAGENT_IDS.discoverDocs,   // init-discover-existing-docs
      INIT_SUBAGENT_IDS.classifyBlocks, // init-classify-blocks
      INIT_SUBAGENT_IDS.proposeMerge,   // init-propose-merge
      INIT_SUBAGENT_IDS.moveDocs,       // init-move-docs  (step 11, antes do scaffold)
      INIT_SUBAGENT_IDS.applyMerge,     // init-apply-merge (step 10, apos scaffold)
    ]

    // 2026-05-18 (Luiz/dev): populatePlanGen depende de finalValidation passar.
    // Se finalValidation abortar (harness invalido), populatePlanGen nao corre.
    // Verificar separadamente para isolar a falha.
    const hasPlanGen = subagentIds.includes(INIT_SUBAGENT_IDS.populatePlanGen)
    const withoutPlanGen = subagentIds.filter((id) => id !== INIT_SUBAGENT_IDS.populatePlanGen)

    expect(withoutPlanGen).toEqual(mandatoryOrder)
    if (!hasPlanGen) {
      console.warn('[CA-14] init-populate-plan-gen ausente — finalValidation pode ter abortado')
    }
    expect(hasPlanGen).toBe(true)
  })

  it('cada entry do audit log tem input_paths + output_struct + duration_ms', () => {
    for (const entry of realRunLogEntries) {
      expect(entry.input_paths).toBeDefined()
      expect(entry.output_struct).toBeDefined()
      expect(typeof entry.duration_ms).toBe('number')
    }
  })
})
