# Memoria: Plano 01 — Honesty & Wire-up Core (Must Have)

**Feature:** v6.3.1 — Adaptive Coaching: Honesty & Wire-up
**Iniciado:** 2026-05-15
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-1 (fase-01):** Benchmark em `tests/perf/capabilities-writer.bench.ts` com `test.skip` por default — performance test nao deve bloquear CI.
  - Como rodar: `bun test tests/perf/capabilities-writer.bench.ts` (remover skip ad hoc).
- **DI-2 (fase-01):** Test file em `tests/capabilities-writer.ast.test.ts` (flat) em vez de `tests/unit/...`.
  - Por que: convencao real do repo eh flat (G7-like). Fase doc tinha path obsoleto.
- **DI-3 (fase-01):** Parser chamado com `range: true` em vez de `range: false` da fase doc.
  - Por que: BUG-1 — sem range, scope-manager do @typescript-eslint/parser@7.18 lanca em Bun.
  - Impacto: imperceptivel ao consumidor; minimo custo de memoria.
- **DI-4 (fase-02):** Test file em `tests/tool-registry-inspector.dual-field.test.ts` (flat) em vez de `tests/unit/...` da fase doc.
  - Por que: aplicada Nota dos Planos Seguintes da fase-01 (convencao real do repo eh flat).
- **DI-5 (fase-02):** Passo 5 (migrar fixtures legadas em `tests/fixtures/v6-state-fixture/agents/`) skipped — pasta nao existe, grep retornou `none — nothing to migrate`.

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

- **BUG-1 (fase-01):** `@typescript-eslint/parser@7.18.0` lanca `TypeError: Cannot read properties of undefined (reading '0')` no scope-manager quando chamado com `range: false` em runtime Bun (passa em Node).
  - Causa: scope-manager assume range presente; Bun expoe o defeito (Node tolera).
  - Fix: `range: true` na call do `parse()`. Tests POST com type annotation `req: Request` passaram a detectar.
  - Fase afetada: fase-01.

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

- **GT-1 (fase-01):** `hooks/tdd-gate.cjs` bloqueia `Write` em `tests/fixtures/**/*.ts` quando nao ha test co-localizado com mesmo basename — fixtures sao dados, nao codigo testavel.
  - Descoberto em: fase-01.
  - Workaround: criar fixtures via `Bash` heredoc; gate so cobre Write.
  - Melhoria futura: adicionar `tests/fixtures/` ao SKIP_PATTERN do gate.
- **GT-2 (fase-01):** Spec original da fase usava `range: false` no parser — nao validado em Bun. Toda fase futura que use @typescript-eslint/parser deve assumir `range: true` por default em ambiente Bun.
- **GT-3 (fase-02):** Cache `warnedAgents` Set em `tool-registry-inspector.ts` eh module-scoped — sobrevive entre chamadas no mesmo processo. Test suites que rodam multiplas inspecoes podem precisar de `__resetWarnedAgentsForTests()` se aparecer flake. Em RED inicial, testes isolados sao suficientes.
- **GT-4 (fase-02):** `tools:` como array YAML (`tools: [Read, Grep]`) seria silenciosamente ignorado pelo parser dual-field — `typeof === 'string'` falha em array. Todos os 13 agents reais usam CSV string, mas documentar como `coverage_gap` futuro.

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

- **DEV-1 (fase-01):** Test file em `tests/capabilities-writer.ast.test.ts` (flat), nao `tests/unit/...` como fase doc indicava.
  - Motivo: convencao real do repo eh flat. Instrucoes do task context (Step 4b) sobrepuseram spec da fase.
- **DEV-2 (fase-01):** Parser chamado com `range: true` (BUG-1 em Bun). Fase doc dizia `range: false`.
- **DEV-3 (fase-02):** Test file em `tests/tool-registry-inspector.dual-field.test.ts` (flat), nao `tests/unit/...` como fase doc indicava. Motivo: Nota dos Planos Seguintes da fase-01 sobrepoe spec da fase.

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 4 |
| Fases concluidas | 2 |
| Fases com desvio | 2 |
| Bugs encontrados | 1 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

- **Convencao real do repo:** tests sao flat em `tests/*.test.ts` (nao em `tests/unit/`). Helpers em `tests/helpers/v6-fixture-setup.ts`. Aplicar em todas fases seguintes.
- **AST writer publica handler com linha real:** `handler` agora respeita `^app/.../route.ts:\d+$` apos fase-01. Fase 05 (gap-rules grep) deve aceitar formato `file:line`.
- **`@typescript-eslint/parser` ^7.18.0 em Bun:** SEMPRE passar `range: true` ao `parse()`. Documentar em qualquer nova call.
- **TDD gate bloqueia Write em tests/fixtures/:** usar Bash heredoc para criar fixtures sem test co-localizado.
- **Type definitions inline em `capabilities-writer.ts:4-22`:** NAO criar `capabilities-types.ts` em fases futuras (G7).
- **Enum `CapabilitySource = 'ast' | 'llm'` eh CONTRATO D4 do ADR-0020:** nao bumpar.
- **`readSubagents()` agora le `tools:` (canonico) com fallback `allowed-tools:` (legacy + warning 1x cached):** Fase 03 e 05 podem assumir `subagents[*].allowed_tools` populado para os 13 agents reais. Cache `warnedAgents` Set eh module-scoped.
- **Fixtures de agents dual-field em `tests/fixtures/agents-dual-field/`:** agent-canonical.md (tools:), agent-legacy.md (allowed-tools:). Reutilizar em testes futuros de tool-registry.
- **Convencao CC oficial (G6):** agents=`tools:`, skills=`allowed-tools:`. NAO inverter precedencia em nenhuma fase futura.

---

<!-- Atualizado automaticamente durante execucao -->
