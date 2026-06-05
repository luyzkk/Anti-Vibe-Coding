// 2026-05-29 (Luiz/dev): trava a diretriz workflow-awareness no CI (RF15 / D6).
// Espelha a IDEIA do "never diminish gate"; NAO estende populate-plan-parity (gutted — GT-1).
import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const REPO_ROOT = path.resolve(import.meta.dir, '..', '..')
const HOOK_PATH = path.join(REPO_ROOT, 'hooks', 'user-prompt-gate.cjs')
// processPrompt + SCALE_PATTERNS exportados na fase-01 (com guard require.main === module).
const { processPrompt } = require(HOOK_PATH) as { processPrompt: (p: string) => string | null }

describe('workflow-awareness directive gate', () => {
  it('WORKFLOWS.md exists and starts with an H1 heading', async () => {
    const content = await fs.readFile(path.join(REPO_ROOT, 'docs', 'WORKFLOWS.md'), 'utf8')
    expect(content.startsWith('# ')).toBe(true)
  })

  it('AGENTS.md links to docs/WORKFLOWS.md', async () => {
    const agents = await fs.readFile(path.join(REPO_ROOT, 'AGENTS.md'), 'utf8')
    expect(agents).toContain('docs/WORKFLOWS.md')
  })

  const scalePrompts = [
    'migrar 400 arquivos para o novo formato',
    'auditar o codebase inteiro por XSS',
    'renomear 250 componentes para o novo padrao',
    'pesquisar isso em varias fontes',
    'migrar 300 endpoints de autenticação e cache para o novo padrão', // multi-domínio + escala (CA-07)
  ]

  it('every WORKFLOW_ADVISOR output is advisory text — never a Workflow tool or decision:block', () => {
    for (const p of scalePrompts) {
      const out = processPrompt(p)
      expect(typeof out).toBe('string')
      expect(out).toContain('[WORKFLOW_ADVISOR]')
      // diretriz: nada que pareça emitir/forçar tool ou bloquear o turno
      expect(out).not.toMatch(/"?decision"?\s*:\s*"?block/i)
      expect(out).not.toMatch(/\bdecision:block\b/i)
      expect(out).not.toMatch(/(use|invoke|emit|lance|chame)\s+.{0,12}\btool\s+Workflow\b/i)
    }
  })

  it('merges scale + multi-domain into a single advisory (INV1 / CA-07)', () => {
    const out = processPrompt('migrar 300 endpoints de autenticação e cache para o novo padrão')
    expect((out?.match(/\[WORKFLOW_ADVISOR\]/g) || []).length).toBe(1)
  })

  it('does not advise workflow for sub-threshold counts (CA-03)', () => {
    const out = processPrompt('renomeie esses 12 arquivos')
    expect(out === null || !String(out).includes('[WORKFLOW_ADVISOR]')).toBe(true)
  })

  it('returns null when the human already opted in (CA-02)', () => {
    expect(processPrompt('rode isso como workflow')).toBe(null)
    expect(processPrompt('use /effort ultracode aqui')).toBe(null)
  })

  it('hook source has no Workflow-tool emission or decision:block in the advisor path', async () => {
    const src = await fs.readFile(HOOK_PATH, 'utf8')
    // O advisor é texto stdout. A fonte não deve conter um objeto decision:block
    // associado ao caminho de workflow nem instrução de emitir a tool Workflow.
    expect(src).not.toMatch(/decision\s*:\s*['"]block['"][\s\S]{0,200}workflow/i)
    expect(src).not.toMatch(/workflow[\s\S]{0,200}decision\s*:\s*['"]block['"]/i)
  })
})
