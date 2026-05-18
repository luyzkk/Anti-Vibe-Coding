#!/usr/bin/env bun
// 2026-05-12 (Luiz/dev): harness-validate full — Plano 04 fase-03.
// Estende minimal do Plano 01 fase-04. Adiciona: 25 required-files, link checker,
// orphan plan detector (CA-28), heading H1 check, AGENTS.md links obrigatorios.
// Inline — nao depende de helpers externos para ser copiavel como script standalone.

import { promises as fs } from 'node:fs'
import path from 'node:path'

const root = process.cwd()

const REQUIRED_FILES = [
  'AGENTS.md',
  'ARCHITECTURE.md',
  'CLAUDE.md',
  'README.md',
  'package.json',
  '.github/pull_request_template.md',
  'docs/DESIGN.md',
  'docs/FRONTEND.md',
  'docs/PLANS.md',
  'docs/PRODUCT_SENSE.md',
  'docs/QUALITY_SCORE.md',
  'docs/MERGE_GATES.md',
  'docs/RELIABILITY.md',
  'docs/SECURITY.md',
  'docs/COMPOUND_ENGINEERING.md',
  'docs/STATE.md',
  'docs/design-docs/index.md',
  'docs/design-docs/core-beliefs.md',
  'docs/exec-plans/active/README.md',
  'docs/exec-plans/completed/README.md',
  'docs/exec-plans/tech-debt-tracker.md',
  'docs/generated/db-schema.md',
  'docs/product-specs/index.md',
  'docs/references/README.md',
  'scripts/harness-validate.ts',
  'scripts/compound-check.ts',
] as const

const AGENTS_MAX_LINES = 40

// Required links inside AGENTS.md — sinal do harness do Andre.
// 2026-05-14 (Luiz/dev): Plano 05 fase-03 — DT-10: 4 extensões anti-vibe adicionadas.
// Links devem corresponder exatamente ao AGENTS.md.tpl — qualquer diferença de texto
// causa falso negativo no content.includes(link) check.
const AGENTS_REQUIRED_LINKS = [
  '[ARCHITECTURE.md](./ARCHITECTURE.md)',
  '[docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md)',
  '[docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md)',
  // Anti-vibe extensions (DT-10 — category: 'anti-vibe-extension')
  '[docs/MERGE_GATES.md](./docs/MERGE_GATES.md)',
  '[docs/COMPOUND_ENGINEERING.md](./docs/COMPOUND_ENGINEERING.md)',
  '[docs/review-checklists/](./docs/review-checklists/)',
  '[docs/smoke-flows/](./docs/smoke-flows/)',
] as const

