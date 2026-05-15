// 2026-05-12 (plan-executor): testes para a skill todo-pick — CA-31, CA-32, CA-44
// Testa SKILL.md + manifest + chain de helpers usados pela skill
import { describe, it, expect, beforeEach } from 'bun:test'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {
  parse,
  parseLine,
  listPending,
  markDone,
  skip,
  remove,
} from '../skills/lib/todo-utils'

const SKILL_MD = path.join(import.meta.dir, '..', 'skills', 'todo-pick', 'SKILL.md')
const MANIFEST = path.join(import.meta.dir, '..', 'plugin-manifest.json')

// ─── Fixture helpers ────────────────────────────────────────────────────────

const TMP = path.join(os.tmpdir(), 'todo-pick-test')
const TODO = path.join(TMP, 'TODO.md')

// 3 open + 1 done — CA-31 mecânica
const FIXTURE = `# TODO

- [ ] corrigir typo no helper
- [ ] {2026-01-10} {file:src/foo.ts:15} remover console.log
- [x] tarefa ja concluida
- [ ] {feature:auth} adicionar validacao de token
`

beforeEach(() => {
  if (fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true, force: true })
  fs.mkdirSync(TMP, { recursive: true })
  fs.writeFileSync(TODO, FIXTURE)
})

// ─── 1. SKILL.md existe com frontmatter correto ──────────────────────────────

describe('skills/todo-pick/SKILL.md', () => {
  it('arquivo existe', () => {
    expect(fs.existsSync(SKILL_MD)).toBe(true)
  })

  it('frontmatter contém name: todo-pick', () => {
    const content = fs.readFileSync(SKILL_MD, 'utf-8')
    expect(content).toContain('name: todo-pick')
  })

  it('frontmatter contém description com sub-comandos --skip e --remove', () => {
    const content = fs.readFileSync(SKILL_MD, 'utf-8')
    expect(content).toContain('--skip')
    expect(content).toContain('--remove')
  })
})

// ─── 2. plugin-manifest.json tem skills.todo-pick ────────────────────────────

describe('plugin-manifest.json skills.todo-pick', () => {
  it('manifest tem key skills', () => {
    const raw = fs.readFileSync(MANIFEST, 'utf-8')
    const manifest = JSON.parse(raw) as Record<string, unknown>
    expect(manifest).toHaveProperty('skills')
  })

  it('manifest.skills.todo-pick existe com path correto', () => {
    const raw = fs.readFileSync(MANIFEST, 'utf-8')
    const manifest = JSON.parse(raw) as Record<string, unknown>
    const skills = manifest['skills'] as Record<string, unknown>
    expect(skills).toHaveProperty('todo-pick')
    const entry = skills['todo-pick'] as Record<string, unknown>
    expect(entry['path']).toBe('skills/todo-pick/')
  })

  it('manifest.skills.todo-pick tem version atual do plugin', () => {
    const raw = fs.readFileSync(MANIFEST, 'utf-8')
    const manifest = JSON.parse(raw) as Record<string, unknown>
    const pkgRaw = fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8')
    const pkg = JSON.parse(pkgRaw) as Record<string, unknown>
    const skills = manifest['skills'] as Record<string, unknown>
    const entry = skills['todo-pick'] as Record<string, unknown>
    expect(entry['version']).toBe(pkg['version'])
  })
})

// ─── 3. Mecânica dos helpers — CA-31 ─────────────────────────────────────────

describe('parse + listPending — CA-31', () => {
  it('retorna 4 items totais (3 open + 1 done) da fixture', () => {
    const items = parse(TODO)
    expect(items).toHaveLength(4)
  })

  it('listPending via parseLine retorna exatamente 3 items open', () => {
    const lines = FIXTURE.split('\n')
    const parsed = lines
      .map((line, idx) => parseLine(line, idx))
      .filter((item): item is NonNullable<typeof item> => item !== null)

    const pending = listPending(parsed)
    expect(pending).toHaveLength(3)
    expect(pending.every((i) => i.state === 'open')).toBe(true)
  })
})

