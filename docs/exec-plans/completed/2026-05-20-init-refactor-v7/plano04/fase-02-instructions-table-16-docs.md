<!--
Princípio universal #5 — Comment Provenance.
-->

# Fase 02: Tabela de instrucoes hardcoded por doc (16 entries D18) + buildWavesForDoc stack-aware

**Plano:** 04 — Step 7 generate-populate-plans (CORE)
**Sizing:** 2h
**Depende de:** fase-01 (tipo `AndrePlanInput`, `Wave`, `RiskEntry` exportados do generator)
**Visual:** false

---

## O que esta fase entrega

Tabela `POPULATE_INSTRUCTIONS_BY_DOC` com **16 entries** (D18 do CONTEXT — 12 baseline Andre +
4 extras AVC) em arquivo proprio `skills/init/lib/populate-instructions-table.ts`. Cada entry
contem instrucoes semanticas (goal, scope, assumptions, risks, sectionsToWrite,
compoundOpportunity, exitCriteria) **independentes de stack**. Em paralelo, a funcao
`buildWavesForDoc(doc: string, stack: StackId | null): ReadonlyArray<Wave>` calcula
**Wave 1 (discovery, stack-aware)** e **Wave 2 (write sections)** em runtime. Plano 05 e
harness-validate podem importar `POPULATE_INSTRUCTIONS_BY_DOC` para parity gates.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/populate-instructions-table.ts` | Create | Tabela `POPULATE_INSTRUCTIONS_BY_DOC` com 16 entries; tipo `DocInstruction`; funcao `buildWavesForDoc(doc, stack)`; algoritmo de slug `docToSlug(dst)` |
| `skills/init/lib/populate-instructions-table.test.ts` | Create | (1) tabela tem exatamente 16 entries D18; (2) cada entry mapeia para `dst` valido do TEMPLATE_MANIFEST; (3) `buildWavesForDoc('docs/FRONTEND.md', 'rails')` contem `app/views`; (4) `buildWavesForDoc('docs/FRONTEND.md', 'nodejs-typescript')` contem `src/components/`; (5) `docToSlug('docs/SECURITY.md')` retorna `'docs-security-md'`; (6) parity test contra TEMPLATE_MANIFEST + EXCLUDED_FROM_POPULATION_V2 |

---

## Implementacao

### Passo 1: Tipos e algoritmo de slug

```typescript
// skills/init/lib/populate-instructions-table.ts
// 2026-05-21 (Luiz/dev): Plano 04 fase-02 — instrucoes hardcoded por doc canonico (D18 CONTEXT).
// G8 do README: tabela e a fonte da verdade do conjunto de 16 docs populaveis.

import type { StackId } from './detect-stack'
import type { Wave, RiskEntry } from './populate-plan-generator'

/**
 * Instrucao por doc — independente de stack. Paths reais vem de `buildWavesForDoc`.
 */
export type DocInstruction = {
  readonly goal: string
  readonly scopeIn: ReadonlyArray<string>
  readonly scopeOut: ReadonlyArray<string>
  readonly assumptions: ReadonlyArray<string>
  readonly risks: ReadonlyArray<RiskEntry>
  /** Secoes H2 que a LLM deve escrever no doc-alvo. Vira items da Wave 2. */
  readonly sectionsToWrite: ReadonlyArray<string>
  readonly reviewChecklist: ReadonlyArray<string>
  readonly compoundOpportunity: string
  readonly exitCriteria: ReadonlyArray<string>
}

/**
 * Algoritmo canonico de slug. Documentado em G8 do Plano 04 README.
 * Exemplos: 'docs/SECURITY.md' → 'docs-security-md'; '.claude/CLAUDE.md' → 'claude-claude-md'.
 */
export function docToSlug(dst: string): string {
  return dst
    .replace(/^\./, '') // strip leading dot from .claude/
    .replaceAll('/', '-')
    .replace(/\.md$/, '-md')
    .toLowerCase()
}
```

### Passo 2: Tabela de 16 entries (D18)

Cada entry e ~15-25 linhas. Vou mostrar 3 das 16 (AGENTS.md, docs/SECURITY.md, docs/FRONTEND.md)
como modelo — as outras 13 seguem o mesmo padrao. Implementador preenche todas as 16:

```typescript
// 2026-05-21 (Luiz/dev): D18 do CONTEXT — 16 docs populaveis com plano LLM individual.
// Ordem da lista segue D18 (12 baseline Andre + 4 extras AVC). NAO reordenar sem audit.