// Diretorios excluidos do crawl de markdown (G10 do plano).
// _archived/: compound notes arquivadas intencionalmente — links internos nao validados.
// .planning.v5-backup/: backup de migracao v5→v6 durante Plano 03 — evita falsos positivos.
// compound/: compound notes tem frontmatter YAML (---) em linha 1 — incompativel com H1 check.
//   BUG-04-01 (Luiz/dev 2026-05-12): harness H1 check conflita com CA-29 (frontmatter na linha 1).
//   Fix: excluir docs/compound/ do crawl. compound-check.ts valida esses arquivos independentemente.
// templates/: templates de skill tem placeholder links ({{X}}, ./PRD.md relativos a destino) — falsos positivos.
//   BUG-08-01 (Luiz/dev 2026-05-12): dog-food em Plano 08 fase-08 revelou que templates/ tem placeholder links que nao resolvem em filesystem.
// __fixtures__/: fixtures de teste com links relativos a destinos-clientes — nao a propria localizacao.
// claude-code/: arquivo do flatten 2026-05-13 (matrix-wrapper -> plugin-root). Estado congelado, links sao historicos.
// .planning/: convencao legada v5 — plans completos sao migrados para docs/exec-plans/completed/. Pasta viva pode conter fixtures de teste com links intencionalmente quebrados.
// .claude/: runtime/config do Claude Code (settings.json, custom slash commands). Slash commands sao validados pelo loader do CC, nao pelo harness — harness foca em docs/.
// _legacy-detail/: working notes (PRD/PLAN/STATE/planoXX) preservados ao migrar pastas .planning/<slug>/ para docs/exec-plans/completed/. Links sao historicos relativos a destinos antigos.
// v5-legacy/: docs v5.x (COMO-ATUALIZAR, IMPLEMENTACAO-VERSIONAMENTO, etc.) preservados em docs/references/v5-legacy/ — links apontam para paths v5 (scripts/*.js, hooks/*.json) nao mais existentes.
// exec-plans/: artefatos de planejamento (PRD, planoXX/fase-*.md) — links relativos ao repo root mas interpretados relativo ao path profundo; falsos positivos inevitaveis. Required-files check usa path direto (nao crawl).
// .anti-vibe/: backup canonico do /init (step 10 apply-merge-destructive) — arquivos originais movidos para backup perdem contexto relativo de links.
const SKIP_DIRS = new Set(['node_modules', '.git', '.claude', '.anti-vibe', '.planning', '.planning.v5-backup', 'claude-code', 'compound', 'templates', '__fixtures__', 'fixtures', 'snippets', '_legacy-detail', 'v5-legacy', 'exec-plans'])
const ARCHIVED_SEGMENT = '_archived'

// Inline — harness-validate é script standalone sem imports externos.
// CANONICAL: skills/init/lib/manifest-writer.ts InitMode/MigrationPlanEntry/AntiVibeManifest
// Manter em sync manual. Drift detectado por: diferença no shape do JSON retornado.
type InitMode = 'fresh' | 'migration' | 'completed'
type ManifestMigrationPlan = { id: string; slot: string; path: string; status: 'active' | 'completed' }
type InitManifest = {
  initMode?: InitMode
  migrationPlans?: ManifestMigrationPlan[]
}

async function readInitManifest(projectRoot: string): Promise<InitManifest | null> {
  try {
    const raw = await fs.readFile(path.join(projectRoot, '.claude', '.anti-vibe-manifest.json'), 'utf8')
    return JSON.parse(raw) as InitManifest
  } catch {
    return null
  }
}

type Failure = { rule: string; message: string }

/**
 * Em migration mode: verifica que todo slot ausente tem um plan ativo correspondente no manifest.
 * Slots sem plan ativo = error (mesmo em migration mode — "permissivo" != "sem cobertura").
 *
 * @param missingSlots - Paths relativos dos arquivos ausentes (ex: ['AGENTS.md', 'docs/DESIGN.md'])
 */
export async function checkMigrationConsistency(
  failures: Failure[],
  manifest: { migrationPlans?: Array<{ slot: string; status: string }> },
  _projectRoot: string,
  missingSlots: string[],
): Promise<void> {
  if (missingSlots.length === 0) return

  const activePlanSlots = new Set(
    (manifest.migrationPlans ?? [])
      .filter((p) => p.status === 'active')
      .map((p) => p.slot),
  )

  for (const missingSlot of missingSlots) {
    if (!activePlanSlots.has(missingSlot)) {
      failures.push({
        rule: 'migration-consistency',
        message: `Migration mode: '${missingSlot}' is missing and has no active migration plan. Add a plan or create the file.`,
      })
    }
  }
}

