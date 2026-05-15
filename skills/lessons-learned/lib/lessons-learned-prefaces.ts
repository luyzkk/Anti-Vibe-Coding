// 2026-05-15 (Luiz/dev): lessons-learned-prefaces.ts — alinhado com PRD v6.3.0 §RF-SH-05
// Lookup table per-skill (G3): cada skill evolui seu mapa independente; sem God-table central.
import type { ArchitectureProfileName } from '../../lib/manifest-types'

export const LESSONS_LEARNED_PREFACE_BY_PROFILE: Partial<Record<ArchitectureProfileName, string>> = {
  'nextjs-app-router': [
    'Contexto detectado: Next.js App Router.',
    'Ao categorizar licões neste perfil, prefira a tag [Next-Specific] para entradas relacionadas a:',
    '- Server Components (boundary client/server, async rendering pitfalls)',
    '- Suspense e streaming (fallback race conditions, nested boundaries)',
    '- Hydration mismatches (diferenças entre SSR e CSR state)',
    '- App Router caching (stale cache em route handlers, revalidation gaps)',
    'Use [App Router] como subtag quando a licão não se aplica ao Pages Router.',
  ].join('\n'),
  'mvc-flat': [
    'Contexto detectado: MVC flat.',
    'Ao categorizar licões neste perfil, prefira a tag [MVC-Specific] para entradas relacionadas a:',
    '- Controller/repository coupling (bypass de service layer, fat controllers)',
    '- ORM N+1 (queries implícitas em loops, eager loading omitido)',
    '- Middleware ordering (auth antes de business logic, error handler global)',
    '- Acoplamento de camadas que dificulta teste unitário de service isolado',
  ].join('\n'),
  // outros profiles caem em DEFAULT — não preencher para forçar fallback explícito (CA-02)
}

// 2026-05-15 (Luiz/dev): DEFAULT preserva comportamento v6.2 (CA-02) — string vazia = sem preface.
export const DEFAULT_LESSONS_LEARNED_PREFACE = ''
