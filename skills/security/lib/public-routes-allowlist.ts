// skills/security/lib/public-routes-allowlist.ts
// 2026-09-05 (Luiz/dev): allowlist de rotas publicas — PRD RF-02, Decisoes 3 e 7; Plano 02 fase-01.
// Parser PURO sobre texto (como parseMatcherConfig): sem I/O, sem parser JSON proprio (DP-5), fail-closed.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { AllowlistEntry, AllowlistFinding, AllowlistParseResult, RejectedEntry, Route } from './route-auth-matrix.types'
import { isRecord } from './route-auth-matrix.types'

// Raiz do projeto auditado, nao `.anti-vibe/` — que e gitignored (.gitignore:62) e tornaria a
// declaracao invisivel ao review (PRD Decisao 7).
export const PUBLIC_ROUTES_FILE = 'anti-vibe.public-routes.json'

/** Barra final e a UNICA normalizacao (DP-2, G7). `/` permanece `/`. */
export function normalizePath(path: string): string {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}

function lineOf(source: string, index: number): number {
  let line = 1
  for (let i = 0; i < index; i += 1) if (source[i] === '\n') line += 1
  return line
}

// DP-5: JSON.parse perde posicao. Procura a N-esima ocorrencia textual de `"path": "<literal>"`
// (N = quantas vezes esse path ja apareceu) para a duplicata (fase-02) apontar a PROPRIA linha.
function locateEntryLine(source: string, path: string, occurrence: number): number | null {
  const literal = JSON.stringify(path).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`"path"\\s*:\\s*${literal}`, 'g')
  let seen = 0
  for (const match of source.matchAll(re)) {
    if (match.index === undefined) continue
    if (seen === occurrence) return lineOf(source, match.index)
    seen += 1
  }
  return null
}

