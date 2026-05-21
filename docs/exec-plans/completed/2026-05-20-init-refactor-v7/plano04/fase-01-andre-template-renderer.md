<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-21 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Andre Template Renderer (puro)

**Plano:** 04 — Step 7 generate-populate-plans (CORE)
**Sizing:** 2h
**Depende de:** Nenhuma (primeira fase deste plano)
**Visual:** false

---

## O que esta fase entrega

Renderer puro `renderAndrePlan(input: AndrePlanInput): string` em
`skills/init/lib/populate-plan-generator.ts` (arquivo reescrito do zero) que recebe
um objeto estruturado e emite markdown com as **10 secoes H2 obrigatorias** do CA-07
do PRD. Zero IO, zero LLM, zero dependencia de stack — apenas formatacao.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/populate-plan-generator.ts` | Rewrite | DELETAR 569 linhas atuais (V2 renderer); criar versao V3 com renderer puro `renderAndrePlan` + tipo `AndrePlanInput` exportado |
| `skills/init/lib/populate-plan-generator.test.ts` | Rewrite | Testes V2 deletados; novos testes de snapshot do renderer (CA-07 — 10 secoes na ordem certa) |
| `skills/init/lib/populate-plan-coverage.ts` | Delete | `computeAuditCoverage` (V2 helper) — orfao apos cleanup |
| `skills/init/lib/populate-plan-coverage.test.ts` | Delete | Testes do helper deletado |
| `skills/init/lib/populate-plan-writer.ts` | Delete | `writePopulatePlanFolder` (V2 writer) — sera substituido em fase-03 por funcao inline no generator |
| `skills/init/lib/populate-plan-writer.test.ts` | Delete | Testes do writer deletado |
| `skills/init/assets/templates/exec-plan/PLAN.md.tpl` | Delete | Tpl V2 mustache-style — substituido por template literal TS no renderer (DI-Plano04-fase01-template-renderer-pure) |
| `skills/init/assets/templates/exec-plan/fase.md.tpl` | Delete | Mesma razao |
| `skills/init/lib/steps/91-generate-populate-plan.ts` | Already deleted by Plano 01 fase-05 | Garantir que nao ha import-orfao apos cleanup (verificar `grep -r "populate-plan-coverage\|populate-plan-writer"` retornar zero) |

---

## Implementacao

### Passo 1: Cleanup (apaga antes de construir)

Antes de qualquer codigo novo, fazer `git rm` dos arquivos a deletar (preserva linhagem):

```bash
git rm skills/init/lib/populate-plan-generator.ts
git rm skills/init/lib/populate-plan-generator.test.ts
git rm skills/init/lib/populate-plan-coverage.ts
git rm skills/init/lib/populate-plan-coverage.test.ts
git rm skills/init/lib/populate-plan-writer.ts
git rm skills/init/lib/populate-plan-writer.test.ts
git rm skills/init/assets/templates/exec-plan/PLAN.md.tpl
git rm skills/init/assets/templates/exec-plan/fase.md.tpl
```

**Verificacao intermediaria:** `bun build` precisa quebrar com import-not-found nos consumers.
Apos a fase-04 wire-up do registry, os imports orfaos do `91-generate-populate-plan.ts`
(que ja foi deletado no Plano 01 fase-05 — confirmar) somem. Plano 01 fase-05 ja garante isso.

**Commit separado:** `chore(init): cleanup populate-plan-generator V2 antes da v7 rewrite`
(commit isolado pro cleanup — alinha com "Limpar Antes de Construir" do CLAUDE.md global).

### Passo 2: Definir tipo `AndrePlanInput`

```typescript
// 2026-05-21 (Luiz/dev): Plano 04 fase-01 — tipo estruturado mapeando 1:1 nas 10 secoes
// H2 do CA-07 do PRD init-refactor-v7. Cada campo vira uma secao no markdown gerado.
// Decisao DI-Plano04-fase01-input-shape: sem campos free-form para evitar drift.

export type Wave = {
  readonly name: string // ex: "Wave 1 — Discovery", "Wave 2 — Write sections"
  readonly items: ReadonlyArray<string> // bullets dentro da Wave
}

