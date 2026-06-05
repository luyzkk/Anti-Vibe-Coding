// 2026-05-24 (Luiz/dev): encapsula Skill tool — D20 + R9 (substituivel se interface mudar)
// IMPORTANTE: nao usa subprocess (CA-16). Nao importa lib de lessons-learned (CA-17).

export type InvokeLessonsResult = {
  invoked: boolean
  noteCreated?: string // path da nota se completion signal trouxer
  rawOutput: string
}

/**
 * Estrutura o args literal para lessons-learned add.
 * NOTA: a invocacao real e feita pelo runtime do Claude Code interpretando o SKILL.md.
 * Esta funcao apenas estrutura o payload — nao chama subprocess nem Skill diretamente.
 */
export function buildLessonsLearnedInvocation(title: string): string {
  // 2026-05-24 (Luiz/dev): args literal compativel com lessons-learned add — RT-02
  return `add "${title.replace(/"/g, '\\"')}"`
}

export function parseLessonsLearnedCompletion(output: string): InvokeLessonsResult {
  // 2026-05-24 (Luiz/dev): completion signal YAML padrao — D33 da lessons-learned
  const yamlBlockMatch = output.match(/```yaml\s*\n([\s\S]*?)\n```/)
  if (!yamlBlockMatch) return { invoked: true, rawOutput: output }
  const yaml = yamlBlockMatch[1] ?? ''
  const noteCreated = yaml.match(/note_created:\s*['"]?([^'"\n]+)['"]?/)?.[1]?.trim()
  // exactOptionalPropertyTypes: so inclui noteCreated quando definido.
  return {
    invoked: true,
    rawOutput: output,
    ...(noteCreated !== undefined ? { noteCreated } : {}),
  }
}
