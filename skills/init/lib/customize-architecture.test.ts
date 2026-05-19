// 2026-05-11 (Luiz/dev): testes parametricos cobrem cada stack id.
// Plano 02 fase-03. Atende PRD M3, CA-19, CA-20, CA-21.
// 2026-05-18 (Luiz/dev): D22 multi-stack contract — fixtures usam novo shape (Plano 01 fase-03).

import { describe, it, expect, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { customizeArchitecture } from './customize-architecture'
import type { DetectedStack } from './detect-stack'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'arch')
const TEMPLATE_BODY = `# Architecture

Project: {{PROJECT_NAME}}

<!-- INIT:STACK_BLOCK -->
<!-- This block is replaced by /init after stack detection. Do not edit by hand. -->

## Boundaries

Replace this scaffold with project-specific content.
`

async function setup(stack: DetectedStack): Promise<void> {
  await fs.rm(FIXTURE, { recursive: true, force: true })
  await fs.mkdir(FIXTURE, { recursive: true })
  await fs.writeFile(
    path.join(FIXTURE, 'ARCHITECTURE.md'),
    TEMPLATE_BODY.replaceAll('{{PROJECT_NAME}}', 'fixture-app'),
    'utf8',
  )
}

// 2026-05-18 (Luiz/dev): D22 — fixtures com novo shape { primary, secondary, signalSource, anchorFiles }
const cases: ReadonlyArray<{ stack: DetectedStack; expectedSubstring: string }> = [
  { stack: { primary: 'nextjs',   secondary: [], signalSource: 'package.json#dependencies.next',           anchorFiles: ['package.json'] }, expectedSubstring: 'Next.js framework detected' },
  { stack: { primary: 'rails',    secondary: [], signalSource: 'Gemfile#gem "rails"',                      anchorFiles: ['Gemfile'] },       expectedSubstring: 'Rails framework detected' },
  { stack: { primary: 'node-ts',  secondary: [], signalSource: 'package.json#devDependencies.typescript',  anchorFiles: ['package.json'] }, expectedSubstring: 'Node.js + TypeScript' },
  { stack: { primary: null,       secondary: [], signalSource: 'no signal',                                anchorFiles: [] },               expectedSubstring: 'document the stack manually' },
]

describe('customizeArchitecture', () => {
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  for (const { stack, expectedSubstring } of cases) {
    // 2026-05-18 (Luiz/dev): label usa stack.primary ?? 'unknown' (D22)
    it(`writes "${expectedSubstring}" for stack ${stack.primary ?? 'unknown'}`, async () => {
      await setup(stack)
      const result = await customizeArchitecture({
        targetDir: FIXTURE,
        stack,
        generatedAt: new Date('2026-05-11T00:00:00Z'),
      })

      expect(result.written).toBe(true)
      const body = await fs.readFile(path.join(FIXTURE, 'ARCHITECTURE.md'), 'utf8')
      expect(body).toContain(expectedSubstring)
      expect(body).toContain('Detected on: 2026-05-11')
      expect(body).not.toContain('<!-- INIT:STACK_BLOCK -->') // marker consumido
    })
  }

  it('is a no-op when marker is absent (already customized)', async () => {
    await fs.mkdir(FIXTURE, { recursive: true })
    await fs.writeFile(path.join(FIXTURE, 'ARCHITECTURE.md'), '# Architecture\n\n(no marker)\n', 'utf8')
    const result = await customizeArchitecture({
      targetDir: FIXTURE,
      stack: { primary: 'nextjs', secondary: [], signalSource: 'test', anchorFiles: [] },
    })
    expect(result.written).toBe(false)
  })
})
