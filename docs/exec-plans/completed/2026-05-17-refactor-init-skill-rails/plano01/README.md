# Plano 01: Foundation + Tracer Bullet

**Feature:** refactor-init-skill-rails ([PLAN overview](../PLAN.md))
**Fases:** 4
**Sizing total:** ~6h
**Depende de:** Nenhum (primeiro plano)
**Desbloqueia:** Plano 02 e Plano 03 (ambos consomem `Step`, dispatcher e padroes de AbortError/DI-06)

---

## O que este plano entrega

Infraestrutura compartilhada (interface `Step`, `AbortError`, dispatcher esqueleto, registry) provada
end-to-end com 1 step real (`detect-legacy`) portado byte-identico do bloco inline atual. O `SKILL.md`
permanece intocado — cutover acontece somente no Plano 04. Saida verificavel: dispatcher rodavel
standalone + golden test garantindo paridade de wording com o bloco original (linhas 16-36 de
`skills/init/SKILL.md`).

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)
| O que | De onde vem | Status |
|-------|-------------|--------|
| Helper `detectV5Legacy` | `skills/init/lib/detect-v5-legacy.ts` (ja existe, preservado) | pronto |
| PRD aprovado com D1-D7 | `../PRD.md` | pronto |

### Produz para (outros planos que dependem deste)
| O que | Quem consome |
|-------|-------------|
| Interface `Step` / `StepReport` / `StepContext` | Plano 02 (porta steps idempotentes), Plano 03 (porta steps de migracao) |
| `AbortError` + handler no dispatcher | Plano 02, Plano 03 (todos os gates passam a usar throw) |
| Dispatcher esqueleto (`run-init.ts`) | Plano 04 (cutover do SKILL.md aponta para ele) |
| Padrao DI-06 centralizado (`await import` no boundary) | Plano 02, Plano 03 (steps nao precisam mais lidar com Windows) |
| Padrao golden test (snapshot byte-identico) | Plano 02, Plano 03 (cada step portado herda o template) |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-interface-and-abort-error.md | Tipos `Step`/`StepReport`/`StepContext` + classe `AbortError` + testes de tipos | 1h | — |
| 02 | fase-02-dispatcher-skeleton.md | `lib/run-init.ts` com parse-flags + iteracao do registry + captura de AbortError (sem steps) | 1.5h | fase-01 |
| 03 | fase-03-tracer-detect-legacy.md | Step 0.5 portado para `lib/steps/00-detect-legacy.ts` + registry com 1 entrada + golden test | 2h | fase-02 |
| 04 | fase-04-windows-di06-centralization.md | DI-06/GT-04 (`await import`) centralizado no dispatcher + fixture Windows-like | 1.5h | fase-02 |

---

## Grafo de Fases

```
fase-01 (interface + AbortError)
    |
    v
fase-02 (dispatcher skeleton)
    |
    +----------- + ---------+
    |                       |
    v                       v
fase-03 (tracer)     fase-04 (DI-06 central)
```

**Paralelismo possivel:** fase-03 e fase-04 podem rodar em paralelo (ambas dependem apenas de
fase-02). Se executado serialmente, recomenda-se fase-03 primeiro (eh o tracer bullet — valida o
contrato antes de centralizar workaround).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar
3. REFACTOR: otimizar mantendo testes verdes
4. VERIFY: bun run test && bun run lint
```

**Tracer Bullet deste plano:** fase-03 (porta Step 0.5 ponta-a-ponta — eh tambem o tracer da feature
inteira). Se fase-03 passar com `diff -q` byte-identico ao bloco original, o contrato `Step` esta
validado e os Planos 02/03 podem proceder com confianca.

---

## Decisoes do PRD aplicaveis

| Decisao | Aplicacao neste plano |
|---------|------------------------|
| D1 (Rails-style: manifest + dispatcher + steps modulares) | Estabelece o padrao. Toda a infraestrutura nasce aqui. |
| D2 (Interface `Step` em `lib/steps/types.ts`) | Fase 01 cria EXATAMENTE em `skills/init/lib/steps/types.ts` (NAO em `lib/types.ts`). |
| D4 (Gates usam `throw AbortError(reason)`, NAO `process.exit(N)`) | Fase 01 define a classe. Fase 03 aplica ao portar Step 0.5. |

## Criterios de Aceite do PRD tangenciados

- **MH-02** (parcial): dispatcher esqueleto entregue na fase-02.
- **MH-05**: `AbortError` implementado (fase-01) e capturado pelo dispatcher (fase-02).
- **CA-08** (parcial, edge Windows): DI-06 centralizado na fase-04.
- **SH-04**: padrao "cada step com teste unitario" estabelecido via tracer (fase-03).

---

## Gotchas Conhecidos

Gotchas herdados do PRD e indexados aqui para referencia rapida nas fases:

- **G1 — Wording byte-identico (R1):** `console.log` do step portado deve copiar EXATO do bloco
  inline atual (linhas 16-36 de `skills/init/SKILL.md`). Scripts CI fazem grep no stdout (PRD R3) —
  mudar wording quebra parsing humano e automacao.
- **G2 — DI-06/GT-04 (R3):** `bun -e` com paths absolutos quebra no Windows. Steps DEVEM usar
  `await import('./path.ts')` em blocos JS, NUNCA `bun -e "..."`. Centralizar pattern no dispatcher
  (fase-04) para que steps individuais nao tenham que lembrar.
- **G3 — Contrato Step estavel (R2):** mudancas na assinatura de `Step` apos a fase-01 quebram
  Planos 02 e 03. Validar via 2 implementacoes diferentes antes de declarar congelado: o tracer
  (fase-03) + um spy/mock no teste do dispatcher (fase-02).
- **G4 — Helper preservado:** `skills/init/lib/detect-v5-legacy.ts` ja existe com JSDoc
  (Princípio #5). Step portado eh apenas WRAPPER — nao duplicar logica, nao adicionar comentarios
  no helper.
- **G5 — Sem cutover (R5):** `skills/init/SKILL.md` permanece INTOCADO neste plano. O bloco inline
  Step 0.5 (linhas 16-36) continua sendo a fonte canonica de wording. O step portado eh testado em
  isolamento, mas NAO substitui o inline ainda — isso eh trabalho do Plano 04.

---

<!-- Gerado por /plan-feature em 2026-05-17 -->
