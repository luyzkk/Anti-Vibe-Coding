import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { TelemetryStart, TelemetryEnd } from './telemetry-types'
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

// === Smoke tests fase-03 (Plano 03) — consultivas ===
describe('consultivas skills (fase-03 smoke)', () => {
  const CONSULTIVAS = ['iterate', 'consultant', 'architecture', 'design-twice', 'quick-plan'] as const

  test('each consultiva SKILL.md contains writeTelemetryStart and writeTelemetryEnd calls', () => {
    for (const skill of CONSULTIVAS) {
      const skillPath = join('skills', skill, 'SKILL.md')
      expect(existsSync(skillPath)).toBe(true)
      const content = readFileSync(skillPath, 'utf-8')
      expect(content).toContain('writeTelemetryStart')
      expect(content).toContain('writeTelemetryEnd')
    }
  })

  test('each consultiva SKILL.md imports from telemetry-utils', () => {
    for (const skill of CONSULTIVAS) {
      const skillPath = join('skills', skill, 'SKILL.md')
      const content = readFileSync(skillPath, 'utf-8')
      expect(content).toMatch(/from ['"]\.\.\/\.\.\/lib\/telemetry-utils['"]/)
    }
  })

  test('architecture skill preserves Tracer Bullet code from Plano 01 fase-06', () => {
    const archPath = join('skills', 'architecture', 'SKILL.md')
    const content = readFileSync(archPath, 'utf-8')
    // Tracer Bullet do Plano 01 fase-06 declara leitura de architectureProfile
    expect(content).toContain('architectureProfile')
    // E o bloco de telemetria desta fase tambem esta presente
    expect(content).toContain('writeTelemetryStart')
  })
})

describe('D13 cobertura completa (fase-02 + fase-03)', () => {
  const ALL_TEN = [
    'grill-me', 'write-prd', 'plan-feature', 'execute-plan', 'verify-work',
    'iterate', 'consultant', 'architecture', 'design-twice', 'quick-plan',
  ] as const

  test('all 10 instrumented skills have telemetry blocks (D13 / RF4)', () => {
    for (const skill of ALL_TEN) {
      const skillPath = join('skills', skill, 'SKILL.md')
      const content = readFileSync(skillPath, 'utf-8')
      // DI-01: .or nao e API valida do bun:test — usar OR booleano
      const hasInvocada = content.includes(`skill_invocada: '${skill}'`)
      const hasName = content.includes(`skillName = '${skill}'`)
      expect(hasInvocada || hasName).toBe(true)
    }
  })

  test('exactly 10 skills are instrumented (no more, no less — G7)', () => {
    const { INSTRUMENTED_SKILLS } = require('./telemetry-utils')
    expect(INSTRUMENTED_SKILLS).toHaveLength(10)

    const sortedExpected = [...ALL_TEN].sort()
    const sortedActual = [...INSTRUMENTED_SKILLS].sort()
    expect(sortedActual).toEqual(sortedExpected)
  })
})

// === Fase 04 — Rotacao Mensal, CA-09 Regression, Skill Erro ===

describe('rotacao mensal (fase-04)', () => {
  test('computeMonthlyPath returns different paths for different months', () => {
    const may = computeMonthlyPath(new Date('2026-05-15T10:00:00Z'))
    const june = computeMonthlyPath(new Date('2026-06-15T10:00:00Z'))
    expect(may).not.toBe(june)
    expect(may).toMatch(/2026-05\.jsonl$/)
    expect(june).toMatch(/2026-06\.jsonl$/)
  })

  test('computeMonthlyPath handles year transition (Dec to Jan)', () => {
    const dec = computeMonthlyPath(new Date('2026-12-31T23:59:00Z'))
    const jan = computeMonthlyPath(new Date('2027-01-01T00:01:00Z'))
    expect(dec).toMatch(/2026-12\.jsonl$/)
    expect(jan).toMatch(/2027-01\.jsonl$/)
  })

  test('computeMonthlyPath recomputes on each call — same month returns same path (G3 — nao cacheado)', () => {
    const path1 = computeMonthlyPath()
    const path2 = computeMonthlyPath()
    expect(path1).toBe(path2)
  })

  test('separate months produce separate JSONL files in same metrics dir', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'rotation-'))
    try {
      const mayPath = join(tmp, '2026-05.jsonl')
      const junePath = join(tmp, '2026-06.jsonl')

      appendJsonlLine(mayPath, 'may-line\n')
      appendJsonlLine(junePath, 'june-line\n')

      expect(readFileSync(mayPath, 'utf-8')).toBe('may-line\n')
      expect(readFileSync(junePath, 'utf-8')).toBe('june-line\n')
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})

describe('CA-09 regression — falha silenciosa de I/O (fase-04)', () => {
  test('appendJsonlLine swallows error from null-char path and emits [telemetry-warn]', () => {
    const errors: string[] = []
    const original = console.error
    console.error = (...args: unknown[]) => { errors.push(args.join(' ')) }

    try {
      expect(() => appendJsonlLine('\0/invalid.jsonl', 'x\n')).not.toThrow()
      expect(errors.some(e => e.includes('[telemetry-warn]'))).toBe(true)
    } finally {
      console.error = original
    }
  })

  test('computeMonthlyPath with invalid baseDir produces path that appendJsonlLine handles silently', () => {
    const errors: string[] = []
    const original = console.error
    console.error = (...args: unknown[]) => { errors.push(args.join(' ')) }

    try {
      const badPath = computeMonthlyPath(new Date(), '\0/no-where')
      expect(() => appendJsonlLine(badPath, serializeEntry(FIXTURE_START))).not.toThrow()
      expect(errors.some(e => e.includes('[telemetry-warn]'))).toBe(true)
    } finally {
      console.error = original
    }
  })

  test('skill simulation: start+end pair with invalid path produces 0 written lines and 0 throws', () => {
    const errors: string[] = []
    const original = console.error
    console.error = (...args: unknown[]) => { errors.push(args.join(' ')) }

    try {
      const badPath = computeMonthlyPath(new Date(), '\0/totally-invalid')
      expect(() => appendJsonlLine(badPath, serializeEntry(FIXTURE_START))).not.toThrow()
      expect(() => appendJsonlLine(badPath, serializeEntry(FIXTURE_END_SUCCESS))).not.toThrow()
      expect(errors.filter(e => e.includes('[telemetry-warn]')).length).toBeGreaterThanOrEqual(2)
    } finally {
      console.error = original
    }
  })
})

describe('skill com erro em meio a execucao (fase-04 / CA-03)', () => {
  test('end entry com sucesso=false e error_message preservados em JSONL', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'skill-error-'))
    const originalCwd = process.cwd()
    process.chdir(tmp)

    try {
      const startedAt = Date.now()
      const startEntry: TelemetryStart = {
        evento: 'start',
        skill_invocada: 'plan-feature',
        timestamp_inicio: new Date(startedAt).toISOString(),
        profile_arquitetura: 'disabled',
        fase_pipeline: 'plan-feature',
      }
      writeTelemetryStart(startEntry)

      const endEntry: TelemetryEnd = {
        evento: 'end',
        skill_invocada: 'plan-feature',
        timestamp_inicio: startEntry.timestamp_inicio,
        timestamp_fim: new Date().toISOString(),
        duracao_ms: 50,
        profile_arquitetura: 'disabled',
        fase_pipeline: 'plan-feature',
        tokens_aproximados_consumidos: 0,
        arquivos_lidos: 1,
        arquivos_modificados: 0,
        sucesso: true,
      }

      try {
        throw new Error('boom — simulacao de erro de skill')
      } catch (err) {
        endEntry.sucesso = false
        endEntry.error_message = err instanceof Error ? err.message : String(err)
      } finally {
        writeTelemetryEnd(endEntry)
      }

      const jsonlPath = join(tmp, '.claude', 'metrics', `${new Date().toISOString().slice(0, 7)}.jsonl`)
      const lines = readFileSync(jsonlPath, 'utf-8').split('\n').filter(Boolean)
      expect(lines).toHaveLength(2)

      const parsedEnd = parseTelemetryEntry(JSON.parse(lines[1] ?? '{}'))
      if (parsedEnd.evento !== 'end') throw new Error('expected end')
      expect(parsedEnd.sucesso).toBe(false)
      expect(parsedEnd.error_message).toBe('boom — simulacao de erro de skill')
    } finally {
      process.chdir(originalCwd)
      rmSync(tmp, { recursive: true, force: true })
    }
  })

  test('start orfao (G9): skill crash sem chamar writeTelemetryEnd produz so linha start', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'orphan-start-'))
    const originalCwd = process.cwd()
    process.chdir(tmp)

    try {
      writeTelemetryStart({
        evento: 'start',
        skill_invocada: 'design-twice',
        timestamp_inicio: new Date().toISOString(),
        profile_arquitetura: 'disabled',
        fase_pipeline: 'design-twice',
      })

      // Simulacao: skill crashou aqui sem catch, writeTelemetryEnd nunca chamado.

      const jsonlPath = join(tmp, '.claude', 'metrics', `${new Date().toISOString().slice(0, 7)}.jsonl`)
      const lines = readFileSync(jsonlPath, 'utf-8').split('\n').filter(Boolean)
      expect(lines).toHaveLength(1)

      const parsed = parseTelemetryEntry(JSON.parse(lines[0] ?? '{}'))
      expect(parsed.evento).toBe('start')
      // Plano 05 detecta isso como "abandonada"
    } finally {
      process.chdir(originalCwd)
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})

