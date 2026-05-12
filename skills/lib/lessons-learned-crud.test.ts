// 2026-05-12 (Luiz/dev): TDD suite para lessons-learned-crud (CA-41, CA-42, D31)
// Fase-05 do Plano 05 — CRUD de compound notes (update + archive)
import { describe, it, expect, beforeEach } from 'bun:test'
import * as fs from 'fs'
import * as path from 'path'
import matter from 'gray-matter'
import { update, archive } from './lessons-learned-crud'

const FIXTURE = path.resolve(import.meta.dir, '..', '..', 'tests', 'fixtures', 'lessons-crud-fixture')
const compoundDir = path.join(FIXTURE, 'docs', 'compound')

const SAMPLE_NOTE = `---
title: foo
category: general
tags:
  - bash
created: 2026-05-12
---

Original body content.
`

beforeEach(() => {
  if (fs.existsSync(FIXTURE)) fs.rmSync(FIXTURE, { recursive: true, force: true })
  fs.mkdirSync(compoundDir, { recursive: true })
  // Tambem criar docs/exec-plans/active e completed para resolvePaths nao falhar
  fs.mkdirSync(path.join(FIXTURE, 'docs', 'exec-plans', 'active'), { recursive: true })
  fs.mkdirSync(path.join(FIXTURE, 'docs', 'exec-plans', 'completed'), { recursive: true })
  fs.mkdirSync(path.join(FIXTURE, 'docs', 'design-docs'), { recursive: true })
  fs.writeFileSync(path.join(compoundDir, '2026-05-12-foo.md'), SAMPLE_NOTE)
})

describe('lessons-learned-crud.update', () => {
  it('rewrites body and preserves created, adds updated', () => {
    update(FIXTURE, 'foo', { body: 'novo body' })
    const raw = fs.readFileSync(path.join(compoundDir, '2026-05-12-foo.md'), 'utf-8')
    const parsed = matter(raw)
    expect(parsed.content.trim()).toBe('novo body')
    expect(parsed.data.created).toBe('2026-05-12')
    expect(typeof parsed.data.updated).toBe('string')
    expect(parsed.data.title).toBe('foo')
  })

  it('updates tags selectively', () => {
    update(FIXTURE, 'foo', { tags: ['new-tag'] })
    const parsed = matter(fs.readFileSync(path.join(compoundDir, '2026-05-12-foo.md'), 'utf-8'))
    expect(parsed.data.tags).toEqual(['new-tag'])
  })

  it('throws on unknown slug', () => {
    expect(() => update(FIXTURE, 'inexistente', { body: 'x' })).toThrow(/nao encontrei/)
  })

  it('resolves slug without date prefix', () => {
    expect(() => update(FIXTURE, 'foo', { body: 'x' })).not.toThrow()
  })
})

describe('lessons-learned-crud.archive', () => {
  it('moves file to _archived/ and adds archived_at frontmatter', () => {
    const result = archive(FIXTURE, 'foo')
    expect(fs.existsSync(result.from)).toBe(false)
    expect(fs.existsSync(result.to)).toBe(true)
    expect(result.to).toContain('_archived')
    const parsed = matter(fs.readFileSync(result.to, 'utf-8'))
    expect(typeof parsed.data.archived_at).toBe('string')
    expect(parsed.data.created).toBe('2026-05-12')
  })

  it('creates _archived/ dir if missing', () => {
    const archivedDir = path.join(compoundDir, '_archived')
    if (fs.existsSync(archivedDir)) fs.rmSync(archivedDir, { recursive: true })
    archive(FIXTURE, 'foo')
    expect(fs.existsSync(archivedDir)).toBe(true)
  })

  it('throws on unknown slug', () => {
    expect(() => archive(FIXTURE, 'inexistente')).toThrow(/nao encontrei/)
  })

  it('original file gone, archived file present (atomic move)', () => {
    archive(FIXTURE, 'foo')
    expect(fs.existsSync(path.join(compoundDir, '2026-05-12-foo.md'))).toBe(false)
    expect(fs.existsSync(path.join(compoundDir, '_archived', '2026-05-12-foo.md'))).toBe(true)
  })
})
