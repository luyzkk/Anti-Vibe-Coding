---
title: "Artefato agregado regenerado (plugin-manifest) é ponto de serialização entre fases paralelas"
category: pattern
tags: [execute-plan, plugin-manifest, generate-manifest, parallel-subagents, checksum, race]
created: 2026-06-05
---

## Problem

Quando N fases editam, em paralelo, arquivos rastreados por checksum num **artefato agregado**
(`plugin-manifest.json`), a regeneração desse agregado vira um recurso compartilhado perigoso:
se uma fase roda `generate:manifest` enquanto outra ainda escreve, o manifest captura estado
meio-escrito; se cada fase regenera o seu pedaço, há corrida no mesmo arquivo.

No Plano 06 do skill-parity-refresh, 3 fases editavam `agents/*.md` (todos no manifest). Rodar as 3
em paralelo — como o README do plano sugeria — arriscava manifest inconsistente.

## Solution

Tratar a regeneração do agregado como **fase de fechamento serial**:

1. Fases que só editam os arquivos-fonte rodam primeiro (em paralelo entre si, sem tocar o manifest).
2. UMA fase final, sozinha, roda `bun run generate:manifest` por último — ela varre o disco e captura
   todos os arquivos num agregado consistente (e de quebra conserta checksums stale acumulados de
   planos anteriores que nunca regeneraram).

**Caveat obrigatório (reconcilia com `docs/compound/2026-05-17-manifest-generator-overwrites-introduced-field.md`):**
`generate-manifest.js` ainda clobbera o campo `introduced` de todos os entries de skill com
`v${VERSION}`. Rodar o regen só é seguro quando **a versão NÃO muda** (`package.json` ==
manifest.version): aí os `introduced` já estão uniformes e o regen não perde histórico. No Plano 06
a versão estava fixa em 7.3.0 → o regen mudou 0 linhas de `introduced` (verificado no diff do
commit). Se a versão for bumpada, NÃO rodar generate:manifest sem antes corrigir o script para
preservar `introduced`.

## Prevention

- Antes de paralelizar fases, identificar artefatos agregados compartilhados (manifest, lockfile,
  índice gerado) e marcá-los como ponto de serialização — a fase que os regenera roda última e solo.
- Checagem de fechamento: re-rodar `generate:manifest` e confirmar que o único diff é `generatedAt`
  (timestamp não-determinístico) — prova que o agregado está em sync.
- `harness:validate` NÃO valida os checksums do plugin-manifest (lê outro arquivo, o
  `.claude/.anti-vibe-manifest.json`) — não confiar nele para pegar manifest stale.
