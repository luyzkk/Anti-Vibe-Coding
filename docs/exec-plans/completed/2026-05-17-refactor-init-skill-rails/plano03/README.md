# Plano 03: Gates de abortagem + steps interativos

**Feature:** refactor-init-skill-rails ([PLAN overview](../PLAN.md))
**Fases:** 6
**Sizing total:** ~10h
**Depende de:** Plano 01 (interface `Step`, `AbortError`, dispatcher esqueleto, registry, `lazyImport`)
**Desbloqueia:** Plano 04 (cutover do SKILL.md so eh possivel apos Planos 02 e 03 terem todos os steps portados)

---

## O que este plano entrega

8 steps "especiais" do `SKILL.md` portados para `lib/steps/NN-{slug}.ts`: migrate.0 (parse dry-run),
migrate.all (orquestrador com early-exit em dry-run), migrate.1 (backup com gate de abortagem),
migrate.2 (planning com gate de conflito), migrate.3 (lessons, best-effort), migrate.4 (decisions,
best-effort), Step 6 (Delivery Loop interativo via contrato `needsUser`), Step 7 (capabilities
discovery com soft-fail). Estende `StepReport` com `needsUser?: { prompt, options }` e `StepContext`
com `askUser?: (prompt, options) => Promise<string>`. Enriquece o dispatcher: captura de `AbortError`
ja existe (Plano 01 fase-02), aqui acrescentamos golden tests cobrindo os 3 codigos de exit (1, 2, !=0)
e o fluxo de pausa-e-pergunta. **`SKILL.md` permanece intocado** — cutover so no Plano 04.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)
| O que | De onde vem | Status |
|-------|-------------|--------|
| Interface `Step` / `StepReport` / `StepContext` / `StepResult` | Plano 01 fase-01 (`skills/init/lib/steps/types.ts`) | pendente |
| Classe `AbortError` + `AbortPayload` | Plano 01 fase-01 (`skills/init/lib/steps/abort-error.ts`) | pendente |
| Dispatcher esqueleto `runInit` com catch de AbortError | Plano 01 fase-02 (`skills/init/lib/run-init.ts`) | pendente |
| Registry com entradas dos Planos 01 e 02 | Plano 02 fase-06 (`skills/init/lib/registry.ts`) | pendente |
| Helper `lazyImport` | Plano 01 fase-04 (`skills/init/lib/lazy-import.ts`) | pendente |
| Padrao golden test (fixtures + `__golden__/`) | Plano 01 fase-03 + Plano 02 fase-01 (template) | pendente |
| Helpers `backupPlanning`, `migratePlanning`, `migrateLessons`, `migrateDecisions`, `orchestrateMigration`, `renderDryRunReport`, `injectOptionalSection`, `discoverCapabilities`, `readArchitectureProfile`, `AuditLogWriter`, `detectV5Legacy` | `skills/init/lib/*.ts` + `skills/lib/*.ts` (ja existem, preservados conforme PRD "Won't Have") | pronto |

