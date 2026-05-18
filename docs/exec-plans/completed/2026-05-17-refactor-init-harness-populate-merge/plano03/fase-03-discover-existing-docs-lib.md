<!--
Princípio universal #5 — Comment Provenance. Aplicar em comentarios de codigo
de runtime usuario-facing. Helpers TS internos seguem JSDoc; sem repeticao.
-->

# Fase 03: Discover Existing Docs Lib (`lib/discover-existing-docs.ts`)

**Plano:** 03 — Discovery Pipeline (secrets + docs + classifier)
**Sizing:** 0.5h
**Depende de:** Nenhuma (independente — pode rodar em paralelo com fase-01)
**Visual:** false

---

## O que esta fase entrega

Funcao `discoverExistingDocs(cwd: string): Promise<readonly DiscoveredDoc[]>` que faz glob whitelisted de arquivos `.md`/`.mdx` em 3 escopos (raiz nao-recursivo, `cwd/docs/` recursivo, `cwd/.claude/` recursivo) com blacklist de `node_modules|dist|build|.git|.anti-vibe/backup`, exclusao explicita do `README.md` da raiz (D6), e saida ordenada determinisicamente por `relativePath` posix. Base read-only do Step 07 (SH-02, D5, D6, RF-03).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/discover-existing-docs.ts` | Create | Funcao `discoverExistingDocs` + tipo `DiscoveredDoc`. Walker recursivo manual, sort lexicografico, README guard explicito. |
| `skills/init/lib/discover-existing-docs.test.ts` | Create | Testes: (1) discovery vazio, (2) fixture com 5 arquivos retorna 4 (sem README, sem node_modules) sorted, (3) `.mdx` aceito, (4) `/docs/README.md` (interno ao harness) NAO eh excluido, (5) `.claude/memory/notes.md` incluido. |

---

## Implementacao

### Passo 1: Definir tipos publicos

```typescript
// skills/init/lib/discover-existing-docs.ts

export type DiscoveredDoc = {
  /** Path absoluto no FS local. */
  readonly absolutePath: string
  /** Path relativo a `cwd`, sempre normalizado para forward-slash. */
  readonly relativePath: string
  /** Bytes do arquivo (stat.size). */
  readonly bytes: number
  /** Extensao detectada — apenas '.md' ou '.mdx'. */
  readonly extension: '.md' | '.mdx'
}
```

### Passo 2: Constantes de escopo

```typescript
import { promises as fs } from 'node:fs'
import path from 'node:path'

const BLACKLIST_TOKENS: ReadonlyArray<string> = [
  'node_modules',
  'dist',
  'build',
  '.git',
  '.anti-vibe/backup',
] // D5 do PRD + alinhamento com Step 06 fase-02

const WHITELIST_EXTENSIONS: ReadonlySet<'.md' | '.mdx'> = new Set(['.md', '.mdx'])
```

### Passo 3: Walker recursivo + filtros

```typescript
async function walkRoot(
  cwd: string,
  root: string,
  recursive: boolean,
  acc: DiscoveredDoc[],
): Promise<void> {
  let entries
  try {
    entries = await fs.readdir(root, { withFileTypes: true })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return
    throw err
  }

  for (const entry of entries) {
    const full = path.join(root, entry.name)
    const relPosix = toPosix(path.relative(cwd, full))
    if (containsBlacklisted(relPosix)) continue

    if (entry.isDirectory()) {
      if (recursive) await walkRoot(cwd, full, true, acc)
      continue
    }

    if (!entry.isFile()) continue
    const ext = path.extname(entry.name)
    if (ext !== '.md' && ext !== '.mdx') continue
    if (!WHITELIST_EXTENSIONS.has(ext)) continue

    // D6 do PRD — README.md da raiz do projeto eh intocavel.
    // O README de /docs/ (parte do harness canonico) NAO eh filtrado aqui.
    if (relPosix === 'README.md') continue

    const stat = await fs.stat(full)
    acc.push({
      absolutePath: full,
      relativePath: relPosix,
      bytes: stat.size,
      extension: ext,
    })
  }
}

function toPosix(p: string): string {
  return p.split(path.sep).join('/')
}

function containsBlacklisted(relPosix: string): boolean {
  return BLACKLIST_TOKENS.some((t) => relPosix.includes(t))
}
```

### Passo 4: Funcao publica

```typescript
export async function discoverExistingDocs(
  cwd: string,
): Promise<readonly DiscoveredDoc[]> {
  const out: DiscoveredDoc[] = []

  // Root nivel 0 (apenas raiz, nao-recursivo).
  await walkRootShallow(cwd, out)

  // docs/ recursivo
  await walkRoot(cwd, path.join(cwd, 'docs'), true, out)

  // .claude/ recursivo
  await walkRoot(cwd, path.join(cwd, '.claude'), true, out)

  // Determinismo: ordenar por relativePath lexicograficamente
  out.sort((a, b) => (a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0))
  return out
}

