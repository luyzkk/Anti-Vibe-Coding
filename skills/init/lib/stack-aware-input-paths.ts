// 2026-05-19 (Luiz/dev): helper stack-aware para derivar paths candidatos de codigo
// por stack detectado, com validacao fs.access — mitiga risco LLM-hallucination do PRD
// (G2 do Plano 03). Paths inexistentes sao incluidos com exists: false — renderer (fase-03)
// decide politica de filtragem. Plano 03 fase-02.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { StackId } from './detect-stack'

/**
 * Doc canonico do harness — identifier amigavel para o helper.
 * Subset de `TEMPLATE_MANIFEST.dst` filtrado por populaveis.
 * Em v1, lista estatica; futuro: gerar deste `TEMPLATE_MANIFEST.filter(isPopulatable).map(e => e.dst)`.
 */
// 2026-05-19 (Luiz/dev): D5 do PRD populate-plan-andre-port — PRODUCT_SENSE e README entram
// no contrato de docs canonicos. Plano 04 (MH-4) adiciona paths reais por stack.
export type CanonicalDoc =
  | 'AGENTS.md'
  | 'ARCHITECTURE.md'
  | 'CLAUDE.md'
  | 'README.md'
  | 'docs/DESIGN.md'
  | 'docs/FRONTEND.md'
  | 'docs/PRODUCT_SENSE.md'
  | 'docs/SECURITY.md'
  | 'docs/RELIABILITY.md'
  | 'docs/PLANS.md'
  | 'docs/QUALITY_SCORE.md'
  | 'docs/CODE_STYLE.md'
  | 'docs/STATE.md'
  | 'docs/design-docs/core-beliefs.md'

/**
 * Mapa: para cada doc canonico, lista de paths de codigo (validados) que devem alimentar
 * a sintese da LLM no momento do /execute-plan.
 *
 * `note` carrega anotacoes uteis para o subagente (ex: "candidato nao encontrado — pular
 * ou pedir input ao usuario").
 */
export type StackAwareInputPaths = ReadonlyMap<CanonicalDoc, ReadonlyArray<{
  readonly path: string
  readonly exists: boolean
  readonly note?: string
}>>

// 2026-05-19 (Luiz/dev): mitigacao do risco PRD "LLM gera PLAN.md com inputs inexistentes"
// (secao Riscos do PRD). Todos os paths emitidos sao validados com fs.access antes de
// entrar no markdown. Stack desconhecido cai no mapa generico.

type StackCandidates = Partial<Record<CanonicalDoc, ReadonlyArray<string>>>

const NEXTJS_CANDIDATES: StackCandidates = {
  'ARCHITECTURE.md': [
    'src/app/layout.tsx',
    'src/middleware.ts',
    'src/app/page.tsx',
    'next.config.js',
    'next.config.mjs',
    'next.config.ts',
  ],
  'docs/FRONTEND.md': [
    'src/app/layout.tsx',
    'tailwind.config.ts',
    'tailwind.config.js',
    'src/components/',
    'src/app/globals.css',
  ],
  'docs/SECURITY.md': [
    'src/middleware.ts',
    'src/lib/auth/',
    '.env.example',
  ],
  'docs/RELIABILITY.md': [
    'src/app/error.tsx',
    'src/app/not-found.tsx',
    'next.config.js',
  ],
  'docs/DESIGN.md': [
    'tailwind.config.ts',
    'src/app/globals.css',
    'src/components/ui/',
  ],
  'docs/CODE_STYLE.md': [
    '.eslintrc.json',
    'eslint.config.js',
    '.prettierrc',
    'tsconfig.json',
  ],
  // 2026-05-20 (Luiz/dev): Plano 04 fase-01 do PRD populate-plan-andre-port (MH-4 / CA-02).
  // 8 docs canonicos adicionados para Next.js. Paths sao do scaffold padrao Next.js — nao inventar.
  // `exists: false` aceito em greenfield (renderer marca _nao encontrado_).
  'AGENTS.md': [
    'README.md',
    'package.json',
    'CLAUDE.md',
  ],
  'CLAUDE.md': [
    'AGENTS.md',
    'README.md',
    'package.json',
  ],
  'docs/PRODUCT_SENSE.md': [
    'README.md',
    'src/app/page.tsx',
    'package.json',
  ],
  'docs/PLANS.md': [
    'docs/exec-plans/active/',
    'docs/exec-plans/completed/',
  ],
  'docs/QUALITY_SCORE.md': [
    '.github/workflows/',
    '.github/pull_request_template.md',
    'package.json',
  ],
  'docs/STATE.md': [
    'package.json',
    'docs/exec-plans/active/',
  ],
  'docs/design-docs/core-beliefs.md': [
    'CLAUDE.md',
    'docs/CODE_STYLE.md',
    'README.md',
  ],
  'README.md': [
    'package.json',
    'src/app/page.tsx',
    'next.config.js',
    'next.config.mjs',
    'next.config.ts',
  ],
}

