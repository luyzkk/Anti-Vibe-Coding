<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-19 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 02: compound-imported Writer + Step 13

**Plano:** 05 — Progress.txt import + SKILL.md + E2E
**Sizing:** 1.5h
**Depende de:** fase-01 (parser pronto)
**Visual:** false

---

## O que esta fase entrega

Writer puro que recebe `ProgressEntry[]` (fase-01) e materializa cada entrada em `docs/compound/_imported/{nnnn}-{slug}.md` no formato compound existente (frontmatter `title/category/tags/created` + secoes `## Problem / ## Solution / ## Prevention`). Cria tambem `docs/compound/_imported/INDEX.md` com lista linkavel + linha de proveniencia por entrada. Novo step `13-import-progress-txt.ts` registrado no `registry.ts` invoca parser + writer, soft-fail em greenfield. Resolve MH-10 + CA-05.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/compound-imported-writer.ts` | Create | `writeCompoundImported(entries: ProgressEntry[], opts: { targetDir, sourcePath }): Promise<{ filesWritten: string[]; indexPath: string }>` |
| `skills/init/lib/compound-imported-writer.test.ts` | Create | Suite cobrindo: empty array no-op, escrita de 2 entradas + INDEX.md, idempotencia (re-run com mesmo input), proveniencia correta |
| `skills/init/lib/steps/13-import-progress-txt.ts` | Create | Step do registry: le `.claude/progress.txt`, chama parser + writer, retorna `{ mutated, summary }` |
| `skills/init/lib/steps/13-import-progress-txt.test.ts` | Create | Suite: greenfield (no file) -> soft-fail; fixture com arquivo -> N escritos; flags audit log |
| `skills/init/lib/registry.ts` | Modify | Inserir `importProgressTxtStep` apos `reentryGuardStep` / `backupPre650Step` e ANTES de `scaffoldFullTreeStep` (gotchas viram parte do estado canonico do scaffold) |
| `skills/init/lib/registry.test.ts` | Modify | Assertar presenca de `13-import-progress-txt` na ordem certa |

---

## Implementacao

### Passo 1: writer puro

```typescript
// skills/init/lib/compound-imported-writer.ts
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { ProgressEntry } from './progress-txt-parser'

export type CompoundImportedResult = {
  filesWritten: string[]
  indexPath: string
}

const HEADER_TEMPLATE_NAME = 'compound-imported'

function renderEntry(entry: ProgressEntry, today: string, sourceRel: string): string {
  const tags = ['imported', entry.category]
  return [
    '---',
    `title: "${entry.title.replace(/"/g, '\\"')}"`,
    `category: ${entry.category}`,
    `tags: [${tags.join(', ')}]`,
    `created: ${today}`,
    `source: ${sourceRel} linha ${String(entry.sourceLineNumber)}`,
    '---',
    '',
    '## Problem',
    '',
    entry.body.trim().length > 0 ? entry.body.trim() : '_(imported sem corpo — revisar manualmente)_',
    '',
    '## Solution',
    '',
    '_(extracted from imported gotcha — refinar via PR review se necessario)_',
    '',
    '## Prevention',
    '',
    '_(extrapolated from rule)_',
    '',
  ].join('\n')
}

function renderIndex(entries: ProgressEntry[], today: string, sourceRel: string): string {
  const lines = [
    '---',
    `title: "Imported gotchas from .claude/progress.txt"`,
    `created: ${today}`,
    `source: ${sourceRel}`,
    `count: ${String(entries.length)}`,
    '---',
    '',
    '# Imported Gotchas (legacy `progress.txt`)',
    '',
    'Cada entrada abaixo foi extraida automaticamente de `.claude/progress.txt` durante `/anti-vibe-coding:init`.',
    'Revisar via PR antes de promover para `docs/CORE_BELIEFS.md` ou outros docs canonicos.',
    '',
    '## Index',
    '',
  ]
  for (const e of entries) {
    const slug = `${String(e.index).padStart(4, '0')}-${e.slug}`
    lines.push(`- [\`${slug}.md\`](./${slug}.md) — ${e.title} _(${sourceRel} linha ${String(e.sourceLineNumber)})_`)
  }
  lines.push('')
  return lines.join('\n')
}

