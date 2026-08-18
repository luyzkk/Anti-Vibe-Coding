---
title: "Junction de node_modules dentro de worktree: `git worktree remove --force` apaga o alvo real"
category: armadilha
tags: [windows, git, worktree, junction, node_modules, flake, controle-experimental, bun]
created: 2026-08-18
---

## Problem

Um teste (`skills/init/lib/registry.test.ts`) falhava de forma intermitente sob a suite completa —
~1 em 6 runs — e passava 5/5 isolado. Para saber se o flake era meu ou pre-existente, montei um
controle: um worktree no commit anterior, rodando a mesma suite.

Worktree novo nao tem `node_modules`, e `bun install` ali levaria minutos. Liguei por junction do
Windows:

```bash
cmd //c mklink //J "<worktree>\node_modules" "<repo>\node_modules"
```

O controle rodou e deu **tres falhas diferentes** das que eu investigava. Depois removi o worktree:

```bash
git worktree remove --force "<worktree>"
```

O `--force` apagou o conteudo do worktree **atravessando a junction** e esvaziou o `node_modules`
do repo principal. `ls node_modules | wc -l` → **0**.

O dano nao apareceu como "node_modules sumiu". Apareceu como **dois testes E2E falhando de forma
consistente** — 3/3 e 4/4 — que nao falhavam antes. Falha estavel e reprodutivel parece bug de
codigo, nao ambiente quebrado. Passei duas rodadas de diagnostico convencido de que tinha quebrado
alguma coisa no refactor de fixtures, ate rodar o teste isolado e ver a mensagem real:
`error: Cannot find package 'zod'`.

O controle experimental tambem era invalido por outro motivo, e por pouco eu nao concluia dele: o
`git worktree add` fez checkout com **CRLF** (`core.autocrlf` no Windows), enquanto o working tree
principal tinha LF nesses arquivos. As tres falhas do worktree eram artefato disso — uma delas era
literalmente um teste de hash byte-stable, e outra um golden snapshot. Nenhuma tinha relacao com o
flake que eu investigava.

## Solution

`bun install` — 140 pacotes, tudo verde de novo. Nenhum arquivo do projeto foi tocado; o estrago foi
inteiro em `node_modules`.

O flake original acabou diagnosticado **pelo mecanismo, nao pelo experimento**: apareceu um leftover
`.claude/stack.json.<pid>.<timestamp>.tmp` no repo apos uma run, e `registry.test.ts:43` roda os
Steps 9-11 com `cwd: process.cwd()` — o repo vivo — enquanto outros testes escrevem
`.claude/stack.json` na mesma raiz. `10-final-validation.ts:24` le exatamente esse caminho. Corrida,
nao regressao. Registrado como item novo no `TODO.md`.

## Prevention

- **Nunca criar junction (`mklink /J`) ou symlink para `node_modules` dentro de um worktree.**
  `git worktree remove --force` atravessa e apaga o alvo. Se o worktree precisa de deps, `bun install`
  nele mesmo, ou aceitar que o experimento custa minutos.
- **Worktree nao e controle limpo em repo Windows.** `git worktree add` refaz checkout aplicando
  `core.autocrlf`; qualquer teste de hash, snapshot byte-stable ou contagem de bytes muda de veredito
  sem que uma linha de codigo tenha mudado (`docs/compound/2026-08-12-delta-de-corpo-so-vale-medido-em-lf.md`).
  Para comparar duas versoes do codigo no mesmo working tree, `git stash` e mais fiel.
- **Falha nova e *consistente* apos mexer no ambiente e suspeita de ambiente, nao de codigo.** A
  intuicao diz o contrario — flake parece ambiente, falha estavel parece bug. Aqui foi ao contrario:
  o flake era codigo (corrida real) e a falha estavel era `node_modules` vazio.
- **Ler a mensagem de erro do teste antes de teorizar sobre a causa.** `bun run test` agregado mostrava
  so `(fail) <nome do teste>`; rodar o arquivo sozinho mostrou `Cannot find package 'zod'` na primeira
  linha. Duas rodadas de diagnostico foram gastas por nao ter feito isso primeiro.
- **Quando o controle produz falhas que o alvo nao tem, o controle esta contaminado — descartar, nao
  interpretar.** Tres falhas inesperadas no worktree eram sinal de que o ambiente diferia, nao dado
  sobre o flake.

## Affected files

- `skills/init/lib/registry.test.ts` — o flake que originou a investigacao (item novo no `TODO.md`)
- `skills/init/lib/steps/10-final-validation.ts` — le `.claude/stack.json` do `cwd` recebido
- `docs/compound/2026-08-12-delta-de-corpo-so-vale-medido-em-lf.md` — CRLF mudando medicao de bytes
- `docs/compound/2026-05-14-git-stash-parallel-processes.md` — o outro jeito de o git morder neste repo
