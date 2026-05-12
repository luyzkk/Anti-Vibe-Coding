// 2026-05-12 (Luiz/dev): testes E2E RED para decision-registry/index.ts — CA-15, D10 (Plano 05 fase-02)
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { add } from './index'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-decision-registry-'))
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

async function makeV6Project(root: string): Promise<void> {
  // 2026-05-12 (Luiz/dev): layout v6 = docs/compound + docs/exec-plans ambos presentes (DI-01-02)
  await fs.mkdir(path.join(root, 'docs', 'compound'), { recursive: true })
  await fs.mkdir(path.join(root, 'docs', 'exec-plans'), { recursive: true })
}

async function makeV5Project(root: string): Promise<void> {
  // 2026-05-12 (Luiz/dev): layout v5 = apenas lessons-learned.md existente
  await fs.writeFile(path.join(root, 'lessons-learned.md'), '# Lessons Learned\n\n', 'utf-8')
}

describe('add (v6 layout)', () => {
  it('creates ADR-0001 in docs/design-docs/ for v6 project (CA-15)', async () => {
    // 2026-05-12 (Luiz/dev): CA-15 verbatim — v6 escreve em docs/design-docs/ADR-NNNN-{slug}.md
    await makeV6Project(tmpDir)

    const result = await add('Decidi usar TanStack Query em vez de useEffect', tmpDir)

    expect(result.layout).toBe('v6')
    expect(result.id).toBe(1)
    expect(result.filePath).toContain(path.join('docs', 'design-docs'))
    expect(path.basename(result.filePath)).toMatch(/^ADR-0001-/)

    const content = await fs.readFile(result.filePath, 'utf-8')
    expect(content).toContain('status: active')
    expect(content).toContain('id: 1')
  })

  it('creates ADR-0001 then ADR-0002 with monotonic numbering in sequence', async () => {
    // 2026-05-12 (Luiz/dev): duas chamadas em v6 geram ADRs sequenciais
    await makeV6Project(tmpDir)

    const first = await add('Usar PostgreSQL', tmpDir)
    const second = await add('Adotar TDD', tmpDir)

    expect(first.id).toBe(1)
    expect(second.id).toBe(2)
    expect(path.basename(first.filePath)).toMatch(/^ADR-0001-/)
    expect(path.basename(second.filePath)).toMatch(/^ADR-0002-/)

    // verificar que ambos existem em docs/design-docs/
    const designDocsDir = path.join(tmpDir, 'docs', 'design-docs')
    const files = await fs.readdir(designDocsDir)
    expect(files.filter((f) => f.startsWith('ADR-'))).toHaveLength(2)
  })

  it('accepts string positional form (D10 backward-compat v5.x)', async () => {
    // 2026-05-12 (Luiz/dev): D10 — string posicional e forma v5.x; deve virar { title: arg }
    await makeV6Project(tmpDir)

    const result = await add('Decidi usar Bun em vez de Node', tmpDir)

    expect(result.layout).toBe('v6')
    expect(result.id).toBe(1)
    const content = await fs.readFile(result.filePath, 'utf-8')
    expect(content).toContain('Decidi usar Bun em vez de Node')
  })

  it('accepts ADRInput object form with rich fields', async () => {
    // 2026-05-12 (Luiz/dev): forma rica v6 — objeto ADRInput
    await makeV6Project(tmpDir)

    const result = await add(
      {
        title: 'Adotar monorepo Turborepo',
        context: 'Multiplos apps compartilham logica',
        decision: 'Usar Turborepo para monorepo',
        alternatives: ['Nx', 'Lerna', 'sem monorepo'],
        consequences: 'Curva de aprendizado inicial, ganho de caching',
        status: 'active',
      },
      tmpDir,
    )

    expect(result.layout).toBe('v6')
    const content = await fs.readFile(result.filePath, 'utf-8')
    expect(content).toContain('Multiplos apps compartilham logica')
    expect(content).toContain('- Nx')
    expect(content).toContain('- Lerna')
  })

  it('object with only title still works (defaults for optional fields)', async () => {
    // 2026-05-12 (Luiz/dev): edge case — objeto minimo { title } funciona com defaults
    await makeV6Project(tmpDir)

    const result = await add({ title: 'Decisao minima' }, tmpDir)

    expect(result.layout).toBe('v6')
    expect(result.id).toBe(1)
    const content = await fs.readFile(result.filePath, 'utf-8')
    expect(content).toContain('(why is this decision needed)')
  })
})

describe('add (v5 layout)', () => {
  it('appends to decisions.md in v5 project (legacy fallback)', async () => {
    // 2026-05-12 (Luiz/dev): D10 — comportamento legado preservado; escreve em decisions.md raiz
    await makeV5Project(tmpDir)

    const result = await add('Manter jQuery por compatibilidade', tmpDir)

    expect(result.layout).toBe('v5')
    expect(result.id).toBeNull()
    expect(result.filePath).toBe(path.join(tmpDir, 'decisions.md'))

    const content = await fs.readFile(result.filePath, 'utf-8')
    expect(content).toContain('Manter jQuery por compatibilidade')
  })

  it('creates decisions.md with header on first call', async () => {
    // 2026-05-12 (Luiz/dev): primeiro add em v5 cria o arquivo com cabecalho
    await makeV5Project(tmpDir)

    await add('Primeira decisao', tmpDir)

    const content = await fs.readFile(path.join(tmpDir, 'decisions.md'), 'utf-8')
    expect(content).toContain('# Decisions')
  })

  it('appends second decision to existing decisions.md', async () => {
    // 2026-05-12 (Luiz/dev): segundo add appenda sem sobrescrever
    await makeV5Project(tmpDir)

    await add('Decisao A', tmpDir)
    await add('Decisao B', tmpDir)

    const content = await fs.readFile(path.join(tmpDir, 'decisions.md'), 'utf-8')
    expect(content).toContain('Decisao A')
    expect(content).toContain('Decisao B')
  })

  it('does NOT create docs/design-docs/ in v5 project', async () => {
    // 2026-05-12 (Luiz/dev): v5 nao deve criar estrutura v6
    await makeV5Project(tmpDir)

    await add('Qualquer decisao', tmpDir)

    const designDocsDir = path.join(tmpDir, 'docs', 'design-docs')
    const exists = await fs.stat(designDocsDir).then(() => true).catch(() => false)
    expect(exists).toBe(false)
  })
})

describe('add (cru — raw project)', () => {
  it('writes to decisions.md in raw project (v5-default)', async () => {
    // 2026-05-12 (Luiz/dev): projeto cru (sem init) cai em v5-default (Ambiguity 05-A2)
    const result = await add('Decisao em projeto cru', tmpDir)

    expect(result.layout).toBe('cru')
    expect(result.id).toBeNull()
    const content = await fs.readFile(result.filePath, 'utf-8')
    expect(content).toContain('Decisao em projeto cru')
    expect(result.filePath).toBe(path.join(tmpDir, 'decisions.md'))
  })
})