### Produz para (outros planos que dependem deste)
| O que | Quem consome |
|-------|-------------|
| 8 step modules em `skills/init/lib/steps/` (incluindo os 4 migrate.*, migrate.0/all, Step 6, Step 7) | Plano 04 fase-03 (SKILL.md aponta para o registry final) |
| Registry com >= 17 entradas (Plano 02 deixou 9; este plano adiciona 8) | Plano 04 fase-03 |
| **Contrato `StepReport` estendido com `needsUser?: { prompt: string; options: readonly string[] }`** (introduzido na fase-06) | Plano 04 (cutover precisa mapear o "Ask user" do SKILL.md atual) |
| **Contrato `StepContext` estendido com `askUser?: (prompt, options) => Promise<string>`** (injetado pelo dispatcher) | Plano 04 fase-04 (testes E2E precisam stub) |
| Pattern de golden test para AbortError (codigo de exit + reason multi-linha) | Plano 04 fase-04 (E2E byte-idempotence) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-abort-error-catch-flow.md | Hardening do dispatcher: golden tests cobrindo 3 codigos de exit + reason multi-linha. Sem helpers de migracao reais. | 1.5h | — (so de Plano 01) |
| 02 | fase-02-migrate-1-backup-gate.md | Step migrate.1 portado (`10-migrate-1-backup.ts`), AbortError em falha de lock/permissao (PRD CA-07) | 1.5h | fase-01 |
| 03 | fase-03-migrate-2-convert-planning.md | Step migrate.2 portado (`11-migrate-2-planning.ts`), AbortError em conflict (preserva 5 linhas de log) | 2h | fase-02 |
| 04 | fase-04-migrate-3-and-4-lessons-decisions.md | Step migrate.3 portado (`12-migrate-3-lessons.ts`) + migrate.4 portado (`13-migrate-4-decisions.ts`) em paralelo, sem AbortError | 1.5h | fase-02 |
| 05 | fase-05-migrate-0-and-all-dry-run.md | Step migrate.0 portado (`09-migrate-0-parse-dry-run.ts`) + Step migrate.all portado (`09_1-migrate-all-orchestrate.ts`) com `skipRemaining` em dry-run | 2h | fase-02 |
| 06 | fase-06-steps-6-and-7-interactive-soft-fail.md | Step 6 portado (`14-delivery-loop.ts`) via `needsUser` + Step 7 portado (`15-capabilities-discovery.ts`) com soft-fail. Estende `StepReport`/`StepContext` + patcheia dispatcher | 1.5h | fase-01 |

---

## Grafo de Fases

```
fase-01 (abort-error catch + golden tests)
    |
    +------- + ---------+----------+
    |        |          |          |
    v        v          v          v
fase-02   fase-04   fase-05     fase-06
(migrate.1)(migrate.3+4)(migrate.0+all)(step 6 + 7)
    |
    v
fase-03 (migrate.2)
```

**Paralelismo possivel:**
- fase-02, fase-04, fase-05 e fase-06 podem rodar em paralelo apos fase-01 (todas tocam
  arquivos disjuntos em `lib/steps/` e dependem somente do dispatcher + AbortError ja
  hardenizados).
- fase-03 (migrate.2) eh SERIAL apos fase-02 porque (a) `migratePlanning` LE de
  `.planning.v5-backup/.planning/` — sem backup nao ha o que migrar — e os testes E2E
  desta fase preferem fixture com backup ja criado pelo step de fase-02, (b) ordem do
  registry: migrate.1 precede migrate.2.
- fase-06 paraleliza com fase-05 pois (a) Step 6 mexe em AGENTS.md, Step 7 mexe em
  `discovery/capabilities.json` — disjuntos do orquestrador de migracao; (b) a extensao do
  contrato (`needsUser` em `StepReport` + `askUser` em `StepContext`) eh aditiva — nao
  conflita com `skipRemaining` ja introduzido em Plano 02 fase-06.

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (golden de stdout esperado + assertion de FS para arquivos
   gerados / AbortError lancada com code+reason corretos). Teste falha por "Cannot find module"
   ou wording divergente.
2. GREEN: criar `NN-{slug}.ts` envelopando o helper, adicionar ao registry, ajustar wording
   ate bater byte-identico com SKILL.md.
3. REFACTOR: extrair fixtures comuns para `__fixtures__/migrate-shared/` se aplicavel.
   NAO mover logica para o step — toda logica continua no helper.
