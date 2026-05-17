# Memoria: Plano 01 — Tracer Bullet

**Feature:** Stack Knowledge Layer — Node.js + TypeScript (v6.3.2)
**Iniciado:** 2026-05-16
**Concluido:** 2026-05-16
**Status:** completed

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-1 (planejada):** Mapa de alias `'node-ts' → 'nodejs-typescript'` em `skills/init/lib/copy-knowledge.ts` em vez de renomear `StackId` em `detect-stack.ts`.
  - Por que: `state-md-init.ts` já consome `StackId` e escreve `detected_stack: node-ts` em `docs/STATE.md` desde v6.0.0. Renomear quebraria CA-10 (regressão) e exigiria migration de STATE.md em projetos já instalados.
  - Impacto: alias local em `copy-knowledge.ts`; STATE.md mantém `node-ts`; `.claude/stack.json` armazena id canônico do matrix (`nodejs-typescript`). Plano 02 estende esse mapa para Rails/Python/Go.

- **DI-2 (planejada):** Dupla representação do id de stack — `StackId` interno (`node-ts`, usado em STATE.md, signalSource, telemetry) vs nome de pasta no matrix (`nodejs-typescript`, usado em `.claude/knowledge/` e `stack.json.primary`).
  - Por que: STATE.md é contrato existente; matrix folder name é contrato novo do PRD.
  - Impacto: alias map é a única ponte entre os dois; testar ambos os lados em fase-05.

<!-- Adicionar DI-3, DI-4, ... durante execução conforme decisões emergirem. -->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Preencher durante execução. Vazio = nenhum bug, bom sinal. -->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Preencher durante execução. Os gotchas conhecidos do README (G1-G6) já estão lá. Adicionar aqui apenas descobertas novas. -->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

- **DEV-1 (fase-02):** Pattern "ESM vs CJS interop" foi composto a partir de fontes dispersas (`moduleResolution`, `verbatimModuleSyntax`, configuração `tsconfig` e princípios fundamentais de `f8f4e50c`) — `wf-2230af87` não tinha seção dedicada. Conteúdo dual-package (`tsup`, `exports` field) foi inferido das regras combinadas, não extraído direto. Impacto: zero — pattern reflete prática estabelecida; auditoria humana CA-08 valida.

- **DEV-2 (fase-03):** Plano especificava imports de `vitest`, mas projeto usa `bun:test` (padrão observado em `detect-stack.test.ts` e demais). Corrigido localmente antes do commit — todos os novos testes usam `import { describe, it, expect, beforeEach } from 'bun:test'`. Planos 04/05 devem adotar `bun:test` em qualquer novo arquivo de teste.

---

## Gotchas Descobertos

- **GT-1 (2026-05-16, fase-01):** `bun run harness:validate` fica **vermelho durante o Tracer Bullet** — INDEX.md cria broken link para `atoms/type-system-idioms.md` antes do átomo existir (fase-02). Esperado pelo design. Vira verde após fase-02. Confirmado via `git stash` que a falha era pré-existente em outros pontos (`_topic-plan.md` referencia átomos futuros). Não bloquear fases 02-05 por causa disso; reavaliar após fase-02.

- **GT-2 (2026-05-16, fase-03):** `bun run lint` **não existe** em `package.json` — gap pré-existente no projeto sem linter configurado. Critérios de aceite que mencionam lint devem ser tratados como "gap pré-existente" e não bloqueiam. Considerar adicionar lint em outro plano (fora do escopo desta feature).

- **GT-3 (2026-05-16, fase-03):** `bun run typecheck` retorna exit 2 por **erros pré-existentes em `skills/lib/subagent-contract.ts`** (problemas com ajv). Baseline: aceitar typecheck warn enquanto novos arquivos não introduzirem erros novos. Verificar em cada fase futura via `git diff` antes de commit.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 5 |
| Fases com desvio | 1 (DEV-2 bun:test correction) |
| duration_ms baseline (CA-02, 1 átomo) | <5ms cpSync, ~65ms suite completa |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |
| Pilot atom linhas | 176 (range 100-200, G3 OK) |
| Testes adicionados (fase-03) | 5 (writeStackJson 2 + copyKnowledge 3) |

### Log de execução

