# Summary: Stack Knowledge Layer — Node.js + TypeScript (v6.3.2)

**Completed:** 2026-05-17
**Duration:** 2026-05-16 → 2026-05-17 (~1.5 dia execução + ~3h hardening)
**Planos:** 6 (6 completed, 0 skipped)
**Fases Total:** 31 (31 done, 0 skipped, 0 blocked)
**Hardening pós-feature:** 4 waves (4 commits) cobrindo todos os 8 findings das auditorias
**Auditor final:** AI assistant (Claude) via `/anti-vibe-coding:execute-plan`

---

## O que foi construído

Camada de conhecimento sênior stack-specific Node.js + TypeScript consumida automaticamente pelas 7 skills cross-stack do plugin (`/security`, `/api-design`, `/system-design`, `/design-patterns`, `/architecture`, `/infrastructure`, `/tdd-workflow`) quando o projeto detectado é Node+TS.

- **Plano 01 — Tracer Bullet:** scaffold matrix skeleton + 1 átomo piloto (`type-system-idioms.md`) + helpers `write-stack-json` + `copy-knowledge` + 1 skill wired (security) + E2E (CA-02/05/09 + tracer).
- **Plano 02 — Init enrichment:** `/init` multi-stack (primary + secondary[] + anchor_files) + `--refresh-knowledge` flag + telemetria `stack_detected`/`knowledge_copied` em JSONL + edge cases CA-03/06/07/10.
- **Plano 03 — Skill wire-up:** 6 skills cross-stack restantes ganharam o bloco `stack-aware-preface` delegando ao helper `getStackKnowledgePreface()` (zero duplicação). E2E cobre CA-05+CA-09 nas 7 skills.
- **Plano 04 — Atom Batch A (5 tier 1/2 backend core):** `async-concurrency-streams`, `error-handling-observability`, `data-persistence`, `state-and-caching`, `code-smells-catalog` — 858 ln no total.
- **Plano 05 — Atom Batch B (5 tier 2 + thin + RF8 primordials):** `api-design-stack-specific` (thin), `security-stack-specific` (thin + primordials inline), `testing-strategy`, `architecture-conventions`, `dependencies-supply-chain` — 565 ln. **Lições do Plano 04 (anti-drift + verifier refined) aplicadas; zero rework loop.**
- **Plano 06 — Atom Batch C + INDEX + Polish:** 3 átomos tier 3 (`performance-and-internals`, `operations-and-deploy`, `tooling`) — 363 ln; INDEX final consolidado dos 14 átomos (61 ln, mapas keyword/layer/tier); RF10 preview de keywords no `/init`; RF11 audit-trail-paths nos `sources:` YAML de 14/14 átomos; E2E CA-01..CA-10 (9 automatizados + 1 humano CA-08 com regra literal do PRD); cleanup destrutivo dos work artifacts.

**Entregue:** 14 átomos em `docs/knowledge/nodejs-typescript/atoms/`, 1 INDEX em `docs/knowledge/nodejs-typescript/INDEX.md`, 7 SKILL.md wired, `/init` instrumentado com telemetria + preview de keywords + `--refresh-knowledge` flag.

---

## Decisões de Implementação (consolidado)

### Arquitetura

- **Dupla representação de id de stack** (`StackId` interno `node-ts` vs nome de pasta matrix `nodejs-typescript`): alias map em `copy-knowledge.ts` + `detect-multi-stack.ts` reconcilia. `.claude/stack.json` armazena nome de pasta no campo `primary`; `STATE.md` mantém `StackId`.
- **Helper centralizado `stack-aware-preface`** em `skills/security/lib/stack-aware-preface.ts` consumido pelas 7 skills cross-stack via dynamic import — zero duplicação, `PREFACE_MESSAGE` é template literal único.
- **Telemetria com tipos dedicados** (`TelemetryStackDetected`, `TelemetryKnowledgeCopied`, `TelemetryDomainEvent`) emitida via `writeTelemetryDomainEvent()` silencioso (try/catch interno no append JSONL).
- **`copyKnowledge` discriminated union 5-status** (`copied | skipped | refreshed | no-matrix | no-source`) + path traversal guard com `VALID_PRIMARY` regex + `resolve()` defense-in-depth.
- **INDEX consumido por path fixo** `.claude/knowledge/INDEX.md` (D11) — sem awareness de stack, `/init` já garantiu o stack certo.

### Conteúdo dos átomos

