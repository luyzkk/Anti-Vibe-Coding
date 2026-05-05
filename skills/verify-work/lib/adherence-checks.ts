import type { ArchitectureProfileName } from '../../lib/manifest-types'

/**
 * Describes a set of descriptive (non-prescriptive) adherence checks for a given
 * architecture profile. Checks are phrased as questions to observe divergence,
 * never as commands to refactor.
 *
 * Used by verify-work to render an adherence section in the post-execution report.
 *
 * @example
 * const check = ADHERENCE_CHECKS['vertical-slice']
 * const section = renderAdherenceSection(check)
 * // section is injected into the verify-work report
 */
export type AdherenceCheck = {
  /** Headline of the adherence section in the report */
  headline: string
  /** Descriptive questions that verify-work iterates during review */
  checks: string[]
}

/**
 * Lookup table mapping each canonical architecture profile to its adherence checks.
 * Exactly 5 keys — one per canonical profile name (G6).
 *
 * All checks are DESCRIPTIVE, not PRESCRIPTIVE (G7): phrased as observation questions,
 * never as refactor commands. No "refatore", "converta", "altere para", "migre".
 */
export const ADHERENCE_CHECKS: Record<ArchitectureProfileName, AdherenceCheck> = {
  'clean-architecture-ritual': {
    headline: 'Aderência ao perfil Clean Architecture (informativa, não prescritiva)',
    checks: [
      'Os imports respeitam a barreira Domain → Application → Infrastructure → Presentation?',
      'Use cases na Application não vazam tipos da Infrastructure?',
      'Testes de unidade do Domain rodam sem montar Infrastructure?',
    ],
  },
  'mvc-flat': {
    headline: 'Aderência ao perfil MVC flat (informativa)',
    checks: [
      'Controllers ainda magros (HTTP-only) ou começaram a conter regra de negócio?',
      'Services contêm a lógica do domínio ou viraram passthrough do repository?',
      'Repositories falam só com o banco, sem regras de negócio espalhadas?',
    ],
  },
  'vertical-slice': {
    headline: 'Aderência ao perfil Vertical Slice (informativa)',
    checks: [
      'Há imports cruzando features que poderiam estar em `shared/`?',
      'A feature está auto-contida (UI + handler + types juntos)?',
      'Existe algum "shared/utils" que está virando god folder?',
    ],
  },
  'nextjs-app-router': {
    headline: 'Aderência ao perfil Next.js App Router (informativa)',
    checks: [
      '"use client" está presente apenas em componentes que precisam interatividade?',
      'Server actions vs route handlers — cada um no lugar certo?',
      'Layouts aninhados refletem hierarquia de UI ou só rota?',
    ],
  },
  'unknown-mixed': {
    headline: 'Perfil arquitetural não identificado — checks genéricos',
    checks: [
      'Os arquivos novos seguem o padrão observado nos arquivos vizinhos?',
      'Há regressão visível em testes do módulo afetado?',
    ],
  },
}

/**
 * Fallback used when the architecture detector is disabled or no profile is detected.
 * Empty checks[] causes renderAdherenceSection to return '' — preserving v5.2 behavior (CA-04).
 */
export const ADHERENCE_CHECKS_V52: AdherenceCheck = {
  headline: '',
  checks: [],
}

/**
 * Renders the adherence section as Markdown for inclusion in verify-work's report.
 * Returns '' when checks[] is empty so the section is omitted entirely (CA-04 — v5.2 behavior).
 *
 * Tone is DESCRIPTIVE, not PRESCRIPTIVE — reports observations, not refactor commands.
 *
 * @param check - The resolved AdherenceCheck for the detected profile (or ADHERENCE_CHECKS_V52).
 * @returns Markdown string with `### headline` + `- [ ] check` bullets, or '' if no checks.
 *
 * @example
 * const section = renderAdherenceSection(ADHERENCE_CHECKS['vertical-slice'])
 * // Inject into report: `${adherenceSection}`
 */
export function renderAdherenceSection(check: AdherenceCheck): string {
  if (check.checks.length === 0) return ''
  return [
    `### ${check.headline}`,
    '',
    ...check.checks.map((q) => `- [ ] ${q}`),
  ].join('\n')
}
