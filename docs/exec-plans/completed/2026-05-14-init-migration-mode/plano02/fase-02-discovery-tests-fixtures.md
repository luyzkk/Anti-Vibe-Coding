# Fase 02: Testes de discovery.ts + Fixtures de Repo-Mock

**Plano:** 02 — Discovery TS: Fase 0 + Audit Log
**Sizing:** 1.5h
**Depende de:** fase-01 (discovery.ts existindo com runDiscovery exportado)
**Visual:** false

---

## O que esta fase entrega

Cobertura TDD completa de `discovery.ts` com testes que usam diretórios temporários reais
(sem mocks de filesystem — padrão do codebase em `detect-v5-legacy.test.ts`). Dois fixtures
de repo-mock em `skills/init/__fixtures__/` para:
1. **greenfield** — diretório vazio (zero arquivos .md)
2. **scattered-adrs** — repo com ADRs e docs soltos que triggeriam migration mode

Estes fixtures serão reaproveitados pelo Plano 05 para testes de idempotência.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/discovery.test.ts` | Editar | Expandir stub da fase-01 com suite completa |
| `skills/init/__fixtures__/greenfield/` | Criar | Fixture de repo vazio (README.md genérico apenas) |
| `skills/init/__fixtures__/scattered-adrs/` | Criar | Fixture com docs espalhados que ativam migration mode |

---

## Implementacao

### Passo 1: Revisar padrão de teste existente

Antes de escrever os testes, ler `detect-v5-legacy.test.ts` para entender o padrão
de `fs.mkdtemp` + estrutura real em disco. Não usar `mock.module` — testes de discovery
devem operar em filesystem real (sem mocks) para validar o walk genuinamente.

Padrão observado em `detect-v5-legacy.test.ts`:
```typescript
import { tmpdir } from 'node:os'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'

