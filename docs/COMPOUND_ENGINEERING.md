# Compound Engineering — When to Capture Lessons

Run `/anti-vibe-coding:lessons-learned` when:
1. A bug took >30min to debug because of missing context
2. A pattern emerged that another agent/dev would benefit from
3. A regression occurred that a test could have prevented

Each lesson lives in `docs/compound/YYYY-MM-DD-slug.md` with frontmatter:

```yaml
---
title: "..."
category: pattern | architecture | bug-history | armadilha
tags: [keyword1, keyword2]
created: YYYY-MM-DD
---
```

Body sections: `## Problem`, `## Solution`, `## Prevention`. Validated by `bun run compound:check`.
