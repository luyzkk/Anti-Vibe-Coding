# Memoria: Plano 02 — Deteccao legacy e migracao on-detect

**Feature:** Refatoracao da Estrutura de Pastas por PRD
**Iniciado:** {preencher ao comecar execucao}
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!-- Exemplo:
- **DI-1:** Usar arquivo temporario `.planning/.migration-log.json` em vez de buffer em memoria
  - Por que: se skill crashear no meio, log persiste e permite rollback na proxima invocacao
  - Impacto: precisa checar log orfao no Step 0 (detector) e oferecer resumir/limpar
-->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-1:** Heuristica detectava `.planning/_archive/plano01/` como legacy
  - Causa: glob nao filtrava _archive
  - Fix: adicionado `{ignore: '_archive/**'}` no glob
  - Fase afetada: fase-01
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo vazio — preencher durante execucao -->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo vazio — preencher durante execucao -->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 5 |
| Fases concluidas | 0 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!-- Plano 02 eh folha do grafo (nenhum plano depende dele). Secao fica vazia ou vira nota pos-mortem. -->

---

## Validacao CA-12 (fase-05)

**Data:** 2026-04-20
**Executado por:** subagente plan-executor (dogfooding bash)
**Fixtures usadas:** `.planning-test-ca12/fixture-a`, `fixture-b`, `fixture-c`

| Cenario | Resultado | Notas |
|---------|-----------|-------|
| 1. Detectar sem migrar (Fixture A) | PASS | Sinal A: PRD-auth.md encontrado; Sinal B: plano01/02/03 com fases; slug=auth; STATE nao modificado apos recusa |
| 2. Detectar e migrar (preserva STATE) | PASS | Phase:paused, Current Plan:02/03, log completo preservados apos mv para 2026-04-20-auth/ |
| 3. Fixture B flat v1 | PASS | Apenas sinal A presente (sem plano*/); PLAN.md com "Wave 2 — current" intacto apos migracao |
| 4. Fixture C ambiguous | PASS | Sinal A ausente, sinal B presente em plano01/; suggestedSlug:null; dev fornece "auth-exploratorio"; plano01 completo na nova pasta |
| 5. Cancelamento total | PASS | diff -r retornou vazio — nenhuma modificacao quando dev cancela antes de qualquer mv |
| 6. Rollback atomico | PASS | LIFO reverteu 4 moves bem-sucedidos; gotcha: bash mv faz nested em vez de falhar (ver abaixo); diff final vazio |

**Conclusao CA-12:** validated — todos 6 cenarios passaram

---

## Gotchas (descobertos na fase-05)

- **GOTCHA-1:** `mv dir/ existing-dir/` no bash/Windows faz **nested merge** em vez de retornar erro.
  O algoritmo real usa `fs.rename` (Node.js) que retorna `ENOTEMPTY` — comportamento correto para rollback.
  Impacto: simulacao bash do cenario 6 precisou de tratamento adicional para o diretorio nested.
  Planos futuros devem usar Node.js/TypeScript para testar rollback, nao bash puro.

- **GOTCHA-2:** STATE.md usa markdown bold (`**Phase:**`) — grep literal `phase:` falha silenciosamente.
  O detector/migrador deve buscar por padrao case-insensitive ou com bold markup se parsear STATE.

<!-- Atualizado automaticamente durante execucao -->
