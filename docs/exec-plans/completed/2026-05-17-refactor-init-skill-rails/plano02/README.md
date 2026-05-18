# Plano 02: Steps puros (nao-interativos, sem gates)

**Feature:** refactor-init-skill-rails ([PLAN overview](../PLAN.md))
**Fases:** 6
**Sizing total:** ~10h
**Depende de:** Plano 01 (interface `Step`, `AbortError`, dispatcher esqueleto, registry, `lazyImport`)
**Desbloqueia:** Plano 04 (cutover do SKILL.md so eh possivel apos Planos 02 e 03 terem todos os steps portados)

---

## O que este plano entrega

8 steps puros do `SKILL.md` portados para modulos `lib/steps/NN-{slug}.ts`, cada um envelopando um helper
existente, registrados em ordem canonica e validados por golden test contra o stdout do bloco inline
atual. Apos este plano: o dispatcher consegue executar Step 1 (scaffold), Step 2 (link CLAUDE→AGENTS),
Step 3 (detect-stack), Step 3.1 (persist + knowledge), Step 4 (customize), Step 5 (install-gh),
Step migrate.5 (final validation), Step reuse-discovery.0 (parse flag + cache-fresh shortcut).
**`SKILL.md` permanece intocado** — cutover so no Plano 04.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)
| O que | De onde vem | Status |
|-------|-------------|--------|
| Interface `Step` / `StepReport` / `StepContext` / `StepResult` | Plano 01 fase-01 (`skills/init/lib/steps/types.ts`) | pendente |
| Classe `AbortError` + `AbortPayload` | Plano 01 fase-01 (`skills/init/lib/steps/abort-error.ts`) | pendente |
| Dispatcher esqueleto `runInit` | Plano 01 fase-02 (`skills/init/lib/run-init.ts`) | pendente |
| Registry inicial com 1 entrada (`detectLegacyStep`) | Plano 01 fase-03 (`skills/init/lib/registry.ts`) | pendente |
| Helper `lazyImport` | Plano 01 fase-04 (`skills/init/lib/lazy-import.ts`) | pendente |
| Padrao golden test (fixtures + `__golden__/`) | Plano 01 fase-03 (template) | pendente |
| Helpers `scaffoldFullTree`, `scaffoldTemplates`, `scaffoldTodoMd`, `linkClaudeToAgents`, `detectStack`, `writeStackToStateMd`, `runStackKnowledgeInit`, `customizeArchitecture`, `installGhFiles`, `parseReuseDiscoveryFlag`, `tryRegenerateParityGaps` | `skills/init/lib/*.ts` (ja existem, preservados conforme PRD "Won't Have") | pronto |

### Produz para (outros planos que dependem deste)
| O que | Quem consome |
|-------|-------------|
| 8 step modules em `skills/init/lib/steps/` | Plano 04 fase-03 (SKILL.md aponta para o registry final) |
| Registry com >= 9 entradas (detect-legacy + 8 deste plano) | Plano 04 fase-03 |
| **Contrato `StepReport` estendido com `skipRemaining?: boolean`** (introduzido na fase-06) | Plano 04 (cutover usa para mapear `process.exit(0)` antigo) |
| Padroes de golden test ampliados (multi-arquivo, fixture com mtime fake) | Plano 03 (reusa template) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-step-1-scaffold-full-tree.md | Step 1 portado (`01-scaffold-full-tree.ts`) — scaffoldTemplates + scaffoldFullTree + scaffoldTodoMd | 1.5h | — (so do Plano 01) |
| 02 | fase-02-step-2-link-claude-agents.md | Step 2 portado (`02-link-claude-agents.ts`) — 3 tiers + tier reportado em summary | 2h | fase-01 |
| 03 | fase-03-step-3-and-3-1-stack.md | Step 3 portado (`03-detect-stack-and-register.ts`) + Step 3.1 portado (`03_1-persist-stack-and-knowledge.ts`) | 2h | fase-01 |
| 04 | fase-04-step-4-customize-architecture.md | Step 4 portado (`04-customize-architecture.ts`) — depende de detect-stack ja registrado | 1h | fase-03 |
| 05 | fase-05-step-5-install-gh.md | Step 5 portado (`05-install-gh-files.ts`) — sempre roda | 1h | fase-01 |
| 06 | fase-06-reuse-discovery-and-migrate-5.md | Step reuse-discovery.0 portado (`00_1-reuse-discovery.ts`) + Step migrate.5 portado (`90-final-validation.ts`) + extensao `skipRemaining` no contrato | 1.5h | fase-03 (reusa `runStackKnowledgeInit`) + fase-05 (ordem no registry) |

