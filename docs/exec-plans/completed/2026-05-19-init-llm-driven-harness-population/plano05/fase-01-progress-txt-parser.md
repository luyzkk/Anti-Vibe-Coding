<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-19 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: progress-txt Parser

**Plano:** 05 — Progress.txt import + SKILL.md + E2E
**Sizing:** 1h
**Depende de:** Nenhuma (primeira fase do plano)
**Visual:** false

---

## O que esta fase entrega

Lib pura `progress-txt-parser.ts` que recebe o conteudo de `.claude/progress.txt` e devolve `ProgressEntry[]` com `{ index, title, category, body, sourceLineNumber, slug }`. Cobre MH-10 (parte 1 — leitura/parse). Resolve a primeira metade de CA-05: garantir que N gotchas no arquivo viram N entradas estruturadas.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/progress-txt-parser.ts` | Create | Lib pura: `parseProgressTxt(content: string): ProgressEntry[]` |
| `skills/init/lib/progress-txt-parser.test.ts` | Create | Suite com fixtures inline (formato Licitar + formato Dashboard Comu + edge cases) |
| `skills/init/lib/slug.ts` | Read/Reuse | Helper existente de slugify (verificar com `grep -rn "slugify\|toKebab"`) — se nao existir, criar minimo `kebab(title: string): string` no mesmo arquivo do parser |
| `tests/fixtures/progress-txt-licitar.txt` | Create | Snippet ~50 linhas do `progress.txt` real de Licitar (sanitizado, sem dados sensiveis) usado como fixture |

---

## Implementacao

### Passo 1: definir tipo + contrato

```typescript
// skills/init/lib/progress-txt-parser.ts

/**
 * Entrada compound extraida de `.claude/progress.txt`.
 * - `index`: ordem 1-based no arquivo (estabiliza prefixo `{nnnn}-` no writer).
 * - `sourceLineNumber`: linha 1-based onde o heading `### ` aparece.
 * - `category`: extraida do prefixo `[Categoria]` quando presente (ex: `[Armadilha]`, `[Processo]`).
 *                Default `'gotcha'` quando ausente.
 * - `title`: heading sem o prefixo `### ` e sem o `[Categoria]`.
 * - `body`: linhas entre este heading e o proximo `### ` (ou EOF), preservando markdown bruto.
 * - `slug`: kebab-case do title, truncado a 60 chars.
 */
export type ProgressEntry = {
  index: number
  sourceLineNumber: number
  category: string
  title: string
  body: string
  slug: string
}
```

### Passo 2: implementar parser heuristico

```typescript
// skills/init/lib/progress-txt-parser.ts (continuacao)

// 2026-05-19 (Luiz/dev): heading detector — formato Licitar/Dashboard Comu.
// Aceita "### [Categoria] Title" e "### N. Title" e "### Title".
const HEADING_RE = /^###\s+(?:\[([^\]]+)\]\s+)?(?:\d+\.\s+)?(.+?)\s*$/

function kebab(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')
}

/**
 * Parseia o conteudo bruto de `.claude/progress.txt` em entradas estruturadas.
 * Tolerante: blocos sem `**Contexto/Erro/Solucao**` ainda viram entrada (body preservado).
 * Headings de nivel diferente (## ou #) NAO sao tratados — apenas `### ` no inicio da linha.
 */
export function parseProgressTxt(content: string): ProgressEntry[] {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/)
  const entries: ProgressEntry[] = []

  let current: { lineNo: number; category: string; title: string; bodyLines: string[] } | null = null
  let index = 0

  const flush = (): void => {
    if (current === null) return
    index += 1
    entries.push({
      index,
      sourceLineNumber: current.lineNo,
      category: current.category,
      title: current.title,
      body: current.bodyLines.join('\n').replace(/\s+$/g, ''),
      slug: kebab(current.title) || `entry-${String(index).padStart(4, '0')}`,
    })
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? ''
    const match = HEADING_RE.exec(line)
    if (match !== null) {
      flush()
      current = {
        lineNo: i + 1,
        category: (match[1] ?? 'gotcha').toLowerCase(),
        title: (match[2] ?? '').trim(),
        bodyLines: [],
      }
      continue
    }
    if (current !== null) {
      current.bodyLines.push(line)
    }
  }
  flush()

  return entries
}
```

### Passo 3: fixture sanitizada

Salvar em `tests/fixtures/progress-txt-licitar.txt`:

```
# Progress - Licoes Aprendidas e Gotchas

Este arquivo documenta bugs corrigidos, gotchas descobertos e padroes importantes.

---

### [Processo] TDD: commit RED DEVE preceder commit GREEN mesmo em fases triviais
**Contexto:** Feature Caixas Escolares. Auditoria pos-execucao detectou ordem invertida.
**Erro:** Em fases percebidas como triviais, o subagente pulou commit separado de RED.
**Solucao:** TODA fase com mudanca de comportamento DEVE ter 2 commits — test (RED) e feat (GREEN).

---

## Gotchas Conhecidos

### 1. UPSERT com numero_controle_pncp
**Contexto:** Sincronizacao de dados do PNCP para Supabase
**Erro:** INSERT duplicado causava erro de unique constraint
**Solucao:** Usar `ON CONFLICT (...) DO UPDATE` para operacoes idempotentes

### 2. Rate Limit da API PNCP
**Contexto:** Chamadas em lote
**Erro:** HTTP 429 apos muitas chamadas
**Solucao:** Implementar delay de 600ms entre requisicoes
```

### Passo 4: testes RED -> GREEN

```typescript
// skills/init/lib/progress-txt-parser.test.ts
import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseProgressTxt } from './progress-txt-parser'

