// wayfinder-frontier — computa a fronteira de um mapa do /wayfinder (plano10 fase-02, DI-33).
//
// Na fonte, o bloqueio usa a relacao nativa do issue tracker, e a UI dele renderiza a fronteira
// de graca. Em markdown local isso se perde; este script devolve — e, diferente da query do
// tracker, e testavel.
//
// Le e imprime. Quem muta ticket e o agente, pelo modo work da skill.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'

// Tolerante a CRLF: todo .md deste repo fica CRLF no working tree do Windows
// (compound 2026-05-19-crlf-breaks-frontmatter-regex).
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/
const MAP_LINK_RE = /\[[^\]]+\]\((tickets\/[^)]+)\)/g

/** Reivindicacao mais velha que isto num ticket aberto esta morta (DI-Plano10-fase01-claim). */
export const STALE_CLAIM_MS = 24 * 60 * 60 * 1000

export interface Ticket {
  id: string
  title: string
  type: string
  status: 'open' | 'closed'
  blockedBy: string[]
  outOfScope: boolean
  /** Caminho relativo ao diretorio do esforco — e o que a saida mostra ao lado do nome. */
  file: string
}

export interface ClaimInfo {
  raw: string
  at: Date | null
  by: string
  stale: boolean
}

export interface FrontierReport {
  frontier: Ticket[]
  blocked: Array<{ ticket: Ticket; waitingOn: Ticket[] }>
  claimed: Array<{ ticket: Ticket; claim: ClaimInfo }>
  errors: string[]
  warnings: string[]
}

/**
 * YAML CORE_SCHEMA le `003` como o inteiro 3, entao os zeros a esquerda somem antes de chegarem
 * aqui. Sem re-padding, um `blocked-by: [003]` nunca casaria com o ticket de `id: 003`.
 */
function normalizeId(value: unknown): string {
  const raw = typeof value === 'number' ? String(value) : String(value ?? '').trim()
  return /^\d+$/.test(raw) ? raw.padStart(3, '0') : raw
}

function parseClaim(raw: unknown): ClaimInfo | null {
  const text = String(raw ?? '').trim()
  if (text === '') return null
  const [stamp = '', ...rest] = text.split(/\s+/)
  const parsed = new Date(stamp)
  const at = Number.isNaN(parsed.getTime()) ? null : parsed
  return { raw: text, at, by: rest.join(' '), stale: false }
}

function parseTicket(body: string, file: string): Ticket | null {
  const match = body.match(FRONTMATTER_RE)
  if (!match?.[1]) return null

  let data: Record<string, unknown>
  try {
    const loaded = yaml.load(match[1], { schema: yaml.CORE_SCHEMA })
    if (loaded === null || typeof loaded !== 'object' || Array.isArray(loaded)) return null
    data = loaded as Record<string, unknown>
  } catch {
    return null
  }

  const blockedByRaw = data['blocked-by']
  const blockedBy = Array.isArray(blockedByRaw)
    ? blockedByRaw.map(normalizeId).filter((id) => id !== '')
    : []

  return {
    id: normalizeId(data['id']),
    title: String(data['title'] ?? '').trim() || file,
    type: String(data['type'] ?? '').trim(),
    status: data['status'] === 'closed' ? 'closed' : 'open',
    blockedBy,
    outOfScope: data['out-of-scope'] === true,
    file,
  }
}

/** Guarda o frontmatter cru do ticket, para o claim ser lido junto do resto. */
type Loaded = { ticket: Ticket; claim: ClaimInfo | null }

async function loadTickets(effortDir: string): Promise<Loaded[]> {
  const dir = path.join(effortDir, 'tickets')
  let names: string[]
  try {
    names = (await fs.readdir(dir)).filter((n) => n.endsWith('.md')).sort()
  } catch {
    return []
  }

  const loaded = await Promise.all(
    names.map(async (name) => {
      const body = await fs.readFile(path.join(dir, name), 'utf8')
      const ticket = parseTicket(body, `tickets/${name}`)
      if (!ticket) return null
      const fm = body.match(FRONTMATTER_RE)?.[1] ?? ''
      let claim: ClaimInfo | null = null
      try {
        const data = yaml.load(fm, { schema: yaml.CORE_SCHEMA }) as Record<string, unknown>
        claim = parseClaim(data?.['claimed'])
      } catch {
        claim = null
      }
      return { ticket, claim }
    }),
  )

  return loaded.filter((entry): entry is Loaded => entry !== null)
}

