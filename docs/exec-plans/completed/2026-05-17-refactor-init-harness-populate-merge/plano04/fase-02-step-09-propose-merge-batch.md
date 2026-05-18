<!--
Princípio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante esta fase deve ter linhagem:
`// 2026-05-18 (Luiz/dev): <razao> — PRD <ref>`.
-->

# Fase 02: Step 09 — propose-merge-batch (needsUser agregado)

**Plano:** 04 — Merge Invertido Destrutivo
**Sizing:** 1h
**Depende de:** Nenhuma intra-plano (independente; consome artefatos do Plano 03 via `discoveryStore`)
**Visual:** false

---

## O que esta fase entrega

Step 09 (`09-propose-merge-batch`) que **le** os 3 artefatos JSON em `.anti-vibe/discovery/` produzidos pelo Plano 03 e **emite UM unico `needsUser`** com diff agregado de todas as transformacoes propostas (CLAUDE.md merge invertido + classified docs move + secrets bloqueados). Em `--dry-run` faz `console.log` do diff e NAO chama `needsUser`. Em `--additive-merge` faz early-skip. Eh read-only (`mutated: false` em todos os caminhos). Registry: posicionado APOS `classifyBlocksHybridStep` (id 08) e ANTES de `migrate0ParseDryRunStep`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/09-propose-merge-batch.ts` | Create | Step que emite diff agregado via `needsUser` (MH-04, D4) |
| `skills/init/lib/steps/09-propose-merge-batch.test.ts` | Create | Testes pareados: 4 casos (sem propostas, com propostas, dry-run, integracao registry) |
| `skills/init/lib/registry.ts` | Modify | Adicionar import + entry de `proposeMergeBatchStep` apos `classifyBlocksHybridStep` |
| `skills/init/lib/merge-proposal-types.ts` | Create | Tipos compartilhados `MergeProposal`, `TransformAction`, `MoveAction`, `BlockedAction` (consumido tambem por fase-03 e fase-05) |

---

## Implementacao

### Passo 1: Tipos compartilhados em `merge-proposal-types.ts`

```typescript
// 2026-05-18 (Luiz/dev): tipos compartilhados entre Step 09 (propose) e Step 10/11 (apply) — PRD MH-04, D4
// Mantidos em arquivo separado para evitar import circular entre os 3 steps.

export type TransformAction = {
  readonly kind: 'transform'
  /** Path relativo ao cwd. Tipicamente 'CLAUDE.md'. */
  readonly source: string
  /** Categoria-alvo (sempre 'CLAUDE_MD_MIRROR' nesta versao). */
  readonly target: 'CLAUDE_MD_MIRROR'
  /** Blocos extraidos: cabecalho do bloco + path harness destino. */
  readonly blocks: ReadonlyArray<{
    readonly heading: string
    readonly destination: string // ex: 'docs/DESIGN.md', 'docs/SECURITY.md'
  }>
}

export type MoveAction = {
  readonly kind: 'move'
  readonly source: string         // path relativo ao cwd
  readonly target: string         // path harness destino (ex: 'docs/ARCHITECTURE.md')
  readonly orphan: boolean        // true → orfao indo para docs/references/
}

export type BlockedAction = {
  readonly kind: 'blocked'
  readonly source: string
  readonly reason: 'secret-detected'
  readonly secretKind: string     // ex: 'sk_live_*', vem do SecretMatch do Plano 03
}

export type MergeProposal = {
  readonly transforms: ReadonlyArray<TransformAction>
  readonly moves: ReadonlyArray<MoveAction>
  readonly blocked: ReadonlyArray<BlockedAction>
}
```

### Passo 2: Step 09 — funcao `buildMergeProposal`

```typescript
// 2026-05-18 (Luiz/dev): le os 3 JSONs de discovery (Plano 03) e monta a MergeProposal — PRD MH-04
import { readDiscoveryArtifact } from '../discovery-store'
import type { MergeProposal, TransformAction, MoveAction, BlockedAction } from '../merge-proposal-types'

