# Fase 04: Adaptar `write-prd` (Snippets de Template por Perfil)

**Plano:** 04 — Modo Dual + 5 Princípios Universais
**Sizing:** 1.5h
**Depende de:** fase-01 (helper estável)
**Visual:** false

---

## O que esta fase entrega

Skill `/anti-vibe-coding:write-prd` injeta no PRD gerado um snippet "Estrutura sugerida" adaptado ao perfil arquitetural detectado (5 perfis × snippet). Quando flag desligada ou profile ausente, snippet não é injetado (CA-04 — output v5.2 preservado).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/write-prd/SKILL.md` | Modify | Bloco TS no topo: leitura UMA vez + injeção do snippet correto via lookup |
| `anti-vibe-coding/skills/write-prd/lib/structure-snippets.ts` | Create | Lookup `Record<ArchitectureProfileName, string>` com snippet de "Estrutura sugerida" + fallback v5.2 (string vazia) |
| `anti-vibe-coding/skills/write-prd/lib/__tests__/structure-snippets.test.ts` | Create | Testes: 5 perfis distintos + CA-04 (fallback vazio) |
| `anti-vibe-coding/skills/write-prd/templates/prd-template.md` | Modify | Adicionar marcador `{- structure-snippet -}` na seção "Solução" para o orchestrador substituir |

---

## Implementacao

### Passo 1: Lookup de snippets

Cada snippet é um bloco markdown curto (5-15 linhas) que descreve a estrutura típica do perfil — para servir de orientação visual no PRD, não de prescrição.

```typescript
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
```

### Passo 2: Modificar `write-prd/SKILL.md`

Bloco TS no topo: leitura UMA vez + lookup. Resultado injetado no prompt que orienta a geração do PRD.

```typescript
import { readArchitectureProfile, getRecommendationForProfile } from '../lib/read-architecture-profile'
import { STRUCTURE_SNIPPETS, STRUCTURE_SNIPPET_V52 } from './lib/structure-snippets'

// 1. UMA leitura
const profile = readArchitectureProfile()

// 2. UMA resolução
const structureSnippet = getRecommendationForProfile(
  profile?.profile ?? null,
  STRUCTURE_SNIPPETS,
  STRUCTURE_SNIPPET_V52,
)

// 3. Snippet injetado no prompt do write-prd como guideline
// O prompt instrui o LLM a inserir esse bloco na seção "Solução" do PRD se != ''
```

### Passo 3: Atualizar `prd-template.md`

Adicionar marcador na seção "Solução" para o orchestrador substituir/omitir.

```markdown
## Solução

{descrição livre da solução, escrita pelo dev/IA durante write-prd}

{- structure-snippet -}

---
```

O marcador `{- structure-snippet -}` é substituído pelo conteúdo de `structureSnippet` durante a geração — quando string vazia (flag off ou profile null), o marcador é removido sem deixar lacuna visual.

### Passo 4: Testes

```typescript
import { describe, expect, test } from 'bun:test'
import { STRUCTURE_SNIPPETS, STRUCTURE_SNIPPET_V52 } from '../structure-snippets'