/**
 * Escreve cada entrada em `docs/compound/_imported/{nnnn}-{slug}.md` + INDEX.md.
 * Idempotente: re-run com mesmo input sobrescreve sem duplicar (prefixo {nnnn} estavel).
 * @param opts.targetDir cwd do projeto (path absoluto)
 * @param opts.sourcePath caminho do progress.txt relativo ao targetDir (ex: `.claude/progress.txt`)
 */
export async function writeCompoundImported(
  entries: ProgressEntry[],
  opts: { targetDir: string; sourcePath: string },
): Promise<CompoundImportedResult> {
  const outDir = path.join(opts.targetDir, 'docs', 'compound', '_imported')
  await fs.mkdir(outDir, { recursive: true })

  const today = new Date().toISOString().slice(0, 10)
  const filesWritten: string[] = []

  for (const entry of entries) {
    const slug = `${String(entry.index).padStart(4, '0')}-${entry.slug}`
    const dest = path.join(outDir, `${slug}.md`)
    await fs.writeFile(dest, renderEntry(entry, today, opts.sourcePath), 'utf-8')
    filesWritten.push(dest)
  }

  const indexPath = path.join(outDir, 'INDEX.md')
  await fs.writeFile(indexPath, renderIndex(entries, today, opts.sourcePath), 'utf-8')

  return { filesWritten, indexPath }
}
```

### Passo 2: step 13 (orquestracao)

```typescript
// skills/init/lib/steps/13-import-progress-txt.ts
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseProgressTxt } from '../progress-txt-parser'
import { writeCompoundImported } from '../compound-imported-writer'
import type { Step } from './types'

const SOURCE_REL = path.posix.join('.claude', 'progress.txt')

/**
 * Step 13 — importa `.claude/progress.txt` (se existir) em `docs/compound/_imported/`.
 * Soft-fail: ausencia do arquivo retorna `{ mutated:false, summary:'... skipped' }`.
 * Cobre MH-10 e CA-05.
 */
export const importProgressTxtStep: Step = {
  id: '13-import-progress-txt',
  async run(ctx) {
    const sourceAbs = path.join(ctx.cwd, SOURCE_REL)
    let raw: string
    try {
      raw = await fs.readFile(sourceAbs, 'utf-8')
    } catch (e) {
      const err = e as NodeJS.ErrnoException
      if (err.code === 'ENOENT') {
        return { mutated: false, summary: 'no .claude/progress.txt — skipped (MH-10)' }
      }
      throw e
    }

    const entries = parseProgressTxt(raw)
    if (entries.length === 0) {
      return { mutated: false, summary: 'progress.txt present but parsed 0 entries — nothing to import' }
    }

    const result = await writeCompoundImported(entries, {
      targetDir: ctx.cwd,
      sourcePath: SOURCE_REL,
    })

    return {
      mutated: true,
      summary: `imported ${String(entries.length)} gotchas -> docs/compound/_imported/ (+ INDEX.md)`,
      // audit-log-writer-factory consumira via ctx.audit (se exposto pelo registry runner)
    }
  },
}
```

### Passo 3: registrar no `registry.ts`

```typescript
// skills/init/lib/registry.ts (diff conceitual)
import { importProgressTxtStep } from './steps/13-import-progress-txt'
// ...
export const registry: readonly Step[] = [
  detectLegacyStep,
  reuseDiscoveryStep,
  reentryGuardStep,
  backupPre650Step,
  secretsScanStep,
  importProgressTxtStep,   // 2026-05-19 (Luiz/dev): Plano 05 fase-02 — MH-10/CA-05.
  scaffoldFullTreeStep,
  // ...resto inalterado
]
```

Justificativa de posicao: roda APOS `backupPre650Step` (re-init preserva legado em `_legacy/`) e ANTES de `scaffoldFullTreeStep` para que `docs/compound/_imported/` exista quando o scaffold popular o tree (evita conflito de ordem).

### Passo 4: testes RED -> GREEN

```typescript
// skills/init/lib/compound-imported-writer.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { writeCompoundImported } from './compound-imported-writer'
import type { ProgressEntry } from './progress-txt-parser'

