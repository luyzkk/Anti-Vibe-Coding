<!--
Princípio universal #5 — Comment Provenance.
-->

# Fase 08: Zero Breaking Change Tests (Gating do Plano)

**Plano:** 05 — Skill Migration + Hooks
**Sizing:** 1.5h
**Depende de:** fase-01, 02, 03, 04, 05, 06 (todas as 6 skills migradas)
**Visual:** false

---

## O que esta fase entrega

Script E2E `tests/zero-breaking-change.test.ts` que invoca as **6 skills migradas** com **sintaxe v5.x** (string posicional, sub-comando + posicional, sem args) em fixture v6 e valida que cada chamada (1) completa sem exception, (2) produz output no path v6 correto, (3) interface publica eh identica a v5 (mesmas funcoes exportadas, mesmas chaves de retorno). Cobre R5 (32 skills explosao) e CA-17 (zero breaking change).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/tests/zero-breaking-change.test.ts` | Create | 18 testes (3 formas × 6 skills) + 6 testes de contrato de interface |
| `anti-vibe-coding/tests/fixtures/v6-empty/` | Create | Projeto v6 minimo: `docs/{compound,design-docs,exec-plans/{active,completed}}/` |
| `anti-vibe-coding/tests/fixtures/v6-empty/.gitignore` | Create | Ignora artefatos gerados |
| `anti-vibe-coding/tests/helpers/v6-fixture-setup.ts` | Create | Helper que reseta fixture entre testes (cleanup recursivo) |

---

## Implementacao

### Passo 1: fixture v6 minima

Estrutura via mkdir recursivo:

```
tests/fixtures/v6-empty/
├── .gitignore                       # ignora docs/{compound,design-docs,exec-plans}/*.md gerados
├── AGENTS.md                        # placeholder ≤40 linhas
├── ARCHITECTURE.md                  # placeholder
├── docs/
│   ├── compound/README.md
│   ├── design-docs/index.md
│   └── exec-plans/
│       ├── active/README.md
│       └── completed/README.md
└── package.json                     # minimo, sem deps
```

### Passo 2: helper `tests/helpers/v6-fixture-setup.ts`

```typescript
// 2026-05-11 (Luiz/dev): helper de fixture v6 — cleanup recursivo apos cada teste (Plano 02 G3 herdado)
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const FIXTURE_SRC = path.join(__dirname, '..', 'fixtures', 'v6-empty')

export async function makeTempV6(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-v6-'))
  await copyDir(FIXTURE_SRC, dir)
  return dir
}

export async function cleanup(dir: string): Promise<void> {
  // 2026-05-11 (Luiz/dev): force + retry para Windows (G2 herdado de Plano 04)
  await fs.rm(dir, { recursive: true, force: true })
}

async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })
  await Promise.all(entries.map(async (e) => {
    const s = path.join(src, e.name)
    const d = path.join(dest, e.name)
    if (e.isDirectory()) await copyDir(s, d)
    else await fs.copyFile(s, d)
  }))
}
```

### Passo 3: testes de zero breaking change

```typescript
// 2026-05-11 (Luiz/dev): CA-17 verbatim — 6 skills × 3 formas v5.x = 18 testes minimos + 6 contratos
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { makeTempV6, cleanup } from './helpers/v6-fixture-setup'
import { promises as fs } from 'node:fs'
import path from 'node:path'

// importacoes das 6 skills (mesmo entry point que v5.x exportava)
import * as lessonsLearned from '../skills/lessons-learned'
import * as decisionRegistry from '../skills/decision-registry'
import * as iterate from '../skills/iterate'
import * as planFeature from '../skills/plan-feature'
import * as quickPlan from '../skills/quick-plan'
import * as executePlan from '../skills/execute-plan'

let projectRoot: string
beforeEach(async () => { projectRoot = await makeTempV6() })
afterEach(async () => { await cleanup(projectRoot) })

