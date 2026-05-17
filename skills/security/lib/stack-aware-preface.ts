// 2026-05-16 (Luiz/dev): preface helper — verify-work HIGH #4 (extract from inline replication in tests).
// Plano 01 fase-04 originalmente colocou a lógica em snippet TS dentro do SKILL.md. Mover para
// helper testável fecha o gap entre testes (que replicavam inline) e código real (que o agente executa).
// Plano 03 vai importar este helper nas 6 skills cross-stack restantes (template verbatim).
// D11: path fixo .claude/knowledge/INDEX.md. CA-09: graceful degradation (string vazia se ausente).

import { existsSync } from 'node:fs'
import { join } from 'node:path'

export const KNOWLEDGE_INDEX_RELATIVE = '.claude/knowledge/INDEX.md'

export const PREFACE_MESSAGE =
  'Antes do corpo desta skill, consulte `.claude/knowledge/INDEX.md` para padrões stack-specific deste projeto.'

/**
 * Returns the stack knowledge preface for the given project.
 *
 * @param projectRoot - The absolute path to the project root. The helper resolves
 *   `.claude/knowledge/INDEX.md` relative to this path. Callers typically pass
 *   `process.cwd()`, which assumes the skill is invoked from the project directory.
 *   If `projectRoot` does not contain `.claude/knowledge/INDEX.md`, returns '' silently
 *   (graceful CA-09 — preface absent does not warn or log).
 * @returns Empty string if INDEX.md absent (graceful); otherwise PREFACE_MESSAGE.
 */
export function getStackKnowledgePreface(projectRoot: string): string {
  const knowledgePath = join(projectRoot, '.claude', 'knowledge', 'INDEX.md')
  return existsSync(knowledgePath) ? PREFACE_MESSAGE : ''
}