// beforeEach: criar tmpdir único
// afterEach: rm -rf o tmpdir
// each test: popula estrutura, chama função, verifica resultado
```

### Passo 2: Escrever suite completa de discovery.test.ts

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { tmpdir } from 'node:os'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { runDiscovery } from './discovery'

let tmp: string

beforeEach(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), 'discovery-test-'))
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

describe('runDiscovery', () => {
  it('module exists and exports runDiscovery', () => {
    expect(typeof runDiscovery).toBe('function')
  })

  it('returns empty entries for a directory with no md files', async () => {
    const result = await runDiscovery(tmp)
    expect(result.entries).toHaveLength(0)
    expect(result.excluded_paths).toHaveLength(0)
  })

  it('collects md files from docs/ recursively', async () => {
    await mkdir(path.join(tmp, 'docs', 'design-docs'), { recursive: true })
    await writeFile(path.join(tmp, 'docs', 'DESIGN.md'), '# Design\n\n## Overview\nContent')
    await writeFile(path.join(tmp, 'docs', 'design-docs', 'ADR-001.md'), '# ADR-001\n\nDecision')

    const result = await runDiscovery(tmp)
    const paths = result.entries.map((e) => e.path)
    expect(paths).toContain('docs/DESIGN.md')
    expect(paths).toContain('docs/design-docs/ADR-001.md')
  })

  it('collects md files from root non-recursively', async () => {
    await writeFile(path.join(tmp, 'README.md'), '# Project\n\nDescription')
    await mkdir(path.join(tmp, 'subdir'), { recursive: true })
    await writeFile(path.join(tmp, 'subdir', 'nested.md'), '# Nested')

    const result = await runDiscovery(tmp)
    const paths = result.entries.map((e) => e.path)
    expect(paths).toContain('README.md')
    // subdir/nested.md fora do escopo (root-md não é recursivo)
    expect(paths).not.toContain('subdir/nested.md')
  })

  it('collects md files from .claude/ recursively', async () => {
    await mkdir(path.join(tmp, '.claude'), { recursive: true })
    await writeFile(path.join(tmp, '.claude', 'CLAUDE.md'), '# Claude\n\nInstructions')

    const result = await runDiscovery(tmp)
    const paths = result.entries.map((e) => e.path)
    expect(paths).toContain('.claude/CLAUDE.md')
  })

  it('excludes .env files and adds them to excluded_paths', async () => {
    await writeFile(path.join(tmp, '.env'), 'SECRET=abc')
    await writeFile(path.join(tmp, '.env.local'), 'DB_PASS=xyz')
    await writeFile(path.join(tmp, 'README.md'), '# Project')

    const result = await runDiscovery(tmp)
    const paths = result.entries.map((e) => e.path)
    expect(paths).not.toContain('.env')
    expect(paths).not.toContain('.env.local')
    expect(paths).toContain('README.md')
  })

  it('excludes *.pem and *.key files', async () => {
    // .pem e .key não são .md mas testamos que o filtro de secrets não afeta o walk .md
    // O ponto crítico: se um .md se chamar "cert.key.md" deve passar (não é secret)
    await writeFile(path.join(tmp, 'README.md'), '# Project')
    await writeFile(path.join(tmp, 'server.pem'), 'CERT')
    await writeFile(path.join(tmp, 'id_rsa.key'), 'KEY')

    const result = await runDiscovery(tmp)
    const paths = result.entries.map((e) => e.path)
    expect(paths).toContain('README.md')
    // .pem e .key não são .md — não aparecem no walk, não em excluded_paths
    expect(result.excluded_paths).toHaveLength(0)
  })

  it('skips node_modules and .git directories', async () => {
    await mkdir(path.join(tmp, 'node_modules', 'some-pkg'), { recursive: true })
    await writeFile(path.join(tmp, 'node_modules', 'some-pkg', 'README.md'), '# pkg')
    await mkdir(path.join(tmp, '.git'), { recursive: true })
    await writeFile(path.join(tmp, '.git', 'COMMIT_EDITMSG'), 'commit msg')
    await writeFile(path.join(tmp, 'README.md'), '# Project')

    const result = await runDiscovery(tmp)
    const paths = result.entries.map((e) => e.path)
    expect(paths).not.toContain('node_modules/some-pkg/README.md')
    expect(paths).toContain('README.md')
  })

  it('extracts H1 and H2 headings (ATX only)', async () => {
    const content = [
      '# Main Title',
      '',
      '## Section One',
      '',
      'Content',
      '',
      '### SubSection',   // H3 — não deve aparecer
      '',
      '## Section Two',
      '',
      'Title via setext',  // não é ATX — não deve aparecer
      '=================',
    ].join('\n')
    await writeFile(path.join(tmp, 'README.md'), content)

    const result = await runDiscovery(tmp)
    const entry = result.entries.find((e) => e.path === 'README.md')!
    expect(entry.h1_h2_headings).toEqual(['Main Title', 'Section One', 'Section Two'])
  })

  it('captures first_500_chars as string slice', async () => {
    const long = 'a'.repeat(1000)
    await writeFile(path.join(tmp, 'README.md'), long)

    const result = await runDiscovery(tmp)
    const entry = result.entries.find((e) => e.path === 'README.md')!
    expect(entry.first_500_chars).toHaveLength(500)
  })

  it('deduplicates entries when same file appears in multiple scopes', async () => {
    // README.md na raiz: coletado pelo scope root-md
    // Se docs/ estiver na raiz e também for coletado, não duplicar
    await writeFile(path.join(tmp, 'README.md'), '# Project')

    const result = await runDiscovery(tmp)
    const readme = result.entries.filter((e) => e.path === 'README.md')
    expect(readme).toHaveLength(1)
  })

  it('writes inventory.json to discovery/ directory', async () => {
    await writeFile(path.join(tmp, 'README.md'), '# Project')

    await runDiscovery(tmp)

    const { readFile } = await import('node:fs/promises')
    const raw = await readFile(path.join(tmp, 'discovery', 'inventory.json'), 'utf-8')
    const parsed = JSON.parse(raw)
    expect(parsed.run_id).toBeDefined()
    expect(parsed.entries).toBeInstanceOf(Array)
  })

  it('inventory has run_id, scanned_at, target_dir, duration_ms', async () => {
    const result = await runDiscovery(tmp)
    expect(typeof result.run_id).toBe('string')
    expect(result.run_id).toMatch(/^[0-9a-f-]{36}$/)  // UUID
    expect(typeof result.scanned_at).toBe('string')
    expect(result.target_dir).toBe(tmp)
    expect(typeof result.duration_ms).toBe('number')
  })

  it('mtime is ISO string', async () => {
    await writeFile(path.join(tmp, 'README.md'), '# Project')
    const result = await runDiscovery(tmp)
    const entry = result.entries[0]
    expect(entry.mtime).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})
```

