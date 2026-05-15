// 2026-05-15 (Luiz/dev): api-design-prefaces.ts — alinhado com PRD v6.3.0 §RF-MH-05 + §Decisão #1
// Lookup table per-skill (G3): cada skill evolui seu mapa independente; sem God-table central.
import type { ArchitectureProfileName } from '../../lib/manifest-types'

export const API_DESIGN_PREFACE_BY_PROFILE: Partial<Record<ArchitectureProfileName, string>> = {
  'nextjs-app-router': [
    'Contexto detectado: Next.js App Router.',
    'Priorize análise de:',
    '- Cada route handler em app/api/**/route.ts exporta GET, POST, PUT, DELETE explicitamente',
    '- Server Actions como API interna (uso de "use server", validação de input)',
    '- Edge runtime limits (sem Node.js nativo, sem file system)',
    '- Caching granular: fetch com cache, revalidatePath, revalidateTag',
  ].join('\n'),
  'mvc-flat': [
    'Contexto detectado: MVC flat.',
    'Priorize análise de:',
    '- Controller-Service-Repository: controller só orquestra HTTP, lógica fica no Service',
    '- REST resource modeling: substantivos, hierarquia de recursos, status codes semânticos',
    '- Validação no controller antes de delegar ao Service',
    '- Paginação e filtragem consistentes entre endpoints',
  ].join('\n'),
  // outros profiles caem em DEFAULT — não preencher para forçar fallback explícito (CA-02)
}

// 2026-05-15 (Luiz/dev): DEFAULT preserva comportamento v6.2 (CA-02) — string vazia = sem preface.
// Não paraphrasing do corpo da skill. Quando profile é null, skill roda como em v6.2.
export const DEFAULT_API_DESIGN_PREFACE = ''
