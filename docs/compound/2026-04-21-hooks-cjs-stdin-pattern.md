---
title: "hooks .cjs entry pattern differs by event type"
category: architecture
tags: [hooks, cjs, stdin, posttooluse, pretooluse]
created: 2026-04-21
---

## Problem

Claude Code passa contexto via stdin apenas para `PreToolUse`. `PostToolUse` recebe contexto via env vars e deve iniciar via `process.nextTick(run)`. Inverter os padrões causa hook silencioso que nunca executa — sem erro, sem output, sem efeito.

## Solution

- `PostToolUse`: usar `process.nextTick(run)` — não aguarda stdin
- `PreToolUse`: usar `process.stdin.on('end', run)` — aguarda stdin com payload do contexto

## Prevention

> _(extrapolated from rule)_

Ao criar ou editar hooks `.cjs`, verificar o tipo de evento antes de escolher o padrão de entrada. Manter comentário no topo do hook indicando o tipo esperado (`// PostToolUse: nextTick` ou `// PreToolUse: stdin`). Testar o hook com invocação real antes de commitar.
