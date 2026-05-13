<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-11 (Luiz/dev): default 'oldest' — alinhado com PRD §D8 Fluxo E`
-->

# Fase 02: Estender `lib/todo-utils.ts` com helpers de selecao (ambiguity 07-A1)

**Plano:** 07 — TODO.md + /todo-pick
**Sizing:** 1h
**Depende de:** Plano 06 fase-07 (`lib/todo-utils.ts` baseline com `parse/markDone/addLine/skip/remove`)
**Visual:** false

---

## O que esta fase entrega

Extensao do `lib/todo-utils.ts` com 5 novos exports (`parseLine`, `listPending`, `filterByStatus`, `pickNext`, `scoreByPriority`) — selecao tipada agnostica de skill. Resolve **ambiguity 07-A1** opcao **b** do README.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `lib/todo-utils.ts` | Modify | Adicionar tipos `TodoItem`, `TodoStatus`, `PickStrategy` + funcoes `parseLine`, `listPending`, `filterByStatus`, `pickNext`, `scoreByPriority` |
| `tests/lib/todo-utils-pick.test.ts` | Create | Testes unitarios cobrindo selecao em arrays sinteticos (sem I/O) |

---

## Implementacao

### Passo 1: Tipos e contrato

```typescript
// 2026-05-11 (Luiz/dev): TodoStatus reflete os 3 estados de checkbox markdown
// Referencia: PRD §Componente G (D8)
export type TodoStatus = 'pending' | 'done' | 'skipped'

// 2026-05-11 (Luiz/dev): classifier opcional — linha pode ser livre
// Referencia: G1 do plano (PRD §Componente G mostra 2 formatos: file: e feature:)
export type TodoClassifier =
  | { kind: 'file'; path: string; line: number | null }
  | { kind: 'feature'; name: string }
  | null

export type TodoItem = {
  lineIndex: number        // linha no arquivo (0-based)
  raw: string              // linha bruta para round-trip de write
  status: TodoStatus
  date: string | null      // YYYY-MM-DD ou null se nao tem
  classifier: TodoClassifier
  description: string
}

// 2026-05-11 (Luiz/dev): 'oldest' eh a unica estrategia em v6.0.0
// Referencia: 07-A8 do README — outras estrategias ficam para v6.1+
export type PickStrategy = 'oldest'
```

### Passo 2: `parseLine`

```typescript
// 2026-05-11 (Luiz/dev): regex tolerante — classifier opcional, date opcional
// Referencia: G1 do plano (D8 formato + linhas livres)
const LINE_REGEX = /^-\s*\[(?<box>[ x-])\]\s*(?:\{(?<date>\d{4}-\d{2}-\d{2})\})?\s*(?:\{(?<classifier>[^}]+)\})?\s*(?<desc>.*)$/

export function parseLine(raw: string, lineIndex: number): TodoItem | null {
  const trimmed = raw.trimEnd()
  const match = trimmed.match(LINE_REGEX)
  if (!match || !match.groups) return null

  const box = match.groups.box
  const status: TodoStatus =
    box === 'x' ? 'done' : box === '-' ? 'skipped' : 'pending'

  const classifier = parseClassifier(match.groups.classifier ?? null)

  return {
    lineIndex,
    raw,
    status,
    date: match.groups.date ?? null,
    classifier,
    description: (match.groups.desc ?? '').trim(),
  }
}

// 2026-05-11 (Luiz/dev): aceita 'file:path:line' OU 'feature:name' OU null
function parseClassifier(input: string | null): TodoClassifier {
  if (!input) return null
  if (input.startsWith('file:')) {
    const rest = input.slice(5)
    const lastColon = rest.lastIndexOf(':')
    if (lastColon === -1) return { kind: 'file', path: rest, line: null }
    const linePart = rest.slice(lastColon + 1)
    const lineNum = /^\d+$/.test(linePart) ? Number(linePart) : null
    const path = lineNum !== null ? rest.slice(0, lastColon) : rest
    return { kind: 'file', path, line: lineNum }
  }
  if (input.startsWith('feature:')) {
    return { kind: 'feature', name: input.slice(8).trim() }
  }
  return null
}
```

### Passo 3: `listPending`, `filterByStatus`, `pickNext`, `scoreByPriority`

```typescript
// 2026-05-11 (Luiz/dev): selecao tipada — agnostica de I/O, agnostica de skill
// Referencia: ambiguity 07-A1 opcao b — extende baseline de Plano 06 fase-07

export function filterByStatus(items: TodoItem[], status: TodoStatus): TodoItem[] {
  return items.filter((item) => item.status === status)
}

export function listPending(items: TodoItem[]): TodoItem[] {
  return filterByStatus(items, 'pending')
}

