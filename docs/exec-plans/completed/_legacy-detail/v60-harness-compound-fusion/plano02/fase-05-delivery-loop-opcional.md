<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 05: `/init` pergunta sobre Linear e injeta Delivery Loop opcional em AGENTS.md (D12)

**Plano:** 02 — Full Scaffold
**Sizing:** 1h
**Depende de:** fase-02 (AGENTS.md ja gerado por scaffold; precisa existir antes da injecao)
**Visual:** false

---

## O que esta fase entrega

Pergunta opt-in durante `/init`: "Do you use Linear and want to enable the Delivery Loop convention?". Se **sim**, helper `injectOptionalSection` appenda secao "Delivery Loop" no AGENTS.md (entre `## Required Working Rules` e `## Pre-Mutation Gate`). Se **nao** (default), AGENTS.md fica intacto e mantem-se ≤40 linhas. Atende **D12 (escolha consciente fora do Recommended)**, **S3**, **CA-13** ("se usuario aceitar, AGENTS.md gerado tem secao Delivery Loop").

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/init/lib/inject-optional-section.ts` | Create | Helper generico que injeta bloco em arquivo markdown apos um marker (reutilizado em Plano 05 fase-06 — Compound Gate) |
| `anti-vibe-coding/skills/init/lib/inject-optional-section.test.ts` | Create | Testes: injecao no lugar certo, idempotencia (segunda chamada nao duplica), no-op se marker ausente |
| `anti-vibe-coding/skills/init/assets/snippets/delivery-loop.md` | Create | Snippet (EN) ~5 linhas com convencao Linear+video (G-A3) |
| `anti-vibe-coding/skills/init/assets/templates/AGENTS.md.tpl` | Modify | Adicionar marker `<!-- INIT:DELIVERY_LOOP_SLOT -->` entre Required Working Rules e Pre-Mutation Gate |
| `anti-vibe-coding/skills/init/SKILL.md` | Modify | Adicionar Step 6 v6.0.0 — perguntar sobre Linear; se yes, chamar `injectOptionalSection(AGENTS, marker, snippet)` |

---

## Implementacao

### Passo 1: Snippet `assets/snippets/delivery-loop.md`

```markdown
## Delivery Loop

Before reporting completion of UI-visible or product-visible work:

1. Record a short Loom (or equivalent) of the new flow end-to-end.
2. Attach the video link to the corresponding Linear issue.
3. Move the Linear issue to "Ready for Review" only after the validation log is green.

Skip this loop for non-product changes (refactors, infra, docs-only).
```

5 linhas de instrucao + 1 frase de exclusao. Total da secao apos injecao: 8 linhas (cabecalho + body + linha em branco). AGENTS.md base ~32 linhas → com Delivery Loop ~40 linhas (no limite — proposital, motiva o opt-out se nao usa Linear).

### Passo 2: Marker em `AGENTS.md.tpl`

Inserir entre "Required Working Rules" (regra 6) e "## Pre-Mutation Gate":

```markdown
6. Run `bun run harness:validate` before opening a PR.

<!-- INIT:DELIVERY_LOOP_SLOT -->

## Pre-Mutation Gate
```

Quando opt-out (default), o marker fica no arquivo final mas e invisivel ao leitor de markdown (e comentario HTML). Se quiser limpar, helper pode opcionalmente remover o marker no opt-out — decisao: **deixar o marker** para permitir injecao posterior se usuario mudar de ideia (`/init --enable-delivery-loop` futuro). Custo: 1 linha de comentario invisivel.

### Passo 3: Helper `lib/inject-optional-section.ts`

```typescript
// 2026-05-11 (Luiz/dev): inject markdown block after a marker. Plano 02 fase-05.
// Generico — Plano 05 fase-06 reusa para Compound Decision Gate.

import { promises as fs } from 'node:fs'

export type InjectOptions = {
  filePath: string
  marker: string
  body: string
}

export type InjectResult =
  | { status: 'injected' }
  | { status: 'already-present' }
  | { status: 'marker-missing' }

