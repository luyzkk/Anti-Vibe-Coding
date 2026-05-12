// 2026-05-12 (Luiz/dev): helpers agnósticos para manipulação de TODO.md — D31/CA-44
import * as fs from 'fs'

export type TodoState = 'open' | 'done' | 'skipped'

export type TodoItem = {
  lineIndex: number    // index 0-based na lista de linhas do arquivo
  state: TodoState
  description: string
  raw: string         // linha original (para preservar formatting/indent)
}

const CHECKBOX_RE = /^(\s*- \[)([ xX-])(\]\s+)(.+)$/

function stateFromChar(char: string): TodoState {
  if (char === 'x' || char === 'X') return 'done'
  if (char === '-') return 'skipped'
  return 'open'
}

export function parse(filePath: string): TodoItem[] {
  if (!fs.existsSync(filePath)) return []

  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const items: TodoItem[] = []

  lines.forEach((line, idx) => {
    const match = CHECKBOX_RE.exec(line)
    if (match) {
      const stateChar = match[2] ?? ' '
      const desc = match[4] ?? ''
      items.push({
        lineIndex: idx,
        state: stateFromChar(stateChar),
        description: desc,
        raw: line,
      })
    }
  })

  return items
}

function mutateLine(filePath: string, lineIndex: number, transform: (line: string) => string): void {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const line = lines[lineIndex] ?? ''

  if (!CHECKBOX_RE.test(line)) {
    throw new Error(`Linha ${lineIndex} nao eh item checkbox: "${line}"`)
  }

  lines[lineIndex] = transform(line)
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8')
}

export function markDone(filePath: string, lineIndex: number): void {
  mutateLine(filePath, lineIndex, (line) =>
    line.replace(/^(\s*- \[)[ xX-](\])/, '$1x$2')
  )
}

export function skip(filePath: string, lineIndex: number): void {
  mutateLine(filePath, lineIndex, (line) =>
    line.replace(/^(\s*- \[)[ xX-](\])/, '$1-$2')
  )
}

export function remove(filePath: string, lineIndex: number): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo nao existe: ${filePath}`)
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  if (lineIndex < 0 || lineIndex >= lines.length) {
    throw new Error(`lineIndex ${lineIndex} fora do range (0-${lines.length - 1})`)
  }

  const line = lines[lineIndex] ?? ''
  if (!CHECKBOX_RE.test(line)) {
    throw new Error(`Linha ${lineIndex} nao eh item checkbox: "${line}"`)
  }

  lines.splice(lineIndex, 1)
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8')
}

export function addLine(filePath: string, description: string): void {
  if (!description.trim()) {
    throw new Error('description vazia — informe um texto para a tarefa')
  }

  const newItem = `- [ ] ${description}\n`

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, `# TODO\n\n${newItem}`, 'utf-8')
    return
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const separator = content.endsWith('\n') ? '' : '\n'
  fs.writeFileSync(filePath, content + separator + newItem, 'utf-8')
}

// ─── Rich-parsed line types (D8 format) ─────────────────────────────────────

/** Classifier extracted from `{file:path:line}` or `{feature:name}` tokens */
export type TodoClassifier =
  | { kind: 'file'; path: string; line: number | null }
  | { kind: 'feature'; name: string }
  | null

/** FIFO selection strategy — 'oldest' returns first open item by file position */
export type PickStrategy = 'oldest'

/** Line parsed with rich fields; does not replace the legacy TodoItem */
export type ParsedLine = {
  lineIndex: number
  raw: string
  state: TodoState     // uses 'open', not 'pending'
  date: string | null  // YYYY-MM-DD or null
  classifier: TodoClassifier
  description: string
}

// Accepts optional {YYYY-MM-DD} date and optional {classifier} tokens
const PARSED_LINE_RE =
  /^-\s*\[(?<box>[ xX-])\]\s*(?:\{(?<date>\d{4}-\d{2}-\d{2})\})?\s*(?:\{(?<classifier>[^}]+)\})?\s*(?<desc>.*)$/

function parseClassifier(raw: string | null): TodoClassifier {
  if (!raw) return null
  if (raw.startsWith('file:')) {
    const rest = raw.slice('file:'.length)
    const lastColon = rest.lastIndexOf(':')
    if (lastColon !== -1) {
      const maybeLine = rest.slice(lastColon + 1)
      const lineNum = Number(maybeLine)
      if (maybeLine !== '' && !Number.isNaN(lineNum)) {
        return { kind: 'file', path: rest.slice(0, lastColon), line: lineNum }
      }
    }
    return { kind: 'file', path: rest, line: null }
  }
  if (raw.startsWith('feature:')) {
    return { kind: 'feature', name: raw.slice('feature:'.length) }
  }
  return null
}

/**
 * Parses a single raw TODO.md line into a ParsedLine.
 * Returns null for non-checkbox lines (headers, blank lines, etc.).
 *
 * @example parseLine('- [ ] {2026-01-01} {file:src/a.ts:5} fix it', 3)
 */
export function parseLine(raw: string, lineIndex: number): ParsedLine | null {
  const match = PARSED_LINE_RE.exec(raw)
  if (!match) return null

  const groups = match.groups
  if (!groups) return null

  const box = groups['box'] ?? ' '
  const dateStr = groups['date'] ?? null
  const cls = groups['classifier'] ?? null
  const desc = groups['desc'] ?? ''

  return {
    lineIndex,
    raw,
    state: stateFromChar(box),
    date: dateStr,
    classifier: parseClassifier(cls),
    description: desc.trim(),
  }
}

/**
 * Returns items whose state is 'open' (i.e. pending/actionable).
 *
 * @example listPending(parsedLines).map(i => i.description)
 */
export function listPending(items: ParsedLine[]): ParsedLine[] {
  return items.filter((i) => i.state === 'open')
}

/**
 * Filters parsed items by the given TodoState.
 *
 * @example filterByStatus(items, 'done')
 */
export function filterByStatus(items: ParsedLine[], state: TodoState): ParsedLine[] {
  return items.filter((i) => i.state === state)
}

/**
 * Returns the first open item (FIFO by file position) or null when none exist.
 *
 * @example pickNext(items, 'oldest')
 */
export function pickNext(items: ParsedLine[], strategy: PickStrategy): ParsedLine | null {
  // strategy is 'oldest' — FIFO means first by lineIndex order
  void strategy
  return items.find((i) => i.state === 'open') ?? null
}

/**
 * Scores an item by days since its `date` field (UTC, deterministic).
 * Returns 0 when `date` is null. Larger score = older = higher priority.
 *
 * @example scoreByPriority(item, new Date('2026-01-11'))
 */
export function scoreByPriority(item: ParsedLine, today: Date = new Date()): number {
  if (!item.date) return 0
  const itemDate = Date.UTC(
    Number(item.date.slice(0, 4)),
    Number(item.date.slice(5, 7)) - 1,
    Number(item.date.slice(8, 10)),
  )
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const diffMs = todayUtc - itemDate
  return Math.max(0, Math.floor(diffMs / 86_400_000))
}
