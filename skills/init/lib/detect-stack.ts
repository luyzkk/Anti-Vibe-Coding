// 2026-05-11 (Luiz/dev): heuristica de stack — D7, M3, CA-07/08/19/20/21.
// v6.0.0 SO REGISTRA o stack — knowledge packs (D5, D19) ficam para v6.1+ (D37).
// Plano 02 fase-06.
// 2026-05-18 (Luiz/dev): D22 multi-stack contract — RF3 + CA-07 + CA-06. Plano 01 fase-03.

import { promises as fs } from 'node:fs'
import path from 'node:path'

// 2026-05-18 (Luiz/dev): D22 multi-stack contract. 'unknown' preservado em StackId para
// compatibilidade com detect-multi-stack.ts (usa como placeholder interno para go.mod).
// DetectedStack.primary usa Exclude<StackId, 'unknown'> | null — 'unknown' nunca aparece
// como primary; o fallback e representado por null. Plano 01 fase-03.
// 2026-05-24 (Luiz/dev): PRD §RF-03 — 'react' adicionado (Vite + React, sem Next).
// G3 mitigation: probeNextjs RODA ANTES de probeReact em PROBES — todo Next.js project tem react
// em deps; se probeReact viesse primeiro, classificaria Next como react e perderiamos o signal Next.
export type StackId = 'nextjs' | 'react' | 'node-ts' | 'rails' | 'laravel' | 'python' | 'unknown'

/**
 * Contrato multi-stack D22. Substitui o shape single-stack { id, signalSource }.
 *
 * `primary` usa Exclude<StackId, 'unknown'> | null para garantir que 'unknown'
 * nunca apareca como primary — o fallback e null. StackId ainda inclui 'unknown'
 * para compatibilidade com detect-multi-stack.ts (placeholder interno para go.mod).
 *
 * @example Projeto Rails puro
 * { primary: 'rails', secondary: [], signalSource: 'Gemfile#gem "rails"', anchorFiles: ['Gemfile'] }
 *
 * @example Monorepo Next+Rails
 * { primary: 'nextjs', secondary: ['rails'], signalSource: 'package.json#dependencies.next', anchorFiles: ['package.json', 'Gemfile'] }
 *
 * @example Sem sinal (fallback)
 * { primary: null, secondary: [], signalSource: 'no signal', anchorFiles: [] }
 */
export type DetectedStack = {
  /** Stack primaria (null quando nenhum probe bate). Nunca 'unknown' — use null. */
  primary: Exclude<StackId, 'unknown'> | null
  /** Stacks secundarias detectadas em monorepo. Vazio se single-stack. */
  secondary: Exclude<StackId, 'unknown'>[]
  /** Origem do sinal primario para STATE.md (ex: "package.json#dependencies.next") */
  signalSource: string
  /** Manifests encontrados — usado por telemetria CA-06 mesmo no fallback */
  anchorFiles: string[]
}

// Probe interno (tipo privado — nao faz parte da API publica).
// Probes nunca retornam 'unknown' — esse valor e placeholder no dominio de detect-multi-stack.ts.
type ProbeResult = { id: Exclude<StackId, 'unknown'>; signalSource: string }
type Probe = (dir: string) => Promise<ProbeResult | null>

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

