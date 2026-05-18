import { describe, it, expect } from 'bun:test'
import { runInit } from './run-init'

describe('runInit with --additive-merge', () => {
  it('emits terminal warning at end', async () => {
    const lines: string[] = []
    const log = (l: string) => { lines.push(l) }
    await runInit(['--additive-merge'], { log, registry: [] })
    const combined = lines.join('\n')
    expect(combined).toMatch(/additive-merge.*v6\.3\.x/i)
    expect(combined).toMatch(/migrate later|re-run.*without/i)
  })

  it('does NOT emit warning without flag', async () => {
    const lines: string[] = []
    await runInit([], { log: (l) => { lines.push(l) }, registry: [] })
    expect(lines.join('\n')).not.toMatch(/additive-merge/)
  })
})
