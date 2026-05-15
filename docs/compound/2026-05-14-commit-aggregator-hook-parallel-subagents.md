---
title: "Pre-commit hook global + subagentes paralelos = armadilha de commit individual"
category: armadilha
tags: [subagents, execute-plan, git, husky, parallelism, commit]
created: 2026-05-14
---

## Problem

Quando subagentes paralelos tentam fazer commit individualmente de seus arquivos, o pre-commit hook (que valida o estado global do repo — ex: `bun run harness:validate`) falha em cada um porque o estado é intermediário: os outros batches ainda não foram staged.

Descoberto no Plano 05 da feature v6.1.0: 3 subagentes paralelos editaram `agents/*.md` e tentaram commitar individualmente. O hook bloqueou todos porque:
1. Cada batch via um estado de validação incompleto (outros arquivos do outro batch ausentes)
2. Broken-links pré-existentes apareceram de uma vez quando os arquivos entraram em git pela primeira vez

Resultado: zero commits individuais + hora de diagnóstico + commit manual do orquestrador.

## Solution

**Padrão "Commit Aggregator":** subagentes EDITAM e REPORTAM; orquestrador AGREGA + faz commit único.

```
Subagente A → edita agents/react-auditor.md (sem commit)
Subagente B → edita agents/solid-auditor.md (sem commit)
Subagente C → edita agents/code-smell-detector.md (sem commit)
             ↓
Orquestrador → git add agents/*.md && git commit -m "feat(agents): migrate batch X"
```

O commit único do orquestrador tem acesso ao estado completo e o hook valida corretamente.

## Prevention

- Em prompts de `plan-executor` para fases cross-batch: instrução explícita "edite os arquivos mas NÃO faça commit — o orquestrador vai agregar"
- Hook que valida globalmente (harness:validate, compound:check) é incompatível com commit individual por subagente quando há múltiplos subagentes paralelos
- Se hook valida apenas arquivos staged (não o repo inteiro), commit individual é seguro — verificar antes de paralelizar

## See Also

- Plano 05 MEMORY.md DI-3 + GT-P05-01
- `docs/exec-plans/completed/2026-05-14-v6.1.0-subagent-contract/SUMMARY.md`
