// 2026-05-14 (Luiz/dev): Plano 05 fase-03 — CA-11: AGENTS.md.tpl ≤40 linhas + 4 anti-vibe links.
import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const TEMPLATE_PATH = path.join(
  import.meta.dir,
  '../skills/init/assets/templates/AGENTS.md.tpl',
)

const AGENTS_MAX_LINES = 40

const ANTI_VIBE_LINKS = [
  '[docs/MERGE_GATES.md](./docs/MERGE_GATES.md)',
  '[docs/COMPOUND_ENGINEERING.md](./docs/COMPOUND_ENGINEERING.md)',
  '[docs/review-checklists/](./docs/review-checklists/)',
  '[docs/smoke-flows/](./docs/smoke-flows/)',
] as const

describe('AGENTS.md.tpl', () => {
  it(`has ≤${AGENTS_MAX_LINES} lines (CA-11)`, async () => {
    const content = await fs.readFile(TEMPLATE_PATH, 'utf-8')
    const lineCount = content.split('\n').length
    expect(lineCount).toBeLessThanOrEqual(AGENTS_MAX_LINES)
  })

  it('contains all 4 anti-vibe extension links (DT-10)', async () => {
    const content = await fs.readFile(TEMPLATE_PATH, 'utf-8')
    for (const link of ANTI_VIBE_LINKS) {
      expect(content).toContain(link)
    }
  })

  it('has ## Anti-Vibe Extensions section', async () => {
    const content = await fs.readFile(TEMPLATE_PATH, 'utf-8')
    expect(content).toContain('## Anti-Vibe Extensions')
  })

  it('retains original 5 core links', async () => {
    const content = await fs.readFile(TEMPLATE_PATH, 'utf-8')
    expect(content).toContain('[ARCHITECTURE.md](./ARCHITECTURE.md)')
    expect(content).toContain('[docs/PLANS.md](./docs/PLANS.md)')
    expect(content).toContain('[docs/PRODUCT_SENSE.md](./docs/PRODUCT_SENSE.md)')
    expect(content).toContain('[docs/QUALITY_SCORE.md](./docs/QUALITY_SCORE.md)')
    expect(content).toContain('[docs/SECURITY.md](./docs/SECURITY.md)')
  })

  it('retains INIT:DELIVERY_LOOP_SLOT comment', async () => {
    const content = await fs.readFile(TEMPLATE_PATH, 'utf-8')
    expect(content).toContain('<!-- INIT:DELIVERY_LOOP_SLOT -->')
  })
})