// 2026-05-18 (Luiz/dev): retorna proposta vazia em greenfield (sem CLAUDE.md, sem docs) — G13 do README do plano
async function buildMergeProposal(cwd: string): Promise<MergeProposal> {
  const secrets = await readDiscoveryArtifact(cwd, 'secrets-scan-result.json')
  const docs = await readDiscoveryArtifact(cwd, 'discovered-docs.json')
  const classification = await readDiscoveryArtifact(cwd, 'classification-result.json')

  // Adaptar conforme MEMORY do Plano 03 apos execucao (assinatura exata de ClassifyOutput).
  const transforms: TransformAction[] = []
  const moves: MoveAction[] = []
  const blocked: BlockedAction[] = []

  // 2026-05-18 (Luiz/dev): CLAUDE.md presente E classificado → transformacao destrutiva — PRD D2, D17
  // (heuristica simples: existe doc com source='CLAUDE.md' na lista discovered-docs?)
  // ... montagem completa derivada do contrato exato de ClassifyOutput.

  return { transforms, moves, blocked }
}
```

### Passo 3: Renderer do diff agregado (PT-BR)

```typescript
// 2026-05-18 (Luiz/dev): renderer ainda inline neste step; Plano 05 fase-02 extrai para compartilhar com --dry-run — TODO Plano 05 fase-02
function renderProposal(proposal: MergeProposal): string {
  const lines: string[] = []
  lines.push('PROPOSTA DE TRANSFORMACAO (revise antes de aprovar)')
  lines.push('')

  if (proposal.transforms.length > 0) {
    for (const t of proposal.transforms) {
      lines.push(`${t.source} (existente) -> espelho ${'<=40 linhas'}:`)
      for (const b of t.blocks) {
        lines.push(`  [${b.heading}] -> ${b.destination}`)
      }
    }
    lines.push('')
  }

  if (proposal.moves.length > 0) {
    lines.push(`Docs existentes (${proposal.moves.length}):`)
    for (const m of proposal.moves) {
      const suffix = m.orphan ? ' (orfao -> references)' : ''
      lines.push(`  ${m.source} -> ${m.target}${suffix}`)
    }
    lines.push('')
  }

  if (proposal.blocked.length > 0) {
    lines.push('Secrets detectados (move bloqueado):')
    for (const b of proposal.blocked) {
      lines.push(`  ${b.source}: ${b.secretKind}`)
    }
    lines.push('')
  }

  lines.push('README.md (raiz): intocavel (read-only per D6)')
  return lines.join('\n')
}
```

### Passo 4: Step exportado

```typescript
// 2026-05-18 (Luiz/dev): contrato Step{id, run} — PRD MH-04, D4
// subagent_id canonico: 'init-propose-merge' (G12 do README do plano)
import type { Step, StepReport } from './types'

export const proposeMergeBatchStep: Step = {
  id: '09-propose-merge-batch',
  async run(ctx): Promise<StepReport> {
    // 2026-05-18 (Luiz/dev): early-skip em --additive-merge — PRD SH-09, G9 do README
    if (ctx.flags['--additive-merge'] === true) {
      return { mutated: false, summary: 'init-propose-merge: skipped (additive-merge opt-in)' }
    }

    const proposal = await buildMergeProposal(ctx.cwd)
    const hasAnything =
      proposal.transforms.length + proposal.moves.length + proposal.blocked.length > 0

    if (!hasAnything) {
      return { mutated: false, summary: 'init-propose-merge: no transformations needed' }
    }

    const diff = renderProposal(proposal)

    // 2026-05-18 (Luiz/dev): em dry-run, console.log e NAO chama needsUser — PRD MH-06, G8 do README
    if (ctx.flags['--dry-run'] === true) {
      // eslint-disable-next-line no-console
      console.log(diff)
      return { mutated: false, summary: 'init-propose-merge: dry-run preview emitted' }
    }

    // TODO CH-02 — opcao "Ver diff por arquivo" sera adicionada como opcao adicional aqui
    // quando Plano 05 fase-02 entregar o renderer compartilhado.
    return {
      mutated: false,
      summary: 'init-propose-merge: aprovacao requerida',
      needsUser: {
        prompt: diff + '\n\nAprovar tudo?',
        options: ['Aprovar', 'Cancelar', 'Aprovar exceto secrets'],
      },
    }
  },
}
```

### Passo 5: Registry — adicionar entry apos Step 08

```typescript
// 2026-05-18 (Luiz/dev): plano04 fase-02 — Step 09 propose-merge-batch APOS classify-blocks-hybrid (Plano 03 fase-06)
// before:
//   ...
//   classifyBlocksHybridStep,    // (Plano 03 fase-06)
//   migrate0ParseDryRunStep,
//   ...
// after:
//   ...
//   classifyBlocksHybridStep,
//   proposeMergeBatchStep,       // 2026-05-18 (Luiz/dev): plano04 fase-02 — PRD MH-04
//   migrate0ParseDryRunStep,
//   ...
import { proposeMergeBatchStep } from './steps/09-propose-merge-batch'
```

### Passo 6: Testes pareados (4 casos)

```typescript
// 2026-05-18 (Luiz/dev): TDD — testes RED-GREEN-REFACTOR — PRD MH-04, D4
import { describe, it, expect, beforeEach } from 'bun:test'
import { proposeMergeBatchStep } from './09-propose-merge-batch'
import { writeDiscoveryArtifact } from '../discovery-store'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

