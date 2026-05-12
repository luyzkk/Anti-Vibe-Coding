// 2026-05-12 (Luiz/dev): dry-run infra — CA-10, R14.
// WriteRecorder substitutes fs.writeFile during dry-run. Accumulates in memory.
// Plano 03 fase-06.

export type DryRunMode = {
  dryRun: boolean
  recorder?: WriteRecorder
}

export type RecordedWrite = {
  path: string
  bodyPreview: string  // first 200 chars
  bytes: number
}

export class WriteRecorder {
  private writes: RecordedWrite[] = []

  record(filePath: string, body: string): void {
    this.writes.push({
      path: filePath,
      bodyPreview: body.slice(0, 200),
      bytes: Buffer.byteLength(body, 'utf8'),
    })
  }

  list(): readonly RecordedWrite[] {
    return this.writes
  }

  count(): number {
    return this.writes.length
  }

  totalBytes(): number {
    return this.writes.reduce((sum, w) => sum + w.bytes, 0)
  }

  clear(): void {
    this.writes = []
  }
}

/**
 * Factory for a writeFile-compatible closure that redirects to a recorder in dry-run mode.
 * Each migration helper receives this closure via the `writeFile` option field.
 *
 * @example
 * const w = makeWriter({ dryRun: true, recorder: new WriteRecorder() })
 * await w('/path/to/file', 'content')  // recorded, not written
 */
export function makeWriter(mode: DryRunMode): (filePath: string, body: string) => Promise<void> {
  if (mode.dryRun && mode.recorder) {
    const recorder = mode.recorder
    return async (filePath: string, body: string): Promise<void> => {
      recorder.record(filePath, body)
    }
  }
  // Real writer — dynamically imported to avoid cost in dry-run paths.
  return async (filePath: string, body: string): Promise<void> => {
    const { promises: fs } = await import('node:fs')
    const path = await import('node:path')
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, body, 'utf8')
  }
}
