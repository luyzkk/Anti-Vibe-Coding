<!--
Princípio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante esta fase deve ter linhagem:
`// 2026-05-18 (Luiz/dev): <razao> — PRD <ref>`.
-->

# Fase 04: lib/doc-mover-stub.ts — move + stub redirect + rewrite atomico de links

**Plano:** 04 — Merge Invertido Destrutivo
**Sizing:** 1h
**Depende de:** Nenhuma intra-plano (independente; pode rodar em paralelo com fase-01/02/07)
**Visual:** false

---

## O que esta fase entrega

Helper `lib/doc-mover-stub.ts` com 3 simbolos publicos: `moveDocWithStub`, `rewriteInternalLinks`, `MoveResult`. Faz 3 coisas atomicas em sequencia (D12): (a) renomeia `source` -> `target`; (b) escreve no path antigo (`source`) um stub Markdown minimo `# Moved\n\nThis document moved to [{target}]({target relativo}).\n`; (c) glob `**/*.md` no repo e reescreve `[texto](source-path)` -> `[texto](target-path)` em cada match. URLs externas (`http://` / `https://`) sao apenas LOGADAS em warn como `MoveResult.externalLinks[]`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/doc-mover-stub.ts` | Create | 3 simbolos publicos: `moveDocWithStub`, `rewriteInternalLinks`, `MoveResult` (D12) |
| `skills/init/lib/doc-mover-stub.test.ts` | Create | 5 testes pareados (move basico, link interno reescrito, URL externa logada, destino existe → erro, origem ausente → erro) |

**NAO modificar:** nenhum step do registry — fase-05 consome este helper.

---

## Implementacao

### Passo 1: Tipos publicos

```typescript
// 2026-05-18 (Luiz/dev): contrato publico consumido por Step 11 (fase-05) e Plano 05 fase-04 (rollback inverso) — PRD D12

export type MoveResult = {
  /** True se fs.rename completou. */
  readonly moved: boolean
  /** True se stub redirect foi escrito no path antigo apos rename. */
  readonly stubWritten: boolean
  /** Quantos arquivos .md tiveram pelo menos 1 link reescrito. */
  readonly linksRewritten: number
  /** Lista de URLs externas detectadas mas NAO reescritas (apenas logadas). */
  readonly externalLinks: ReadonlyArray<{
    readonly file: string
    readonly line: number
    readonly url: string
  }>
  /** Erros nao-fatais (ex: glob falhou em 1 arquivo mas outros OK). */
  readonly errors: ReadonlyArray<{
    readonly stage: 'rename' | 'stub' | 'rewrite'
    readonly message: string
  }>
}
```

### Passo 2: `moveDocWithStub` (orquestracao atomica)

```typescript
// 2026-05-18 (Luiz/dev): orquestra rename + stub + rewrite atomico — PRD D12, G4 do README
import { rename, writeFile, access } from 'node:fs/promises'
import path from 'node:path'

export type MoveDocInput = {
  /** Path relativo ao repoRoot. */
  readonly source: string
  /** Path relativo ao repoRoot. */
  readonly target: string
  /** Diretorio raiz do projeto-alvo (cwd do dispatcher). */
  readonly repoRoot: string
  /** Se true, apenas reporta o que faria sem mutar disco. */
  readonly dryRun?: boolean
}

