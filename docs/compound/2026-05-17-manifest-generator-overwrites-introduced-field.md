---
title: "scripts/generate-manifest.js sobrescreve campo `introduced` em todos os entries"
category: bug-historico
tags: [manifest, version-tracking, plugin-distribution, generate-manifest, regression]
created: "2026-05-17"
---

## Problem

Toda execução de `PLUGIN_VERSION=X.Y.Z bun run scripts/generate-manifest.js` reescreve `plugin-manifest.json` com `version: "X.Y.Z"` E `introduced: "vX.Y.Z"` em **todos os entries** — não preserva o valor original de `introduced` do manifest anterior.

Resultado: o histórico de "quando essa skill foi introduzida" é perdido a cada bump. Em v6.3.2, 332 entries têm `introduced: "v6.3.2"`, incluindo skills como `/init` que existem desde v6.0.0. O mesmo bug afetou v6.3.1 (todos entries marcados `introduced: "v6.3.1"`), v6.3.0, etc. — provável desde a introdução do script.

**Custo:** sem fonte de verdade sobre quando cada skill/agent/hook foi introduzido. Impossível responder "essa skill existe desde quando?" sem `git log`. Diff `plugin-manifest.json` entre versões fica inflado com mudança `introduced` em TODOS os arquivos, mascarando mudanças reais.

## Root Cause

Em [scripts/generate-manifest.js](../../scripts/generate-manifest.js), a função `scanDir` (linha ~84) e a coleta de arquivos root (linha ~104) sempre escrevem:

```javascript
files[relPath] = {
  version: VERSION,
  checksum: calculateChecksum(absPath),
  lastModified: getLastModified(absPath),
  updateStrategy: getUpdateStrategy(relPath)
};
```

Não há leitura do manifest anterior para preservar `introduced`. O campo `introduced` é injetado **fora** do scanDir (em outro lugar do script que monta a estrutura final de cada entry), sempre com valor `"v" + VERSION` — overwrite total.

## Fix (a aplicar em v6.3.3)

Antes de regenerar entries, ler `plugin-manifest.json` existente. Para cada entry:

```javascript
const previousIntroduced = previousManifest?.entries?.[relPath]?.introduced
files[relPath] = {
  version: VERSION,
  introduced: previousIntroduced ?? `v${VERSION}`,  // preserva valor original; default = atual (novo arquivo)
  checksum: calculateChecksum(absPath),
  lastModified: getLastModified(absPath),
  updateStrategy: getUpdateStrategy(relPath)
}
```

Reset do histórico em v6.3.3: rodar `git log --diff-filter=A --name-only` para inferir versão de introdução real de cada arquivo (data do primeiro commit → mapear para tag de release vigente).

## Why It Matters (Lesson)

**Pattern detectável:** quando um script "gera tudo do zero" a cada execução **sem ler o estado anterior**, ele perde qualquer informação histórica embutida no output. Esse anti-pattern aparece em:

- Manifest generators (esse caso)
- Lockfile updaters que regeneram do zero em vez de mesclar
- "Reset" scripts que sobrescrevem timestamps de criação
- Codegen que não preserva comentários manuais inseridos no output

**Heurística:** se o output tem campo histórico (`introduced`, `created_at`, `first_seen`), o generator DEVE ler o estado anterior. Senão, esses campos são funcionalmente mortos.

**Sinal de alerta:** se o diff entre 2 versões consecutivas do output mostra mudança em **N** campos quando só **M < N** deveriam ter mudado, há overwrite involuntário.

## Recommendation for Future Plugin Releases

Antes de bump release (`PLUGIN_VERSION=X.Y.Z bun run scripts/generate-manifest.js`):

1. Verificar se `scripts/generate-manifest.js` foi fixado (preserva `introduced`).
2. Se não, **não rodar o script** automaticamente — bumpar `version` manualmente em entries que mudaram, ou rodar e depois ressetar `introduced` via `git diff` cherry-pick.
3. Tag de release não depende do `introduced` estar correto — o bug não bloqueia release, mas afeta auditoria histórica.

## References

- v6.3.2 push: commit `e8a9c34` (chore: bump v6.3.1 → v6.3.2) — regenera manifest com `introduced: "v6.3.2"` em todos os 332 entries
- v6.3.1 push: commit `6108bcb` (chore: bump 6.3.0 → 6.3.1) — mesmo bug, `introduced: "v6.3.1"` em todos
- v6.3.2 SUMMARY: `docs/exec-plans/completed/2026-05-16-stack-knowledge-nodejs-typescript/SUMMARY.md` §"Backlog ainda adiado"
