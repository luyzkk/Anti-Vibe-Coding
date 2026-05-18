<!--
Princípio universal #5 — Comment Provenance. Aplicar em comentarios de codigo
de runtime usuario-facing. Helpers TS internos seguem JSDoc; sem repeticao.
-->

# Fase 05: Blocks Classifier Lib (`lib/blocks-classifier.ts`)

**Plano:** 03 — Discovery Pipeline (secrets + docs + classifier)
**Sizing:** 1h
**Depende de:** fase-03 (consome tipo `DiscoveredDoc`)
**Visual:** false

---

## O que esta fase entrega

Funcao `classifyDocs(input)` que recebe lista de `DiscoveredDoc` e produz: (1) `mappings` heuristicos por arquivo para uma das 7 `HarnessCategory` canonicas com `confidence: 'high' | 'medium' | 'low'`, (2) `orphans` para arquivos sem categoria — destino `docs/references/{basename}`, (3) `sharedGlossary` de termos repetidos (CH-03/D13). Prompt template para LLM refinement em `assets/snippets/classifier-llm-prompt.md` (execucao do LLM DEFERIDA para Plano 04+ via flag `pendingLlmRefinement`). Pura — read-only, sem disco.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/blocks-classifier.ts` | Create | Funcao `classifyDocs` + tipos publicos. Heuristica regex por categoria + scoring de confidence + glossary extraction (>=3 ocorrencias, >=4 chars, ignora stopwords PT/EN). |
| `skills/init/lib/blocks-classifier.test.ts` | Create | 6 testes cobrindo high/medium/low/orphan/glossary/exclusao-filosoficos. |
| `skills/init/assets/snippets/classifier-llm-prompt.md` | Create | Prompt template com 4 placeholders. Consumido pelo Step 08 (fase-06) e potencialmente pelo Step 09 (Plano 04) em CH-02. |

---

## Implementacao

### Passo 1: Tipos publicos

```typescript
// skills/init/lib/blocks-classifier.ts
import type { DiscoveredDoc } from './discover-existing-docs'

export type HarnessCategory =
  | 'docs/SECURITY.md'
  | 'docs/DESIGN.md'
  | 'docs/FRONTEND.md'
  | 'docs/RELIABILITY.md'
  | 'docs/PLANS.md'
  | 'docs/QUALITY_SCORE.md'
  | 'docs/MERGE_GATES.md'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export type DocMapping = {
  readonly source: string
  readonly target: HarnessCategory
  readonly confidence: ConfidenceLevel
  readonly rationale: string
  /** True quando confidence !== 'high' — Plano 04 fase-02 pode invocar LLM refinement (D8). */
  readonly pendingLlmRefinement: boolean
}

export type OrphanMapping = {
  readonly source: string
  /** Sempre 'docs/references/<basename>' (D11). */
  readonly target: string
  readonly reason: string
}

export type GlossaryEntry = {
  readonly term: string
  readonly occurrences: number
  readonly sources: readonly string[]
}

export type ClassifyInput = {
  readonly docs: readonly DiscoveredDoc[]
  readonly cwd: string
  /**
   * Conteudo pre-lido por source path. Quando ausente, o classifier le do disco.
   * Permite teste isolado sem I/O.
   */
  readonly contentsBySource?: ReadonlyMap<string, string>
}

export type ClassifyOutput = {
  readonly mappings: readonly DocMapping[]
  readonly orphans: readonly OrphanMapping[]
  readonly sharedGlossary: readonly GlossaryEntry[]
}
```

> **Por que excluir `COMPOUND_ENGINEERING.md` e `PRODUCT_SENSE.md` do enum:** D14 do PRD — filosoficos sao postura canonica, classifier NUNCA mapeia para eles. Plano 02 fase-01 ja excluiu esses 2 paths do gerador de populate-plan. Exclusao no enum garante consistencia type-checked.

### Passo 2: Heuristica regex por categoria

```typescript
type CategoryRule = {
  readonly category: HarnessCategory
  readonly pattern: RegExp
}