export const POPULATE_INSTRUCTIONS_BY_DOC: ReadonlyMap<string, DocInstruction> = new Map([
  // ===== Baseline Andre (12) =====
  ['AGENTS.md', {
    goal: 'Document the agent operating contract: when to delegate, model profiles, audit log expectations, parallel subagent patterns.',
    scopeIn: ['Agent delegation triggers', 'Subagent contracts', 'Audit log fields'],
    scopeOut: ['Subagent skill catalogs (lives in docs/AGENTS_LIST.md)', 'Skill source code'],
    assumptions: ['.claude/CLAUDE.md exists or has placeholder', 'Subagent IDs are stable across sessions'],
    risks: [{ risk: 'Conflicting guidance between AGENTS.md and CLAUDE.md', mitigation: 'AGENTS.md is contract; CLAUDE.md mirrors via link' }],
    sectionsToWrite: ['Operating Contract', 'Delegation Triggers', 'Audit Log Fields', 'Subagent Patterns'],
    reviewChecklist: ['Mirrors .claude/CLAUDE.md content', 'No conflicting instructions', 'All subagent IDs verifiable in code'],
    compoundOpportunity: 'If a delegation pattern proves valuable, capture as compound note.',
    exitCriteria: ['harness:validate passes for AGENTS.md', 'Zero placeholder lines', 'Links to docs/AGENTS_LIST.md resolve'],
  }],

  ['ARCHITECTURE.md', {
    goal: 'Document the system architecture: components, dependencies, data flow, key invariants.',
    scopeIn: ['Component diagram (text/mermaid)', 'Data flow', 'Stack choices', 'Cross-cutting concerns'],
    scopeOut: ['Implementation details (lives in source)', 'Future plans (lives in docs/PLANS.md)'],
    assumptions: ['Stack is detected and recorded in STATE.md', 'Entry point is identifiable'],
    risks: [{ risk: 'Architecture description drifts from code', mitigation: 'Link sections to specific files; review on major refactors' }],
    sectionsToWrite: ['System Overview', 'Components', 'Data Flow', 'Key Invariants', 'Decisions Log Links'],
    reviewChecklist: ['Each component links to source path', 'Diagrams accompanied by 1-2 sentence description', 'No placeholder'],
    compoundOpportunity: 'Architecture decisions that recur belong in docs/design-docs/ADR-*.md.',
    exitCriteria: ['harness:validate passes', 'Components claimed exist in code'],
  }],

  ['README.md', { /* ... */ } as DocInstruction], // implementador preenche
  ['docs/QUALITY_SCORE.md', { /* ... */ } as DocInstruction],
  ['docs/PLANS.md', { /* ... */ } as DocInstruction],
  ['docs/DESIGN.md', { /* ... */ } as DocInstruction],

  ['docs/FRONTEND.md', {
    goal: 'Document the frontend layer: routing, components, styling system, accessibility posture.',
    scopeIn: ['Routing approach', 'Component hierarchy', 'Styling system', 'A11y patterns'],
    scopeOut: ['Backend API (lives in docs/ARCHITECTURE.md)', 'Auth (lives in docs/SECURITY.md)'],
    assumptions: ['Project has UI layer (frontend or full-stack)'],
    risks: [{ risk: 'Stack mismatch — Rails app uses ERB, Node-TS uses React/Tailwind', mitigation: 'Wave 1 paths are stack-aware (buildWavesForDoc)' }],
    sectionsToWrite: ['Routing', 'Components', 'Styling System', 'Accessibility'],
    reviewChecklist: ['All paths in doc match actual stack', 'A11y claims verified against actual a11y attrs in code'],
    compoundOpportunity: 'Frontend patterns that get reused belong in compound notes (e.g. modal-pattern, form-pattern).',
    exitCriteria: ['harness:validate passes', 'No paths claim files that do not exist'],
  }],

  ['docs/PRODUCT_SENSE.md', { /* ... */ } as DocInstruction],
  ['docs/RELIABILITY.md', { /* ... */ } as DocInstruction],

  ['docs/SECURITY.md', {
    goal: 'Document the security posture: auth flow, secret management, dependency hygiene, OWASP top-10 coverage.',
    scopeIn: ['Auth flow', 'Secret storage', 'Input validation', 'Dependency scanning', 'CSP/headers'],
    scopeOut: ['Pentest reports', 'Compliance audit (SOC2, ISO)'],
    assumptions: ['.env.example exists or will be created', 'Project has auth (if applicable)'],
    risks: [{ risk: 'Auth logic spread across middleware + handlers + controllers', mitigation: 'Wave 1 maps ALL auth touchpoints before writing' }],
    sectionsToWrite: ['Auth Flow', 'Secret Management', 'Input Validation', 'Dependencies', 'Headers/CSP'],
    reviewChecklist: ['No secret values in markdown', 'All claims link to code', 'Threat model implicit or explicit'],
    compoundOpportunity: 'Security incident root causes belong in docs/compound/ as gotchas.',
    exitCriteria: ['harness:validate passes', 'OWASP top-10 has explicit coverage statement (covered / N/A / not-applicable)'],
  }],

  ['docs/design-docs/core-beliefs.md', { /* ... */ } as DocInstruction],
  ['docs/generated/db-schema.md', { /* ... */ } as DocInstruction],

  // ===== Extras AVC (4) =====
  ['docs/MERGE_GATES.md', { /* ... */ } as DocInstruction],
  ['docs/CODE_STYLE.md', { /* ... */ } as DocInstruction],
  ['docs/STATE.md', { /* ... */ } as DocInstruction],
  ['.claude/CLAUDE.md', { /* ... */ } as DocInstruction],
])
```

> **Nota ao implementador:** as 13 entries marcadas `/* ... */` seguem o mesmo padrao das
> 3 mostradas — goal de 1-2 linhas, 3-5 secoes-a-escrever, 1-3 risks, exit criteria com
> "harness:validate passes". Tempo estimado: ~10min por entry. Total para esta fase ~2h
> incluindo testes.

### Passo 3: `buildWavesForDoc` (stack-aware)

```typescript
// 2026-05-21 (Luiz/dev): Plano 04 fase-02 — paths stack-aware nas Waves. CA-04 do PRD:
// Rails → app/views / app/assets em FRONTEND.md. Node → src/. Outras stacks: aborta (DR-2, fase-04).
// Excecao ao CLAUDE.md global "hash-map sobre switch": 2 stacks × 16 docs = legibilidade
// vence hash-map duplo (DI-Plano04-fase03-stack-aware-path-strategy).

