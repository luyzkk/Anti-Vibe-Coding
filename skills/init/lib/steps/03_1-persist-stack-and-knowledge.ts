// skills/init/lib/steps/03_1-persist-stack-and-knowledge.ts
import { runStackKnowledgeInit } from '../run-stack-knowledge-init'
import type { RunStackKnowledgeInitOpts, RunStackKnowledgeInitResult } from '../run-stack-knowledge-init'
import type { Step } from './types'
import { resolvePluginRoot } from './helpers'

// 2026-05-17 (Luiz/dev): DI-2 — runner injetavel para testes (sem mock.module).
// Compound note 2026-05-16-bun-mock-module-pollution.md.
type StackKnowledgeRunner = (opts: RunStackKnowledgeInitOpts) => Promise<RunStackKnowledgeInitResult>

// 2026-05-17 (Luiz/dev): summary vazia — runStackKnowledgeInit emite seus proprios logs via console.log
// (Wave 5 D2, confirmado em run-stack-knowledge-init.ts linha 53: logger = console.log por default).
// mutated: true pois orquestrador escreve .claude/stack.json e copia knowledge files.
// G5 do plano: NAO chamamos parseRefreshFlag aqui — orquestrador ja chama internamente.
// ctx.args.join(' ') re-junta array em string; limite: args com espacos internos perdem quoting.
// Para --refresh-knowledge (sem espaco), ok. Documentado para futuros args posicionais.
export async function runPersistStackKnowledgeStep(
  ctx: { cwd: string; args: readonly string[] },
  runner: StackKnowledgeRunner = runStackKnowledgeInit,
  pluginRootOverride?: string,
): Promise<{ mutated: boolean; summary: string }> {
  const pluginRoot = pluginRootOverride ?? resolvePluginRoot(import.meta.dir)
  await runner({ targetDir: ctx.cwd, pluginRoot, args: ctx.args.join(' ') })
  return { mutated: true, summary: '' }
}

export const persistStackKnowledgeStep: Step = {
  id: 'persist-stack-and-knowledge',
  async run(ctx) {
    return runPersistStackKnowledgeStep(ctx)
  },
}
