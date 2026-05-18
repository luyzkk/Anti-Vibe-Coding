<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 06: Portar `reuse-discovery.0` + `migrate.5` + estender `StepReport`

**Plano:** 02 — Steps puros
**Sizing:** 1.5h
**Depende de:** fase-03 (reusa `runStackKnowledgeInit` no branch cache-fresh) + fase-05 (ordem do registry)
**Visual:** false

---

## O que esta fase entrega

DOIS step modules + UMA extensao do contrato `StepReport`:

1. **`00_1-reuse-discovery.ts`** — porta Step reuse-discovery.0 (SKILL.md linhas 467-558).
   Inclui parse de `--reuse-discovery`/`--refresh`, branch cache-fresh com regen de
   `capabilities.json` + `parity-gaps.json` (graceful), audit entry, e early-exit via
   `skipRemaining: true`. Posicao no registry: SEGUNDA (apos `detect-legacy`, antes de
   `scaffold-full-tree`) — mesmo lugar onde o SKILL.md atual roda.

2. **`90-final-validation.ts`** — porta Step migrate.5 (SKILL.md linhas 83-98). Roda
   `bun run scripts/harness-validate.ts` via `Bun.spawn` e propaga exit code. Posicao no
   registry: ULTIMA (apos install-gh-files).

3. **Extensao em `skills/init/lib/steps/types.ts`** — campo opcional `skipRemaining?: boolean`
   em `StepReport`. Coordenacao com Plano 01 fase-01 (contrato originalmente nao tinha o campo).
   Mudanca aditiva, retro-compativel (default `undefined` = falsy).

4. **Modificacao em `skills/init/lib/run-init.ts`** — dispatcher checa `report.skipRemaining`
   apos cada step e `break` no loop quando true. Coordenacao com Plano 01 fase-02.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/types.ts` | Modify | Adicionar `skipRemaining?: boolean` em `StepReport` |
| `skills/init/lib/run-init.ts` | Modify | Loop do dispatcher checa `skipRemaining` e da break |
| `skills/init/lib/steps/00_1-reuse-discovery.ts` | Create | Step com flag parse + cache-fresh shortcut |
| `skills/init/lib/steps/90-final-validation.ts` | Create | Step que invoca `harness-validate.ts` |
| `skills/init/lib/registry.ts` | Modify | Inserir 00_1 entre detect-legacy e scaffold-full-tree; adicionar 90 no fim |
| `skills/init/lib/steps/00_1-reuse-discovery.test.ts` | Create | 4 testes: sem-flag, cache-stale, cache-fresh, parity-gaps-graceful |
| `skills/init/lib/steps/90-final-validation.test.ts` | Create | 2 testes (success exit 0 / fail exit !=0) |
| `skills/init/lib/steps/__fixtures__/reuse-discovery-fresh/discovery/agents-log.json` | Create | Audit log com timestamp recente |
| `skills/init/lib/steps/__fixtures__/reuse-discovery-stale/discovery/agents-log.json` | Create | Audit log antigo |

---

## Implementacao

### Passo 1: Estender o contrato em `types.ts`

```typescript
// skills/init/lib/steps/types.ts (modificacao)
export type StepReport = {
  mutated: boolean
  summary: string
  /**
   * Quando true, o dispatcher interrompe o loop do registry APOS este step (early-exit).
   * 2026-05-17 (Luiz/dev): introduzido para mapear `process.exit(0)` do reuse-discovery.0
   * (SKILL.md linha 550) sem usar AbortError (que carrega semantica de erro). PRD MH-04, CA-04.
   * Default: undefined (falsy) — comportamento anterior preservado.
   */
  skipRemaining?: boolean
}
```

> **Coordenacao com Plano 01:** se o Plano 01 ja foi executado antes desta fase, esta eh uma
> mudanca aditiva — sem impacto retroativo nos testes do Plano 01 (campo opcional). Se o Plano
> 01 ainda esta em planejamento quando esta fase rodar, sugerir incluir o campo ja na fase-01
> do Plano 01. NAO bloquear esta fase — basta editar `types.ts` aqui.

### Passo 2: Atualizar dispatcher `run-init.ts`

```typescript
// skills/init/lib/run-init.ts (snippet do loop — preserva resto do skeleton)
for (const step of reg) {
  try {
    const report = await step.run(ctx)
    log(report.summary)
    // 2026-05-17 (Luiz/dev): Plano 02 fase-06 — early-exit para reuse-discovery cache-fresh.
    if (report.skipRemaining === true) {
      break
    }
  } catch (e) {
    if (e instanceof AbortError) { ... } // (mantido — Plano 01 fase-02)
    throw e
  }
}
```

> Detalhe: re-ler o skeleton concreto produzido pelo Plano 01 fase-02 e patchear na linha
> certa. NAO reescrever o dispatcher inteiro.

### Passo 3: `00_1-reuse-discovery.ts`

A logica eh substancial (~50 linhas). Manter wording byte-identico das 3 strings de log
(SKILL.md linhas 502, 532, 552). Estrutura: parse flag -> se nao setado, retornar
`{ mutated: false, summary: '' }` (no-op); se setado, ler timestamp, decidir fresh/stale,
no fresh executa o trabalho + retorna `skipRemaining: true`; no stale executa `formatStaleMessage`
e fall-through.

```typescript
// skills/init/lib/steps/00_1-reuse-discovery.ts
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import {
  parseReuseDiscoveryFlag,
  readLastInitTimestamp,
  shouldReuseDiscovery,
  formatStaleMessage,
  resolveThresholdMs,
  tryRegenerateParityGaps,
  FRESH_THRESHOLD_MS,
} from '../reuse-discovery'
import { AuditLogWriter } from '../audit-log'
import { readArchitectureProfile } from '../../../lib/read-architecture-profile'
import { discoverCapabilities } from '../capabilities-writer'
import type { Step, StepReport } from './types'

