---
title: "Import de valor novo num teste existente derruba o modulo inteiro no Bun — e mata o RED por assertion"
category: armadilha
tags: [bun, esm, tdd, red-green, import, test-isolation, subagent]
created: 2026-09-06
---

## Problem

Ciclo TDD normal: escrever o teste, ver falhar por **assertion**, implementar, ver passar. A mensagem do
RED e o que prova que o teste mede a coisa certa.

No Bun (ESM estrito), acrescentar um `import { novaFuncao } from './modulo'` a um arquivo de teste **que
ja existe** nao produz RED por assertion. Produz:

```
SyntaxError: Export named 'buildContractIssues' not found in module '.../route-auth-matrix.ts'
```

O modulo de teste inteiro e **recusado antes de rodar**. Os 30 testes preexistentes daquele arquivo
aparecem como falha junto. O RED que a fase descrevia (`Expected length: 1, Received length: 0`) nunca
acontece — e quem le o relatorio nao consegue distinguir "a defesa nao existe ainda" de "quebrei o
arquivo de teste".

O modo de falha perigoso vem depois: um executor que **esperava** uma mensagem de assertion e recebeu um
SyntaxError tem todo incentivo para reportar a mensagem que o documento previa. Ai o RED vira teatro.

## Solution

Separar em dois passos dentro da mesma fase:

1. **Testes que so leem campos novos** (`summary.g2`, `finding.trigger`) — nenhum import novo. O modulo
   carrega, e o RED e honesto: `Expected: {...}, Received: undefined`, ou um `TypeError` em runtime sobre
   o campo inexistente. E o RED que se quer observar.
2. **Testes que importam simbolo novo** (`verdictFor`, `readNextjsCoverageAtBase`) — passo separado, com o
   RED de compilacao **aceito e declarado**. A defesa desses e provada depois do GREEN, mutando o alvo e
   vendo o teste cair.

Regra pratica: o import novo entra junto com o teste que o usa, nunca junto do teste cujo RED se quer ler.

## Prevention

**Regra: RED de compilacao e um RED valido, mas nao e prova de nada — a prova e a mutacao pos-GREEN.**
Quando a fase previr "RED por assertion" e o executor receber SyntaxError, isso e informacao, nao erro a
esconder. Reportar a divergencia; nunca reescrever a mensagem para bater com o documento.

**Sinal de alerta:** um RED em que testes preexistentes tambem falham. Teste novo derrubando teste velho
quase sempre significa modulo recusado, nao regressao.

**Vale alem do Bun:** qualquer runner ESM estrito (Node com `--experimental-vm-modules`, Vite/Vitest em
modo ESM) recusa o modulo inteiro por export ausente. O padrao de dois passos e portavel.

## Affected files

- `skills/security/lib/route-auth-matrix.test.ts`, `route-auth-nextjs.test.ts` (ordem dos passos nas 3 fases)
- Descoberto em: `docs/exec-plans/active/2026-09-02-route-auth-matrix-audit/plano02/MEMORY.md`
  (GT-fase02-1, DI-fase02-1) — PR #75
- Aplicado por desenho no Plano 03 (G5 do README): PR #76 — os 3 REDs saíram como previstos
- Nota irma: [2026-09-06-a-defesa-so-esta-provada-pela-mutacao.md](./2026-09-06-a-defesa-so-esta-provada-pela-mutacao.md)
