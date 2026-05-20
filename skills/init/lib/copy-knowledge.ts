// 2026-05-16 (Luiz/dev): contrato final — alinhado com CA-04 (skip idempotente), RF7 (--refresh-knowledge),
// CA-06 (primary=null → no-matrix, não erro), G10.
// G2 / DI-2: primary usa nome de pasta do matrix (MatrixFolder), não StackId interno.
// 2026-05-16 (Luiz/dev): path traversal guard preservado — verify-work HIGH #1 (commit 34347a2).
// `primary` é API pública: validar shape antes de construir sourceRoot evita cópia fora de docs/knowledge/.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { MatrixFolder } from './detect-multi-stack'

// Preserva guard do Plano 01 fase-03 (commit 34347a2): rejeita qualquer valor com ../ ou separadores de path.
const VALID_PRIMARY = /^[a-z0-9_-]+$/i

export type CopyKnowledgeStatus = 'copied' | 'skipped' | 'refreshed' | 'no-matrix' | 'no-source'

export interface CopyKnowledgeResult {
  status: CopyKnowledgeStatus
  /** Quantos arquivos foram efetivamente escritos. 0 para skipped/no-matrix/no-source. */
  atomCount: number
  /** Mensagem human-readable já formatada para output do /init. */
  message: string
  /** Path absoluto de `.claude/knowledge/` no projeto alvo. */
  destDir: string
}

export interface CopyKnowledgeOptions {
  targetDir: string
  pluginRoot: string
  primary: MatrixFolder | null
  /** Quando true e .claude/knowledge/ existe, sobrescreve (RF7). Default false (CA-04). */
  refresh?: boolean
}

export async function copyKnowledge(opts: CopyKnowledgeOptions): Promise<CopyKnowledgeResult> {
  const { targetDir, pluginRoot, primary, refresh = false } = opts
  const destDir = path.join(targetDir, '.claude', 'knowledge')

  // G10 / CA-06: primary=null → stack não detectada, não é erro
  if (primary === null) {
    return {
      status: 'no-matrix',
      atomCount: 0,
      message: 'Stack não detectada. Knowledge não foi copiado.',
      destDir,
    }
  }

  // Path traversal guard (preserva fix HIGH #1 — commit 34347a2)
  if (!VALID_PRIMARY.test(primary)) {
    return {
      status: 'no-source',
      atomCount: 0,
      message: `Matrix '${primary}' tem id inválido (deve casar ${VALID_PRIMARY.source}). Knowledge não foi copiado.`,
      destDir,
    }
  }

  // 2026-05-20 (Luiz/dev): D1/D2 do PRD knowledge-path-cutover — runtime asset em knowledge/
  // (nao docs/knowledge/). docs/ = dog-food nao distribuivel; knowledge/ = distribuivel via sync.
  const knowledgeBase = path.resolve(pluginRoot, 'knowledge')
  const sourceDir = path.resolve(knowledgeBase, primary)

  // Defense in depth: garantir que resolve() não escapou (ex: symlink em pluginRoot — improvável mas barato).
  if (sourceDir !== knowledgeBase && !sourceDir.startsWith(knowledgeBase + path.sep)) {
    return {
      status: 'no-source',
      atomCount: 0,
      // 2026-05-20 (Luiz/dev): D9 do PRD knowledge-path-cutover — mensagem atualizada para knowledge/ (nao docs/knowledge/)
      message: `sourceDir escapa knowledge/: ${sourceDir}. Knowledge não foi copiado.`,
      destDir,
    }
  }

  const sourceExists = await fs.access(sourceDir).then(() => true).catch(() => false)
  if (!sourceExists) {
    return {
      status: 'no-source',
      atomCount: 0,
      // 2026-05-20 (Luiz/dev): D1/D9 do PRD knowledge-path-cutover — path base mudou para knowledge/
      message: `Matrix '${primary}' não existe em knowledge/${primary}/. Knowledge não foi copiado.`,
      destDir,
    }
  }

  const destExists = await fs.access(destDir).then(() => true).catch(() => false)

  if (destExists && !refresh) {
    // 2026-05-16 (Luiz/dev): CA-04 — preserve + inform. Mensagem textual exata do PRD §Edge Cases.
    return {
      status: 'skipped',
      atomCount: 0,
      message: 'Knowledge já existe em .claude/knowledge/. Use --refresh-knowledge para re-copiar.',
      destDir,
    }
  }

  // Refresh path: limpar antes de copiar (RF7).
  // 2026-05-17: rm+mkdir são idempotentes — eliminamos a race window TOCTOU (CWE-367).
  // rm({force:true}) não falha se destDir ausente; mkdir({recursive:true}) não falha se já existe.
  if (refresh) {
    await fs.rm(destDir, { recursive: true, force: true })
  }

  await fs.mkdir(destDir, { recursive: true })

  let atomCount: number
  try {
    atomCount = await copyTree(sourceDir, destDir)
  } catch (err: unknown) {
    const e = err as Error
    if (e.message?.includes('CWE-61')) {
      // Symlink detectado — limpar destDir parcialmente criado e sinalizar
      await fs.rm(destDir, { recursive: true, force: true })
      // M1.4: sanitize pluginRoot from user-facing message to avoid exposing absolute paths in CI logs.
      // Full path preserved in thrown Error (caught locally) for debugging; message returned to caller is redacted.
      const safeMessage = e.message.replace(pluginRoot, '<plugin-root>')
      return {
        status: 'no-source',
        atomCount: 0,
        message: safeMessage,
        destDir,
      }
    }
    throw err
  }

  return {
    status: refresh ? 'refreshed' : 'copied',
    atomCount,
    message: refresh
      ? `Stack detected: ${primary}. Knowledge re-copied: ${atomCount} atoms.`
      : `Stack detected: ${primary}. Knowledge copied: ${atomCount} atoms.`,
    destDir,
  }
}

/**
 * Cópia recursiva mínima. Retorna contagem de arquivos (não diretórios).
 * Usa fs nativo — não reutiliza copy-recursive.ts (contexto de scaffold de templates é diferente).
 * 2026-05-17: lstat() explícito antes de cada entry — rejeita symlinks (CWE-61).
 */
async function copyTree(src: string, dest: string): Promise<number> {
  let count = 0
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    // CWE-61: lstat não segue symlinks — detecta o link em si, não o alvo.
    // Dirent.isFile()/isDirectory() com readdir withFileTypes pode seguir symlinks em algumas plataformas.
    const stat = await fs.lstat(srcPath)
    if (stat.isSymbolicLink()) {
      throw new Error(
        `Symlink detected in source — abortando por segurança (CWE-61): ${srcPath}`,
      )
    }
    if (entry.isDirectory()) {
      await fs.mkdir(destPath, { recursive: true })
      count += await copyTree(srcPath, destPath)
    } else if (entry.isFile()) {
      await fs.copyFile(srcPath, destPath)
      count += 1
    }
  }
  return count
}
