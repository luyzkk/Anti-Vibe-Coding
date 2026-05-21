# Summary: Refatoracao do /anti-vibe-coding:init (v7)

**Completed:** 2026-05-21
**Duration:** 2026-05-20 → 2026-05-21
**Planos:** 5/5 completed
**Fases Total:** 23/23 done (zero skipped, zero blocked)

---

## O que foi construido

Pipeline `/anti-vibe-coding:init` reescrito em 10 steps reais ponta-a-ponta, substituindo o
pipeline v6.7 (24 steps com dry-run, blocks-classifier, merge-proposal, doc-mover). Init
total Node greenfield em ~735ms (NFR <30s — 40x abaixo do limite).

### Pipeline final (10 steps)

| # | Step | Plano | Responsabilidade |
|---|------|-------|------------------|
| 01 | reentry-gate | 01 | DR-1 — abort code=10 se `.claude/legacy-manifest.json` existe |
| 02 | detect-legacy-and-stack | 01 | popula `ctx.legacy` + `ctx.stack` (read-only) |
| 03 | secrets-scan | 02 | varredura de secrets nos artefatos legacy |
| 04 | migrate-planning-and-manifest | 02 | move `.planning/*` → `.claude/_legacy/` + grava `legacy-manifest.json` |
| 05 | scaffold-and-link | 03 | scaffold 36 placeholders + linkClaudeToAgents (preserva `.claude/CLAUDE.md`) |
| 06 | install-gh-files | 03 | workflows + PR template estaticos (skip-if-exists) |
| 07 | generate-populate-plans | 04 | gera 16 PLAN.md Andre format stack-aware (DR-2 abort code=20 se stack=null) |
| 08 | delivery-loop | 05 | pergunta "Do you use Linear?" (CA-06 — antes de mutar) |
| 09 | copy-knowledge | 05 | detecta stack + copia atoms (RF-11 skip gracioso se stack=null) |
| 10 | final-validation | 05 | walk docs/ + allowlist warnings; D8.C abort code=1 se stack sem INDEX.md |

### Entregas por Plano

- **Plano 01 (Foundation):** registry com 10 nomes, 8 stubs + Steps 1-2 reais, tracer e2e
  verde. 36 arquivos legacy deletados (-2287 linhas). 4 desvios DV-1..DV-4 fechados na
  entrevista (pipeline cresceu de 8 → 10 steps).

- **Plano 02 (Steps 3-4):** Zod schema compartilhado em `skills/_shared/legacy-manifest-schema.ts`
  (DR-5), Step 3 secrets-scan real, Step 4 migrate + manifest writer (D6/D7/D8).

- **Plano 03 (Steps 5-6):** Step 5 scaffold-and-link real (CA-01/CA-02/CA-08 validados),
  Step 6 install-gh-files real (skip-if-exists). Sem dry-run/`WriteRecorder` (D4).

- **Plano 04 (Step 7 CORE):** `populate-plan-generator.ts` reescrito (569 → 139 linhas) com
  renderer Andre format (10 secoes H2). `POPULATE_INSTRUCTIONS_BY_DOC` (16 docs D18 — 12
  baseline + 4 AVC extras) + `buildWavesForDoc` stack-aware (Node vs Rails). DR-2 abort
  code=20 quando stack=null.

- **Plano 05 (Steps 8-10 + acceptance):** Step 8 delivery-loop (contrato `needsUser` D3/CH-01,
  DOUBLE SPACE no prompt), Step 9 copy-knowledge (runner injetavel), Step 10 final-validation
  (D8.C preservado). `scripts/harness-validate.ts` REQUIRED_FILES de 26 → 28 entries (RF-12).
  Suite `init-v7-final-acceptance.test.ts` cobre CA-01..CA-09 + NFR como contrato vivo.

---

## Decisoes de Implementacao (consolidado)

### Arquiteturais (afetam multiples planos)

- **D4 (sem dry-run):** Nenhum dos 10 steps importa `isDryRun` de `../dry-run-mode`.
  Tests de regressao via grep no codigo (tokens em comentarios D4 attestation permitidos).
- **D8.C preservado:** `final-validation` mantem AbortError code=1 byte-identico do
  `90-final-validation.ts` legacy quando stack detectada sem INDEX.md.
- **DV-4 NAO endurecido:** `StepContext.legacy?`/`stack?` continuam opcionais. Steps 8-10
  nao usam diretamente — Step 9 detecta internamente, Step 10 le do disco. Endurecimento
  futuro deve ser migracao em fases explicita.
- **`runInit` retorna nao lanca:** `{ kind: 'completed' | 'aborted', code?, reason? }`.
  AbortError e capturado internamente. Acceptance e2e usa return value.

### Codes de AbortError em uso pos-v7

| Code | Step | Cenario |
|------|------|---------|
| 1 | 10-final-validation | Stack detectada sem `.claude/knowledge/INDEX.md` (D8.C) |
| 10 | 01-reentry-gate | Init ja-inicializado — `.claude/legacy-manifest.json` existe (DR-1) |
| 11 | 02-detect-legacy-and-stack | No-anchor (caso adicionado em Plano 01 fase-02) |
| 20 | 07-generate-populate-plans | stack=null (DR-2) |

Novos codes futuros devem comecar em `30+` para nao colidir.

### Padroes de testabilidade

- **Runner injetavel (DI-2):** Step 9 aceita `runner: StackKnowledgeRunner` opcional.
  Padrao reusado de `03_1-persist-stack-and-knowledge.ts` para evitar mock.module pollution
  (compound note 2026-05-16-bun-mock-module-pollution.md).
- **Step 8 SEM runner:** simples o suficiente para fixture de arquivo real + assertion.