const FIXTURE = path.join(import.meta.dir, '..', '..', '..', 'tests', 'fixtures', 'progress-txt-licitar.txt')

describe('parseProgressTxt', () => {
  it('returns empty array for empty input', () => {
    expect(parseProgressTxt('')).toEqual([])
  })

  it('extracts a single entry from a minimal block', () => {
    const input = `# Header
---
### [Armadilha] Foo bar
**Contexto:** algo
`
    const entries = parseProgressTxt(input)
    expect(entries).toHaveLength(1)
    expect(entries[0]?.title).toBe('Foo bar')
    expect(entries[0]?.category).toBe('armadilha')
    expect(entries[0]?.slug).toBe('foo-bar')
    expect(entries[0]?.sourceLineNumber).toBe(3)
    expect(entries[0]?.body).toContain('**Contexto:** algo')
  })

  it('extracts entries with numbered heading "### N. Title"', () => {
    const input = `### 1. UPSERT idempotente
body line
### 2. Rate limit
body 2`
    const entries = parseProgressTxt(input)
    expect(entries).toHaveLength(2)
    expect(entries[0]?.title).toBe('UPSERT idempotente')
    expect(entries[1]?.title).toBe('Rate limit')
    expect(entries[0]?.index).toBe(1)
    expect(entries[1]?.index).toBe(2)
  })

  it('uses category=gotcha as default when prefix [..] is absent', () => {
    const input = `### Plain title`
    const entries = parseProgressTxt(input)
    expect(entries[0]?.category).toBe('gotcha')
  })

  it('strips UTF-8 BOM transparently', () => {
    const input = `\uFEFF### Title`
    const entries = parseProgressTxt(input)
    expect(entries).toHaveLength(1)
    expect(entries[0]?.title).toBe('Title')
  })

  it('parses the Licitar fixture without throwing and returns >=4 entries', async () => {
    const content = await fs.readFile(FIXTURE, 'utf-8')
    const entries = parseProgressTxt(content)
    expect(entries.length).toBeGreaterThanOrEqual(4)
    // CA-05 piece: numero da linha de origem preservado
    expect(entries.every((e) => e.sourceLineNumber > 0)).toBe(true)
    // slugs unicos (sufixo de fallback so se necessario — fixture nao tem colisao)
    const slugs = entries.map((e) => e.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('preserves body markdown verbatim (no strip)', () => {
    const input = `### Title
**Contexto:** x
**Solucao:** y`
    const entries = parseProgressTxt(input)
    expect(entries[0]?.body).toContain('**Contexto:** x')
    expect(entries[0]?.body).toContain('**Solucao:** y')
  })
})
```

---

## Gotchas

- **G1 do plano:** Formato heterogeneo entre projetos. Heuristica baseada em `### ` no inicio da linha funciona para Licitar + Dashboard Comu mas pode falhar em outros. Em caso de bloco com 0 entradas extraidas no real, registrar em `MEMORY.md` e ampliar heuristica.
- **G2 do plano:** Slug derivado de title pode colidir. Prefixo `{nnnn}-` (4 digits zero-padded) e adicionado no writer (fase-02), nao aqui. Aqui so geramos slug "base".
- **G8 do plano:** UTF-8 BOM. Testes incluem caso explicito com `\uFEFF`. Em projeto real, `fs.readFile(path, 'utf-8')` ja strip — defensivo no parser cobre arquivos lidos por outras vias.
- **Local:** Markdown horizontal rule (`---`) entre entradas NAO e heading; o regex `^###\s+` so casa heading proprio. Verificar no fixture (ja tem `---` separadores).
- **Local:** Linha em branco no fim do body NAO deve ir para arquivo de saida (fase-02). Aqui mantemos body bruto; `trimEnd()` no flush ja remove trailing whitespace.

---

## Verificacao

### TDD

- [ ] **RED:** Teste escrito e FALHA por assertion (arquivo `progress-txt-parser.ts` ainda nao existe)
  - Comando: `bun test skills/init/lib/progress-txt-parser.test.ts`
  - Resultado esperado: TODOS os 7 testes FAIL com `Cannot find module './progress-txt-parser'` -> apos stub: assertion errors reais

- [ ] **GREEN:** Codigo minimo implementado, todos os testes passam
  - Comando: `bun test skills/init/lib/progress-txt-parser.test.ts`
  - Resultado esperado: `7 pass, 0 fail`

### Checklist

- [ ] Fixture `tests/fixtures/progress-txt-licitar.txt` criada e sanitizada (sem CNPJ, sem chaves)
- [ ] `parseProgressTxt('')` retorna `[]` (nao throw, nao undefined)
- [ ] `parseProgressTxt(BOM_INPUT)` strip BOM e parseia normal
- [ ] `entries[i].sourceLineNumber` aponta para a linha exata do `### ` no arquivo (1-indexed)
- [ ] `entries[i].slug` so contem `[a-z0-9-]`, sem trailing dash, max 60 chars
- [ ] Testes passam: `bun test skills/init/lib/progress-txt-parser.test.ts`
- [ ] Lint limpo: `bun run lint skills/init/lib/progress-txt-parser.ts`
- [ ] TypeCheck: `bun run typecheck` se configurado

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/progress-txt-parser.test.ts` retorna `7 pass, 0 fail`
- `bun test skills/init/lib/progress-txt-parser.test.ts -t "Licitar fixture"` confirma `>= 4 entries` parseadas
- `entries.every(e => e.sourceLineNumber > 0 && e.slug.length > 0)` verdadeiro no fixture real

**Por humano (se aplicavel):**
- Releitura dos slugs gerados para o fixture Licitar nao revela duplicacao nem stripping agressivo (ex: nao perdeu palavras-chave)

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
