// skills/init/lib/steps/09-copy-knowledge.ts
// 2026-05-21 (Luiz/dev): Plano 05 fase-02 — port de 03_1-persist-stack-and-knowledge.ts. D4 removido.
// RF-11: stack=null skip gracioso (NAO aborta — diferente do Step 7 DR-2).

import { runStackKnowledgeInit } from '../run-stack-knowledge-init'
import type { RunStackKnowledgeInitOpts, RunStackKnowledgeInitResult } from '../run-stack-knowledge-init'
import type { Step } from './types'
import { resolvePluginRoot } from './helpers'

// 2026-05-21 (Luiz/dev): DI-2 — runner injetavel preservado de 03_1-persist-stack-and-knowledge.ts.
// Compound note 2026-05-16-bun-mock-module-pollution.md.
export type StackKnowledgeRunner = (opts: RunStackKnowledgeInitOpts) => Promise<RunStackKnowledgeInitResult>

export async function runCopyKnowledgeStep(
  ctx: { cwd: string; args: readonly string[]; flags?: Readonly<Record<string, boolean | string>> },
  runner: StackKnowledgeRunner = runStackKnowledgeInit,
  pluginRootOverride?: string,
): Promise<{ mutated: boolean; summary: string }> {
  const pluginRoot = pluginRootOverride ?? resolvePluginRoot(import.meta.dir)
  // 2026-05-21 (Luiz/dev): D5.B.2 do PRD knowledge-path-cutover — refresh quando re-populate.
  // Greenfield (flags ausente ou __reentryMode !== 're-populate') usa false.
  const refresh = ctx.flags?.['__reentryMode'] === 're-populate'
  const result = await runner({
    targetDir: ctx.cwd,
    pluginRoot,
    args: ctx.args.join(' '),
    refresh,
  })

  // 2026-05-21 (Luiz/dev): summary single-line stack-aware (DI-Plano05-fase02-summary-format).
  // RF-11: primary=null e estado valido — summary indica skip mas mutated=true (stack.json escrito).
  const primary = result.stackPrimary ?? 'none'
  const status = result.copyResult.status
  const summary =
    result.stackPrimary === null
      ? `copy-knowledge: skipped (no stack detected, status=${status})`
      : `copy-knowledge: stack=${primary}, status=${status}`

  return { mutated: true, summary }
}

export const copyKnowledgeStep: Step = {
  id: 'copy-knowledge',
  async run(ctx) {
    // 2026-05-21 (Luiz/dev): D4 — mutacao incondicional. Guard removido em relacao ao antigo step 03_1 (linhas 38-43).
    return runCopyKnowledgeStep(ctx)
  },
}