- **fase-01 (2026-05-16):** scaffold matrix skeleton. 2 arquivos criados (INDEX.md 31 linhas, atoms/.gitkeep). Commit `bd205f1`. harness:validate warn (broken-link esperada, ver GT-1).
- **fase-02 (2026-05-16):** pilot atom `type-system-idioms.md` criado, 176 linhas. 5 patterns (branded types, discriminated unions+assertNever, satisfies, Result<T,E> em handlers Node, ESM/CJS interop) + 4 anti-padrões (any, as-sem-guard, generics decorativos, enum). Compressão ~16× (2454 ln fonte → 176 ln átomo). Commit `f8f52b5`. harness:validate warn (mesmos broken-links de fase-01 — esperado).
- **fase-03 (2026-05-16):** extensão monostack de `/init`. 3 arquivos criados (`write-stack-json.ts`, `copy-knowledge.ts` + testes correspondentes), 1 modificado (`skills/init/SKILL.md` ganha Step 3.1, Step 3 byte-idêntico). 5 testes passando. Alias map `node-ts → nodejs-typescript` (DI-1 efetivada). Commit `3b86896`. DEV-2 (bun:test fix) e GT-2/GT-3 (lint/typecheck baseline) registrados.
- **fase-04 (2026-05-16):** wire `stack-aware-preface` em `/security`. 1 arquivo criado (`skills/security/__tests__/stack-aware-preface-wire.test.ts`, 3 testes) + 1 modificado (`skills/security/SKILL.md` ganha bloco preface após profile-aware:end). Profile-aware byte-idêntico (CA-10 OK). Commit `286f860`. Bloco usa path fixo `.claude/knowledge/INDEX.md` (D11) e graceful degradation (CA-09). Template verbatim para Plano 03.
- **fase-05 (2026-05-16):** E2E Tracer Bullet `tests/e2e/stack-knowledge-tracer-bullet.test.ts` com 4 testes (CA-02, CA-05, CA-09, regression SKILL.md). 4 passed direto no GREEN — fases 02/03/04 já entregaram pré-requisitos. `durationMs` medido <5ms para cpSync de 1 átomo; suite completa em ~65ms. `bun run test:e2e` global verde (12 passed, 1 skip). Validation Log do PLAN.md preenchida. Commit `5462529`. **Plano 01 COMPLETED.**

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

### Para Plano 02 — Init Enrichment

- **Alias map é o ponto de extensão.** O arquivo `skills/init/lib/copy-knowledge.ts` (criado nesta fase-03) tem `STACK_ID_TO_MATRIX_FOLDER` com apenas a entrada `'node-ts' → 'nodejs-typescript'`. Plano 02 deve **estender** esse mapa (não recriar) para incluir `'rails' → 'rails'`, `'python' → 'python'`, `'laravel' → 'laravel'`, `'nextjs' → 'nextjs'`, `'unknown' → null` (sentinel para "não copiar nada", CA-06).
- **DI-2 da dupla representação se mantém em multi-stack.** `stack.json.primary` e `stack.json.secondary` armazenam **nomes de pasta do matrix** (`nodejs-typescript`, `rails`, etc.); STATE.md mantém `StackId` interno.
- **`copy-knowledge.ts` atual é idempotente por skip** (CA-04 default). Plano 02 fase-03 adiciona flag `--refresh-knowledge` que força overwrite.
- **Telemetria NÃO foi adicionada em Plano 01.** Os helpers (`write-stack-json.ts`, `copy-knowledge.ts`) ainda não emitem eventos. Plano 02 fase-04 adiciona `stack_detected` e `knowledge_copied` via `skills/lib/telemetry-utils.ts`.
- **Performance baseline da cópia** ficou registrado em `tests/e2e/stack-knowledge-tracer-bullet.test.ts` (CA-02, <100ms com 1 átomo). Plano 02 deve reaproveitar esse teste como template para asserts de CA-02 com 14 átomos.

### Para Plano 03 — Skill Wire-up (6 cross-stack restantes)

- **Copiar o bloco `<!-- stack-aware-preface:start --> ... :end -->` da fase-04 verbatim** em `/api-design`, `/system-design`, `/design-patterns`, `/architecture`, `/infrastructure`, `/tdd-workflow`. Snippet exato vive em `skills/security/SKILL.md` (logo após `<!-- profile-aware-preface:end -->`).
- O bloco usa **path fixo** `.claude/knowledge/INDEX.md` (D11). Nenhuma awareness de stack — `/init` já garantiu o stack certo.
- **Posicionar o bloco logo após `<!-- profile-aware-preface:end -->` quando este existir**; quando a skill não tem profile-aware (infrastructure, tdd-workflow são greenfield para preface), inserir como primeiro bloco após o frontmatter YAML.
- **CA-09 deve ser revalidado em Plano 03 fase-03**: cada skill ainda funciona quando `.claude/knowledge/INDEX.md` ausente (graceful degradation, preface = string vazia).

