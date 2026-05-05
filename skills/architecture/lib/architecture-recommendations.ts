import type { ArchitectureProfileName } from '../../lib/manifest-types'

export type ArchitectureRecommendation = {
  headline: string
  rationale: string
  patterns: string[]
  caveats: string[]
}

export const ARCHITECTURE_RECOMMENDATIONS: Record<ArchitectureProfileName, ArchitectureRecommendation> = {
  'clean-architecture-ritual': {
    headline: 'Clean Architecture ritual detectada — recomendações priorizam coerência das camadas',
    rationale: 'Projeto com Domain/Application/Infrastructure/Presentation explícitas. Mantenha a barreira de imports.',
    patterns: ['Use cases por arquivo', 'DTOs entre Application e Presentation', 'Repositórios definidos no Domain, implementados na Infrastructure'],
    caveats: ['Cuidado com over-abstraction; nem toda use case precisa virar classe'],
  },
  'mvc-flat': {
    headline: 'MVC flat detectado — recomendações priorizam simplicidade e iteração rápida',
    rationale: 'Controllers/Services/Repositories diretos. Não introduza camadas extras sem evidência de dor.',
    patterns: ['Service contém regra de negócio; Controller só orquestra HTTP', 'Repository fala com banco diretamente'],
    caveats: ['Quando service > 300 linhas, considere extrair domain entities — não pular para Clean Architecture inteira'],
  },
  'vertical-slice': {
    headline: 'Vertical Slice detectado — recomendações priorizam isolamento por feature',
    rationale: 'Cada feature em pasta própria com tudo que precisa. Token tax baixo durante leitura.',
    patterns: ['Feature contém UI + handler + types juntos', 'Imports cruzando features são red flag (use shared/ explícito)'],
    caveats: ['Evite "shared/utils" virar god folder; promova para feature dedicada quando crescer'],
  },
  'nextjs-app-router': {
    headline: 'Next.js App Router detectado — recomendações seguem convenção do framework',
    rationale: 'Routing por filesystem, server components default, layouts aninhados. Trabalhe COM a convenção.',
    patterns: ['`app/<rota>/page.tsx` para páginas, `app/api/<rota>/route.ts` para handlers', 'Componentes compartilhados em `components/`'],
    caveats: ['"use client" só onde precisa; evitar export client component da raiz'],
  },
  'unknown-mixed': {
    headline: 'Perfil arquitetural não identificado com confiança — recomendações genéricas',
    rationale: 'Heurística não classificou. Pode ser projeto em transição, monorepo, ou estrutura customizada.',
    patterns: ['Rode `/anti-vibe-coding:detect-architecture` para reanalisar', 'Edite `.claude/architecture-profile.md` manualmente se souber o estilo'],
    caveats: ['Recomendações abaixo são as v5.2 originais — sem adaptação por perfil'],
  },
}

export const DEFAULT_RECOMMENDATION_V52: ArchitectureRecommendation = {
  headline: 'Recomendações arquiteturais (v5.2)',
  rationale: 'Modo dual desativado ou perfil não detectado. Conselhos seguem padrão v5.2.',
  patterns: ['SOLID com nuances pragmáticas', 'Composition over inheritance', 'Tell, don\'t ask'],
  caveats: ['Para adaptação por perfil, ative `architectureDetectorEnabled` no manifest'],
}

/**
 * Greenfield mode trigger: profile is unknown AND src/ is essentially empty.
 * Returns true when the project looks like a fresh start.
 *
 * Threshold: < 5 `.ts`/`.tsx` files in `src/` (documented as DI candidate in MEMORY.md).
 *
 * @param profile - The detected profile name, or null when flag is off.
 * @param srcFileCount - Count of `.ts`/`.tsx` files found recursively in `src/`.
 */
export function isGreenfield(profile: ArchitectureProfileName | null, srcFileCount: number): boolean {
  return profile === 'unknown-mixed' && srcFileCount < 5
}

export const GREENFIELD_RECOMMENDATION: ArchitectureRecommendation = {
  headline: 'Pasta `src/` vazia ou quase-vazia — sugestão Greenfield',
  rationale: 'Projeto novo é o único contexto onde o framework opina por default. Sugestão: vertical-slice + bounded contexts.',
  patterns: ['`src/features/<nome>/` por feature', 'Bounded contexts opinados — domínios claros', 'Shared kernel mínimo'],
  caveats: ['Sugestão, não imposição. Se preferir layered ou MVC, edite `architecture-profile.md` manualmente'],
}
