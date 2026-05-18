<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 03: Portar Step migrate.2 — `migratePlanning` com gate de conflito

**Plano:** 03 — Gates de abortagem + steps interativos
**Sizing:** 2h
**Depende de:** fase-02 (migrate.1 ja portado — ordem do registry preserva sequencia)
**Visual:** false

---

## O que esta fase entrega

Step migrate.2 do `SKILL.md` (linhas 132-156) portado para
`skills/init/lib/steps/11-migrate-2-planning.ts`. Envelopa `migratePlanning` (helper
preservado), emite 4 linhas de relatorio canonicas + 2 linhas extras de CONFLICT quando
aplicavel, e arremessa `AbortError({ code: 1, reason })` quando `report.conflicts.length > 0`
(PRD MH-05). Mesma estrategia de `isMigrateMode` interno (DI-1 herdado de fase-02). Wording
byte-identico via concatenacao com `+`. `SKILL.md` permanece intocado.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/11-migrate-2-planning.ts` | Create | Step que envelopa `migratePlanning` + 4 logs + AbortError em conflict |
| `skills/init/lib/registry.ts` | Modify | Inserir `migrate2PlanningStep` apos `migrate1BackupStep` (G4 do plano) |
| `skills/init/lib/steps/11-migrate-2-planning.test.ts` | Create | 3 cenarios: ok-no-conflicts, conflicts → AbortError, idempotent re-run |
| `skills/init/lib/steps/__fixtures__/migrate-2-ok/.planning.v5-backup/.planning/exec-plans/foo.md` | Create | Backup ja criado (sem conflict — destino limpo) |
| `skills/init/lib/steps/__fixtures__/migrate-2-conflict/.planning.v5-backup/.planning/exec-plans/foo.md` | Create | Backup + destino DIFERENTE → conflict |
| `skills/init/lib/steps/__fixtures__/migrate-2-conflict/docs/exec-plans/active/2026-05-12-foo/PLAN.md` | Create | Destino com conteudo divergente |
| `skills/init/lib/steps/__golden__/migrate-2-ok.txt` | Create | stdout esperado: 4 linhas de relatorio |
| `skills/init/lib/steps/__golden__/migrate-2-conflict.txt` | Create | reason esperada da AbortError: 6 linhas |

---

## Implementacao

### Passo 1: Estrategia de "summary multi-linha + AbortError" (DI-3-1)

SKILL.md linhas 143-150 logam 4 linhas SEMPRE, e quando ha conflitos logam mais 2 e
chamam `process.exit(1)`. Em Rails, o step nao chama `process.exit` (PRD D4) — vira
`throw AbortError`. Mas o dispatcher EMITE `e.reason` no log, NAO o `summary` do step
nesse caso. Isso significa: as 4 linhas do relatorio TEM que estar tambem na `reason`
quando o caso eh conflict, senao elas somem do stdout.

**DI-3-1 (decisao desta fase):** Construir um `summary` multi-linha SEMPRE. Se ha
conflicts, ANEXAR as 2 linhas de CONFLICT a esse summary e usa-lo como `reason` da
AbortError. Em caso sem conflict, retornar `{ mutated: true, summary }` normal — as 4
linhas saem pelo log do dispatcher. Em caso com conflict, throw com reason = summary +
2 linhas extras. Pattern alinhado com `90-final-validation.ts` (Plano 02 fase-06) que
ja constroi reason multi-linha.

### Passo 2: Verificar signature de `migratePlanning` (helper preservado — G2)

Pre-leitura confirmada de `skills/init/lib/migrate-planning.ts`:

```typescript
export type MigrationReport = {
  status: 'completed' | 'dry-run' | 'partial'
  entries: number
  written: string[]
  skipped: Array<{ relPath: string; reason: string }>
  conflicts: Array<{ source: string; target: string }>
}
export type MigratePlanningOptions = {
  dryRun?: boolean
  writeFile?: (filePath: string, body: string) => Promise<void>
}
export async function migratePlanning(targetDir: string, options?: MigratePlanningOptions): Promise<MigrationReport>
```

> **Local — verified signature:** `migratePlanning` NUNCA throws (esta na docstring — error
> handling interno via `partial` status). Conflicts vem no array `conflicts`, com fields
> `source` (path absoluto) e `target` (path absoluto). SKILL.md linha 149 mapeia para
> `c.target` — manter o mesmo accessor.

### Passo 3: Criar `11-migrate-2-planning.ts`

```typescript
// skills/init/lib/steps/11-migrate-2-planning.ts
import { migratePlanning } from '../migrate-planning'
import { AbortError } from './abort-error'
import type { Step } from './types'