export type RiskEntry = {
  readonly risk: string
  readonly mitigation: string
}

export type AndrePlanInput = {
  /** Path canonico do doc-alvo (ex: 'docs/SECURITY.md'). Usado no title H1. */
  readonly docPath: string
  /** Goal: 1-3 linhas descrevendo o que o doc deve conter ao final. */
  readonly goal: string
  /** Scope in (secoes a criar) / out (o que NAO fazer). */
  readonly scope: { readonly in: ReadonlyArray<string>; readonly out: ReadonlyArray<string> }
  /** Pressupostos: o que o plano assume existir (.env.example, middleware, etc). */
  readonly assumptions: ReadonlyArray<string>
  /** Riscos com mitigacao. */
  readonly risks: ReadonlyArray<RiskEntry>
  /** Execution Steps: minimo 2 Waves (CA-07 do PRD). */
  readonly waves: ReadonlyArray<Wave>
  /** Review Checklist: itens binarios verificaveis. */
  readonly reviewChecklist: ReadonlyArray<string>
  /** Compound Opportunity: o que merece virar compound note se aprender algo. */
  readonly compoundOpportunity: string
  /** Exit Criteria: harness-validate passa, zero placeholders, etc. */
  readonly exitCriteria: ReadonlyArray<string>
}
```

### Passo 3: Implementar `renderAndrePlan`

```typescript
// 2026-05-21 (Luiz/dev): renderer puro. Sem IO, sem stack-awareness — recebe input
// pronto e emite markdown. CA-07 do PRD: as 10 secoes H2 nesta ORDEM EXATA.

const SECTION_TITLES = [
  '## Goal',
  '## Scope',
  '## Assumptions',
  '## Risks',
  '## Execution Steps',
  '## Review Checklist',
  '## Validation Log',
  '## Compound Opportunity',
  '## Lessons Captured',
  '## Exit Criteria',
] as const

export function renderAndrePlan(input: AndrePlanInput): string {
  const lines: string[] = []

  // H1 do plano — slug derivado em fase-03 (este renderer apenas usa docPath)
  lines.push(`# Populate: ${input.docPath}`)
  lines.push('')

  // ## Goal
  lines.push(SECTION_TITLES[0])
  lines.push('')
  lines.push(input.goal)
  lines.push('')

  // ## Scope
  lines.push(SECTION_TITLES[1])
  lines.push('')
  lines.push('**In:**')
  for (const s of input.scope.in) lines.push(`- ${s}`)
  lines.push('')
  lines.push('**Out:**')
  for (const s of input.scope.out) lines.push(`- ${s}`)
  lines.push('')

  // ## Assumptions
  lines.push(SECTION_TITLES[2])
  lines.push('')
  for (const a of input.assumptions) lines.push(`- ${a}`)
  lines.push('')

  // ## Risks
  lines.push(SECTION_TITLES[3])
  lines.push('')
  lines.push('| Risco | Mitigacao |')
  lines.push('|-------|-----------|')
  for (const r of input.risks) lines.push(`| ${r.risk} | ${r.mitigation} |`)
  lines.push('')

  // ## Execution Steps (Waves)
  lines.push(SECTION_TITLES[4])
  lines.push('')
  for (const w of input.waves) {
    lines.push(`### ${w.name}`)
    lines.push('')
    for (const item of w.items) lines.push(`- ${item}`)
    lines.push('')
  }

  // ## Review Checklist
  lines.push(SECTION_TITLES[5])
  lines.push('')
  for (const c of input.reviewChecklist) lines.push(`- [ ] ${c}`)
  lines.push('')

  // ## Validation Log
  lines.push(SECTION_TITLES[6])
  lines.push('')
  lines.push('<!-- preencher durante execucao: comando + resultado -->')
  lines.push('')

  // ## Compound Opportunity
  lines.push(SECTION_TITLES[7])
  lines.push('')
  lines.push(input.compoundOpportunity)
  lines.push('')

  // ## Lessons Captured
  lines.push(SECTION_TITLES[8])
  lines.push('')
  lines.push('<!-- preencher ao /iterate: links para docs/compound/ -->')
  lines.push('')

  // ## Exit Criteria
  lines.push(SECTION_TITLES[9])
  lines.push('')
  for (const e of input.exitCriteria) lines.push(`- [ ] ${e}`)
  lines.push('')

  return lines.join('\n')
}