/**
 * Ciclo de bloqueio e o que acontece quando o agente cria os tickets e liga as arestas em passadas
 * separadas e erra no meio. Nao trava o calculo da fronteira — que olha so bloqueadores diretos —
 * mas e deadlock: nenhum dos tickets do ciclo pode ser desbloqueado.
 */
function findCycles(byId: Map<string, Ticket>): string[][] {
  const GRAY = 1
  const BLACK = 2
  const color = new Map<string, number>()
  const stack: string[] = []
  const cycles: string[][] = []
  const seen = new Set<string>()

  function visit(id: string): void {
    color.set(id, GRAY)
    stack.push(id)
    for (const dep of byId.get(id)?.blockedBy ?? []) {
      if (!byId.has(dep)) continue
      const state = color.get(dep)
      if (state === GRAY) {
        const cycle = stack.slice(stack.indexOf(dep))
        const key = [...cycle].sort().join(',')
        if (!seen.has(key)) {
          seen.add(key)
          cycles.push(cycle)
        }
      } else if (state === undefined) {
        visit(dep)
      }
    }
    stack.pop()
    color.set(id, BLACK)
  }

  for (const id of byId.keys()) {
    if (color.get(id) === undefined) visit(id)
  }
  return cycles
}

function nameOf(t: Ticket): string {
  return `${t.title} (${t.file})`
}

