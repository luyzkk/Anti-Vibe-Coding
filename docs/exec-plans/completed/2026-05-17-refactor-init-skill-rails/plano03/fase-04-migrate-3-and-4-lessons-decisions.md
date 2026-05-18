<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 04: Portar Step migrate.3 + migrate.4 — lessons + decisions (best-effort, sem AbortError)

**Plano:** 03 — Gates de abortagem + steps interativos
**Sizing:** 1.5h
**Depende de:** fase-02 (migrate.1 no registry — preserva ordem)
**Visual:** false

---

## O que esta fase entrega

DOIS step modules portados em PARALELO (arquivos independentes, helpers desacoplados):

1. **`12-migrate-3-lessons.ts`** — porta Step migrate.3 (SKILL.md linhas 160-181). Envelopa
   `migrateLessons`, emite 1 linha de log canonica + 1 linha condicional quando o arquivo
   fonte nao existe. NUNCA lanca AbortError (best-effort, falhas viram skipped).

2. **`13-migrate-4-decisions.ts`** — porta Step migrate.4 (SKILL.md linhas 184-204). Envelopa
   `migrateDecisions`, emite 1 linha de log canonica + 1 linha condicional para core-beliefs.
   NUNCA lanca AbortError.

Ambos com guard `isMigrateMode` interno (DI-1 herdado). Insercao no registry em sequencia
apos `migrate-2-planning` (G4 do plano). `SKILL.md` permanece intocado.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/12-migrate-3-lessons.ts` | Create | Step envelopa `migrateLessons` |
| `skills/init/lib/steps/13-migrate-4-decisions.ts` | Create | Step envelopa `migrateDecisions` |
| `skills/init/lib/registry.ts` | Modify | Inserir `migrate3LessonsStep` + `migrate4DecisionsStep` apos `migrate2PlanningStep` |
| `skills/init/lib/steps/12-migrate-3-lessons.test.ts` | Create | 2 cenarios: source-missing (skipped), source-present (wrote N) |
| `skills/init/lib/steps/13-migrate-4-decisions.test.ts` | Create | 2 cenarios: no-core-beliefs, with-core-beliefs |
| `skills/init/lib/steps/__fixtures__/migrate-3-source-missing/.planning.v5-backup/.planning/.gitkeep` | Create | Backup sem `lessons-learned.md` |
| `skills/init/lib/steps/__fixtures__/migrate-3-source-present/.planning.v5-backup/.planning/lessons-learned.md` | Create | Backup com licoes |
| `skills/init/lib/steps/__fixtures__/migrate-4-no-core/.planning.v5-backup/.planning/decisions.md` | Create | Decisions sem senior-principles |
| `skills/init/lib/steps/__fixtures__/migrate-4-with-core/.planning.v5-backup/.planning/decisions.md` | Create | Decisions presentes |
| `skills/init/lib/steps/__fixtures__/migrate-4-with-core/.planning.v5-backup/.planning/senior-principles.md` | Create | Core-beliefs origem |
| `skills/init/lib/steps/__golden__/migrate-3-source-present.txt` | Create | stdout esperado: 1 linha |
| `skills/init/lib/steps/__golden__/migrate-3-source-missing.txt` | Create | stdout esperado: 2 linhas (linha 2 = nothing to migrate) |
| `skills/init/lib/steps/__golden__/migrate-4-no-core.txt` | Create | stdout esperado: 1 linha |
| `skills/init/lib/steps/__golden__/migrate-4-with-core.txt` | Create | stdout esperado: 2 linhas |

---

## Implementacao

### Passo 1: Confirmar signatures dos 2 helpers (G2 — preservados)

```typescript
// skills/init/lib/migrate-lessons.ts (preservado)
export type LessonsMigrationReport = {
  status: 'completed' | 'dry-run' | 'skipped'
  entries: number
  written: string[]
  skipped: Array<{ title: string; reason: string }>
}
export async function migrateLessons(targetDir: string, options?: MigrateLessonsOptions): Promise<LessonsMigrationReport>

