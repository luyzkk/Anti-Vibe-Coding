<!--
Princípio universal #5 — Comment Provenance.
Esta fase entrega fixture greenfield + teste E2E. Provenance inline aplica-se ao
test file (em pontos nao-obvios: count tasks vs TEMPLATE_MANIFEST). Fixture eh
arquivo de dados, sem provenance.
-->

# Fase 04: Greenfield E2E — Tracer Bullet feature-wide (TDD)

**Plano:** 02 — Tracer Bullet — Populate Plan Generator
**Sizing:** 0.5h
**Depende de:** fase-03 (Step 91 registrado + funcional)
**Visual:** false

---

## O que esta fase entrega

Tracer bullet **feature-wide**: prova end-to-end que `/anti-vibe-coding:init` em um repositorio greenfield (sem CLAUDE.md, sem `docs/`, sem manifest) executa `runInit` integralmente e ao final emite em disco `docs/exec-plans/active/{date}-populate-harness/PLAN.md` com `>= TEMPLATE_MANIFEST.length - blocklistSize` tasks de populacao (CA-01). Garante que dispatcher → registry → Step 91 → populate-plan-generator → escrita esta validada como cadeia integral.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/fixtures/greenfield-populate-plan-tracer/.gitkeep` | Create | Marker de fixture greenfield minimo (pasta vazia, sem CLAUDE.md, sem docs/) |
| `tests/e2e/greenfield-populate-plan.test.ts` | Create | Teste E2E que roda `runInit` em copia do fixture (via `mkdtemp`) e asserta CA-01 |
| `docs/exec-plans/active/2026-05-17-refactor-init-harness-populate-merge/plano02/MEMORY.md` | Modify | Registrar count exato de tasks emitidas no greenfield (snapshot atual do `TEMPLATE_MANIFEST`) + qualquer DI/BUG/GT |

---

## Implementacao

### Passo 1: Criar fixture greenfield minimo

O fixture e o cenario MAIS LIMPO possivel:
- Pasta `tests/fixtures/greenfield-populate-plan-tracer/`
- Conteudo: somente `.gitkeep` (Git track folder vazio).
- SEM `CLAUDE.md` (greenfield = sem merge invertido).
- SEM `docs/` (greenfield = sem docs estruturais para classificar).
- SEM `.claude/` (greenfield = sem manifest, init detecta como `greenfield` mode).
- SEM `package.json` (`detectProjectName` deve fallback para nome da pasta).

```bash
# Criacao da fixture (passo manual ou via test setup):
mkdir -p tests/fixtures/greenfield-populate-plan-tracer
touch tests/fixtures/greenfield-populate-plan-tracer/.gitkeep
```

> **Atencao:** o test usa `mkdtemp` para copiar o fixture, NUNCA escreve no fixture original. Isso permite o test rodar em paralelo com outros suites E2E.

### Passo 2: Estrutura do teste E2E

`tests/e2e/greenfield-populate-plan.test.ts`:

```typescript
// 2026-05-18 (Luiz/dev): CA-01 do PRD — tracer bullet feature-wide.
// Greenfield → /init → existe PLAN.md de populacao com >=1 task por arquivo harness.
// MH-01, MH-02 do PRD validados aqui em integracao.
import { describe, expect, test } from 'bun:test'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { runInit } from '../../skills/init/lib/run-init'
import { TEMPLATE_MANIFEST } from '../../skills/init/lib/template-manifest'

