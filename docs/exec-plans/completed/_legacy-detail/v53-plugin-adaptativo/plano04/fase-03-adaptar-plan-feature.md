# Fase 03: Adaptar `plan-feature` (Granularidade de Fases por Perfil)

**Plano:** 04 — Modo Dual + 5 Princípios Universais
**Sizing:** 2h
**Depende de:** fase-01 (helper estável)
**Visual:** false

---

## O que esta fase entrega

Skill `/anti-vibe-coding:plan-feature` adapta a granularidade da geração de fases ao perfil arquitetural detectado: vertical-slice = 1 fase por feature vertical; layered (clean-architecture-ritual, mvc-flat) = 1 fase por camada; nextjs-app-router = 1 fase por rota/grupo de rotas; unknown-mixed = comportamento v5.2. Cobre o critério CA-05 do PRD.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/plan-feature/SKILL.md` | Modify | Bloco TS no topo: leitura UMA vez + injeção de `FasePolicy` no prompt; instruções condicionais via lookup |
| `anti-vibe-coding/skills/plan-feature/lib/fase-policy.ts` | Create | Lookup `Record<ArchitectureProfileName, FasePolicy>` + tipo `FasePolicy` + fallback v5.2 |
| `anti-vibe-coding/skills/plan-feature/lib/__tests__/fase-policy.test.ts` | Create | Testes de granularidade por perfil + CA-04 regression + CA-05 explícito |
| `anti-vibe-coding/skills/plan-feature/templates/plan-readme-template.md` | Modify | Adicionar seção "Política de fases (perfil-aware)" condicional via instrução do prompt |

---

## Implementacao

### Passo 1: Tipo `FasePolicy` e lookup

`FasePolicy` é o conjunto de instruções que o prompt do `plan-feature` injeta no contexto da geração — não é código que gera fases diretamente. A skill é markdown executável; o prompt resultante orienta a geração para o perfil detectado.

```typescript
import type { ArchitectureProfileName } from '../../lib/manifest-types'

export type FasePolicy = {
  /** Como agrupar fases. Ex: "1 fase por feature vertical", "1 fase por camada" */
  granularidade: string
  /** Critério de "fase pequena o suficiente" para este perfil */
  criterioFaseAtomica: string
  /** Exemplo concreto que orienta o LLM */
  exemploNomeFase: string
  /** Anti-padrões a evitar */
  evitar: string[]
}

export const FASE_POLICY_BY_PROFILE: Record<ArchitectureProfileName, FasePolicy> = {
  'vertical-slice': {
    granularidade: '1 fase = 1 feature vertical (UI + handler + types juntos)',
    criterioFaseAtomica: 'Uma feature inteira, ponta a ponta, deployável sozinha',
    exemploNomeFase: 'fase-02-feature-cadastro-cliente',
    evitar: ['Quebrar UMA feature em "fase de UI" + "fase de backend"', 'Compartilhar fase entre features distintas'],
  },
  'clean-architecture-ritual': {
    granularidade: '1 fase = 1 camada (Domain → Application → Infrastructure → Presentation)',
    criterioFaseAtomica: 'Uma camada da feature pronta, com testes de unidade próprios',
    exemploNomeFase: 'fase-02-application-use-case-cadastrar-cliente',
    evitar: ['Misturar Domain e Application na mesma fase', 'Implementar Infrastructure antes da Application stabilizar'],
  },
  'mvc-flat': {
    granularidade: '1 fase = 1 unidade MVC (controller + service + repository da mesma rota)',
    criterioFaseAtomica: 'Endpoint funcionando E2E com teste de integração',
    exemploNomeFase: 'fase-02-endpoint-post-clientes',
    evitar: ['Separar fase só de "modelo" sem endpoint que use', 'Fase só de service sem controller'],
  },
  'nextjs-app-router': {
    granularidade: '1 fase = 1 rota ou grupo de rotas relacionadas (`app/<rota>/page.tsx` + `route.ts`)',
    criterioFaseAtomica: 'Rota navegável + handlers de API associados',
    exemploNomeFase: 'fase-02-rota-clientes-listagem',
    evitar: ['Fase só de componente sem rota que renderize', 'Misturar rotas de domínios distintos'],
  },
  'unknown-mixed': {
    granularidade: 'Critério v5.2 (fase = unidade testável de 30min-2h, sem regra estrutural)',
    criterioFaseAtomica: 'Testável, atomicamente revertível, sizing 30min-2h',
    exemploNomeFase: 'fase-02-implementar-X',
    evitar: ['Fase de mais de 2h', 'Fase que toca mais de 5 arquivos'],
  },
}