// 2026-05-17 (Luiz/dev): DI-1 herdado de fase-02 — shouldRun interno por args[0].
function isMigrateMode(args: readonly string[]): boolean {
  return args[0] === 'migrate'
}

export const migrate2PlanningStep: Step = {
  id: 'migrate-2-planning',
  async run(ctx) {
    if (!isMigrateMode(ctx.args)) {
      return { mutated: false, summary: '' }
    }

    const dryRun = ctx.flags['dry-run'] === true
    const report = await migratePlanning(ctx.cwd, { dryRun })

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linhas 143-146 (PRD R1, G1).
    // Concatenacao com + (NAO template literal — paridade com bloco inline).
    const lines = [
      'Migration: ' + report.status,
      '  entries: ' + report.entries,
      '  written: ' + report.written.length,
      '  skipped: ' + report.skipped.length,
    ]

    // 2026-05-17 (Luiz/dev): se ha conflicts, lanca AbortError com reason multi-linha.
    // PRD MH-05, CA-07. DI-3-1 desta fase: as 4 linhas de relatorio + 2 de conflict
    // viram a reason inteira — dispatcher emite via log(e.reason).
    if (report.conflicts.length > 0) {
      // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linhas 149-150 (PRD R1, G1).
      const conflictLines = [
        '  CONFLICTS: ' + report.conflicts.map((c) => c.target).join(', '),
        '  Resolve manually (delete from docs/ or rename original) and re-run /init migrate.',
      ]
      const reason = lines.concat(conflictLines).join('\n')
      throw new AbortError({ code: 1, reason })
    }

    return {
      mutated: report.status === 'completed',
      summary: lines.join('\n'),
    }
  },
}
```

> **Pattern critico:** as 4 linhas de relatorio estao SEMPRE no output (via summary ou via
> reason). Scripts CI que fazem grep em "entries:" continuam funcionando com ou sem conflict.

### Passo 4: Atualizar `registry.ts`

```typescript
// skills/init/lib/registry.ts (snippet — preservar resto)
import { migrate2PlanningStep } from './steps/11-migrate-2-planning'