// 2026-05-11 (Luiz/dev): score = age em dias desde 'date' (mais antigo = score maior)
// Sem date → score 0 (vai ao fim do ranking)
export function scoreByPriority(item: TodoItem, today: Date = new Date()): number {
  if (!item.date) return 0
  const parsed = new Date(item.date + 'T00:00:00Z')
  const diffMs = today.getTime() - parsed.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

// 2026-05-11 (Luiz/dev): pickNext retorna null se nada pending — skill diferencia
// vazio de erro. Referencia: DI-1 candidato em MEMORY.md
export function pickNext(
  items: TodoItem[],
  strategy: PickStrategy = 'oldest',
): TodoItem | null {
  const pending = listPending(items)
  if (pending.length === 0) return null
  if (strategy === 'oldest') {
    // ordem do arquivo eh a ordem cronologica natural (append-only)
    return pending[0]
  }
  return pending[0]
}
```

### Passo 4: Testes unitarios

```typescript
// 2026-05-11 (Luiz/dev): cobertura RED para os 5 novos exports
import { describe, it, expect } from 'bun:test'
import {
  parseLine,
  listPending,
  filterByStatus,
  pickNext,
  scoreByPriority,
} from '../../lib/todo-utils'

describe('parseLine', () => {
  it('parses pending file-classified item', () => {
    const item = parseLine('- [ ] {2026-05-12} {file:src/foo.ts:42} typo', 0)
    expect(item?.status).toBe('pending')
    expect(item?.date).toBe('2026-05-12')
    expect(item?.classifier).toEqual({ kind: 'file', path: 'src/foo.ts', line: 42 })
    expect(item?.description).toBe('typo')
  })

  it('parses feature-classified item', () => {
    const item = parseLine('- [ ] {2026-05-12} {feature:billing} extract magic number', 1)
    expect(item?.classifier).toEqual({ kind: 'feature', name: 'billing' })
  })

  it('parses free-form item without classifier', () => {
    const item = parseLine('- [ ] free description', 2)
    expect(item?.classifier).toBeNull()
    expect(item?.description).toBe('free description')
  })

  it('parses done and skipped states', () => {
    expect(parseLine('- [x] done item', 0)?.status).toBe('done')
    expect(parseLine('- [-] skipped item', 0)?.status).toBe('skipped')
  })

  it('returns null for non-item line', () => {
    expect(parseLine('# TODO', 0)).toBeNull()
    expect(parseLine('', 0)).toBeNull()
  })
})

describe('listPending / filterByStatus', () => {
  const sample = [
    parseLine('- [ ] a', 0)!,
    parseLine('- [x] b', 1)!,
    parseLine('- [-] c', 2)!,
    parseLine('- [ ] d', 3)!,
  ]
  it('listPending returns only pending', () => {
    const pending = listPending(sample)
    expect(pending).toHaveLength(2)
    expect(pending.map((i) => i.description)).toEqual(['a', 'd'])
  })
  it('filterByStatus(done) returns only done', () => {
    expect(filterByStatus(sample, 'done')).toHaveLength(1)
  })
})

describe('pickNext', () => {
  it('returns first pending in oldest strategy', () => {
    const items = [
      parseLine('- [x] done', 0)!,
      parseLine('- [ ] first pending', 1)!,
      parseLine('- [ ] second pending', 2)!,
    ]
    const picked = pickNext(items, 'oldest')
    expect(picked?.description).toBe('first pending')
  })
  it('returns null when no pending', () => {
    const items = [parseLine('- [x] done', 0)!, parseLine('- [-] skipped', 1)!]
    expect(pickNext(items, 'oldest')).toBeNull()
  })
})

describe('scoreByPriority', () => {
  it('returns days since date', () => {
    const item = parseLine('- [ ] {2026-05-01} old item', 0)!
    const today = new Date('2026-05-11T00:00:00Z')
    expect(scoreByPriority(item, today)).toBe(10)
  })
  it('returns 0 for item without date', () => {
    const item = parseLine('- [ ] no date', 0)!
    expect(scoreByPriority(item)).toBe(0)
  })
})
```

---

## Gotchas

- **07-A1 do plano (escopo da fase):** Opcao b — estender, nao recriar. Imports de `parse/markDone/addLine/skip/remove` ja existentes em `lib/todo-utils.ts` permanecem intactos. Adicionar abaixo dos existentes com comentario provenance.
- **G1 do plano (formato D8):** Regex `LINE_REGEX` aceita classifier opcional e date opcional. Linhas sem `{classifier}` viram `classifier: null` — valido.
- **Local — escolha de regex vs parser stream:** Regex eh suficiente para line-by-line. Nao introduzir parser AST (overkill para TODO list).
- **Local — timezone em `scoreByPriority`:** Usar UTC (`T00:00:00Z`) para evitar off-by-one em mudancas de fuso. Tests usam datas UTC fixas — determinismo.

---

## Verificacao

### TDD

- [ ] **RED:** Testes em `tests/lib/todo-utils-pick.test.ts` FALHAM com `parseLine is not a function` (ou TS compile error que vira "Cannot find name 'parseLine'" se imports falharem). Corrigir para vazio retornando `null` para que vire assertion failure.
  - Comando: `bun run test -- --grep 'parseLine|listPending|pickNext|scoreByPriority'`
  - Resultado esperado: `Expected ..., received null` (assertion failures)

- [ ] **GREEN:** Implementacao do Passo 1-3 em `lib/todo-utils.ts`. Todos os testes passam.
  - Comando: `bun run test -- --grep 'parseLine|listPending|pickNext|scoreByPriority'`
  - Resultado esperado: `14 passed, 0 failed` (5 parseLine + 2 listPending + 2 pickNext + 2 scoreByPriority + 3 free-form/edge)

### Checklist

- [ ] `lib/todo-utils.ts` mantem exports baseline de Plano 06 (`parse`, `markDone`, `addLine`, `skip`, `remove`) — nenhum removido
- [ ] 5 novos exports adicionados: `parseLine`, `listPending`, `filterByStatus`, `pickNext`, `scoreByPriority`
- [ ] Tipos `TodoItem`, `TodoStatus`, `TodoClassifier`, `PickStrategy` exportados
- [ ] Provenance comments em todos os exports novos (G9)
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck strict: `bun run typecheck` (sem `any`, sem `as`)

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- --grep 'todo-utils-pick'` retorna `14 passed, 0 failed`
- `bun run typecheck` retorna exit 0 (sem novos erros TS)
- `grep -c "export" lib/todo-utils.ts` retorna >= 10 (5 baseline + 5 novos)

**Por humano:**
- Inspecao do JSDoc do `parseLine` deixa claro que classifier eh opcional e linha livre eh valida (G1)

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