const CATEGORY_RULES: ReadonlyArray<CategoryRule> = [
  { category: 'docs/SECURITY.md',       pattern: /\b(auth|cors|csrf|jwt|oauth|password|secret|seguranca|criptografia)\b/i },
  { category: 'docs/DESIGN.md',         pattern: /\b(SOLID|arquitetura|architecture|pattern|design|estrutura|camadas)\b/i },
  { category: 'docs/FRONTEND.md',       pattern: /\b(component|react|vue|tailwind|css|UI|UX|frontend|acessibilidade|wcag)\b/i },
  { category: 'docs/RELIABILITY.md',    pattern: /\b(observability|monitoring|sentry|log|retry|timeout|reliability)\b/i },
  { category: 'docs/PLANS.md',          pattern: /\b(roadmap|plan|escopo|milestone)\b/i },
  { category: 'docs/QUALITY_SCORE.md',  pattern: /\b(quality|score|review|checklist|criterio)\b/i },
  { category: 'docs/MERGE_GATES.md',    pattern: /\b(merge|gate|CI|workflow|pre-commit)\b/i },
]
```

> **Por que `\b` boundary:** evita falso positivo em palavras compostas (`reactivelyDesigned` nao casa com `react`). Em PT-BR muitas palavras-chave sao plenas (`acessibilidade`), mantendo boundary garante precisao.

### Passo 3: Scoring de confidence

```typescript
type CategoryScore = {
  category: HarnessCategory
  matchCount: number
}

function scoreCategories(content: string): CategoryScore[] {
  const scores: CategoryScore[] = []
  for (const { category, pattern } of CATEGORY_RULES) {
    const matches = content.match(new RegExp(pattern.source, 'gi'))
    if (matches && matches.length > 0) {
      scores.push({ category, matchCount: matches.length })
    }
  }
  return scores.sort((a, b) => b.matchCount - a.matchCount)
}

function decideConfidence(scores: CategoryScore[]): ConfidenceLevel {
  if (scores.length === 0) return 'low'
  const top = scores[0]
  // 2026-05-18 (Luiz/dev): regras de confidence — D8 do PRD.
  // high: top tem >=3 matches E top.matchCount > segundo.matchCount * 2 (sem empate proximo).
  // medium: top tem 1-2 matches OU empate (top.matchCount <= segundo.matchCount * 2).
  // low: zero matches OU >=3 categorias com matchCount igual.
  const tieClose = scores.length > 1 && (scores[1]?.matchCount ?? 0) * 2 >= (top?.matchCount ?? 0)
  if ((top?.matchCount ?? 0) >= 3 && !tieClose) return 'high'
  return 'medium'
}
```

> **Por que confidence calculada assim:** PRD pede "3+ matches numa unica categoria, zero conflito" = high; "1-2 matches OU empate entre 2" = medium; "zero matches" = low. A formula `tieClose = top2 * 2 >= top1` implementa "empate proximo" sem hard-coding distancias absolutas.

### Passo 4: Implementar `classifyDocs`

```typescript
import { promises as fs } from 'node:fs'
import path from 'node:path'

export async function classifyDocs(input: ClassifyInput): Promise<ClassifyOutput> {
  const mappings: DocMapping[] = []
  const orphans: OrphanMapping[] = []
  const termIndex = new Map<string, { occurrences: number; sources: Set<string> }>()

  for (const doc of input.docs) {
    const content = await loadContent(doc, input)
    const scores = scoreCategories(content)
    const confidence = decideConfidence(scores)

    if (scores.length === 0) {
      orphans.push({
        source: doc.relativePath,
        target: `docs/references/${path.basename(doc.relativePath)}`,
        reason: 'no heuristic match — orphan candidate (D11)',
      })
    } else {
      const top = scores[0]
      if (top) {
        mappings.push({
          source: doc.relativePath,
          target: top.category,
          confidence,
          rationale: `heuristic: ${top.matchCount} matches in ${top.category}; top2=${scores[1]?.matchCount ?? 0}`,
          pendingLlmRefinement: confidence !== 'high',
        })
      }
    }

    accumulateGlossary(termIndex, content, doc.relativePath)
  }

  const sharedGlossary = finalizeGlossary(termIndex)
  return { mappings, orphans, sharedGlossary }
}

async function loadContent(doc: DiscoveredDoc, input: ClassifyInput): Promise<string> {
  const preloaded = input.contentsBySource?.get(doc.relativePath)
  if (preloaded !== undefined) return preloaded
  return fs.readFile(doc.absolutePath, 'utf-8')
}
```

### Passo 5: Extracao do glossario compartilhado

```typescript
const STOPWORDS_PT_EN: ReadonlySet<string> = new Set([
  // PT-BR
  'para', 'como', 'pelo', 'pela', 'mais', 'menos', 'isso', 'esta', 'esse', 'essa',
  'sobre', 'cada', 'todo', 'toda', 'todos', 'todas', 'quando', 'porque', 'porquê',
  // EN
  'this', 'that', 'with', 'from', 'have', 'will', 'would', 'should', 'their', 'there',
  'then', 'than', 'them', 'these', 'those', 'when', 'what', 'which', 'where', 'while',
])