// 2026-05-17 (Luiz/dev): G4 do plano — inserido apos migrate1BackupStep.
export const registry: readonly Step[] = [
  detectLegacyStep,
  reuseDiscoveryStep,
  // migrate-0/migrate-all (fase-05)
  migrate1BackupStep,
  migrate2PlanningStep,         // <-- novo
  // migrate-3/4 (fase-04)
  scaffoldFullTreeStep,
  // ...resto preservado
]
```

### Passo 5: Criar fixtures

```
skills/init/lib/steps/__fixtures__/
  migrate-2-ok/
    .planning.v5-backup/
      .planning/
        exec-plans/
          foo.md                       (# Plan foo\n)
  migrate-2-conflict/
    .planning.v5-backup/
      .planning/
        exec-plans/
          foo.md                       (# Plan foo\n)
    docs/
      exec-plans/
        active/
          2026-05-12-foo/
            PLAN.md                    (# Plan foo - DIVERGENT\n)   <-- conflict trigger
```

> **NOTA:** o path de destino em `docs/exec-plans/active/2026-05-12-foo/PLAN.md` precisa
> respeitar a logica de `parsePlanningEntry` do helper. Se nao casar, o teste de conflict
> nao dispara — usar `migratePlanning` em sandbox para descobrir o destino correto, OU
> ler o helper. Ajustar fixture conforme.

### Passo 6: Goldens

`skills/init/lib/steps/__golden__/migrate-2-ok.txt`:
```
Migration: completed
  entries: 1
  written: 1
  skipped: 0
```

`skills/init/lib/steps/__golden__/migrate-2-conflict.txt`:
```
Migration: partial
  entries: 1
  written: 0
  skipped: 0
  CONFLICTS: <abs-path>/docs/exec-plans/active/2026-05-12-foo/PLAN.md
  Resolve manually (delete from docs/ or rename original) and re-run /init migrate.
```

> **Nota:** valores numericos (`entries: 1`, etc) sao especificos da fixture. O teste
> verifica formato (regex `^  entries: \d+$`), nao numero literal.

### Passo 7: Testes (`11-migrate-2-planning.test.ts`)

```typescript
// skills/init/lib/steps/11-migrate-2-planning.test.ts
import { describe, test, expect, afterEach } from 'bun:test'
import { mkdtemp, rm, mkdir, writeFile, cp } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { migrate2PlanningStep } from './11-migrate-2-planning'
import { AbortError } from './abort-error'

const ctx = (cwd: string, args: readonly string[] = ['migrate']) => ({
  cwd, args, flags: {} as Readonly<Record<string, boolean | string>>,
})

async function setupBackupOnly(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'm2-ok-'))
  await mkdir(path.join(dir, '.planning.v5-backup', '.planning', 'exec-plans'), { recursive: true })
  // 2026-05-17 (Luiz/dev): conteudo arbitrario — migratePlanning so se importa com o nome do arquivo.
  await writeFile(
    path.join(dir, '.planning.v5-backup', '.planning', 'exec-plans', '2026-05-12-foo.md'),
    '# Plan foo\n',
  )
  return dir
}

async function setupConflict(): Promise<string> {
  const dir = await setupBackupOnly()
  // 2026-05-17 (Luiz/dev): pre-cria destino com conteudo DIVERGENTE para forcar conflict.
  // Path do destino segue logica de parsePlanningEntry — confirmar com helper se ajustar.
  await mkdir(path.join(dir, 'docs', 'exec-plans', 'active', '2026-05-12-foo'), { recursive: true })
  await writeFile(
    path.join(dir, 'docs', 'exec-plans', 'active', '2026-05-12-foo', 'PLAN.md'),
    '# Plan foo - DIVERGENT\n',
  )
  return dir
}

describe('migrate2PlanningStep', () => {
  let tmpDir: string
  afterEach(async () => { if (tmpDir) await rm(tmpDir, { recursive: true, force: true }) })

  test('no migrate mode: no-op', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'm2-noop-'))
    const r = await migrate2PlanningStep.run(ctx(tmpDir, []))
    expect(r).toEqual({ mutated: false, summary: '' })
  })

  test('migrate mode, no conflicts: 4 linhas de summary, mutated true', async () => {
    tmpDir = await setupBackupOnly()
    const r = await migrate2PlanningStep.run(ctx(tmpDir))
    expect(r.mutated).toBe(true)

    const lines = r.summary.split('\n')
    // 2026-05-17 (Luiz/dev): 4 linhas byte-identicas ao SKILL.md (PRD R1, G1).
    expect(lines).toHaveLength(4)
    expect(lines[0]).toMatch(/^Migration: (completed|partial|dry-run)$/)
    expect(lines[1]).toMatch(/^  entries: \d+$/)
    expect(lines[2]).toMatch(/^  written: \d+$/)
    expect(lines[3]).toMatch(/^  skipped: \d+$/)
  })

  test('migrate mode, conflicts presentes: lanca AbortError com reason de 6 linhas', async () => {
    tmpDir = await setupConflict()

    let caught: AbortError | undefined
    try {
      await migrate2PlanningStep.run(ctx(tmpDir))
    } catch (e) {
      if (e instanceof AbortError) caught = e
    }
    expect(caught).toBeInstanceOf(AbortError)
    if (caught) {
      expect(caught.code).toBe(1)
      const lines = caught.reason.split('\n')
      // 2026-05-17 (Luiz/dev): 4 linhas de relatorio + 2 linhas de CONFLICT = 6.
      expect(lines).toHaveLength(6)
      expect(lines[0]).toMatch(/^Migration: /)
      expect(lines[4]).toMatch(/^  CONFLICTS: /)
      // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 150.
      expect(lines[5]).toBe('  Resolve manually (delete from docs/ or rename original) and re-run /init migrate.')
    }
  })

  test('migrate mode, --dry-run: status dry-run, no conflict (write nao acontece)', async () => {
    tmpDir = await setupBackupOnly()
    const r = await migrate2PlanningStep.run({
      cwd: tmpDir, args: ['migrate'], flags: { 'dry-run': true },
    })
    // 2026-05-17 (Luiz/dev): em dry-run o helper retorna status='dry-run' SEM tocar disco.
    // PRD CA-03. mutated=false (nada foi escrito).
    expect(r.mutated).toBe(false)
    expect(r.summary.split('\n')[0]).toBe('Migration: dry-run')
  })
})
```

### Passo 8: Paranoia grep contra SKILL.md (G1)

```bash
# 2026-05-17 (Luiz/dev): G1 do plano — wording das 6 strings DEVE existir no SKILL.md atual.
grep -F "console.log('Migration:'," skills/init/SKILL.md
grep -F "console.log('  entries:'," skills/init/SKILL.md
grep -F "console.log('  written:'," skills/init/SKILL.md
grep -F "console.log('  skipped:'," skills/init/SKILL.md
grep -F "console.log('  CONFLICTS:'," skills/init/SKILL.md
grep -F "Resolve manually (delete from docs/ or rename original) and re-run /init migrate." skills/init/SKILL.md
```

Todos exit 0. Validamos a INTENCAO da string (concatenacao com ',' no source) — depois
do cutover em Plano 04, as strings serao removidas do SKILL.md (rationale extraido).

---

## Gotchas

- **G1 do plano (wording byte-identico):** 6 strings. As 4 primeiras usam `console.log('chave:', valor)`
  no SKILL.md, que produz `'Migration: completed'` (espaco apos `:`). Nosso step monta com
  `'Migration: ' + report.status`. Confirmar o espaco — sem ele, scripts CI que esperam
  `Migration: completed` quebram.
- **G2 do plano (helper preservado):** `migratePlanning` NAO modificado.
- **G3 do plano (imports estaticos):** import estatico no topo.
- **G5 do plano (code=1):** conflict = needs-action manual. Codigo 1. Alinha com semantica
  do SKILL.md linha 151 (`process.exit(1)`).
- **DI-3-1 desta fase (summary vira reason em conflict):** se um futuro PRD pedir output
  estruturado (JSON), repensar — hoje texto plano basta. Documentar.
- **Local — `c.target` eh path absoluto:** `migratePlanning` retorna conflicts com paths
  absolutos. O log SKILL.md linha 149 emite o path absoluto. Em testes, `caught.reason`
  contera path absoluto da fixture — usar `toContain` ou regex em vez de string literal.
- **Local — `report.status === 'completed'` para mutated:** quando `dryRun` eh true,
  status volta `'dry-run'` e nada foi mutado (mutated=false). Quando ha conflict, status
  volta `'partial'` e o step lanca antes de retornar — entao `mutated` so importa quando
  status eh `'completed'`. Logica correta no codigo acima.
- **Local — fixture do conflict:** o destino exato em `docs/exec-plans/active/<date>-<slug>/PLAN.md`
  depende da logica de `parsePlanningEntry`. Se a fixture nao casar, o teste de conflict
  vira "no conflict" (false negativo). Ler `parse-planning-entry.ts` antes de fixar a fixture.

---

## Verificacao

### TDD

- [ ] **RED:** Testes escritos antes do step. Falham por modulo nao encontrado.
  - Comando: `bun run test skills/init/lib/steps/11-migrate-2-planning.test.ts`
  - Resultado esperado: `Cannot find module './11-migrate-2-planning'`

- [ ] **GREEN:** Step + registry. Testes passam.
  - Comando: `bun run test skills/init/lib/steps/`
  - Resultado esperado: 4 testes desta fase + acumulados anteriores passam.

### Checklist

- [ ] `skills/init/lib/steps/11-migrate-2-planning.ts` criado, exporta `migrate2PlanningStep`
- [ ] `skills/init/lib/registry.ts` atualizado com `migrate2PlanningStep` apos migrate1
- [ ] 2 fixtures criadas em `__fixtures__/migrate-2-{ok,conflict}/`
- [ ] 2 goldens criados em `__golden__/migrate-2-{ok,conflict}.txt`
- [ ] 4 testes passam: no-op, ok-no-conflicts, conflicts-throws-abort, dry-run
- [ ] `skills/init/SKILL.md` NAO modificado
- [ ] Helpers NAO modificados: `git diff skills/init/lib/migrate-planning.ts skills/init/lib/parse-planning-entry.ts` vazio
- [ ] Paranoia grep (6 strings) retorna exit 0
- [ ] Lint limpo
- [ ] Step nao usa `await import` nem `bun -e`
- [ ] Zero `any`/`as` no step

---

## Criterio de Aceite

Step `migrate-2-planning` portado, registrado, validado por 4 cenarios. Conflicts disparam
`AbortError({ code: 1 })` com reason de 6 linhas. Wording byte-identico das 4 linhas de
relatorio + 2 linhas de CONFLICT. `SKILL.md` intocado.

**Por maquina:**
- `bun run test skills/init/lib/steps/11-migrate-2-planning.test.ts` exit 0 com 4 testes passando
- `bun run test skills/init/lib/steps/` exit 0 (regression)
- `git diff --stat skills/init/SKILL.md skills/init/lib/migrate-planning.ts skills/init/lib/parse-planning-entry.ts` retorna 0 arquivos
- `grep -c 'migrate2PlanningStep' skills/init/lib/registry.ts` retorna >= 2

**Por humano:**
- Inspecao visual do golden `migrate-2-conflict.txt`: 6 linhas, espaco de indentacao
  `'  '` (2 espacos) nas linhas 2-6, ponto final ao fim de cada uma.
- Confirmar que `'Migration: '` tem espaco entre `:` e `<status>` — sem o espaco, scripts
  CI que esperam `Migration: completed` quebram.

---

<!-- Gerado por /plan-feature em 2026-05-17 -->
