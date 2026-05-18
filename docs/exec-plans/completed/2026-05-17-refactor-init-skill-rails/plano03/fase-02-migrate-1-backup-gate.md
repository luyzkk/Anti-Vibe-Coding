<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 02: Portar Step migrate.1 — `backupPlanning` com gate de abortagem

**Plano:** 03 — Gates de abortagem + steps interativos
**Sizing:** 1.5h
**Depende de:** fase-01 (catch de AbortError comprovado)
**Visual:** false

---

## O que esta fase entrega

Step migrate.1 do `SKILL.md` (linhas 102-128) portado para
`skills/init/lib/steps/10-migrate-1-backup.ts`. Envelopa `backupPlanning` (helper preservado),
emite 2 logs canonicos byte-identicos (created / already-exists), e arremessa
`AbortError({ code: 1, reason })` quando `backupPlanning` THROWS (lock orfao, permission,
disco cheio — PRD CA-07). Execucao condicional: o step LE `ctx` para decidir "estamos em
modo de migracao?" e retorna no-op silencioso (`{ mutated: false, summary: '' }`) caso
contrario. `SKILL.md` permanece intocado.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/10-migrate-1-backup.ts` | Create | Step que envelopa `backupPlanning` + 2 logs + AbortError em throw |
| `skills/init/lib/registry.ts` | Modify | Inserir `migrate1BackupStep` no indice apos `migrate-all` (G4 do plano) |
| `skills/init/lib/steps/10-migrate-1-backup.test.ts` | Create | 4 cenarios: no-legacy no-op, legacy backup created, idempotent already-exists, lock throws → AbortError |
| `skills/init/lib/steps/__fixtures__/migrate-1-no-legacy/.gitkeep` | Create | Projeto greenfield (sem `.planning/`) — step deve ser no-op |
| `skills/init/lib/steps/__fixtures__/migrate-1-legacy/.planning/plan.md` | Create | Projeto com legacy v5 — backup deve ser criado |
| `skills/init/lib/steps/__fixtures__/migrate-1-locked/.planning.v5-backup.lock` | Create | Lock file presente — backup deve abortar |
| `skills/init/lib/steps/__golden__/migrate-1-created.txt` | Create | stdout esperado: `'Backup N files → .planning.v5-backup'` |
| `skills/init/lib/steps/__golden__/migrate-1-already-exists.txt` | Create | stdout esperado: `'Backup already present at ... — proceeding (idempotent).'` |
| `skills/init/lib/steps/__golden__/migrate-1-abort-lock.txt` | Create | stdout esperado da reason de AbortError quando lock |

---

## Implementacao

### Passo 1: Decisao de "shouldRun" interno (DI-1)

O contrato `Step` de Plano 01 fase-01 NAO tem campo `shouldRun(ctx) => boolean`. SKILL.md
roda migrate.1 condicionalmente: somente quando o usuario invocou `/init migrate` OU
quando Step 0.5 (detect-legacy) retornou code=1 (precisava migrar). Em arquitetura Rails,
duas opcoes:

- **Opcao A — Adicionar `shouldRun` ao contrato.** Mudanca no `types.ts` (Plano 01 fase-01).
  Quebraria compatibilidade aditiva — todos os steps existentes ficariam com `shouldRun`
  opcional implicitamente true.
- **Opcao B — Step decide internamente.** Step le `ctx.args` para decidir se deve agir.
  Se nao for modo de migracao, retorna `{ mutated: false, summary: '' }` (silent no-op).
  Mantem o contrato minimo. **MESMO PATTERN** que `reuseDiscoveryStep` em Plano 02 fase-06
  (le `--reuse-discovery`/`--refresh` e retorna no-op quando ausente).

**DI-1 (decisao desta fase):** OPCAO B. Justificativa: (a) consistencia com pattern ja
estabelecido em Plano 02 fase-06; (b) contrato minimo continua testavel sem mock pesado;
(c) cada step de migrate.* repete o mesmo guard — boilerplate de 2 linhas eh aceitavel.

Codigo do guard:
```typescript
// 2026-05-17 (Luiz/dev): DI-1 desta fase — shouldRun interno via inspecao de ctx.args.
// Modo "migrate" eh detectado por: primeira arg posicional === 'migrate' OU Step 0.5 ja
// fluxionou code=1 (mas Step 0.5 nesse caso aborta antes — entao na pratica eh so 'migrate').
function isMigrateMode(args: readonly string[]): boolean {
  return args[0] === 'migrate'
}
```

> **NOTA:** "Step 0.5 abortou antes" significa que em greenfield nao chegamos aqui (Step 0.5
> retorna ok ou aborta). Em modo migrate explicito (`/init migrate`), `args[0]` eh `'migrate'`.
> Edge case: futuros entrypoints que passam `migrate` em outra posicao precisam ajustar este
> guard — documentar.

### Passo 2: Verificar signature de `backupPlanning` (helper preservado — G2)

Pre-leitura confirmada de `skills/init/lib/backup-planning.ts`:

```typescript
export type BackupResult = {
  status: 'created' | 'already-exists' | 'dry-run'
  backupPath: string
  filesCopied: number
}
export type BackupOptions = { dryRun?: boolean; state: LegacyState }
export async function backupPlanning(targetDir: string, options: BackupOptions): Promise<BackupResult>
```

> **Local — verified signature:** `backupPlanning` NAO retorna status `'error'`. Em vez disso
> ele THROWS `Error('Backup lock present at ... — another /init may be running.')` quando lock
> existe (linhas 51-55 do helper). Para permission denied / disco cheio, o `copyRecursive`
> interno lanca via `fs.copyFile`. Conclusao: o gate eh implementado via try/catch ao redor
> de `backupPlanning` no step, e o erro vira AbortError com `code: 1` e `reason` preservada
> da mensagem original.

### Passo 3: Criar `10-migrate-1-backup.ts`

```typescript
// skills/init/lib/steps/10-migrate-1-backup.ts
import { detectV5Legacy } from '../detect-v5-legacy'
import { backupPlanning } from '../backup-planning'
import { AbortError } from './abort-error'
import type { Step } from './types'

