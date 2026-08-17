---
fase: 01
plano: 10
status: planned
---

# Fase 01: O Formato dos Artefatos + Modo Chart

**Plano:** 10 — `wayfinder`
**Sizing:** ~3h
**Depende de:** plano01 fase-01 (a lente)
**Visual:** false

**Decisoes:** DI-32 (markdown local) · DI-34 (tipos degradando)
**Invariantes:** INV-01, INV-04, INV-05, INV-06

---

## O que esta fase entrega

O formato do mapa e do ticket, e o modo que cria o mapa a partir de uma ideia solta.

---

## Arquivos Afetados

**NOVOS**
- `skills/wayfinder/SKILL.md`
- `skills/wayfinder/FORMATS.md` — formato do `MAP.md` e do ticket

**MODIFICADOS**
- `THIRD-PARTY-NOTICES.md`

**FORA do escopo**
- Script de fronteira (fase-02) · modo work e ponteiros (fase-03)

---

## Implementacao

### Passo 1: frontmatter

`name: wayfinder` · `description` humana e curta · `user-invocable: true` ·
**`disable-model-invocation: true`**.

User-invoked, como na fonte. E orquestracao cara que o humano decide iniciar — nunca algo que o
agente comeca sozinho no meio de outra tarefa.

`allowed-tools: Read, Grep, Glob, Write, Edit, Bash, Agent, AskUserQuestion`.

### Passo 2: onde os artefatos vivem (DI-32)

Dentro da pasta datada do esforco, ao lado do que ja existe:

```
docs/exec-plans/active/{data}-{slug}/
├── MAP.md
└── tickets/
    ├── 001-{slug}.md
    └── 002-{slug}.md
```

Numeracao sequencial de 3 digitos — e a identidade do ticket, o equivalente ao id da issue. Mas
**referir por nome, sempre** (INV-04): o numero existe para ordenar arquivo e resolver bloqueio, nao
para aparecer na narracao.

Convivencia: um esforco pode ter `MAP.md` e depois ganhar `PRD.md` e `PLAN.md`, porque wayfinder vem
antes deles no pipeline. Nao ha conflito — sao estagios diferentes da mesma pasta.

### Passo 3: `FORMATS.md` — o mapa

```markdown
## Destination
<o que chegar ao fim deste mapa significa. Uma ou duas linhas; toda sessao se orienta por isso antes de escolher ticket>

## Notes
<dominio; skills que toda sessao deve consultar; preferencias permanentes deste esforco>

## Decisions so far
<indice — uma linha por ticket fechado: o bastante para julgar relevancia, e o link para o detalhe>
- [<titulo do ticket>](tickets/001-slug.md) — <resumo de uma linha da resposta>

## Not yet specified
<nevoa em escopo que ainda nao da para ticketar; gradua conforme a fronteira avanca>

## Out of scope
<trabalho posto fora do destino; fechado, nunca gradua>
```

**Tickets abertos nao sao listados** (INV-01) — sao arquivos, achados pelo script da fase-02. O mapa
carrega o esforco inteiro em baixa resolucao, carregado uma vez por sessao.

### Passo 4: `FORMATS.md` — o ticket

Frontmatter: `id` · `title` · `type` (`research` | `prototype` | `grilling` | `task`) ·
`status` (`open` | `closed`) · `blocked-by` (lista de ids) · `claimed` · `out-of-scope` (bool).

Corpo: `## Question` — a decisao ou investigacao que este ticket resolve. Dimensionado para **uma
sessao de agente**.

A resposta **nao** faz parte do corpo inicial: e gravada na resolucao (fase-03). Ativos criados
durante a resolucao sao **linkados**, nunca colados.

**`claimed` precisa de decisao.** Na fonte, reivindicar e atribuir a issue a si mesmo, para sessoes
concorrentes pularem. Em markdown local nao ha assignee. Opcoes: campo com timestamp e identificador
de sessao · flag booleana simples · nada, apostando que voce trabalha sozinho. Voce **roda sessoes
paralelas as vezes**, entao "nada" tem custo real. Registrar como `DI-Plano10-fase01-claim`.

### Passo 5: os 4 tipos, com degradacao (DI-34)

| Tipo | Modo | Resolve com | Hoje |
|---|---|---|---|
| `research` | AFK | subagente lendo fontes primarias | + `source-driven-development` |
| `prototype` | HITL | `/prototype` | **degrada** para conversa ate o plano08 |
| `grilling` | HITL | `/grill-me` + `/domain-modeling` | **degrada** para conversa ate plano04 e plano05 |
| `task` | HITL ou AFK | trabalho manual que **desbloqueia uma decisao** | disponivel |

`task` merece nota: e o unico tipo que **faz** em vez de decidir — e se justifica por desbloquear uma
decisao, nunca por entregar o destino. Assinar um servico para poder julgar a API, provisionar
acesso, mover dados para ver o formato. A resposta registra o que foi feito e os fatos resultantes
que tickets posteriores dependem.

**INV-03:** ticket HITL so resolve pela troca ao vivo. O agente nunca faz o lado do humano.

