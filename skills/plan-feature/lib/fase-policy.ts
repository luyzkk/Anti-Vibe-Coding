import type { ArchitectureProfileName } from '../../lib/manifest-types'

/**
 * Describes how phases should be granulated for a given architecture profile.
 * Injected as a markdown block into the plan-feature prompt so the LLM adapts
 * phase generation to the detected profile — without deep branching.
 *
 * Values are DESCRIPTIVE of the profile ("organize phases by feature"),
 * never PRESCRIPTIVE ("refactor to vertical-slice"). See G7 in plano04 README.
 *
 * @example
 * const policy = FASE_POLICY_BY_PROFILE['vertical-slice']
 * const block = renderFasePolicyBlock(policy)
 * // block is injected into the orchestrator prompt as ${fasePolicyBlock}
 */
export type FasePolicy = {
  /** How to group phases. Ex: "1 fase por feature vertical", "1 fase por camada" */
  granularidade: string
  /** Criterion for "small enough phase" for this profile */
  criterioFaseAtomica: string
  /** Concrete example that orients the LLM */
  exemploNomeFase: string
  /** Anti-patterns to avoid */
  evitar: string[]
}

/**
 * Lookup table mapping each canonical architecture profile to its phase granularity policy.
 * Exactly 5 keys — one per canonical profile name (G6).
 *
 * Consumed by plan-feature/SKILL.md via `getRecommendationForProfile`:
 * - Read profile ONCE at the top of the skill
 * - Resolve policy via this lookup
 * - Render as markdown block via `renderFasePolicyBlock`
 * - Inject into orchestrator prompt
 */
export const FASE_POLICY_BY_PROFILE: Record<ArchitectureProfileName, FasePolicy> = {
  'vertical-slice': {
    granularidade: '1 fase = 1 feature vertical (UI + handler + types juntos)',
    criterioFaseAtomica: 'Uma feature inteira, ponta a ponta, deployável sozinha',
    exemploNomeFase: 'fase-02-feature-cadastro-cliente',
    evitar: [
      'Quebrar UMA feature em "fase de UI" + "fase de backend"',
      'Compartilhar fase entre features distintas',
    ],
  },
  'clean-architecture-ritual': {
    granularidade: '1 fase = 1 camada (Domain → Application → Infrastructure → Presentation)',
    criterioFaseAtomica: 'Uma camada da feature pronta, com testes de unidade próprios',
    exemploNomeFase: 'fase-02-application-use-case-cadastrar-cliente',
    evitar: [
      'Misturar Domain e Application na mesma fase',
      'Implementar Infrastructure antes da Application stabilizar',
    ],
  },
  'mvc-flat': {
    granularidade: '1 fase = 1 unidade MVC (controller + service + repository da mesma rota)',
    criterioFaseAtomica: 'Endpoint funcionando E2E com teste de integração',
    exemploNomeFase: 'fase-02-endpoint-post-clientes',
    evitar: [
      'Separar fase só de "modelo" sem endpoint que use',
      'Fase só de service sem controller',
    ],
  },
  'nextjs-app-router': {
    granularidade: '1 fase = 1 rota ou grupo de rotas relacionadas (`app/<rota>/page.tsx` + `route.ts`)',
    criterioFaseAtomica: 'Rota navegável + handlers de API associados',
    exemploNomeFase: 'fase-02-rota-clientes-listagem',
    evitar: [
      'Fase só de componente sem rota que renderize',
      'Misturar rotas de domínios distintos',
    ],
  },
  'unknown-mixed': {
    granularidade: 'Critério v5.2 (fase = unidade testável de 30min-2h, sem regra estrutural)',
    criterioFaseAtomica: 'Testável, atomicamente revertível, sizing 30min-2h',
    exemploNomeFase: 'fase-02-implementar-X',
    evitar: ['Fase de mais de 2h', 'Fase que toca mais de 5 arquivos'],
  },
}

/**
 * Fallback policy used when the architecture detector is disabled or no profile is detected.
 * Structurally identical to `unknown-mixed` entry, preserving v5.2 behavior (CA-04).
 */
export const FASE_POLICY_V52: FasePolicy = {
  granularidade: 'Critério v5.2 (fase = unidade testável de 30min-2h, sem regra estrutural)',
  criterioFaseAtomica: 'Testável, atomicamente revertível, sizing 30min-2h',
  exemploNomeFase: 'fase-02-implementar-X',
  evitar: ['Fase de mais de 2h', 'Fase que toca mais de 5 arquivos'],
}

/**
 * Renders the fase policy as a Markdown block ready to inject into the plan-feature prompt.
 * The orchestrator consumes this block as context that orients the LLM during phase generation.
 * It is NOT code that generates phases directly.
 *
 * @param policy - The resolved FasePolicy for the detected profile (or FASE_POLICY_V52 fallback).
 * @returns A markdown string with header, granularidade, criterio, exemplo, and evitar list.
 *
 * @example
 * const block = renderFasePolicyBlock(FASE_POLICY_BY_PROFILE['vertical-slice'])
 * // Inject into prompt: `${fasePolicyBlock}`
 */
export function renderFasePolicyBlock(policy: FasePolicy): string {
  return [
    '### Política de fases (perfil-aware)',
    '',
    `**Granularidade:** ${policy.granularidade}`,
    `**Critério de fase atômica:** ${policy.criterioFaseAtomica}`,
    `**Exemplo de nome de fase:** \`${policy.exemploNomeFase}\``,
    '',
    '**Evitar:**',
    ...policy.evitar.map((e) => `- ${e}`),
  ].join('\n')
}
