# Changelog

Todas as mudanças notáveis do plugin Anti-Vibe Coding serão documentadas aqui.


## [7.3.0] - 2026-05-25

> **Minor release — Next.js + React Stack Knowledge (15 atoms)**
>
> Primeira stack knowledge completa em inglês (D15). 15 atoms extraídos de 9 fontes declaradas
> com anti-drift clause + verifier batch (94% rastreabilidade, 0 rework rounds).
> Detector ampliado com `nextjs` e `react` como StackIds distintos.
> Parser de preview atualizado para aceitar INDEX em EN (`By keyword`).

### Added — Infra + Detector (Plano 01)

- **`knowledge/nextjs/atoms/app-router-and-layouts.md`** (T1) — App Router, layouts aninhados, Route Groups, `loading.tsx`, `not-found.tsx`.
- **`knowledge/nextjs/INDEX.md`** — índice EN com `## By Cross-Stack Skill` (4 skills), `## By Tier` (T1/T2/T3), `## By keyword` (15-row table).
- **`THIRD-PARTY-NOTICES.md`** — MIT attribution para 6 SKILL.md V2 (nextjs-app-router-patterns, nextjs-best-practices, nextjs-expert, nextjs-turbopack, nextjs-supabase-auth, nextjs-app-router-patterns-v2).
- **`tests/fixtures/nextjs-app-router-fixture/`** — 5 arquivos (package.json com next+typescript, next.config.js, tsconfig.json, src/app/page.tsx, src/app/layout.tsx).
- **`tests/e2e/init-v7-nextjs-tracer-bullet.test.ts`** — 11 testes E2E CA-01/02/03/07 para stack Next.js App Router.
- **Detector:** `STACK_ID_TO_MATRIX_FOLDER['nextjs']` agora retorna `'nextjs'` (era `'nodejs-typescript'`); `'react': 'nextjs'` adicionado; `StackId` ganhou `'react'`; `probeReact` (vite.config + react em deps, G8 false-positive guard); `SOURCE_EXT_BY_MATRIX['nextjs']` adicionado.

### Added — Atoms Feature-driven (Plano 02, 6 atoms EN)

- **`knowledge/nextjs/atoms/react-server-components.md`** (T1, 196L) — Server-first, `server-only`, composição via children, async+Suspense, props serialização.
- **`knowledge/nextjs/atoms/server-actions-and-mutations.md`** (T1, 168L) — `'use server'`, Zod safeParse, revalidatePath/Tag, useActionState+useFormStatus, IDOR guard.
- **`knowledge/nextjs/atoms/middleware-and-edge.md`** (T1, 165L) — matcher config, auth-only-in-middleware advisory, Edge Runtime constraints, geolocation.
- **`knowledge/nextjs/atoms/data-fetching-and-cache.md`** (T2, 183L) — fetch() semantics Next 14 vs 15, unstable_cache, React.cache() DAL dedup.
- **`knowledge/nextjs/atoms/rendering-strategies.md`** (T2, 165L) — SSG/SSR/ISR/PPR decision table, `next_versions: ['>=15']` marker.
- **`knowledge/nextjs/atoms/pages-router-migration-tips.md`** (T3, 146L) — getStaticProps→RSC, getServerSideProps→Server Component, API routes→Route Handlers.

### Added — Cross-cutting + React + Integrations (Plano 03, 8 atoms EN)

- **`knowledge/nextjs/atoms/security-stack-specific.md`** (T1, 154L) — middleware auth guard, `server-only` boundary, Supabase `getUser()` vs `getSession()`, XSS/dangerouslySetInnerHTML.
- **`knowledge/nextjs/atoms/react-hooks-and-state.md`** (T1, 190L) — useState/useReducer, useOptimistic, useFormState, context anti-patterns, global store promotion gate.
- **`knowledge/nextjs/atoms/performance-and-turbopack.md`** (T2, 117L) — next/image, next/font, Turbopack, bundle analysis, dynamic import.
- **`knowledge/nextjs/atoms/testing-strategy.md`** (T2, 152L) — Vitest unit, RTL integration, Playwright E2E, MSW, test pyramid.
- **`knowledge/nextjs/atoms/ui-and-styling.md`** (T2, 147L) — Tailwind JIT, CSS variables, next/font integration, component co-location.
- **`knowledge/nextjs/atoms/error-handling-observability.md`** (T2, 168L) — error.tsx, global-error.tsx, instrumentation.ts, OTel, Sentry.
- **`knowledge/nextjs/atoms/react-suspense-patterns.md`** (T2, 178L) — Suspense boundaries, streaming, loading.tsx, `<ErrorBoundary>` composition.
- **`knowledge/nextjs/atoms/supabase-integration.md`** (T3, 183L) — `createBrowserClient`/`createServerClient`, middleware session refresh, OAuth callback, auth Server Actions.
- **`tests/fixtures/nextjs-supabase-fixture/`** — 6 arquivos (base Next.js + `@supabase/ssr` + `supabase/.gitkeep`).
- **`tests/e2e/init-v7-nextjs-supabase.test.ts`** — 3 testes E2E para detectStack+supabase-integration.

### Fixed

- **`skills/init/lib/format-knowledge-preview.ts`** — regex `(?:Por|By)\s+keyword` (RF-11): parser agora aceita INDEX em EN além de PT-BR. Backward-compatible. Adicionado 1 teste EN (14/14 passando).
- **`skills/init/lib/detect-multi-stack.ts`** — `next.config.{js,ts}` adicionado como anchor nextjs-específico antes de package.json (fix: detectMultiStack não identificava projetos Next.js sem `next` explícito no config de detecção).

### Captured

- **`docs/compound/2026-05-25-stack-knowledge-extraction-workflow.md`** — workflow validado: parallel waves + anti-drift clause + verifier refined = 0 rework rounds em 14 atoms. Template reusável para próximas stacks.

---

## [7.2.0] - 2026-05-24

> **Minor release — agent-skills-import (Waves 1/2/3) + compound-engineering-skill-port**
>
> Quatro PRDs consolidadas:
> - `2026-05-22-agent-skills-import-wave1` (CI + references seed + 2 skills + Common Rationalizations + grill-me refactor)
> - `2026-05-22-agent-skills-import-wave2` (13 agentes em contract v2.0.0 + 3 skills novas + pedagogia ADR)
> - `2026-05-22-agent-skills-import-wave3` (Prove-It Mode + 3 references + consolidacao /verify-work + Pipeline AGENTS.md)
> - `2026-05-22-compound-engineering-skill-port` (skill user-invocable com 4 subcomandos + bug fix MH-01 schema)
>
> Total de skills no plugin: **39** (era 34 em 7.1.0). Subagent-contract bumpado para v2.0.0
> com modo transitional. Pipeline pos-feature ganha gate compound (`/anti-vibe-coding:compound-engineering gate`)
> que delega captura ao `lessons-learned` via Skill tool nativa.

### Added — Wave 1 (Infra + Skills + Refinements)

- **`.github/workflows/test-plugin-install.yml`** — 3 jobs serie (validate-structure / validate-manifest / validate-tests) com actions pinadas a SHAs.
- **`docs/references/security-checklist.md`** — checklist OWASP operacional (~10 itens).
- **`docs/references/accessibility-checklist.md`** — checklist WCAG 2.0 AA (~8 itens).
- **`docs/references/testing-patterns.md`** — padroes de teste TypeScript/Bun (~8 padroes).
- **`skills/incremental-implementation/SKILL.md`** — port literal de `agent-skills-main` (copy-then-improve).
- **`skills/code-simplification/SKILL.md`** — port literal de `agent-skills-main`.
- **`## Common Rationalizations` + `## Red Flags`** em `tdd-workflow`, `security`, `plan-feature`, `execute-plan`, `grill-me` (conteudo dominio-especifico, nao generico).
- **Hypothesis + Confidence + GUESS pattern** em `grill-me/SKILL.md` (Passos 1-2 originais intactos).

### Added — Wave 2 (Agent Contract v2.0.0 + Skills + Pedagogia ADR)

- **`subagent-contract-v2.schema.json`** + **`subagent-contract-v2-migration.md`** — schema v2 novo arquivo (v1 imutavel); harness em modo transitional aceita ambas versoes.
- **13 agentes refinados para contract v2.0.0** — gold standard `security-auditor` (TB) + 12 demais em 3 waves paralelas (react/api/database/tdd-verifier; code-smell/solid/infrastructure/design-explorer; documentation-writer/lesson-evaluator/plan-executor/plan-verifier).
- **`agents/_contract/`** — validator anti-generico com fixtures (RED+GREEN).
- **`skills/source-driven-development/SKILL.md`** — port literal.
- **`skills/doubt-driven-development/SKILL.md`** — port literal.
- **`skills/git-workflow-and-versioning/SKILL.md`** — port literal.
- **`## When to Write an ADR`** em `skills/decision-registry/SKILL.md` — tabela de gatilhos + lifecycle PROPOSED->ACCEPTED->SUPERSEDED|DEPRECATED + Common Rationalizations + Red Flags. CRUD intacto.

### Added — Wave 3 (Prove-It Mode + References + Consolidacao)

- **`## Prove-It Mode`** em `agents/tdd-verifier.md` — `mode: "prove-it"` top-level; 6 fixtures em `agents/__fixtures__/tdd-verifier/prove-it/{red-confirmed,already-green,inconclusive}/`.
- **`docs/references/init-step-contract.md`** (91 linhas, 27 items).
- **`docs/references/hooks-checklist.md`** (94 linhas, 27 items).
- **`docs/references/tdd-cycle-checklist.md`** (88 linhas, 33 items).
- **`## Quando promover para reference`** em `docs/compound/README.md` — criterio numerico (>=3 repeticoes / >=2 skills / obrigatorio onboarding) + processo de promocao manual.
- **`referenced-by:` frontmatter** em 5 compound notes-origem (3 -> init-step-contract, 1 -> hooks-checklist, 1 -> tdd-cycle-checklist).
- **`## Test Sizes + DAMP vs DRY + Test-Doubles`** em `skills/tdd-workflow/SKILL.md`.
- **`## Task Sizing + Dependency Graph`** em `skills/plan-feature/SKILL.md`.
- **`## Pipeline de Trabalho` flowchart** em `AGENTS.md` (16 slugs validados; `AGENTS_MAX_LINES` 40 -> 70).
- **Deprecation notice** em `skills/anti-vibe-review/SKILL.md` apontando para `/verify-work` (grace period — skill permanece funcional).

### Added — Compound Engineering Skill Port (Opcao C — Hibrida)

- **`skills/compound-engineering/SKILL.md`** — user-invocable; 4 subcomandos:
  - **`install`** — skip-by-default + `--force` opt-in; stack-agnostic; patches P1 (AGENTS.md) + P2 (`new-plan.ts.tpl`) idempotentes.
  - **`check`** — wrapper via `Bun.spawn` invocando `compound-check.ts` do target; default backward compat + `--strict` ativa 3 regras novas (`agents-link`, `plan-generator`, `active-plan`).
  - **`migrate`** — fix nao-destrutivo de README brownfield (schema antigo `date/author/decision` -> canonico `title/category/tags/created`) + relatorio auditavel de notas inconsistentes (RNF-04 verificado via MD5).
  - **`gate`** — detecta plano ativo, 3 perguntas, delega `lessons-learned add` via Skill tool nativa (D20/CA-16). Completion signal SH-07.
- **`skills/compound-engineering/lib/`** — `manifest.ts` (`getCompoundManifest()` pura, 10 entradas), `installer`, `checker`, `gate`, `active-plan-detector`, `lessons-captured-updater`, `invoke-lessons-learned`, `readme-schema-detector`, `notes-inconsistency-scanner`, `migrate`, `patch-agents` (P1), `patch-new-plan` (P2), `compound-engineering-prefaces`.
- **`skills/compound-engineering/assets/`** — 10 templates `git mv` de `skills/init/assets/templates/` (linhagem preservada via estrategia 2-commits) com conteudo literal do Andre Prado.

### Changed

- **`.claude-plugin/plugin.json`** + **`.claude-plugin/marketplace.json`** + **`package.json`**: versao 7.1.0 -> 7.2.0 + description consolidada.
- **`scripts/generate-manifest.js`** ja le `package.json.version` (single source of truth — fix DI-5 da Wave 3 mantido).
- **`plugin-manifest.json`** regenerado: 425 arquivos indexados, 39 skills (era 34 em 7.1.0).

### Fixed

- **MH-01 (compound schema mismatch)** — `skills/init/assets/templates/docs/compound/README.md.tpl` agora documenta schema canonico `title/category/tags/created` (era `date/author/decision`, fazia projetos inicializados por `init` falharem no proprio `compound-check.ts`).
- **Path traversal confinement** em `skills/compound-engineering/lib/gate.ts` + **OCP `pickFirstYesDetails`** (commit `37efa77`).
- **`notesScanned`** em `migrate` reflete total escaneado (nao apenas notas com issues — commit `4360665`).

### Testing