import type { Wave } from './populate-plan-generator'
import type { StackId } from './detect-stack'

type CodePathsByStack = Partial<Record<NonNullable<StackId>, ReadonlyArray<string>>>

/**
 * Mapa de paths de descoberta por doc + stack. Wave 1 = paths a LER.
 * Para docs sem variacao por stack (ex: docs/PLANS.md), `default` se aplica.
 */
const CODE_PATHS_BY_DOC: ReadonlyMap<string, CodePathsByStack & { default?: ReadonlyArray<string> }> = new Map([
  ['docs/FRONTEND.md', {
    'nodejs-typescript': ['src/app/', 'src/components/', 'tailwind.config.ts', 'src/app/globals.css'],
    rails: ['app/views/', 'app/assets/', 'app/javascript/', 'config/routes.rb'],
  }],
  ['docs/SECURITY.md', {
    'nodejs-typescript': ['src/middleware.ts', 'src/lib/auth/', '.env.example', 'package.json'],
    rails: ['app/controllers/application_controller.rb', 'config/initializers/', '.env.example', 'Gemfile'],
  }],
  ['ARCHITECTURE.md', {
    'nodejs-typescript': ['src/', 'package.json', 'next.config.ts', 'next.config.js'],
    rails: ['app/', 'config/application.rb', 'Gemfile', 'config/routes.rb'],
  }],
  // ... 13 outras entries, seguindo o mesmo padrao
  // Para docs sem variacao (ex: 'docs/PLANS.md'), usar `default: ['docs/exec-plans/']`
])

