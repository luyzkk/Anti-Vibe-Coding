# Changelog

Todas as mudanças notáveis do plugin Anti-Vibe Coding serão documentadas aqui.


## [6.4.0] - 2026-05-17

> **Minor release — Refatoração Rails-style do `/anti-vibe-coding:init`**
> SKILL.md reduzido de 1215 para 86 linhas via cutover big-bang para arquitetura
> manifest + dispatcher. 17 steps modularizados em `skills/init/lib/steps/`,
> rationale extraído para arquivo dedicado, snippets Akita externalizados, suite
> E2E prova byte-idempotência greenfield + legacy v5 + 4 edge cases (CA-03/06/07/08).
> Comportamento externo do `/init` preservado byte-a-byte — zero breaking change
> para projetos consumidores.

### Added

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

- **14 átomos sênior Node+TS** em [docs/knowledge/nodejs-typescript/atoms/](docs/knowledge/nodejs-typescript/atoms/) — `async-concurrency-streams`, `type-system-idioms`, `error-handling-observability`, `state-and-caching`, `data-persistence`, `api-design-stack-specific`, `testing-strategy`, `security-stack-specific` (inclui primordials RF8), `code-smells-catalog`, `architecture-conventions`, `dependencies-supply-chain`, `performance-and-internals`, `operations-and-deploy`, `tooling`. Cada átomo: 5 seções (Quando consultar / Padrões sênior / Anti-padrões / Critérios de decisão / Referências externas), cap 200 ln, frontmatter 8 campos verbatim, audit-trail-paths nos `sources:` (RF11).
- **INDEX final consolidado** em [docs/knowledge/nodejs-typescript/INDEX.md](docs/knowledge/nodejs-typescript/INDEX.md) — 61 ln, mapas Por keyword / Por layer / Por tier / Como consultar.
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
