<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-19 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 04: E2E tracer-bullet novo fluxo + golden regenerado

**Plano:** 05 — Progress.txt import + SKILL.md + E2E
**Sizing:** 1h
**Depende de:** fase-01, fase-02, fase-03 (e tambem dos Planos 01-04 verdes)
**Visual:** false

---

## O que esta fase entrega

Reescrita de `tests/e2e/init-tracer-bullet.test.ts` para validar o NOVO fluxo: dispatcher orquestrado (`runInit`) -> scaffold com todos os 13+ docs canonicos (incluindo `CODE_STYLE.md`) -> `PLAN.md` populate gerado (>=10 fases com 4 blocos cada) -> import de `.claude/progress.txt` (quando presente) -> Step 90 emite warning mode (nao aborta) -> mensagem final menciona `/execute-plan`. Golden file `tests/e2e/__golden__/init-greenfield.stdout.txt` regenerado para o novo output normalizado. Resolve CA-10 (testes E2E passam apos remocao de Steps 07-11) + R5 (E2E reescrito explicitamente).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/init-tracer-bullet.test.ts` | Modify (rewrite) | Trocar chamadas diretas de lib por `runInit([], {...})`; adicionar assertions de PLAN.md gerado + Step 90 warning + mensagem final |
| `tests/e2e/__golden__/init-greenfield.stdout.txt` | Modify (regenerate) | Regravar normalizado a partir do output do dispatcher novo |
| `tests/e2e/__golden__/init-greenfield.tree.json` | Modify (regenerate) | Tree agora inclui `docs/CODE_STYLE.md`, `docs/exec-plans/active/<DATE>-populate-harness/PLAN.md`, possivelmente `docs/compound/_imported/INDEX.md` se fixture tiver progress.txt |
| `tests/e2e/__fixtures__/init-greenfield/.claude/progress.txt` | Create (opcional) | Mini progress.txt (3 entradas) na fixture greenfield para exercitar fase-02 no E2E |
| `tests/e2e/init-cutover-greenfield.test.ts` | Modify (light) | Adicionar 1 assertion: `populate-harness/PLAN.md` aparece na tree (corretude pos-remocao de Steps 07-11) |
| `docs/exec-plans/active/2026-05-19-init-llm-driven-harness-population/plano05/MEMORY.md` | Modify | Registrar regeneracao do golden + diff size esperado |

---

## Implementacao

### Passo 1: rewrite `init-tracer-bullet.test.ts`

Substituir suite inteira por dispatcher-based:

```typescript
// tests/e2e/init-tracer-bullet.test.ts (rewrite)
// 2026-05-19 (Luiz/dev): Plano 05 fase-04 — tracer-bullet sob dispatcher orquestrado.
// Substitui chamadas diretas de lib (scaffoldTemplates/scaffoldFullTree/linkClaudeToAgents)
// por `runInit([], {...})` — alinha tracer com cutover. Resolve CA-10 + R5.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { mkdtemp, cp, rm } from 'node:fs/promises'
import os from 'node:os'
import { runInit } from '../../skills/init/lib/run-init'

const FIXTURE_SRC = path.join(import.meta.dir, '__fixtures__', 'init-greenfield')

async function captureLog(fn: () => Promise<unknown>): Promise<{ lines: string[]; result: unknown }> {
  const lines: string[] = []
  const orig = console.log
  console.log = (...args: unknown[]) => { lines.push(args.map(String).join(' ')) }
  try {
    const result = await fn()
    return { lines, result }
  } finally {
    console.log = orig
  }
}

