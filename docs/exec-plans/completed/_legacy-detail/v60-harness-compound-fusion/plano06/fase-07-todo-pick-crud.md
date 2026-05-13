<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 07: todo-pick-crud (HELPERS APENAS)

**Plano:** 06 — Agent-Native (D31 CRUD + D32 STATE.md hook + D33 completion signal)
**Sizing:** 1h
**Depende de:** Nenhuma direta (paralela a fase-01, fase-03; independente — `TODO.md` mora na raiz, nao precisa de path-resolver)
**Visual:** false

---

## O que esta fase entrega

`lib/todo-utils.ts` exporta helpers agnosticos de skill: `parse()`, `markDone()`, `addLine()`, `skip()`, `remove()`. **A skill `/todo-pick` NAO eh criada aqui** — ela nasce em Plano 07. Esta fase entrega APENAS os helpers TS prontos para serem consumidos por Plano 07 fase-02 (skill `/todo-pick`) e Plano 07 fase-04 (`/execute-plan` chamando `addLine` em out-of-scope).

Ver ambiguity **06-A6** no README — alternativa rejeitada eh mover fase-07 inteira para Plano 07.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/lib/todo-utils.ts` | Create | Helpers `parse`, `markDone`, `addLine`, `skip`, `remove` (todos por lineIndex) |
| `anti-vibe-coding/lib/todo-utils.test.ts` | Create | Suite RED→GREEN com fixture TODO.md |

**Sem alteracoes em SKILL.md, sem registro em `plugin-manifest.json`, sem skill nova.**

---

## Implementacao

### Passo 1: Tipos e parse

```typescript
// anti-vibe-coding/lib/todo-utils.ts
// 2026-05-11 (Luiz/dev): D31/S11/CA-44 — helpers agnosticos para TODO.md
// Skill /todo-pick (Plano 07) consome estes helpers. Confirmacao interativa para `remove`
// vive na skill, NAO neste helper (G8 do plano).
import * as fs from 'fs'

export type TodoState = 'open' | 'done' | 'skipped'

export type TodoItem = {
  lineIndex: number               // index 0-based na lista de linhas do arquivo
  state: TodoState
  description: string
  raw: string                     // linha original (para preservar formatting/indent)
}

/**
 * Parse `TODO.md` retornando apenas as linhas que sao itens checkbox.
 * Linhas nao-item (titulos, comentarios, separadores) sao ignoradas.
 * Indices preservam posicao original no arquivo (para mutate por lineIndex).
 */
export function parse(filePath: string): TodoItem[] {
  if (!fs.existsSync(filePath)) return []
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n')
  const items: TodoItem[] = []
  lines.forEach((line, idx) => {
    const m = /^(\s*- \[)([ xX-])(\]\s+)(.+)$/.exec(line)
    if (!m) return
    const state: TodoState = m[2] === ' ' ? 'open' : m[2].toLowerCase() === 'x' ? 'done' : 'skipped'
    items.push({
      lineIndex: idx,
      state,
      description: m[4],
      raw: line,
    })
  })
  return items
}

/**
 * Marca item como done (`- [x]`).
 * @throws se lineIndex nao for item checkbox
 */
export function markDone(filePath: string, lineIndex: number): void {
  mutateLine(filePath, lineIndex, (line) => {
    return line.replace(/^(\s*- \[)[ xX-](\])/, '$1x$2')
  })
}

/**
 * Marca item como skipped (`- [-]`). Preserva historia (nao deleta).
 */
export function skip(filePath: string, lineIndex: number): void {
  mutateLine(filePath, lineIndex, (line) => {
    return line.replace(/^(\s*- \[)[ xX-](\])/, '$1-$2')
  })
}

/**
 * Remove linha completamente do arquivo.
 * SEM CONFIRMACAO — skill consumidora DEVE confirmar antes (G8).
 * @throws se lineIndex nao for item checkbox (evita deletar titulo acidentalmente)
 */
export function remove(filePath: string, lineIndex: number): void {
  if (!fs.existsSync(filePath)) throw new Error(`TODO.md nao existe: ${filePath}`)
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n')
  if (lineIndex < 0 || lineIndex >= lines.length) {
    throw new Error(`todo-utils.remove: lineIndex ${lineIndex} fora do range`)
  }
  if (!/^\s*- \[[ xX-]\]/.test(lines[lineIndex])) {
    throw new Error(
      `todo-utils.remove: linha ${lineIndex} nao eh item checkbox — recusa para evitar delete acidental`,
    )
  }
  lines.splice(lineIndex, 1)
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8')
}

