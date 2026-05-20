// skills/init/lib/steps/03_1-persist-stack-and-knowledge.ts
import { runStackKnowledgeInit } from '../run-stack-knowledge-init'
import type { RunStackKnowledgeInitOpts, RunStackKnowledgeInitResult } from '../run-stack-knowledge-init'
import type { Step } from './types'
import { resolvePluginRoot } from './helpers'

// 2026-05-17 (Luiz/dev): DI-2 — runner injetavel para testes (sem mock.module).
// Compound note 2026-05-16-bun-mock-module-pollution.md.
export type StackKnowledgeRunner = (opts: RunStackKnowledgeInitOpts) => Promise<RunStackKnowledgeInitResult>

// 2026-05-17 (Luiz/dev): summary vazia — runStackKnowledgeInit emite seus proprios logs via console.log
// (Wave 5 D2, confirmado em run-stack-knowledge-init.ts linha 53: logger = console.log por default).
// mutated: true pois orquestrador escreve .claude/stack.json e copia knowledge files.
// G5 do plano: NAO chamamos parseRefreshFlag aqui — orquestrador ja chama internamente.
// ctx.args.join(' ') re-junta array em string; limite: args com espacos internos perdem quoting.
// Para --refresh-knowledge (sem espaco), ok. Documentado para futuros args posicionais.
export async function runPersistStackKnowledgeStep(
  ctx: { cwd: string; args: readonly string[]; flags?: Record<string, unknown> },
  runner: StackKnowledgeRunner = runStackKnowledgeInit,
  pluginRootOverride?: string,
): Promise<{ mutated: boolean; summary: string }> {
  const pluginRoot = pluginRootOverride ?? resolvePluginRoot(import.meta.dir)
  // 2026-05-20 (Luiz/dev): D5.B.2 do PRD knowledge-path-cutover — refresh quando re-populate.
  // Greenfield (flags ausente ou __reentryMode !== 're-populate') usa false (CA-07).
  // --refresh-knowledge CLI continua ortogonal (parseRefreshFlag em run-stack-knowledge-init).
  const refresh = ctx.flags?.['__reentryMode'] === 're-populate'
  await runner({ targetDir: ctx.cwd, pluginRoot, args: ctx.args.join(' '), refresh })
  return { mutated: true, summary: '' }
}

export const persistStackKnowledgeStep: Step = {
  id: 'persist-stack-and-knowledge',
  async run(ctx) {
    // 2026-05-18 (Luiz/dev): Quick Plan /init v6.4.0 fix — dry-run guard (escopo estendido).
    // runStackKnowledgeInit orquestra writeStackJson + copyKnowledge + emitStackKnowledgeEvents
    // + fs.writeFile inline (patch stack.json). Threadar writer pela cadeia toda eh refactor grande;
    // guard no step preserva o no-write contract de dry-run sem mexer nos helpers.
    if (ctx.flags['dry-run'] === true) {
      return {
        mutated: false,
        summary: 'dry-run: stack.json + knowledge atoms + metrics would be persisted (orchestrator skipped)',
      }
    }
    return runPersistStackKnowledgeStep(ctx)
  },
}
