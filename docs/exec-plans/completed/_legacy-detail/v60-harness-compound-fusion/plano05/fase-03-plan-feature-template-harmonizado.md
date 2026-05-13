<!--
Princípio universal #5 — Comment Provenance.
-->

# Fase 03: Plan-Feature Template Harmonizado (10 Secoes D18)

**Plano:** 05 — Skill Migration + Hooks
**Sizing:** 2h
**Depende de:** fase-02 (path-resolver consolidado disponivel para escrever em `docs/exec-plans/active/`)
**Visual:** false

---

## O que esta fase entrega

`/anti-vibe-coding:plan-feature` gera plano em `docs/exec-plans/active/YYYY-MM-DD-{slug}.md` com **exatamente as 10 secoes harmonizadas** D18 (CA-18): Goal, Scope, Assumptions, Risks, Execution Steps, Review Checklist, Validation Log, Compound Opportunity, Lessons Captured, Exit Criteria. Helper `lib/exec-plan-template.ts` eh reutilizado por `/quick-plan` (fase-04) e `/execute-plan` (fase-05).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/lib/exec-plan-template.ts` | Create | Renderiza template harmonizado; aceita `'full' \| 'quick'` para escolher 10 ou 7 secoes |
| `anti-vibe-coding/skills/plan-feature/templates/exec-plan-full.md.tpl` | Create | Template raw com 10 secoes em ingles |
| `anti-vibe-coding/skills/plan-feature/SKILL.md` | Modify | Substituir secao "Output Format" pelo template harmonizado |
| `anti-vibe-coding/skills/plan-feature/index.ts` (orquestrador) | Modify | Chama `renderExecPlan('full', { slug, goal, ... })` antes de escrever |
| `anti-vibe-coding/tests/plan-feature-template.test.ts` | Create | Valida contagem exata de 10 secoes H2 + ordem |

---

## Implementacao

### Passo 1: definir as 10 secoes canonicas

Constante exportada usada por validador (Plano 04) + skills. Manter ordem **case-sensitive**.

```typescript
// 2026-05-11 (Luiz/dev): D18 — ordem canonica das 10 secoes harmonizadas (CA-18); usado por validador
export const EXEC_PLAN_SECTIONS_FULL = [
  'Goal',
  'Scope',
  'Assumptions',
  'Risks',
  'Execution Steps',
  'Review Checklist',
  'Validation Log',
  'Compound Opportunity',
  'Lessons Captured',
  'Exit Criteria',
] as const

export const EXEC_PLAN_SECTIONS_QUICK = [
  'Goal',
  'Scope',
  'Execution Steps',
  'Validation Log',
  'Compound Opportunity',
  'Lessons Captured',
  'Exit Criteria',
] as const

export type ExecPlanMode = 'full' | 'quick'
```

### Passo 2: `lib/exec-plan-template.ts`

```typescript
// 2026-05-11 (Luiz/dev): renderer compartilhado por /plan-feature (full) e /quick-plan (quick) — D18
import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  EXEC_PLAN_SECTIONS_FULL,
  EXEC_PLAN_SECTIONS_QUICK,
  type ExecPlanMode,
} from './exec-plan-sections'

export type ExecPlanInput = {
  title: string
  mode: ExecPlanMode
  goal?: string
  scope?: string
  assumptions?: string[]
  risks?: string[]
  executionSteps?: string[]      // bullets
  reviewChecklist?: string[]     // checkboxes
  // Validation Log, Compound Opportunity, Lessons Captured, Exit Criteria comecam vazios (preenchidos durante execucao)
  exitCriteria?: string[]
}

export function renderExecPlan(input: ExecPlanInput): string {
  const sections = input.mode === 'full' ? EXEC_PLAN_SECTIONS_FULL : EXEC_PLAN_SECTIONS_QUICK

  const today = new Date().toISOString().slice(0, 10)
  const frontmatter = [
    '---',
    `title: ${JSON.stringify(input.title)}`,
    `mode: ${input.mode}`,
    `status: active`,
    `created: ${today}`,
    '---',
    '',
  ].join('\n')

  const heading = `# Exec Plan: ${input.title}\n`

  const body = sections.map((sec) => renderSection(sec, input)).join('\n')
  return frontmatter + heading + '\n' + body
}

function renderSection(name: string, input: ExecPlanInput): string {
  // 2026-05-11 (Luiz/dev): cada secao tem renderizador dedicado (hash-list > switch — CLAUDE.md global)
  const renderers: Record<string, (i: ExecPlanInput) => string> = {
    'Goal':                 (i) => bulletOrEmpty(i.goal ? [i.goal] : []),
    'Scope':                (i) => bulletOrEmpty(i.scope ? [i.scope] : []),
    'Assumptions':          (i) => bulletOrEmpty(i.assumptions),
    'Risks':                (i) => bulletOrEmpty(i.risks),
    'Execution Steps':      (i) => bulletOrEmpty(i.executionSteps),
    'Review Checklist':     (i) => checkboxOrEmpty(i.reviewChecklist),
    'Validation Log':       () => '<!-- preencher durante execucao: comando + resultado -->\n',
    'Compound Opportunity': () => '<!-- preencher ao /iterate: o que merece virar compound note? -->\n',
    'Lessons Captured':     () => '<!-- preencher ao /iterate: links para docs/compound/ -->\n',
    'Exit Criteria':        (i) => checkboxOrEmpty(i.exitCriteria),
  }
  const renderer = renderers[name] ?? (() => '\n')
  return `## ${name}\n\n${renderer(input)}\n`
}

