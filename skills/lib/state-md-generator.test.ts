// 2026-05-12 (Luiz/dev): testes RED para state-md-generator — cobre 7 casos (M13/CA-45)
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { regenerateStateMd } from './state-md-generator'

// 2026-08-18 (Luiz/dev): TODO.md #1 — a fixture versionada e ENTRADA (notas, ADRs, planos, TODO.md
// com contagens especificas), diferente das fixtures de adr-revoke/lessons-crud que os testes
// reconstroem do zero. Entao aqui copiamos a arvore para tmpdir por teste em vez de largar o
// regenerateStateMd escrevendo docs/STATE.md dentro do repo — era isso que sujava o working tree
// com um timestamp novo a cada `bun run test`.
const FIXTURE_SRC = path.resolve(import.meta.dir, '..', '..', 'tests', 'fixtures', 'v6-state-fixture')

let fixture: string

beforeEach(() => {
  fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'v6-state-'))
  fs.cpSync(FIXTURE_SRC, fixture, { recursive: true })
})

afterEach(() => {
  fs.rmSync(fixture, { recursive: true, force: true })
})

// Monta uma arvore v6 descartavel em tmpdir. O fixture compartilhado so tem plano-arquivo,
// entao nao distingue "1 plano em pasta" de "N arquivos de fase" — que e o caso testado abaixo.
async function writeTree(root: string, files: Record<string, string>): Promise<void> {
  for (const [rel, body] of Object.entries(files)) {
    const full = path.join(root, rel)
    await fs.promises.mkdir(path.dirname(full), { recursive: true })
    await fs.promises.writeFile(full, body, 'utf-8')
  }
}

describe('regenerateStateMd', () => {
  it('writes docs/STATE.md with 3 expected sections', async () => {
    const out = await regenerateStateMd(fixture)
    expect(fs.existsSync(out)).toBe(true)
    const content = fs.readFileSync(out, 'utf-8')
    expect(content).toContain('## Resources')
    expect(content).toContain('## Recent Activity')
    expect(content).toContain('## Pending')
  })

  it('counts compound notes excluding _archived/', async () => {
    await regenerateStateMd(fixture)
    const content = fs.readFileSync(path.join(fixture, 'docs', 'STATE.md'), 'utf-8')
    expect(content).toMatch(/\*\*Compound notes:\*\* 2/)
    expect(content).toMatch(/\*\*Compound archived:\*\* 1/)
  })

  it('counts ADRs by ADR- prefix', async () => {
    await regenerateStateMd(fixture)
    const content = fs.readFileSync(path.join(fixture, 'docs', 'STATE.md'), 'utf-8')
    expect(content).toMatch(/\*\*ADRs:\*\* 2/)
  })

  it('lists plans with pending-capture tag in Pending section', async () => {
    await regenerateStateMd(fixture)
    const content = fs.readFileSync(path.join(fixture, 'docs', 'STATE.md'), 'utf-8')
    expect(content).toContain('2026-05-13-feature-x')
    expect(content).toContain('pending-capture')
  })

  it('is idempotent — second call produces identical content except timestamp', async () => {
    await regenerateStateMd(fixture)
    const first = fs.readFileSync(path.join(fixture, 'docs', 'STATE.md'), 'utf-8')
    await regenerateStateMd(fixture)
    const second = fs.readFileSync(path.join(fixture, 'docs', 'STATE.md'), 'utf-8')
    const stripTs = (s: string) => s.replace(/Last regenerated:.*?-->/, '')
    expect(stripTs(first)).toBe(stripTs(second))
  })

  it('throws when projectRoot is not v6 layout', async () => {
    await expect(regenerateStateMd('/nonexistent/path')).rejects.toThrow()
  })

  it('counts a plan folder as one plan, not one per phase file', async () => {
    const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'state-md-plans-'))
    try {
      await writeTree(root, {
        'TODO.md': '# TODO\n',
        'docs/compound/2026-01-01-nota.md': '# nota\n',
        'docs/design-docs/ADR-0001-x.md': '# adr\n',
        'docs/exec-plans/active/README.md': '# active\n',
        'docs/exec-plans/active/2026-01-01-plano-arquivo.md': '# plano solto\n',
        'docs/exec-plans/active/2026-01-02-plano-pasta/PRD.md': '# prd\n',
        'docs/exec-plans/active/2026-01-02-plano-pasta/plano01/fase-01.md': '# fase 1\n',
        'docs/exec-plans/active/2026-01-02-plano-pasta/plano01/fase-02.md': '# fase 2\n',
        'docs/exec-plans/completed/2026-01-03-plano-fechado/SUMMARY.md': '# summary\n',
        'docs/exec-plans/completed/2026-01-03-plano-fechado/plano01/fase-01.md': '# fase 1\n',
        'docs/exec-plans/completed/_legacy-detail/notas/fase-01.md': '# working note migrada\n',
      })

      const out = await regenerateStateMd(root)
      const content = fs.readFileSync(out, 'utf-8')

      // 2 planos ativos: um arquivo solto + uma pasta (nao 4 arquivos .md dentro dela)
      expect(content).toMatch(/\*\*Active plans:\*\* 2/)
      // 1 concluido: `_legacy-detail` e working note migrada, nao plano
      expect(content).toMatch(/\*\*Completed plans:\*\* 1/)
    } finally {
      await fs.promises.rm(root, { recursive: true, force: true })
    }
  })

  it('counts TODO items by checkbox state', async () => {
    await regenerateStateMd(fixture)
    const content = fs.readFileSync(path.join(fixture, 'docs', 'STATE.md'), 'utf-8')
    expect(content).toMatch(/\*\*TODO items:\*\* 1 open \/ 1 done \/ 1 skipped/)
  })
})