export async function injectOptionalSection(opts: InjectOptions): Promise<InjectResult> {
  const original = await fs.readFile(opts.filePath, 'utf8')

  if (!original.includes(opts.marker)) {
    return { status: 'marker-missing' }
  }

  // Idempotencia: se body ja esta no arquivo, no-op.
  // Detecta pelo primeiro non-empty line do body (heuristica leve, suficiente para nosso uso).
  const firstLine = opts.body.split('\n').find(l => l.trim().length > 0)
  if (firstLine && original.includes(firstLine)) {
    return { status: 'already-present' }
  }

  // Substitui marker por marker + body (preserva marker para reuso futuro).
  const updated = original.replace(opts.marker, `${opts.marker}\n\n${opts.body}`)
  await fs.writeFile(opts.filePath, updated, 'utf8')

  return { status: 'injected' }
}
```

Notas:
- Helper e generico — Plano 05 fase-06 (Compound Gate) usa o mesmo para injetar regra opcional.
- Idempotencia por heuristica: olha primeira linha non-empty do body. Suficiente para nosso uso (cabecalho `## Delivery Loop` e unico no arquivo). Documentar em JSDoc.
- Status como discriminated union — facil tratar no SKILL.md.

### Passo 4: Teste `inject-optional-section.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { injectOptionalSection } from './inject-optional-section'

const FIXTURE = path.join(import.meta.dir, '__fixtures__', 'inject')
const FILE = path.join(FIXTURE, 'AGENTS.md')

const BASE = `# AGENTS.md

## Required Working Rules

1. Foo

<!-- INIT:DELIVERY_LOOP_SLOT -->

## Pre-Mutation Gate

bar
`

const SNIPPET = `## Delivery Loop

Record a Loom and attach to Linear.
`

describe('injectOptionalSection', () => {
  beforeEach(async () => {
    await fs.rm(FIXTURE, { recursive: true, force: true })
    await fs.mkdir(FIXTURE, { recursive: true })
    await fs.writeFile(FILE, BASE, 'utf8')
  })
  afterEach(async () => { await fs.rm(FIXTURE, { recursive: true, force: true }) })

  it('injects body after the marker', async () => {
    const result = await injectOptionalSection({
      filePath: FILE,
      marker: '<!-- INIT:DELIVERY_LOOP_SLOT -->',
      body: SNIPPET,
    })
    expect(result.status).toBe('injected')

    const body = await fs.readFile(FILE, 'utf8')
    const markerIdx = body.indexOf('<!-- INIT:DELIVERY_LOOP_SLOT -->')
    const sectionIdx = body.indexOf('## Delivery Loop')
    const gateIdx = body.indexOf('## Pre-Mutation Gate')

    expect(markerIdx).toBeGreaterThan(0)
    expect(sectionIdx).toBeGreaterThan(markerIdx) // depois do marker
    expect(sectionIdx).toBeLessThan(gateIdx)      // antes da Pre-Mutation Gate
  })

  it('is idempotent — second call is no-op', async () => {
    await injectOptionalSection({ filePath: FILE, marker: '<!-- INIT:DELIVERY_LOOP_SLOT -->', body: SNIPPET })
    const result2 = await injectOptionalSection({ filePath: FILE, marker: '<!-- INIT:DELIVERY_LOOP_SLOT -->', body: SNIPPET })
    expect(result2.status).toBe('already-present')

    const body = await fs.readFile(FILE, 'utf8')
    const occurrences = body.split('## Delivery Loop').length - 1
    expect(occurrences).toBe(1) // nao duplicou
  })

  it('returns marker-missing when marker absent', async () => {
    await fs.writeFile(FILE, '# no marker here\n', 'utf8')
    const result = await injectOptionalSection({
      filePath: FILE,
      marker: '<!-- INIT:DELIVERY_LOOP_SLOT -->',
      body: SNIPPET,
    })
    expect(result.status).toBe('marker-missing')
  })

  it('preserves marker for future re-injection', async () => {
    await injectOptionalSection({ filePath: FILE, marker: '<!-- INIT:DELIVERY_LOOP_SLOT -->', body: SNIPPET })
    const body = await fs.readFile(FILE, 'utf8')
    expect(body).toContain('<!-- INIT:DELIVERY_LOOP_SLOT -->') // marker mantido
  })
})
```

### Passo 5: SKILL.md do `/init` — Step 6 v6.0.0

```markdown
## Step 6 (v6.0.0, optional): Delivery Loop opt-in (D12)

Ask user:
> "Do you use Linear and want to enable the Delivery Loop convention?  [y/N]"

Default: **N** (skip).

If yes:

\`\`\`bash
bun run -e "
import path from 'node:path'
import { injectOptionalSection } from './lib/inject-optional-section.ts'
import { promises as fs } from 'node:fs'

const snippet = await fs.readFile(
  path.join(import.meta.dir, 'assets/snippets/delivery-loop.md'),
  'utf8',
)

const result = await injectOptionalSection({
  filePath: path.join(process.cwd(), 'AGENTS.md'),
  marker: '<!-- INIT:DELIVERY_LOOP_SLOT -->',
  body: snippet,
})

console.log('Delivery Loop injection:', result.status)
"
\`\`\`

If `result.status === 'marker-missing'`, log a warning — AGENTS.md was hand-edited or template version mismatch.
```

