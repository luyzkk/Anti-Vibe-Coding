---
fase: 03
plano: 10
status: planned
---

# Fase 03: Modo Work + Integracao no Pipeline

**Plano:** 10 — `wayfinder`
**Sizing:** ~2.5h
**Depende de:** fase-02 (o modo work comeca pela fronteira)
**Visual:** false

**Invariantes:** INV-02 (um ticket por sessao) · INV-03 (HITL nao e resolvido pelo agente) · INV-06 (out of scope nao gradua)

---

## O que esta fase entrega

O ciclo de trabalho, e o lugar da skill no pipeline.

---

## Arquivos Afetados

**MODIFICADOS**
- `skills/wayfinder/SKILL.md` — o modo work
- `skills/write-prd/SKILL.md` — ponteiro de entrada
- `skills/plan-feature/SKILL.md` — ponteiro de fronteira
- `docs/PIPELINE.md` — o novo estagio

Quatro arquivos, no cap.

---

## Implementacao

### Passo 1: o modo work

Invocado com um mapa. Ticket e **opcional** — sem ele, quem escolhe o proximo e o agente, nao o
usuario.

1. **Carregar o mapa** — a visao de baixa resolucao, nao o corpo de cada ticket
2. **Escolher o ticket.** Se o usuario nomeou um, usar. Senao, rodar `bun run wayfinder:frontier` e
   pegar o primeiro. **Reivindicar antes de qualquer trabalho** (mecanismo de
   `DI-Plano10-fase01-claim`)
3. **Resolver — dando zoom conforme precisar**: buscar o corpo de qualquer ticket relacionado ou
   fechado sob demanda; invocar as skills que o bloco `## Notes` nomeia. Na duvida, grilling
4. **Registrar a resolucao**: a resposta no proprio ticket, `status: closed`, e **uma linha** em
   *Decisions so far* do mapa, com link
5. **Atualizar o mapa**: criar tickets recem-revelados (criar, depois ligar); **graduar** a nevoa que
   a resposta tornou especificavel, **limpando o trecho graduado** de *Not yet specified* para ele
   viver so como ticket. Se a resposta revelar que um ticket esta alem do destino, **por fora de
   escopo** em vez de resolve-lo na rota (INV-06). Se a decisao invalidar partes do mapa, atualizar
   ou apagar aqueles tickets

O passo 5 e o que mantem o mapa vivo. Sem ele a nevoa nunca diminui e o mapa vira lista de desejos.

### Passo 2: um ticket por sessao (INV-02)

Exceto `research`, que e AFK e paralelizavel.

A razao precisa estar escrita, senao parece arbitrario: **o mapa existe porque o trabalho excede um
contexto.** Resolver varios por sessao recria exatamente o problema que o mapa resolve — a decisao
tres sai pior que a um, e ninguem percebe.

### Passo 3: HITL nao e resolvido pelo agente (INV-03)

Ticket `grilling`, `prototype` e `task`-HITL so resolvem pela troca ao vivo. **O agente nunca faz o
lado do humano.**

A frase da fonte vale literal, porque nomeia o modo de falha exato: *um agente de grilling que
responde as proprias perguntas quebrou isso.*

Se o humano nao esta disponivel, o ticket continua aberto. Nao ha resolucao parcial.

### Passo 4: plan, don't do

Wayfinder e **planejamento** por padrao. Cada ticket resolve uma decisao; o mapa acaba quando nada
resta a decidir antes de alguem ir fazer.

**A vontade de simplesmente fazer o trabalho e o sinal de que voce chegou na borda do mapa** — e a
hora de passar adiante, nao de comecar a implementar.

Um esforco pode sobrescrever isso nas suas `## Notes`, carregando execucao para dentro do mapa. Sem
isso, produza decisoes, nao entregaveis.

### Passo 5: ponteiro em `write-prd`

Gatilho: a ideia e grande demais e ainda **nao da para descrever a feature** — que e o que o
`write-prd` pressupoe.