---

## Grafo de Fases

```
fase-01 (scaffold)
    |
    +------- + -------+
    |        |        |
    v        v        v
fase-02   fase-03   fase-05
(link)    (stack)   (gh-files)
              |
              v
          fase-04
          (customize)
              |
              v
          fase-06 (reuse-discovery + migrate.5)
```

**Paralelismo possivel:**
- fase-02, fase-03 e fase-05 podem rodar em paralelo apos fase-01 (todas tocam arquivos
  disjuntos e dependem so do contrato `Step`).
- fase-04 e SERIAL apos fase-03 (consome `detectStack` rodado em fase-03 para gerar a secao "Detected Stack").
- fase-06 e SERIAL no fim porque (a) reusa `runStackKnowledgeInit` da fase-03 dentro do branch
  cache-fresh, (b) introduz `skipRemaining` no contrato — concentrar mudancas estruturais ao final
  do plano reduz risco de re-trabalho.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever golden test (snapshot stdout esperado) + assertion de FS para arquivos gerados.
   Teste falha por `Cannot find module './NN-{slug}'` ou por output diferente do golden.
2. GREEN: criar `NN-{slug}.ts` envelopando o helper, adicionar ao registry, ajustar wording ate
   bater byte-identico com SKILL.md.
3. REFACTOR: extrair fixtures comuns para `__fixtures__/shared/` se aplicavel. NAO mover logica
   para o step — toda logica continua no helper.
