---
title: "Use git revert range syntax, not a loop, to reverse N commits"
category: process
tags: [git, release, rollback, revert]
created: 2026-05-12
---

## Problem

Rollback test em Plano 09 fase-05 falhou no Level 2.1 (`package.json version != 5.3.0`) com output mostrando:

```
Revert "chore(release): bump version to 6.0.0"
Reapply "chore(release): bump version to 6.0.0"
Revert "Reapply chore(release)..."
```

Causa: o script usava loop `for i in $(seq 1 N); do git revert --no-edit HEAD; done`. Cada `git revert HEAD` reverte o commit no topo. Depois do primeiro revert, o NOVO topo é o commit de revert. O segundo `git revert HEAD` reverte o revert — efetivamente reaplicando o original. O loop oscila entre revert e reapply, e a soma final depende da paridade de N.

## Solution

Substituir por range syntax (disponível desde git 1.7.2, 2010):

```bash
git revert --no-edit "HEAD~${N}..HEAD"
```

Esse comando reverte cada commit do range em ordem reversa, criando N commits de revert individuais e atômicos. O ponteiro HEAD avança em cada iteração interna do git, então não há oscilação.

Após o fix, rollback test passou 9/9 checkpoints.

## Prevention

- **Loop `git revert HEAD` é um anti-pattern para N>1.** Sempre que precisar reverter múltiplos commits sequenciais, usar range syntax.
- A documentação `man git-revert` mostra range syntax mas não destaca a armadilha do loop — fácil de inferir errado por analogia a outros loops shell.
- Em scripts de release, testar contra cenário real (commit, revert, verificar) antes de confiar — a oscilação só aparece em runtime, não em revisão estática.
- Override por env var (`REVERT_COUNT=N`) é útil para hotfixes que adicionam/removem commits ao release set.

## Affected files

- `anti-vibe-coding/tests/rollback.sh` (linhas 62-66: range syntax substituindo loop)
- Discovery em: `.planning/2026-05-11-v60-harness-compound-fusion/plano09/MEMORY.md` (DI-07)
- Commit: `4c18844` (`test(release): add rollback validation against legacy-v5 fixture`)