const sampleEntries: ProgressEntry[] = [
  { index: 1, sourceLineNumber: 7, category: 'armadilha', title: 'UPSERT idempotente', body: '**Contexto:** sync\n**Solucao:** ON CONFLICT', slug: 'upsert-idempotente' },
  { index: 2, sourceLineNumber: 14, category: 'gotcha', title: 'Rate limit', body: '**Solucao:** delay 600ms', slug: 'rate-limit' },
]

describe('writeCompoundImported', () => {
  let tmp: string

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'compound-imported-'))
  })

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('writes N entry files + INDEX.md when given N entries', async () => {
    const result = await writeCompoundImported(sampleEntries, { targetDir: tmp, sourcePath: '.claude/progress.txt' })
    expect(result.filesWritten).toHaveLength(2)
    expect(result.filesWritten[0]).toContain('0001-upsert-idempotente.md')
    expect(result.filesWritten[1]).toContain('0002-rate-limit.md')
    const indexExists = await fs.stat(result.indexPath).then(() => true).catch(() => false)
    expect(indexExists).toBe(true)
  })

  it('preserves provenance line in frontmatter', async () => {
    const { filesWritten } = await writeCompoundImported(sampleEntries, { targetDir: tmp, sourcePath: '.claude/progress.txt' })
    const content = await fs.readFile(filesWritten[0] ?? '', 'utf-8')
    expect(content).toContain('source: .claude/progress.txt linha 7')
    expect(content).toContain('title: "UPSERT idempotente"')
    expect(content).toMatch(/^---\n/)
  })

  it('idempotent: re-run with same input overwrites same files (no duplication)', async () => {
    await writeCompoundImported(sampleEntries, { targetDir: tmp, sourcePath: '.claude/progress.txt' })
    const dir = path.join(tmp, 'docs', 'compound', '_imported')
    const before = (await fs.readdir(dir)).sort()
    await writeCompoundImported(sampleEntries, { targetDir: tmp, sourcePath: '.claude/progress.txt' })
    const after = (await fs.readdir(dir)).sort()
    expect(after).toEqual(before)
    expect(after).toHaveLength(3) // 2 entries + INDEX.md
  })

  it('empty input writes only INDEX.md with count=0', async () => {
    const result = await writeCompoundImported([], { targetDir: tmp, sourcePath: '.claude/progress.txt' })
    expect(result.filesWritten).toHaveLength(0)
    const indexContent = await fs.readFile(result.indexPath, 'utf-8')
    expect(indexContent).toContain('count: 0')
  })

  it('INDEX.md links to all entry files', async () => {
    const { indexPath } = await writeCompoundImported(sampleEntries, { targetDir: tmp, sourcePath: '.claude/progress.txt' })
    const content = await fs.readFile(indexPath, 'utf-8')
    expect(content).toContain('[`0001-upsert-idempotente.md`](./0001-upsert-idempotente.md)')
    expect(content).toContain('[`0002-rate-limit.md`](./0002-rate-limit.md)')
    expect(content).toContain('linha 7')
    expect(content).toContain('linha 14')
  })
})
```

```typescript
// skills/init/lib/steps/13-import-progress-txt.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { importProgressTxtStep } from './13-import-progress-txt'