async function main(): Promise<void> {
  const failures: Failure[] = []
  const warnings: Failure[] = []

  const manifest = await readInitManifest(root)
  const isMigrationMode = manifest?.initMode === 'migration'

  // Checks paralelos que nao dependem de coleta de markdown.
  await Promise.all([
    checkRequiredFiles(failures, warnings, isMigrationMode),
    checkAgentsConstraints(failures),
    checkActivePlans(failures),
    checkQualityScoreFormat(failures),
    checkAgentContracts(failures), // 2026-05-14 (Luiz/dev): novo — CA-10
    checkV6PathWhitelist(failures), // 2026-05-14 (Luiz/dev): v6.2.0 — CA-v6pw
    checkProfileAwarePreface(failures), // 2026-05-15 (Luiz/dev): Plano 04 fase-03 — CA-07, CA-11
    checkKnowledgePresence(failures), // 2026-05-17 (Luiz/dev): H1.4 — knowledge INDEX + atom count
  ])

  // Consistency check em migration mode: todo slot ausente deve ter plan ativo.
  if (isMigrationMode && manifest) {
    const missingSlotsInChecks = warnings
      .filter((w) => w.rule === 'required-files')
      .map((w) => {
        const match = w.message.match(/Missing required file: (.+)/)
        return match?.[1] ?? null
      })
      .filter((s): s is string => s !== null)

    await checkMigrationConsistency(failures, manifest, root, missingSlotsInChecks)
  }

  // Coleta de markdown e recursiva — executa apos checks basicos mas internamente paralela.
  const mdFiles = await collectMarkdownFiles(root)
  await checkMarkdownFiles(mdFiles, failures)

  // Print warnings (nao param o pipeline).
  if (warnings.length > 0) {
    console.warn(`Migration mode: ${warnings.length} warning(s) (slots sem arquivo — coverage by plans expected):`)
    for (const w of warnings) {
      console.warn(`  [${w.rule}] ${w.message}`)
    }
  }

  if (failures.length > 0) {
    console.error('Harness validation failed:')
    for (const f of failures) {
      console.error(`  [${f.rule}] ${f.message}`)
    }
    process.exit(1)
  }

  const modeLabel = isMigrationMode ? ' (migration mode — some checks relaxed)' : ''
  console.log(`Harness validation passed${modeLabel} (${REQUIRED_FILES.length} required files, ${mdFiles.length} markdown files checked).`)
  process.exit(0)
}

async function checkRequiredFiles(
  failures: Failure[],
  warnings: Failure[],
  isMigrationMode: boolean,
): Promise<void> {
  await Promise.all(
    REQUIRED_FILES.map(async (rel) => {
      try {
        const stat = await fs.stat(path.join(root, rel))
        if (!stat.isFile() && !stat.isSymbolicLink()) {
          failures.push({ rule: 'required-files', message: `${rel} exists but is not a file or symlink` })
        }
      } catch {
        const msg = `Missing required file: ${rel}`
        if (isMigrationMode) {
          // Em migration mode: warning em vez de error. Consistency check posterior valida coverage.
          warnings.push({ rule: 'required-files', message: msg })
        } else {
          failures.push({ rule: 'required-files', message: msg })
        }
      }
    }),
  )
}

async function checkAgentsConstraints(failures: Failure[]): Promise<void> {
  let content: string
  try {
    content = await fs.readFile(path.join(root, 'AGENTS.md'), 'utf8')
  } catch {
    // Ja registrado em checkRequiredFiles — nao duplicar.
    return
  }

  // CA-27, R3: line count.
  const lineCount = content.split('\n').length
  if (lineCount > AGENTS_MAX_LINES) {
    failures.push({
      rule: 'agents-line-count',
      message: `AGENTS.md should stay short; keep it at ${AGENTS_MAX_LINES} lines or fewer (current: ${lineCount})`,
    })
  }

  // H1 heading — AGENTS.md deve comecar com "# ".
  if (!content.startsWith('# ')) {
    failures.push({
      rule: 'agents-heading',
      message: 'AGENTS.md must start with an H1 heading (line 1 begins with "# ")',
    })
  }

  // Required links — sinal do harness do Andre.
  for (const link of AGENTS_REQUIRED_LINKS) {
    if (!content.includes(link)) {
      failures.push({
        rule: 'agents-links',
        message: `AGENTS.md must link to ${link}`,
      })
    }
  }
}

