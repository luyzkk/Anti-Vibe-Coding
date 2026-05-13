# Fase 02: Adaptar `architecture` Skill (5 Perfis × Output)

**Plano:** 04 — Modo Dual + 5 Princípios Universais
**Sizing:** 1.5h
**Depende de:** fase-01 (helper estável + auxiliar genérico)
**Visual:** false

---

## O que esta fase entrega

Skill `/anti-vibe-coding:architecture` com recommendation table adaptada por perfil (5 entradas), substituindo a UMA linha do tracer bullet do Plano 01 fase-06 por um bloco completo; trata Greenfield mode (CA-06) quando `profile = unknown-mixed` E `src/` vazia.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/architecture/SKILL.md` | Modify | Substituir bloco do tracer bullet por leitura UMA vez + lookup table; adicionar Greenfield branch |
| `anti-vibe-coding/skills/architecture/lib/architecture-recommendations.ts` | Create | Lookup table dedicada (5 perfis × recommendation), exportada para testes |
| `anti-vibe-coding/skills/architecture/lib/__tests__/architecture-recommendations.test.ts` | Create | Testes: 5 perfis retornam strings distintas + fallback v5.2 quando flag off + Greenfield só com src/ vazia |
| `anti-vibe-coding/skills/architecture/lib/__fixtures__/empty-src/.gitkeep` | Create | Fixture de `src/` vazia (Greenfield trigger) |
| `anti-vibe-coding/skills/architecture/lib/__fixtures__/populated-src/index.ts` | Create | Fixture de `src/` populada (Greenfield NÃO ativa) |

---

## Implementacao

### Passo 1: Lookup table dedicada

A lookup table NÃO mora dentro de `SKILL.md` — mora em `lib/architecture-recommendations.ts` para permitir testes unitários via import direto. SKILL.md apenas importa e orquestra.

```typescript
import type { ArchitectureProfileName } from '../../lib/manifest-types'

export type ArchitectureRecommendation = {
  headline: string
  rationale: string
  patterns: string[]
  caveats: string[]
}

export const ARCHITECTURE_RECOMMENDATIONS: Record<ArchitectureProfileName, ArchitectureRecommendation> = {
  'clean-architecture-ritual': {
    headline: 'Clean Architecture ritual detectada — recomendações priorizam coerência das camadas',
    rationale: 'Projeto com Domain/Application/Infrastructure/Presentation explícitas. Mantenha a barreira de imports.',
    patterns: ['Use cases por arquivo', 'DTOs entre Application e Presentation', 'Repositórios definidos no Domain, implementados na Infrastructure'],
    caveats: ['Cuidado com over-abstraction; nem toda use case precisa virar classe'],
  },
  'mvc-flat': {
    headline: 'MVC flat detectado — recomendações priorizam simplicidade e iteração rápida',
    rationale: 'Controllers/Services/Repositories diretos. Não introduza camadas extras sem evidência de dor.',
    patterns: ['Service contém regra de negócio; Controller só orquestra HTTP', 'Repository fala com banco diretamente'],
    caveats: ['Quando service > 300 linhas, considere extrair domain entities — não pular para Clean Architecture inteira'],
  },
  'vertical-slice': {
    headline: 'Vertical Slice detectado — recomendações priorizam isolamento por feature',
    rationale: 'Cada feature em pasta própria com tudo que precisa. Token tax baixo durante leitura.',
    patterns: ['Feature contém UI + handler + types juntos', 'Imports cruzando features são red flag (use shared/ explícito)'],
    caveats: ['Evite "shared/utils" virar god folder; promova para feature dedicada quando crescer'],
  },
  'nextjs-app-router': {
    headline: 'Next.js App Router detectado — recomendações seguem convenção do framework',
    rationale: 'Routing por filesystem, server components default, layouts aninhados. Trabalhe COM a convenção.',
    patterns: ['`app/<rota>/page.tsx` para páginas, `app/api/<rota>/route.ts` para handlers', 'Componentes compartilhados em `components/`'],
    caveats: ['"use client" só onde precisa; evitar export client component da raiz'],
  },
  'unknown-mixed': {
    headline: 'Perfil arquitetural não identificado com confiança — recomendações genéricas',
    rationale: 'Heurística não classificou. Pode ser projeto em transição, monorepo, ou estrutura customizada.',
    patterns: ['Rode `/anti-vibe-coding:detect-architecture` para reanalisar', 'Edite `.claude/architecture-profile.md` manualmente se souber o estilo'],
    caveats: ['Recomendações abaixo são as v5.2 originais — sem adaptação por perfil'],
  },
}

