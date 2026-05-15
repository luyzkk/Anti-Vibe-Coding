// 2026-05-15 (Luiz/dev): system-design-prefaces.ts — alinhado com PRD v6.3.0 §RF-MH-05 + §Decisão #1
// Lookup table per-skill (G3): cada skill evolui seu mapa independente; sem God-table central.
import type { ArchitectureProfileName } from '../../lib/manifest-types'

export const SYSTEM_DESIGN_PREFACE_BY_PROFILE: Partial<Record<ArchitectureProfileName, string>> = {
  'nextjs-app-router': [
    'Contexto detectado: Next.js App Router.',
    'Priorize análise de:',
    '- ISR (Incremental Static Regeneration) e cache granular via revalidate',
    '- Edge cache e CDN no Vercel (stale-while-revalidate, surrogate keys)',
    '- Vercel constraints: função serverless sem estado, cold start latency',
    '- Serverless cold start: minimizar bundle size, evitar inicialização pesada',
  ].join('\n'),
  'mvc-flat': [
    'Contexto detectado: MVC flat.',
    'Priorize análise de:',
    '- Monolito stateful: sessões em memória/Redis, sticky sessions vs stateless',
    '- Scaling vertical primeiro: before adding horizontal complexity, maximize single node',
    '- Deploy tradicional: PM2, systemd, VPS — sem cold start, com estado persistente',
    '- Caching simples: Redis como cache de consulta, evitar cache invalidation complexity',
  ].join('\n'),
  // outros profiles caem em DEFAULT — não preencher para forçar fallback explícito (CA-02)
}

// 2026-05-15 (Luiz/dev): DEFAULT preserva comportamento v6.2 (CA-02) — string vazia = sem preface.
// Não paraphrasing do corpo da skill. Quando profile é null, skill roda como em v6.2.
export const DEFAULT_SYSTEM_DESIGN_PREFACE = ''
