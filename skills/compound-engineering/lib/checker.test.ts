// 2026-05-24 (Luiz/dev): testes RED para runCompoundCheck — PRD CA-09, CA-10, RNF-01

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// Importar APOS implementacao existir (RED vai falhar aqui com module not found — aceitavel)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — modulo nao existe em RED phase; erro esperado ate GREEN
import { runCompoundCheck } from './checker'

// Path para o compound-check.ts.tpl real (instalado como scripts/compound-check.ts no target)
const TPL_PATH = path.resolve(
  import.meta.dir,
  '../../assets/scripts/compound-check.ts.tpl',
)

describe('runCompoundCheck', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'checker-test-'))
    // Instalar compound-check.ts (a partir do tpl) no fixture
    const scriptsDir = path.join(tmpDir, 'scripts')
    await fs.mkdir(scriptsDir, { recursive: true })
    const tplContent = await fs.readFile(TPL_PATH, 'utf8')
    await fs.writeFile(path.join(scriptsDir, 'compound-check.ts'), tplContent)
    // Criar docs/compound/ vazio para que o checker nao reporte erros de notas
    await fs.mkdir(path.join(tmpDir, 'docs', 'compound'), { recursive: true })
    // AGENTS.md sem link compound — fixture brownfield sem link
    await fs.writeFile(
      path.join(tmpDir, 'AGENTS.md'),
      '# Agents\n\nNo compound link here.\n',
    )
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('backward compat: check sem --strict passa em projeto sem AGENTS link (CA-09)', async () => {
    const result = await runCompoundCheck(tmpDir, { strict: false })

    expect(result.exitCode).toBe(0)
  })

  it('strict ativa regra agents-link: check --strict falha com [agents-link] no stderr (CA-10)', async () => {
    const result = await runCompoundCheck(tmpDir, { strict: true })

    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toMatch(/\[agents-link\]/)
  })
})
