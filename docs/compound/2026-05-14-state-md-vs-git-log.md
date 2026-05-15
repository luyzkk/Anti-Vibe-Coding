---
title: "STATE.md reivindicando trabalho não commitado — session memory vs git são fontes diferentes"
category: armadilha
tags: [execute-plan, git, state-md, session-memory, verification]
created: 2026-05-14
---

## Problem

O STATE.md (e o orquestrador do execute-plan) registrava fases como "concluídas" baseado em memória de sessão — sem cruzar com `git log`. O resultado foi que 13 arquivos `agents/*.md` foram declarados migrados no STATE mas nunca tiveram commits em git.

Descoberto no Plano 05 fase-01: `checkAgentContracts()` detectou que os 13 prompts ainda não tinham contrato v1. Investigação forense com `git log -- agents/<file>` confirmou: zero commits dos Planos 01-04 tocaram esses arquivos. A causa provável foi `git stash` durante verificação de regressão que reverteu as edições silenciosamente (GT-06 do Plano 04).

Custo: ~3h de remediação (reescrever 13 prompts + corrigir broken-links + commit unificado).

## Solution

Antes de marcar uma fase como concluída no STATE.md, verificar que os arquivos afetados têm commit real:

```bash
git log --oneline -- agents/security-auditor.md
# Se vazio: a fase NÃO foi commitada — não marcar como concluída
```

Para fases que dizem "N arquivos migrados", verificar a lista exata antes de fechar o STATE.

## Prevention

- O execute-plan Step 4d deve cruzar `payload.tasks_completed[]` com `git log -- <path>` antes de atualizar STATE.md
- Nunca confiar em memória de sessão para confirmar que um commit aconteceu — `git log` é a única fonte de verdade
- Se um subagente reporta sucesso mas o hook de pre-commit bloqueou, o trabalho NÃO foi commitado — investigar antes de fechar a fase

## See Also

- BUG-P05-01 em `docs/exec-plans/completed/2026-05-14-v6.1.0-subagent-contract/plano05/MEMORY.md`
- GT-06 (git stash reverteu edições): plano04/MEMORY.md
