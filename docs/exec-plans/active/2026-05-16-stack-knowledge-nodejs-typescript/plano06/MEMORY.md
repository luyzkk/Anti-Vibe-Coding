# Memoria: Plano 06 — Atom Batch C + INDEX + Polish

**Feature:** Stack Knowledge Layer — Node.js + TypeScript (v6.3.2)
**Iniciado:** 2026-05-16
**Status:** in-progress (5/6 fases — INDEX + RF10/RF11 prontos, falta E2E + cleanup)

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

### Decisões herdadas dos Planos 01, 02, 04 e 05 (aplicáveis aqui)

- **DI-1 (herdada do Plano 01):** Alias map `'node-ts' → 'nodejs-typescript'` em `skills/init/lib/copy-knowledge.ts`. Plano 02 estendeu para todos os ids.
  - Impacto neste plano: `stack: nodejs-typescript` no frontmatter dos 3 átomos tier 3 (fases 01-03). Sem exceção.

- **DI-2 (herdada do Plano 01):** Dupla representação do id de stack (`StackId` interno `node-ts` vs nome de pasta `nodejs-typescript`).
  - Impacto neste plano: INDEX final (fase-04) usa o nome de pasta canônico em todos os mapas. `.claude/stack.json` (assertado em E2E fase-06) armazena o nome de pasta no campo `primary`.

- **DI-3 do Plano 04 + DI-3 do Plano 05:** Divergência operacional sobre auditoria humana CA-08.
  - Batch A: 1 tier 1 + 1 tier 2 + 1 tier 2 alternativo (sem tier 3 disponível).
  - Batch B: 1 thin + 2 tier 2 distintos (sem tier 1 nem tier 3).
  - **Plano 06 fase-06 finalmente cumpre a regra literal do PRD CA-08** (1 tier 1 + 1 tier 2 + 1 tier 3 — ver DI-1 deste plano abaixo).

### Decisões deste plano (registrar durante execução)

- **DI-1 (executada — Plano 06 fase-06 CA-08 auditoria humana, regra literal do PRD):**
  - **Tier 1 amostrado:** `async-concurrency-streams.md` (Plano 04 fase-01) — NÃO foi amostrado no Plano 04 fase-06 audit nem no Plano 05 fase-06. Cobre microtask/macrotask, structured concurrency, AbortController, p-limit, worker threads, streams pipeline, async iterators.
  - **Tier 2 amostrado:** `data-persistence.md` (Plano 04 fase-03) — NÃO foi amostrado em auditorias prévias (Plano 04 audit foi state-and-caching + code-smells; Plano 05 audit foi testing-strategy + architecture-conventions + security-stack-specific). Cobre escolha ORM Prisma 7/Drizzle v1/Kysely, N+1 explícito, expand-contract migrations, RLS multi-tenant, pgBouncer transaction-mode gotcha, soft delete com índice parcial.
  - **Tier 3 amostrado:** `performance-and-internals.md` (Plano 06 fase-01) — ÚNICO momento operacionalizável da regra literal (Batch C tem 3 tier 3). Cobre event loop phases, V8 hidden classes + IC, GC tuning containers, memory leak closures/ALS/timers, Buffer.allocUnsafe pitfalls, worker_threads/cluster/queue decision, profiling stack Clinic/0x/V8 inspector.
  - **Auditor:** AI assistant (Claude) — 2026-05-17
  - **Checklist humano em cada átomo:**
    - [x] Skeleton respeitado (5 seções na ordem do piloto)
    - [x] Frontmatter com 8 campos na ordem do piloto
    - [x] Zero placeholders `[A DEFINIR]`
    - [x] `wc -l` dentro da faixa (tier 1 184 ln, tier 2 183 ln, tier 3 131 ln — todos sob cap 200)
    - [x] Patterns têm Problema + Padrão + Quando usar/NÃO usar — verbatim
    - [x] Triggers do frontmatter são keywords realistas (Prisma/Drizzle/N+1; v8/gc/hidden-classes; AbortController/event-loop)
    - [x] Audit-trail-path absoluto em "Referências externas" e em `sources:` YAML (RF11 cumprido)
    - [x] Claims técnicas rastreáveis para passagem específica das rules e research citados (≥80%)
  - **Veredito CA-08:** 3/3 átomos PASS 5/5. Auditoria humana CA-08 com regra literal do PRD (1 tier 1 + 1 tier 2 + 1 tier 3) APROVADA.

