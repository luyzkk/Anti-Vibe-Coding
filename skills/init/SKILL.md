---
name: init
description: "This skill should be used when the user asks to 'initialize anti-vibe', 'setup anti-vibe coding', 'add anti-vibe to project', 'configure anti-vibe', or wants to onboard a project into the Anti-Vibe Coding methodology. Handles first-time setup with intelligent CLAUDE.md merge, rules deployment, and decisions registry initialization."
user-invocable: true
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Write, Edit, AskUserQuestion
argument-hint: "[project path (default: current directory)]"
---

# Init — Setup Anti-Vibe Coding no Projeto

Inicializar o Anti-Vibe Coding no projeto atual. Detectar o estado do projeto e adaptar o setup.

## Fluxo de Execucao

### Step 0.5: Detect legacy v5.x layout (Plano 03 — D9, D15)

<!-- read-only: detectV5Legacy nao muta disco. Qualquer mutacao fica para fase-02 (backup-idempotente). -->

```javascript
// DI-06: import direto em vez de bun -e (GT-04 — bun -e com paths absolutos quebra no Windows).
const { detectV5Legacy } = await import('./lib/detect-v5-legacy.ts')

const state = await detectV5Legacy(process.cwd())
if (state.alreadyMigrated && state.isLegacy) {
  console.log('Project has both v5 artifacts AND docs/exec-plans/ — partial migration?')
  console.log('Run `/init migrate --resume` or remove residuals manually.')
  process.exit(2)
}
if (state.isLegacy) {
  console.log('Detected v5.x artifacts:', state.artifacts.join(', '))
  console.log('Run `/init migrate` (or `--dry-run` to preview).')
  process.exit(1)  // signal: needs migration
}
console.log('Greenfield project — proceeding with scaffold.')
```

If exit code 1 → prompt user with three options: **Migrate / Dry-run / Skip (treat as new)**.

---

### Step migrate.0: Parse --dry-run flag (Plano 03 fase-06 — CA-10, R14)

<!-- Detects --dry-run in ARGUMENTS before any migration step runs. -->

```javascript
// DI-04/DI-06: logic in code block, await import pattern (GT-04 Windows).
const dryRun = (typeof ARGUMENTS === 'string') && ARGUMENTS.includes('--dry-run')
if (dryRun) {
  console.log('Dry-run mode: no files will be modified.')
}
// Pass dryRun to migrate.all (Step below) — skip migrate.1/.2/.3/.4 when using migrate.all.
```

---

### Step migrate.all: Orchestrated migration — replaces migrate.1 / migrate.2 / migrate.3 / migrate.4 (Plano 03 fase-06 — CA-10, R14)

<!-- Use this step instead of the individual migrate.1–.4 steps.
     In dry-run mode the user sees the full plan; re-run without --dry-run to apply.
     DI-04/DI-06: await import in javascript block instead of bun run -e (GT-04 Windows). -->

```javascript
// DI-06: await import instead of bun run -e (GT-04 — bun -e with absolute paths breaks on Windows).
const { orchestrateMigration } = await import('./lib/migrate-orchestrator.ts')
const { renderDryRunReport } = await import('./lib/dry-run-renderer.ts')

const isDryRun = (typeof ARGUMENTS === 'string') && ARGUMENTS.includes('--dry-run')
const report = await orchestrateMigration(process.cwd(), { dryRun: isDryRun })
console.log(renderDryRunReport(report))

if (isDryRun) {
  console.log('\nRe-run without --dry-run to apply.')
  process.exit(0)
}
```

In dry-run mode: zero side effects — `docs/` is never created, `.planning/` is never deleted,
`.planning.v5-backup/` is cleaned up after report generation (CA-10 verbatim).

---

### Step migrate.5: Final validation (Plano 03 fase-07 — CA-09)

<!-- Runs harness:validate after migration completes. If it fails, print rollback instructions.
     Exit code propagated so the caller (skill runner) can surface the failure. -->

```bash
bun run scripts/harness-validate.ts
VALIDATION_EXIT=$?
if [ $VALIDATION_EXIT -ne 0 ]; then
  echo "WARN: harness:validate failed after migration. Inspect output above."
  echo "Backup is at .planning.v5-backup/ — to roll back: git revert HEAD && cp -r .planning.v5-backup/.planning ./"
  exit $VALIDATION_EXIT
fi
echo "Migration validated. Suggested commit: git commit -m 'chore: migrate to anti-vibe-coding v6.0.0'"
echo "Add .planning.v5-backup/ to .gitignore (or delete after confirming all is well)."
```

---

### Step migrate.1: Backup before any mutation (Plano 03 fase-02 — R2, R14, M8)

<!-- GATING: execute este step ANTES de qualquer helper de migracao (fase-03/04/05).
     Se retornar erro (lock / disco cheio / permissao negada), ABORTAR a migracao inteira.
     Lock orfao (>5min): deletar manualmente e re-rodar. -->

```javascript
// DI-01: import direto em vez de bun -e (GT-04 — bun -e com paths absolutos quebra no Windows).
const { detectV5Legacy } = await import('./lib/detect-v5-legacy.ts')
const { backupPlanning } = await import('./lib/backup-planning.ts')

const state = await detectV5Legacy(process.cwd())
const result = await backupPlanning(process.cwd(), { state })

if (result.status === 'created') {
  console.log('Backup ' + result.filesCopied + ' files → ' + result.backupPath)
}
if (result.status === 'already-exists') {
  console.log('Backup already present at ' + result.backupPath + ' — proceeding (idempotent).')
}
// dry-run: status === 'dry-run' — count logged, nothing written to disk.
```

**Gate:** if this step exits non-zero (lock present / disk full / permission denied),
**abort the migration**. Migration helpers (fases 03/04/05) must not run.

After successful migration, suggest user adds `.planning.v5-backup/` to `.gitignore`.

---

### Step migrate.2: Convert .planning/ → docs/exec-plans/* + docs/product-specs/* (Plano 03 fase-03 — D3, M8)

<!-- Le do .planning.v5-backup/ (G1), escreve em docs/. Deleta .planning/ original apos sucesso
     (G-A1). Idempotente: arquivos ja migrados com mesmo conteudo viram skip; conteudo divergente
     vira conflict (aborta migration). -->