- **compound-engineering lib:** 79+ testes (zero falhas).
- **E2E novos:** 3 (`tests/e2e/compound-engineering-edge-cases.test.ts` — CA-18/19/20).
- **subagent-contract:** 34 testes (era 31 — +3 do Prove-It Mode loop).
- **`harness:validate`** verde (28 arquivos required, 329 markdown).
- **Falhas pre-existentes** na full suite mantidas (init-refactor-v7 GT-1/2/3) — zero regressoes introduzidas pelas 4 PRDs.

### Notes

- **Wave 1** permanecia em `docs/exec-plans/active/` ate este release; movida para `completed/` no commit do bump.
- **Templates compound:** ownership oficialmente transferido de `init` para `compound-engineering` — `init` consome via `getCompoundManifest()` pura (boundary D25 preservada).
- **Telemetria por subcomando do compound:** NAO implementada (requer adicionar a `FasePipeline` em `telemetry-types.ts` — escopo separado). Mitigado via completion signal SH-07.


## [7.1.0] - 2026-05-22

> **Minor release — populate-quality-v1: Wave 1 lê artefatos existentes + guidance permissiva**
>
> Corrige o gap qualitativo entre outputs do `/init` e do harness original do Andre Prado.
> Causa raiz identificada via tracer-bullet: LLM ignorava auditorias, gotchas, ADRs e compound
> notes já documentados no repo — gerava docs genéricos em vez de absorver conhecimento senior
> pré-existente. Wave 1 de todas as 16 fases do populate-harness agora escaneia esses artefatos
> ANTES de grepar código. Guidance de SECURITY reescrita com tom permissivo. Resultado validado
> em projeto real: `docs/SECURITY.md` gerado passou a absorver `SECURITY_AUDIT_2026-02-20.md`,
> invariants do `.claude/CLAUDE.md`, compliance LGPD/PCI DSS e threat model — fechando o gap
> vs harness original do Andre.

### Added

- **`EXISTING_DOCS_TO_SCAN_BY_DOC`** em `skills/init/lib/populate-instructions-table.ts`:
  mapa com 16 entradas (um por doc canônico) definindo artefatos pré-existentes a escanear
  antes do grep de código. Tipos cobertos por entrada: auditorias de segurança
  (`SECURITY_AUDIT*.md`), gotchas (`.claude/progress.txt`), ADRs (`docs/DECISIONS.md`,
  `docs/design-docs/ADR-*.md`), compound notes, rules (`.claude/rules/*.md`), runbooks,
  bugs ativos, débitos técnicos e product docs.
- **`## Artefatos existentes — prioridade no Wave 1`** adicionado a todos os 15 guidance
  files em `skills/init/assets/populate-guidance/` (exceto `docs-security-md.md` que tem
  seção mais completa). Instrui a LLM a tratar artefatos pré-existentes como fontes de alta
  prioridade e derivar citações inline deles.

### Changed

- **`buildWavesForDoc`** em `populate-instructions-table.ts`: Wave 1 agora prepende itens de
  `EXISTING_DOCS_TO_SCAN_BY_DOC` (`Scan existing artifact ... if present (skip silently if
  absent)`) antes dos paths de código stack-specific. Ordem: artefatos existentes → código.
- **`skills/init/assets/populate-guidance/docs-security-md.md`**: tom invertido de restritivo
  para permissivo. `**Cubra:**`/`**NÃO escreva:**` substituídos por `**Espera-se cobrir, na
  profundidade que o código sustenta:**`. Seção `## Anti-patterns` com hard-NÃO removida.
  Adicionada seção `## Compliance, retenção e ameaças (quando aplicável)` que convida detalhe
  de LGPD/PCI/HIPAA quando o código sustenta. Nova seção `## Documentos existentes a
  inspecionar (ANTES de grepar código)` com 6 categorias e regra "cada H2 do SECURITY.md
  final deve ser informado por pelo menos UM artefato existente quando ele existir".
- **Entrada `docs/SECURITY.md`** em `POPULATE_INSTRUCTIONS_BY_DOC`: `scopeIn` expandido com
  `Compliance posture (LGPD, PCI DSS, GDPR, BCB, etc.) when the project carries it` e `Threat
  model summary when sensitivity warrants it`. `scopeOut` afunilado — removido `Compliance
  audit artifacts (SOC2, ISO)`, mantido só `Internal pentest findings still unpatched`.
  `reviewChecklist`/`exitCriteria` — OWASP hardcoded substituído por cobertura proporcional
  ao que o projeto realmente faz.

### Testing

- **Feature tests:** 36 pass / 0 fail (populate-instructions-table, populate-guidance-drift,
  populate-guidance-files, populate-plan-generator).
- **e2e:** 84 pass / 14 skip / 0 fail (98 tests, 21 files). 2-4 flakes de timing CA-02
  Windows I/O cold start são pré-existentes, não-regressão.
- **Validação real (tracer-bullet):** `docs/SECURITY.md` gerado em projeto Carreirarte
  absorveu `SECURITY_AUDIT_2026-02-20.md` (achados C1-H6-M7), invariants do `.claude/CLAUDE.md`
  (8 Critical Invariants), compliance LGPD art.10 + PCI DSS SAQ A-EP, threat model com 4
  vetores e Pendências Conhecidas honestas — fechando gap qualitativo vs harness Andre Prado.
- **version-bump:** 4/4 JSONs atualizados para 7.1.0 (package.json, plugin.json,
  marketplace.json, plugin-manifest.json).


## [7.0.0] - 2026-05-21

> **Major release — init-refactor-v7: pipeline 17 → 10 steps + dry-run removido + DR-2 abort**
>
> Refatoracao estrutural do `/anti-vibe-coding:init`. Pipeline canonico de 10 steps com
> contratos explicitos, gates de re-entrada, abort codes documentados e cobertura E2E
> "contrato vivo" (CA-01..CA-09 + NFR). 23/23 fases concluidas, 29 commits, 5 planos.
> Pasta: `docs/exec-plans/completed/2026-05-20-init-refactor-v7/`.

### Breaking changes

- **D4 — modo `--dry-run` REMOVIDO de todos os steps.** A flag nao e mais reconhecida.
  Comportamento dry-run vivia em ~15 lugares (writers, isDryRun, makeWriter, WriteRecorder)
  e gerava bugs silenciosos. Caminho unico: writes reais sempre.
- **Pipeline reescrito (17 → 10 steps):** Steps 07/08/09/11/14/15/91 deletados ou
  consolidados. Novo registry canonico (`skills/init/lib/registry.ts`):
  1. `reentry-gate` — DR-1, abort code=10 se `.claude/legacy-manifest.json` presente
  2. `detect-legacy-and-stack` — combinado (era 2 steps)
  3. `03-secrets-scan` — gate de segredos
  4. `migrate-planning-and-manifest` — v5/v6 -> v7 inline
  5. `05-scaffold-and-link` — scaffoldFullTree + linkClaudeToAgents (combinado)
  6. `06-install-gh-files` — .github/ files com skip-if-exists
  7. `generate-populate-plans` — CORE: gera populate-harness com 16 plans
  8. `08-delivery-loop` — pergunta Linear interativa (DOUBLE SPACE preservado, G3)
  9. `09-copy-knowledge` — copia knowledge/{stack}/ para .claude/knowledge/
  10. `10-final-validation` — D8.C: abort code=1 se stack detected mas INDEX.md ausente
- **DR-2: greenfield stack=null aborta com code=20.** Antes: soft-fail em
  `capabilities-discovery`. Agora: `generate-populate-plans` aborta com mensagem
  "Stack not detected — run /anti-vibe-coding:detect-architecture before /init".
- **`runInit` retorna `{ kind: 'completed' | 'aborted', code?, reason? }`** ao inves
  de lancar AbortError. Consumidores devem narrowizar pelo `kind`.
- **`StepContext.legacy?`/`stack?` ainda opcionais** (DV-4 nao endurecida — Steps 8-10
  nao precisam de `ctx.stack` direto).

### Added

- **`skills/init/lib/steps/08-delivery-loop.ts`** (real, portado do 14-delivery-loop.ts
  com D4 strippado). Plano 05 fase-01.
- **`skills/init/lib/steps/09-copy-knowledge.ts`** (real, com DI-2 runner injetavel
  para evitar bun mock.module pollution). Plano 05 fase-02.
- **`skills/init/lib/steps/10-final-validation.ts`** (real, D8.C preservado, exports
  `runFinalValidationChecks` + `walkDocs`). Plano 05 fase-03.
- **`tests/e2e/init-v7-final-acceptance.test.ts`** — contrato vivo CA-01..CA-09 + NFR
  perf (greenfield <30s; observado ~735ms — 40x abaixo do limite). 10/10 pass.
- **`scripts/grep-deleted-steps.ts`** — gate CA-09 cross-platform que falha se
  qualquer step deletado for re-importado (`scaffoldFullTreeStep` excluido — DEV-02).
- **`tests/e2e/__fixtures__/v7-with-claude-md/`** + **`v7-with-legacy/`** — fixtures
  para testes da acceptance suite.
- **Abort codes documentados:** 1 (final-validation gate), 10 (reentry-gate),
  11 (legacy migrate), 20 (DR-2 stack=null).
- **`docs/CODE_STYLE.md` + `.claude/CLAUDE.md`** adicionados ao `REQUIRED_FILES` do
  harness-validate (RF-12 anti-vibe extension).

### Removed

- **`skills/init/lib/steps/14-delivery-loop.ts`** (portado para `08-delivery-loop.ts`).
- **`skills/init/lib/steps/90-final-validation.ts`** (portado para `10-final-validation.ts`).
- **`tests/e2e/ca13-dry-run-parity.test.ts`** (D4 — obsoleto).
- **Steps 07/08/09/11/15/91 do pipeline antigo** (consolidados em 10 steps novos).

### Fixed

- **CHANGELOG.md broken-links:** 2 refs ao deletado `skills/init/lib/steps/00-detect-legacy.ts`
  convertidas para backtick (eram broken-link no `harness:validate`).
- **9 testes E2E obsoletos** marcados com `test.skip` + nota apontando para
  `init-v7-final-acceptance.test.ts`:
  * `init-cutover-greenfield.test.ts` (4): goldens nao se aplicam apos DR-2.
  * `ca12-greenfield-populate-validate.test.ts` (2 + path fix).
  * `ca15-performance.test.ts` (describe.skip): D4 removeu --dry-run.
  * `init-cutover-legacy-v5.test.ts` (1): code=1 substituido por code=20.
  * `init-tracer-bullet.test.ts` (1): substituido por `init-v7-tracer-bullet.test.ts`.

### Testing

- **e2e:** 84 pass / 14 skip / 0 fail (98 tests across 21 files, 2.33s).
- **acceptance suite:** 10/10 pass (3.15s).
- **harness:validate:** exit 0 (28 required + 295 .md OK).
- **typecheck:** clean.
- **grep-deleted-steps:** zero matches (gate verde).
- **version-bump:** 4/4 pass (todos os 4 JSONs principais em 7.0.0).


## [6.7.0] - 2026-05-20

> **Minor release — populate-plan-andre-port + gate path drift fix + caveats cleanup**
>
> Porta a estrutura de populate-plan do harness-engineering do Andre para o `/init` do plugin.
> Inclui correcao de bug critico no `90-final-validation` gate que abortava silenciosamente
> o init em greenfield ha ~7 semanas, e saneamento total de debt (0 fails de teste, 0 erros
> TS, 0 broken-links no harness:validate — primeira vez em ~7 semanas que a suite esta 100% verde).

### Added

- **PLAN.md.tpl + fase.md.tpl** em `skills/init/assets/templates/exec-plan/` com 11 secoes
  obrigatorias do formato Andre canonico (Goal, Scope, Assumptions, Risks, Execution Steps,
  Review Checklist, Validation Log, Compound Opportunity, Lessons Captured, Exit Criteria,
  Observability) + 3 opcionais marcadas como `<!-- opcional -->`. Renderer agora le `.tpl`
  + injeta variaveis via `applyVars`.
- **`LLM_INSTRUCTIONS` imperativas**: tipo `ImperativeInstruction { fontes, secoes, honestidade }`
  + helpers `formatImperativeInstruction()`, `isImperativeInstruction()`. 12 entries por doc
  canonico + `DEFAULT_INSTRUCTION` — sem brechas tipo "se nao houver, mantenha template".
- **`LARAVEL_CANDIDATES` + `PYTHON_CANDIDATES`** em `stack-aware-input-paths.ts` (SH-2).
  `pickStaticMap()` expandido de 5 para 7 cases. Total: 6 stacks cobertos (Next.js +
  Next.js+Supabase, Rails, Node-TS, Laravel, Python + fallback generico).
- **`populate-plan-coverage.ts`** + audit log expandido no Step 91: `docsCoveredByStack`,
  `docsWithoutCodeEvidence`, `phasesCreatedVsExpected` (SH-4 — observability primeiro).
