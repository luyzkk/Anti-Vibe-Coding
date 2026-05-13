<!--
Esta fase NAO gera codigo de runtime. Provenance comments NAO aplicam.
Artefatos sao 14 documentos de usuario final em ingles (D2).
-->

# Fase 03: Criar `ARCHITECTURE.md` + 8 docs institucionais + estrutura `docs/*`

**Plano:** 08 — Dog-Fooding (R4 mitigation)
**Sizing:** ~3h
**Depende de:** fase-02 (AGENTS.md ja referencia os arquivos desta fase)
**Visual:** false

---

## O que esta fase entrega

`anti-vibe-coding/ARCHITECTURE.md` (visao do plugin: skills/hooks/scripts/lib/agents) + 8 docs institucionais em `anti-vibe-coding/docs/` (DESIGN, FRONTEND, PLANS, PRODUCT_SENSE, QUALITY_SCORE, RELIABILITY, SECURITY, COMPOUND_ENGINEERING) + 4 docs de Camada 2 finalizados (PIPELINE, MODEL_PROFILES, AGENTS_LIST, UPGRADE — sobrescreve stubs de fase-01) + estrutura `docs/exec-plans/{active,completed}/README.md`, `docs/compound/README.md`, `docs/review-checklists/{security,reliability,agent-api,frontend-ui,production-readiness}.md`, `docs/smoke-flows/README.md`, `docs/product-specs/index.md`, `docs/references/README.md`, `docs/design-docs/index.md`, `docs/generated/db-schema.md`.

Atende **CA-01** (estrutura completa de docs/).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/ARCHITECTURE.md` | Create | Layers do plugin (skills/hooks/scripts/lib/agents/rules/config) |
| `anti-vibe-coding/docs/DESIGN.md` | Create | Design system & UI principles (N/A para plugin — marca como "Not applicable: this project has no UI") |
| `anti-vibe-coding/docs/FRONTEND.md` | Create | Same as DESIGN (N/A) |
| `anti-vibe-coding/docs/PLANS.md` | Create | Pointer para `docs/exec-plans/` + filosofia de planejamento hierarquico |
| `anti-vibe-coding/docs/PRODUCT_SENSE.md` | Create | What problem the plugin solves (pull from CLAUDE.md "Pipeline" + README.md) |
| `anti-vibe-coding/docs/QUALITY_SCORE.md` | Create | Quality bars: test coverage, lint clean, harness:validate exit 0, compound:check exit 0 |
| `anti-vibe-coding/docs/RELIABILITY.md` | Create | Error handling: hooks tolerate failure (skip silent), validator falls back to legacy if config absent |
| `anti-vibe-coding/docs/SECURITY.md` | Create | Permissions: rm -rf/DROP/migration destrutiva exige confirmacao explicita (D29 item 7) |
| `anti-vibe-coding/docs/COMPOUND_ENGINEERING.md` | Create | Reference D17 — when to capture lessons, frontmatter contract |
| `anti-vibe-coding/docs/PIPELINE.md` | Overwrite (was stub) | Final content: fluxo grill-me → write-prd → plan-feature → execute-plan → verify-work → iterate adaptado para v6 paths |
| `anti-vibe-coding/docs/MODEL_PROFILES.md` | Overwrite | 3 perfis: quality/balanced/budget, tabela por agente, como editar `config/model-profiles.json` |
| `anti-vibe-coding/docs/AGENTS_LIST.md` | Overwrite | 13 subagent auditors (tdd-verifier, security-auditor, ..., design-explorer) |
| `anti-vibe-coding/docs/UPGRADE.md` | Overwrite | Manifest checksums SHA-256, estrategias merge/replace, comandos `/init`/`/update`/`/sync` |
| `anti-vibe-coding/docs/exec-plans/active/README.md` | Create | "Active plans live here. See AGENTS.md for workflow." |
| `anti-vibe-coding/docs/exec-plans/completed/README.md` | Create | "Completed plans archived here. Use for historical reference." |
| `anti-vibe-coding/docs/exec-plans/tech-debt-tracker.md` | Create | Empty table template (Impact/Owner/Next Step) — formal tracker complementa TODO.md |
| `anti-vibe-coding/docs/compound/README.md` | Create | "One lesson per file. Frontmatter required: title/category/tags/created." |
| `anti-vibe-coding/docs/review-checklists/security.md` | Create | Mirror of `agents/security-auditor.md` review items |
| `anti-vibe-coding/docs/review-checklists/reliability.md` | Create | Error paths, retry, timeout, fallback |
| `anti-vibe-coding/docs/review-checklists/agent-api.md` | Create | Mirror of `agents/api-auditor.md` |
| `anti-vibe-coding/docs/review-checklists/frontend-ui.md` | Create | "Not applicable: this project has no UI" |
| `anti-vibe-coding/docs/review-checklists/production-readiness.md` | Create | CI passing, harness:validate green, CHANGELOG updated, version bumped |
| `anti-vibe-coding/docs/review-checklists/README.md` | Create | Index do que tem ali |
| `anti-vibe-coding/docs/smoke-flows/README.md` | Create | "Manual smoke flows for plugin installation: `/init` em fixture, `/lessons-learned` adiciona compound note, etc." |
| `anti-vibe-coding/docs/product-specs/index.md` | Create | "Specs live here when actively planning. v6.0.0 spec at `../../V6.0.0/` (link out)" |
| `anti-vibe-coding/docs/references/README.md` | Create | Links externos (workshop andre, OWASP, CAP theorem refs) |
| `anti-vibe-coding/docs/design-docs/index.md` | Create | Index para core-beliefs.md + ADR-*.md |
| `anti-vibe-coding/docs/generated/db-schema.md` | Create | "Not applicable: this project has no database" |

---

## Implementacao

### Passo 1: ARCHITECTURE.md (raiz do plugin)

```markdown
# Architecture — Anti-Vibe Coding Plugin

