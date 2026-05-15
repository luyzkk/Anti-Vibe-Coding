// 2026-05-15 (Luiz/dev): security-prefaces.ts — alinhado com PRD v6.3.0 §RF-MH-05 + §Decisão #1
// Lookup table per-skill (G3): cada skill evolui seu mapa independente; sem God-table central.
import type { ArchitectureProfileName } from '../../lib/manifest-types'

export const SECURITY_PREFACE_BY_PROFILE: Partial<Record<ArchitectureProfileName, string>> = {
  'nextjs-app-router': [
    'Contexto detectado: Next.js App Router.',
    'Priorize análise de:',
    '- Server Actions (CSRF tokens, mutation auth)',
    '- API Route Handlers (rate limiting, input validation em app/api/**/route.ts)',
    '- Middleware (matchers, edge runtime constraints)',
    '- Use de "use server" e exposição acidental de funções server-only',
  ].join('\n'),
  'mvc-flat': [
    'Contexto detectado: MVC flat.',
    'Priorize análise de:',
    '- Controllers (input validation antes de Service)',
    '- Repository queries (SQL injection, parametrização)',
    '- Session/cookie handling no middleware HTTP',
    '- Secrets em config files vs env vars',
  ].join('\n'),
  // outros profiles caem em DEFAULT — não preencher para forçar fallback explícito (CA-02)
}

// 2026-05-15 (Luiz/dev): DEFAULT preserva comportamento v6.2 (CA-02) — string vazia = sem preface.
// Não paraphrasing do corpo da skill. Quando profile é null, skill roda como em v6.2.
export const DEFAULT_SECURITY_PREFACE = ''
