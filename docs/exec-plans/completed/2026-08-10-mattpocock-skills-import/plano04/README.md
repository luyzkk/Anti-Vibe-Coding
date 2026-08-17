# Plano 04: Modelo de Frontier no `grill-me`

**Feature:** mattpocock-skills-import ([CONTEXT](../CONTEXT.md))
**Fases:** 2
**Sizing total:** ~4h
**Depende de:** plano01 fase-01 (a lente — e o conceito de *premature completion* que justifica DI-15)
**Desbloqueia:** `wayfinder` e `improve-codebase-architecture`, se portadas, herdam um `grill-me` com estrutura
**Branch:** `feat/grill-me-frontier`

---

## O que este plano entrega

`grill-me` ganha o eixo que nao tem. Hoje ele e **cobertura**: 7 categorias garantidas, uma decisao
por pergunta, hipotese com confianca, gate de sintetizar-e-confirmar. Falta **estrutura** — em que
ordem perguntar, e como saber que acabou.

Depois deste plano ele tem os dois: as categorias continuam garantindo que seguranca nao seja
esquecida, e o design tree garante que nada seja perguntado fora de ordem nem assumido em silencio.

E ganha o primeiro teste da sua vida.

---

## As tres mudancas

**1. Design tree, frontier, rounds (DI-14).**
Toda decisao ramifica nas decisoes que dependem dela. A **fronteira** e o conjunto de decisoes cujos
pre-requisitos ja estao resolvidos — as perguntas que dao para fazer *agora* sem chutar resposta que
ainda nao se ouviu. Pergunta-se a fronteira **inteira** por rodada, numerada, cada uma com sua
recomendacao. A resposta remodela a arvore; recalcula-se a fronteira; proxima rodada.

Pergunta que depende de outra ainda aberta **pertence a uma rodada posterior**.

**2. Parada por fronteira vazia (DI-15).**
`95%` sai. Pela lente do plano01, e o *bound* vago classico: o agente nao distingue pronto de
nao-pronto, entao para quando parece suficiente. Fronteira vazia e binario.

O piso de 5 perguntas sai junto — fronteira vazia com 2 perguntas significa que a feature era
simples mesmo, e forcar mais 3 perguntas produz ruido.

**3. Fatos nao-bloqueantes (DI-16).**
"Achar fatos e seu trabalho; decisoes sao do usuario" vira regra valida durante toda a entrevista,
nao fase inicial. Quando uma pergunta da fronteira precisa de um fato do ambiente, despacha
subagente — e **nao bloqueia**: so as perguntas a jusante daquele fato esperam; o resto da fronteira
vai agora.

---

## Analise de Dependencias

### Bloqueadores

| O que | De onde vem | Status |
|---|---|---|
| `grill-me` atual (463 linhas) | `skills/grill-me/SKILL.md` | pronto |
| Decisoes DI-14..DI-16 | `../CONTEXT.md` §Decisoes | pronto |
| Padrao de teste de paridade com gate "nunca diminuir" | `tests/plan-feature-template.test.ts`, `tests/quick-plan-template.test.ts` | pronto |
| Conceito de *premature completion* | plano01 fase-01 | pendente |

### Consumidores a nao quebrar

| Quem | O que consome |
|---|---|
| `write-prd` | le `docs/exec-plans/active/{data}-{slug}/CONTEXT.md` e importa as decisoes indexadas |
| `design-twice` | importa o mesmo `CONTEXT.md` para reaproveitar decisoes ja tomadas |

**O contrato de saida nao muda.** As decisoes continuam indexadas (D1, D2...) no mesmo caminho e no
mesmo formato. O que muda e **como** as perguntas sao ordenadas e quando a entrevista para.

---

## Fases

| # | Fase | Arquivos | Sizing | Depende de |
|---|---|---|---|---|
| 01 | [Absorver o modelo](./fase-01-absorver-frontier.md) | 1 modificado | ~2.5h | — |
| 02 | [Teste de paridade do contrato](./fase-02-teste-paridade.md) | 1 novo | ~1.5h | fase-01 |

---

## Invariantes

| ID | Invariante | Por que |
|---|---|---|
| INV-01 | O contrato de saida do `CONTEXT.md` nao muda | `write-prd` e `design-twice` dependem dele. Mudar interview **e** output no mesmo plano tornaria impossivel saber qual quebrou |
| INV-02 | As 7 categorias continuam garantidas | Sao o eixo de cobertura, que a fonte nao tem. Um design tree puro pode fechar sem tocar em seguranca uma unica vez |
| INV-03 | O gate de sintetizar-e-confirmar (Passo 4.5) permanece | E nosso, nao existe na fonte, e e a ultima defesa antes de gravar |
| INV-04 | Recomendacao continua obrigatoria em toda pergunta | Ja e regra nossa ("Para o seu caso, recomendo [A] porque...") e coincide com o `➡️` dele |

---

## Como este plano pode falhar

**A entrevista nunca termina.** Sem o teto de 20, uma feature mal escopada pode gerar fronteira que
nao esvazia. Mitigacao: a fronteira so cresce a partir de decisoes **do usuario** — se ela nao
esvazia, o escopo esta errado, e isso e achado, nao bug. A fase-01 exige uma instrucao explicita de
nomear isso ao usuario em vez de seguir perguntando.

**As categorias viram decorativas.** Com o design tree conduzindo, o agente pode nunca chegar em
seguranca porque nenhuma decisao ramificou para la. Mitigacao: INV-02 + a fase-01 trata as 7
categorias como **sementes da arvore**, nao como lista paralela.

**Quebramos o pipeline sem perceber.** `grill-me` nao tem teste hoje. Mitigacao: e exatamente o que
a fase-02 entrega — e ela vem depois justamente para o teste ser escrito contra o comportamento novo.