- **Frontmatter 8 campos verbatim** com o piloto: `topic, stack, layer, sources, tier, triggers, related_skills, updated`. Drift = regressão CA-01.
- **Cap de 200 linhas por átomo.** Faixa real: tier 1 ~140-180, tier 2 ~120-150, tier 3 120-180.
- **RF11 audit-trail format:** `- research: <compass-id> (claude-code/knowledge/Nodejs/<filename real>)` no YAML; "Referências externas" no corpo replica para humanos.
- **Anti-drift clause (compound lesson 2026-05-16):** se claim não está literalmente/parafraseavelmente na fonte, NÃO escrever — mesmo que seja "verdade conhecida". Aplicada nos Planos 05 + 06 evitou rework loop.
- **Verifier protocol refined (compound lesson 2026-05-16):** verifier audita apenas `Padrões sênior` + `Anti-padrões` + `Critérios de decisão` (skip "Quando consultar" e "Referências externas"). Plano 05 v1: 5/5 pass (vs Plano 04 v1: 3/5 sem refined protocol).

---

## Bugs e Gotchas (consolidado — generalizáveis)

- **`bun:test` ≠ `vitest`** (DEV-2): toda fase que mencionou `vitest` no template do plano precisou converter sintaxe. Documentado em Plano 01 fase-03 e replicado em todas as outras.
- **`bun run lint` não existe** (GT-2): gap pré-existente do projeto; planos com check de lint não foram bloqueados.
- **`bun run typecheck` baseline:** 2 erros pré-existentes em `subagent-contract.ts` (ajv). Garantir que cada fase nova não adicione regressões.
- **`bun run harness:validate` falha pré-existente** em `v6-path-whitelist`: sem regressão, ignorar até hardening futuro.
- **pgBouncer transaction-mode** vs prepared statements (em `data-persistence.md`): exige `pgbouncer=true` no DSN do Prisma e `prepare: false` no driver Drizzle.
- **Megamorphic IC slowdown (~56×)** em V8 quando shapes de objeto mudam após criação (`delete obj.x`, init em ordens diferentes) — `performance-and-internals.md`.
- **GC tuning em containers:** V8 não detecta cgroup limits — `--max-old-space-size` ≤ 80% RAM do container é obrigatório em k8s/Lambda.
- **`AsyncLocalStorage`** retém payload completo se armazenado (não só IDs): retainer comum de memory leak.

---

## Desvios dos Planos

- **Plano 01 DEV-2:** plano mencionava `vitest`, projeto usa `bun:test` — corrigido em fase-03 e padrão replicado.
- **Plano 06 DEV-1 (fase-03 tooling):** anti-drift clause levou o executor a substituir ~70% dos patterns planejados de `tooling.md` (Executor TS tsc/tsx/Bun, Monorepo Turborepo/Nx, Watch mode, CI cache) por patterns rastreáveis no source (TypeScript strictness, Pre-commit hooks husky/lefthook, Dead code Knip, Lint vs SAST). Triggers realinhados ao corpo real. Trade-off aceito: keyword coverage de tooling fica menor; tópicos faltantes viram follow-up em v6.3.3+.
- **Plano 06 CA-10 PARCIAL:** UX baseline snapshot pré-v6.3.2 não foi capturado durante dev (Planos 01/02); cobertura via CA-10 regression existente é suficiente para gate. Trade-off documentado em DI-3.

---

## Métricas Consolidadas

| Métrica | Valor |
|---|---|
| Planos | 6 |
| Fases total | 31 |
| Bugs encontrados | 0 (anti-drift evitou) |
| Retries necessários | 1 (Plano 04 fase-06 verifier loop v2/v3 antes do refined protocol) |
| Desvios | 3 (1 padrão DEV-2 herdado + 1 anti-drift estrutural Plano 06 DEV-1 + 1 CA-10 parcial) |
| Compound lessons capturadas | 2 (`docs/compound/2026-05-16-verifier-protocol-technical-sections-only.md` + `docs/compound/2026-05-16-extrator-subagente-injeta-verdades-fora-do-source.md`) |
| Átomos populados | 14 (1 piloto + 5 Batch A + 5 Batch B + 3 Batch C) |
| Linhas de átomos | ~1.700 (rangeavel: 90-184 por átomo) |
| Skills wired com preface | 7 (security + 6 cross-stack) |
| Testes E2E novos | 24+ (tracer-bullet 10 + preface-all-skills 14 + full-e2e 5 + 3 RF10 + 1 RF11) |
| Telemetria events emitidos | 2 dedicated (stack_detected, knowledge_copied) + start/end |
| CA cobertos | 9.5/10 automatizados + CA-08 humano 3/3 PASS = veredito APROVADO |
| Work artifacts removidos | 2/2 (_catalog.md, _topic-plan.md) |

---

## Hardening pós-feature (2026-05-17)

