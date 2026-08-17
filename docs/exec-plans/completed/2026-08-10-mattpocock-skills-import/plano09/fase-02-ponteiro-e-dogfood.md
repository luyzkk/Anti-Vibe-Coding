---
fase: 02
plano: 09
status: planned
---

# Fase 02: Ponteiro + Dogfood num Conflito Real

**Plano:** 09 — `resolving-merge-conflicts`
**Sizing:** ~1.5h
**Depende de:** fase-01
**Visual:** false

**Invariantes:** INV-01 (intencao rastreada) · INV-04 (checks antes de finalizar)

---

## O que esta fase entrega

O ponteiro que liga as duas skills de git, e a prova de que a skill funciona num conflito de verdade.

Esta e a skill mais barata de dogfoodar de toda a serie: um conflito de merge se fabrica em um
minuto num repo descartavel. Nao ha desculpa para entregar sem testar.

---

## Arquivos Afetados

**MODIFICADOS**
- `skills/git-workflow-and-versioning/SKILL.md` — o ponteiro

**EFEMERO (fora do repo)**
- Repo descartavel do dogfood, no scratchpad da sessao

**FORA do escopo**
- `skills/resolving-merge-conflicts/SKILL.md` (fase-01, fechada)
- Os compounds — citados, nao alterados

---

## Implementacao

### Passo 1: o ponteiro em `git-workflow-and-versioning`

Uma linha. O gatilho: a conversa e sobre integrar trabalho divergente, e ha ou vai haver conflito.

A fronteira que a linha precisa carregar: `git-workflow-and-versioning` e sobre **decidir** como
commitar, ramificar e integrar; `resolving-merge-conflicts` e sobre **estar preso** no meio de um.
Consultivo vs procedimental.

Nao inflar a `description` — o ponteiro vai no corpo, perto de onde a skill ja fala de branches
curtas e conflito como custo escondido. E o lugar natural: ela ja menciona conflito ali, so nao
diz o que fazer quando acontece.

### Passo 2: montar o conflito de verdade

Num repo git descartavel dentro do scratchpad da sessao — **nunca neste repo**.

Fabricar um conflito que exercite o mecanismo, nao um trivial:

- duas branches editando **a mesma funcao** com intencoes diferentes e legiveis
- **mensagens de commit reais** dos dois lados, explicando o porque — sem isso o passo 2 da skill
  nao tem fonte para rastrear, e o dogfood testa a metade errada
- ao menos um hunk em que as duas intencoes **dao para preservar**, e um em que **nao dao**

O segundo item e o que separa este dogfood de um teste de `git merge`. O que esta sendo testado e a
resolucao por intencao, nao a mecanica do git.

### Passo 3: resolver com a skill

Seguir os cinco passos sem atalho. Observar e registrar:

- o passo 2 conseguiu enunciar a intencao de cada lado a partir das mensagens de commit?
- o hunk compativel foi resolvido **preservando os dois**, ou o agente escolheu um lado?
- o hunk incompativel veio com o trade-off **anotado**?
- algum comportamento novo foi inventado na resolucao (INV-02)?

O terceiro e o quarto sao os que mais provavelmente falham — sao onde a skill pede julgamento e o
caminho facil e escolher um lado e seguir.

### Passo 4: testar o escape do abort

Segundo cenario, curto: iniciar um merge **errado de proposito** (branch errada) e verificar que a
skill reconhece e recomenda abortar, em vez de resolver um merge que sera descartado.

Se ela insistir em resolver, o escape esta escrito fraco demais e volta para a fase-01.

### Passo 5: registrar

No MEMORY: o que a skill acertou, onde hesitou, e se algum dos quatro pontos do passo 3 falhou.

Se o dogfood revelar buraco, a correcao e na fase-01 — **nao patch oportunista no meio do teste**.

---

## Gotchas

- **G1** — Fabricar o conflito **neste** repo. Scratchpad, sempre.
- **G2** — Conflito sem mensagem de commit real. Testa a mecanica do git e nao a skill.
- **G3** — Conflito trivial (uma linha, mesma intencao). Nao exercita nada.
- **G4** — Consertar a skill durante o dogfood. Anota e volta para a fase-01.
- **G5** — Inflar a `description` do `git-workflow-and-versioning` com gatilho de conflito. O
  argumento de DI-29 foi exatamente evitar isso.

---

## Verificacao

### Checklist

- [ ] `bun run harness:validate` verde
- [ ] Ponteiro tem 1 linha, no corpo, com a fronteira consultivo-vs-procedimental
- [ ] `description` do `git-workflow-and-versioning` **nao** foi tocada
- [ ] Conflito fabricado no scratchpad, com mensagens de commit reais
- [ ] Conflito tem hunk compativel **e** hunk incompativel
- [ ] Os 4 pontos de observacao do passo 3 registrados
- [ ] Cenario de abort testado (passo 4)
- [ ] Checks rodados antes de finalizar o merge (INV-04)
- [ ] Nada do dogfood entrou neste repo

---

## Criterio de Aceite

**Por maquina:**
- `git diff` mostra 1 arquivo, so no corpo
- `bun run harness:validate` exit 0
- `git status` limpo neste repo apos o dogfood

**Por humano:**
- A skill resolveu o hunk compativel preservando as duas intencoes, e voce concorda com a resolucao
- O trade-off do hunk incompativel esta anotado de forma que voce entenderia daqui a seis meses
- No cenario de merge errado, ela recomendou abortar
