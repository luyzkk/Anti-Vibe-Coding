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
// 2026-05-19 (Luiz/dev): Plano 01 fase-03 — single source of truth.
// Importa EXCLUDED do generator em vez de duplicar local (CLAUDE.md global: "Uma fonte de verdade").
// Sincronizado com D5 do PRD populate-plan-andre-port: so COMPOUND_ENGINEERING permanece excluido.
import { EXCLUDED_FROM_POPULATION_V2 as EXCLUDED_FROM_POPULATION } from '../../skills/init/lib/populate-plan-generator'

const FIXTURE_DIR = path.join(import.meta.dir, '..', 'fixtures', 'greenfield-populate-plan-tracer')

// Replicar EXCLUDED_PATTERNS do generator (regex; nao exportado pois usado so internamente).
// Se padrao crescer no generator, replicar aqui — desacoplado do literal numerico.
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
    // 2026-05-19 (Luiz/dev): Plano 05 fase-04 — regex atualizado para date-only format.
    // Plano 03 fase-04 DI: slug usa YYYY-MM-DD (sem hora), nao ISO timestamp.
    const populateDirs = entries.filter(e =>
      /^\d{4}-\d{2}-\d{2}-populate-harness$/.test(e)
    )
    expect(populateDirs).toHaveLength(1)

    // 2) PLAN.md existe na pasta.
    const planPath = path.join(activeDir, populateDirs[0]!, 'PLAN.md')
    const planContent = await fs.readFile(planPath, 'utf8')

    // 2026-05-19 (Luiz/dev): Plano 05 fase-04 — assertions atualizadas para renderer v2 (Plano 03 fase-03).
    // v2 usa tabela de fases em PLAN.md (index) + arquivos individuais fase-NN-*.md.
    // Nao tem mais `### Task: Populate`, `<!-- wave:`, nem `### Task: Validate Harness`.

    // 3) Tabela de fases no PLAN.md tem linhas para cada doc populavel.
    // Formato v2: `| NN | \`doc\` | [fase-NN-slug.md](./...) | aberta |`
    const expectedTaskCount = TEMPLATE_MANIFEST.filter(e => isPopulatable(e.dst)).length
    const tableRows = (planContent.match(/^\| \d{2} \|/gm) ?? []).length
    expect(tableRows).toBe(expectedTaskCount)
    // Sanity: manifest atual tem 25+ arquivos populaveis.
    expect(expectedTaskCount).toBeGreaterThanOrEqual(20)

    // 4) Filosoficos NAO aparecem na tabela.
    expect(planContent).not.toContain('`docs/COMPOUND_ENGINEERING.md`')
    expect(planContent).not.toContain('`docs/PRODUCT_SENSE.md`')

    // 5) README NAO aparece.
    expect(planContent).not.toContain('`README.md`')

    // 6) PLAN.md v2 tem glossario de instrucoes LLM (nao Task: Validate Harness).
    // Individual fase files existem — verificar que pasta tem fase-NN-*.md files.
    const populateFolder = path.join(activeDir, populateDirs[0]!)
    const phaseFiles = (await fs.readdir(populateFolder)).filter(f => f.startsWith('fase-'))
    expect(phaseFiles.length).toBe(expectedTaskCount)
    // Verificar que 'Como executar' esta presente no PLAN.md.
    expect(planContent).toContain('Como executar')

    // 7) PLAN.md v2 nao usa wave markers (estrutura de fases ja e o suficiente).
    // Este check verifica que o formato v2 nao tem artefatos do v1.
    expect(planContent).not.toContain('<!-- wave:')

    // 8) Sem `## Glossario Compartilhado` (removido no v2; novo nome e 'Glossario de Instrucoes LLM').
    expect(planContent).not.toContain('## Glossario Compartilhado')
    expect(planContent).toContain('Glossario de Instrucoes LLM')
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
