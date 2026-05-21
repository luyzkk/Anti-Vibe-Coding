// skills/init/lib/populate-plan-generator.test.ts
// 2026-05-21 (Luiz/dev): Plano 04 fase-01 — RED-GREEN do renderer puro.
// renderAndrePlan: input estruturado → markdown com 10 secoes H2 (CA-07 do PRD init-refactor-v7).
// 2026-05-21 (Luiz/dev): Plano 04 fase-03 — testes do pipeline generatePopulatePlans.

import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { renderAndrePlan, extractH2Sections, generatePopulatePlans, type AndrePlanInput } from './populate-plan-generator'
import type { DetectedStack } from './detect-stack'

const SAMPLE_INPUT: AndrePlanInput = {
  docPath: 'docs/SECURITY.md',
  goal: 'Document the security posture: auth, secrets, dependencies, OWASP top 10 coverage.',
  scope: {
    in: ['Auth flow', 'Secret management', 'CSP headers'],
    out: ['Pentest results', 'Compliance audit'],
  },
  assumptions: ['Project uses middleware-based auth', '.env.example exists in repo root'],
  risks: [
    { risk: 'Auth spread across multiple layers', mitigation: 'Wave 1 maps all auth touchpoints first' },
  ],
  waves: [
    { name: 'Wave 1 — Discovery', items: ['Read src/middleware.ts', 'Read src/lib/auth/'] },
    { name: 'Wave 2 — Write sections', items: ['Write ## Auth Flow', 'Write ## Secret Storage'] },
  ],
  reviewChecklist: ['No secrets in markdown', 'All claims linked to code'],
  compoundOpportunity: 'If auth pattern is novel, capture in docs/compound/.',
  exitCriteria: ['harness:validate passes', 'docs/SECURITY.md has no placeholders'],
}

describe('renderAndrePlan', () => {
  test('emits 10 H2 sections in canonical order (CA-07)', () => {
    const md = renderAndrePlan(SAMPLE_INPUT)
    expect(extractH2Sections(md)).toEqual([
      '## Goal',
      '## Scope',
      '## Assumptions',
      '## Risks',
      '## Execution Steps',
      '## Review Checklist',
      '## Validation Log',
      '## Compound Opportunity',
      '## Lessons Captured',
      '## Exit Criteria',
    ])
  })

  test('includes H1 with docPath', () => {
    const md = renderAndrePlan(SAMPLE_INPUT)
    expect(md.startsWith('# Populate: docs/SECURITY.md\n')).toBe(true)
  })

  test('renders Waves as H3 inside ## Execution Steps', () => {
    const md = renderAndrePlan(SAMPLE_INPUT)
    expect(md).toContain('### Wave 1 — Discovery')
    expect(md).toContain('### Wave 2 — Write sections')
  })

  test('renders Risks as markdown table', () => {
    const md = renderAndrePlan(SAMPLE_INPUT)
    expect(md).toContain('| Risco | Mitigacao |')
    expect(md).toContain('| Auth spread across multiple layers |')
  })

  test('Review Checklist uses checkbox syntax', () => {
    const md = renderAndrePlan(SAMPLE_INPUT)
    expect(md).toContain('- [ ] No secrets in markdown')
  })

  test('renders Scope with In/Out sub-blocks', () => {
    const md = renderAndrePlan(SAMPLE_INPUT)
    expect(md).toContain('**In:**')
    expect(md).toContain('**Out:**')
    expect(md).toContain('- Auth flow')
    expect(md).toContain('- Pentest results')
  })

  test('Validation Log + Lessons Captured emit empty placeholder comments', () => {
    const md = renderAndrePlan(SAMPLE_INPUT)
    expect(md).toContain('<!-- preencher durante execucao: comando + resultado -->')
    expect(md).toContain('<!-- preencher ao /iterate: links para docs/compound/ -->')
  })
})

describe('extractH2Sections', () => {
  test('returns only ## lines (ignores ### and #)', () => {
    const md = '# Title\n\n## A\n\n### Sub\n\n## B\n'
    expect(extractH2Sections(md)).toEqual(['## A', '## B'])
  })
})

const NODE_STACK: DetectedStack = {
  primary: 'node-ts',
  secondary: [],
  signalSource: 'package.json',
  anchorFiles: ['package.json'],
}
const RAILS_STACK: DetectedStack = {
  primary: 'rails',
  secondary: [],
  signalSource: 'Gemfile',
  anchorFiles: ['Gemfile'],
}
const FIXED_DATE = new Date('2026-05-21T10:00:00Z')

