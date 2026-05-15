---
title: "Migração v6.1.0 — lições do contrato de subagentes v1"
category: processo
tags: [subagents, contract-v1, json, lifecycle, reasoning, migration, anti-pattern]
created: "2026-05-14"
---

## Problem

11 dos 13 subagentes retornavam markdown com enum de domínio próprio (`SECURE/VULNERABILITIES_FOUND`, `COMPLIANT/NON_COMPLIANT`, etc.). Orquestrador genérico era impossível — cada skill consumidora precisava de regex + mapeamento específico por agente. Campos de reasoning livre não existiam; informações que não cabiam no enum eram descartadas.

Dois anti-patterns dominantes:

1. **Lifecycle misturado com domínio:** `status: "VULNERABILITIES_FOUND"` impedia o orquestrador de saber se devia prosseguir ou aguardar sem entender o vocabulário de domínio de cada agente.
2. **Reasoning inexistente:** nenhum agente tinha campo de prosa livre. Campos opcionais viraram sempre vazios — nenhum dos 12 agentes candidatos usava.

Agravante descoberto durante a migração (GT-06, commit `b1fce74`): `git stash` usado durante verificação de regressão reverteu silenciosamente as edições em `agents/*.md`. O STATE.md declarava a migração concluída, mas `checkAgentContracts()` descobriu que nenhuma edição havia sido commitada. Edições em arquivos rastreados desaparecem no `stash pop`; arquivos novos sobrevivem.

## Solution

**Contrato v1 com dois eixos separados e reasoning obrigatório.**

`status` top-level responde ao orquestrador ("o que fazer agora?"): `complete | needs_retry | needs_human | blocked`. `payload.domain_status` responde ao operador ("o que o agente encontrou?"): cada agente define seu enum de domínio livremente. O validator rejeita `status` fora dos 4 lifecycle values com `INVALID_LIFECYCLE_STATUS` e sugere explicitamente mover o enum para `payload.domain_status`.

`reasoning` tornou-se obrigatório (min 20 chars, warning abaixo de 50). Isso força o agente a articular o que observou fora do schema estruturado — o campo é escape hatch: quando algo não cabe no `payload.issues[]` ou `payload.checks[]`, tem onde registrar.

O `plan-verifier` era o único agente JSON pré-migração e serviu como template: status lifecycle no topo, array de checks estruturados, detail por item. O contrato v1 é generalização direta do shape dele, com `reasoning` adicionado e `kind` para dispatch genérico via `parseAndDispatch`.

`anti-vibe-review` ficou como opt-in intencional: o checklist inline é mais rápido para review casual; delegação a subagentes paralelos cria sub-fork overhead (agente dentro de fork spawna sub-fork) e só se justifica quando cobertura completa é necessária. O objetivo do contrato não é integração total em todo orquestrador — é tornar a integração possível sem custo extra.

Para o problema do stash: substituir `git stash && bun test && git stash pop` por `git diff <arquivo>` para verificação local, ou `git worktree add` se working tree limpa for necessária. Nunca usar stash quando a sessão principal está editando arquivos.

## Prevention

- **`reasoning` obrigatório por padrão.** Campo de prosa livre opcional = sempre vazio. Se o escape hatch importa, torne-o obrigatório tecnicamente, não por convenção.
- **Separar lifecycle de domínio no design inicial.** `status` top-level responde ao orquestrador; resultado de domínio vai em `payload.domain_status`. Qualquer novo subagente que retornar enum de domínio em `status` será rejeitado pelo validator com hint explícito.
- **Generalizar a partir do que sobreviveu ao uso real.** O `plan-verifier` tinha JSON estruturado porque foi feito para consumo programático. Ao projetar contrato, identificar o agente que está mais próximo do alvo e generalizar a partir dele.
- **Nunca usar `git stash` durante verificação em working trees com múltiplos processos.** Em migrações de múltiplos arquivos, o check de integridade deve ler o filesystem real (ex: `checkAgentContracts()`), não confiar no STATE.md, porque STATE.md reflete intenção — não o que foi commitado.
- **Adicionar validator automático como gate de merge.** O hook `pre-commit` que valida `agents/*.md` contra o contrato (implementado em `9df8189`) garante que nenhuma regressão passe despercebida após a migração.

## See Also

- Contrato canônico: `docs/design-docs/subagent-contract-v1.md`
- Decisões e alternativas rejeitadas: `docs/design-docs/ADR-0002-subagent-contract.md`
- Helper TypeScript: `skills/lib/subagent-contract.ts`
- Nota relacionada (git stash detalhado): `docs/compound/2026-05-14-git-stash-parallel-processes.md`
- Inventário pré-migração: `docs/exec-plans/completed/2026-05-14-v6.1.0-subagent-contract/INVENTORY.md`
