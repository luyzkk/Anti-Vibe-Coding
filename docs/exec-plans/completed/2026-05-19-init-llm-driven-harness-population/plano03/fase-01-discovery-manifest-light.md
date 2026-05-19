# Fase 01: Discovery Manifest Light

**Plano:** 03 — Gerador LLM-driven do PLAN populate
**Sizing:** 1.5h
**Depende de:** Nenhuma (primeira fase do plano, paralelizavel com fase-02)
**Visual:** false

---

## O que esta fase entrega

Helper `discoveryManifestLight()` que lista todos os `*.md` do projeto com path + size +
primeiras 100 linhas, sem classificacao, sem regex Akita — pronto para alimentar a LLM no
momento do `/execute-plan` decidir quais docs viram input de cada doc canonico.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/discovery-manifest-light.ts` | Create | Helper puro: glob `**/*.md` + leitura por arquivo + slice 100 linhas |
| `skills/init/lib/discovery-manifest-light.test.ts` | Create | Testes unitarios: greenfield (vazio), 5 docs, exclusao de `node_modules`/`dist`/`_legacy`, performance |
| `tests/fixtures/discovery-manifest-light/empty/` | Create | Fixture greenfield (pasta vazia, so `.gitkeep`) |
| `tests/fixtures/discovery-manifest-light/with-docs/` | Create | Fixture com 5 arquivos `.md` em paths variados (raiz, `docs/`, `.claude/`) |

---

## Implementacao

### Passo 1: Definir tipos publicos

Tipos minimos e estaveis — serao consumidos por fase-03 (renderer) e potencialmente Plano 04.

```typescript
// skills/init/lib/discovery-manifest-light.ts

import { promises as fs } from 'node:fs'
import path from 'node:path'

/**
 * Entrada minima do manifest leve. Sem classificacao — apenas amostra do conteudo
 * para a LLM no momento do /execute-plan decidir associacao com docs canonicos.
 *
 * `first100Lines` e uma string com no maximo 100 linhas separadas por `\n`.
 * Trunca o conteudo do arquivo apos a 100a quebra de linha (mid-line se necessario).
 */
export type DiscoveryManifestEntry = {
  /** Path relativo ao cwd, sempre forward-slash (posix), nunca backslash. */
  readonly path: string
  /** Tamanho em bytes (UTF-8). */
  readonly size: number
  /** Primeiras 100 linhas do arquivo, ou conteudo inteiro se menor. */
  readonly first100Lines: string
}

export type DiscoveryManifestLightResult = {
  readonly cwd: string
  readonly scannedAt: string
  readonly entries: ReadonlyArray<DiscoveryManifestEntry>
}
```

### Passo 2: Glob recursivo com exclusoes fixas

Exclusoes alinhadas com `discovery.ts` existente (`EXCLUDED_DIRS`) mais `_legacy` (introduzido
pelo Plano 02 fase-03 — backup pre-mutacao).

```typescript
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '.turbo',
  'out',
  '_legacy', // 2026-05-19 (Luiz/dev): backup pre-mutacao do Step 10 (Plano 02 fase-03)
])

async function walkMarkdownFiles(cwd: string): Promise<string[]> {
  const found: string[] = []
  async function walk(dir: string): Promise<void> {
    let entries: import('node:fs').Dirent[]
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return // permission denied / inexistente — ignora silenciosamente
    }
    for (const entry of entries) {
      if (EXCLUDED_DIRS.has(entry.name)) continue
      const abs = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(abs)
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        found.push(abs)
      }
    }
  }
  await walk(cwd)
  return found
}
```

### Passo 3: Truncar conteudo a 100 linhas

Trunca apos a 100a quebra de linha. Se arquivo tem < 100 linhas, retorna inteiro.
Sem regex Akita, sem extracao de heading — apenas raw content amostrado.

```typescript
function takeFirst100Lines(content: string): string {
  // Conta quebras de linha; corta apos a 100a (inclusive).
  let count = 0
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\n') {
      count++
      if (count === 100) return content.slice(0, i + 1)
    }
  }
  // < 100 linhas: retorna conteudo completo
  return content
}
```

### Passo 4: Funcao publica `discoveryManifestLight`

```typescript
/**
 * Lista todos os `*.md` em `cwd` (recursivo) com amostra das 100 primeiras linhas.
 * NAO classifica nada. NAO aplica regex Akita. Apenas materia bruta para a LLM consumir.
 *
 * Performance: greenfield (0 docs) < 50ms; 100 docs < 500ms. Sem cache.
 */