const FIXTURE_DIR = path.join(import.meta.dir, '..', 'fixtures', 'greenfield-populate-plan-tracer')
const EXCLUDED_FROM_POPULATION = new Set([
  'docs/COMPOUND_ENGINEERING.md',
  'docs/PRODUCT_SENSE.md',
  'README.md',
])
const EXCLUDED_PATTERNS = [/^\.github\//, /^scripts\//]

function isPopulatable(dst: string): boolean {
  if (!dst.endsWith('.md')) return false
  if (EXCLUDED_FROM_POPULATION.has(dst)) return false
  if (EXCLUDED_PATTERNS.some(rx => rx.test(dst))) return false
  return true
}

async function setupGreenfield(): Promise<string> {
  const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-greenfield-'))
  // Copia o fixture (apenas .gitkeep — efetivamente vazio).
  await fs.cp(FIXTURE_DIR, tmpdir, { recursive: true })
  return tmpdir
}

describe('greenfield populate-plan tracer (CA-01)', () => {
  test('runInit emits PLAN.md of populacao with >=1 task per populatable harness file', async () => {
    const cwd = await setupGreenfield()

    // Roda init real no fixture clonado. Sem args / sem flags.
    const result = await runInit({ argv: [], cwd })

    expect(result).toBeDefined()
    // 2026-05-18 (Luiz/dev): assertion sobre exit/abort:
    // runInit retorna estrutura prova de sucesso (sem AbortError no greenfield).
    // Adaptar shape ao retorno real de runInit (kind: 'ok' | 'aborted').

    // 1) Existe a pasta {date}-populate-harness/ em docs/exec-plans/active/
    const activeDir = path.join(cwd, 'docs', 'exec-plans', 'active')
    const entries = await fs.readdir(activeDir)
    const populateDirs = entries.filter(e => /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z-populate-harness$/.test(e))
    expect(populateDirs).toHaveLength(1)

    // 2) PLAN.md existe na pasta.
    const planPath = path.join(activeDir, populateDirs[0]!, 'PLAN.md')
    const planContent = await fs.readFile(planPath, 'utf8')

    // 3) Count de `### Task: Populate \`` >= numero de arquivos populaveis do TEMPLATE_MANIFEST.
    const expectedTaskCount = TEMPLATE_MANIFEST.filter(e => isPopulatable(e.dst)).length
    const taskOccurrences = (planContent.match(/### Task: Populate `/g) ?? []).length
    expect(taskOccurrences).toBe(expectedTaskCount)
    expect(expectedTaskCount).toBeGreaterThanOrEqual(20)  // sanity — manifest atual tem 25

    // 4) Filosoficos NAO aparecem como tasks.
    expect(planContent).not.toContain('### Task: Populate `docs/COMPOUND_ENGINEERING.md`')
    expect(planContent).not.toContain('### Task: Populate `docs/PRODUCT_SENSE.md`')

    // 5) README NAO aparece.
    expect(planContent).not.toContain('### Task: Populate `README.md`')

    // 6) Ultima task eh validate harness (literal).
    expect(planContent).toContain('### Task: Validate Harness')
    expect(planContent).toContain('bun run scripts/harness-validate.ts && bun run scripts/compound-check.ts')

    // 7) Wave markers presentes.
    expect(planContent).toContain('wave: 1')
    expect(planContent).toContain('wave: 2')

    // 8) Sem `## Glossario Compartilhado` (greenfield = sharedGlossary undefined).
    expect(planContent).not.toContain('## Glossario Compartilhado')

    // 9) Cleanup nao eh estrito — mkdtemp eh efemero, SO limpa.
  }, 60_000)  // 60s timeout — RNF-01 (<30s) + margem para CI lento.

  test('init does NOT invoke /anti-vibe-coding:execute-plan automatically (G1 / D3)', async () => {
    const cwd = await setupGreenfield()
    await runInit({ argv: [], cwd })

    // PLAN.md de populacao existe, mas NENHUMA evidencia de execucao:
    // - Nenhum arquivo do harness foi populado (continuam placeholders).
    // - Nenhum log indica execute-plan chamado.
    // Heuristica: docs/SECURITY.md ainda contem o conteudo do template (placeholder).
    const securityPath = path.join(cwd, 'docs', 'SECURITY.md')
    const securityContent = await fs.readFile(securityPath, 'utf8')
    // O template canonico contem marcadores tipo `{{PROJECT_NAME}}` ja renderizados pelo scaffold,
    // mas a estrutura do template original (headings tipicos) deve estar intacta.
    // Assertion fraca mas suficiente para o tracer: arquivo nao virou conteudo real.
    expect(securityContent.length).toBeLessThan(5000)  // template canonico eh pequeno; conteudo populado seria maior
  }, 60_000)
})
```

> **Nota sobre adaptacao:** o shape exato de `runInit({ argv, cwd })` e seu retorno depende do que o Plano 01 fase-03 deixou (early-return de `--rollback`). Adaptar a importacao e o destructuring conforme o retorno real. O essencial e:
> 1. Chamar `runInit` apontando para o `cwd` do fixture clonado.
> 2. Asserter que PLAN.md de populacao foi escrito.
> 3. Validar count e estrutura conforme item-a-item do checklist.

### Passo 3: Atualizar fixtures harness-validate caso necessario

Se o test E2E rodar `harness:validate` implicitamente (atraves do `finalValidationStep`), o fixture greenfield precisa passar essa validacao para o Step 91 chegar a executar.

`finalValidationStep` invoca `bun run scripts/harness-validate.ts` no `cwd` do projeto. Para o teste E2E nao ficar dependente de scripts/harness-validate.ts funcionar em fixture absolutamente vazio:

- **Opcao A (preferida):** `runInit` no greenfield deve produzir scaffold completo (Step 01 `scaffold-full-tree` cria todos os arquivos do `TEMPLATE_MANIFEST` no `cwd`). Apos isso, `scripts/harness-validate.ts` ja existe no `cwd` (porque o manifest inclui `scripts/compound-check.ts` + `scripts/new-plan.ts` — verificar se inclui tambem `harness-validate.ts`).
- **Opcao B (se A falhar):** mockar `finalValidationStep` no teste E2E para retornar sucesso sem rodar bash. **Nao preferido** — destroi a integracao real.

> **Verificar manualmente antes da fase-04:** `scripts/harness-validate.ts` esta no `TEMPLATE_MANIFEST`? Se nao, o teste E2E pode falhar no `finalValidationStep` ANTES de chegar no Step 91. Documentar como GT no `MEMORY.md`.

Se nao estiver, opcoes:
- Adicionar `scripts/harness-validate.ts.tpl` ao manifest (mudanca menor, mas escopo creep — Plano 01 ou separado).
- Aceitar que o test E2E tem que mockar `finalValidationStep` na fase-04 (DI documentado).
- Pular `final-validation` neste tracer bullet via flag interna (anti-pattern — nao recomendado).

**Recomendacao:** documentar a descoberta no MEMORY.md como GT-1 e tomar a decisao caso-a-caso durante execucao. Se necessario, criar issue para Plano 07 fase-01 (greenfield-v6.4 fixture) cobrir.

### Passo 4: Configurar tolerancia de tempo

`runInit` em greenfield deve completar em <30s (RNF-01 do PRD). O test usa timeout 60s para CI lento. Se o test sistematicamente passa em <10s local + <30s CI, manter timeout. Se varia, ajustar para 120s e documentar como BUG-N.

### Passo 5: Documentar count exato no MEMORY.md

Apos primeira execucao verde, registrar no MEMORY.md a contagem real:

```markdown
## Notas para Planos Seguintes

- **Count baseline de tasks no PLAN.md de populacao (snapshot 2026-05-18):**
  - Tamanho TEMPLATE_MANIFEST: 31 entradas
  - Excluidas por filosofia (D14): 2 (`docs/COMPOUND_ENGINEERING.md`, `docs/PRODUCT_SENSE.md`)
  - Excluidas por nao-`.md`: 2 (`scripts/compound-check.ts`, `scripts/new-plan.ts`)
  - Excluidas por blocklist (README, .github): 2 (`README.md`, `.github/pull_request_template.md`)
  - **Tasks emitidas: 25 wave-1 + 1 wave-2 (validate) = 26 total.**

- Plano 03 fase-06 (classify-blocks-hybrid) podera reduzir o set quando classificar docs existentes para `docs/references/` — esses arquivos ja populados nao entram nas tasks da wave 1.

- Plano 05 fase-03 (drift detector) podera reduzir o set quando filtrar para apenas arquivos PLACEHOLDER. POPULATED + DRIFT nao entram.
```

---

## Snippets de referencia

### Helper `setupGreenfield` (extrair se ficar em mais de um teste)

Pode evoluir para `tests/helpers/setup-greenfield.ts` no Plano 07 fase-01. Aqui mantemos inline para minimizar escopo do plano02.

### Assertion idiomatica para count de tasks

```typescript
const taskOccurrences = (planContent.match(/### Task: Populate `/g) ?? []).length
// `match` com /g retorna array de matches ou null; `?? []` lida com null seguro.
// `.length` da o count. Mais robusto que split('### Task:').length - 1.
```

### Tolerar mtime para pasta {date}

A pasta `{date}-populate-harness` tem nome derivado do ISO timestamp. Asserter via regex em vez de string literal evita flakiness:

```typescript
const populateDirs = entries.filter(e =>
  /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z-populate-harness$/.test(e)
)
```

---

## Gotchas

- **G9 do plano (CA-01 = aceite por contrato):** Assert sobre count usa `TEMPLATE_MANIFEST.filter(isPopulatable).length` em vez de numero literal. Se o manifest crescer no futuro (Plano 04 adiciona `design-md-skeleton.md`, p.ex.), o test continua valido — desacopla.
- **Local — Step 91 depende de scaffold:** o teste assume que `scaffoldFullTreeStep` (Step 01) ja rodou antes do Step 91 (e roda — eh anterior no registry). Isso significa que `docs/exec-plans/active/` (pasta) ja existe via template `docs/exec-plans/active/README.md.tpl`. `fs.readdir` nao falha por ENOENT. Confirmar isso na execucao real e remover defensiva se redundante.
- **Local — fixture absolutamente greenfield:** sem `package.json` significa `detectProjectName` faz fallback para nome da pasta (`mkdtemp`-derived). Esse nome aparece como `{{PROJECT_NAME}}` no PLAN.md, mas o test nao valida o nome — valida apenas estrutura.
- **Local — `runInit` pode pedir input via `askUser`:** em greenfield, espera-se que nenhum step retorne `needsUser`. Se algum (ex: `deliveryLoopStep`) o fizer, o test trava. Solucao: stubar `askUser` no `ctx` para retornar `''` ou `'no'` por default. Verificar comportamento atual e documentar como BUG-N se trava.
- **Local — escrita de PLAN.md em tmpdir Windows:** `path.join` produz `\\`. `fs.readFile` aceita. Test passes nos dois SOs.
- **Local — assertion "init nao invoca execute-plan":** prova fraca (verifica que `docs/SECURITY.md` ainda eh pequeno). Suficiente para tracer bullet. Plano 07 fase-03 (CA-12 E2E completo) faz assertion stronger: roda `/execute-plan` manualmente apos init e ai sim `docs/SECURITY.md` cresce.

---

## Verificacao

### TDD

- [ ] **RED:** Criar fixture vazio + criar `greenfield-populate-plan.test.ts` com os 2 testes ANTES de garantir que Step 91 funciona com `runInit` real. Rodar:
  - Comando: `bun test tests/e2e/greenfield-populate-plan.test.ts`
  - Resultado esperado: testes falham (provavelmente por `runInit` undefined export, ou por PLAN.md nao escrito, ou por count diferente).

- [ ] **GREEN:**
  1. Confirmar que fase-03 (Step 91 + registro no registry) esta verde local.
  2. Se test E2E falha por estrutura do retorno do `runInit`, ajustar import/destructuring conforme retorno real.
  3. Se test falha por `finalValidationStep` abortar, decidir: ajustar fixture para passar harness:validate (preferido) ou mockar (Opcao B do Passo 3).
  - Comando: `bun test tests/e2e/greenfield-populate-plan.test.ts`
  - Resultado esperado: `2 passed, 0 failed` em <60s.

- [ ] **REFACTOR:** Extrair `setupGreenfield` para helper se reusado. Limpar imports. Verificar lint.

### Checklist

- [ ] `tests/fixtures/greenfield-populate-plan-tracer/.gitkeep` existe.
- [ ] `tests/e2e/greenfield-populate-plan.test.ts` tem 2 testes que passam.
- [ ] Teste 1 (estrutura): asserta `populateDirs.length === 1`, PLAN.md existe, count de tasks == `TEMPLATE_MANIFEST.filter(isPopulatable).length`, filosoficos excluidos, README excluido, wave markers presentes, validate task presente.
- [ ] Teste 2 (D3/G1): asserta que init NAO invocou /execute-plan (docs/SECURITY.md ainda placeholder).
- [ ] `bun test tests/e2e/greenfield-populate-plan.test.ts` passa em <60s.
- [ ] `bun run lint tests/e2e/greenfield-populate-plan.test.ts` clean.
- [ ] Performance: tempo real do test <30s (RNF-01) — se >30s consistentemente, documentar como BUG-N + criar issue.
- [ ] `MEMORY.md` do plano02: count baseline registrado, decisao de `setupGreenfield` (inline vs helper), qualquer GT descoberto sobre `harness:validate` no fixture vazio.

### Sanity check antes de declarar fase concluida

Executar manualmente em terminal limpo:

```bash
cd $(mktemp -d)
bun run "$(realpath /Projetos/Anti-Vibe-Coding/skills/init/index.ts)"
# Esperado: scaffold completo + PLAN.md de populacao em docs/exec-plans/active/
cat docs/exec-plans/active/*-populate-harness/PLAN.md | grep -c '### Task: Populate'
# Esperado: 25 (ou TEMPLATE_MANIFEST.filter(isPopulatable).length)
```

Se sanity manual passa e test automatizado passa, fase concluida.

---

## Criterio de Aceite

**Por maquina (CA-01 do PRD operacionalizado):**
- `bun test tests/e2e/greenfield-populate-plan.test.ts` retorna `2 passed, 0 failed`.
- Tempo total <60s (margem CI), idealmente <30s local (RNF-01).
- Apos rodar o test, em `mkdtemp` clone do fixture:
  - `docs/exec-plans/active/{date}-populate-harness/PLAN.md` existe.
  - `grep -c '### Task: Populate' <PLAN.md>` retorna mesmo numero que `TEMPLATE_MANIFEST.filter(isPopulatable).length` (25 no snapshot atual).
  - `grep -c 'docs/COMPOUND_ENGINEERING.md' <PLAN.md>` retorna 1 (apenas a mencao na secao "Notas"; nao como task).
  - `grep -c 'bun run scripts/harness-validate.ts' <PLAN.md>` retorna 1.

**Por humano:**
- Reviewer roda `bun test tests/e2e/greenfield-populate-plan.test.ts` em maquina limpa e ve 2 passes.
- Reviewer roda o `/init` manualmente em uma pasta vazia + abre o PLAN.md gerado + le 3-4 tasks emitidas + entende qual subagente roda qual arquivo. Se reviewer hesita, refine o `renderTaskMarkdown` da fase-02.

---

## Decisoes Aplicadas

- **CA-01 do PRD** (greenfield → /init → PLAN.md em <30s com >=1 task por arquivo harness): operacionalizado como teste E2E automatizado. Asserts cobrem todos os sub-itens.
- **D1 do PRD** (4 modos, greenfield e um deles): teste cobre o modo greenfield.
- **D3 do PRD** (init sugere, dev decide): teste 2 valida que init NAO invocou `/execute-plan`.
- **D13 do PRD** (subagents paralelos): teste valida presenca de `wave: 1` e `wave: 2` markers no PLAN.md.
- **D14 do PRD** (filosoficos nao populam): teste valida exclusao explicita.
- **D15 + SH-06 do PRD** (validate ao final): teste valida presenca da validate task com comando literal.
- **MH-01 do PRD** (Step 91 emite PLAN.md): teste valida path canonico.
- **MH-02 do PRD** (>=1 task por arquivo de destino): teste valida count.
- **MH-08 do PRD** (README intocavel): teste valida exclusao do README das tasks.
- **RNF-01 do PRD** (greenfield <30s): timeout do test reflete o target.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
