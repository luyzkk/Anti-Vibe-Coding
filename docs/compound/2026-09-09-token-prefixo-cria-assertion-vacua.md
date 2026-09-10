---
title: "Token que é prefixo de outro cria assertion vácua — e só a varredura por mutação encontra"
category: armadilha
tags: [gate-de-paridade, assertion, mutacao, regex, teste-de-texto, verificacao, GT-1]
created: 2026-09-09
---

## Problem

Escrevi no gate de paridade uma assertion para guardar a instrução que manda o orquestrador **armar**
a âncora imutável:

```ts
expect(step4c, '...').toMatch(/ARMAR ANCORA/)
```

A assertion passava. Ela também passava com a instrução **apagada**, porque o mesmo bloco contém a
linha do desarme, e `ARMAR ANCORA` casa dentro de `DESARMAR ANCORA`. O gate ficava verde guardando
nada.

Três coisas não pegaram isso:

- **Escrever a assertion.** Eu tinha acabado de escolher o token.
- **Reler o texto.** A palavra aparece uma vez só como palavra; o olho conta certo.
- **O RED do próprio teste.** Ele falhou antes da implementação, como devia — mas falhou porque as
  DUAS linhas estavam ausentes, não porque a do armar estava.

Quem pegou foi a varredura linha a linha do bloco: apagar uma linha por vez, rodar o gate, anotar
quais assertions caem. A do armar não caiu com deleção nenhuma, e essa é a assinatura da assertion
vácua.

O detalhe que generaliza: `\b` não resolve. Não há fronteira de palavra entre `DES` e `ARMAR`, porque
`DESARMAR` é uma palavra só.

## Solution

Ancorar o padrão em algo que o outro token não tem. No caso, o marcador de bullet:

```ts
).toMatch(/- ARMAR ANCORA/)
```

Provado por mutação depois da correção: apagar a linha do armar derruba exatamente esse teste, e a
restauração foi conferida por `diff`.

## Prevention

- Antes de confiar num `toContain` ou `toMatch` sobre texto, pergunte não só **quantas vezes o token
  aparece**, mas **se ele é substring de outro token do mesmo bloco**. A contagem por palavra não
  pega esse caso; a busca por substring pega.
- Quando um bloco tem um par de operações opostas (armar/desarmar, abrir/fechar, ligar/desligar),
  desconfie: o nome de uma costuma conter o nome da outra.
- Para gate de paridade sobre texto, a **varredura linha a linha** vale mais que uma lista de
  mutações escolhidas a dedo. A lista prova o que você lembrou de mutar; a varredura acha o que você
  não lembrou. Custa um laço e alguns minutos.
- Assertion que nenhuma deleção derruba é assertion vácua, mesmo que tenha falhado no RED.

## Affected files

- `tests/fase-template-tdd-contract.test.ts` — a assertion corrigida, com o motivo do prefixo escrito
  na própria mensagem de falha
- `docs/exec-plans/completed/2026-09-09-honestidade-de-config.md` — plano onde o achado está no log
- `docs/design-docs/ADR-0023-honestidade-config-tdd-gate.md` — a decisão que a assertion guarda
- Generaliza o GT-1 do handoff de 2026-09-09 ("antes de confiar num `toContain`, conte as ocorrências
  do token") para o caso que a contagem não resolve