describe('E2E tracer bullet — runInit dispatcher (CA-10, R5)', () => {
  let cwd: string

  beforeEach(async () => {
    cwd = await mkdtemp(path.join(os.tmpdir(), 'tracer-bullet-'))
    await cp(FIXTURE_SRC, cwd, { recursive: true })
  })

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true })
  })

  it('greenfield: runInit emits scaffold + PLAN.md + warning-mode validator + final message', async () => {
    const overallStart = Date.now()

    const { lines, result } = await captureLog(() =>
      runInit([], { cwd, log: (s: string) => console.log(s) }),
    )

    // 1. dispatch terminou em ok
    expect((result as { kind: string }).kind).toBe('ok')

    // 2. scaffold completo: docs canonicos presentes (incluindo CODE_STYLE.md)
    const docs = [
      'AGENTS.md', 'ARCHITECTURE.md', 'CLAUDE.md',
      'docs/DESIGN.md', 'docs/FRONTEND.md', 'docs/SECURITY.md',
      'docs/RELIABILITY.md', 'docs/PRODUCT_SENSE.md', 'docs/QUALITY_SCORE.md',
      'docs/PLANS.md', 'docs/CORE_BELIEFS.md', 'docs/CODE_STYLE.md',
    ]
    for (const rel of docs) {
      const exists = await fs.stat(path.join(cwd, rel)).then(() => true).catch(() => false)
      expect(exists, `expected ${rel} to exist after runInit`).toBe(true)
    }

    // 3. Step 91 (Plano 03 fase-05) gerou PLAN.md populate com >=10 fases
    const activeDir = path.join(cwd, 'docs', 'exec-plans', 'active')
    const dated = (await fs.readdir(activeDir)).find((n) => /populate-harness$/.test(n))
    expect(dated, 'expected docs/exec-plans/active/<DATE>-populate-harness folder').toBeDefined()
    const planPath = path.join(activeDir, String(dated), 'PLAN.md')
    const planContent = await fs.readFile(planPath, 'utf-8')
    const fasesInPlan = planContent.match(/^### fase-\d{2}/gm) ?? []
    expect(fasesInPlan.length).toBeGreaterThanOrEqual(10) // CA-01

    // 4. Cada fase tem 4 blocos canonicos (Inputs docs, Inputs codigo, Instrucao LLM, Criterio done)
    expect(planContent).toContain('Inputs (docs)')
    expect(planContent).toContain('Inputs (codigo)')
    expect(planContent).toContain('Instrucao LLM')
    expect(planContent).toContain('Criterio done')

    // 5. Step 90 rodou em modo warning (nao abortou) — CA-07
    const log90 = lines.find((l) => l.startsWith('[90-final-validation]'))
    expect(log90, 'Step 90 should have produced a log line').toBeDefined()
    expect(log90 ?? '').not.toContain('AbortError')

    // 6. CA-11 — mensagem final menciona /execute-plan + path do PLAN.md
    const tail = lines.slice(-12).join('\n')
    expect(tail).toContain('/anti-vibe-coding:execute-plan')
    expect(tail).toContain('populate-harness')

    // 7. progress.txt presente -> docs/compound/_imported/ populado
    const progressPath = path.join(cwd, '.claude', 'progress.txt')
    if (await fs.stat(progressPath).then(() => true).catch(() => false)) {
      const imported = await fs.readdir(path.join(cwd, 'docs', 'compound', '_imported'))
      expect(imported).toContain('INDEX.md')
      expect(imported.filter((f) => /^\d{4}-/.test(f)).length).toBeGreaterThanOrEqual(1)
    }

    // 8. budget
    const totalMs = Date.now() - overallStart
    expect(totalMs).toBeLessThan(30_000)
  })

  it('no references to removed steps 07/08/09/11 in registry', async () => {
    // Smoke check: importa registry e confirma IDs ausentes (CA-10)
    const { registry } = await import('../../skills/init/lib/registry')
    const ids = registry.map((s) => s.id)
    expect(ids).not.toContain('07-discover-existing-docs')
    expect(ids).not.toContain('08-classify-blocks-hybrid')
    expect(ids).not.toContain('09-propose-merge-batch')
    expect(ids).not.toContain('11-move-docs-with-stub')
  })
})
```

### Passo 2: fixture com `progress.txt` (opcional, exercita fase-02 no E2E)

Criar `tests/e2e/__fixtures__/init-greenfield/.claude/progress.txt`:

```
# Progress fixture - 3 gotchas para E2E