4. VERIFY: bun run test skills/init/lib/steps/ && bun run lint
```

**Tracer Bullet deste plano:** N/A — o tracer da feature foi feito em Plano 01 fase-03. Aqui cada
fase replica o padrao do tracer: 1 step + golden + registry update.

---

## Decisoes do PRD aplicaveis

| Decisao | Aplicacao neste plano |
|---------|------------------------|
| D1 (Manifest + dispatcher Rails-style) | Cada fase reduz duplicacao do SKILL.md em 1 step. Concretamente realiza D1. |
| D2 (Interface `Step` em `lib/steps/types.ts`) | Cada step importa de `./types` (relativo dentro de `lib/steps/`). |
| D3 (Steps interativos retornam `{ status: 'needs-user' }`) | **NAO se aplica** — todos os steps deste plano sao puros. Step 6 (interativo) e Plano 03. |
| D4 (Gates usam `throw AbortError`, NAO `process.exit`) | Nenhum step deste plano tem gate de erro. Mas a fase-06 mapeia o `process.exit(0)` do reuse-discovery NAO para `AbortError` (que seria semantica errada — abort = erro) e sim para a extensao `skipRemaining` do `StepReport`. |

## Criterios de Aceite do PRD tangenciados

- **MH-02** (parcial): 8 dos ~22 steps portados. Cumulativamente com Plano 03 atinge 100%.
- **MH-03** (parcial — pre-cutover): comportamento byte-identico validado por golden test em cada
  fase. CA-01/CA-02 finalizados em Plano 04 fase-04 com fixtures E2E.
- **MH-04**: flag `--reuse-discovery`/`--refresh` preservada na fase-06.
- **CA-04**: regenera `capabilities.json` + `parity-gaps.json` quando cache-fresh — fase-06.
- **CA-08**: link CLAUDE→AGENTS via 3 tiers preservado — fase-02 testa Tier 3 (copy-with-hook)
  como cenario default no fixture (Tier 1/2 dependem de OS).
- **SH-04**: padrao "cada step com teste unitario" replicado em 8 modulos.

---

## Gotchas Conhecidos

Gotchas herdados do PRD/Plano 01 + descobertos durante decomposicao deste plano:

- **G1 — Wording byte-identico (R1 / Plano 01 G1):** TODA string de `console.log` ou
  `summary`/`reason` deve copiar EXATO do bloco inline em `skills/init/SKILL.md`. Compare
  caractere a caractere — backticks, em-dash (U+2014), interpolacoes `${...}`, ordem de
  campos. Em scripts CI que fazem grep no stdout, qualquer drift quebra (PRD R3).
- **G2 — Helpers preservados (PRD "Won't Have"):** os arquivos `lib/scaffold-*.ts`,
  `lib/symlink-fallback.ts`, `lib/detect-stack.ts`, `lib/state-md-init.ts`,
  `lib/run-stack-knowledge-init.ts`, `lib/customize-architecture.ts`, `lib/install-gh-files.ts`,
  `lib/reuse-discovery.ts`, `lib/parse-refresh-flag.ts` NAO podem ser modificados. Steps deste
  plano sao SOMENTE wrappers. Refatoracoes de helper detectadas viram backlog (PRD R7).
- **G3 — Importacao estatica nos steps:** dispatcher centralizou `lazyImport` no boundary
  (Plano 01 fase-04). Steps deste plano usam `import { foo } from '../foo'` (estatico, path
  relativo dentro de `skills/init/lib/`). NUNCA `await import(...)` dentro de um step. NUNCA
  `bun -e "..."` em qualquer .ts deste plano. Lint do plano grepa por isso.
- **G4 — Ordem do registry importa (CA-01):** insercao no `registry.ts` deve preservar a
  ordem de execucao atual do SKILL.md (linha por linha). Ordem alvo apos este plano:
  `[detectLegacy, reuseDiscovery, scaffoldFullTree, linkClaudeAgents, detectStackRegister,
  persistStackKnowledge, customizeArchitecture, installGhFiles, finalValidation]`. O numero
  no prefixo do arquivo (`00_1-`, `01-`, ...) reflete a posicao alvo no array, NAO a ordem
  cronologica deste plano (que pode rodar fases em paralelo).
- **G5 — Step 3.1 ja eh thin caller:** `runStackKnowledgeInit` ja orquestra tudo
  (write-stack-json + copy-knowledge + format-preview). Portar Step 3.1 eh quase trivial —
  cuidado para nao DUPLICAR a chamada de `parseRefreshFlag` (ja eh injetada via
  `runStackKnowledgeInit.opts.args`).
- **G6 — `skipRemaining` extende contrato:** fase-06 acrescenta `skipRemaining?: boolean`
  ao `StepReport` (Plano 01 fase-01 nao previa). Mudanca aditiva, retro-compativel: campo
  opcional default `undefined` (falsy). Dispatcher (Plano 01 fase-02) precisa checar o
  campo no loop. Coordenar com Plano 03 se eles tambem ja codificaram um loop que ignora o
  campo.
- **G7 — Step `scaffoldFullTree` ja cria `TODO.md`:** o atual SKILL.md tem PASSO 1 + PASSO 1.5
  separados, onde 1.5 eh defensivo (idempotente). Manter os DOIS no step `01-scaffold-full-tree.ts`
  — chamar `scaffoldFullTree` e DEPOIS `scaffoldTodoMd`. Wording do log: PASSO 1 emite "Tree
  files: N in Mms" e PASSO 1.5 emite "TODO.md criado..." OR "TODO.md ja existe...". Os DOIS logs
  devem aparecer (PRD CA-01 garante byte-identicality).
- **G8 — Fixtures grandes:** `scaffoldFullTree` cria 27 arquivos. Golden test compara apenas
  `summary` + lista de arquivos gerados (por `os.readdir` recursive) — NAO compara conteudo
  arquivo-a-arquivo (responsabilidade do teste do helper). Manter snapshots em
  `__golden__/scaffold-full-tree-greenfield.json` (JSON serializavel).
- **G9 — `installGhFiles` sempre roda (D14):** independente de fixture/flag. Golden test
  vai checar `.github/workflows/`, `.github/PULL_REQUEST_TEMPLATE.md`. NAO adicionar
  shouldRun condicional ao step.

---

<!-- Gerado por /plan-feature em 2026-05-17 -->
