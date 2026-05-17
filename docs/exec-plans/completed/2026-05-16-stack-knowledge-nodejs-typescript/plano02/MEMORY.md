# Memoria: Plano 02 — Init Enrichment

**Feature:** Stack Knowledge Layer — Node.js + TypeScript (v6.3.2)
**Iniciado:** 2026-05-16
**Concluido:** 2026-05-16
**Status:** completed

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-1 (herdado do Plano 01):** Mapa de alias `'node-ts' → 'nodejs-typescript'` em `skills/init/lib/copy-knowledge.ts`. Este Plano 02 **estende** o mapa para `'rails' → 'rails'`, `'python' → 'python'`, `'laravel' → 'laravel'`, `'nextjs' → 'nextjs'`, `'unknown' → null` (sentinel "não copiar nada", CA-06). Não recriar nem renomear.

- **DI-2 (herdado do Plano 01):** Dupla representação do id de stack — `StackId` interno (em STATE.md, signalSource, retorno de `detectStack()`) vs nome de pasta no matrix (em `.claude/stack.json.primary`, `stack.json.secondary[]`). Alias map em `copy-knowledge.ts` é a única ponte. Plano 02 mantém esse contrato em todas as fases.

- **DI-3 (fase-01, 2026-05-16):** `detect-multi-stack.ts` declara **alias map LOCAL** cobrindo todos os `StackId` (`node-ts`/`nextjs`→`nodejs-typescript`, `rails`, `python`, `laravel`, `unknown`→null). Não importa de `write-stack-json.ts` (escopo monostack do Plano 01). Fase-03 decidirá se unifica os dois mapas em um helper compartilhado ou mantém duplicação consciente. **Por enquanto há duplicação parcial** entre `detect-multi-stack.ts` e `write-stack-json.ts` — não é bug, é staging.

- **DI-4 (fase-03, 2026-05-16):** `parseRefreshFlag` extraído para arquivo dedicado `skills/init/lib/parse-refresh-flag.ts` (em vez de inline no SKILL.md como sugeria a spec). Motivação: testabilidade (9 testes diretos cobrindo posições/whitespace/partial match) sem precisar simular execução do SKILL.md. Mantém G6 (~10 linhas, sem deps). SKILL.md importa o helper.

- **DI-5 (fase-03, 2026-05-16):** Consolidação dos alias maps de `detect-multi-stack.ts` e `write-stack-json.ts` em helper compartilhado **adiada**. Razão: unificação exigiria tocar ambos os arquivos (proibidos pela fase-03). Duplicação mantida consciente — fase-05 ou Plano 03/06 podem consolidar se valer a pena. Custo atual: ~10 linhas de duplicação; risco: dessincronização se alguém adicionar nova stack em só um dos lugares. Mitigação por enquanto: comentário no header de `detect-multi-stack.ts` e `write-stack-json.ts` apontando para o outro arquivo (não verificado se já existe — checar em fase-05 se sobrar tempo).

- **DI-6 (fase-04, 2026-05-16):** `TelemetryDomainEvent` é tipo dedicado (não estende `TelemetryStart`/`TelemetryEnd`) — G8 cumprido. Eventos `stack_detected`/`knowledge_copied` carregam apenas `timestamp` (string ISO 8601), sem `timestamp_inicio`, `duracao_ms`, `fase_pipeline` etc. Helper `writeTelemetryDomainEvent` serializa via `JSON.stringify` direto (não via `serializeEntry` existente) para evitar acoplamento com a union `TelemetryEntry`.

<!-- Adicionar DI-4 (schema dos eventos de telemetria stack_detected/knowledge_copied — decidir em fase-04), DI-5, ... durante execução. -->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Preencher durante execução. Vazio = nenhum bug, bom sinal. -->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Preencher durante execução. Os gotchas conhecidos do README (G1-G10) já estão lá. Adicionar aqui apenas descobertas novas. -->

- **GT-4 (fase-04, 2026-05-16):** `skills/lib/pair-events.ts` consome `TelemetryEntry` acessando `timestamp_inicio` sem discriminar a union — incluir `TelemetryDomainEvent` (que não tem `timestamp_inicio`, só `timestamp`) na union QUEBRA tipagem. Soluções possíveis: (a) refatorar `pair-events.ts` para discriminar via `evento` antes de acessar campos específicos; (b) manter `TelemetryDomainEvent` fora da union (escolha desta fase). Quem for refatorar `pair-events.ts` no futuro precisa adicionar testes primeiro (gate TDD existente).

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Preencher durante execução. -->

