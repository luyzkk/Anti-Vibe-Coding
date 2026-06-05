---
name: git-workflow-and-versioning
description: "Git Workflow e Versioning: codifica conventional commits, atomicidade, commits como save points, branches curtas (1-3 dias), PR description como contrato historico. Complementa CLAUDE.md global (fonte de verdade para tipos `feat`/`fix`/`chore`/etc). Vetado: 'Fix bug' como commit message. Hook commit-msg documentado como OPCIONAL (opt-in, nao bloqueante). Integra com /iterate e /incident-response que dependem de commit history limpo para post-mortem."
user-invocable: true
disable-model-invocation: false
allowed-tools: Read, Grep, Glob, Bash
argument-hint: "[escopo: commit, branch, ou pr]"
---

# Git Workflow and Versioning

## Differs from / Compose with

- **CLAUDE.md global (`~/.claude/CLAUDE.md`)** e a **fonte de verdade** para "use conventional commits". Esta skill **complementa** com tecnicas adicionais: atomicidade, save point pattern, branch hygiene, PR description como contrato historico, change summary structure. Se houver conflito, CLAUDE.md global vence.
- **`/iterate`** (pos-deploy): depende de commit history limpo para regression tests e hardening. Commits "Fix bug" tornam `/iterate` cego — esta skill veta esse antipadrao na origem.
- **`/incident-response`**: post-mortem precisa de commit history navegavel (`git log --grep`, `git bisect`). Esta skill garante que cada commit seja recuperavel via mensagem descritiva.
- **`/lessons-learned`**: extrai aprendizado de bugs reais. Quando o bug foi introduzido por commit "update auth.ts", a lesson e essa: commits opacos cegam debugging futuro.
- **`code-simplification`**: refactor commits SEPARADOS de feature commits — esta skill obriga; `code-simplification` aplica refactor. Compoem: refactor em commit dedicado seguindo `refactor:` prefix.

## Overview

Git is your safety net. Treat commits as save points, branches as sandboxes, and history as documentation. With AI agents generating code at high speed, disciplined version control is the mechanism that keeps changes manageable, reviewable, and reversible.

## When to Use

Always. Every code change flows through git.

## Core Principles

### Trunk-Based Development (Recommended)

Keep `main` always deployable. Work in short-lived feature branches that merge back within 1-3 days. Long-lived development branches are hidden costs — they diverge, create merge conflicts, and delay integration. DORA research consistently shows trunk-based development correlates with high-performing engineering teams.

```
main ──●──●──●──●──●──●──●──●──●──  (always deployable)
        ╲      ╱  ╲    ╱
         ●──●─╱    ●──╱    ← short-lived feature branches (1-3 days)
```

This is the recommended default. Teams using gitflow or long-lived branches can adapt the principles (atomic commits, small changes, descriptive messages) to their branching model — the commit discipline matters more than the specific branching strategy.

- **Dev branches are costs.** Every day a branch lives, it accumulates merge risk.
- **Release branches are acceptable.** When you need to stabilize a release while main moves forward.
- **Feature flags > long branches.** Prefer deploying incomplete work behind flags rather than keeping it on a branch for weeks.

### 1. Commit Early, Commit Often

Each successful increment gets its own commit. Don't accumulate large uncommitted changes.

```
Work pattern:
  Implement slice → Test → Verify → Commit → Next slice

Not this:
  Implement everything → Hope it works → Giant commit
```

Commits are save points. If the next change breaks something, you can revert to the last known-good state instantly.

### 2. Atomic Commits

Each commit does one logical thing:

```
# Good: Each commit is self-contained
git log --oneline
a1b2c3d Add task creation endpoint with validation
d4e5f6g Add task creation form component
h7i8j9k Connect form to API and add loading state
m1n2o3p Add task creation tests (unit + integration)

# Bad: Everything mixed together
git log --oneline
x1y2z3a Add task feature, fix sidebar, update deps, refactor utils
```

### 3. Descriptive Messages

Commit messages explain the *why*, not just the *what*:

```
# Good: Explains intent
feat: add email validation to registration endpoint

Prevents invalid email formats from reaching the database.
Uses Zod schema validation at the route handler level,
consistent with existing validation patterns in auth.ts.

# Bad: Describes what's obvious from the diff
update auth.ts
```

**Format:**
```
<type>: <short description>

<optional body explaining why, not what>
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `refactor` — Code change that neither fixes a bug nor adds a feature
- `test` — Adding or updating tests
- `docs` — Documentation only
- `chore` — Tooling, dependencies, config

### 4. Keep Concerns Separate

Don't combine formatting changes with behavior changes. Don't combine refactors with features. Each type of change should be a separate commit — and ideally a separate PR:

```
# Good: Separate concerns
git commit -m "refactor: extract validation logic to shared utility"
git commit -m "feat: add phone number validation to registration"

