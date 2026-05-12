// 2026-05-12 (Luiz/dev): ADR writer com numeracao monotonica — herdada de Plano 03 fase-05 gotcha G7 (numbering por diretorio)
// DI-02-01: colocado em skills/lib/ (cross-skill) conforme convencao DI-01-01 estabelecida em fase-01
import { promises as fs } from 'node:fs'
import path from 'node:path'

export type ADRStatus = 'active' | 'superseded' | 'deprecated'

export type ADRInput = {
  title: string
  context?: string
  decision?: string
  alternatives?: string[]
  consequences?: string
  status?: ADRStatus
}

export type ADRWriteResult = {
  filePath: string
  id: number
}

/**
 * Escreve um ADR com frontmatter e secoes padrao. Numeracao monotonica por diretorio.
 *
 * NOTA (02-G1): Duas chamadas paralelas podem coincidir em mesmo next_id.
 * Aceito como trade-off — uso e single-user, baixa probabilidade.
 * Se virar pain, adicionar lockfile em docs/design-docs/.adr.lock.
 *
 * @param designDocsDir - Diretorio onde os ADRs serao criados
 * @param input - Dados do ADR (title obrigatorio; demais campos opcionais)
 */
export async function writeADR(designDocsDir: string, input: ADRInput): Promise<ADRWriteResult> {
  await fs.mkdir(designDocsDir, { recursive: true })
  const nextId = await getNextADRId(designDocsDir)
  const slug = slugify(input.title)
  const fileName = `ADR-${pad4(nextId)}-${slug}.md`
  const filePath = path.join(designDocsDir, fileName)

  // 2026-05-12 (Luiz/dev): frontmatter inclui status para suportar D31 (Plano 06 fase-06 --revoke)
  const frontmatter = [
    '---',
    `id: ${nextId}`,
    `title: ${JSON.stringify(input.title)}`,
    `status: ${input.status ?? 'active'}`,
    `created: ${new Date().toISOString().slice(0, 10)}`,
    '---',
    '',
  ].join('\n')

  const body = [
    `# ADR-${pad4(nextId)}: ${input.title}`,
    '',
    '## Context',
    input.context ?? '(why is this decision needed)',
    '',
    '## Decision',
    input.decision ?? '(what was decided)',
    '',
    '## Alternatives',
    (input.alternatives && input.alternatives.length > 0)
      ? input.alternatives.map((a) => `- ${a}`).join('\n')
      : '- (no alternatives recorded)',
    '',
    '## Consequences',
    input.consequences ?? '(trade-offs of this decision)',
    '',
  ].join('\n')

  await fs.writeFile(filePath, frontmatter + body, 'utf-8')
  return { filePath, id: nextId }
}

async function getNextADRId(dir: string): Promise<number> {
  // 2026-05-12 (Luiz/dev): G7 herdado — numeracao por diretorio, nao global; reler a cada add
  let max = 0
  try {
    const entries = await fs.readdir(dir)
    for (const e of entries) {
      const m = e.match(/^ADR-(\d{4})-/)
      if (m && m[1] != null) max = Math.max(max, parseInt(m[1], 10))
    }
  } catch { /* dir nao existe ainda */ }
  return max + 1
}

function pad4(n: number): string {
  return String(n).padStart(4, '0')
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'decision'
}
