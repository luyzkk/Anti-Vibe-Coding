// 2026-05-12 (Luiz/dev): testa formatter CA-33 sem I/O — pure function
import { describe, it, expect, beforeEach } from 'bun:test'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { formatTodoLine, captureToTodoMd } from './execute-plan-todo-capture'

const fixedToday = new Date('2026-05-13T12:00:00Z')

describe('formatTodoLine', () => {
  it('formats file classifier with line number (CA-33 verbatim)', () => {
    const line = formatTodoLine({
      projectRoot: '/repo',
      absolutePath: '/repo/src/foo.ts',
      lineNumber: 42,
      featureName: null,
      description: 'typo no comentario',
      today: fixedToday,
    })
    expect(line).toBe('- [ ] {2026-05-13} {file:src/foo.ts:42} typo no comentario')
  })

  it('formats file classifier without line number', () => {
    const line = formatTodoLine({
      projectRoot: '/repo',
      absolutePath: '/repo/src/bar.ts',
      lineNumber: null,
      featureName: null,
      description: 'review imports',
      today: fixedToday,
    })
    expect(line).toBe('- [ ] {2026-05-13} {file:src/bar.ts} review imports')
  })

  it('formats feature classifier when no file (07-A5)', () => {
    const line = formatTodoLine({
      projectRoot: '/repo',
      absolutePath: null,
      lineNumber: null,
      featureName: 'billing',
      description: 'extract magic number',
      today: fixedToday,
    })
    expect(line).toBe('- [ ] {2026-05-13} {feature:billing} extract magic number')
  })

  it('normalizes Windows backslash paths to forward slashes (G6)', () => {
    const line = formatTodoLine({
      projectRoot: 'C:\\repo',
      absolutePath: 'C:\\repo\\src\\foo.ts',
      lineNumber: 10,
      featureName: null,
      description: 'fix',
      today: fixedToday,
    })
    expect(line).toContain('{file:src/foo.ts:10}')
    expect(line).not.toContain('\\')
  })

  it('omits classifier when no file and no feature', () => {
    const line = formatTodoLine({
      projectRoot: '/repo',
      absolutePath: null,
      lineNumber: null,
      featureName: null,
      description: 'general cleanup',
      today: fixedToday,
    })
    expect(line).toBe('- [ ] {2026-05-13} general cleanup')
  })
})

describe('captureToTodoMd', () => {
  let tmpDir: string
  let todoPath: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'capture-test-'))
    todoPath = path.join(tmpDir, 'TODO.md')
  })

  it('appends line without double-prefixing (regression: addLine adds its own - [ ])', () => {
    fs.writeFileSync(todoPath, '# TODO\n\n', 'utf-8')
    captureToTodoMd(todoPath, {
      projectRoot: tmpDir,
      absolutePath: path.join(tmpDir, 'src/foo.ts'),
      lineNumber: 42,
      featureName: null,
      description: 'typo',
      today: fixedToday,
    })
    const content = fs.readFileSync(todoPath, 'utf-8')
    // must contain exactly one '- [ ]', not two
    const matches = content.match(/- \[ \]/g) ?? []
    expect(matches).toHaveLength(1)
    expect(content).toContain('{file:src/foo.ts:42}')
  })

  it('creates TODO.md with header when missing', () => {
    captureToTodoMd(todoPath, {
      projectRoot: tmpDir,
      absolutePath: null,
      lineNumber: null,
      featureName: 'billing',
      description: 'extract magic number',
      today: fixedToday,
    })
    expect(fs.existsSync(todoPath)).toBe(true)
    const content = fs.readFileSync(todoPath, 'utf-8')
    expect(content).toContain('# TODO')
    expect(content).toContain('{feature:billing}')
  })
})