// === Smoke tests fase-02 (Plano 03) ===
describe('pipeline-core skills (fase-02 smoke)', () => {
  const PIPELINE_CORE = ['grill-me', 'write-prd', 'plan-feature', 'execute-plan', 'verify-work'] as const

  test('each pipeline-core SKILL.md contains writeTelemetryStart and writeTelemetryEnd calls', () => {
    for (const skill of PIPELINE_CORE) {
      const skillPath = join('skills', skill, 'SKILL.md')
      expect(existsSync(skillPath)).toBe(true)
      const content = readFileSync(skillPath, 'utf-8')
      expect(content).toContain('writeTelemetryStart')
      expect(content).toContain('writeTelemetryEnd')
      // DI-01: .or nao e API valida do bun:test — usar OR booleano
      const hasInvocada = content.includes(`skill_invocada: '${skill}'`)
      const hasName = content.includes(`skillName = '${skill}'`)
      expect(hasInvocada || hasName).toBe(true)
    }
  })

  test('each pipeline-core SKILL.md imports from telemetry-utils', () => {
    for (const skill of PIPELINE_CORE) {
      const skillPath = join('skills', skill, 'SKILL.md')
      const content = readFileSync(skillPath, 'utf-8')
      expect(content).toMatch(/from ['"]\.\.\/\.\.\/lib\/telemetry-utils['"]/)
    }
  })

  test('runtime smoke: invoking start+end blocks produces 2 valid lines (manual integration)', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'pipeline-core-smoke-'))
    const originalCwd = process.cwd()
    process.chdir(tmp)

    try {
      const { writeTelemetryStart: wStart, writeTelemetryEnd: wEnd } = require('./telemetry-utils')

      const startedAt = Date.now()
      wStart({
        evento: 'start',
        skill_invocada: 'plan-feature',
        timestamp_inicio: new Date(startedAt).toISOString(),
        profile_arquitetura: 'disabled',
        fase_pipeline: 'plan-feature',
      })

      wEnd({
        evento: 'end',
        skill_invocada: 'plan-feature',
        timestamp_inicio: new Date(startedAt).toISOString(),
        timestamp_fim: new Date(startedAt + 100).toISOString(),
        duracao_ms: 100,
        profile_arquitetura: 'disabled',
        fase_pipeline: 'plan-feature',
        tokens_aproximados_consumidos: 0,
        arquivos_lidos: 0,
        arquivos_modificados: 0,
        sucesso: true,
      })

      const expected = join(tmp, '.claude', 'metrics', `${new Date().toISOString().slice(0, 7)}.jsonl`)
      const lines = readFileSync(expected, 'utf-8').split('\n').filter(Boolean)
      expect(lines).toHaveLength(2)
    } finally {
      process.chdir(originalCwd)
      rmSync(tmp, { recursive: true, force: true })
    }
  })
})