A Claude Code plugin that enforces XP discipline. Organized in 6 layers:

## Layers

| Folder | Role |
|---|---|
| `skills/` | 32 skills invoked via `/anti-vibe-coding:{name}`. Each skill is a SKILL.md + optional TS helpers. |
| `agents/` | 13 subagent auditors invoked via Agent tool (tdd-verifier, security-auditor, ...). |
| `hooks/` | 7 hooks (CJS) registered in `hooks.json` for UserPromptSubmit, PostToolUse, SessionStart events. |
| `scripts/` | TS validators (`harness-validate.ts`, `compound-check.ts`), telemetry, sync utilities. |
| `rules/` | Markdown rules auto-loaded by Claude Code editor based on file pattern matching. |
| `config/` | `model-profiles.json` selects model per agent. |

## Key Files

- `AGENTS.md` — agent-facing index, ≤40 lines, in English
- `plugin-manifest.json` — file manifest with SHA-256 checksums and update strategies
- `package.json` — bun scripts: `test`, `typecheck`, `harness:validate`, `compound:check`
- `hooks/hooks.json` — hook registry

## Data Flow

1. User invokes `/anti-vibe-coding:{skill}` → skill instructions injected
2. Skill may invoke subagents from `agents/`
3. Hooks fire on events (Edit/Write/Bash) and inject suggestions or block destructive actions
4. State persisted in target project's `docs/exec-plans/`, `docs/compound/`, `docs/design-docs/`
```

### Passo 2: 8 docs institucionais

Cada um eh **curto** (10-50 linhas). Foco em conteudo real do plugin, NAO em prosa filosofica.

**`docs/DESIGN.md` / `docs/FRONTEND.md`:**
```markdown
# Design / Frontend

Not applicable: this project has no UI.

For projects that consume the plugin, the generated `docs/DESIGN.md` and `docs/FRONTEND.md` files
are customized during `/init` based on the detected stack (Next.js + React, Rails, etc.).
```

**`docs/PRODUCT_SENSE.md`:**
```markdown
# Product Sense — Why This Plugin Exists

## Problem

AI-assisted coding without discipline produces "vibe code" — features without architecture,
tests written after code, lessons lost in chat history.

## Solution