export async function discoveryManifestLight(cwd: string): Promise<DiscoveryManifestLightResult> {
  const absPaths = await walkMarkdownFiles(cwd)
  const entries: DiscoveryManifestEntry[] = []
  for (const abs of absPaths) {
    let content: string
    try {
      content = await fs.readFile(abs, 'utf-8')
    } catch {
      continue // arquivo desaparece entre readdir e readFile — ignora
    }
    const rel = path.relative(cwd, abs).replace(/\\/g, '/')
    entries.push({
      path: rel,
      size: Buffer.byteLength(content, 'utf-8'),
      first100Lines: takeFirst100Lines(content),
    })
  }
  // Ordenacao deterministica (importante para testes e diff de PR review)
  entries.sort((a, b) => a.path.localeCompare(b.path))
  return {
    cwd,
    scannedAt: new Date().toISOString(),
    entries,
  }
}
```

### Passo 5: Testes unitarios

Cobrem greenfield, projeto com docs reais, exclusoes, truncamento.

```typescript
// skills/init/lib/discovery-manifest-light.test.ts
import { describe, it, expect } from 'bun:test'
import path from 'node:path'
import { discoveryManifestLight } from './discovery-manifest-light'

const FIXTURES = path.join(import.meta.dir, '..', '..', '..', 'tests', 'fixtures', 'discovery-manifest-light')

describe('discoveryManifestLight', () => {
  it('returns empty entries on greenfield project', async () => {
    const result = await discoveryManifestLight(path.join(FIXTURES, 'empty'))
    expect(result.entries).toHaveLength(0)
  })

  it('lists all markdown files with path + size + first100Lines', async () => {
    const result = await discoveryManifestLight(path.join(FIXTURES, 'with-docs'))
    expect(result.entries.length).toBeGreaterThanOrEqual(5)
    for (const entry of result.entries) {
      expect(entry.path.endsWith('.md')).toBe(true)
      expect(entry.size).toBeGreaterThan(0)
      expect(entry.first100Lines.length).toBeGreaterThan(0)
    }
  })

  it('truncates first100Lines at line 100 for large docs', async () => {
    const result = await discoveryManifestLight(path.join(FIXTURES, 'with-docs'))
    const large = result.entries.find(e => e.path.includes('large'))
    if (!large) return // fixture opcional
    const lineCount = large.first100Lines.split('\n').length
    expect(lineCount).toBeLessThanOrEqual(101) // 100 lines + possible trailing empty
  })

  it('excludes node_modules, dist, _legacy', async () => {
    const result = await discoveryManifestLight(path.join(FIXTURES, 'with-docs'))
    const excluded = result.entries.filter(e =>
      e.path.startsWith('node_modules/') ||
      e.path.startsWith('dist/') ||
      e.path.startsWith('_legacy/'),
    )
    expect(excluded).toHaveLength(0)
  })

  it('returns posix paths even on Windows', async () => {
    const result = await discoveryManifestLight(path.join(FIXTURES, 'with-docs'))
    for (const entry of result.entries) {
      expect(entry.path).not.toContain('\\')
    }
  })
})
```

### Passo 6: Criar fixtures

```bash
# Greenfield (so .gitkeep para garantir versionamento da pasta)
mkdir -p tests/fixtures/discovery-manifest-light/empty
touch tests/fixtures/discovery-manifest-light/empty/.gitkeep

# Com docs reais
mkdir -p tests/fixtures/discovery-manifest-light/with-docs/docs
mkdir -p tests/fixtures/discovery-manifest-light/with-docs/.claude
mkdir -p tests/fixtures/discovery-manifest-light/with-docs/_legacy
mkdir -p tests/fixtures/discovery-manifest-light/with-docs/node_modules/foo

