<!--
Princípio universal #5 — Comment Provenance.
Comentários inline em código gerado neste plano devem ter linhagem (autor, data, por quê).
Exemplo: `// 2026-05-29 (Luiz/dev): assere não-emissão de tool Workflow — diretriz RF15/D6`
-->

# Fase 04: Teste de Regressão da Diretriz (GATE)

**Plano:** 01 — Núcleo (Awareness + Detector + Doc + Gate)
**Sizing:** 1.5h
**Depende de:** fase-01 (branch do hook), fase-02 (WORKFLOWS.md), fase-03 (link no AGENTS)
**Visual:** false

**RF:** RF15 · **Decisões:** D6 (teste de regressão no v1) · **CA:** CA-04 (diretriz), CA-05 (doc+link+H1) · **Diretriz:** PRIME-DIRECTIVE travada por CI

---

## O que esta fase entrega

Um teste e2e novo que trava, em CI, a diretriz "sugere, nunca executa": `docs/WORKFLOWS.md` existe e começa com H1, `AGENTS.md` linka para ele, e nenhum caminho do `[WORKFLOW_ADVISOR]` emite uma tool Workflow ou `decision:block`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/workflow-advisor-directive.test.ts` | Create | Teste e2e em `bun:test`. Arquivo NOVO — NÃO estende o stub gutted de `populate-plan-parity.test.ts` (GT-1) |

---

## Implementacao

### Passo 0: confirmar que NÃO se estende o stub gutted (GT-1)

`tests/e2e/populate-plan-parity.test.ts` é um `describe.skip` placeholder de 11 linhas (exports do
gerador V2 deletados). **Espelhar só a IDEIA** do "never diminish gate" — criar arquivo independente.
Seguir a convenção `bun:test` dos outros e2e (`import { describe, it, expect } from 'bun:test'`,
`import.meta.dir` para resolver paths). Este arquivo é `.ts` em `tests/e2e/` → entra em `bun run test`
(diferente do `.cjs` da fase-01, que não — G7).

### Passo 1: importar o hook (mesmo mecanismo da fase-01)

A fase-01 exporta `{ processPrompt, SCALE_PATTERNS }` de `user-prompt-gate.cjs` (com guard de I/O). O
teste importa via `require` (CJS de dentro de TS sob bun):

```typescript
// 2026-05-29 (Luiz/dev): trava a diretriz workflow-awareness no CI (RF15 / D6).
// Espelha a IDEIA do "never diminish gate"; NÃO estende populate-plan-parity (gutted — GT-1).
import { describe, it, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const REPO_ROOT = path.resolve(import.meta.dir, '..', '..')
const HOOK_PATH = path.join(REPO_ROOT, 'hooks', 'user-prompt-gate.cjs')
// processPrompt + SCALE_PATTERNS exportados na fase-01 (com guard require.main === module).
const { processPrompt } = require(HOOK_PATH)
```

### Passo 2: asserção (1) — `docs/WORKFLOWS.md` existe e começa com H1 (CA-05)

```typescript
describe('workflow-awareness directive gate', () => {
  it('WORKFLOWS.md exists and starts with an H1 heading', async () => {
    const content = await fs.readFile(path.join(REPO_ROOT, 'docs', 'WORKFLOWS.md'), 'utf8')
    expect(content.startsWith('# ')).toBe(true)
  })
```

### Passo 3: asserção (2) — `AGENTS.md` linka para `docs/WORKFLOWS.md`

```typescript
  it('AGENTS.md links to docs/WORKFLOWS.md', async () => {
    const agents = await fs.readFile(path.join(REPO_ROOT, 'AGENTS.md'), 'utf8')
    expect(agents).toContain('docs/WORKFLOWS.md')
  })
```

### Passo 4: asserção (3) — nenhum caminho do `[WORKFLOW_ADVISOR]` emite tool Workflow nem `decision:block` (CA-04)

Duas camadas de garantia (comportamento + fonte):

**(a) Comportamento** — varrer prompts de escala variados; toda saída do advisor é **string** e não
contém `decision`/`block`/instrução de lançar a tool Workflow:

```typescript
  const scalePrompts = [
    'migrar 400 arquivos para o novo formato',
    'auditar o codebase inteiro por XSS',
    'renomear 250 componentes para o novo padrao',
    'pesquisar isso em varias fontes',
    'migrar 300 endpoints de autenticação e cache para o novo padrão', // multi-domínio + escala (CA-07)
  ]

  it('every WORKFLOW_ADVISOR output is advisory text — never a Workflow tool or decision:block', () => {
    for (const p of scalePrompts) {
      const out = processPrompt(p)
      expect(typeof out).toBe('string')
      expect(out).toContain('[WORKFLOW_ADVISOR]')
      // diretriz: nada que pareça emitir/forçar tool ou bloquear o turno
      expect(out).not.toMatch(/"?decision"?\s*:\s*"?block/i)
      expect(out).not.toMatch(/\bdecision:block\b/i)
      expect(out).not.toMatch(/(use|invoke|emit|lance|chame)\s+.{0,12}\btool\s+Workflow\b/i)
    }
  })

  it('merges scale + multi-domain into a single advisory (INV1 / CA-07)', () => {
    const out = processPrompt('migrar 300 endpoints de autenticação e cache para o novo padrão')
    expect((out.match(/\[WORKFLOW_ADVISOR\]/g) || []).length).toBe(1)
  })

  it('does not advise workflow for sub-threshold counts (CA-03)', () => {
    const out = processPrompt('renomeie esses 12 arquivos')
    expect(out === null || !String(out).includes('[WORKFLOW_ADVISOR]')).toBe(true)
  })

  it('returns null when the human already opted in (CA-02)', () => {
    expect(processPrompt('rode isso como workflow')).toBe(null)
    expect(processPrompt('use /effort ultracode aqui')).toBe(null)
  })
```

**(b) Fonte** — escanear o texto do hook para garantir que o branch do advisor não introduziu emissão
de tool/bloqueio (defesa contra prose-leak / mudança futura — R3):

```typescript
  it('hook source has no Workflow-tool emission or decision:block in the advisor path', async () => {
    const src = await fs.readFile(HOOK_PATH, 'utf8')
    // O advisor é texto stdout. A fonte não deve conter um objeto decision:block
    // associado ao caminho de workflow nem instrução de emitir a tool Workflow.
    expect(src).not.toMatch(/decision\s*:\s*['"]block['"][\s\S]{0,200}workflow/i)
    expect(src).not.toMatch(/workflow[\s\S]{0,200}decision\s*:\s*['"]block['"]/i)
  })
})
```

> Nota: o scan de fonte é deliberadamente escopado ao redor do token `workflow` (≤200 chars) para
> não colidir com outros hooks/strings. O sinal forte é o comportamental (a); o scan de fonte é
> defense-in-depth.

---

## Gotchas

- **G1 do plano (GT-1):** arquivo NOVO; NÃO estender `populate-plan-parity.test.ts` (gutted skip stub).
- **G2 do plano (GT-2):** o import depende de a fase-01 ter exportado `processPrompt` com o guard de
  I/O. Se o `require` pendurar, a fase-01 não fechou o Passo 0. Esta fase **depende de fase-01**.
- **G7 do plano:** este `.ts` em `tests/e2e/` É descoberto por `bun run test` (`scripts/run-tests.ts`
  globa `tests/**/*.test.{ts,tsx}`). Ao contrário do `.cjs` da fase-01.
- **Local (CA-07 prompt):** o prompt multi-domínio + escala deve casar ≥2 domínios do hook E
  `SCALE_PATTERNS`. "autenticação" → domínio Security; "cache" → System Design; "migrar ... 300
  endpoints" → escala. Se a contagem de domínios mudar, ajustar o prompt para garantir ≥2.
- **Local (regex do scan de fonte):** manter o scan escopado por proximidade ao token `workflow` —
  um scan global por `decision:block` daria falso-positivo (outros hooks legítimos usam decision:block).

---

## Verificacao

### TDD

- [ ] **RED:** rodar o teste ANTES de fase-01/02/03 estarem completas → falha (arquivo WORKFLOWS.md
  ausente, ou `processPrompt` sem branch). Como as três precedem esta fase, o RED genuíno é: remover
  temporariamente o branch advisor da fase-01 → o teste de comportamento falha por assertion.
  - Comando: `bun run test -- workflow-advisor-directive`
  - Resultado esperado: assertion failure (ex: `expected string, received null`)

- [ ] **GREEN:** com fase-01/02/03 aplicadas, todos os casos passam.
  - Comando: `bun run test -- workflow-advisor-directive`
  - Resultado esperado: `N pass, 0 fail`

### Checklist

- [ ] `tests/e2e/workflow-advisor-directive.test.ts` criado; importa `processPrompt` via `createRequire`.
- [ ] As 3 asserções do PRD presentes: (1) WORKFLOWS.md existe+H1, (2) AGENTS linka, (3) nenhum caminho emite tool Workflow/`decision:block`.
- [ ] Casos CA-02/CA-03/CA-07 cobertos (null em opt-in; sem advisor em 12 arquivos; 1 mensagem mesclada).
- [ ] `bun run test` verde (este arquivo entra na suite — G7).
- [ ] `bun run typecheck` limpo (arquivo `.ts` é typechecked por `tsc --noEmit`; G6 — `lint` não é script).
- [ ] `bun run harness:validate` verde (confirma o estado conjunto de doc+link).

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- workflow-advisor-directive` → `0 fail`.
- `bun run harness:validate` → exit 0 (WORKFLOWS.md existe+H1, AGENTS linka, AGENTS ≤70 linhas).
- O teste de comportamento falha se o branch advisor for removido (prova que o gate é real, não vacuamente verde).

---

<!-- Gerado por /plan-feature em 2026-05-29 -->
