# Fase 02: Estender DocInstruction + migrar as 16 entradas

**Plano:** 01 — Schema, Renderer e Data
**Sizing:** 2h
**Depende de:** fase-01 (precisa do tipo `FasePlanInput` para validar a forma)
**Visual:** false

---

## O que esta fase entrega

`DocInstruction` (em `populate-instructions-table.ts`) ganha os 6 campos novos do `FasePlanInput v1`. As 16 entradas em `POPULATE_INSTRUCTIONS_BY_DOC` sao migradas, preenchendo cada campo com valores plausiveis derivados do conteudo atual (sectionsToWrite vira mustCover, etc) + valores explicitos (guidanceFile aponta para path em `assets/populate-guidance/`, validationCommand uniforme).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/populate-instructions-table.ts` | Modify | Estende `DocInstruction` com 6 campos novos + migra 16 entradas |
| `skills/init/lib/populate-instructions-table.test.ts` | Create | Test: 16 entradas tem todos os campos novos preenchidos, paths de `guidanceFile` apontam para slugs validos |

---

## Implementacao

### Passo 1: Estender o tipo `DocInstruction`

Mantemos campos antigos (`scopeIn`, `scopeOut`, `sectionsToWrite`) para minimizar churn no Plano 02, mas adicionamos os 6 novos. Plano 02 fase-01 fara o adapter `DocInstruction -> FasePlanInput`.

```typescript
// skills/init/lib/populate-instructions-table.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-02 — estende DocInstruction com FasePlanInput v1 ext.
// Campos antigos (sectionsToWrite) mantidos para retrocompat ate Plano 02 fase-01 fazer o adapter.

import type { StackId } from './detect-stack'
import type { Wave, RiskEntry, StackVariants } from './render-fase-plan'