export async function moveDocWithStub(input: MoveDocInput): Promise<MoveResult> {
  const { source, target, repoRoot, dryRun = false } = input
  const errors: MoveResult['errors'] = []
  const externalLinks: MoveResult['externalLinks'] = []
  const sourceAbs = path.join(repoRoot, source)
  const targetAbs = path.join(repoRoot, target)

  // 2026-05-18 (Luiz/dev): pre-flight — source existe E target NAO existe — G4 do README
  try {
    await access(sourceAbs)
  } catch {
    return {
      moved: false, stubWritten: false, linksRewritten: 0, externalLinks: [],
      errors: [{ stage: 'rename', message: `source not found: ${source}` }],
    }
  }
  try {
    await access(targetAbs)
    return {
      moved: false, stubWritten: false, linksRewritten: 0, externalLinks: [],
      errors: [{ stage: 'rename', message: `target already exists: ${target}` }],
    }
  } catch {
    // OK — target nao existe
  }

  if (dryRun) {
    return {
      moved: false, stubWritten: false, linksRewritten: 0, externalLinks: [],
      errors: [],
    }
  }

  // (a) rename
  let moved = false
  try {
    await rename(sourceAbs, targetAbs)
    moved = true
  } catch (err) {
    return {
      moved: false, stubWritten: false, linksRewritten: 0, externalLinks: [],
      errors: [{ stage: 'rename', message: (err as Error).message }],
    }
  }

  // (b) stub
  let stubWritten = false
  try {
    const stubBody = buildStub(source, target)
    await writeFile(sourceAbs, stubBody, 'utf8')
    stubWritten = true
  } catch (err) {
    errors.push({ stage: 'stub', message: (err as Error).message })
  }

  // (c) rewrite
  let linksRewritten = 0
  try {
    const rewriteResult = await rewriteInternalLinks({
      repoRoot, oldPath: source, newPath: target,
    })
    linksRewritten = rewriteResult.filesModified
    externalLinks.push(...rewriteResult.externalLinks)
  } catch (err) {
    errors.push({ stage: 'rewrite', message: (err as Error).message })
  }

  return { moved, stubWritten, linksRewritten, externalLinks, errors }
}

function buildStub(source: string, target: string): string {
  // 2026-05-18 (Luiz/dev): path relativo do source -> target — D12, R-04 forward slashes
  const sourceDir = path.dirname(source)
  const relTarget = path.posix.relative(
    sourceDir.replace(/\\/g, '/'),
    target.replace(/\\/g, '/'),
  )
  return `# Moved\n\nThis document moved to [${target}](${relTarget}).\n`
}
```

### Passo 3: `rewriteInternalLinks` — glob + regex

```typescript
// 2026-05-18 (Luiz/dev): reescreve links Markdown apontando para oldPath -> newPath em todos os .md do repo — PRD D12
import { Glob } from 'bun'
import { readFile, writeFile } from 'node:fs/promises'

export type RewriteInput = {
  readonly repoRoot: string
  readonly oldPath: string
  readonly newPath: string
}

export type RewriteResult = {
  readonly filesModified: number
  readonly externalLinks: MoveResult['externalLinks']
}

const EXTERNAL_URL_RE = /\]\((https?:\/\/[^)]+)\)/g

