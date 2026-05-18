import { describe, it, expect } from 'bun:test'
import { tmpdir } from 'node:os'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { createAuditLogWriterForCtx } from './audit-log-writer-factory'
import { AuditLogWriter } from './audit-log'

describe('createAuditLogWriterForCtx', () => {
  it('creates a real AuditLogWriter when runId is valid', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'factory-test-'))
    try {
      await mkdir(path.join(tmp, 'discovery'), { recursive: true })
      const writer = createAuditLogWriterForCtx(tmp, 'run-uuid-123')
      expect(writer).not.toBeNull()
      expect(writer).toBeInstanceOf(AuditLogWriter)
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })

  it('returns null when runId is null', () => {
    const writer = createAuditLogWriterForCtx('/some/path', null)
    expect(writer).toBeNull()
  })

  it('returns null when runId is empty string', () => {
    const writer = createAuditLogWriterForCtx('/some/path', '')
    expect(writer).toBeNull()
  })

  it('returns null when disabled option is true', async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), 'factory-disabled-'))
    try {
      const writer = createAuditLogWriterForCtx(tmp, 'run-uuid-456', { disabled: true })
      expect(writer).toBeNull()
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })
})