export const reuseDiscoveryStep: Step = {
  id: 'reuse-discovery',
  async run(ctx): Promise<StepReport> {
    const { reuseDiscovery } = parseReuseDiscoveryFlag(ctx.args.slice())
    if (!reuseDiscovery) {
      // 2026-05-17 (Luiz/dev): no-op silencioso quando flag ausente. Preserva CA-01 (greenfield).
      return { mutated: false, summary: '' }
    }

    const startMs = Date.now()
    const projectRoot = ctx.cwd
    const cachedAt = await readLastInitTimestamp(projectRoot)
    const thresholdMs = resolveThresholdMs(process.env.ANTI_VIBE_FRESH_HOURS)

    if (!shouldReuseDiscovery(cachedAt, thresholdMs)) {
      // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 552 (PRD R1, G1).
      // Stale -> fall-through. NAO setar skipRemaining (dispatcher continua para Step 1 etc.).
      return { mutated: false, summary: formatStaleMessage(cachedAt) }
    }

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 502 (PRD R1, G1).
    const logLines: string[] = ['[reuse-discovery] cache fresh — running Step 7 only']

    // Inline Step 7 logic (capabilities-discovery) — NAO duplicar audit entry (G4 do SKILL).
    const profileObj = readArchitectureProfile()
    if (profileObj !== null) {
      const out = await discoverCapabilities(projectRoot, profileObj.profile)
      const capsPath = path.join(projectRoot, 'discovery', 'capabilities.json')
      await writeFile(capsPath, JSON.stringify(out, null, 2), 'utf-8')
    }

    // Regen parity-gaps com graceful degradation (PRD CA-04, DEC-2 v6.3.0).
    const parityResult = await tryRegenerateParityGaps(projectRoot, async () => {
      try {
        const inspector = await import('../../../lib/tool-registry-inspector')
        const writer = await import('../../../parity-audit/lib/parity-gaps-writer')
        return {
          inspectToolRegistry: inspector.inspectToolRegistry,
          computeParityGaps: writer.computeParityGaps,
          writeParityGaps: writer.writeParityGaps,
        }
      } catch {
        return null
      }
    })
    if (!parityResult.regenerated) {
      // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 532 (PRD R1, G1).
      logLines.push(`[reuse-discovery] parity-gaps.json skipped — ${parityResult.reason}`)
    }

    // Audit entry para reuse-discovery (separado de capabilities-discovery — G4 do SKILL).
    const cachedAtMs = cachedAt !== null ? Date.parse(cachedAt) : 0
    const writer = new AuditLogWriter(projectRoot, randomUUID())
    await writer.append({
      subagent_id: 'reuse-discovery',
      input_paths: ['discovery/agents-log.json'],
      output_struct: {
        cache_age_ms: Date.now() - cachedAtMs,
        cached_at: cachedAt,
        threshold_ms: FRESH_THRESHOLD_MS,
      },
      duration_ms: Date.now() - startMs,
      retry_count: 0,
    })

    // 2026-05-17 (Luiz/dev): skipRemaining mapeia process.exit(0) do SKILL.md linha 550 (PRD MH-04, CA-04).
    return { mutated: true, summary: logLines.join('\n'), skipRemaining: true }
  },
}
```

> **Conferir paths de import:** `readArchitectureProfile` e `tool-registry-inspector` ficam em
> `skills/init/../lib/` (lib raiz do plugin, NAO em `skills/init/lib/`). O SKILL.md usa
> `'../lib/read-architecture-profile.ts'` quando rodando da raiz do skill. Em arquivo TS dentro
> de `skills/init/lib/steps/`, o relativo correto eh `'../../../lib/read-architecture-profile'`.
> Confirmar com Glob antes do RED.

### Passo 4: `90-final-validation.ts`

O atual SKILL.md usa um bloco `bash` (linhas 88-98). Para portar como TS step, executar via
`Bun.spawn`. Wording dos 4 echos preservado byte-identico.

```typescript
// skills/init/lib/steps/90-final-validation.ts
import path from 'node:path'
import { AbortError } from './abort-error'
import type { Step } from './types'

