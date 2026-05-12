// 2026-05-12 (Luiz/dev): tests for state-md-hook PostToolUse handler
'use strict'
const { describe, it, expect, beforeEach } = require('bun:test')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { handle } = require('./state-md-hook.cjs')

const FIXTURE = path.resolve(__dirname, '..', 'tests', 'fixtures', 'v6-state-fixture')
const LOCK_PATH = path.join(os.homedir(), '.claude', 'cache', 'state-md-last-run.json')

function resetLock() {
  if (fs.existsSync(LOCK_PATH)) fs.unlinkSync(LOCK_PATH)
}

describe('state-md-hook', () => {
  beforeEach(() => resetLock())

  it('regenerates STATE.md when Edit touches docs/compound/', async () => {
    const result = await handle({
      tool: 'Edit',
      tool_input: { file_path: path.join(FIXTURE, 'docs', 'compound', '2026-05-12-bar.md') },
      project_root: FIXTURE,
    })
    expect(result.regenerated).toBe(true)
    expect(fs.existsSync(path.join(FIXTURE, 'docs', 'STATE.md'))).toBe(true)
  })

  it('skips when file outside relevant patterns', async () => {
    const result = await handle({
      tool: 'Edit',
      tool_input: { file_path: path.join(FIXTURE, 'src', 'foo.ts') },
      project_root: FIXTURE,
    })
    expect(result.skipped).toBe('path_not_relevant')
  })

  it('skips when tool is Bash', async () => {
    const result = await handle({
      tool: 'Bash',
      tool_input: { command: 'ls' },
      project_root: FIXTURE,
    })
    expect(result.skipped).toBe('wrong_tool')
  })

  it('rate-limits 2 consecutive calls (only first regenerates)', async () => {
    const input = {
      tool: 'Edit',
      tool_input: { file_path: path.join(FIXTURE, 'docs', 'compound', '2026-05-12-bar.md') },
      project_root: FIXTURE,
    }
    const first = await handle(input)
    expect(first.regenerated).toBe(true)
    const second = await handle(input)
    expect(second.skipped).toBe('rate_limit')
  })

  it('matches TODO.md at project root', async () => {
    const todoPath = path.join(FIXTURE, 'TODO.md')
    if (!fs.existsSync(todoPath)) fs.writeFileSync(todoPath, '- [ ] foo\n')
    const result = await handle({
      tool: 'Edit',
      tool_input: { file_path: todoPath },
      project_root: FIXTURE,
    })
    expect(result.regenerated).toBe(true)
  })

  it('does not crash on missing file_path', async () => {
    const result = await handle({ tool: 'Edit', tool_input: {} })
    expect(result.skipped).toBe('no_file_path')
  })

  it('matches ADR file but not README.md in design-docs/', async () => {
    const adr = path.join(FIXTURE, 'docs', 'design-docs', 'ADR-0001-x.md')
    const readme = path.join(FIXTURE, 'docs', 'design-docs', 'README.md')
    const r1 = await handle({ tool: 'Edit', tool_input: { file_path: adr }, project_root: FIXTURE })
    expect(r1.regenerated).toBe(true)
    resetLock()
    const r2 = await handle({ tool: 'Edit', tool_input: { file_path: readme }, project_root: FIXTURE })
    expect(r2.skipped).toBe('path_not_relevant')
  })
})