### [Armadilha] Foo
**Contexto:** test fixture

### [Processo] Bar
**Solucao:** test

### Baz numerico
body
```

Garante que CA-05 e exercitado pelo tracer-bullet sem precisar de fixture separada.

### Passo 3: regenerar golden files

```bash
# Apos os Planos 01-04 e fase-01/02/03 deste plano estarem verdes, rodar:
bun test tests/e2e/init-cutover-greenfield.test.ts --update-snapshots 2>/dev/null || true
# Ou, se infra de update-snapshots nao existir:
bun run tests/e2e/scripts/regen-golden.ts greenfield
```

Se nao houver script de regen, capturar stdout uma vez manualmente:

```typescript
// tests/e2e/scripts/regen-golden.ts (criar se ainda nao existe)
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { mkdtemp, cp } from 'node:fs/promises'
import os from 'node:os'
import { runInit } from '../../../skills/init/lib/run-init'

async function main() {
  const FIXTURE = path.join(import.meta.dir, '..', '__fixtures__', 'init-greenfield')
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'regen-'))
  await cp(FIXTURE, cwd, { recursive: true })
  const lines: string[] = []
  await runInit([], { cwd, log: (s: string) => lines.push(s) })

  // Reusar normalizeStdout/normalizeTree de init-cutover-greenfield.test.ts
  // [importar funcoes se exportadas; caso contrario duplicar logica de normalizacao]
  const normalized = lines.join('\n')
    .replace(/in \d+ ms/g, 'in <NN> ms')
    .replace(new RegExp(cwd.replace(/\\/g, '\\\\'), 'g'), '<TMP>')
    .replace(/\d{4}-\d{2}\.jsonl/g, '<YYYY-MM>.jsonl')
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z-populate-harness/g, '<DATE>-populate-harness')
    .replace(/— \d+ms/g, '— <NN>ms')

  await fs.writeFile(
    path.join(import.meta.dir, '..', '__golden__', 'init-greenfield.stdout.txt'),
    normalized,
    'utf-8',
  )
  console.log(`Golden file regenerated: ${normalized.length} chars`)
  await fs.rm(cwd, { recursive: true, force: true })
}

void main()
```

### Passo 4: light update em `init-cutover-greenfield.test.ts`

Adicionar 1 assertion (apos as existentes):

```typescript
// 2026-05-19 (Luiz/dev): Plano 05 fase-04 — populate-harness PLAN.md aparece na tree.
test('greenfield init produces populate-harness PLAN.md (CA-01)', async () => {
  const { result } = await captureLog(() =>
    runInit([], { cwd: tmpDir, log: () => {} }),
  )
  expect((result as { kind: string }).kind).toBe('ok')
  const tree = await readTreeSorted(tmpDir)
  const planEntry = tree.find((t) => t.includes('populate-harness') && t.endsWith('PLAN.md'))
  expect(planEntry, 'expected populate-harness/PLAN.md in tree').toBeDefined()
})
```

### Passo 5: registrar regeneracao em MEMORY.md

```markdown
## Decisoes de Implementacao

- **DI-Plano05-fase04:** Golden file `init-greenfield.stdout.txt` regenerado em 2026-05-19.
  - Por que: pipeline novo (Steps 07-11 removidos, Step 91 emite PLAN.md, CODE_STYLE.md no scaffold, progress.txt importado, mensagem final atualizada).
  - Tamanho esperado: ~ {NN} linhas (vs {MM} antigo).
  - Diff resumido: -[`07-discover-existing-docs`], -[`08-...`], +[`13-import-progress-txt`], +<DATE>-populate-harness/PLAN.md no tree.
