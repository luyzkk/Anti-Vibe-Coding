# Fase 02: Criar `fase-builder.ts`

**Plano:** 01 — Renderer Cross-Skill + Builder
**Sizing:** ~1h
**Depende de:** fase-01 (renderer deve estar em `skills/lib/render-fase-plan.ts`)
**Visual:** false

---

## O que esta fase entrega

`skills/plan-feature/lib/fase-builder.ts` exportando o tipo `PlanFaseContext` e a funcao
`buildFaseFromContext(ctx: PlanFaseContext): FasePlanInput`. Campos de extensao opcionais
recebem defaults sensatos. Suite de testes em `fase-builder.test.ts` com ciclo RED-GREEN
validado antes do commit.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/plan-feature/lib/fase-builder.ts` | Create | Builder que converte `PlanFaseContext` em `FasePlanInput` |
| `skills/plan-feature/lib/fase-builder.test.ts` | Create | Testes RED-GREEN para o builder |

---

## Implementacao

### Passo 1: Verificar premissa — renderer cross-skill existe

```bash
ls "f:/Projetos/Anti-Vibe-Coding/skills/lib/render-fase-plan.ts"
```

Se nao existir: **PARAR — blocker, fase-01 nao foi concluida.**

### Passo 2: Verificar comportamento do renderer para campos vazios (CA-B-06)

Antes de codificar os defaults, confirmar o comportamento real do renderer para cada campo
opcional vazio. Ler `skills/lib/render-fase-plan.ts` e verificar:

- `detectionSignals: []` → renderer omite o bloco? (linha ~71: `if (input.detectionSignals.length > 0)`)
- `mustCover: {}` → renderer omite o bloco? (linha ~112: `const mustCoverKeys = Object.keys(input.mustCover)`)
- `linkTargets: []` → renderer omite o bloco? (linha ~122: `if (input.linkTargets.length > 0)`)
- `guidanceFile: ''` → renderer renderiza `**Guidance file:** ````` (string vazia, cabecalho aparece)

Anotar resultado real — codificar os defaults de acordo. Se o renderer emitir `N/A` ou header
vazio para algum campo, sinalizar como desvio da spec (CA-B-06 espera ausencia completa do bloco).

### Passo 3: Criar `skills/plan-feature/lib/` e escrever o teste (RED)

```bash
mkdir -p "f:/Projetos/Anti-Vibe-Coding/skills/plan-feature/lib"
```

Criar `skills/plan-feature/lib/fase-builder.test.ts` antes do modulo existir:

```typescript
// skills/plan-feature/lib/fase-builder.test.ts
// 2026-05-22 (Luiz/dev): Plano 01 fase-02 — RED antes do builder existir.

import { describe, test, expect } from 'bun:test'
import { buildFaseFromContext, type PlanFaseContext } from './fase-builder'
import type { FasePlanInput } from '../../lib/render-fase-plan'

const MINIMAL_CTX: PlanFaseContext = {
  faseId: 'fase-01-mover-renderer',
  faseNumber: 1,
  planNumber: 1,
  featureSlug: 'migrate-plan-feature-faseplanv1',
  goal: 'Mover renderFasePlan para skills/lib/ (cross-skill).',
  scopeIn: ['skills/lib/render-fase-plan.ts', 'import em populate-plan-generator.ts'],
  scopeOut: ['skills/plan-feature/index.ts', 'template Markdown legado'],
  assumptions: ['Feature A mergeada — renderer existe em skills/init/lib/'],
  risks: [{ risk: 'Importador nao-mapeado quebra suite', mitigation: 'Grep obrigatorio antes do git mv' }],
  waves: [{ name: 'Wave 1 — Move', items: ['git mv render-fase-plan.ts para skills/lib/', 'Atualizar import em populate-plan-generator.ts'] }],
  reviewChecklist: ['bun test verde', 'grep de import orfo retorna vazio'],
  compoundOpportunity: 'Pattern cross-skill renderer valida ADR-0022.',
  exitCriteria: ['skills/lib/render-fase-plan.ts existe', 'skills/init/lib/render-fase-plan.ts nao existe'],
}

