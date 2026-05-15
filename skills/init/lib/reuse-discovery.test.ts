import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { tmpdir } from 'node:os'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  parseReuseDiscoveryFlag,
  readLastInitTimestamp,
  shouldReuseDiscovery,
  formatStaleMessage,
  FRESH_THRESHOLD_MS,
} from './reuse-discovery'

let tmp: string

beforeEach(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), 'reuse-discovery-test-'))
  await mkdir(path.join(tmp, 'discovery'), { recursive: true })
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

describe('FRESH_THRESHOLD_MS', () => {
  it('equals 24 hours in milliseconds', () => {
    expect(FRESH_THRESHOLD_MS).toBe(24 * 60 * 60 * 1000)
  })
})

describe('parseReuseDiscoveryFlag', () => {
  it('returns reuseDiscovery true when flag present', () => {
    expect(parseReuseDiscoveryFlag(['--reuse-discovery']).reuseDiscovery).toBe(true)
  })

  it('returns reuseDiscovery false when flag absent', () => {
    expect(parseReuseDiscoveryFlag(['--dry-run']).reuseDiscovery).toBe(false)
  })

  it('returns reuseDiscovery false on empty args', () => {
    expect(parseReuseDiscoveryFlag([]).reuseDiscovery).toBe(false)
  })
})

describe('readLastInitTimestamp', () => {
  it('returns started_at when agents-log.json exists with valid shape', async () => {
    const iso = '2026-05-15T10:00:00.000Z'
    await writeFile(
      path.join(tmp, 'discovery', 'agents-log.json'),
      JSON.stringify({ run_id: 'r1', started_at: iso, entries: [] }),
      'utf-8',
    )
    expect(await readLastInitTimestamp(tmp)).toBe(iso)
  })

  it('returns null when agents-log.json does not exist', async () => {
    expect(await readLastInitTimestamp(tmp)).toBeNull()
  })
})

describe('readLastInitTimestamp — edge cases (CA-04)', () => {
  it('returns null when agents-log.json contains invalid JSON', async () => {
    await writeFile(
      path.join(tmp, 'discovery', 'agents-log.json'),
      '{ this is not valid json',
      'utf-8',
    )
    expect(await readLastInitTimestamp(tmp)).toBeNull()
  })

  it('returns null when agents-log.json is valid JSON but missing started_at', async () => {
    await writeFile(
      path.join(tmp, 'discovery', 'agents-log.json'),
      JSON.stringify({ run_id: 'r1', entries: [] }),
      'utf-8',
    )
    expect(await readLastInitTimestamp(tmp)).toBeNull()
  })

  it('returns null when started_at is not a string', async () => {
    await writeFile(
      path.join(tmp, 'discovery', 'agents-log.json'),
      JSON.stringify({ run_id: 'r1', started_at: 123456, entries: [] }),
      'utf-8',
    )
    expect(await readLastInitTimestamp(tmp)).toBeNull()
  })
})

describe('shouldReuseDiscovery', () => {
  it('returns true when cachedAt is 1 hour ago', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    expect(shouldReuseDiscovery(oneHourAgo)).toBe(true)
  })

  it('returns false when cachedAt is 25 hours ago (stale)', () => {
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    expect(shouldReuseDiscovery(twentyFiveHoursAgo)).toBe(false)
  })

  it('returns false when cachedAt is null', () => {
    expect(shouldReuseDiscovery(null)).toBe(false)
  })
})

describe('public export contract (CA-07)', () => {
  it('exports shouldReuseDiscovery as a function', () => {
    expect(typeof shouldReuseDiscovery).toBe('function')
  })

  it('exports FRESH_THRESHOLD_MS as a finite number', () => {
    expect(typeof FRESH_THRESHOLD_MS).toBe('number')
    expect(Number.isFinite(FRESH_THRESHOLD_MS)).toBe(true)
    expect(FRESH_THRESHOLD_MS).toBeGreaterThan(0)
  })

  it('shouldReuseDiscovery accepts string | null and returns boolean', () => {
    // 2026-05-15 (Luiz/dev): Type contract — exatamente como PRD v6.3.0-adaptive-coaching / plano05/fase-01 vai consumir.
    expect(typeof shouldReuseDiscovery('2026-05-15T10:00:00.000Z')).toBe('boolean')
    expect(typeof shouldReuseDiscovery(null)).toBe('boolean')
  })
})

describe('byte-identical compatibility without flag (CA-06)', () => {
  it('parseReuseDiscoveryFlag returns false when only other flags present', () => {
    expect(parseReuseDiscoveryFlag(['--dry-run', '--verbose']).reuseDiscovery).toBe(false)
  })
})

describe('formatStaleMessage', () => {
  it('returns "no previous init detected" when cachedAt is null', () => {
    expect(formatStaleMessage(null)).toContain('no previous init detected')
  })

  it('returns "stale (XXh ago)" with hours when cachedAt is 48h ago', () => {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    expect(formatStaleMessage(fortyEightHoursAgo)).toMatch(/stale \(48h ago\)/)
  })

  it('returns unreadable when cachedAt is malformed', () => {
    expect(formatStaleMessage('not-an-iso')).toContain('unreadable')
  })
})