// 2026-05-19 (Luiz/dev): Next.js + Supabase merge — Supabase tem paths proprios sobre Next.js base.
// CA-02 do PRD exige >= 3 paths reais em ARCHITECTURE/FRONTEND/SECURITY em Next.js+Supabase.
const NEXTJS_SUPABASE_EXTRA: StackCandidates = {
  'ARCHITECTURE.md': [
    'supabase/migrations/',
    'supabase/functions/',
    'supabase/config.toml',
    'src/lib/supabase/server.ts',
    'src/lib/supabase/client.ts',
  ],
  'docs/SECURITY.md': [
    'supabase/migrations/',
    'src/lib/supabase/server.ts',
    'supabase/config.toml',
    // 2026-05-20 (Luiz/dev): Plano 04 fase-01 — entry adicionada para CA-02 mecanico.
    'src/lib/supabase/client.ts',
  ],
  'docs/RELIABILITY.md': [
    'supabase/functions/',
    'supabase/migrations/',
    // 2026-05-20 (Luiz/dev): Plano 04 fase-01 — entries adicionadas para CA-02 mecanico
    // (RELIABILITY precisa de >= 3 paths reais).
    'supabase/config.toml',
    'src/lib/supabase/server.ts',
  ],
}

const RAILS_CANDIDATES: StackCandidates = {
  'ARCHITECTURE.md': [
    'config/routes.rb',
    'app/controllers/',
    'app/models/',
    'config/application.rb',
  ],
  'docs/SECURITY.md': [
    'config/initializers/cors.rb',
    'config/credentials.yml.enc',
    'app/controllers/application_controller.rb',
  ],
  'docs/RELIABILITY.md': [
    'config/database.yml',
    'config/sidekiq.yml',
    'app/jobs/',
  ],
  'docs/CODE_STYLE.md': [
    '.rubocop.yml',
    'Gemfile',
  ],
}

const NODE_TS_CANDIDATES: StackCandidates = {
  'ARCHITECTURE.md': [
    'src/index.ts',
    'src/main.ts',
    'package.json',
    'tsconfig.json',
  ],
  'docs/CODE_STYLE.md': [
    'tsconfig.json',
    '.eslintrc.json',
    'eslint.config.js',
    '.prettierrc',
  ],
}

// Generico — usado quando primary === null
const GENERIC_CANDIDATES: StackCandidates = {
  'ARCHITECTURE.md': [
    'README.md',
    'package.json',
    'Gemfile',
    'composer.json',
    'pyproject.toml',
  ],
  // 2026-05-20 (Luiz/dev): Plano 04 fase-01 — entries genericas para README e PRODUCT_SENSE.
  // Subset minimo — Plano 05 fase-02 (SH-2 Laravel + Python) pode estender se aparecerem novos
  // paths-scaffold por linguagem.
  'README.md': [
    'package.json',
    'Gemfile',
    'composer.json',
    'pyproject.toml',
  ],
  'docs/PRODUCT_SENSE.md': [
    'README.md',
    'package.json',
  ],
}

/**
 * Detecta presenca de Supabase como sinal complementar ao Next.js.
 * Next.js + Supabase nao e um StackId separado (D22 multi-stack so captura 5 stacks principais).
 * Sinal: pasta `supabase/` presente OU dep `@supabase/*` em package.json deps/devDeps.
 */