A fronteira que a linha carrega: `write-prd` especifica algo que voce **consegue nomear**; wayfinder
descobre **quais sao as perguntas** quando voce ainda nao consegue.

E o caminho de volta: mapa fechado → `write-prd` com as decisoes de *Decisions so far* como insumo.

### Passo 6: ponteiro em `plan-feature`

Gatilho inverso: chegou um pedido de plano e **nao existe PRD nem da para escrever um**, porque as
decisoes de base nao foram tomadas. Em vez de planejar sobre premissa, mandar para wayfinder.

Cuidado: nao transformar em "sempre comece por wayfinder". A maioria das features **cabe** no
`write-prd`. O ponteiro e para o caso em que a ideia esta em neblina.

### Passo 7: `docs/PIPELINE.md`

O pipeline documentado hoje comeca em `grill-me`. Adicionar o estagio na frente:

**`wayfinder` → `write-prd` → `plan-feature` → `execute-plan` → `verify-work` → `iterate`**

Com a condicao de entrada explicita: wayfinder so quando o caminho nao esta visivel. Feature
descritivel entra direto no `grill-me`/`write-prd`.

`docs/PIPELINE.md` tambem e alcancado pela tabela "When to Read What" do `AGENTS.md` — conferir se
aquela linha precisa de ajuste.

### Passo 8: passar a lente do plano01

Leitura de ponta a ponta das duas fases somadas. Alvo: a `SKILL.md` fechou os dois modos sem
duplicar o formato, que mora no `FORMATS.md`.

---

## Gotchas

- **G1** — Modo work sem passar pela fronteira. O passo 2 comeca pelo script, senao o grafo de
  bloqueio nao serve para nada.
- **G2** — Esquecer de limpar o trecho graduado de *Not yet specified*. A nevoa nunca diminui e o
  mapa vira lista de desejos.
- **G3** — Ponteiros virando "sempre comece por wayfinder" (passo 6).
- **G4** — Resolver ticket HITL sozinho porque o humano nao respondeu (INV-03).
- **G5** — `docs/PIPELINE.md` tem outras referencias ao pipeline espalhadas (`AGENTS.md`,
  `README.md`). Conferir consistencia, ou o estagio novo aparece em um lugar so.
- **G6** — Terceiro toque em `plan-feature` e segundo em `write-prd` nesta serie? Conferir o MEMORY
  dos outros planos antes de editar. Reler sempre.

---

## Verificacao

### Checklist

- [ ] `bun run harness:validate` verde
- [ ] Modo work com os 5 passos, comecando pela fronteira
- [ ] Graduacao da nevoa **com limpeza** do trecho (G2)
- [ ] Um ticket por sessao, com a razao escrita (INV-02)
- [ ] HITL nunca resolvido pelo agente, com a frase do modo de falha (INV-03)
- [ ] "Plan, don't do" com o sinal da borda do mapa
- [ ] Ponteiros em `write-prd` e `plan-feature`, cada um com fronteira, nenhum dizendo "sempre"
- [ ] `docs/PIPELINE.md` com o estagio novo e a condicao de entrada
- [ ] Consistencia do pipeline nos outros lugares (G5)

### Teste de fluxo

- [ ] Percorrer no papel: ideia solta → chart → 3 tickets → resolver 1 → graduar nevoa → fronteira
      recalculada. **O mapa mudou de forma coerente?**
- [ ] Percorrer o caso de saida: ideia que cabia numa sessao → o passo 3 do chart barra?

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate && bun run test` exit 0
- `docs/PIPELINE.md` cita `wayfinder` com condicao de entrada
- Diff em 4 arquivos

**Por humano:**
- Ler o modo work e conduzir uma sessao sem reler o `FORMATS.md`
- Os ponteiros nao empurram toda feature para o wayfinder
- Saber, ao ler "plan, don't do", quando parar de planejar e passar adiante