export const DEFAULT_RECOMMENDATION_V52: ArchitectureRecommendation = {
  headline: 'Recomendações arquiteturais (v5.2)',
  rationale: 'Modo dual desativado ou perfil não detectado. Conselhos seguem padrão v5.2.',
  patterns: ['SOLID com nuances pragmáticas', 'Composition over inheritance', 'Tell, don\'t ask'],
  caveats: ['Para adaptação por perfil, ative `architectureDetectorEnabled` no manifest'],
}

/**
 * Greenfield mode trigger: profile is unknown AND src/ is essentially empty.
 * Returns true when the project looks like a fresh start.
 */
export function isGreenfield(profile: ArchitectureProfileName | null, srcFileCount: number): boolean {
  return profile === 'unknown-mixed' && srcFileCount < 5
}

export const GREENFIELD_RECOMMENDATION: ArchitectureRecommendation = {
  headline: 'Pasta `src/` vazia ou quase-vazia — sugestão Greenfield',
  rationale: 'Projeto novo é o único contexto onde o framework opina por default. Sugestão: vertical-slice + bounded contexts.',
  patterns: ['`src/features/<nome>/` por feature', 'Bounded contexts opinados — domínios claros', 'Shared kernel mínimo'],
  caveats: ['Sugestão, não imposição. Se preferir layered ou MVC, edite `architecture-profile.md` manualmente'],
}
```

### Passo 2: Modificar `architecture/SKILL.md` para usar lookup

O bloco TS no topo da skill substitui a UMA linha do tracer bullet (Plano 01 fase-06) por leitura completa.

```typescript
// Bloco TS no topo de SKILL.md (substitui o do tracer bullet)
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { readArchitectureProfile, getRecommendationForProfile } from '../lib/read-architecture-profile'
import {
  ARCHITECTURE_RECOMMENDATIONS,
  DEFAULT_RECOMMENDATION_V52,
  GREENFIELD_RECOMMENDATION,
  isGreenfield,
} from './lib/architecture-recommendations'

// 1. UMA leitura
const profile = readArchitectureProfile()

// 2. Contagem de arquivos de src/ (Greenfield trigger)
let srcFileCount = 0
try {
  srcFileCount = readdirSync(join(process.cwd(), 'src'), { recursive: true })
    .filter((f) => typeof f === 'string' && /\.(ts|tsx)$/.test(f)).length
} catch {
  srcFileCount = 0 // src/ ausente conta como Greenfield candidate
}

// 3. UMA resolução com lookup
const recommendation = isGreenfield(profile?.profile ?? null, srcFileCount)
  ? GREENFIELD_RECOMMENDATION
  : getRecommendationForProfile(profile?.profile ?? null, ARCHITECTURE_RECOMMENDATIONS, DEFAULT_RECOMMENDATION_V52)

// 4. Skill renderiza headline + rationale + patterns + caveats
```

A skill em si (corpo markdown abaixo do bloco) usa as 4 propriedades como insumos textuais para a recomendação que dá ao usuário. Sem branching profundo no markdown — apenas template substitution.

### Passo 3: Testes

```typescript
import { describe, expect, test } from 'bun:test'
import {
  ARCHITECTURE_RECOMMENDATIONS,
  DEFAULT_RECOMMENDATION_V52,
  GREENFIELD_RECOMMENDATION,
  isGreenfield,
} from '../architecture-recommendations'