---

## Gotchas

- **G5 do plano (Linear opt-in default = NAO):** Pergunta DEVE ser default `N`. Caso contrario, AGENTS.md sobe para ~40 linhas e qualquer adicao futura quebra CA-27. Documentar no SKILL.md em **bold**.
- **G1 do plano (D2 EN):** Snippet `delivery-loop.md` em ingles. Teste do template-manifest da fase-01 nao cobre `assets/snippets/` — adicionar grep manual: `! grep -P "[ãâáàçéêíóôõú]" assets/snippets/delivery-loop.md`.
- **G2 do plano (cross-platform):** `path.join` em todo helper.
- **G8 do plano (provenance):** `inject-optional-section.ts` leva linha de provenance.
- **Local — AGENTS.md tamanho:** Apos injecao, AGENTS.md vai para ~40 linhas. **Borderline com CA-27** (validador rejeita >40). Se snippet crescer, valida-se primeiro com `bun run harness:validate` no proprio scaffold antes de mergear. Se ultrapassar 40, encurtar snippet em vez de relaxar threshold.
- **Local — `injectOptionalSection` reuso:** Plano 05 fase-06 (Compound Decision Gate) precisa do mesmo padrao para injetar regra opcional em AGENTS.md. Helper deve ser **generico** (filePath + marker + body — nao hardcode AGENTS.md ou Delivery Loop).
- **Ambiguity G-A3 resolvida:** Snippet decidido em 5-6 linhas. Se Andre tiver canon diferente em algum doc nao inspecionado, substituir. Nao bloqueia execucao.

---

## Verificacao

### TDD

- [ ] **RED:** `bun run test skills/init/lib/inject-optional-section.test.ts` — falha porque modulo ou snippet ausente.
  - Comando: `bun run test skills/init/lib/inject-optional-section.test.ts`
  - Resultado esperado: ≥1 fail.

- [ ] **GREEN:** Helper + snippet + marker no template = 4 testes passam.
  - Comando: `bun run test skills/init/lib/inject-optional-section.test.ts`
  - Resultado esperado: `4 passed, 0 failed`

### Checklist

- [ ] `assets/snippets/delivery-loop.md` existe, em EN, ~5 linhas
- [ ] `AGENTS.md.tpl` contem o marker `<!-- INIT:DELIVERY_LOOP_SLOT -->` entre Required Working Rules e Pre-Mutation Gate
- [ ] `injectOptionalSection` retorna `'injected'` na primeira chamada e `'already-present'` na segunda (idempotente)
- [ ] AGENTS.md apos opt-in tem `## Delivery Loop` posicionado **antes** de `## Pre-Mutation Gate` (ordem narrativa preservada)
- [ ] AGENTS.md apos opt-out tem o marker mas NAO tem `## Delivery Loop`
- [ ] AGENTS.md apos opt-in tem ≤40 linhas — `wc -l tests/fixtures/.../AGENTS.md` ≤ 40 (CA-27 friendly)
- [ ] CA-13 verificado: opt-in → grep `## Delivery Loop` em AGENTS.md retorna 1 match
- [ ] Lint limpo: `bun run lint skills/init/lib/inject-optional-section.ts`
- [ ] TypeCheck strict: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**

```bash
cd anti-vibe-coding
bun run test skills/init/lib/inject-optional-section.test.ts
# Esperado: 4 passed, 0 failed

# Em fixture com opt-in:
grep -F "## Delivery Loop" tests/fixtures/empty-dir-linear-yes/AGENTS.md
# Esperado: 1 match (CA-13)

# Em fixture com opt-out (default):
! grep -F "## Delivery Loop" tests/fixtures/empty-dir/AGENTS.md
# Esperado: 0 matches

wc -l tests/fixtures/empty-dir-linear-yes/AGENTS.md
# Esperado: ≤ 40 (CA-27)
```

**Por humano:**

- Rodar `/init` interativamente em fixture vazia, responder `y` a pergunta sobre Linear. Abrir AGENTS.md gerado e confirmar que a secao "Delivery Loop" aparece no fluxo natural de leitura (entre regras e gate), nao como apendice solto.
- Rodar `/init` segunda vez no mesmo fixture (apos opt-in) — confirmar que NAO duplica a secao.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
