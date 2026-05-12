// 2026-05-12 (plan-executor): tests for parseLine, listPending, filterByStatus, pickNext, scoreByPriority
import { describe, it, expect } from 'bun:test'
import {
  parseLine,
  listPending,
  filterByStatus,
  pickNext,
  scoreByPriority,
} from './todo-utils'

describe('parseLine', () => {
  it('parses file-classified item with date as open', () => {
    const raw = '- [ ] {2026-01-15} {file:src/foo.ts:12} fix the bug'
    const result = parseLine(raw, 3)
    expect(result).not.toBeNull()
    expect(result!.state).toBe('open')
    expect(result!.date).toBe('2026-01-15')
    expect(result!.lineIndex).toBe(3)
    expect(result!.classifier).toEqual({ kind: 'file', path: 'src/foo.ts', line: 12 })
    expect(result!.description).toBe('fix the bug')
    expect(result!.raw).toBe(raw)
  })

  it('parses feature-classified item', () => {
    const raw = '- [ ] {feature:auth} add login page'
    const result = parseLine(raw, 0)
    expect(result).not.toBeNull()
    expect(result!.classifier).toEqual({ kind: 'feature', name: 'auth' })
    expect(result!.state).toBe('open')
    expect(result!.date).toBeNull()
  })

  it('parses item without classifier', () => {
    const raw = '- [ ] plain task description'
    const result = parseLine(raw, 5)
    expect(result).not.toBeNull()
    expect(result!.state).toBe('open')
    expect(result!.classifier).toBeNull()
    expect(result!.date).toBeNull()
    expect(result!.description).toBe('plain task description')
  })

  it('parses done item as done state', () => {
    const raw = '- [x] completed task'
    const result = parseLine(raw, 1)
    expect(result).not.toBeNull()
    expect(result!.state).toBe('done')
  })

  it('parses skipped item as skipped state', () => {
    const raw = '- [-] skipped task'
    const result = parseLine(raw, 2)
    expect(result).not.toBeNull()
    expect(result!.state).toBe('skipped')
  })

  it('returns null for header line', () => {
    expect(parseLine('# TODO', 0)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseLine('', 0)).toBeNull()
  })
})

describe('listPending', () => {
  it('returns only items with state open', () => {
    const items = [
      parseLine('- [ ] open one', 0)!,
      parseLine('- [x] done one', 1)!,
      parseLine('- [-] skipped one', 2)!,
      parseLine('- [ ] open two', 3)!,
    ]
    const pending = listPending(items)
    expect(pending).toHaveLength(2)
    expect(pending.every((i) => i.state === 'open')).toBe(true)
  })
})

describe('filterByStatus', () => {
  it('filters by done state', () => {
    const items = [
      parseLine('- [ ] open', 0)!,
      parseLine('- [x] done one', 1)!,
      parseLine('- [x] done two', 2)!,
    ]
    const done = filterByStatus(items, 'done')
    expect(done).toHaveLength(2)
    expect(done.every((i) => i.state === 'done')).toBe(true)
  })

  it('filters by skipped state', () => {
    const items = [
      parseLine('- [-] skipped', 0)!,
      parseLine('- [ ] open', 1)!,
    ]
    expect(filterByStatus(items, 'skipped')).toHaveLength(1)
  })
})

describe('pickNext', () => {
  it('returns first open item using oldest strategy', () => {
    const items = [
      parseLine('- [x] done', 0)!,
      parseLine('- [ ] second open', 1)!,
      parseLine('- [ ] third open', 2)!,
    ]
    const result = pickNext(items, 'oldest')
    expect(result).not.toBeNull()
    expect(result!.lineIndex).toBe(1)
  })

  it('returns null when no open items', () => {
    const items = [
      parseLine('- [x] done', 0)!,
      parseLine('- [-] skipped', 1)!,
    ]
    expect(pickNext(items, 'oldest')).toBeNull()
  })
})

describe('scoreByPriority', () => {
  it('returns days since date when date is present', () => {
    const item = parseLine('- [ ] {2026-01-01} task with date', 0)!
    const today = new Date('2026-01-11T00:00:00Z')
    const score = scoreByPriority(item, today)
    expect(score).toBe(10)
  })

  it('returns 0 when date is null', () => {
    const item = parseLine('- [ ] no date task', 0)!
    const score = scoreByPriority(item)
    expect(score).toBe(0)
  })
})