// skills/init/lib/migrate-decisions.ts (preservado)
export type DecisionsMigrationReport = {
  status: 'completed' | 'dry-run' | 'skipped'
  entries: number
  written: string[]
  skipped: Array<{ title: string; reason: string }>
  coreBeliefs?: 'created' | 'skipped'
}
export async function migrateDecisions(targetDir: string, options?: MigrateDecisionsOptions): Promise<DecisionsMigrationReport>
```

> **Local — verified signature:** ambos retornam status `'skipped'` quando source ausente
> (SKILL.md linha 174 checa `report.status === 'skipped' && skipped.some(s => s.reason.includes('source-missing'))`).
> Importante: `LessonsMigrationReport.skipped[].reason` eh string contendo `'source-missing'`
> quando o arquivo nao existe. Verificar exatamente o predicado no helper antes de duplicar.

### Passo 2: Criar `12-migrate-3-lessons.ts`

```typescript
// skills/init/lib/steps/12-migrate-3-lessons.ts
import { migrateLessons } from '../migrate-lessons'
import type { Step } from './types'

// 2026-05-17 (Luiz/dev): DI-1 herdado de fase-02.
function isMigrateMode(args: readonly string[]): boolean {
  return args[0] === 'migrate'
}

export const migrate3LessonsStep: Step = {
  id: 'migrate-3-lessons',
  async run(ctx) {
    if (!isMigrateMode(ctx.args)) {
      return { mutated: false, summary: '' }
    }

    const dryRun = ctx.flags['dry-run'] === true
    const report = await migrateLessons(ctx.cwd, { dryRun })

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 172 (PRD R1, G1).
    // SKILL.md usa: console.log('Lessons:', report.status, '— wrote:', report.written.length, 'skipped:', report.skipped.length)
    // Node imprime args separadas por espaco. Resultado: 'Lessons: <status> — wrote: <N> skipped: <N>'
    const lines = [
      'Lessons: ' + report.status + ' — wrote: ' + report.written.length + ' skipped: ' + report.skipped.length,
    ]

    // 2026-05-17 (Luiz/dev): conditional line — wording byte-identico ao SKILL.md linha 175 (PRD R1, G1).
    if (report.status === 'skipped' && report.skipped.some((s) => s.reason.includes('source-missing'))) {
      lines.push('  (no lessons-learned.md in backup — nothing to migrate)')
    }

    return {
      mutated: report.status === 'completed' && report.written.length > 0,
      summary: lines.join('\n'),
    }
  },
}
```

### Passo 3: Criar `13-migrate-4-decisions.ts`

```typescript
// skills/init/lib/steps/13-migrate-4-decisions.ts
import { migrateDecisions } from '../migrate-decisions'
import type { Step } from './types'

// 2026-05-17 (Luiz/dev): DI-1 herdado de fase-02.
function isMigrateMode(args: readonly string[]): boolean {
  return args[0] === 'migrate'
}

export const migrate4DecisionsStep: Step = {
  id: 'migrate-4-decisions',
  async run(ctx) {
    if (!isMigrateMode(ctx.args)) {
      return { mutated: false, summary: '' }
    }

    const dryRun = ctx.flags['dry-run'] === true
    const report = await migrateDecisions(ctx.cwd, { dryRun })

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 196 (PRD R1, G1).
    // SKILL.md usa: console.log('Decisions:', report.status, '— wrote:', report.written.length)
    const lines = [
      'Decisions: ' + report.status + ' — wrote: ' + report.written.length,
    ]

    // 2026-05-17 (Luiz/dev): conditional line — wording byte-identico ao SKILL.md linha 198 (PRD R1, G1).
    if (report.coreBeliefs === 'created') {
      lines.push('  core-beliefs.md created from senior-principles.md')
    }

    return {
      mutated: (report.status === 'completed' && report.written.length > 0) || report.coreBeliefs === 'created',
      summary: lines.join('\n'),
    }
  },
}
```

### Passo 4: Atualizar `registry.ts`

```typescript
// skills/init/lib/registry.ts (snippet)
import { migrate3LessonsStep } from './steps/12-migrate-3-lessons'
import { migrate4DecisionsStep } from './steps/13-migrate-4-decisions'

