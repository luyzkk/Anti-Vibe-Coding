# Plano 02: Vocabulario de Seam — Expansao da Referencia de Deep Modules

**Feature:** mattpocock-skills-import ([CONTEXT](../CONTEXT.md))
**Fases:** 3
**Sizing total:** ~4h
**Depende de:** plano01 fase-01 (a `writing-for-agents` e a lente contra a qual este material e escrito)
**Desbloqueia:** `improve-codebase-architecture` (se portada — consome seam/leverage/locality o tempo todo)
**Branch:** continua em `feat/writing-for-agents-port`, ou nova `feat/seam-vocabulary` se o plano01 ja tiver merged

---

## O que este plano entrega

O eixo que falta na nossa referencia de deep modules. Hoje ela trata **profundidade da interface**;
ao fim deste plano trata tambem **onde a interface fica** (seam) e **o que a atravessa** (adapter).

Mais duas coisas que nao sao adicao de conteudo:

- **Corrige CF-01** — a metrica de ratio-de-linhas, que premia inchar a implementacao, sai. Isso
  toca auditoria real: `verify-work` e `anti-vibe-review` consomem essa referencia.
- **Fecha a lacuna de descoberta** — hoje o material so e alcancado de dentro de `tdd-workflow`,
  `anti-vibe-review` e `verify-work`. Ou seja, durante TDD ou review. Design de modulo tambem
  acontece em `architecture`, `design-twice` e `code-simplification`, que nao alcancam nada disso.

**Nao criamos skill nova (DI-06).** A referencia ja existe e ja tem 3 ponteiros resolvendo.

---

## Analise de Dependencias

### Bloqueadores

| O que | De onde vem | Status |
|---|---|---|
| Referencia atual (118 linhas) | `skills/tdd-workflow/references/deep-modules.md` | pronto |
| 3 ponteiros existentes | `tdd-workflow:119`, `anti-vibe-review:95`, `verify-work:170` | pronto |
| CF-01 documentado (metrica que premia padding) | `../CONTEXT.md` §Conflitos | pronto |
| CF-02 documentado (DESIGN-IT-TWICE redundante) | `../CONTEXT.md` §Conflitos | pronto |
| Decisoes DI-06..DI-08 | `../CONTEXT.md` §Decisoes | pronto |
| A lente de escrita | plano01 fase-01 (`writing-for-agents`) | pendente |

### Produz para

| O que | Quem consome |
|---|---|
| Vocabulario seam/adapter/leverage/locality | `verify-work` e `anti-vibe-review` (pre-check de deep modules), `tdd-workflow` (fase RED), `architecture`, `code-simplification` — e `improve-codebase-architecture` se for portada |
| 4 categorias de dependencia | Decisao de *como* testar atraves de um seam — consumida pelo `tdd-workflow` |
| Dominio 5 do `design-twice` | Quem usa `/design-twice` para desenhar interface de modulo |

---

## Fases

| # | Fase | Arquivos | Sizing | Depende de |
|---|---|---|---|---|
| 01 | [Expandir a referencia](./fase-01-expandir-referencia.md) | 1 modificado | ~2h | — |
| 02 | [Ponteiros de descoberta](./fase-02-ponteiros.md) | 3 modificados | ~1h | fase-01 |
| 03 | [5o dominio no design-twice](./fase-03-quinto-dominio-design-twice.md) | 1 modificado | ~1h | fase-01 |

Fases 02 e 03 sao independentes entre si — ambas so dependem da fase-01.

---

## Invariantes

| ID | Invariante | Por que |
|---|---|---|
| INV-01 | Termos-ancora em ingles: `seam`, `adapter`, `deep`, `shallow`, `leverage`, `locality` | DI-03. `costura` ja e usada em `messaging-reliability.md` com sentido comum — traduzir criaria colisao real dentro do proprio repo |
| INV-02 | O arquivo **nao muda de lugar** | Os 3 ponteiros resolvem hoje. Compound `2026-05-14-skill-paths-tech-debt-after-v6` registra divida tecnica exatamente de churn de path |
| INV-03 | Conteudo proprio preservado | Relacao com SOLID, classitis, Deep Module vs God Object nao existem no repo-fonte. Sao nossos e ficam |
| INV-04 | Referencia continua sem frontmatter de skill | E arquivo de referencia, nao skill. Ganhar `description` significaria pagar context load — o oposto de DI-06 |

---

## Como este plano pode falhar

**A referencia vira um glossario que ninguem aplica.** Mitigacao: cada termo novo entra com o
*teste operacional* junto (deletion test, "1 adapter = hipotetico, 2 = real"), nunca so a definicao.
Um termo sem teste e vocabulario decorativo.

**Inchamos de 118 para 300 linhas e perdemos a legibilidade.** Mitigacao: teto de ~200 linhas na
fase-01, e ela e escrita contra a `writing-for-agents` do plano01 — que existe exatamente para
apanhar sprawl e no-op.

**A correcao de CF-01 muda o comportamento de auditoria sem ninguem perceber.** Mitigacao: a
fase-01 exige rodar o pre-check do `verify-work` num modulo real antes e depois, e registrar se o
veredito mudou. Se mudar, e resultado esperado — mas precisa estar escrito.