# Bad: Mixed concerns
git commit -m "refactor validation and add phone number field"
```

**Separate refactoring from feature work.** A refactoring change and a feature change are two different changes — submit them separately. This makes each change easier to review, revert, and understand in history. Small cleanups (renaming a variable) can be included in a feature commit at reviewer discretion.

### 5. Size Your Changes

Target ~100 lines per commit/PR. Changes over ~1000 lines should be split. Veja as estrategias de divisao na tabela abaixo.

```
~100 lines  → Easy to review, easy to revert
~300 lines  → Acceptable for a single logical change
~1000 lines → Split into smaller changes
```

**Estrategias de divisao quando a mudanca e grande demais:**

| Estrategia | Como | Quando |
|---|---|---|
| Stack (por camada) | Separar backend, frontend e infraestrutura em PRs distintos | Mudanca full-stack que pode ser integrada por camada |
| Por grupo de arquivos | Agrupar arquivos relacionados (ex: modelo + migracao; componente + teste) | Mudanca ampla com subconjuntos coerentes e independentes |
| Horizontal (por feature slice) | Dividir pela funcionalidade: auth primeiro, depois perfil, depois notificacoes | Feature grande com sub-funcionalidades entregaveis individualmente |
| Vertical (por comportamento) | Dividir pelo comportamento: primeiro o caminho feliz, depois erros, depois edge cases | Implementacao nova onde o caminho principal pode ser revisado antes |

## Branching Strategy

### Feature Branches

```
main (always deployable)
  │
  ├── feature/task-creation    ← One feature per branch
  ├── feature/user-settings    ← Parallel work
  └── fix/duplicate-tasks      ← Bug fixes
```

- Branch from `main` (or the team's default branch)
- Keep branches short-lived (merge within 1-3 days) — long-lived branches are hidden costs
- Delete branches after merge
- Prefer feature flags over long-lived branches for incomplete features

### Branch Naming

```
feature/<short-description>   → feature/task-creation
fix/<short-description>       → fix/duplicate-tasks
chore/<short-description>     → chore/update-deps
refactor/<short-description>  → refactor/auth-module
```

## Working with Worktrees

For parallel AI agent work, use git worktrees to run multiple branches simultaneously:

```bash
# Create a worktree for a feature branch
git worktree add ../project-feature-a feature/task-creation
git worktree add ../project-feature-b feature/user-settings

# Each worktree is a separate directory with its own branch
# Agents can work in parallel without interfering
ls ../
  project/              ← main branch
  project-feature-a/    ← task-creation branch
  project-feature-b/    ← user-settings branch

# When done, merge and clean up
git worktree remove ../project-feature-a
```

Benefits:
- Multiple agents can work on different features simultaneously
- No branch switching needed (each directory has its own branch)
- If one experiment fails, delete the worktree — nothing is lost
- Changes are isolated until explicitly merged

## The Save Point Pattern

```
Agent starts work
    │
    ├── Makes a change
    │   ├── Test passes? → Commit → Continue
    │   └── Test fails? → Revert to last commit → Investigate
    │
    ├── Makes another change
    │   ├── Test passes? → Commit → Continue
    │   └── Test fails? → Revert to last commit → Investigate
    │
    └── Feature complete → All commits form a clean history
```

This pattern means you never lose more than one increment of work. If an agent goes off the rails, `git reset --hard HEAD` takes you back to the last successful state.

## Change Summaries

After any modification, provide a structured summary. This makes review easier, documents scope discipline, and surfaces unintended changes:

```
CHANGES MADE:
- src/routes/tasks.ts: Added validation middleware to POST endpoint
- src/lib/validation.ts: Added TaskCreateSchema using Zod

THINGS I DIDN'T TOUCH (intentionally):
- src/routes/auth.ts: Has similar validation gap but out of scope
- src/middleware/error.ts: Error format could be improved (separate task)

POTENTIAL CONCERNS:
- The Zod schema is strict — rejects extra fields. Confirm this is desired.
- Added zod as a dependency (72KB gzipped) — already in package.json
```

This pattern catches wrong assumptions early and gives reviewers a clear map of the change. The "DIDN'T TOUCH" section is especially important — it shows you exercised scope discipline and didn't go on an unsolicited renovation.

## Pre-Commit Hygiene

Before every commit:

```bash
# 1. Check what you're about to commit
git diff --staged

# 2. Ensure no secrets
git diff --staged | grep -i "password\|secret\|api_key\|token"

# 3. Run tests (bun — project default; adapt to npm/yarn/pnpm if needed)
bun test
# alternative: npm test

# 4. Run linting
bun run lint
# alternative: npm run lint

