<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 03: Harness-validate advanced (orphan plans + link checker + required-files 22+)

**Plano:** 04 — Validators Full
**Sizing:** 2h
**Depende de:** Plano 01 fase-04 (validator minimal `harness-validate.ts.tpl` com 3 checks ja existe), Plano 02 fase-01 (manifest com 26+ entries — define quais arquivos sao obrigatorios)
**Visual:** false

---

## O que esta fase entrega

**Estende** `scripts/harness-validate.ts.tpl` (entregue minimal pelo Plano 01) para a forma **full do Andre + adapacoes do v6.0.0**. Adiciona:

1. **22+ required-files** (replicando lista do `.mjs` original do Andre + ajustes paths v6): `docs/PLANS.md`, `docs/QUALITY_SCORE.md`, `docs/SECURITY.md`, `docs/RELIABILITY.md`, `docs/FRONTEND.md`, `docs/DESIGN.md`, `docs/PRODUCT_SENSE.md`, `docs/COMPOUND_ENGINEERING.md`, `docs/design-docs/{index,core-beliefs}.md`, `docs/exec-plans/active/README.md`, `docs/exec-plans/completed/README.md`, `docs/exec-plans/tech-debt-tracker.md`, `docs/generated/db-schema.md`, `docs/product-specs/index.md`, `docs/references/README.md`, `docs/STATE.md` (NOVO em v6 vs Andre — D32), `scripts/harness-validate.ts`, `scripts/compound-check.ts` (NOVO em v6).
2. **Link checker recursivo** — itera todos os `.md` do repo, captura `[text](path)` (excluindo http(s):// e mailto:), valida que destinos existem.
3. **Orphan plan detector** — para cada `.md` em `docs/exec-plans/active/`, aplica heuristica de "parece completo" (CA-28) replicando logica do `.mjs` do Andre.
4. **Heading check H1** — todo `.md` (exceto README sentinels) deve comecar com `# `.
5. **Continua rejeitando AGENTS.md >40 linhas** (CA-27, R3) — herda do minimal sem alterar.
6. **AGENTS.md links obrigatorios** — verifica que AGENTS.md aponta para `ARCHITECTURE.md`, `docs/QUALITY_SCORE.md`, `docs/PRODUCT_SENSE.md` (sinal do harness do Andre).

Atende **CA-27** (mantido), **CA-28** (orphan), **R3** (line count), **M5**.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/init/assets/templates/scripts/harness-validate.ts.tpl` | Modify | Inflar de ~80 linhas (minimal) para ~250 linhas (full). Adicionar 4 checks novos preservando assinatura |
| `anti-vibe-coding/skills/init/lib/orphan-plan-detector.ts` | Create | Helper canonico exportado para outros pontos do plugin (`/execute-plan` em Plano 05 fase-05 usa logica inversa) |
| `anti-vibe-coding/skills/init/lib/orphan-plan-detector.test.ts` | Create | 8+ casos: plano com `- [ ]` pending → nao orfao, plano com Exit Criteria marcado + Validation Log passed → orfao, plano com "Remaining work" header → nao orfao |
| `anti-vibe-coding/tests/harness-validate-advanced.test.ts` | Create | E2E: fixture com plano orfao → exit 1; fixture com link quebrado → exit 1; AGENTS.md valido + 22+ files presentes → exit 0 |

---

## Implementacao

### Passo 1: Helper `lib/orphan-plan-detector.ts`

```typescript
// 2026-05-11 (Luiz/dev): replica logica de `activePlanAppearsComplete` do .mjs do Andre.
// Helper canonico — reusado por /execute-plan (Plano 05 fase-05) com logica INVERSA:
// so move plano para completed/ se looksComplete === true.
// G6 do Plano 04: detector intencionalmente conservador.

/**
 * Heuristica: "este plano em `active/` parece completo (deveria estar em `completed/`)?"
 *
 * Algoritmo:
 * 1. Se ha marcador de trabalho pendente (`- [ ]`, "in progress", "pending", "blocked",
 *    "remaining work", "not done", "not complete"), retorna `false`.
 * 2. Caso contrario, conta sinais de conclusao em 4 categorias (Exit Criteria,
 *    Validation Log, Lessons Captured, frases de "ready"). Se >=2 sinais, retorna `true`.
 *
 * Documentado: falsos negativos sao OK (plano fica mais tempo em active/),
 * falsos positivos sao caros (autor recebe erro em PR sem motivo).
 */
export function looksComplete(content: string): boolean {
  if (hasRemainingWorkMarker(content)) return false

  const signals = [
    /##\s*Exit Criteria[\s\S]*(?:\bmet\b|\bcomplete(?:d)?\b|\bdone\b|\bpassed\b|\bpassou\b|- \[x\])/i,
    /##\s*Validation Log[\s\S]*(?:\bpassed\b|\bpassou\b|✅|- \[x\])/i,
    /##\s*Lessons Captured[\s\S]*(?:no new capture|no compound capture|no separate compound|not needed|skipped|captured|added|created|linked)/i,
    /(?:ready for review|ready to ship|ready for production|implementation complete|work complete|completed)/i,
  ]

  return signals.filter((pattern) => pattern.test(content)).length >= 2
}

function hasRemainingWorkMarker(content: string): boolean {
  const markers = [
    /\bremaining work\b/i,
    /\bpending\b/i,
    /\bblocked\b/i,
    /\bin progress\b/i,
    /\bnot complete(?:d)?\b/i,
    /\bnot done\b/i,
    /- \[ \]/,
  ]
  return markers.some((pattern) => pattern.test(content))
}
```

### Passo 2: Estender `harness-validate.ts.tpl`

O minimal tinha 3 checks (`checkRequiredFiles`, `checkAgentsLineCount`, `checkAgentsHeading`). Agora a forma final:

```typescript
#!/usr/bin/env bun
// 2026-05-11 (Luiz/dev): harness-validate full — Plano 04 fase-03.
// Estende minimal do Plano 01 fase-04. Adiciona: 22+ required-files, link checker,
// orphan plan detector (CA-28), heading H1 check, AGENTS.md links obrigatorios.

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

const AGENTS_REQUIRED_LINKS = [
  '[ARCHITECTURE.md](./ARCHITECTURE.md)',
  '[docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md)',
  '[docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md)',
] as const

const SKIP_DIRS = new Set(['node_modules', '.git', '.planning.v5-backup'])
const ARCHIVED_SEGMENT = '_archived'

type Failure = { rule: string; message: string }

async function main(): Promise<void> {
  const failures: Failure[] = []

  await Promise.all([
    checkRequiredFiles(failures),
    checkAgentsConstraints(failures),
    checkActivePlans(failures),
  ])

  // Coleta de markdown depende de I/O recursivo — separado mas tambem paralelo internamente.
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
    return // ja registrado em checkRequiredFiles
  }

  // CA-27, R3: line count
  const lineCount = content.split('\n').length
  if (lineCount > AGENTS_MAX_LINES) {
    failures.push({
      rule: 'agents-line-count',
      message: `AGENTS.md should stay short; keep it at ${AGENTS_MAX_LINES} lines or fewer (current: ${lineCount})`,
    })
  }

  // Heading H1
  if (!content.startsWith('# ')) {
    failures.push({ rule: 'agents-heading', message: 'AGENTS.md must start with an H1 heading' })
  }

  // Required links
  for (const link of AGENTS_REQUIRED_LINKS) {
    if (!content.includes(link)) {
      failures.push({ rule: 'agents-links', message: `AGENTS.md must link to ${link}` })
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
    return // ja registrado em checkRequiredFiles (README.md)
  }

  await Promise.all(
    entries.map(async (entry) => {
      if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name === 'README.md') return
      const relativePath = path.join('docs/exec-plans/active', entry.name)
      let content: string
      try {
        content = await fs.readFile(path.join(activeDir, entry.name), 'utf8')
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

// Inline (G9 — script independente). Helper canonico em lib/orphan-plan-detector.ts.
function looksCompleteInline(content: string): boolean {
  const remaining = [
    /\bremaining work\b/i, /\bpending\b/i, /\bblocked\b/i, /\bin progress\b/i,
    /\bnot complete(?:d)?\b/i, /\bnot done\b/i, /- \[ \]/,
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

      // H1 heading
      if (!content.startsWith('# ')) {
        failures.push({ rule: 'markdown-heading', message: `${rel} must start with an H1 heading` })
      }

      // Broken relative links
      const links = [...content.matchAll(/\[[^\]]+\]\((?!https?:\/\/|mailto:|#)([^)]+)\)/g)]
      await Promise.all(
        links.map(async (m) => {
          const target = m[1]
          // Anchor-only links (#foo) ja sao filtrados pelo regex acima
          // Strip query string and fragment if present
          const cleanTarget = target.split('#')[0].split('?')[0]
          if (cleanTarget === '') return
          const abs = path.resolve(path.dirname(file), cleanTarget)
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
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.git')) return
        if (entry.name === ARCHIVED_SEGMENT) return // G10
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(full)
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          results.push(full)
        }
      }),
    )
  }
}

await main()
```

Notas vs versao do Andre:
- Sequencial → paralelo via `Promise.all` em todos os checks (G1 do plano — perf).
- Adicionado `docs/STATE.md` e `scripts/compound-check.ts` na required list (v6 vs Andre).
- `docs/COMPOUND_ENGINEERING.md` adicionado (Andre nao tinha; v6 adopts).
- `CLAUDE.md` adicionado como required (D16 — sempre presente como symlink/copia de AGENTS).
- `_archived/` excluido do crawl (G10).
- `.planning.v5-backup/` excluido do crawl (durante migracao Plano 03, evita falsos positivos).
- TypeScript strict — `Failure` tipado, `as const` em arrays, sem `any`.

### Passo 3: Testes do helper `lib/orphan-plan-detector.test.ts`

```typescript
import { describe, it, expect } from 'bun:test'
import { looksComplete } from './orphan-plan-detector'

describe('looksComplete (orphan plan detector)', () => {
  it('returns false when plan has unchecked todos', () => {
    const content = '## Steps\n- [ ] Do thing\n- [x] Other thing\n'
    expect(looksComplete(content)).toBe(false)
  })

  it('returns false when plan has "Remaining work" header', () => {
    const content = '## Exit Criteria\n- [x] all done\n\n## Remaining work\n- Refactor X\n'
    expect(looksComplete(content)).toBe(false)
  })

  it('returns false when plan has "in progress" anywhere', () => {
    const content = '## Status\nIn progress.\n\n## Exit Criteria\n- [x] all done\n'
    expect(looksComplete(content)).toBe(false)
  })

  it('CA-28: returns true when Exit Criteria marked + Validation Log passed', () => {
    const content = `## Exit Criteria
- [x] Tests pass
- [x] Lint clean

## Validation Log
harness:validate ✅
unit tests ✅
`
    expect(looksComplete(content)).toBe(true)
  })

  it('returns true with Lessons Captured + Exit Criteria done', () => {
    const content = `## Exit Criteria
All done.

## Lessons Captured
Linked to docs/compound/X.md
`
    expect(looksComplete(content)).toBe(true)
  })

  it('returns false with only 1 signal (Exit Criteria but no Validation Log)', () => {
    const content = '## Exit Criteria\n- [x] done\n'
    expect(looksComplete(content)).toBe(false)
  })

  it('G6: returns true on "ready for production" phrase + Exit Criteria done', () => {
    const content = '## Exit Criteria\n- [x] done\n\nReady for production deployment.\n'
    expect(looksComplete(content)).toBe(true)
  })

  it('returns false on empty/minimal plan', () => {
    expect(looksComplete('# Plan: foo\n\nTBD.\n')).toBe(false)
  })
})
```

### Passo 4: Testes E2E `tests/harness-validate-advanced.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'harness-advanced')
const SCRIPT_SRC = path.join(
  import.meta.dir, '..',
  'skills/init/assets/templates/scripts/harness-validate.ts.tpl',
)

async function runValidator(cwd: string): Promise<{ code: number; stderr: string; stdout: string }> {
  return new Promise((resolve) => {
    const proc = spawn('bun', ['run', path.join(cwd, 'scripts/harness-validate.ts')], { cwd })
    let stdout = ''; let stderr = ''
    proc.stdout.on('data', (d) => { stdout += d.toString() })
    proc.stderr.on('data', (d) => { stderr += d.toString() })
    proc.on('exit', (code) => resolve({ code: code ?? -1, stderr, stdout }))
  })
}

const MINIMAL_AGENTS = `# Agent

This is the agent index.

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md)
- [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md)
`

async function setupValidFixture(): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  // Cria todos os 25 required files (versao minima)
  const all: ReadonlyArray<readonly [string, string]> = [
    ['AGENTS.md', MINIMAL_AGENTS],
    ['ARCHITECTURE.md', '# Architecture\n'],
    ['CLAUDE.md', MINIMAL_AGENTS],
    ['README.md', '# Project\n'],
    ['package.json', '{"name":"x","version":"0.0.1"}'],
    ['.github/pull_request_template.md', '# PR\n'],
    ['docs/DESIGN.md', '# Design\n'],
    ['docs/FRONTEND.md', '# Frontend\n'],
    ['docs/PLANS.md', '# Plans\n'],
    ['docs/PRODUCT_SENSE.md', '# Product Sense\n'],
    ['docs/QUALITY_SCORE.md', '# Quality Score\n'],
    ['docs/RELIABILITY.md', '# Reliability\n'],
    ['docs/SECURITY.md', '# Security\n'],
    ['docs/COMPOUND_ENGINEERING.md', '# Compound\n'],
    ['docs/STATE.md', '# State\n'],
    ['docs/design-docs/index.md', '# Design Docs\n'],
    ['docs/design-docs/core-beliefs.md', '# Core Beliefs\n'],
    ['docs/exec-plans/active/README.md', '# Active Plans\n'],
    ['docs/exec-plans/completed/README.md', '# Completed Plans\n'],
    ['docs/exec-plans/tech-debt-tracker.md', '# Tech Debt\n'],
    ['docs/generated/db-schema.md', '# DB Schema\n'],
    ['docs/product-specs/index.md', '# Product Specs\n'],
    ['docs/references/README.md', '# References\n'],
  ]
  for (const [rel, body] of all) {
    const full = path.join(FIXTURE, rel)
    await fs.mkdir(path.dirname(full), { recursive: true })
    await fs.writeFile(full, body, 'utf8')
  }
  await fs.mkdir(path.join(FIXTURE, 'scripts'), { recursive: true })
  // harness-validate.ts deve ser auto-referenciado como required
  await fs.copyFile(SCRIPT_SRC, path.join(FIXTURE, 'scripts', 'harness-validate.ts'))
  // compound-check.ts placeholder
  await fs.writeFile(path.join(FIXTURE, 'scripts', 'compound-check.ts'), '// placeholder\n', 'utf8')
}

describe('harness-validate advanced', () => {
  beforeEach(setupValidFixture)
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('exits 0 on minimally valid full scaffold', async () => {
    const r = await runValidator(FIXTURE)
    if (r.code !== 0) {
      // debug ajuda
      console.log('STDERR:', r.stderr)
    }
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('required files')
  })

  it('CA-27 (regressao do minimal): exits 1 when AGENTS.md > 40 lines', async () => {
    const fat = '# Agent\n' + Array.from({ length: 50 }, (_, i) => `line ${i}`).join('\n')
      + '\n[ARCHITECTURE.md](./ARCHITECTURE.md)\n[docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md)\n[docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md)\n'
    await fs.writeFile(path.join(FIXTURE, 'AGENTS.md'), fat, 'utf8')
    const r = await runValidator(FIXTURE)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('40 lines or fewer')
  })

  it('CA-28: exits 1 on orphan active plan', async () => {
    const plan = `# Plan: test feature

## Exit Criteria
- [x] All tests pass
- [x] Lint clean

## Validation Log
harness:validate ✅
`
    await fs.writeFile(path.join(FIXTURE, 'docs/exec-plans/active/2026-05-12-feat.md'), plan, 'utf8')
    const r = await runValidator(FIXTURE)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('orphan-active-plan')
    expect(r.stderr).toContain('2026-05-12-feat.md')
  })

  it('does NOT flag plan with pending work as orphan', async () => {
    const plan = `# Plan: test feature

## Exit Criteria
- [x] One done

## Remaining work
- [ ] Other thing
`
    await fs.writeFile(path.join(FIXTURE, 'docs/exec-plans/active/2026-05-12-pending.md'), plan, 'utf8')
    const r = await runValidator(FIXTURE)
    expect(r.code).toBe(0)
  })

  it('exits 1 on broken relative link in any .md', async () => {
    await fs.writeFile(
      path.join(FIXTURE, 'docs/DESIGN.md'),
      '# Design\n\nSee [missing](./does-not-exist.md).\n',
      'utf8',
    )
    const r = await runValidator(FIXTURE)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('broken-link')
    expect(r.stderr).toContain('does-not-exist.md')
  })

  it('exits 1 when AGENTS.md missing required link to ARCHITECTURE.md', async () => {
    await fs.writeFile(
      path.join(FIXTURE, 'AGENTS.md'),
      '# Agent\n\n- [docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md)\n- [docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md)\n',
      'utf8',
    )
    const r = await runValidator(FIXTURE)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('agents-links')
    expect(r.stderr).toContain('ARCHITECTURE.md')
  })

  it('G10: ignores files under _archived/ when checking links', async () => {
    await fs.mkdir(path.join(FIXTURE, 'docs/compound/_archived'), { recursive: true })
    await fs.writeFile(
      path.join(FIXTURE, 'docs/compound/_archived/old.md'),
      '# Old\n\n[gone](./missing.md)\n',
      'utf8',
    )
    const r = await runValidator(FIXTURE)
    expect(r.code).toBe(0) // _archived nao crawla
  })
})
```

---

## Gotchas

- **G1 do plano (perf):** Todas as 4 categorias de check em `Promise.all`. Dentro de cada uma (e.g., link-check de cada markdown file), tambem `Promise.all`. Em fixture canonica (~25 arquivos), <100ms. Em fixture 100-docs (fase-04), alvo <2s.
- **G2 do plano (cross-platform):** `path.resolve(path.dirname(file), target)` lida com `../` e `./` corretamente em Windows. Link com forward slash (`./docs/X.md`) eh normalizado por Node. NUNCA comparar strings de paths — use `fs.stat` direto.
- **G6 do plano (orphan heuristica conservadora):** Helper canonico em `lib/orphan-plan-detector.ts` para garantir consistencia se `/execute-plan` (Plano 05) reusar. Script `.tpl` tem versao inline duplicada — sincronizar manualmente. Documentado em JSDoc cross-reference.
- **G10 do plano (_archived/):** `collectMarkdownFiles` exclui `_archived/`. Teste `G10: ignores files under _archived/` cobre. Inclui caso onde link em arquivo arquivado seria broken — nao falha o validator.
- **Local — `.planning.v5-backup/` excluido:** Durante migracao v5→v6 (Plano 03), backup ainda existe na arvore. Sem exclusao, validator falharia em arquivos de backup (paths antigos sem H1, links quebrados internos do v5). SKIP_DIRS inclui defensivamente.
- **Local — `docs/STATE.md` e novo:** Plano 02 fase-06 cria via template. Required list aqui o lista. Se Plano 02 nao terminou fase-06, `harness:validate` falha — sinal correto.
- **Local — `scripts/compound-check.ts` se auto-referencia:** Required list inclui ele. Tracer chain: `/init` copia template → script existe → validator passa. Sem `compound-check.ts` no scaffold, falha. Sinal correto.
- **Local — link-checker com query strings/anchors:** `cleanTarget = target.split('#')[0].split('?')[0]` lida com `[X](./Y.md#section)`. Empty string apos split = anchor-only link (`#section`) — skip via `if (cleanTarget === '') return`. Anchor-only links **dentro da pagina** sao validos por convencao (markdown gera anchors automaticamente) — validator nao verifica que o anchor existe na pagina target.

---

## Verificacao

### TDD

- [ ] **RED (helper):** `bun run test skills/init/lib/orphan-plan-detector.test.ts` falha — modulo nao existe.

- [ ] **GREEN (helper):** 8 testes passam.
  - Comando: `bun run test skills/init/lib/orphan-plan-detector.test.ts`
  - Esperado: `8 passed, 0 failed`

- [ ] **RED (E2E):** `bun run test tests/harness-validate-advanced.test.ts` — testes novos falham porque script ainda esta no estado minimal (so 3 required files).

- [ ] **GREEN (E2E):** 7 testes E2E passam.
  - Esperado: `7 passed, 0 failed`

- [ ] **Regressao tracer (Plano 01 fase-05):** `bun run test tests/e2e-tracer.test.ts` (ou equivalente) continua passando. Como a versao full TEM mais required-files, fixture do tracer (que so tinha 3 files) AGORA falha. **Acao:** atualizar fixture do tracer-bullet em Plano 02 fase-02 (que ja cria todos os 25 files) — alinhamento natural. Se Plano 02 fase-02 nao terminou, executar fase-03 deste plano DEPOIS de Plano 02 fase-02 (documentado no README do Plano 04 — fase-03 depende de Plano 02 fase-01 e fase-02).

### Checklist

- [ ] `lib/orphan-plan-detector.ts` exporta `looksComplete(content: string): boolean`
- [ ] Heuristica conservadora: 8 testes parametricos cobrem (G6)
- [ ] `scripts/harness-validate.ts.tpl` cresceu de ~80 para ~250 linhas
- [ ] Required-files: 25 arquivos (lista replicada do Andre + adicoes v6: STATE.md, CLAUDE.md, COMPOUND_ENGINEERING.md, compound-check.ts)
- [ ] AGENTS.md required links: ARCHITECTURE.md, docs/QUALITY_SCORE.md, docs/PRODUCT_SENSE.md
- [ ] Link checker recursivo cobre todo `.md` exceto `_archived/` e `.planning.v5-backup/`
- [ ] **CA-28:** plano em `active/` com `## Exit Criteria` marcado + `## Validation Log passed` → rule `orphan-active-plan`
- [ ] **CA-27:** AGENTS.md com 50 linhas continua falhando com mensagem `"40 lines or fewer"`
- [ ] `Promise.all` em todos os check loops (G1 perf)
- [ ] `_archived/` excluido de `collectMarkdownFiles` (G10)
- [ ] `.planning.v5-backup/` excluido (defensivo durante migracao Plano 03)
- [ ] Lint + TypeCheck strict

---

## Criterio de Aceite

**Por maquina (CA-27 + CA-28 verbatim):**

```bash
cd anti-vibe-coding
bun run test skills/init/lib/orphan-plan-detector.test.ts
# Esperado: 8 passed, 0 failed

bun run test tests/harness-validate-advanced.test.ts
# Esperado: 7 passed, 0 failed

# CA-27: AGENTS de 50 linhas falha
# (testado via fixture; saida nominal:)
# [agents-line-count] AGENTS.md should stay short; keep it at 40 lines or fewer (current: 50)

# CA-28: plano orfao falha
# [orphan-active-plan] docs/exec-plans/active/2026-05-12-feat.md appears complete but is still active; move it to docs/exec-plans/completed/ or mark remaining work explicitly
```

**Por humano:**

- Mensagens de stderr sao identicas ao `.mjs` original do Andre em casos comuns (orphan, line-count) — consistencia visual com docs do harness.
- Validator exit 0 reporta `(25 required files, N markdown files checked)` em stdout — usuario sabe o que foi inspecionado.
- Em projeto recem-init (saido do Plano 02 completo), `bun run harness:validate` retorna exit 0 sem ediprintf de erros — regressao do tracer mantida.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
