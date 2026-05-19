// skills/init/lib/compound-imported-writer.ts
import type { ProgressEntry } from './progress-txt-parser'

export type CompoundImportedResult = {
  filesWritten: string[]
  indexPath: string
}

export async function writeCompoundImported(
  _entries: ProgressEntry[],
  _opts: { targetDir: string; sourcePath: string },
): Promise<CompoundImportedResult> {
  throw new Error('not implemented')
}
