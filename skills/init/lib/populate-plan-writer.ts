// 2026-05-19 (Luiz/dev): Plano 03 fase-04 — writer materializa output do renderer v2 em disco.
// D4 do CONTEXT: pasta `{date}-populate-harness/` com PLAN.md indice + 1 arquivo por fase.
// G5 do README: slug usa YYYY-MM-DD prefix para compatibilidade com /execute-plan glob.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { PopulatePlanOutputV2 } from './populate-plan-generator'

export type WritePopulatePlanResult = {
  /** Pasta absoluta criada. */
  readonly absoluteFolder: string
  /** Arquivos efetivamente escritos (PLAN.md + fases). */
  readonly writtenFiles: ReadonlyArray<string>
  /** Warnings nao bloqueantes (ex: arquivos pre-existentes sobrescritos). */
  readonly warnings: ReadonlyArray<string>
}

/**
 * Materializa o output do renderer v2 em disco.
 *
 * Estrutura criada:
 *   {cwd}/{plan.relativeFolderPath}/
 *     PLAN.md
 *     fase-01-{slug}.md
 *     fase-02-{slug}.md
 *     ...
 *
 * Sobrescreve arquivos pre-existentes (emite warning, nao lanca excecao).
 */
export async function writePopulatePlanFolder(
  plan: PopulatePlanOutputV2,
  cwd: string,
): Promise<WritePopulatePlanResult> {
  const absoluteFolder = path.join(cwd, plan.relativeFolderPath)
  await fs.mkdir(absoluteFolder, { recursive: true })

  const writtenFiles: string[] = []
  const warnings: string[] = []

  const indexPath = path.join(absoluteFolder, 'PLAN.md')
  await writeWithWarning(indexPath, plan.planIndexMarkdown, writtenFiles, warnings)

  for (const [fileName, content] of plan.phaseFiles.entries()) {
    const filePath = path.join(absoluteFolder, fileName)
    await writeWithWarning(filePath, content, writtenFiles, warnings)
  }

  return { absoluteFolder, writtenFiles, warnings }
}

async function writeWithWarning(
  filePath: string,
  content: string,
  written: string[],
  warnings: string[],
): Promise<void> {
  try {
    await fs.access(filePath)
    warnings.push(`sobrescrito: ${filePath}`)
  } catch {
    // novo arquivo — OK
  }
  try {
    await fs.writeFile(filePath, content, 'utf-8')
    written.push(filePath)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    warnings.push(`falha ao escrever ${filePath}: ${message}`)
  }
}
