# Memoria: Plano 04 — MH-4 Discovery `(stack-id + doc-canonico) -> paths` expandido

**Feature:** populate-plan-andre-port
**Iniciado:** 2026-05-19
**Status:** em andamento

**Bloqueadores ja resolvidos:** Plano 01 (lista canonica completa, `EXCLUDED_FROM_POPULATION_V2`
reduzido, `CanonicalDoc` estendido com `docs/PRODUCT_SENSE.md` + `README.md`,
`tests/e2e/populate-plan-parity.test.ts` com 2 asserts MH-1 ativos). Plano 04 roda em paralelo
com Plano 02 e Plano 03 — arquivos disjuntos.

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

<!-- Exemplo:
- **DI-Plano04-fase01-fixture-stubs:** arquivos minimos adicionados a
  `tests/fixtures/stack-aware/nextjs-supabase/`:
    - `src/app/layout.tsx` (vazio)
    - `src/middleware.ts` (vazio)
    - `supabase/migrations/20260519000000_init.sql` (vazio)
    - `supabase/functions/hello/index.ts` (vazio)
    - `src/lib/supabase/server.ts` (vazio)
  - Por que: CA-02 mecanico exige `>= 3` paths com `exists: true` em ARCHITECTURE/SECURITY/RELIABILITY.
    Sem stubs, `fs.access` falha e CA-02 nao bate.
  - Impacto: fixture cresce ~5 arquivos vazios. Documentar no `tests/fixtures/stack-aware/README.md`
    se virar pasta significativa.

- **DI-Plano04-fase02-no-vendor-paths:** entries de Rails NAO incluem `vendor/bundle/`,
  `tmp/`, `log/`. Sao paths runtime, nao scaffold.
  - Por que: PRD MH-4 explicito — "sem inventar paths, apenas scaffold padrao".
  - Impacto: cobertura de Rails fica mais magra que Next.js, mas estavel.

- **DI-Plano04-fase03-empty-fixture-reuse:** parity test CA-05 reusa
  `tests/fixtures/stack-aware/empty/` ao inves de criar novo.
  - Por que: ja existe e tem zero arquivos (perfeito para "stack nao detectado").
  - Impacto: se alguem adicionar arquivos ao empty, CA-05 quebra. Adicionar `.gitkeep` +
    nota em README para preservar.
-->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **Gotcha-Plano04-mergeCandidates-ordem:** quando `mergeCandidates(base, extra)` deduplica,
  a ordem dos paths no array final segue insertion order do Set. Se base tem `[a, b]` e
  extra tem `[b, a]`, resultado e `[a, b]` (base preservada). Esse comportamento e usado
  pelo renderer para listar paths em ordem previsivel.
  - Como deveria ser feito: nao mudar ordem de candidatos em entries existentes — apenas
    appendar novos.
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

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

<!-- A preencher conforme execucao. Exemplos do que registrar aqui:
- Lista exata de stubs adicionados a `tests/fixtures/stack-aware/nextjs-supabase/`. Plano 05
  fase-01 reusa o mesmo fixture para golden snapshot — precisa saber quais arquivos esperar.
- Quais `CanonicalDoc` ficaram sem entry em algum stack (ex: `docs/STATE.md` em Rails — sem
  paths obvios). Plano 05 fase-02 (SH-2) pode preencher seguindo mesmo padrao para Laravel/Python.
- Decisao final sobre `pickStaticMap` (switch vs hash map). Se virou hash map, Plano 05
  fase-02 segue. Se ficou switch, Plano 05 fase-02 estende com 2 cases novos.
- Numero final de asserts em `tests/e2e/populate-plan-parity.test.ts`:
  - Standalone (so Plano 01 + Plano 04): 4 (2 MH-1 + 2 CA-02/CA-05).
  - Com Plano 02 e 03 merged: 8 (2 MH-1 + 2 CA-03 + 2 CA-06 + 2 CA-02/CA-05).
- Path do helper que valida "stack nao detectado — fase emite nota explicita". Se criado em
  fase-03, Plano 05 fase-01 reusa.
-->

---

<!-- Atualizado automaticamente durante execucao -->
