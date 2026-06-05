---
title: "grep -c com alternância conta a linha de import (KEEP-check de telemetria retorna 3, não 2)"
category: armadilha
tags: [grep, verification, telemetry, keep-check, false-positive]
created: 2026-06-05
---

## Problem

Um KEEP-check comum para confirmar que um par de chamadas continua presente —
`grep -c "writeTelemetryStart\|writeTelemetryEnd" arquivo` — espera `2` (uma chamada de start, uma de
end) mas retorna `3`. A linha de import `import { writeTelemetryStart, writeTelemetryEnd } from ...`
casa a alternância e conta como **uma** linha que contém AMBOS os símbolos. `grep -c` conta LINHAS
que casam, não ocorrências — e a alternância `A\|B` casa qualquer linha com A ou B, incluindo o import.

Resultado: um gate de verificação falha falsamente (ou pior, um agente "conserta" um arquivo que
estava correto), porque o número esperado foi derivado contando call-sites e esquecendo o import.

Distinto de `docs/compound/2026-04-21-grep-c-exit-1-quando-zero.md` (que é sobre o exit code 1 quando
o count é zero) — aqui o problema é a **inflação da contagem pela linha de import**.

## Solution

Para checar presença de um bloco/par de símbolos, não conte os símbolos via alternância. Use um
**marcador-comentário único** que aparece exatamente uma vez por bloco:

```bash
# frágil — conta o import junto:
grep -c "writeTelemetryStart\|writeTelemetryEnd" skill.md   # → 3

# confiável — marcador único do bloco:
grep -c "=== Telemetria passiva" skill.md                   # → 2 (start + end)
```

Alternativa: contar cada símbolo separadamente (`grep -c "writeTelemetryStart(" ` com o parêntese de
chamada, que não casa o import), ou excluir a linha de import (`grep -v "^import"`).

## Prevention

- Ao escrever KEEP-checks `grep -c`, lembrar que a contagem inclui imports, comentários e strings que
  mencionam o nome. Preferir âncoras que só existem no ponto de uso real (parêntese de chamada,
  marcador-comentário, heading).
- Validado no skill-parity-refresh Plano 02 e reusado nos Planos 03/05 (KEEP-checks de telemetria de
  iterate/verify-work usaram o marcador `=== Telemetria passiva == 2`).
- Relacionado: `docs/compound/2026-05-12-validator-regex-hits-comments.md` (regex casa comentários).