// 2026-05-13 (Luiz/dev): espelha o check do harness-engineering do Andre Prado.
// QUALITY_SCORE.md tem que ser o dashboard vivo (Area|Score|Notes|Next Action),
// nao um checklist de merge gate (esse vive em docs/MERGE_GATES.md).
async function checkQualityScoreFormat(failures: Failure[]): Promise<void> {
  let content: string
  try {
    content = await fs.readFile(path.join(root, 'docs/QUALITY_SCORE.md'), 'utf8')
  } catch {
    return
  }
  if (!content.includes('| Area | Score | Notes | Next Action |')) {
    failures.push({
      rule: 'quality-score-format',
      message: 'docs/QUALITY_SCORE.md must contain the score table header "| Area | Score | Notes | Next Action |"',
    })
  }
}

// 2026-05-14 (Luiz/dev): contract v1 prompt check — PRD CA-10 + RF-MH-02.
// Regex linha-por-linha (G-P05-01): nao parse YAML completo. <50ms para 13 arquivos.
// Tokens obrigatorios sao instrucoes literais que o prompt do agent precisa conter
// para o LLM emitir envelope v1. Ausencia = prompt regrediu.
// Glob agents/*.md (apenas top-level, nao recursivo — fixtures vivem em __fixtures__/).
// Arquivos comecando com _ sao ignorados (_contract/, _archived/).
const CONTRACT_TOKENS = [
  'contract_version',
  '"1.0"',
  'kind',
  'status',
  'reasoning',
  'payload',
] as const

export async function checkAgentContracts(
  failures: Failure[],
  agentsDir = 'agents',
): Promise<void> {
  let entries
  try {
    entries = await fs.readdir(path.join(root, agentsDir), { withFileTypes: true })
  } catch {
    // Diretorio ausente: nao ha agents para validar — nao e falha do check.
    return
  }
  const agentFiles = entries
    .filter((e) => e.isFile() && String(e.name).endsWith('.md') && !String(e.name).startsWith('_'))
    .map((e) => path.join(agentsDir, String(e.name)))

  for (const file of agentFiles) {
    let content: string
    try {
      content = await fs.readFile(path.join(root, file), 'utf8')
    } catch {
      continue
    }
    const missing = CONTRACT_TOKENS.filter((token) => !content.includes(token))
    if (missing.length > 0) {
      failures.push({
        rule: 'agent-contract-v1',
        message: `${file}: missing contract v1 tokens in prompt: ${missing.join(', ')}. See docs/design-docs/subagent-contract-v1.md.`,
      })
    }
  }
}

// CA-28: planos em active/ que parecem completos.
async function checkActivePlans(failures: Failure[]): Promise<void> {
  const activeDir = path.join(root, 'docs/exec-plans/active')
  let entries
  try {
    entries = await fs.readdir(activeDir, { withFileTypes: true })
  } catch {
    // Ja registrado em checkRequiredFiles (README.md ausente implica diretorio ausente).
    return
  }

  await Promise.all(
    entries.map(async (entry) => {
      if (!String(entry.name).endsWith('.md') || String(entry.name) === 'README.md') return
      if (!entry.isFile()) return
      const name = String(entry.name)
      const relativePath = path.join('docs/exec-plans/active', name)
      let content: string
      try {
        content = await fs.readFile(path.join(activeDir, name), 'utf8')
      } catch {
        return
      }
      if (looksCompleteInline(content)) {
        failures.push({
          rule: 'orphan-active-plan',
          message: `${relativePath} appears complete but is still active; move it to docs/exec-plans/completed/ or mark remaining work explicitly`,
        })
      }
    }),
  )
}

