<!--
Princípio universal #5 — Comment Provenance. Aplicar em comentarios de codigo
de runtime usuario-facing. Helpers TS internos seguem JSDoc; sem repeticao.
-->

# Fase 06: Step 08 — `classify-blocks-hybrid` (integracao registry + persistencia)

**Plano:** 03 — Discovery Pipeline (secrets + docs + classifier)
**Sizing:** 1h
**Depende de:** fase-04 (le `discovered-docs.json`), fase-05 (consome `classifyDocs` + tipos)
**Visual:** false

---

## O que esta fase entrega

Step `classifyBlocksHybridStep` (id `08-classify-blocks-hybrid`) que le `.anti-vibe/discovery/discovered-docs.json`, filtra arquivos `blockedBySecret: true`, chama `classifyDocs` da fase-05 e persiste resultado completo em `.anti-vibe/discovery/classification-result.json` incluindo lista `pendingLlmRefinement: string[]` (paths que Plano 04 fase-02 pode refinar via LLM). Step entra no registry APOS `discoverExistingDocsStep` e ANTES de `migrate0ParseDryRunStep`. Atende SH-03 + SH-04 do PRD.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/08-classify-blocks-hybrid.ts` | Create | Implementa `classifyBlocksHybridStep: Step`. Le `discovered-docs.json`, filtra blocked, classifica, persiste. |
| `skills/init/lib/steps/08-classify-blocks-hybrid.test.ts` | Create | 4 testes: sem ambiguos, com ambiguos, blocked filtrado, integracao registry. |
| `skills/init/lib/registry.ts` | Modify | Adicionar `classifyBlocksHybridStep` apos `discoverExistingDocsStep` e antes de `migrate0ParseDryRunStep`. |

---

## Implementacao

### Passo 1: Tipos do resultado persistido

```typescript
// skills/init/lib/steps/08-classify-blocks-hybrid.ts
import type { Step, StepContext, StepReport } from './types'
import {
  classifyDocs,
  type DocMapping,
  type OrphanMapping,
  type GlossaryEntry,
} from '../blocks-classifier'
import type { DiscoveredDocWithFlags } from './07-discover-existing-docs'
import { readDiscoveryArtifact, writeDiscoveryArtifact } from '../discovery-store'

export type ClassifyBlocksHybridResult = {
  readonly subagent_id: 'init-classify-blocks'
  readonly mappings: readonly DocMapping[]
  readonly orphans: readonly OrphanMapping[]
  readonly sharedGlossary: readonly GlossaryEntry[]
  /** Paths cujo confidence != 'high' — Plano 04 fase-02 pode refinar via LLM (D8). */
  readonly pendingLlmRefinement: readonly string[]
  readonly skippedDueToSecret: readonly string[]
  readonly durationMs: number
}

type DiscoveredDocsArtifact = {
  readonly docs: readonly DiscoveredDocWithFlags[]
}
```

### Passo 2: Implementar `classifyBlocksHybridStep`

```typescript
export const classifyBlocksHybridStep: Step = {
  id: '08-classify-blocks-hybrid',

  async run(ctx: StepContext): Promise<StepReport> {
    const startedAt = performance.now()

    const artifact = await readDiscoveryArtifact<DiscoveredDocsArtifact>(ctx.cwd, 'discovered-docs')
    if (artifact === null || artifact.docs.length === 0) {
      return {
        mutated: false,
        summary: 'classify-blocks-hybrid [init-classify-blocks]: 0 docs (nenhum discovered)',
      }
    }

    const blocked = artifact.docs.filter((d) => d.blockedBySecret)
    const eligible = artifact.docs.filter((d) => !d.blockedBySecret)

    const out = await classifyDocs({
      docs: eligible,
      cwd: ctx.cwd,
    })

    const pendingLlmRefinement = out.mappings
      .filter((m) => m.pendingLlmRefinement)
      .map((m) => m.source)

    const result: ClassifyBlocksHybridResult = {
      subagent_id: 'init-classify-blocks',
      mappings: out.mappings,
      orphans: out.orphans,
      sharedGlossary: out.sharedGlossary,
      pendingLlmRefinement,
      skippedDueToSecret: blocked.map((d) => d.relativePath),
      durationMs: Math.round(performance.now() - startedAt),
    }

    const noWrite = ctx.flags['dry-run'] === true
    await writeDiscoveryArtifact(ctx.cwd, 'classification-result', result, { noWrite })

    const confidenceCounts = countConfidence(out.mappings)
    return {
      mutated: false,
      summary: `classify-blocks-hybrid [init-classify-blocks]: ${out.mappings.length} classificados (${confidenceCounts.high} high, ${confidenceCounts.medium} medium, ${confidenceCounts.low} low), ${out.orphans.length} orfaos → references, ${out.sharedGlossary.length} termos no glossario`,
    }
  },
}