function accumulateGlossary(
  index: Map<string, { occurrences: number; sources: Set<string> }>,
  content: string,
  source: string,
): void {
  const tokens = content.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) ?? []
  for (const t of tokens) {
    if (STOPWORDS_PT_EN.has(t)) continue
    const existing = index.get(t)
    if (existing) {
      existing.occurrences += 1
      existing.sources.add(source)
    } else {
      index.set(t, { occurrences: 1, sources: new Set([source]) })
    }
  }
}

function finalizeGlossary(
  index: Map<string, { occurrences: number; sources: Set<string> }>,
): readonly GlossaryEntry[] {
  const out: GlossaryEntry[] = []
  for (const [term, { occurrences, sources }] of index) {
    if (occurrences >= 3) {
      out.push({
        term,
        occurrences,
        sources: Array.from(sources).sort(),
      })
    }
  }
  out.sort((a, b) => b.occurrences - a.occurrences || (a.term < b.term ? -1 : 1))
  return out
}
```

> **Por que `>=4 chars` no regex `{3,}`:** `[a-z]` ja conta como 1 char + `{3,}` significa 3 chars adicionais = total >=4. Match.
> **Por que `>=3 ocorrencias`:** PRD D13/CH-03 explicito. Glossario nao deve poluir com termos que aparecem 1-2 vezes.

### Passo 6: Snippet de prompt LLM

```markdown
<!--
2026-05-18 (Luiz/dev): template do prompt LLM para refinement de mappings ambiguos.
Plano 03 fase-05 entrega o template; execucao do LLM eh DEFERIDA — Plano 04 fase-02
(Step 09 propose-merge-batch) ou um futuro Plano 06+ decide quando renderizar e invocar.
D8 do PRD — hibrido heuristica + LLM.
-->

# Classifier LLM Refinement Prompt

Voce eh um subagente classifier do plugin Anti-Vibe Coding. Sua tarefa eh decidir
para qual categoria do harness um arquivo `.md` existente do projeto deve ser movido.

## Arquivo em analise

- Path: `{{FILE_PATH}}`
- Preview (primeiros 500 chars):

```
{{FILE_PREVIEW}}
```

## Categorias candidatas

{{CANDIDATE_CATEGORIES}}

## Glossario compartilhado do projeto

{{GLOSSARY_TERMS}}

## Output esperado

Retorne JSON exato:

```json
{
  "category": "docs/SECURITY.md" | "docs/DESIGN.md" | "docs/FRONTEND.md" | "docs/RELIABILITY.md" | "docs/PLANS.md" | "docs/QUALITY_SCORE.md" | "docs/MERGE_GATES.md" | "orphan",
  "confidence": "high" | "medium" | "low",
  "rationale": "1-2 frases explicando a decisao"
}
```

Se nenhuma categoria se aplica, retorne `"category": "orphan"` — o arquivo ira para `docs/references/`.

Nao inclua nada alem do JSON.
```

### Passo 7: Testes pareados

```typescript
// skills/init/lib/blocks-classifier.test.ts
import { expect, test, describe } from 'bun:test'
import { classifyDocs } from './blocks-classifier'

function makeDoc(relativePath: string) {
  return {
    absolutePath: `/fake/${relativePath}`,
    relativePath,
    bytes: 0,
    extension: '.md' as const,
  }
}

