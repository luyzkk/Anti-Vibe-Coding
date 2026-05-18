import { describe, expect, test } from 'bun:test'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { generatePopulatePlanStep } from './91-generate-populate-plan'

describe('generatePopulatePlanStep', () => {
  test('writes PLAN.md at docs/exec-plans/active/{date}-populate-harness/PLAN.md', async () => {
    const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'step91-test-'))
    try {
      await generatePopulatePlanStep.run({ cwd: tmpdir, args: [], flags: {} })

      const activeDir = path.join(tmpdir, 'docs', 'exec-plans', 'active')
      const entries = await fs.readdir(activeDir)

      expect(entries).toHaveLength(1)
      const entryName = entries[0]
      if (entryName === undefined) throw new Error('Expected one entry in active dir')
      expect(entryName).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z-populate-harness$/)

      const planPath = path.join(activeDir, entryName, 'PLAN.md')
      const stat = await fs.stat(planPath)
      expect(stat.isFile()).toBe(true)
    } finally {
      await fs.rm(tmpdir, { recursive: true, force: true })
    }
  })

  test('summary suggests /anti-vibe-coding:execute-plan in PT-BR', async () => {
    const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'step91-summary-'))
    try {
      const report = await generatePopulatePlanStep.run({ cwd: tmpdir, args: [], flags: {} })
      expect(report.summary).toContain('/anti-vibe-coding:execute-plan')
      expect(report.summary).toContain('Plano de populacao gerado')
    } finally {
      await fs.rm(tmpdir, { recursive: true, force: true })
    }
  })

  test('mutated is true', async () => {
    const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'step91-mutated-'))
    try {
      const report = await generatePopulatePlanStep.run({ cwd: tmpdir, args: [], flags: {} })
      expect(report.mutated).toBe(true)
    } finally {
      await fs.rm(tmpdir, { recursive: true, force: true })
    }
  })

  test('re-running writes a different folder (timestamp differs)', async () => {
    const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'step91-rerun-'))
    try {
      await generatePopulatePlanStep.run({ cwd: tmpdir, args: [], flags: {} })
      // Tolerancia: se as 2 chamadas caem no mesmo segundo (raro em test runner),
      // o delay garante timestamps distintos.
      await new Promise(r => setTimeout(r, 1100))
      await generatePopulatePlanStep.run({ cwd: tmpdir, args: [], flags: {} })

      const activeDir = path.join(tmpdir, 'docs', 'exec-plans', 'active')
      const entries = await fs.readdir(activeDir)
      expect(entries).toHaveLength(2)
      expect(entries[0]).not.toBe(entries[1])
    } finally {
      await fs.rm(tmpdir, { recursive: true, force: true })
    }
  })
})
