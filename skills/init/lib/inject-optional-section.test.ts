import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { injectOptionalSection } from './inject-optional-section'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'inject')
const FILE = path.join(FIXTURE, 'AGENTS.md')

const BASE = `# AGENTS.md

## Required Working Rules

1. Foo

<!-- INIT:DELIVERY_LOOP_SLOT -->

## Pre-Mutation Gate

bar
`

const SNIPPET = `## Delivery Loop

Record a Loom and attach to Linear.
`

describe('injectOptionalSection', () => {
  beforeEach(async () => {
    await fs.rm(FIXTURE, { recursive: true, force: true })
    await fs.mkdir(FIXTURE, { recursive: true })
    await fs.writeFile(FILE, BASE, 'utf8')
  })
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('injects body after the marker', async () => {
    const result = await injectOptionalSection({
      filePath: FILE,
      marker: '<!-- INIT:DELIVERY_LOOP_SLOT -->',
      body: SNIPPET,
    })
    expect(result.status).toBe('injected')

    const body = await fs.readFile(FILE, 'utf8')
    const markerIdx = body.indexOf('<!-- INIT:DELIVERY_LOOP_SLOT -->')
    const sectionIdx = body.indexOf('## Delivery Loop')
    const gateIdx = body.indexOf('## Pre-Mutation Gate')

    expect(markerIdx).toBeGreaterThan(0)
    expect(sectionIdx).toBeGreaterThan(markerIdx) // depois do marker
    expect(sectionIdx).toBeLessThan(gateIdx)      // antes da Pre-Mutation Gate
  })

  it('is idempotent — second call is no-op', async () => {
    await injectOptionalSection({ filePath: FILE, marker: '<!-- INIT:DELIVERY_LOOP_SLOT -->', body: SNIPPET })
    const result2 = await injectOptionalSection({ filePath: FILE, marker: '<!-- INIT:DELIVERY_LOOP_SLOT -->', body: SNIPPET })
    expect(result2.status).toBe('already-present')

    const body = await fs.readFile(FILE, 'utf8')
    const occurrences = body.split('## Delivery Loop').length - 1
    expect(occurrences).toBe(1) // nao duplicou
  })

  it('returns marker-missing when marker absent', async () => {
    await fs.writeFile(FILE, '# no marker here\n', 'utf8')
    const result = await injectOptionalSection({
      filePath: FILE,
      marker: '<!-- INIT:DELIVERY_LOOP_SLOT -->',
      body: SNIPPET,
    })
    expect(result.status).toBe('marker-missing')
  })

  it('preserves marker for future re-injection', async () => {
    await injectOptionalSection({ filePath: FILE, marker: '<!-- INIT:DELIVERY_LOOP_SLOT -->', body: SNIPPET })
    const body = await fs.readFile(FILE, 'utf8')
    expect(body).toContain('<!-- INIT:DELIVERY_LOOP_SLOT -->') // marker mantido
  })
})
