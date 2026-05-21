# State: Refatoracao do /anti-vibe-coding:init (v7)

**Plan:** ./PLAN.md
**Phase:** in-progress
**Current Plan:** 05/5
**Last Updated:** 2026-05-21 (Plano 04 fase-05 concluida — Plano 04 COMPLETED)

## Progress por Plano

| Plano | Nome | Fases | Done | Status |
|-------|------|-------|------|--------|
| 01 | Foundation + Tracer + Cleanup | 6 | 6/6 | completed |
| 02 | Step 3 (secrets-scan) + Step 4 (migrate + manifest) + Shared Schema | 4 | 4/4 | completed |
| 03 | Step 5 (scaffold-and-link) + Step 6 (install-gh-files) | 3 | 3/3 | completed |
| 04 | Step 7: Generate Populate Plans (CORE) | 5 | 5/5 | completed |
| 05 | Steps 8-10 + harness-validate + E2E final | 5 | 0/5 | planned (detalhado) |

## Progress Global

Fases done: 18/23 (78%)

## Log

- 2026-05-21: Plano criado via /plan-feature
- 2026-05-21: Decisoes de risco DR-1, DR-2, DR-4, DR-5 fechadas durante a entrevista
- 2026-05-21: Plano 01 detalhado em 6 fases (~8h). Planos 02-05 pendentes — gerar sob demanda
  via /plan-feature.
- 2026-05-21: Desvios DV-1..DV-4 fechados antes de iniciar Plano 02. Pipeline cresceu de 8
  para **10 steps** (DV-1 secrets-scan proprio +1; DV-3 gate proprio +1). Arquivos atualizados:
  PLAN.md, plano01/README.md, plano01/AUDIT.md, plano01/fase-02 (renumerado),
  plano01/fase-03 (reescrito como Step 1 gate), plano01/fase-04 (10 steps),
  plano01/fase-05 (secrets-scan reclassificado para "deletado + recriado no Plano 02"),
  plano01/fase-06 (tracer espera 10 steps).
- 2026-05-21: Plano 02 detalhado em 4 fases (~4h) via /plan-feature (subagente isolado).
  Entrega Zod schema compartilhado (`skills/_shared/legacy-manifest-schema.ts`, DR-5),
  Step 3 secrets-scan real (DV-1 — porta logica de `06-secrets-scan.ts`), Step 4
  migrate-planning + manifest writer (D6/D7/D8), e atualizacao do registry trocando 2 stubs
  por reais. DI-Plano02-fase01-zod-dep (adicionar zod a dependencies),
  DI-Plano02-fase02-discovery-artifact-mantido, DI-Plano02-fase02-audit-log-removido
  registrados em plano02/MEMORY.md. Planos 03-05 pendentes — gerar sob demanda.
- 2026-05-21: Plano 03 detalhado em 3 fases (~3h) via /plan-feature (subagente isolado).
  Entrega Step 5 `05-scaffold-and-link.ts` (scaffold 36 placeholders skip-if-exists +
  `linkClaudeToAgents`, preserva `.claude/CLAUDE.md` — CA-02/D16), Step 6
  `06-install-gh-files.ts` (workflows + PR template estaticos com skip-if-exists), e
  registry wire + e2e cobrindo CA-01 (placeholders), CA-02 (CLAUDE.md byte-identico)
  e CA-08 (re-run idempotente). Sem dry-run / `WriteRecorder` (D4). DI candidatas
  pre-registradas: DI-Plano03-fase01-no-dry-run-wiring, fase01-link-after-scaffold-mandatory,
  fase02-install-gh-skip-policy (skip-guard no step, sem mexer na lib),
  fase03-e2e-fixture-pre-claude-md (fixture com 533 linhas, simetria PRD CA-02).
  Planos 04-05 pendentes — gerar sob demanda.
- 2026-05-21: Plano 04 detalhado em 5 fases (~9h) via /plan-feature (subagente isolado).
  Entrega Step 7 `07-generate-populate-plans.ts` (CORE) — reescrita do
  `populate-plan-generator.ts` (569 → ~150 linhas) com renderer Andre format (10 secoes H2),
  tabela `POPULATE_INSTRUCTIONS_BY_DOC` (16 docs D18) + `buildWavesForDoc` stack-aware
  (Node vs Rails — CA-04), pipeline orquestrador, e DR-2 abort (`AbortError code=20` se
  `ctx.stack.primary === null`, override RF-11). 3 fixtures e2e cobrem CA-01/CA-04/CA-07/DR-2.
  DI candidatas: fase01-template-renderer-pure, fase02-instructions-table-format,
  fase03-stack-aware-path-strategy (objeto literal, nao template string),
  fase04-abort-message (wording-stable), fase05-e2e-fixture-rails-and-node. Plano 05 pendente
  — gerar sob demanda.
