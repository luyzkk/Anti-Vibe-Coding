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
