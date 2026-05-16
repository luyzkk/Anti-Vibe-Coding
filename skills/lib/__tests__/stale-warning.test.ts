// 2026-05-15 (Luiz/dev): Plano 02 fase-06 v6.3.1-coaching-honesty (CA-09).
// Spawn de subprocess que carrega markdown executavel e fragil em Windows; pure-fn evita.
//
// SYNC OBRIGATORIO: o corpo de `checkStaleCapabilities` espelha o bloco
// <!-- stale-capabilities-check:start --> presente nas 6 SKILL.md
// (security, api-design, system-design, design-patterns, decision-registry, lessons-learned).
// Se uma mudar, atualizar TODAS — comentario espelhado nas SKILL.md aponta para este arquivo.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function checkStaleCapabilities(projectRoot: string, write: (s: string) => void): void {
  const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000
  let raw: string
  try {
    raw = readFileSync(join(projectRoot, 'discovery', 'capabilities.json'), 'utf-8')
  } catch {
    return
  }
  let parsed: { generated_at?: unknown }
  try {
    parsed = JSON.parse(raw) as { generated_at?: unknown }
  } catch {
    return
  }
  const generated_at = typeof parsed.generated_at === 'string' ? parsed.generated_at : null
  if (generated_at === null) return
  const age = Date.now() - new Date(generated_at).getTime()
  if (Number.isFinite(age) && age > STALE_THRESHOLD_MS) {
    write('capabilities.json stale (>24h) — run /init --refresh\n')
  }
}

describe('stale capabilities warning (CA-09 v6.3.1)', () => {
  let tmp: string
  beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), 'stale-')) })
  afterEach(() => { rmSync(tmp, { recursive: true, force: true }) })

  it('writes stderr warning when generated_at > 24h ago', () => {
    const stale = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    mkdirSync(join(tmp, 'discovery'), { recursive: true })
    writeFileSync(
      join(tmp, 'discovery', 'capabilities.json'),
      JSON.stringify({
        generated_at: stale,
        capabilities: [],
        coverage_gaps: [],
        profile_at_generation: 'nextjs-app-router',
        schema_version: '2.0',
      }),
    )

    const captured: string[] = []
    checkStaleCapabilities(tmp, s => captured.push(s))

    expect(captured).toHaveLength(1)
    expect(captured[0]).toBe('capabilities.json stale (>24h) — run /init --refresh\n')
  })

  it('does NOT warn when capabilities.json is absent', () => {
    const captured: string[] = []
    checkStaleCapabilities(tmp, s => captured.push(s))
    expect(captured).toEqual([])
  })

  it('does NOT warn when generated_at is fresh (1h ago)', () => {
    const fresh = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    mkdirSync(join(tmp, 'discovery'), { recursive: true })
    writeFileSync(
      join(tmp, 'discovery', 'capabilities.json'),
      JSON.stringify({
        generated_at: fresh,
        capabilities: [],
        coverage_gaps: [],
        profile_at_generation: 'nextjs-app-router',
        schema_version: '2.0',
      }),
    )
    const captured: string[] = []
    checkStaleCapabilities(tmp, s => captured.push(s))
    expect(captured).toEqual([])
  })
})
