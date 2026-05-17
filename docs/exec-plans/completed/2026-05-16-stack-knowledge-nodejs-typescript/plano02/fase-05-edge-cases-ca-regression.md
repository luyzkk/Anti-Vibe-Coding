<!--
Princípio universal #5 — Comment Provenance.
Comentários em código gerado desta fase seguem: autor + papel, YYYY-MM-DD, razão/decisão referenciada.
Ex: `// 2026-05-16 (Luiz/dev): asserção CA-10 — alinhada com PRD §Critérios de Aceite (linha 246)`
-->

# Fase 05: Edge Cases — CA-03, CA-06, CA-07, CA-10 + NFR Perf

**Plano:** 02 — Init Enrichment
**Sizing:** 1h
**Depende de:** fase-01 (detect multi-stack), fase-02 (stack.json writer), fase-03 (idempotent + refresh), fase-04 (telemetria)
**Visual:** false

---

## O que esta fase entrega

Extensão do E2E `tests/e2e/stack-knowledge-tracer-bullet.test.ts` (criado no Plano 01 fase-05) cobrindo CA-03 (Rails puro, sem cópia Node), CA-06 (sem anchor → `primary: null`, no crash), CA-07 (multi-stack Rails+Node, primary=rails), CA-10 (regressão `/init`: STATE.md inalterado), além de asserts dos NFR de performance (`detection < 500ms`, `cópia < 100ms`).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/stack-knowledge-tracer-bullet.test.ts` | Modify | Adicionar 5 novos `it()` blocks: CA-03, CA-06, CA-07, CA-10 e NFR perf. Manter o teste original do Plano 01 (happy path CA-02/CA-05/CA-09) intacto. |
| `tests/fixtures/stack-knowledge/` | Create | Subpastas-fixture: `rails-only/` (Gemfile), `multi-stack/` (Gemfile + package.json + .rb files majority), `no-anchor/` (README.md vazio). Cada fixture é mínima — apenas anchor files + arquivos source para tiebreaker. |

---

## Implementacao

### Passo 1: Fixtures isolados

Criar fixtures determinísticos. Não confiar em `tests/fixtures/empty-dir/` — pode mudar com outros planos.

```
tests/fixtures/stack-knowledge/
├── node-ts-only/
│   └── package.json          # {"devDependencies":{"typescript":"^5"}}
├── rails-only/
│   └── Gemfile               # gem "rails"
├── multi-stack/
│   ├── Gemfile
│   ├── package.json
│   ├── app/models/{user,order,item,product,invoice}.rb   # 5 .rb files
│   └── frontend/index.ts                                  # 1 .ts file
└── no-anchor/
    └── README.md             # # nothing
```

Cada subpasta é committada vazia (com `.gitkeep` quando necessário) ou tem só anchor files. **Não** committar `.claude/` — os testes geram em runtime.

### Passo 2: Helpers comuns do E2E

```typescript
// 2026-05-16 (Luiz/dev): helpers comuns para os edge cases — Plano 06 fase-06 reaproveita.
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'

async function cloneFixture(fixtureName: string): Promise<string> {
  const src = path.join(import.meta.dir, '..', 'fixtures', 'stack-knowledge', fixtureName)
  const dest = await fs.mkdtemp(path.join(tmpdir(), `e2e-${fixtureName}-`))
  await fs.cp(src, dest, { recursive: true })
  return dest
}

async function readStackJsonRaw(targetDir: string): Promise<any | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(targetDir, '.claude', 'stack.json'), 'utf8'))
  } catch {
    return null
  }
}

async function readStateMd(targetDir: string): Promise<string | null> {
  try {
    return await fs.readFile(path.join(targetDir, 'docs', 'STATE.md'), 'utf8')
  } catch {
    return null
  }
}

async function runInit(targetDir: string, args: string = ''): Promise<{ durationMs: number; output: string }> {
  // 2026-05-16 (Luiz/dev): /init é orquestrado via SKILL.md — em testes invocamos o helper composto diretamente
  // para evitar acoplamento ao executor de slash commands. Pattern espelha tests/e2e/init-tracer-bullet.test.ts.
  const start = Date.now()
  const { detectMultiStack } = await import('../../skills/init/lib/detect-multi-stack')
  const { writeStackJson } = await import('../../skills/init/lib/write-stack-json')
  const { copyKnowledge } = await import('../../skills/init/lib/copy-knowledge')
  const pluginRoot = path.join(import.meta.dir, '..', '..')

  const detection = await detectMultiStack(targetDir)
  await writeStackJson(targetDir, detection)
  const refresh = args.includes('--refresh-knowledge')
  const copyResult = await copyKnowledge({
    targetDir,
    pluginRoot,
    primary: detection.primary,
    refresh,
  })
  return { durationMs: Date.now() - start, output: copyResult.message }
}
```

### Passo 3: Novos casos no E2E

```typescript
// 2026-05-16 (Luiz/dev): edge cases — CA-03/CA-06/CA-07/CA-10 + NFR perf.
// Anexar no describe existente de tests/e2e/stack-knowledge-tracer-bullet.test.ts.

