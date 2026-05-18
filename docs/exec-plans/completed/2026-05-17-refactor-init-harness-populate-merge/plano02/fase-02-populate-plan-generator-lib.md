<!--
Princípio universal #5 — Comment Provenance.
Helpers TS deste plugin tem JSDoc canonico — provenance inline aplica-se apenas
a pontos nao-obvios (logica de exclusao de filosoficos, formato do date path-safe,
contrato `sharedGlossary` opcional). Resto fica com JSDoc.
-->

# Fase 02: Helper `populate-plan-generator.ts` (TDD)

**Plano:** 02 — Tracer Bullet — Populate Plan Generator
**Sizing:** 1h
**Depende de:** fase-01 (template canonico em `skills/init/assets/snippets/populate-plan-template.md`)
**Visual:** false

---

## O que esta fase entrega

Helper canonico `skills/init/lib/populate-plan-generator.ts` que, dado o `TEMPLATE_MANIFEST` do harness e um diretorio-alvo, renderiza o `populate-plan-template.md` substituindo placeholders e emite o conteudo final pronto para escrita em disco. Cobertura via TDD com 5 testes em `populate-plan-generator.test.ts`. Sera consumido pelo Step 91 da fase-03 e pelo `detect-drift-incremental` do Plano 05 fase-03.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/populate-plan-generator.ts` | Create | Helper com `generatePopulatePlan` + tipos publicos |
| `skills/init/lib/populate-plan-generator.test.ts` | Create | 5 testes cobrindo render, exclusoes, glossario opcional, validate task literal, determinismo |
| `docs/exec-plans/active/2026-05-17-refactor-init-harness-populate-merge/plano02/MEMORY.md` | Modify | Registrar API final (4 simbolos exportados) + qualquer DI/BUG/GT |

---

## Implementacao

### Passo 1: Definir tipos publicos (RED)

```typescript
// skills/init/lib/populate-plan-generator.ts

/**
 * 2026-05-18 (Luiz/dev): D13+MH-02 do PRD — uma task por arquivo populavel.
 * Wave = 1 (paralelo) para tasks de populacao, Wave = 2 (barreira) para validate.
 */
export type PopulatePlanTask = {
  readonly targetPath: string  // relativo ao cwd, ex: 'docs/SECURITY.md'
  readonly wave: 1 | 2
  readonly subagentRole: 'harness-populator' | 'harness-validator'
}

/**
 * 2026-05-18 (Luiz/dev): D1+D14+CH-03 do PRD — input do gerador.
 * `cwd` = projeto alvo; `clock` injetavel em testes; `sharedGlossary` opcional v1.
 */
export type PopulatePlanInput = {
  readonly cwd: string
  readonly projectName: string
  /** Injetavel em testes para determinismo. Default: () => new Date(). */
  readonly clock?: () => Date
  /** CH-03: terminologia compartilhada extraida do projeto (Planos 03+). Undefined em greenfield. */
  readonly sharedGlossary?: string
}

/**
 * 2026-05-18 (Luiz/dev): MH-01+G5 do plano02 — caminho do PLAN.md de populacao
 * em formato path-safe (Windows G5: sem `:`).
 */
export type PopulatePlanOutput = {
  /** Conteudo Markdown final, pronto para fs.writeFile. */
  readonly planMarkdown: string
  /** Caminho relativo ao cwd onde o Step 91 escrevera: `docs/exec-plans/active/{date}-populate-harness/PLAN.md`. */
  readonly relativePath: string
  /** Lista de tasks renderizadas (uteis para audit log + assertions de teste). */
  readonly tasks: ReadonlyArray<PopulatePlanTask>
}

export declare function generatePopulatePlan(input: PopulatePlanInput): Promise<PopulatePlanOutput>
```

### Passo 2: Lista de exclusoes canonicas (constantes internas)

```typescript
// 2026-05-18 (Luiz/dev): D14 — filosoficos. D6/MH-08 — README intocavel.
// Lista derivada do TEMPLATE_MANIFEST.dst — quem nao bate em .md OU esta aqui sai.
const EXCLUDED_FROM_POPULATION: ReadonlySet<string> = new Set([
  'docs/COMPOUND_ENGINEERING.md',
  'docs/PRODUCT_SENSE.md',
  'README.md',
])

