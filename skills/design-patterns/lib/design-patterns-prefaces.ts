// 2026-05-15 (Luiz/dev): design-patterns-prefaces.ts — alinhado com PRD v6.3.0 §RF-MH-05 + §Decisão #1
// Lookup table per-skill (G3): cada skill evolui seu mapa independente; sem God-table central.
import type { ArchitectureProfileName } from '../../lib/manifest-types'

export const DESIGN_PATTERNS_PREFACE_BY_PROFILE: Partial<Record<ArchitectureProfileName, string>> = {
  'nextjs-app-router': [
    'Contexto detectado: Next.js App Router.',
    'Priorize análise de:',
    '- RSC composition: Server Components como folha default, Client Components na borda',
    '- "use client" boundaries: minimizar superfície client-side, evitar "use client" em raiz',
    '- Data fetching patterns: fetch em Server Component vs React Query em Client Component',
    '- Colocation de lógica: page.tsx delega a componentes específicos, sem God Component',
  ].join('\n'),
  'mvc-flat': [
    'Contexto detectado: MVC flat.',
    'Priorize análise de:',
    '- Service layer purity: Service sem dependência de HTTP/framework (testável isolado)',
    '- Repository abstraction: banco de dados acessado SOMENTE via Repository',
    '- Controller thin: controller apenas parseia request e chama Service — sem lógica de domínio',
    '- Evitar anemic domain model: entidades com comportamento, não só DTOs',
  ].join('\n'),
  // outros profiles caem em DEFAULT — não preencher para forçar fallback explícito (CA-02)
}

// 2026-05-15 (Luiz/dev): DEFAULT preserva comportamento v6.2 (CA-02) — string vazia = sem preface.
// Não paraphrasing do corpo da skill. Quando profile é null, skill roda como em v6.2.
export const DEFAULT_DESIGN_PATTERNS_PREFACE = ''