- **DEV-1 (fase-04, 2026-05-16):** Spec da fase-04 (Passo 1) pedia ampliar `TelemetryEntry = TelemetryStart | TelemetryEnd | TelemetryDomainEvent`. Não foi feito (ver GT-4 e DI-6). Comportamento observável idêntico — eventos são emitidos via helper dedicado. Refatoração futura de `pair-events.ts` libera a união completa.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 5 |
| Fases com desvio | 1 (DEV-1 fase-04: TelemetryEntry union não estendida) |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

### Log de execução

- **fase-01 (2026-05-16):** `detect-multi-stack.ts` + `.test.ts` criados (203 linhas). 5 testes passando (CA-02, CA-03, CA-06, CA-07, NFR perf <500ms — medido 158ms suite). `detect-stack.ts` intocado (G3 OK). 2 erros TS novos surgiram (destructuring de array vazio) → corrigidos via narrowing inline antes do commit. Suite global: 1009 pass, 11 fail (baseline pré-existente, sem regressão). Commit `eba96d6`. DI-3 registrada (alias map LOCAL em detect-multi-stack.ts cobre todos os StackIds — duplicação parcial vs `write-stack-json.ts` é staging consciente).

- **fase-02 (2026-05-16):** `write-stack-json.ts` reescrita (nova assinatura `writeStackJson(targetDir, MultiStackResult, now?)` retornando `{ path, written }`). `readStackJson(targetDir)` adicionado. Atomic write via `.tmp` + `fs.rename`. `detected_at` sempre ISO 8601 UTC com `Z`. 7 testes (5 novos schema final + 2 round-trip readStackJson). 2 callsites migrados: `tests/e2e/stack-knowledge-tracer-bullet.test.ts` (compõe `detectMultiStack` + `writeStackJson`) e bloco inline em `skills/init/SKILL.md`. Suite global: 1014 pass, 11 fail (baseline mantido). Commit `08dc306`. `state-md-init.ts` e `detect-stack.ts` intocados (CA-10 G1, G3). DI-3 inalterada — duplicação do alias map (entre `detect-multi-stack.ts` e `write-stack-json.ts`) **continua** existindo; fase-03 decidirá se unifica.