export const finalValidationStep: Step = {
  id: 'final-validation',
  async run(ctx) {
    const scriptPath = path.join(ctx.cwd, 'scripts', 'harness-validate.ts')
    const proc = Bun.spawn(['bun', 'run', scriptPath], { cwd: ctx.cwd, stdout: 'inherit', stderr: 'inherit' })
    const exitCode = await proc.exited

    if (exitCode !== 0) {
      // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linhas 92-94 (PRD R1, G1).
      const reason = [
        'WARN: harness:validate failed after migration. Inspect output above.',
        'Backup is at .planning.v5-backup/ — to roll back: git revert HEAD && cp -r .planning.v5-backup/.planning ./',
      ].join('\n')
      throw new AbortError({ code: exitCode, reason })
    }

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linhas 96-97 (PRD R1, G1).
    const summary = [
      "Migration validated. Suggested commit: git commit -m 'chore: migrate to anti-vibe-coding v6.0.0'",
      'Add .planning.v5-backup/ to .gitignore (or delete after confirming all is well).',
    ].join('\n')
    return { mutated: false, summary }
  },
}
```

> **Conferir:** o SKILL.md atual usa bash `bun run scripts/harness-validate.ts` SEM
> `process.cwd()` explicito (bash herda cwd). `Bun.spawn` precisa de `cwd` explicito —
> passamos `ctx.cwd`. Mesmo efeito.

### Passo 5: Registry atualizado (ordem-alvo final do Plano 02)

```typescript
// skills/init/lib/registry.ts
import type { Step } from './steps/types'
import { detectLegacyStep } from './steps/00-detect-legacy'
import { reuseDiscoveryStep } from './steps/00_1-reuse-discovery'
import { scaffoldFullTreeStep } from './steps/01-scaffold-full-tree'
import { linkClaudeAgentsStep } from './steps/02-link-claude-agents'
import { detectStackAndRegisterStep } from './steps/03-detect-stack-and-register'
import { persistStackKnowledgeStep } from './steps/03_1-persist-stack-and-knowledge'
import { customizeArchitectureStep } from './steps/04-customize-architecture'
import { installGhFilesStep } from './steps/05-install-gh-files'
import { finalValidationStep } from './steps/90-final-validation'