A Claude Code plugin that enforces:
1. Plan before code (grill-me → write-prd → plan-feature)
2. Test before implement (TDD adaptive levels: guided/assisted/direct)
3. Capture lessons after merge (compound notes with YAML frontmatter)
4. Validate mechanically (`harness:validate`, `compound:check`)

## Non-Goals

- Replace human judgment
- Block experimentation (hooks are suggestive by default)
- Force one architecture (`/detect-architecture` adapts)
```

**`docs/QUALITY_SCORE.md`:**
```markdown
# Quality Bars

For any change to merge:
- `bun run test` passes
- `bun run typecheck` (or tsc --noEmit) passes
- `bun run harness:validate` returns exit 0
- `bun run compound:check` returns exit 0 (if compound notes touched)
- CHANGELOG.md entry added (for user-facing changes)
- Provenance comments added in TS files: `// {YYYY-MM-DD} (Luiz/dev): why this exists`
```

**`docs/RELIABILITY.md`:**
```markdown
# Reliability — Failure Modes

## Hooks

Hooks must never crash the session. Pattern: try/catch around all logic, return `{ skipped: true }`
on error. Validator `harness:validate` skips broken hooks with warning, not error.

## Validators

`harness:validate` and `compound:check` exit 1 on real errors. Performance budget: <2s on 100 docs.
If exceeded, profile via `bun run state:regenerate --verbose`.

## Migration (`/init`)

Idempotent. Backup `.planning.v5-backup/` is mandatory before any mutation. `--dry-run` flag shows
diff without disk mutation. Rollback via `git revert {migration-commit}`.
```

**`docs/SECURITY.md`:**
```markdown
# Security — Plugin Permissions

## Destructive operations

The agent must NEVER execute without explicit user confirmation:
- `rm -rf` and equivalents
- `DROP TABLE`, `TRUNCATE`
- Destructive migrations
- Global package install
- Production env var changes
- CI/CD config changes

A hook `pre-tool-use-destructive-guard.cjs` (deferred to v6.1) enforces this mechanically.

## Secrets

The plugin never sends data externally. Telemetry is local only at `~/.claude/projects/.../memory/`.
```

**`docs/PLANS.md`:**
```markdown
# Plans

Active execution plans live in `docs/exec-plans/active/`.
Completed plans live in `docs/exec-plans/completed/`.

See `AGENTS.md` for the workflow. See `docs/PIPELINE.md` for the full skill pipeline.

Each plan follows the 10-section harmonized template (D18):
Goal, Scope, Assumptions, Risks, Execution Steps, Review Checklist, Validation Log,
Compound Opportunity, Lessons Captured, Exit Criteria.
```

**`docs/COMPOUND_ENGINEERING.md`:**
```markdown
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
```

### Passo 3: Sobrescrever 4 stubs de Camada 2 (de fase-01) com conteudo final

**`docs/PIPELINE.md`:** Migrar texto das linhas L185-L240 do CLAUDE.md original, adaptando referencias de `.planning/` → `docs/exec-plans/` (a estrutura v2 detalhada da L246 em diante e DEPRECATED — sai).

**`docs/MODEL_PROFILES.md`:** Migrar texto das linhas L308-L334 do CLAUDE.md original. Manter tabela de 3 perfis intacta.

**`docs/AGENTS_LIST.md`:** Migrar tabela das linhas L288-L304. Adicionar coluna "Default Profile" (quality/balanced/budget) lida de `config/model-profiles.json`.

**`docs/UPGRADE.md`:** Migrar texto L145-L181 do CLAUDE.md original. Adicionar secao "v5.x → v6.0.0 Migration" apontando para `docs/exec-plans/completed/2026-05-11-v60-harness-compound-fusion.md` (gerado pelo proprio plano).

### Passo 4: Estrutura `docs/exec-plans/`, `docs/compound/`, `docs/review-checklists/`, etc.

Criar diretorios + README.md em cada um. Conteudo minimo (3-10 linhas) explicando proposito.

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"

mkdir -p docs/exec-plans/{active,completed}
mkdir -p docs/compound
mkdir -p docs/review-checklists
mkdir -p docs/smoke-flows
mkdir -p docs/product-specs
mkdir -p docs/references
mkdir -p docs/design-docs       # ja existe de fase-01, no-op
mkdir -p docs/generated

# Criar README.md em cada (conteudo nos blocos acima)
# ...
```