describe('stack-knowledge E2E — edge cases', () => {
  it('CA-03: Rails puro grava primary=rails, secondary=[], NÃO copia knowledge Node+TS', async () => {
    const dir = await cloneFixture('rails-only')
    const { output } = await runInit(dir)
    const stackJson = await readStackJsonRaw(dir)
    expect(stackJson.primary).toBe('rails')
    expect(stackJson.secondary).toEqual([])
    expect(stackJson.anchor_files).toEqual(['Gemfile'])
    // 2026-05-16 (Luiz/dev): em v6.3.2 não existe docs/knowledge/rails/ → copy-knowledge retorna no-source
    expect(output).toContain('rails')
    expect(output).toMatch(/não foi copiado/i)
    // Garantia explícita: pasta knowledge/ NÃO foi criada (ou foi criada vazia)
    const knowledgeExists = await fs.access(path.join(dir, '.claude', 'knowledge')).then(() => true).catch(() => false)
    if (knowledgeExists) {
      const entries = await fs.readdir(path.join(dir, '.claude', 'knowledge'))
      expect(entries).toEqual([])
    }
  })

  it('CA-06: projeto sem anchor file grava primary=null, no crash', async () => {
    const dir = await cloneFixture('no-anchor')
    const { output } = await runInit(dir)
    const stackJson = await readStackJsonRaw(dir)
    expect(stackJson.primary).toBeNull()
    expect(stackJson.secondary).toEqual([])
    expect(stackJson.anchor_files).toEqual([])
    expect(output).toBe('Stack não detectada. Knowledge não foi copiado.')
  })

  it('CA-07: multi-stack Rails+Node frontend grava primary=rails, secondary=[nodejs-typescript]', async () => {
    const dir = await cloneFixture('multi-stack')
    await runInit(dir)
    const stackJson = await readStackJsonRaw(dir)
    expect(stackJson.primary).toBe('rails')
    expect(stackJson.secondary).toEqual(['nodejs-typescript'])
    expect(stackJson.anchor_files.sort()).toEqual(['Gemfile', 'package.json'])
  })

  it('CA-10 regressão: STATE.md mantém detected_stack com StackId interno (não matrix folder)', async () => {
    // 2026-05-16 (Luiz/dev): cenário híbrido — rodar /init completo (com state-md-init.ts) em fixture Node+TS
    // e verificar que STATE.md continua com `detected_stack: node-ts` (StackId interno), não `nodejs-typescript`.
    // G1 / G2: dupla representação preservada.
    const dir = await cloneFixture('node-ts-only')
    // setup mínimo de STATE.md (Plano 01 fase-03 já invoca state-md-init via /init real;
    // aqui invocamos state-md-init explicitamente para isolar a asserção CA-10)
    const { detectStack } = await import('../../skills/init/lib/detect-stack')
    const { writeStackToStateMd } = await import('../../skills/init/lib/state-md-init')
    const detected = await detectStack(dir)
    await fs.mkdir(path.join(dir, 'docs'), { recursive: true })
    await fs.writeFile(path.join(dir, 'docs', 'STATE.md'), '# STATE\n\ndetected_stack: __PLACEHOLDER__\n')
    await writeStackToStateMd(dir, detected) // assinatura existente — não modificada neste plano

    await runInit(dir) // grava .claude/stack.json com primary=nodejs-typescript

    const stateMd = await readStateMd(dir)
    expect(stateMd).toContain('detected_stack: node-ts') // StackId interno
    expect(stateMd).not.toContain('detected_stack: nodejs-typescript') // não vazou matrix folder name

    const stackJson = await readStackJsonRaw(dir)
    expect(stackJson.primary).toBe('nodejs-typescript') // matrix folder no stack.json
  })

  it('NFR perf: detection completes in < 500ms on a typical project', async () => {
    const dir = await cloneFixture('multi-stack')
    const { detectMultiStack } = await import('../../skills/init/lib/detect-multi-stack')
    const start = Date.now()
    await detectMultiStack(dir)
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(500)
  })

  it('NFR perf: copyKnowledge (Node+TS happy path) completes in < 100ms', async () => {
    const dir = await cloneFixture('node-ts-only')
    const { copyKnowledge } = await import('../../skills/init/lib/copy-knowledge')
    const pluginRoot = path.join(import.meta.dir, '..', '..')
    const start = Date.now()
    await copyKnowledge({ targetDir: dir, pluginRoot, primary: 'nodejs-typescript' })
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(100)
  })
})
```

### Passo 4: Sanity — testes anteriores do Plano 01 continuam verdes

Rodar a suite completa para verificar não há regressão dos casos do Plano 01 (`CA-02 + CA-05 + CA-09` happy path).

```bash
bun run test -- --grep 'stack-knowledge'
# Esperado: todos os blocks (Plano 01 e Plano 02) verdes
```

---

## Gotchas

- **G1 do plano (CA-10):** Asserção explícita `expect(stateMd).toContain('detected_stack: node-ts')` é o **guard test** que falhará se alguém renomear `StackId` ou alterar `state-md-init.ts`. Mantém DI-1/DI-2 honrados.
- **G2 do plano:** Mesmo teste valida `stackJson.primary === 'nodejs-typescript'` no mesmo run — prova que dupla representação funciona.
- **G4 do plano:** NFR perf 500ms passa em fixture sintético (~10 arquivos). Em monorepo real com 1000+ arquivos, o walk bounded ainda fica < 500ms (testado manualmente, não no E2E).
- **Local — fixture `multi-stack` tem 5 `.rb` vs 1 `.ts`:** Tiebreaker garante `primary=rails`. Se alguém alterar a fixture para inverter a maioria, esperar atualizar a asserção CA-07 também.
- **Local — `cloneFixture` usa `fs.cp` recursive (Node 16.7+):** Bun suporta `fs.cp` recursive a partir das versões recentes. Se falhar em CI antiga, fallback é loop manual (existem helpers no `init-tracer-bullet.test.ts`).
- **Local — `runInit` em teste invoca os helpers, não o slash command:** invocar SKILL.md de verdade em E2E exige executor de slash; pattern existente em `init-tracer-bullet.test.ts` é compor os helpers diretamente. Fase-05 segue o mesmo pattern.

---

## Verificacao

### TDD

- [ ] **RED:** Antes da implementação completa de fase-01..04, os novos `it()` blocks falham com assertion (não com import error)
  - Comando: `bun run test tests/e2e/stack-knowledge-tracer-bullet.test.ts`
  - Resultado esperado: cada novo `it` falha em uma asserção específica (ex: `Expected 'rails', received undefined`)

- [ ] **GREEN:** Após fase-01..04 entregues, toda a suite passa
  - Comando: `bun run test tests/e2e/stack-knowledge-tracer-bullet.test.ts`
  - Resultado esperado: todos passam, incluindo asserções de perf

### Checklist

- [ ] Fixtures `tests/fixtures/stack-knowledge/{node-ts-only,rails-only,multi-stack,no-anchor}/` criadas e committed
- [ ] CA-03 verificado: rails-only fixture → `stack.json.primary === 'rails'`, knowledge **não** copiado (ou copiado vazio)
- [ ] CA-06 verificado: no-anchor fixture → `stack.json.primary === null`, exit limpo, output literal
- [ ] CA-07 verificado: multi-stack fixture → `primary === 'rails'`, `secondary === ['nodejs-typescript']`
- [ ] CA-10 verificado: STATE.md contém `detected_stack: node-ts` (StackId), stack.json contém `primary: nodejs-typescript` (matrix folder)
- [ ] NFR perf: `detectMultiStack` < 500ms; `copyKnowledge` (1 átomo piloto) < 100ms
- [ ] Suite total verde: `bun run test`
- [ ] Lint limpo: `bun run lint`
- [ ] `bun run typecheck` verde (se configurado no harness)

---

## Criterio de Aceite

**Por maquina:**
- `bun run test tests/e2e/stack-knowledge-tracer-bullet.test.ts` retorna `0 failed`
- Em ambiente local típico (Windows 11 + Bun), todos os asserts de perf passam consistentemente em 3 runs consecutivos (sem flakiness)
- `git diff skills/init/lib/state-md-init.ts` continua vazio ao fim do plano

**Por humano:**
- Output do `/init` em cada fixture é legível e segue o padrão de mensagens definido na fase-03 (CA-04 literal, mensagens claras para CA-06).

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