- 2026-05-21: Plano 05 detalhado em 5 fases (~5.5h) via /plan-feature (subagente isolado).
  Entrega Step 8 `08-delivery-loop.ts` (port + D4 sem dry-run), Step 9 `09-copy-knowledge.ts`
  (port + RF-11 skip gracioso + D4), Step 10 `10-final-validation.ts` (port + D8.C preservado
  + D4), update `scripts/harness-validate.ts` REQUIRED_FILES com 2 docs AVC restantes
  (`docs/CODE_STYLE.md` + `.claude/CLAUDE.md` — RF-12), e suite e2e final consolidando
  CA-01..CA-09 em `init-v7-final-acceptance.test.ts` + grep-gate de regressao. Fases 01-04
  100% paralelas (worktrees independentes); fase-05 e o merge. DI candidatas: fase01 NAO
  precisa runner injetavel, fase02 MANTEM `StackKnowledgeRunner` injetavel (compound
  2026-05-16-bun-mock-module-pollution.md), fase02 summary single-line, fase03 mantem
  AbortError code=1 e export de `runFinalValidationChecks`, fase04 REQUIRED_FILES vai
  de 26 para 28 entries, fase05 grep-gate como script TS standalone (Windows compat),
  fase05 cleanup pos-verde dos steps antigos (`14-*`, `03_1-*`, `90-*`) em commit separado,
  fase05 acceptance em 1 arquivo com 10 testes nomeados CA-01..CA-09 + NFR perf.
  DV-4 mantido opcional (Steps 8-10 nao usam `ctx.stack` diretamente). Limpeza adicional:
  delete de `ca13-dry-run-parity.test.ts` skipado + 2 testes skipados em
  `init-cutover-greenfield.test.ts` (Plano 01 fase-05 notas). Libs orfas
  (`snippet-resolver.ts`, `backup-anti-vibe.ts`) NAO deletadas — issue futura para /iterate.
- 2026-05-21: Plano 01 fase-01 (coverage-audit) concluida. AUDIT.md preenchido para 18 steps
  (~59 behaviors: 21 validos/parciais, ~38 obsoletos). 2 gaps nao-bloqueantes identificados
  (GAP-01 progress.txt: nova cobertura no Plano 02; GAP-02 ARCHITECTURE.md stack-aware:
  coberto via CA-04 e2e do Plano 05). Commit d8e78ec.
- 2026-05-21: Plano 01 fase-02 (detect-legacy-and-stack) concluida. Step 2 real criado em
  `skills/init/lib/steps/02-detect-legacy-and-stack.ts` (read-only, popula ctx.legacy/ctx.stack
  via Object.assign, nunca aborta). `StepContext` estendido com `legacy?: LegacyState` e
  `stack?: DetectedStack` opcionais (G6 DV-4). 4 testes verdes; typecheck limpo. Decisoes em
  MEMORY.md: tipo real `LegacyState` (nao V5LegacyState), ctx mutation via Object.assign,
  fixture legacy usa `.claude/plans/` (probe real). Commit bab19e6.
- 2026-05-21: Plano 01 fase-03 (reentry-gate) concluida. Step 1 real criado em
  `skills/init/lib/steps/01-reentry-gate.ts` (38 linhas, read-only, AbortError code=10,
  wording "/init:refresh when available D13"). 3 testes verdes. Gate puro — zero imports
  de detect-stack/detect-v5-legacy. DI-Plano01-fase03-abort-code-10 registrado.
  Commit b612c01.
- 2026-05-21: Plano 01 fase-04 (new-registry) concluida. `skills/init/lib/registry.ts`
  reescrito (24 → 10 entries na ordem D12 revisada DV-1+DV-3). 8 stubs criados (Steps 3-10)
  + Steps 1-2 reais. 3 testes do registry verdes; 16 testes dos stubs verdes; regressao
  zero nos Steps 1/2; `bun build` bundlou 14 modulos sem erro. Commit 008d28c.
- 2026-05-21: Plano 01 fase-06 (tracer-bullet — 1a passada) concluida. E2E em
  `tests/e2e/init-v7-tracer-bullet.test.ts` verde: 3 testes (greenfield ordem 10 steps,
  Plano-02 TODO, re-run abort code=10). 270ms. Log format do dispatcher confirmado em
  run-init.ts:164 — `[${step.id}] ${summary}` (sem adapter no regex). Commit d7430da.
  Tracer fica em standby para 2a passada apos fase-05.
- 2026-05-21: Plano 01 fase-05 (delete-dead-steps) concluida. 36 arquivos removidos via
  git rm (18 step .ts + 18 .test.ts), 2287 linhas deletadas. Zero imports orfaos. Typecheck
  exit 0. Tracer 2a passada: 3 pass, 0 fail — R6 mitigado, delete em cascata sem regressao.
  12 testes e2e pre-existentes falhando NAO sao novos — cobrem behaviors D3/D4/D5 removidos
  e ficam como input para Plano 05 fase-final. Commit 6dd3b36.