// 2026-05-17 (Luiz/dev): ordem reflete a sequencia do SKILL.md atual (G4 do plano).
// Plano 03 ira inserir migrate.0/1/2/3/4 + migrate.all + step 6 + step 7 entre indices apropriados.
export const registry: readonly Step[] = [
  detectLegacyStep,
  reuseDiscoveryStep,
  scaffoldFullTreeStep,
  linkClaudeAgentsStep,
  detectStackAndRegisterStep,
  persistStackKnowledgeStep,
  customizeArchitectureStep,
  installGhFilesStep,
  finalValidationStep,
]
```

### Passo 6: Testes do reuse-discovery (`00_1-reuse-discovery.test.ts`)

Testar 4 cenarios. Os 2 primeiros (sem flag, cache stale) sao deterministicos via stub de FS.
Os 2 ultimos (cache fresh + parity graceful) precisam de mocks dos imports cross-skill — usar
DI ja existente nos helpers (`tryRegenerateParityGaps` aceita loader injetavel).

```typescript
// skills/init/lib/steps/00_1-reuse-discovery.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { reuseDiscoveryStep } from './00_1-reuse-discovery'

const ctx = (cwd: string, args: readonly string[] = []) => ({
  cwd, args, flags: {} as Readonly<Record<string, boolean | string>>,
})

describe('reuseDiscoveryStep', () => {
  let tmpDir: string
  afterEach(async () => { if (tmpDir) await rm(tmpDir, { recursive: true, force: true }) })

  test('no flag: returns empty no-op (does not set skipRemaining)', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'reuse-noflag-'))
    const r = await reuseDiscoveryStep.run(ctx(tmpDir, []))
    expect(r.mutated).toBe(false)
    expect(r.summary).toBe('')
    expect(r.skipRemaining).toBeFalsy()
  })

  test('--reuse-discovery with no cache: emits stale message and falls through', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'reuse-stale-'))
    const r = await reuseDiscoveryStep.run(ctx(tmpDir, ['--reuse-discovery']))
    expect(r.summary).toMatch(/no last-init timestamp|stale/i)
    expect(r.skipRemaining).toBeFalsy()
  })

  test('--refresh is alias of --reuse-discovery (DEC-2)', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'reuse-alias-'))
    const r = await reuseDiscoveryStep.run(ctx(tmpDir, ['--refresh']))
    // 2026-05-17 (Luiz/dev): mesmo comportamento de --reuse-discovery. PRD MH-04.
    expect(r.summary).toMatch(/no last-init timestamp|stale/i)
  })

  test('--reuse-discovery with FRESH cache: sets skipRemaining true', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'reuse-fresh-'))
    // 2026-05-17 (Luiz/dev): forja agents-log.json com timestamp recente.
    await mkdir(path.join(tmpDir, 'discovery'), { recursive: true })
    const now = new Date().toISOString()
    await writeFile(
      path.join(tmpDir, 'discovery', 'agents-log.json'),
      JSON.stringify({ run_id: 'test', started_at: now, entries: [] }, null, 2),
    )
    const r = await reuseDiscoveryStep.run(ctx(tmpDir, ['--reuse-discovery']))
    // 2026-05-17 (Luiz/dev): mesmo sem profile detectado, skipRemaining = true (G6 do plano).
    // discoverCapabilities/profile skip — audit ainda eh gravado. Summary contem o log de "cache fresh".
    expect(r.skipRemaining).toBe(true)
    expect(r.summary).toContain('[reuse-discovery] cache fresh — running Step 7 only')
  })
})
```

> **Importante — pre-requisitos para teste `cache FRESH`:**
> - `readLastInitTimestamp` precisa retornar string nao-null a partir do agents-log.json
>   forjado. Conferir formato esperado pelo helper (`started_at` na raiz? Em entry?).
>   Ajustar fixture conforme leitor.
> - `discoverCapabilities` precisa do `profileObj` — sem `architecture-profile.json` em
>   `.claude/`, retorna null e o branch eh pulado (apenas audit + skipRemaining). OK.

### Passo 7: Testes do final-validation (`90-final-validation.test.ts`)

Como o helper invoca `Bun.spawn(['bun', 'run', scripts/harness-validate.ts])`, mocking eh
mais dificil. Estrategia: criar fixture com `scripts/harness-validate.ts` stub que retorna
exit 0 OR exit 1. NAO testar o helper real — testar so o step.

```typescript
// skills/init/lib/steps/90-final-validation.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { finalValidationStep } from './90-final-validation'
import { AbortError } from './abort-error'