// 2026-05-17 (Luiz/dev): DI-1 desta fase — shouldRun interno.
function isMigrateMode(args: readonly string[]): boolean {
  return args[0] === 'migrate'
}

export const migrate1BackupStep: Step = {
  id: 'migrate-1-backup',
  async run(ctx) {
    // 2026-05-17 (Luiz/dev): no-op silencioso quando nao em modo migrate.
    // Preserva CA-01 (greenfield nao vai a SKILL.md linhas 102-128).
    if (!isMigrateMode(ctx.args)) {
      return { mutated: false, summary: '' }
    }

    // 2026-05-17 (Luiz/dev): dry-run honrado — backupPlanning aceita dryRun: true
    // e retorna status='dry-run' sem tocar disco. PRD CA-03, MH-04.
    const dryRun = ctx.flags['dry-run'] === true

    const state = await detectV5Legacy(ctx.cwd)

    let result: Awaited<ReturnType<typeof backupPlanning>>
    try {
      result = await backupPlanning(ctx.cwd, { state, dryRun })
    } catch (err) {
      // 2026-05-17 (Luiz/dev): PRD CA-07 — backup falha (lock/permission/disk) aborta /init.
      // Preserva mensagem do helper como reason (byte-identico ao stdout antes da refatoracao,
      // que era um throw nao-tratado emergindo do bun -e).
      const reason = err instanceof Error ? err.message : String(err)
      throw new AbortError({ code: 1, reason })
    }

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linhas 116-121 (PRD R1, G1).
    if (result.status === 'created') {
      return {
        mutated: true,
        summary: 'Backup ' + result.filesCopied + ' files → ' + result.backupPath,
      }
    }
    if (result.status === 'already-exists') {
      return {
        mutated: false,
        summary: 'Backup already present at ' + result.backupPath + ' — proceeding (idempotent).',
      }
    }
    // status === 'dry-run' — SKILL.md linha 122 comenta "count logged, nothing written".
    // O dry-run report renderer (fase-05) consome esse retorno; aqui apenas no-op visivel.
    return { mutated: false, summary: '' }
  },
}
```

### Passo 4: Atualizar `registry.ts`

```typescript
// skills/init/lib/registry.ts (snippet — preservar resto do Plano 02 fase-06)
import { migrate1BackupStep } from './steps/10-migrate-1-backup'