# 5. Run type checking
bun run typecheck
# alternative: npx tsc --noEmit
```

Automate this with git hooks:

```json
// package.json (using lint-staged + husky)
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

## Handling Generated Files

- **Commit generated files** only if the project expects them (e.g., `package-lock.json`, Prisma migrations)
- **Don't commit** build output (`dist/`, `.next/`), environment files (`.env`), or IDE config (`.vscode/settings.json` unless shared)
- **Have a `.gitignore`** that covers: `node_modules/`, `dist/`, `.env`, `.env.local`, `*.pem`

## Using Git for Debugging

```bash
# Find which commit introduced a bug
git bisect start
git bisect bad HEAD
git bisect good <known-good-commit>
# Git checkouts midpoints; run your test at each to narrow down

# View what changed recently
git log --oneline -20
git diff HEAD~5..HEAD -- src/

# Find who last changed a specific line
git blame src/services/task.ts

# Search commit messages for a keyword
git log --grep="validation" --oneline
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll commit when the feature is done" | One giant commit is impossible to review, debug, or revert. Commit each slice. |
| "The message doesn't matter" | Messages are documentation. Future you (and future agents) will need to understand what changed and why. |
| "I'll squash it all later" | Squashing destroys the development narrative. Prefer clean incremental commits from the start. |
| "Branches add overhead" | Short-lived branches are free and prevent conflicting work from colliding. Long-lived branches are the problem — merge within 1-3 days. |
| "I'll split this change later" | Large changes are harder to review, riskier to deploy, and harder to revert. Split before submitting, not after. |
| "I don't need a .gitignore" | Until `.env` with production secrets gets committed. Set it up immediately. |

### Antipattern: "Fix bug" Commit Messages

This is the canonical example of what NOT to write:

```bash
# WRONG — opaque to future debugging
git commit -m "Fix bug"
git commit -m "update"
git commit -m "wip"
git commit -m "misc changes"
```

These messages destroy the value of `git log --grep`, `git bisect`, and any post-mortem analysis. A commit message is documentation written for your future self and your colleagues. Three weeks later, `git log` showing 40 "Fix bug" entries is indistinguishable from no log at all.

```bash
# RIGHT — explains the why
git commit -m "fix: prevent race condition in cache invalidation"
git commit -m "feat: add email validation to registration endpoint"
git commit -m "refactor: extract validation logic to shared utility"
```

This antipattern is veto-level. If you find yourself typing `-m "Fix bug"`, stop and rewrite. Cost of writing a real message: 30 seconds. Cost of debugging an unlabeled commit 6 months later: hours.

## Red Flags

- Large uncommitted changes accumulating
- Commit messages like "fix", "update", "misc"
- Formatting changes mixed with behavior changes
- No `.gitignore` in the project
- Committing `node_modules/`, `.env`, or build artifacts
- Long-lived branches that diverge significantly from main
- Force-pushing to shared branches

## Verification

For every commit:

- [ ] Commit does one logical thing
- [ ] Message explains the why, follows type conventions
- [ ] Tests pass before committing
- [ ] No secrets in the diff
- [ ] No formatting-only changes mixed with behavior changes
- [ ] `.gitignore` covers standard exclusions

## Appendix: Optional commit-msg Hook (opt-in)

This hook is **OPTIONAL** and **NOT installed by default**. The plugin does not enforce commit message format — you do, via this skill. Install only if you want machine-level enforcement.

**Why opt-in (not default):**
- Coercion over git workflow generates friction. Education first; automation only if ROI confirms.
- Some teams use mob commits or co-author commits with non-conforming messages legitimately.
- Forcing a format breaks legitimate use cases (squash merges, revert commits with auto-generated messages).

**Install (if you want it):**

```bash
# .git/hooks/commit-msg (chmod +x)
#!/usr/bin/env bash
# Validates conventional commit format: <type>(<scope>): <description>
pattern='^(feat|fix|refactor|test|docs|chore|perf|style|build|ci|revert)(\(.+\))?: .{1,}$'
if ! grep -qE "$pattern" "$1"; then
  echo "ERROR: commit message must follow conventional commits"
  echo "       <type>(<scope>): <description>"
  echo "       types: feat|fix|refactor|test|docs|chore|perf|style|build|ci|revert"
  echo ""
  echo "Your message: $(cat "$1")"
  exit 1
fi
```

**Bypass (when needed):** `git commit --no-verify -m "..."` skips the hook. Use sparingly (auto-generated messages, emergency fixes); document the reason.

**Note:** if your project also has `lint-staged` or `husky`, integrate this hook via `husky` instead of writing to `.git/hooks/` directly — `.git/hooks/` is not version-controlled and lost on clone.
