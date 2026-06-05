# Memoria: Plano 03 — Cobertura (grill-me + consultant + retrospectivo)

**Feature:** workflow-awareness
**Iniciado:** 2026-05-29
**Status:** em andamento

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!--
DECISÕES JÁ ANTECIPADAS PELO PLANO (registrar/confirmar o valor final na execução):

- **DI-Plano03-fase02-detectStrongScaleSignal:** o MECANISMO do "sinal forte" (D5) é decisão de design
  desta fase — só o SINAL foi pré-decidido. Recomendação do plano: helper puro exportado
  `detectStrongScaleSignal(transcriptPath)` que varre a CAUDA do transcript (entradas desde a última
  mensagem `type:'user'`) e conta `tool_use` sequenciais com nome `Agent`/`Task`; retorna `true` só
  acima de um threshold conservador (proposta: >= 5). Fail-open: qualquer erro de parse/IO → `false`
  (sem sugestão). Registrar AQUI o threshold final e o mecanismo exato escolhidos na execução.

- **DI-Plano03-fase02-buildBlockOutput-opts:** assinatura nova `buildBlockOutput(kind, opts = {})` com
  `opts.strongScaleSignal` default `false`. Backward-compat: chamadas existentes sem 2º arg → menu SEM
  o bullet de workflow (testes linhas 83-88 continuam verdes). Confirmar que a forma do retorno
  (`{ decision:'block', reason }`) não mudou.

- **DI-Plano03-fase03-gate-file:** o gate é arquivo NOVO `tests/e2e/workflow-coverage-leak.test.ts`
  (bun:test). NÃO estende o `workflow-prose-leak.test.ts` do Plano 02 (planos rodam em paralelo, sem
  ownership cruzado) nem o `workflow-advisor-directive.test.ts` do Plano 01 (hook-scoped). Confirmar o
  nome final se divergir.
-->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- vazio ate a execucao -->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!--
- **GT-?:** se a varredura da cauda do transcript em detectStrongScaleSignal for cara em transcripts
  grandes, limitar a leitura às últimas N linhas (espelhar o padrão de extractLastUserMessage, que lê
  do fim para o começo). Documentar o limite escolhido.
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- vazio ate a execucao -->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 3 |
| Fases concluidas | 0 |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!--
- `stop-reflector.cjs` agora exporta `detectStrongScaleSignal` e `buildBlockOutput(kind, opts)` —
  documentar o threshold final aqui para quem for ajustar o anti-nag depois.
- Gate `tests/e2e/workflow-coverage-leak.test.ts` é o trava destas 3 superfícies; qualquer edição
  futura em grill-me/consultant/stop-reflector que mencione workflow deve manter os marcadores verdes.
-->

---

<!-- Atualizado automaticamente durante execucao -->