export async function rewriteInternalLinks(input: RewriteInput): Promise<RewriteResult> {
  const { repoRoot, oldPath, newPath } = input
  const glob = new Glob('**/*.md')
  let filesModified = 0
  const externalLinks: MoveResult['externalLinks'][number][] = []

  for await (const rel of glob.scan({ cwd: repoRoot })) {
    // 2026-05-18 (Luiz/dev): blacklist — G1 do plano03 + G11 do plano04
    if (/^(node_modules|dist|build|\.git|\.anti-vibe)[\\/]/.test(rel)) continue

    const abs = `${repoRoot}/${rel}`
    let content: string
    try {
      content = await readFile(abs, 'utf8')
    } catch {
      continue
    }

    // 2026-05-18 (Luiz/dev): regex de rewrite — path relativo ao arquivo atual — G4 do README
    // Aceita 2 formas: path-relativo-ao-cwd (ex: 'docs/foo.md') OU path-relativo-ao-arquivo (../docs/foo.md).
    // Estrategia minimalista v1: substituir literal oldPath -> newPath (forward slashes, normalizado).
    const oldNorm = oldPath.replace(/\\/g, '/')
    const newNorm = newPath.replace(/\\/g, '/')
    const escaped = oldNorm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const linkRe = new RegExp(`\\]\\(([^)]*${escaped})\\)`, 'g')
    let modified = false
    const newContent = content.replace(linkRe, (full, full_path: string) => {
      if (/^https?:\/\//.test(full_path)) return full // externo — nunca toca
      modified = true
      return full.replace(full_path, full_path.replace(oldNorm, newNorm))
    })

    if (modified) {
      await writeFile(abs, newContent, 'utf8')
      filesModified++
    }

    // 2026-05-18 (Luiz/dev): listar URLs externas para warn — PRD D12, G4 do README
    let m: RegExpExecArray | null
    EXTERNAL_URL_RE.lastIndex = 0
    let lineNum = 0
    for (const line of content.split('\n')) {
      lineNum++
      EXTERNAL_URL_RE.lastIndex = 0
      while ((m = EXTERNAL_URL_RE.exec(line)) !== null) {
        externalLinks.push({ file: rel, line: lineNum, url: m[1] })
      }
    }
  }

  return { filesModified, externalLinks }
}
```

### Passo 4: Testes pareados (5 casos)

```typescript
// 2026-05-18 (Luiz/dev): TDD — PRD D12, G4 do README
import { describe, it, expect, beforeEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { moveDocWithStub, rewriteInternalLinks } from './doc-mover-stub'

describe('doc-mover-stub', () => {
  let repoRoot: string
  beforeEach(() => {
    repoRoot = mkdtempSync(path.join(tmpdir(), 'doc-mover-'))
    mkdirSync(path.join(repoRoot, 'docs'), { recursive: true })
  })

  it('moves file, writes stub at old path, increments linksRewritten when other .md references the old path', async () => {
    writeFileSync(path.join(repoRoot, 'docs', 'ARQUITETURA.md'), '# Arquitetura\n', 'utf8')
    writeFileSync(
      path.join(repoRoot, 'OUTRO.md'),
      'Veja [docs](docs/ARQUITETURA.md) para detalhes.\n',
      'utf8',
    )

    const result = await moveDocWithStub({
      source: 'docs/ARQUITETURA.md',
      target: 'docs/ARCHITECTURE.md',
      repoRoot,
    })

    expect(result.moved).toBe(true)
    expect(result.stubWritten).toBe(true)
    expect(result.linksRewritten).toBe(1)
    expect(existsSync(path.join(repoRoot, 'docs', 'ARCHITECTURE.md'))).toBe(true)
    // stub no path antigo
    const stub = readFileSync(path.join(repoRoot, 'docs', 'ARQUITETURA.md'), 'utf8')
    expect(stub).toMatch(/^# Moved/)
    expect(stub).toContain('docs/ARCHITECTURE.md')
    // link reescrito em OUTRO.md
    expect(readFileSync(path.join(repoRoot, 'OUTRO.md'), 'utf8'))
      .toContain('docs/ARCHITECTURE.md')
  })

  it('does NOT rewrite external URLs (http/https) but lists them in externalLinks', async () => {
    writeFileSync(path.join(repoRoot, 'docs', 'OLD.md'), 'x', 'utf8')
    writeFileSync(
      path.join(repoRoot, 'NOTES.md'),
      'Refer [issue](https://github.com/foo/bar/issues/1) and [doc](docs/OLD.md).\n',
      'utf8',
    )

    const result = await moveDocWithStub({
      source: 'docs/OLD.md', target: 'docs/NEW.md', repoRoot,
    })

    expect(result.externalLinks.length).toBeGreaterThanOrEqual(1)
    expect(result.externalLinks[0].url).toContain('github.com')
    // URL externa nao virou redirect
    expect(readFileSync(path.join(repoRoot, 'NOTES.md'), 'utf8'))
      .toContain('https://github.com/foo/bar/issues/1')
  })

  it('returns error when target already exists (no overwrite)', async () => {
    writeFileSync(path.join(repoRoot, 'docs', 'SRC.md'), 'x', 'utf8')
    writeFileSync(path.join(repoRoot, 'docs', 'DST.md'), 'y', 'utf8')

    const result = await moveDocWithStub({
      source: 'docs/SRC.md', target: 'docs/DST.md', repoRoot,
    })

    expect(result.moved).toBe(false)
    expect(result.errors[0].stage).toBe('rename')
    expect(result.errors[0].message).toMatch(/already exists/)
    expect(readFileSync(path.join(repoRoot, 'docs', 'DST.md'), 'utf8')).toBe('y')
  })

  it('returns error when source does not exist', async () => {
    const result = await moveDocWithStub({
      source: 'docs/NOPE.md', target: 'docs/NEW.md', repoRoot,
    })
    expect(result.moved).toBe(false)
    expect(result.errors[0].stage).toBe('rename')
    expect(result.errors[0].message).toMatch(/not found/)
  })

  it('dryRun=true: no mutation in disk and moved/stubWritten remain false', async () => {
    writeFileSync(path.join(repoRoot, 'docs', 'SRC.md'), 'x', 'utf8')
    const result = await moveDocWithStub({
      source: 'docs/SRC.md', target: 'docs/NEW.md', repoRoot, dryRun: true,
    })
    expect(result.moved).toBe(false)
    expect(result.stubWritten).toBe(false)
    expect(existsSync(path.join(repoRoot, 'docs', 'SRC.md'))).toBe(true)
    expect(existsSync(path.join(repoRoot, 'docs', 'NEW.md'))).toBe(false)
  })
})
```

---

## Gotchas

- **G4 do plano (atomicidade nao-rollback):** Se (a) `rename` falha, (b) e (c) NAO rodam. Se (a) OK e (b) falha, helper continua para (c) e retorna `errors[]` populado — chamador (Step 11) decide o que fazer. **NAO** implementar rollback automatico nesta camada — Plano 05 fase-04 (rollback completo) eh quem reverte via backup manifest.
- **G11 do plano (Windows path safety):** `Glob` do Bun retorna paths com separator do sistema. Normalizar para forward slashes ANTES do regex de rewrite. Test #1 valida indiretamente via assert do conteudo em `OUTRO.md`.
- **Local (regex permissivo):** O regex `\\]\\(([^)]*${escaped})\\)` aceita prefixos quaisquer antes do `oldPath` — captura tanto `./docs/foo.md` quanto `../foo.md` quanto `docs/foo.md`. Trade-off: pode dar falso positivo se outro arquivo tiver substring identica no path (raro). v1 aceita; documentar como conhecido no MEMORY do plano.
- **Local (URLs externas):** O regex `EXTERNAL_URL_RE` faz scan separado linha-a-linha para popular `externalLinks[]`. Linha exata vem do `lineNum` incrementado no loop — useful para o log do Step 11.
- **Local (glob ignora dotfiles):** Bun `Glob` ignora dotfiles por padrao — `.claude/memory/notes.md` NAO eh varrido. Para v1 isso eh aceitavel (Plano 03 fase-03 ja explicitou `dot: true` para discovery; rewrite de links em dotfiles fica para v6.5+ se necessario).

---

## Verificacao

### TDD

- [ ] **RED:** `bun test skills/init/lib/doc-mover-stub.test.ts` falha (lib inexistente).
- [ ] **GREEN:** Implementar `moveDocWithStub` + `rewriteInternalLinks` + tipo `MoveResult`; 5 testes passam.
- [ ] **REFACTOR:** extrair `buildStub` como funcao nomeada; mover regex para top-level const com nome significativo.

### Checklist

- [ ] `skills/init/lib/doc-mover-stub.ts` exporta exatamente 3 simbolos publicos: `moveDocWithStub`, `rewriteInternalLinks`, `MoveResult`.
- [ ] `bun test skills/init/lib/doc-mover-stub.test.ts` retorna `5/5 passed`.
- [ ] `bun run lint` clean.
- [ ] Stub gerado contem cabecalho exato `# Moved` e link Markdown para o destino com path relativo correto.
- [ ] URL externa em arquivo `.md` nao eh modificada (assert no teste #2).

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/doc-mover-stub.test.ts` retorna `5/5 passed`.
- `grep -E "^export (function|type|const) (moveDocWithStub|rewriteInternalLinks|MoveResult)" skills/init/lib/doc-mover-stub.ts` retorna pelo menos 3 matches.

**Por humano:**
- Inspecao manual do conteudo gerado por `buildStub`: link tem path relativo correto (ex: para `docs/SRC.md` -> `docs/DST.md`, stub em `docs/SRC.md` linka `DST.md` e nao `docs/DST.md` redundante).

---

**Referencia cruzada:**
- PRD: D12 (stub + rewrite), MH-05 (move-docs-with-stub)
- README do plano: G4, G11
- Consumidor: fase-05 (Step 11 chama `moveDocWithStub` para cada `DocMapping` do Plano 03)
- Plano 05 fase-04 (rollback): le `MoveResult.errors[]` para decidir reverte parcial

<!-- Gerado por /plan-feature em 2026-05-18 -->
