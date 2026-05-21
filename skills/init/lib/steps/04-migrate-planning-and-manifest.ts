// skills/init/lib/steps/04-migrate-planning-and-manifest.ts
// 2026-05-21 (Luiz/dev): Step 4 — migrate planning + escrever legacy-manifest.json
// Plano 02 fase-03 init-refactor-v7. PRD RF-02, DT-06, CA-03, CA-05.
// Substitui o stub criado no Plano 01 fase-04.
//
// DI-Plano02-fase03-migratePlanning-destino: migratePlanning() le de .planning.v5-backup/.planning/
// e escreve em docs/exec-plans/ e docs/product-specs/ (nao docs/specs/).
// Entry planning no manifest usa migratedTo: 'docs/exec-plans/ + docs/product-specs/'.
//
// DI-Plano02-fase03-no-abort-on-conflicts: fail-soft — manifest escrito mesmo com conflitos.
// Re-run bloqueado pelo Step 1 (reentry-gate).
//
// DI-Plano02-fase03-unmapped-artifacts: Artifacts sem mapping (claude-plans-dir, claude-tasks-dir,
// claude-manifest-v5, claude-manifest-v5-backup, etc) sao silenciosamente ignorados.
// Candidatos a cobertura em plano futuro.

import path from 'node:path'
import { promises as fs } from 'node:fs'
import type { Step, StepContext, StepReport } from './types'
import { migratePlanning } from '../migrate-planning'
import {
  LegacyManifestSchema,
  type LegacyManifest,
  type LegacyEntry,
  type ManifestStack,
} from '../../../_shared/legacy-manifest-schema'
import type { DetectedStack } from '../detect-stack'
import type { LegacyState } from '../detect-v5-legacy'

// 2026-05-21 (Luiz/dev): confidence simples — high se primary detectado; low se fallback (null).
// medium reservado para casos futuros (multi-stack conflito sem primario claro).
function deriveConfidence(stack: DetectedStack): ManifestStack['confidence'] {
  return stack.primary === null ? 'low' : 'high'
}

function toManifestStack(stack: DetectedStack): ManifestStack {
  return {
    primary: stack.primary,
    confidence: deriveConfidence(stack),
  }
}

// 2026-05-21 (Luiz/dev): mapeamento de artifacts LegacyArtifact → LegacyEntry.
// Artifacts nao mapeados sao ignorados (DI-Plano02-fase03-unmapped-artifacts).
function classifyArtifacts(legacy: LegacyState): LegacyEntry[] {
  const out: LegacyEntry[] = []

  for (const artifact of legacy.artifacts) {
    if (artifact === 'planning-dir') {
      // planning-dir: entry pre-populada aqui — migratePlanning() faz o move real
      out.push({
        type: 'planning',
        found: true,
        sourcePath: '.claude/planning/',
        action: 'moved',
        migratedTo: 'docs/exec-plans/ + docs/product-specs/',
      })
    } else if (artifact === 'lessons-learned') {
      out.push({
        type: 'lessons',
        found: true,
        sourcePath: 'lessons-learned.md',
        action: 'reference-only',
        note: 'Usar como contexto ao popular harness docs',
      })
    } else if (artifact === 'decisions') {
      out.push({
        type: 'decisions',
        found: true,
        sourcePath: 'decisions.md',
        action: 'reference-only',
        note: 'Usar como contexto ao popular harness docs',
      })
    } else if (artifact === 'claude-decisions') {
      out.push({
        type: 'decisions',
        found: true,
        sourcePath: '.claude/decisions.md',
        action: 'reference-only',
        note: 'Usar como contexto ao popular harness docs',
      })
    } else if (artifact === 'claude-knowledge-dir') {
      out.push({
        type: 'knowledge-legacy',
        found: true,
        sourcePath: '.claude/knowledge/',
        action: 'reference-only',
      })
    } else if (artifact === 'claude-rules-dir') {
      out.push({
        type: 'rules',
        found: true,
        sourcePath: '.claude/rules/',
        action: 'reference-only',
      })
    }
    // Outros artifacts (claude-plans-dir, claude-tasks-dir, claude-manifest-v5,
    // claude-manifest-v5-backup, senior-principles, etc): ignorados nesta versao.
  }

  return out
}