describe('09-propose-merge-batch', () => {
  let cwd: string
  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), 'propose-merge-'))
  })

  it('returns mutated:false and skips when proposal is empty (greenfield)', async () => {
    // 3 artefatos vazios
    await writeDiscoveryArtifact(cwd, 'secrets-scan-result.json', { matches: [] })
    await writeDiscoveryArtifact(cwd, 'discovered-docs.json', { docs: [] })
    await writeDiscoveryArtifact(cwd, 'classification-result.json', { mappings: [], orphans: [] })

    const report = await proposeMergeBatchStep.run({ cwd, args: [], flags: {} })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('no transformations needed')
    expect(report.needsUser).toBeUndefined()
  })

  it('emits needsUser with aggregated diff when proposal is non-empty', async () => {
    // ... fixture com CLAUDE.md + docs classificados + 1 secret bloqueado
    const report = await proposeMergeBatchStep.run({ cwd, args: [], flags: {} })
    expect(report.needsUser).toBeDefined()
    expect(report.needsUser?.prompt).toContain('PROPOSTA DE TRANSFORMACAO')
    expect(report.needsUser?.options).toContain('Aprovar')
    expect(report.needsUser?.options).toContain('Cancelar')
    expect(report.mutated).toBe(false) // ainda nao mutou
  })

  it('skips needsUser and console.logs diff in --dry-run', async () => {
    // ... fixture com transformacoes
    const logs: string[] = []
    const origLog = console.log
    console.log = (...args) => { logs.push(args.join(' ')) }
    try {
      const report = await proposeMergeBatchStep.run({ cwd, args: [], flags: { '--dry-run': true } })
      expect(report.needsUser).toBeUndefined()
      expect(report.mutated).toBe(false)
      expect(logs.join('\n')).toContain('PROPOSTA DE TRANSFORMACAO')
    } finally {
      console.log = origLog
    }
  })

  it('early-skips in --additive-merge with summary mentioning opt-in', async () => {
    const report = await proposeMergeBatchStep.run({ cwd, args: [], flags: { '--additive-merge': true } })
    expect(report.mutated).toBe(false)
    expect(report.summary).toMatch(/additive-merge/)
    expect(report.needsUser).toBeUndefined()
  })
})
```

E o teste de integracao com registry em `registry.test.ts`:

```typescript
// 2026-05-18 (Luiz/dev): plano04 fase-02 — assert posicao no registry
import { registry } from './registry'
import { proposeMergeBatchStep } from './steps/09-propose-merge-batch'
import { classifyBlocksHybridStep } from './steps/08-classify-blocks-hybrid'

