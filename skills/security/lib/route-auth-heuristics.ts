// skills/security/lib/route-auth-heuristics.ts
// 2026-09-06 (Luiz/dev): Plano 04 DP-3 — heuristica de NOME compartilhada pelos adaptadores Rails,
// Express e Python. E proxy, nao prova: conta quem casa sem ler o corpo. Toda saida vai para `notes`.
// Regex da DP-3 + tres alternativas para nome de classe/middleware (AuthMiddleware, auth_guard, check_auth).
export const AUTH_NAME_RE =
  /authenticat|require_?(login|user|auth|admin)|login_required|signed_in|authoriz|current_user|verify_?(token|jwt)|jwt|session_required|protect|^auth$|auth_?(middleware|guard|check|required)|(^|[_-])auth$/i

export function isAuthName(name: string): boolean {
  return AUTH_NAME_RE.test(name.replace(/[!?]$/, ''))
}

// A ordem de `names` vem da varredura de arquivos do adaptador, que difere entre Windows e Linux
// (readdirSync nao garante ordem). `.sort()` torna `auth`/`other` deterministicos entre plataformas
// antes de virar nota de texto (authNameNotes) — a ordem nao carrega significado, e so lista legivel.
export function splitByAuthName(names: string[]): { auth: string[]; other: string[] } {
  const unique = [...new Set(names)].sort()
  return { auth: unique.filter(isAuthName), other: unique.filter((n) => !isAuthName(n)) }
}

const PROXY_NOTE = 'heuristica de nome de auth e proxy: nome que casa e contado sem ler o corpo; nome que nao casa nao conta'

export function authNameNotes(label: string, split: { auth: string[]; other: string[] }): string[] {
  const notes: string[] = []
  if (split.auth.length > 0) notes.push(`${label} contados como auth: ${split.auth.join(', ')}`)
  if (split.other.length > 0) notes.push(`${label} ignorados por nome: ${split.other.join(', ')}`)
  if (notes.length > 0) notes.push(PROXY_NOTE)
  return notes
}

// --- utilitarios de texto: MOVIDOS de route-auth-nextjs.ts sem mudanca de comportamento (DP-3a) ---
// Os tres adaptadores novos (Rails, Express, Python) precisam deles; o repo ganha uma fonte de
// verdade por funcao em vez de tres copias. route-auth-nextjs.ts passa a importar daqui.
export const QUOTES = new Set(["'", '"', '`'])

export function lineOf(source: string, index: number): number {
  let line = 1
  for (let i = 0; i < index; i += 1) if (source[i] === '\n') line += 1
  return line
}

/** Le do indice de um delimitador ate o par correspondente, pulando strings. `null` se desbalanceado. */
export function readBalanced(source: string, start: number, open: string, close: string): { body: string; end: number } | null {
  let depth = 0
  let quote: string | null = null
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i]
    if (ch === undefined) break
    if (quote !== null) {
      if (ch === '\\') i += 1
      else if (ch === quote) quote = null
      continue
    }
    if (QUOTES.has(ch)) { quote = ch; continue }
    if (ch === '\\') { i += 1; continue }
    if (ch === open) depth += 1
    else if (ch === close) {
      depth -= 1
      if (depth === 0) return { body: source.slice(start + 1, i), end: i + 1 }
    }
  }
  return null
}

/** Separa elementos de array/objeto por virgula de topo, ignorando aninhamento e strings. */
export function splitTopLevel(body: string): string[] {
  const parts: string[] = []
  let depth = 0
  let quote: string | null = null
  let start = 0
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i]
    if (ch === undefined) break
    if (quote !== null) {
      if (ch === '\\') i += 1
      else if (ch === quote) quote = null
      continue
    }
    if (QUOTES.has(ch)) { quote = ch; continue }
    if (ch === '[' || ch === '{' || ch === '(') depth += 1
    else if (ch === ']' || ch === '}' || ch === ')') depth -= 1
    else if (ch === ',' && depth === 0) { parts.push(body.slice(start, i)); start = i + 1 }
  }
  const tail = body.slice(start)
  if (tail.trim().length > 0) parts.push(tail)
  return parts
}
