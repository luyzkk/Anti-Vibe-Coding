// 2026-05-11 (Luiz/dev): testes parametricos cobrem cada stack id.
// Plano 02 fase-03. Atende PRD M3, CA-19, CA-20, CA-21.

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

const cases: ReadonlyArray<{ stack: DetectedStack; expectedSubstring: string }> = [
  { stack: { id: 'nextjs', signalSource: 'package.json#dependencies.next' }, expectedSubstring: 'Next.js framework detected' },
  { stack: { id: 'rails',  signalSource: 'Gemfile#gem "rails"' },            expectedSubstring: 'Rails framework detected' },
  { stack: { id: 'node-ts', signalSource: 'package.json#devDependencies.typescript' }, expectedSubstring: 'Node.js + TypeScript' },
  { stack: { id: 'unknown', signalSource: 'no signal' },                     expectedSubstring: 'document the stack manually' },
]

describe('customizeArchitecture', () => {
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  for (const { stack, expectedSubstring } of cases) {
    it(`writes "${expectedSubstring}" for stack ${stack.id}`, async () => {
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
      stack: { id: 'nextjs', signalSource: 'test' },
    })
    expect(result.written).toBe(false)
  })
})