// 2026-09-05 (Luiz/dev): DP-3 / PRD AB-1. `*` (curinga), `:nome` (parametro path-to-regexp/Express) e
// `(` (grupo regex) cobrem mais de uma rota. `[id]` NAO e amplo: no Next a rota E `/api/users/[id]`
// (DP-2) — a entrada casa UMA rota do contrato. Ver G13 do README sobre `:nome` no Express (Plano 04).
const WIDE_PATTERNS: readonly RegExp[] = [/\*/, /(^|\/):[A-Za-z_]/, /\(/]

export function isWideEntry(path: string): boolean {
  return WIDE_PATTERNS.some((re) => re.test(path))
}

// `high`, nao `critical`: nenhuma rota foi comprovadamente exposta (as rotas sob a entrada continuam
// no motor). Nao `medium`: amplitude e tentativa de desligar o check, pior que limite do adaptador.
function wideFinding(path: string, file: string, line: number): AllowlistFinding {
  return {
    path, file, line,
    severity: 'high',
    description: `entrada ampla \`${path}\` cobriria mais de uma rota — declare cada rota publica individualmente`,
  }
}

type EntryCheck = { rejects: (entry: Record<string, unknown>) => boolean; reason: string }

// Listas, nao switch (CLAUDE.md). Duas listas de proposito: a fase-02 insere a checagem de
// amplitude ENTRE elas (entrada ampla e finding mesmo sem reason — amplitude e o sinal mais forte).
const PATH_CHECKS: readonly EntryCheck[] = [
  { rejects: (e) => typeof e.path !== 'string', reason: 'path ausente ou nao e string' },
  { rejects: (e) => typeof e.path === 'string' && !e.path.startsWith('/'), reason: 'path precisa comecar com /' },
]
const REASON_CHECKS: readonly EntryCheck[] = [
  {
    rejects: (e) => typeof e.reason !== 'string' || e.reason.trim().length === 0,
    reason: 'reason ausente ou vazio — toda rota publica precisa de justificativa (PRD RF-02)',
  },
]

const empty = (note: string): AllowlistParseResult => ({ entries: [], rejected: [], wide: [], notes: [note] })

export function parsePublicRoutes(source: string, file: string): AllowlistParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(source)
  } catch (error) {
    return empty(`${file}: JSON invalido — ${error instanceof Error ? error.message : String(error)}; nenhuma entrada aceita`)
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.routes)) {
    return empty(`${file}: shape invalido — esperado { "routes": [ { "path", "reason" } ] }; nenhuma entrada aceita`)
  }

  const entries: AllowlistEntry[] = []
  const rejected: RejectedEntry[] = []
  const wide: AllowlistFinding[] = []
  const notes: string[] = []
  const occurrences = new Map<string, number>()
  const accepted = new Set<string>() // paths normalizados ja aceitos — so ACEITOS entram (duplicata)

  for (const raw of parsed.routes) {
    const record: Record<string, unknown> = isRecord(raw) ? raw : {}
    const path = typeof record.path === 'string' ? record.path : undefined
    const nth = path === undefined ? 0 : (occurrences.get(path) ?? 0)
    if (path !== undefined) occurrences.set(path, nth + 1)
    const located = path === undefined ? null : locateEntryLine(source, path, nth)
    if (located === null) notes.push(`${file}: linha da entrada ${path ?? '(sem path)'} nao localizada no texto — usando 1`)
    const line = located ?? 1

    const reject = (reason: string): void => {
      // G3: exactOptionalPropertyTypes — nunca `path: undefined`; spread condicional.
      rejected.push({ ...(path !== undefined ? { path } : {}), line, reason })
    }

    const badPath = PATH_CHECKS.find((c) => c.rejects(record))
    if (badPath !== undefined) { reject(badPath.reason); continue }
    // amplitude ANTES de reason: `/api/*` sem reason e finding, nao recusa muda (AB-1 e o sinal mais forte)
    if (path !== undefined && isWideEntry(path)) { wide.push(wideFinding(path, file, line)); continue }
    const badReason = REASON_CHECKS.find((c) => c.rejects(record))
    if (badReason !== undefined) { reject(badReason.reason); continue }
    if (path !== undefined && accepted.has(normalizePath(path))) {
      reject('path duplicado — a primeira ocorrencia vale; esta e ignorada')
      continue
    }

    const { reason } = record
    if (path === undefined || typeof reason !== 'string') continue // type guard — os checks ja garantem
    entries.push({ path, reason: reason.trim(), file, line })
    accepted.add(normalizePath(path))
  }

  return { entries, rejected, wide, notes }
}

export function readPublicRoutes(targetDir: string): AllowlistParseResult & { present: boolean } {
  const absolute = join(targetDir, PUBLIC_ROUTES_FILE)
  if (!existsSync(absolute)) {
    return {
      present: false,
      ...empty(`${PUBLIC_ROUTES_FILE} ausente — nenhuma rota declarada publica (fail-closed, PRD RF-02)`),
    }
  }
  return { present: true, ...parsePublicRoutes(readFileSync(absolute, 'utf8'), PUBLIC_ROUTES_FILE) }
}

/** DP-2: igualdade exata apos normalizar barra final; metodo nao entra. `null` = nao declarada. */
export function matchAllowlist(route: Route, entries: AllowlistEntry[]): AllowlistEntry | null {
  const target = normalizePath(route.path)
  return entries.find((entry) => normalizePath(entry.path) === target) ?? null
}

/** Delta por path normalizado (DP-2). Edicao so de `reason` nao aparece aqui — `changed: true` ja a sinaliza. */
export function diffAllowlist(before: AllowlistEntry[], after: AllowlistEntry[]): { added: AllowlistEntry[]; removed: AllowlistEntry[] } {
  const key = (e: AllowlistEntry): string => normalizePath(e.path)
  const beforeKeys = new Set(before.map(key))
  const afterKeys = new Set(after.map(key))
  return { added: after.filter((e) => !beforeKeys.has(key(e))), removed: before.filter((e) => !afterKeys.has(key(e))) }
}
