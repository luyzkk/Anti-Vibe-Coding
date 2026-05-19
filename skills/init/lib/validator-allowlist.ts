// skills/init/lib/validator-allowlist.ts
// 2026-05-19 (Luiz/dev): Allowlist derivada de TEMPLATE_MANIFEST. Plano 04 fase-03.
// Resolve CA-06: 179 falsos positivos -> warnings agrupados por subdir canonico.
import { TEMPLATE_MANIFEST } from './template-manifest'

export type Allowlist = {
  /** Paths exatos relativos ao repo root permitidos. Set para O(1) lookup. */
  readonly exactPaths: ReadonlySet<string>
  /** Prefixos de path (prefix-match) — cobre docs gerados em runtime. */
  readonly globPrefixes: readonly string[]
}

const RUNTIME_GLOB_PREFIXES: readonly string[] = [
  'docs/exec-plans/active/',
  'docs/exec-plans/completed/',
  'docs/compound/_imported/',
  'docs/compound/_archived/',
  'docs/design-docs/',
  'docs/lessons/',
] as const

/**
 * Allowlist canonica para o validador final (PRD MH-08, CA-06).
 * Combina destinos do TEMPLATE_MANIFEST com prefixos de runtime (exec-plans, compound).
 * Arquivos fora da allowlist sao reportados como warning (NAO erro).
 */
export function buildAllowlistFromTemplateManifest(): Allowlist {
  const exactPaths = new Set<string>()
  for (const entry of TEMPLATE_MANIFEST) {
    exactPaths.add(entry.dst)
  }
  // Paths fixos fora de TEMPLATE_MANIFEST mas legitimos na raiz do repo
  exactPaths.add('AGENTS.md')
  exactPaths.add('ARCHITECTURE.md')
  exactPaths.add('CLAUDE.md')
  return {
    exactPaths,
    globPrefixes: RUNTIME_GLOB_PREFIXES,
  }
}

/**
 * Verifica se `relPath` (sempre relativo, com `/`) e permitido pela allowlist.
 */
export function isAllowed(relPath: string, allowlist: Allowlist): boolean {
  if (allowlist.exactPaths.has(relPath)) return true
  for (const prefix of allowlist.globPrefixes) {
    if (relPath.startsWith(prefix)) return true
  }
  return false
}

/**
 * Agrupa caminhos nao permitidos por "doc canonico" mais proximo (primeiros 2 segmentos).
 * Resolve CA-06: 179 paths -> ~5 grupos para apresentacao concisa.
 */
export function groupWarnings(
  unallowedRelPaths: readonly string[],
): readonly { readonly group: string; readonly paths: readonly string[] }[] {
  const buckets = new Map<string, string[]>()
  for (const p of unallowedRelPaths) {
    const segments = p.split('/')
    const group = segments.length >= 2 ? `${segments[0]}/${segments[1]}` : (segments[0] ?? p)
    const arr = buckets.get(group) ?? []
    arr.push(p)
    buckets.set(group, arr)
  }
  return Array.from(buckets.entries()).map(([group, paths]) => ({ group, paths }))
}