// 2026-05-17 (Luiz/dev): G4 do plano — apos migrate2PlanningStep, antes de scaffoldFullTreeStep.
export const registry: readonly Step[] = [
  detectLegacyStep,
  reuseDiscoveryStep,
  // migrate-0/migrate-all (fase-05)
  migrate1BackupStep,
  migrate2PlanningStep,
  migrate3LessonsStep,       // <-- novo
  migrate4DecisionsStep,     // <-- novo
  scaffoldFullTreeStep,
  // ...resto preservado
]
```

### Passo 5: Fixtures

```
__fixtures__/
  migrate-3-source-missing/
    .planning.v5-backup/
      .planning/.gitkeep              (sem lessons-learned.md)
  migrate-3-source-present/
    .planning.v5-backup/
      .planning/
        lessons-learned.md            (## 2025-12-01: foo licao\n\n- a\n)
  migrate-4-no-core/
    .planning.v5-backup/
      .planning/
        decisions.md                  (## D1 - bar decisao\n\n- ...)
  migrate-4-with-core/
    .planning.v5-backup/
      .planning/
        decisions.md                  (## D1 - bar decisao\n\n- ...)
        senior-principles.md          (# Senior Principles\n\n1. test\n)
```

### Passo 6: Goldens

`__golden__/migrate-3-source-missing.txt`:
```
Lessons: skipped — wrote: 0 skipped: 1
  (no lessons-learned.md in backup — nothing to migrate)
```

`__golden__/migrate-3-source-present.txt`:
```
Lessons: completed — wrote: 1 skipped: 0
```

`__golden__/migrate-4-no-core.txt`:
```
Decisions: completed — wrote: 1
```

`__golden__/migrate-4-with-core.txt`:
```
Decisions: completed — wrote: 1
  core-beliefs.md created from senior-principles.md
```

### Passo 7: Testes (`12-migrate-3-lessons.test.ts`)

```typescript
// skills/init/lib/steps/12-migrate-3-lessons.test.ts
import { describe, test, expect, afterEach } from 'bun:test'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { migrate3LessonsStep } from './12-migrate-3-lessons'

const ctx = (cwd: string, args: readonly string[] = ['migrate']) => ({
  cwd, args, flags: {} as Readonly<Record<string, boolean | string>>,
})

describe('migrate3LessonsStep', () => {
  let tmpDir: string
  afterEach(async () => { if (tmpDir) await rm(tmpDir, { recursive: true, force: true }) })

  test('no migrate mode: no-op', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'm3-noop-'))
    const r = await migrate3LessonsStep.run(ctx(tmpDir, []))
    expect(r).toEqual({ mutated: false, summary: '' })
  })

  test('migrate mode, source missing: 2 linhas, segunda eh "nothing to migrate"', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'm3-miss-'))
    // 2026-05-17 (Luiz/dev): backup vazio (sem lessons-learned.md).
    await mkdir(path.join(tmpDir, '.planning.v5-backup', '.planning'), { recursive: true })

    const r = await migrate3LessonsStep.run(ctx(tmpDir))
    const lines = r.summary.split('\n')
    expect(lines).toHaveLength(2)
    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 172 (PRD R1, G1).
    expect(lines[0]).toMatch(/^Lessons: skipped — wrote: 0 skipped: \d+$/)
    expect(lines[1]).toBe('  (no lessons-learned.md in backup — nothing to migrate)')
    expect(r.mutated).toBe(false)
  })

  test('migrate mode, source present: 1 linha, wrote >= 1', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'm3-pres-'))
    await mkdir(path.join(tmpDir, '.planning.v5-backup', '.planning'), { recursive: true })
    await writeFile(
      path.join(tmpDir, '.planning.v5-backup', '.planning', 'lessons-learned.md'),
      '## 2025-12-01: foo licao\n\n- detalhe\n',
    )

    const r = await migrate3LessonsStep.run(ctx(tmpDir))
    const lines = r.summary.split('\n')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/^Lessons: completed — wrote: \d+ skipped: \d+$/)
    expect(r.mutated).toBe(true)
  })
})
```

### Passo 8: Testes (`13-migrate-4-decisions.test.ts`)

```typescript
// skills/init/lib/steps/13-migrate-4-decisions.test.ts
import { describe, test, expect, afterEach } from 'bun:test'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { migrate4DecisionsStep } from './13-migrate-4-decisions'