// 2026-05-17 (Luiz/dev): G4 do plano — ordem alvo.
// Apos reuseDiscovery e antes dos demais migrate.*, ordem cumulativa do registry.
// O numero 10 no prefixo do arquivo reflete posicao APROXIMADA — registry final tera
// indices ajustados em fase-05 (migrate.0/all) e fase-06 (Step 6/7).
export const registry: readonly Step[] = [
  detectLegacyStep,         // indice 0
  reuseDiscoveryStep,        // indice 1
  // migrate-0/migrate-all inseridos em fase-05 (indices 2-3)
  migrate1BackupStep,        // indice 4 (apos fase-05 inserir migrate-0/all)
  // migrate-2/3/4 inseridos em fases 03/04 (indices 5-7)
  scaffoldFullTreeStep,
  linkClaudeAgentsStep,
  detectStackAndRegisterStep,
  persistStackKnowledgeStep,
  customizeArchitectureStep,
  installGhFilesStep,
  finalValidationStep,
]
```

> **Coordenacao:** ate todas as fases deste plano completarem, o registry estara em estado
> intermediario. NAO faz mal pois (a) `isMigrateMode` guard mantem cada step no-op quando
> nao acionado, (b) Plano 04 fase-04 (E2E) eh quem valida o registry COMPLETO. Por enquanto
> manter ordem em snapshot e atualizar em cada fase deste plano.

### Passo 5: Criar fixtures

```
skills/init/lib/steps/__fixtures__/
  migrate-1-no-legacy/
    .gitkeep                          (vazio — sem .planning/, no-op)
  migrate-1-legacy/
    .planning/
      plan.md                          (conteudo qualquer, dispara detectV5Legacy=true)
  migrate-1-locked/
    .planning/
      plan.md                          (legacy presente)
    .planning.v5-backup.lock            (vazio — simula outro processo)
```

`.planning/plan.md` da fixture pode ter conteudo: `# Plan\n\n- item\n`.

### Passo 6: Goldens

`skills/init/lib/steps/__golden__/migrate-1-created.txt`:
```
Backup 1 files → /tmp/<fixture>/.planning.v5-backup
```

`skills/init/lib/steps/__golden__/migrate-1-already-exists.txt`:
```
Backup already present at /tmp/<fixture>/.planning.v5-backup — proceeding (idempotent).
```

`skills/init/lib/steps/__golden__/migrate-1-abort-lock.txt`:
```
Backup lock present at /tmp/<fixture>/.planning.v5-backup.lock — another /init may be running. If stale, delete manually and re-run.
```

> **Nota:** `/tmp/<fixture>` eh placeholder textual. O teste valida via regex/contains.

### Passo 7: Testes (`10-migrate-1-backup.test.ts`)