```javascript
// DI-01: import direto (GT-04 — bun -e quebra em bash Windows com paths absolutos).
const { migratePlanning } = await import('./lib/migrate-planning.ts')

const report = await migratePlanning(process.cwd())
console.log('Migration:', report.status)
console.log('  entries:', report.entries)
console.log('  written:', report.written.length)
console.log('  skipped:', report.skipped.length)

if (report.conflicts.length > 0) {
  console.log('  CONFLICTS:', report.conflicts.map((c) => c.target).join(', '))
  console.log('  Resolve manually (delete from docs/ or rename original) and re-run /init migrate.')
  process.exit(1)
}
```

**Gate:** if conflicts are reported, the pipeline halts — fase-04 (lessons) and fase-05 (decisions)
do NOT run. User resolves manually and re-runs.

---

### Step migrate.3: Convert lessons-learned.md → docs/compound/*.md (Plano 03 fase-04 — D3, M7, CA-29)

<!-- Le do .planning.v5-backup/lessons-learned.md (G1). Gera 1 arquivo .md por licao em
     docs/compound/{date}-{slug}.md com frontmatter completo (title/category/tags/created).
     Parser cobre formato A (## YYYY-MM-DD: titulo) e formato B (### [Categoria] titulo).
     Idempotente: filename ja existente vira skip (nao sobrescreve edicoes manuais). -->

```javascript
// DI-01: import direto (GT-04).
const { migrateLessons } = await import('./lib/migrate-lessons.ts')

const report = await migrateLessons(process.cwd())
console.log('Lessons:', report.status, '— wrote:', report.written.length, 'skipped:', report.skipped.length)

if (report.status === 'skipped' && report.skipped.some((s) => s.reason.includes('source-missing'))) {
  console.log('  (no lessons-learned.md in backup — nothing to migrate)')
}
```

Compound notes follow the CA-29 contract (frontmatter `title`/`category`/`tags`/`created`) and
will be validated by `bun run compound:check` (Plano 04 fase-02).

---

### Step migrate.4: Convert decisions.md → docs/design-docs/ADR-NNNN-*.md (Plano 03 fase-05 — D3, M7, CA-15)

<!-- Le do .planning.v5-backup/decisions.md (G1). Gera 1 ADR por decisao com numeracao
     monotonica (G7) lendo o maior ADR-NNNN ja existente em docs/design-docs/. Idempotente
     por slug (skip se ADR-*-{slug}.md ja existe). Se senior-principles.md existir no backup,
     copia para docs/design-docs/core-beliefs.md (G-A3). -->

```javascript
// DI-01: import direto (GT-04).
const { migrateDecisions } = await import('./lib/migrate-decisions.ts')

const report = await migrateDecisions(process.cwd())
console.log('Decisions:', report.status, '— wrote:', report.written.length)
if (report.coreBeliefs === 'created') {
  console.log('  core-beliefs.md created from senior-principles.md')
}
```

ADRs follow the CA-15 contract (frontmatter `id`/`title`/`status`/`date`/`tags`) and Context/
Decision/Consequences sections. Numbering is monotonic per `docs/design-docs/` (G7) — adding
ADRs manually later does not collide.

---

### Step 1 (v6.0.0): Scaffold full harness tree

```javascript
// DI-06: import direto em vez de bun -e (GT-04 — bun -e com paths absolutos quebra no Windows).
import path from 'node:path'
const { scaffoldTemplates } = await import('./lib/scaffold-templates.ts')
const { scaffoldFullTree } = await import('./lib/scaffold-full-tree.ts')
const { detectProjectName } = await import('./lib/detect-project-name.ts')

const targetDir = process.cwd()
const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT ?? path.join(import.meta.dir, '..', '..')
const projectName = detectProjectName(targetDir)
const stack = 'unknown' // step 6 (stack-detection) refines this

// AGENTS.md + ARCHITECTURE.md (Plano 01)
const baseResult = await scaffoldTemplates({
  targetDir,
  templatesDir: path.join(pluginRoot, 'skills/init/assets/templates'),
  projectName,
  stack,
})

// 14+ docs + structure (Plano 02 fase-02)
const treeResult = await scaffoldFullTree({
  targetDir,
  projectName,
  stack,
})

console.log('Base files:', baseResult.filesWritten.length)
console.log('Tree files:', treeResult.filesWritten.length, 'in', treeResult.durationMs, 'ms')
```

After this step the project has 27 files: AGENTS.md, ARCHITECTURE.md, TODO.md, and 24 docs/* files.
Step 2 (next phase) handles symlink fallback for CLAUDE.md → AGENTS.md.

---

### Passo 1.5 (v6.0.0): Criar TODO.md na raiz (idempotente)

Verificar se `{projectRoot}/TODO.md` existe.
- Se existe: skip silencioso (G2 — nao sobrescrever historico do usuario).
- Se ausente: copiar `skills/todo-pick/templates/todo-md-skeleton.md` para `{projectRoot}/TODO.md`.

Encoding: UTF-8 sem BOM. Line endings: LF.

```javascript
// DI-06: import direto em vez de bun -e (GT-04 — bun -e com paths absolutos quebra no Windows).
// 2026-05-12 (Luiz/dev): CA-31 prereq — TODO.md idempotente para /todo-pick funcionar.
const { scaffoldTodoMd } = await import('./lib/scaffold-todo-md.ts')

const result = scaffoldTodoMd(process.cwd())
if (result === 'created') {
  console.log('TODO.md criado na raiz do projeto.')
} else {
  console.log('TODO.md ja existe — mantido sem modificacao (G2).')
}
```

**Nota:** O `scaffoldFullTree` (Passo 1) ja cria `TODO.md` via `TODO.md.tpl` no manifest.
Este passo garante criacao idempotente usando o skeleton canônico do `/todo-pick`
quando o arquivo nao foi gerado pelo scaffold (ex: projeto legado ou init parcial).

---

### Step 2 (v6.0.0): Link CLAUDE.md to AGENTS.md

Creates CLAUDE.md as a mirror of AGENTS.md using a 3-tier fallback:
- **Tier 1 (symlink):** POSIX / Windows with developer mode ON
- **Tier 2 (hardlink):** Windows 11 without developer mode (NTFS hardlink, no admin required — G1)
- **Tier 3 (copy + hook):** Fallback when both fail — copies content and registers a `PostToolUse` hook in `.claude/settings.local.json` that re-syncs CLAUDE.md whenever AGENTS.md is edited

Invoke from the skill root:

```javascript
// DI-01: bun -e is unreliable on Windows (GT-04). Call helper via script reference instead.
// From the skill runner context, resolve lib path relative to SKILL.md location.
const { linkClaudeToAgents } = await import('./lib/symlink-fallback.ts')
const r = await linkClaudeToAgents(targetDir)
console.log('Linked via tier:', r.tier)
if (r.tier === 'copy-with-hook') {
  console.log('Hook registered in .claude/settings.local.json — CLAUDE.md will re-sync on edits to AGENTS.md')
}
```

After this step, CLAUDE.md mirrors AGENTS.md (same content). AGENTS.md remains the single source of truth (D16).

---

### Step 3 (v6.0.0): Detect stack and register in STATE.md (D7, M3)

```javascript
// DI-06: import direto em vez de bun -e (GT-04 — bun -e com paths absolutos quebra no Windows).
const { detectStack } = await import('./lib/detect-stack.ts')
const { writeStackToStateMd } = await import('./lib/state-md-init.ts')

const stack = await detectStack(process.cwd())
console.log('Detected stack:', stack.id, '(via', stack.signalSource, ')')

const result = await writeStackToStateMd(process.cwd(), stack)
console.log('STATE.md', result.status, ':', result.path)
```

Important: v6.0.0 only **registers** the stack. Knowledge packs (`docs/knowledge/{stack}/`) ship in v6.1+.

---

### Step 3.1 (v6.3.2): Persist stack to `.claude/stack.json` + copy knowledge (Plano 02 fase-03)

<!-- 2026-05-16 (Luiz/dev): Plano 02 fase-03 — multi-stack + idempotent default + --refresh-knowledge (CA-04, RF7).
     G2 do plano: Step 3 (state-md-init) acima permanece intacto (CA-10).
     G6 do plano: parseRefreshFlag inline ~10 linhas, sem commander/yargs.
     DI-4: parseRefreshFlag extraído em skills/init/lib/parse-refresh-flag.ts para testabilidade.
     2026-05-17 (Luiz/dev): Wave 5 D2 — orquestração extraída para lib/run-stack-knowledge-init.ts (testável).
     Step 3.1 agora é thin caller; toda lógica está no helper com suite de testes própria. -->

```javascript
// 2026-05-17 (Luiz/dev): Wave 5 D2 — orquestracao extraida para lib/run-stack-knowledge-init.ts (testavel).
// DI-06: import direto (GT-04 — bun -e com paths absolutos quebra no Windows).
import path from 'node:path'
const { runStackKnowledgeInit } = await import('./lib/run-stack-knowledge-init.ts')
const targetDir = process.cwd()
const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT ?? path.join(import.meta.dir, '..', '..')
await runStackKnowledgeInit({ targetDir, pluginRoot, args: typeof ARGUMENTS === 'string' ? ARGUMENTS : '' })
```

---

### Step 4 (v6.0.0): Customize ARCHITECTURE.md with detected stack

```javascript
// DI-06: import direto em vez de bun -e (GT-04 — bun -e com paths absolutos quebra no Windows).
const { customizeArchitecture } = await import('./lib/customize-architecture.ts')
const { detectStack } = await import('./lib/detect-stack.ts')

const stack = await detectStack(process.cwd())
const result = await customizeArchitecture({
  targetDir: process.cwd(),
  stack,
})

console.log('ARCHITECTURE.md customized for', stack.id, '— written:', result.written)
```

After this step, ARCHITECTURE.md contains a "Detected Stack" section with the framework name and date.

---

### Step 5 (v6.0.0): Install GitHub Actions + PR template (D14 — always)

```javascript
// DI-06: import direto em vez de bun -e (GT-04 — bun -e com paths absolutos quebra no Windows).
const { installGhFiles } = await import('./lib/install-gh-files.ts')
const result = await installGhFiles(process.cwd())
console.log('.github files installed:', result.filesWritten)
```

These files are installed unconditionally (D14). Projects not using GitHub may delete `.github/` after init.

---

### Step 6 (v6.0.0, optional): Delivery Loop opt-in (D12)

Ask user:
> "Do you use Linear and want to enable the Delivery Loop convention?  [y/N]"

Default: **N** (skip).

If yes:

```javascript
// DI-06: import direto em vez de bun -e (GT-04 — bun -e com paths absolutos quebra no Windows).
import path from 'node:path'
import { promises as fs } from 'node:fs'
const { injectOptionalSection } = await import('./lib/inject-optional-section.ts')

const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT ?? path.join(import.meta.dir, '..', '..')
const snippet = await fs.readFile(
  path.join(pluginRoot, 'skills/init/assets/snippets/delivery-loop.md'),
  'utf8',
)

const result = await injectOptionalSection({
  filePath: path.join(process.cwd(), 'AGENTS.md'),
  marker: '<!-- INIT:DELIVERY_LOOP_SLOT -->',
  body: snippet,
})

console.log('Delivery Loop injection:', result.status)
```

If `result.status === 'marker-missing'`, log a warning — AGENTS.md was hand-edited or template version mismatch.

---

### Step 7 (v6.3.0): Capabilities Discovery (Plano 02 fase-03)

<!-- Roda APÓS architecture profile detectado (via skill separada /detect-architecture).
     Se o profile não foi detectado (readArchitectureProfile retorna null), o step pula silenciosamente.
     Soft-fail obrigatório — NUNCA aborta /init em caso de erro. -->

```javascript
const { randomUUID } = await import('node:crypto')
const { writeFile, readFile } = await import('node:fs/promises')
const path = await import('node:path')
const { readArchitectureProfile } = await import('../lib/read-architecture-profile.ts')
const { discoverCapabilities } = await import('../lib/capabilities-writer.ts')
const { AuditLogWriter } = await import('./lib/audit-log.ts')

const projectRoot = process.cwd()
const profileObj = readArchitectureProfile()

if (profileObj === null) {
  console.log('[capabilities-discovery] skipped — architecture profile not detected. Run /anti-vibe-coding:detect-architecture first.')
} else {
  const startMs = Date.now()
  try {
    const output = await discoverCapabilities(projectRoot, profileObj.profile)

    const capsPath = path.join(projectRoot, 'discovery', 'capabilities.json')
    await writeFile(capsPath, JSON.stringify(output, null, 2), 'utf-8')

    // Soft schema validation — warn only, never throw
    if (output.schema_version !== '1.0') {
      console.warn('[capabilities-discovery] schema_version mismatch — expected "1.0", got ' + JSON.stringify(output.schema_version))
    }

    // Audit entry — generate fresh run_id (greenfield /init has no inventory.json)
    const writer = new AuditLogWriter(projectRoot, randomUUID())
    await writer.append({
      subagent_id: 'capabilities-discovery',
      input_paths: ['app/**', 'routes/**'],
      output_struct: {
        capabilities_count: output.capabilities.length,
        coverage_gaps_count: output.coverage_gaps.length,
        profile: profileObj.profile,
        schema_version: '1.0',
      },
      duration_ms: Date.now() - startMs,
      retry_count: 0,
    })

    // User-facing warnings via console.log (NOT stderr) — these surface as Claude text output
    if (output.coverage_gaps.length > 0 && output.capabilities.length === 0) {
      console.log('Capabilities discovery found no routes. Consider running /anti-vibe-coding:init --refresh after adding routes.')
    } else if (output.coverage_gaps.length > 0) {
      console.log('Capabilities discovery: ' + output.capabilities.length + ' routes found, ' + output.coverage_gaps.length + ' coverage gaps. Run /anti-vibe-coding:init --refresh if routes change.')
    }
  } catch (err) {
    // Soft-fail: log warning but DO NOT rethrow — /init must continue
    console.warn('[capabilities-discovery] step failed, skipping:', err instanceof Error ? err.message : String(err))
  }
}
```

After this step, `discovery/capabilities.json` exists (when profile detected) and `discovery/agents-log.json` has a `capabilities-discovery` audit entry. Profile detection itself is performed by the standalone `/anti-vibe-coding:detect-architecture` skill — this step is a no-op when profile is absent.

---

### Step reuse-discovery.0: Parse --reuse-discovery / --refresh flag (Plano 01 fase-01 — CA-01, CA-03; estendido por v6.3.0 plano05 fase-01 DEC-2)

<!-- Detecta --reuse-discovery OU --refresh (alias) em ARGUMENTS antes de qualquer outro passo.
     Quando presente e cache fresh (<24h), regenera capabilities.json + parity-gaps.json (graceful degradation).
     Quando presente e cache stale/ausente, warn + cai no fluxo normal (Passo 0 abaixo).
     Quando ausente, comportamento byte-identical ao v6.2.x.
     D1/D4 do PRD: flag --reuse-discovery, antes do Passo 0 (não dentro).
     DEC-2 (2026-05-15) v6.3.0 plano05 fase-01: --refresh é alias do --reuse-discovery; parity-gaps.json
     também é regenerado quando /parity-audit está disponível. -->

```javascript
// 2026-05-15 (Luiz/dev): subagent_id 'reuse-discovery' — alinhado com PRD §RF-SH-01 / §CA-05
const { randomUUID } = await import('node:crypto')
const {
  parseReuseDiscoveryFlag,
  readLastInitTimestamp,
  shouldReuseDiscovery,
  formatStaleMessage,
  resolveThresholdMs,
  tryRegenerateParityGaps,
  FRESH_THRESHOLD_MS,
} = await import('./lib/reuse-discovery.ts')
const { AuditLogWriter } = await import('./lib/audit-log.ts')

const argsStr = typeof ARGUMENTS === 'string' ? ARGUMENTS : ''
const { reuseDiscovery } = parseReuseDiscoveryFlag(argsStr.split(/\s+/).filter(Boolean))

if (reuseDiscovery) {
  const startMs = Date.now()
  const cachedAt = await readLastInitTimestamp(process.cwd())

  // 2026-05-15 (Luiz/dev): env override RF-CH-01 — injection (DI) para testabilidade
  const thresholdMs = resolveThresholdMs(process.env.ANTI_VIBE_FRESH_HOURS)

  if (shouldReuseDiscovery(cachedAt, thresholdMs)) {
    console.log('[reuse-discovery] cache fresh — running Step 7 only')

    // Inline Step 7 (Capabilities Discovery) — single capabilities-discovery audit entry (G4: NÃO duplicar)
    const { readArchitectureProfile } = await import('../lib/read-architecture-profile.ts')
    const { discoverCapabilities } = await import('../lib/capabilities-writer.ts')
    const { writeFile } = await import('node:fs/promises')
    const pathMod = await import('node:path')

    const profileObj = readArchitectureProfile()
    if (profileObj !== null) {
      const out = await discoverCapabilities(process.cwd(), profileObj.profile)
      await writeFile(pathMod.join(process.cwd(), 'discovery', 'capabilities.json'), JSON.stringify(out, null, 2), 'utf-8')
    }

    // 2026-05-15 (Luiz/dev): regen parity-gaps.json — PRD v6.3.0 §RF-CH-01 / DEC-2 option 3.
    // Loader retorna null se /parity-audit ausente (graceful degradation — warning único, sem falhar).
    const parityResult = await tryRegenerateParityGaps(process.cwd(), async () => {
      try {
        const inspector = await import('../lib/tool-registry-inspector.ts')
        const writer = await import('../parity-audit/lib/parity-gaps-writer.ts')
        return {
          inspectToolRegistry: inspector.inspectToolRegistry,
          computeParityGaps: writer.computeParityGaps,
          writeParityGaps: writer.writeParityGaps,
        }
      } catch {
        return null
      }
    })
    if (!parityResult.regenerated) {
      console.warn(`[reuse-discovery] parity-gaps.json skipped — ${parityResult.reason}`)
    }

    // Audit entry adicional para o reuse-discovery (G4: ADICIONAL ao audit de capabilities-discovery, não substitui)
    const cachedAtMs = cachedAt !== null ? Date.parse(cachedAt) : 0
    const writer = new AuditLogWriter(process.cwd(), randomUUID())
    await writer.append({
      subagent_id: 'reuse-discovery',
      input_paths: ['discovery/agents-log.json'],
      output_struct: {
        cache_age_ms: Date.now() - cachedAtMs,
        cached_at: cachedAt,
        threshold_ms: FRESH_THRESHOLD_MS,
      },
      duration_ms: Date.now() - startMs,
      retry_count: 0,
    })

    process.exit(0) // atalho concluído — não cair em Passo 0
  } else {
    console.log(formatStaleMessage(cachedAt))
    // fall through para Passo 0 — fluxo normal completo
  }
}
```

After this step, when `--reuse-discovery` (ou alias `--refresh`) is passed and cache is fresh, control should jump to Step 7 (capabilities.json é regenerado + parity-gaps.json é regenerado se /parity-audit disponível, com graceful degradation caso contrário). When stale or absent, control continues to `Passo 0 — Detectar Modo de Inicialização`.

---

### Passo 0 — Detectar Modo de Inicialização (Plano 01 fase-03 + Plano 04 fase-03)

<!-- DEPRECATED: bloco anterior (hasManifest/require/pluginVersion) substituído por detectInitMode. -->

**ANTES de qualquer coisa**, detectar o modo de inicialização do projeto:

```javascript
// DI-06: import direto em vez de bun -e (GT-04 — bun -e com paths absolutos quebra no Windows).
const { detectInitMode } = await import('./lib/migration-mode-detector.ts')

const { mode, signals } = await detectInitMode(process.cwd())
console.log(`## Anti-Vibe Coding — Inicialização\nModo detectado: ${mode}`)
signals.forEach((s) => console.log(`  [${s.type}] ${s.description}`))
```

#### Se mode === 'already-initiated' → Modo Atualização

O projeto já tem Anti-Vibe Coding instalado. Executar lógica de **atualização incremental**
(ver `skills/update/SKILL.md`). Não seguir para os passos seguintes.

#### Se mode === 'v5-legacy' → Migração v5

Equivalente ao exit(1) do Step 0.5 original. Prompt user com:
- Migrar / Dry-run / Skip (treat as new)

Seguir para `Step migrate.all`. Não seguir para greenfield.

#### Se mode === 'migration' → Migration Mode (3rd State — RF-MH-01)

Repo populado com docs institucionais humanos — sem harness. Antes de exibir o menu:

```javascript
// Plano 04 fase-03: auto-flip se todos os migration plans já foram completados.
const { readManifest, autoFlipIfComplete } = await import('./lib/manifest-writer.ts')

const manifest = await readManifest(process.cwd())
if (manifest) {
  const flipResult = await autoFlipIfComplete(process.cwd(), manifest)
  if (flipResult.flipped) {
    console.log('Migration concluded — strict mode re-engaged. All migration plans are now in completed/.')
    // Encerrar sem re-executar fases.
    process.exit(0)
  }
  const remaining = manifest.migrationPlans?.filter((p) => p.status === 'active').length ?? 0
  console.log(`Migration in progress: ${remaining} plans remaining in docs/exec-plans/active/. Run /execute-plan or move plans manually.`)
}
```

Se `autoFlipIfComplete` não flippou, executar verificação de idempotência ANTES de exibir o menu:

```javascript
<!-- IDEMPOTENCY CHECK (Plano 05 fase-01) -->
// Ordem importa: regenerateDiscovery ANTES de checkIdempotency (G4 do README do Plano 05).
const { regenerateDiscovery, checkIdempotency } = await import('./lib/idempotency.ts')

// 1. Deletar artefatos de discovery para forçar re-scan completo.
await regenerateDiscovery(process.cwd())

// 2. Verificar quais candidatos foram editados pelo humano ou são plans preservados.
const planCandidates = manifest.migrationPlans?.map((p) => p.path) ?? []
const idempotencyResult = await checkIdempotency(process.cwd(), manifest, planCandidates)

// 3. Exibir warnings ao operador.
for (const warning of idempotencyResult.warnings) {
  console.warn(`⚠️ [idempotency] ${warning.message}`)
}

// 4. Passar skipPaths para runMigrationMode() — orchestrator pula fases cujo output já existe.
// runMigrationMode({ ..., skipPaths: idempotencyResult.skipPaths })
```

Mostrar resumo e usar `AskUserQuestion` com opções:
- 1: "Iniciar migration pipeline" → seguir para `Step migration.0`
- 2: "Dry-run (ver inventário sem executar)" → seguir para `Step migration.dry-run`
- 3: "Tratar como greenfield (ignorar docs existentes)" → seguir para Passo 1

**IMPORTANTE (RF-MH-06):** A confirmação humana via AskUserQuestion é OBRIGATÓRIA antes
de qualquer fase que consuma tokens. Nunca iniciar a migration pipeline sem confirmação.

#### Se mode === 'greenfield' → Instalação Normal

Primeira instalação em repo limpo. Seguir para Passo 1 normalmente.

---

### Passo 1 — Detectar Estado do Projeto

Verificar a existencia destes arquivos no projeto:
- `CLAUDE.md` na raiz
- `.claude/rules/` com rules existentes
- `.claude/decisions.md`

### Passo 2 — Setup do CLAUDE.md

#### Cenario A: Projeto SEM CLAUDE.md

1. Ler o template Anti-Vibe em `${CLAUDE_PLUGIN_ROOT}/CLAUDE.md`
2. Apresentar ao usuario o conteudo que sera criado
3. Perguntar: "Este CLAUDE.md sera criado na raiz do projeto. Aprovar?"
4. Se aprovado, criar o arquivo

#### Cenario B: Projeto COM CLAUDE.md existente (MERGE)

Cenario mais importante. Seguir EXATAMENTE:

1. **Ler** o CLAUDE.md existente do projeto (o "original")
2. **Ler** o template Anti-Vibe em `${CLAUDE_PLUGIN_ROOT}/CLAUDE.md` (o "template")
3. **Analisar** o original e identificar:
   - Secoes especificas do projeto (stack, configs, variaveis de ambiente, regras de negocio)
   - Padroes ja definidos que podem conflitar com o Anti-Vibe
   - Informacoes que DEVEM ser preservadas
4. **Fazer o merge** seguindo as regras de prioridade abaixo

#### Regras de Merge

| Situacao | Acao |
|----------|------|
| Secao existe SO no original | **PRESERVAR** integralmente |
| Secao existe SO no template Anti-Vibe | **ADICIONAR** ao resultado |
| Secao existe em AMBOS sem conflito | **COMBINAR** (original + Anti-Vibe) |
| Secao existe em AMBOS COM conflito | **PRESERVAR o original**, adicionar nota do Anti-Vibe como complemento |
| Informacoes do projeto (stack, env vars, configs) | **SEMPRE preservar** do original |
| Filosofia Anti-Vibe Coding | **SEMPRE adicionar** no topo |
| Workflow de desenvolvimento | **Adicionar** se nao existir workflow equivalente |
| Tabelas de skills/commands do Anti-Vibe | **SEMPRE adicionar** ao final |

> **Conteúdo das seções Akita a adicionar:** Ver seção `## Template Akita` ao final deste skill.

#### Estrutura do Merge (ordem das secoes)

```
1. Filosofia Anti-Vibe Coding (do template — SEMPRE no topo)
2. Instrucoes Gerais (merge: original + template)
3. [Secoes especificas do projeto original — TODAS preservadas na ordem original]
4. Padroes Core (do template, se o original nao tiver equivalente)
5. Workflow de Desenvolvimento (do template, se o original nao tiver equivalente)
6. Modo Consultor (do template — resumo com link para skill)
7. Modelo de Permissoes (merge: original + template)
8. Auto-Correcao e Aprendizado (do template)
9. Anti-Patterns (merge: original + template)
10. [Mais secoes especificas do original, se houver]
11. Plugin Anti-Vibe Coding (tabelas de skills/agents — SEMPRE ao final)
12. Git Workflow (merge: original + template)
13. Licoes Aprendidas (do template, se nao existir)
14. Decisoes Arquiteturais (do template, se nao existir)
```

5. **Apresentar o resultado** mostrando:
   - O CLAUDE.md mesclado completo
   - Um resumo das mudancas:
     - Secoes adicionadas do Anti-Vibe
     - Secoes preservadas do original
     - Secoes mescladas (indicando o que veio de cada lado)
     - Conflitos resolvidos (e como foram resolvidos)

6. **Pedir aprovacao** usando AskUserQuestion:
   - Opcao 1: "Aprovar e aplicar"
   - Opcao 2: "Ver diff detalhado" (mostra antes/depois lado a lado)
   - Opcao 3: "Ajustar antes de aplicar" (permite feedback para modificar)

7. Se "Ajustar", aplicar as modificacoes pedidas e apresentar novamente

8. Se aprovado, **criar backup** do original como `CLAUDE.md.backup` e aplicar o merge

### Passo 2.5 — Extração de Conhecimento do Projeto

Este passo extrai conhecimento valioso de arquivos existentes no projeto (além do CLAUDE.md) e o popula nas estruturas do plugin.

#### 1. Detectar arquivos de conhecimento

Buscar pelos seguintes padrões no projeto:
- `progress.txt`, `PROGRESS.md`, `progress.md`
- `.claude/memory/*.md` (arquivos de memória de sessões anteriores)
- `notes.md`, `NOTES.md`, `gotchas.md`, `GOTCHAS.md`
- `lessons.md`, `lessons-learned.md`
- Qualquer `*.md` dentro de `.claude/` que NÃO seja `CLAUDE.md`, `decisions.md` ou `rules/`

Se nenhum arquivo for encontrado além do CLAUDE.md: pular este passo.

#### 2. Analisar e filtrar cada arquivo

Para cada arquivo encontrado, ler o conteúdo e aplicar o **Filtro de Qualidade Sênior**:

Uma entrada SO qualifica se atender PELO MENOS 2 destes critérios:

| Critério | Descrição |
|----------|-----------|
| **Não é deduzível** | A IA não conseguiria inferir apenas lendo a documentação da stack |
| **É específica do projeto** | Aplica-se ao contexto, stack ou regras de negócio deste projeto |
| **Custo alto se repetido** | Se repetido, causa retrabalho, bug em produção, perda de dados |
| **Contra-intuitiva** | Vai contra o que a IA faria por padrão |

**DESCARTAR automaticamente:**
- Erros de sintaxe ou typos
- Bugs que os testes já cobrem
- Coisas que a documentação oficial já explica
- Padrões genéricos de clean code
- Qualquer coisa que a IA acertaria na segunda tentativa sem instrução

#### 3. Classificar as entradas extraídas

Cada entrada qualificada deve ser classificada em:

**→ Lição Aprendida** (vai para seção "Lições Aprendidas" do CLAUDE.md):
- Padrões de erro recorrentes deste projeto
- Comportamentos inesperados de integrações usadas
- Armadilhas específicas da stack/contexto do projeto

**→ Decisão Arquitetural** (vai para `.claude/decisions.md`):
- Escolhas de tecnologia feitas e por quê
- Trade-offs já avaliados
- Decisões de design que afetam múltiplos módulos

**→ Regra de Projeto** (vai para seção de padrões no CLAUDE.md):
- Convenções específicas deste projeto
- Restrições de negócio que impactam o código

#### 4. Apresentar ao usuário

Mostrar um resumo organizado por arquivo analisado:

```
## Conhecimento Extraído

### progress.txt (47 entradas analisadas)
- 3 qualificadas → Lições Aprendidas
- 1 qualificada → Decisão Arquitetural
- 43 descartadas (banais/duplicadas)

### .claude/memory/session-notes.md (12 entradas analisadas)
- 2 qualificadas → Lições Aprendidas
- 9 descartadas

### Preview das entradas que serão adicionadas:

**Lições Aprendidas:**
1. [Integração] ... [preview da lição]
2. [Armadilha] ... [preview da lição]
...

**Decisões Arquiteturais:**
1. [Nome da decisão] ...
...
```

Usar AskUserQuestion com:
- Opção 1: "Aplicar tudo"
- Opção 2: "Revisar entrada por entrada" (mostrar cada uma e pedir aprovação individual)
- Opção 3: "Pular extração"
- Opção 4: "Aplicar tudo e arquivar arquivo fonte" (extrai + move original para `.claude/archive/`)

#### 5. Aplicar o conhecimento aprovado

**Lições Aprendidas:** Adicionar na seção `## Lições Aprendidas` do CLAUDE.md mesclado, usando o formato:
```
### [Categoria] Título conciso da lição
**Regra:** [Uma frase imperativa, direta]
**Contexto:** [Por que essa regra existe — máximo 2 linhas]
```

Categorias válidas: `[Arquitetura]`, `[Integração]`, `[Performance]`, `[Negócio]`, `[Deploy]`, `[Armadilha]`

Limite: máximo 15 entradas. Se exceder, priorizar pelas que atendem mais critérios do filtro sênior.

**Decisões Arquiteturais:** Adicionar em `.claude/decisions.md` usando o formato:
```
### [Nome da Decisão]: [Opção Escolhida]
**Data:** [data extraída do arquivo ou hoje]
**Alternativas consideradas:** [extrair do contexto, se disponível]
**Justificativa:** [extrair do contexto]
**Risco conhecido:** [extrair do contexto, ou "Não documentado"]
**Reversibilidade:** Reversível / Irreversível
```

#### 6. Arquivar arquivo fonte (se Opção 4 escolhida)

Para cada arquivo de origem processado:
1. Criar diretório `.claude/archive/` se não existir
2. Mover o arquivo para `.claude/archive/<nome-do-arquivo>` (ex: `progress.txt` → `.claude/archive/progress.txt`)
3. Se já existir arquivo com mesmo nome no archive, adicionar timestamp: `.claude/archive/progress.txt.2026-03-09`
4. Informar ao usuário: "Arquivado: `progress.txt` → `.claude/archive/progress.txt`"

**Não arquivar automaticamente:** arquivos dentro de `.claude/` (como `memory/*.md`) — apenas arquivos na raiz ou fora do `.claude/`.

#### Regras Importantes

- **NUNCA** criar lições genéricas que se aplicariam a qualquer projeto
- **NUNCA** duplicar o que já está no CLAUDE.md mesclado
- Se um arquivo de origem for muito grande (>500 linhas), processar em blocos e ser mais seletivo
- Manter rastreabilidade: comentar de qual arquivo cada lição foi extraída (em comentário HTML)

### Passo 3 — Setup das Rules

1. Verificar se `.claude/rules/` existe
2. Para cada rule do Anti-Vibe (typescript, testing, api):
   - Se a rule NAO existe no projeto: copiar do template
   - Se a rule JA existe: apresentar as diferencas e perguntar se quer mesclar
3. Copiar as rules aprovadas

As rules do template estao em: `${CLAUDE_PLUGIN_ROOT}/rules/`

### Passo 4 — Setup dos Hooks

**IMPORTANTE:** Os arquivos `.cjs` dos hooks ficam NO PLUGIN CACHE, não são copiados para o projeto. Apenas o `hooks.json` vai para `.claude/hooks/hooks.json` do projeto.

1. Verificar se `.claude/hooks/hooks.json` existe no projeto
2. Se NÃO existe: copiar do plugin
3. Se JÁ existe: **MERGE inteligente**

#### Merge de hooks.json

O merge deve combinar hooks do plugin COM hooks customizados do projeto:

**Regras de merge:**
- Cada evento (SessionStart, UserPromptSubmit, PreToolUse, etc.) pode ter múltiplos hooks
- Hooks do plugin devem ser ADICIONADOS aos hooks existentes, não substituídos
- Ordem de execução: hooks customizados PRIMEIRO, depois hooks do plugin
- Exceção: version-check deve vir ANTES de outros hooks no SessionStart

**Algoritmo de merge:**

```javascript
const pluginHooks = JSON.parse(fs.readFileSync(pluginHooksPath, 'utf8'));
const projectHooks = JSON.parse(fs.readFileSync(projectHooksPath, 'utf8'));

const merged = { hooks: {} };

// Para cada evento (SessionStart, UserPromptSubmit, etc.)
for (const eventName of Object.keys(pluginHooks.hooks)) {
  const pluginEventHooks = pluginHooks.hooks[eventName];
  const projectEventHooks = projectHooks.hooks[eventName] || [];

  // Combinar: projeto primeiro, depois plugin
  merged.hooks[eventName] = [
    ...projectEventHooks,
    ...pluginEventHooks
  ];
}

// Adicionar eventos que existem só no projeto
for (const eventName of Object.keys(projectHooks.hooks)) {
  if (!merged.hooks[eventName]) {
    merged.hooks[eventName] = projectHooks.hooks[eventName];
  }
}
```

**Importante:**
- NUNCA copiar arquivos `.cjs` para o projeto
- Hooks do plugin são executados via `process.env.CLAUDE_PLUGIN_ROOT`
- Hooks do projeto são executados via path relativo (ex: `node .claude/hooks/meu-hook.cjs`)

### Passo 5 — Setup do Decisions Registry

1. Se `.claude/decisions.md` nao existe, criar com template vazio
2. Se ja existe, nao tocar

### Passo 6 — Criar Manifest Local

Após todas as instalações/merges, criar `.claude/.anti-vibe-manifest.json` para rastrear versões.

**Implementação:**

```javascript
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Ler plugin-manifest.json
const pluginManifestPath = join(process.env.CLAUDE_PLUGIN_ROOT, 'plugin-manifest.json');
const pluginManifest = JSON.parse(readFileSync(pluginManifestPath, 'utf8'));

// Criar estrutura do manifest local
const localManifest = {
  pluginVersion: pluginManifest.version,
  installedAt: new Date().toISOString(),
  files: {}
};

// Para cada arquivo instalado/mesclado nesta sessão:
installedFiles.forEach(file => {
  const filePath = join(projectRoot, file);
  const content = readFileSync(filePath, 'utf8');
  const checksum = createHash('sha256').update(content).digest('hex');

  localManifest.files[file] = {
    sourceVersion: pluginManifest.files[file].version,
    installedChecksum: checksum,
    lastUpdated: new Date().toISOString().split('T')[0],
    userModified: false
  };
});

// Salvar
const manifestPath = join(projectRoot, '.claude', '.anti-vibe-manifest.json');
writeFileSync(manifestPath, JSON.stringify(localManifest, null, 2), 'utf8');
```

**Arquivos rastreados:**
- CLAUDE.md
- senior-principles.md
- Todas as rules instaladas
- Todas as skills (se copiadas)
- Hooks (se instalados)
- Agents (se copiados)

**IMPORTANTE:** O manifest registra o checksum do arquivo APÓS merge/modificação, não o checksum original do plugin.

### Passo 7 — Resumo Final

Apresentar um resumo do que foi feito:

```
## Anti-Vibe Coding — Setup Concluido

### Arquivos criados/modificados:
- [criado/mesclado/ja existia] CLAUDE.md
- [criado] senior-principles.md
- [criado/ja existia] .claude/rules/typescript-standards.md
- [criado/ja existia] .claude/rules/testing-standards.md
- [criado/ja existia] .claude/rules/api-standards.md
- [criado/ja existia] .claude/decisions.md
- [criado] .claude/.anti-vibe-manifest.json (rastreamento de versões)

### Proximos passos:
1. Revisar o CLAUDE.md mesclado
2. Iniciar uma nova sessao para os hooks ativarem
3. Usar `/anti-vibe-coding:consultant` para a proxima feature
4. Para atualizar o plugin no futuro: rodar `/anti-vibe-coding:init` novamente
```

## Regras Importantes

- **NUNCA sobrescrever** informacoes do projeto sem aprovacao
- **NUNCA remover** secoes existentes do CLAUDE.md original
- **SEMPRE** criar backup antes de modificar
- **SEMPRE** mostrar ao usuario o que sera alterado antes de alterar
- O merge deve ser **aditivo** — o Anti-Vibe Coding complementa, nao substitui
- Se nao tiver certeza sobre um conflito, **perguntar ao usuario**

---

## Template Akita — Conteúdo das Seções a Adicionar

As seções abaixo compõem o bloco Akita que deve ser ADICIONADO ao CLAUDE.md do projeto durante o merge (Passo 2). Seguir as regras de merge: se seção equivalente já existe, COMBINAR; se não existe, ADICIONAR integralmente.

Posição na estrutura do merge: após `## Padrões Core` e antes de `## Workflow de Desenvolvimento`.

---

### Seção: Code Style for Agents

````markdown
## Code Style for Agents

Convenções obrigatórias para código gerado por IA:

- **Nomes grepáveis:** use nomes específicos ao domínio. NUNCA: `data`, `handler`, `process`, `item`, `info`, `result`, `value`, `temp`, `obj`
- **Funções ≤ 40 linhas:** se ultrapassar, extraia função com nome descritivo
- **Arquivos ≤ 500 linhas:** se ultrapassar, divida em módulos com responsabilidade única
- **SRP obrigatório:** uma função, uma responsabilidade. Side effects explícitos e isolados
- **Tipos explícitos:** sem `any`. Use `unknown` + type guard quando o tipo é incerto

```typescript
// TS/JS
// ERRADO
async function process(data: any) { ... }

// CERTO
async function chargeSubscriptionRenewal(invoice: InvoicePayload): Promise<ChargeResult> { ... }
```

```python
# Python
# ERRADO
def handle(data):
    ...

# CERTO
def send_overdue_payment_reminder(invoice: Invoice) -> NotificationResult:
    ...
```

```ruby
# Ruby
# ERRADO
def process(data)
  ...
end

# CERTO
def expire_unpaid_subscription(subscription:)
  ...
end
```
````

---

### Seção: Comments

````markdown
## Comments

**Escreva o WHY. Nunca o WHAT.**

**Comente quando:**
- Proveniência externa: `# via Stripe docs §3.2 — idempotency key obrigatório aqui`
- Decisão não óbvia: `# usar created_at em vez de updated_at — updated_at muda em reindexações`
- Workaround documentado: `# workaround: SDK retorna 200 em falha silenciosa (issue #4821)`
- Referência a bug: `# bug #1234: race condition se chamar sem lock`
- Constraint externo: `# limite da API: máx 100 itens por batch`
- Docstrings em funções públicas: sempre — parâmetros, retorno, exceções esperadas

**NUNCA comente:**
- O que o código já diz: `i += 1  # incrementa i`
- Nomes redundantes: `# calcula total` acima de `calculateTotal()`
- Código comentado (morto): delete, o git guarda o histórico

**Em refactor por IA:** não podar comentários do tipo WHY. Se um comentário explicar uma decisão ou workaround, ele sobrevive à refatoração mesmo que o código ao redor mude.
````

---

### Seção: Tests

````markdown
## Tests

Seguir **F.I.R.S.T:**
- **Fast:** testes unitários em < 50ms cada
- **Independent:** sem dependência de ordem ou estado compartilhado entre testes
- **Repeatable:** mesmo resultado em qualquer ambiente (sem clock real, sem rede real)
- **Self-validating:** passa ou falha — sem interpretação manual
- **Timely:** escrito ANTES do código de produção (TDD)

**Cobertura mínima:**
- Lógica de negócio: ≥ 95%
- Global: ≥ 80%
- Branch (condicionais): ≥ 70%

**Testes headless:** sem UI real, sem rede real, sem banco real. Use mocks/fakes para dependências externas.

**Nomes de teste:** verbo descritivo, sem "should". Ex: `returns 401 when token expired`, `charges invoice on first retry`.
````

---

### Seção: Dependencies

````markdown
## Dependencies

**Injeção de dependência via constructor/parameter — nunca instanciar internamente.**

```typescript
// ERRADO — acoplamento direto, impossível de testar
class InvoiceService {
  private stripe = new Stripe(process.env.STRIPE_KEY!)
}

// CERTO — DI via constructor
class InvoiceService {
  constructor(private readonly stripe: StripeClient) {}
}
```

```python
# Python — DI via parâmetro
# ERRADO
class InvoiceService:
    def __init__(self):
        self.stripe = Stripe(os.environ['STRIPE_KEY'])

# CERTO
class InvoiceService:
    def __init__(self, stripe: StripeClient):
        self.stripe = stripe
```

```ruby
# Ruby — DI via keyword argument
# ERRADO
class InvoiceService
  def initialize
    @stripe = Stripe::Client.new(ENV['STRIPE_KEY'])
  end
end

# CERTO
class InvoiceService
  def initialize(stripe:)
    @stripe = stripe
  end
end
```

Serviços externos (banco, APIs, filas) são sempre injetados — nunca instanciados dentro de classes de negócio.
````

---

### Seção: Logging

````markdown
## Logging

**JSON estruturado para debug/observabilidade; plain text apenas para CLI output.**

```typescript
// Debug/observabilidade — JSON estruturado
logger.info({ event: 'invoice.charged', invoiceId, customerId, amountCents, attempt })
logger.error({ event: 'stripe.charge.failed', invoiceId, error: err.message, code: err.code })

// CLI output — plain text legível
console.log(`Charged ${invoiceCount} invoices in ${elapsedMs}ms`)
```

```python
# Python — structlog ou logging com extra
import structlog
log = structlog.get_logger()
log.info("invoice.charged", invoice_id=invoice_id, customer_id=customer_id, amount_cents=amount_cents)
```

```ruby
# Ruby — structured hash
Rails.logger.info({ event: 'invoice.charged', invoice_id:, customer_id:, amount_cents: }.to_json)
```

**Campos obrigatórios em eventos de negócio:** `event` (nome do evento), entidade principal (id), resultado.  
**Nunca logar:** senhas, tokens, PII sem mascaramento, stack traces completas em produção.
````

## Diretorio do projeto

$ARGUMENTS

## Apos init concluir

Apresentar ao usuario UMA mensagem (nao executar):

```
Plugin v5.3 inicializado.

Sugestao: rode `/anti-vibe-coding:detect-architecture` para classificar este projeto
em 1 dos 5 perfis arquiteturais e ativar o Modo Dual nas skills estruturantes.

Voce pode rodar agora ou depois — a flag `architectureDetectorEnabled` controla
quando o Modo Dual fica ativo (default: false).
```

NAO invocar `/anti-vibe-coding:detect-architecture` automaticamente (respeita
`feedback_suggest_dont_execute.md` — IA sugere, usuario decide).
