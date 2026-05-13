<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 02: Compound frontmatter validator (lib/compound-frontmatter.ts + secoes Problem/Solution/Prevention)

**Plano:** 04 — Validators Full
**Sizing:** 1.5h
**Depende de:** fase-01 (script `compound-check.ts.tpl` skeleton + helper `lib/compound-files-collector.ts` existem)
**Visual:** false

---

## O que esta fase entrega

Faz o `compound-check.ts.tpl` cumprir o **CA-29** verbatim: rejeita compound note sem `## Solution` (e por extensao sem `## Problem` ou sem `## Prevention`), rejeita arquivo sem YAML frontmatter, e rejeita frontmatter incompleto (`title`/`category`/`tags`/`created`).

Entrega:

- Helper canonico `lib/compound-frontmatter.ts` no plugin com `parseFrontmatter(body): FrontmatterResult` (tipo Discriminated Union: `ok` vs `error`).
- Logica de validacao incorporada ao script `scripts/compound-check.ts.tpl` (inlinada como fase-01 fez com `collectMd` — script independente do plugin).
- Schema rigido (Ambiguity 04-A1 + 04-A2 decididas conservadoras): `title: string`, `category: string`, `tags: string[]` (>=1 elemento), `created: YYYY-MM-DD`. Secoes obrigatorias: H2 exato `## Problem`, `## Solution`, `## Prevention`.
- 12+ testes parametricos cobrindo cada vetor de falha + caso happy-path.

Atende **CA-29** (PRD verbatim), **M6**, **D19** (frontmatter para busca por IA).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/init/lib/compound-frontmatter.ts` | Create | Parser YAML simples + validador de schema. `parseFrontmatter(body): FrontmatterResult` |
| `anti-vibe-coding/skills/init/lib/compound-frontmatter.test.ts` | Create | 12+ casos: happy, no frontmatter, unclosed frontmatter, missing field, empty tags, invalid created, extra fields ok |
| `anti-vibe-coding/skills/init/assets/templates/scripts/compound-check.ts.tpl` | Modify | Adicionar `checkFrontmatter` + `checkRequiredSections` inlinados. Inflar de ~80 para ~180 linhas |
| `anti-vibe-coding/tests/compound-check-frontmatter.test.ts` | Create | E2E: fixture com note invalida → exit 1 com mensagem CA-29; fixture com note valida → exit 0 |

---

## Implementacao

### Passo 1: Helper `lib/compound-frontmatter.ts`

```typescript
// 2026-05-11 (Luiz/dev): parser inline simples de YAML frontmatter — Plano 04 fase-02.
// Decisao registrada em MEMORY DI-5: nao dependemos de `gray-matter` para evitar dependencia.
// Esquema fixo para compound notes (D19 — navegacao por IA). Resposta a Ambiguity 04-A1 (estrito).

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export type CompoundFrontmatter = {
  title: string
  category: string
  tags: ReadonlyArray<string>
  created: string
}

export type FrontmatterResult =
  | { ok: true; data: CompoundFrontmatter }
  | { ok: false; errors: ReadonlyArray<string> }

/**
 * Parse YAML frontmatter de uma compound note.
 *
 * Esquema rigido (Ambiguity 04-A1/A2 resolvidas conservadoras):
 * - `title`: string nao-vazia
 * - `category`: string nao-vazia
 * - `tags`: array com >=1 string nao-vazia
 * - `created`: string no formato YYYY-MM-DD
 *
 * Campos extras sao permitidos (forward-compat com `applies-to`, `updated`, `status` etc.).
 *
 * Erros sao acumulados — uma chamada reporta TODOS os campos invalidos, nao apenas o primeiro.
 */