// Inline (script standalone nao pode importar helpers externos).
// Helper canonico em skills/init/lib/orphan-plan-detector.ts — manter em sync manualmente (G6 do plano).
// CANONICAL: skills/init/lib/orphan-plan-detector.ts looksComplete + hasRemainingWorkMarker @ sha256:74b0e7be7053b8f74412c092fbe6e951f99a7b0751ff8c29e26637018dfbf296
// Drift guard: tests/looks-complete-inline.test.ts re-hashes the canonical bodies and fails if this literal
// no longer matches. Regenerate via `bun f:/tmp/compute-hash.ts` (or equivalent) only if the signature
// change is intentional, then update both this comment and the inline regex arrays below.
function looksCompleteInline(content: string): boolean {
  const remaining = [
    /\bremaining work\b/i,
    /\bpending\b/i,
    /\bblocked\b/i,
    /\bin progress\b/i,
    /\bnot complete(?:d)?\b/i,
    /\bnot done\b/i,
    /- \[ \]/,
  ]
  if (remaining.some((p) => p.test(content))) return false

  const signals = [
    /##\s*Exit Criteria[\s\S]*(?:\bmet\b|\bcomplete(?:d)?\b|\bdone\b|\bpassed\b|\bpassou\b|- \[x\])/i,
    /##\s*Validation Log[\s\S]*(?:\bpassed\b|\bpassou\b|✅|- \[x\])/i,
    /##\s*Lessons Captured[\s\S]*(?:no new capture|no compound capture|no separate compound|not needed|skipped|captured|added|created|linked)/i,
    /(?:ready for review|ready to ship|ready for production|implementation complete|work complete|completed)/i,
  ]
  return signals.filter((p) => p.test(content)).length >= 2
}

// Detect H1 (`# `) at line start, ignoring lines inside fenced code blocks (```).
// Used pelo SKILL.md check: o H1 pode aparecer apos preambulos (HTML comments, telemetry block, prose-preface).
function hasH1OutsideCodeFences(text: string): boolean {
  let insideFence = false
  for (const line of text.split('\n')) {
    if (line.startsWith('```')) {
      insideFence = !insideFence
      continue
    }
    if (!insideFence && line.startsWith('# ')) return true
  }
  return false
}

// 2026-05-14 (Luiz/dev): v6.2.0 — CA-v6pw.
// Detecta referencias a `.planning/` em skills/ e templates/ fora da whitelist.
// Separado do crawl principal para varrer templates/ (excluido do crawl por SKIP_DIRS).
// Whitelist: skills/init/** (migration logic), skills/lib/legacy-*.md, skills/plan-feature/SKILL.md.
// Padrao negativo: `.planning.v5-backup/` nao e violacao (namespace distinto).
const PLANNING_REF = /(?<![.\w])\.planning\//

// Skills com referencias .planning/ legadas (v5) — pendentes de migracao para docs/exec-plans/.
// Adicionados em v6.2.0 como tech debt explicito. Remover quando cada skill for migrada.
const LEGACY_V5_SKILLS = new Set([
  'skills/grill-me/SKILL.md',       // escreve CONTEXT.md em .planning/ — migrar para docs/
  'skills/write-prd/SKILL.md',       // le .planning/CONTEXT-*.md e cria .planning/{date}-{slug}/
  'skills/lessons-learned/SKILL.md', // le .planning/_archive/ para contexto de licoes
  'skills/iterate/SKILL.md',         // busca .planning/*/SUMMARY.md
  'skills/lib/state-utils.md',       // documenta o sistema legado .planning/ — atualizar para docs/exec-plans/
  'skills/execute-plan/SKILL.md',    // Step 0 legacy detection + referencias v5 — migrar para docs/exec-plans/
  // 2026-05-17: removidos da whitelist apos auditoria (zero referencias .planning/ no arquivo real):
  //   skills/quick-plan/SKILL.md — migrado para docs/exec-plans/
  //   templates/SUMMARY.md — migrado, paths agora apontam para docs/exec-plans/
])

