/**
 * Lookup table of "Estrutura sugerida" snippets for each architecture profile.
 * Used by write-prd/SKILL.md to inject profile-aware structure guidance into the PRD.
 *
 * Example usage:
 *   import { STRUCTURE_SNIPPETS, STRUCTURE_SNIPPET_V52 } from './lib/structure-snippets'
 *   const snippet = getRecommendationForProfile(profile?.profile ?? null, STRUCTURE_SNIPPETS, STRUCTURE_SNIPPET_V52)
 */
import type { ArchitectureProfileName } from '../../lib/manifest-types'

export const STRUCTURE_SNIPPETS: Record<ArchitectureProfileName, string> = {
  'vertical-slice': `### Estrutura sugerida (vertical-slice detectado)

Esta feature deve viver em \`src/features/<nome-da-feature>/\` com tudo que precisa
acoplado lateralmente:

\`\`\`
src/features/cadastro-cliente/
  ├─ ui.tsx              # componente React
  ├─ handler.ts          # lógica de negócio + IO
  ├─ types.ts            # tipos locais
  └─ __tests__/          # testes co-localizados
\`\`\`

Imports cruzando outras features são red flag — promova para \`src/shared/\` se necessário.`,

  'clean-architecture-ritual': `### Estrutura sugerida (clean-architecture-ritual detectado)

Esta feature atravessa as 4 camadas existentes do projeto:

\`\`\`
src/domain/aggregates/Cliente.ts          # entidade + invariantes
src/application/use-cases/CadastrarCliente.ts  # orquestração
src/infrastructure/repositories/ClienteRepository.ts  # IO
src/presentation/controllers/ClienteController.ts     # HTTP/UI
\`\`\`

Mantenha barreira de imports (Domain não conhece Infrastructure).`,

  'mvc-flat': `### Estrutura sugerida (mvc-flat detectado)

Esta feature segue o padrão controller/service/repository do projeto:

\`\`\`
src/controllers/cliente.controller.ts  # HTTP
src/services/cliente.service.ts        # regra de negócio
src/repositories/cliente.repository.ts # banco
src/entities/cliente.entity.ts         # modelo
\`\`\`

Service contém regra; controller orquestra HTTP.`,

  'nextjs-app-router': `### Estrutura sugerida (nextjs-app-router detectado)

Esta feature segue a convenção do App Router:

\`\`\`
src/app/clientes/page.tsx          # listagem (server component)
src/app/clientes/[id]/page.tsx     # detalhe
src/app/api/clientes/route.ts      # GET/POST
src/app/api/clientes/[id]/route.ts # GET/PATCH/DELETE
src/components/cliente-form.tsx    # cliente quando precisa "use client"
\`\`\`

Server components por default; "use client" só quando precisa interatividade.`,

  'unknown-mixed': `### Estrutura sugerida

Perfil arquitetural não identificado com confiança. Rode
\`/anti-vibe-coding:detect-architecture\` para reanalisar, ou edite
\`.claude/architecture-profile.md\` manualmente, ou prossiga com a estrutura
que fizer sentido para o projeto.`,
}

/**
 * Returns empty string when profile is null (CA-04 — v5.2 behavior).
 * The template omits the section entirely when this returns ''.
 */
export const STRUCTURE_SNIPPET_V52 = ''
