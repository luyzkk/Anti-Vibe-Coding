// M1.3 (2026-05-17): teste para helper que extrai emissão de eventos de telemetria do orquestrador.
// Verifica via side-effect real: lê o JSONL gerado por writeTelemetryDomainEvent em baseDir temp.
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, rmSync, readdirSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { emitStackKnowledgeEvents } from './emit-stack-knowledge-events'
import type { MatrixFolder, MultiStackResult } from './detect-multi-stack'

const DETECTION: MultiStackResult = {
  primary: 'nodejs-typescript' as MatrixFolder,
  secondary: [],
  anchor_files: ['package.json'],
}

const COPY_RESULT = {
  status: 'copied' as const,
  atomCount: 14,
  message: 'Stack detected: nodejs-typescript. Knowledge copied: 14 atoms.',
  destDir: '/tmp/fake/.claude/knowledge',
}

function readEvents(baseDir: string): Array<Record<string, unknown>> {
  const metricsDir = join(baseDir, '.claude', 'metrics')
  if (!existsSync(metricsDir)) return []
  const files = readdirSync(metricsDir).filter(f => f.endsWith('.jsonl'))
  const events: Array<Record<string, unknown>> = []
  for (const f of files) {
    const lines = readFileSync(join(metricsDir, f), 'utf-8').trim().split('\n').filter(Boolean)
    for (const line of lines) {
      events.push(JSON.parse(line) as Record<string, unknown>)
    }
  }
  return events
}

describe('emitStackKnowledgeEvents (M1.3)', () => {
  let baseDir: string

  beforeEach(() => {
    baseDir = mkdtempSync(join(tmpdir(), 'emit-events-'))
  })

  afterEach(() => {
    rmSync(baseDir, { recursive: true, force: true })
  })

  it('escreve exatamente 2 eventos no JSONL', () => {
    emitStackKnowledgeEvents({ detection: DETECTION, copyResult: COPY_RESULT, baseDir })
    const events = readEvents(baseDir)
    expect(events.length).toBe(2)
  })

  it('primeiro evento é stack_detected com campos corretos', () => {
    emitStackKnowledgeEvents({ detection: DETECTION, copyResult: COPY_RESULT, baseDir })
    const events = readEvents(baseDir)
    const ev = events.find(e => e.evento === 'stack_detected')
    expect(ev).toBeDefined()
    expect(ev?.primary).toBe('nodejs-typescript')
    expect(ev?.secondary).toEqual([])
    expect(ev?.anchor_files).toEqual(['package.json'])
    expect(ev?.skill_invocada).toBe('init')
  })

  it('segundo evento é knowledge_copied com campos corretos', () => {
    emitStackKnowledgeEvents({ detection: DETECTION, copyResult: COPY_RESULT, baseDir })
    const events = readEvents(baseDir)
    const ev = events.find(e => e.evento === 'knowledge_copied')
    expect(ev).toBeDefined()
    expect(ev?.stack).toBe('nodejs-typescript')
    expect(ev?.atom_count).toBe(14)
    expect(ev?.status).toBe('copied')
    expect(ev?.skill_invocada).toBe('init')
  })

  it('ambos eventos compartilham o mesmo timestamp', () => {
    emitStackKnowledgeEvents({ detection: DETECTION, copyResult: COPY_RESULT, baseDir })
    const events = readEvents(baseDir)
    const ts1 = events.find(e => e.evento === 'stack_detected')?.timestamp
    const ts2 = events.find(e => e.evento === 'knowledge_copied')?.timestamp
    expect(ts1).toBe(ts2)
  })

  it('timestamp explícito é propagado para ambos eventos', () => {
    const fixedTs = '2026-05-17T10:00:00.000Z'
    emitStackKnowledgeEvents({ detection: DETECTION, copyResult: COPY_RESULT, baseDir, timestamp: fixedTs })
    const events = readEvents(baseDir)
    expect(events.find(e => e.evento === 'stack_detected')?.timestamp).toBe(fixedTs)
    expect(events.find(e => e.evento === 'knowledge_copied')?.timestamp).toBe(fixedTs)
  })

  it('retorna void (fire-and-forget G7)', () => {
    const result = emitStackKnowledgeEvents({ detection: DETECTION, copyResult: COPY_RESULT, baseDir })
    expect(result).toBeUndefined()
  })
})
