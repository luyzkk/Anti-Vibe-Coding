// 2026-05-12 (Luiz/dev): leitor + detector de completude — usa contrato D18 (Exit Criteria + Validation Log)
// Local 05-G2: parse frontmatter simples (regex linha-a-linha, nao YAML completo).
// Se plano 06 introduzir frontmatter aninhado, trocar para gray-matter.
import { promises as fs } from 'node:fs'

export type ExecPlanFile = {
  filePath: string
  frontmatter: {
    title: string
    mode: 'full' | 'quick'
    status: 'active' | 'completed' | 'pending-capture'
    created: string
    completedAt?: string
  }
  bodyByH2: Record<string, string>
}

export async function readExecPlan(filePath: string): Promise<ExecPlanFile> {
  const raw = await fs.readFile(filePath, 'utf-8')
  // 2026-05-12 (Luiz/dev): strip BOM defensivo (Plano 03 G4 herdado)
  const text = raw.replace(/^\uFEFF/, '')
  const { frontmatter, body } = splitFrontmatter(text)
  const bodyByH2 = parseH2Sections(body)
  return { filePath, frontmatter: parseFrontmatter(frontmatter), bodyByH2 }
}

export function isComplete(plan: ExecPlanFile): boolean {
  // 2026-05-12 (Luiz/dev): completude = (a) status active, (b) exit criteria nao vazio/placeholder,
  // (c) >=1 [x] e zero [ ]
  if (plan.frontmatter.status !== 'active') return false
  const exit = plan.bodyByH2['Exit Criteria'] ?? ''
  if (!exit.trim() || exit.includes('<!-- preencher -->')) return false
  const unchecked = exit.match(/^- \[ \]/gm) ?? []
  const checked = exit.match(/^- \[x\]/gm) ?? []
  return checked.length > 0 && unchecked.length === 0
}

function splitFrontmatter(text: string): { frontmatter: string; body: string } {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (m == null) return { frontmatter: '', body: text }
  // GT-novo-02: guard for regex captures before indexing
  if (m[1] == null || m[2] == null) return { frontmatter: '', body: text }
  return { frontmatter: m[1], body: m[2] }
}

function parseFrontmatter(fm: string): ExecPlanFile['frontmatter'] {
  // 2026-05-12 (Luiz/dev): YAML simples — chaves planas: valor
  const obj: Record<string, string> = {}
  for (const line of fm.split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/)
    if (m != null && m[1] != null && m[2] != null) {
      obj[m[1]] = m[2].replace(/^"(.*)"$/, '$1')
    }
  }

  const rawMode = obj['mode']
  const rawStatus = obj['status']

  const mode: 'full' | 'quick' =
    rawMode === 'full' || rawMode === 'quick' ? rawMode : 'full'

  const status: 'active' | 'completed' | 'pending-capture' =
    rawStatus === 'active' || rawStatus === 'completed' || rawStatus === 'pending-capture'
      ? rawStatus
      : 'active'

  const result: ExecPlanFile['frontmatter'] = {
    title: obj['title'] ?? '(untitled)',
    mode,
    status,
    created: obj['created'] ?? new Date().toISOString().slice(0, 10),
  }

  if (obj['completedAt'] != null) {
    result.completedAt = obj['completedAt']
  }

  return result
}

function parseH2Sections(body: string): Record<string, string> {
  const out: Record<string, string> = {}
  const lines = body.split('\n')
  let current: string | null = null
  let buf: string[] = []
  for (const line of lines) {
    const m = line.match(/^## (.+)$/)
    if (m != null && m[1] != null) {
      if (current != null) out[current] = buf.join('\n')
      current = m[1].trim()
      buf = []
    } else if (current != null) {
      buf.push(line)
    }
  }
  if (current != null) out[current] = buf.join('\n')
  return out
}