export function buildWavesForDoc(doc: string, stack: StackId | null): ReadonlyArray<Wave> {
  const pathsEntry = CODE_PATHS_BY_DOC.get(doc)
  if (!pathsEntry) {
    // doc sem entry em CODE_PATHS_BY_DOC — Wave 1 generica
    return [
      { name: 'Wave 1 — Discovery', items: [`Read the codebase to find inputs relevant to ${doc}`] },
      { name: 'Wave 2 — Write sections', items: ['Write each section listed in sectionsToWrite'] },
    ]
  }

  // Resolve paths por stack — fallback para default se stack-specific ausente.
  const stackPaths = (stack && pathsEntry[stack]) ?? pathsEntry.default ?? []
  const wave1Items = stackPaths.length
    ? stackPaths.map(p => `Read \`${p}\``)
    : [`No stack-specific paths configured for ${doc} — read project root.`]

  return [
    { name: 'Wave 1 — Discovery', items: wave1Items },
    { name: 'Wave 2 — Write sections', items: ['Write each section listed in sectionsToWrite (one H2 per item).'] },
  ]
}
```

### Passo 4: Testes de tabela + buildWavesForDoc

```typescript
// skills/init/lib/populate-instructions-table.test.ts
import { test, expect, describe } from 'bun:test'
import {
  POPULATE_INSTRUCTIONS_BY_DOC,
  buildWavesForDoc,
  docToSlug,
} from './populate-instructions-table'
import { TEMPLATE_MANIFEST } from './template-manifest'

describe('POPULATE_INSTRUCTIONS_BY_DOC', () => {
  test('contains exactly 16 entries (D18)', () => {
    expect(POPULATE_INSTRUCTIONS_BY_DOC.size).toBe(16)
  })

  test('every key maps to a valid TEMPLATE_MANIFEST.dst', () => {
    const validDsts = new Set(TEMPLATE_MANIFEST.map(e => e.dst))
    for (const key of POPULATE_INSTRUCTIONS_BY_DOC.keys()) {
      expect(validDsts.has(key)).toBe(true)
    }
  })

  test('every entry has all required DocInstruction fields populated (no empty arrays)', () => {
    for (const [key, instr] of POPULATE_INSTRUCTIONS_BY_DOC.entries()) {
      expect(instr.goal.length).toBeGreaterThan(20)
      expect(instr.scopeIn.length).toBeGreaterThan(0)
      expect(instr.scopeOut.length).toBeGreaterThan(0)
      expect(instr.sectionsToWrite.length).toBeGreaterThan(0)
      expect(instr.exitCriteria.length).toBeGreaterThan(0)
    }
  })

  test('contains the 4 AVC extras (D18)', () => {
    expect(POPULATE_INSTRUCTIONS_BY_DOC.has('docs/MERGE_GATES.md')).toBe(true)
    expect(POPULATE_INSTRUCTIONS_BY_DOC.has('docs/CODE_STYLE.md')).toBe(true)
    expect(POPULATE_INSTRUCTIONS_BY_DOC.has('docs/STATE.md')).toBe(true)
    expect(POPULATE_INSTRUCTIONS_BY_DOC.has('.claude/CLAUDE.md')).toBe(true)
  })
})

describe('buildWavesForDoc', () => {
  test('Rails FRONTEND.md → Wave 1 contains app/views and app/assets (CA-04)', () => {
    const waves = buildWavesForDoc('docs/FRONTEND.md', 'rails')
    const wave1 = waves[0]
    expect(wave1.items.some(i => i.includes('app/views'))).toBe(true)
    expect(wave1.items.some(i => i.includes('app/assets'))).toBe(true)
    expect(wave1.items.some(i => i.includes('src/'))).toBe(false)
  })

  test('Node-TS FRONTEND.md → Wave 1 contains src/components and tailwind.config', () => {
    const waves = buildWavesForDoc('docs/FRONTEND.md', 'nodejs-typescript')
    const wave1 = waves[0]
    expect(wave1.items.some(i => i.includes('src/components'))).toBe(true)
    expect(wave1.items.some(i => i.includes('tailwind.config'))).toBe(true)
    expect(wave1.items.some(i => i.includes('app/views'))).toBe(false)
  })

  test('always returns at least 2 Waves (CA-07 of PRD)', () => {
    const waves = buildWavesForDoc('docs/SECURITY.md', 'nodejs-typescript')
    expect(waves.length).toBeGreaterThanOrEqual(2)
  })

  test('unknown doc → generic Wave 1 with project root note', () => {
    const waves = buildWavesForDoc('docs/UNKNOWN.md', 'nodejs-typescript')
    expect(waves.length).toBe(2)
    expect(waves[0].items[0].toLowerCase()).toContain('codebase')
  })
})

