<!--
Princípio universal #5 — Comment Provenance. Aplicar em comentarios de codigo
de runtime usuario-facing. Helpers TS internos seguem JSDoc; sem repeticao.
-->

# Fase 04: Step 07 — `discover-existing-docs` (integracao registry + cross-check secrets)

**Plano:** 03 — Discovery Pipeline (secrets + docs + classifier)
**Sizing:** 0.5h
**Depende de:** fase-02 (le `secrets-scan-result.json` via discovery-store), fase-03 (consome `discoverExistingDocs` + `DiscoveredDoc`)
**Visual:** false

---

## O que esta fase entrega

Step `discoverExistingDocsStep` (id `07-discover-existing-docs`) que executa `discoverExistingDocs(ctx.cwd)`, faz cross-check com `secrets-scan-result.json` (do Step 06) para flagar arquivos `blockedBySecret: true` sem excluir da lista, persiste em `.anti-vibe/discovery/discovered-docs.json` e retorna `mutated: false`. Step entra no registry APOS `secretsScanStep` e ANTES de `migrate0ParseDryRunStep`. Inclui medicao `performance.now()` antecipando CA-15 (sem cobrir 500 arquivos ainda — esse fixture grande fica no Plano 07 fase-05).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/07-discover-existing-docs.ts` | Create | Implementa `discoverExistingDocsStep: Step`. Le `secrets-scan-result.json` (se existir), cruza paths, marca `blockedBySecret`. Persiste `discovered-docs.json`. |
| `skills/init/lib/steps/07-discover-existing-docs.test.ts` | Create | 4 testes: (1) discovery vazio, (2) com flag `blockedBySecret`, (3) sem secrets-scan prévio (graceful), (4) integracao registry. |
| `skills/init/lib/registry.ts` | Modify | Adicionar `discoverExistingDocsStep` apos `secretsScanStep`. |

---

## Implementacao

### Passo 1: Tipos do resultado persistido

```typescript
// skills/init/lib/steps/07-discover-existing-docs.ts
import path from 'node:path'
import type { Step, StepContext, StepReport } from './types'
import { discoverExistingDocs, type DiscoveredDoc } from '../discover-existing-docs'
import { readDiscoveryArtifact, writeDiscoveryArtifact } from '../discovery-store'

export type DiscoveredDocWithFlags = DiscoveredDoc & {
  /** True quando relativePath aparece em secrets-scan-result.json blockedFiles. */
  readonly blockedBySecret: boolean
}

export type DiscoverExistingDocsResult = {
  readonly subagent_id: 'init-discover-existing-docs'
  readonly docs: readonly DiscoveredDocWithFlags[]
  readonly blockedCount: number
  readonly durationMs: number
}

type SecretsScanResultShape = {
  readonly blockedFiles: ReadonlyArray<{ readonly relativePath: string }>
}
```

### Passo 2: Cross-check secrets

```typescript
async function loadBlockedSet(cwd: string): Promise<ReadonlySet<string>> {
  const result = await readDiscoveryArtifact<SecretsScanResultShape>(cwd, 'secrets-scan-result')
  if (result === null) return new Set()
  return new Set(result.blockedFiles.map((b) => b.relativePath))
}
```

> **Graceful degradation:** se `secrets-scan-result.json` nao existe (cenario impossivel em runtime real porque Step 06 roda antes, mas possivel em test isolado), o Set fica vazio e nenhum arquivo eh flagado — Step 07 ainda funciona. Test #3 cobre.

### Passo 3: Implementar `discoverExistingDocsStep`

```typescript
export const discoverExistingDocsStep: Step = {
  id: '07-discover-existing-docs',

  async run(ctx: StepContext): Promise<StepReport> {
    const startedAt = performance.now()
    const [rawDocs, blockedSet] = await Promise.all([
      discoverExistingDocs(ctx.cwd),
      loadBlockedSet(ctx.cwd),
    ])

    const docs: DiscoveredDocWithFlags[] = rawDocs.map((d) => ({
      ...d,
      blockedBySecret: blockedSet.has(d.relativePath),
    }))

    const blockedCount = docs.reduce((n, d) => n + (d.blockedBySecret ? 1 : 0), 0)
    const durationMs = Math.round(performance.now() - startedAt)

    const result: DiscoverExistingDocsResult = {
      subagent_id: 'init-discover-existing-docs',
      docs,
      blockedCount,
      durationMs,
    }

    const noWrite = ctx.flags['dry-run'] === true
    await writeDiscoveryArtifact(ctx.cwd, 'discovered-docs', result, { noWrite })

    return {
      mutated: false,
      summary: `discover-existing-docs [init-discover-existing-docs]: ${docs.length} arquivos encontrados (${blockedCount} bloqueados por secrets) — ${durationMs}ms`,
    }
  },
}
```

### Passo 4: Integrar no registry

```typescript
// skills/init/lib/registry.ts (diff incremental sobre fase-02)
+ import { discoverExistingDocsStep } from './steps/07-discover-existing-docs'

