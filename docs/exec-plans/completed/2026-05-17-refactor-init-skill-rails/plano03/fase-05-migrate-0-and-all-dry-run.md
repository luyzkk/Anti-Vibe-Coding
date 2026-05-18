<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 05: Portar Step migrate.0 (parse --dry-run) + Step migrate.all (orchestrate dry-run)

**Plano:** 03 — Gates de abortagem + steps interativos
**Sizing:** 2h
**Depende de:** fase-02 (migrate.1 no registry — ordem)
**Visual:** false

---

## O que esta fase entrega

DOIS step modules: `09-migrate-0-parse-dry-run.ts` (parse de `--dry-run` + log "Dry-run
mode:") e `09_1-migrate-all-orchestrate.ts` (chama `orchestrateMigration` + emite report
via `renderDryRunReport`, e quando dry-run usa `skipRemaining: true` para curtocircuitar
migrate.1/2/3/4). Insercao no registry nos indices 2-3 (apos `reuseDiscovery`, antes de
`migrate-1-backup` — G4 do plano). Validacao explicita do contrato controverso em DI-5-1.
`SKILL.md` permanece intocado.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/09-migrate-0-parse-dry-run.ts` | Create | Step que detecta `--dry-run` e emite log preview |
| `skills/init/lib/steps/09_1-migrate-all-orchestrate.ts` | Create | Step que chama `orchestrateMigration` em dry-run e sai com `skipRemaining: true` |
| `skills/init/lib/registry.ts` | Modify | Inserir `migrate0ParseDryRunStep` e `migrateAllOrchestrateStep` entre reuseDiscovery e migrate1 |
| `skills/init/lib/steps/09-migrate-0-parse-dry-run.test.ts` | Create | 2 cenarios: no-flag (no-op), --dry-run (log) |
| `skills/init/lib/steps/09_1-migrate-all-orchestrate.test.ts` | Create | 3 cenarios: no-dry-run (no-op), --dry-run (skipRemaining + report), no-legacy (gracefully) |
| `skills/init/lib/steps/__fixtures__/migrate-all-dry-run-legacy/.planning/plan.md` | Create | Fixture legacy v5 para dry-run gerar report |
| `skills/init/lib/steps/__golden__/migrate-0-dry-run.txt` | Create | stdout esperado: 1 linha |
| `skills/init/lib/steps/__golden__/migrate-all-dry-run.txt` | Create | stdout esperado: report + "Re-run without --dry-run to apply." |

---

## Implementacao

### Passo 1: Decisao critica sobre migrate.all (DI-5-1)

SKILL.md linhas 57-79 sao ambiguas. O bloco diz:

```javascript
const isDryRun = (typeof ARGUMENTS === 'string') && ARGUMENTS.includes('--dry-run')
const report = await orchestrateMigration(process.cwd(), { dryRun: isDryRun })
console.log(renderDryRunReport(report))
if (isDryRun) {
  console.log('\nRe-run without --dry-run to apply.')
  process.exit(0)
}
```

Leitura literal: SE dry-run, roda orchestrator com dryRun=true (no writes), emite report,
e SAI com exit 0. SE NAO dry-run, roda orchestrator com dryRun=false (full mutation),
emite report, e CONTINUA o fluxo do init (incluindo migrate.1/2/3/4 individualmente
DEPOIS — duplicacao?).

A duplicacao indica que a INTENCAO original era: migrate.all eh um ATALHO so para dry-run.
Em real mode, os steps individuais migrate.1/2/3/4 sao quem mutam. Esta interpretacao
casa com o titulo da secao (SKILL.md linha 57): "replaces migrate.1 / migrate.2 / migrate.3
/ migrate.4 (Plano 03 fase-06 — CA-10, R14)" — "replaces" significa "no lugar de" SO em
dry-run (preview total via orchestrator), nao em real mode.

**DI-5-1 (decisao desta fase):** `migrate-all-orchestrate` SOMENTE roda em dry-run. Em
real mode eh NO-OP (retorna `{ mutated: false, summary: '' }`). Em dry-run, chama
`orchestrateMigration(cwd, { dryRun: true })`, emite `renderDryRunReport(report)` no
summary, anexa `'\nRe-run without --dry-run to apply.'`, e retorna `skipRemaining: true`
(mapeia o `process.exit(0)` do SKILL.md linha 74 — pattern do Plano 02 fase-06 com
`reuseDiscoveryStep`).

> **Flag para revisao do dev:** se a leitura estiver errada (i.e., migrate.all DEVE rodar
> em real mode tambem como uma forma "atomica" alternativa aos steps individuais),
> reverter para um modelo "exclusivo": em real mode, migrate.all roda e retorna
> skipRemaining, MAS migrate.1/2/3/4 nao precisam ser disabilitados porque tambem tem
> `isMigrateMode` guard + idempotencia. Pedir confirmacao antes de fechar a fase.

### Passo 2: Confirmar signatures (G2)

```typescript
// skills/init/lib/migrate-orchestrator.ts (preservado)
export type MigrationDryRunReport = { dryRun, state, backup, planning, lessons, decisions, recordedWrites, totalBytes }
export async function orchestrateMigration(targetDir: string, options?: { dryRun?: boolean }): Promise<MigrationDryRunReport>