describe('docToSlug', () => {
  test.each([
    ['AGENTS.md', 'agents-md'],
    ['docs/SECURITY.md', 'docs-security-md'],
    ['docs/design-docs/core-beliefs.md', 'docs-design-docs-core-beliefs-md'],
    ['.claude/CLAUDE.md', 'claude-claude-md'],
    ['docs/generated/db-schema.md', 'docs-generated-db-schema-md'],
  ])('docToSlug(%s) === %s', (input, expected) => {
    expect(docToSlug(input)).toBe(expected)
  })
})
```

---

## Gotchas

- **G3 do plano (paths stack-aware NAO como template literal):** confirmado aqui — paths
  vivem em `CODE_PATHS_BY_DOC` (objeto literal), nao concatenados como string em runtime.

- **G8 do plano (slug canonico):** algoritmo testado via `test.each` — qualquer mudanca
  futura no algoritmo quebra teste de proposito.

- **G9 do plano (16 docs vs 36 entries):** o teste `every key maps to a valid TEMPLATE_MANIFEST.dst`
  verifica que toda entry de POPULATE_INSTRUCTIONS_BY_DOC tem correspondencia no manifest.
  O contrario (toda entry "populavel" do manifest tem instrucao) e validado no parity test
  da fase-05.

- **Local — algumas das 13 entries pendentes podem ser triviais:** `docs/QUALITY_SCORE.md`,
  `docs/STATE.md`, `.claude/CLAUDE.md` (mirror) tem instrucoes mais curtas que SECURITY.md.
  Implementador NAO precisa inventar complexidade — entries minimas validas (`goal`, 1 secao,
  1 exit criterio) sao aceitas.

- **Local — `CodePathsByStack` so cobre `nodejs-typescript` + `rails`:** outras `StackId`
  do `detect-stack.ts` (ex: `go`, `python`) NAO tem paths configurados. Fallback: `default`
  ou Wave 1 generica. Estes casos NAO devem chegar aqui — DR-2 do fase-04 aborta antes.

---

## Verificacao

### TDD

- [ ] **RED:** `bun test populate-instructions-table.test.ts` falha com `Cannot find module './populate-instructions-table'`
- [ ] **GREEN (parcial):** apos criar tabela com 3 entries de exemplo + buildWavesForDoc, testes de unidade passam mas `contains exactly 16 entries` falha
- [ ] **GREEN (final):** apos preencher as 13 entries restantes, todos os ~15 testes passam
  - Comando: `bun test populate-instructions-table.test.ts`
  - Resultado esperado: `~15 passed, 0 failed`

### Checklist

- [ ] `POPULATE_INSTRUCTIONS_BY_DOC.size === 16` (verificavel em REPL via `bun -e "..."`)
- [ ] 4 AVC extras presentes (`MERGE_GATES.md`, `CODE_STYLE.md`, `STATE.md`, `.claude/CLAUDE.md`)
- [ ] `buildWavesForDoc('docs/FRONTEND.md', 'rails')` retorna Wave 1 com `app/views` (NAO `src/`)
- [ ] `buildWavesForDoc('docs/FRONTEND.md', 'nodejs-typescript')` retorna Wave 1 com `src/components` (NAO `app/views`)
- [ ] `docToSlug('docs/SECURITY.md') === 'docs-security-md'`
- [ ] `bun run lint` limpo
- [ ] `bun run typecheck` limpo

---

## Criterio de Aceite

**Por maquina:**
- `bun test populate-instructions-table.test.ts` retorna 0 falhas
- `bun -e "import('./skills/init/lib/populate-instructions-table.ts').then(m => console.log(m.POPULATE_INSTRUCTIONS_BY_DOC.size))"` imprime `16`
- `bun -e "import('./skills/init/lib/populate-instructions-table.ts').then(m => console.log(m.buildWavesForDoc('docs/FRONTEND.md', 'rails')[0].items.join(',')))"` contem string `app/views`

**Por humano:**
- Inspecao visual da tabela das 16 entries — todas tem `goal` plausivel (nao copy-paste do template).

---

<!-- Gerado por /plan-feature em 2026-05-21 -->
