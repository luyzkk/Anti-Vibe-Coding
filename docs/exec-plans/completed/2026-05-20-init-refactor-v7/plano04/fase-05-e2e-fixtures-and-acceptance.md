<!--
Princípio universal #5 — Comment Provenance.
-->

# Fase 05: E2E em 3 fixtures + acceptance (CA-01, CA-04, CA-07, DR-2)

**Plano:** 04 — Step 7 generate-populate-plans (CORE)
**Sizing:** 1.5h
**Depende de:** fase-04 (Step 7 real wired no registry)
**Visual:** false

---

## O que esta fase entrega

Suite e2e em `tests/e2e/` com 3 fixtures (Node-TS greenfield, Rails greenfield, no-stack)
validando os 4 acceptance criteria do PRD relevantes a este plano:

- **CA-01** — Node greenfield + `runInit([])` → 16 PLAN.md em `docs/exec-plans/active/`
- **CA-04** — Rails greenfield → `docs-frontend-md/PLAN.md` contem `app/views` e `app/assets`
- **CA-07** — qualquer PLAN.md gerado tem exatamente as 10 secoes H2 da ordem canonica
- **DR-2** — no-stack fixture → `runInit([])` aborta com code=20

Tambem cobre parity gate: contagem da tabela `POPULATE_INSTRUCTIONS_BY_DOC` matcheia o numero
de PLAN.md no disco (defesa contra drift entre os dois).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/__fixtures__/v7-populate-node/package.json` | Create | Fixture minima Node-TS — `{"name":"v7-fix-node","dependencies":{"typescript":"^5"}}` |
| `tests/e2e/__fixtures__/v7-populate-node/.gitkeep` | Create | Manter pasta em git |
| `tests/e2e/__fixtures__/v7-populate-rails/Gemfile` | Create | Fixture minima Rails — `source 'https://rubygems.org'\ngem 'rails', '~> 7.0'` |
| `tests/e2e/__fixtures__/v7-populate-rails/.gitkeep` | Create | Manter pasta em git |
| `tests/e2e/__fixtures__/v7-populate-no-stack/.gitkeep` | Create | Pasta vazia (sem package.json, sem Gemfile) — dispara DR-2 |
| `tests/e2e/init-v7-populate-plans-node.test.ts` | Create | E2E CA-01 + CA-07 com fixture Node-TS |
| `tests/e2e/init-v7-populate-plans-rails.test.ts` | Create | E2E CA-04 com fixture Rails |
| `tests/e2e/init-v7-populate-plans-no-stack.test.ts` | Create | E2E DR-2 abort com fixture sem stack |

---

## Implementacao

### Passo 1: Criar 3 fixtures minimas

```bash
# Node-TS fixture
mkdir -p tests/e2e/__fixtures__/v7-populate-node
cat > tests/e2e/__fixtures__/v7-populate-node/package.json <<'EOF'
{
  "name": "v7-fix-node",
  "version": "0.0.0",
  "private": true,
  "dependencies": {
    "typescript": "^5"
  }
}
EOF
touch tests/e2e/__fixtures__/v7-populate-node/.gitkeep

# Rails fixture
mkdir -p tests/e2e/__fixtures__/v7-populate-rails
cat > tests/e2e/__fixtures__/v7-populate-rails/Gemfile <<'EOF'
source 'https://rubygems.org'
gem 'rails', '~> 7.0'
EOF
touch tests/e2e/__fixtures__/v7-populate-rails/.gitkeep

# No-stack fixture (vazio)
mkdir -p tests/e2e/__fixtures__/v7-populate-no-stack
touch tests/e2e/__fixtures__/v7-populate-no-stack/.gitkeep
```

### Passo 2: Helper de copia + execucao (reusavel pelos 3 e2e)

Verificar se ja existe helper de e2e em `tests/e2e/__fixtures__/helpers.ts` (provavel — Plano 01
fase-06 ja criou). Se sim, reusa. Se nao, criar:

```typescript
// tests/e2e/__fixtures__/v7-populate-helpers.ts (criar se nao existir generico)
// 2026-05-21 (Luiz/dev): Plano 04 fase-05 — helper para e2e dos 3 fixtures.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export async function copyFixtureToTmp(fixtureName: string): Promise<string> {
  const src = path.join(import.meta.dir, fixtureName)
  const dst = await fs.mkdtemp(path.join(os.tmpdir(), `avc-e2e-${fixtureName}-`))
  await copyRecursive(src, dst)
  return dst
}

