import { describe, it, expect } from 'bun:test'
import { looksComplete } from './orphan-plan-detector'

describe('looksComplete (orphan plan detector)', () => {
  it('returns false when plan has unchecked todos', () => {
    const content = '## Steps\n- [ ] Do thing\n- [x] Other thing\n'
    expect(looksComplete(content)).toBe(false)
  })

  it('returns false when plan has "Remaining work" header', () => {
    const content = '## Exit Criteria\n- [x] all done\n\n## Remaining work\n- Refactor X\n'
    expect(looksComplete(content)).toBe(false)
  })

  it('returns false when plan has "in progress" anywhere', () => {
    const content = '## Status\nIn progress.\n\n## Exit Criteria\n- [x] all done\n'
    expect(looksComplete(content)).toBe(false)
  })

  it('CA-28: returns true when Exit Criteria marked + Validation Log passed', () => {
    const content = `## Exit Criteria
- [x] Tests pass
- [x] Lint clean

## Validation Log
harness:validate ✅
`
    expect(looksComplete(content)).toBe(true)
  })

  it('returns true with Lessons Captured + Exit Criteria done', () => {
    const content = `## Exit Criteria
All done.

## Lessons Captured
Linked to docs/compound/X.md
`
    expect(looksComplete(content)).toBe(true)
  })

  it('returns false with only 1 signal (Exit Criteria but no Validation Log)', () => {
    const content = '## Exit Criteria\n- [x] done\n'
    expect(looksComplete(content)).toBe(false)
  })

  it('G6: returns true on "ready for production" phrase + Exit Criteria done', () => {
    const content = '## Exit Criteria\n- [x] done\n\nReady for production deployment.\n'
    expect(looksComplete(content)).toBe(true)
  })

  it('returns false on empty/minimal plan', () => {
    expect(looksComplete('# Plan: foo\n\nTBD.\n')).toBe(false)
  })
})
