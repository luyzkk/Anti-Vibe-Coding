// 2026-05-24 (Luiz/dev): P1 — PRD SH-03/CA-11/CA-12 + D23 regex multi-padrao
import { promises as fs } from 'node:fs'
import path from 'node:path'

export type PatchResult = {
  status: 'patched' | 'already-present' | 'created' | 'appended'
  message: string
}

// 2026-05-24 (Luiz/dev): D23 — cobre [text](docs/...), (./docs/...), (../docs/...)
// \.{0,2} cobre: "" (0 pontos), "." (1 ponto = ./), ".." (2 pontos = ../)
// \/?  cobre slash opcional apos os pontos
const COMPOUND_LINK_REGEX = /\[.*?\]\(\.{0,2}\/?docs\/COMPOUND_ENGINEERING\.md\)/

const SECTION_HEADING = '## Read Before Major Changes'
const LINK_LINE = '- [Compound Engineering](./docs/COMPOUND_ENGINEERING.md)'

export async function patchAgentsMd(targetRoot: string): Promise<PatchResult> {
  const agentsPath = path.join(targetRoot, 'AGENTS.md')
  const exists = await fs.access(agentsPath).then(() => true).catch(() => false)

  if (!exists) {
    // 2026-05-24 (Luiz/dev): AGENTS.md ausente — cria com secao e link (degraded bootstrap)
    await fs.writeFile(
      agentsPath,
      `# AGENTS.md\n\n${SECTION_HEADING}\n\n${LINK_LINE}\n`,
    )
    return { status: 'created', message: 'Created AGENTS.md with compound link' }
  }

  const content = await fs.readFile(agentsPath, 'utf-8')

  // 2026-05-24 (Luiz/dev): CA-11/CA-12 — qualquer match no arquivo = no-op (idempotente)
  if (COMPOUND_LINK_REGEX.test(content)) {
    return { status: 'already-present', message: 'AGENTS.md already has compound link — no patch needed' }
  }

  // 2026-05-24 (Luiz/dev): se secao `## Read Before Major Changes` existe, insere logo apos
  const sectionIdx = content.indexOf(SECTION_HEADING)
  if (sectionIdx >= 0) {
    const lineEndIdx = content.indexOf('\n', sectionIdx) + 1
    const patched = `${content.slice(0, lineEndIdx)}\n${LINK_LINE}\n${content.slice(lineEndIdx)}`
    await fs.writeFile(agentsPath, patched)
    return {
      status: 'patched',
      message: `Patched AGENTS.md: added link to docs/COMPOUND_ENGINEERING.md under '${SECTION_HEADING}'`,
    }
  }

  // 2026-05-24 (Luiz/dev): degraded path — secao nao existe; append no fim com nova secao
  const patched = `${content.trimEnd()}\n\n${SECTION_HEADING}\n\n${LINK_LINE}\n`
  await fs.writeFile(agentsPath, patched)
  return {
    status: 'appended',
    message: `Patched AGENTS.md: appended '${SECTION_HEADING}' section with compound link`,
  }
}