// Util exportado: usado por testes para extrair secoes do markdown (CA-07).
export function extractH2Sections(markdown: string): string[] {
  return markdown
    .split('\n')
    .filter(line => line.startsWith('## '))
    .map(line => line.trim())
}
```

### Passo 4: Testes de snapshot (TDD)

```typescript
// skills/init/lib/populate-plan-generator.test.ts
// 2026-05-21 (Luiz/dev): Plano 04 fase-01 — RED-GREEN do renderer puro.

import { test, expect, describe } from 'bun:test'
import { renderAndrePlan, extractH2Sections, type AndrePlanInput } from './populate-plan-generator'

const SAMPLE_INPUT: AndrePlanInput = {
  docPath: 'docs/SECURITY.md',
  goal: 'Document the security posture: auth, secrets, dependencies, OWASP top 10 coverage.',
  scope: {
    in: ['Auth flow', 'Secret management', 'CSP headers'],
    out: ['Pentest results', 'Compliance audit'],
  },
  assumptions: ['Project uses middleware-based auth', '.env.example exists in repo root'],
  risks: [
    { risk: 'Auth spread across multiple layers', mitigation: 'Wave 1 maps all auth touchpoints first' },
  ],
  waves: [
    { name: 'Wave 1 — Discovery', items: ['Read src/middleware.ts', 'Read src/lib/auth/'] },
    { name: 'Wave 2 — Write sections', items: ['Write ## Auth Flow', 'Write ## Secret Storage'] },
  ],
  reviewChecklist: ['No secrets in markdown', 'All claims linked to code'],
  compoundOpportunity: 'If auth pattern is novel, capture in docs/compound/.',
  exitCriteria: ['harness:validate passes', 'docs/SECURITY.md has no placeholders'],
}

describe('renderAndrePlan', () => {
  test('emits 10 H2 sections in canonical order (CA-07)', () => {
    const md = renderAndrePlan(SAMPLE_INPUT)
    expect(extractH2Sections(md)).toEqual([
      '## Goal',
      '## Scope',
      '## Assumptions',
      '## Risks',
      '## Execution Steps',
      '## Review Checklist',
      '## Validation Log',
      '## Compound Opportunity',
      '## Lessons Captured',
      '## Exit Criteria',
    ])
  })

  test('includes H1 with docPath', () => {
    const md = renderAndrePlan(SAMPLE_INPUT)
    expect(md.startsWith('# Populate: docs/SECURITY.md\n')).toBe(true)
  })

  test('renders Waves as H3 inside ## Execution Steps', () => {
    const md = renderAndrePlan(SAMPLE_INPUT)
    expect(md).toContain('### Wave 1 — Discovery')
    expect(md).toContain('### Wave 2 — Write sections')
  })

  test('renders Risks as markdown table', () => {
    const md = renderAndrePlan(SAMPLE_INPUT)
    expect(md).toContain('| Risco | Mitigacao |')
    expect(md).toContain('| Auth spread across multiple layers |')
  })

  test('Review Checklist uses checkbox syntax', () => {
    const md = renderAndrePlan(SAMPLE_INPUT)
    expect(md).toContain('- [ ] No secrets in markdown')
  })

  test('renders Scope with In/Out sub-blocks', () => {
    const md = renderAndrePlan(SAMPLE_INPUT)
    expect(md).toContain('**In:**')
    expect(md).toContain('**Out:**')
    expect(md).toContain('- Auth flow')
    expect(md).toContain('- Pentest results')
  })

  test('Validation Log + Lessons Captured emit empty placeholder comments', () => {
    const md = renderAndrePlan(SAMPLE_INPUT)
    expect(md).toContain('<!-- preencher durante execucao: comando + resultado -->')
    expect(md).toContain('<!-- preencher ao /iterate: links para docs/compound/ -->')
  })
})