async function copyRecursive(src: string, dst: string): Promise<void> {
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name === '.gitkeep') continue
    const s = path.join(src, entry.name)
    const d = path.join(dst, entry.name)
    if (entry.isDirectory()) {
      await fs.mkdir(d, { recursive: true })
      await copyRecursive(s, d)
    } else {
      await fs.copyFile(s, d)
    }
  }
}
```

### Passo 3: E2E Node-TS (CA-01 + CA-07)

```typescript
// tests/e2e/init-v7-populate-plans-node.test.ts
// 2026-05-21 (Luiz/dev): Plano 04 fase-05 — CA-01 + CA-07 via fixture Node-TS.

import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { copyFixtureToTmp } from './__fixtures__/v7-populate-helpers'
import { runInit } from '../../skills/init/lib/run-init'

describe('e2e: init v7 generate-populate-plans (Node-TS)', () => {
  let cwd: string
  beforeEach(async () => {
    cwd = await copyFixtureToTmp('v7-populate-node')
  })
  afterEach(async () => {
    await fs.rm(cwd, { recursive: true, force: true })
  })

  test('CA-01: runInit creates 16 PLAN.md files in docs/exec-plans/active/', async () => {
    await runInit([], { cwd })
    const activeDir = path.join(cwd, 'docs', 'exec-plans', 'active')
    const entries = await fs.readdir(activeDir)
    const populateDirs = entries.filter(e => e.includes('-populate-'))
    expect(populateDirs.length).toBe(16)

    for (const dir of populateDirs) {
      const planPath = path.join(activeDir, dir, 'PLAN.md')
      const stat = await fs.stat(planPath)
      expect(stat.isFile()).toBe(true)
      expect(stat.size).toBeGreaterThan(500) // PLAN.md substantial, not empty
    }
  })

  test('CA-07: every generated PLAN.md has exactly the 10 H2 sections in canonical order', async () => {
    await runInit([], { cwd })
    const activeDir = path.join(cwd, 'docs', 'exec-plans', 'active')
    const dirs = (await fs.readdir(activeDir)).filter(e => e.includes('-populate-'))

    const EXPECTED_SECTIONS = [
      '## Goal',
      '## Scope',
      '## Assumptions',
      '## Risks',
      '## Execution Steps',
      '## Review Checklist',
      '## Validation Log',
      '## Compound Opportunity',
      '## Lessons Captured',
      '## Exit Criteria',
    ]

    for (const dir of dirs) {
      const content = await fs.readFile(path.join(activeDir, dir, 'PLAN.md'), 'utf-8')
      const sections = content.split('\n').filter(l => l.startsWith('## '))
      expect(sections, `Plan ${dir} sections`).toEqual(EXPECTED_SECTIONS)
    }
  })

  test('parity gate: number of plans matches POPULATE_INSTRUCTIONS_BY_DOC.size', async () => {
    const { POPULATE_INSTRUCTIONS_BY_DOC } = await import('../../skills/init/lib/populate-instructions-table')
    await runInit([], { cwd })
    const activeDir = path.join(cwd, 'docs', 'exec-plans', 'active')
    const populateDirs = (await fs.readdir(activeDir)).filter(e => e.includes('-populate-'))
    expect(populateDirs.length).toBe(POPULATE_INSTRUCTIONS_BY_DOC.size)
  })

  test('Node-TS FRONTEND plan uses src/components, not app/views', async () => {
    await runInit([], { cwd })
    const frontendPlanPath = (await fs.readdir(path.join(cwd, 'docs/exec-plans/active')))
      .find(d => d.includes('-populate-docs-frontend-md'))!
    const content = await fs.readFile(
      path.join(cwd, 'docs/exec-plans/active', frontendPlanPath, 'PLAN.md'),
      'utf-8',
    )
    expect(content).toContain('src/components')
    expect(content).not.toContain('app/views')
  })
})
```

### Passo 4: E2E Rails (CA-04)

```typescript
// tests/e2e/init-v7-populate-plans-rails.test.ts
// 2026-05-21 (Luiz/dev): Plano 04 fase-05 — CA-04 via fixture Rails.