const ctx = (cwd: string) => ({ cwd, args: [] as readonly string[], flags: {} as Readonly<Record<string, boolean | string>> })

async function setupTmp(scriptBody: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'validate-test-'))
  await mkdir(path.join(dir, 'scripts'), { recursive: true })
  await writeFile(path.join(dir, 'scripts', 'harness-validate.ts'), scriptBody)
  return dir
}

describe('finalValidationStep', () => {
  let tmpDir: string
  afterEach(async () => { if (tmpDir) await rm(tmpDir, { recursive: true, force: true }) })

  test('success (exit 0): returns summary with commit suggestion', async () => {
    tmpDir = await setupTmp('process.exit(0)\n')
    const r = await finalValidationStep.run(ctx(tmpDir))
    expect(r.mutated).toBe(false)
    const lines = r.summary.split('\n')
    expect(lines[0]).toBe("Migration validated. Suggested commit: git commit -m 'chore: migrate to anti-vibe-coding v6.0.0'")
    expect(lines[1]).toBe('Add .planning.v5-backup/ to .gitignore (or delete after confirming all is well).')
  })

  test('failure (exit non-zero): throws AbortError with rollback reason', async () => {
    tmpDir = await setupTmp('process.exit(2)\n')
    try {
      await finalValidationStep.run(ctx(tmpDir))
      throw new Error('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(AbortError)
      if (e instanceof AbortError) {
        expect(e.code).toBe(2)
        const lines = e.reason.split('\n')
        expect(lines[0]).toBe('WARN: harness:validate failed after migration. Inspect output above.')
        expect(lines[1]).toBe('Backup is at .planning.v5-backup/ — to roll back: git revert HEAD && cp -r .planning.v5-backup/.planning ./')
      }
    }
  })
})
```

### Passo 8: Paranoia grep contra SKILL.md (G1)

```bash
grep -F '[reuse-discovery] cache fresh — running Step 7 only' skills/init/SKILL.md
grep -F '[reuse-discovery] parity-gaps.json skipped' skills/init/SKILL.md
grep -F 'WARN: harness:validate failed after migration.' skills/init/SKILL.md
grep -F "Migration validated. Suggested commit: git commit -m 'chore: migrate to anti-vibe-coding v6.0.0'" skills/init/SKILL.md
grep -F 'Add .planning.v5-backup/ to .gitignore (or delete after confirming all is well).' skills/init/SKILL.md
grep -F 'Backup is at .planning.v5-backup/ — to roll back: git revert HEAD && cp -r .planning.v5-backup/.planning ./' skills/init/SKILL.md
```

Todos exit 0 — comprovando byte-identicality antes do cutover.

---

## Gotchas

- **G1 do plano (wording byte-identico):** SEIS strings simultaneas (5 do reuse-discovery + 4 do
  final-validation). Erros faceis: em-dash em vez de hifen duplo, aspas simples em vez de
  duplas no `git commit`, ponto final faltante.
- **G2 do plano (helpers preservados):** `reuse-discovery.ts`, `parse-refresh-flag.ts`, `audit-log.ts`,
  `read-architecture-profile`, `capabilities-writer.ts`, `tool-registry-inspector`,
  `parity-gaps-writer` NAO modificados.
- **G3 do plano (imports estaticos):** O loader injetavel em `tryRegenerateParityGaps` PRECISA
  ser `async () => ...` com `await import` dentro — eh ASSIM que o helper foi desenhado
  (graceful degradation). Excessao DOCUMENTADA: este eh o unico `await import` permitido em
  todo o Plano 02, e ele esta DENTRO de um callback do contrato do helper, nao no boundary
  do step.
- **G6 do plano (`skipRemaining`):** mudanca aditiva. Se Plano 01 fase-01 nao previu o campo,
  esta fase eh quem adiciona. Documentar no MEMORY.md ao executar.
- **Local — `parseReuseDiscoveryFlag` espera `string[]`:** o helper foi escrito para receber
  args parseados. `ctx.args` ja eh `readonly string[]`. `.slice()` retorna um array mutavel
  (assinatura do helper aceita ambos via TS, mas seguro de qualquer forma).
- **Local — Audit log eh side-effect:** mesmo no cenario "skipRemaining true sem profile",
  o audit entry eh gravado. NAO eh idempotente — cada chamada cria UMA entry. Aceitavel
  (preserva CA-04, AuditLogWriter eh append-only).
- **Local — `Bun.spawn` em final-validation:** depende de Bun. NAO portar para `child_process`
  agora (over-engineering — Bun ja eh runtime obrigatorio do projeto).
- **Local — `scripts/harness-validate.ts` precisa existir:** se nao existir no projeto-alvo,
  `Bun.spawn` falha. O Plano 01 fase-01 presumivelmente NAO cria esse arquivo. Confirmar
  o estado do helper no SKILL.md atual — provavelmente ja existe em `scripts/`. Glob antes
  do RED.

---

## Verificacao

### TDD

- [ ] **RED:** Testes escritos antes dos steps. Falham por modulo nao encontrado.
- [ ] **GREEN:** Steps + dispatcher patch + types extension + registry. Testes passam.

### Checklist

- [ ] `types.ts` atualizado com `skipRemaining?: boolean` (campo opcional)
- [ ] `run-init.ts` checa `report.skipRemaining === true` e da `break`
- [ ] `00_1-reuse-discovery.ts` criado, exporta `reuseDiscoveryStep`
- [ ] `90-final-validation.ts` criado, exporta `finalValidationStep`
- [ ] `registry.ts` com 9 entradas em ordem (G4 do plano)
- [ ] 2 fixtures + alguns goldens (referencia humana) — opcional dado que testes ja sao stricter
- [ ] 4 testes de reuse-discovery passam (sem-flag, stale, alias --refresh, fresh+skipRemaining)
- [ ] 2 testes de final-validation passam (success + AbortError)
- [ ] Testes ANTERIORES do Plano 01 e fases 01-05 deste plano continuam passando
- [ ] Helpers ALL preservados (paranoia: 7 paths verificados)
- [ ] `SKILL.md` NAO modificado
- [ ] Paranoia grep: 6 strings encontradas (exit 0)
- [ ] NUNCA `bun -e`. `await import` SOMENTE dentro do callback de `tryRegenerateParityGaps`
      (documentado no codigo)
- [ ] Lint limpo

---

## Criterio de Aceite

`reuse-discovery` e `final-validation` portados, contrato `StepReport` estendido com
`skipRemaining`, dispatcher patcheado para honrar a flag. Wording byte-identico das 6 strings
criticas validado por grep contra SKILL.md.

**Por maquina:**
- `bun run test skills/init/lib/steps/` exit 0 com testes acumulados de Plano 01 + Plano 02 (>= 30 testes)
- `git diff --stat skills/init/SKILL.md skills/init/lib/reuse-discovery.ts skills/init/lib/parse-refresh-flag.ts skills/init/lib/audit-log.ts` retorna 0 arquivos
- `grep -c 'skipRemaining' skills/init/lib/run-init.ts` retorna >= 1
- `grep -rn 'bun -e' skills/init/lib/steps/ --include='*.ts'` retorna 0 matches
- `grep -rn 'await import' skills/init/lib/steps/ --include='*.ts'` retorna SOMENTE 1 ocorrencia
  (dentro do callback de `tryRegenerateParityGaps` em `00_1-reuse-discovery.ts`)

**Por humano:**
- Inspecao visual: as 6 strings comparadas com SKILL.md batem caractere a caractere

---

<!-- Gerado por /plan-feature em 2026-05-17 -->
