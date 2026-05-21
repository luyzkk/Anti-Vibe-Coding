// skills/init/lib/steps/10-final-validation.ts
// 2026-05-21 (Luiz/dev): Plano 05 fase-03 — port de 90-final-validation.ts sem dry-run guard (D4).
// Preserva D8.C BYTE-IDENTICO: check primario (AbortError code=1) + check secundario (warn nao-bloqueante).
// UNICA excecao ao "Step 10 modo warning" — D8.C do PRD knowledge-path-cutover.
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { buildAllowlistFromTemplateManifest, isAllowed, groupWarnings } from '../validator-allowlist'
import { AbortError } from './abort-error'
import type { Step } from './types'

/**
 * Executa os 2 checks de knowledge pos-init.
 * Exportada para teste unitario isolado (G5 do README — D8.C contrato).
 * Mesma assinatura do antigo 90-final-validation.ts.
 * Lanca AbortError apenas no check primario (code: 1).
 * Check secundario usa console.warn (nao-bloqueante).
 *
 * 2026-05-21 (Luiz/dev): D8.C do PRD knowledge-path-cutover — CA-11 + CA-12.
 */
export async function runFinalValidationChecks(cwd: string): Promise<void> {
  // --- Check primario (bloqueante) — CA-11 ---
  // Le .claude/stack.json para saber qual stack foi detectada.
  // Ausencia de stack.json = stack nao detectada = nao e erro (primary=null).
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
      // 2026-05-21 (Luiz/dev): copyKnowledge copia conteudo de knowledge/{stack}/ diretamente
      // para .claude/knowledge/ — INDEX.md fica em .claude/knowledge/INDEX.md, sem subdiretorio.
      // Consistente com run-stack-knowledge-init.ts linha 103 (leitura do preview).
      const indexPath = path.join(cwd, '.claude', 'knowledge', 'INDEX.md')
      const indexExists = await fs.access(indexPath).then(() => true).catch(() => false)
      if (!indexExists) {
        throw new AbortError({
          code: 1,
          reason:
            `Stack detectada (${primary}) mas .claude/knowledge/INDEX.md ausente. ` +
            `Re-rode /anti-vibe-coding:init ou verifique a matrix no plugin.`,
        })
      }
    }
  }

  // --- Check secundario (warning nao-bloqueante) — CA-12 ---
  // 2026-05-21 (Luiz/dev): D8.C — sunset previsto v7.0.0. Remover este check no bump major.
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

/**
 * Walk em docs/ excluindo docs/_legacy. Retorna paths relativos com forward-slash.
 * Exportada para teste isolado e reuso em e2e final.
 *
 * 2026-05-21 (Luiz/dev): exportada (era privada em 90-final-validation.ts).
 */
export async function walkDocs(rootCwd: string): Promise<string[]> {
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
 * Step 10 — validacao final via allowlist (PRD MH-08, CA-06).
 * Emite warnings agrupados; nao aborta init.
 * EXCECAO: check primario de knowledge lanca AbortError (D8.C do PRD knowledge-path-cutover).
 * D4: SEM dry-run guard — validator runs regardless of dry-run flag.
 */
export const finalValidationStep: Step = {
  id: 'final-validation',
  async run(ctx) {
    // 2026-05-21 (Luiz/dev): D4 — SEM dry-run guard. Step antigo 90-final-validation.ts:117-119 removido.
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
      // 2026-05-21 (Luiz/dev): IO errors degradam gracefully (PRD MH-08 modo warning).
      // AbortError do check primario nao chega aqui — lancado antes do try.
      if (e instanceof AbortError) throw e
      const reason = e instanceof Error ? e.message : String(e)
      return { mutated: false, summary: `validator: skipped due to IO error (${reason})` }
    }
  },
}