/**
 * Regra de selecao: dst termina em `.md` E nao esta na blocklist.
 * Exclui automaticamente `.github/pull_request_template.md` se desejado?
 * Decisao: PRD nao trata `.github/pull_request_template.md` como arquivo do harness
 * populavel. Excluir tambem.
 *
 * Lista final efetiva (25 arquivos, derivada do manifest atual):
 * - docs/DESIGN.md, docs/FRONTEND.md, docs/PLANS.md, docs/QUALITY_SCORE.md,
 *   docs/MERGE_GATES.md, docs/RELIABILITY.md, docs/SECURITY.md,
 *   docs/design-docs/index.md, docs/design-docs/core-beliefs.md,
 *   docs/exec-plans/active/README.md, docs/exec-plans/completed/README.md,
 *   docs/exec-plans/tech-debt-tracker.md,
 *   docs/compound/README.md,
 *   docs/review-checklists/{README,security,reliability,agent-api,frontend-ui,production-readiness}.md,
 *   docs/smoke-flows/README.md, docs/product-specs/index.md, docs/references/README.md,
 *   docs/generated/db-schema.md,
 *   docs/STATE.md, TODO.md.
 */
const EXCLUDED_PATTERNS: ReadonlyArray<RegExp> = [
  /^\.github\//,
  /^scripts\//,
]
```

### Passo 3: Algoritmo de `generatePopulatePlan`

Funcao publica unica. Passos sequenciais:

1. **Resolver `clock`:** `const now = (input.clock ?? (() => new Date()))()`.
2. **Path-safe date (G5 do plano):**
   ```typescript
   const datePathSafe = now.toISOString().replace(/[:.]/g, '-').replace(/-\d{3}Z$/, 'Z')
   // 2026-05-18T14:30:00.000Z -> 2026-05-18T14-30-00Z
   ```
3. **Path relativo:** `const relativePath = path.join('docs', 'exec-plans', 'active', \`${datePathSafe}-populate-harness\`, 'PLAN.md')`.
4. **Filtrar arquivos populaveis do `TEMPLATE_MANIFEST`:**
   ```typescript
   const populatable = TEMPLATE_MANIFEST.filter(entry => {
     if (!entry.dst.endsWith('.md')) return false
     if (EXCLUDED_FROM_POPULATION.has(entry.dst)) return false
     if (EXCLUDED_PATTERNS.some(rx => rx.test(entry.dst))) return false
     return true
   })
   ```
5. **Renderizar tasks da wave 1:** map de `populatable` para string Markdown no shape do Passo 3 da fase-01.
6. **Renderizar wave 2 (validate task):** string literal constante (mesma em todos os PLAN.md).
7. **Renderizar bloco do glossario:**
   ```typescript
   const glossaryBlock = input.sharedGlossary
     ? renderGlossarySection(input.sharedGlossary)
     : ''  // G6 do plano02: vazio quando undefined.
   ```
8. **Ler template:** `const template = await fs.readFile(TEMPLATE_PATH, 'utf8')` onde
   `TEMPLATE_PATH = path.join(import.meta.dir, '..', 'assets', 'snippets', 'populate-plan-template.md')`.
9. **Substituir placeholders:**
   ```typescript
   const planMarkdown = template
     .replaceAll('{{PROJECT_NAME}}', input.projectName)
     .replaceAll('{{DATE}}', datePathSafe)
     .replaceAll('{{SHARED_GLOSSARY_BLOCK}}', glossaryBlock)
     .replaceAll('{{TASKS_BLOCK}}', tasksBlock)
     .replaceAll('{{VALIDATE_TASK}}', validateTaskBlock)
   ```
10. **Montar lista `tasks`** (uteis para audit log na fase-03):
    ```typescript
    const tasks: ReadonlyArray<PopulatePlanTask> = [
      ...populatable.map(e => ({ targetPath: e.dst, wave: 1 as const, subagentRole: 'harness-populator' as const })),
      { targetPath: 'scripts/harness-validate.ts', wave: 2 as const, subagentRole: 'harness-validator' as const },
    ]
    ```
11. **Retornar:** `{ planMarkdown, relativePath, tasks }`.

### Passo 4: Helper interno `renderTaskMarkdown`

```typescript
function renderTaskMarkdown(targetPath: string, glossaryRefLine: string): string {
  // 2026-05-18 (Luiz/dev): MH-02 — uma task por arquivo. Shape canonico da fase-01.
  return [
    `### Task: Populate \`${targetPath}\``,
    '',
    '**Subagent role:** harness-populator',
    `**Target file:** \`${targetPath}\` (relative to project root)`,
    '**Wave:** 1 (parallel-safe)',
    '**Estimated tokens:** ~3000 (read repo + write file)',
    '',
    '**Prompt:**',
    '> Voce eh um subagente harness-populator. Sua tarefa eh popular o arquivo',
    `> \`${targetPath}\` analisando o repositorio atual.`,
    '>',
    `> 1. Leia o template atual em \`${targetPath}\` para entender estrutura esperada.`,
    '> 2. Analise o repositorio (codigo, configs, docs existentes) para extrair',
    '>    informacao relevante a esta categoria do harness.',
    '> 3. Substitua placeholders/conteudo generico por dados reais do projeto.',
    '> 4. PRESERVE a estrutura do template (headings, secoes). Apenas POPULE.',
    '> 5. Respeite limites do harness (AGENTS.md <=40 linhas; demais sucintos).',
    '> 6. Se uma secao nao se aplica, escreva "N/A — {razao curta}".',
    glossaryRefLine ? `>\n> ${glossaryRefLine}` : '',
    '>',
    `> **Output esperado:** arquivo \`${targetPath}\` populado, commit-ready.`,
    '',
    '**Verification:**',
    `- [ ] Arquivo \`${targetPath}\` existe e nao eh placeholder original.`,
    '- [ ] Estrutura de headings preservada.',
    '- [ ] `bun run scripts/harness-validate.ts` passa para este arquivo.',
    '',
  ].filter(line => line !== '').join('\n')  // remove linhas vazias condicionais
}
```

> **Atencao G6:** `glossaryRefLine` e uma string nao-vazia somente quando `sharedGlossary !== undefined`. Ex: `"Use os termos do glossario compartilhado acima."`. Quando undefined, e string vazia e o `filter` remove a linha.

### Passo 5: Helper interno `renderValidateTaskBlock`

String literal constante. Mesmo conteudo em todos os PLAN.md (G4 do plano):

```typescript
const VALIDATE_TASK_BLOCK = [
  '### Task: Validate Harness',
  '',
  '**Subagent role:** harness-validator',
  '**Wave:** 2 (sequential, runs after wave 1 completes)',
  '',
  '**Command:**',
  '```bash',
  'bun run scripts/harness-validate.ts && bun run scripts/compound-check.ts',
  '```',
  '',
  '**Verification:**',
  '- [ ] Exit code 0.',
  '- [ ] Falha bloqueia este plano em status `awaiting-fix` (SH-06).',
  '- [ ] Falha NAO reverte tasks da wave 1 — dev corrige o arquivo violador manualmente e re-roda esta task.',
].join('\n')
```

### Passo 6: Helper interno `renderGlossarySection`

```typescript
function renderGlossarySection(body: string): string {
  return [
    '## Glossario Compartilhado',
    '',
    '> Terminologia extraida do projeto (via Step 08 `classify-blocks-hybrid`).',
    '> Subagentes da wave 1 devem usar exatamente estes termos para evitar divergencia.',
    '',
    body,
    '',
    '---',
    '',
  ].join('\n')
}
```

### Passo 7: Testes (`populate-plan-generator.test.ts`)

Cada teste usa clock injetado para determinismo (sem flakiness por horario de execucao).

| # | Nome do teste | O que verifica |
|---|---------------|----------------|
| 1 | `generatePopulatePlan renders one task per populatable manifest entry` | Conta `### Task: Populate \`` no `planMarkdown` e asserta igualdade com tamanho de `populatable` (esperado: 25 dado o manifest atual). Tamanho do `output.tasks` filtrado por wave 1 tambem deve bater. |
| 2 | `generatePopulatePlan excludes COMPOUND_ENGINEERING and PRODUCT_SENSE` | `expect(planMarkdown).not.toContain('### Task: Populate \`docs/COMPOUND_ENGINEERING.md\`')` + idem PRODUCT_SENSE. Assertion negativa em ambos. |
| 3 | `generatePopulatePlan excludes README.md and .github/* and scripts/*` | `expect(planMarkdown).not.toContain('Populate \`README.md\`')`, idem `Populate \`.github/`, idem `Populate \`scripts/`. |
| 4 | `validate task is always last with literal command string` | `planMarkdown.lastIndexOf('### Task:')` aponta para `### Task: Validate Harness` + `expect(planMarkdown).toContain('bun run scripts/harness-validate.ts && bun run scripts/compound-check.ts')` exato. |
| 5 | `sharedGlossary undefined omits section; defined includes it with body` | (a) Sem `sharedGlossary` → `expect(planMarkdown).not.toContain('## Glossario Compartilhado')`. (b) Com `sharedGlossary: 'foo bar'` → `expect(planMarkdown).toContain('## Glossario Compartilhado')` E `toContain('foo bar')` E `toContain('Subagentes da wave 1 devem usar')`. |