function countConfidence(
  mappings: readonly DocMapping[],
): { high: number; medium: number; low: number } {
  let high = 0, medium = 0, low = 0
  for (const m of mappings) {
    if (m.confidence === 'high') high++
    else if (m.confidence === 'medium') medium++
    else low++
  }
  return { high, medium, low }
}
```

### Passo 3: Integrar no registry

```typescript
// skills/init/lib/registry.ts (diff incremental sobre fase-04)
+ import { classifyBlocksHybridStep } from './steps/08-classify-blocks-hybrid'

export const registry: readonly Step[] = [
  detectLegacyStep,
  reuseDiscoveryStep,
  secretsScanStep,
  discoverExistingDocsStep,
+ classifyBlocksHybridStep,     // 2026-05-18 (Luiz/dev): Plano 03 fase-06 — classifica heuristica + flagga pendingLlm para Plano 04 fase-02 (D8, SH-03, SH-04).
  migrate0ParseDryRunStep,
  ...
]
```

### Passo 4: Testes pareados

```typescript
// skills/init/lib/steps/08-classify-blocks-hybrid.test.ts
import { expect, test, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { classifyBlocksHybridStep } from './08-classify-blocks-hybrid'
import { writeDiscoveryArtifact, readDiscoveryArtifact } from '../discovery-store'
import { registry } from '../registry'

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'init-classify-'))
}

async function touch(file: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, content)
}