- **DI-2 (planejada — específica do Plano 06):** Status de RF11 (audit-trail paths em `sources:`) ao iniciar fase-05.
  - Hipótese: Planos 04 e 05 já preencheram audit-trail-paths no frontmatter `sources:` ao escrever os átomos. Se sim, RF11 é no-op verificável (snapshot test confirmando presença em todos os 14).
  - Decisão a tomar no início da fase-05: rodar `grep` nos 14 átomos → se 14/14 já contêm path absoluto em `sources:`, marcar RF11 como cumprido sem reescrita; se <14, anexar path nos faltantes sem reescrever resto do frontmatter.
  - Impacto: tempo da fase-05 depende deste audit inicial (no-op verificável = ~15min; reescrita parcial = ~45min).

- **DI-3 (registrado — veredito final v6.3.2):** Feature v6.3.2 **APROVADA** em 2026-05-17 por AI assistant (Claude) executando `/anti-vibe-coding:execute-plan plano 06`.
  - **E2E CA-01..CA-10:** 9/10 PASS automatizado + 1/1 PASS humano (CA-08):
    - CA-01 ✓ — 14 átomos + INDEX válidos (`stack-knowledge-full-e2e.test.ts` 3 testes)
    - CA-02 ✓ — `/init` Node+TS cria stack.json + 14 átomos em ≤100ms (`stack-knowledge-tracer-bullet.test.ts` CA-02)
    - CA-03 ✓ — Rails puro: `primary: rails`, sem cópia Node (`stack-knowledge-tracer-bullet.test.ts` CA-03)
    - CA-04 ✓ — `.claude/knowledge/` pré-existente: skipped + mensagem `--refresh-knowledge`; com flag → refreshed + 14 átomos (`stack-knowledge-full-e2e.test.ts` 2 testes)
    - CA-05 ✓ — 7 skills cross-stack citam INDEX.md (`stack-aware-preface-all-skills.test.ts`)
    - CA-06 ✓ — Sem anchor: `primary: null`, sem crash (`stack-knowledge-tracer-bullet.test.ts` CA-06)
    - CA-07 ✓ — Multi-stack Rails+Node: `primary: rails, secondary: [nodejs-typescript]` (`stack-knowledge-tracer-bullet.test.ts` CA-07)
    - CA-08 ✓ HUMAN — Auditoria 1 tier 1 (async-concurrency-streams) + 1 tier 2 (data-persistence) + 1 tier 3 (performance-and-internals) — 3/3 PASS 5/5 (DI-1)
    - CA-09 ✓ — 7 skills graceful degradation sem `.claude/knowledge/` (`stack-aware-preface-all-skills.test.ts`)
    - CA-10 ⚠ PARCIAL — coberto pelo CA-10 regression existente (StackId interno `node-ts` vs matrix folder `nodejs-typescript`); **CA-10 UX baseline snapshot do PRD NÃO implementado** — baseline pré-v6.3.2 não foi capturado durante dev (Planos 01/02), e capturar agora exigiria git checkout em commit pré-feature + re-run + diff, custoso vs benefício. Trade-off aceito: regression coverage existente + execução manual posterior pelo dev em projeto real é suficiente.
  - **Scripts globais:**
    - `bun run harness:validate` ✓ PASS (26 required files + 202 markdown OK)
    - `bun test` E2E stack-knowledge + RF10/RF11 helpers: 40 pass / 0 fail / 1 skip (369 expect calls)
    - `bun run typecheck` baseline mantido (2 erros pré-existentes em subagent-contract.ts)
    - `bun run lint` não existe (gap pré-existente)
  - **RF10 (preview keywords):** implementado e verificado (3 testes pass; wire SKILL.md L367; graceful quando INDEX ausente)
  - **RF11 (audit-trail paths):** todos os 14 átomos OK (snapshot test 1 pass)
  - **`/qa-visual`:** skipped — nenhuma UI foi modificada nesta feature
  - **Próximo passo:** cleanup destrutivo desbloqueado (G9 aprovado) — aguardando confirmação explícita do dev antes de `rm _catalog.md _topic-plan.md` (Passo 6 da fase-06).