// skills/init/lib/dry-run-renderer.ts (preservado)
export function renderDryRunReport(report: MigrationDryRunReport): string
```

> **Local — verified signature:** `orchestrateMigration` aceita `{ dryRun: true }`,
> cria backup STAGING (read-only para helpers), e em dry-run limpa o staging no fim. NAO
> deixa side-effect persistente (CA-03). `renderDryRunReport` retorna string MULTI-LINHA
> ja formatada. Step apenas concatena `'\nRe-run...'` ao fim.

### Passo 3: Criar `09-migrate-0-parse-dry-run.ts`

```typescript
// skills/init/lib/steps/09-migrate-0-parse-dry-run.ts
import type { Step } from './types'

// 2026-05-17 (Luiz/dev): DI-1 herdado de fase-02.
function isMigrateMode(args: readonly string[]): boolean {
  return args[0] === 'migrate'
}

export const migrate0ParseDryRunStep: Step = {
  id: 'migrate-0-parse-dry-run',
  async run(ctx) {
    if (!isMigrateMode(ctx.args)) {
      return { mutated: false, summary: '' }
    }

    const dryRun = ctx.flags['dry-run'] === true

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 50 (PRD R1, G1).
    // SKILL.md so emite a linha QUANDO dryRun=true. Sem flag, no-op silencioso.
    if (!dryRun) {
      return { mutated: false, summary: '' }
    }
    return { mutated: false, summary: 'Dry-run mode: no files will be modified.' }
  },
}
```

### Passo 4: Criar `09_1-migrate-all-orchestrate.ts`

```typescript
// skills/init/lib/steps/09_1-migrate-all-orchestrate.ts
import { orchestrateMigration } from '../migrate-orchestrator'
import { renderDryRunReport } from '../dry-run-renderer'
import type { Step } from './types'

// 2026-05-17 (Luiz/dev): DI-1 herdado de fase-02.
function isMigrateMode(args: readonly string[]): boolean {
  return args[0] === 'migrate'
}

export const migrateAllOrchestrateStep: Step = {
  id: 'migrate-all',
  async run(ctx) {
    if (!isMigrateMode(ctx.args)) {
      return { mutated: false, summary: '' }
    }

    const dryRun = ctx.flags['dry-run'] === true

    // 2026-05-17 (Luiz/dev): DI-5-1 desta fase — migrate.all SOMENTE roda em dry-run.
    // Em real mode eh NO-OP (migrate.1/2/3/4 individuais fazem o trabalho).
    // PRD CA-03, CA-10. SKILL.md linhas 57-75 (leitura literal: process.exit(0) em dry-run apenas).
    if (!dryRun) {
      return { mutated: false, summary: '' }
    }

    const report = await orchestrateMigration(ctx.cwd, { dryRun: true })
    const reportText = renderDryRunReport(report)

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 73 (PRD R1, G1).
    // O '\n' inicial da string original eh preservado.
    const summary = reportText + '\n\nRe-run without --dry-run to apply.'

    // 2026-05-17 (Luiz/dev): skipRemaining=true mapeia process.exit(0) do SKILL.md linha 74.
    // Pattern alinhado com reuseDiscoveryStep (Plano 02 fase-06). PRD MH-04, G6 do plano.
    return {
      mutated: false,
      summary,
      skipRemaining: true,
    }
  },
}
```

> **Coordenacao com Plano 02 fase-06:** o campo `skipRemaining` ja existe no `StepReport`.
> Se este step rodar com `--dry-run`, o dispatcher faz `break` apos emitir o summary —
> migrate.1/2/3/4 NAO rodam (preservado o comportamento de "preview without mutation",
> CA-03).

### Passo 5: Atualizar `registry.ts`

```typescript
// skills/init/lib/registry.ts (snippet)
import { migrate0ParseDryRunStep } from './steps/09-migrate-0-parse-dry-run'
import { migrateAllOrchestrateStep } from './steps/09_1-migrate-all-orchestrate'

