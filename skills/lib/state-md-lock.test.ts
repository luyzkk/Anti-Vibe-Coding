// 2026-05-12 (Luiz/dev): tests for shouldSkipByRateLimit lock helper
import { describe, it, expect, beforeEach } from 'bun:test'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { shouldSkipByRateLimit } from './state-md-lock'

const LOCK_PATH = path.join(os.homedir(), '.claude', 'cache', 'state-md-last-run.json')

function resetLock(): void {
  if (fs.existsSync(LOCK_PATH)) fs.unlinkSync(LOCK_PATH)
}

describe('shouldSkipByRateLimit', () => {
  beforeEach(() => resetLock())

  it('returns false on first call (no existing lock)', () => {
    const result = shouldSkipByRateLimit('/tmp/project-a', 30_000)
    expect(result).toBe(false)
  })

  it('returns true on second call before TTL expires', () => {
    const project = '/tmp/project-b'
    const first = shouldSkipByRateLimit(project, 30_000)
    expect(first).toBe(false)
    const second = shouldSkipByRateLimit(project, 30_000)
    expect(second).toBe(true)
  })

  it('creates lock file at the expected path after first call', () => {
    shouldSkipByRateLimit('/tmp/project-c', 30_000)
    expect(fs.existsSync(LOCK_PATH)).toBe(true)
    const raw = fs.readFileSync(LOCK_PATH, 'utf-8')
    const parsed = JSON.parse(raw) as Record<string, { timestamp_ms: number }>
    const key = path.resolve('/tmp/project-c')
    expect(parsed[key]).toBeDefined()
    expect(typeof parsed[key]?.timestamp_ms).toBe('number')
  })

  it('isolates two different projectRoots — second project is not blocked by first', () => {
    const projectA = '/tmp/project-d-a'
    const projectB = '/tmp/project-d-b'
    const firstA = shouldSkipByRateLimit(projectA, 30_000)
    expect(firstA).toBe(false)
    // Project B should NOT be rate-limited by project A
    const firstB = shouldSkipByRateLimit(projectB, 30_000)
    expect(firstB).toBe(false)
    // Second call on A should now be blocked
    const secondA = shouldSkipByRateLimit(projectA, 30_000)
    expect(secondA).toBe(true)
  })

  it('returns false when TTL has expired (ttlMs=0)', () => {
    const project = '/tmp/project-e'
    const first = shouldSkipByRateLimit(project, 30_000)
    expect(first).toBe(false)
    // Use ttlMs=0 to simulate expired TTL
    const expired = shouldSkipByRateLimit(project, 0)
    expect(expired).toBe(false)
  })
})
