// skills/init/lib/steps/06-install-gh-files.ts
// 2026-05-21 (Luiz/dev): Step 6 — install-gh-files REAL (init v7, Plano 03 fase-02).
// Envolve installGhFiles (lib existente) com skip-if-exists guard no nivel do step.
// PRD CA-08 (idempotencia), D4 (sem dry-run), D14 (sempre instala .github/).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { installGhFiles } from '../install-gh-files'
import type { Step, StepContext, StepReport } from './types'

async function fileExists(p: string): Promise<boolean> {
  // 2026-05-21 (Luiz/dev): helper local — mesmo padrao do scaffold-full-tree.ts:39.
  // Nao reusar de scaffold-full-tree porque a fn nao e exportada (privada). Manter aqui.
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

export const installGhFilesStep: Step = {
  id: '06-install-gh-files',

  async run(ctx: StepContext): Promise<StepReport> {
    let installed = 0
    let skipped = 0

    // 2026-05-21 (Luiz/dev): writer custom com skip-if-exists guard (CA-08).
    // Lib install-gh-files.ts:31-34 default writer sobrescreve sempre — envolvemos com
    // guard para preservar arquivos do usuario. Sem modificar a lib (minimiza superficie —
    // DI-Plano03-fase02-install-gh-skip-policy opcao (a)).
    const writer = async (dstPath: string, body: string): Promise<void> => {
      if (await fileExists(dstPath)) {
        skipped += 1
        return
      }
      await fs.mkdir(path.dirname(dstPath), { recursive: true })
      await fs.writeFile(dstPath, body, 'utf8')
      installed += 1
    }

    await installGhFiles(ctx.cwd, { writeFile: writer })

    // 2026-05-21 (Luiz/dev): summary multilinha observability (PRD NFR linha 211).
    // Metricas: ghFilesInstalled, ghFilesSkipped — analogo ao Step 5 (placeholdersCreated/Skipped).
    const lines = [
      `ghFilesInstalled: ${String(installed)}`,
      `ghFilesSkipped: ${String(skipped)}`,
    ]

    return {
      // 2026-05-21 (Luiz/dev): mutated true se algum arquivo foi escrito; false se tudo skipou.
      // Mais preciso que Step 5 (que sempre retorna true por causa do link). Aqui temos info exata.
      mutated: installed > 0,
      summary: lines.join('\n'),
    }
  },
}
