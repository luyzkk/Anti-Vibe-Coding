// 2026-05-15 (Luiz/dev): decision-registry-prefaces.ts — alinhado com PRD v6.3.0 §RF-SH-05
// Lookup table per-skill (G3): cada skill evolui seu mapa independente; sem God-table central.
import type { ArchitectureProfileName } from '../../lib/manifest-types'

export const DECISION_REGISTRY_PREFACE_BY_PROFILE: Partial<Record<ArchitectureProfileName, string>> = {
  'nextjs-app-router': [
    'Contexto detectado: Next.js App Router.',
    'Convenção de ADRs para este perfil:',
    '- Armazene ADRs em docs/design-docs/ADR-NNNN-*.md',
    '- Exemplos de decisões relevantes: Server Components vs Client Components,',
    '  edge runtime vs Node.js runtime, ISR vs SSR vs SSG, caching layers.',
    '- App Router introduz novos trade-offs de estado e data-fetching que merecem registro.',
  ].join('\n'),
  'mvc-flat': [
    'Contexto detectado: MVC flat.',
    'Convenção de ADRs para este perfil:',
    '- Armazene ADRs em docs/design-docs/ ou .claude/decisions.md',
    '- Exemplos de decisões relevantes: escolha de framework HTTP (Express/Fastify/Hono),',
    '  ORM vs query builder, estratégia de deployment, autenticação via session vs JWT.',
    '- Foco em decisões de camada (controller → service → repository) e acoplamento.',
  ].join('\n'),
  // outros profiles caem em DEFAULT — não preencher para forçar fallback explícito (CA-02)
}

// 2026-05-15 (Luiz/dev): DEFAULT preserva comportamento v6.2 (CA-02) — string vazia = sem preface.
export const DEFAULT_DECISION_REGISTRY_PREFACE = ''