/**
 * Adiciona linha ao final do arquivo (ou cria arquivo se ausente).
 * Formato: `- [ ] {description}` com indent base 0.
 * Util para /execute-plan adicionar item out-of-scope (CA-33, Plano 07).
 */
export function addLine(filePath: string, description: string): void {
  if (!description.trim()) throw new Error('todo-utils.addLine: description vazia')
  const newLine = `- [ ] ${description}`

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, `# TODO\n\n${newLine}\n`, 'utf-8')
    return
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  // 2026-05-11 (Luiz/dev): garantir newline antes de append — evita colar na ultima linha
  const sep = content.endsWith('\n') ? '' : '\n'
  fs.writeFileSync(filePath, content + sep + newLine + '\n', 'utf-8')
}

function mutateLine(filePath: string, lineIndex: number, transform: (line: string) => string): void {
  if (!fs.existsSync(filePath)) throw new Error(`TODO.md nao existe: ${filePath}`)
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n')
  if (lineIndex < 0 || lineIndex >= lines.length) {
    throw new Error(`todo-utils: lineIndex ${lineIndex} fora do range`)
  }
  if (!/^\s*- \[[ xX-]\]/.test(lines[lineIndex])) {
    throw new Error(`todo-utils: linha ${lineIndex} nao eh item checkbox`)
  }
  lines[lineIndex] = transform(lines[lineIndex])
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8')
}
```

### Passo 2: Suite de testes

```typescript
// anti-vibe-coding/lib/todo-utils.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { parse, markDone, skip, remove, addLine } from './todo-utils'

const TMP = path.join(os.tmpdir(), 'todo-utils-test')
const TODO = path.join(TMP, 'TODO.md')

beforeEach(() => {
  if (fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true, force: true })
  fs.mkdirSync(TMP, { recursive: true })
  fs.writeFileSync(TODO, `# TODO

- [ ] foo
- [x] bar
- [-] baz
- [ ] qux
`)
})

describe('todo-utils.parse', () => {
  it('returns 4 items with correct states', () => {
    const items = parse(TODO)
    expect(items).toHaveLength(4)
    expect(items[0].state).toBe('open')
    expect(items[1].state).toBe('done')
    expect(items[2].state).toBe('skipped')
    expect(items[3].state).toBe('open')
  })

  it('preserves description', () => {
    const items = parse(TODO)
    expect(items[0].description).toBe('foo')
    expect(items[2].description).toBe('baz')
  })

  it('returns lineIndex referring to original file lines', () => {
    const items = parse(TODO)
    // file: `# TODO\n\n- [ ] foo\n...`
    // lineIndex of foo = 2 (line 0: '# TODO', line 1: '', line 2: '- [ ] foo')
    expect(items[0].lineIndex).toBe(2)
  })

  it('returns empty array when file missing', () => {
    expect(parse('/nonexistent')).toEqual([])
  })
})

describe('todo-utils.markDone', () => {
  it('changes [ ] to [x]', () => {
    const items = parse(TODO)
    markDone(TODO, items[0].lineIndex)
    const after = parse(TODO)
    expect(after[0].state).toBe('done')
    expect(after[0].description).toBe('foo')
  })

  it('throws on non-checkbox line', () => {
    expect(() => markDone(TODO, 0)).toThrow(/nao eh item checkbox/) // line 0 = '# TODO'
  })
})

describe('todo-utils.skip', () => {
  it('changes [ ] to [-]', () => {
    const items = parse(TODO)
    skip(TODO, items[0].lineIndex)
    const after = parse(TODO)
    expect(after[0].state).toBe('skipped')
  })

  it('preserves indent when skipping', () => {
    fs.writeFileSync(TODO, '  - [ ] indented item\n')
    const items = parse(TODO)
    skip(TODO, items[0].lineIndex)
    const content = fs.readFileSync(TODO, 'utf-8')
    expect(content).toBe('  - [-] indented item\n')
  })
})

describe('todo-utils.remove', () => {
  it('deletes line from file', () => {
    const items = parse(TODO)
    remove(TODO, items[2].lineIndex) // remove 'baz'
    const after = parse(TODO)
    expect(after.map((i) => i.description)).toEqual(['foo', 'bar', 'qux'])
  })

  it('refuses to remove non-checkbox line', () => {
    expect(() => remove(TODO, 0)).toThrow(/nao eh item checkbox/)
  })

  it('throws out-of-range', () => {
    expect(() => remove(TODO, 999)).toThrow(/fora do range/)
  })
})