export function parseFrontmatter(body: string): FrontmatterResult {
  const match = body.match(FRONTMATTER_RE)
  if (!match) {
    if (body.trimStart().startsWith('---')) {
      return { ok: false, errors: ['frontmatter delimiter "---" found but never closed'] }
    }
    return { ok: false, errors: ['missing frontmatter (expected `---` on line 1)'] }
  }

  const raw = match[1]
  const parsed = parseSimpleYaml(raw)
  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors }
  }

  const errors: string[] = []
  const data = parsed.data

  if (typeof data.title !== 'string' || data.title.trim() === '') {
    errors.push('frontmatter.title must be a non-empty string')
  }
  if (typeof data.category !== 'string' || data.category.trim() === '') {
    errors.push('frontmatter.category must be a non-empty string')
  }
  if (!Array.isArray(data.tags)) {
    errors.push('frontmatter.tags must be an array')
  } else if (data.tags.length === 0) {
    errors.push('frontmatter.tags must have at least 1 element')
  } else if (!data.tags.every((t) => typeof t === 'string' && t.trim() !== '')) {
    errors.push('frontmatter.tags must contain non-empty strings only')
  }
  if (typeof data.created !== 'string' || !DATE_RE.test(data.created)) {
    errors.push('frontmatter.created must be a string in YYYY-MM-DD format')
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    data: {
      title: data.title as string,
      category: data.category as string,
      tags: data.tags as ReadonlyArray<string>,
      created: data.created as string,
    },
  }
}

// Parser YAML minimo — cobre apenas o subset usado em compound frontmatter:
// chaves planas (`key: value`), listas inline (`tags: [a, b]`), listas YAML
// (`tags:\n  - a\n  - b`). NAO suporta nested objects. Suficiente para D19.
type ParseYamlResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; errors: ReadonlyArray<string> }

function parseSimpleYaml(raw: string): ParseYamlResult {
  const data: Record<string, unknown> = {}
  const errors: string[] = []
  const lines = raw.split(/\r?\n/)
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === '' || line.trim().startsWith('#')) {
      i += 1
      continue
    }

    const keyValueMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/)
    if (!keyValueMatch) {
      errors.push(`unparseable line: "${line}"`)
      i += 1
      continue
    }

    const key = keyValueMatch[1]
    const rest = keyValueMatch[2].trim()

    if (rest === '') {
      // Bloco — espera lista `  - item` nas linhas seguintes
      const items: string[] = []
      i += 1
      while (i < lines.length && lines[i].match(/^\s+-\s+/)) {
        const itemMatch = lines[i].match(/^\s+-\s+(.+)$/)
        if (itemMatch) items.push(stripQuotes(itemMatch[1].trim()))
        i += 1
      }
      data[key] = items
      continue
    }

    if (rest.startsWith('[') && rest.endsWith(']')) {
      // Lista inline
      const inner = rest.slice(1, -1)
      const items = inner === '' ? [] : inner.split(',').map((s) => stripQuotes(s.trim()))
      data[key] = items
    } else {
      data[key] = stripQuotes(rest)
    }
    i += 1
  }

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, data }
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1)
  }
  return s
}

/**
 * Valida que body do compound note contem as 3 H2 obrigatorias.
 * Resposta a Ambiguity 04-A1: match estrito H2 exato `## (Problem|Solution|Prevention)\s*$`
 * (case-sensitive, sem trailing content na linha).
 */
export function findMissingRequiredSections(body: string): ReadonlyArray<string> {
  const required = ['Problem', 'Solution', 'Prevention'] as const
  const missing: string[] = []
  for (const section of required) {
    const re = new RegExp(`^## ${section}\\s*$`, 'm')
    if (!re.test(body)) {
      missing.push(`## ${section}`)
    }
  }
  return missing
}
```

### Passo 2: Testes do helper `lib/compound-frontmatter.test.ts`

```typescript
import { describe, it, expect } from 'bun:test'
import { parseFrontmatter, findMissingRequiredSections } from './compound-frontmatter'

const VALID_FM = `---
title: Race condition no webhook retry
category: bug
tags:
  - webhook
  - race
  - postgres
created: 2026-05-12
---

# Race condition no webhook retry

## Problem
The webhook handler updates state without locking.

## Solution
Wrap update in SELECT FOR UPDATE.

## Prevention
Add idempotency_key check at the entry point.
`