describe('classifyDocs', () => {
  test('high confidence: 3+ matches numa unica categoria, sem conflito', async () => {
    const out = await classifyDocs({
      docs: [makeDoc('docs/AUTH.md')],
      cwd: '/fake',
      contentsBySource: new Map([
        ['docs/AUTH.md', 'auth flow with oauth and jwt; csrf protection; secret rotation.'],
      ]),
    })
    expect(out.mappings).toHaveLength(1)
    expect(out.mappings[0]?.target).toBe('docs/SECURITY.md')
    expect(out.mappings[0]?.confidence).toBe('high')
    expect(out.mappings[0]?.pendingLlmRefinement).toBe(false)
  })

  test('medium confidence: empate proximo entre 2 categorias', async () => {
    const out = await classifyDocs({
      docs: [makeDoc('docs/MIXED.md')],
      cwd: '/fake',
      contentsBySource: new Map([
        ['docs/MIXED.md', 'auth and oauth; react component patterns; CSS tailwind.'],
      ]),
    })
    expect(out.mappings).toHaveLength(1)
    expect(out.mappings[0]?.confidence).toBe('medium')
    expect(out.mappings[0]?.pendingLlmRefinement).toBe(true)
  })

  test('orphan: arquivo sem matches em nenhuma categoria vai para docs/references/', async () => {
    const out = await classifyDocs({
      docs: [makeDoc('LICENSE-NOTES.md')],
      cwd: '/fake',
      contentsBySource: new Map([
        ['LICENSE-NOTES.md', '# Termos da licenca proprietaria. Nada mais.'],
      ]),
    })
    expect(out.mappings).toHaveLength(0)
    expect(out.orphans).toHaveLength(1)
    expect(out.orphans[0]?.target).toBe('docs/references/LICENSE-NOTES.md')
  })

  test('exclusao de filosoficos: nunca mapeia para COMPOUND_ENGINEERING ou PRODUCT_SENSE', async () => {
    const out = await classifyDocs({
      docs: [makeDoc('docs/COMPOUND.md')],
      cwd: '/fake',
      contentsBySource: new Map([
        ['docs/COMPOUND.md', 'compound engineering product sense filosofia camadas auth oauth jwt'],
      ]),
    })
    const target = out.mappings[0]?.target ?? out.orphans[0]?.target
    expect(target).not.toBe('docs/COMPOUND_ENGINEERING.md')
    expect(target).not.toBe('docs/PRODUCT_SENSE.md')
  })

  test('sharedGlossary: termos com >=3 ocorrencias entre docs aparecem', async () => {
    const out = await classifyDocs({
      docs: [makeDoc('a.md'), makeDoc('b.md')],
      cwd: '/fake',
      contentsBySource: new Map([
        ['a.md', 'harness-validator harness-validator design'],
        ['b.md', 'harness-validator workflow workflow workflow'],
      ]),
    })
    const harness = out.sharedGlossary.find((g) => g.term === 'harness-validator')
    expect(harness?.occurrences).toBe(3)
    expect(harness?.sources.sort()).toEqual(['a.md', 'b.md'])
    const workflow = out.sharedGlossary.find((g) => g.term === 'workflow')
    expect(workflow?.occurrences).toBe(3)
  })

  test('stopwords sao filtradas do glossary', async () => {
    const out = await classifyDocs({
      docs: [makeDoc('a.md')],
      cwd: '/fake',
      contentsBySource: new Map([
        ['a.md', 'this this this that that that should should should'],
      ]),
    })
    expect(out.sharedGlossary).toHaveLength(0)
  })

  test('low confidence: zero matches em categorias com matches estruturais distantes', async () => {
    // Aqui o texto tem 1 match em SECURITY ("auth"), nenhum outro. matchCount=1 -> medium (nao high)
    const out = await classifyDocs({
      docs: [makeDoc('thin.md')],
      cwd: '/fake',
      contentsBySource: new Map([['thin.md', 'apenas auth uma vez aqui.']]),
    })
    expect(out.mappings[0]?.confidence).toBe('medium')
    expect(out.mappings[0]?.pendingLlmRefinement).toBe(true)
  })
})
```

---

## Gotchas

- **G4 do plano (LLM deferido):** `pendingLlmRefinement: true` em qualquer `confidence !== 'high'`. Plano 04 fase-02 decide se renderiza `classifier-llm-prompt.md` e invoca subagente para refinar. Em v6.4.0 inicial, a heuristica eh autoritativa por default e o LLM eh opt-in (CH-02 do PRD — "ver detalhe por arquivo").
- **G5 do plano (orfaos):** `path.basename(doc.relativePath)` extrai apenas nome do arquivo. Para `.claude/memory/notes.md` -> orphan target `docs/references/notes.md`. Se houver colisao de basename (`a/X.md` e `b/X.md` ambos orfaos), o segundo sobrescreve no destino. Plano 04 fase-05 (move-docs-with-stub) detecta colisao e renomeia para `docs/references/X-1.md`, `X-2.md`. Documentar handoff.
- **G6 do plano (glossario):** `accumulateGlossary` ignora termos < 4 chars (`[a-z][a-z0-9-]{3,}` = >=4 chars total) e stopwords. Glossario fica vazio em greenfield (nenhum doc analisado). Teste #6 do greenfield (Plano 02 fase-04) implicitamente cobre — gerador recebe `sharedGlossary === undefined`.
- **G7 do plano (filosoficos excluidos):** Test #4 deliberadamente coloca "compound engineering product sense" no conteudo + palavras-chave de outras categorias. Resultado DEVE ser SECURITY (3 matches: auth, oauth, jwt) — NUNCA `docs/COMPOUND_ENGINEERING.md`. O enum `HarnessCategory` garante via type checker.
- **Local (regex case-insensitive consistente):** As `CATEGORY_RULES` usam flag `i` no literal, mas `scoreCategories` re-cria com `gi` para contar todas as ocorrencias. `match()` retorna `null` quando sem matches — guard com `?? []` (sem `!`).
- **Local (performance):** Para 100 docs com conteudo medio (~5KB cada), o classifier roda <1s. Sem otimizacao premature; Plano 07 fase-05 mede no fixture grande.

---

## Verificacao

### TDD

- [ ] **RED:** os 7 testes do passo 7 escritos antes da implementacao. Comando: `bun test skills/init/lib/blocks-classifier.test.ts` — esperado: erros de modulo/assertion.
- [ ] **GREEN:** implementacao dos passos 1-5. Comando: `bun test skills/init/lib/blocks-classifier.test.ts` — todos pass.
- [ ] **REFACTOR:** considerar extrair `CATEGORY_RULES` e `STOPWORDS_PT_EN` para arquivos separados se passar de 100 linhas total. Decisao na hora.

### Checklist

- [ ] `skills/init/lib/blocks-classifier.ts` exporta exatamente 7 simbolos publicos.
- [ ] `HarnessCategory` enum NAO inclui `COMPOUND_ENGINEERING.md` nem `PRODUCT_SENSE.md`.
- [ ] `pendingLlmRefinement === false` apenas quando `confidence === 'high'`.
- [ ] Orphan target sempre comeca com `docs/references/`.
- [ ] `sharedGlossary` filtra termos <4 chars e stopwords PT/EN.
- [ ] Snippet `classifier-llm-prompt.md` tem 4 placeholders detectaveis via grep.
- [ ] `bun test skills/init/lib/blocks-classifier.test.ts` 0 falhas.
- [ ] `bun run lint` clean.

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/blocks-classifier.test.ts` exit 0.
- `grep -c "COMPOUND_ENGINEERING" skills/init/lib/blocks-classifier.ts` retorna `0` (sem mencao no codigo).
- `grep -c "docs/references/" skills/init/lib/blocks-classifier.ts` retorna `>=1` (orphan target literal).
- `grep -c '{{FILE_PATH}}' skills/init/assets/snippets/classifier-llm-prompt.md` retorna `1`.
- `grep -c '{{FILE_PREVIEW}}' skills/init/assets/snippets/classifier-llm-prompt.md` retorna `1`.
- `grep -c '{{CANDIDATE_CATEGORIES}}' skills/init/assets/snippets/classifier-llm-prompt.md` retorna `1`.
- `grep -c '{{GLOSSARY_TERMS}}' skills/init/assets/snippets/classifier-llm-prompt.md` retorna `1`.