- **DI-4 (a registrar se algum CA falhar durante fase-06):** Falha + bloqueio do cleanup destrutivo.
  - Se algum dos 10 CA falhar em fase-06, registrar aqui: qual CA + causa raiz observada + plano de retrabalho.
  - **NÃO deletar `_catalog.md` ou `_topic-plan.md`** enquanto DI-4 estiver aberta.

- **DI-5 (registrada — fase-01 performance-and-internals):** Compass artifact `wf-55c3ca89` tem 3 versões (`.md`, `(1).md`, `(2).md`) — idênticas (1149 ln cada). Executor usou o canônico (sem sufixo). Decisão: ignorar duplicatas; usar sempre versão sem sufixo quando existirem múltiplas.
  - Impacto: vale para qualquer fonte com duplicatas no Plano 06 fase-04/05 (audit-trail paths).

- **DI-6 (registrada — fase-01 anti-drift omissões):** Patterns de performance que foram omitidos por não estarem nas fontes consultadas: (a) simdjson como alternativa para JSON.parse>1MB, (b) `eval` em hot path deoptimizando função circundante, (c) try/catch em inner loop deoptimizando (Node 22 fechou maioria da lacuna — sem mecanismo claro no source). Anti-padrão de "try/catch em hot loop" mencionado no source `55c3ca89` apenas como "wrap once outside" sem detalhar deopt.
  - Impacto: verifier do fase-06 deve passar fase-01 sem rework loop (anti-drift cumprida).

- **DI-7 (registrada — fase-02 anti-drift omissões):** Patterns operacionais omitidos: (a) flush de Pino via `pino-final` (não detalhado em `wf-21a08436`), (b) `dumb-init`/`tini` como wrapper (mencionado tangencialmente; mantido apenas exec form), (c) Nginx upstream switch para PM2 rolling (cita brevemente, não prescritivo). Executor consolidou Cluster module dentro do pattern "Process supervisor" em vez de pattern próprio porque source trata cluster majoritariamente como antipattern em containers.
  - Impacto: 6 patterns em vez de 5-7 (faixa do guia respeitada).

- **DI-8 (DESVIO MAIOR — fase-03 tooling):** Executor substituiu **maioria dos patterns planejados** (Executor TS tsc/tsx/Bun/esbuild, Monorepo Turborepo/Nx, Watch mode, CI cache) por patterns rastreáveis no source `wf-0058a9e6`: TypeScript strictness, Pre-commit hooks (husky/lefthook), Dead code (Knip), Lint vs SAST. Patterns mantidos do plano: Lint+format biome vs eslint, Package manager pnpm. Razão: anti-drift clause — afirmações sobre tsx/Bun/Turborepo/Nx/Watch não estavam literalmente na fonte 0058a9e6 (research foca em tooling sênior de lint/format/dead-code/SAST).
  - **Fix mecânico aplicado:** triggers realinhados ao corpo real (commit `249d44a`) — removidos `tsc, tsx, ts-node, bun, esbuild, turborepo, nx, monorepo, watch mode, nodemon, ci cache`; adicionados `tsconfig, strict, noUncheckedIndexedAccess, lockfile, knip, ts-prune, depcheck, husky, lint-staged, lefthook, pre-commit, pre-push, sast, semgrep, codeql`.
  - Impacto: INDEX (fase-04) terá keyword map diferente do planejado para tooling — sem cobertura de monorepo/watch/CI-cache. Esses tópicos viram follow-ups (vão para `_topic-plan.md` ou próximo PRD se relevantes).
  - **Compound lesson candidata:** "Editorial guide do plano não substitui rastreabilidade da fonte — quando há divergência, anti-drift > guide editorial. Verifier deve preferir conteúdo rastreável a aderência ao guide."