import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { copyFixtureToTmp } from './__fixtures__/v7-populate-helpers'
import { runInit } from '../../skills/init/lib/run-init'

describe('e2e: init v7 generate-populate-plans (Rails)', () => {
  let cwd: string
  beforeEach(async () => {
    cwd = await copyFixtureToTmp('v7-populate-rails')
  })
  afterEach(async () => {
    await fs.rm(cwd, { recursive: true, force: true })
  })

  test('CA-04: FRONTEND.md plan contains app/views and app/assets in Wave 1', async () => {
    await runInit([], { cwd })

    const activeDir = path.join(cwd, 'docs/exec-plans/active')
    const frontendDir = (await fs.readdir(activeDir))
      .find(d => d.endsWith('populate-docs-frontend-md'))
    expect(frontendDir, 'FRONTEND.md populate dir').toBeDefined()

    const content = await fs.readFile(
      path.join(activeDir, frontendDir!, 'PLAN.md'),
      'utf-8',
    )
    expect(content).toContain('app/views')
    expect(content).toContain('app/assets')
    expect(content).not.toContain('src/components')
  })

  test('Rails SECURITY plan uses Gemfile and config/initializers (not Node paths)', async () => {
    await runInit([], { cwd })
    const securityDir = (await fs.readdir(path.join(cwd, 'docs/exec-plans/active')))
      .find(d => d.endsWith('populate-docs-security-md'))!
    const content = await fs.readFile(
      path.join(cwd, 'docs/exec-plans/active', securityDir, 'PLAN.md'),
      'utf-8',
    )
    expect(content).toContain('Gemfile')
    expect(content).not.toContain('package.json')
  })
})
```

### Passo 5: E2E No-Stack (DR-2)

```typescript
// tests/e2e/init-v7-populate-plans-no-stack.test.ts
// 2026-05-21 (Luiz/dev): Plano 04 fase-05 — DR-2 abort em projeto sem stack.

import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { copyFixtureToTmp } from './__fixtures__/v7-populate-helpers'
import { runInit } from '../../skills/init/lib/run-init'
import { AbortError } from '../../skills/init/lib/steps/abort-error'

