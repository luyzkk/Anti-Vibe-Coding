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

**Correção (2026-06-05, pós-CI):** uma versão inicial desta nota afirmava "NÃO rodar generate:manifest
quando a versão muda, para preservar `introduced`". **Isso está errado e quebra o CI.** O teste
`scripts/__tests__/generate-manifest.test.ts` (`> all per-file versions match package.json`) e
`plugin-manifest.json skills.* > tem version atual do plugin` EXIGEM que TODO entry tenha
`version == package.json.version`. Logo, **num bump de versão você É OBRIGADO a rodar
`bun run generate:manifest`** (que seta todos os entries para a nova versão + recomputa checksums).
Bumpar só o campo top-level manualmente deixa os 445 entries na versão antiga → CI vermelho
(version-match + checksum stale). O clobber de `introduced` (ver
`docs/compound/2026-05-17-manifest-generator-overwrites-introduced-field.md`) é o **tradeoff aceito** —
o jeito certo de resolver é CONSERTAR o script para preservar `introduced`, não evitar o regen.

## Prevention

- Antes de paralelizar fases, identificar artefatos agregados compartilhados (manifest, lockfile,
  índice gerado) e marcá-los como ponto de serialização — a fase que os regenera roda última e solo.
- Checagem de fechamento: re-rodar `generate:manifest` e confirmar que o único diff é `generatedAt`
  (timestamp não-determinístico) — prova que o agregado está em sync.
- `harness:validate` NÃO valida os checksums do plugin-manifest (lê outro arquivo, o
  `.claude/.anti-vibe-manifest.json`) — não confiar nele para pegar manifest stale.
