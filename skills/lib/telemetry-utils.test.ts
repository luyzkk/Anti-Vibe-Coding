import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  appendJsonlLine,
  computeMonthlyPath,
  serializeEntry,
  writeTelemetryStart,
  writeTelemetryEnd,
  inferFasePipeline,
  INSTRUMENTED_SKILLS,
} from './telemetry-utils'
import { parseTelemetryEntry } from './telemetry-schema'
import { FIXTURE_START, FIXTURE_END_SUCCESS, FIXTURE_END_FAILURE } from './__fixtures__/telemetry-fixtures'

// Suite raiz para permitir `bun test --grep telemetry-utils`
describe('telemetry-utils', () => {

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'telemetry-utils-'))
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('computeMonthlyPath', () => {
  test('returns YYYY-MM.jsonl in metrics dir for given date', () => {
    const path = computeMonthlyPath(new Date('2026-05-04T10:00:00Z'))
    expect(path).toMatch(/\.claude[\\/]metrics[\\/]2026-05\.jsonl$/)
  })

  test('uses now() by default and produces stable path within same month', () => {
    const a = computeMonthlyPath()
    const b = computeMonthlyPath()
    expect(a).toBe(b)
  })

  test('respects custom baseDir', () => {
    const path = computeMonthlyPath(new Date('2026-05-04T10:00:00Z'), tmpDir)
    expect(path).toBe(join(tmpDir, '2026-05.jsonl'))
  })
})

describe('serializeEntry', () => {
  test('returns single line ending with newline', () => {
    const line = serializeEntry(FIXTURE_START)
    expect(line.endsWith('\n')).toBe(true)
    expect(line.split('\n').filter(Boolean)).toHaveLength(1)
  })

  test('produces JSON parseable back via parseTelemetryEntry', () => {
    const line = serializeEntry(FIXTURE_END_SUCCESS)
    const parsed = parseTelemetryEntry(JSON.parse(line.trim()))
    expect(parsed.evento).toBe('end')
    if (parsed.evento !== 'end') throw new Error('expected end')
    expect(parsed.sucesso).toBe(true)
  })
})

describe('appendJsonlLine', () => {
  test('creates dir if missing and appends line (G4)', () => {
    const path = join(tmpDir, 'sub', 'nested', '2026-05.jsonl')
    appendJsonlLine(path, 'line1\n')
    expect(existsSync(path)).toBe(true)
    expect(readFileSync(path, 'utf-8')).toBe('line1\n')
  })

  test('appends without truncating existing content (G1)', () => {
    const path = join(tmpDir, '2026-05.jsonl')
    appendJsonlLine(path, 'first\n')
    appendJsonlLine(path, 'second\n')
    expect(readFileSync(path, 'utf-8')).toBe('first\nsecond\n')
  })

  test('does not throw when target dir is invalid — falls back silently (G2 / CA-09)', () => {
    const errorSpy: string[] = []
    const originalError = console.error
    console.error = (...args: unknown[]) => { errorSpy.push(args.join(' ')) }

    // Path invalido: caractere nulo e rejeitado por todos os filesystems
    expect(() => appendJsonlLine('\0/invalid/path.jsonl', 'x\n')).not.toThrow()
    expect(errorSpy.some(line => line.includes('[telemetry-warn]'))).toBe(true)

    console.error = originalError
  })
})

describe('writeTelemetryStart / writeTelemetryEnd', () => {
  test('writes parseable start entry to monthly file', () => {
    const originalCwd = process.cwd()
    process.chdir(tmpDir)

    try {
      writeTelemetryStart(FIXTURE_START)
      const expectedPath = join(tmpDir, '.claude', 'metrics', `${new Date().toISOString().slice(0, 7)}.jsonl`)
      expect(existsSync(expectedPath)).toBe(true)
      const content = readFileSync(expectedPath, 'utf-8').trim()
      const parsed = parseTelemetryEntry(JSON.parse(content))
      expect(parsed.evento).toBe('start')
      expect(parsed.skill_invocada).toBe('plan-feature')
    } finally {
      process.chdir(originalCwd)
    }
  })

  test('writes both start and end as separate lines (CA-03)', () => {
    const originalCwd = process.cwd()
    process.chdir(tmpDir)

    try {
      writeTelemetryStart(FIXTURE_START)
      writeTelemetryEnd(FIXTURE_END_SUCCESS)
      const expectedPath = join(tmpDir, '.claude', 'metrics', `${new Date().toISOString().slice(0, 7)}.jsonl`)
      const lines = readFileSync(expectedPath, 'utf-8').split('\n').filter(Boolean)
      expect(lines).toHaveLength(2)

      const first = parseTelemetryEntry(JSON.parse(lines[0] ?? '{}'))
      const second = parseTelemetryEntry(JSON.parse(lines[1] ?? '{}'))
      expect(first.evento).toBe('start')
      expect(second.evento).toBe('end')
    } finally {
      process.chdir(originalCwd)
    }
  })

  test('records sucesso=false with error_message in end entry', () => {
    const originalCwd = process.cwd()
    process.chdir(tmpDir)

    try {
      writeTelemetryEnd(FIXTURE_END_FAILURE)
      const expectedPath = join(tmpDir, '.claude', 'metrics', `${new Date().toISOString().slice(0, 7)}.jsonl`)
      const content = readFileSync(expectedPath, 'utf-8').trim()
      const parsed = parseTelemetryEntry(JSON.parse(content))
      if (parsed.evento !== 'end') throw new Error('expected end')
      expect(parsed.sucesso).toBe(false)
      expect(parsed.error_message).toBe('fixture failure for tests')
    } finally {
      process.chdir(originalCwd)
    }
  })
})

describe('inferFasePipeline', () => {
  test('maps each of the 10 instrumented skills to a FasePipeline (G7 / D13)', () => {
    for (const skill of INSTRUMENTED_SKILLS) {
      expect(inferFasePipeline(skill)).toBe(skill)
    }
  })

  test('returns null for non-instrumented skill', () => {
    expect(inferFasePipeline('init')).toBeNull()
    expect(inferFasePipeline('unknown')).toBeNull()
  })

  test('INSTRUMENTED_SKILLS has exactly 10 entries (D13)', () => {
    expect(INSTRUMENTED_SKILLS).toHaveLength(10)
  })
})

}) // end describe('telemetry-utils')