```

---

## Gotchas

- **G5 do plano:** Golden file normalization tem regras especificas em `init-cutover-greenfield.test.ts` (linhas 61-82). Reusar essas funcoes ou replicar EXATAMENTE — divergencia gera flaky test.
- **G6 do plano:** Suite atual chama `scaffoldTemplates`/`scaffoldFullTree`/`linkClaudeToAgents` direto. Rewrite migra para `runInit` orquestrado — a perda intencional e: nao se testa MAIS a API de bibliotecas individuais (cobertura ja existe nos unit tests). Documentar essa decisao em MEMORY.md.
- **Local:** `runInit` em greenfield ja inclui Step 91 (Plano 03) que chama LLM. Em CI sem credenciais, Step 91 deve cair em soft-fail (Risco "Step 91 chama LLM e falha" do PRD). Esta fase do E2E ASSUME soft-fail emite PLAN.md minimo com >=10 fases stub — verificar com Plano 03 fase-05 que esse contrato esta honrado.
- **Local:** `populate-harness/PLAN.md` usa pasta datada (`{YYYY-MM-DDTHH-MM-SSZ}-populate-harness`). Tracer test usa regex `/populate-harness$/` para tolerar timestamp. Golden file ja normaliza `<DATE>-populate-harness`.
- **Local:** Adicionar `.claude/progress.txt` a fixture greenfield muda o tree esperado — `docs/compound/_imported/INDEX.md` + 3 arquivos `{nnnn}-{slug}.md`. Regen do `init-greenfield.tree.json` cobre.
- **Local:** Test "no references to removed steps" e barato — vale rodar mesmo em smoke; protege contra re-introducao acidental de Steps 07-11 (CA-10).

---

## Verificacao

### TDD

- [ ] **RED:** Rodar `bun test tests/e2e/init-tracer-bullet.test.ts` ANTES de regenerar golden e ANTES de rewrite -> espera FAIL massivo (suite chama APIs antigas)
- [ ] **GREEN apos rewrite + regen:** `bun test tests/e2e/init-tracer-bullet.test.ts` -> `2 pass, 0 fail`
- [ ] **GREEN apos regen golden:** `bun test tests/e2e/init-cutover-greenfield.test.ts` -> todos os testes passam (golden bate)

### Checklist

- [ ] `init-tracer-bullet.test.ts` reescrito (sem chamadas a `scaffoldTemplates`/`scaffoldFullTree` diretas)
- [ ] `init-greenfield.stdout.txt` regenerado (commit junto)
- [ ] `init-greenfield.tree.json` regenerado (commit junto)
- [ ] Fixture `tests/e2e/__fixtures__/init-greenfield/.claude/progress.txt` adicionada com 3 entradas
- [ ] `init-cutover-greenfield.test.ts` ganha 1 teste extra de `populate-harness/PLAN.md`
- [ ] Smoke test "no references to removed steps 07/08/09/11" passa
- [ ] `bun test tests/e2e/` retorna 0 failed
- [ ] `bun run lint` limpo
- [ ] MEMORY.md atualizado com decisao de regen

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/e2e/init-tracer-bullet.test.ts` retorna `2 pass, 0 fail`
- `bun test tests/e2e/init-cutover-greenfield.test.ts` retorna `0 failed` apos regen
- `grep -E "(07-discover|08-classify|09-propose|11-move-docs)" tests/e2e/init-tracer-bullet.test.ts` retorna 0 linhas (suite nao referencia mais steps removidos — CA-10)
- `bun test tests/e2e/` (suite completa) retorna `0 failed`

**Por humano:**
- Inspecionar diff do golden file revela: removal de steps 07-11, adicao do Step 91 emitindo PLAN.md, adicao do Step 13 (import-progress-txt), mensagem final mencionando `/execute-plan`
- Confirmar visualmente que `populate-harness/PLAN.md` no tree faz sentido

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