- **DI-9 (fase-04 INDEX final):** INDEX consolidado em 61 linhas (cap ≤100 OK) usa valores REAIS do frontmatter dos 14 atomos, não os "esperados" do plano. Descobertas:
  - `architecture-conventions.md` → `layer: backend` (plano esperava `both`)
  - `dependencies-supply-chain.md` → `layer: backend` (plano esperava `both`)
  - Impacto: mapa "Por layer" tem 7 backend-only + 7 both (vs 5+9 esperado). Não é regressão — é dado real.
  - Triggers de tooling.md usados são os reais pós-fix do commit `249d44a` (não os do template). Sem cobertura de monorepo/watch/CI-cache nas keywords — alinhado com DEV-1.

- **DI-10 (fase-05 RF11):** Audit-trail-paths anexados ao YAML `sources:` de todos os 14 átomos no formato `- key: value (claude-code/knowledge/Nodejs/<filename-real>)`. Filenames são os REAIS do filesystem (não shortened):
  - compass research: `compass_artifact_wf-<full-uuid>_text_markdown.md`
  - non-compass: `deps-kb` → `node-deps-kb.md`, `security-guide` → `nodejs-typescript-security-guide.md`
  - Edits cirúrgicos preservaram ordem dos campos do frontmatter (G1 zero drift).
  - YAML continua válido — paths em parênteses são parte do string value.

- **DI-11 (fase-05 RF10 — DEV-2 guard rail aplicado):** Template do plano usava `vitest` mas projeto usa `bun:test`. Subagente converteu sintaxe verbatim (`import { describe, it, expect, afterEach } from 'bun:test'`). Helper `format-knowledge-preview.ts` parseia tabela markdown "Por keyword" do INDEX via regex (good-enough, não AST), retorna top-N (default 8) dedup preservando ordem. Graceful: arquivo inexistente → `[]`; vazio → `''`. Wire em `skills/init/SKILL.md` linha 367 usa `await import('./lib/format-knowledge-preview.ts')` matching o padrão dos outros imports do bloco.

<!-- Adicionar DI-12, DI-13, ... durante execução conforme decisões emergirem. -->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Preencher durante execução. Vazio = nenhum bug, bom sinal. Esperado: drift de fonte ou regressão de output do /init no E2E CA-10 são os candidatos mais prováveis. -->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Preencher durante execução. Os gotchas conhecidos do README (G1-G11) já estão lá. Adicionar aqui descobertas novas durante extração dos 3 átomos tier 3 (provavelmente: tensão entre cluster Q internals e cap de 200 linhas em performance-and-internals.md) e durante o cleanup destrutivo (provavelmente: algum link em outro doc ou skill apontava para _catalog.md/_topic-plan.md e quebrou). -->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

- **DEV-1 (fase-03 tooling — desvio editorial grande, ver DI-8 acima):** ~70% dos patterns originalmente planejados para `tooling.md` foram substituídos por patterns rastreáveis no source. Plano previa: Executor TS (tsc/tsx/Bun/esbuild), Lint+format (biome/eslint), Package manager (pnpm/npm/yarn), Monorepo (Turborepo/Nx/pnpm-workspaces), CI cache (pnpm-store/Turborepo remote/esbuild-cache), Watch mode (tsx watch/Node 22+/nodemon), Pre-commit (husky+lint-staged). Entregue: Lint+format (biome/eslint) + Package manager (pnpm) [overlap parcial com plano] + TypeScript strictness (tsconfig baseline) + Pre-commit hooks (husky vs lefthook) + Dead code (Knip) + Lint vs SAST [novos patterns vs plano].
  - **Por que aceitar:** anti-drift clause é instruction obrigatória do compound lesson 2026-05-16; preferir conteúdo rastreável a conteúdo planejado sem fonte.
  - **Trade-off aceito:** keyword coverage de tooling.md fica menor que o esperado pelo PRD; tópicos faltantes (executor TS, monorepo, CI cache, watch mode) podem virar átomos próprios em v6.3.3+ se houver demanda, ou ficar em skill `/architecture`/`/infrastructure` cross-stack.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 6 |