# Arquivos `.md` reais (criar via Write tool com conteudo plausivel curto)
# - with-docs/README.md
# - with-docs/CLAUDE.md
# - with-docs/docs/ARCHITECTURE.md
# - with-docs/.claude/progress.md
# - with-docs/docs/notes/random.md
# - with-docs/_legacy/old.md  (DEVE ser excluido)
# - with-docs/node_modules/foo/lib.md  (DEVE ser excluido)
# - with-docs/docs/large.md (> 100 linhas, testa truncamento)
```

---

## Gotchas

- **G8 do plano (performance):** Greenfield deve completar < 50ms; 100 docs < 500ms. Se passar
  desses limites, profilar antes de adicionar memoizacao. Implementacao acima e sequencial
  por arquivo — `Promise.all` sobre `absPaths` pode acelerar mas custa ordem deterministica.
  Manter sequencial em v1; otimizar so se medicao mostrar problema.
- **Local — Windows path separator:** `path.relative` no Windows retorna `docs\foo.md`.
  Sempre aplicar `.replace(/\\/g, '/')` antes de emitir no manifest. Teste explicito cobre
  ("returns posix paths even on Windows").
- **Local — symlinks:** `fs.readdir({ withFileTypes: true })` segue symlinks para arquivo
  mas nao recursivamente para diretorios (comportamento padrao). Suficiente em v1; nao
  precisa de `followSymlinks` flag.
- **Local — secret files:** ao contrario de `discovery.ts` existente, esta fase NAO filtra
  `.env`, `.pem`, etc — porque so escaneia `*.md`. Sem risco de leitura de segredo via `.md`.

---

## Verificacao

### TDD

- [ ] **RED:** Teste escrito e FALHA por assertion (modulo `discoveryManifestLight` ainda nao existe)
  - Comando: `bun test skills/init/lib/discovery-manifest-light.test.ts`
  - Resultado esperado: `Cannot find module './discovery-manifest-light'` ou `expect(result.entries).toHaveLength(0)` falha

- [ ] **GREEN:** Implementacao minima do glob + slice + ordering, testes PASSAM
  - Comando: `bun test skills/init/lib/discovery-manifest-light.test.ts`
  - Resultado esperado: `5 passed, 0 failed`

- [ ] **REFACTOR:** extrair `takeFirst100Lines` para funcao isolada, manter testes verdes
  - Comando: `bun test skills/init/lib/discovery-manifest-light.test.ts`

### Checklist

- [ ] Fixture `empty/` existe com `.gitkeep`
- [ ] Fixture `with-docs/` tem pelo menos 5 arquivos `.md` reais incluindo um `> 100` linhas
- [ ] Fixture inclui pelo menos 1 arquivo em `_legacy/` e 1 em `node_modules/` para testar exclusao
- [ ] Output de `entries` ordenado alfabeticamente por `path` (verificavel: snapshot estavel)
- [ ] Sem `any` no codigo (CLAUDE.md global rule)
- [ ] Sem `as` cast (preferir type guards / generic types)
- [ ] Testes passam: `bun test skills/init/lib/discovery-manifest-light.test.ts`
- [ ] Lint limpo: `bun run lint`
- [ ] Typecheck: `bun run typecheck` (se configurado)

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/discovery-manifest-light.test.ts` retorna `5 passed, 0 failed`
- `bun run lint skills/init/lib/discovery-manifest-light.ts` retorna 0 erros
- `discoveryManifestLight(emptyFixture).entries.length === 0`
- `discoveryManifestLight(withDocsFixture).entries.length >= 5`
- Nenhum entry com `path` contendo `\` (backslash)
- Nenhum entry com `path` comecando por `node_modules/`, `dist/`, `_legacy/`

**Por humano:**
- Codigo legivel sem comentarios desnecessarios (so JSDoc nos exports + 1-2 inline com data
  para decisoes nao-obvias como exclusao de `_legacy/`)

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
