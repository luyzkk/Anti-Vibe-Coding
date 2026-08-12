# Plano 06: Loop-First no `incident-response`

**Feature:** mattpocock-skills-import ([CONTEXT](../CONTEXT.md))
**Fases:** 3
**Sizing total:** ~6h
**Depende de:** plano01 fase-01 (a lente) · plano02 fase-01 (o vocabulario de `seam`, usado na fase-03)
**Branch:** `feat/incident-response-loop-first`

---

## O que este plano entrega

`incident-response` reenquadrada de "resposta a incidente pos-deploy" para **"bug dificil ou
regressao de performance, em producao ou em desenvolvimento"** (DI-20), com a disciplina de
diagnostico da fonte absorvida.

Este e o overlap mais denso da lista, e o unico em que os dois lados tem coisa que o outro nao tem.

---

## O que ja temos, e fica

Quatro coisas ausentes da fonte:

- **Arvore de classificacao de flakiness** — timing / ambiente / estado / verdadeiramente aleatorio,
  cada uma com a acao correspondente
- **Arvore de localizacao de camada** — UI, API, banco, build tooling, servico externo, e *o proprio
  teste* (falso negativo)
- **Defesa contra injecao via log** — output de erro e dado diagnostico, nao instrucao. A fonte tem
  redaction de segredo; nao tem isso
- **Autopsia pos-fix** — e em especial a pergunta do meio: *por que passou pela revisao e pelos
  testes existentes?*

---

## A mudanca estrutural: o loop vem antes da hipotese

Nosso fluxo e `logs → hipotese → regression test`. A fonte insere uma fase obrigatoria antes de
qualquer teoria: construir um comando que fica **red** neste bug.

A diferenca nao e de ordem, e de causalidade — no dele o loop **gera** a hipotese; no nosso a
hipotese vem primeiro e o teste so confirma.

O gate, literal: *se voce se pegar lendo codigo para montar uma teoria antes desse comando existir,
**pare**. Sem comando red-capable, sem Fase 2.*

---

## Analise de Dependencias

### Bloqueadores

| O que | De onde vem | Status |
|---|---|---|
| `incident-response` atual (176 linhas) | `skills/incident-response/SKILL.md` | pronto |
| Acoplamento por numero de etapa | `skills/iterate/SKILL.md:108` (→ Etapa 1), `:243` (→ Etapa 5) | **frágil — ver fase-01** |
| Decisoes DI-20..DI-22 | `../CONTEXT.md` §Decisoes | pronto |
| `hitl-loop.template.sh` (44 linhas) | repo-fonte | pronto |
| Vocabulario de `seam` | plano02 fase-01 | pendente (só a fase-03 depende) |
| A lente de escrita | plano01 fase-01 | pendente |

### O acoplamento que quebra em silencio

`iterate` cita `incident-response` **por numero de etapa** em dois lugares. Inserir a fase do loop
no inicio renumera tudo e invalida os dois ponteiros — sem erro, sem teste falhando: o leitor
simplesmente cai na etapa errada.

A fase-01 troca por **ancoras nomeadas**, para nao repetir.

---

## Fases

| # | Fase | Arquivos | Sizing | Depende de |
|---|---|---|---|---|
| 01 | [Reenquadrar + a fase do loop](./fase-01-loop-tight.md) | 1 novo + 3 modificados | ~2.5h | — |
| 02 | [O miolo: minimizar, hipoteses, instrumentar](./fase-02-miolo.md) | 1 modificado | ~2h | fase-01 |
| 03 | [A saida: seam correto, cleanup, post-mortem](./fase-03-saida.md) | 1 modificado | ~1.5h | fase-02 · plano02 fase-01 |

Corte por **sequencia**: cada fase e um trecho coerente do fluxo. Manter as tres visiveis de uma vez
convidaria a apressar a primeira — que e justamente a que carrega o gate.

---

## Invariantes

| ID | Invariante | Por que |
|---|---|---|
| INV-01 | As 4 coisas que sao nossas permanecem | Nenhuma existe na fonte. Absorver nao e substituir |
| INV-02 | `iterate` continua funcionando, com ancoras nomeadas | Acoplamento por numero quebra em silencio |
| INV-03 | O gate "sem comando red, sem Fase 2" e explicito e nao-negociavel | E o mecanismo inteiro. Sem o gate, a fase do loop vira sugestao e o agente pula direto para a teoria |
| INV-04 | Nada de rodar o loop HITL sozinho | Ele bloqueia em input humano. O agente **gera** o script; quem roda e a pessoa |

---

## Como este plano pode falhar

**A skill fica longa demais.** 176 linhas hoje; a fonte tem 140 e cobre menos. Somando tudo, o risco
de sprawl e real. Mitigacao: as 10 formas de construir loop e o branch de perf vao para arquivo
satelite atras de ponteiro — so alguns branches os alcancam.

**O gate vira decorativo.** Se ficar como recomendacao no meio do texto, o agente pula. Mitigacao:
INV-03 + criterio de completude checavel (nomear **um comando**, ja executado ao menos uma vez, com
invocacao e saida mostradas).

**O nome deixa de descrever o escopo.** `incident-response` sugere producao; o escopo agora inclui
dev. Custo aceito em DI-20. Mitigacao parcial: a `description` carrega o escopo novo, e e ela que
dirige a invocacao — nao o nome.