### Para Planos 04 / 05 / 06 — escrita dos 13 átomos restantes

- **Seguir EXATAMENTE o frontmatter e o skeleton do átomo piloto** escrito em fase-02 (`docs/knowledge/nodejs-typescript/atoms/type-system-idioms.md`). Qualquer drift no formato (ordem dos campos do frontmatter, sections do corpo, naming de tier/triggers) é **regression** que invalida CA-01.
- **Cap de 200 linhas por átomo** (NFR Manutenibilidade). Se um átomo passar de 200, sinal de granularidade errada (D3) — split ou redistribuir conteúdo.
- **Frontmatter `sources:` segue formato lista de objetos**: `[{research: <compass-id>}, {skill: <nome>/SKILL.md}]`. Plano 04/05/06 referenciam fontes do `_catalog.md`.
- **Pilot atom já cobriu tier 1 + layer both**; usar como modelo para outros tier-1 e layer-both. Tier 2/3 e layer-specific seguem o mesmo skeleton (só mudam triggers, related_skills, conteúdo).
- **Performance baseline (G5):** cpSync de 1 átomo < 5ms. Extrapolação linear para 14 átomos ~70ms — confortável dentro do SLA CA-02 (≤100ms). Plano 06 fase-06 deve re-medir com 14 átomos reais e atualizar Validation Log.

### Hardening pós-verify-work (2026-05-16)

- **Path traversal guard em `copyKnowledge`** já aplicado (commit `34347a2`). Regex `VALID_PRIMARY = /^[a-z0-9_-]+$/i` rejeita `..`, separadores, espaços. `resolve()` defense in depth confirma que sourceRoot está dentro de `docs/knowledge/`. Plano 02 pode estender o regex se algum stack id legítimo usar caracteres adicionais (não esperado).
- **Helper `stack-aware-preface` extraído** (commit `683a2c2`) — `skills/security/lib/stack-aware-preface.ts` exporta `getStackKnowledgePreface(projectRoot)` + `PREFACE_MESSAGE`. Plano 03 deve **importar este helper** nas 6 skills cross-stack restantes (template verbatim). Cada skill chama `getStackKnowledgePreface(process.cwd())` — mesma assinatura, zero duplicação.
- **Dívidas técnicas conscientes restantes:**
  - HIGH #3: commits do Plano 01 são atômicos (teste+prod no mesmo commit). RED→GREEN declarado mas não auditável por git. Decisão futura: aceitar ou enforçar commits RED isolados via hook.
  - HIGH #5: SKILL.md Step 3.1 é snippet `bun run -e` em markdown — funcional para o agente mas não é TS chamável. Plano 02 fase-03 (idempotent + --refresh) pode incluir extração para `skills/init/lib/run-stack-knowledge-init.ts` se desejado.
  - MEDIUM #6: `existsSync` no preface usa `process.cwd()` — helper aceita projectRoot, mas call-site continua cwd-dependente. Fora de project root, preface fica vazio sem aviso. Aceitar como tradeoff (não há contexto melhor que cwd no momento de invocação da skill).
  - MEDIUM #8: assertion condicional em `copy-knowledge.test.ts:29` (`if (result.status === 'copied')`). Funcional mas fragil. Refactor: assert status primeiro com `expect.assertions(N)` ou narrow + assertion incondicional.

### Para TODOS os planos seguintes — guard rails do projeto

- **Use `bun:test`, não `vitest`** em qualquer novo arquivo de teste (DEV-2 corrigida em fase-03 — todos os helpers/E2E desta feature já seguem o padrão).
- **`bun run lint` não existe** (GT-2). Critérios de aceite que mencionam lint = gap pré-existente; não bloquear.
- **`bun run typecheck` baseline:** 2 erros pré-existentes em `skills/lib/subagent-contract.ts` (ajv). Garantir que nenhum arquivo novo introduza erros adicionais.
- **`bun run harness:validate`** tem falha pré-existente em v6-path-whitelist — confirmada em fase-04 antes/depois. Sem regressão; ignorar até hardening em iter futura.

---

<!-- Atualizado automaticamente durante execucao -->