- 2026-05-21: **Plano 01 (Foundation + Tracer + Cleanup) CONCLUIDO 6/6 fases.** Pipeline
  de 10 steps operacional (2 reais + 8 stubs), tracer e2e verde antes E depois do delete,
  AUDIT confirma zero perda de cobertura valida. Plano 02 desbloqueado.
- 2026-05-21: Plano 02 fase-01 (shared-manifest-schema) concluida. `skills/_shared/legacy-manifest-schema.ts`
  criado com schema Zod completo (8 exports), `zod@4.4.3` adicionado a dependencies.
  8 testes passando. Commit d9c154b.
- 2026-05-21: Plano 02 fase-02 (step3-secrets-scan-real) concluida em paralelo com fase-03.
  `03-secrets-scan.ts` real criado (porta logica de 06-secrets-scan sem dry-run/audit-log).
  id: '03-secrets-scan'. 4 testes passando. Commit 8d7bff5.
- 2026-05-21: Plano 02 fase-03 (step4-migrate-and-manifest) concluida em paralelo com fase-02.
  `04-migrate-planning-and-manifest.ts` real criado. id: 'migrate-planning-and-manifest' (sem prefixo
  — compatibilidade com stub). 6 testes passando. DI-Plano02-fase03-migratePlanning-destino: migratePlanning
  le de BACKUP_DIR (nao de .claude/planning/). Commit 136ff36.
- 2026-05-21: Plano 02 fase-04 (registry-wire + e2e) concluida. registry.ts comentarios atualizados
  (Steps 3-4 REAIS). registry.test.ts corrigido (ID 03-secrets-scan, loop stub indices 4-9).
  `tests/e2e/init-v7-legacy-manifest.test.ts` criado (3 testes: registry order, CA-05, CA-03).
  Tracer corrigido (ID stale secrets-scan -> 03-secrets-scan, R6). Commit 0af449b.
- 2026-05-21: **Plano 02 (Step 3 + Step 4 + Shared Schema) CONCLUIDO 4/4 fases.** Steps 3-4
  reais no pipeline. `skills/_shared/legacy-manifest-schema.ts` disponivel para Planos 04 e 05.
  Plano 03 desbloqueado.
- 2026-05-21: Plano 03 fase-01 (step5-scaffold-and-link-real) concluida em paralelo com fase-02.
  `05-scaffold-and-link.ts` real criado: invoca `scaffoldFullTree` + `linkClaudeToAgents` sem dry-run.
  id: '05-scaffold-and-link'. 5 testes passando (id, greenfield, re-run CA-08, CA-02 byte-identico,
  D4 meta-test). DI: comentario `makeWriter` causou falha no meta-test D4 — removido. Commit 1160c89.
- 2026-05-21: Plano 03 fase-02 (step6-install-gh-files-real) concluida em paralelo com fase-01.
  `06-install-gh-files.ts` real criado: envolve `installGhFiles` com skip-if-exists guard no step.
  id: '06-install-gh-files'. 5 testes passando (id, greenfield, re-run, preserva-custom, D4).
  Lib `install-gh-files.ts` NAO modificada (DI-Plano03-fase02-install-gh-skip-policy opcao a).
  Commit d92f4b1.
- 2026-05-21: Plano 03 fase-03 (registry-wire + e2e) concluida. registry.ts comentarios atualizados
  (Steps 5-6 REAIS). registry.test.ts corrigido (IDs 05-scaffold-and-link / 06-install-gh-files,
  loop stub i=6). Tracer corrigido (R6 — 2 IDs atualizados). `tests/e2e/init-v7-scaffold-and-gh.test.ts`
  criado (4 testes: registry order, CA-01, CA-02, CA-08). DI: type guard adicionado para strict TS.
  Commit f9d645a.
- 2026-05-21: **Plano 03 (Step 5 + Step 6) CONCLUIDO 3/3 fases.** Steps 5-6 reais no pipeline.
  CA-01 (placeholders + .github/), CA-02 (.claude/CLAUDE.md byte-identico), CA-08 (re-run skip)
  validados ponta-a-ponta. Plano 04 desbloqueado.
- 2026-05-21: Plano 04 fase-04 (step-07-real + DR-2 + registry wire) concluida. Stub do Plano 01
  fase-04 substituido em `skills/init/lib/steps/07-generate-populate-plans.ts` por step real:
  `AbortError code=20` (DR-2) com `ABORT_MESSAGE_NO_STACK` wording exato de 3 linhas;
  invoca `generatePopulatePlans({cwd, stack})`; summary 4-linhas NFR Observabilidade
  (`init-07: ... / Legacy artifacts found / Docs skipped / Output:`); `mutated: true`.
  Registry wire stub→real, loop de stubs em registry.test.ts atualizado de `i=6..9` para
  `i=7..9`. 12 testes novos do step + 3 testes do registry + zero regressao fases 02/03 (37
  testes pre-existentes verdes). Commit 1c1d155.