// 2026-05-17 (Luiz/dev): G4 do plano — apos reuseDiscovery, antes de migrate1.
// Ordem alvo: detectLegacy, reuseDiscovery, migrate0, migrateAll, migrate1, migrate2, ...
export const registry: readonly Step[] = [
  detectLegacyStep,
  reuseDiscoveryStep,
  migrate0ParseDryRunStep,        // <-- novo
  migrateAllOrchestrateStep,       // <-- novo (skipRemaining quando --dry-run)
  migrate1BackupStep,
  migrate2PlanningStep,
  migrate3LessonsStep,
  migrate4DecisionsStep,
  scaffoldFullTreeStep,
  // ...resto preservado
]
```

> **NOTA:** com `migrate-all` setando `skipRemaining: true` em dry-run, os steps subsequentes
> (incluindo migrate.1/2/3/4 e scaffoldFullTreeStep etc) NAO rodam — preview-only mode.
> Em real mode, `migrate-all` eh no-op silencioso e o flow continua normal para os 4
> steps individuais.

### Passo 6: Testes (`09-migrate-0-parse-dry-run.test.ts`)

```typescript
// skills/init/lib/steps/09-migrate-0-parse-dry-run.test.ts
import { describe, test, expect } from 'bun:test'
import { migrate0ParseDryRunStep } from './09-migrate-0-parse-dry-run'

const ctx = (args: readonly string[], flags: Readonly<Record<string, boolean | string>>) => ({
  cwd: '/tmp', args, flags,
})

describe('migrate0ParseDryRunStep', () => {
  test('no migrate mode: no-op', async () => {
    const r = await migrate0ParseDryRunStep.run(ctx([], {}))
    expect(r).toEqual({ mutated: false, summary: '' })
  })

  test('migrate mode without --dry-run: no-op silencioso', async () => {
    const r = await migrate0ParseDryRunStep.run(ctx(['migrate'], {}))
    expect(r).toEqual({ mutated: false, summary: '' })
  })

  test('migrate mode with --dry-run: emite log byte-identico', async () => {
    const r = await migrate0ParseDryRunStep.run(ctx(['migrate'], { 'dry-run': true }))
    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 50 (PRD R1, G1).
    expect(r.summary).toBe('Dry-run mode: no files will be modified.')
    expect(r.mutated).toBe(false)
  })
})
```

### Passo 7: Testes (`09_1-migrate-all-orchestrate.test.ts`)

```typescript
// skills/init/lib/steps/09_1-migrate-all-orchestrate.test.ts
import { describe, test, expect, afterEach } from 'bun:test'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { migrateAllOrchestrateStep } from './09_1-migrate-all-orchestrate'

const ctxFn = (cwd: string, args: readonly string[], flags: Readonly<Record<string, boolean | string>> = {}) => ({
  cwd, args, flags,
})

