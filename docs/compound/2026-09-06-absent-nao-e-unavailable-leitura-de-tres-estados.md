---
title: "`absent` nao e `unavailable`: leitura da base precisa de tres estados, nao de nullable"
category: pattern
tags: [seam, git, base-read, security, fail-closed, route-auth-matrix, api-design]
created: 2026-09-06
---

## Problem

O seam que le um arquivo na ponta ANTES de um diff nasceu como
`readAtBase?: (file: string) => string | null`. `null` significava "nao consegui te dar o conteudo" —
e colapsava dois fatos com consequencias **opostas**:

- **o arquivo nao existia naquele commit** → nao havia cobertura antes → *nada pode ter sido perdido*
- **o git falhou / a ref nao resolve / o clone e shallow** → *nao da para saber* se algo foi perdido

Enquanto o unico consumidor era a allowlist, dava para viver com isso: um arquivo de allowlist ausente
e uma allowlist vazia sao a mesma coisa, e o leitor podia devolver `"{\"routes\":[]}"`. No momento em que
um segundo consumidor (a cobertura de middleware, G2) passou a usar o mesmo seam, o truque quebrou: um
leitor generico nao pode devolver um literal de allowlist vazia para "ausente".

Colapsar os dois e um **falso negativo silencioso em check de seguranca**: "nao consegui ler a base"
seria tratado como "nao havia nada la", e o auditor aprovaria um diff que na verdade nao soube avaliar.

## Solution

Tres estados explicitos, cada um com consequencia propria:

```ts
type BaseRead =
  | { status: 'found'; source: string }
  | { status: 'absent' }
  | { status: 'unavailable'; reason: string }
```

| Estado | Significado | Consequencia no G2 |
|---|---|---|
| `found` | conteudo lido | reconstroi a cobertura anterior e compara ponta a ponta |
| `absent` | nao havia arquivo naquele commit | zero cobertura antes → **nada a perder**, `before: 'resolved'` |
| `unavailable` | nao deu para olhar (+ `reason`) | toda rota aberta vira `indeterminada` MEDIO **com o motivo** |

O `reason` viaja ate a evidence do finding — quem le o relatorio ve *por que* ficou indeterminado, nao
so *que* ficou.

## Prevention

**Regra: quando um leitor pode falhar E o alvo pode legitimamente nao existir, esses sao estados
diferentes.** `T | null` so basta quando as duas situacoes levam a mesma decisao. Se levam a decisoes
opostas — e em codigo de seguranca elas quase sempre levam — o tipo tem que separar, e o estado de falha
carrega a razao.

**Sinal de alerta:** um seam com `| null` ganhando o **segundo** consumidor. O primeiro consumidor quase
sempre consegue disfarcar a ambiguidade com um valor default plausivel (`[]`, `""`, `{}`); o segundo
expoe que o default era uma mentira especifica daquele caso. Revisar o tipo ao adicionar o segundo
chamador e mais barato que descobrir depois qual dos dois estava errado.

**Teste que trava isso:** um caso por estado, e um teste que prova que `absent` **nao** produz o mesmo
resultado que `unavailable`. Mutar o ramo `absent` para devolver `unavailable` tem que quebrar o suite —
se nao quebra, os dois estados sao decorativos.

## Affected files

- `skills/security/lib/route-auth-matrix.types.ts` (`BaseRead`, `CoverageAtBase`, `isCoverageUnavailable`)
- `skills/security/lib/route-auth-nextjs.ts` (`readNextjsCoverageAtBase`: os tres ramos)
- Decidido em: `docs/exec-plans/completed/2026-09-02-route-auth-matrix-audit/plano02/MEMORY.md` (DEV-plan-2,
  refinamento da DP-11) — PR #75; consumido pelo Plano 03 (DP-6) — PR #76
- Nota irma: [2026-09-06-git-cat-file-rev-path-e-mensagem-de-erro.md](./2026-09-06-git-cat-file-rev-path-e-mensagem-de-erro.md)