### Passo 5: Commit

```bash
cd "f:/Projetos/Claude code/anti-vibe-coding"
git add ARCHITECTURE.md docs/
git commit -m "feat(plano08-fase03): create ARCHITECTURE.md + 8 institutional docs + docs/ subdirs"
```

---

## Gotchas

- **G1 do README (R4):** Se fase-03 quebrar, `git reset --hard HEAD~1` recupera. AGENTS.md de fase-02 permanece (mas seus links ficam quebrados — esperado ate fase-03 reexecutar).
- **G2 do README (CLAUDE.md live):** Conteudo migrado para PIPELINE.md / MODEL_PROFILES.md / etc. **NAO eh deletado do CLAUDE.md original** ainda. Eh copiado. Delete acontece em fase-08.
- **G4 do README (D2 idioma):** Docs institucionais em **INGLES**. Conteudo migrado de CLAUDE.md original (que esta em PT) precisa ser TRADUZIDO ao mover para docs/PIPELINE.md, docs/MODEL_PROFILES.md, etc. Excecoes: tabelas de configuracao (model-profiles.json) podem ter labels em ingles ja.
- **G5 do README (10 secoes):** Estrutura `docs/exec-plans/{active,completed}/README.md` deve explicitar que planos seguem o template D18 com 10 secoes — pointer para `docs/PLANS.md`.
- **Local (volume — 14 arquivos em 3h):** Eh apertado. Estrategia: 4 stubs de fase-01 ja existem, entao essa fase OVERWRITES (mais rapido). ARCHITECTURE.md eh o unico extenso (~40 linhas). Os 8 docs institucionais sao curtos (10-30 linhas cada). README.md de subpastas sao 3-10 linhas. Total: ~600 linhas de markdown em 3h = sustentavel.
- **Local (paths "Not applicable"):** DESIGN.md, FRONTEND.md, review-checklists/frontend-ui.md, generated/db-schema.md marcam como "Not applicable: this project has no UI/DB". Eh **valido** — `harness:validate` aceita arquivos com qualquer conteudo desde que existam.

---

## Verificacao

### Checklist

- [ ] `test -f anti-vibe-coding/ARCHITECTURE.md` exit 0
- [ ] `find anti-vibe-coding/docs -name "*.md" | wc -l` retorna ≥ 22 (8 institucionais + 4 Camada 2 + ~10 README/index subpastas)
- [ ] `test -d anti-vibe-coding/docs/exec-plans/active` && `test -d anti-vibe-coding/docs/exec-plans/completed` && `test -d anti-vibe-coding/docs/compound` && `test -d anti-vibe-coding/docs/review-checklists` exits 0
- [ ] `cat anti-vibe-coding/docs/PIPELINE.md | wc -l` ≥ 30 (conteudo real, nao stub)
- [ ] `cat anti-vibe-coding/docs/MODEL_PROFILES.md | grep -c '|'` ≥ 8 (tabela com 3 perfis)
- [ ] `bun scripts/harness-validate.ts anti-vibe-coding/` reclama APENAS de arquivos que vem nas fases 04-07 (planos historicos, compound notes), NAO da estrutura criada aqui

---

## Criterio de Aceite

**Por maquina:**
- 14 arquivos esperados existem (verificar via `ls`/`find`)
- `bun scripts/harness-validate.ts anti-vibe-coding/ 2>&1 | grep -i 'missing.*architecture.md\|missing.*pipeline.md\|missing.*model_profiles.md'` retorna **vazio** (todos arquivos obrigatorios presentes)

**Por humano:**
- ARCHITECTURE.md descreve o plugin real (skills/hooks/agents — nao boilerplate generico)
- PIPELINE.md substituiu o stub (`wc -l docs/PIPELINE.md` ≥ 30)
- Idioma EN em todos (D2)

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
