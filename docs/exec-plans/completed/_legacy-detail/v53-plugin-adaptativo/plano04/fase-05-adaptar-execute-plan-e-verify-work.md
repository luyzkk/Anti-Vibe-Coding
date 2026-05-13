# Fase 05: Adaptar `execute-plan` e `verify-work`

**Plano:** 04 — Modo Dual + 5 Princípios Universais
**Sizing:** 1.5h
**Depende de:** fase-01 (helper estável)
**Visual:** false

---

## O que esta fase entrega

Skill `/anti-vibe-coding:execute-plan` respeita o perfil ao gerar fases dinamicamente (consome a mesma `FASE_POLICY_BY_PROFILE` da fase-03 quando precisa subdividir tarefas mid-execution); skill `/anti-vibe-coding:verify-work` mede aderência ao perfil detectado SEM prescrever refactor (apenas reporta divergências como observação). Cobre o uso do modo dual nas 2 últimas das 5 skills estruturantes.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/execute-plan/SKILL.md` | Modify | Bloco TS no topo: leitura UMA vez + injeção de `FasePolicy` reutilizada da fase-03 |
| `anti-vibe-coding/skills/verify-work/SKILL.md` | Modify | Bloco TS no topo + lookup `ADHERENCE_CHECKS` por perfil; render de checklist descritivo (não prescritivo) |
| `anti-vibe-coding/skills/verify-work/lib/adherence-checks.ts` | Create | Lookup `Record<ArchitectureProfileName, AdherenceCheck>` + tipo + fallback v5.2 (sem checks) |
| `anti-vibe-coding/skills/verify-work/lib/__tests__/adherence-checks.test.ts` | Create | Testes: 5 perfis com checks distintos + CA-04 (fallback vazio) + tom descritivo (sem "refatore", "converta") |

---

## Implementacao

### Passo 1: `execute-plan` reutiliza `FasePolicy` da fase-03

`execute-plan` ocasionalmente subdivide uma fase em sub-tarefas durante execução (ex: "esta fase tem 3 commits naturais"). Quando precisa fazer essa subdivisão, o critério é o mesmo de `plan-feature`. Reutilizar a lookup table evita duplicação.

```typescript
import { readArchitectureProfile, getRecommendationForProfile } from '../lib/read-architecture-profile'
// Reutiliza lookup da fase-03 (cross-skill import dentro do plugin é OK)
import { FASE_POLICY_BY_PROFILE, FASE_POLICY_V52, renderFasePolicyBlock } from '../plan-feature/lib/fase-policy'

// 1. UMA leitura
const profile = readArchitectureProfile()

// 2. UMA resolução (mesma política da plan-feature)
const policy = getRecommendationForProfile(
  profile?.profile ?? null,
  FASE_POLICY_BY_PROFILE,
  FASE_POLICY_V52,
)

const fasePolicyBlock = renderFasePolicyBlock(policy)
// Block injetado no prompt do execute-plan como guideline para subdivisão de fases mid-flight
```

Nenhum código novo, nenhum lookup novo — apenas import cruzado dentro do plugin. Testar com smoke E2E que `execute-plan` no perfil `vertical-slice` não tenta subdividir feature em camadas.

### Passo 2: `verify-work` ganha lookup `ADHERENCE_CHECKS`

Novo conceito: `AdherenceCheck` é uma lista de perguntas DESCRITIVAS que o `verify-work` usa para reportar divergências do perfil sem prescrever fix. Cada check é uma frase curta orientada à observação.

```typescript
import type { ArchitectureProfileName } from '../../lib/manifest-types'

export type AdherenceCheck = {
  /** Headline da seção de aderência no relatório */
  headline: string
  /** Lista de perguntas descritivas que o verify-work itera durante review */
  checks: string[]
}