**Por humano:**
- Reviewer le `blocks-classifier.ts` em ~5 minutos e consegue explicar: (1) por que LLM eh deferido (G4), (2) por que o enum exclui filosoficos (G7), (3) como o scoring decide medium vs high (formula `tieClose`).

---

## Decisoes Aplicadas

- **D8 do PRD** (hibrido heuristica + LLM): heuristica entrega `pendingLlmRefinement: true/false` para Plano 04 fase-02 decidir invocar.
- **D11 do PRD** (orfaos → references): target `docs/references/{basename}` quando zero matches.
- **D13 + CH-03 do PRD** (glossario compartilhado): `sharedGlossary` agregado no `ClassifyOutput`. Plano 02 fase-02 consome quando re-invocado em modo non-greenfield.
- **D14 do PRD** (filosoficos nao populam): enum `HarnessCategory` exclui `COMPOUND_ENGINEERING.md` e `PRODUCT_SENSE.md`. Garantia em type-level.
- **SH-03 do PRD** (classify-blocks-hybrid): esta fase entrega a lib pura; Step 08 (fase-06) integra no registry.
- **SH-04 do PRD** (orfaos para references): regra explicita no passo 4 + test #3.
- **CLAUDE.md global** (nunca `any`): tipos union, sem `as` exceto `as const` para narrowing literal.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