describe('STRUCTURE_SNIPPETS lookup', () => {
  test('has exactly 5 keys (G6)', () => {
    expect(Object.keys(STRUCTURE_SNIPPETS).length).toBe(5)
  })

  test('all 5 snippets are non-empty strings', () => {
    for (const snippet of Object.values(STRUCTURE_SNIPPETS)) {
      expect(snippet.length).toBeGreaterThan(0)
    }
  })

  test('vertical-slice snippet mentions src/features/', () => {
    expect(STRUCTURE_SNIPPETS['vertical-slice']).toMatch(/src\/features\//)
  })

  test('clean-architecture-ritual snippet mentions Domain/Application/Infrastructure/Presentation', () => {
    const snippet = STRUCTURE_SNIPPETS['clean-architecture-ritual']
    expect(snippet).toMatch(/domain/i)
    expect(snippet).toMatch(/application/i)
    expect(snippet).toMatch(/infrastructure/i)
    expect(snippet).toMatch(/presentation|controller/i)
  })

  test('mvc-flat snippet mentions controllers/services/repositories', () => {
    const snippet = STRUCTURE_SNIPPETS['mvc-flat']
    expect(snippet).toMatch(/controller/i)
    expect(snippet).toMatch(/service/i)
    expect(snippet).toMatch(/repositor/i)
  })

  test('nextjs-app-router snippet mentions app/ and route.ts', () => {
    const snippet = STRUCTURE_SNIPPETS['nextjs-app-router']
    expect(snippet).toMatch(/app\//)
    expect(snippet).toMatch(/route\.ts/)
  })

  test('unknown-mixed snippet suggests running detect-architecture', () => {
    expect(STRUCTURE_SNIPPETS['unknown-mixed']).toMatch(/detect-architecture/)
  })

  test('every snippet starts with ### Estrutura sugerida', () => {
    for (const snippet of Object.values(STRUCTURE_SNIPPETS)) {
      expect(snippet).toMatch(/^### Estrutura sugerida/)
    }
  })
})

describe('CA-04 regression: flag off uses empty snippet', () => {
  test('STRUCTURE_SNIPPET_V52 is empty string', () => {
    expect(STRUCTURE_SNIPPET_V52).toBe('')
  })

  test('empty snippet means template omits the section entirely', () => {
    // simulação: replace de marcador com string vazia
    const template = '## Solução\n\nXXX\n\n{- structure-snippet -}\n\n---'
    const rendered = template.replace('{- structure-snippet -}', STRUCTURE_SNIPPET_V52)
    expect(rendered).not.toMatch(/structure-snippet/)
    expect(rendered).not.toMatch(/Estrutura sugerida/)
  })
})
```

---

## Gotchas

- **G1 do plano:** lookup com 5 entradas, sem branching. SKILL.md tem UMA leitura + UMA resolução.
- **G2 do plano (CA-04):** profile null → snippet = `''` → template omite seção (string substitution remove o marcador inteiro). PRD gerado é idêntico ao v5.2.
- **G6 do plano:** 5 chaves no lookup.
- **G7 do plano:** snippets DESCREVEM ("a feature deve viver em..."), com tom de orientação. Não há "refatore o projeto inteiro".
- **Local:** marcador `{- structure-snippet -}` precisa de teste explícito de substituição limpa quando snippet é `''` — sem deixar `\n\n\n` extras nem o próprio marcador.
- **Local:** snippets contêm blocos triple-backtick aninhados — atenção ao escape ao trabalhar com a string em TS (uso de `\`\`\``  literal já está correto via template literal interno).

---

## Verificacao

### TDD

- [ ] **RED:** Testes (lookup com 5 perfis distintos + CA-04 + estrutura inicial) escritos antes do `structure-snippets.ts`. Falham por module not found.
  - Comando: `bun run test -- --grep 'STRUCTURE_SNIPPETS|CA-04 regression'`
  - Resultado esperado: erros de import + 9 assertion failures.

- [ ] **GREEN:** Lookup completa + fallback empty + template marker. Todos passam.
  - Comando: `bun run test -- --grep 'STRUCTURE_SNIPPETS|CA-04 regression'`
  - Resultado esperado: `9 passed, 0 failed`.

### Checklist

- [ ] Lookup com 5 chaves
- [ ] Cada snippet começa com `### Estrutura sugerida`
- [ ] `STRUCTURE_SNIPPET_V52` é string vazia (`''`)
- [ ] `prd-template.md` contém marcador `{- structure-snippet -}` na seção "Solução"
- [ ] Substituição com snippet vazio NÃO deixa `\n\n\n` extras (verificar via teste textual)
- [ ] SKILL.md tem UMA chamada a `readArchitectureProfile()`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- --grep 'structure-snippets'` retorna `9 passed, 0 failed`
- Manifest com `profile: vertical-slice` + flag true → PRD gerado contém a string `src/features/<nome-da-feature>/`
- Manifest com flag false → PRD gerado NÃO contém a string `Estrutura sugerida` (CA-04 — comportamento v5.2)
- `grep -c '{- structure-snippet -}' anti-vibe-coding/skills/write-prd/templates/prd-template.md` retorna `1`

**Por humano:**
- PRD gerado em projeto Next.js App Router tem snippet com `app/<rota>/page.tsx`; PRD em projeto MVC tem snippet com `controllers/services/repositories`. Dev percebe imediatamente que o template "fala a linguagem" do projeto.

---

<!-- Gerado por /plan-feature em 2026-05-04 -->