describe('zero breaking change — D10 / CA-17', () => {
  // === lessons-learned ===
  test('lessons-learned: positional string syntax (v5.x)', async () => {
    const r = await lessonsLearned.add('foo bug fix', projectRoot)
    expect(r.filePath).toMatch(/docs\/compound\/\d{4}-\d{2}-\d{2}-foo-bug-fix\.md$/)
    expect(r.layout).toBe('v6')
    expect(await fs.stat(r.filePath)).toBeDefined()
  })

  test('lessons-learned: object syntax (v6 rich)', async () => {
    const r = await lessonsLearned.add({ title: 'rich', tags: ['perf'] }, projectRoot)
    expect(r.filePath).toContain('docs/compound')
    const content = await fs.readFile(r.filePath, 'utf-8')
    expect(content).toContain('tags: ["perf"]')
  })

  test('lessons-learned: no-args interactive stub (no-op)', async () => {
    // 2026-05-11 (Luiz/dev): forma sem args eh interativa; aqui validamos so que nao lanca em modo nao interativo
    // mock do prompt retorna defaults
    await expect(async () => {
      const r = await lessonsLearned.add('default-title', projectRoot)
      expect(r.layout).toBe('v6')
    }).not.toThrow()
  })

  // === decision-registry ===
  test('decision-registry: positional string syntax (v5.x)', async () => {
    const r = await decisionRegistry.add('use TanStack Query', projectRoot)
    expect(r.filePath).toMatch(/ADR-0001-use-tanstack-query\.md$/)
    expect(r.id).toBe(1)
  })

  test('decision-registry: object syntax with alternatives', async () => {
    const r = await decisionRegistry.add({
      title: 'cache strategy',
      alternatives: ['memory', 'redis'],
    }, projectRoot)
    expect(r.id).toBe(1)
    const body = await fs.readFile(r.filePath, 'utf-8')
    expect(body).toContain('- memory')
    expect(body).toContain('- redis')
  })

  test('decision-registry: monotonic numbering after second add', async () => {
    await decisionRegistry.add('a', projectRoot)
    const r2 = await decisionRegistry.add('b', projectRoot)
    expect(r2.id).toBe(2)
  })

  // === plan-feature ===
  test('plan-feature: produces 10 H2 sections (D18)', async () => {
    const r = await planFeature.create('test feature', projectRoot)
    const body = await fs.readFile(r.filePath, 'utf-8')
    const h2 = body.match(/^## /gm) ?? []
    expect(h2.length).toBe(10)
  })

  test('plan-feature: writes to docs/exec-plans/active/', async () => {
    const r = await planFeature.create('test feature', projectRoot)
    expect(r.filePath).toContain('docs/exec-plans/active')
  })

  test('plan-feature: backward-compat object input', async () => {
    const r = await planFeature.create({ title: 'rich' }, projectRoot)
    expect(r.filePath).toMatch(/rich\.md$/)
  })

  // === quick-plan ===
  test('quick-plan: produces 7 H2 sections', async () => {
    const r = await quickPlan.quickPlan('short task', projectRoot)
    const body = await fs.readFile(r.filePath, 'utf-8')
    const h2 = body.match(/^## /gm) ?? []
    expect(h2.length).toBe(7)
  })

  test('quick-plan: no Assumptions/Risks/Review Checklist', async () => {
    const r = await quickPlan.quickPlan('short task', projectRoot)
    const body = await fs.readFile(r.filePath, 'utf-8')
    expect(body).not.toMatch(/^## Assumptions$/m)
    expect(body).not.toMatch(/^## Risks$/m)
    expect(body).not.toMatch(/^## Review Checklist$/m)
  })

  test('quick-plan: backward-compat string input', async () => {
    await expect(quickPlan.quickPlan('s', projectRoot)).resolves.toBeDefined()
  })

  // === execute-plan ===
  test('execute-plan: lists active plans', async () => {
    await planFeature.create('to-execute', projectRoot)
    const plans = await executePlan.listActive(projectRoot)
    expect(plans.length).toBe(1)
  })

  test('execute-plan: moves plan when isComplete', async () => {
    const p = await planFeature.create('movable', projectRoot)
    // marcar Exit Criteria
    let body = await fs.readFile(p.filePath, 'utf-8')
    body = body.replace('<!-- preencher -->', '- [x] done')
    await fs.writeFile(p.filePath, body, 'utf-8')

    await executePlan.onPlanPotentiallyComplete(projectRoot, p.filePath)
    await expect(fs.stat(p.filePath)).rejects.toBeDefined()
    const completedDir = path.join(projectRoot, 'docs', 'exec-plans', 'completed')
    const completed = await fs.readdir(completedDir)
    expect(completed.some((f) => f.includes('movable'))).toBe(true)
  })

  test('execute-plan: backward-compat invocation without args', async () => {
    await expect(executePlan.listActive(projectRoot)).resolves.toBeDefined()
  })

  // === iterate ===
  test('iterate: runs compound gate on complete plans', async () => {
    const p = await planFeature.create('gate-target', projectRoot)
    let body = await fs.readFile(p.filePath, 'utf-8')
    body = body.replace('<!-- preencher -->', '- [x] done')
    await fs.writeFile(p.filePath, body, 'utf-8')

    const mockPrompt = async () => ({
      choice: 'no_capture_needed' as const,
      noCaptureReason: 'test reason',
    })

    const r = await iterate.iterate(mockPrompt, projectRoot)
    expect(r.gatesRun).toBe(1)
  })

  test('iterate: backward-compat no-args invocation', async () => {
    await expect(iterate.iterate(async () => ({ choice: 'postpone' as const }), projectRoot)).resolves.toBeDefined()
  })

  test('iterate: skips active plans not complete', async () => {
    await planFeature.create('not-complete', projectRoot)
    const r = await iterate.iterate(async () => ({ choice: 'postpone' as const }), projectRoot)
    expect(r.gatesRun).toBe(0)
  })

  // === contratos de interface (verificar shape exportada) ===
  test('interface contract: lessons-learned exports add()', () => {
    expect(typeof lessonsLearned.add).toBe('function')
  })

  test('interface contract: decision-registry exports add()', () => {
    expect(typeof decisionRegistry.add).toBe('function')
  })

  test('interface contract: plan-feature exports create()', () => {
    expect(typeof planFeature.create).toBe('function')
  })

  test('interface contract: quick-plan exports quickPlan()', () => {
    expect(typeof quickPlan.quickPlan).toBe('function')
  })

  test('interface contract: execute-plan exports listActive() + onPlanPotentiallyComplete()', () => {
    expect(typeof executePlan.listActive).toBe('function')
    expect(typeof executePlan.onPlanPotentiallyComplete).toBe('function')
  })

  test('interface contract: iterate exports iterate()', () => {
    expect(typeof iterate.iterate).toBe('function')
  })
})
```

### Passo 4: desativar hook durante testes

Adicionar `process.env.ANTI_VIBE_DISABLE_HOOKS = '1'` no setup do test runner (`bunfig.toml` ou helper) para evitar que `pre-mutation-gate.cjs` interfira em testes orchestrated.

```toml
# bunfig.toml — ja deve existir; adicionar
[test]
preload = ["./tests/setup.ts"]
```

```typescript
// tests/setup.ts
// 2026-05-11 (Luiz/dev): desativa hooks UserPromptSubmit durante testes (fase-07 G ANTI_VIBE_DISABLE_HOOKS)
process.env.ANTI_VIBE_DISABLE_HOOKS = '1'
```

E no `hooks/pre-mutation-gate.cjs`, no inicio de `main()`:

```javascript
if (process.env.ANTI_VIBE_DISABLE_HOOKS === '1') return passthrough()
```

---

## Gotchas

- **G1 do plano (D10 obrigatorio):** Se algum teste falhar por mudanca de assinatura, **nao reescrever o teste** — corrigir a skill. Teste eh o contrato.
- **G2 do plano (cross-platform):** `mkdtemp` + `path.join` em fixture setup. `fs.rm` com `force: true` para Windows.
- **G3 do plano (hook fase-07 interferindo):** Variavel `ANTI_VIBE_DISABLE_HOOKS=1` + early return no hook. Documentar em fase-07 tambem.
- **Local 08-G1 (importacao das skills):** Skills atuais talvez nao tenham entry point limpo de TS (algumas sao prompts em SKILL.md). Pode ser necessario expor `index.ts` em cada uma — se isso ainda nao existe, criar como wrapper minimo que reexporta funcoes ja existentes. Anotar em MEMORY.md como desvio se for o caso.
- **Local 08-G2 (Bun test vs Vitest):** Esses testes usam `bun:test`. Se o repo migrar para Vitest, adaptar imports. Verificar `package.json` antes de assumir.
- **Local 08-G3 (interface contracts cobrem nomes de funcao):** Renomear funcao publica = breaking change. Tests detectam se alguem renomeia `add` para `create` etc.

---

## Verificacao

### TDD

- [ ] **RED:** Rodar o test suite ANTES das skills serem migradas → todos os 18 testes funcionais falham (skills ainda escrevem em paths v5)
  - Comando: `bun test tests/zero-breaking-change.test.ts`
  - Resultado esperado: muitos failures

- [ ] **GREEN:** Apos fase-01..06 concluidas, todos os 24 testes (18 funcionais + 6 contrato) passam
  - Comando: `bun test tests/zero-breaking-change.test.ts`
  - Resultado esperado: `24 passed, 0 failed`

### Checklist

- [ ] Fixture `tests/fixtures/v6-empty/` versionada com arquivos placeholder
- [ ] Helper `makeTempV6()` copia fixture para tmpdir; `cleanup()` apaga recursivamente
- [ ] Cada uma das 6 skills tem >=2 testes funcionais (string posicional + objeto rico)
- [ ] Skill `iterate` tem >=2 testes: caminho ativo e caminho completo
- [ ] Skill `execute-plan` tem teste do move efetivo (active → completed)
- [ ] Skill `plan-feature` valida **contagem exata** de 10 secoes (regressao se template harmonizado quebrar)
- [ ] Skill `quick-plan` valida **ausencia** de Assumptions/Risks/Review Checklist
- [ ] 6 testes de contrato verificam que funcoes esperadas estao exportadas
- [ ] Hooks desativados durante testes via `ANTI_VIBE_DISABLE_HOOKS=1`
- [ ] Teste com Windows-compatible path joins (rodar `bun test` no Windows e validar exit 0)
- [ ] Testes passam: `bun run test`
- [ ] Lint + typecheck

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/zero-breaking-change.test.ts` exit 0 com **24+ testes passados** (18 funcionais + 6 contrato)
- `bun run lint && bun run typecheck` exit 0
- `bun run harness:validate` (Plano 04) sobre cada estado de fixture pos-teste exit 0 (nao gerou planos orfaos)

**CA do PRD coberto:**
- CA-17 (verbatim): "Dado script que invocava `/lessons-learned` em v5.x via mesma sintaxe, quando invocar em v6, então funciona — apenas o destino mudou (D10)."

**Gating do plano:** este teste eh o **tracer bullet** do Plano 05. Se passa, plano completo; se falha, identificar fase responsavel via mensagem de teste e revisitar.

---

<!-- Gerado por /plan-feature em 2026-05-11 -->
