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
const AGENTS_REQUIRED_LINKS = [
  '[ARCHITECTURE.md](./ARCHITECTURE.md)',
  '[docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md)',
  '[docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md)',
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
const SKIP_DIRS = new Set(['node_modules', '.git', '.claude', '.planning', '.planning.v5-backup', 'claude-code', 'compound', 'templates', '__fixtures__', 'fixtures', 'snippets', '_legacy-detail', 'v5-legacy'])
const ARCHIVED_SEGMENT = '_archived'

type Failure = { rule: string; message: string }

async function main(): Promise<void> {
  const failures: Failure[] = []

  // Checks paralelos que nao dependem de coleta de markdown.
  await Promise.all([
    checkRequiredFiles(failures),
    checkAgentsConstraints(failures),
    checkActivePlans(failures),
    checkQualityScoreFormat(failures),
  ])

  // Coleta de markdown e recursiva — executa apos checks basicos mas internamente paralela.
  const mdFiles = await collectMarkdownFiles(root)
  await checkMarkdownFiles(mdFiles, failures)

  if (failures.length > 0) {
    console.error('Harness validation failed:')
    for (const f of failures) {
      console.error(`  [${f.rule}] ${f.message}`)
    }
    process.exit(1)
  }

  console.log(`Harness validation passed (${REQUIRED_FILES.length} required files, ${mdFiles.length} markdown files checked).`)
  process.exit(0)
}

async function checkRequiredFiles(failures: Failure[]): Promise<void> {
  await Promise.all(
    REQUIRED_FILES.map(async (rel) => {
      try {
        const stat = await fs.stat(path.join(root, rel))
        if (!stat.isFile() && !stat.isSymbolicLink()) {
          failures.push({ rule: 'required-files', message: `${rel} exists but is not a file or symlink` })
        }
      } catch {
        failures.push({ rule: 'required-files', message: `Missing required file: ${rel}` })
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

await main()