export const ADHERENCE_CHECKS: Record<ArchitectureProfileName, AdherenceCheck> = {
  'clean-architecture-ritual': {
    headline: 'Aderência ao perfil Clean Architecture (informativa, não prescritiva)',
    checks: [
      'Os imports respeitam a barreira Domain → Application → Infrastructure → Presentation?',
      'Use cases na Application não vazam tipos da Infrastructure?',
      'Testes de unidade do Domain rodam sem montar Infrastructure?',
    ],
  },
  'mvc-flat': {
    headline: 'Aderência ao perfil MVC flat (informativa)',
    checks: [
      'Controllers ainda magros (HTTP-only) ou começaram a conter regra de negócio?',
      'Services contêm a lógica do domínio ou viraram passthrough do repository?',
      'Repositories falam só com o banco, sem regras de negócio espalhadas?',
    ],
  },
  'vertical-slice': {
    headline: 'Aderência ao perfil Vertical Slice (informativa)',
    checks: [
      'Há imports cruzando features que poderiam estar em `shared/`?',
      'A feature está auto-contida (UI + handler + types juntos)?',
      'Existe algum "shared/utils" que está virando god folder?',
    ],
  },
  'nextjs-app-router': {
    headline: 'Aderência ao perfil Next.js App Router (informativa)',
    checks: [
      '"use client" está presente apenas em componentes que precisam interatividade?',
      'Server actions vs route handlers — cada um no lugar certo?',
      'Layouts aninhados refletem hierarquia de UI ou só rota?',
    ],
  },
  'unknown-mixed': {
    headline: 'Perfil arquitetural não identificado — checks genéricos',
    checks: [
      'Os arquivos novos seguem o padrão observado nos arquivos vizinhos?',
      'Há regressão visível em testes do módulo afetado?',
    ],
  },
}

export const ADHERENCE_CHECKS_V52: AdherenceCheck = {
  headline: '',
  checks: [],
}

/**
 * Renders the adherence section as Markdown for inclusion in verify-work's
 * report. When checks[] is empty, returns '' so the section is omitted entirely
 * (CA-04 — v5.2 behavior).
 *
 * Tone is DESCRIPTIVE, not PRESCRIPTIVE — the section reports observations,
 * not refactor commands.
 */
export function renderAdherenceSection(check: AdherenceCheck): string {
  if (check.checks.length === 0) return ''
  return [
    `### ${check.headline}`,
    '',
    ...check.checks.map((q) => `- [ ] ${q}`),
  ].join('\n')
}
```

### Passo 3: Modificar `verify-work/SKILL.md`

Bloco TS no topo: leitura UMA vez, lookup, injeção do markdown na seção apropriada do relatório.

```typescript
import { readArchitectureProfile, getRecommendationForProfile } from '../lib/read-architecture-profile'
import { ADHERENCE_CHECKS, ADHERENCE_CHECKS_V52, renderAdherenceSection } from './lib/adherence-checks'

const profile = readArchitectureProfile()
const adherenceCheck = getRecommendationForProfile(
  profile?.profile ?? null,
  ADHERENCE_CHECKS,
  ADHERENCE_CHECKS_V52,
)
const adherenceSection = renderAdherenceSection(adherenceCheck)
// Section injetada no relatório do verify-work entre "Anti-vibe Review" e "Test Quality Audit"
```

### Passo 4: Testes

```typescript
import { describe, expect, test } from 'bun:test'
import {
  ADHERENCE_CHECKS,
  ADHERENCE_CHECKS_V52,
  renderAdherenceSection,
} from '../adherence-checks'

describe('ADHERENCE_CHECKS lookup', () => {
  test('has exactly 5 keys (G6)', () => {
    expect(Object.keys(ADHERENCE_CHECKS).length).toBe(5)
  })

  test('every profile has at least 1 check', () => {
    for (const check of Object.values(ADHERENCE_CHECKS)) {
      expect(check.checks.length).toBeGreaterThanOrEqual(1)
    }
  })

  test('vertical-slice checks mention shared or features', () => {
    const checks = ADHERENCE_CHECKS['vertical-slice'].checks.join(' ')
    expect(checks).toMatch(/shared|features/i)
  })

  test('clean-architecture-ritual checks mention barreira', () => {
    const checks = ADHERENCE_CHECKS['clean-architecture-ritual'].checks.join(' ')
    expect(checks).toMatch(/barreira|domain/i)
  })

  test('G7 — checks are DESCRIPTIVE, not PRESCRIPTIVE (no "refatore", "converta", "altere para")', () => {
    for (const profileChecks of Object.values(ADHERENCE_CHECKS)) {
      const allText = profileChecks.checks.join(' ')
      expect(allText).not.toMatch(/refator/i)
      expect(allText).not.toMatch(/converta/i)
      expect(allText).not.toMatch(/altere para/i)
      expect(allText).not.toMatch(/migre/i)
    }
  })
})

describe('CA-04 regression: flag off renders empty section', () => {
  test('ADHERENCE_CHECKS_V52 has empty checks[]', () => {
    expect(ADHERENCE_CHECKS_V52.checks.length).toBe(0)
  })

  test('renderAdherenceSection returns empty string for empty checks', () => {
    expect(renderAdherenceSection(ADHERENCE_CHECKS_V52)).toBe('')
  })
})