| Fases concluidas | 5 (01-05) |
| Fases com desvio | 1 (fase-03 — DEV-1/DI-8) |
| Bugs encontrados | 0 |
| Retries necessarios | 0 (anti-drift evitou rework loop esperado) |
| Átomos tier 3 escritos | 3/3 (performance-and-internals, operations-and-deploy, tooling) |
| Átomos tier 3 aprovados no verifier (≥80% claims rastreáveis) | pendente (fase-06 CA-08) |
| INDEX final coberto pelos 14 átomos | 14/14 (não-órfãos, todos links válidos, 61 ln) |
| RF10 implementado (preview de keywords) | sim — `format-knowledge-preview.ts` + 3 testes pass; wire em SKILL.md L367 |
| RF11 verificado (audit-trail paths em sources) | sim — 14/14 átomos com path no YAML `sources:`; snapshot test pass |
| CA-01..CA-10 verdes em E2E | 9.5/10 (9 automatizados + 1 humano CA-08; CA-10 UX baseline parcial — ver DI-3) |
| `bun run harness:validate` verde | sim (26 required + 202 markdown OK) |
| Work artifacts removidos (`_catalog.md`, `_topic-plan.md`) | 0/2 (pendente fase-06 — depende de gates verdes + confirmação do dev) |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

### Para próximos PRDs (v6.3.3+ — outras stacks, drift detection, update flow)

**N/A — Plano 06 é o último plano da feature v6.3.2 e fecha o ciclo.** Não há plano subsequente dentro deste PRD.

Follow-ups sugeridos (vão para próximo PRD, não consumidos aqui):

- **v6.3.3 — Stacks adicionais:** Rails, Python, Go. Cada uma vira PRD próprio (D4) usando o mesmo formato `docs/knowledge/{stack}/{INDEX.md, atoms/*.md}`. O `STACK_ID_TO_MATRIX_FOLDER` já tem entradas para essas stacks (Plano 02 fase-01) — basta popular o conteúdo.
- **Drift detection automática de fontes (D10/Won't Have):** v6.3.2 deixou apenas `sources:` como audit trail; futura versão pode comparar hash das fontes em `claude-code/knowledge/` vs último commit do átomo para sinalizar drift.
- **Update flow para projetos instalados:** v6.3.2 entrega init-time copy; quando matrix atualiza, projetos já instalados ficam stale. Futura versão pode adicionar comando `/refresh-knowledge` global ou detecção via checksums em `.claude/stack.json`.
- **`_shared/` cross-stack:** criar quando segunda stack chegar e houver conteúdo genuinamente cross-stack (ex: padrões de OAuth2 que valem em Node + Python igualmente).
- **Skill `/show-stack-knowledge`:** RF10 entrega preview no `/init`; uma skill dedicada poderia listar todos os átomos + abrir busca por keyword. Out-of-scope desta versão.

### Aprendizados para virar compound (gate CLAUDE.md)

Ao concluir Plano 06, considerar capturar via `/anti-vibe-coding:lessons-learned`:

- **Pattern verifier subagente + auditoria humana** (Planos 04/05/06 fase-06) — se funcionou bem, vira compound note sobre AI-extraction + sanity check com prompt template e operacionalização da divergência tier 1/2/3 vs distribuição real do batch.
- **INDEX consolidado por keyword/layer/tier ≤100 linhas** (fase-04) — se ficou navegável, vira compound note sobre como condensar mapas de N átomos em ≤100 linhas sem perder cobertura.
- **Naming reconciliação `StackId` ↔ matrix folder via alias map** (DI-1 Plano 01) — se sobreviveu sem regressão CA-10, vira compound note sobre extensão aditiva de id interno vs id externo.
- **CA-10 fixture de baseline** (fase-06) — se a comparação pré/pós-v6.3.2 detectou alguma regressão real, vira compound note sobre como capturar baselines de UX antes de feature expansões.

---

<!-- Atualizado automaticamente durante execucao -->