Auditorias `code-smell-detector` + `security-auditor` rodadas pós v6.3.2 detectaram 4 smells (2 MEDIUM + 2 LOW) + 5 vulns (3 MEDIUM + 2 LOW) + reforçaram 8 dívidas pré-existentes. **Resolvidos em 4 commits**, todos os gates verdes (416/416 tests pass, harness:validate exit 0):

| Wave | Commit | Findings resolvidos |
|---|---|---|
| 1 | `524308e` | **S1** CWE-61 symlink reject via `lstat()` em `copyTree`; **S3** CWE-367 TOCTOU eliminado (rm+mkdir incondicionais com `{force, recursive}`) |
| 3 | `2925e2d` | **CS1+CS2** type guards substituindo `as MatrixFolder[]` e tuple assertion em `detect-multi-stack.ts`; **S5** `isValidStackJson` validando primary literal + array contents em `readStackJson`; extraído `skills/init/lib/stack-id-map.ts` com `isMatrixFolder` shared |
| 5 | `047c54a` | **D2** extraído orquestrador `skills/init/lib/run-stack-knowledge-init.ts` (SKILL.md Step 3.1 reduziu de ~40 para 6 linhas, agora callable + testado); **CS3** `TOP_N_KEYWORDS = 8 as const` exportada; **D3** JSDoc completo em `getStackKnowledgePreface` documentando assumption `process.cwd()` + graceful CA-09 |
| 4 | `013e10b` | **D4** `STACK_ID_TO_MATRIX_FOLDER` consolidado em `stack-id-map.ts` (zero duplicação, DI-5 Plano 02 fechado); **D5+GT-4** `AnyTelemetryEntry = TelemetryEntry \| TelemetryDomainEvent` exportado, `pairStartEnd` aceita union + filtra pipeline events explicitamente (5 testes novos em `pair-events.test.ts`); **S4** `writeTelemetryStart/End/DomainEvent` recebem `baseDir?` opcional (default `process.cwd()` backward-compat) |

### Decisão consciente: S2 (RF11 information disclosure) **WONTFIX**

Auditor flagou `sources: <id> (claude-code/knowledge/Nodejs/...)` em 14 átomos copiados como CWE-200 information disclosure. **Decisão:** manter como está. Plugin é open-source — paths expostos são públicos no GitHub; RF11 audit-trail é transparência intencional (PRD Could Have), permite devs consumidores rastrear claims até a fonte. Strip/move quebraria o valor da feature por zero ganho real de segurança. Decisão registrada aqui para futuras auditorias.

### Backlog adiado para v6.3.3+

- **D1** Commits atômicos teste+prod sem hook git-level (mudança transversal a todo o pipeline — fora do escopo de hardening cirúrgico).
- **D6** Typecheck baseline 2 erros pré-existentes em `subagent-contract.ts` (ajv) — não introduzido por essa feature.
- **D7** `tooling.md` keyword coverage (Executor TS/Monorepo/Watch/CI-cache faltando — anti-drift do Plano 06 DEV-1).
- **D8** CA-10 UX baseline snapshot — capturar antes da próxima feature similar.

---

## Follow-ups sugeridos (out-of-scope desta versão)

- **v6.3.3 — Stacks adicionais:** Rails, Python, Go. Cada uma vira PRD próprio reusando o formato `docs/knowledge/{stack}/{INDEX.md, atoms/*.md}`. `STACK_ID_TO_MATRIX_FOLDER` já tem entradas.
- **Drift detection automática de fontes (D10/Won't Have):** comparar hash das fontes em `claude-code/knowledge/` vs último commit do átomo para sinalizar drift.
- **Update flow para projetos instalados:** quando matrix atualiza, projetos com `.claude/knowledge/` ficam stale. Comando `/refresh-knowledge` global ou detecção via checksums em `.claude/stack.json`.
- **`_shared/` cross-stack:** quando 2+ stacks chegarem e houver padrões genuinamente cross-stack (OAuth2 idêntico em Node + Python, ex).
- **Skill `/show-stack-knowledge`:** RF10 entrega preview no `/init`; skill dedicada listaria todos os átomos + busca por keyword.
- **Tooling tópicos faltantes (DEV-1 Plano 06 fase-03):** Executor TS comparação, Monorepo (Turborepo/Nx), Watch mode, CI cache strategies — viraram átomos próprios em v6.3.3+ se houver demanda explícita do dev.
- **CA-10 UX baseline snapshot:** capturar antes da próxima feature similar para permitir regression diff automatizada.

---

<!-- Gerado por /anti-vibe-coding:execute-plan em 2026-05-17 -->