describe('buildFaseFromContext', () => {
  test('retorna FasePlanInput com schemaVersion: 1', () => {
    const result = buildFaseFromContext(MINIMAL_CTX)
    expect(result.schemaVersion).toBe(1)
  })

  test('docPath e composto de featureSlug + planNumber + faseId', () => {
    const result = buildFaseFromContext(MINIMAL_CTX)
    expect(result.docPath).toBe('migrate-plan-feature-faseplanv1/plano01/fase-01-mover-renderer')
  })

  test('planNumber < 10 recebe zero-padding no docPath', () => {
    const ctx: PlanFaseContext = { ...MINIMAL_CTX, planNumber: 3, faseId: 'fase-02-builder' }
    const result = buildFaseFromContext(ctx)
    expect(result.docPath).toContain('plano03/')
  })

  test('campos obrigatorios sao mapeados diretamente do contexto', () => {
    const result = buildFaseFromContext(MINIMAL_CTX)
    expect(result.goal).toBe(MINIMAL_CTX.goal)
    expect(result.scope.in).toEqual(MINIMAL_CTX.scopeIn)
    expect(result.scope.out).toEqual(MINIMAL_CTX.scopeOut)
    expect(result.assumptions).toEqual(MINIMAL_CTX.assumptions)
    expect(result.risks).toEqual(MINIMAL_CTX.risks)
    expect(result.waves).toEqual(MINIMAL_CTX.waves)
    expect(result.reviewChecklist).toEqual(MINIMAL_CTX.reviewChecklist)
    expect(result.compoundOpportunity).toBe(MINIMAL_CTX.compoundOpportunity)
    expect(result.exitCriteria).toEqual(MINIMAL_CTX.exitCriteria)
  })

  test('campos opcionais ausentes recebem defaults sensiveis (CA-B-06)', () => {
    const result = buildFaseFromContext(MINIMAL_CTX)
    expect(result.guidanceFile).toBe('')
    expect(result.detectionSignals).toEqual([])
    expect(result.mustCover).toEqual({})
    expect(result.linkTargets).toEqual([])
    expect(result.validationCommand).toBe('bun test')
    expect(result.dependsOn).toEqual([])
  })

  test('campos opcionais fornecidos sobrescrevem defaults', () => {
    const ctx: PlanFaseContext = {
      ...MINIMAL_CTX,
      guidanceFile: 'skills/init/assets/populate-guidance/docs-security-md.md',
      detectionSignals: ['process\\.env\\.', 'JWT_SECRET'],
      validationCommand: 'bun run harness:validate',
      dependsOn: ['fase-01-mover-renderer'],
    }
    const result = buildFaseFromContext(ctx)
    expect(result.guidanceFile).toBe('skills/init/assets/populate-guidance/docs-security-md.md')
    expect(result.detectionSignals).toEqual(['process\\.env\\.', 'JWT_SECRET'])
    expect(result.validationCommand).toBe('bun run harness:validate')
    expect(result.dependsOn).toEqual(['fase-01-mover-renderer'])
  })
})
```

Rodar o teste para confirmar RED:

```bash
cd "f:/Projetos/Anti-Vibe-Coding"
bun test skills/plan-feature/lib/fase-builder.test.ts
```

Resultado esperado: falha com "Cannot find module './fase-builder'" (erro de modulo, nao de assertion).
Se a mensagem for diferente (ex: erro de typecheck de `PlanFaseContext`), ajustar o teste antes de prosseguir.

### Passo 4: Implementar `fase-builder.ts` (GREEN)

Criar `skills/plan-feature/lib/fase-builder.ts`:

```typescript
// skills/plan-feature/lib/fase-builder.ts
// 2026-05-22 (Luiz/dev): Plano 01 fase-02 — builder que converte PlanFaseContext em
// FasePlanInput v1. Importa o renderer cross-skill de skills/lib/ (ADR-0022).

import type { FasePlanInput, RiskEntry, Wave } from '../../lib/render-fase-plan'

export type PlanFaseContext = {
  // Identidade da fase
  readonly faseId: string
  readonly faseNumber: number
  readonly planNumber: number
  readonly featureSlug: string

  // Conteudo extraido do PRD/PLAN
  readonly goal: string
  readonly scopeIn: ReadonlyArray<string>
  readonly scopeOut: ReadonlyArray<string>
  readonly assumptions: ReadonlyArray<string>
  readonly risks: ReadonlyArray<RiskEntry>
  readonly waves: ReadonlyArray<Wave>
  readonly reviewChecklist: ReadonlyArray<string>
  readonly compoundOpportunity: string
  readonly exitCriteria: ReadonlyArray<string>

  // Campos de extensao AVC — opcionais com defaults vazios
  readonly guidanceFile?: string
  readonly detectionSignals?: ReadonlyArray<string>
  readonly mustCover?: Readonly<Record<string, ReadonlyArray<string>>>
  readonly linkTargets?: ReadonlyArray<string>
  readonly validationCommand?: string
  readonly dependsOn?: ReadonlyArray<string>
}