export const FASE_POLICY_V52: FasePolicy = {
  granularidade: 'Critério v5.2 (fase = unidade testável de 30min-2h, sem regra estrutural)',
  criterioFaseAtomica: 'Testável, atomicamente revertível, sizing 30min-2h',
  exemploNomeFase: 'fase-02-implementar-X',
  evitar: ['Fase de mais de 2h', 'Fase que toca mais de 5 arquivos'],
}

/**
 * Renders the fase policy as a Markdown block ready to inject into the prompt.
 * The plan-feature skill consumes this block as context that orients the LLM
 * during fase generation — it is NOT code that generates fases directly.
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
```

### Passo 2: Modificar `plan-feature/SKILL.md`

Bloco TS no topo lê profile UMA vez, resolve política via lookup, e injeta o markdown renderizado no prompt do plan-feature como contexto adicional. O resto da skill (que invoca subagentes para criar planos) consome esse bloco como guideline.

```typescript
import { readArchitectureProfile, getRecommendationForProfile } from '../lib/read-architecture-profile'
import { FASE_POLICY_BY_PROFILE, FASE_POLICY_V52, renderFasePolicyBlock } from './lib/fase-policy'

// 1. UMA leitura
const profile = readArchitectureProfile()

// 2. UMA resolução
const policy = getRecommendationForProfile(
  profile?.profile ?? null,
  FASE_POLICY_BY_PROFILE,
  FASE_POLICY_V52,
)

// 3. Bloco markdown injetado no prompt do plan-feature
const fasePolicyBlock = renderFasePolicyBlock(policy)
```

A SKILL.md tem uma seção (após o front-matter, antes da "Phase 0: Read PRD") que injeta `${fasePolicyBlock}` no prompt do orchestrador. Subagentes spawned por plan-feature herdam esta diretriz via prompt.

### Passo 3: Atualizar `plan-readme-template.md`

Adicionar uma seção opcional no template que o orchestrador preenche com o bloco renderizado. Quando profile é `null`, o orchestrador omite essa seção (comportamento v5.2 preservado — CA-04).

```markdown
{- Bloco condicional: se modo dual ativo, injetar aqui o resultado de `renderFasePolicyBlock(policy)`. Se profile null, omitir esta seção inteira. -}

## Política de fases (perfil-aware)

{conteúdo do `renderFasePolicyBlock(policy)` ou seção omitida}

---
```

A linha de comentário (entre `{- ... -}`) é um marcador para o orchestrador decidir omissão. Sem branching no template — o orchestrador faz string substitution.

### Passo 4: Testes

```typescript
import { describe, expect, test } from 'bun:test'
import {
  FASE_POLICY_BY_PROFILE,
  FASE_POLICY_V52,
  renderFasePolicyBlock,
} from '../fase-policy'

describe('FASE_POLICY_BY_PROFILE lookup', () => {
  test('has exactly 5 keys (G6)', () => {
    expect(Object.keys(FASE_POLICY_BY_PROFILE).length).toBe(5)
  })

  test('CA-05: vertical-slice granularidade mentions feature vertical', () => {
    expect(FASE_POLICY_BY_PROFILE['vertical-slice'].granularidade).toMatch(/feature vertical/i)
  })

  test('CA-05: clean-architecture-ritual granularidade mentions camada', () => {
    expect(FASE_POLICY_BY_PROFILE['clean-architecture-ritual'].granularidade).toMatch(/camada/i)
  })

  test('mvc-flat granularidade mentions controller/service/repository', () => {
    expect(FASE_POLICY_BY_PROFILE['mvc-flat'].granularidade).toMatch(/controller|service|repository/i)
  })

  test('nextjs-app-router granularidade mentions rota', () => {
    expect(FASE_POLICY_BY_PROFILE['nextjs-app-router'].granularidade).toMatch(/rota/i)
  })

  test('unknown-mixed falls back to v5.2 critério', () => {
    expect(FASE_POLICY_BY_PROFILE['unknown-mixed'].granularidade).toMatch(/v5\.2/i)
  })

  test('every policy has at least 1 item in evitar[]', () => {
    for (const policy of Object.values(FASE_POLICY_BY_PROFILE)) {
      expect(policy.evitar.length).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('CA-04 regression: flag off uses FASE_POLICY_V52', () => {
  test('FASE_POLICY_V52 is structurally identical to unknown-mixed entry', () => {
    expect(FASE_POLICY_V52.granularidade).toBe(FASE_POLICY_BY_PROFILE['unknown-mixed'].granularidade)
  })
})

describe('renderFasePolicyBlock', () => {
  test('renders markdown with all 4 sections', () => {
    const block = renderFasePolicyBlock(FASE_POLICY_BY_PROFILE['vertical-slice'])
    expect(block).toMatch(/^### Política de fases/)
    expect(block).toMatch(/Granularidade:/)
    expect(block).toMatch(/Critério de fase atômica:/)
    expect(block).toMatch(/Exemplo de nome de fase:/)
    expect(block).toMatch(/Evitar:/)
  })

  test('renders evitar list with bullets', () => {
    const block = renderFasePolicyBlock(FASE_POLICY_BY_PROFILE['vertical-slice'])
    expect(block).toMatch(/^- /m)
  })
})
```

### Passo 5: Smoke test E2E (CA-05 explícito)

Teste de integração que invoca o bloco TS da SKILL.md (extraído manualmente) com manifest mock `vertical-slice` e verifica que o prompt resultante contém a string `1 fase = 1 feature vertical`. Versão simplificada — não invoca subagentes reais, apenas confirma que o bloco markdown chega corretamente formatado.

```typescript
test('CA-05 E2E: vertical-slice profile produces fase policy mentioning feature vertical', () => {
  const cwd = setupFixture('vertical-slice') // reutiliza fixture da fase-01
  // Simula bloco TS da SKILL.md
  const profile = readArchitectureProfile(cwd)
  const policy = getRecommendationForProfile(profile?.profile ?? null, FASE_POLICY_BY_PROFILE, FASE_POLICY_V52)
  const block = renderFasePolicyBlock(policy)

  expect(block).toMatch(/1 fase = 1 feature vertical/)
})
```

---

## Gotchas

- **G1 do plano:** lookup com 5 entradas, sem branching. SKILL.md tem UMA leitura + UMA resolução.
- **G2 do plano (CA-04):** profile null → `FASE_POLICY_V52` → template OMITE a seção "Política de fases (perfil-aware)" (string substitution). Output v5.2 idêntico.
- **G6 do plano:** 5 chaves exatas no lookup.
- **G7 do plano:** policies DESCREVEM perfil ("organize por feature"), não PRESCREVEM ("refatore para vertical-slice").
- **Local:** template `plan-readme-template.md` recebe um marcador `{- ... -}` para o orchestrador decidir omissão. Não introduz lógica condicional no markdown — é apenas um placeholder textual que o pipeline de geração consome.
- **Local:** subagentes do plan-feature rodam isolados; o `fasePolicyBlock` precisa ser passado via prompt para cada subagente, não é compartilhado por estado global. Garantir injeção no prompt do template do orchestrador.

---

## Verificacao

### TDD

- [ ] **RED:** Testes da política (8 casos) escritos antes de criar `fase-policy.ts`. Falham por module not found.
  - Comando: `bun run test -- --grep 'FASE_POLICY|renderFasePolicyBlock|CA-04 regression|CA-05 E2E'`
  - Resultado esperado: erros de import resolvidos com stub vazio + 8 assertion failures.

- [ ] **GREEN:** Lookup completa + render + smoke E2E. Todos passam.
  - Comando: `bun run test -- --grep 'FASE_POLICY|renderFasePolicyBlock|CA-04 regression|CA-05 E2E'`
  - Resultado esperado: `12 passed, 0 failed`.

### Checklist

- [ ] Lookup com 5 chaves; cada policy tem `granularidade`, `criterioFaseAtomica`, `exemploNomeFase`, `evitar[]`
- [ ] `vertical-slice` policy menciona explicitamente "feature vertical" (CA-05)
- [ ] `clean-architecture-ritual` policy menciona explicitamente "camada"
- [ ] `unknown-mixed` policy é estruturalmente igual ao `FASE_POLICY_V52` (deduplicação aceita)
- [ ] SKILL.md tem UMA chamada a `readArchitectureProfile()`
- [ ] Template `plan-readme-template.md` tem marcador `{- ... -}` para omissão da seção
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- --grep 'fase-policy'` retorna `12 passed, 0 failed`
- CA-05 verificável: manifest com `profile: vertical-slice` + flag true → bloco renderizado contém `1 fase = 1 feature vertical`
- CA-04 verificável: manifest com flag false → `readArchitectureProfile()` retorna null → template omite seção "Política de fases (perfil-aware)" → output idêntico ao v5.2

**Por humano:**
- Plano gerado por `/plan-feature` em projeto vertical-slice tem fases organizadas por feature (uma feature por fase). Plano gerado em clean-architecture-ritual tem fases por camada.

---

<!-- Gerado por /plan-feature em 2026-05-04 -->
