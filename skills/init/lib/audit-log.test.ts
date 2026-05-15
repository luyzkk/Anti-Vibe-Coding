import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { tmpdir } from 'node:os'
import { mkdtemp, mkdir, rm, readFile } from 'node:fs/promises'
import path from 'node:path'
import { AuditLogWriter } from './audit-log'

let tmp: string

beforeEach(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), 'audit-log-test-'))
  await mkdir(path.join(tmp, 'discovery'), { recursive: true })
})

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true })
})

describe('AuditLogWriter', () => {
  it('module exists and exports AuditLogWriter', () => {
    expect(typeof AuditLogWriter).toBe('function')
  })

  it('creates agents-log.json on first append', async () => {
    const writer = new AuditLogWriter(tmp, 'run-abc-123')
    await writer.append({
      subagent_id: 'explorer-01',
      input_paths: ['docs/DESIGN.md'],
      output_struct: { slot_match: 'docs/DESIGN.md', confidence: 0.9 },
      duration_ms: 1500,
      retry_count: 0,
    })

    const raw = await readFile(path.join(tmp, 'discovery', 'agents-log.json'), 'utf-8')
    const log = JSON.parse(raw)
    expect(log.run_id).toBe('run-abc-123')
    expect(log.entries).toHaveLength(1)
  })

  it('appends multiple entries preserving order', async () => {
    const writer = new AuditLogWriter(tmp, 'run-xyz')
    await writer.append({
      subagent_id: 'explorer-01',
      input_paths: ['docs/ADR-001.md'],
      output_struct: {},
      duration_ms: 800,
      retry_count: 0,
    })
    await writer.append({
      subagent_id: 'explorer-02',
      input_paths: ['docs/ADR-002.md', 'docs/ADR-003.md'],
      output_struct: {},
      duration_ms: 950,
      retry_count: 0,
    })

    const raw = await readFile(path.join(tmp, 'discovery', 'agents-log.json'), 'utf-8')
    const log = JSON.parse(raw)
    expect(log.entries).toHaveLength(2)
    expect(log.entries[0].subagent_id).toBe('explorer-01')
    expect(log.entries[1].subagent_id).toBe('explorer-02')
  })

  it('records error field when subagent failed', async () => {
    const writer = new AuditLogWriter(tmp, 'run-err')
    await writer.append({
      subagent_id: 'explorer-03',
      input_paths: ['docs/dense.md'],
      output_struct: null,
      duration_ms: 30000,
      retry_count: 1,
      error: 'Timeout after 30s',
    })

    const raw = await readFile(path.join(tmp, 'discovery', 'agents-log.json'), 'utf-8')
    const log = JSON.parse(raw)
    const entry = log.entries[0]
    expect(entry.error).toBe('Timeout after 30s')
    expect(entry.retry_count).toBe(1)
  })

  it('does not include file content in output_struct (caller responsibility)', async () => {
    // DT-07: sem PII — auditoria é de paths e metadados, nunca conteúdo de arquivo.
    // O writer aceita qualquer output_struct mas não valida conteúdo —
    // a responsabilidade de não incluir conteúdo cru é do caller (Plano 03).
    const writer = new AuditLogWriter(tmp, 'run-pii-test')
    await writer.append({
      subagent_id: 'reconciler',
      input_paths: ['docs/DESIGN.md'],
      output_struct: { decision: 'consolidate', slot: 'docs/DESIGN.md' },
      duration_ms: 2000,
      retry_count: 0,
    })

    const raw = await readFile(path.join(tmp, 'discovery', 'agents-log.json'), 'utf-8')
    const log = JSON.parse(raw)
    expect(log.entries[0].output_struct).not.toHaveProperty('file_content')
  })

  it('each entry has timestamp in ISO format', async () => {
    const writer = new AuditLogWriter(tmp, 'run-ts')
    await writer.append({
      subagent_id: 'compound-writer',
      input_paths: [],
      output_struct: {},
      duration_ms: 100,
      retry_count: 0,
    })

    const raw = await readFile(path.join(tmp, 'discovery', 'agents-log.json'), 'utf-8')
    const log = JSON.parse(raw)
    expect(log.entries[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('survives concurrent appends (sequential writes, no interleave)', async () => {
    const writer = new AuditLogWriter(tmp, 'run-concurrent')
    await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        writer.append({
          subagent_id: `explorer-0${i + 1}`,
          input_paths: [`docs/file-${i}.md`],
          output_struct: { index: i },
          duration_ms: 100 * (i + 1),
          retry_count: 0,
        }),
      ),
    )

    const raw = await readFile(path.join(tmp, 'discovery', 'agents-log.json'), 'utf-8')
    const log = JSON.parse(raw)
    expect(log.entries).toHaveLength(6)
  })
})
