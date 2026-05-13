<!--
Princípio universal #5 — Comment Provenance.
-->

# Fase 02: Decision-Registry Migracao

**Plano:** 05 — Skill Migration + Hooks
**Sizing:** 1.5h
**Depende de:** fase-01 (path-resolver compartilhado)
**Visual:** false

---

## O que esta fase entrega

`/anti-vibe-coding:decision-registry` passa a escrever cada decisao em `docs/design-docs/ADR-NNNN-{slug}.md` com numeracao monotonica e frontmatter `status: active` em projeto v6 (CA-15). Mantem comportamento legado (`decisions.md` raiz) em projeto v5.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/lib/adr-writer.ts` | Create | Renderiza ADR com frontmatter + secoes; numeracao monotonica lendo `docs/design-docs/ADR-*.md` |
| `anti-vibe-coding/skills/decision-registry/SKILL.md` | Modify | Fluxo dual v5/v6 documentado |
| `anti-vibe-coding/skills/decision-registry/index.ts` | Modify | `add()`/`list()` aceitam assinaturas legadas |
| `anti-vibe-coding/tests/decision-registry-v6.test.ts` | Create | RED→GREEN para CA-15 + numeracao + collision |

---

## Implementacao

### Passo 1: `lib/adr-writer.ts` — numeracao monotonica + frontmatter

```typescript
// 2026-05-11 (Luiz/dev): ADR writer com numeracao monotonica — herdada de Plano 03 fase-05 gotcha G7 (numbering por diretorio)
import { promises as fs } from 'node:fs'
import path from 'node:path'

export type ADRStatus = 'active' | 'superseded' | 'deprecated'

export type ADRInput = {
  title: string
  context?: string             // Por que essa decisao
  decision?: string            // O que foi decidido
  alternatives?: string[]      // Opcoes consideradas
  consequences?: string        // Trade-offs
  status?: ADRStatus           // default 'active'
}

export type ADRWriteResult = {
  filePath: string
  id: number                   // ADR-NNNN numero atribuido
}

export async function writeADR(designDocsDir: string, input: ADRInput): Promise<ADRWriteResult> {
  await fs.mkdir(designDocsDir, { recursive: true })
  const nextId = await getNextADRId(designDocsDir)
  const slug = slugify(input.title)
  const fileName = `ADR-${pad4(nextId)}-${slug}.md`
  const filePath = path.join(designDocsDir, fileName)

  // 2026-05-11 (Luiz/dev): frontmatter inclui status para suportar D31 (Plano 06 fase-06 --revoke)
  const frontmatter = [
    '---',
    `id: ${nextId}`,
    `title: ${JSON.stringify(input.title)}`,
    `status: ${input.status ?? 'active'}`,
    `created: ${new Date().toISOString().slice(0, 10)}`,
    '---',
    '',
  ].join('\n')

  const body = [
    `# ADR-${pad4(nextId)}: ${input.title}`,
    '',
    '## Context',
    input.context ?? '(why is this decision needed)',
    '',
    '## Decision',
    input.decision ?? '(what was decided)',
    '',
    '## Alternatives',
    (input.alternatives && input.alternatives.length > 0)
      ? input.alternatives.map((a) => `- ${a}`).join('\n')
      : '- (no alternatives recorded)',
    '',
    '## Consequences',
    input.consequences ?? '(trade-offs of this decision)',
    '',
  ].join('\n')

  await fs.writeFile(filePath, frontmatter + body, 'utf-8')
  return { filePath, id: nextId }
}

async function getNextADRId(dir: string): Promise<number> {
  let max = 0
  try {
    const entries = await fs.readdir(dir)
    for (const e of entries) {
      const m = e.match(/^ADR-(\d{4})-/)
      if (m) max = Math.max(max, parseInt(m[1], 10))
    }
  } catch { /* dir nao existe ainda */ }
  return max + 1
}

function pad4(n: number): string { return String(n).padStart(4, '0') }

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'decision'
}
```

### Passo 2: atualizar `skills/decision-registry/index.ts`

```typescript
// 2026-05-11 (Luiz/dev): D10 — aceita string posicional (v5.x) ou objeto rico (v6)
import { resolvePaths } from '../../lib/path-resolver-v6'
import { writeADR, type ADRInput } from '../../lib/adr-writer'
import { promises as fs } from 'node:fs'

