// skills/init/lib/steps/13-import-progress-txt.ts
// 2026-05-19 (Luiz/dev): Plano 05 fase-02 — importa .claude/progress.txt em docs/compound/_imported/ (MH-10, CA-05).
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseProgressTxt } from '../progress-txt-parser'
import { writeCompoundImported } from '../compound-imported-writer'
import type { Step } from './types'

// 2026-05-19 (Luiz/dev): POSIX-style para garantir path sem backslash no frontmatter source: (G9).
const SOURCE_REL = '.claude/progress.txt'

/**
 * Step 13 — importa `.claude/progress.txt` (se existir) em `docs/compound/_imported/`.
 * Soft-fail: ausencia do arquivo retorna `{ mutated:false, summary:'... skipped' }`.
 * Cobre MH-10 e CA-05.
 */
export const importProgressTxtStep: Step = {
  id: '13-import-progress-txt',
  async run(ctx) {
    const sourceAbs = path.join(ctx.cwd, '.claude', 'progress.txt')
    let raw: string
    try {
      raw = await fs.readFile(sourceAbs, 'utf-8')
    } catch (e) {
      const err = e as NodeJS.ErrnoException
      if (err.code === 'ENOENT') {
        return { mutated: false, summary: 'no .claude/progress.txt — skipped (MH-10)' }
      }
      throw e
    }

    const entries = parseProgressTxt(raw)
    if (entries.length === 0) {
      return {
        mutated: false,
        summary: 'progress.txt present but parsed 0 entries — nothing to import',
      }
    }

    const result = await writeCompoundImported(entries, {
      targetDir: ctx.cwd,
      sourcePath: SOURCE_REL,
    })

    return {
      mutated: true,
      summary: `imported ${String(entries.length)} gotchas -> docs/compound/_imported/ (+ INDEX.md)`,
    }
  },
}