- **Gate "nunca diminuir" mecanico**: `tests/e2e/populate-plan-parity.test.ts` com 10 asserts
  cobrindo CA-01 (>=12 fases), CA-04 (EXCLUDED nao readiciona), CA-03 (11 secoes), CA-06
  (instrucoes imperativas), CA-02 (>=3 paths reais Next.js+Supabase), CA-05 (stack null),
  CA-07 (mensagens claras), CA-08 (golden snapshot diff humano).
- **Golden snapshot**: `tests/e2e/__golden__/populate-plan-andre-parity.md` — regen via
  `UPDATE_GOLDENS=1` exige aprovacao humana no PR.
- **Compound notes** capturadas: `docs/compound/2026-05-19-never-diminish-andre.md` (paridade
  via teste, nao via doc) + `docs/compound/2026-05-20-validation-gate-path-drift.md` (gate
  path drift 7 semanas silencioso).
- **`docs/PIPELINE.md`** ganhou secao "Step 91 — Populate Plan (init skill internal)" com
  diagrama ASCII + 5 subsecoes (contrato PLAN.md, contrato LLM_INSTRUCTIONS, discovery,
  gate, observability).
- **Lessons Captured pre-populadas** em `PLAN.md.tpl` (6 seeds: Anti-pattern, copy-then-improve,
  Padrao compound, Trade-off, Honestidade, Audit antes de scaling) com comentario data-marcado
  "remover apos primeira customizacao real".

### Fixed

- **Bug critico: `90-final-validation.ts` gate path drift.** Step 90 verificava
  `.claude/knowledge/{stack}/INDEX.md` mas `copyKnowledge` copia o conteudo de
  `knowledge/{stack}/` DIRETAMENTE para `.claude/knowledge/` (sem subdir). `/init` greenfield
  abortava silenciosamente em qualquer projeto com stack detectavel desde commit `feb7975`
  (~7 semanas). Descoberto acidentalmente durante regen de goldens no Plano 05 fase-06.
  Capturado em compound note + contract test.
- **Renderer do populate-plan emitia HTML comment docstring no output.** `PLAN.md.tpl` tem
  bloco `<!-- ... -->` nas linhas 1-16 (instrucao para devs editando o tpl). Renderer fazia
  `applyVars(tpl, ...)` sem strip — comment lider impedia validator de fazer strip do
  frontmatter (regex `^---\r?\n...`), quebrando H1 check do `harness:validate`. Fix via
  helper `stripLeadingHtmlComment()` aplicado em PLAN.md.tpl + fase.md.tpl.
- **3 fails baseline herdados** (`CA-12 #1`, `CA-12 #2`, `tracer CA-01`): asserts contra
  formato antigo ("Como executar", "Glossario de Instrucoes LLM") removido no Plano 02
  fase-01. Tests atualizados para sections canonicas Andre (Goal/Execution Steps/Exit Criteria)
  + PRODUCT_SENSE/README agora APARECEM (D5 do PRD — Plano 01 fase-01).
- **3 erros GT-01 typecheck pre-existentes** (lazy-import.test.ts + subagent-contract.ts):
  `@ts-expect-error` para import literal intencional em lazy-import; cast `as object` em vez
  de `as AnySchema` (so existe ajv 7+, projeto tem 6.15.0 transitivo); type assert
  `{instancePath?:string}` no error object.
- **62 broken-links em `harness:validate`**: `tests/e2e/__golden__/populate-plan-andre-parity.md`
  contem paths-literais (representacoes textuais do output esperado, NAO links navegaveis).
  Adicionado `__golden__` a `SKIP_DIRS` do validator.
- **Stash@{0} duplicado** de commit `8355829`: droppado apos confirmar via `stash show -p`.
- **Wonts/14-populate-plan-andre-port.md** com link para `active/` (PRD ja em `completed/`):
  link corrigido.

### Changed

- Versao 6.6.1 → 6.7.0 propagada em `package.json`, `.claude-plugin/plugin.json`,
  `.claude-plugin/marketplace.json`, `plugin-manifest.json`, `tests/repo-structure/version-bump.test.ts`,
  `skills/init/lib/run-init.ts` fallback e `scripts/sync-to-global.sh` default.
- `NEXTJS_CANDIDATES` expandido de 6 para 14 chaves (+8 docs canonicos). `RAILS_CANDIDATES`
  e `NODE_TS_CANDIDATES` espelhados (12 chaves cada). `NEXTJS_SUPABASE_EXTRA.SECURITY/RELIABILITY`
  ganham 4 paths cada (CA-02 mecanico).
- `EXCLUDED_FROM_POPULATION_V2` reduzido a `docs/COMPOUND_ENGINEERING.md` (D5 do PRD —
  PRODUCT_SENSE/README sairam do filtro).
- `CanonicalDoc` type expandido em `stack-aware-input-paths.ts` (+5 docs novos).
- `TEMPLATE_MANIFEST` ganha entries para `ARCHITECTURE.md`, `AGENTS.md`, `.claude/CLAUDE.md`
  (D6 — obrigatorio sem opt-out).
- `init-greenfield.stdout.txt` golden regenerado: 26→31 fases, Discovery 51→52, +step
  `13_1-migrate-knowledge-path`.
- `init-greenfield.tree.json` golden regenerado: +`.claude/CLAUDE.md`, fases 04-31 expandidas.


## [6.6.1] - 2026-05-20

> **Patch release — Test fix do reentry-guard boundary**
> Captura via `/verify-work` pos-merge do 6.6.0 detectou que os boundary tests de
> `00_2-reentry-guard.test.ts` ainda referenciavam `6.5.0` apos o bump do threshold
> para `6.6.0`. Fix de uma linha em 2 testes. Sem mudancas de runtime.

### Fixed

- **`00_2-reentry-guard.test.ts` alinhado ao threshold 6.6.0** (`KNOWLEDGE_PATH_CUTOVER_VERSION`).
  Antes: testes usavam fixture `pluginVersion: '6.5.0'` esperando `AbortError`, mas
  a constante de producao migrou para `'6.6.0'` — comportamento real eh `re-populate`
  para manifests `< 6.6.0`. Resultado: 2 testes falhando silenciosamente pos-merge.
  Fix: trocar fixture para `'6.6.0'` (boundary que aborta) e `'6.5.1'` (< boundary, re-populate).
  Lição: bump de constante de threshold exige update de fixtures de boundary nos testes correspondentes.

### Changed

- Versao 6.6.0 → 6.6.1 propagada em `package.json`, `.claude-plugin/plugin.json`,
  `.claude-plugin/marketplace.json`, `plugin-manifest.json`, `tests/repo-structure/version-bump.test.ts`,
  `skills/init/lib/run-init.ts` fallback e `scripts/sync-to-global.sh` default.
  `KNOWLEDGE_PATH_CUTOVER_VERSION` em `00_2-reentry-guard.ts` permanece em `'6.6.0'`
  (threshold de re-populate, semantica diferente da versao do plugin).


## [6.6.0] - 2026-05-20

> **Minor release — Knowledge Path Cutover (docs/knowledge → knowledge/)**
> Runtime assets do plugin agora vivem em `knowledge/` na raiz (fora de `docs/`),
> corrigindo o bug onde `/init` emitia warning "Knowledge não foi copiado" ao rodar
> contra o cache global (`~/.claude/plugins/cache/`). Inclui refresh automático de
> atoms em re-populate, migração de artefatos v5 e validator pós-init com dois níveis.

### Changed

- **Path cutover `docs/knowledge/` → `knowledge/`** —
  `docs/knowledge/` era runtime asset coabitando com metadocumentação do plugin (dog-food não
  distribuível). Movido para `knowledge/` na raiz via `git mv` com linhagem git preservada
  (`git log --follow knowledge/{stack}/INDEX.md` mostra histórico completo).
  `sync-to-global.sh` agora copia `knowledge/` para o cache global e valida presença de
  `nodejs-typescript/INDEX.md` E `rails/INDEX.md` pós-sync (exit 1 se incompleto).

- **Refresh automático de atoms em re-populate** —
  Quando `/init` roda em modo re-populate (`manifest pluginVersion < 6.6.0` ou re-run
  explícito) e `.claude/knowledge/` já existe no projeto alvo, os atoms são sobrescritos com
  o conteúdo atual da matrix do plugin. Elimina drift entre versões silencioso.
  **Atenção:** re-populate sobrescreve `.claude/knowledge/` integralmente. Customizações
  locais devem viver em `.claude/knowledge/_overrides/` (convenção a estabelecer em PRD futuro).

- **Migração automática de artefatos init-v5** —
  Projetos que rodaram `/init` v5 têm `docs/knowledge/legacy-claude-knowledge/`. Em modo
  re-populate, o novo step `13_1-migrate-knowledge-path` move esse artefato para
  `docs/_legacy/knowledge/` (agrupa com `docs/_legacy/pre-6.5.0/`). Guard de colisão:
  aborta com mensagem clara se destino já existe (migração manual necessária).

### Added

- **Validator pós-init com 2 níveis** (`Step 90 final-validation`):
  - Check primário (bloqueante): stack detectada sem `.claude/knowledge/{stack}/INDEX.md` → `AbortError`.
  - Check secundário (warning, sunset v7.0.0): `docs/knowledge/` órfão remanescente → `console.warn`
    não-bloqueante com instrução de re-run.
- **Constante `KNOWLEDGE_PATH_CUTOVER_VERSION = '6.6.0'`** inline em `00_2-reentry-guard.ts` —
  threshold de re-populate atualizado de `6.5.0` para `6.6.0`.

### Fixed

- **Warning "Knowledge não foi copiado" em cache global** — causa raiz era `sync-to-global.sh`
  não copiar `docs/knowledge/` (por design: `docs/` é dog-food não distribuível). Resolvido com
  path cutover para `knowledge/` fora de `docs/`.
- **`copy-knowledge.ts` promove warning para `AbortError`** quando stack detectada mas matrix
  ausente no plugin (`primary !== null` E `sourceDir` ausente). Antes: warning não-bloqueante
  que permitia init completar com `.claude/knowledge/` vazio, silenciosamente quebrando skills downstream.


## [6.5.1] - 2026-05-19

