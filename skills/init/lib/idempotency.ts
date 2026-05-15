// 2026-05-14 (Luiz/dev): Plano 05 fase-01 — idempotência de re-run.
// DT-02: full re-run regenera discovery/*, preserva plans em active/.
// DT-06: skip + warn se checksum mudou desde último run (respeita edits humanos).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import type { AntiVibeManifest } from './manifest-writer'

/**
 * Resultado de shouldSkipFile.
 *
 * skip: true + reason: 'checksum-mismatch' → arquivo foi editado pelo humano; emitir warning.
 * skip: true + reason: 'plan-preserved'    → arquivo é um migration plan em active/; sempre preservar.
 * skip: false                              → arquivo não estava no manifest ou checksum não mudou; pode regenerar.
 */
export type SkipResult =
  | { skip: true; reason: 'checksum-mismatch' | 'plan-preserved' }
  | { skip: false }

export type IdempotencyWarning = {
  filePath: string
  reason: 'checksum-mismatch' | 'plan-preserved'
  message: string
}

export type CheckIdempotencyResult = {
  warnings: IdempotencyWarning[]
  /** Paths que devem ser pulados pelo pipeline (edited by human OR plan-preserved). */
  skipPaths: Set<string>
}

/** SHA-256 hex do conteúdo do arquivo. Retorna '' se arquivo não existir. */
async function checksumOfFile(absPath: string): Promise<string> {
  let content: Buffer
  try {
    content = await fs.readFile(absPath)
  } catch {
    return ''
  }
  return createHash('sha256').update(content).digest('hex')
}

/**
 * Decide se um arquivo deve ser pulado durante re-run de /init.
 *
 * Regras (em ordem de precedência):
 * 1. Paths dentro de `docs/exec-plans/active/` → SEMPRE preservados (plan-preserved).
 *    Não lê o arquivo nem compara checksum — é uma garantia de negócio, não otimização de I/O.
 * 2. Path não está no manifest.files → skip: false (novo arquivo — pode criar/regenerar).
 * 3. Checksum atual difere do gravado no manifest → skip: true, reason: 'checksum-mismatch'.
 *    Indica que o humano editou o arquivo entre runs.
 * 4. Checksum igual → skip: false (sem mudança — pode sobrescrever com mesmo conteúdo).
 *
 * @param relPath  Path relativo ao targetDir (ex: 'discovery/inventory.json').
 * @param absPath  Path absoluto (para leitura do conteúdo atual).
 * @param manifest Manifest do último run, lido via readManifest(targetDir).
 */
export async function shouldSkipFile(
  relPath: string,
  absPath: string,
  manifest: AntiVibeManifest,
): Promise<SkipResult> {
  // Regra 1: plans em active/ são sempre preservados.
  // Normaliza separadores para comparação cross-platform.
  const normalized = relPath.replace(/\\/g, '/')
  if (normalized.startsWith('docs/exec-plans/active/')) {
    return { skip: true, reason: 'plan-preserved' }
  }

  // Regra 2: não está no manifest → pode regenerar.
  const recorded = manifest.files[normalized] ?? manifest.files[relPath]
  if (!recorded) return { skip: false }

  // Regras 3 e 4: comparar checksum.
  const current = await checksumOfFile(absPath)
  if (!current) return { skip: false } // arquivo não existe mais → pode criar
  if (current !== recorded) {
    return { skip: true, reason: 'checksum-mismatch' }
  }
  return { skip: false }
}

const DISCOVERY_FILES = [
  'discovery/inventory.json',
  'discovery/semantic-inventory.json',
] as const

/**
 * Remove artefatos de discovery para forçar re-scan completo no próximo run.
 * DT-02: full re-run SEMPRE regenera discovery/*.
 *
 * Usa fs.unlink (não truncate) para garantir que checksums do manifest anterior
 * não colidam com estado intermediário (arquivo vazio tem checksum diferente de ausente).
 * Ignora ENOENT — arquivo já ausente é estado válido.
 */
export async function regenerateDiscovery(targetDir: string): Promise<void> {
  await Promise.all(
    DISCOVERY_FILES.map(async (rel) => {
      try {
        await fs.unlink(path.join(targetDir, rel))
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
        // ENOENT: arquivo já ausente — estado correto, sem ação.
      }
    }),
  )
}

/**
 * Verifica idempotência antes de um re-run de /init em migration mode.
 *
 * Retorna o conjunto de paths que devem ser pulados e warnings a exibir ao operador.
 * SKILL.md deve chamar esta função ANTES de disparar runMigrationMode().
 *
 * @param targetDir  Diretório raiz do repo alvo.
 * @param manifest   Manifest do run anterior (de readManifest(targetDir)).
 * @param candidates Paths relativos a verificar (ex: planPaths relativos ao targetDir).
 */
export async function checkIdempotency(
  targetDir: string,
  manifest: AntiVibeManifest,
  candidates: string[],
): Promise<CheckIdempotencyResult> {
  const warnings: IdempotencyWarning[] = []
  const skipPaths = new Set<string>()

  await Promise.all(
    candidates.map(async (relPath) => {
      const absPath = path.join(targetDir, relPath)
      const result = await shouldSkipFile(relPath, absPath, manifest)
      if (result.skip) {
        skipPaths.add(relPath)
        const message =
          result.reason === 'checksum-mismatch'
            ? `"${relPath}" foi editado desde o último run — mantendo versão atual.`
            : `"${relPath}" é um migration plan ativo — preservando (nunca sobrescrever).`
        warnings.push({ filePath: relPath, reason: result.reason, message })
      }
    }),
  )

  return { warnings, skipPaths }
}