// 2026-05-24 (Luiz/dev): PRD §RF-03 — Vite + React puro.
// G8: vite.config sozinho da falso-positivo (vue-vite, svelte-vite, lit-vite). EXIGE 'react' em deps.
// Anchor: vite.config.{ts,js,mjs} — Vite suporta os 3; mjs cobre projects ESM-only.
const probeReact: Probe = async (dir) => {
  const viteConfigCandidates = ['vite.config.ts', 'vite.config.js', 'vite.config.mjs']
  let viteConfigFound: string | null = null
  for (const candidate of viteConfigCandidates) {
    try {
      await fs.access(path.join(dir, candidate))
      viteConfigFound = candidate
      break
    } catch { /* segue */ }
  }
  if (!viteConfigFound) return null

  const pkg = await readJsonSafe(path.join(dir, 'package.json'))
  if (!pkg) return null
  const deps: Record<string, unknown> = {
    ...((pkg.dependencies as object | undefined) ?? {}),
    ...((pkg.devDependencies as object | undefined) ?? {}),
  }
  if ('react' in deps) {
    return { id: 'react', signalSource: `${viteConfigFound} + package.json#dependencies.react` }
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
 * Ordem importa (G6): primeiro match positivo vira primary.
 * nextjs antes de node-ts porque todo Next.js project tambem tem typescript em devDeps.
 * rails, laravel, python sao independentes entre si mas vem depois do JS/TS.
 * 2026-05-18 (Luiz/dev): ordem preservada da v6.0 — nao reordenar sem DI registrado.
 */
// 2026-05-24 (Luiz/dev): G3 mitigation — probeNextjs ANTES de probeReact.
// Razao: todo Next.js project tambem tem 'react' em deps + pode ter vite.config (monorepo R5).
// Se probeReact viesse primeiro: Next classificado como react, perdemos signal Next.
const PROBES: ReadonlyArray<Probe> = [probeNextjs, probeReact, probeNodeTs, probeRails, probeLaravel, probePython]

// 2026-05-18 (Luiz/dev): manifests que contam para telemetria CA-06 mesmo sem probe positivo
const MANIFEST_FILES: ReadonlyArray<string> = [
  'package.json',
  'Gemfile',
  'composer.json',
  'pyproject.toml',
  'requirements.txt',
]

/**
 * Coleta manifests presentes no diretorio para telemetria CA-06.
 * Independente dos probes — retorna lista mesmo quando nenhum probe bate.
 */
async function collectAnchorFiles(dir: string): Promise<string[]> {
  const found: string[] = []
  for (const file of MANIFEST_FILES) {
    try {
      await fs.access(path.join(dir, file))
      found.push(file)
    } catch {
      // ausente — ignora
    }
  }
  return found
}

/**
 * Detecta o(s) stack(s) do projeto em `targetDir` via heuristica de manifests.
 *
 * Roda TODOS os probes (nao para no primeiro hit) para detectar stacks secundarias
 * em monorepos. Primary = primeiro probe positivo na ordem de PROBES.
 *
 * Retorna `primary: null` se nenhum manifest for reconhecido (antigo `id: 'unknown'`).
 * `anchorFiles` listados mesmo no fallback — visibilidade para telemetria CA-06.
 * Erros de I/O sao engolidos — heuristica nunca deve quebrar `/init`.
 *
 * @example Single stack
 * const stack = await detectStack('/path/to/rails-project')
 * // { primary: 'rails', secondary: [], signalSource: 'Gemfile#gem "rails"', anchorFiles: ['Gemfile'] }
 *
 * @example Monorepo Next.js + Rails
 * const stack = await detectStack('/path/to/monorepo')
 * // { primary: 'nextjs', secondary: ['rails'], signalSource: 'package.json#dependencies.next', anchorFiles: ['package.json', 'Gemfile'] }
 *
 * @example Sem sinal
 * const stack = await detectStack('/path/to/empty')
 * // { primary: null, secondary: [], signalSource: 'no signal', anchorFiles: [] }
 */
export async function detectStack(targetDir: string): Promise<DetectedStack> {
  // 2026-05-18 (Luiz/dev): D22 — roda TODOS probes, nao para no primeiro hit
  const anchorFiles = await collectAnchorFiles(targetDir)

  const hits: ProbeResult[] = []
  for (const probe of PROBES) {
    const result = await probe(targetDir)
    if (result) hits.push(result)
  }

  // Primary = primeiro hit na ordem de PROBES (preserva precedencia historica)
  const first = hits[0]
  if (!first) {
    return { primary: null, secondary: [], signalSource: 'no signal', anchorFiles }
  }

  const secondary = hits.slice(1).map((h) => h.id)
  return {
    primary: first.id,
    secondary,
    signalSource: first.signalSource,
    anchorFiles,
  }
}