describe('renderAdherenceSection', () => {
  test('renders with headline + bullet checks', () => {
    const md = renderAdherenceSection(ADHERENCE_CHECKS['vertical-slice'])
    expect(md).toMatch(/^### /)
    expect(md).toMatch(/^- \[ \] /m)
  })

  test('preserves order of checks in output', () => {
    const check = ADHERENCE_CHECKS['mvc-flat']
    const md = renderAdherenceSection(check)
    const lines = md.split('\n').filter((l) => l.startsWith('- [ ]'))
    expect(lines.length).toBe(check.checks.length)
  })
})
```

### Passo 5: Smoke test cross-skill (execute-plan)

Garantir que `execute-plan` reutiliza `FASE_POLICY_BY_PROFILE` corretamente.

```typescript
test('execute-plan imports fase-policy from plan-feature without duplicating lookup', () => {
  // Verifica que não há lookup duplicada — apenas import cruzado
  const skillContent = readFileSync(
    'anti-vibe-coding/skills/execute-plan/SKILL.md',
    'utf8',
  )
  expect(skillContent).toMatch(/from ['"]\.\.\/plan-feature\/lib\/fase-policy['"]/)
})
```

---

## Gotchas

- **G1 do plano:** `verify-work` lookup com 5 entradas, UMA leitura, UMA resolução. `execute-plan` reutiliza o lookup da fase-03 sem duplicar (import cruzado).
- **G2 do plano (CA-04):** `ADHERENCE_CHECKS_V52.checks = []` → `renderAdherenceSection` retorna `''` → seção omitida no relatório. Output v5.2 idêntico.
- **G7 do plano (CRÍTICO):** checks são perguntas descritivas, não comandos. Teste explícito veta palavras "refatore", "converta", "altere para", "migre" (assertion via regex).
- **Local:** `verify-work` JÁ TEM várias seções (anti-vibe-review, test quality audit). Aderência é UMA seção nova injetada — ordem importa para o relatório ficar lido top-down. Decidir DI: posicionar antes ou depois de "Anti-vibe Review"? Default: depois (review primeiro, aderência como contexto adicional).
- **Local:** import cruzado `execute-plan/SKILL.md → plan-feature/lib/fase-policy` cria acoplamento. Aceitável dentro do mesmo plugin; documentar em MEMORY.md como decisão consciente.

---

## Verificacao

### TDD

- [ ] **RED:** Testes (5 perfis + CA-04 + tom descritivo + cross-skill import) escritos antes de criar `adherence-checks.ts`. Falham por module not found.
  - Comando: `bun run test -- --grep 'ADHERENCE_CHECKS|CA-04 regression|execute-plan imports'`
  - Resultado esperado: erros de import + 8 assertion failures.

- [ ] **GREEN:** Lookup completa + render + cross-skill import. Todos passam.
  - Comando: `bun run test -- --grep 'ADHERENCE_CHECKS|CA-04 regression|execute-plan imports'`
  - Resultado esperado: `10 passed, 0 failed`.

### Checklist

- [ ] `ADHERENCE_CHECKS` com 5 chaves; cada um com `checks[]` não vazio
- [ ] `ADHERENCE_CHECKS_V52.checks` é `[]`
- [ ] `renderAdherenceSection({ checks: [] })` retorna `''`
- [ ] Nenhum check contém palavras "refatore", "converta", "altere para", "migre" (G7)
- [ ] `execute-plan/SKILL.md` importa de `../plan-feature/lib/fase-policy` (sem duplicar lookup)
- [ ] Ambas as SKILL.md têm UMA chamada a `readArchitectureProfile()`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- --grep 'adherence-checks|fase-policy cross-skill'` retorna `10 passed, 0 failed`
- Manifest `profile: vertical-slice` + flag true → relatório do `verify-work` contém a string `Aderência ao perfil Vertical Slice`
- Manifest flag false → relatório NÃO contém a string `Aderência ao perfil` (CA-04)
- `grep -c "from '..\\/plan-feature\\/lib\\/fase-policy'" anti-vibe-coding/skills/execute-plan/SKILL.md` retorna `≥ 1`
- Regex test: nenhuma das 5 entradas de `ADHERENCE_CHECKS` contém `/refator|converta|altere para|migre/i`

**Por humano:**
- Relatório de `verify-work` em projeto vertical-slice tem checklist final de aderência ao perfil (3 perguntas descritivas). Dev sente que o relatório "respeita" o perfil em vez de empurrar refactor.

---

<!-- Gerado por /plan-feature em 2026-05-04 -->
