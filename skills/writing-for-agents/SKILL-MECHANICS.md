# Skill Mechanics

Ramo especifico de skill de [`writing-for-agents`](./SKILL.md): o que muda quando o documento e uma
skill — frontmatter, a escolha de invocacao e router skills. Todo o resto da escrita e a referencia
universal em `SKILL.md`.

## Invocation

A fonte original desta referencia trabalha com dois estados (com e sem description). Nosso harness
tem oito campos de frontmatter, e a escolha de invocacao se espalha por tres deles. Numeros de uso
medidos em 2026-08-11 sobre as 39 skills com `SKILL.md`.

| Campo | Quando usar | Custo | Uso hoje |
|---|---|---|---|
| `disable-model-invocation: false` | o agente precisa alcancar a skill sozinho, ou outra skill precisa | description sempre carregada | 36/39 |
| `disable-model-invocation: true` | so o humano dispara | zero context load; paga cognitive load | 0/39 |
| `user-invocable: true` | aparece no listing de slash-commands | — | 39/39 |
| `allowed-tools` | o menor conjunto que faz o trabalho | superficie de risco | 39/39 |
| `argument-hint` | a skill aceita argumento | 1 linha | 38/39 |
| `context: fork` | subtarefa relacionada que herda o contexto pai | cache-otimizado | 1/39 |
| `agent: <tipo>` | delega a subagente com contexto limpo | isolamento vs. custo de re-descoberta | 1/39 |
| `kind` | classifica a skill para tooling do repo | 1 linha | 1/39 |

Escolha model-invocation so quando o agente precisa alcancar a skill por conta propria, ou quando
outra skill precisa. Se ela so dispara na mao, `disable-model-invocation: true` e o context load cai
a zero.

**O achado que esta secao registra.** As 3 skills sem o campo (`init`, `sync`, `update`) omitem e
omitir e o mesmo default. Somando: **nenhuma skill deste repo e user-invoked-only** — as 39 pagam
description permanente e nenhuma colhe o trade-off que a fonte descreve. Isso e condicao de partida,
nao recomendacao; quanto disso se justifica e o que a auditoria mede.

Reforcando a conta: o hook `SessionStart` relista 23 dessas skills com descricao propria — o mesmo
significado carregado duas vezes por sessao.

## Dividir por invocacao

O corte por sequencia vive em [`SKILL.md`](./SKILL.md); este e o corte por invocacao. Separe uma
skill model-invoked nova quando existe uma leading word distinta que deve dispara-la sozinha — uma
palavra que voce de fato usa nos seus prompts — ou quando outra skill precisa alcanca-la. Voce paga
context load pela description nova e sempre carregada, entao esse alcance independente tem que valer.

Reference compartilhada por duas skills user-invoked nao pode morar em nenhuma das duas: sem
description, nenhuma alcanca a outra. Empurre para um arquivo simples fora do sistema de skills —
reference externa que qualquer skill aponta. E o que `skills/lib/*.md` ja e.

## Router skills

Quando skills user-invoked se multiplicam alem do que o humano lembra, o cognitive load acumulado se
cura com uma **router skill**: uma skill user-invoked que nomeia as outras e diz quando alcancar cada
uma, para o humano ter uma skill para lembrar em vez de muitas. Ela so consegue sugerir, nunca
disparar — skill user-invoked nao tem description, entao nada alem do humano a alcanca.

Neste repo o papel de router e ocupado pelo hook `SessionStart`, nao por uma skill. Ele e o que
tornaria viavel flipar skills para `disable-model-invocation: true` sem perde-las de vista.
