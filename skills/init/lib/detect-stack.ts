// 2026-05-11 (Luiz/dev): heuristica de stack — D7, M3, CA-07/08/19/20/21.
// v6.0.0 SO REGISTRA o stack — knowledge packs (D5, D19) ficam para v6.1+ (D37).
// Plano 02 fase-06.

import { promises as fs } from 'node:fs'
import path from 'node:path'

export type StackId = 'nextjs' | 'node-ts' | 'rails' | 'laravel' | 'python' | 'unknown'

export type DetectedStack = {
  id: StackId
  /**
   * Origem do sinal — para registrar em STATE.md.
   * Ex: "package.json#dependencies.next".
   */
  signalSource: string
}

type Probe = (dir: string) => Promise<DetectedStack | null>

/**
 * Le JSON de arquivo, retorna null em caso de erro (arquivo ausente, JSON invalido).
 * Usar `as object` aqui e justificado: JSON.parse retorna `unknown` e precisamos
 * fazer spread de deps — type guard completo custaria ~10 linhas sem ganho real neste contexto.
 * Decisao documentada: Plano 02 fase-06, gotcha local.
 */
async function readJsonSafe(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const body = await fs.readFile(filePath, 'utf8')
    const parsed: unknown = JSON.parse(body)
    return parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

async function readTextSafe(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch {
    return null
  }
}

const probeNextjs: Probe = async (dir) => {
  const pkg = await readJsonSafe(path.join(dir, 'package.json'))
  if (!pkg) return null
  const deps: Record<string, unknown> = {
    ...((pkg.dependencies as object | undefined) ?? {}),
    ...((pkg.devDependencies as object | undefined) ?? {}),
  }
  if ('next' in deps) {
    return { id: 'nextjs', signalSource: 'package.json#dependencies.next' }
  }
  return null
}

const probeNodeTs: Probe = async (dir) => {
  const pkg = await readJsonSafe(path.join(dir, 'package.json'))
  if (!pkg) return null
  const dev = (pkg.devDependencies as Record<string, unknown> | undefined) ?? {}
  const deps = (pkg.dependencies as Record<string, unknown> | undefined) ?? {}
  if ('typescript' in dev || 'typescript' in deps) {
    return { id: 'node-ts', signalSource: 'package.json#devDependencies.typescript' }
  }
  return null
}

const probeRails: Probe = async (dir) => {
  const gemfile = await readTextSafe(path.join(dir, 'Gemfile'))
  if (!gemfile) return null
  if (/^\s*gem\s+["']rails["']/m.test(gemfile)) {
    return { id: 'rails', signalSource: 'Gemfile#gem "rails"' }
  }
  return null
}

const probeLaravel: Probe = async (dir) => {
  const composer = await readJsonSafe(path.join(dir, 'composer.json'))
  if (!composer) return null
  const require = (composer.require as Record<string, unknown> | undefined) ?? {}
  if ('laravel/framework' in require) {
    return { id: 'laravel', signalSource: 'composer.json#require.laravel/framework' }
  }
  return null
}

const probePython: Probe = async (dir) => {
  const pyproject = await readTextSafe(path.join(dir, 'pyproject.toml'))
  if (pyproject) return { id: 'python', signalSource: 'pyproject.toml' }
  const requirements = await readTextSafe(path.join(dir, 'requirements.txt'))
  if (requirements) return { id: 'python', signalSource: 'requirements.txt' }
  return null
}

/**
 * Ordem importa (G6): primeiro match positivo vence.
 * nextjs antes de node-ts porque todo Next.js project tambem tem typescript em devDeps.
 * rails, laravel, python sao independentes entre si mas vem depois do JS/TS.
 */
const PROBES: ReadonlyArray<Probe> = [probeNextjs, probeNodeTs, probeRails, probeLaravel, probePython]

/**
 * Detecta o stack do projeto em `targetDir` via heuristica de manifests.
 * Retorna `{ id: 'unknown', signalSource: 'no signal' }` se nenhum manifest for reconhecido.
 * Erros de I/O sao engolidos — heuristica nunca deve quebrar `/init`.
 *
 * @example
 * const stack = await detectStack('/path/to/project')
 * console.log(stack.id) // 'nextjs'
 */
export async function detectStack(targetDir: string): Promise<DetectedStack> {
  for (const probe of PROBES) {
    const result = await probe(targetDir)
    if (result) return result
  }
  return { id: 'unknown', signalSource: 'no signal' }
}