describe('todo-utils.addLine', () => {
  it('appends new open item to existing TODO.md', () => {
    addLine(TODO, 'new task')
    const items = parse(TODO)
    expect(items).toHaveLength(5)
    expect(items[4].description).toBe('new task')
    expect(items[4].state).toBe('open')
  })

  it('creates TODO.md with header when missing', () => {
    const path2 = path.join(TMP, 'nonexistent.md')
    addLine(path2, 'first task')
    expect(fs.existsSync(path2)).toBe(true)
    const content = fs.readFileSync(path2, 'utf-8')
    expect(content).toContain('# TODO')
    expect(content).toContain('- [ ] first task')
  })

  it('throws on empty description', () => {
    expect(() => addLine(TODO, '   ')).toThrow(/description vazia/)
  })

  it('preserves trailing newline correctly', () => {
    fs.writeFileSync(TODO, 'no-newline-at-end') // sem \n final
    addLine(TODO, 'x')
    const content = fs.readFileSync(TODO, 'utf-8')
    expect(content.endsWith('- [ ] x\n')).toBe(true)
  })
})
```

---

## Gotchas

- **G8 do plano (skip vs remove):** `skip` preserva historia (linha vira `[-]`). `remove` deleta linha. Confirmacao interativa eh **na skill** (Plano 07), nao no helper.
- **06-A6 (escopo helpers apenas):** Sem `SKILL.md`, sem `plugin-manifest.json`. Plano 07 consome.
- **Local — `lineIndex` eh do arquivo, nao da lista de items:** Cuidado ao misturar com indice de array retornado por `parse`. Helper sempre opera sobre `lineIndex` do arquivo (preservado em `TodoItem.lineIndex`).
- **Local — regex de checkbox aceita `[ ]`, `[x]`, `[X]`, `[-]`:** Case-insensitive em `x/X`. NAO aceita outros estados (`[?]`, `[!]`) — apenas os 3 do PRD.
- **Local — indent preservation:** Regex usa `^(\s*- \[)` que captura indent leading. `mutateLine` preserva via `replace` parcial.
- **Local — append SEM nova linha intermediaria:** `addLine` adiciona apenas `\n{newLine}\n` ao final. Nao adiciona blank line de separacao (TODO.md eh denso por design).

---

## Verificacao

### TDD

- [ ] **RED:** Suite escrita antes do helper, todos os 16 testes falham
  - Comando: `cd anti-vibe-coding && bun test lib/todo-utils.test.ts`
  - Resultado esperado: `16 fail`

- [ ] **GREEN:** Helper implementado, todos passam
  - Comando: `cd anti-vibe-coding && bun test lib/todo-utils.test.ts`
  - Resultado esperado: `16 pass, 0 fail`

### Checklist

- [ ] `parse` retorna `TodoItem[]` com `state` correto para os 3 estados
- [ ] `parse` preserva `lineIndex` original (nao reindex)
- [ ] `markDone(file, idx)` muda `[ ]` para `[x]`
- [ ] `skip(file, idx)` muda `[ ]` para `[-]`, preservando indent
- [ ] `remove(file, idx)` deleta linha sem pedir confirmacao (helper agnostico)
- [ ] `remove` recusa linha nao-checkbox (evita delete acidental de titulo)
- [ ] `addLine(file, desc)` appenda `- [ ] {desc}` ao final
- [ ] `addLine` cria arquivo com header `# TODO\n\n` se ausente
- [ ] Todos os 4 helpers throw em lineIndex fora do range / arquivo ausente
- [ ] **SEM** `SKILL.md` novo, **SEM** alteracao em `plugin-manifest.json`, **SEM** skill `/todo-pick`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**

- `cd anti-vibe-coding && bun test lib/todo-utils.test.ts` retorna `16 pass, 0 fail`.
- `bun -e "console.log(require('./lib/todo-utils').parse('./TODO.md').length)"` em fixture com 4 items imprime `4`.
- `ls anti-vibe-coding/skills/todo-pick` retorna erro (skill ainda nao existe) — confirma escopo helpers-only.
- CA-44 verbatim (parcial — apenas mecanica do helper): `parse` + `skip(idx)` + re-`parse` mostra item virou `[-]`. `remove(idx)` deleta linha. Skill com confirmacao interativa fica para Plano 07.

**Por humano:**

- N/A.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
