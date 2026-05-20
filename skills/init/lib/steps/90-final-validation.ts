// skills/init/lib/steps/90-final-validation.ts
// 2026-05-19 (Luiz/dev): reescrito — allowlist mode (Plano 04 fase-03).
// Substitui spawn de harness-validate por walk em docs/ + allowlist derivada de TEMPLATE_MANIFEST.
// Modo warning: nao lanca AbortError. Fase-04: try/catch defensivo para IO errors (CA-07 convergencia).
// 2026-05-20 (Luiz/dev): D8.C do PRD knowledge-path-cutover — 2 checks pos-init adicionados.
// Check primario (bloqueante): stack detectada sem .claude/knowledge/{stack}/INDEX.md → AbortError.
// Check secundario (warning nao-bloqueante): docs/knowledge/ orfao → console.warn sunset v7.0.0.
// AR-05: este e o Step 90 runtime validator. harness-validate.ts ja foi atualizado no Plano 01 fase-06.
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { isDryRun } from '../dry-run-mode'
import { buildAllowlistFromTemplateManifest, isAllowed, groupWarnings } from '../validator-allowlist'
import { AbortError } from './abort-error'
import type { Step } from './types'

/**
 * Executa os 2 checks de knowledge pos-init.
 * Exportada para teste unitario isolado (sem precisar do Step wrapper completo).
 * Lanca AbortError apenas no check primario (code: 1).
 * Check secundario usa console.warn (nao-bloqueante).
 *
 * 2026-05-20 (Luiz/dev): D8.C do PRD knowledge-path-cutover — CA-11 + CA-12.
 * Quebra a invariante "Step 90 nunca aborta" PROPOSITALMENTE para o caso especifico
 * de stack detectada sem matrix — conforme G5 do README.md do plano.
 */
export async function runFinalValidationChecks(cwd: string): Promise<void> {
  // --- Check primario (bloqueante) — CA-11 ---
  // Le .claude/stack.json para saber qual stack foi detectada.
  // Ausencia de stack.json = stack nao detectada = nao e erro (CA-06/primary=null).
  const stackJsonPath = path.join(cwd, '.claude', 'stack.json')
  const stackJsonExists = await fs.access(stackJsonPath).then(() => true).catch(() => false)

  if (stackJsonExists) {
    let primary: string | null = null
    try {
      const raw = await fs.readFile(stackJsonPath, 'utf-8')
      const parsed: unknown = JSON.parse(raw)
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        'primary' in parsed &&
        typeof (parsed as Record<string, unknown>)['primary'] === 'string'
      ) {
        primary = (parsed as Record<string, unknown>)['primary'] as string
      }
    } catch {
      // JSON malformado — skip check primario (degrade gracefully)
      primary = null
    }

    if (primary !== null) {
      const indexPath = path.join(cwd, '.claude', 'knowledge', primary, 'INDEX.md')
      const indexExists = await fs.access(indexPath).then(() => true).catch(() => false)
      if (!indexExists) {
        throw new AbortError({
          code: 1,
          reason:
            `Stack detectada (${primary}) mas .claude/knowledge/${primary}/INDEX.md ausente. ` +
            `Re-rode /anti-vibe-coding:init ou verifique a matrix no plugin.`,
        })
      }
    }
  }

  // --- Check secundario (warning nao-bloqueante) — CA-12 ---
  // 2026-05-20 (Luiz/dev): D8.C — sunset previsto v7.0.0. Remover este check no bump major.
  const orphanPath = path.join(cwd, 'docs', 'knowledge')
  const orphanExists = await fs.access(orphanPath).then(() => true).catch(() => false)
  if (orphanExists) {
    // eslint-disable-next-line no-console
    console.warn(
      'WARN: docs/knowledge/ orfao detectado. ' +
        'Re-rode /anti-vibe-coding:init para migrar para .claude/knowledge/. ' +
        'Aviso sera removido em v7.0.0.',
    )
  }
}

async function walkDocs(rootCwd: string): Promise<string[]> {
  const out: string[] = []
  async function walk(absDir: string): Promise<void> {
    let entries: import('node:fs').Dirent[]
    try {
      entries = await fs.readdir(absDir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      const absPath = path.join(absDir, e.name)
      // Normalize para forward-slash (Windows path.relative usa backslash)
      const rel = path.relative(rootCwd, absPath).split(path.sep).join('/')
      // G6: pular backup pre-6.5.0
      if (rel.startsWith('docs/_legacy')) continue
      if (e.isDirectory()) {
        await walk(absPath)
      } else if (e.isFile() && rel.endsWith('.md')) {
        out.push(rel)
      }
    }
  }
  await walk(path.join(rootCwd, 'docs'))
  return out
}

/**
 * Step 90 — validacao final via allowlist (PRD MH-08, CA-06).
 * Emite warnings agrupados; nao aborta init.
 * EXCECAO: check primario de knowledge lanca AbortError (D8.C do PRD knowledge-path-cutover).
 */
export const finalValidationStep: Step = {
  id: 'final-validation',
  async run(ctx) {
    if (isDryRun(ctx)) {
      return { mutated: false, summary: 'dry-run: validator skipped (would check allowlist)' }
    }

    // 2026-05-20 (Luiz/dev): D8.C do PRD knowledge-path-cutover — checks de knowledge pos-init.
    // Primario: bloqueante (AbortError se stack detectada sem INDEX.md).
    // Secundario: warning nao-bloqueante (docs/knowledge/ orfao).
    // AbortError do check primario NAO e capturado pelo try/catch abaixo — propaga corretamente.
    await runFinalValidationChecks(ctx.cwd)

    try {
      const allowlist = buildAllowlistFromTemplateManifest()
      const docs = await walkDocs(ctx.cwd)
      const unallowed = docs.filter((p) => !isAllowed(p, allowlist))

      if (unallowed.length === 0) {
        return { mutated: false, summary: 'validator: 0 warnings — scaffold canonico intacto' }
      }

      const grouped = groupWarnings(unallowed)
      const summary = `validator: ${grouped.length} warnings (${unallowed.length} paths fora do scaffold canonico)`
      return { mutated: false, summary }
    } catch (e) {
      // 2026-05-19 (Luiz/dev): Plano 04 fase-04 — degrade gracefully para IO errors.
      // Final-validation NUNCA aborta por IO — Step 91 (ja rodado antes) preserva seus artefatos.
      // PRD MH-08 modo warning + CA-07 convergencia.
      // AbortError do check primario acima nao chega aqui (lancado antes do try).
      if (e instanceof AbortError) throw e
      const reason = e instanceof Error ? e.message : String(e)
      return { mutated: false, summary: `validator: skipped due to IO error (${reason})` }
    }
  },
}