function bulletOrEmpty(items?: string[]): string {
  if (!items || items.length === 0) return '<!-- preencher -->\n'
  return items.map((it) => `- ${it}`).join('\n') + '\n'
}

function checkboxOrEmpty(items?: string[]): string {
  if (!items || items.length === 0) return '<!-- preencher -->\n'
  return items.map((it) => `- [ ] ${it}`).join('\n') + '\n'
}
```

### Passo 3: escrita do plano no path v6

```typescript
// 2026-05-11 (Luiz/dev): writer separado do renderer — permite dry-run e teste isolado
import { resolvePaths } from './path-resolver-v6'
import { renderExecPlan, type ExecPlanInput } from './exec-plan-template'

export async function writeExecPlan(
  projectRoot: string,
  input: ExecPlanInput,
): Promise<{ filePath: string }> {
  const paths = await resolvePaths(projectRoot)
  const today = new Date().toISOString().slice(0, 10)
  const slug = slugify(input.title)
  const fileName = `${today}-${slug}.md`
  const filePath = path.join(paths.execPlansActiveDir, fileName)

  await fs.mkdir(paths.execPlansActiveDir, { recursive: true })
  await fs.writeFile(filePath, renderExecPlan(input), 'utf-8')
  return { filePath }
}
```

(funcao `slugify` reutilizada de fase-01)

### Passo 4: atualizar `skills/plan-feature/SKILL.md`

````markdown
## Output Format (v6 — D18)

```
1. Apos coletar goal + scope + assumptions + risks + execution_steps:
2. Chamar lib/exec-plan-template.ts → renderExecPlan({ mode: 'full', ... })
3. Escrever em docs/exec-plans/active/YYYY-MM-DD-{slug}.md
4. Output garante 10 secoes H2 nesta ordem (case-sensitive):
   Goal, Scope, Assumptions, Risks, Execution Steps,
   Review Checklist, Validation Log, Compound Opportunity,
   Lessons Captured, Exit Criteria
5. Validation Log / Compound Opportunity / Lessons Captured ficam vazias
   (preenchidas durante execucao via /execute-plan e /iterate)
```
````

---

## Gotchas

- **G7 do plano (D18 — 10 secoes case-sensitive):** Validador de Plano 04 fase-03 pode futuramente checar essas secoes. Erro classico: redator usa `## execution steps` (lowercase) — rejeita. Lock no template via constante exportada.
- **G2 do plano (cross-platform):** `path.join` em `writeExecPlan`.
- **Local 03-G1 (placeholder vs vazio):** Secoes vazias usam HTML comment `<!-- preencher -->`. Validador deve aceitar isso (nao confundir com plano orfao). Documentar em comentario no template.
- **Local 03-G2 (G6 herdado — frontmatter):** Plano em `active/` tem `status: active` no frontmatter. Helper de `/execute-plan` (fase-05) muda para `status: completed` ao mover. Validador de Plano 04 usa essa flag em conjunto com path para detectar orfaos.

---

## Verificacao

### TDD

- [ ] **RED:** Teste `renders all 10 sections in canonical order` — conta matches de `/^## /m` no output de `renderExecPlan({ mode: 'full', title: 'test' })`, espera 10
  - Comando: `bun test tests/plan-feature-template.test.ts --grep '10 sections'`
  - Resultado esperado: `Expected 10, received 6` (versao atual)

- [ ] **GREEN:** Apos implementacao, retorna 10 com ordem exata

### Checklist

- [ ] `lib/exec-plan-sections.ts` exporta `EXEC_PLAN_SECTIONS_FULL` (array de 10 strings) e `EXEC_PLAN_SECTIONS_QUICK` (7 strings)
- [ ] `lib/exec-plan-template.ts` exporta `renderExecPlan(input)` e tipo `ExecPlanInput`
- [ ] Teste valida ordem **exata** das 10 secoes (nao so contagem) — slice das matches comparada com `EXEC_PLAN_SECTIONS_FULL`
- [ ] Frontmatter inclui `title`, `mode: full`, `status: active`, `created`
- [ ] Em fixture v6, rodar `writeExecPlan(root, { mode: 'full', title: 'sample feature' })` cria `docs/exec-plans/active/YYYY-MM-DD-sample-feature.md`
- [ ] Secoes vazias contem placeholder `<!-- preencher -->` ou `<!-- preencher durante... -->`
- [ ] `bun run typecheck` valida tipo `ExecPlanInput` em uso
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/plan-feature-template.test.ts` exit 0 com teste de **ordem exata** das 10 secoes
- `grep -c '^## ' docs/exec-plans/active/{file}.md` retorna `10` em plano gerado modo `full`
- `bun run typecheck` retorna exit 0 (tipos estritos respeitados)

**CA do PRD coberto:**
- CA-18 (verbatim): "Dado `/plan-feature`, quando gerar plano, então arquivo tem todas as 10 seções: Goal, Scope, Assumptions, Risks, Execution Steps, Review Checklist, Validation Log, Compound Opportunity, Lessons Captured, Exit Criteria (S4)."

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
