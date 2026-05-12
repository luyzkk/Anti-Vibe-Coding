// 2026-05-12 (Luiz/dev): test suite for todo-utils helpers — D31/CA-44
import { describe, it, expect, beforeEach } from 'bun:test'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { parse, markDone, skip, remove, addLine } from './todo-utils'

const TMP = path.join(os.tmpdir(), 'todo-utils-test')
const TODO = path.join(TMP, 'TODO.md')

beforeEach(() => {
  if (fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true, force: true })
  fs.mkdirSync(TMP, { recursive: true })
  fs.writeFileSync(TODO, `# TODO\n\n- [ ] foo\n- [x] bar\n- [-] baz\n- [ ] qux\n`)
})

describe('todo-utils.parse', () => {
  it('returns 4 items with correct states', () => {
    const items = parse(TODO)
    expect(items).toHaveLength(4)
    expect(items[0]!.state).toBe('open')
    expect(items[1]!.state).toBe('done')
    expect(items[2]!.state).toBe('skipped')
    expect(items[3]!.state).toBe('open')
  })

  it('preserves description', () => {
    const items = parse(TODO)
    expect(items[0]!.description).toBe('foo')
    expect(items[2]!.description).toBe('baz')
  })

  it('returns lineIndex referring to original file lines', () => {
    const items = parse(TODO)
    // file: line 0: '# TODO', line 1: '', line 2: '- [ ] foo'
    expect(items[0]!.lineIndex).toBe(2)
  })

  it('returns empty array when file missing', () => {
    expect(parse('/nonexistent')).toEqual([])
  })
})

describe('todo-utils.markDone', () => {
  it('changes [ ] to [x]', () => {
    const items = parse(TODO)
    markDone(TODO, items[0]!.lineIndex)
    const after = parse(TODO)
    expect(after[0]!.state).toBe('done')
    expect(after[0]!.description).toBe('foo')
  })

  it('throws on non-checkbox line', () => {
    expect(() => markDone(TODO, 0)).toThrow(/nao eh item checkbox/)
  })
})

describe('todo-utils.skip', () => {
  it('changes [ ] to [-]', () => {
    const items = parse(TODO)
    skip(TODO, items[0]!.lineIndex)
    const after = parse(TODO)
    expect(after[0]!.state).toBe('skipped')
  })

  it('preserves indent when skipping', () => {
    fs.writeFileSync(TODO, '  - [ ] indented item\n')
    const items = parse(TODO)
    skip(TODO, items[0]!.lineIndex)
    const content = fs.readFileSync(TODO, 'utf-8')
    expect(content).toBe('  - [-] indented item\n')
  })
})

describe('todo-utils.remove', () => {
  it('deletes line from file', () => {
    const items = parse(TODO)
    remove(TODO, items[2]!.lineIndex) // remove 'baz'
    const after = parse(TODO)
    expect(after.map((i) => i.description)).toEqual(['foo', 'bar', 'qux'])
  })

  it('refuses to remove non-checkbox line', () => {
    expect(() => remove(TODO, 0)).toThrow(/nao eh item checkbox/)
  })

  it('throws out-of-range', () => {
    expect(() => remove(TODO, 999)).toThrow(/fora do range/)
  })
})

describe('todo-utils.addLine', () => {
  it('appends new open item to existing TODO.md', () => {
    addLine(TODO, 'new task')
    const items = parse(TODO)
    expect(items).toHaveLength(5)
    expect(items[4]!.description).toBe('new task')
    expect(items[4]!.state).toBe('open')
  })

  it('creates TODO.md with header when missing', () => {
    const newPath = path.join(TMP, 'nonexistent.md')
    addLine(newPath, 'first task')
    expect(fs.existsSync(newPath)).toBe(true)
    const content = fs.readFileSync(newPath, 'utf-8')
    expect(content).toContain('# TODO')
    expect(content).toContain('- [ ] first task')
  })

  it('throws on empty description', () => {
    expect(() => addLine(TODO, '   ')).toThrow(/description vazia/)
  })

  it('preserves trailing newline correctly', () => {
    fs.writeFileSync(TODO, 'no-newline-at-end')
    addLine(TODO, 'x')
    const content = fs.readFileSync(TODO, 'utf-8')
    expect(content.endsWith('- [ ] x\n')).toBe(true)
  })
})
