<!--
Princípio universal #5 — Comment Provenance.
Esta fase tem código TypeScript modificável (RF10 no /init). Comentários inline devem ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (PRD seção ou DI).
Exemplo válido para esta fase:
  // 2026-05-16 (Luiz/dev): top-N=8 — alinhado com RF10 (preview curto, não lista completa)
-->

# Fase 05: RF10 (preview de keywords no `/init`) + RF11 (audit-trail paths em `sources:`)

**Plano:** 06 — Atom Batch C + INDEX + Polish
**Sizing:** 1-1.5h
**Depende de:** fase-04 deste plano (INDEX final tem keywords agregadas — RF10 depende do parse) + Plano 02 fase-04 (writer do `/init` que emite `knowledge_copied`)
**Visual:** false

---

## O que esta fase entrega

Implementa os 2 Could Haves do PRD:

- **RF10 — Preview de keywords no output do `/init`:** após o evento `knowledge_copied` ser emitido (Plano 02 fase-04), o `/init` mostra ao usuário uma linha como `"Knowledge cobre: event loop, prisma, pino, owasp node, v8 hot paths, ..."` extraída dos top-N keywords do `INDEX.md` recém-copiado. Top-N decidido como 8 (preview curto, scanable, não lista completa).
- **RF11 — Audit-trail paths em `sources:`:** auditoria nos 14 átomos para garantir que cada source do frontmatter `sources:` está acompanhada do caminho absoluto da fonte em `claude-code/knowledge/Nodejs/`. Hipótese: Planos 04 e 05 já preencheram durante a escrita dos átomos (ver DI-2 do MEMORY.md deste plano). Se sim, RF11 é no-op verificável (snapshot test). Se não, fase adiciona path absoluto entre parênteses sem reescrever resto do frontmatter.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/SKILL.md` | Modify | Adicionar output "Knowledge cobre: ..." após emissão de `knowledge_copied` (RF10) |
| `skills/init/lib/format-knowledge-preview.ts` | Create (provável) | Helper que parseia `INDEX.md` e extrai top-N keywords formatadas |
| `skills/init/lib/format-knowledge-preview.test.ts` | Create | Teste RED→GREEN do parser + format |
| `docs/knowledge/nodejs-typescript/atoms/*.md` | Modify (condicional) | Adicionar audit-trail-paths em `sources:` se algum dos 14 átomos não tiver (RF11) |

---

## Implementacao

### Passo 1 (RF11 audit primeiro — pode ser no-op): verificar status dos 14 átomos

```bash
# Para cada átomo, verificar se sources: contém path absoluto entre parênteses
for atom in docs/knowledge/nodejs-typescript/atoms/*.md; do
  # Procurar pattern "- research: <id> (claude-code/knowledge/Nodejs/wf-<id>.md)" ou "- skill: <path> (claude-code/knowledge/Nodejs/<path>)"
  has_path=$(awk '/^sources:/,/^[a-z]/' "$atom" | grep -cE '\(claude-code/knowledge/Nodejs/')
  if [ "$has_path" -eq 0 ]; then
    echo "FALTA AUDIT-TRAIL: $atom"
  fi
done
```

**Resultado A — todos os 14 átomos já têm audit-trail-paths:** RF11 é no-op verificável; registrar em DI-2 do MEMORY.md como "RF11 cumprido pelos Planos 04+05; sem mudanças necessárias"; pular para Passo 2 (RF10).

**Resultado B — N átomos sem audit-trail:** anexar path entre parênteses sem reescrever resto. Formato exato:

```yaml
# Antes:
sources:
  - research: 55c3ca89
  - skill: nodejs-core/rules/v8-garbage-collection.md

# Depois (RF11 cumprido):
sources:
  - research: 55c3ca89 (claude-code/knowledge/Nodejs/wf-55c3ca89.md)
  - skill: nodejs-core/rules/v8-garbage-collection.md (claude-code/knowledge/Nodejs/nodejs-core/rules/v8-garbage-collection.md)
```

Edição via Edit tool, item por item, **sem alterar a ordem** dos campos do frontmatter (G1 do plano: zero drift).

### Passo 2 (RF10 — RED test primeiro): definir formato esperado do output

Criar teste RED em `skills/init/lib/format-knowledge-preview.test.ts`:

```typescript
// 2026-05-16 (Luiz/dev): RF10 — preview de keywords no output do /init (PRD §Could Haves)
import { describe, it, expect } from 'vitest'
import { formatKnowledgePreview, parseTopKeywords } from './format-knowledge-preview'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

describe('format-knowledge-preview (RF10)', () => {
  it('extrai top-N keywords do INDEX.md', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'kn-preview-'))
    const indexPath = join(tmpDir, 'INDEX.md')
    writeFileSync(indexPath, `# Node.js + TypeScript — Senior Knowledge Index

## Por keyword

| Keyword | Átomos |
|---|---|
| event loop, promise, async | [async-concurrency-streams](./atoms/async-concurrency-streams.md) |
| prisma, drizzle, n+1 | [data-persistence](./atoms/data-persistence.md) |
| pino, telemetry | [error-handling-observability](./atoms/error-handling-observability.md) |
| owasp node, prototype pollution | [security-stack-specific](./atoms/security-stack-specific.md) |
| v8, gc, hidden classes | [performance-and-internals](./atoms/performance-and-internals.md) |
`)

    const keywords = parseTopKeywords(indexPath, 8)
    expect(keywords.length).toBeGreaterThan(0)
    expect(keywords.length).toBeLessThanOrEqual(8)
    expect(keywords).toContain('event loop')
    expect(keywords).toContain('prisma')

    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('formata preview como string consumível', () => {
    const formatted = formatKnowledgePreview(['event loop', 'prisma', 'pino', 'owasp node', 'v8'])
    expect(formatted).toMatch(/Knowledge cobre:/)
    expect(formatted).toContain('event loop')
    expect(formatted).toContain('prisma')
  })

  it('retorna string vazia quando INDEX.md não existe (graceful)', () => {
    const keywords = parseTopKeywords('/path/que/nao/existe/INDEX.md', 8)
    expect(keywords).toEqual([])
    expect(formatKnowledgePreview(keywords)).toBe('')
  })
})
```

Rodar — deve FALHAR por compilation error (arquivos ainda não existem) ou assertion error.

### Passo 3 (RF10 — GREEN minimal): implementar parser + format

Criar `skills/init/lib/format-knowledge-preview.ts`:

```typescript
// 2026-05-16 (Luiz/dev): RF10 — parser do INDEX.md + formato do preview (PRD §Could Haves, Plano 06 fase-05)
import { existsSync, readFileSync } from 'node:fs'

// G3 deste plano: top-N = 8 mantém output scanable; lista completa polui (~14 átomos × 5 keywords = 70).
export function parseTopKeywords(indexPath: string, topN: number = 8): string[] {
  if (!existsSync(indexPath)) return []

  const content = readFileSync(indexPath, 'utf-8')

  // Localizar seção "## Por keyword" e parsear tabela markdown subsequente
  const sectionMatch = content.match(/##\s+Por\s+keyword\s*\n([\s\S]*?)(?=\n##\s|$)/i)
  if (!sectionMatch) return []

  const sectionBody = sectionMatch[1]
  const keywords: string[] = []

  // Cada linha da tabela: | keyword1, keyword2, ... | [atom](path) |
  // Filtramos header (| Keyword | Átomos |) e separador (|---|---|)
  const tableRows = sectionBody.split('\n').filter((line) => {
    const trimmed = line.trim()
    return trimmed.startsWith('|') && !trimmed.startsWith('|---') && !trimmed.toLowerCase().includes('keyword |')
  })

  for (const row of tableRows) {
    const cells = row.split('|').map((c) => c.trim()).filter(Boolean)
    if (cells.length < 2) continue
    const cellKeywords = cells[0].split(',').map((k) => k.trim()).filter(Boolean)
    keywords.push(...cellKeywords)
  }

  // Dedup preservando ordem; primeiros N
  const seen = new Set<string>()
  const result: string[] = []
  for (const kw of keywords) {
    if (!seen.has(kw)) {
      seen.add(kw)
      result.push(kw)
      if (result.length >= topN) break
    }
  }

  return result
}

export function formatKnowledgePreview(keywords: string[]): string {
  if (keywords.length === 0) return ''
  return `Knowledge cobre: ${keywords.join(', ')}.`
}
```

Rodar teste — deve passar (GREEN).

### Passo 4 (RF10 — wire no /init SKILL.md ou helper de output existente)

Localizar o ponto no `skills/init/SKILL.md` (ou módulo extraído) onde o evento `knowledge_copied` é emitido (Plano 02 fase-04). Logo após esse ponto, adicionar:

```typescript
// 2026-05-16 (Luiz/dev): RF10 preview — append top-N keywords ao output user-facing (PRD §Could Haves)
import { parseTopKeywords, formatKnowledgePreview } from './lib/format-knowledge-preview'
const indexPathInProject = '.claude/knowledge/INDEX.md'
const preview = formatKnowledgePreview(parseTopKeywords(indexPathInProject, 8))
if (preview) {
  console.log(preview)
}
```

Se o `/init` já tem helper centralizado de output (ex: `skills/init/lib/output-renderer.ts`), preferir adicionar lá em vez de inline no SKILL.md — manter SKILL.md fino.

### Passo 5 (RF10 — REFACTOR): garantir <10ms overhead + graceful

- Parser lê arquivo único `~/.claude/knowledge/INDEX.md` (≤100 linhas, ms-scale) — sem regex pesada, sem AST markdown completo
- Quando `.claude/knowledge/INDEX.md` não existe (ex: stack não detectada CA-06, ou skip CA-04), `parseTopKeywords` retorna `[]` e `formatKnowledgePreview([])` retorna `''` — nenhuma linha extra no output (graceful)
- Adicionar teste de performance opcional: `expect(durationMs).toBeLessThan(10)`

### Passo 6 (verificação RF11 final): snapshot test

Criar `skills/init/lib/atoms-rf11-audit.test.ts` (ou similar) — valida que todos os 14 átomos têm path absoluto em `sources:`:

```typescript
// 2026-05-16 (Luiz/dev): RF11 snapshot — todos os 14 átomos têm audit-trail-path em sources (PRD §Could Haves)
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

describe('RF11 — audit-trail paths em sources', () => {
  it('todos os 14 átomos têm pelo menos um path absoluto entre parênteses em sources:', () => {
    const atomsDir = 'docs/knowledge/nodejs-typescript/atoms'
    const atoms = readdirSync(atomsDir).filter((f) => f.endsWith('.md'))
    expect(atoms.length).toBe(14)

    for (const atom of atoms) {
      const content = readFileSync(join(atomsDir, atom), 'utf-8')
      const sourcesBlock = content.match(/^sources:\s*\n([\s\S]*?)(?=^[a-z]+:|^---)/m)
      expect(sourcesBlock, `${atom} sem bloco sources:`).toBeTruthy()
      const hasAuditPath = /\(claude-code\/knowledge\/Nodejs\/[^)]+\)/.test(sourcesBlock![1])
      expect(hasAuditPath, `${atom}: sources: não contém audit-trail-path entre parênteses`).toBe(true)
    }
  })
})
```

Rodar — se passar, RF11 cumprido em snapshot. Se falhar, voltar ao Passo 1 e adicionar paths nos átomos faltantes.

---

## Gotchas

- **G1 do plano (zero drift de formato):** ao adicionar audit-trail-path em `sources:`, **não reescrever** o frontmatter inteiro — apenas anexar `(...)` ao value existente. Ordem dos 8 campos do frontmatter permanece intacta. Verificar com `diff` antes e depois de cada edição.
- **G3 do plano (sources: compass-id no value, path no parêntese):** o frontmatter continua sendo `- research: 55c3ca89 (...)`. NÃO mudar para `- research: claude-code/knowledge/Nodejs/wf-55c3ca89.md` (perde compass-id). O parêntese é audit-trail anexo, não substituição.
- **G11 do plano (RF11 pode já estar cumprido):** rodar Passo 1 audit antes de qualquer edit. Se 14/14 já têm path, fase-05 vira ~30min (só Passo 2-5 RF10) em vez de ~90min.
- **Local — top-N=8 é arbitrário mas defendido:** PRD §Could Haves não fixa N. Preview muito curto (<5) não convence; muito longo (>10) polui. 8 keywords cabem em 1 linha de terminal típico (80 col). Comentar a escolha inline (Passo 3 — provenance) para futura iteração ajustar com dados.
- **Local — parser é "good enough", não AST markdown completo:** regex sobre `## Por keyword` + tabela é suficiente para um INDEX bem-formado (controlado por nós em fase-04). Se INDEX vier malformado, parser retorna `[]` → preview vazio (graceful CA-09 espírito). Não over-engineer.
- **Local — wire do RF10 depende do shape do `/init` pós-Plano 02:** Plano 02 fase-04 instrumenta `/init` com telemetria. O ponto exato de wire depende de como Plano 02 estruturou o flow (inline SKILL.md vs helper centralizado em `lib/`). Antes de Passo 4, ler `skills/init/SKILL.md` e identificar o emit de `knowledge_copied` — anexar logo após.
- **Local — graceful CA-09 spirit:** se `.claude/knowledge/INDEX.md` não existe (stack não detectada CA-06, ou knowledge não copiado CA-03), `parseTopKeywords` retorna `[]` e preview não imprime nada. Zero warning, zero log. Espírito alinhado com `stack-aware-preface` (Plano 01 fase-04 / Plano 03).

---

## Verificacao

### TDD

- [ ] **RED:** Teste de `format-knowledge-preview.test.ts` escrito e FALHA por compilation error ou assertion
  - Comando: `bun run test -- format-knowledge-preview`
  - Resultado esperado: `Cannot find module './format-knowledge-preview'` ou `Expected X, received Y`

- [ ] **GREEN:** `format-knowledge-preview.ts` implementado, teste PASSA
  - Comando: `bun run test -- format-knowledge-preview`
  - Resultado esperado: `3 passed, 0 failed`

- [ ] **GREEN (RF11):** `atoms-rf11-audit.test.ts` PASSA (snapshot dos 14 átomos com audit-trail-path)
  - Comando: `bun run test -- rf11-audit`
  - Resultado esperado: `1 passed, 0 failed`

### Checklist

- [ ] Passo 1 RF11 audit rodado — resultado registrado em DI-2 do MEMORY.md (A=no-op verificável OU B=N átomos atualizados)
- [ ] `skills/init/lib/format-knowledge-preview.ts` criado com `parseTopKeywords` + `formatKnowledgePreview` exportados
- [ ] `skills/init/lib/format-knowledge-preview.test.ts` criado com 3 testes (parse, format, graceful inexistente)
- [ ] Preview wired no `/init` (SKILL.md ou helper) logo após emissão de `knowledge_copied`
- [ ] Quando `.claude/knowledge/INDEX.md` ausente, output do `/init` NÃO mostra linha "Knowledge cobre:" (graceful CA-09 spirit)
- [ ] Quando `.claude/knowledge/INDEX.md` presente, output do `/init` mostra "Knowledge cobre: kw1, kw2, ..." com top-8 keywords
- [ ] `atoms-rf11-audit.test.ts` criado e PASSA (14 átomos têm audit-trail-path em `sources:`)
- [ ] `bun run test && bun run lint && bun run typecheck` verdes
- [ ] `bun run harness:validate` verde

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- format-knowledge-preview` retorna `3 passed`
- `bun run test -- rf11-audit` retorna `1 passed`
- `bun run lint` exit 0
- `bun run typecheck` exit 0 (se configurado no projeto)
- Para cada um dos 14 átomos: `grep -cE '\(claude-code/knowledge/Nodejs/' docs/knowledge/nodejs-typescript/atoms/<atom>.md` retorna ≥ 1
- Rodar `/init` em fixture mínima de projeto Node+TS (mkdtempSync + `package.json` com `typescript` em devDeps) → output contém substring `Knowledge cobre:` seguida de pelo menos uma keyword conhecida (`event loop` OU `prisma` OU `pino` OU `v8`)
- Rodar `/init` em fixture sem `package.json` (CA-06 sem anchor) → output NÃO contém `Knowledge cobre:`

**Por humano:**
- Dev rodando `/init` num projeto Node+TS real vê a linha "Knowledge cobre: ..." e consegue avaliar em <5s se o knowledge cobre o que o projeto precisa (decisão informada de re-run com `--refresh-knowledge` ou seguir adiante)
- Auditoria RF11: cada source no frontmatter de qualquer um dos 14 átomos pode ser localizada no filesystem via path entre parênteses (audit-trail completo)

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
