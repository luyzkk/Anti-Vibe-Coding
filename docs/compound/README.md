# Compound Notes

One lesson per file. Frontmatter required.

## Naming Convention

`YYYY-MM-DD-slug.md` — date is when the lesson was captured, slug is kebab-case title.

## Required Frontmatter

```yaml
---
title: "..."
category: pattern | architecture | bug-history | armadilha
tags: [keyword1, keyword2]
created: YYYY-MM-DD
---
```

## Required Sections

`## Problem`, `## Solution`, `## Prevention`

Validated by `bun run compound:check`. See `docs/COMPOUND_ENGINEERING.md` for guidance.

## Quando promover para reference

Compound notes capturam UMA licao por arquivo (reativo). References operacionais
em [`docs/references/`](../references/) sao checklists destilados que cobrem padroes
recorrentes (proativo). Nem toda compound note vira reference — promova somente
quando UM dos criterios abaixo for atendido:

1. **>=3 repeticoes:** o tema da nota aparece em 3 ou mais compound notes diferentes
   no repo (sinal de padrao recorrente, nao incidente isolado).
2. **>=2 skills:** o tema e citado por 2 ou mais skills do plugin (`skills/<id>/SKILL.md`)
   — sinal de que multiplos pontos do pipeline dependem do mesmo conhecimento.
3. **Obrigatorio para onboarding:** representa padrao que todo contribuidor novo
   precisaria saber antes da primeira PR (ex: contrato de Steps no `/init`).

### Processo de promocao (manual)

1. Criar `docs/references/<topic>.md` em formato checklist operacional (nao prosa).
   Header obrigatorio: `> Origem: docs/compound/<file1>.md + docs/compound/<file2>.md`.
2. Citar a reference nas skills/agents que dependem do conhecimento (link relativo).
3. Adicionar `referenced-by: [docs/references/<topic>.md]` no frontmatter de cada
   compound note-origem (idempotente — verificar presenca antes de adicionar).
4. NAO apagar nem reescrever as compound notes-origem: reference e destilacao
   operacional, narrativa permanece na compound.

Sem script automatizado — promocao e decisao curatorial humana com criterio numerico
acima como gate (decisao DC-8 do PRD-WAVE-3).