export const registry: readonly Step[] = [
  detectLegacyStep,
  reuseDiscoveryStep,
  secretsScanStep,
+ discoverExistingDocsStep,     // 2026-05-18 (Luiz/dev): Plano 03 fase-04 — discover apos secrets-scan; emite lista flagada (D5, SH-02, D6).
  // Plano 03 fase-06 inserira classifyBlocksHybridStep aqui.
  migrate0ParseDryRunStep,
  ...
]
```

### Passo 5: Testes pareados

```typescript
// skills/init/lib/steps/07-discover-existing-docs.test.ts
import { expect, test, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { discoverExistingDocsStep } from './07-discover-existing-docs'
import { writeDiscoveryArtifact, readDiscoveryArtifact } from '../discovery-store'
import { registry } from '../registry'

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'init-discover-'))
}

async function touch(file: string, content: string = ''): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, content)
}

describe('discoverExistingDocsStep', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('id contratual estavel', () => {
    expect(discoverExistingDocsStep.id).toBe('07-discover-existing-docs')
  })

  test('discovery vazio retorna 0 docs e 0 blocked', async () => {
    const report = await discoverExistingDocsStep.run({ cwd: tmp, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('0 arquivos encontrados')
    expect(report.summary).toContain('0 bloqueados')
  })

  test('com secrets-scan previo, flag blockedBySecret eh propagada', async () => {
    await touch(path.join(tmp, 'docs', 'STRIPE.md'), 'sk_live_xxxxx')
    await touch(path.join(tmp, 'docs', 'CLEAN.md'), '# limpo')

    // Simula Step 06 ja tendo rodado:
    await writeDiscoveryArtifact(tmp, 'secrets-scan-result', {
      subagent_id: 'init-secrets-scan',
      scannedCount: 2,
      blockedFiles: [{ relativePath: 'docs/STRIPE.md', matches: [] }],
      durationMs: 1,
    })

    const report = await discoverExistingDocsStep.run({ cwd: tmp, args: [], flags: {} })
    expect(report.summary).toContain('2 arquivos encontrados')
    expect(report.summary).toContain('1 bloqueados')

    const persisted = await readDiscoveryArtifact<{
      docs: ReadonlyArray<{ relativePath: string; blockedBySecret: boolean }>
    }>(tmp, 'discovered-docs')
    const stripe = persisted?.docs.find((d) => d.relativePath === 'docs/STRIPE.md')
    const clean = persisted?.docs.find((d) => d.relativePath === 'docs/CLEAN.md')
    expect(stripe?.blockedBySecret).toBe(true)
    expect(clean?.blockedBySecret).toBe(false)
  })

  test('sem secrets-scan-result.json previo, todos blockedBySecret=false (graceful)', async () => {
    await touch(path.join(tmp, 'docs', 'A.md'), '# a')
    const report = await discoverExistingDocsStep.run({ cwd: tmp, args: [], flags: {} })
    expect(report.summary).toContain('0 bloqueados')
  })

  test('README da raiz NAO entra na lista (D6)', async () => {
    await touch(path.join(tmp, 'README.md'), '# raiz')
    await touch(path.join(tmp, 'docs', 'real.md'), '# real')
    const report = await discoverExistingDocsStep.run({ cwd: tmp, args: [], flags: {} })
    expect(report.summary).toContain('1 arquivos encontrados')
  })

  test('registry: discoverExistingDocsStep apos secretsScanStep, antes de migrate0', () => {
    const ids = registry.map((s) => s.id)
    const idxDiscover = ids.indexOf('07-discover-existing-docs')
    const idxSecrets = ids.indexOf('06-secrets-scan')
    const idxMigrate0 = ids.indexOf('09-migrate-0-parse-dry-run') // ajustar conforme id real
    expect(idxDiscover).toBe(idxSecrets + 1)
    expect(idxDiscover).toBeLessThan(idxMigrate0)
  })

  test('performance budget — 50 arquivos < 5s (proxy para CA-15)', async () => {
    for (let i = 0; i < 50; i++) {
      await touch(path.join(tmp, 'docs', `f${i}.md`), '# x')
    }
    const start = performance.now()
    await discoverExistingDocsStep.run({ cwd: tmp, args: [], flags: {} })
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(5000)
    // TODO Plano 07 fase-05: fixture com 500 arquivos para CA-15 (<120s no init completo --dry-run).
  })
})
```

> **Por que 50 arquivos e nao 500:** CA-15 mede 500 .md no init completo `--dry-run` (Plano 07 fase-05 controla esse fixture grande). Aqui validamos apenas a ordem de grandeza local (5s para 50) para detectar regressao precoce no walker. Marker `// TODO Plano 07 fase-05` documenta o handoff.

---

## Gotchas

- **G1 do plano (blacklist):** A fase-03 ja aplica blacklist canonica. Este step nao re-implementa filtros — apenas le `DiscoveredDoc[]` e enriquece com flag.
- **G2 do plano (README intocavel):** Teste #5 desta fase confirma que README da raiz NAO aparece no resultado do step. Fase-03 ja garante; este teste eh redundancia defensiva — README aparecer aqui seria regressao seria (quebraria CA-08 do PRD).
- **G3 do plano (ordem):** Test #6 asserta `idxDiscover === idxSecrets + 1` (adjacencia direta) — secrets-scan e discover-existing-docs sao consecutivos. Plano 04 fase-06 reorder afeta Step 02/10 em outra regiao do registry; nao colide.
- **G8 do plano (`--dry-run`):** Step respeita `ctx.flags['dry-run']` para `noWrite` (via discovery-store). Plano 05 fase-01 conecta o parse de args canonico.
- **G9 do plano (audit log):** `summary` carrega `[init-discover-existing-docs]` literal. Plano 06 fase-01 substitui por `AuditLogWriter.append({ subagent_id: 'init-discover-existing-docs', ... })`.
- **Local (`Promise.all` para reduzir latencia):** discover-docs + load-blocked sao I/O independentes. `Promise.all` evita serializacao desnecessaria. Em projeto pequeno o ganho eh imperceptivel; em projeto medio (100+ .md) reduz ~50ms.
- **Local (`blockedBySecret` NAO exclui da lista):** Decisao deliberada — Step 08 (fase-06) ainda recebe o doc na entrada e decide pular classificacao. Plano 04 fase-02 (`propose-merge-batch`) mostra os bloqueados no diff agregado para que o dev veja explicitamente "1 arquivo bloqueado por secrets" (CA-04 cita exatamente essa UX).

---

## Verificacao

### TDD

- [ ] **RED:** todos os 7 testes do passo 5 escritos antes da implementacao. Comando: `bun test skills/init/lib/steps/07-discover-existing-docs.test.ts` — resultado esperado: erros de modulo/assertion.
- [ ] **GREEN:** implementacao dos passos 1-3 + integracao registry (passo 4). Comando: `bun test skills/init/lib/steps/07-discover-existing-docs.test.ts` — todos pass.
- [ ] **REFACTOR:** se `loadBlockedSet` for util tambem na fase-06, extrair para `discovery-store.ts` como `loadBlockedRelativePaths`. Decisao tomada na hora — pode ficar duplicado por agora.

### Checklist

- [ ] `discoverExistingDocsStep.id === '07-discover-existing-docs'`.
- [ ] Step esta no registry, posicao [secretsScanStep + 1].
- [ ] Cross-check com `secrets-scan-result.json` NAO exclui arquivo da lista — apenas flagga.
- [ ] README da raiz nunca aparece no resultado (test #5 + propriedade herdada da fase-03).
- [ ] `mutated: false` em todos os caminhos.
- [ ] `discovered-docs.json` eh escrito com schema `{ subagent_id, docs, blockedCount, durationMs }`.
- [ ] Performance proxy (50 arquivos < 5s) passa.
- [ ] `bun test skills/init/lib/steps/07-discover-existing-docs.test.ts skills/init/lib/registry.test.ts` 0 falhas.
- [ ] `bun run lint` clean.

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/steps/07-discover-existing-docs.test.ts` exit 0.
- `bun test skills/init/lib/registry.test.ts` exit 0.
- `grep -c "discoverExistingDocsStep" skills/init/lib/registry.ts` retorna `2` (1 import + 1 entrada).
- Test #6 (registry adjacencia) passa.

**Por humano:**
- Reviewer le `07-discover-existing-docs.ts` em ~3 minutos e consegue explicar: (1) por que `blockedBySecret` flagga mas nao exclui, (2) por que `loadBlockedSet` eh graceful, (3) onde Plano 07 fase-05 conecta o teste de 500 arquivos.

---

## Decisoes Aplicadas

- **D5 do PRD** (raiz + `/docs/` + `.claude/`): herdado da fase-03 lib.
- **D6 do PRD** (README intocavel — raiz): test #5 redundancia defensiva.
- **D14 do PRD** (filosoficos nao populam): este step descobre `COMPOUND_ENGINEERING.md` e `PRODUCT_SENSE.md` se existirem no projeto-alvo (sao docs.md como qualquer outro), MAS a fase-05/06 classifier exclui esses paths como `HarnessCategory`. Aqui apenas listamos.
- **D16 do PRD** (secrets antes de move): cross-check exige Step 06 ter rodado antes; ordem do registry garante.
- **D18 do PRD** (`--dry-run` global): step respeita `noWrite` no discovery-store.
- **D19 + SH-07 do PRD** (audit log subagent_id): literal `init-discover-existing-docs` no `summary` + `subagent_id` no payload persistido.
- **SH-02 do PRD** (discover-existing-docs no registry): step integrado, posicao 7 no registry pos-reuse-discovery.
- **CA-15 do PRD** (performance <120s em 500 .md): test proxy (50 arquivos < 5s) detecta regressao; fixture grande em Plano 07 fase-05.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