**Adicional (bonus, nao obrigatorio):** teste de determinismo — duas chamadas com mesmo clock + sharedGlossary produzem byte-identico `planMarkdown`. Reforca que nao ha `Date.now()` interno escondido.

### Passo 8: REFACTOR

- Extrair constantes para top-level: `EXCLUDED_FROM_POPULATION`, `EXCLUDED_PATTERNS`, `VALIDATE_TASK_BLOCK`, `TEMPLATE_PATH`.
- Garantir que tipos exportados sao `Readonly`/`ReadonlyArray`.
- JSDoc em cada simbolo exportado.
- Nenhum `as` ou `any` (CLAUDE.md global).

---

## Snippets de referencia

### Imports necessarios

```typescript
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { TEMPLATE_MANIFEST } from './template-manifest'
```

### Caminho do template

```typescript
// 2026-05-18 (Luiz/dev): mesmo padrao de scaffold-full-tree.ts — relativo a lib/.
const TEMPLATE_PATH = path.join(
  import.meta.dir,
  '..',
  'assets',
  'snippets',
  'populate-plan-template.md',
)
```

---

## Gotchas

- **G2 do plano (filosoficos):** `EXCLUDED_FROM_POPULATION` e contrato com o teste #2. NAO trocar para regex — set literal e mais explicito e auditavel.
- **G4 do plano (validate literal):** Comando do bash exatamente `bun run scripts/harness-validate.ts && bun run scripts/compound-check.ts`. Test #4 faz `toContain` da string completa.
- **G5 do plano (Windows path-safety):** `relativePath` usa `path.join` que produz `\\` no Windows. Teste deve normalizar via `result.relativePath.replaceAll(path.sep, '/')` ANTES de comparar com `docs/exec-plans/active/...` — ou usar `path.posix.join` para o `relativePath` (alternativa mais defensiva). Decidir e documentar em MEMORY.md como DI-N. **Recomendado:** usar `path.posix.join` para `relativePath` (o consumidor escrevera o arquivo via `fs.writeFile(path.join(cwd, relativePath))` que normaliza no destino).
- **G6 do plano (glossario opcional):** Quando `sharedGlossary === undefined`, `{{SHARED_GLOSSARY_BLOCK}}` vira string vazia EXATA. Verificar que o template (fase-01) nao tem `\n` parasitas ao redor do placeholder que destruiria o ritmo visual.
- **Local — template lido em runtime:** Cada chamada de `generatePopulatePlan` faz `fs.readFile` do template. Aceitavel: chamado 1x por `/init`. Se virar hot path (Plano 05 drift detector chamando em loop), cache em modulo-level.
- **Local — Set + RegExp[] sao constantes top-level:** evita realocacao por chamada.
- **Local — sem `Date.now()` direto:** sempre via `clock()` para testabilidade. CLAUDE.md global: testes nao podem depender de relogio real.

