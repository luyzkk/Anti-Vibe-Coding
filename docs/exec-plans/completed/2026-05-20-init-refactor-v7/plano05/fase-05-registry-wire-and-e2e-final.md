<!--
Princípio universal #5 — Comment Provenance.
-->

# Fase 05: Registry wire + E2E final (CA-01..CA-09)

**Plano:** 05 — Steps 8-10 + harness-validate + E2E final
**Sizing:** 1.5h
**Depende de:** fase-01 (Step 8 real), fase-02 (Step 9 real), fase-03 (Step 10 real), fase-04 (harness atualizado).
**Visual:** false

---

## O que esta fase entrega

`skills/init/lib/registry.ts` com 3 imports trocados (stubs → reais — Steps 8, 9, 10) + suite e2e final consolidada em `tests/e2e/init-v7-final-acceptance.test.ts` cobrindo os 9 CAs do PRD. Grep-gate `bun run test:grep-deleted-steps` em `package.json` (CA-09 regressao). Delete dos 3 steps antigos fonte de porting (`14-delivery-loop.ts`, `03_1-persist-stack-and-knowledge.ts`, `90-final-validation.ts`) em commit separado pos-verde. Lint + test + harness:validate verdes.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/registry.ts` | Modify | 3 imports trocados: stub `08-delivery-loop` → real, idem para `09-copy-knowledge` e `10-final-validation`. |
| `tests/e2e/init-v7-final-acceptance.test.ts` | Create | E2E unico cobrindo CA-01..CA-09 em 9 testes nomeados. Reusa fixtures dos Planos 02-04 via helpers. |
| `tests/e2e/__fixtures__/v7-with-claude-md/` | Create se nao existir | Fixture greenfield com `.claude/CLAUDE.md` preexistente com conteudo customizado. Para CA-02 byte-identico. |
| `package.json` | Modify | Adicionar script `"test:grep-deleted-steps"`: grep regex de IDs deletados em `skills/init/lib/`. |
| `skills/init/lib/steps/14-delivery-loop.ts` | Delete | Em commit separado pos-e2e verde. |
| `skills/init/lib/steps/03_1-persist-stack-and-knowledge.ts` | Delete | Em commit separado pos-e2e verde. |
| `skills/init/lib/steps/90-final-validation.ts` | Delete | Em commit separado pos-e2e verde. |
| `tests/e2e/ca13-dry-run-parity.test.ts` | Delete | `describe.skip` aplicado no Plano 01 fase-05; obsoleto (D4). Cleanup final. |

---

## Implementacao

### Passo 1: Verificar pre-condicoes (fases 1-4 verdes)

```bash
bun test skills/init/lib/steps/08-delivery-loop.test.ts
bun test skills/init/lib/steps/09-copy-knowledge.test.ts
bun test skills/init/lib/steps/10-final-validation.test.ts
bun test scripts/harness-validate.test.ts -t "RF-12"
# Todos 4 devem retornar passed.
```

Se algum esta vermelho, voltar para a fase correspondente.

### Passo 2: Trocar 3 imports no registry

```typescript
// skills/init/lib/registry.ts (snippet do diff)
// 2026-05-21 (Luiz/dev): Plano 05 fase-05 — wire Steps 8-10 reais.

// ANTES (stubs do Plano 01 fase-04):
// import { deliveryLoopStep } from './steps/08-delivery-loop' // stub
// import { copyKnowledgeStep } from './steps/09-copy-knowledge' // stub
// import { finalValidationStep } from './steps/10-final-validation' // stub

// DEPOIS (reais — assinatura e nome identico, apenas a implementacao mudou):
import { deliveryLoopStep } from './steps/08-delivery-loop'
import { copyKnowledgeStep } from './steps/09-copy-knowledge'
import { finalValidationStep } from './steps/10-final-validation'

// O array do registry permanece IDENTICO — apenas os imports apontam para implementacao real agora.
export const initStepRegistry = [
  reentryGateStep,
  detectLegacyAndStackStep,
  secretsScanStep,
  migratePlanningAndManifestStep,
  scaffoldAndLinkStep,
  installGhFilesStep,
  generatePopulatePlansStep,
  deliveryLoopStep, // ← real (Plano 05 fase-01)
  copyKnowledgeStep, // ← real (Plano 05 fase-02)
  finalValidationStep, // ← real (Plano 05 fase-03)
] as const
```

**Nota:** se os stubs ja tinham mesmo nome de export, a "troca" eh apenas semantica — o registry continua importando do mesmo path. O que muda eh o conteudo dos arquivos `08-*.ts`, `09-*.ts`, `10-*.ts`. Se Plano 01 fase-04 usou nomes diferentes (ex: `deliveryLoopStepStub`), trocar para o nome final aqui.

### Passo 3: Criar fixture `v7-with-claude-md/` (se nao existir)

```bash
# Verificar
ls tests/e2e/__fixtures__/v7-with-claude-md/ 2>/dev/null || echo "MISSING"