describe('importProgressTxtStep', () => {
  let cwd: string

  beforeEach(async () => {
    cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'step-13-'))
  })

  afterEach(async () => {
    await fs.rm(cwd, { recursive: true, force: true })
  })

  it('soft-fails when .claude/progress.txt is absent (greenfield)', async () => {
    const report = await importProgressTxtStep.run({ cwd, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('skipped')
  })

  it('imports N entries when progress.txt exists', async () => {
    await fs.mkdir(path.join(cwd, '.claude'), { recursive: true })
    await fs.writeFile(
      path.join(cwd, '.claude', 'progress.txt'),
      `### [Armadilha] Foo\n**Contexto:** x\n\n### Bar\nbody\n`,
      'utf-8',
    )
    const report = await importProgressTxtStep.run({ cwd, args: [], flags: {} })
    expect(report.mutated).toBe(true)
    expect(report.summary).toContain('imported 2 gotchas')
    const files = await fs.readdir(path.join(cwd, 'docs', 'compound', '_imported'))
    expect(files.sort()).toEqual(['0001-foo.md', '0002-bar.md', 'INDEX.md'].sort())
  })

  it('parses 0 entries from non-empty file -> no mutation, summary marks empty parse', async () => {
    await fs.mkdir(path.join(cwd, '.claude'), { recursive: true })
    await fs.writeFile(path.join(cwd, '.claude', 'progress.txt'), `# header only\nno headings here\n`, 'utf-8')
    const report = await importProgressTxtStep.run({ cwd, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('0 entries')
  })
})
```

---

## Gotchas

- **G3 do plano:** `docs/compound/_imported/` esta dentro de `docs/compound/`. Step 90 allowlist (Plano 04 fase-03) precisa incluir `docs/compound/_imported/**` — CONFIRMAR em fase-04 (E2E nao emitir warning sobre _imported).
- **G7 do plano:** Soft-fail em greenfield e essencial — `init-cutover-greenfield.test.ts` nao tem `.claude/progress.txt` e DEVE seguir verde apos esta fase. Validar com fixture greenfield.
- **G9 do plano:** Path em `source: ...` e RELATIVO ao cwd. `SOURCE_REL = '.claude/progress.txt'` (POSIX-style com `path.posix.join`). Em Windows, `path.join` introduziria backslash — usar `path.posix` explicitamente.
- **Local:** `fs.writeFile(..., 'utf-8')` sem BOM. Render template usa LF (`'\n'.join`). Em Windows, validator tolera LF/CRLF mas conventionar LF aqui evita drift em diff.
- **Local:** `INDEX.md` tem `count: N` no frontmatter — usado pelo validator allowlist para classificar como "arquivo gerado em runtime", nao "template". Confirmar com Plano 04 fase-03 que esse padrao e reconhecido.
- **Local:** Idempotencia depende do `entry.index` (1-based ordem de aparicao no parser). Se `progress.txt` for editado entre runs adicionando entrada no meio, indices SHIFTAM e arquivos antigos viram orfaos. Re-init v < 6.5.0 ja preserva `docs/_legacy/pre-6.5.0/` — orfaos sao recuperaveis dai. Documentar no `INDEX.md`.

---

## Verificacao

### TDD

- [ ] **RED:** `bun test skills/init/lib/compound-imported-writer.test.ts` falha (modulo ausente)
- [ ] **GREEN:** Apos implementar writer, `5 pass, 0 fail` no writer + `3 pass, 0 fail` no step
- [ ] **REFACTOR:** Extrair `renderEntry`/`renderIndex` para funcoes puras testaveis isoladamente se a suite ficar grande

### Checklist

- [ ] `writer.test.ts` cobre: empty input, N entries, idempotencia, proveniencia, INDEX linking
- [ ] `step.test.ts` cobre: ausencia (soft-fail), presenca (mutated true), parse vazio (mutated false)
- [ ] Step registrado em `registry.ts` na ORDEM certa (apos backup, antes do scaffold)
- [ ] `registry.test.ts` atualizado: contem `13-import-progress-txt` em posicao apos `backupPre650Step`
- [ ] Greenfield fixture (`tests/e2e/__fixtures__/init-greenfield`) NAO tem `.claude/progress.txt` — confirmar
- [ ] `bun test skills/init/` retorna 0 failed
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/compound-imported-writer.test.ts` -> `5 pass, 0 fail`
- `bun test skills/init/lib/steps/13-import-progress-txt.test.ts` -> `3 pass, 0 fail`
- Dado fixture com 2 entradas em `.claude/progress.txt`, executar `importProgressTxtStep` cria exatamente 3 arquivos em `docs/compound/_imported/`: `0001-*.md`, `0002-*.md`, `INDEX.md`
- Conteudo do `0001-*.md` contem linha `source: .claude/progress.txt linha N` (CA-05 — proveniencia)

**Por humano:**
- Apos rodar em projeto real (Licitar), inspecionar `docs/compound/_imported/INDEX.md` confirma >= 30 entradas listadas com link de origem correto

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