it('positions propose-merge-batch immediately after classify-blocks-hybrid', () => {
  const i08 = registry.indexOf(classifyBlocksHybridStep)
  const i09 = registry.indexOf(proposeMergeBatchStep)
  expect(i09).toBe(i08 + 1)
})
```

---

## Gotchas

- **G2 do plano (needsUser batch unico):** UMA chamada a `needsUser`, nunca multiplas. Lista agregada cobre transforms + moves + blocked em um unico prompt.
- **G8 do plano (dry-run preview):** `--dry-run` rota completamente diferente — `console.log` em vez de `needsUser`. Mantem `mutated: false` em ambas.
- **G9 do plano (--additive-merge):** Early-return ANTES de ler discovery (evita IO desnecessario quando opt-in esta ativo).
- **G12 do plano (subagent_id):** Summary contem literal `init-propose-merge` em TODOS os caminhos de retorno (skip, vazio, dry-run, needsUser). Teste futuro do Plano 06 fase-01 valida via grep.
- **G13 do plano (greenfield):** Em repo sem CLAUDE.md/docs, os 3 JSONs do Plano 03 existem mas listam vazios. Step retorna `mutated: false` + summary "no transformations needed" — NAO chama `needsUser`. Garante que o tracer bullet do Plano 02 (greenfield) nao quebra.
- **Local (adaptar API Plano 03):** Os campos exatos de `ClassifyOutput`, `DocMapping`, `OrphanMapping` so estarao confirmados apos execucao do Plano 03 — consultar `plano03/MEMORY.md` antes de codificar `buildMergeProposal`. Se ainda nao foi executado, anotar TODO inline e adaptar.
- **Local (TODO CH-02):** Opcao "Ver diff por arquivo" foi cortada desta versao (deferido para v6.5+). Deixar comentario `// TODO CH-02 — Plano 05 fase-02 ou v6.5+` no ponto exato onde a opcao apareceria nas `options[]`.

---

## Verificacao

### TDD

- [ ] **RED:** `bun test skills/init/lib/steps/09-propose-merge-batch.test.ts` falha com 4 assertion errors (step nao existe).
- [ ] **GREEN:** Apos implementar step + tipos, todos os 4 testes passam.
- [ ] **REFACTOR:** extrair `buildMergeProposal` e `renderProposal` como funcoes nomeadas; manter step exportado com responsabilidade unica (orquestracao dos ramos: skip / vazio / dry-run / needsUser).

### Checklist

- [ ] `skills/init/lib/steps/09-propose-merge-batch.ts` exporta `proposeMergeBatchStep: Step` com `id === '09-propose-merge-batch'`.
- [ ] `skills/init/lib/merge-proposal-types.ts` exporta `MergeProposal`, `TransformAction`, `MoveAction`, `BlockedAction`.
- [ ] `bun test skills/init/lib/steps/09-propose-merge-batch.test.ts` retorna 4/4 passed.
- [ ] `bun test skills/init/lib/registry.test.ts` retorna 0 falhas (incluindo assert de posicao).
- [ ] `bun run lint` clean.
- [ ] Grep `TODO CH-02` em `09-propose-merge-batch.ts` retorna pelo menos 1 match (registro do follow-up).

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/steps/09-propose-merge-batch.test.ts skills/init/lib/registry.test.ts` retorna `4+ passed, 0 failed`.
- `grep -E "id: '09-propose-merge-batch'" skills/init/lib/steps/09-propose-merge-batch.ts` retorna 1 match.
- `grep -E "init-propose-merge" skills/init/lib/steps/09-propose-merge-batch.ts` retorna pelo menos 2 matches (multiplos caminhos de summary).

**Por humano:**
- Leitura do `proposeMergeBatchStep` mostra 4 ramos explicitos: (1) `--additive-merge` skip, (2) proposal vazia, (3) `--dry-run` console.log, (4) needsUser default. Cada ramo retorna `mutated: false`.

---

**Referencia cruzada:**
- PRD: MH-04 (batch agregado), D4 (granularidade batch), CH-02 (deferido), MH-06 (dry-run), SH-09 (additive opt-in)
- README do plano: G2, G8, G9, G12, G13
- Plano 03 MEMORY: assinatura exata de `readDiscoveryArtifact`, paths canonicos dos 3 JSONs
- Plano 05 fase-02: renderer compartilhado consumira o `renderProposal` desta fase

<!-- Gerado por /plan-feature em 2026-05-18 -->