Marcar cada degradacao no doc com o plano que a religa — nao "TODO", mas o ponteiro exato.

### Passo 6: a nevoa (INV-05)

O mapa e **deliberadamente incompleto**: nao carte o que ainda nao da para ver.

O teste: **voce consegue enunciar a pergunta com precisao agora?** — nao respondê-la.

- **Ticket** quando a pergunta ja esta nitida, mesmo bloqueada e sem poder agir nela ainda
- **Not yet specified** quando ainda nao da para formular assim

E a instrucao contra o instinto: **nao pre-fatiar a nevoa** em pedacos do tamanho de ticket. Ela e
mais grossa que um ticket; um trecho pode graduar em varios, ou em nenhum.

*Not yet specified* exclui o que ja foi decidido, o que ja e ticket vivo, e o que esta fora de escopo.

### Passo 7: out of scope (INV-06)

Nevoa so se acumula **em direcao ao destino**. O destino fixa o escopo, entao trabalho alem dele e
out of scope — nao e nevoa, e nao entra em *Not yet specified*.

Quando um ticket que ja existe se revela alem do destino: **fecha-lo** (ticket fechado esta
inequivocamente fora da fronteira) e deixar uma linha na secao, com o resumo, o motivo e o link.
Fica **fora** de *Decisions so far* — aquela secao registra a rota efetivamente andada, e uma
fronteira de escopo nao e um passo dela.

Out of scope **nunca gradua**. So volta se o destino for redesenhado, e ai como esforco novo.

### Passo 8: modo chart

1. **Nomear o destino.** Sessao de grilling e domain-modeling para fixar o que este mapa esta
   procurando — a spec, a decisao, a mudanca. O destino fixa o escopo, entao vem primeiro
2. **Mapear a fronteira.** Grelhar de novo, agora **breadth-first** — abrir em leque pelo espaco
   inteiro em vez de fundo numa linha, revelando as decisoes abertas e os primeiros passos possiveis
   agora
3. **Se isso nao revelar nevoa** — o caminho ja esta claro, a jornada inteira cabe numa sessao —
   **voce nao precisa de mapa. Parar e perguntar como o usuario quer prosseguir**
4. **Criar o `MAP.md`**: destino e notas preenchidos, decisoes vazio, nevoa esbocada
5. **Criar os tickets que dao para especificar agora**, e ligar o `blocked-by` numa **segunda
   passada** — ids precisam existir antes de referenciar
6. **Disparar os subagentes de research** dos tickets `research` criados, em paralelo
7. **Parar.** Cartografar e o trabalho de uma sessao; nao resolve nada

O passo 3 e o que impede a skill de virar burocracia para trabalho que cabia numa sessao.

### Passo 9: passar a lente do plano01

`fog of war`, `frontier`, `destination` e `map` sao os termos-ancora — repetir como token. E
conferir que `FORMATS.md` levou o formato para fora da `SKILL.md`, que ja e a maior deste porte.

---

## Gotchas

- **G1** — Listar tickets abertos no mapa. Sao arquivos; o script os acha (INV-01).
- **G2** — Reafirmar a decisao no mapa alem do resumo. Duas versoes divergem.
- **G3** — Pre-fatiar a nevoa (INV-05).
- **G4** — Criar ticket e ligar bloqueio na mesma passada. Ids precisam existir.
- **G5** — Pular o passo 3 e cartografar trabalho que cabia numa sessao.
- **G6** — `harness:validate` faz link-check. Links `MAP.md` → `tickets/` precisam resolver, e ticket
  fechado nao pode virar link morto.

---

## Verificacao

### Checklist

- [ ] `bun run harness:validate` verde
- [ ] `disable-model-invocation: true`
- [ ] `FORMATS.md` com formato de mapa e de ticket; nada duplicado na `SKILL.md`
- [ ] Frontmatter de ticket com `blocked-by`, `type`, `status`, `claimed`
- [ ] `DI-Plano10-fase01-claim` registrado no MEMORY
- [ ] Os 4 tipos, com HITL/AFK e o ponteiro de religacao de cada degradacao
- [ ] Teste da nevoa presente, com a instrucao de nao pre-fatiar
- [ ] Out of scope com "fecha o ticket + uma linha na secao" e "nunca gradua"
- [ ] Modo chart com os 7 passos, incluindo a saida do passo 3
- [ ] Criacao e ligacao em duas passadas (G4)

### Teste em papel

- [ ] Pegar este proprio esforco de import (10 planos, decidido ao longo de varias sessoes) e
      verificar se o formato teria dado conta. **Se nao der, o formato esta errado** — foi
      exatamente um caso de wayfinder feito a mao

---

## Criterio de Aceite

**Por maquina:**
- `bun run harness:validate` exit 0
- 2 arquivos novos; links resolvem

**Por humano:**
- Ler o teste da nevoa e classificar, para um esforco seu, o que e ticket e o que e nevoa
- Saber quando **nao** usar wayfinder (passo 3)
- O teste em papel passou, ou o formato foi corrigido