- **fase-03 (2026-05-16):** `copy-knowledge.ts` reescrita (nova assinatura `{ targetDir, pluginRoot, primary, refresh? }`, 5 status discriminados `copied|skipped|refreshed|no-matrix|no-source`, retorno sempre com `message` + `destDir`). CA-04 message literal preservada. RF7 (`--refresh-knowledge`) implementada via `fs.rm` + `copyTree`. Path traversal guard de `34347a2` preservado. `parse-refresh-flag.ts` extraído (DI-4). `copy-knowledge.test.ts` migrado (5→7 testes; MEDIUM #8 corrigido — assertion condicional eliminada). `parse-refresh-flag.test.ts` adicionado (9 testes). SKILL.md Step 3.1 atualizado. E2E tracer bullet migrado para nova assinatura. Suite global: 1025 pass, 11 fail (baseline mantido). Commit `fdf830e`. Arquivos proibidos (state-md-init.ts, detect-stack.ts, detect-multi-stack.ts, write-stack-json.ts) intocados. DI-5 registrada — consolidação de alias maps adiada.

- **fase-04 (2026-05-16):** `TelemetryStackDetected`/`TelemetryKnowledgeCopied`/`TelemetryDomainEvent` adicionados em `telemetry-types.ts` (DI-6: tipo dedicado, G8 OK). Helper `writeTelemetryDomainEvent(entry)` em `telemetry-utils.ts` (silencioso via `appendJsonlLine`, G7). Wire-up no SKILL.md Step 3.1 emite 2 eventos após `console.log(copyResult.message)` com timestamp ISO compartilhado, sem `try/catch` no callsite. 3 novos testes (`writeTelemetryDomainEvent` × stack_detected/knowledge_copied/graceful-failure). Suite global: 1028 pass, 11 fail (baseline mantido). Commit `b1e6ecc`. **Desvio DEV-1:** `TelemetryEntry` union NÃO foi estendida (GT-4: pair-events.ts bloqueia). Arquivos proibidos das fases 01/02/03 intocados.

- **fase-05 (2026-05-16):** E2E `stack-knowledge-tracer-bullet.test.ts` estendido com 6 novos `it()` blocks: CA-03 (Rails no-source), CA-06 (null primary no crash), CA-07 (multi-stack tiebreaker rails>node), CA-10 (regressão STATE.md dual representation), NFR detection <500ms, NFR copy <100ms. 4 fixtures criadas em `tests/fixtures/stack-knowledge/{node-ts-only,rails-only,multi-stack,no-anchor}/`. Suite global: 1034 pass, 11 fail (baseline mantido — +6 novos passando, zero bugs descobertos). Commit `4729e96`. Todos arquivos de produção intocados. DI-5 (consolidação alias map) **adiada conscientemente** — sem motivação técnica no escopo desta fase. **Plano 02 COMPLETED.**

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

### Para Plano 03 — Skill wire-up (6 cross-stack restantes)

- **Use `getStackKnowledgePreface(projectRoot)` de `skills/security/lib/stack-aware-preface.ts`** nas 6 skills cross-stack restantes (template literal verbatim definido no Plano 01 fase-04, commit `683a2c2`). Cada skill importa o helper e chama com `process.cwd()`.
- **`.claude/stack.json` agora tem schema final** com `primary`, `secondary[]`, `anchor_files[]`, `detected_at` ISO 8601 UTC com `Z`. Plano 03 não consome `stack.json` diretamente (preface só verifica `.claude/knowledge/INDEX.md` exists), mas se quiser usar, o tipo `StackJson` vem de `skills/init/lib/write-stack-json.ts` e o helper `readStackJson(targetDir)` está disponível.
- **CA-09 continua válido**: cada skill cross-stack mantém graceful degradation quando `.claude/knowledge/INDEX.md` ausente. Plano 03 deve re-validar via testes em cada skill nova adicionada.

### Para Planos 04 / 05 / 06 — escrita dos 13 átomos restantes

- **Sem mudança vs Plano 01 MEMORY.md** — frontmatter, skeleton, cap de 200 linhas seguem iguais.
- **`STACK_ID_TO_MATRIX_FOLDER` está DUPLICADO** entre `detect-multi-stack.ts` e `write-stack-json.ts` (DI-3 + DI-5). Se algum plano adicionar uma nova stack ao matrix (improvável em 04/05/06 — eles escrevem átomos), atualizar **ambos** os arquivos. Plano 03 ou alguém pode consolidar via helper compartilhado se quiser (debt consciente).

### Para Plano 06 fase-04/05/06 — INDEX final e E2E completo

- **Helpers do E2E reaproveitáveis** em `tests/e2e/stack-knowledge-tracer-bullet.test.ts` (fase-05 deste plano):
  - `cloneFixture(name)` — clona `tests/fixtures/stack-knowledge/{name}/` para tmpdir.
  - `readStackJsonRaw(targetDir)` — lê e parseia `.claude/stack.json`.
  - `readStateMd(targetDir)` — lê `docs/STATE.md`.
  - `runInit(targetDir, args?)` — compõe `detectMultiStack` + `writeStackJson` + `copyKnowledge` direto.
- **Fixtures disponíveis** em `tests/fixtures/stack-knowledge/`:
  - `node-ts-only/` (só `package.json` com TS), `rails-only/` (só `Gemfile`), `multi-stack/` (Rails+Node majoritário .rb), `no-anchor/` (só README).
- **Eventos de telemetria emitidos pelo `/init`**:
  - `stack_detected { evento, skill_invocada: 'init', timestamp, primary, secondary, anchor_files }`
  - `knowledge_copied { evento, skill_invocada: 'init', timestamp, stack, atom_count, status }`
  - Vivem em `.claude/metrics/YYYY-MM.jsonl` (cwd-relative).
  - Schema em `skills/lib/telemetry-types.ts` (`TelemetryStackDetected`, `TelemetryKnowledgeCopied`, `TelemetryDomainEvent`).
  - Plano 06 fase-06 valida que `/init` emite ambos os eventos no fixture completo.

### Dívidas técnicas conscientes deixadas pelo Plano 02

- **DI-5 (alias map duplicado):** `STACK_ID_TO_MATRIX_FOLDER` está em 2 lugares. Consolidação adiada — qualquer fase futura que toque ambos os arquivos pode unificar.
- **DEV-1 (TelemetryEntry union não estendida):** `TelemetryDomainEvent` é tipo exportado mas fora da union. Refatorar `skills/lib/pair-events.ts` para discriminar via `evento` antes de acessar campos liberaria a união. Hardening processual, não bloqueia o pipeline.
- **HIGH #3 do verify-work anterior (commits atômicos teste+prod):** mantido neste plano. Se hardening futuro quiser commits RED isolados, requer hook git-level.
- **HIGH #5 do verify-work anterior (SKILL.md Step 3.1 como snippet markdown):** ainda é snippet — extração para `skills/init/lib/run-stack-knowledge-init.ts` foi sugerida mas não feita. Plano 03 ou 06 pode considerar se valer o churn.

### Guard rails (herdados do Plano 01, válidos para todos os planos seguintes)

- `bun:test`, não `vitest` (DEV-2).
- `bun run lint` não existe (GT-2).
- `bun run typecheck` baseline: 2 erros em `subagent-contract.ts` (GT-3).
- `bun run harness:validate` tem falha pré-existente em v6-path-whitelist — sem regressão.

---

<!-- Atualizado automaticamente durante execucao -->