describe('parseFrontmatter', () => {
  it('parses valid frontmatter with YAML list', () => {
    const r = parseFrontmatter(VALID_FM)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.title).toBe('Race condition no webhook retry')
    expect(r.data.category).toBe('bug')
    expect(r.data.tags).toEqual(['webhook', 'race', 'postgres'])
    expect(r.data.created).toBe('2026-05-12')
  })

  it('parses inline list tags: [a, b, c]', () => {
    const body = `---
title: X
category: y
tags: [a, b, c]
created: 2026-05-12
---

# X
`
    const r = parseFrontmatter(body)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.tags).toEqual(['a', 'b', 'c'])
  })

  it('rejects body with no frontmatter at all', () => {
    const r = parseFrontmatter('# Just a title\n\n## Problem\n')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors[0]).toContain('missing frontmatter')
  })

  it('G4: rejects unclosed frontmatter delimiter', () => {
    const body = '---\ntitle: X\ncategory: y\n\n# never closed\n'
    const r = parseFrontmatter(body)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors[0]).toContain('never closed')
  })

  it('rejects missing title', () => {
    const body = `---
category: bug
tags: [x]
created: 2026-05-12
---

# X
`
    const r = parseFrontmatter(body)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors.some((e) => e.includes('title'))).toBe(true)
  })

  it('rejects empty title string', () => {
    const body = `---
title: ""
category: bug
tags: [x]
created: 2026-05-12
---
`
    const r = parseFrontmatter(body)
    expect(r.ok).toBe(false)
  })

  it('Ambiguity 04-A2: rejects empty tags array', () => {
    const body = `---
title: X
category: y
tags: []
created: 2026-05-12
---
`
    const r = parseFrontmatter(body)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors.some((e) => e.includes('at least 1 element'))).toBe(true)
  })

  it('rejects created field in wrong format', () => {
    const body = `---
title: X
category: y
tags: [a]
created: 12/05/2026
---
`
    const r = parseFrontmatter(body)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors.some((e) => e.includes('YYYY-MM-DD'))).toBe(true)
  })

  it('accepts extra fields (forward-compat)', () => {
    const body = `---
title: X
category: y
tags: [a]
created: 2026-05-12
status: active
applies-to: rails@8
---
`
    const r = parseFrontmatter(body)
    expect(r.ok).toBe(true)
  })

  it('strips quotes from string values', () => {
    const body = `---
title: "Quoted title"
category: 'bug'
tags: ["a", 'b']
created: 2026-05-12
---
`
    const r = parseFrontmatter(body)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.title).toBe('Quoted title')
    expect(r.data.category).toBe('bug')
    expect(r.data.tags).toEqual(['a', 'b'])
  })

  it('accumulates all errors (does not stop on first)', () => {
    const body = `---
title: ""
category: ""
tags: []
created: bogus
---
`
    const r = parseFrontmatter(body)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.errors.length).toBeGreaterThanOrEqual(4) // 4 vetores invalidos simultaneos
  })
})

describe('findMissingRequiredSections', () => {
  it('returns empty array when all 3 sections present', () => {
    const body = '## Problem\nx\n## Solution\ny\n## Prevention\nz\n'
    expect(findMissingRequiredSections(body)).toEqual([])
  })

  it('CA-29: returns ["## Solution"] when Solution missing', () => {
    const body = '## Problem\nx\n## Prevention\nz\n'
    expect(findMissingRequiredSections(body)).toEqual(['## Solution'])
  })

  it('returns all 3 when all missing', () => {
    expect(findMissingRequiredSections('# Just a title\n')).toEqual(['## Problem', '## Solution', '## Prevention'])
  })

  it('Ambiguity 04-A1: rejects "## solution" (lowercase) — strict match', () => {
    const body = '## Problem\n## solution\n## Prevention\n'
    expect(findMissingRequiredSections(body)).toEqual(['## Solution'])
  })

  it('Ambiguity 04-A1: rejects "### Solution" (H3) — strict H2 match', () => {
    const body = '## Problem\n### Solution\n## Prevention\n'
    expect(findMissingRequiredSections(body)).toEqual(['## Solution'])
  })

  it('Ambiguity 04-A1: rejects "## Solution found" (trailing content)', () => {
    const body = '## Problem\n## Solution found\n## Prevention\n'
    expect(findMissingRequiredSections(body)).toEqual(['## Solution'])
  })
})
```

### Passo 3: Inflar `scripts/compound-check.ts.tpl`

Adicionar **dentro do mesmo arquivo .tpl** (inlinando — script independente do plugin):

```typescript
// === bloco adicionado em fase-02 ===

const FRONTMATTER_RE_INLINE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/
const DATE_RE_INLINE = /^\d{4}-\d{2}-\d{2}$/

