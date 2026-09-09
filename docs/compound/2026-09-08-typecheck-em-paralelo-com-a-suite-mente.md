---
title: "`typecheck` em paralelo com a suite da falso `TS6053` — a suite mexe em `tests/__fixtures__/`"
category: armadilha
tags: [typecheck, tsc, bun-test, concorrencia, falso-negativo, tsconfig, verificacao]
created: 2026-09-08
---

## Problem

Para ganhar tempo, rodei `bun run test` em background e `bun run typecheck` ao mesmo tempo. O typecheck
falhou:

```
error TS6053: File 'tests/__fixtures__/harness-advanced/scripts/harness-validate.ts' not found.
  The file is in the program because:
    Matched by include pattern '**/*.ts' in tsconfig.json
```

Nada estava quebrado. A suite deste repo **cria e remove** arquivos em `tests/__fixtures__/` durante a
execucao (testes de scaffold, de rollback, de init). O `tsconfig.json` inclui `**/*.ts`. O `tsc` pegou
a janela em que o arquivo nao existia e reportou erro de compilacao.

Rodado sozinho, depois da suite terminar: **exit 0**.

O perigo nao e perder tempo — e a **direcao** do erro. Um falso negativo de typecheck durante uma
verificacao de fase pode: (a) fazer voce "consertar" codigo que estava certo; (b) ser descartado como
flake e mascarar um erro real na proxima vez. Verificacao que mente e pior que verificacao ausente,
porque consome confianca.

## Solution

**Rodar as verificacoes em sequencia**, nunca concorrentes com a suite:

```bash
bun run test        # espera terminar
bun run typecheck   # so depois
```

Se o objetivo for paralelismo, o que pode correr junto e o que **nao toca o disco compartilhado**
(`agents:contract` le so um arquivo; `harness:validate` le `docs/`). `typecheck` nao pode, porque o
programa dele e definido por glob sobre a arvore inteira.

## Prevention

**Regra: verificacao cujo programa e definido por glob (`**/*.ts`) nao pode correr em paralelo com algo
que mexe na arvore.** Vale para `tsc`, para linters com glob e para qualquer validador que enumere
arquivos no inicio e leia depois.

**Sinal de alerta:** erro de verificacao apontando arquivo em `tests/__fixtures__/`, `tmp/`, ou
qualquer diretorio que a suite gera. Antes de investigar o codigo, **re-rodar sozinho**. Se passa, era
corrida.

**Nao "consertar" o tsconfig por causa disso.** Excluir `tests/__fixtures__` do `**/*.ts` mudaria o que
e typechecado de verdade para calar um sintoma de concorrencia. O problema e a ordem de execucao, nao
o escopo do typecheck.

**Relacionado:** [2026-05-14-git-stash-parallel-processes.md](./2026-05-14-git-stash-parallel-processes.md)
— mesma familia: processo que mexe na arvore enquanto outro le.

## Affected files

- `tsconfig.json` (o `include: **/*.ts` que torna o `tsc` sensivel a arvore) — **nao alterado**
- Descoberto em: `docs/exec-plans/completed/2026-09-02-route-auth-matrix-audit/plano04/MEMORY.md`
  (GT-fase04-1) — falha auto-infligida do orquestrador durante a verificacao da fase-04, PR #77