async function walkRootShallow(cwd: string, acc: DiscoveredDoc[]): Promise<void> {
  let entries
  try {
    entries = await fs.readdir(cwd, { withFileTypes: true })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return
    throw err
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name)
    if (ext !== '.md' && ext !== '.mdx') continue
    if (entry.name === 'README.md') continue
    const full = path.join(cwd, entry.name)
    const relPosix = toPosix(path.relative(cwd, full))
    if (containsBlacklisted(relPosix)) continue
    const stat = await fs.stat(full)
    acc.push({
      absolutePath: full,
      relativePath: relPosix,
      bytes: stat.size,
      extension: ext as '.md' | '.mdx',
    })
  }
}
```

> **Por que `walkRootShallow` separado:** o root do projeto eh nao-recursivo (so .md/.mdx no nivel 0); subdirs entrariam pelas regras de `docs/` e `.claude/` recursivos. Codigo duplicado eh deliberado — abstracao prematura aqui complica o leitor para ganhar 8 linhas.

### Passo 5: Testes pareados

```typescript
// skills/init/lib/discover-existing-docs.test.ts
import { expect, test, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { discoverExistingDocs } from './discover-existing-docs'

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'discover-docs-'))
}

async function touch(file: string, content: string = ''): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, content)
}

describe('discoverExistingDocs', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('cwd inexistente / vazio retorna array vazio', async () => {
    const docs = await discoverExistingDocs(tmp)
    expect(docs).toEqual([])
  })

  test('fixture com 5 arquivos retorna 4 (exclui README e node_modules)', async () => {
    await touch(path.join(tmp, 'README.md'), '# repo readme')
    await touch(path.join(tmp, 'CHANGELOG.md'), '# changelog')
    await touch(path.join(tmp, 'docs', 'ARCHITECTURE.md'), '# arch')
    await touch(path.join(tmp, 'docs', 'SECURITY.md'), '# sec')
    await touch(path.join(tmp, '.claude', 'memory', 'notes.md'), '# notes')
    await touch(path.join(tmp, 'node_modules', 'fake', 'README.md'), '# leak')

    const docs = await discoverExistingDocs(tmp)
    const rels = docs.map((d) => d.relativePath)
    expect(rels).toEqual([
      '.claude/memory/notes.md',
      'CHANGELOG.md',
      'docs/ARCHITECTURE.md',
      'docs/SECURITY.md',
    ])
  })

  test('arquivos .mdx sao incluidos', async () => {
    await touch(path.join(tmp, 'docs', 'guide.mdx'), '# mdx')
    const docs = await discoverExistingDocs(tmp)
    expect(docs).toHaveLength(1)
    expect(docs[0]?.extension).toBe('.mdx')
  })

  test('README dentro de /docs/ NAO eh excluido (apenas o da raiz)', async () => {
    await touch(path.join(tmp, 'README.md'), '# raiz')
    await touch(path.join(tmp, 'docs', 'README.md'), '# docs/README')
    const docs = await discoverExistingDocs(tmp)
    const rels = docs.map((d) => d.relativePath)
    expect(rels).toEqual(['docs/README.md'])
  })

  test('blacklist inclui dist, build, .git, .anti-vibe/backup', async () => {
    await touch(path.join(tmp, 'dist', 'a.md'))
    await touch(path.join(tmp, 'build', 'b.md'))
    await touch(path.join(tmp, '.git', 'COMMIT_EDITMSG.md'))
    await touch(path.join(tmp, '.anti-vibe', 'backup', '2026', 'x.md'))
    await touch(path.join(tmp, 'docs', 'real.md'))
    const docs = await discoverExistingDocs(tmp)
    expect(docs.map((d) => d.relativePath)).toEqual(['docs/real.md'])
  })

  test('ordenacao lexicografica determinista por relativePath', async () => {
    await touch(path.join(tmp, 'docs', 'z.md'))
    await touch(path.join(tmp, 'docs', 'a.md'))
    await touch(path.join(tmp, '.claude', 'b.md'))
    const docs = await discoverExistingDocs(tmp)
    expect(docs.map((d) => d.relativePath)).toEqual([
      '.claude/b.md',
      'docs/a.md',
      'docs/z.md',
    ])
  })

  test('bytes refletem stat.size', async () => {
    const content = 'a'.repeat(123)
    await touch(path.join(tmp, 'docs', 'sized.md'), content)
    const docs = await discoverExistingDocs(tmp)
    expect(docs[0]?.bytes).toBe(123)
  })
})
```

---

## Gotchas

- **G1 do plano (whitelist/blacklist):** Walker compara `relativePath` posix-normalizado contra tokens de substring. Por isso `'.anti-vibe/backup'` casa qualquer profundidade (`.anti-vibe/backup/2026/x.md` includes essa substring). Teste #5 cobre os 4 tokens da blacklist do PRD.
- **G2 do plano (README intocavel):** Apenas o README.md da **raiz do projeto-alvo** eh filtrado. `docs/README.md` (parte do harness canonico, indexado pelo `TEMPLATE_MANIFEST`) DEVE entrar na descoberta — eh um arquivo que o init futuramente pode atualizar. Teste #4 prova essa distincao crucial.
- **G8 do plano (`--dry-run`):** Esta fase eh pura funcao — nao escreve disco. Dry-run nao precisa de tratamento. Step 07 (fase-04) eh quem persiste em JSON via discovery-store.
- **Local (path normalization Windows):** `toPosix(path.relative(...))` faz `split(path.sep).join('/')`. Em Windows, garante que `relativePath` retornado e ordem lexicografica sao consistentes cross-platform. Test #6 (lex sort) seria nao-determinista sem essa normalizacao.
- **Local (extname vs nome literal):** `path.extname('foo.mdx')` retorna `.mdx`. `path.extname('NOEXT')` retorna `''`. Sem dependencia de regex; comportamento previsivel.
- **Local (descoberta de symlinks):** `readdir({ withFileTypes: true })` retorna `Dirent` cujo `isDirectory()`/`isFile()` segue o tipo do entry, NAO o alvo do symlink. Aceitavel para v6.4.0 — projetos com symlinks de docs sao raros. Se surgir issue, abrir `--follow-symlinks` em v6.5+.

---

## Verificacao

### TDD

- [ ] **RED:** todos os 7 testes do passo 5 escritos antes da implementacao. Comando: `bun test skills/init/lib/discover-existing-docs.test.ts` — resultado esperado: erros de modulo nao encontrado.
- [ ] **GREEN:** implementacao dos passos 1-4. Comando: `bun test skills/init/lib/discover-existing-docs.test.ts` — todos pass.
- [ ] **REFACTOR:** considerar fundir `walkRoot` e `walkRootShallow` apenas se reduzir codigo SEM piorar legibilidade. Re-rodar testes.

### Checklist

- [ ] `skills/init/lib/discover-existing-docs.ts` exporta exatamente 2 simbolos publicos: `discoverExistingDocs`, `DiscoveredDoc`.
- [ ] Sem `any`, sem `as` exceto narrowing minimo de `entry.name` -> ext.
- [ ] Ordem da saida eh determinista (sort lexicografico por `relativePath`).
- [ ] README.md da raiz NUNCA aparece; `docs/README.md` SEMPRE pode aparecer.
- [ ] Os 5 tokens da blacklist (`node_modules`, `dist`, `build`, `.git`, `.anti-vibe/backup`) filtram corretamente.
- [ ] `.md` e `.mdx` aceitos; outras extensoes ignoradas.
- [ ] Roots inexistentes (sem `/docs/`, sem `/.claude/`) NAO lancam erro — retornam contribuicao vazia.
- [ ] `bun test skills/init/lib/discover-existing-docs.test.ts` retorna 0 falhas.
- [ ] `bun run lint` clean.

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/discover-existing-docs.test.ts` exit 0.
- `bun run lint skills/init/lib/discover-existing-docs.ts` exit 0.
- `grep -c 'node_modules' skills/init/lib/discover-existing-docs.ts` retorna `1` (apenas na blacklist canonica).
- `grep -c "if (relPosix === 'README.md')" skills/init/lib/discover-existing-docs.ts` retorna `1` (guard explicito).

**Por humano:**
- Reviewer le `discover-existing-docs.ts` em ~2 minutos e consegue explicar: (1) por que so README da raiz eh filtrado, (2) por que sort lexicografico, (3) qual o impacto de symlinks (gotcha local).

---

## Decisoes Aplicadas

- **D5 do PRD** (raiz + `/docs/` + `.claude/` + whitelist + blacklist): os 3 roots + 2 extensoes whitelisted + 5 tokens blacklist cobertos.
- **D6 do PRD** (README intocavel — RAIZ apenas): guard explicito `if (relPosix === 'README.md') continue` no `walkRootShallow`. Teste #4 prova distincao com `docs/README.md`.
- **SH-02 do PRD** (discover-existing-docs como step): esta fase entrega a lib pura; Step 07 (fase-04) integra no registry.
- **RF-03 do PRD** (varredura recursiva whitelisted): `docs/` e `.claude/` recursivos; raiz apenas nivel 0.
- **R-04 do PRD** (compat Windows): `path.join` + `path.relative` + `toPosix` em todas as comparacoes.
- **CLAUDE.md global** (nunca `any`, nunca fetch em useEffect): N/A useEffect; sem `any` confirmado.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