function isV6PathWhitelisted(rel: string): boolean {
  const posix = rel.replace(/\\/g, '/')
  if (posix.startsWith('skills/init/')) return true
  if (/^skills\/lib\/legacy-[^/]+\.md$/.test(posix)) return true
  if (posix === 'skills/plan-feature/SKILL.md') return true
  if (LEGACY_V5_SKILLS.has(posix)) return true
  return false
}

async function walkDirForMd(dir: string): Promise<string[]> {
  const results: string[] = []
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return results
  }
  await Promise.all(
    entries.map(async (entry) => {
      const name = String(entry.name)
      const full = path.join(dir, name)
      if (entry.isDirectory()) {
        const sub = await walkDirForMd(full)
        results.push(...sub)
      } else if (entry.isFile() && name.endsWith('.md')) {
        results.push(full)
      }
    }),
  )
  return results
}

export async function checkV6PathWhitelist(failures: Failure[]): Promise<void> {
  const scanDirs = ['skills', 'templates']
  for (const dir of scanDirs) {
    const files = await walkDirForMd(path.join(root, dir))
    await Promise.all(
      files.map(async (file) => {
        const rel = path.relative(root, file).replace(/\\/g, '/')
        if (isV6PathWhitelisted(rel)) return
        let content: string
        try {
          content = await fs.readFile(file, 'utf8')
        } catch {
          return
        }
        if (PLANNING_REF.test(content)) {
          failures.push({
            rule: 'v6-path-whitelist',
            message: `${rel} references .planning/ — migrate to docs/exec-plans/. Add to whitelist if intentional (skills/init/**, skills/lib/legacy-*.md, skills/plan-feature/SKILL.md).`,
          })
        }
      }),
    )
  }
}

