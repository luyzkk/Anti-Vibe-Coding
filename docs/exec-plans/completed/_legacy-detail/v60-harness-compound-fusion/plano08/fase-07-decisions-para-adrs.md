<!--
Esta fase invoca helper de Plano 03 (migrate-decisions.ts).
Codigo TS desse helper ja tem provenance comments em Plano 03.
-->

# Fase 07: Migrar `decisions.md` → `docs/design-docs/ADR-NNNN-*.md`

**Plano:** 08 — Dog-Fooding (R4 mitigation)
**Sizing:** ~1h
**Depende de:** fase-03 (`docs/design-docs/` existe). Paralela com fase-04, 05, 06.
**Visual:** false

---

## O que esta fase entrega

`anti-vibe-coding/decisions.md` (80 linhas, **1 decisao formal**: "Sistema de Versionamento: Manifest com Checksums SHA-256") → `anti-vibe-coding/docs/design-docs/ADR-0001-manifest-checksums.md` com frontmatter `status: active` + secoes Context/Decision/Alternatives/Consequences/Reversibility.

Atende **CA-15** (decisions → ADR-NNNN format) aplicado ao dog-food.

---

## Arquivos Afetados

### Origem (READ)

`anti-vibe-coding/decisions.md` (80 linhas — backup em `.planning.v5-backup/decisions.md.original` desde fase-01).

### Destino (CREATE)

`anti-vibe-coding/docs/design-docs/ADR-0001-manifest-checksums.md`

Numeracao monotonica (G7 do Plano 03): primeiro ADR do plugin = `ADR-0001`. Se fase futura adicionar decisoes via `/decision-registry`, vira `ADR-0002`, `ADR-0003`, etc.

---

## Implementacao

### Passo 1: Invocar `lib/migrate-decisions.ts` (de Plano 03)

```typescript
// Helper de Plano 03 fase-05
import { migrateDecisions } from "../../anti-vibe-coding/scripts/lib/migrate-decisions"

const source = "f:/Projetos/Claude code/anti-vibe-coding/decisions.md"
const target = "f:/Projetos/Claude code/anti-vibe-coding/docs/design-docs"

const result = await migrateDecisions({
  sourcePath: source,
  targetDir: target,
  startingNumber: 1,  // primeiro ADR do plugin
  preserveOriginalLanguage: true,  // corpo em PT
})

console.log(`Migrated ${result.adrsCreated} ADRs`)
// Esperado: 1
```

### Passo 2: Validar estrutura do ADR gerado

Esperado: `docs/design-docs/ADR-0001-manifest-checksums.md` com formato:

```markdown
---
adr-id: 0001
title: "Sistema de Versionamento: Manifest com Checksums SHA-256"
date: 2026-03-23
status: active
tags: [versioning, manifest, checksums]
---

# ADR-0001: Sistema de Versionamento — Manifest com Checksums SHA-256

## Context

Plugin requires version tracking across user projects. Need to detect when files were
modified by the user vs by plugin updates. Git is not sufficient (projects may not use Git;
users may have uncommitted changes; plugin tracks specific files, not the whole repo).

## Decision

Use a manifest file with SHA-256 checksums per tracked file, plus `updateStrategy`
indicating merge/replace/never behavior.

Two-layer architecture:
- `plugin-manifest.json` (source of truth, ships with plugin)
- `.anti-vibe-manifest.json` (local state in each project)

## Alternatives Considered

1. **Git tags on the plugin** — Version the plugin and let user `git pull` manually
   - Rejected: projects may not use Git; manual pull is friction
2. **Modification timestamps** — Compare file dates instead of checksums
   - Rejected: timestamps change on copy/move; `touch` invalidates
3. **Textual diff** — Compare content without checksums
   - Rejected: O(file_size) per check; SHA-256 is O(1) comparison
4. **Manifest with SHA-256 checksums** ✓ (chosen)

## Consequences

Positive:
- Detects real modifications (content-based, not metadata-based)
- Works without Git
- Tracks plugin-specific files (not whole repo)
- Industry standard (Git uses SHA-1/SHA-256)

Negative:
- Merged file's checksum differs from original plugin checksum
- If user modifies then reverts, checksum matches but `userModified: true` flag persists
- Mitigation: `/anti-vibe-coding:init` recalculates checksums

## Reversibility

Reversible:
- Auto-backups in `.claude/backups/YYYY-MM-DD/`
- User can delete `.anti-vibe-manifest.json` and reinstall
- Manifest is metadata-only — no production code impact

## Verbatim original

\`\`\`markdown
{conteudo verbatim de decisions.md preservado para audit trail}
\`\`\`
```

