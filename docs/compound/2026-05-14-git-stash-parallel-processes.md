---
title: "git stash em repos com processos concorrentes reverte edições silenciosamente"
category: armadilha
tags: [git, stash, concurrency, subagents, regression-verification]
created: 2026-05-14
---

## Problem

Durante verificação de regressão em uma fase, o uso de `git stash` para "limpar" o working tree e rodar testes baseline reverteu silenciosamente edições de arquivos que outros processos (ou a sessão principal) estavam modificando. O `stash pop` posterior conflitou com fixtures que sobreviveram como arquivos novos (não rastreados), mas as edições em arquivos existentes foram perdidas.

Descoberto no Plano 04 do v6.1.0: edições em `agents/*.md` desapareceram. Só descoberto no Plano 05 quando `checkAgentContracts()` validou o estado real do repo.

## Solution

Para testar baseline sem perder trabalho em andamento:

```bash
# Em vez de: git stash && bun test && git stash pop

# Opção A: verificar apenas os arquivos modificados diretamente
git diff path/to/file.ts

# Opção B: criar branch temporária de verificação
git stash branch verify-baseline
bun test
git checkout main  # descarta a branch de verificação

# Opção C: rodar testes em worktree separada (execute-plan worktree mode)
```

Nunca usar `git stash` quando há múltiplos processos editando arquivos no mesmo working tree.

## Prevention

- Substituir `git stash` por `git diff <arquivo>` nas verificações de regressão local
- Em plan-executor, instrução: "para verificar se esta fase causou regressão, rodar `bun test` diretamente — não limpar o working tree antes"
- Se precisar de working tree limpo: usar worktree (`git worktree add`) em vez de stash