```typescript
// skills/init/lib/steps/10-migrate-1-backup.test.ts
import { describe, test, expect, afterEach } from 'bun:test'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { migrate1BackupStep } from './10-migrate-1-backup'
import { AbortError } from './abort-error'

const ctx = (cwd: string, args: readonly string[] = []) => ({
  cwd, args, flags: {} as Readonly<Record<string, boolean | string>>,
})

describe('migrate1BackupStep', () => {
  let tmpDir: string
  afterEach(async () => { if (tmpDir) await rm(tmpDir, { recursive: true, force: true }) })

  test('no-args (no migrate mode): no-op silencioso, mutated=false', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'm1-noop-'))
    // 2026-05-17 (Luiz/dev): sem 'migrate' em args[0], step nao age. CA-01.
    const r = await migrate1BackupStep.run(ctx(tmpDir, []))
    expect(r.mutated).toBe(false)
    expect(r.summary).toBe('')
  })

  test('migrate mode + legacy v5: cria backup, summary byte-identico', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'm1-create-'))
    await mkdir(path.join(tmpDir, '.planning'), { recursive: true })
    await writeFile(path.join(tmpDir, '.planning', 'plan.md'), '# Plan\n')

    const r = await migrate1BackupStep.run(ctx(tmpDir, ['migrate']))

    expect(r.mutated).toBe(true)
    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 117 (PRD R1, G1).
    expect(r.summary).toMatch(/^Backup \d+ files → .+\.planning\.v5-backup$/)
    expect(existsSync(path.join(tmpDir, '.planning.v5-backup'))).toBe(true)
  })

  test('migrate mode + backup ja existe: idempotente, summary byte-identico', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'm1-idem-'))
    await mkdir(path.join(tmpDir, '.planning'), { recursive: true })
    await writeFile(path.join(tmpDir, '.planning', 'plan.md'), '# Plan\n')
    // Pre-criar o backup (simula segunda execucao)
    await mkdir(path.join(tmpDir, '.planning.v5-backup'), { recursive: true })

    const r = await migrate1BackupStep.run(ctx(tmpDir, ['migrate']))

    expect(r.mutated).toBe(false)
    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 120 (PRD R1, G1).
    expect(r.summary).toMatch(/^Backup already present at .+ — proceeding \(idempotent\)\.$/)
  })

  test('migrate mode + lock orfao: lanca AbortError com code=1', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'm1-lock-'))
    await mkdir(path.join(tmpDir, '.planning'), { recursive: true })
    await writeFile(path.join(tmpDir, '.planning', 'plan.md'), '# Plan\n')
    // Simula lock orfao
    await writeFile(path.join(tmpDir, '.planning.v5-backup.lock'), '')

    let caught: AbortError | undefined
    try {
      await migrate1BackupStep.run(ctx(tmpDir, ['migrate']))
    } catch (e) {
      if (e instanceof AbortError) caught = e
    }
    expect(caught).toBeInstanceOf(AbortError)
    if (caught) {
      // 2026-05-17 (Luiz/dev): PRD CA-07 — backup falha com lock => AbortError code=1.
      expect(caught.code).toBe(1)
      expect(caught.reason).toMatch(/Backup lock present at .+\.planning\.v5-backup\.lock/)
      expect(caught.reason).toMatch(/another \/init may be running/)
    }
  })

  test('migrate mode + --dry-run: status dry-run, mutated=false, summary vazio', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'm1-dryrun-'))
    await mkdir(path.join(tmpDir, '.planning'), { recursive: true })
    await writeFile(path.join(tmpDir, '.planning', 'plan.md'), '# Plan\n')

    const r = await migrate1BackupStep.run({
      cwd: tmpDir,
      args: ['migrate'],
      flags: { 'dry-run': true },
    })
    expect(r.mutated).toBe(false)
    expect(r.summary).toBe('')
    // 2026-05-17 (Luiz/dev): dry-run nao cria backup. PRD CA-03.
    expect(existsSync(path.join(tmpDir, '.planning.v5-backup'))).toBe(false)
  })
})
```

### Passo 8: Paranoia grep contra SKILL.md (G1)

```bash
# 2026-05-17 (Luiz/dev): G1 do plano — wording dos 2 logs DEVE existir no SKILL.md atual.
grep -F 'Backup ' skills/init/SKILL.md | grep -F 'files → '
grep -F 'Backup already present at ' skills/init/SKILL.md
grep -F ' — proceeding (idempotent).' skills/init/SKILL.md
grep -F 'Backup lock present at ' skills/init/lib/backup-planning.ts
grep -F ' — another /init may be running.' skills/init/lib/backup-planning.ts
```

Os 3 primeiros sao no SKILL.md (logs do step). Os 2 ultimos sao no helper `backup-planning.ts`
(mensagem do throw que vira reason da AbortError). Todos exit 0.

---

## Gotchas

- **G1 do plano (wording byte-identico):** SKILL.md linha 117 usa concatenacao com `+`
  (`'Backup ' + result.filesCopied + ' files → ' + result.backupPath`). NOSSA versao usa
  o mesmo pattern — NAO usar template literal porque uma vez ja vimos
  o em-dash sumir em template literal (artefato de copy-paste). Manter `+` por seguranca.
- **G2 do plano (helper preservado):** `backupPlanning` NAO sera modificado. Se um teste
  exigir mudanca na mensagem do throw, ESCALAR — nao mexer.
- **G3 do plano (imports estaticos):** `import { backupPlanning } from '../backup-planning'`
  no topo do step. NUNCA `await import`. NUNCA `bun -e`.
