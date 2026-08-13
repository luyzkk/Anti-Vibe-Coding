---
title: "Duas fontes de verdade em conflito: quem decide sao os artefatos que elas geraram, e a resposta pode nao ser nenhuma das duas"
category: processo
tags: [fonte-de-verdade, contradicao, template, grill-me, evidencia, never-diminish, decisao]
created: 2026-08-13
---

## Problem

`skills/grill-me/SKILL.md` carregava **dois** templates de `CONTEXT.md` que se contradiziam, de
2026-05 a 2026-08:

| Onde | Formato |
|---|---|
| `## Passo 5` | `## Decisions` / `### D1:` com Categoria, Pergunta, Resposta, Alternativa rejeitada, Razao, Origem |
| `## Pipeline Integration` | `## Decisoes Confirmadas` / `## Requisitos Funcionais` / `## Riscos Identificados` |

O segundo veio de um plano v5 separado (`.claude/tasks/prd-v5/17/task-02`) que nunca reconciliou com
o primeiro. A frase de abertura dele dizia literalmente *"(ver Passo 5)"* e logo abaixo mostrava
outra coisa.

Eu ia canonizar o Passo 5 e cortar o outro, com **dois argumentos bons**:

1. O teste de contrato (`tests/grill-me-contract.test.ts:202`) ja declarava `## Decisions` como o
   contrato de saida que o `write-prd` importa. Havia gate travando um dos lados.
2. As cinco secoes do template rival — Requisitos Funcionais, Nao-Funcionais, Restricoes,
   Trade-offs, Riscos — **todas** ja eram secoes do PRD gerado pelo `write-prd`
   (`skills/write-prd/SKILL.md:165-178`: MoSCoW, Nao-funcionais, Dependencias, Decisoes tecnicas,
   Riscos). O template rival estava pedindo ao `grill-me` que produzisse o PRD. Separacao de
   responsabilidade limpa.

Os dois argumentos estavam corretos e a conclusao estava errada.

Fui olhar os `CONTEXT.md` que a skill **de fato produziu**. Os dois arquivos reais do repo —
`2026-05-20-wont-capture-skill` e `2026-05-28-workflow-awareness` — nao escolheram nenhum dos
formatos: **fundiram os dois**, com estrutura identica e oito dias de diferenca.

```
# Context: {Feature}          ← Passo 5
## Resumo Executivo           ← NENHUM dos dois templates pedia
## Decisions                  ← Passo 5
## Requisitos Funcionais      ┐
## Requisitos Nao-Funcionais  │
## Restricoes                 ├ Pipeline Integration
## Trade-offs Discutidos      │
## Riscos Identificados       ┘
## Open Questions             ← Passo 5
## Recommended Next Steps     ← Passo 5
```

Duas coisas que so o artefato revela: a convergencia e **estavel** (mesma estrutura, duas sessoes
independentes — nao e sorteio, que era a hipotese registrada na divida), e ha uma secao que **nenhum
dos dois documentos pede** e que os dois arquivos consideraram necessaria.

Cortar teria removido o que 2 de 2 artefatos reais usavam — diminuir o formato, com a bencao de dois
argumentos corretos.

## Solution

Quando duas fontes de verdade se contradizem, a ordem de evidencia e:

1. **Os artefatos que elas geraram.** Sao o unico registro do que aconteceu quando as duas estavam
   valendo ao mesmo tempo. Listar os headings/campos reais de cada um e cruzar com os dois
   templates: o que aparece em todos os artefatos e load-bearing, independente de qual doc o pedia.
2. **O que cada consumidor a jusante de fato le.** Aqui, `write-prd` e `design-twice` leem o
   `CONTEXT.md` como prosa — nao ha parser, entao "quebrar o contrato" era menos grave do que
   parecia, e "empobrecer o conteudo" era mais.
3. **Os gates que ja existem.** O teste travava um lado, mas gate nao e argumento sobre merito: ele
   registra o que alguem decidiu antes, com menos informacao do que voce tem agora.
4. **O argumento de design.** Ultimo, nao primeiro.

A resposta foi a **uniao**: o esqueleto do Passo 5, o `## Resumo Executivo` que os artefatos
inventaram, e as cinco secoes rivais marcadas como **opcionais** — porque o argumento 2 continuava
valendo em parte (requisito detalhado e MoSCoW sao do PRD), mas nao a ponto de apagar as secoes.

Quando a divida foi registrada, a hipotese era "o agente escolhe um por sorteio". Ela sobreviveu
meses sem ser checada porque ninguem tinha aberto os arquivos gerados.

## Prevention

- **Antes de escolher entre duas fontes conflitantes, abra os artefatos que elas produziram.**
  `grep -rl` pelos headings rivais nas pastas de output. Se a contradicao existe ha tempo, existe
  amostra — e ela responde o que nenhuma leitura dos dois documentos responde.
- **Convergencia repetida e sinal, nao coincidencia.** Dois artefatos com a mesma estrutura, escritos
  em sessoes independentes, valem mais que qualquer argumento sobre qual template e melhor. Um so
  artefato e anedota; dois iguais ja e comportamento.
- **Procure o que esta nos artefatos e em nenhum template.** Foi assim que o `## Resumo Executivo`
  apareceu. Campo que o gerador nao pede e o artefato tem duas vezes e requisito descoberto pelo uso.
- **Gate existente nao encerra a discussao de merito.** Um teste que trava um lado registra uma
  decisao anterior; ele impede regressao silenciosa, nao prova que aquele lado esta certo.
- Le junto com `docs/compound/2026-08-12-secao-nao-se-classifica-por-nome-de-heading.md` — la, o
  sinal barato era o nome do heading, e a cura era ler o conteudo do proprio documento. Aqui a
  analise interna estava completa e ainda assim insuficiente: a evidencia decisiva estava **fora**
  dos dois documentos. E com `docs/compound/2026-05-19-never-diminish-andre.md`, que e o custo de
  errar isto — o corte teria diminuido o output de toda entrevista futura.

## Affected files

- `skills/grill-me/SKILL.md` — Passo 5 (template unico) e `## Pipeline Integration` (agora ponteiro)
- `tests/grill-me-contract.test.ts` — 8 assercoes novas (26 -> 34); duas validadas no RED
- `docs/exec-plans/active/2026-05-20-wont-capture-skill/CONTEXT.md` — artefato 1
- `docs/exec-plans/active/2026-05-28-workflow-awareness/CONTEXT.md` — artefato 2
- `skills/write-prd/SKILL.md:165-178` — a tabela de secoes do PRD, base do argumento 2
- `.claude/tasks/prd-v5/17/task-02-pipeline-integration-grill-me.md` — origem do segundo template