async function checkAllNotes(files: ReadonlyArray<string>, failures: Failure[]): Promise<void> {
  await Promise.all(files.map((file) => checkOne(file, failures)))
}

async function checkOne(file: string, failures: Failure[]): Promise<void> {
  let body: string
  try {
    body = await fs.readFile(file, 'utf8')
  } catch (err) {
    failures.push({
      rule: 'readable',
      file: path.relative(root, file),
      message: `cannot read file (${(err as Error).message})`,
    })
    return
  }

  // Frontmatter
  const fmResult = parseFrontmatterInline(body)
  if (!fmResult.ok) {
    for (const err of fmResult.errors) {
      failures.push({
        rule: 'frontmatter',
        file: path.relative(root, file),
        message: err,
      })
    }
  }

  // Secoes obrigatorias (CA-29)
  const missing = findMissingSectionsInline(body)
  for (const section of missing) {
    failures.push({
      rule: 'required-section',
      file: path.relative(root, file),
      message: `missing required H2 section: ${section}`,
    })
  }
}

type FmInlineResult =
  | { ok: true }
  | { ok: false; errors: ReadonlyArray<string> }

function parseFrontmatterInline(body: string): FmInlineResult {
  const match = body.match(FRONTMATTER_RE_INLINE)
  if (!match) {
    if (body.trimStart().startsWith('---')) {
      return { ok: false, errors: ['frontmatter delimiter "---" found but never closed'] }
    }
    return { ok: false, errors: ['missing frontmatter (expected `---` on line 1)'] }
  }

  const data = parseYamlInline(match[1])
  const errors: string[] = []
  if (typeof data.title !== 'string' || (data.title as string).trim() === '') {
    errors.push('frontmatter.title must be a non-empty string')
  }
  if (typeof data.category !== 'string' || (data.category as string).trim() === '') {
    errors.push('frontmatter.category must be a non-empty string')
  }
  if (!Array.isArray(data.tags)) {
    errors.push('frontmatter.tags must be an array')
  } else if (data.tags.length === 0) {
    errors.push('frontmatter.tags must have at least 1 element')
  }
  if (typeof data.created !== 'string' || !DATE_RE_INLINE.test(data.created as string)) {
    errors.push('frontmatter.created must be a string in YYYY-MM-DD format')
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true }
}

function parseYamlInline(raw: string): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  const lines = raw.split(/\r?\n/)
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === '' || line.trim().startsWith('#')) { i += 1; continue }
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/)
    if (!m) { i += 1; continue }
    const key = m[1]; const rest = m[2].trim()
    if (rest === '') {
      const items: string[] = []
      i += 1
      while (i < lines.length && lines[i].match(/^\s+-\s+/)) {
        const im = lines[i].match(/^\s+-\s+(.+)$/)
        if (im) items.push(stripQ(im[1].trim()))
        i += 1
      }
      data[key] = items
      continue
    }
    if (rest.startsWith('[') && rest.endsWith(']')) {
      const inner = rest.slice(1, -1)
      data[key] = inner === '' ? [] : inner.split(',').map((s) => stripQ(s.trim()))
    } else {
      data[key] = stripQ(rest)
    }
    i += 1
  }
  return data
}

function stripQ(s: string): string {
  return ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) ? s.slice(1, -1) : s
}

function findMissingSectionsInline(body: string): ReadonlyArray<string> {
  const missing: string[] = []
  for (const section of ['Problem', 'Solution', 'Prevention']) {
    const re = new RegExp(`^## ${section}\\s*$`, 'm')
    if (!re.test(body)) missing.push(`## ${section}`)
  }
  return missing
}
```

Substituir a chamada a `ensureReadable` (do skeleton fase-01) por `checkAllNotes` em `main()`:

```typescript
// Antes: await ensureReadable(files, failures)
await checkAllNotes(files, failures)
```

### Passo 4: Testes E2E `tests/compound-check-frontmatter.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'compound-check-fm')
const SCRIPT_SRC = path.join(
  import.meta.dir, '..',
  'skills/init/assets/templates/scripts/compound-check.ts.tpl',
)

