// 2026-05-12 (Luiz/dev): TDD RED — fase-06 decision-registry --revoke (D31/CA-43)
import { describe, it, expect, beforeEach } from 'bun:test'
import * as fs from 'fs'
import * as path from 'path'
import matter from 'gray-matter'
import { revoke } from './decision-registry-revoke'

const FIXTURE = path.resolve(import.meta.dir, '..', '..', 'tests', 'fixtures', 'adr-revoke-fixture')
const adrDir = path.join(FIXTURE, 'docs', 'design-docs')

const ADR_0001 = `---
id: ADR-0001
title: Original X
status: active
created: 2026-04-01
---

## Context

Reasons for X.

## Decision

Choose X.
`

const ADR_0003 = `---
id: ADR-0003
title: Original Y
status: active
created: 2026-05-01
---

Y body.
`

beforeEach(() => {
  if (fs.existsSync(FIXTURE)) fs.rmSync(FIXTURE, { recursive: true, force: true })
  fs.mkdirSync(adrDir, { recursive: true })
  // criar estrutura v6 minima para resolvePaths funcionar
  fs.mkdirSync(path.join(FIXTURE, 'docs', 'compound'), { recursive: true })
  fs.mkdirSync(path.join(FIXTURE, 'docs', 'exec-plans', 'active'), { recursive: true })
  fs.mkdirSync(path.join(FIXTURE, 'docs', 'exec-plans', 'completed'), { recursive: true })
  fs.writeFileSync(path.join(adrDir, 'ADR-0001-x.md'), ADR_0001)
  fs.writeFileSync(path.join(adrDir, 'ADR-0003-y.md'), ADR_0003)
})

describe('decision-registry-revoke', () => {
  it('creates new ADR with monotonic number (max+1)', () => {
    const result = revoke(FIXTURE, 3, { reason: 'X agora obsoleto' })
    expect(result.superseded.id).toBe('ADR-0004')
    expect(fs.existsSync(result.superseded.path)).toBe(true)
    expect(path.basename(result.superseded.path)).toBe('ADR-0004-y-superseded.md')
  })

  it('preserves original ADR file (no delete)', () => {
    const result = revoke(FIXTURE, 1, { reason: 'simplificacao' })
    expect(fs.existsSync(result.original.path)).toBe(true)
  })

  it('updates original frontmatter with status: superseded-by', () => {
    const result = revoke(FIXTURE, 1, { reason: 'r1' })
    const parsed = matter(fs.readFileSync(result.original.path, 'utf-8'))
    expect(parsed.data.status).toBe('superseded-by: ADR-0004')
  })

  it('adds Superseded-by link block to original body', () => {
    const result = revoke(FIXTURE, 1, { reason: 'r1' })
    const content = fs.readFileSync(result.original.path, 'utf-8')
    expect(content).toContain('**Superseded-by:**')
    expect(content).toContain('ADR-0004')
    expect(content).toContain('r1')
  })

  it('new ADR contains Supersedes link back', () => {
    const result = revoke(FIXTURE, 1, { reason: 'r1' })
    const content = fs.readFileSync(result.superseded.path, 'utf-8')
    expect(content).toContain('**Supersedes:**')
    expect(content).toContain('ADR-0001')
  })

  it('new ADR has frontmatter supersedes field and status active', () => {
    const result = revoke(FIXTURE, 1, { reason: 'r1' })
    const parsed = matter(fs.readFileSync(result.superseded.path, 'utf-8'))
    expect(parsed.data.supersedes).toBe('ADR-0001')
    expect(parsed.data.status).toBe('active')
  })

  it('accepts id as string ADR-0003', () => {
    const result = revoke(FIXTURE, 'ADR-0003', { reason: 'r' })
    expect(result.original.id).toBe('ADR-0003')
  })

  it('throws on unknown ADR id', () => {
    expect(() => revoke(FIXTURE, 99, { reason: 'r' })).toThrow(/nao encontrada/)
  })

  it('respects custom newSlug', () => {
    const result = revoke(FIXTURE, 1, { reason: 'r', newSlug: 'new-approach' })
    expect(path.basename(result.superseded.path)).toBe('ADR-0004-new-approach.md')
  })

  it('double revoke creates 2 superseded entries (non-idempotent, documented)', () => {
    revoke(FIXTURE, 1, { reason: 'r1' })
    const second = revoke(FIXTURE, 1, { reason: 'r2' })
    expect(second.superseded.id).toBe('ADR-0005')
  })
})
