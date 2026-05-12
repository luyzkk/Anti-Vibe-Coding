// 2026-05-12 (Luiz/dev): teste de integracao CA-14 — Plano 05 fase-01
// Verifica que lessons-learned escreve em docs/compound/ em projeto v6 e preserva comportamento legado em v5
import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { add } from '../skills/lessons-learned/index'
import { parseFrontmatter, findMissingRequiredSections } from '../skills/init/lib/compound-frontmatter'

// 2026-05-12 (Luiz/dev): usa fixture estatica v6-empty para evitar tmp dir por teste de integracao
const V6_FIXTURE = path.join(import.meta.dir, 'fixtures', 'v6-empty')
const V5_FIXTURE = path.join(import.meta.dir, 'fixtures', 'legacy-v5')

describe('CA-14: lessons-learned em projeto v6', () => {
  it('creates compound note with full frontmatter in docs/compound/', async () => {
    // 2026-05-12 (Luiz/dev): CA-14 verbatim — cria arquivo com frontmatter completo
    // Usa tmp dir para nao poluir fixture estatica
    const { promises: fsp } = await import('node:fs')
    const os = await import('node:os')
    const tmpRoot = await fsp.mkdtemp(path.join(os.default.tmpdir(), 'avc-ca14-'))
    try {
      await fsp.mkdir(path.join(tmpRoot, 'docs', 'compound'), { recursive: true })
      await fsp.mkdir(path.join(tmpRoot, 'docs', 'exec-plans'), { recursive: true })

      const result = await add('Bug X aconteceu', tmpRoot)

      expect(result.layout).toBe('v6')
      const content = await fsp.readFile(result.filePath, 'utf-8')

      const parsed = parseFrontmatter(content)
      expect(parsed.ok).toBe(true)

      const missingSections = findMissingRequiredSections(content)
      expect(missingSections).toHaveLength(0)
    } finally {
      await fsp.rm(tmpRoot, { recursive: true, force: true })
    }
  })

  it('preserves legacy behavior in v5 project (D10 zero breaking change)', async () => {
    // 2026-05-12 (Luiz/dev): D10 — v5 continua appendando em lessons-learned.md
    const { promises: fsp } = await import('node:fs')
    const os = await import('node:os')
    const tmpRoot = await fsp.mkdtemp(path.join(os.default.tmpdir(), 'avc-d10-'))
    try {
      // Copia lessons-learned.md do fixture legacy-v5 para tmp dir
      const legacyContent = await fsp.readFile(
        path.join(V5_FIXTURE, 'lessons-learned.md'),
        'utf-8',
      )
      await fsp.writeFile(path.join(tmpRoot, 'lessons-learned.md'), legacyContent, 'utf-8')

      const result = await add('Titulo Y v5', tmpRoot)

      expect(result.layout).toBe('v5')
      expect(result.filePath).toBe(path.join(tmpRoot, 'lessons-learned.md'))

      const content = await fsp.readFile(result.filePath, 'utf-8')
      expect(content).toContain('Titulo Y v5')

      // CA criterio — NAO criou docs/compound/
      const compoundDir = path.join(tmpRoot, 'docs', 'compound')
      const exists = await fsp.stat(compoundDir).then(() => true).catch(() => false)
      expect(exists).toBe(false)
    } finally {
      await fsp.rm(tmpRoot, { recursive: true, force: true })
    }
  })
})