4. VERIFY: bun run test skills/init/lib/steps/ && bun run lint
```

**Tracer Bullet deste plano:** N/A — o tracer da feature foi feito em Plano 01 fase-03. A
fase-01 deste plano eh um "tracer secundario" para o fluxo de AbortError multi-codigo, mas
nao porta step novo (so adiciona testes ao dispatcher).

---

## Decisoes do PRD aplicaveis

| Decisao | Aplicacao neste plano |
|---------|------------------------|
| D1 (Manifest + dispatcher Rails-style) | Cada fase reduz duplicacao do SKILL.md em 1 step. |
| D2 (Interface `Step` em `lib/steps/types.ts`) | Cada step importa de `./types` (relativo dentro de `lib/steps/`). Fase-06 ESTENDE o tipo (campo opcional `needsUser` + campo opcional `askUser` em `StepContext`). |
| D3 (Steps interativos retornam contrato `needs-user`) | **Fase-06** materializa essa decisao. Step 6 do SKILL.md vira o primeiro consumidor. |
| D4 (Gates usam `throw AbortError`, NAO `process.exit`) | **Fase-01** hardeniza o catch. **Fase-02** (migrate.1 lock) e **fase-03** (migrate.2 conflict) sao os principais consumidores. |
| D5 (Rationale em `init-rationale.md`) | NAO se aplica aqui — Plano 04 extrai. |
| D6 (Akita em snippets) | NAO se aplica aqui — Plano 04 extrai. |
| D7 (Cutover big-bang) | NAO se aplica aqui — Plano 04 fase-03. |

## Criterios de Aceite do PRD tangenciados

- **CA-01** (parcial, pre-cutover): byte-identicality dos logs validada por golden test em cada
  fase. Consolidacao E2E em Plano 04 fase-04.
- **CA-02** (parcial): fluxo legacy v5 com migracao completa coberto pelos steps deste plano
  (migrate.1/2/3/4/all). Cumulativamente com Plano 02 + Plano 04 atinge 100%.
- **CA-03**: `--dry-run` emite plano sem mutacao — fase-05.
- **CA-05**: Step 6 Delivery Loop opt-in interativo — fase-06.
- **CA-06**: Step 7 capabilities discovery com soft-fail — fase-06.
- **CA-07**: backup gate aborta migracao em permission/lock — fase-02.
- **MH-02** (parcial): mais 8 dos ~22 steps portados. Cumulativamente com Plano 02 atinge 100%.
- **MH-04**: flag `--dry-run` preservada — fase-05.
- **MH-05**: gates viram `throw AbortError(reason)` — fase-02/03 sao os consumidores, fase-01
  prova o catch.
- **SH-04**: padrao "cada step com teste unitario" replicado em 8 modulos.

---

## Gotchas Conhecidos

Gotchas herdados do PRD/Plano 01/Plano 02 + descobertos durante decomposicao deste plano:

- **G1 — Wording byte-identico (R1 / Plano 02 G1):** TODA string de `console.log` ou
  `summary`/`reason` deve copiar EXATO do bloco inline em `skills/init/SKILL.md`. Em
  particular aqui: 5 linhas do log de migrate.2 (linhas 143-150), 4 linhas de migrate.0
  + dry-run report do migrate.all (linhas 48-75), prompt do Step 6 com DOUBLE SPACE antes
  de `[y/N]` (linha 372), 4 strings do Step 7 (linhas 421, 432, 452, 454, 458). Em scripts
  CI que fazem grep no stdout, qualquer drift quebra (PRD R3). Cada fase tem paranoia
  grep listando as strings antes de iniciar o RED.
- **G2 — Helpers preservados (PRD "Won't Have"):** `backup-planning.ts`, `migrate-planning.ts`,
  `migrate-lessons.ts`, `migrate-decisions.ts`, `migrate-orchestrator.ts`, `dry-run-renderer.ts`,
  `inject-optional-section.ts`, `audit-log.ts`, `read-architecture-profile.ts`,
  `capabilities-writer.ts`, `detect-v5-legacy.ts` NAO podem ser modificados. Steps deste
  plano sao SOMENTE wrappers. Refatoracoes detectadas viram backlog (PRD R7).
- **G3 — Importacao estatica nos steps:** dispatcher centralizou `lazyImport` no boundary
  (Plano 01 fase-04). Steps deste plano usam `import { foo } from '../foo'` (estatico, path
  relativo dentro de `skills/init/lib/`). NUNCA `await import(...)` dentro de um step.
  NUNCA `bun -e "..."` em qualquer .ts deste plano. **EXCESSAO ja documentada em Plano 02
  fase-06**: callbacks de `tryRegenerateParityGaps` aceitam loader assincrono — nao se
  aplica aqui (nenhum step deste plano usa esse helper). Lint do plano grepa por
  `await import` em `lib/steps/` e exige zero matches.
- **G4 — Ordem do registry importa (CA-01):** Plano 02 fase-06 deixou o registry com 9
  entradas em ordem: `[detectLegacy, reuseDiscovery, scaffoldFullTree, linkClaudeAgents,
  detectStackRegister, persistStackKnowledge, customizeArchitecture, installGhFiles,
  finalValidation]`. Este plano INSERE 8 entradas em posicoes especificas:
  - `migrate-0-parse-dry-run` apos `reuseDiscovery`, antes de `scaffoldFullTree` (indice 2)
  - `migrate-all` em seguida (indice 3)
  - `migrate-1-backup`, `migrate-2-planning`, `migrate-3-lessons`, `migrate-4-decisions`
    em sequencia ANTES de `scaffoldFullTree` (indices 4..7)
  - `delivery-loop` (Step 6) ANTES de `finalValidation` (apos `installGhFiles`)
  - `capabilities-discovery` (Step 7) tambem antes de `finalValidation` (apos `delivery-loop`)
  Ordem alvo final apos este plano: `[detectLegacy, reuseDiscovery, migrate0, migrateAll,
  migrate1, migrate2, migrate3, migrate4, scaffoldFullTree, linkClaudeAgents,
  detectStackRegister, persistStackKnowledge, customizeArchitecture, installGhFiles,
  deliveryLoop, capabilitiesDiscovery, finalValidation]` (17 entradas).
  O numero no prefixo do arquivo reflete a posicao alvo no array, NAO a ordem cronologica
  deste plano (que pode rodar fases em paralelo).
- **G5 — Semantica do `code` em AbortError:** SKILL.md atual usa `process.exit(1)` para
  "needs migration" (Step 0.5 linha 33) e "needs migration" (migrate.2 linha 151) e
  `process.exit(2)` para "partial migration ambiguity" (Step 0.5 linha 28). PRD D4 + Plano
  01 fase-01 definem `code` como propriedade do `AbortPayload`. Mapeamento canonico
  preservado:
  - `code: 1` = needs migration / conflict / backup-fail (acao manual requerida)
  - `code: 2` = ambiguity / partial state (acao mais investigativa)
  - `code: N` (N != 0, 1, 2) = falha generica propagada (ex: harness-validate retornando 3)
  NAO inventar codigos novos. Se um helper expor codigo diferente (ex: `Bun.spawn.exited`),
  preservar.
- **G6 — `needsUser` contract eh aditivo a `skipRemaining`:** Plano 02 fase-06 ja estendeu
  `StepReport` com `skipRemaining?: boolean`. Fase-06 deste plano adiciona
  `needsUser?: { prompt: string; options: readonly string[] }`. Ambos sao opcionais e
  compativeis. Dispatcher checa primeiro `needsUser` (pausa e re-invoca step com resposta
  via `ctx`), depois `skipRemaining` (early-exit). NUNCA setar AMBOS no mesmo report.
- **G7 — Step 7 soft-fail eh invariante:** Step 7 (capabilities-discovery) NUNCA lanca
  AbortError NEM Error nao-tratado. Try/catch INTERNO ao step engole tudo e retorna
  `{ mutated: false, summary: '...' }`. Se `discoverCapabilities` falhar, a execucao do
  /init prossegue (PRD CA-06). Teste obrigatorio: fixture onde o helper joga, run termina
  com `{ kind: 'ok' }` e log de soft-fail. Plano 04 fase-04 (E2E byte-idempotence) inclui
  esse cenario tambem.
- **G8 — migrate.all replaces migrate.1..4 em dry-run, mas NAO em real mode:** SKILL.md
  linhas 57-79 sao confusas — leitura cuidadosa: migrate.all com `--dry-run` faz tudo
  (chama orchestrateMigration com dryRun=true) E sai (`process.exit(0)`). Em real mode,
  migrate.all eh NO-OP (nao roda — ou roda como visualizacao apenas). Os steps individuais
  migrate.1/2/3/4 sao os que efetivamente mutam disco. Tradução para registry:
  `migrate-all` SOMENTE faz trabalho quando `--dry-run` esta presente; nesse caso retorna
  `skipRemaining: true`. Se nao ha `--dry-run`, retorna `{ mutated: false, summary: '' }`
  (no-op). Documentado em DI da fase-05. Risco de interpretacao errada existe — flagged
  como ponto de revisao do dev (DI-5-1).

---

<!-- Gerado por /plan-feature em 2026-05-17 -->
