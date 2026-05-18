import { describe, it, expect } from 'bun:test'
import { isDryRun, getRecorder, getDryRunMode, RenameRecorder, makeRenamer } from './dry-run-mode'
import { WriteRecorder } from './dry-run'
import type { StepContext } from './steps/types'

const mkCtx = (flags: Record<string, unknown> = {}): StepContext => ({
  cwd: '/tmp/test',
  args: [],
  flags: flags as Record<string, boolean | string>,
})

describe('isDryRun', () => {
  it('returns true when dry-run flag is set', () => {
    expect(isDryRun(mkCtx({ 'dry-run': true }))).toBe(true)
  })
  it('returns false when flag absent', () => {
    expect(isDryRun(mkCtx())).toBe(false)
  })
})

describe('getRecorder', () => {
  it('returns WriteRecorder instance when propagated via ctx', () => {
    const rec = new WriteRecorder()
    expect(getRecorder(mkCtx({ __dryRunRecorder: rec }))).toBe(rec)
  })
  it('returns undefined when slot is empty', () => {
    expect(getRecorder(mkCtx({ 'dry-run': true }))).toBeUndefined()
  })
})

describe('getDryRunMode', () => {
  it('returns { dryRun: false } when not in dry-run', () => {
    expect(getDryRunMode(mkCtx())).toEqual({ dryRun: false })
  })
  it('returns { dryRun: true, recorder } in dry-run', () => {
    const rec = new WriteRecorder()
    const mode = getDryRunMode(mkCtx({ 'dry-run': true, __dryRunRecorder: rec }))
    expect(mode.dryRun).toBe(true)
    expect(mode.recorder).toBe(rec)
  })
})

describe('RenameRecorder', () => {
  it('records renames and reports count', () => {
    const rec = new RenameRecorder()
    rec.record('/a.md', '/b.md')
    rec.record('/c.md', '/d.md')
    expect(rec.count()).toBe(2)
    expect(rec.list()).toHaveLength(2)
    expect(rec.list()[0]).toEqual({ from: '/a.md', to: '/b.md' })
  })
})

describe('makeRenamer', () => {
  it('in dry-run records rename without touching disk', async () => {
    const rec = new RenameRecorder()
    const renamer = makeRenamer({ dryRun: true, renameRecorder: rec })
    await renamer('/from.md', '/to.md')
    expect(rec.count()).toBe(1)
  })
})
