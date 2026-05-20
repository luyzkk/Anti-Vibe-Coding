---
title: "prompt-type Stop hook loops infinitely because parser greps for 'no' in subagent prose"
category: architecture
tags: [hooks, stop-hook, prompt-hook, parser, infinite-loop, schema]
created: 2026-05-20
---

## Problem

`hooks/hooks.json` configurou um Stop hook como `type: "prompt"` pedindo ao subagente que retornasse `{"decision": "yes"}` (NOTHING) ou `{"decision": "block", "reason": "..."}` (CORRECTION/FEATURE_COMPLETED). Em produção, o hook entrou em loop e bateu o cap de 8 blocks consecutivos em conversas normais de planejamento.

A doc oficial em `code.claude.com/docs/en/hooks` documenta que prompt-type hooks devem retornar `{"ok": true}` ou `{"ok": false, "reason": "..."}` — não `{"decision": ...}`. O parser interno faz **busca literal de substring "no"** na resposta do modelo:

```js
{ decision: response.includes("no") ? "block" : undefined, reason: model_response_text }
```

Como o subagente quase sempre devolve prosa contextualizando a decisão ("This is normal conversation, **no** correction detected, **no** feature completion"), qualquer ocorrência da substring "no" — inclusive em palavras como "Notification", "notion", ou explicações de negação — disparava `decision: "block"` falsamente. Resultado: loop até `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` (default 8).

Tentar consertar trocando o schema interno (de `{"decision":"yes"}` para `{}` empty) não resolveu porque ambos eram schemas inventados; o parser do Claude Code não olha esses campos — ele só procura "no" no texto bruto.

## Solution

Converter o hook de `type: "prompt"` para `type: "command"` apontando para `hooks/stop-reflector.cjs`. O script:

1. Lê o input JSON via stdin.
2. Sai com exit 0 imediatamente se `stop_hook_active === true` — quebra qualquer loop residual conforme documentado em `/en/hooks-guide#stop-hook-hits-the-block-cap`.
3. Lê `transcript_path` e extrai o conteúdo da última mensagem do tipo `user`.
4. Aplica regex heurística em PT-BR e EN para detectar sinais inequívocos de CORRECTION (`reverta`, `nao era isso`, `you broke`, `undo`) e FEATURE_COMPLETED (`ship it`, `pode commitar`, mensagem standalone `pronto`/`done`).
5. Emite `{"decision":"block","reason":"..."}` apenas quando há match; senão, exit 0 silencioso.

Determinístico, zero tokens, zero risco de loop por prosa fantasma.

## Prevention

- Antes de usar `type: "prompt"` em qualquer hook, ler `code.claude.com/docs/en/hooks#prompt-based-hooks` e usar o schema oficial `{"ok": boolean, "reason"?: string}`. Não inventar campos.
- Lembrar que o parser de prompt-type hooks faz `response.includes("no")` — qualquer prompt que peça raciocínio em prosa antes do JSON está em risco. Se prosa for inevitável, instruir o modelo a colocar o JSON em última linha e o parser ainda assim falhará na substring "no" — preferir command-type.
- Para decisões binárias com sinais lexicais claros (corrections, completions), preferir `type: "command"` + regex sobre `transcript_path`. Mais barato, mais rápido, determinístico.
- Sempre tratar `stop_hook_active` em Stop hooks command-type — é a válvula de escape oficial contra loops.
- Doc oficial recomenda explicitamente: *"For production workflows, prefer command hooks"* (agent hooks marcados experimental).

## Related

- `hooks/stop-reflector.cjs` — implementação atual
- `hooks/stop-reflector.test.cjs` — fixtures cobrindo CORRECTION/COMPLETED/NOTHING + caso anti-regressão da substring "no"
- `docs/compound/2026-04-21-hooks-cjs-stdin-pattern.md` — diferença stdin vs nextTick por evento
- `docs/compound/2026-03-23-hooks-json-overwrite-bug.md` — outro pitfall histórico de `hooks.json`