export type DocInstruction = {
  // === Campos antigos (mantidos para Plano 02 adapter) ===
  readonly goal: string
  readonly scopeIn: ReadonlyArray<string>
  readonly scopeOut: ReadonlyArray<string>
  readonly assumptions: ReadonlyArray<string>
  readonly risks: ReadonlyArray<RiskEntry>
  readonly sectionsToWrite: ReadonlyArray<string>
  readonly reviewChecklist: ReadonlyArray<string>
  readonly compoundOpportunity: string
  readonly exitCriteria: ReadonlyArray<string>

  // === Campos novos (FasePlanInput v1 ext) ===
  /** Path do .md de guidance per-doc. NAO lido em runtime — apenas referenciado. */
  readonly guidanceFile: string
  /** Sinais que a LLM deve grepar no codebase antes de escrever o doc. */
  readonly detectionSignals: ReadonlyArray<string>
  /** Por H2 do doc-alvo, lista de itens que DEVEM ser cobertos na prosa final. */
  readonly mustCover: Readonly<Record<string, ReadonlyArray<string>>>
  /** Links obrigatorios para outros docs (anchor links permitidos). */
  readonly linkTargets: ReadonlyArray<string>
  /** Variacao por stack (opcional). Aceita 3 chaves: rails / nextjs / node-ts. */
  readonly stackVariants?: StackVariants
  /** Comando que fecha a fase com sinal de sucesso. */
  readonly validationCommand: string
  /** IDs de fases anteriores (vazio = independente). */
  readonly dependsOn: ReadonlyArray<string>
}
```

### Passo 2: Migrar as 16 entradas

Cada entrada ganha 6 campos. Valores derivados:
- `guidanceFile`: `'skills/init/assets/populate-guidance/' + docToSlug(dst) + '.md'`
- `detectionSignals`: regex/string que a LLM grepar antes de escrever (especifico por doc; ex: SECURITY.md → `process.env\\.`, `JWT_SECRET`)
- `mustCover`: cada H2 de `sectionsToWrite` vira chave; valores sao itens concretos a cobrir nessa H2
- `linkTargets`: anchors para outros docs cancelaveis (ex: ARCHITECTURE.md#components)
- `stackVariants`: omitido por default; preenchido onde fizer sentido (SECURITY, ARCHITECTURE, README)
- `validationCommand`: uniforme `'bun run harness:validate'` por default
- `dependsOn`: vazio por default; preenchido onde houver ordem natural (ex: STATE.md depende de ARCHITECTURE.md)

Exemplo de uma entrada migrada (AGENTS.md):

```typescript
['AGENTS.md', {
  // === antigos ===
  goal: 'Document the agent operating contract: when to delegate, model profiles, audit log expectations, parallel subagent patterns.',
  scopeIn: ['Agent delegation triggers', 'Subagent contracts', 'Audit log fields', 'Model profile selection'],
  scopeOut: ['Subagent skill catalogs (lives in docs/AGENTS_LIST.md)', 'Skill source code'],
  assumptions: ['.claude/CLAUDE.md exists or has placeholder', 'Subagent IDs are stable across sessions'],
  risks: [{ risk: 'Conflicting guidance between AGENTS.md and CLAUDE.md', mitigation: 'AGENTS.md is contract; .claude/CLAUDE.md mirrors via link' }],
  sectionsToWrite: ['Operating Contract', 'Delegation Triggers', 'Audit Log Fields', 'Subagent Patterns'],
  reviewChecklist: ['Mirrors .claude/CLAUDE.md content', 'No conflicting instructions', 'All subagent IDs verifiable in code'],
  compoundOpportunity: 'If a delegation pattern proves valuable, capture as compound note in docs/compound/.',
  exitCriteria: ['harness:validate passes for AGENTS.md', 'Zero placeholder lines', 'Links to docs/AGENTS_LIST.md resolve'],

  // === novos ===
  guidanceFile: 'skills/init/assets/populate-guidance/agents-md.md',
  detectionSignals: [
    'subagent_type:',
    'allowed-tools:',
    'model:',
    'Agent\\(',
  ],
  mustCover: {
    'Operating Contract': ['when to delegate vs do directly', 'cost of context switch'],
    'Delegation Triggers': ['parallel-safe tasks', 'isolation requirements'],
    'Audit Log Fields': ['fields required', 'retention policy'],
    'Subagent Patterns': ['fork vs worktree', 'context isolation'],
  },
  linkTargets: ['.claude/CLAUDE.md', 'docs/AGENTS_LIST.md'],
  validationCommand: 'bun run harness:validate',
  dependsOn: [],
}],
```

Replicar essa shape para as 16 entradas. Mantém todos campos antigos identicos — apenas ADICIONA os 6 novos no fim de cada objeto literal.

**Por doc, valores propostos para os 6 campos novos:**

| Doc | guidanceFile slug | detectionSignals (exemplos) | linkTargets principais | stackVariants? | dependsOn |
|-----|-------------------|----------------------------|------------------------|----------------|-----------|
| AGENTS.md | `agents-md` | `subagent_type:`, `allowed-tools:` | `.claude/CLAUDE.md`, `docs/AGENTS_LIST.md` | — | — |
| ARCHITECTURE.md | `architecture-md` | `import\\s`, route patterns | `docs/PLANS.md`, `docs/DESIGN.md` | **sim** (3) | — |
| README.md | `readme-md` | `package.json scripts`, framework markers | `ARCHITECTURE.md` | **sim** (3) | — |
| docs/QUALITY_SCORE.md | `docs-quality-score-md` | review patterns | `docs/MERGE_GATES.md`, `docs/CODE_STYLE.md` | — | — |
| docs/PLANS.md | `docs-plans-md` | `docs/exec-plans/active/*` | `docs/PRODUCT_SENSE.md` | — | — |
| docs/DESIGN.md | `docs-design-md` | `docs/design-docs/ADR-*` | `ARCHITECTURE.md` | — | `ARCHITECTURE.md` |
| docs/FRONTEND.md | `docs-frontend-md` | route patterns, JSX/TSX | `ARCHITECTURE.md` | **sim** (3) | `ARCHITECTURE.md` |
| docs/PRODUCT_SENSE.md | `docs-product-sense-md` | — (filosofico) | `docs/PLANS.md` | — | — |
| docs/RELIABILITY.md | `docs-reliability-md` | `try\\s*\\{`, `catch`, error patterns | `docs/SECURITY.md`, `ARCHITECTURE.md` | **sim** (3) | `ARCHITECTURE.md` |
| docs/SECURITY.md | `docs-security-md` | `process.env\\.`, `JWT_SECRET`, `cors\\(` | `docs/MERGE_GATES.md`, `ARCHITECTURE.md` | **sim** (3) | — |
| docs/design-docs/core-beliefs.md | `docs-design-docs-core-beliefs-md` | — (filosofico) | `docs/PRODUCT_SENSE.md` | — | — |
| docs/generated/db-schema.md | `docs-generated-db-schema-md` | `CREATE TABLE`, migrations dir | `ARCHITECTURE.md`, `docs/SECURITY.md` | **sim** (3) | `ARCHITECTURE.md` |
| docs/MERGE_GATES.md | `docs-merge-gates-md` | CI configs, `package.json scripts` | `docs/QUALITY_SCORE.md` | — | — |
| docs/CODE_STYLE.md | `docs-code-style-md` | lint configs, `.editorconfig` | `docs/QUALITY_SCORE.md` | **sim** (3) | — |
| docs/STATE.md | `docs-state-md` | manifest, stack markers | `ARCHITECTURE.md` | — | `ARCHITECTURE.md` |
| .claude/CLAUDE.md | `claude-claude-md` | `subagent_type:`, MCP config | `AGENTS.md` | — | `AGENTS.md` |

> Eh um ponto de partida — durante implementacao, ajustar conforme a prosa real do `.md` em fase-03.

### Passo 3: Test de cobertura

```typescript
// skills/init/lib/populate-instructions-table.test.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-02 — valida que 16 docs tem todos os campos novos.

import { describe, test, expect } from 'bun:test'
import { POPULATE_INSTRUCTIONS_BY_DOC, docToSlug } from './populate-instructions-table'

describe('POPULATE_INSTRUCTIONS_BY_DOC — FasePlanInput v1 ext fields', () => {
  test('has exactly 16 entries (D18 baseline)', () => {
    expect(POPULATE_INSTRUCTIONS_BY_DOC.size).toBe(16)
  })

  test('every entry has all 6 new fields populated', () => {
    for (const [doc, instr] of POPULATE_INSTRUCTIONS_BY_DOC.entries()) {
      expect(instr.guidanceFile, `${doc}: guidanceFile`).toBeTruthy()
      expect(instr.detectionSignals, `${doc}: detectionSignals`).toBeDefined()
      expect(instr.mustCover, `${doc}: mustCover`).toBeDefined()
      expect(instr.linkTargets, `${doc}: linkTargets`).toBeDefined()
      expect(instr.validationCommand, `${doc}: validationCommand`).toBeTruthy()
      expect(instr.dependsOn, `${doc}: dependsOn`).toBeDefined()
    }
  })

  test('guidanceFile path follows convention skills/init/assets/populate-guidance/{slug}.md', () => {
    for (const [doc, instr] of POPULATE_INSTRUCTIONS_BY_DOC.entries()) {
      const expectedSlug = docToSlug(doc)
      const expectedPath = `skills/init/assets/populate-guidance/${expectedSlug}.md`
      expect(instr.guidanceFile, `${doc}: guidanceFile`).toBe(expectedPath)
    }
  })

  test('mustCover keys are a subset of sectionsToWrite (sanity)', () => {
    for (const [doc, instr] of POPULATE_INSTRUCTIONS_BY_DOC.entries()) {
      const sections = new Set(instr.sectionsToWrite)
      for (const key of Object.keys(instr.mustCover)) {
        expect(sections.has(key), `${doc}: mustCover key "${key}" not in sectionsToWrite`).toBe(true)
      }
    }
  })

  test('stackVariants when present uses only allowed keys (rails/nextjs/node-ts)', () => {
    const allowed = new Set(['rails', 'nextjs', 'node-ts'])
    for (const [doc, instr] of POPULATE_INSTRUCTIONS_BY_DOC.entries()) {
      if (!instr.stackVariants) continue
      for (const key of Object.keys(instr.stackVariants)) {
        expect(allowed.has(key), `${doc}: invalid stackVariants key "${key}"`).toBe(true)
      }
    }
  })

  test('dependsOn entries reference real docs in the map', () => {
    const docPaths = new Set(POPULATE_INSTRUCTIONS_BY_DOC.keys())
    for (const [doc, instr] of POPULATE_INSTRUCTIONS_BY_DOC.entries()) {
      for (const dep of instr.dependsOn) {
        expect(docPaths.has(dep), `${doc}: dependsOn references unknown "${dep}"`).toBe(true)
      }
    }
  })
})
```

---

## Gotchas

- **G1:** NAO renomear campos antigos (`scopeIn`, `sectionsToWrite`). Plano 02 fase-01 vai adapter. Renomear quebra renderer antigo durante a janela A→A1.
- **G2:** `mustCover` keys DEVEM bater 1:1 com items de `sectionsToWrite` neste plano (test asserta). Em planos futuros (Feature B), `mustCover` pode divergir, mas em init populate-harness eles sao espelho.
- **G3:** `guidanceFile` eh path *do plugin* (relative ao repo root), nao do projeto cliente. Renderer NAO traduz. Init NAO copia `.md` para projeto cliente (lazy loading).
- **G4 (do plano):** Stack variants so vale a pena onde o doc realmente diferencia por stack. Filosoficos (PRODUCT_SENSE, core-beliefs) NAO recebem.
- **Local:** Se sair com >16 entradas (alguem adicionou doc novo sem atualizar tabela): test "has exactly 16" pega.

---

## Verificacao

### TDD

- [ ] **RED:** rodar `bun test skills/init/lib/populate-instructions-table.test.ts` antes de implementar — todos os 6 testes falham (campos novos undefined)
- [ ] **RED → GREEN:** apos preencher os 6 campos em 16 entradas, `bun test` retorna `6 passed, 0 failed`
- [ ] **REFACTOR:** `bun run lint` e `bun run typecheck` limpos

### Checklist

- [ ] 16 entradas tem todos os 6 campos novos preenchidos
- [ ] `mustCover` keys sao subset de `sectionsToWrite` (test asserta)
- [ ] `guidanceFile` paths seguem convencao `skills/init/assets/populate-guidance/{slug}.md`
- [ ] `dependsOn` referencia docs validos (test asserta)
- [ ] `stackVariants` apenas com chaves `rails`/`nextjs`/`node-ts` quando presente
- [ ] Testes passam: `bun test`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/populate-instructions-table.test.ts` retorna `6 passed, 0 failed`
- `bun run typecheck` passa
- `git diff skills/init/lib/populate-instructions-table.ts` mostra **apenas** adicao de campos (zero alteracao nos antigos)

**Por humano:**
- Revisao olhada: cada doc tem `detectionSignals` plausiveis (greps que apontariam para o conteudo real do doc no codebase do cliente)

---

<!-- Gerado por /plan-feature (inline, auto mode) em 2026-05-21 -->