---

## Verificacao

### TDD

- [ ] **RED:** Criar `populate-plan-generator.test.ts` com os 5 testes ANTES de implementar. Para evitar erro de import, criar stub vazio em `populate-plan-generator.ts` que exporta os 4 nomes lancando `Error('not implemented')`. Rodar:
  - Comando: `bun test skills/init/lib/populate-plan-generator.test.ts`
  - Resultado esperado: `5 failed` por assertion (nao por import error).

- [ ] **GREEN:** Implementar `generatePopulatePlan` + helpers internos. Cada commit incremental faz 1 ou 2 testes passarem.
  - Comando: `bun test skills/init/lib/populate-plan-generator.test.ts`
  - Resultado esperado: `5 passed, 0 failed`.

- [ ] **REFACTOR:** Extrair constantes, JSDoc, garantir imutabilidade. Re-rodar testes — devem continuar verdes.

### Checklist

- [ ] `skills/init/lib/populate-plan-generator.ts` exporta exatamente: `PopulatePlanTask`, `PopulatePlanInput`, `PopulatePlanOutput`, `generatePopulatePlan`.
- [ ] `grep -E '^export (function|type|const) ' skills/init/lib/populate-plan-generator.ts | wc -l` >= 4.
- [ ] Todos os 5 testes em `populate-plan-generator.test.ts` passam.
- [ ] Teste #1 conta `25` tasks de populacao dado o `TEMPLATE_MANIFEST` atual (ajustar para `TEMPLATE_MANIFEST.filter(...).length` para nao acoplar a numero literal — se o manifest crescer no futuro, teste continua valido).
- [ ] Teste #2 cobre os 2 filosoficos.
- [ ] Teste #3 cobre README, `.github/*`, `scripts/*`.
- [ ] Teste #4 verifica string exata do comando de validate.
- [ ] Teste #5 cobre AMBOS os caminhos de `sharedGlossary`.
- [ ] Nenhum teste depende de relogio real (todos passam `clock: () => new Date('2026-05-18T14:30:00.000Z')`).
- [ ] `bun run lint skills/init/lib/populate-plan-generator.ts skills/init/lib/populate-plan-generator.test.ts` retorna 0.
- [ ] Sem `any`, sem `as` (CLAUDE.md global).
- [ ] `MEMORY.md` do plano02: secao "Notas para Planos Seguintes" lista API publica (`PopulatePlanInput`, `PopulatePlanOutput`, `generatePopulatePlan`) com assinatura exata + nota da decisao path.posix vs path.join (DI-N).

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/populate-plan-generator.test.ts` retorna `5 passed, 0 failed`.
- `bun run lint skills/init/lib/populate-plan-generator.ts skills/init/lib/populate-plan-generator.test.ts` retorna 0.
- `grep -E '^export ' skills/init/lib/populate-plan-generator.ts | wc -l` >= 4.

**Por humano:**
- Reviewer importa `generatePopulatePlan` em arquivo TS de teste e verifica que autocomplete mostra `PopulatePlanInput` com 4 campos tipados (`cwd`, `projectName`, `clock?`, `sharedGlossary?`) e `PopulatePlanOutput` com 3 campos (`planMarkdown`, `relativePath`, `tasks`).

---

## Decisoes Aplicadas

- **D13 do PRD** (subagents paralelos): cada task tem `wave: 1`, validate task tem `wave: 2`.
- **D14 do PRD** (filosoficos): `EXCLUDED_FROM_POPULATION` set + teste #2.
- **D15 + SH-06 do PRD** (validate ao final): `VALIDATE_TASK_BLOCK` constante + teste #4 verifica string literal.
- **MH-01 do PRD** (PLAN.md gerado em path canonico): `relativePath` = `docs/exec-plans/active/{date}-populate-harness/PLAN.md`.
- **MH-02 do PRD** (>=1 task por arquivo): teste #1 conta `populatable.length` tasks renderizadas.
- **MH-08 do PRD** (README intocavel): `EXCLUDED_FROM_POPULATION` inclui `README.md` + teste #3.
- **CH-03 do PRD** (glossario compartilhado opcional v1): `sharedGlossary?: string` no input + teste #5 cobre ambos caminhos.
- **R-04 do PRD** (Windows compat): `path.posix.join` para `relativePath` ou normalizacao via `replaceAll(path.sep, '/')` antes de retornar.
- **G5 do plano01 / G5 do plano02** (path-safe timestamp): mesma formula que `backup-anti-vibe.ts` — consistencia terminologica entre planos.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
