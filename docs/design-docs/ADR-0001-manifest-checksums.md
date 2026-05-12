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

```markdown
# Decisões Arquiteturais

### Sistema de Versionamento: Manifest com Checksums SHA-256

**Data:** 2026-03-23
**Status:** Implementado (v4.0.0)

**Alternativas consideradas:**
1. **Git tags no plugin** — Versionar o plugin e deixar usuário fazer git pull manual
2. **Timestamps de modificação** — Comparar datas de arquivo em vez de checksums
3. **Diff textual** — Comparar conteúdo sem checksums
4. **Manifest com checksums SHA-256** ✓ (escolhida)

**Justificativa:**

**Por que checksums em vez de timestamps:**
- Timestamps mudam ao copiar/mover arquivos
- Usuário pode "tocar" arquivo sem modificar conteúdo
- Checksums garantem detecção de modificações reais
- SHA-256 é padrão da indústria (Git usa SHA-1/SHA-256)

**Por que manifest em vez de Git:**
- Projetos podem não usar Git
- Usuários podem ter modificações não commitadas
- Plugin precisa rastrear arquivos específicos, não todo o repo
- Manifest local permite rastreamento independente por projeto

**Por que duas camadas (plugin-manifest + local-manifest):**
- `plugin-manifest.json` = fonte de verdade (versão oficial)
- `.anti-vibe-manifest.json` = estado local (o que está instalado)
- Permite comparação: "o que mudou no plugin" vs "o que mudou localmente"

**Estrutura escolhida:**

```json
// plugin-manifest.json (no plugin)
{
  "version": "4.0.0",
  "files": {
    "CLAUDE.md": {
      "version": "4.0.0",
      "checksum": "ff1b3e...",
      "updateStrategy": "merge"
    }
  }
}

// .anti-vibe-manifest.json (no projeto)
{
  "pluginVersion": "4.0.0",
  "files": {
    "CLAUDE.md": {
      "sourceVersion": "4.0.0",
      "installedChecksum": "a3f2e8...",  // checksum APÓS merge
      "userModified": true
    }
  }
}
```

**Risco conhecido:**
- Checksum do arquivo mesclado é diferente do checksum original do plugin
- Se usuário modificar e depois apagar modificação, o checksum volta ao original mas flag `userModified` permanece `true`
- Mitigação: Usuário pode rodar `/anti-vibe-coding:init` que recalcula checksums

**Reversibilidade:** Reversível

- Backups automáticos em `.claude/backups/YYYY-MM-DD/`
- Usuário pode deletar `.anti-vibe-manifest.json` e reinstalar
- Manifest não afeta código de produção (apenas metadados)
```