> **Patch release — Bug fix: upgrade v5→v6.5**
> Corrige bug crítico onde `/init` abortava em projetos v5 antes do reentry-guard
> ter chance de sinalizar `re-populate` mode. Sem essa correção, o caminho de
> upgrade documentado no CLAUDE.md ("reentry-guard auto-detecta manifest <6.5.0
> e re-popula") ficava bloqueado.

### Fixed

- **`/init` em projetos v5 não chegava aos migrate steps** —
  `detectLegacyStep` (Step 00) abortava com `AbortError` para qualquer projeto
  contendo artefatos v5 (planning-dir, lessons-learned, decisions, .claude/),
  antes do `reentryGuardStep` (Step 00_2) rodar e setar
  `ctx.flags['__reentryMode'] = 're-populate'`. Fix em duas partes:
  1. Reordenação do `registry` ([skills/init/lib/registry.ts](skills/init/lib/registry.ts)) —
     `reentryGuardStep` agora roda ANTES de `detectLegacyStep`.
  2. `detectLegacyStep` (`skills/init/lib/steps/00-detect-legacy.ts` — deletado em init-refactor-v7)
     respeita `ctx.flags['__reentryMode'] === 're-populate'` e retorna summary
     `re-populate mode active` sem abortar, deixando o pipeline seguir aos
     migrate-* steps.

### Testing

- 3 testes adicionados em `00-detect-legacy.test.ts`:
  - `__reentryMode='re-populate'` não aborta em v5 artifacts (claude-legacy fixture).
  - `__reentryMode='re-populate'` não aborta mesmo com partial migration.
  - `__reentryMode='greenfield'` ainda aborta (não pula detecção indevidamente).
- 1 teste de ordenação em `registry.test.ts` — garante reentryGuard < detectLegacy.
- Golden file `tests/e2e/__golden__/init-greenfield.stdout.txt` atualizado para
  refletir nova ordem de execução (linhas 1–3).


## [6.5.0] - 2026-05-19

> **Minor release — LLM-driven harness population + hardening trimestre**
> `/init` agora scaffolda harness vazio e gera plano populate que IA executa via
> `/execute-plan`, lendo código real em vez de templates genéricos. Inclui
> reentry-guard automático para manifests <6.5.0 e múltiplos fixes de segurança
> (ReDoS, DoS, CRLF) extraídos do TODO.md.

### Added

- **LLM-driven harness population** (Planos 01–05) — `/init` em greenfield agora
  scaffolda apenas a estrutura (TODO.md, AGENTS.md, ARCHITECTURE.md, harness
  docs) e gera `docs/exec-plans/active/YYYY-MM-DD-populate-harness/PLAN.md`. A
  IA executa o plano lendo código real e populando cada doc canônico via PR.
  Substitui templates one-shot por iteração revisável.
- **Reentry-guard (`Step 00_2`)** — manifest `pluginVersion < 6.5.0` ou ausente
  dispara `__reentryMode=re-populate`; manifest `>= 6.5.0` aborta com mensagem
  do PRD. Detecta upgrade silencioso via `compareSemver`.
- **Backup pré-mutação (`Step 10`, ex-`apply-merge-destructive`)** — copia
  CLAUDE.md preexistente para `docs/_legacy/CLAUDE.md.bak.{timestamp}` antes
  do scaffold sobrescrever. Reposicionado no registry para logo após
  secrets-scan (não depende mais de AGENTS.md).
- **`rails-anchor` lib compartilhada** ([skills/init/lib/rails-anchor.ts](skills/init/lib/rails-anchor.ts)) —
  exporta `RAILS_GEMFILE_ANCHOR_RX`, `parseRailsAnchor`, `isLegacyRailsVersion`,
  `MIN_SUPPORTED_RAILS_MAJOR=7`, `MIN_SUPPORTED_RAILS_MINOR=1`. Elimina duplicate
  regex entre `detect-stack.ts` e `format-knowledge-preview.ts`.

### Removed

- Steps `07-discover-existing-docs`, `08-classify-blocks-hybrid`,
  `09-propose-merge-batch`, `11-move-docs-with-stub`, `12-detect-drift-incremental`
  (Plano 01) — substituídos pelo fluxo LLM-driven.
- Libs órfãs: `blocks-classifier`, `doc-mover-stub`, `merge-proposal-types`,
  `preview-renderer`, `discover-existing-docs`, `drift-detector`.

### Security / Hardening (TODO.md L15–L20)

- **CRLF-resilient frontmatter regex** — `/^---\r?\n[\s\S]*?\r?\n---\r?\n*/`
  em [scripts/harness-validate.ts:493](scripts/harness-validate.ts#L493),
  `.tpl:240`, [skills/init/lib/compound-writer.ts:74](skills/init/lib/compound-writer.ts#L74),
  [skills/lib/exec-plan-reader.ts:40](skills/lib/exec-plan-reader.ts#L40).
  Defense-in-depth — normalize step continua presente.
- **ReDoS guard em `atoms-frontmatter-validator`** — regex lazy `[\s\S]*?`
  substituída por `indexOf`-based scan linear (sem backtracking). Aceita CRLF
  como bonus.
- **Gemfile size cap (DoS guard)** — `run-stack-knowledge-init.ts:101-117`
  agora usa `fs.promises.stat` + check `≤1MB` antes de `fs.promises.readFile`
  (eliminou `readFileSync` sync I/O em fluxo async).
- **state-md tests isolados** — `hooks/state-md-hook.test.cjs` e
  `skills/lib/state-md-generator.test.ts` copiam fixture para `os.tmpdir()`
  no `beforeEach` (elimina GT-01 working-tree drift). Validado 3 runs
  consecutivos.
- **YAML injection + secrets redaction em compound-imported-writer** — `quoteYamlString`
  + 8 regex patterns (`ghp_`, `gho_`, `ghs_`, `github_pat_`, `sk-`, `AKIA`,
  `xox[abprs]-`, `Bearer ...`) aplicados antes de escrever
  `docs/compound/_imported/`.

### Lessons Captured

- `2026-05-19-tdd-gate-needs-stub-first.md` — TDD hook bloqueia Write
  impl-first; criar `.test.ts` + stub antes da implementação.
- `2026-05-19-fs-cp-rejects-dst-inside-src.md` — `fs.cp` valida `ERR_FS_CP_EINVAL`
  antes do filter; destino dentro do source falha mesmo com filter exclusivo.
- `2026-05-19-crlf-breaks-frontmatter-regex.md` — validators rejeitavam
  arquivos Windows; aceitar `\r?\n` em validator regex.


## [6.4.1] - 2026-05-18

> **Patch release — Correções no `/anti-vibe-coding:init` v6.4.x**
> Três bugs descobertos via Quick Plan inline, mais duas regressões adjacentes
> corrigidas durante validação. Sem mudança de comportamento público; apenas
> reforços de contrato de dry-run e idempotência.

### Fixed

- **Cross-upgrade misreport (Step `detect-legacy`)** — projetos com manifest
  `pluginVersion 6.x` já existente eram reportados como `Greenfield`. Adicionada
  branch via `readManifest()`: agora emite summary `v6.x manifest detected
  (pluginVersion=X) — cross-upgrade mode, scaffold will preserve existing files.`
  (`skills/init/lib/steps/00-detect-legacy.ts` — deletado em init-refactor-v7)
- **Scaffold overwrite de arquivos preexistentes** — `scaffoldTemplates` e
  `scaffoldFullTree` sobrescreviam `package.json`, `README.md` e demais arquivos
  da raiz em re-runs. Adicionado guard `fileExists()` antes de cada `writeFile`
  (defesa em profundidade, independente de modo); novos campos `filesSkipped`
  expõem o que foi preservado.
- **Dry-run leak (escrita real em `--dry-run`)** — Steps 01/03/03_1/04/05 escreviam
  ~50 arquivos em disco mesmo com `--dry-run`. Wiring de `makeWriter(getDryRunMode(ctx))`
  em todos os helpers mutating; guards de skip nos steps que dependem de arquivos
  scaffolded (02, 04, 14). Verificado em smoke: `find` retorna apenas o fixture
  original após `runInit(['--dry-run'])`.

### Fixed (regressões adjacentes)

- **Step 03_1 `persist-stack-and-knowledge`** — orquestrador escrevia 19 arquivos
  (`.claude/stack.json`, 16 knowledge atoms, INDEX.md, metrics JSONL) em dry-run.
  Guard no wrapper preserva o no-write contract sem refactor da cadeia
  `writeStackJson → copyKnowledge → emitStackKnowledgeEvents`.
- **Step 90 `final-validation`** — spawn de `bun run scripts/harness-validate.ts`
  abortava em dry-run (arquivo não escrito pelo Step 01), impedindo o preview do
  Step 91. Guard de skip em dry-run permite Step 91 emitir seu próprio preview.

### Internal

- Helpers `scaffold-templates`, `scaffold-full-tree`, `customize-architecture`,
  `install-gh-files`, `state-md-init` ganharam DI opcional `writeFile?` (default:
  `fs.writeFile + mkdir`). Habilita testes determinísticos e composição com
  `WriteRecorder` sem dependência cíclica.
- Fixture `skills/init/lib/steps/__fixtures__/v6-manifest/` para cobrir cross-upgrade
  no test red.


## [6.4.0] - 2026-05-17

> **Minor release — Refatoração Rails-style do `/anti-vibe-coding:init`**
> SKILL.md reduzido de 1215 para 86 linhas via cutover big-bang para arquitetura
> manifest + dispatcher. 17 steps modularizados em `skills/init/lib/steps/`,
> rationale extraído para arquivo dedicado, snippets Akita externalizados, suite
> E2E prova byte-idempotência greenfield + legacy v5 + 4 edge cases (CA-03/06/07/08).
> Comportamento externo do `/init` preservado byte-a-byte — zero breaking change
> para projetos consumidores.

### Breaking Changes (Behavior)

> **Atencao:** o comportamento default do `/anti-vibe-coding:init` mudou em projetos com
> `CLAUDE.md` pre-existente. Esta secao destaca o que mudou comportamentalmente sem
> quebrar a interface publica (mesmo comando, mesmas flags). Veja
> [docs/design-docs/ADR-0021-destructive-merge-default.md](docs/design-docs/ADR-0021-destructive-merge-default.md)
> para o rationale completo.

- **Default merge strategy: aditivo → destrutivo controlado** — em projetos com
  `CLAUDE.md` > 40 linhas, o `/init` agora propoe (via batch approval `needsUser`)
  transformacao destrutiva: extrai blocos para `docs/` harness, reduz `CLAUDE.md` a
  espelho `<= 40 linhas` espelhando `AGENTS.md`, cria backup completo em
  `.anti-vibe/backup/{timestamp}/` com manifest checksum-validado. Comportamento
  v6.3.x preservado via flag opt-in `--additive-merge`. Reversibilidade total via
  `/anti-vibe-coding:init --rollback`.
- **Regra "merge aditivo" do `skills/init/SKILL.md` substituida** — texto antigo
  "**NUNCA sobrescrever** — o merge deve ser **aditivo**" foi reescrito para
  "**NUNCA sobrescrever sem aprovacao explicita + backup recuperavel**", refletindo
  o sistema real (Step 09 `propose-merge-batch` + Step 10 `apply-merge-destructive` +
  backup `.anti-vibe/backup/`). Lista de excecoes operacionais documentada em
  `docs/design-docs/init-rationale.md` seccao "PRD 2026-05-17 — D26/D28".
- **Registry reorder: Step 10 (`apply-merge-destructive`) antes de Step 02
  (`link-claude-agents`)** — sequencia mudou para que o symlink/hardlink/copy 3-tier
  do `link-claude-agents` ja encontre o `CLAUDE.md` no formato espelho final, sem
  recriacao. Devs que importavam `linkClaudeAgentsStep` diretamente em testes
  isolados precisam de fixture com `CLAUDE.md` ja `<= 40 linhas` ou rodar
  Step 10 antes.
- **Warning runtime amarelo cross-upgrade v6.3.x → v6.4.x** — quando manifest local
  registra v6.3.x e `CLAUDE.md` ainda tem `> 40 linhas`, dispatcher emite warning PT-BR
  com sugestao de `--additive-merge`. Aparece UMA vez por run, antes do registry,
  apenas quando relevante (suprimido em greenfield, dry-run, opt-in explicito).

### Added

#### Refatoracao /init — Populate Plan + Invert CLAUDE.md Merge + Adapt Existing Docs (PRD 2026-05-17)

- **8 novos steps no registry de `/init`** (`06-secrets-scan`, `07-discover-existing-docs`, `08-classify-blocks-hybrid`, `09-propose-merge-batch`, `10-apply-merge-destructive`, `11-move-docs-with-stub`, `12-detect-drift-incremental`, `91-generate-populate-plan`). Pipeline cobre 4 modos do init (greenfield, migration, legacy v5, already-initiated).
- **Comando `/anti-vibe-coding:init --rollback`** — early-return no dispatcher; restaura ultimo backup em `.anti-vibe/backup/{latest}/` byte-a-byte validando checksums; registra ADR de rollback em `docs/design-docs/`.
- **Flag `/init --dry-run`** — cobre todos os novos steps com `mutated: false` e renderiza preview agregado sem mutacao. Parity test em CI compara dry-run output vs run real.
- **Flag `/init --additive-merge`** — opt-in conservador que preserva comportamento v6.3.x (pula Steps 09/10 destrutivos).
- **Helpers novos em `skills/init/lib/`** — `backup-anti-vibe.ts`, `secrets-scanner.ts`, `discover-existing-docs.ts`, `blocks-classifier.ts`, `discovery-store.ts`, `doc-mover-stub.ts`, `drift-detector.ts`, `rollback.ts`, `populate-plan-generator.ts`, `cross-upgrade-detector.ts`, `audit-log-writer-factory.ts`, `init-subagent-ids.ts`.
- **Snippets novos em `skills/init/assets/snippets/`** — `populate-plan-template.md`, `design-md-skeleton.md`, `rollback-adr-template.md`, `classifier-llm-prompt.md`.
- **PLAN.md de populacao automatico** — Step 91 (`generate-populate-plan`) emite `docs/exec-plans/active/{date}-populate-harness/PLAN.md` com 1+ tasks por arquivo do harness, paralelizaveis via `/execute-plan` wave-based.
- **Audit log canonico** — `discovery/agents-log.json` recebe entries com `subagent_id` literal centralizado em `INIT_SUBAGENT_IDS` (9 entradas), `input_paths`, `output_struct`, `duration_ms` e `retry_count` em todos os 8 novos steps + comando `--rollback`.
- **Documentacao formal da breaking-comportamental** — [docs/design-docs/ADR-0021-destructive-merge-default.md](docs/design-docs/ADR-0021-destructive-merge-default.md) + secao `### Breaking Changes (Behavior)` + warning runtime amarelo PT-BR.
- **Atualizacao do `docs/design-docs/init-rationale.md`** — seccao nova "PRD 2026-05-17 — Refactor /init Harness Populate Merge (D1-D30)" com 30 entries indexadas.

#### Refatoracao Rails-style do `/init` (PRD 2026-05-12)

- **Dispatcher Rails-style** ([skills/init/lib/run-init.ts](skills/init/lib/run-init.ts)) — orquestrador único que carrega `registry` lazy via [skills/init/lib/lazy-import.ts](skills/init/lib/lazy-import.ts) (workaround DI-06/GT-04 para Windows), itera os 17 steps em ordem canônica, captura `AbortError` (gates), honra `skipRemaining` (early-exit) e implementa contrato `needsUser`/`askUser` para steps interativos com anti-loop guard.
- **Registry contratual** ([skills/init/lib/registry.ts](skills/init/lib/registry.ts)) — `readonly Step[]` ordenado: `detectLegacy → reuseDiscovery → migrate.0/all/1/2/3/4 → scaffoldFullTree → linkClaudeAgents → detectStack → persistStackKnowledge → customizeArchitecture → installGhFiles → deliveryLoop → capabilitiesDiscovery → finalValidation`. Fonte de verdade do runtime; tabela no SKILL.md é apenas documentação.
- **17 steps modulares** em [skills/init/lib/steps/](skills/init/lib/steps/) — cada step é wrapper sobre helper preservado em `skills/init/lib/*.ts`. Wording byte-idêntico aos `console.log` originais (PRD R1/G1). Convenção de naming `NN-{slug}.ts` (00, 00_1, 01, 02, 03, 03_1, 04, 05, 09, 09_1, 10..13, 14, 15, 90).
- **Contrato `Step`/`StepReport`/`StepContext`/`AbortError`** ([skills/init/lib/steps/types.ts](skills/init/lib/steps/types.ts), [skills/init/lib/steps/abort-error.ts](skills/init/lib/steps/abort-error.ts)) — interface mínima sem `shouldRun` (steps decidem internamente via `isMigrateMode`); extensões aditivas `skipRemaining?` (Plano 02 fase-06) e `needsUser?`/`askUser?` (Plano 03 fase-06).
- **DRY helpers** ([skills/init/lib/steps/helpers.ts](skills/init/lib/steps/helpers.ts)) — `isMigrateMode(args)` + `isDryRun(flags)` + `resolvePluginRoot(stepFileDir)` extraídos pós code-smell audit. Magic strings `'dry-run'` e `'migrate'` encapsuladas como constants internas. 6 testes RED/GREEN cobrem os 3 utilitários.
- **Rationale indexado** em [docs/design-docs/init-rationale.md](docs/design-docs/init-rationale.md) — 34 entradas (DI/GT/CA/R/M/D/Gates + DEV histórico) extraídas dos HTML comments do SKILL.md inline. Cada entrada com `**Consumido por:**` apontando step ou marcando "transversal/histórico". Substitui prosa inline (~1100 linhas) por referência única.
- **5 snippets Akita** em [skills/init/assets/snippets/](skills/init/assets/snippets/) — `akita-code-style.md`, `akita-comments.md`, `akita-tests.md`, `akita-dependencies.md`, `akita-logging.md`. Extraídos byte-idênticos do apêndice antigo (linhas 1015-1193 do SKILL.md v6.3.2), seguem convenção de `delivery-loop.md` (sem frontmatter, sem H1).
- **Suite E2E byte-idempotence** ([tests/e2e/init-cutover-greenfield.test.ts](tests/e2e/init-cutover-greenfield.test.ts), [tests/e2e/init-cutover-legacy-v5.test.ts](tests/e2e/init-cutover-legacy-v5.test.ts)) — 8 testes cobrindo CA-01 (greenfield stdout+tree golden), CA-02 (legacy v5 migra planning/lessons/decisions), CA-03 (--dry-run zero mutação), CA-06 (capabilities soft-fail), CA-07 (backup-fail abort, skip-on-win32), CA-08 (Windows tier-3 copy-with-hook). 4 goldens versionados em `tests/e2e/__golden__/`.
- **Tracer bullet end-to-end** ([tests/e2e/init-tracer-bullet.test.ts](tests/e2e/init-tracer-bullet.test.ts)) — prova que dispatcher + registry + tier-1 symlink funcionam end-to-end (~110ms greenfield).

### Changed

- **Registry reorder: Step 10 antes de Step 02** — `applyMergeDestructiveStep` reposicionado IMEDIATAMENTE antes de `linkClaudeAgentsStep` em `skills/init/lib/registry.ts`. Justificativa em D23 do PRD (PRD 2026-05-17).
- **Regra "merge aditivo" do `skills/init/SKILL.md` reescrita** (ver `### Breaking Changes (Behavior)`).
- **Auto-deteccao de cross-upgrade no dispatcher** — `lib/run-init.ts` chama `detectCrossUpgrade` apos `parseFlags` e antes do loop do registry. Warning amarelo PT-BR quando relevante.
- **`skills/init/SKILL.md` reescrito como manifest declarativo** — 1215 → 86 linhas (CA-09, `<= 200`). Frontmatter preservado byte-idêntico. Corpo: 1 bloco fenced `typescript` único chamando `runInit({ args: process.argv.slice(2), cwd: process.cwd() })`, tabela markdown documentacional dos 17 steps, referências para `init-rationale.md` + 5 `akita-*.md` + `delivery-loop.md`, "Regras Importantes" preservadas literais, `$ARGUMENTS` placeholder mantido (skill loader depende).
- **Padrão `await import(...)` centralizado** — todos os boundary lazy passam por `lazyImport()` em [skills/init/lib/lazy-import.ts](skills/init/lib/lazy-import.ts). Inline `await import` em ~18 lugares do SKILL.md v6.3.2 substituído por single source helper, documentando DI-06/GT-04 (`bun -e` quebra em paths absolutos no Windows) uma vez só.
- **Divergência semântica corrigida via cutover** — SKILL.md v6.3.2 linha 174 referenciava `s.reason.includes('source-missing')` mas helper `migrateLessons` retorna `'no lessons-learned.md in backup'` — condicional morta nunca matchava. Step `migrate-3-lessons` usa `report.status === 'skipped'` (predicado funcionalmente correto); cutover remove a condicional quebrada do manifest.

### Fixed (code-smell pós-cutover)

- **DRY violations** identificadas pelo `code-smell-detector` resolvidas: `isMigrateMode()` duplicada em 6 steps + `const dryRun = ctx.flags['dry-run']` duplicada em 6 steps + `resolvePluginRoot()` duplicada em 2 steps — extraídas para `helpers.ts` único. Magic strings `'dry-run'`/`'migrate'` encapsuladas (eliminando ~19 ocorrências literais). Comportamento preservado byte-idêntico — helpers reescrevem expressões literalmente equivalentes.

### Documentation

- **PRD + Plano completos** preservados em [docs/exec-plans/completed/2026-05-17-refactor-init-skill-rails/](docs/exec-plans/completed/2026-05-17-refactor-init-skill-rails/) — 4 planos hierárquicos × 21 fases, MEMORY.md por plano com decisões/gotchas/desvios documentados, STATE.md final marcado `completed`.

### Reservation / Notas

- **Edge case `process.argv` no manifest:** o bloco fenced do SKILL.md usa `process.argv.slice(2)` confiando no `$ARGUMENTS` placeholder. Validação fim-a-fim coberta pela suite E2E + tracer bullet — não há regressão observada nos cenários testados.
- **Rollback seguro:** `git revert f372117` restaura SKILL.md inline (1215 linhas). Steps modulares continuam funcionais como wrappers — apenas a entrada do skill loader volta ao formato antigo.
- **CA-07 backup-fail via `chmod 000`** marcado `if (process.platform === 'win32') return` — `chmod` não previne acesso a arquivo no Windows. Tech-debt: rodar em CI Linux para cobertura completa.
- **19 IDs em `init-rationale.md`** declarados `transversal/histórico` no gate de cross-reference (DI-P04F05-1) — implementação existe no código mas citação por ID específico seria ruído. Cross-reference grep documenta convenção.

### Compatibility

- **Zero breaking change** para projetos consumidores: `/anti-vibe-coding:init` mantém wording, fluxo, arquivos gerados e códigos de saída byte-idênticos a v6.3.2. Suite E2E + golden snapshots provam isto.
- **Helpers em `skills/init/lib/*.ts` preservados** — nenhuma assinatura mudou. Plugins/scripts externos que importem helpers diretamente continuam funcionando.

---

## [6.3.2] - 2026-05-17

> **Minor release — Stack Knowledge Layer (Node.js + TypeScript) + hardening security/types**
> Primeira concretização dos slots `PrefaceContext.language`/`framework` reservados em v6.3.1: o `/init` agora detecta a stack do projeto consumidor e copia 14 átomos sênior stack-specific para `.claude/knowledge/`; as 7 skills cross-stack (`/security`, `/api-design`, `/system-design`, `/design-patterns`, `/architecture`, `/infrastructure`, `/tdd-workflow`) consomem o INDEX automaticamente via `stack-aware-preface`. Inclui hardening security pós-feature (symlink reject, TOCTOU elim, type guards completos).

### Added

- **14 átomos sênior Node+TS** em [knowledge/nodejs-typescript/atoms/](knowledge/nodejs-typescript/atoms/) — `async-concurrency-streams`, `type-system-idioms`, `error-handling-observability`, `state-and-caching`, `data-persistence`, `api-design-stack-specific`, `testing-strategy`, `security-stack-specific` (inclui primordials RF8), `code-smells-catalog`, `architecture-conventions`, `dependencies-supply-chain`, `performance-and-internals`, `operations-and-deploy`, `tooling`. Cada átomo: 5 seções (Quando consultar / Padrões sênior / Anti-padrões / Critérios de decisão / Referências externas), cap 200 ln, frontmatter 8 campos verbatim, audit-trail-paths nos `sources:` (RF11).
- **INDEX final consolidado** em [knowledge/nodejs-typescript/INDEX.md](knowledge/nodejs-typescript/INDEX.md) — 61 ln, mapas Por keyword / Por layer / Por tier / Como consultar.
- **`/init` multi-stack detection** ([skills/init/lib/detect-multi-stack.ts](skills/init/lib/detect-multi-stack.ts)) — detecta `primary` + `secondary[]` + `anchor_files[]` via file-extension tiebreaker; suporta `nodejs-typescript`, `rails`, `python`, `laravel`.
- **`.claude/stack.json` schema** ([skills/init/lib/write-stack-json.ts](skills/init/lib/write-stack-json.ts)) — `primary | null`, `secondary[]`, `anchor_files[]`, `detected_at` ISO 8601 UTC; atomic write via tmp+rename.
- **`copyKnowledge` discriminated union 5-status** ([skills/init/lib/copy-knowledge.ts](skills/init/lib/copy-knowledge.ts)) — `copied | skipped | refreshed | no-matrix | no-source`; path traversal guard via `VALID_PRIMARY` regex + `resolve()` defense-in-depth + (v6.3.2 hardening) symlink reject via `lstat()`.
- **Flag `--refresh-knowledge`** ([skills/init/lib/parse-refresh-flag.ts](skills/init/lib/parse-refresh-flag.ts)) — força re-cópia idempotente sobre `.claude/knowledge/` pré-existente.
- **Telemetria dedicada** ([skills/lib/telemetry-types.ts](skills/lib/telemetry-types.ts)) — `TelemetryStackDetected` + `TelemetryKnowledgeCopied` + `TelemetryDomainEvent` + `AnyTelemetryEntry` union; `writeTelemetryDomainEvent` em `.claude/metrics/YYYY-MM.jsonl`.
- **RF10 preview de keywords** ([skills/init/lib/format-knowledge-preview.ts](skills/init/lib/format-knowledge-preview.ts)) — após `knowledge_copied`, `/init` mostra "Knowledge cobre: kw1, kw2, ..." com top-8 keywords parseadas do INDEX.md; graceful quando INDEX ausente. `TOP_N_KEYWORDS = 8 as const` exportada.
- **Orquestrador callable `runStackKnowledgeInit`** ([skills/init/lib/run-stack-knowledge-init.ts](skills/init/lib/run-stack-knowledge-init.ts)) — extrai Step 3.1 do SKILL.md para função testável (D2 hardening); SKILL.md Step 3 reduziu de ~40 para 6 linhas.
- **Type guard compartilhado** ([skills/init/lib/stack-id-map.ts](skills/init/lib/stack-id-map.ts)) — `isMatrixFolder()` + `STACK_ID_TO_MATRIX_FOLDER` consolidados; substitui assertions `as MatrixFolder[]` (CS1+CS2 hardening) e cast cego em `readStackJson` (S5 hardening — `isValidStackJson` valida primary literal + array contents).
- **24+ testes E2E** — `stack-knowledge-tracer-bullet.test.ts` (CA-02/05/09 + edge CA-03/06/07/10reg), `stack-aware-preface-all-skills.test.ts` (CA-05+CA-09 nas 7 skills), `stack-knowledge-full-e2e.test.ts` (CA-01 atoms+INDEX validity + CA-04 skip+refresh), `format-knowledge-preview.test.ts`, `atoms-rf11-audit.test.ts`, `run-stack-knowledge-init.test.ts`, `pair-events.test.ts`, `copy-knowledge.test.ts` security cases.
- **2 compound lessons** em [docs/compound/](docs/compound/) — `2026-05-16-verifier-protocol-technical-sections-only.md` (verifier audita apenas Padrões/Anti-padrões/Critérios) + `2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md` (anti-drift clause).

### Changed

- **Bloco `stack-aware-preface` nas 7 SKILL.md cross-stack** — `/security`, `/api-design`, `/system-design`, `/design-patterns`, `/architecture`, `/infrastructure`, `/tdd-workflow` agora importam `getStackKnowledgePreface()` de [skills/security/lib/stack-aware-preface.ts](skills/security/lib/stack-aware-preface.ts). Preface cita `.claude/knowledge/INDEX.md` quando presente, vazio (graceful CA-09) quando ausente. JSDoc completo documentando assumption `process.cwd()` (D3 hardening).
- **`pairStartEnd` aceita `AnyTelemetryEntry[]`** — filtra pipeline events explicitamente antes de processar; permite consumir JSONL misto sem crash (D5+GT-4 hardening, destrava DEV-1 Plano 02).
- **`writeTelemetryStart/End/DomainEvent` aceitam `baseDir?` opcional** (default `process.cwd()`, backward-compat) — `runStackKnowledgeInit` passa `targetDir` explícito (S4 hardening, resolve CWE-706).

### Fixed (security/hardening pós-feature)

- **CWE-61 symlink following em `copyTree`** ([skills/init/lib/copy-knowledge.ts:119](skills/init/lib/copy-knowledge.ts#L119)) — `lstat()` rejeita symlinks no source tree antes de `copyFile`. Symlink plantado em `docs/knowledge/{stack}/` não escapa pluginRoot para `.claude/knowledge/` do consumidor.
- **CWE-367 TOCTOU em `copyKnowledge`** ([skills/init/lib/copy-knowledge.ts:83](skills/init/lib/copy-knowledge.ts#L83)) — substituído `existsSync → rm → mkdir` por `rm({force, recursive}) + mkdir({recursive})` incondicionais no branch refresh; elimina race window em invocações paralelas.
- **CWE-20 incomplete validation em `readStackJson`** — `isValidStackJson` type guard valida `primary` literal contra `MatrixFolder` + cada elemento dos arrays `secondary`/`anchor_files`; rejeita JSON adulterado.
- **Wave H2 (hardening v6.3.2 follow-up):** `StackJson.schema_version: "1"` adicionado como literal type — `writeStackJson` escreve o campo automaticamente, `isValidStackJson` rejeita JSON sem `schema_version` ou com versão `!== "1"`. Projetos existentes com stack.json pré-H2 devem rodar `--refresh-knowledge` para regenerar. `MatrixFolder` type agora derivado de `MATRIX_FOLDER_VALUES as const` em `stack-id-map.ts` (single source of truth — elimina drift entre union type e Set). Type guards `isPipelineEntry` / `isDomainEntry` / `getEntryTimestamp` exportados de `telemetry-types.ts` — consumers devem narrow antes de acessar `timestamp_inicio` (pipeline) ou `timestamp` (domain) em `AnyTelemetryEntry[]`.

### Reservation / WONTFIX consciente

- **Information disclosure RF11 (`sources:` audit-trail-paths em 14 átomos copiados):** mantido por design. Plugin é open-source — paths expostos (`claude-code/knowledge/Nodejs/...`) são públicos no GitHub; RF11 audit-trail é transparência intencional do PRD permitindo devs consumidores rastrear claims até a fonte. Decisão registrada no SUMMARY do PRD completado.
- **Tooling.md keyword coverage** — anti-drift do Plano 06 fase-03 levou à substituição de patterns planejados (Executor TS/Monorepo/Watch/CI-cache não estavam na fonte). Esses tópicos viram átomos próprios em v6.3.3+ se houver demanda.
- **CA-10 UX baseline snapshot pré-v6.3.2** não capturado durante dev — coberto pelo CA-10 regression existente (StackId interno vs matrix folder); future-proofing: capturar baseline antes da próxima feature similar.

---

## [6.3.1] - 2026-05-16

> **Patch release — Honesty & Wire-up sobre Adaptive Coaching**
> Fecha as 4 CAs da v6.3.0 que ficaram pendentes: capabilities AST honestas,
> `parity-audit` script executável, cruzamento real declared-vs-used,
> stale-warning nas skills profile-aware e migração final de
> `/architecture` + `/detect-architecture` ao bloco canônico.

### Added

- **AST-based capabilities writer** ([skills/lib/capabilities-writer.ts](skills/lib/capabilities-writer.ts)) — `discovery/capabilities.json` agora tem `source: "ast"` honesto via `@typescript-eslint/parser`. Rotas Next.js App Router detectadas determinísticamente (CA-05).
- **Script executável `bun run parity:audit`** ([scripts/parity-audit.ts](scripts/parity-audit.ts)) — wire-up CLI da skill `/parity-audit` com validação de `task_type` por whitelist (CA-07).
- **`gap-rules.crossCapabilitiesWithUsage`** — `parity-gaps.json` agora cruza capabilities declaradas vs. uso real no codebase, gerando linha `declared-not-used` para handlers órfãos (CA-08).
- **Stale-warning helper** (`<!-- stale-capabilities-check:start -->`) replicado nas 6 skills profile-aware — quando `capabilities.json:generated_at > 24h`, emite warning stderr non-blocking (CA-09).
- **2 regressões em `harness-validate-preface.test.ts`** — bloco prosa-only ou bloco com apenas `readArchitectureProfile` agora falham explicitamente.

### Changed

- **Schema `parity-gaps` v2** ([discovery/_schemas/parity-gaps-v2.schema.json](discovery/_schemas/parity-gaps-v2.schema.json)) — shape rico com `handler` line-suffix (`app/api/foo/route.ts:42`). `parity-gaps-writer.ts:computeParityGaps` é agora `async`. v1 mantido como deprecated até v6.4 (CA-06/CA-13).
- **`computeParityGaps` agora async** — 5 callers atualizados em `scripts/parity-audit.ts`, `tests/parity-gaps-schema-v2.test.ts`, `skills/parity-audit/lib/__tests__/parity-gaps-writer.test.ts`, `skills/init/lib/reuse-discovery.ts`/`.test.ts`.
- **`/architecture` e `/detect-architecture` migrados ao bloco canônico** (`<!-- profile-aware-preface:start -->`) usando `readPrefaceContext` em vez de `readArchitectureProfile` direto. Espelha padrão de `skills/security/SKILL.md`. Fecha CA-11 da v6.3.0.

### Removed

- **2 tolerâncias em `scripts/harness-validate.ts:checkProfileAwarePreface`** — alt-regex `readArchitectureProfile\(` e skip silencioso de prosa-only foram removidas. Bloco profile-aware-preface agora EXIGE fenced code block + `readPrefaceContext` (CA-10).

### Reservation

- **`PrefaceContext.language` e `PrefaceContext.framework` continuam null em v6.3.1.** Slots reservados para v6.5.0 (Node+TS) e v6.6.0 (Rails). CA-12 protege regressão.
- **v1 schema (`parity-gaps-v1.schema.json`)** permanece em `discovery/_schemas/` como deprecated até v6.4.

---

## [6.3.0] - 2026-05-15

> **Minor release — Adaptive Coaching (Eixo 2 Agent-Native)**
> Skills priorizadas leem `architecture-profile.md` automaticamente e adaptam o prompt
> por perfil arquitetural. `/init` produz inventário de capabilities do projeto.
> `/parity-audit` audita gaps entre capabilities do agente e task types do projeto.
> Fundação `PrefaceContext` reserva slots para v6.5 (Node+TS) e v6.6 (Rails).

### Added

- **`PrefaceContext` + `readPrefaceContext`** ([skills/lib/preface-context.ts](skills/lib/preface-context.ts)) — helper único para skills consumirem profile/language/framework. Shape composto desde já; v6.5/v6.6 preenchem slots reservados sem refactor.
- **`discovery/capabilities.json`** — `/init` produz inventário de rotas/handlers do projeto. Cobertura inicial: `nextjs-app-router` (AST determinístico) + `mvc-flat` (LLM-fallback marcado). Gitignored por default.
- **Skill `/anti-vibe-coding:parity-audit`** ([skills/parity-audit/SKILL.md](skills/parity-audit/SKILL.md)) — produz `discovery/parity-gaps.json` ranqueado por severity (`critical | important | nice`). `kind: "audit"` no contrato v6.1.0.
- **Lib `tool-registry-inspector`** ([skills/lib/tool-registry-inspector.ts](skills/lib/tool-registry-inspector.ts)) — enumera MCPs/builtin-tools/subagents em runtime. Consumida por `/parity-audit` e `qa-visual` refatorada.
- **Schemas JSON versionados** em `discovery/_schemas/` (`capabilities-v1.schema.json`, `parity-gaps-v1.schema.json`).
- **6 skills com `profile-aware-preface`** (4 Must Have + 2 Should Have): `/security`, `/api-design`, `/system-design`, `/design-patterns`, `/decision-registry`, `/lessons-learned`. Pattern: lookup table per-skill em `skills/{skill}/lib/{skill}-prefaces.ts`; fallback default = comportamento v6.2 quando profile null (CA-02).
- **Harness validator estendido** (`scripts/harness-validate.ts :: checkProfileAwarePreface`) — verifica bidirecionalmente start/end markers + referência a `readPrefaceContext`.
- **Doc canônico** [docs/design-docs/adaptive-coaching-framework.md](docs/design-docs/adaptive-coaching-framework.md) — `PrefaceContext` shape, schemas, migration guide para autores de skill (<30min).
- **ADR-0020** [docs/design-docs/ADR-0020-adaptive-coaching.md](docs/design-docs/ADR-0020-adaptive-coaching.md) — decisões e alternativas rejeitadas (runtime discovery puro, extender qa-visual, mobile checkpointing).

### Changed

- **`qa-visual` consome `tool-registry-inspector`** em vez de listar tools hardcoded em `allowed-tools`. UX idêntica a v6.2 (CA-06).
- **`/architecture` permanece como referência do padrão** — preface block existente alinhado com o helper composto (sem migração necessária; usa `readArchitectureProfile` direto + lookup próprio).

### Security

- **`capabilities.json` e `parity-gaps.json` gitignored por default.** Endpoints internos e MCPs instalados podem ser sensíveis em contexto pentest. Operador opt-in via flag para commitar.

### Reservation

- **`language` e `framework` no `PrefaceContext` ficam null em v6.3.0.** Slots reservados para v6.5.0 (Node+TS knowledge) e v6.6.0 (Rails). Lookup tables das 6 skills migradas continuam estáveis quando v6.5/v6.6 plugarem (CA-09).
- **Cobertura AST de profiles além de `nextjs-app-router` + `mvc-flat`** fica para v6.4+ (PRD Won't Have).

### Migration Guide

Para autor de skill que queira adicionar preface adaptativo:

1. Criar `skills/{skill}/lib/{skill}-prefaces.ts` exportando `{SKILL}_PREFACE_BY_PROFILE: Partial<Record<ArchitectureProfileName, string>>` e `DEFAULT_{SKILL}_PREFACE = ''`.
2. Inserir bloco `<!-- profile-aware-preface:start --> ... <!-- profile-aware-preface:end -->` no `SKILL.md` entre frontmatter (ou telemetry, se existir) e H1.
3. No bloco, ler `const ctx = readPrefaceContext()` e selecionar via `ctx.profile ? TABLE[ctx.profile] ?? DEFAULT : DEFAULT`.
4. Criar teste em `skills/{skill}/lib/{skill}-prefaces.test.ts` — 1 caso por profile suportado + 1 caso de fallback.
5. Rodar `bun run harness:validate && bun run test`.

Tempo médio: <30min por skill.

---

## [6.1.0] - 2026-05-14

> **Minor release — Contrato de Subagentes v1 (Eixo 1 Agent-Native)**
> Unifica output dos 13 subagentes do plugin em um contrato JSON unico.
> Orquestradores passam a parsear via `kind` (audit/mutation/proposal/verification),
> sem regex por auditor. Pre-requisito para `/init` migration-mode (v6.2).

### Breaking Changes

- **Output dos 13 subagentes mudou de markdown com enum de dominio para JSON envelope v1.** Auditores agora emitem `{contract_version, agent, kind, status, reasoning, payload}`. Skills consumidoras (`execute-plan`, `design-twice`, `verify-work`, `anti-vibe-review`) parsam via handler generico `parseAndDispatch()` de `skills/lib/subagent-contract.ts`. Plugins/forks que estendiam parsers custom por nome de auditor precisam migrar. Migration guide: [docs/design-docs/subagent-contract-v1.md](docs/design-docs/subagent-contract-v1.md) (<30min).
- **Campo `status` agora e lifecycle padronizado** (`complete | needs_retry | needs_human | blocked`), separado de status de dominio. Enum de dominio (`VULNERABILITIES_FOUND`, `OPTIMIZED`, `COMPLIANT`, etc) vive em `payload.domain_status`. Validator rejeita uso de enum de dominio em `status` top-level.
- **Campo `reasoning` obrigatorio, minimo 20 caracteres** (warning em <50 chars). Sem reasoning => output rejeitado com erro `REASONING_TOO_SHORT`.

### Added

- **Contrato de Subagentes v1.** [docs/design-docs/subagent-contract-v1.md](docs/design-docs/subagent-contract-v1.md) (doc canonico + migration guide), [docs/design-docs/ADR-0002-subagent-contract.md](docs/design-docs/ADR-0002-subagent-contract.md), [agents/_contract/v1.schema.json](agents/_contract/v1.schema.json).
- **Helper TS** [skills/lib/subagent-contract.ts](skills/lib/subagent-contract.ts) — `parseContract()`, `parseAndDispatch()`, `withRetry(needsRetry, max=1)`, secret-pattern detection (`API_KEY=`, `SECRET=`, etc), threshold reasoning (rejeita <20, warning <50).
- **13 fixtures de regressao** em `agents/__fixtures__/{nome}/{input.json,expected-output.json}` — 1 cenario por subagente. Rodam em CI via `bun run agents:contract`.
- **Harness validator** estendido (`scripts/harness-validate.ts` :: `checkAgentContracts()`) — confirma que prompt em `agents/*.md` instrui emissao de contrato v1.
- **Pre-commit hook** via husky + `.husky/pre-commit` — bloqueia commit local quando `agents/*.md` staged sem instrucao de contrato v1.
- **CI step** `bun run agents:contract` adicionado em `.github/workflows/harness.yml`.

### Changed

- **4 orquestradores agora consomem via handler generico**: `execute-plan` (mini-tracer-bullet — `plan-verifier` + `plan-executor` via `kind: verification`), `design-twice` (3x `design-explorer` paralelos via `kind: proposal`), `verify-work` (ate 8 auditores via `kind: audit` com deduplicacao de findings cross-agent), `anti-vibe-review` (replica padrao do verify-work). Codigo de parsing markdown por-agente removido. Adicionar auditor novo passa a custar zero mudanca nas skills (CA-06).
- **`/init` (`docs/exec-plans/active/2026-05-14-init-migration-mode/PRD.md`)** declara `requires: [v6.1.0-subagent-contract]`. Reconciler/Explorer/Compound do /init nascerao ja conformes.

### Security

- **Validator rejeita patterns de secret** (`API_KEY=`, `SECRET=`, `PASSWORD=`, `TOKEN=`) em `payload` e `reasoning` — defesa-em-profundidade contra agentes que copiariam arquivo cru com credenciais (PRD §Seguranca).

### Known Issues

- **`harness-validate v6-path-whitelist` tests (2 fails):** Tests in `tests/harness-validate-v6-path-whitelist.test.ts` expect exit 1 when SKILL.md or template references `.planning/` but validator returns exit 0. Won't-fix in v6.1.0 — pre-existing bug, does not affect runtime behavior. Tracked for v6.2.

### Reservation

- **v6.2 — spec real do `payload.mutation`.** `documentation-writer` ganhou envelope cosmetico `kind: "mutation"` em v6.1.0; spec do payload (dry-run, diff preview, conflict resolution) fica para v6.2. Tracked em [TODO.md](TODO.md).

### Migration Guide

Para autor de subagente externo / fork:

1. Adicione `kind: <audit|mutation|proposal|verification>` no frontmatter de `agents/{nome}.md`.
2. Substitua o template de output do agent por bloco JSON com `{contract_version: "1.0", agent, kind, status, reasoning, payload}` — exemplos em [docs/design-docs/subagent-contract-v1.md](docs/design-docs/subagent-contract-v1.md).
3. Adicione fixture em `agents/__fixtures__/{nome}/{input.json,expected-output.json}`.
4. Rode `bun run harness:validate && bun run agents:contract` — deve passar.

Tempo medio: <30min por agent.

---

## [6.0.0] - 2026-05-12

> **Major release — Harness Engineering + Compound Engineering Fusion**
> First release where every project gets institutional documentation
> (AGENTS.md + docs/* layered) bootstrapped by `/init`.

### Breaking Changes
- **Project layout changed: `.planning/` is now `docs/`.** All execution plans, PRDs, lessons, and decisions live under `docs/exec-plans/`, `docs/product-specs/`, `docs/compound/`, and `docs/design-docs/`. `/init` migrates existing `.planning/` automatically with backup; manual migration is also supported. See Migration Guide below.
- **`CLAUDE.md` is now generated as a symlink (or copy + hook fallback on Windows) pointing to `AGENTS.md`.** `AGENTS.md` is the single source of truth and must be ≤40 lines. Editing `CLAUDE.md` directly is discouraged — edit `AGENTS.md` and the symlink reflects changes.
- **Skill output paths changed (interface preserved):** `/lessons-learned` now writes to `docs/compound/YYYY-MM-DD-{slug}.md` with YAML frontmatter; `/decision-registry` writes to `docs/design-docs/ADR-NNNN-{slug}.md`. Command flags and arguments are unchanged.
- **`harness:validate` is now required to pass.** New CI check via `.github/workflows/harness.yml` blocks merge if AGENTS.md exceeds 40 lines, plans are orphaned in `docs/exec-plans/active/`, or compound notes lack required frontmatter.
- **`senior-principles.md` migrated to `docs/design-docs/core-beliefs.md`.** The root-level file is preserved during migration but no longer the canonical location.
- **`decisions.md` split into per-decision `docs/design-docs/ADR-NNNN-*.md`.** Aggregate file preserved for one release; will be removed in v6.1.0.

### Added

- **`AGENTS.md`** — institutional index file (≤40 lines, English), generated by `/init`. Links to the 8 layered docs and includes Compound Decision Gate rule.
- **`docs/` layered structure** — 8 institutional files: `DESIGN.md`, `FRONTEND.md`, `PLANS.md`, `PRODUCT_SENSE.md`, `QUALITY_SCORE.md`, `RELIABILITY.md`, `SECURITY.md`, `COMPOUND_ENGINEERING.md`. Plus `docs/exec-plans/{active,completed}/`, `docs/compound/`, `docs/design-docs/`, `docs/review-checklists/`, `docs/smoke-flows/`, `docs/product-specs/`, `docs/references/`, `docs/generated/`.
- **`docs/STATE.md`** — dynamic state file regenerated by `hooks/state-md-hook.cjs` (rate-limited to 1x/30s). Tracks Resources (counts of compound notes, ADRs, plans, TODO items), Recent Activity, Pending work.
- **`bun run harness:validate`** — TypeScript+bun validator (`scripts/harness-validate.ts`). Checks AGENTS.md length, orphan plans in active/, broken links, required files present.
- **`bun run compound:check`** — validator for compound notes (`scripts/compound-check.ts`). Verifies YAML frontmatter (`title`, `category`, `tags`, `created`) and required sections (Problem, Solution, Prevention).
- **`bun run state:regenerate`** — manual STATE.md regeneration (`scripts/state-regenerate.ts`).
- **Skill `/todo-pick`** — picks an item from root `TODO.md` and runs a fix loop. Supports `--skip N` (mark as `[-]`) and `--remove N` (delete with confirmation). Companion: agents may auto-append out-of-scope items detected during other tasks (`/execute-plan` etc.) as `- [ ] {YYYY-MM-DD} {file:line} description`.
- **Hook `hooks/pre-mutation-gate.cjs`** — UserPromptSubmit hook (non-blocking) that suggests reading `docs/exec-plans/active/` before substantial edits. Heuristic: implementation verbs (PT+EN) + sensitive paths + no active plan.
- **Hook `hooks/state-md-hook.cjs`** — PostToolUse hook that regenerates `docs/STATE.md` after CRUD on compound notes / ADRs / plans / TODO. Rate-limited 30s.
- **Stack detection in `/init`** — heuristics on `package.json` (next/react/express), `Gemfile` (rails), `composer.json` (laravel), `pyproject.toml` (python). Detected stack recorded in `docs/STATE.md` Resources section + customizes `docs/ARCHITECTURE.md` (e.g., "Next.js framework detected"). Note: knowledge pack content deferred to v6.1+ (D37).
- **`.github/workflows/harness.yml`** — CI workflow running `bun run harness:validate && bun run compound:check` on every PR (always installed by `/init`).
- **`.github/pull_request_template.md`** — PR template with Compound Decision Gate checkbox.
- **`TODO.md`** in project root — micro-debt tracker (complementary to exec-plans which capture substantial work).
- **Compound Decision Gate** — convention in `AGENTS.md` + interactive flow in `/iterate` ("did this work teach the repo something durable? if yes, capture; if no, log why").
- **CRUD across compound notes / ADRs / TODO** — `/lessons-learned --update`, `--delete` (soft archive to `docs/compound/_archived/`); `/decision-registry --revoke` (creates superseded ADR linking back); `/todo-pick --skip`, `--remove`.
- **Completion signal helper (`lib/completion-signal.ts`)** — every skill emits a YAML block at the end of its run (`skill:`, `status:`, `outputs:`, `next_suggested:`, `blocks_for_user:`) to enable structured chaining.
- **Telemetry events** (extending `telemetry-utils`): `init.scaffold`, `init.migrate`, `harness:validate`, `compound:check` (latency + success/failure).
- **Dog-fooding:** plugin repository itself now adopts the v6 layout (`anti-vibe-coding/AGENTS.md` + `docs/` + harmonized exec-plans).

### Changed

- **`/init` is now the single entry point** for both new-project bootstrap AND v5 → v6 migration. Detects legacy structure (`.planning/`, `lessons-learned.md`, `senior-principles.md`, `decisions.md`) and offers migration with `--dry-run` preview + automatic backup to `.planning.v5-backup/`. Replaces a hypothetical `/migrate-to-v6` (D15).
- **Validators rewritten in TypeScript + bun** (was JavaScript in the upstream André workshop). Aligns with global rule "always use bun, prefer TypeScript". Logic preserved.
- **Exec-plan template harmonized to 10 sections** (D18): Goal, Scope, Assumptions, Risks, Execution Steps, Review Checklist, Validation Log, Compound Opportunity, Lessons Captured, Exit Criteria. `/plan-feature` generates the full template; `/quick-plan` generates a reduced version (Goal + Steps + Exit Criteria + Validation Log).
- **`detect-architecture` extended** to recognize v6 layout (presence of `docs/exec-plans/`) and integrate with `/init`.
- **`/iterate` triggers Compound Decision Gate** at the end of post-deploy cycles (D17).
- **All institutional docs in English** (D2) — proven 25-30% token economy. Skill SKILL.md files remain in Portuguese (intentional bilingual setup: plugin internals = PT, project artifacts = EN).
- **Plugin description updated** in `.claude-plugin/plugin.json` to reflect v6 highlights.

### Deprecated

- **Root-level `decisions.md`** — will be removed in v6.1.0. Use `docs/design-docs/ADR-*.md` instead. Aggregate file is preserved during this release as a read-only mirror.
- **Root-level `senior-principles.md`** — replaced by `docs/design-docs/core-beliefs.md`. Root file preserved as compatibility shim until v6.1.0.
- **`.planning/`** as primary location for plans — keep using `docs/exec-plans/` instead. Existing `.planning/` folders are preserved as historical artifact; migration via `/init` is offered but not forced.

### Removed

- Nothing removed in this release. All v5.3 commands continue to work (D10 — zero breaking change at the command interface). Path changes (Breaking Changes above) are abstracted by the skills themselves.

### Fixed

- **`grep -c` exit-1 bug** in `hooks/grepping-names.cjs` legacy handling (carried from v5.2 compound notes — see `docs/compound/2026-04-21-grep-c-exit-1-quando-zero.md`).
- **Symlink fallback for `CLAUDE.md → AGENTS.md` on Windows** — 3-tier fallback (`ln -s` → `mklink /H` → `cp + PostToolUse hook`) ensures `CLAUDE.md` reflects `AGENTS.md` even where developer mode is off (R1 mitigation).

### Security

- No security advisories in this release.

### Migration Guide: v5.x → v6.0.0

**Estimated time:** 2-5 minutes per project (depending on size of `.planning/`).
**Risk:** Low — backup is automatic and rollback is one `git revert` away.

#### Prerequisites

- [ ] `git status` is **clean** in your project (commit or stash any work-in-progress before migrating). The migrator creates a backup but does not protect uncommitted edits.
- [ ] `bun >= 1.0` installed (`which bun` returns a path).
- [ ] You have the v6.0.0 plugin installed in Claude Code (run `/anti-vibe-coding:sync` to verify).

#### Step 1: Preview the migration (dry-run)

```bash
# Inside your project root
/anti-vibe-coding:init --dry-run
```

Expected output:

```
Detected v5.x structure:
  .planning/         (4 PRD folders, 18 plans)
  lessons-learned.md (12 lessons)
  decisions.md       (3 ADRs)
  senior-principles.md

Migration plan:
  → .planning/2026-XX/CONTEXT.md → docs/exec-plans/active/2026-XX-{slug}.md
  → .planning/2026-XX/PRD.md → docs/product-specs/2026-XX-{slug}.md
  → lessons-learned.md → docs/compound/{N}.md (12 files)
  → decisions.md → docs/design-docs/ADR-{NNNN}-{slug}.md (3 files)
  → senior-principles.md → docs/design-docs/core-beliefs.md
  → CLAUDE.md unchanged; new AGENTS.md created as primary, CLAUDE.md will symlink to it.

No files modified. Run without --dry-run to apply.
```

Review the output. If anything looks off, file an issue before continuing.

#### Step 2: Apply the migration

```bash
/anti-vibe-coding:init
```

The skill will:
1. Create backup at `.planning.v5-backup/` (atomic — fails-safe).
2. Convert each artifact to the v6 location.
3. Generate `AGENTS.md` (≤40 lines) seeded from your existing `CLAUDE.md`.
4. Create `docs/` skeleton with the 8 institutional files (placeholders — fill in as you go).
5. Install `.github/workflows/harness.yml` + PR template.
6. Run `bun run harness:validate` to verify the result.

#### Step 3: Verify the migration

```bash
bun run harness:validate
# Expected: exit 0

bun run compound:check
# Expected: exit 0

cat docs/STATE.md
# Expected: Resources section lists detected_stack, counts of compound notes / ADRs / plans / TODO
```

#### Step 4: Commit the migration

```bash
git status
# Should show: many new files in docs/, AGENTS.md, ARCHITECTURE.md, .github/, TODO.md
# And: deleted lessons-learned.md, decisions.md, .planning/* (moved to .planning.v5-backup/)

git add -A
git commit -m "chore: migrate to anti-vibe-coding v6.0.0"
```

#### Step 5: Customize (optional)

- Edit `AGENTS.md` to add project-specific guidance (≤40 lines total — validator enforces).
- Move stack-specific patterns into appropriate `docs/*.md` (DESIGN, RELIABILITY, etc.).
- Add new lessons via `/lessons-learned add` — they land in `docs/compound/` automatically.
- See `TODO.md` for deferred work items tracked during v6 development.

#### Rollback

If migration causes problems, recovery is one revert:

```bash
git revert HEAD       # undoes the migration commit
rm -rf .planning.v5-backup/  # optional: clean up backup if no longer needed
```

You're back to v5.x state. The plugin itself remains v6 — only your project layout reverts. If you need to also downgrade the plugin (rare), reinstall v5.3.0 from the plugin marketplace or `git checkout v5.3.0` if installed from source.

Note: `git revert` undoes the structural migration (file moves, new docs). It does NOT un-edit lessons you already modified in `docs/compound/` after the migration. Those edits remain — back them up separately if needed.

#### Known issues

- **Windows + non-developer-mode:** Symlink `CLAUDE.md → AGENTS.md` uses `mklink /H` (hard link, no admin needed on NTFS) or a `cp + PostToolUse` hook fallback. If you edit `AGENTS.md` and the changes don't appear in `CLAUDE.md`, run `bun run state:regenerate` to force the hook.
- **Skill SKILL.md files remain in Portuguese.** Project-level docs (`AGENTS.md`, `docs/*`) are in English (token economy — D2). This bilingual setup is intentional.
- **Knowledge pack content for Node.js / Rails / Next.js is NOT included in v6.0.0.** Stack detection works; pack content ships in v6.1+ releases (one stack per minor version).
- **Deferred work:** See `TODO.md` in the plugin root for items tracked but not shipped in v6.0.0.

---


## [5.3.0] - 2026-05-12

Plugin Adaptativo — Onda 1. Release detalhado em [docs/references/v5-legacy/release-notes-v53.md](docs/references/v5-legacy/release-notes-v53.md).

### ✨ Adicionado

#### Architecture Detector
- **Skill `/anti-vibe-coding:detect-architecture`**: classifica projeto em 1 de 5 perfis com score 0-100% (RF1, RF3)
- **5 perfis suportados**: clean-architecture-ritual, mvc-flat, vertical-slice, nextjs-app-router, unknown-mixed
- **Schema `architectureProfile`** em `.claude/.anti-vibe-manifest.json` versionado para evolução futura (RF2)
- **Markdown legível** `.claude/architecture-profile.md` gerado automaticamente (RF9)
- **Documentação dos 5 perfis** em `docs/architecture-profiles.md` (RF10)

#### Modo Dual
- **Helper estável** `readArchitectureProfile()` em `skills/lib/read-architecture-profile.ts` — leitura UMA vez, retorna `null` quando flag=false (CA-04)
- **5 skills estruturantes adaptadas**: `architecture`, `plan-feature`, `write-prd`, `execute-plan`, `verify-work` leem o perfil e adaptam recomendações sem prescrever refactor (RF7)
- **Convenção documentada** em `docs/dual-mode-convention.md`
- **8 fixtures canônicos** em `skills/lib/__fixtures__/architecture-profile/` (5 perfis + no-profile + flag-disabled + invalid-profile)

#### Telemetria passiva
- **Lib `telemetry-utils.ts`**: `writeTelemetryStart`/`writeTelemetryEnd` com falha silenciosa (CA-09) e rotação mensal `.claude/metrics/YYYY-MM.jsonl` (RF4, RF5)
- **Schema JSONL** com 10 campos documentado em `docs/telemetry-schema.md`
- **Script CLI** `scripts/analyze-metrics.ts`: agrega metrics local, gera relatório baseline com ASCII chart (`--ascii`), suporta `--set <perfil>` para override manual (RF8, RF12, RF14)
- **Sugestão (não execução)** em `skills/init/SKILL.md` para rodar analyze-metrics (RF13)

#### 5 Princípios universais
- **10 Questions Test** integrado em `consultant` e `grill-me`
- **Comment Provenance** em templates de PRD e fase
- **Declarative-first** (outcomes antes de mecanismo) em `write-prd`
- **Fresh-context Review** em `verify-work`
- **YAGNI checklist** em `consultant`
- Documentação consolidada em `docs/universal-principles-v53.md`

#### Feature flag
- **`architectureDetectorEnabled`** (default `false`) — opt-in puro, preserva comportamento v5.2 (RF6, CA-04)

### 🛡️ Privacy-first (D7 — irreversível)

Telemetria é **local-only**. Sem network calls, sem upload, sem endpoint configurável. Script `analyze-metrics.ts` apenas lê arquivos locais.

### 🐛 Bugs conhecidos

- **BUG-02 (crítico, arquitetural):** A instrumentação adicionada às 10 `SKILL.md` (blocos TypeScript chamando `writeTelemetryStart`/`writeTelemetryEnd`) é tratada como prompt markdown pelo agente Claude, não como runtime executável. Resultado: `.claude/metrics/YYYY-MM.jsonl` não é populado durante invocação real de skills. A função em si está implementada e testada (224 testes verdes), mas o gatilho de execução nunca dispara. Fix planejado para Onda 2 via par `PreToolUse`+`PostToolUse` em `hooks.json`. Detalhes em [docs/references/v5-legacy/baseline-v53-onda1.md](docs/references/v5-legacy/baseline-v53-onda1.md).

### ⚠️ Validação parcial

- **CA-04 (compatibilidade v5.2):** ✅ coberto por testes textuais
- **CA-05 (saída adaptativa):** ✅ cumprido empiricamente em Carreirarte (modo dual ativo difere do v5.2 genérico)
- **CA-10 (manifest pré-v5.3 não quebra):** ✅ coberto por testes
- **CA-11 (≥50 pares válidos em dogfooding):** ❌ **deferred-to-onda-2** — bloqueado por BUG-02
- **CA-12 (isolamento entre repos):** ✅ coberto por testes textuais e fixture `flag-disabled.json` (validação empírica via piloto-false ficou obsolete após Licitar virar Rails — DEV-07)

### 📦 Compatibilidade

- Manifest pré-v5.3 não quebra (campo `architectureProfile` é opcional — CA-10)
- Comportamento v5.2 preservado integralmente quando flag desligada (CA-04)
- Backfill de planos legacy é opcional (D5) — sem migração automática

### 🔜 Onda 2 (depende de fix BUG-02)

Token Tax audit, Comprehension Debt tracking, perfis adicionais (`rails-mvc`, `react-spa-flat`/`vite-spa`, DDD strategic, Monorepo), skill `/dependency-graph`.

## [4.0.0] - 2026-03-23

### ✨ Adicionado

#### Sistema de Versionamento Automático
- **`plugin-manifest.json`**: Manifest central com checksums SHA-256 de todos os arquivos gerenciados
- **`.claude/.anti-vibe-manifest.json`**: Manifest local no projeto do usuário para rastreamento de versões
- **Skill `/anti-vibe-coding:update`**: Detecta e aplica atualizações incrementais
- **Estratégias de atualização**:
  - `merge` para CLAUDE.md e rules (preserva modificações do usuário)
  - `replace` para hooks, agents e documentação oficial
  - `never` para arquivos do projeto (decisions.md)
- **Backup automático**: Todos os arquivos vão para `.claude/backups/YYYY-MM-DD/` antes de atualizar
- **Detecção de modificações**: Compara checksums para detectar se usuário modificou arquivos

#### Documentação
- **`skills/lib/manifest-utils.md`**: Biblioteca de utilitários para versionamento
- **`docs/versionamento-exemplo.md`**: Exemplos práticos de todos os cenários
- **Seção "Versionamento"** adicionada ao CLAUDE.md e README.md

#### Scripts
- **`scripts/generate-manifest.js`**: Gera plugin-manifest.json automaticamente

### 🔄 Modificado

#### Skill Init
- **Passo 0**: Detecta se `.claude/.anti-vibe-manifest.json` existe
  - Se existe: chama lógica de update
  - Se não existe: faz instalação inicial
- **Passo 5**: Cria manifest local após instalação
- **Resumo final**: Mostra que manifest foi criado e como atualizar no futuro

#### CLAUDE.md
- Adicionada seção "Versionamento e Atualizações"
- Adicionadas skills Init e Update na tabela

#### README.md
- Seção "Setup do Projeto-Alvo" expandida
- Adicionada "Instalação Inicial" e "Atualizações Incrementais"
- Adicionada seção "Versionamento" com exemplo de manifest

### 📊 Estatísticas

- **Total de arquivos rastreados**: 39
  - CLAUDE.md: merge
  - senior-principles.md: replace
  - 8 rules: merge
  - 17 skills: replace
  - 10 agents: replace
  - 2 hooks: replace
  - 1 hooks.json: replace

### 🎯 Impacto para Usuários

#### Primeira Instalação
Nenhuma mudança no fluxo. Continua usando `/anti-vibe-coding:init`.

#### Atualizações
Agora quando rodar `/anti-vibe-coding:init` em projeto existente:
1. Detecta automaticamente que já tem o plugin instalado
2. Mostra lista de arquivos desatualizados
3. Detecta se você modificou algum arquivo
4. Permite escolher o que atualizar
5. Cria backup automático
6. Aplica merge inteligente (preserva suas modificações)

#### Exemplo Prático
```bash
# Antes (v3.5.0)
$ /anti-vibe-coding:init
# Sobrescrevia tudo, perdia modificações

# Agora (v4.0.0)
$ /anti-vibe-coding:init
## Atualizações Disponíveis
Plugin: v3.5.0 → v4.0.0

✓ CLAUDE.md (modificado por você)
  → Merge: preserva suas seções + adiciona novas do plugin

✓ senior-principles.md (novo arquivo)
  → Criar

Escolha: [1] Atualizar tudo [2] Escolher [3] Ver diff
```

### 🔧 Breaking Changes

Nenhum. Sistema é retrocompatível.

Projetos sem `.anti-vibe-manifest.json` são tratados como primeira instalação.

### 📝 Notas de Migração

#### Para projetos existentes (v3.x → v4.0.0)

Ao rodar `/anti-vibe-coding:init`:
1. Sistema detectará que não há manifest local
2. Fará instalação inicial (merge do CLAUDE.md)
3. Criará manifest local
4. Próximas execuções serão incrementais

**Nenhuma ação manual necessária.**

---

## [3.5.0] - 2026-03-XX

### Adicionado
- Skill `infrastructure` com princípios de DNS, hosting, deploy, CDN, serverless
- Agent `infrastructure-auditor` para auditoria de infra
- Rule `infrastructure-patterns.md`

### Modificado
- CLAUDE.md: adicionada tabela de infrastructure skill

---

## [3.0.0] - 2026-03-XX

### Adicionado
- 60+ princípios técnicos extraídos de referências
- Arquivo `senior-principles.md`
- 9 skills técnicas: security, architecture, api-design, design-patterns, react-patterns, system-design
- 8 agents especializados: security-auditor, database-analyzer, api-auditor, solid-auditor, code-smell-detector, react-auditor
- 8 rules: typescript, testing, api, security, database, infrastructure, solid, code-quality

---

## [2.0.0] - 2026-02-XX

### Adicionado
- Skill `consultant` (Modo Consultor)
- Skill `tdd-workflow` (7 passos)
- Skill `lessons-learned` com filtro de qualidade sênior
- Skill `decision-registry`
- Skill `anti-vibe-review`
- Hook `user-prompt-gate.cjs` (classificador)
- Hook `tdd-gate.cjs` (bloqueia código sem testes)
- Agent `tdd-verifier`
- Agent `documentation-writer`
- Agent `lesson-evaluator`

---

## [1.0.0] - 2026-01-XX

### Adicionado
- Estrutura inicial do plugin
- CLAUDE.md base
- Hooks básicos
