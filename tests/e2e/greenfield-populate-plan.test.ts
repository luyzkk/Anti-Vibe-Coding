// 2026-05-18 (Luiz/dev): CA-01 do PRD — tracer bullet feature-wide.
// Greenfield → /init → existe PLAN.md de populacao com >=1 task por arquivo harness.
// MH-01, MH-02 do PRD validados aqui em integracao.
// DI-1 da fase-04: registry injetado para mockar finalValidationStep NAO necessario —
// scaffoldTemplates (Step 01) cria scripts/harness-validate.ts, então finalValidation passa.
// GT-1 confirmado: harness-validate.ts NAO esta no TEMPLATE_MANIFEST mas e criado por
// scaffoldTemplates (base files), portanto finalValidation nao aborta em greenfield.
import { describe, expect, test } from 'bun:test'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { runInit } from '../../skills/init/lib/run-init'
import { TEMPLATE_MANIFEST } from '../../skills/init/lib/template-manifest'

const FIXTURE_DIR = path.join(import.meta.dir, '..', 'fixtures', 'greenfield-populate-plan-tracer')

// Replicar exatamente os filtros de populate-plan-generator.ts para calcular expected.
// Desacoplado do literal numerico — se TEMPLATE_MANIFEST crescer, test permanece valido (G9).
const EXCLUDED_FROM_POPULATION = new Set([
  'docs/COMPOUND_ENGINEERING.md',
  'docs/PRODUCT_SENSE.md',
  'README.md',
])
const EXCLUDED_PATTERNS = [/^\.github\//, /^scripts\//]

function isPopulatable(dst: string): boolean {
  if (!dst.endsWith('.md')) return false
  if (EXCLUDED_FROM_POPULATION.has(dst)) return false
  if (EXCLUDED_PATTERNS.some(rx => rx.test(dst))) return false
  return true
}

async function setupGreenfield(): Promise<string> {
  const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-greenfield-'))
  // Copia o fixture (apenas .gitkeep — efetivamente vazio).
  await fs.cp(FIXTURE_DIR, tmpdir, { recursive: true })
  return tmpdir
}

describe('greenfield populate-plan tracer (CA-01)', () => {
  test('runInit emits PLAN.md de populacao with >=1 task per populatable harness file', async () => {
    const cwd = await setupGreenfield()

    // 2026-05-18 (Luiz/dev): askUser stub necessario para deliveryLoopStep (Step 14).
    // Sem injecao, step retorna needsUser e dispatcher skip silencioso — nao trava.
    // Injetar 'N' para comportamento deterministico (entrega sem Delivery Loop).
    // log: () => {} suprime output no CI.
    const result = await runInit([], {
      cwd,
      log: () => {},
      askUser: async () => 'N',
    })

    expect(result).toBeDefined()
    // 2026-05-18 (Luiz/dev): greenfield deve concluir sem abort.
    expect(result.kind).toBe('ok')

    // 1) Existe a pasta {date}-populate-harness/ em docs/exec-plans/active/
    const activeDir = path.join(cwd, 'docs', 'exec-plans', 'active')
    const entries = await fs.readdir(activeDir)
    // 2026-05-18 (Luiz/dev): regex tolera mtime — evita flakiness por timestamp (G5).
    const populateDirs = entries.filter(e =>
      /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z-populate-harness$/.test(e)
    )
    expect(populateDirs).toHaveLength(1)

    // 2) PLAN.md existe na pasta.
    const planPath = path.join(activeDir, populateDirs[0]!, 'PLAN.md')
    const planContent = await fs.readFile(planPath, 'utf8')

    // 3) Count de `### Task: Populate \`` >= numero de arquivos populaveis do TEMPLATE_MANIFEST.
    // 2026-05-18 (Luiz/dev): desacoplado do literal numerico (G9 do plano).
    const expectedTaskCount = TEMPLATE_MANIFEST.filter(e => isPopulatable(e.dst)).length
    const taskOccurrences = (planContent.match(/### Task: Populate `/g) ?? []).length
    expect(taskOccurrences).toBe(expectedTaskCount)
    // Sanity: manifest atual tem 25 arquivos populaveis.
    expect(expectedTaskCount).toBeGreaterThanOrEqual(20)

    // 4) Filosoficos NAO aparecem como tasks.
    expect(planContent).not.toContain('### Task: Populate `docs/COMPOUND_ENGINEERING.md`')
    expect(planContent).not.toContain('### Task: Populate `docs/PRODUCT_SENSE.md`')

    // 5) README NAO aparece.
    expect(planContent).not.toContain('### Task: Populate `README.md`')

    // 6) Ultima task eh validate harness (literal).
    expect(planContent).toContain('### Task: Validate Harness')
    expect(planContent).toContain('bun run scripts/harness-validate.ts && bun run scripts/compound-check.ts')

    // 7) Wave markers presentes.
    expect(planContent).toContain('<!-- wave: 1')
    expect(planContent).toContain('<!-- wave: 2')

    // 8) Sem `## Glossario Compartilhado` (greenfield = sharedGlossary undefined).
    expect(planContent).not.toContain('## Glossario Compartilhado')
  }, 60_000)  // 60s timeout — RNF-01 (<30s) + margem para CI lento.

  test('init does NOT invoke /anti-vibe-coding:execute-plan automatically (G1 / D3)', async () => {
    const cwd = await setupGreenfield()

    await runInit([], {
      cwd,
      log: () => {},
      askUser: async () => 'N',
    })

    // PLAN.md de populacao existe, mas NENHUMA evidencia de execucao:
    // - Nenhum arquivo do harness foi populado (continuam placeholders).
    // Heuristica: docs/SECURITY.md ainda contem o conteudo do template (placeholder).
    // O template canonico contem marcadores tipo `{{PROJECT_NAME}}` ja renderizados pelo scaffold,
    // mas a estrutura do template original (headings tipicos) deve estar intacta.
    // Assertion fraca mas suficiente para o tracer: arquivo nao virou conteudo real populado.
    const securityPath = path.join(cwd, 'docs', 'SECURITY.md')
    const securityContent = await fs.readFile(securityPath, 'utf8')
    // Template canonico eh pequeno; conteudo populado seria > 5000 chars.
    expect(securityContent.length).toBeLessThan(5000)
  }, 60_000)
})