async function hasSupabaseSignal(cwd: string): Promise<boolean> {
  // Sinal 1: pasta supabase/ no projeto
  try {
    const stat = await fs.stat(path.join(cwd, 'supabase'))
    if (stat.isDirectory()) return true
  } catch {
    // ignora — pasta ausente
  }
  // Sinal 2: dep @supabase/* no package.json
  try {
    const pkgRaw = await fs.readFile(path.join(cwd, 'package.json'), 'utf-8')
    const pkg: unknown = JSON.parse(pkgRaw)
    if (pkg !== null && typeof pkg === 'object') {
      // `as Record<string, unknown>` justificado: JSON.parse retorna unknown e precisamos
      // iterar deps — type guard completo custaria ~10 linhas sem ganho real aqui.
      // Mesma decisao de detect-stack.ts linha 51-52.
      const obj = pkg as Record<string, unknown>
      const deps = {
        ...((obj.dependencies as Record<string, unknown> | undefined) ?? {}),
        ...((obj.devDependencies as Record<string, unknown> | undefined) ?? {}),
      }
      return Object.keys(deps).some(k => k.startsWith('@supabase/'))
    }
  } catch {
    // ignora — package.json ausente ou invalido
  }
  return false
}

/**
 * Mescla multiplos StackCandidates, deduplicando paths por CanonicalDoc.
 * Base primeiro, extras depois — a ordem dos extras e preservada para o renderer.
 */
function mergeCandidates(...maps: StackCandidates[]): StackCandidates {
  const merged: Record<string, string[]> = {}
  for (const map of maps) {
    for (const key of Object.keys(map) as CanonicalDoc[]) {
      const candidates = map[key] ?? []
      const existing = merged[key] ?? []
      merged[key] = [...new Set([...existing, ...candidates])]
    }
  }
  return merged as StackCandidates
}

/**
 * Seleciona o mapa estatico de candidatos pelo stack primario detectado.
 * laravel, python, unknown e null caem no GENERIC_CANDIDATES.
 */
function pickStaticMap(primary: StackId | null): StackCandidates {
  switch (primary) {
    case 'nextjs': return NEXTJS_CANDIDATES
    case 'rails': return RAILS_CANDIDATES
    case 'node-ts': return NODE_TS_CANDIDATES
    case 'laravel':
    case 'python':
    case 'unknown':
    case null:
    default:
      return GENERIC_CANDIDATES
  }
}

/**
 * Recebe stack primario detectado + cwd. Retorna mapa de paths candidatos por doc canonico,
 * com cada path validado via `fs.access`. Paths inexistentes sao incluidos com `exists: false`
 * e nota — o renderer (fase-03) decide se inclui no markdown como comentario ou se filtra.
 *
 * Paths sao emitidos sempre em forward-slash (posix), inclusive em Windows.
 *
 * Em v1, sempre INCLUI todos (com flag exists), para o renderer decidir. Politica de filtro
 * concentrada em um lugar — facilita ajuste futuro.
 *
 * @example Next.js + Supabase
 * const map = await stackAwareInputPaths('/projects/my-app', 'nextjs')
 * // map.get('ARCHITECTURE.md') => [{path: 'src/app/layout.tsx', exists: true}, ...]
 */
export async function stackAwareInputPaths(
  cwd: string,
  primary: StackId | null,
): Promise<StackAwareInputPaths> {
  const base = pickStaticMap(primary)
  const withSupabase = primary === 'nextjs' && (await hasSupabaseSignal(cwd))
    ? mergeCandidates(base, NEXTJS_SUPABASE_EXTRA)
    : base

  const result = new Map<CanonicalDoc, Array<{ path: string; exists: boolean; note?: string }>>()

  for (const key of Object.keys(withSupabase) as CanonicalDoc[]) {
    const candidates = withSupabase[key] ?? []
    const validated: Array<{ path: string; exists: boolean; note?: string }> = []
    for (const candidate of candidates) {
      // Usar path.join mas normalizar para posix — fs.access aceita ambos em Windows,
      // mas emitimos forward-slash para portabilidade (checklist item da fase).
      const abs = path.join(cwd, candidate)
      let exists = false
      try {
        await fs.access(abs)
        exists = true
      } catch {
        exists = false
      }
      validated.push(
        exists
          ? { path: candidate, exists: true }
          : { path: candidate, exists: false, note: 'candidato nao encontrado — verificar antes de usar' },
      )
    }
    result.set(key, validated)
  }
  return result
}