### Passo 3: Atualizar index de design-docs

Se Plano 03 helper gera `docs/design-docs/index.md` automaticamente, no-op. Senao, criar/atualizar manualmente:

```markdown
# Design Decisions Index

## ADRs (Architecture Decision Records)

- [ADR-0001: Sistema de Versionamento — Manifest com Checksums SHA-256](./ADR-0001-manifest-checksums.md) — 2026-03-23, active
```

### Passo 4: Commit

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"
git add docs/design-docs/ADR-0001-manifest-checksums.md docs/design-docs/index.md
git commit -m "feat(plano08-fase07): migrate decisions.md → ADR-0001 (CA-15)"
```

---

## Gotchas

- **G7 do Plano 03 (ADR numbering monotonico):** Primeiro ADR do plugin = 0001. Helper le `docs/design-docs/ADR-*.md` existentes; se ja existe `ADR-0001-*.md` (idempotencia — rodar 2x), skip. Verificar `ls docs/design-docs/ADR-*.md | wc -l` == 1 apos primeira execucao; == 1 apos segunda (no-op).
- **G4 do README (idioma):** ADR titulo em PT (preservado do original), secoes (Context/Decision/Alternatives/...) em EN. Corpo em PT preservado por dentro das secoes. Verbatim original em PT como apendice.
- **G9 do README (idempotencia):** Helper detecta colisao por slug. Como so ha 1 decisao, sem colisao real.
- **Local (`docs/design-docs/index.md` ja deve existir):** Stub criado em fase-03. Esta fase apenas adiciona uma linha listing ADR-0001.
- **Local (decisions.md original NAO deletado):** Permanece ate fase-08 (consistencia com fases 05/06).

---

## Verificacao

### Checklist

- [ ] `test -f anti-vibe-coding/docs/design-docs/ADR-0001-manifest-checksums.md`
- [ ] `grep -c '^---' anti-vibe-coding/docs/design-docs/ADR-0001-manifest-checksums.md` == 2 (frontmatter)
- [ ] `grep -c '^## Context$\|^## Decision$\|^## Alternatives Considered$\|^## Consequences$\|^## Reversibility$' file` == 5 (5 secoes obrigatorias)
- [ ] `head -10 anti-vibe-coding/docs/design-docs/ADR-0001-manifest-checksums.md | grep 'adr-id: 0001'` retorna match
- [ ] `cat anti-vibe-coding/docs/design-docs/index.md | grep ADR-0001` retorna match
- [ ] `bun scripts/harness-validate.ts anti-vibe-coding/` aceita o arquivo
- [ ] `anti-vibe-coding/decisions.md` original ainda existe (delete em fase-08)

---

## Criterio de Aceite

**Por maquina:**
- `[ "$(ls anti-vibe-coding/docs/design-docs/ADR-*.md | wc -l)" -eq 1 ]` exit 0
- ADR-0001 tem frontmatter + 5 secoes obrigatorias
- `docs/design-docs/index.md` lista ADR-0001

**Por humano:**
- 4 alternativas consideradas preservadas com rejection rationale (1 escolhida marcada `✓`)
- Reversibility marcada explicita (`Reversible:` ou `Irreversible:`)
- Verbatim original incluido como apendice

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