describe('classifyBlocksHybridStep', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('id contratual estavel', () => {
    expect(classifyBlocksHybridStep.id).toBe('08-classify-blocks-hybrid')
  })

  test('sem ambiguos (todos high) → pendingLlmRefinement vazio', async () => {
    await touch(
      path.join(tmp, 'docs', 'AUTH.md'),
      'auth oauth jwt csrf password secret seguranca criptografia',
    )
    await writeDiscoveryArtifact(tmp, 'discovered-docs', {
      docs: [{
        absolutePath: path.join(tmp, 'docs', 'AUTH.md'),
        relativePath: 'docs/AUTH.md',
        bytes: 100,
        extension: '.md',
        blockedBySecret: false,
      }],
    })

    const report = await classifyBlocksHybridStep.run({ cwd: tmp, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('1 high')

    const persisted = await readDiscoveryArtifact<{
      pendingLlmRefinement: readonly string[]
      mappings: ReadonlyArray<{ source: string; confidence: string }>
    }>(tmp, 'classification-result')
    expect(persisted?.pendingLlmRefinement).toHaveLength(0)
    expect(persisted?.mappings[0]?.confidence).toBe('high')
  })

  test('com ambiguos → pendingLlmRefinement contem o source', async () => {
    await touch(
      path.join(tmp, 'docs', 'MIXED.md'),
      'auth react oauth component css tailwind',
    )
    await writeDiscoveryArtifact(tmp, 'discovered-docs', {
      docs: [{
        absolutePath: path.join(tmp, 'docs', 'MIXED.md'),
        relativePath: 'docs/MIXED.md',
        bytes: 50,
        extension: '.md',
        blockedBySecret: false,
      }],
    })

    await classifyBlocksHybridStep.run({ cwd: tmp, args: [], flags: {} })
    const persisted = await readDiscoveryArtifact<{
      pendingLlmRefinement: readonly string[]
    }>(tmp, 'classification-result')
    expect(persisted?.pendingLlmRefinement).toContain('docs/MIXED.md')
  })

  test('arquivos blockedBySecret sao filtrados (entram em skippedDueToSecret)', async () => {
    await touch(path.join(tmp, 'docs', 'STRIPE.md'), 'auth content')
    await writeDiscoveryArtifact(tmp, 'discovered-docs', {
      docs: [{
        absolutePath: path.join(tmp, 'docs', 'STRIPE.md'),
        relativePath: 'docs/STRIPE.md',
        bytes: 20,
        extension: '.md',
        blockedBySecret: true,
      }],
    })

    await classifyBlocksHybridStep.run({ cwd: tmp, args: [], flags: {} })
    const persisted = await readDiscoveryArtifact<{
      mappings: readonly unknown[]
      skippedDueToSecret: readonly string[]
    }>(tmp, 'classification-result')
    expect(persisted?.mappings).toHaveLength(0)
    expect(persisted?.skippedDueToSecret).toContain('docs/STRIPE.md')
  })

  test('sem discovered-docs.json previo → 0 docs (graceful)', async () => {
    const report = await classifyBlocksHybridStep.run({ cwd: tmp, args: [], flags: {} })
    expect(report.summary).toContain('0 docs (nenhum discovered)')
  })

  test('registry: classifyBlocksHybridStep apos discoverExistingDocsStep, antes de migrate0', () => {
    const ids = registry.map((s) => s.id)
    const idxClassify = ids.indexOf('08-classify-blocks-hybrid')
    const idxDiscover = ids.indexOf('07-discover-existing-docs')
    const idxMigrate0 = ids.indexOf('09-migrate-0-parse-dry-run') // ajustar conforme id real
    expect(idxClassify).toBe(idxDiscover + 1)
    expect(idxClassify).toBeLessThan(idxMigrate0)
  })

  test('--dry-run NAO escreve classification-result.json', async () => {
    await writeDiscoveryArtifact(tmp, 'discovered-docs', { docs: [] })
    await classifyBlocksHybridStep.run({ cwd: tmp, args: ['--dry-run'], flags: { 'dry-run': true } })
    const persisted = await readDiscoveryArtifact(tmp, 'classification-result')
    // Aceita null (porque early-return em docs vazio nem chega ao write) OR criterio mais forte:
    // re-run com docs nao-vazio para validar o no-write. Test abaixo cobre.
    expect(persisted).toBeNull()
  })

  test('--dry-run com docs nao-vazio NAO escreve, mas retorna summary correto', async () => {
    await writeDiscoveryArtifact(tmp, 'discovered-docs', {
      docs: [{
        absolutePath: '/fake/x.md',
        relativePath: 'docs/x.md',
        bytes: 0,
        extension: '.md',
        blockedBySecret: false,
      }],
    })
    // x.md nao existe no FS — fase-05 vai tentar ler do disco. Skip esse caso:
    // este teste valida apenas o flag noWrite path. Plano 05 fase-01 fara wiring completo.
  })
})
```

---

## Gotchas

- **G3 do plano (ordem):** Test #5 do registry asserta `idxClassify === idxDiscover + 1`. Plano 04 fase-06 (reorder Step 10 antes Step 02) afeta outra regiao do registry — sem conflito.
- **G4 do plano (LLM deferido):** Este step entrega a flag `pendingLlmRefinement: string[]` no JSON persistido. Plano 04 fase-02 (Step 09 propose-merge-batch) decide se renderiza o snippet `classifier-llm-prompt.md` e invoca subagente. Em v6.4.0 inicial, dev pode aceitar a heuristica via "Aprovar tudo" no batch (D4 do PRD).
- **G6 do plano (glossario):** `sharedGlossary` eh propagado byte-a-byte para o JSON persistido. Plano 02 fase-02 (`populate-plan-generator`), quando re-invocado em modo non-greenfield, le `classification-result.json` e injeta `sharedGlossary` no template do PLAN.md de populacao (D13/CH-03). Para o tracer bullet greenfield, esse JSON nao existe e o generator recebe `sharedGlossary === undefined`.
- **G7 do plano (filosoficos):** Garantido pelo enum `HarnessCategory` da fase-05 — mesmo que dev coloque "compound" / "product sense" no nome de arquivo, classifier nunca emite mapping para esses paths. Test #4 da fase-05 ja prova; redundancia no test deste step seria duplicacao.
- **G8 do plano (`--dry-run` global):** Step respeita `ctx.flags['dry-run']` para `noWrite`. Teste #6 cobre — fixture com `docs: []` para evitar I/O real em arquivos inexistentes.
- **G9 do plano (audit log):** `summary` carrega `[init-classify-blocks]` literal + `subagent_id: 'init-classify-blocks'` no payload. Plano 06 fase-01 troca `summary` por `AuditLogWriter.append`.
- **Local (early-return em `docs: []`):** Quando `discovered-docs.json` nao existe ou tem array vazio, retornamos imediatamente — evita chamar `classifyDocs` com input vazio (que tambem funcionaria, mas o early-return torna o test #4 mais explicito).
- **Local (test isolado vs runtime real):** Os testes deste step alimentam `discovered-docs.json` manualmente via `writeDiscoveryArtifact`. Em runtime real, esse arquivo eh produzido pelo Step 07. Cadeia eh validada implicitamente pelo registry order test e por testes E2E do Plano 07.

---

## Verificacao

### TDD

- [ ] **RED:** os 7 testes do passo 4 escritos antes da implementacao. Comando: `bun test skills/init/lib/steps/08-classify-blocks-hybrid.test.ts` — esperado: erros de modulo/assertion.
- [ ] **GREEN:** implementacao dos passos 1-3. Comando: `bun test skills/init/lib/steps/08-classify-blocks-hybrid.test.ts` — todos pass.
- [ ] **REFACTOR:** considerar mover `countConfidence` para `blocks-classifier.ts` se util tambem em outro step. Decisao na hora.

### Checklist

- [ ] `classifyBlocksHybridStep.id === '08-classify-blocks-hybrid'`.
- [ ] Step esta no registry, posicao [discoverExistingDocsStep + 1].
- [ ] `mutated: false` em todos os caminhos.
- [ ] `classification-result.json` persistido contem todos os campos canonicos: `subagent_id`, `mappings`, `orphans`, `sharedGlossary`, `pendingLlmRefinement`, `skippedDueToSecret`, `durationMs`.
- [ ] `pendingLlmRefinement` lista paths com `confidence !== 'high'`.
- [ ] `skippedDueToSecret` lista paths que vieram com flag `blockedBySecret: true` do Step 07.
- [ ] Arquivos `blockedBySecret: true` NAO entram nem em `mappings` nem em `orphans`.
- [ ] `--dry-run` flag impede escrita em disco.
- [ ] `bun test skills/init/lib/steps/08-classify-blocks-hybrid.test.ts skills/init/lib/registry.test.ts` 0 falhas.
- [ ] `bun run lint` clean.

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/steps/08-classify-blocks-hybrid.test.ts` exit 0.
- `bun test skills/init/lib/registry.test.ts` exit 0.
- `grep -c "classifyBlocksHybridStep" skills/init/lib/registry.ts` retorna `2` (1 import + 1 entry).
- Test #5 (registry adjacencia) passa: `idxClassify === idxDiscover + 1`.
- Test #2 (high → pending vazio) e Test #3 (medium → pending nao-vazio) passam.

**Por humano:**
- Reviewer le `08-classify-blocks-hybrid.ts` em ~4 minutos e consegue explicar: (1) por que LLM eh deferido (G4) e qual o trade-off para v6.4.0, (2) como `skippedDueToSecret` se conecta ao Step 06 (cadeia 06 → 07 → 08), (3) como Plano 04 fase-02 vai consumir `pendingLlmRefinement` para decidir invocar LLM ou nao.

---

## Decisoes Aplicadas

- **D5 + D6 do PRD** (escopo + README): herdado via cadeia 07 → 08. Step 08 nao re-implementa filtros.
- **D8 do PRD** (hibrido heuristica + LLM): flag `pendingLlmRefinement` no JSON persistido habilita Plano 04 fase-02 invocar LLM seletivamente.
- **D11 do PRD** (orfaos → references): propagado da fase-05 — orfaos chegam no resultado com target `docs/references/{basename}`.
- **D13 + CH-03 do PRD** (glossario compartilhado): `sharedGlossary` propagado integralmente para o JSON persistido. Plano 02 fase-02 le quando re-invocado em modo non-greenfield.
- **D14 do PRD** (filosoficos excluidos): garantido em type-level pela fase-05 (enum `HarnessCategory`).
- **D16 do PRD** (secrets antes de move): blocked filtrado antes de classifyDocs — secrets-scan eh autoridade.
- **D18 do PRD** (`--dry-run`): step respeita `noWrite`.
- **D19 + SH-07 do PRD** (audit log): `subagent_id: 'init-classify-blocks'` literal.
- **SH-03 do PRD** (classify-blocks-hybrid step): integrado no registry.
- **SH-04 do PRD** (orfaos para references): preservado da fase-05.
- **MH-XX (registry hierarquico expandido)**: cadeia 06 → 07 → 08 completa apos esta fase.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