// ─── 4. markDone — CA-32 ─────────────────────────────────────────────────────

describe('markDone — CA-32', () => {
  it('marca primeiro item open como done (linha vira [x])', () => {
    const items = parse(TODO)
    const firstOpen = items.find((i) => i.state === 'open')!
    markDone(TODO, firstOpen.lineIndex)
    const after = parse(TODO)
    const changed = after.find((i) => i.lineIndex === firstOpen.lineIndex)!
    expect(changed.state).toBe('done')
  })

  it('outros items permanecem inalterados após markDone', () => {
    const items = parse(TODO)
    const firstOpen = items.find((i) => i.state === 'open')!
    markDone(TODO, firstOpen.lineIndex)
    const after = parse(TODO)
    const remaining = after.filter((i) => i.lineIndex !== firstOpen.lineIndex)
    const beforeOthers = items.filter((i) => i.lineIndex !== firstOpen.lineIndex)
    expect(remaining.map((i) => i.state)).toEqual(beforeOthers.map((i) => i.state))
  })
})

// ─── 5. skip — CA-44 --skip ──────────────────────────────────────────────────

describe('skip — CA-44 --skip', () => {
  it('marca item como skipped (linha vira [-])', () => {
    const items = parse(TODO)
    const firstOpen = items.find((i) => i.state === 'open')!
    skip(TODO, firstOpen.lineIndex)
    const after = parse(TODO)
    const changed = after.find((i) => i.lineIndex === firstOpen.lineIndex)!
    expect(changed.state).toBe('skipped')
  })
})

// ─── 6. remove — CA-44 --remove ──────────────────────────────────────────────

describe('remove — CA-44 --remove', () => {
  it('remove linha do arquivo (item desaparece do parse)', () => {
    const items = parse(TODO)
    const countBefore = items.length
    const target = items.find((i) => i.state === 'open')!
    remove(TODO, target.lineIndex)
    const after = parse(TODO)
    expect(after).toHaveLength(countBefore - 1)
    // description da linha removida não deve mais aparecer nos items
    expect(after.find((i) => i.description === target.description)).toBeUndefined()
  })

  it('lança erro para lineIndex fora do range', () => {
    expect(() => remove(TODO, 9999)).toThrow(/fora do range/)
  })
})

// ─── 7. parseLine — formatos variados ────────────────────────────────────────

describe('parseLine — formatos variados', () => {
  it('parseia item com date + classifier file', () => {
    const raw = '- [ ] {2026-01-10} {file:src/foo.ts:15} remover console.log'
    const result = parseLine(raw, 0)
    expect(result).not.toBeNull()
    expect(result!.state).toBe('open')
    expect(result!.date).toBe('2026-01-10')
    expect(result!.classifier).toEqual({ kind: 'file', path: 'src/foo.ts', line: 15 })
    expect(result!.description).toBe('remover console.log')
  })

  it('parseia item com classifier feature', () => {
    const raw = '- [ ] {feature:auth} adicionar validacao de token'
    const result = parseLine(raw, 0)
    expect(result).not.toBeNull()
    expect(result!.classifier).toEqual({ kind: 'feature', name: 'auth' })
    expect(result!.date).toBeNull()
  })

  it('parseia item sem classifier (livre) com classifier null', () => {
    const raw = '- [ ] corrigir typo no helper'
    const result = parseLine(raw, 0)
    expect(result).not.toBeNull()
    expect(result!.classifier).toBeNull()
    expect(result!.date).toBeNull()
  })

  it('parseia item done como state done', () => {
    const raw = '- [x] tarefa ja concluida'
    const result = parseLine(raw, 0)
    expect(result).not.toBeNull()
    expect(result!.state).toBe('done')
  })

  it('retorna null para linha de header', () => {
    expect(parseLine('# TODO', 0)).toBeNull()
  })
})