async function detectClaudeMd(cwd: string): Promise<LegacyEntry | null> {
  const p = path.join(cwd, '.claude', 'CLAUDE.md')
  try {
    const content = await fs.readFile(p, 'utf8')
    // G7 (CA-02): Step APENAS le CLAUDE.md para contar linhas. NUNCA escreve nele.
    const lines = content.split('\n').length
    return {
      type: 'claude-md',
      found: true,
      sourcePath: '.claude/CLAUDE.md',
      action: 'preserved',
      lines,
      note: 'Fonte primaria para popular AGENTS.md',
    }
  } catch {
    return null
  }
}

async function detectProgressTxt(cwd: string): Promise<LegacyEntry | null> {
  const p = path.join(cwd, '.claude', 'progress.txt')
  try {
    await fs.access(p)
    return {
      type: 'compound',
      found: true,
      sourcePath: '.claude/progress.txt',
      action: 'reference-only',
      note: 'Importar para docs/compound/ via execute-plan',
    }
  } catch {
    return null
  }
}

export const migratePlanningAndManifestStep: Step = {
  // DI-Plano02-fase03-id-sem-prefixo: id sem prefixo numerico para manter compatibilidade
  // com registry.test.ts. Spec Plano 02 indicava '04-migrate-planning-and-manifest' mas
  // o codigo real (stub, registry.ts, registry.test.ts) usa 'migrate-planning-and-manifest'.
  id: 'migrate-planning-and-manifest',

  async run(ctx: StepContext): Promise<StepReport> {
    // 2026-05-21 (Luiz/dev): DV-4 — legacy/stack garantidos pelo Step 2.
    // Guard obrigatorio; Plano 05 endurece o tipo para nao-opcional.
    const legacy = ctx.legacy
    const stack = ctx.stack
    if (!legacy || !stack) {
      throw new Error(
        '[Step 4] ctx.legacy ou ctx.stack ausente. Step 2 (detect-legacy-and-stack) deveria ter populado. Pipeline quebrado.',
      )
    }

    // 1) Classificar artifacts conhecidos em entries
    const entries: LegacyEntry[] = classifyArtifacts(legacy)

    // 2) Mover planning se artifact presente
    // DI-Plano02-fase03-migratePlanning-destino: migratePlanning le de .planning.v5-backup/.planning/
    if (legacy.artifacts.includes('planning-dir')) {
      await migratePlanning(ctx.cwd, { dryRun: false })
      // DI-Plano02-fase03-no-abort-on-conflicts: fail-soft — continua mesmo com conflicts.
    }

    // 3) Detectar CLAUDE.md e progress.txt (fora do array `artifacts`)
    const claudeMdEntry = await detectClaudeMd(ctx.cwd)
    if (claudeMdEntry) entries.push(claudeMdEntry)

    const progressEntry = await detectProgressTxt(ctx.cwd)
    if (progressEntry) entries.push(progressEntry)

    // 4) Montar manifest e validar com Zod (lanca ZodError em divergencia)
    const manifest: LegacyManifest = {
      schemaVersion: '1.0',
      detectedAt: new Date().toISOString(),
      stack: toManifestStack(stack),
      legacy: entries,
    }
    LegacyManifestSchema.parse(manifest)

    // 5) Escrever em .claude/legacy-manifest.json (G4: mkdir -p .claude/)
    const manifestPath = path.join(ctx.cwd, '.claude', 'legacy-manifest.json')
    await fs.mkdir(path.dirname(manifestPath), { recursive: true })
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')

    const summaryParts = [
      `legacy-manifest written (${String(entries.length)} entries)`,
      legacy.artifacts.includes('planning-dir') ? 'planning -> docs/exec-plans/ + docs/product-specs/' : null,
    ].filter((s): s is string => s !== null)

    return {
      mutated: true,
      summary: summaryParts.join('; '),
    }
  },
}