export async function add(
  arg: string | ADRInput,
  projectRoot: string = process.cwd(),
): Promise<{ filePath: string; id: number | null; layout: 'v6' | 'v5' | 'cru' }> {
  const opts: ADRInput = typeof arg === 'string' ? { title: arg } : arg
  const paths = await resolvePaths(projectRoot)

  if (paths.layout === 'v6') {
    const result = await writeADR(paths.designDocsDir, opts)
    return { ...result, layout: 'v6' }
  }

  // 2026-05-11 (Luiz/dev): legado — appenda em decisions.md raiz (mesmo padrao de fase-01)
  const legacyFile = path.join(paths.projectRoot, 'decisions.md')
  const line = `## ${new Date().toISOString().slice(0, 10)}: ${opts.title}\n\n${opts.decision ?? '(detalhe aqui)'}\n`
  const existing = await readSafe(legacyFile)
  await fs.writeFile(legacyFile, existing ? existing + '\n' + line : `# Decisions\n\n${line}`, 'utf-8')
  return { filePath: legacyFile, id: null, layout: paths.layout }
}

async function readSafe(p: string): Promise<string | null> {
  try { return await fs.readFile(p, 'utf-8') } catch { return null }
}
```

### Passo 3: atualizar `SKILL.md` com fluxo executavel em bloco

````markdown
## Fluxo (v6)

```
1. Resolve layout via lib/path-resolver-v6.ts
2. Se layout === 'v6':
     a. lib/adr-writer.ts conta ADR-*.md em docs/design-docs/ para next_id
     b. Cria ADR-NNNN-{slug}.md com frontmatter (id, title, status: active, created)
     c. Secoes: Context, Decision, Alternatives, Consequences
3. Se layout === 'v5' ou 'cru':
     - Appenda em decisions.md raiz (formato legado)
```
````

---

## Gotchas

- **G1 do plano (D10):** Assinatura aceita string OU objeto; documentado via provenance comment.
- **G7 herdado (Plano 03 G7):** Numeracao por **diretorio**, nao global. Reler `readdir` a cada `add` (custo trivial; <10ms ate ~1000 ADRs).
- **Local 02-G1 (race condition):** Duas chamadas `add` paralelas podem coincidir em mesmo `next_id`. Aceito como trade-off — uso e single-user, baixa probabilidade. Documentar via JSDoc. Se virar pain, adicionar lockfile em `docs/design-docs/.adr.lock`.
- **Local 02-G2 (slug collision):** Diferente de compound notes (que tem data no nome), ADR usa numero. Slugs podem colidir entre ADRs (`ADR-0003-cache.md` e `ADR-0007-cache.md` diferentes contextos). Aceito — numero desambigua.

---

## Verificacao

### TDD

- [ ] **RED:** Teste `creates ADR-0001 then ADR-0002 with monotonic numbering` espera 2 arquivos sequenciais
  - Comando: `bun test tests/decision-registry-v6.test.ts --grep 'monotonic'`
  - Resultado esperado: arquivos nao existem (falha)

- [ ] **GREEN:** Apos implementacao, teste passa com 2 arquivos numerados corretamente

### Checklist

- [ ] `lib/adr-writer.ts` exporta `writeADR(dir, input)` e tipo `ADRInput`
- [ ] Em fixture v6 vazia, `add("usar TanStack Query em vez de useEffect")` cria `docs/design-docs/ADR-0001-usar-tanstack-query-em-vez-de-useeffect.md`
- [ ] Segunda chamada `add` cria `ADR-0002-*`
- [ ] Apos terceira chamada (mesmo slug), numera para `ADR-0003-` com mesmo slug (numero desambigua)
- [ ] Frontmatter inclui `id`, `title`, `status: active`, `created`
- [ ] Em fixture v5, escreve em `decisions.md` raiz
- [ ] Idempotencia: deletar `ADR-0001-...md` e rodar `add` novamente gera `ADR-0001-...` de novo (max do diretorio = 0 apos delete)
- [ ] Testes passam: `bun run test`
- [ ] Lint + typecheck: `bun run lint && bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/decision-registry-v6.test.ts` exit 0 com >=3 testes (monotonic, frontmatter, legacy fallback)
- Apos 2x `add`, comando `ls docs/design-docs/ADR-*.md | wc -l` retorna 2

**CA do PRD coberto:**
- CA-15 (verbatim): "Dado plugin v6, quando rodar `/decision-registry 'decidi usar Y'`, então cria `docs/design-docs/ADR-NNNN-{slug}.md`."

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