# Se MISSING, criar:
mkdir -p tests/e2e/__fixtures__/v7-with-claude-md
cat > tests/e2e/__fixtures__/v7-with-claude-md/package.json <<'EOF'
{ "name": "v7-fix-with-claude-md", "version": "0.0.0", "private": true }
EOF
mkdir -p tests/e2e/__fixtures__/v7-with-claude-md/.claude
cat > tests/e2e/__fixtures__/v7-with-claude-md/.claude/CLAUDE.md <<'EOF'
# CLAUDE.md (custom)

Este arquivo eh pre-existente e NUNCA deve ser sobrescrito (CA-02, D16 do PRD).

## Custom section

Conteudo intencional do usuario.
EOF
touch tests/e2e/__fixtures__/v7-with-claude-md/.gitkeep
```

### Passo 4: Escrever e2e final cobrindo CA-01..CA-09

```typescript
// tests/e2e/init-v7-final-acceptance.test.ts
// 2026-05-21 (Luiz/dev): Plano 05 fase-05 — contrato vivo dos CAs do PRD init-refactor-v7.

import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { copyFixtureToTmp } from './__fixtures__/v7-populate-helpers'
import { runInit } from '../../skills/init/lib/run-init'
import { AbortError } from '../../skills/init/lib/steps/abort-error'