- **G5 do plano (code=1):** backup falha = needs-action manual (deletar lock, liberar
  disco, ajustar permissoes). Codigo 1 alinha com semantica "user action required". NAO
  usar 2 (eh para ambiguity).
- **DI-1 desta fase (`isMigrateMode`):** assumimos que `args[0] === 'migrate'`. Se um
  entrypoint futuro passar `'--mode=migrate'` ou similar, este guard quebra silentemente
  (step vira no-op em modo migrate). Documentar.
- **Local — verified signature `backupPlanning`:** NAO retorna `status: 'error'`. Throws
  diretamente. Por isso o try/catch externo eh essencial. Helper tambem throws em
  permission/disk-full via `copyRecursive` interno — mesmo path de catch funciona.
- **Local — `state.alreadyMigrated`:** `detectV5Legacy` retorna campo extra. NAO usado
  neste step (so passado para backupPlanning via `options.state`). Cuidado para nao
  re-implementar logica de detect aqui.
- **Local — `dryRun` via `ctx.flags['dry-run']`:** parser de Plano 01 fase-02 mapeia
  `--dry-run` para `flags['dry-run'] === true`. Verificar caso o parser tenha mudado
  (camelCase?). Plano 02 fase-02 ja parsed `dry-run` literal — manter consistencia.

---

## Verificacao

### TDD

- [ ] **RED:** Testes escritos antes do step. Falham por modulo nao encontrado.
  - Comando: `bun run test skills/init/lib/steps/10-migrate-1-backup.test.ts`
  - Resultado esperado: `Cannot find module './10-migrate-1-backup'`

- [ ] **GREEN:** Step + registry. Testes passam.
  - Comando: `bun run test skills/init/lib/steps/`
  - Resultado esperado: 5 testes desta fase + acumulados anteriores passam.

### Checklist

- [ ] `skills/init/lib/steps/10-migrate-1-backup.ts` criado, exporta `migrate1BackupStep`
- [ ] `skills/init/lib/registry.ts` atualizado com `migrate1BackupStep` no indice esperado
- [ ] 3 fixtures criadas em `__fixtures__/migrate-1-{no-legacy,legacy,locked}/`
- [ ] 3 goldens criados em `__golden__/migrate-1-{created,already-exists,abort-lock}.txt`
- [ ] 5 testes passam: no-op, created, idempotent, abort-lock, dry-run
- [ ] `skills/init/SKILL.md` NAO modificado
- [ ] Helpers NAO modificados: `git diff skills/init/lib/backup-planning.ts skills/init/lib/detect-v5-legacy.ts` vazio
- [ ] Paranoia grep (5 strings) retorna exit 0
- [ ] Lint limpo: `bun run lint skills/init/lib/steps/`
- [ ] Step nao usa `await import` nem `bun -e`: `grep -E 'await import|bun -e' skills/init/lib/steps/10-*.ts` retorna 0 matches
- [ ] Zero `any`/`as`: `grep -E '\bany\b|\bas\s' skills/init/lib/steps/10-migrate-1-backup.ts` retorna 0 matches

---

## Criterio de Aceite

Step `migrate-1-backup` portado, registrado, validado por 5 cenarios. Gate de PRD CA-07
implementado via `try/catch + throw AbortError({ code: 1, reason })`. Wording byte-identico
das 2 strings de log + reason do throw. `SKILL.md` intocado.

**Por maquina:**
- `bun run test skills/init/lib/steps/10-migrate-1-backup.test.ts` exit 0 com 5 testes passando
- `bun run test skills/init/lib/steps/` exit 0 (regression das fases anteriores)
- `git diff --stat skills/init/SKILL.md skills/init/lib/backup-planning.ts skills/init/lib/detect-v5-legacy.ts` retorna 0 arquivos modificados
- `grep -c 'migrate1BackupStep' skills/init/lib/registry.ts` retorna >= 2 (import + array)

**Por humano:**
- Inspecao visual dos 3 goldens: backup-created, backup-idempotent, abort-lock — strings
  comparadas com SKILL.md linhas 117 e 120, e com helper backup-planning.ts linhas 52-55.
- Confirmar que o em-dash em "— proceeding (idempotent)." eh U+2014 (mesmo caractere do SKILL.md).

---

<!-- Gerado por /plan-feature em 2026-05-17 -->
