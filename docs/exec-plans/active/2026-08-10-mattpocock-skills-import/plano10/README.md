# Plano 10: `wayfinder` — O Estagio de Descoberta

**Feature:** mattpocock-skills-import ([CONTEXT](../CONTEXT.md))
**Fases:** 3
**Sizing total:** ~8h
**Depende de:** plano01 fase-01 (a lente)
**Degrada graciosamente** enquanto plano04, plano05 e plano08 nao entregarem (DI-34)
**Branch:** `feat/wayfinder`

---

## O que este plano entrega

O estagio que falta na frente do pipeline.

`plan-feature` converte um PRD. `write-prd` entrevista sobre uma feature que voce consegue
descrever. `grill-me` resolve ambiguidade sobre uma feature. **Os tres pressupoem que voce consegue
nomear a coisa.**

Wayfinder e para quando o destino e visivel mas o **caminho** nao — voce ainda nao sabe quais sao as
perguntas.

Pipeline resultante: **`wayfinder` → `write-prd` → `plan-feature` → `execute-plan`**. Insercao limpa
na frente, sem competir com nada.

---

## O gap, verificado com precisao

Nao e "planejar coisa grande" — isso ja temos:

| Ja temos | Onde |
|---|---|
| Decomposicao hierarquica | `plan-feature` — PRD → planos → fases |
| Declaracao de dependencia (DAG) | `plan-feature:721` — *"Depende de: fase-01" ou "Independente"* |
| Dependencia entre requisitos | `plan-feature:501` |
| Estado multi-sessao | `STATE.md` + `MEMORY.md` por plano |

O que falta sao tres artefatos que so existem no estagio de descoberta:

**Fog of war.** A secao *Not yet specified* — perguntas que voce pressente vindo mas nao consegue
formular. O teste e afiado: **voce consegue enunciar a pergunta com precisao agora?** — nao
responde-la. Ticket quando ja esta nitida, mesmo bloqueada; nevoa quando ainda nao. E a instrucao de
**nao pre-fatiar a nevoa** em pedacos do tamanho de ticket: ela e mais grossa que um ticket, e um
trecho pode graduar em varios, ou em nenhum.

**Out of scope como secao viva.** Trabalho conscientemente posto fora do esforco. **Nunca gradua** —
a fronteira para no destino. Temos "FORA do escopo" por fase; nao temos fronteira de escopo corrente
para um esforco inteiro.

**HITL vs AFK por ticket.** Um ticket HITL so resolve pela troca ao vivo, e **o agente nunca faz o
lado do humano** — *"um agente de grilling que responde as proprias perguntas quebrou isso"*.

---

## As duas regras que dao forma ao resto

**Plan, don't do.** Cada ticket resolve uma decisao; o mapa acaba quando o caminho esta claro —
nada a decidir antes de alguem ir fazer. **A vontade de simplesmente fazer o trabalho e o sinal de
que voce chegou na borda do mapa e e hora de passar adiante.**

**O mapa e indice, nao deposito.** Ele lista as decisoes tomadas e aponta para os tickets que
guardam o detalhe. Uma decisao vive em **exatamente um lugar** — seu ticket. O mapa nunca a
reafirma; so resume e linka.

---

## As decisoes de adaptacao

**DI-32 — markdown local.** O mapa e uma issue no tracker na fonte; aqui e `MAP.md` mais
`tickets/NNN-slug.md` dentro da pasta datada do esforco. A propria fonte preve esse fallback, e e a
unica opcao consistente com local-first.

**DI-33 — a fronteira vira script.** O que se perde com markdown e que a fronteira **renderizava
visualmente na UI do tracker**. `scripts/wayfinder-frontier.ts` recupera isso: le os tickets, resolve
o grafo de bloqueio, imprime o que esta aberto, desbloqueado e nao reivindicado. Mesmo padrao de
`parity-audit.ts` e `compound-check.ts` — e testavel, o que a query do tracker nao era.

**DI-34 — tipos degradando.** Os 4 tipos entram. `research` usa subagente comum mais
`source-driven-development`; `prototype` e `grilling` apontam para as skills quando plano08 e plano04
entregarem, e ate la degradam para conversa. A skill fica utilizavel sem esperar tres planos.

---

## Fases

| # | Fase | Arquivos | Sizing | Depende de |
|---|---|---|---|---|
| 01 | [Formato + modo chart](./fase-01-formato-e-chart.md) | 2 novos + 1 modificado | ~3h | — |
| 02 | [O script de fronteira](./fase-02-script-fronteira.md) | 2 novos + 1 modificado | ~2.5h | fase-01 |
| 03 | [Modo work + tipos + pipeline](./fase-03-work-e-pipeline.md) | 1 modificado + 3 ponteiros | ~2.5h | fase-02 |

Linear: o script precisa do formato; o modo work precisa da fronteira.

---

## Invariantes

| ID | Invariante | Por que |
|---|---|---|
| INV-01 | O mapa e **indice**; a decisao vive so no ticket | Reafirmar no mapa cria duas versoes que divergem |
| INV-02 | Um ticket por sessao, exceto `research` | O mapa existe porque o trabalho excede um contexto. Resolver varios por sessao recria o problema |
| INV-03 | Ticket HITL nunca e resolvido pelo agente sozinho | E a linha que separa descoberta de teatro |
| INV-04 | Referir por **nome**, nunca por id nu | Uma parede de `#42, #43, #44` e ilegivel; nomes leem de relance |
| INV-05 | Nevoa nao e pre-fatiada em tickets | Ela e mais grossa que um ticket; um trecho pode graduar em varios ou nenhum |
| INV-06 | Out of scope **nunca gradua** | A fronteira para no destino. So volta se o destino for redesenhado — e ai como esforco novo |

---

## Como este plano pode falhar

**Vira burocracia para trabalho que cabia numa sessao.** E o modo de falha mais provavel. Mitigacao:
o passo 2 do modo chart tem saida explicita — **se a grelhagem breadth-first nao revelar nevoa, o
caminho ja esta claro e voce nao precisa de mapa.** Parar e dizer isso.

**O mapa vira deposito.** Mitigacao: INV-01, e o script da fase-02 le os tickets como fonte — se o
mapa divergir, a fronteira computada denuncia.

**Ninguem roda o script.** Mitigacao: entra no `package.json` junto com os outros, e o modo work
comeca por ele.

**Os tipos degradados nunca sao religados.** Quando plano04 e plano08 entregarem, os ponteiros
precisam ser atualizados. Registrado no MEMORY como pendencia explicita, nao como TODO solto.