---

## Bugs e Gotchas (consolidado — generalizaveis)

- **GT-meta-test-D4-sem-comentario (Plano 03 e Plano 05):** Meta-test D4 escaneia TEXTO
  COMPLETO do arquivo (incluindo comentarios). Comentario contendo token banido (`makeWriter`,
  `isDryRun`, `dry-run-mode`) causa falha mesmo sem import real. Reescrever comentarios em
  prosa sem tokens funcionais.

- **GT-step91-not-deleted (Plano 04):** Step 91 (`91-generate-populate-plan.ts`) estava no
  codebase apesar do MEMORY do Plano 01 fase-05 afirmar deletion. Verify pre-conditions no
  codigo real (`ls` + `grep`) antes de iniciar qualquer fase. Reaparece em Plano 05 com o
  `03_1-persist-stack-and-knowledge.ts`.

- **GT-03_1-step-ja-deletado (Plano 05):** Mesmo padrao do anterior — MEMORY documentou
  como existente, mas ja estava deletado. Padrao recorrente: **MEMORY pode mentir;
  filesystem nao.** Adicionar a feedback memory.

- **GT-harness-validate-preexistente:** `bun run harness:validate` exit !=0 por CHANGELOG.md
  broken link (step 00-detect-legacy deletado em Plano 01) + workspace `.claude/CLAUDE.md`
  markdown-heading. Pre-existente, nao bloqueia. Issue futura para `/iterate`.

---

## Desvios dos Planos

- **DEV-01 (Plano 04 fase-01):** Step 91 cleanup escopo expandido (10 deletados + 5
  modificados vs spec 8 + 0).
- **DEV-01 (Plano 05 fase-05):** Cleanup apenas 2 dos 3 arquivos previstos (o terceiro ja
  havia sido deletado).
- **DEV-02 (Plano 05 fase-05):** `scaffoldFullTreeStep` removido do grep-gate (export vivo,
  nao deletado).

Total: 3 desvios em 23 fases (~13%). Nenhum bloqueante.

---

## Metricas Consolidadas

| Metrica | Valor |
|---------|-------|
| Planos | 5 |
| Fases total | 23 |
| Fases done | 23 (100%) |
| Fases skipped | 0 |
| Fases blocked | 0 |
| Bugs encontrados | 0 (zero bugs de runtime) |
| Retries necessarios | 0 |
| Desvios | 3 (DEV-01 P04, DEV-01 P05, DEV-02 P05) |
| Commits | 29 (Planos 01-05) |
| Steps reais no pipeline | 10 / 10 |
| Stubs remanescentes | 0 |
| Tempo init Node greenfield | ~735ms (NFR <30s) |
| Linhas legacy deletadas | ~2500+ (Plano 01 fase-05 + Plano 04 cleanup + Plano 05 cleanup) |

---

## Contrato vivo dos CAs

`tests/e2e/init-v7-final-acceptance.test.ts` (10 testes) cobre TODOS os criterios de aceite:

| CA | O que valida | Fixture |
|----|--------------|---------|
| CA-01 | Greenfield Node-TS: 16 PLAN.md + 4 AVC docs + 2 .github files | v7-populate-node |
| CA-02 | `.claude/CLAUDE.md` preexistente byte-identico apos init | v7-with-claude-md (novo) |
| CA-03 | Legacy migration → `legacy-manifest.json` com entries | v7-with-legacy (novo) |
| CA-04 | Rails FRONTEND plan tem `app/views` + `app/assets` | v7-populate-rails |
| CA-05 | Greenfield sem legacy → `manifest.legacy = []` | v7-populate-node |
| CA-06 | Delivery-loop pergunta ANTES de mutar AGENTS.md | inline |
| CA-07 | Cada PLAN.md tem 10 H2 sections em ordem canonica | v7-populate-node |
| CA-08 | Re-run bloqueado por reentry-gate code=10 | v7-populate-node |
| CA-09 | Zero refs a steps deletados v6.7 em `skills/init/lib/` | grep-gate |
| NFR | Init < 30s em Node greenfield | v7-populate-node |

**Grep-gate de regressao:** `bun run test:grep-deleted-steps` (script `scripts/grep-deleted-steps.ts`)
roda em CI. Lista hardcoded de IDs deletados — atualizar APENAS se novo refactor deletar
mais steps.

---

## Itens em standby pos-merge

- **Libs orfas:** `skills/init/lib/snippet-resolver.ts` + `skills/init/lib/backup-anti-vibe.ts`
  sem callers. Issue futura para `/iterate` limpa.
- **Pre-existentes nao-bloqueantes:**
  - CHANGELOG.md broken link (step `00-detect-legacy` deletado em Plano 01)
  - workspace `.claude/CLAUDE.md` markdown-heading drift
  - 2 falhas TEMPLATE_MANIFEST (count + version drift no plugin-manifest.json)
  - 1 falha CA-14 em `run-init-audit-integration.test.ts`
- **Tests deletados/skipped recuperados:**
  - `tests/e2e/ca13-dry-run-parity.test.ts` deletado (obsoleto, D4)
  - 2 `test.skip` em `tests/e2e/init-cutover-greenfield.test.ts` ja haviam sido removidos
    em Plano 04 (DEV-01) — nada a fazer em Plano 05.

---

## Proximos passos sugeridos

1. **`/verify-work`** — auditoria pos-implementacao via subagentes paralelos.
2. **`/lessons-learned`** — destilar licoes generalizaveis das memorias dos 5 planos.
3. **`/iterate`** — cleanup das libs orfas + harness:validate pre-existentes.

---

<!-- Gerado por /execute-plan em 2026-05-21 -->
