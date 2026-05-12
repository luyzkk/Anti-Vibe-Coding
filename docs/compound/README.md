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