describe('ARCHITECTURE_RECOMMENDATIONS lookup', () => {
  test('has exactly 5 keys (G6 — D4 of PRD)', () => {
    expect(Object.keys(ARCHITECTURE_RECOMMENDATIONS).length).toBe(5)
  })

  test('all 5 profiles produce distinct headlines', () => {
    const headlines = Object.values(ARCHITECTURE_RECOMMENDATIONS).map((r) => r.headline)
    expect(new Set(headlines).size).toBe(5)
  })

  test('vertical-slice headline mentions isolamento por feature', () => {
    expect(ARCHITECTURE_RECOMMENDATIONS['vertical-slice'].headline).toMatch(/feature/i)
  })

  test('clean-architecture-ritual headline mentions camadas', () => {
    expect(ARCHITECTURE_RECOMMENDATIONS['clean-architecture-ritual'].headline).toMatch(/camada/i)
  })

  test('every profile has at least 1 pattern and 1 caveat', () => {
    for (const rec of Object.values(ARCHITECTURE_RECOMMENDATIONS)) {
      expect(rec.patterns.length).toBeGreaterThanOrEqual(1)
      expect(rec.caveats.length).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('isGreenfield (CA-06)', () => {
  test('returns true when profile is unknown-mixed AND src has < 5 files', () => {
    expect(isGreenfield('unknown-mixed', 0)).toBe(true)
    expect(isGreenfield('unknown-mixed', 4)).toBe(true)
  })

  test('returns false when src has 5+ files even with unknown-mixed', () => {
    expect(isGreenfield('unknown-mixed', 5)).toBe(false)
    expect(isGreenfield('unknown-mixed', 100)).toBe(false)
  })

  test('returns false for any non-unknown-mixed profile', () => {
    expect(isGreenfield('vertical-slice', 0)).toBe(false)
    expect(isGreenfield('clean-architecture-ritual', 0)).toBe(false)
  })

  test('returns false when profile is null (flag off)', () => {
    expect(isGreenfield(null, 0)).toBe(false)
  })
})

describe('CA-04 regression: flag off uses DEFAULT_RECOMMENDATION_V52', () => {
  test('default recommendation has v5.2 marker in rationale', () => {
    expect(DEFAULT_RECOMMENDATION_V52.rationale).toMatch(/v5\.2/i)
  })

  test('GREENFIELD differs from DEFAULT (Greenfield is opinionated)', () => {
    expect(GREENFIELD_RECOMMENDATION.headline).not.toBe(DEFAULT_RECOMMENDATION_V52.headline)
  })
})
```

### Passo 4: Verificar tracer bullet do Plano 01 fase-06

Após a refatoração, o tracer bullet (que verificava UMA linha adaptada para `vertical-slice`) deve continuar passando — agora com a recomendação completa do `vertical-slice` em vez de só uma linha. Atualizar o teste do tracer bullet se necessário (ele já apontava para esta direção).

---

## Gotchas

- **G1 do plano:** lookup table = `Record<ArchitectureProfileName, ArchitectureRecommendation>`, sem branching. SKILL.md tem UMA leitura + UMA resolução.
- **G2 do plano (CA-04):** quando `readArchitectureProfile()` retorna `null`, `getRecommendationForProfile` devolve `DEFAULT_RECOMMENDATION_V52` — output v5.2 preservado.
- **G4 do plano (CA-06):** Greenfield só ativa quando `profile === 'unknown-mixed' && srcFileCount < 5`. Limiar 5 documentado em MEMORY.md como sugestão DI candidato B.
- **G6 do plano:** lookup tem 5 entradas exatas. Teste explícito `Object.keys(...).length === 5` na suite.
- **G7 do plano:** linguagem das recomendações é DESCRITIVA ("recomendações priorizam X"), não prescritiva. Sem "converta para Y".
- **Local:** `readdirSync(..., { recursive: true })` requer Node 20+ / Bun. Manter, já é stack do plugin.

---

## Verificacao

### TDD

- [ ] **RED:** Testes (5 perfis distintos + Greenfield + CA-04) escritos antes de criar `architecture-recommendations.ts`. Falham por `Cannot find module`.
  - Comando: `bun run test -- --grep 'ARCHITECTURE_RECOMMENDATIONS|isGreenfield|CA-04 regression'`
  - Resultado esperado: erros de compilação resolvidos com stub vazio + assertion failures (lookup com 0 keys, headlines não distintas).

- [ ] **GREEN:** Lookup completa, helper `isGreenfield`, fallback v5.2. Todos os 11 testes passam.
  - Comando: `bun run test -- --grep 'ARCHITECTURE_RECOMMENDATIONS|isGreenfield|CA-04 regression'`
  - Resultado esperado: `11 passed, 0 failed`.

### Checklist

- [ ] Lookup table com 5 chaves exatas (`Object.keys(ARCHITECTURE_RECOMMENDATIONS).length === 5`)
- [ ] Todas as 5 headlines são distintas (Set size = 5)
- [ ] `isGreenfield` retorna true APENAS para `unknown-mixed` + `srcFileCount < 5`
- [ ] SKILL.md tem UMA chamada a `readArchitectureProfile()` (verificável: `grep -c readArchitectureProfile architecture/SKILL.md` = 1 na linha do import + 1 na chamada)
- [ ] Tracer bullet do Plano 01 fase-06 continua passando
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- --grep 'architecture-recommendations'` retorna `11 passed, 0 failed`
- Manifest com `profile: vertical-slice` + flag true → output da skill contém a string `isolamento por feature`
- Manifest com flag false → output contém a string `Recomendações arquiteturais (v5.2)` (CA-04)
- `src/` vazia + `profile: unknown-mixed` → output contém a string `vertical-slice + bounded contexts` (CA-06)

**Por humano:**
- Dev novo lê o output adaptado para `vertical-slice` e percebe imediatamente que ele descreve o estilo do projeto, não prescreve refatoração

---

<!-- Gerado por /plan-feature em 2026-05-04 -->