async function runScript(cwd: string): Promise<{ code: number; stderr: string; stdout: string }> {
  return new Promise((resolve) => {
    const proc = spawn('bun', ['run', path.join(cwd, 'scripts/compound-check.ts')], { cwd })
    let stdout = ''; let stderr = ''
    proc.stdout.on('data', (d) => { stdout += d.toString() })
    proc.stderr.on('data', (d) => { stderr += d.toString() })
    proc.on('exit', (code) => resolve({ code: code ?? -1, stderr, stdout }))
  })
}

async function setup(): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  await fs.mkdir(path.join(FIXTURE, 'scripts'), { recursive: true })
  await fs.mkdir(path.join(FIXTURE, 'docs', 'compound'), { recursive: true })
  await fs.copyFile(SCRIPT_SRC, path.join(FIXTURE, 'scripts', 'compound-check.ts'))
}

const VALID_NOTE = `---
title: X
category: bug
tags: [postgres]
created: 2026-05-12
---

# X

## Problem
y

## Solution
z

## Prevention
w
`

describe('compound-check (fase-02 with frontmatter + sections)', () => {
  beforeEach(setup)
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('exits 0 for valid compound note', async () => {
    await fs.writeFile(path.join(FIXTURE, 'docs/compound/2026-05-12-x.md'), VALID_NOTE, 'utf8')
    const r = await runScript(FIXTURE)
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('1 compound notes validated')
  })

  it('CA-29: exits 1 when note is missing ## Solution', async () => {
    const body = VALID_NOTE.replace('## Solution\nz\n\n', '')
    await fs.writeFile(path.join(FIXTURE, 'docs/compound/2026-05-12-x.md'), body, 'utf8')
    const r = await runScript(FIXTURE)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('missing required H2 section: ## Solution')
    expect(r.stderr).toContain('2026-05-12-x.md')
  })

  it('exits 1 when frontmatter is absent', async () => {
    await fs.writeFile(
      path.join(FIXTURE, 'docs/compound/2026-05-12-no-fm.md'),
      '# Just a title\n\n## Problem\nx\n## Solution\ny\n## Prevention\nz\n',
      'utf8',
    )
    const r = await runScript(FIXTURE)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('missing frontmatter')
  })

  it('exits 1 when frontmatter is missing tags', async () => {
    const body = `---
title: X
category: bug
created: 2026-05-12
---

# X

## Problem
a
## Solution
b
## Prevention
c
`
    await fs.writeFile(path.join(FIXTURE, 'docs/compound/2026-05-12-x.md'), body, 'utf8')
    const r = await runScript(FIXTURE)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('tags')
  })

  it('reports errors for multiple invalid notes', async () => {
    const bad1 = '# No frontmatter\n## Problem\nx\n## Solution\ny\n## Prevention\nz\n'
    const bad2 = VALID_NOTE.replace('## Prevention\nw\n', '')
    await fs.writeFile(path.join(FIXTURE, 'docs/compound/2026-05-12-a.md'), bad1, 'utf8')
    await fs.writeFile(path.join(FIXTURE, 'docs/compound/2026-05-12-b.md'), bad2, 'utf8')
    const r = await runScript(FIXTURE)
    expect(r.code).toBe(1)
    expect(r.stderr).toContain('2026-05-12-a.md')
    expect(r.stderr).toContain('2026-05-12-b.md')
  })
})
```

---

## Gotchas

- **G4 do plano (YAML frontmatter):** Parser inline e robusto a `\r\n` (Windows line endings) — regex usa `\r?\n`. Frontmatter sem fechamento e detectado e reportado nominalmente (`"never closed"`).
- **Local — duplicacao de parser entre `lib/compound-frontmatter.ts` e o `.tpl`:** Intencional, como fase-01. Script no projeto-alvo nao depende do plugin. **Sincronizacao manual**: se mudar schema (ex: adicionar campo obrigatorio `status`), mudar nos 2 lugares + teste. Documentar em ambos os arquivos via JSDoc cross-referencing.
- **Local — `as` em `(data.title as string)`:** Necessario porque `parseYamlInline` retorna `Record<string, unknown>`. Type guard via `typeof data.title === 'string'` ANTES do `as` resolve. CLAUDE.md global pede evitar `as` indiscriminado — aqui esta documentado: o guard imediatamente antes garante a safety.
- **Local — secoes obrigatorias em ingles (Problem/Solution/Prevention):** Match estrito (Ambiguity 04-A1). Compound notes do projeto-alvo sao em ingles (D2). Para compound notes do **plugin** (Plano 08 dog-food), Plano 05 fase-01 (migracao lessons-learned) deve gerar com mesmos cabecalhos em EN — o validator nao distingue projeto-alvo de plugin.
- **Local — accumulate errors (nao stop on first):** Teste `accumulates all errors` cobre. Importante para UX em PR: usuario corrige todos os problemas de uma vez, nao um por commit.
- **G1 do plano (perf):** `Promise.all(files.map(checkOne))` paraleliza I/O e CPU. Em 100 notes <50ms em SSD pos-warmup.

---

## Verificacao

### TDD

- [ ] **RED (helper):** `bun run test skills/init/lib/compound-frontmatter.test.ts` — falha porque modulo nao existe.
  - Resultado esperado: `Cannot find module`

- [ ] **GREEN (helper):** 17 testes passam (11 parseFrontmatter + 6 findMissingRequiredSections).
  - Comando: `bun run test skills/init/lib/compound-frontmatter.test.ts`
  - Resultado esperado: `17 passed, 0 failed`

- [ ] **RED (E2E):** `bun run test tests/compound-check-frontmatter.test.ts` falha — script `.tpl` ainda nao tem `checkAllNotes`.

- [ ] **GREEN (E2E):** 5 testes E2E passam.
  - Resultado esperado: `5 passed, 0 failed`

- [ ] **Regressao fase-01:** `bun run test tests/compound-check-skeleton.test.ts` continua passando — 4/4. Fase-02 nao quebrou casos da fase-01 (notes sem frontmatter agora falham, mas casos da fase-01 nao tinham notes — apenas README ou vazio).

### Checklist

- [ ] `lib/compound-frontmatter.ts` exporta `parseFrontmatter(body)` e `findMissingRequiredSections(body)`
- [ ] Schema validado: `title`/`category` strings nao-vazias, `tags` array com >=1 elemento, `created` no formato YYYY-MM-DD
- [ ] Erros acumulam (chamada unica reporta todos os campos invalidos) — teste `accumulates all errors`
- [ ] Match de secao obrigatoria e estrito H2 (rejeita `### Solution`, `## solution`, `## Solution found`) — testes da Ambiguity 04-A1 cobrem
- [ ] Frontmatter sem fechamento e detectado (`never closed`) — G4 coberto
- [ ] `compound-check.ts.tpl` agora valida frontmatter + secoes via funcoes inlinadas
- [ ] Mensagem de erro em stderr inclui o path relativo do arquivo (`docs/compound/X.md: ...`)
- [ ] **CA-29:** comando `bun run scripts/compound-check.ts` em fixture com compound note sem `## Solution` retorna exit 1 e stderr menciona `"missing required H2 section: ## Solution"`
- [ ] Testes da fase-01 continuam passando (regressao)
- [ ] Lint limpo + TypeCheck strict

---

## Criterio de Aceite

**Por maquina (CA-29 verbatim):**

```bash
cd anti-vibe-coding

# Cria fixture com compound note INVALIDA (sem ## Solution):
mkdir -p /tmp/compound-test/docs/compound /tmp/compound-test/scripts
cp skills/init/assets/templates/scripts/compound-check.ts.tpl /tmp/compound-test/scripts/compound-check.ts
cat > /tmp/compound-test/docs/compound/2026-05-12-test.md <<'EOF'
---
title: Test
category: bug
tags: [x]
created: 2026-05-12
---

# Test

## Problem
Bad.

## Prevention
Fix.
EOF

# Executa validator:
cd /tmp/compound-test && bun run scripts/compound-check.ts
# Esperado: exit 1, stderr contem "missing required H2 section: ## Solution"
echo "exit code: $?"  # 1
```

**Por humano:**

- Stderr de erro e legivel: cada falha em uma linha com formato `[rule] path: message`.
- Para arquivo com 4 problemas distintos (sem title + tags vazio + created invalido + sem ## Solution), validator reporta os 4 — usuario corrige tudo de uma vez.
- Compound note canonico (com todos os 4 campos + 3 secoes) passa sem warnings.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
