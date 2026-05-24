// skills/init/lib/steps/inject-harness-scripts.ts
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Step, StepContext, StepReport } from './types'

const HARNESS_SCRIPTS: Record<string, string> = {
  'harness:validate': 'bun run scripts/harness-validate.ts',
  'compound:check': 'bun run scripts/compound-check.ts',
  'harness:all': 'bun run harness:validate && bun run compound:check',
}

export const injectHarnessScriptsStep: Step = {
  id: 'inject-harness-scripts',

  async run(ctx: StepContext): Promise<StepReport> {
    const pkgPath = path.join(ctx.cwd, 'package.json')

    try {
      await fs.access(pkgPath)
    } catch {
      return { mutated: false, summary: 'skipped: package.json not found (scaffold will create via template)' }
    }

    const raw = await fs.readFile(pkgPath, 'utf8')
    const pkg = JSON.parse(raw) as Record<string, unknown>

    if (typeof pkg['scripts'] !== 'object' || pkg['scripts'] === null) {
      pkg['scripts'] = {}
    }
    const scripts = pkg['scripts'] as Record<string, string>

    let added = 0
    for (const [key, val] of Object.entries(HARNESS_SCRIPTS)) {
      if (!(key in scripts)) {
        scripts[key] = val
        added++
      }
    }

    if (added > 0) {
      await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
    }

    return {
      mutated: added > 0,
      summary: `scriptsAdded: ${String(added)}`,
    }
  },
}
