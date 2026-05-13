---
title: "Code blocks inside SKILL.md are prompt text, not executable runtime"
category: bug-history
tags: [skills, telemetry, hooks, dogfooding, integration-test]
created: 2026-05-12
---

## Problem

Plano 03 (Telemetria Passiva) entregou suite com 224 testes verdes e 10/10 skills "instrumentadas" com blocos TypeScript chamando `writeTelemetryStart` / `writeTelemetryEnd` no topo e fim de cada `SKILL.md`. Após 7 dias de uso real do plugin em Carreirarte, `.claude/metrics/YYYY-MM.jsonl` continuava com 0 pares de telemetria — o diretório `metrics/` sequer foi criado.

Causa raiz:

1. `SKILL.md` é **prompt markdown** consumido pelo agente Claude, não runtime executável.
2. Blocos TypeScript dentro de skill files são lidos como instrução descritiva — o agente não compila nem invoca o código literalmente.
3. Para o writer rodar é necessário um **gatilho externo**: hook `PostToolUse` / `Stop` ou wrapper que invoque o writer via Bun com payload do `CLAUDE_HOOK_CONTEXT`.
4. Nenhum desses gatilhos existia em [`hooks/hooks.json`](../../hooks/hooks.json) — hooks da época eram `SessionStart`, `UserPromptSubmit`, `PreToolUse` (TDD gate).

Impacto: CA-11 (>=50 pares válidos via dogfooding) deferred para Onda 2; 14 dias de janela de dogfooding em Carreirarte com 0 dados úteis; suite verde mascarou o problema — writer testado em isolamento Bun passa, integração nunca foi testada end-to-end.

## Solution

Tratar instrumentação dependente de agente LLM como **integração**, não como função pura:

- **Smoke test end-to-end real** antes de declarar pronto: invocar a skill em ambiente vivo e verificar o efeito colateral (arquivo escrito, log emitido, métrica gravada) — não confiar apenas em testes de função isolada.
- **Gatilho explícito obrigatório**: se o código precisa rodar durante uso de skill, configurar hook (`PreToolUse` / `PostToolUse` / `Stop`) ou wrapper externo que efetivamente dispare o binário. Blocos de exemplo em `SKILL.md` nunca executam.
- **Day-0 baseline é o smoke test**: quando CA-11 deu 0 linhas no Day-0, isso era a bandeira vermelha — deveria ter parado a entrega, não esperar 7 dias.

Fix planejado para Onda 2: par `PreToolUse` + `PostToolUse` em `hooks.json` com `matcher: "Skill"`; correlação por `tool_use_id`; estado intermediário em `.claude/metrics/.pending-starts.json`; regression test que invoca uma skill real e confere que `metrics/YYYY-MM.jsonl` ganha 2 linhas.

## Prevention

- Testes em isolamento provam que a função funciona, não que o agente a chama. Para qualquer função que depende de invocação por agente LLM, exigir teste de integração em ambiente vivo antes de marcar fase como done.
- Quando uma fase entrega "instrumentação automática" via SKILL.md, o reviewer deve pedir: "mostre o gatilho em `hooks/hooks.json` que dispara esse código". Sem hook registrado, a instrumentação não existe.
- Adicionar ao checklist de verify-work: "rodar a skill uma vez em ambiente real e confirmar efeito colateral observável (arquivo, log, métrica) — capturar o output como evidência".
- Quando uma métrica de aceitação (CA) der zero no Day-0, tratar como bloqueio imediato — não como "vamos coletar mais dados".

## Affected files

- `.planning.v5-backup/lessons-learned.md.original` (BUG-02 source, linhas 5-37)
- `hooks/hooks.json` (faltava `PostToolUse` matcher `Skill` na época; em v6 já existe `Write|Edit|MultiEdit` para `state-md-hook.cjs`)
- Discovery em: `.planning/2026-05-04-v53-plugin-adaptativo/plano05/MEMORY.md` (BUG-02)
- Padrão relacionado: `2026-04-21-hooks-cjs-stdin-pattern.md` (PostToolUse vs PreToolUse entry pattern)