- 2026-05-21: Plano 04 fase-03 (generator-pipeline) concluida. `generatePopulatePlans(opts)`
  exportada de `populate-plan-generator.ts` — pipeline orquestrador que itera as 16 entries,
  combina `buildWavesForDoc` (Wave 1) com Wave 2 baseada em `sectionsToWrite`, renderiza via
  `renderAndrePlan` e escreve em `docs/exec-plans/active/{date}-populate-{slug}/PLAN.md`.
  Manifest leitura graceful (ENOENT/malformado/Zod-invalido → null silencioso). 18 testes
  verdes (8 fase-01 + 10 fase-03), 16 pastas geradas em fixture tmp, CA-04 + CA-07 + D10 +
  NFR perf (<2s) validados. DI-Plano04-fase03-found-literal-true: schema usa `found: z.literal(true)`,
  fixture corrigida. Commit 51b0a32.
- 2026-05-21: Plano 04 fase-02 (instructions-table-16-docs) concluida. `skills/init/lib/populate-instructions-table.ts`
  criado com `DocInstruction` type, `POPULATE_INSTRUCTIONS_BY_DOC` (16 entries D18 — 12 baseline +
  4 AVC extras), `buildWavesForDoc(doc, stack)` stack-aware (node-ts/nextjs vs rails com fallback default)
  e `docToSlug(dst)` canonico. 19 testes verdes (135 expect). DI-Plano04-fase02-stackid-node-ts:
  spec usava `'nodejs-typescript'`, StackId real e `'node-ts'` — corrigido. `'nextjs'` mapeado
  explicitamente. Typecheck exit 0 com non-null assertions nos testes. Commit ca4f5f9.
- 2026-05-21: Plano 04 fase-01 (andre-template-renderer) concluida. `skills/init/lib/populate-plan-generator.ts`
  reescrito do zero (569 → 139 linhas) — renderer puro V3 com `renderAndrePlan` + `extractH2Sections` +
  tipo `AndrePlanInput`. 8 testes verdes (snapshot das 10 secoes CA-07). Cleanup teve escopo expandido
  (DEV-01): Step 91 (`91-generate-populate-plan.ts`) NAO havia sido deletado em Plano 01 fase-05 —
  removido aqui, 5 dependentes adaptados (registry.smoke.test.ts ids v7, run-init.test.ts CA-07 test.skip,
  imperative-instruction.test.ts/greenfield-populate-plan/populate-plan-parity describe.skip).
  Typecheck exit 0. Commits: ef6814b (cleanup, 10 deletados + 5 modificados) e ad12f84 (impl).
- 2026-05-21: Plano 04 fase-05 (e2e-fixtures-and-acceptance) concluida. 3 fixtures greenfield
  criadas (`v7-populate-node` com package.json+typescript, `v7-populate-rails` com Gemfile+rails,
  `v7-populate-no-stack` empty). Helper `copyFixtureToTmp` em `tests/e2e/__fixtures__/v7-populate-helpers.ts`
  (TDD gate forcou criar `.test.ts` primeiro — 2 testes de helper de bonus). 8 testes e2e
  em 3 arquivos (`init-v7-populate-plans-{node,rails,no-stack}.test.ts`) validando: 16 PLAN.md
  gerados em `docs/exec-plans/active/*-populate-*/` (CA-01), paths stack-aware Rails
  `app/views`/`app/assets` em FRONTEND.md (CA-04), 10 secoes H2 canonicas em todos os
  16 plans (CA-07), abort code=20 com wording exato quando stack nao detectada (DR-2).
  DI-Plano04-fase05-runInit-returns-not-throws: spec original usava try/catch que nunca acionaria
  expectation — `runInit` captura AbortError e retorna `{ kind: 'aborted', code, reason }`.
  Testes ajustados. Zero regressao (tracer-bullet 3 testes + step-07 unit 12 testes verdes).
  Typecheck exit 0. Commit 0a23a9c.
- 2026-05-21: **Plano 04 (Step 7 CORE) CONCLUIDO 5/5 fases.** Step 7 real gera 16 PLAN.md
  Andre format (10 secoes H2), stack-aware (Rails app/views vs Node-TS src/components), aborta
  com code=20 quando stack=null (DR-2 fechado). Pipeline tem agora 7 reais + 3 stubs.
  Plano 05 desbloqueado (Steps 8-10 + harness-validate + acceptance final CA-01..CA-09).
