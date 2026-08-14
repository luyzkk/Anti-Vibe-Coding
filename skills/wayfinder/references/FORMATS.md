# Formato do mapa e do ticket

O que cada artefato do wayfinder contem. As regras de julgamento — o que e fog e o que e ticket, o
que sai de escopo, por que o mapa e indice — vivem na [`SKILL.md`](../SKILL.md).

## Onde os artefatos vivem

Dentro da pasta datada do esforco, ao lado do que ja existe:

```
docs/exec-plans/active/{data}-{slug}/
├── MAP.md
└── tickets/
    ├── 001-{slug}.md
    └── 002-{slug}.md
```

Numeracao sequencial de 3 digitos, atribuida na criacao e nunca reaproveitada — e a identidade do
ticket. O numero ordena o arquivo e resolve bloqueio; quem aparece na narracao e o titulo.

Um esforco cartografado aqui pode depois ganhar `PRD.md`, `PLAN.md`, `STATE.md` e `planoNN/` na mesma
pasta: sao estagios seguintes do mesmo trabalho, e wayfinder vem antes deles no pipeline.

## `MAP.md`

O esforco inteiro em baixa resolucao, carregado uma vez por sessao. As decisoes ficam nos tickets; o
mapa indexa.

```markdown
## Destination

<o que chegar ao fim deste mapa significa — a spec, a decisao ou a mudanca que este esforco esta
procurando. Uma ou duas linhas; toda sessao se orienta por isso antes de escolher ticket.>

## Notes

<dominio; skills que toda sessao deve consultar; preferencias permanentes deste esforco>

## Decisions so far

<!-- o indice: uma linha por ticket fechado, o bastante para julgar relevancia. O detalhe fica no
     ticket, alcancado pelo link. Ver "O mapa e indice, nao deposito" na SKILL.md -->

- <titulo do ticket fechado, como link para tickets/NNN-slug.md> — <resumo de uma linha da resposta>

## Not yet specified

<!-- fog of war em escopo, ainda sem nitidez para virar ticket; gradua conforme a fronteira avanca.
     Ver "Fog of war" na SKILL.md -->

## Out of scope

<!-- trabalho posto fora do destino; fechado, nunca gradua. Ver "Out of scope" na SKILL.md -->
```

Os tickets **abertos** ficam de fora do mapa: sao arquivos em `tickets/`, e quem os encontra e o
script `wayfinder:frontier`.

Cada linha de *Decisions so far* e um link markdown: o texto e o **titulo** do ticket, o alvo e o
arquivo dele em `tickets/`. E o que faz o mapa referir por nome e ainda assim dar zoom.

### Decisao revista

Uma linha de *Decisions so far* pode ser **superseded** quando uma sessao posterior descobre que a
decisao estava errada. A linha nova nomeia a que corrige, e a antiga permanece:

```markdown
- <titulo do ticket original, linkado> — <a decisao original>. **Superseded por**
  <titulo do ticket que corrigiu, linkado> — <o que mudou e o que revelou o erro>
```

Sobrescrever a linha antiga jogaria fora a parte mais cara: *por que* a decisao anterior parecia
certa. Quem le o mapa depois precisa disso para nao repetir o erro pelo mesmo caminho.

## O ticket

Um arquivo por ticket, em `tickets/NNN-{slug}.md`. O corpo e a pergunta, dimensionada para **uma
sessao de agente**.

```markdown
---
id: 007
title: Onde vive o glossario de linguagem ubiqua
type: grilling
status: open
blocked-by: [003, 005]
claimed:
out-of-scope: false
---

## Question

<a decisao ou investigacao que este ticket resolve>
```

| Campo | Valores | Para que |
|---|---|---|
| `id` | 3 digitos, casando com o nome do arquivo | Identidade; e o que `blocked-by` referencia |
| `title` | frase curta | O nome pelo qual o ticket e referido em tudo que o humano le |
| `type` | `research` · `prototype` · `grilling` · `task` | Decide como resolve, e se e HITL ou AFK |
| `status` | `open` · `closed` | Ticket fechado sai da fronteira e vira linha em *Decisions so far* |
| `blocked-by` | lista de ids, `[]` quando nao ha | As arestas do grafo. Desbloqueado = todos fechados |
| `claimed` | vazio, ou timestamp + identificador | Sessao em andamento; ver abaixo |
| `out-of-scope` | `true` · `false` | Marca o que foi posto fora do destino. Fica fora da fronteira mesmo aberto |

A **resposta** nao faz parte do corpo inicial — e gravada na resolucao. Ativos criados enquanto o
ticket e resolvido (prototipos, branches de research, documentos) entram como **link**, para o ticket
seguir do tamanho de uma pergunta.

### Reivindicar um ticket

No tracker da fonte, reivindicar e atribuir a issue a si mesmo, e o assignee **e** a reivindicacao.
Em markdown local nao ha assignee, entao o campo `claimed` carrega **timestamp ISO-8601 mais um
identificador** — a branch e o default natural, porque e o que separa duas sessoes paralelas:

```yaml
claimed: 2026-08-14T15:30 feat/wayfinder
```

Campo vazio ou ausente significa nao reivindicado. Reivindicar acontece **antes de qualquer
trabalho**, para uma sessao concorrente pular o ticket.

**Reivindicacao envelhece.** Passadas **24 horas** num ticket ainda aberto, a reivindicacao esta
morta — a sessao que a fez terminou sem fechar o ticket — e ele volta para a fronteira, sinalizado
como reivindicacao vencida. E o que faz o timestamp valer mais que uma flag booleana: uma flag so
sairia a mao, e ninguem lembra de limpar a de uma sessao que morreu.