describe('generatePopulatePlans (pipeline)', () => {
  let tmpDir: string
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-plano04-fase03-'))
  })
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  test('generates exactly 16 plans for Node-TS stack (CA-01)', async () => {
    const result = await generatePopulatePlans({
      cwd: tmpDir,
      stack: NODE_STACK,
      clock: () => FIXED_DATE,
    })
    expect(result.plans.length).toBe(16)
    expect(result.stackPrimary).toBe('node-ts')
  })

  test('Rails FRONTEND.md plan contains app/views in Wave 1 (CA-04)', async () => {
    const result = await generatePopulatePlans({
      cwd: tmpDir,
      stack: RAILS_STACK,
      clock: () => FIXED_DATE,
    })
    const frontendPlan = result.plans.find(p => p.dst === 'docs/FRONTEND.md')
    expect(frontendPlan).toBeDefined()
    expect(frontendPlan!.content).toContain('app/views')
    expect(frontendPlan!.content).toContain('app/assets')
    expect(frontendPlan!.content).not.toContain('src/components')
  })

  test('Node-TS FRONTEND.md plan contains src/components in Wave 1', async () => {
    const result = await generatePopulatePlans({
      cwd: tmpDir,
      stack: NODE_STACK,
      clock: () => FIXED_DATE,
    })
    const frontendPlan = result.plans.find(p => p.dst === 'docs/FRONTEND.md')!
    expect(frontendPlan.content).toContain('src/components')
    expect(frontendPlan.content).not.toContain('app/views')
  })

  test('writes PLAN.md to disk under docs/exec-plans/active/{date}-populate-{slug}/', async () => {
    await generatePopulatePlans({ cwd: tmpDir, stack: NODE_STACK, clock: () => FIXED_DATE })
    const expectedPath = path.join(
      tmpDir,
      'docs',
      'exec-plans',
      'active',
      '2026-05-21-populate-docs-security-md',
      'PLAN.md',
    )
    const content = await fs.readFile(expectedPath, 'utf-8')
    expect(content).toContain('# Populate: docs/SECURITY.md')
    expect(content).toContain('## Goal')
    expect(content).toContain('## Exit Criteria')
  })

  test('clock is injectable — slug uses injected date', async () => {
    const result = await generatePopulatePlans({
      cwd: tmpDir,
      stack: NODE_STACK,
      clock: () => new Date('2030-01-15T00:00:00Z'),
    })
    expect(result.plans[0]!.path).toContain('2030-01-15-populate-')
  })

  test('re-run overwrites existing plans (D10 idempotency)', async () => {
    await generatePopulatePlans({ cwd: tmpDir, stack: NODE_STACK, clock: () => FIXED_DATE })
    const securityPath = path.join(
      tmpDir, 'docs', 'exec-plans', 'active', '2026-05-21-populate-docs-security-md', 'PLAN.md',
    )
    const first = await fs.readFile(securityPath, 'utf-8')

    await fs.writeFile(securityPath, '# TAMPERED', 'utf-8')

    await generatePopulatePlans({ cwd: tmpDir, stack: NODE_STACK, clock: () => FIXED_DATE })
    const second = await fs.readFile(securityPath, 'utf-8')

    expect(second).toBe(first)
    expect(second).not.toBe('# TAMPERED')
  })

  test('legacyArtifactsFound reflects manifest on disk', async () => {
    // LegacyEntrySchema usa found: literal(true) — apenas entradas found:true sao validas.
    // Fixture tem 2 entradas (ambas found:true) para match do count esperado.
    const manifestDir = path.join(tmpDir, '.claude')
    await fs.mkdir(manifestDir, { recursive: true })
    await fs.writeFile(
      path.join(manifestDir, 'legacy-manifest.json'),
      JSON.stringify({
        schemaVersion: '1.0',
        detectedAt: '2026-05-21T10:00:00Z',
        stack: { primary: 'node-ts', confidence: 'high' },
        legacy: [
          { type: 'planning', found: true, sourcePath: '.claude/planning/', action: 'moved' },
          { type: 'lessons', found: true, sourcePath: 'lessons-learned.md', action: 'reference-only' },
        ],
      }),
    )

    const result = await generatePopulatePlans({ cwd: tmpDir, stack: NODE_STACK, clock: () => FIXED_DATE })
    expect(result.legacyArtifactsFound).toBe(2)
  })

  test('legacyArtifactsFound === 0 when no manifest (greenfield)', async () => {
    const result = await generatePopulatePlans({ cwd: tmpDir, stack: NODE_STACK, clock: () => FIXED_DATE })
    expect(result.legacyArtifactsFound).toBe(0)
  })

  test('malformed manifest does not abort — logs warning and proceeds', async () => {
    const manifestDir = path.join(tmpDir, '.claude')
    await fs.mkdir(manifestDir, { recursive: true })
    await fs.writeFile(path.join(manifestDir, 'legacy-manifest.json'), '{ broken json')

    const result = await generatePopulatePlans({ cwd: tmpDir, stack: NODE_STACK, clock: () => FIXED_DATE })
    expect(result.plans.length).toBe(16)
    expect(result.legacyArtifactsFound).toBe(0)
  })

  test('performance: completes < 2000ms (NFR)', async () => {
    const start = performance.now()
    await generatePopulatePlans({ cwd: tmpDir, stack: NODE_STACK, clock: () => FIXED_DATE })
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(2000)
  })
})
