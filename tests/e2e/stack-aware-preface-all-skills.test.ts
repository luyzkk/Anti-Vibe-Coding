// tests/e2e/stack-aware-preface-all-skills.test.ts
// 2026-05-16 (Luiz/dev): Plano 03 fase-03 — CA-05 + CA-09 sobre as 7 skills cross-stack.
// G1 do plano03: zero drift entre os 7 blocos é o contrato; qualquer divergência vira regressão aqui.
// G3 do plano03: CA-09 strict — preface = '' literal, sem warning/log.
// E2E importa a função real do helper (mesma que cada SKILL.md importa). Setup inline com mkdtempSync.
import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  getStackKnowledgePreface,
  PREFACE_MESSAGE,
} from '../../skills/security/lib/stack-aware-preface'

const SKILLS_CROSS_STACK = [
  'security',
  'api-design',
  'system-design',
  'design-patterns',
  'architecture',
  'infrastructure',
  'tdd-workflow',
] as const

const PLUGIN_ROOT = join(import.meta.dir, '..', '..')

describe('stack-aware-preface — all 7 cross-stack skills', () => {
  describe('CA-05: INDEX presente → preface não-vazio + bloco wired em SKILL.md', () => {
    let tmpDir: string

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), 'stack-aware-ca05-'))
      mkdirSync(join(tmpDir, '.claude', 'knowledge'), { recursive: true })
      writeFileSync(
        join(tmpDir, '.claude', 'knowledge', 'INDEX.md'),
        '# Knowledge INDEX (test)\n',
        'utf8',
      )
    })

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true })
    })

    for (const skillName of SKILLS_CROSS_STACK) {
      it(`${skillName}: SKILL.md contém bloco AND preface logic emite frase de citação`, () => {
        const skillPath = join(PLUGIN_ROOT, 'skills', skillName, 'SKILL.md')
        const body = readFileSync(skillPath, 'utf8')
        expect(body).toContain('<!-- stack-aware-preface:start -->')
        expect(body).toContain('<!-- stack-aware-preface:end -->')
        expect(body).toContain('getStackKnowledgePreface')

        const preface = getStackKnowledgePreface(tmpDir)
        expect(preface).toBe(PREFACE_MESSAGE)
        expect(preface).toContain('.claude/knowledge/INDEX.md')
      })
    }
  })

  describe('CA-09: INDEX ausente → preface vazio, sem warning/log', () => {
    let tmpDir: string
    let warnSpy: ReturnType<typeof spyOn>
    let errorSpy: ReturnType<typeof spyOn>

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), 'stack-aware-ca09-'))
      warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
      errorSpy = spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true })
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    })

    for (const skillName of SKILLS_CROSS_STACK) {
      it(`${skillName}: preface === '' AND zero console.warn/error (graceful degradation)`, () => {
        const preface = getStackKnowledgePreface(tmpDir)
        expect(preface).toBe('')
        expect(warnSpy).not.toHaveBeenCalled()
        expect(errorSpy).not.toHaveBeenCalled()
      })
    }
  })
})