async function checkMarkdownFiles(files: ReadonlyArray<string>, failures: Failure[]): Promise<void> {
  await Promise.all(
    files.map(async (file) => {
      let content: string
      try {
        content = await fs.readFile(file, 'utf8')
      } catch {
        return
      }
      const rel = path.relative(root, file)
      const basename = path.basename(file)

      // SKILL.md eh convencao Claude Code (frontmatter + content opcionalmente com bloco telemetry).
      // BUG-08-02 (Luiz/dev 2026-05-12): dog-food revelou que H1 check falhava em todos SKILL.md do plugin.
      const isSkillMd = basename === 'SKILL.md'

      // 2026-05-13 (Luiz/dev): commands/*.md sao slash-command files (frontmatter + 1 linha invoke),
      // nao tem H1 por convencao Claude Code. Mesma logica do isSkillMd.
      const isCommandMd = rel.startsWith('commands' + path.sep) || rel.startsWith('commands/')

      // Strip YAML frontmatter antes de checar H1 — ADRs e docs com metadata sao validos.
      // BUG-08-03 (Luiz/dev 2026-05-12): H1 check ignorava frontmatter, gerava falso positivo em ADR-0001.
      // BUG-08-04: agents/*.md tem HTML comment entre frontmatter e H1 — strip leading comments/blank tambem.
      // Normalize CRLF -> LF first; alguns SKILL.md no Windows tem line endings mistos e o
      // regex de frontmatter so casa com \n puro (descoberto durante extensao do H1 skill check).
      const normalized = content.replace(/\r\n/g, '\n')
      const stripped = normalized
        .replace(/^---\n[\s\S]*?\n---\n*/, '')   // remove frontmatter YAML
        .replace(/^(?:<!--[\s\S]*?-->\s*)+/, '') // remove HTML comments lideres
        .replace(/^\s+/, '')                       // remove leading whitespace

      // Todo .md (exceto SKILL.md e commands/*.md) deve comecar com H1 apos frontmatter/comments opcionais.
      if (!isSkillMd && !isCommandMd && !stripped.startsWith('# ')) {
        failures.push({ rule: 'markdown-heading', message: `${rel} must start with an H1 heading` })
      }

      // SKILL.md tambem deve conter pelo menos um H1 no corpo (apos frontmatter).
      // Diferente dos outros .md, a ordem nao importa — SKILL.md pode ter HTML comments,
      // bloco telemetry e prose-preface ANTES do H1 (Plano 03 fase-02/03, profile-aware-preface).
      // Detectar H1 fora de fenced code blocks evita falsos positivos com `# comment` em codigo.
      // Falsos positivos em templates/__fixtures__ ja excluidos via SKIP_DIRS.
      if (isSkillMd) {
        if (!hasH1OutsideCodeFences(stripped)) {
          failures.push({
            rule: 'markdown-heading-skill',
            message: `${rel} SKILL.md must contain an H1 heading in the body (after frontmatter)`,
          })
        }
      }

      // Link checker recursivo — G2 do plano (cross-platform).
      const links = [...content.matchAll(/\[[^\]]+\]\((?!https?:\/\/|mailto:|#)([^)]+)\)/g)]
      await Promise.all(
        links.map(async (m) => {
          const target = m[1]
          if (!target) return  // BUG-08-05 (Luiz/dev 2026-05-12): noUncheckedIndexedAccess narrowing
          // Strip fragment and query string; anchor-only links (#foo) sao filtrados pelo regex.
          const cleanTarget = (target.split('#')[0] ?? '').split('?')[0] ?? ''
          if (cleanTarget === '') return
          const abs = path.resolve(path.dirname(file), cleanTarget)
          // Path-traversal boundary: links resolving outside repo root are treated as broken.
          // Prevents `../../../etc/passwd` style references silently passing fs.stat on absolute paths.
          if (!abs.startsWith(root + path.sep) && abs !== root) {
            failures.push({
              rule: 'broken-link',
              message: `${rel} has a relative link escaping repo root: ${target}`,
            })
            return
          }
          try {
            await fs.stat(abs)
          } catch {
            failures.push({
              rule: 'broken-link',
              message: `${rel} has a broken relative link: ${target}`,
            })
          }
        }),
      )
    }),
  )
}

// Coleta recursiva de arquivos .md excluindo node_modules, .git, _archived/ (G10).
async function collectMarkdownFiles(startDir: string): Promise<string[]> {
  const results: string[] = []
  await walk(startDir)
  return results

  async function walk(dir: string): Promise<void> {
    let entries
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    await Promise.all(
      entries.map(async (entry) => {
        const name = String(entry.name)
        if (SKIP_DIRS.has(name) || name.startsWith('.git')) return
        if (name === ARCHIVED_SEGMENT) return // G10: _archived/ excluido
        const full = path.join(dir, name)
        if (entry.isDirectory()) {
          await walk(full)
        } else if (entry.isFile() && name.endsWith('.md')) {
          results.push(full)
        }
      }),
    )
  }
}

// 2026-05-15 (Luiz/dev): Plano 04 fase-03 — CA-07, CA-11, RF-SH-06.
// Check bidirecional: marker start exige marker end E mencao a readPrefaceContext entre eles.
// G7 do plano04: string presence, sem AST parser. projectRoot opcional para isolamento em testes.
export async function checkProfileAwarePreface(
  failures: Failure[],
  projectRoot?: string,
): Promise<void> {
  const base = projectRoot ?? root
  const skillsDir = path.join(base, 'skills')
  let entries
  try {
    entries = await fs.readdir(skillsDir, { withFileTypes: true })
  } catch {
    return
  }

  await Promise.all(
    entries.map(async (entry) => {
      const name = String(entry.name)
      if (!entry.isDirectory()) return
      if (name.startsWith('_') || name.startsWith('.')) return

      const skillMd = path.join(skillsDir, name, 'SKILL.md')
      let content: string
      try {
        content = await fs.readFile(skillMd, 'utf8')
      } catch {
        return
      }

      const hasStart = content.includes('<!-- profile-aware-preface:start -->')
      if (!hasStart) return // CA-02 opt-in: silently skip

      const relPath = path.relative(base, skillMd).replace(/\\/g, '/')

      const hasEnd = content.includes('<!-- profile-aware-preface:end -->')
      if (!hasEnd) {
        failures.push({
          rule: 'profile-aware-preface',
          message: `${relPath}: profile-aware-preface block start marker found but end marker is missing`,
        })
        return
      }

      // 2026-05-16 (Luiz/dev): v6.3.1 fase-07 — tolerâncias removidas após migração de
      // /architecture + /detect-architecture (RF-CH-01, CA-10 PRD v6.3.1).
      // Bloco profile-aware-preface agora EXIGE fenced code block + readPrefaceContext.
      // Padrao positivo: nome da funcao seguido de ( ou { — distingue de comentarios "//<nome>".
      const startIdx = content.indexOf('<!-- profile-aware-preface:start -->')
      const endIdx = content.indexOf('<!-- profile-aware-preface:end -->')
      const block = content.slice(startIdx, endIdx)

      if (!block.includes('```')) {
        failures.push({
          rule: 'profile-aware-preface',
          message: `${relPath}: profile-aware-preface block has no fenced code block`,
        })
        return
      }

      const hasActualRef =
        /readPrefaceContext\s*[({]/.test(block) ||
        /\{\s*readPrefaceContext/.test(block)
      if (!hasActualRef) {
        failures.push({
          rule: 'profile-aware-preface',
          message: `${relPath}: profile-aware-preface block does not reference readPrefaceContext`,
        })
      }
    }),
  )
}

// 2026-05-17 (Luiz/dev): H1.4 — presence + minimum atom count check for docs/knowledge/.
// Only fires when docs/knowledge/ directory exists (opt-in: projects without a stack init are not penalized).
// When the dir exists, INDEX.md must be present and atoms/ must contain at least 1 .md file.
export async function checkKnowledgePresence(
  failures: Failure[],
  projectRoot?: string,
): Promise<void> {
  const base = projectRoot ?? root
  const knowledgeDir = path.join(base, 'docs', 'knowledge')

  // If docs/knowledge/ does not exist, skip silently — project may not have run stack init.
  try {
    await fs.stat(knowledgeDir)
  } catch {
    return
  }

  // Walk one level to find stack subdirs (e.g. nodejs-typescript/).
  let stackDirs: string[]
  try {
    const entries = await fs.readdir(knowledgeDir, { withFileTypes: true })
    stackDirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => path.join(knowledgeDir, String(e.name)))
  } catch {
    return
  }

  for (const stackDir of stackDirs) {
    const rel = path.relative(base, stackDir).replace(/\\/g, '/')
    const indexMd = path.join(stackDir, 'INDEX.md')
    try {
      await fs.stat(indexMd)
    } catch {
      failures.push({
        rule: 'knowledge-presence',
        message: `${rel}/INDEX.md is missing — run stack knowledge init or restore the file`,
      })
    }

    const atomsDir = path.join(stackDir, 'atoms')
    let atomCount = 0
    try {
      const atomEntries = await fs.readdir(atomsDir)
      atomCount = atomEntries.filter((f) => f.endsWith('.md')).length
    } catch {
      // atoms/ dir absent — treat as 0
    }
    if (atomCount === 0) {
      failures.push({
        rule: 'knowledge-presence',
        message: `${rel}/atoms/ has no .md files — knowledge atoms may have been deleted accidentally`,
      })
    }
  }
}

// 2026-05-14 (Luiz/dev): guard para permitir import do modulo em testes (Plano 05 fase-01).
// import.meta.main e true apenas quando executado como script principal (bun scripts/harness-validate.ts).
// Quando importado por testes, main() nao roda — apenas as funcoes exportadas ficam disponiveis.
if (import.meta.main) {
  await main()
}