describe('migrateAllOrchestrateStep', () => {
  let tmpDir: string
  afterEach(async () => { if (tmpDir) await rm(tmpDir, { recursive: true, force: true }) })

  test('no migrate mode: no-op', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'mAll-noop-'))
    const r = await migrateAllOrchestrateStep.run(ctxFn(tmpDir, []))
    expect(r).toEqual({ mutated: false, summary: '' })
  })

  test('migrate mode without --dry-run: NO-OP (DI-5-1 desta fase)', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'mAll-real-'))
    await mkdir(path.join(tmpDir, '.planning'), { recursive: true })
    await writeFile(path.join(tmpDir, '.planning', 'plan.md'), '# Plan\n')

    const r = await migrateAllOrchestrateStep.run(ctxFn(tmpDir, ['migrate']))
    // 2026-05-17 (Luiz/dev): DI-5-1 — migrate.all eh no-op em real mode (migrate.1/2/3/4 fazem o trabalho).
    expect(r).toEqual({ mutated: false, summary: '' })
    // 2026-05-17 (Luiz/dev): zero side-effect — backup NAO criado pelo migrate-all em real mode.
    expect(existsSync(path.join(tmpDir, '.planning.v5-backup'))).toBe(false)
  })

  test('migrate mode + --dry-run: skipRemaining=true, summary contem report + "Re-run..." e ZERO mutacao', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'mAll-dryrun-'))
    await mkdir(path.join(tmpDir, '.planning'), { recursive: true })
    await writeFile(path.join(tmpDir, '.planning', 'plan.md'), '# Plan\n')

    const r = await migrateAllOrchestrateStep.run(ctxFn(tmpDir, ['migrate'], { 'dry-run': true }))

    expect(r.skipRemaining).toBe(true)
    expect(r.mutated).toBe(false)
    // 2026-05-17 (Luiz/dev): PRD CA-03 — dry-run zero side-effects.
    expect(existsSync(path.join(tmpDir, 'docs'))).toBe(false)
    expect(existsSync(path.join(tmpDir, '.planning.v5-backup'))).toBe(false)

    // 2026-05-17 (Luiz/dev): summary contem o report renderizado + sufixo byte-identico.
    expect(r.summary).toContain('--- Migration Dry Run ---')
    expect(r.summary.endsWith('\n\nRe-run without --dry-run to apply.')).toBe(true)
  })

  test('migrate mode + --dry-run em greenfield (sem .planning/): orchestrator nao quebra', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'mAll-green-'))
    // 2026-05-17 (Luiz/dev): sem .planning/, state.isLegacy=false.
    // orchestrateMigration deve retornar report com isLegacy=false e sem mutacao.
    const r = await migrateAllOrchestrateStep.run(ctxFn(tmpDir, ['migrate'], { 'dry-run': true }))
    expect(r.skipRemaining).toBe(true)
    expect(r.summary).toContain('Detected v5.x: no')
  })
})
```

### Passo 8: Paranoia grep contra SKILL.md (G1)

```bash
# 2026-05-17 (Luiz/dev): G1 do plano — 3 strings DEVEM existir no SKILL.md atual.
grep -F 'Dry-run mode: no files will be modified.' skills/init/SKILL.md
grep -F 'Re-run without --dry-run to apply.' skills/init/SKILL.md
grep -F 'renderDryRunReport(report)' skills/init/SKILL.md
```

Todos exit 0.

---

## Gotchas

- **G1 do plano (wording byte-identico):** strings precisam casar com SKILL.md
  linhas 50, 70, 73. Atencao: `console.log('\nRe-run without --dry-run to apply.')`
  emite `\n` LITERAL (newline) antes de "Re-run". Nosso step constroi
  `reportText + '\n\nRe-run...'` — 2 newlines (uma do report acabar + uma deliberada).
  Conferir contra o stdout real do SKILL.md.
- **G2 do plano (helpers preservados):** `orchestrateMigration` e `renderDryRunReport`
  NAO modificados.
- **G3 do plano (imports estaticos):** imports estaticos.
- **G5 do plano (sem AbortError):** estes steps NAO arremessam — migrate-all faz preview,
  migrate-0 so loga.
- **G6 do plano (skipRemaining):** Plano 02 fase-06 ja introduziu este campo. Reuso
  aqui em dry-run preview mode.
- **G8 do plano / DI-5-1 desta fase:** migrate.all so age em dry-run. Em real mode eh
  no-op. Documentado em ponto explicito para revisao do dev. Se interpretacao errada,
  alternative behavior: migrate.all roda SEMPRE com `dryRun: !ctx.flags['dry-run']`,
  setando skipRemaining em ambos os casos — mas isso quebra a redundancia com
  migrate.1/2/3/4 individuais.
- **Local — verified signature `orchestrateMigration`:** retorna `MigrationDryRunReport`
  com campo `dryRun: boolean` indicando se foi dry-run. Em dry-run cria backup STAGING
  e o LIMPA no fim — sem side-effect persistente.
- **Local — `renderDryRunReport` retorna string multi-linha:** comeca com `'--- Migration Dry Run ---'`
  na primeira linha. Boa para `expect(r.summary).toContain('--- Migration Dry Run ---')`.
- **Local — fixture greenfield (sem .planning/):** orchestrator nao crasha — state.isLegacy
  vira false, backup vira no-op, e renderer emite `'Detected v5.x: no'`. Teste cobre.
- **Local — IMPORTANTE: `--dry-run` so age em migrate mode (`args[0] === 'migrate'`):**
  se o usuario rodar `/init --dry-run` (sem `migrate`), o flag eh capturado pelo parser
  mas migrate.0/all sao no-op. Consistente com SKILL.md (que so checa `--dry-run` em
  migrate steps).

---

## Verificacao

### TDD

- [ ] **RED:** Testes escritos antes dos steps. Falham por modulo nao encontrado.
  - Comandos: `bun run test skills/init/lib/steps/09-*.test.ts` e `bun run test skills/init/lib/steps/09_1-*.test.ts`

- [ ] **GREEN:** Steps + registry. Testes passam.
  - Comando: `bun run test skills/init/lib/steps/`
  - Resultado esperado: 7 testes desta fase (3 + 4) + acumulados anteriores passam.

### Checklist

- [ ] `skills/init/lib/steps/09-migrate-0-parse-dry-run.ts` criado, exporta `migrate0ParseDryRunStep`
- [ ] `skills/init/lib/steps/09_1-migrate-all-orchestrate.ts` criado, exporta `migrateAllOrchestrateStep`
- [ ] `skills/init/lib/registry.ts` atualizado com AMBOS entre reuseDiscovery e migrate1
- [ ] 1 fixture criada (`migrate-all-dry-run-legacy/`)
- [ ] 2 goldens criados em `__golden__/migrate-{0-dry-run,all-dry-run}.txt`
- [ ] 7 testes passam (3 do migrate.0 + 4 do migrate.all)
- [ ] `skills/init/SKILL.md` NAO modificado
- [ ] Helpers NAO modificados: `git diff skills/init/lib/migrate-orchestrator.ts skills/init/lib/dry-run-renderer.ts` vazio
- [ ] Paranoia grep (3 strings) retorna exit 0
- [ ] Lint limpo
- [ ] Steps nao usam `await import` nem `bun -e`
- [ ] Zero `any`/`as`
- [ ] DI-5-1 documentado em codigo (comment provenance) e neste fase file

---

## Criterio de Aceite

Steps `migrate-0-parse-dry-run` e `migrate-all` portados, registrados, validados por 7
cenarios. Em dry-run, `migrate-all` retorna `skipRemaining: true` e o dispatcher
interrompe ANTES de scaffoldFullTree/etc — preservando CA-03 (zero side-effect).
Wording byte-identico das 2 strings de log. `SKILL.md` intocado.

**Por maquina:**
- `bun run test skills/init/lib/steps/09-migrate-0-parse-dry-run.test.ts` exit 0 com 3 testes
- `bun run test skills/init/lib/steps/09_1-migrate-all-orchestrate.test.ts` exit 0 com 4 testes
- `bun run test skills/init/lib/steps/` exit 0 (regression)
- `git diff --stat skills/init/SKILL.md skills/init/lib/migrate-orchestrator.ts skills/init/lib/dry-run-renderer.ts` retorna 0 arquivos
- `grep -c 'skipRemaining' skills/init/lib/steps/09_1-migrate-all-orchestrate.ts` retorna >= 1
- `grep -E 'throw new AbortError' skills/init/lib/steps/09*.ts` retorna 0 matches

**Por humano:**
- Inspecao visual dos 2 goldens: linha do migrate-0 termina com ponto final, linha
  final do migrate-all eh exatamente `'Re-run without --dry-run to apply.'` precedida
  por linha em branco (`'\n\n'` no source).
- Validar DI-5-1: rodar manualmente `/init migrate` (sem --dry-run) e confirmar que
  `migrate-all` nao loga nada e os migrate.1/2/3/4 individuais sao quem mutam.

---

<!-- Gerado por /plan-feature em 2026-05-17 -->
