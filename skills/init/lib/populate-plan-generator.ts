// 2026-05-18 (Luiz/dev): Plano 02 fase-02 RED — stub para TDD cycle.
// Logica real implementada na fase GREEN. Exporta 4 simbolos publicos tipados.

/**
 * 2026-05-18 (Luiz/dev): D13+MH-02 do PRD — uma task por arquivo populavel.
 * Wave = 1 (paralelo) para tasks de populacao, Wave = 2 (barreira) para validate.
 */
export type PopulatePlanTask = {
  readonly targetPath: string
  readonly wave: 1 | 2
  readonly subagentRole: 'harness-populator' | 'harness-validator'
}

/**
 * 2026-05-18 (Luiz/dev): D1+D14+CH-03 do PRD — input do gerador.
 * `cwd` = projeto alvo; `clock` injetavel em testes; `sharedGlossary` opcional v1.
 */
export type PopulatePlanInput = {
  readonly cwd: string
  readonly projectName: string
  /** Injetavel em testes para determinismo. Default: () => new Date(). */
  readonly clock?: () => Date
  /** CH-03: terminologia compartilhada extraida do projeto (Planos 03+). Undefined em greenfield. */
  readonly sharedGlossary?: string
}

/**
 * 2026-05-18 (Luiz/dev): MH-01+G5 do plano02 — caminho do PLAN.md de populacao
 * em formato path-safe (Windows G5: sem `:`).
 */
export type PopulatePlanOutput = {
  /** Conteudo Markdown final, pronto para fs.writeFile. */
  readonly planMarkdown: string
  /** Caminho relativo ao cwd onde o Step 91 escrevera: `docs/exec-plans/active/{date}-populate-harness/PLAN.md`. */
  readonly relativePath: string
  /** Lista de tasks renderizadas (uteis para audit log + assertions de teste). */
  readonly tasks: ReadonlyArray<PopulatePlanTask>
}

/**
 * Gera o PLAN.md de populacao do harness a partir do TEMPLATE_MANIFEST e do
 * template canonico em `assets/snippets/populate-plan-template.md`.
 *
 * @throws Error('not implemented') — stub RED. Implementar na fase GREEN.
 */
export async function generatePopulatePlan(_input: PopulatePlanInput): Promise<PopulatePlanOutput> {
  throw new Error('not implemented')
}