export function buildFaseFromContext(ctx: PlanFaseContext): FasePlanInput {
  return {
    docPath: `${ctx.featureSlug}/plano${String(ctx.planNumber).padStart(2, '0')}/${ctx.faseId}`,
    schemaVersion: 1,
    goal: ctx.goal,
    scope: { in: ctx.scopeIn, out: ctx.scopeOut },
    assumptions: ctx.assumptions,
    risks: ctx.risks,
    waves: ctx.waves,
    reviewChecklist: ctx.reviewChecklist,
    compoundOpportunity: ctx.compoundOpportunity,
    exitCriteria: ctx.exitCriteria,
    guidanceFile: ctx.guidanceFile ?? '',
    detectionSignals: ctx.detectionSignals ?? [],
    mustCover: ctx.mustCover ?? {},
    linkTargets: ctx.linkTargets ?? [],
    validationCommand: ctx.validationCommand ?? 'bun test',
    dependsOn: ctx.dependsOn ?? [],
  }
}
```

### Passo 5: Rodar testes (GREEN verificado)

```bash
cd "f:/Projetos/Anti-Vibe-Coding"
bun test skills/plan-feature/lib/fase-builder.test.ts
bun run typecheck
```

Resultado esperado: todos os testes passam, zero erros de typecheck.

### Passo 6: Suite completa

```bash
bun test
```

Resultado esperado: zero regressoes — testes de `skills/lib/render-fase-plan.test.ts` e
`skills/plan-feature/lib/fase-builder.test.ts` todos verdes.

---

## Gotchas

- **G4 do plano (cross-skill import path):** O import em `fase-builder.ts` deve ser
  `from '../../lib/render-fase-plan'` (relativo) — nao `from 'skills/lib/render-fase-plan'`.
  O path relativo funciona porque `skills/plan-feature/lib/` esta 2 niveis acima de `skills/lib/`.
- **G5 do plano (CA-B-06 — campos vazios):** Verificar Passo 2 antes de codificar. Se o
  renderer emitir `**Guidance file:** ````` (string vazia exibida no header), o campo
  `guidanceFile: ''` nao viola CA-B-06 porque a regra e sobre `mustCover`, `detectionSignals`
  e `linkTargets` — nao sobre `guidanceFile`. A spec do renderer (linha 68-69) sempre emite
  a linha `**Guidance file:**` independente do valor.
- **Local:** `PlanFaseContext` usa `readonly` em todos os campos e `ReadonlyArray` — sem mutacao.
  Manter esse contrato; o builder nao deve fazer `push` em arrays.
- **Local:** `RiskEntry` e `Wave` sao reusados diretamente do renderer (`../../lib/render-fase-plan`).
  Nao redefinir tipos locais — usar o `import type` para manter single source of truth.

---

## Verificacao

### TDD

- [ ] **RED:** `bun test skills/plan-feature/lib/fase-builder.test.ts` falha com
  "Cannot find module './fase-builder'" antes da criacao do modulo
- [ ] **GREEN:** apos criar `fase-builder.ts`, todos os 6 testes passam
- [ ] **REFACTOR:** verificar se ha duplicacao de tipos (ex: redefinir `RiskEntry` localmente).
  Se sim, consolidar via `import type`.

### Checklist

- [ ] `skills/plan-feature/lib/fase-builder.ts` existe e exporta `PlanFaseContext` e `buildFaseFromContext`
- [ ] `skills/plan-feature/lib/fase-builder.test.ts` existe com 6 testes
- [ ] `buildFaseFromContext` com contexto minimo retorna `FasePlanInput` com `schemaVersion: 1`
- [ ] `docPath` com `planNumber: 1` gera `plano01/` (zero-padding correto)
- [ ] Campos opcionais ausentes geram defaults: `guidanceFile: ''`, `detectionSignals: []`, `mustCover: {}`, `linkTargets: []`, `validationCommand: 'bun test'`, `dependsOn: []`
- [ ] Testes passam: `bun test skills/plan-feature/lib/fase-builder.test.ts`
- [ ] Suite completa passa: `bun test`
- [ ] TypeCheck: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**

- `bun test skills/plan-feature/lib/fase-builder.test.ts` retorna `6 passed, 0 failed`
- `bun run typecheck` retorna exit code 0
- `bun test` retorna `0 failed` na suite completa (CA-B-02)

---

## Final Report Contract

Quando esta fase for executada, o relatorio final DEVE listar:
- **Files added** — `skills/plan-feature/lib/fase-builder.ts`, `skills/plan-feature/lib/fase-builder.test.ts`
- **Files customized** — nenhum (fase de criacao pura)
- **Files unchanged** — `skills/lib/render-fase-plan.ts` (inspecionado para verificar Passo 2, nao modificado)
- **Unresolved TODOs** — qualquer `TODO(<owner/context needed>): ...` deixado no doc
- **Validation result** — output de `bun test`
- **First plan path** — fase-03-snapshot-golden-suite.md