describe('extractH2Sections', () => {
  test('returns only ## lines (ignores ### and #)', () => {
    const md = '# Title\n\n## A\n\n### Sub\n\n## B\n'
    expect(extractH2Sections(md)).toEqual(['## A', '## B'])
  })
})
```

---

## Gotchas

- **G1 do plano (G1 README — 569 linhas deletadas):** o arquivo `populate-plan-generator.ts`
  e SOBRESCRITO inteiro. NAO incremental. Confirmar via `wc -l` antes (569) e depois (~150).

- **G2 do plano (G2 README — tpls externos deletados):** verificar via `ls skills/init/assets/templates/exec-plan/`
  retornar erro `No such file or directory` apos `git rm`.

- **Local — ordem das 10 secoes nao e arbitraria:** CA-07 do PRD lista exatamente nessa
  ordem. Testes verificam via `toEqual` (array equality, ordem importa).

- **Local — sem stack-awareness aqui:** este renderer e estupido de proposito. Stack-awareness
  vive em fase-02 (`buildWavesForDoc`). Aqui apenas formata. Se um teste de fase-01 falhar
  porque "deveria ter app/views", e bug de design — Wave em `input.waves` ja deveria estar
  resolvida pelo caller.

- **Local — string interpolation tem newlines literais:** `lines.push('')` adiciona linha
  em branco. `lines.join('\n')` no fim. Sem `\r\n` (CRLF Windows) — testes em fixtures Windows
  podem precisar normalizar antes de comparar (`md.replace(/\r\n/g, '\n')`).

---

## Verificacao

### TDD

- [ ] **RED:** Testes escritos e FALHAM porque `populate-plan-generator.ts` foi deletado em Passo 1
  - Comando: `bun test populate-plan-generator.test.ts`
  - Resultado esperado: `Cannot find module './populate-plan-generator'` (import error apos delete)

- [ ] **RED-2:** Apos criar arquivo vazio (`touch populate-plan-generator.ts`), testes falham por
  `renderAndrePlan is not a function`
  - Comando: `bun test populate-plan-generator.test.ts -t "10 H2 sections"`
  - Resultado: `renderAndrePlan is not a function`

- [ ] **GREEN:** Renderer implementado conforme Passo 3, testes passam
  - Comando: `bun test populate-plan-generator.test.ts`
  - Resultado esperado: `8 passed, 0 failed` (8 testes: 7 do `renderAndrePlan` + 1 do `extractH2Sections`)

### Checklist

- [ ] Arquivo `populate-plan-generator.ts` tem < 200 linhas (renderer + tipos + util)
- [ ] Zero `import` de `fs`, `path`, `node:fs`, `detect-stack` (renderer puro)
- [ ] `export type AndrePlanInput` disponivel para importacao por fase-02 e fase-03
- [ ] `export function renderAndrePlan` disponivel
- [ ] `export function extractH2Sections` disponivel (uso em testes)
- [ ] `bun run lint` limpo no novo arquivo
- [ ] `bun run typecheck` limpo (se configurado)
- [ ] Cleanup commit isolado: `git log --oneline -5` mostra commit de `chore(init): cleanup...` antes do commit da impl

---

## Criterio de Aceite

**Por maquina:**
- `bun test populate-plan-generator.test.ts` retorna `8 passed, 0 failed`
- `grep -c "^## " <(echo "$RENDER_OUTPUT")` retorna `10` (10 secoes H2)
- `grep -c "^import.*from '.*fs'" skills/init/lib/populate-plan-generator.ts` retorna `0` (renderer puro)
- `wc -l skills/init/lib/populate-plan-generator.ts` retorna valor < 200

**Por humano:**
- Inspecao visual do output do `renderAndrePlan(SAMPLE_INPUT)` mostra markdown bem formado,
  sem `\n\n\n` excessivos, sem strings template nao-substituidas (`{{...}}`).

---

<!-- Gerado por /plan-feature em 2026-05-21 -->
