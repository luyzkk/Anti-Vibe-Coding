// 2026-05-16 (Luiz/dev): testes do helper — verify-work HIGH #4. Substituem a tautologia inline do E2E.
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getStackKnowledgePreface, PREFACE_MESSAGE } from './stack-aware-preface'

describe('getStackKnowledgePreface', () => {
  let project: string

  beforeEach(() => {
    project = mkdtempSync(join(tmpdir(), 'preface-'))
  })

  afterEach(() => {
    rmSync(project, { recursive: true, force: true })
  })

  it('returns PREFACE_MESSAGE when .claude/knowledge/INDEX.md exists (CA-05)', () => {
    mkdirSync(join(project, '.claude', 'knowledge'), { recursive: true })
    writeFileSync(join(project, '.claude', 'knowledge', 'INDEX.md'), '# fake INDEX')
    expect(getStackKnowledgePreface(project)).toBe(PREFACE_MESSAGE)
  })

  it('returns empty string when INDEX.md absent (CA-09 graceful degradation)', () => {
    expect(getStackKnowledgePreface(project)).toBe('')
  })

  it('returns empty when .claude/knowledge/ exists but INDEX.md missing', () => {
    mkdirSync(join(project, '.claude', 'knowledge'), { recursive: true })
    expect(getStackKnowledgePreface(project)).toBe('')
  })

  // L4 — INDEX content validation
  it('returns empty string when INDEX.md exists but is empty (corrupt)', () => {
    mkdirSync(join(project, '.claude', 'knowledge'), { recursive: true })
    writeFileSync(join(project, '.claude', 'knowledge', 'INDEX.md'), '')
    expect(getStackKnowledgePreface(project)).toBe('')
  })

  it('returns empty string when INDEX.md exists but has no markdown H1 header (corrupt)', () => {
    mkdirSync(join(project, '.claude', 'knowledge'), { recursive: true })
    writeFileSync(join(project, '.claude', 'knowledge', 'INDEX.md'), 'some content without H1\n## section')
    expect(getStackKnowledgePreface(project)).toBe('')
  })

  it('returns PREFACE_MESSAGE when INDEX.md starts with # (valid H1)', () => {
    mkdirSync(join(project, '.claude', 'knowledge'), { recursive: true })
    writeFileSync(join(project, '.claude', 'knowledge', 'INDEX.md'), '# Valid Index\n\nsome content')
    expect(getStackKnowledgePreface(project)).toBe(PREFACE_MESSAGE)
  })
})
