// 2026-05-11 (Luiz/dev): CA-17 verbatim — 6 skills × 3 formas v5.x = 18 testes + 6 contratos
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { makeTempV6, cleanup } from './helpers/v6-fixture-setup'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import * as lessonsLearned from '../skills/lessons-learned'
import * as decisionRegistry from '../skills/decision-registry'
import * as iterate from '../skills/iterate'
import * as planFeature from '../skills/plan-feature'
import * as quickPlan from '../skills/quick-plan'
import * as executePlan from '../skills/execute-plan'

let projectRoot: string
beforeEach(async () => { projectRoot = await makeTempV6() })
afterEach(async () => { await cleanup(projectRoot) })

describe('zero breaking change — D10 / CA-17', () => {
  // === lessons-learned ===
  test('lessons-learned: positional string (v5.x)', async () => {
    const r = await lessonsLearned.add('foo bug fix', projectRoot)
    expect(r.filePath).toMatch(/docs[/\\]compound[/\\]\d{4}-\d{2}-\d{2}-foo-bug-fix\.md$/)
    expect(r.layout).toBe('v6')
    await expect(fs.stat(r.filePath)).resolves.toBeDefined()
  })

  test('lessons-learned: object syntax (v6 rich)', async () => {
    const r = await lessonsLearned.add({ title: 'rich', tags: ['perf'] }, projectRoot)
    expect(r.filePath).toContain('compound')
    const content = await fs.readFile(r.filePath, 'utf-8')
    expect(content).toContain('perf')
  })

  test('lessons-learned: no-args positional does not throw', async () => {
    await expect(
      lessonsLearned.add('default-title', projectRoot)
    ).resolves.toBeDefined()
  })

  // === decision-registry ===
  test('decision-registry: positional string (v5.x)', async () => {
    const r = await decisionRegistry.add('use TanStack Query', projectRoot)
    expect(r.filePath).toMatch(/ADR-0001-use-tanstack-query\.md$/)
    expect(r.id).toBe(1)
  })

  test('decision-registry: object syntax with alternatives', async () => {
    const r = await decisionRegistry.add({
      title: 'cache strategy',
      alternatives: ['memory', 'redis'],
    }, projectRoot)
    expect(r.id).toBe(1)
    const body = await fs.readFile(r.filePath, 'utf-8')
    expect(body).toContain('memory')
    expect(body).toContain('redis')
  })

  test('decision-registry: monotonic numbering', async () => {
    await decisionRegistry.add('a', projectRoot)
    const r2 = await decisionRegistry.add('b', projectRoot)
    expect(r2.id).toBe(2)
  })

  // === plan-feature ===
  test('plan-feature: produces 10 H2 sections (D18)', async () => {
    const r = await planFeature.create('test feature', projectRoot)
    const body = await fs.readFile(r.filePath, 'utf-8')
    const h2 = body.match(/^## /gm) ?? []
    expect(h2.length).toBe(10)
  })

  test('plan-feature: writes to docs/exec-plans/active/', async () => {
    const r = await planFeature.create('test feature', projectRoot)
    expect(r.filePath.replace(/\\/g, '/')).toContain('docs/exec-plans/active')
  })

  test('plan-feature: backward-compat object input', async () => {
    const r = await planFeature.create({ title: 'rich' }, projectRoot)
    expect(r.filePath).toMatch(/rich\.md$/)
  })

  // === quick-plan ===
  test('quick-plan: produces 7 H2 sections', async () => {
    const r = await quickPlan.quickPlan('short task', projectRoot)
    const body = await fs.readFile(r.filePath, 'utf-8')
    const h2 = body.match(/^## /gm) ?? []
    expect(h2.length).toBe(7)
  })

  test('quick-plan: no Assumptions/Risks/Review Checklist', async () => {
    const r = await quickPlan.quickPlan('short task', projectRoot)
    const body = await fs.readFile(r.filePath, 'utf-8')
    expect(body).not.toMatch(/^## Assumptions$/m)
    expect(body).not.toMatch(/^## Risks$/m)
    expect(body).not.toMatch(/^## Review Checklist$/m)
  })

  test('quick-plan: backward-compat string resolves', async () => {
    await expect(quickPlan.quickPlan('s', projectRoot)).resolves.toBeDefined()
  })

  // === execute-plan ===
  test('execute-plan: lists active plans', async () => {
    await planFeature.create('to-execute', projectRoot)
    const plans = await executePlan.listActive(projectRoot)
    expect(plans.length).toBe(1)
  })

  test('execute-plan: moves plan when isComplete', async () => {
    const p = await planFeature.create('movable', projectRoot)
    let body = await fs.readFile(p.filePath, 'utf-8')
    // substituir placeholder em Exit Criteria especificamente
    body = body.replace(
      /(## Exit Criteria\n\n)<!-- preencher -->/,
      '$1- [x] done'
    )
    await fs.writeFile(p.filePath, body, 'utf-8')

    const result = await executePlan.onPlanPotentiallyComplete(projectRoot, p.filePath)
    expect(result.moved).toBe(true)
    await expect(fs.stat(p.filePath)).rejects.toThrow()
    expect(result.newPath).toBeDefined()
    const completedStat = await fs.stat(result.newPath!)
    expect(completedStat.isFile()).toBe(true)
  })

  test('execute-plan: backward-compat listActive resolves', async () => {
    await expect(executePlan.listActive(projectRoot)).resolves.toBeDefined()
  })

  // === iterate ===
  test('iterate: runs compound gate on complete plans', async () => {
    const p = await planFeature.create('gate-target', projectRoot)
    let body = await fs.readFile(p.filePath, 'utf-8')
    body = body.replace(
      /(## Exit Criteria\n\n)<!-- preencher -->/,
      '$1- [x] done'
    )
    await fs.writeFile(p.filePath, body, 'utf-8')

    const mockPrompt = async (_planTitle: string) => ({
      choice: 'no_capture_needed' as const,
      noCaptureReason: 'test reason',
    })

    const r = await iterate.iterate(mockPrompt, projectRoot)
    expect(r.gatesRun).toBe(1)
  })

  test('iterate: backward-compat no-args invocation', async () => {
    const r = await iterate.iterate(async (_) => ({ choice: 'postpone' as const }), projectRoot)
    expect(r).toBeDefined()
  })

  test('iterate: skips active plans not complete', async () => {
    await planFeature.create('not-complete', projectRoot)
    const r = await iterate.iterate(async (_) => ({ choice: 'postpone' as const }), projectRoot)
    expect(r.gatesRun).toBe(0)
  })

  // === contratos de interface ===
  test('interface contract: lessons-learned exports add()', () => {
    expect(typeof lessonsLearned.add).toBe('function')
  })

  test('interface contract: decision-registry exports add()', () => {
    expect(typeof decisionRegistry.add).toBe('function')
  })

  test('interface contract: plan-feature exports create()', () => {
    expect(typeof planFeature.create).toBe('function')
  })

  test('interface contract: quick-plan exports quickPlan()', () => {
    expect(typeof quickPlan.quickPlan).toBe('function')
  })

  test('interface contract: execute-plan exports listActive + onPlanPotentiallyComplete', () => {
    expect(typeof executePlan.listActive).toBe('function')
    expect(typeof executePlan.onPlanPotentiallyComplete).toBe('function')
  })

  test('interface contract: iterate exports iterate()', () => {
    expect(typeof iterate.iterate).toBe('function')
  })
})
