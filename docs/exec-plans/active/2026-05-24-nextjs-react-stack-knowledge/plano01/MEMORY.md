# Memoria: Plano 01 — Infra + Detector + Tracer Bullet

**Feature:** Next.js + React Stack Knowledge
**Iniciado:** 2026-05-24
**Status:** in-progress (fase-00 concluida 2026-05-24)

---

## Decisoes de Implementacao

Decisoes tomadas durante execucao que nao estavam no PRD ou plano.
Formato: o que foi decidido + por que + impacto.

- **DI-Plano01-fase00-zero-categoria-B:** Audit catalogou 19 hits em 11 arquivos — TODOS classificados A (probe-only / dado mock) ou C (fixture Node-TS puro, mapping `node-ts→nodejs-typescript` que NAO muda em fase-04). ZERO casos categoria B encontrados.
  - Por que: nenhum teste existente usa fixture com `next` em deps esperando primary `'nodejs-typescript'`. O PRD estimou ~9 casos B mas a path `nextjs→nodejs-typescript` nao e exercitada na suite atual.
  - Impacto: fase-04 pode aplicar mapping change (`nextjs→nextjs`) ATOMICAMENTE sem regredir nenhum teste existente. Suite verde garantida no estado intermediario tambem.
  - Notas para fase-04: (a) `detect-multi-stack.ts` tambem usa `'nodejs-typescript'` como chave em `SOURCE_EXT_BY_MATRIX` — quando fase-04 adicionar `'nextjs'`, atualizar em paralelo. (b) Os testes NOVOS de fase-04 (probeReact, precedencia, pickStaticMap('react')) serao os primeiros a exercitar a path `nextjs→nextjs`.

- **DI-Plano01-fase00-lint-script-ausente:** `bun run lint` falhou — script `lint` nao existe em `package.json`. Alternativa: `bun run typecheck` retorna erros pre-existentes (GT-01 documentado no MEMORY global: `lazy-import.test.ts` + `subagent-contract.ts`).
  - Por que: nao ha pipeline de lint configurado neste repo (provavel uso de typecheck como gate).
  - Impacto: fases futuras devem usar `bun run typecheck` (ou similar) em vez de `bun run lint`. Documentar em README/CLAUDE.md eventualmente.

- **DI-Plano01-fase00-falhas-preexistentes-confirmadas:** `tests/harness-validate-v6-path-whitelist.test.ts` (6 falhas) e `tests/fixtures/generate-compound-fixture.test.ts` (5 falhas) confirmadas via git log como pre-existentes (commits `2de5886` e `aecb0f1`). `bun test` global ainda retorna EXIT=0 via runner.
  - Impacto: fases subsequentes nao devem culpar a feature pelas 11 falhas; tratar como GT herdado.

<!-- Exemplo:
- **DI-Plano01-fase00-localizacao-NOTICES:** decidiu-se commitar `THIRD-PARTY-NOTICES.md` na raiz do plugin (em vez de `knowledge/nextjs/THIRD-PARTY-NOTICES.md`)
  - Por que: padrão tipo kernel/Apache — NOTICES único centralizado é convenção mais comum
  - Impacto: futuras stacks (Phoenix? Go?) que reusem material licenciado herdam o mesmo arquivo (uma fonte de verdade)
-->

---

## Bugs Descobertos

Bugs encontrados durante implementacao e como foram resolvidos.
Formato: sintoma + causa raiz + fix aplicado.

<!-- Exemplo:
- **BUG-Plano01-fase04-pickStaticMap-react:** detector retorna `'react'` mas `stackAwareInputPaths` retorna mapa vazio
  - Causa: `pickStaticMap` não tem case `'react'` (esquecido em fase-04)
  - Fix: adicionar `case 'react': return NEXTJS_CANDIDATES` no switch
  - Fase afetada: fase-04
-->

---

## Gotchas

Armadilhas descobertas que planos futuros ou outros devs devem saber.
Apenas gotchas que NAO eram obvios antes de implementar.

<!-- Exemplo:
- **GT-Plano01-fase04-probeReact-react-em-deps:** `probeReact` precisa CONFIRMAR `react` em deps antes de retornar — vite.config sozinho dá falso-positivo (vue-vite, svelte-vite)
  - Descoberto em: fase-04 unit test
  - Impacto: Plano 02/03 fixtures Vite devem ter `react` em `package.json` ou probe não bate
-->

---

## Desvios do Plano

O que mudou em relacao ao que estava planejado e por que.
Se nada mudou, manter vazio (bom sinal).

<!-- Exemplo:
- **DEV-Plano01-fase03-piloto-200-linhas:** piloto entregue inicialmente com 215 linhas
  - Motivo: extrator achou que seção "Anti-patterns" precisava de 4 entries; verifier rejeitou
  - Fix: cortar 1 anti-pattern menos crítico para TODO.md backlog; piloto re-entregue com 198 linhas
  - Aprovado pelo dev em sessao
-->

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 6 |
| Fases concluidas | 1 (fase-00) |
| Fases com desvio | 0 |
| Bugs encontrados | 0 |
| Retries necessarios | 0 |
| Arquivos catalogados em fase-00 (audit) | 11 arquivos, 19 ocorrencias (estimativa PRD ~9 superada) |
| Categoria A / B / C em fase-00 | 9 A / 0 B / 5 C |
| Linhas do piloto (≤200 hard cap) | — |
| Verifier refined taxa rastreabilidade | — (meta ≥80%) |

---

## Notas para Planos Seguintes

Informacoes que o proximo plano PRECISA saber antes de comecar.
O subagente do proximo plano le este campo.

<!-- Exemplo de notas que ENTRARÃO aqui ao final do Plano 01:
- `knowledge/nextjs/INDEX.md` criado em EN (D15/D16) com cabeçalho `# Next.js + React Knowledge — Index` — Plano 02/03 escrevem atoms no mesmo idioma
- `knowledge/nextjs/atoms/app-router-and-layouts.md` extraído com anti-drift clause (≤200 linhas, ≥80% rastreabilidade) — Plano 02 NÃO destila novamente
- `STACK_ID_TO_MATRIX_FOLDER['nextjs']` agora retorna `'nextjs'` (não mais `'nodejs-typescript'`); StackId ganhou `'react'` → matriz compartilhada
- `pickStaticMap('react')` retorna `NEXTJS_CANDIDATES` — fixtures Vite (se Plano 02/03 criar) recebem mesmos paths Next
- Anti-drift clause + verifier refined protocol VALIDADOS no piloto — Plano 02/03 reusam o bloco verbatim em todos os prompts de extratores
- Fixture `tests/fixtures/nextjs-app-router-fixture/` disponível como molde para `nextjs-supabase-fixture/` em Plano 03 fase-05
- Backward compat (D9): projetos Next previamente inicializados precisam rodar `/init --refresh-knowledge` — documentar no CHANGELOG da feature
-->

---

<!-- Atualizado automaticamente durante execucao -->