const ctx = (cwd: string, args: readonly string[] = ['migrate']) => ({
  cwd, args, flags: {} as Readonly<Record<string, boolean | string>>,
})

describe('migrate4DecisionsStep', () => {
  let tmpDir: string
  afterEach(async () => { if (tmpDir) await rm(tmpDir, { recursive: true, force: true }) })

  test('no migrate mode: no-op', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'm4-noop-'))
    const r = await migrate4DecisionsStep.run(ctx(tmpDir, []))
    expect(r).toEqual({ mutated: false, summary: '' })
  })

  test('migrate mode, decisions sem senior-principles: 1 linha', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'm4-nocore-'))
    await mkdir(path.join(tmpDir, '.planning.v5-backup', '.planning'), { recursive: true })
    await writeFile(
      path.join(tmpDir, '.planning.v5-backup', '.planning', 'decisions.md'),
      '## D1 - bar decisao\n\n- detalhe\n',
    )

    const r = await migrate4DecisionsStep.run(ctx(tmpDir))
    const lines = r.summary.split('\n')
    expect(lines).toHaveLength(1)
    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 196 (PRD R1, G1).
    expect(lines[0]).toMatch(/^Decisions: completed — wrote: \d+$/)
  })

  test('migrate mode, decisions + senior-principles: 2 linhas (core-beliefs created)', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'm4-core-'))
    await mkdir(path.join(tmpDir, '.planning.v5-backup', '.planning'), { recursive: true })
    await writeFile(
      path.join(tmpDir, '.planning.v5-backup', '.planning', 'decisions.md'),
      '## D1 - bar decisao\n\n- detalhe\n',
    )
    await writeFile(
      path.join(tmpDir, '.planning.v5-backup', '.planning', 'senior-principles.md'),
      '# Senior Principles\n\n1. test\n',
    )

    const r = await migrate4DecisionsStep.run(ctx(tmpDir))
    const lines = r.summary.split('\n')
    expect(lines).toHaveLength(2)
    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 198 (PRD R1, G1).
    expect(lines[1]).toBe('  core-beliefs.md created from senior-principles.md')
    expect(r.mutated).toBe(true)
  })
})
```

### Passo 9: Paranoia grep contra SKILL.md (G1)

```bash
# 2026-05-17 (Luiz/dev): G1 do plano — 4 strings DEVEM existir no SKILL.md atual.
grep -F "console.log('Lessons:', report.status, '— wrote:'" skills/init/SKILL.md
grep -F '(no lessons-learned.md in backup — nothing to migrate)' skills/init/SKILL.md
grep -F "console.log('Decisions:', report.status, '— wrote:'" skills/init/SKILL.md
grep -F 'core-beliefs.md created from senior-principles.md' skills/init/SKILL.md
```

Todos exit 0.

---

## Gotchas

- **G1 do plano (wording byte-identico):** atencao ao em-dash (` — `) em "— wrote:" — eh
  U+2014 com espacos ao redor. Atencao ao indent de 2 espacos `'  '` nas linhas
  condicionais. Para `'Lessons: ' + status + ' — wrote: '` vs `console.log('Lessons:', status, '— wrote:'...)`,
  o output do `console.log` com multiplas args insere ESPACO ENTRE ARGS — entao
  `console.log('Lessons:', 'completed', '— wrote:', 3, 'skipped:', 0)` produz
  `'Lessons: completed — wrote: 3 skipped: 0'`. Conferir cada espaco.
- **G2 do plano (helpers preservados):** `migrateLessons` e `migrateDecisions` NAO
  modificados.
- **G3 do plano (imports estaticos):** imports estaticos no topo. Sem `await import`.
- **G5 do plano (sem AbortError):** estes 2 steps NAO tem gate. Falhas viram skipped
  (helper trata). Best-effort por design (SKILL.md nao chama `process.exit` em
  migrate.3/4).
- **Local — `console.log` vs `+` concatenacao:** ambos produzem o mesmo stdout para
  argumentos string. Mas atencao a `console.log('a:', 0)` vs `console.log('a: ' + 0)` —
  o segundo tem espaco se concatenado com `' '` literal. Pattern adotado: SEMPRE
  reproduzir o stdout EXATO observando o que `console.log(...args)` produz com
  `process.stdout.write` semantics.
- **Local — `report.status === 'skipped'` para indicar fonte missing:** o helper retorna
  status `'skipped'` quando o source file inteiro nao existe. Mas tambem retorna
  `'completed'` mesmo se algumas entries forem skipped (skipped array tem entries).
  Para o teste "source missing", esperamos `status === 'skipped' && skipped.length >= 1
  && skipped[0].reason.includes('source-missing')`. Confirmar com helper antes de
  finalizar fixture.
- **Local — `migrate-3-source-missing` fixture:** backup precisa EXISTIR mas
  `lessons-learned.md` precisa estar AUSENTE. Helper trata isso retornando status
  `'skipped'`. Se backup todo nao existir, comportamento pode ser diferente — ler
  helper.
- **Local — paralelismo da fase:** os dois steps sao independentes. Se quiser paralelizar
  a implementacao, pode criar os 2 arquivos simultaneamente. Mas o registry edit deve
  ser atomico (uma unica mudanca).

---

## Verificacao

### TDD

- [ ] **RED:** Testes escritos antes dos steps. Falham por modulo nao encontrado.
  - Comandos: `bun run test skills/init/lib/steps/12-*.test.ts` e `bun run test skills/init/lib/steps/13-*.test.ts`
  - Resultado esperado: `Cannot find module` em ambos.

- [ ] **GREEN:** Steps + registry. Testes passam.
  - Comando: `bun run test skills/init/lib/steps/`
  - Resultado esperado: 6 testes desta fase + acumulados anteriores passam.

### Checklist

- [ ] `skills/init/lib/steps/12-migrate-3-lessons.ts` criado, exporta `migrate3LessonsStep`
- [ ] `skills/init/lib/steps/13-migrate-4-decisions.ts` criado, exporta `migrate4DecisionsStep`
- [ ] `skills/init/lib/registry.ts` atualizado com AMBOS apos migrate2
- [ ] 4 fixtures criadas (`migrate-3-{missing,present}/`, `migrate-4-{no-core,with-core}/`)
- [ ] 4 goldens criados em `__golden__/migrate-{3,4}-*.txt`
- [ ] 6 testes passam (3 por step)
- [ ] `skills/init/SKILL.md` NAO modificado
- [ ] Helpers NAO modificados: `git diff skills/init/lib/migrate-lessons.ts skills/init/lib/migrate-decisions.ts skills/init/lib/parse-lessons.ts skills/init/lib/parse-decisions.ts` vazio
- [ ] Paranoia grep (4 strings) retorna exit 0
- [ ] Lint limpo
- [ ] Steps nao usam `await import` nem `bun -e`
- [ ] Zero `any`/`as`

---

## Criterio de Aceite

Steps `migrate-3-lessons` e `migrate-4-decisions` portados, registrados, validados por 6
cenarios. NUNCA arremessam AbortError (best-effort). Wording byte-identico das 4 strings
(2 logs principais + 2 condicionais). `SKILL.md` intocado.

**Por maquina:**
- `bun run test skills/init/lib/steps/12-migrate-3-lessons.test.ts` exit 0 com 3 testes
- `bun run test skills/init/lib/steps/13-migrate-4-decisions.test.ts` exit 0 com 3 testes
- `bun run test skills/init/lib/steps/` exit 0 (regression)
- `git diff --stat skills/init/SKILL.md skills/init/lib/migrate-lessons.ts skills/init/lib/migrate-decisions.ts` retorna 0 arquivos
- `grep -c 'migrate3LessonsStep\|migrate4DecisionsStep' skills/init/lib/registry.ts` retorna >= 4 (2 imports + 2 entries)
- `grep -E 'throw new AbortError' skills/init/lib/steps/{12,13}-*.ts` retorna 0 matches

**Por humano:**
- Inspecao visual dos 4 goldens: em-dash em U+2014, 2 espacos de indentacao nas linhas
  condicionais, ponto final ausente nas linhas principais (SKILL.md tambem nao tem),
  parenteses ao redor de `(no lessons-learned.md...)`.

---

<!-- Gerado por /plan-feature em 2026-05-17 -->