async function checkMapDivergence(effortDir: string, tickets: Ticket[]): Promise<string[]> {
  let map: string
  try {
    map = await fs.readFile(path.join(effortDir, 'MAP.md'), 'utf8')
  } catch {
    return []
  }

  // So a secao Decisions so far conta: e ela que indexa o que ja fechou.
  const section = map.split(/^##\s+/m).find((block) => /^Decisions so far/i.test(block)) ?? ''
  const linked = new Set([...section.matchAll(MAP_LINK_RE)].map((m) => m[1]!))
  const byFile = new Map(tickets.map((t) => [t.file, t]))
  const warnings: string[] = []

  for (const t of tickets) {
    if (t.status === 'closed' && !linked.has(t.file)) {
      warnings.push(`ticket fechado fora de "Decisions so far" do mapa: ${nameOf(t)}`)
    }
  }
  for (const target of linked) {
    if (!byFile.has(target)) {
      warnings.push(`"Decisions so far" aponta para ticket inexistente: ${target}`)
    }
  }
  return warnings
}

export async function analyseEffort(effortDir: string, now: Date = new Date()): Promise<FrontierReport> {
  const loaded = await loadTickets(effortDir)
  const tickets = loaded.map((l) => l.ticket)
  const byId = new Map(tickets.map((t) => [t.id, t]))
  const claims = new Map(loaded.map((l) => [l.ticket.id, l.claim]))

  const report: FrontierReport = {
    frontier: [],
    blocked: [],
    claimed: [],
    errors: [],
    warnings: [],
  }

  for (const cycle of findCycles(byId)) {
    const names = cycle.map((id) => byId.get(id)!.title).join(' -> ')
    report.errors.push(`ciclo de bloqueio: ${names} -> ${byId.get(cycle[0]!)!.title}`)
  }

  for (const ticket of tickets) {
    const ghosts = ticket.blockedBy.filter((id) => !byId.has(id))
    for (const ghost of ghosts) {
      report.errors.push(`blocked-by aponta para id inexistente ${ghost}: ${nameOf(ticket)}`)
    }

    if (ticket.status === 'closed' || ticket.outOfScope) continue

    const waitingOn = ticket.blockedBy
      .map((id) => byId.get(id))
      .filter((t): t is Ticket => t !== undefined && t.status === 'open')

    if (waitingOn.length > 0) {
      report.blocked.push({ ticket, waitingOn })
      continue
    }

    const claim = claims.get(ticket.id) ?? null
    if (claim) {
      const stale = claim.at !== null && now.getTime() - claim.at.getTime() > STALE_CLAIM_MS
      if (stale) {
        report.warnings.push(
          `reivindicacao vencida (>24h, ${claim.raw}) — de volta a fronteira: ${nameOf(ticket)}`,
        )
        report.frontier.push(ticket)
      } else {
        report.claimed.push({ ticket, claim: { ...claim, stale } })
      }
      continue
    }

    report.frontier.push(ticket)
  }

  report.warnings.push(...(await checkMapDivergence(effortDir, tickets)))
  return report
}

export function renderReport(report: FrontierReport, effortDir: string): string {
  const lines: string[] = [`wayfinder — ${effortDir}`, '']

  if (report.errors.length > 0) {
    lines.push('ERROS', ...report.errors.map((e) => `  ! ${e}`), '')
  }

  const nothingOpen =
    report.frontier.length === 0 && report.blocked.length === 0 && report.claimed.length === 0

  if (nothingOpen) {
    lines.push('Nenhum ticket aberto — o caminho esta claro.', '')
  } else {
    lines.push(
      `FRONTEIRA (${report.frontier.length}) — da para pegar agora`,
      ...(report.frontier.length > 0
        ? report.frontier.map((t) => `  - ${nameOf(t)}`)
        : ['  (vazia)']),
      '',
    )

    if (report.claimed.length > 0) {
      lines.push(
        `REIVINDICADO (${report.claimed.length}) — em andamento em outra sessao`,
        ...report.claimed.map((c) => `  - ${nameOf(c.ticket)} — ${c.claim.by || c.claim.raw}`),
        '',
      )
    }

    if (report.blocked.length > 0) {
      lines.push(
        `BLOQUEADO (${report.blocked.length}) — falta fechar`,
        ...report.blocked.map(
          (b) => `  - ${nameOf(b.ticket)} — espera: ${b.waitingOn.map((w) => w.title).join(', ')}`,
        ),
        '',
      )
    }
  }

  if (report.warnings.length > 0) {
    lines.push('AVISOS', ...report.warnings.map((w) => `  ~ ${w}`), '')
  }

  return lines.join('\n')
}

/** Sem argumento: usa o unico esforco ativo com MAP.md; com varios, lista e pede escolha. */
async function resolveEffortDir(arg: string | undefined): Promise<string> {
  if (arg) return arg

  const activeRoot = path.join(process.cwd(), 'docs', 'exec-plans', 'active')
  let entries: string[]
  try {
    entries = await fs.readdir(activeRoot)
  } catch {
    throw new Error(`nenhum esforco ativo encontrado em ${activeRoot} — passe o caminho como argumento`)
  }

  const withMap: string[] = []
  for (const entry of entries) {
    const dir = path.join(activeRoot, entry)
    try {
      await fs.stat(path.join(dir, 'MAP.md'))
      withMap.push(dir)
    } catch {
      // esforco sem mapa ainda nao foi cartografado
    }
  }

  if (withMap.length === 1) return withMap[0]!
  if (withMap.length === 0) {
    throw new Error('nenhum esforco ativo tem MAP.md — passe o caminho como argumento')
  }
  throw new Error(
    `varios esforcos com MAP.md — escolha um:\n${withMap.map((d) => `  ${d}`).join('\n')}`,
  )
}

if (import.meta.main) {
  try {
    const effortDir = await resolveEffortDir(process.argv[2])
    const report = await analyseEffort(effortDir)
    console.log(renderReport(report, effortDir))
    if (report.errors.length > 0) process.exit(1)
  } catch (err) {
    console.error(`wayfinder-frontier: ${(err as Error).message}`)
    process.exit(1)
  }
}