describe('e2e: init v7 generate-populate-plans (DR-2 — no stack)', () => {
  let cwd: string
  beforeEach(async () => {
    cwd = await copyFixtureToTmp('v7-populate-no-stack')
  })
  afterEach(async () => {
    await fs.rm(cwd, { recursive: true, force: true })
  })

  test('DR-2: runInit aborts with code 20 when no stack detected', async () => {
    let caught: unknown = null
    try {
      await runInit([], { cwd })
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(AbortError)
    expect((caught as AbortError).code).toBe(20)
    expect((caught as AbortError).reason).toContain('detect-architecture')
    expect((caught as AbortError).reason).toContain('Detected primary: null')
  })

  test('DR-2: zero PLAN.md files written before abort', async () => {
    try {
      await runInit([], { cwd })
    } catch {
      /* expected abort */
    }
    const activeDir = path.join(cwd, 'docs/exec-plans/active')
    let entries: string[] = []
    try {
      entries = await fs.readdir(activeDir)
    } catch {
      // dir may not exist — that is also a valid "no plans" state
    }
    const populateDirs = entries.filter(e => e.includes('-populate-'))
    expect(populateDirs.length).toBe(0)
  })
})
```

---

## Gotchas

- **G4 do plano (Plano 04 NAO popula placeholders):** os e2e validam apenas `docs/exec-plans/active/`,
  NUNCA verificam conteudo de `docs/SECURITY.md` (placeholder vazio, populado depois via `/execute-plan`).
  Se um teste tentar `expect(docs/SECURITY.md).toContain(...)` esta confundindo os escopos.

- **G6 do plano (data nos slugs):** os testes usam `find d => d.endsWith('populate-docs-frontend-md')`
  com `endsWith` em vez de `===` exato — pra ser robustos a data ser do dia real (sem injetar clock
  pelo `runInit`). Alternativa: expor opcao `clock` via `runInit` — desnecessario para validar paths.

- **G5 do plano (DR-2 wording):** o teste verifica `reason.toContain('detect-architecture')`, nao
  string exata — wording pode evoluir, contrato semantico (mencionar a skill correta) e estavel.

- **Local — `runInit` precisa do gate de re-entrada NAO disparar:** o fixture e greenfield (sem
  `.claude/legacy-manifest.json`), entao Plano 01 Step 1 nao aborta. Apos o run, o manifest e
  criado pelo Plano 02 Step 4 — se quiser rodar `runInit` de novo, precisa limpar `.claude/`
  ou usar fixture limpo (o `beforeEach` ja faz mkdtemp limpo).

- **Local — runtime depende de Planos 01-03:** se algum dos planos anteriores nao estiver mergeado,
  `runInit` pode quebrar antes de chegar no Step 7. Recomendacao: rodar este plano DEPOIS de
  Planos 01+02+03 mergeados na main. Caso contrario, simular o estado via:
  `bun test 07-generate-populate-plans.test.ts` (unit do step puro, sem `runInit`).

- **Local — fixtures `.gitkeep`:** o helper de copia ignora `.gitkeep` para nao poluir tmp.
  Se um fixture acabar vazio (no-stack), a pasta mkdtemp fica vazia — `runInit` precisa nao
  abortar por isso ate chegar no Step 7. Plano 01 Step 1 (reentry-gate) passa silencioso em pasta
  vazia. Plano 01 Step 2 (detect-stack) popula `stack.primary === null`. Step 7 entao aborta — esperado.

- **Local — `bun test tests/e2e/`:** o glob padrao do `bun test` pode nao capturar
  arquivos em `tests/e2e/` se nao estiverem listados em `package.json` ou se houver um root
  diferente. Confirmar via `bun test tests/e2e/init-v7-populate-plans-node.test.ts` (path explicito).

---

## Verificacao

### TDD

- [ ] **RED:** todos os 3 e2e falham porque ou (a) gerador nao tem instructions-table preenchida,
  ou (b) Step 7 nao existe ainda, ou (c) `runInit` quebra. fase-04 deve estar GREEN antes.

- [ ] **GREEN:** apos fase-04 mergeada e fixtures criados, todos os ~9 e2e passam
  - Comando: `bun test tests/e2e/init-v7-populate-plans-*.test.ts`
  - Resultado esperado: `9 passed, 0 failed`

### Checklist

- [ ] 3 fixtures criadas em `tests/e2e/__fixtures__/v7-populate-{node,rails,no-stack}/`
- [ ] `tests/e2e/init-v7-populate-plans-node.test.ts` — 4 testes verdes
- [ ] `tests/e2e/init-v7-populate-plans-rails.test.ts` — 2 testes verdes
- [ ] `tests/e2e/init-v7-populate-plans-no-stack.test.ts` — 2 testes verdes
- [ ] Parity gate verde: `populateDirs.length === POPULATE_INSTRUCTIONS_BY_DOC.size`
- [ ] Tracer global do Plano 01 (`tests/e2e/init-v7-tracer-bullet.test.ts`) continua verde
- [ ] `bun run test` (suite completa) verde
- [ ] `bun run lint` limpo
- [ ] `bun run harness:validate` (se gates atualizados em Plano 05): passa ou warning esperado

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/e2e/init-v7-populate-plans-node.test.ts` retorna `4 passed, 0 failed`
- `bun test tests/e2e/init-v7-populate-plans-rails.test.ts` retorna `2 passed, 0 failed`
- `bun test tests/e2e/init-v7-populate-plans-no-stack.test.ts` retorna `2 passed, 0 failed`
- `bun test tests/e2e/init-v7-tracer-bullet.test.ts` continua verde (regressao do tracer)

**Por humano:**
- Inspecao visual de 3 PLAN.md (1 Node, 1 Rails, 1 outro doc): markdown bem formado, paths
  fazem sentido pra stack, secoes na ordem certa, sem `{{VAR}}` literal.

---

<!-- Gerado por /plan-feature em 2026-05-21 -->