Rodar para confirmar GREEN após fase-01: `bun run test -- --grep 'runDiscovery'`

### Passo 3: Criar fixture `greenfield`

```
skills/init/__fixtures__/greenfield/
  README.md     ← "# My Project\n\nGeneric description."
```

Este fixture representa um repo sem docs institucionais (greenfield).
`runDiscovery` nele retornará `entries: [{ path: 'README.md', ... }]` (só o README).
`detectInitMode` retornará `mode: 'greenfield'` pois há < 5 arquivos não-harness.

```markdown
<!-- skills/init/__fixtures__/greenfield/README.md -->
# My Project

Generic description.
```

### Passo 4: Criar fixture `scattered-adrs`

```
skills/init/__fixtures__/scattered-adrs/
  README.md
  CONTRIBUTING.md
  CHANGELOG.md
  docs/
    ADR-001-use-postgres.md
    ADR-002-auth-jwt.md
    ADR-003-event-sourcing.md
    architecture-overview.md
    deployment-guide.md
    api-reference.md
  .claude/
    CLAUDE.md
```

Este fixture representa um repo com documentação institucional espalhada (7 arquivos em docs/,
1 em .claude/ = 8 arquivos não-harness), suficiente para triggeriar `mode: 'migration'`.

Conteúdo de cada arquivo deve ser mínimo mas realista — headings H1/H2 presentes para testar
extração:

```markdown
<!-- docs/ADR-001-use-postgres.md -->
# ADR-001: Use PostgreSQL

## Status
Accepted

## Context
We evaluated SQLite, MySQL, and PostgreSQL.

## Decision
Use PostgreSQL 15+.
```

```markdown
<!-- docs/architecture-overview.md -->
# Architecture Overview

## Backend
Node.js + Express monolith.

## Frontend
React SPA.

## Database
PostgreSQL via Prisma.
```

Os demais arquivos seguem o mesmo padrão: H1 + 2-3 H2s + texto mínimo.

---

## Gotchas

**G7 — Fixtures usam paths relativos dentro de `__fixtures__/`:** Quando um teste carrega uma
fixture, deve resolver o caminho via `path.resolve(__dirname, '../__fixtures__/greenfield')`.
O `__dirname` em bun:test funciona conforme esperado — sem need de `import.meta.url` gymnastics.

**G8 — Fixture `scattered-adrs` deve ter exatamente ≥5 arquivos não-harness para testar migration mode:**
A contagem é feita pelo `migration-mode-detector.ts` com `MIN_POPULATED_DOCS = 5`. O fixture tem 8
arquivos não-harness (7 em docs/ + 1 em .claude/) — acima do threshold.

**G9 — afterEach com `rm({ recursive: true, force: true })`:** Nunca usar `rmdir` (não funciona em
diretórios não-vazios). O padrão `rm({ recursive: true, force: true })` é usado no codebase existente
e não falha se o dir já foi removido (`force: true`).

**G10 — Não testar `size_bytes` com valor exato:** O tamanho em bytes depende de encoding (UTF-8 BOM,
CRLF vs LF). Testar apenas `> 0` ou a shape, não o valor exato.

---

## Verificacao

### TDD
- [ ] RED: antes de expandir testes, `bun run test -- --grep 'runDiscovery'` mostra 1 PASS (stub)
- [ ] GREEN: após expandir, todos os testes passam
  - Comando: `bun run test -- --grep 'runDiscovery'`

### Checklist
- [ ] Suite de discovery.test.ts tem ≥12 testes cobrindo: entries coletadas, exclusão secrets, heading extraction, first_500_chars, deduplication, mtime ISO, inventory.json escrito em disco
- [ ] Fixture `greenfield/README.md` existe em `skills/init/__fixtures__/greenfield/`
- [ ] Fixture `scattered-adrs/` existe com ≥7 arquivos .md em docs/ e 1 em .claude/
- [ ] Todos os arquivos de fixture têm H1 e H2 para testar extração
- [ ] `bun run tsc --noEmit` passa sem erros
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- --grep 'runDiscovery'` retorna ≥12 testes PASS, 0 FAIL
- `bun run tsc --noEmit` retorna exit code 0
- `ls skills/init/__fixtures__/greenfield/README.md` existe
- `ls skills/init/__fixtures__/scattered-adrs/docs/` lista ≥5 arquivos `.md`

<!-- Gerado por /plan-feature em 2026-05-14 -->
