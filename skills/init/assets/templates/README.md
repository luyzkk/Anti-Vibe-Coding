# Templates

Used by `/init` to scaffold a new project (or to fill the harness shell).

| File | Used by | Purpose |
|------|---------|---------|
| `AGENTS.md.tpl` | fase-02 of plano01 | Source of truth for agents. Symlinked as CLAUDE.md by fase-03. |
| `ARCHITECTURE.md.tpl` | fase-02 of plano01 | Stack + folder layout. Customized by Plano 02 fase-03. |

Placeholders use double-brace syntax: `{{PROJECT_NAME}}`, `{{STACK}}`, etc.
`/init` performs straight string replacement — no template engine.