describe('e2e: init v7 — acceptance criteria suite (PRD CA-01..CA-09)', () => {
  let cwd: string
  afterEach(async () => {
    if (cwd) await fs.rm(cwd, { recursive: true, force: true })
  })

  test('CA-01: greenfield Node-TS init creates 16 PLAN.md + 36 placeholders + 2 .github files', async () => {
    cwd = await copyFixtureToTmp('v7-populate-node')
    await runInit([], { cwd })

    // 16 PLAN.md em docs/exec-plans/active/{date}-populate-*/
    const activeDir = path.join(cwd, 'docs/exec-plans/active')
    const populateDirs = (await fs.readdir(activeDir)).filter((e) => e.includes('-populate-'))
    expect(populateDirs.length).toBe(16)

    // 4 docs extras AVC presentes (RF-12)
    for (const doc of ['docs/MERGE_GATES.md', 'docs/CODE_STYLE.md', 'docs/STATE.md', '.claude/CLAUDE.md']) {
      const stat = await fs.stat(path.join(cwd, doc))
      expect(stat.isFile(), `${doc} should exist`).toBe(true)
    }

    // 2 .github files
    for (const gh of ['.github/workflows/harness.yml', '.github/pull_request_template.md']) {
      const stat = await fs.stat(path.join(cwd, gh))
      expect(stat.isFile(), `${gh} should exist`).toBe(true)
    }
  })

  test('CA-02: pre-existing .claude/CLAUDE.md is byte-identical after init (NEVER overwritten)', async () => {
    cwd = await copyFixtureToTmp('v7-with-claude-md')
    const before = await fs.readFile(path.join(cwd, '.claude/CLAUDE.md'), 'utf8')
    await runInit([], { cwd })
    const after = await fs.readFile(path.join(cwd, '.claude/CLAUDE.md'), 'utf8')
    expect(after).toBe(before)
  })

  test('CA-03: planning migrated to .claude/legacy-manifest.json with entries', async () => {
    // 2026-05-21 (Luiz/dev): reusa fixture com .planning/ legacy do Plano 02.
    cwd = await copyFixtureToTmp('v7-with-legacy')
    await runInit([], { cwd })

    const manifestPath = path.join(cwd, '.claude/legacy-manifest.json')
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
    expect(Array.isArray(manifest.legacy)).toBe(true)
    expect(manifest.legacy.length).toBeGreaterThan(0)
  })

  test('CA-04: Rails greenfield → FRONTEND plan contains app/views and app/assets', async () => {
    cwd = await copyFixtureToTmp('v7-populate-rails')
    await runInit([], { cwd })

    const activeDir = path.join(cwd, 'docs/exec-plans/active')
    const frontendDir = (await fs.readdir(activeDir)).find((d) =>
      d.endsWith('populate-docs-frontend-md'),
    )
    expect(frontendDir).toBeDefined()
    const content = await fs.readFile(path.join(activeDir, frontendDir!, 'PLAN.md'), 'utf8')
    expect(content).toContain('app/views')
    expect(content).toContain('app/assets')
    expect(content).not.toContain('src/components')
  })

  test('CA-05: greenfield without legacy → manifest.legacy is empty array', async () => {
    cwd = await copyFixtureToTmp('v7-populate-node')
    await runInit([], { cwd })

    const manifestPath = path.join(cwd, '.claude/legacy-manifest.json')
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
    expect(manifest.legacy).toEqual([])
  })

  test('CA-06: delivery-loop asks BEFORE modifying AGENTS.md (interactive contract)', async () => {
    cwd = await copyFixtureToTmp('v7-populate-node')

    // 2026-05-21 (Luiz/dev): inject askUser stub que captura prompt + retorna 'N' (default).
    let agentsMdAtAskTime: string | null = null
    const askUser = async (prompt: string): Promise<string> => {
      // CA-06: AGENTS.md ja existe (Step 5 escreveu) mas SEM secao Delivery Loop ainda.
      agentsMdAtAskTime = await fs.readFile(path.join(cwd, 'AGENTS.md'), 'utf8')
      return 'N'
    }

    await runInit([], { cwd, askUser })

    expect(agentsMdAtAskTime).not.toBeNull()
    expect(agentsMdAtAskTime).not.toContain('## Delivery Loop')
    // Apos init (answer='N'), AGENTS.md continua sem Delivery Loop
    const after = await fs.readFile(path.join(cwd, 'AGENTS.md'), 'utf8')
    expect(after).not.toContain('## Delivery Loop')
  })

  test('CA-07: every generated PLAN.md has exactly 10 H2 sections in canonical order', async () => {
    cwd = await copyFixtureToTmp('v7-populate-node')
    await runInit([], { cwd })

    const EXPECTED = [
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
    const activeDir = path.join(cwd, 'docs/exec-plans/active')
    const dirs = (await fs.readdir(activeDir)).filter((e) => e.includes('-populate-'))
    for (const dir of dirs) {
      const content = await fs.readFile(path.join(activeDir, dir, 'PLAN.md'), 'utf8')
      const sections = content.split('\n').filter((l) => l.startsWith('## '))
      expect(sections, `Plan ${dir} sections`).toEqual(EXPECTED)
    }
  })

  test('CA-08: re-run is blocked by reentry-gate (DR-1)', async () => {
    cwd = await copyFixtureToTmp('v7-populate-node')
    await runInit([], { cwd })

    // 2026-05-21 (Luiz/dev): re-run completo deve abortar via Step 1 reentry-gate.
    let caught: unknown = null
    try {
      await runInit([], { cwd })
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(AbortError)
    // Code do reentry-gate eh 10 (Plano 01 fase-03).
    expect((caught as AbortError).code).toBe(10)
  })

  test('CA-09: zero refs to deleted v6.7 step names in skills/init/lib/', async () => {
    // 2026-05-21 (Luiz/dev): este teste eh defesa em profundidade. O grep-gate npm script
    // tambem roda em CI separadamente. Aqui valida que pos-init nao ha rebase regression.
    const { $ } = await import('bun')
    // Lista de IDs/exports deletados pelo Plano 01 fase-05. Manter em sync com AUDIT.md.
    const DELETED_PATTERNS = [
      'scaffoldFullTreeStep',
      'secretsScan2Old',
      'discoverDocsStep',
      'classifyBlocksStep',
      'proposeMergeStep',
      'applyMergeDestructiveStep',
      'moveDocsStep',
      'detectDriftIncrementalStep',
      'persistStackKnowledgeStep', // antigo 03_1
      'deliveryLoopStep_v6', // se houver duplicacao
      // Adicionar conforme AUDIT.md.
    ]
    const result = await $`grep -rE "(${DELETED_PATTERNS.join('|')})" skills/init/lib/`.quiet().nothrow()
    // Exit 1 = nao encontrado (esperado). Exit 0 = encontrado (falha).
    expect(result.exitCode).not.toBe(0)
  })

  test('NFR Performance: init completes in < 30s on Node greenfield fixture', async () => {
    cwd = await copyFixtureToTmp('v7-populate-node')
    const start = performance.now()
    await runInit([], { cwd })
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(30_000)
  })
})
```

### Passo 5: Adicionar grep-gate em `package.json`

```json
{
  "scripts": {
    "test:grep-deleted-steps": "bash -c 'grep -rE \"(scaffoldFullTreeStep|secretsScan2Old|discoverDocsStep|classifyBlocksStep|proposeMergeStep|applyMergeDestructiveStep|moveDocsStep|detectDriftIncrementalStep|persistStackKnowledgeStep)\" skills/init/lib/ && exit 1 || exit 0'"
  }
}
```

**Nota:** Windows nao tem `bash` por padrao — usar `cross-env`/`shx`/`bun` script alternativo. Bun pode rodar TS direto:

```json
{
  "scripts": {
    "test:grep-deleted-steps": "bun scripts/grep-deleted-steps.ts"
  }
}
```

Criar `scripts/grep-deleted-steps.ts` standalone (preferivel para Windows compat).

### Passo 6: Rodar e2e — esperado GREEN

```bash
bun test tests/e2e/init-v7-final-acceptance.test.ts
# Esperado: 10 passed (9 CAs + NFR perf)
```

Se algum falha, debugar por CA. Mais provavel: CA-06 (askUser injection — verificar contrato do `runInit`).

### Passo 7: Cleanup pos-verde (commit separado)

```bash
# 1. Verificar zero callers dos arquivos antigos
grep -r "from.*steps/14-delivery-loop\|from.*steps/03_1-persist-stack-and-knowledge\|from.*steps/90-final-validation" skills/ tests/
# Esperado: vazio (ou apenas auto-referencia dos arquivos antigos)

# 2. Deletar os 3 steps fonte do porting
git rm skills/init/lib/steps/14-delivery-loop.ts
git rm skills/init/lib/steps/14-delivery-loop.test.ts  # se existe
git rm skills/init/lib/steps/03_1-persist-stack-and-knowledge.ts
git rm skills/init/lib/steps/03_1-persist-stack-and-knowledge.test.ts  # se existe
git rm skills/init/lib/steps/90-final-validation.ts
git rm skills/init/lib/steps/90-final-validation.test.ts  # se existe

# 3. Deletar test obsoleto do D4
git rm tests/e2e/ca13-dry-run-parity.test.ts

# 4. Verificar lint + test
bun run test
bun run lint
bun run harness:validate

# 5. Commit cleanup
git commit -m "chore(init): delete v6.7 steps after v7 e2e green (Plano 05 fase-05)"
```

### Passo 8: VERIFY final

```bash
bun run test           # full suite verde
bun run lint           # zero erros
bun run harness:validate # 28 required files OK
bun test:grep-deleted-steps  # exit 0 (nenhum match)
```

---

## Gotchas

- **G10 do plano (reuso de fixtures):** verificar `ls tests/e2e/__fixtures__/` antes de criar `v7-with-claude-md/`. Plano 03 fase-03 PODE ter criado. Tambem `v7-with-legacy/` e do Plano 02 fase-04. Reusar via `copyFixtureToTmp(name)` ja implementado em Plano 04 fase-05 helper.
- **G11 do plano (grep-gate Windows):** `bash -c` nao roda em PowerShell. Usar `bun scripts/grep-deleted-steps.ts` (script TS standalone). Plus: o script TS pode emitir output melhor (lista quais arquivos casaram).
- **G12 do plano (perf <30s):** se CI ficar perto do limite, raise para 45s e abrir issue de perf separada. NAO ajustar o PRD silenciosamente.
- **G13 do plano (libs orfas — `snippet-resolver.ts`, `backup-anti-vibe.ts`):** NAO deletar nesta fase. Issue futura. Documentar no MEMORY do Plano 05.
- **G14 do plano (delete dos 3 steps antigos):** ordem importa — primeiro `bun run test` GREEN com os arquivos antigos ainda no disco (mas nao referenciados). DEPOIS deletar em commit separado. Se deletar antes, perde rede de seguranca de "se algo ainda importa o antigo, falha durante teste em vez de em runtime".
- **Local — CA-08 reentry-gate code:** Plano 01 fase-03 usa code=10 (anotado no MEMORY do Plano 01). Confirmar via `grep "code: 10\|code = 10" skills/init/lib/steps/01-reentry-gate.ts` antes de hardcodar no e2e. Se mudou para outro code, atualizar teste.
- **Local — CA-06 askUser injection:** o contrato de `runInit` precisa aceitar `askUser` no segundo argumento. Verificar `skills/init/lib/run-init.ts` — se nao aceita, este eh um pre-requisito que pode ter sido implementado em Plano 01 fase-04 ou ainda nao. Se nao implementado, CA-06 teste deve mockar via outro mecanismo (ex: env var ou pre-popular `ctx.flags['__interactiveAnswer']` ANTES de Step 8 rodar — improvavel mas possivel via mock do dispatcher).
- **Local — `tests/e2e/init-cutover-greenfield.test.ts` skips do Plano 01 fase-05:** 2 testes com `test.skip` apontando para "Plano 05 fase-04". Esta fase (05) NAO os recupera — sao do dry-run que foi removido (D4). Decisao DI no MEMORY: deletar esses 2 testes (manter os outros 2 ja verdes naquele arquivo). Tambem deletar `ca13-dry-run-parity.test.ts` inteiro.

---

## Verificacao

### TDD

- [ ] **RED:** Antes de trocar imports no registry, e2e final falha em CA-01 (16 plans? — sim, ja com Plano 04), CA-06 (delivery-loop ainda eh stub — pergunta nao acontece), CA-08 (gate ja funciona — Plano 01 fase-03), CA-09 (zero refs ok). Esperado 4-5 RED.
  - Comando: `bun test tests/e2e/init-v7-final-acceptance.test.ts`
  - Resultado esperado: 4-5 failed (Steps 8-10 stubs causam degradacao em validacoes especificas)

- [ ] **GREEN:** Apos imports reais, todos os 10 testes passam.
  - Comando: `bun test tests/e2e/init-v7-final-acceptance.test.ts`
  - Resultado esperado: `10 passed, 0 failed`

### Checklist

- [ ] `registry.ts` importa os 3 steps reais (08, 09, 10) — confirmado por diff
- [ ] `tests/e2e/init-v7-final-acceptance.test.ts` criado com 10 testes (9 CAs + NFR perf)
- [ ] Fixture `v7-with-claude-md/` existe (reuso ou criada)
- [ ] `package.json` tem script `test:grep-deleted-steps`
- [ ] `scripts/grep-deleted-steps.ts` criado (cross-platform compat)
- [ ] CA-09 grep-gate retorna exit 0 (zero matches)
- [ ] Init completa em <30s em fixture Node greenfield
- [ ] 3 steps antigos DELETADOS em commit separado pos-verde
- [ ] `tests/e2e/ca13-dry-run-parity.test.ts` DELETADO (obsoleto D4)
- [ ] 2 testes skipados em `init-cutover-greenfield.test.ts` deletados (DI no MEMORY)
- [ ] `bun run test` (suite completa) verde
- [ ] `bun run lint` limpo
- [ ] `bun run harness:validate` retorna `28 required files`
- [ ] PRD `status: approved` movido para `status: shipped` (Exit Criteria do PLAN.md) — NOTA: fora do escopo desta fase tecnica, sinalizado para `/iterate`

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/e2e/init-v7-final-acceptance.test.ts` retorna `10 passed, 0 failed`
- `bun run test:grep-deleted-steps` exit code 0
- `bun run harness:validate` exit code 0 + mensagem `28 required files`
- `bun run lint` exit code 0
- `bun run test` (suite completa) exit code 0
- Apos cleanup commit: `ls skills/init/lib/steps/14-delivery-loop.ts` retorna `No such file`
- Apos cleanup commit: `ls skills/init/lib/steps/03_1-persist-stack-and-knowledge.ts` retorna `No such file`
- Apos cleanup commit: `ls skills/init/lib/steps/90-final-validation.ts` retorna `No such file`

**Por humano:**
- Inspecao do diff de `registry.ts`: 3 linhas mudaram (imports), 0 linhas no array do registry. Apenas wiring.
- Inspecao visual do PLAN.md gerado em fixture Node: 10 secoes presentes, paths `src/components`, sem `{{VAR}}` literais.
- E2E roda em <60s total (10 testes, 5 fixtures, sem cache externo).

---

<!-- Gerado por /plan-feature em 2026-05-21 -->
