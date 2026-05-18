<!--
Princípio universal #5 — Comment Provenance.
Todo comentario inline em codigo gerado durante esta fase deve ter linhagem:
`// 2026-05-18 (Luiz/dev): <razao> — PRD <ref>`.
-->

# Fase 05: Step 11 — move-docs-with-stub (README guard + bloqueio por secret)

**Plano:** 04 — Merge Invertido Destrutivo
**Sizing:** 1h
**Depende de:** fase-02 (tipos `MergeProposal`/`MoveAction` compartilhados) + fase-04 (`moveDocWithStub`, `MoveResult`)
**Visual:** false

---

## O que esta fase entrega

Step 11 (`11-move-docs-with-stub`) que itera sobre os `MoveAction[]` produzidos pelo Plano 03 (e ja propostos pelo Step 09) e chama `moveDocWithStub` para cada um. Skip explicito de `README.md` raiz (G3 do README do plano + CA-08). Skip de arquivos com `blockedBySecret: true` no manifest do Step 06 (CA-04). Append no backup manifest iniciado pelo Step 10 com entries `action: 'move'` (G10). Registry: posicionado APOS `applyMergeDestructiveStep`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/11-move-docs-with-stub.ts` | Create | Step que itera moves + skip README + skip blocked (MH-05, MH-08, CA-03, CA-08) |
| `skills/init/lib/steps/11-move-docs-with-stub.test.ts` | Create | 4 testes pareados (move basico, orphan → references, README guard, blocked skip) |
| `skills/init/lib/registry.ts` | Modify | Adicionar import + entry de `moveDocsWithStubStep` apos `applyMergeDestructiveStep` |

---

## Implementacao

### Passo 1: Step exportado

```typescript
// 2026-05-18 (Luiz/dev): contrato Step{id, run} — PRD MH-05, CA-03
// subagent_id canonico: 'init-move-docs' (G12 do README do plano)
import path from 'node:path'
import type { Step, StepReport } from './types'
import { moveDocWithStub } from '../doc-mover-stub'
import { readDiscoveryArtifact } from '../discovery-store'
// Adaptar conforme MEMORY do Plano 01 — appendToLatestBackup pode nao existir
// como API canonica e precisar de helper local (G10 do README do plano).
import { appendToLatestBackup } from '../backup-anti-vibe'

export const moveDocsWithStubStep: Step = {
  id: '11-move-docs-with-stub',
  async run(ctx): Promise<StepReport> {
    // 2026-05-18 (Luiz/dev): em --additive-merge, Step 11 NAO eh pulado — moves de orphans para references
    //                       continuam additive-friendly. G9 do README do plano explicita.
    const classification = await readDiscoveryArtifact(ctx.cwd, 'classification-result.json')
    const secrets = await readDiscoveryArtifact(ctx.cwd, 'secrets-scan-result.json')

    // Adaptar shape conforme MEMORY do Plano 03.
    type Mapping = { source: string; target: string; orphan?: boolean }
    const allMoves: Mapping[] = [
      ...(classification?.mappings ?? []),
      ...(classification?.orphans ?? []).map((o: { source: string; target: string }) => ({ ...o, orphan: true })),
    ]
    const blockedSet = new Set<string>(
      (secrets?.matches ?? []).map((m: { file: string }) => m.file),
    )

    if (allMoves.length === 0) {
      return { mutated: false, summary: 'init-move-docs: no docs to move' }
    }

    if (ctx.flags['--dry-run'] === true) {
      // 2026-05-18 (Luiz/dev): G8 do README — dry-run sem mutar — PRD MH-06
      // TODO Plano 05 fase-02 — renderer compartilhado para preview agregado.
      return {
        mutated: false,
        summary: `init-move-docs: dry-run preview (${allMoves.length} planned)`,
      }
    }

    const skipped: string[] = []
    const moved: string[] = []
    const errors: string[] = []

    for (const m of allMoves) {
      // 2026-05-18 (Luiz/dev): README guard — PRD MH-08, CA-08, G3 do README do plano
      // Skip README.md no nivel raiz do cwd (basename === 'README.md' E dirname === '.')
      if (path.basename(m.source) === 'README.md' && path.dirname(m.source) === '.') {
        skipped.push(`${m.source} (root README is read-only per D6)`)
        continue
      }

      // 2026-05-18 (Luiz/dev): bloqueio por secret — PRD SH-01, CA-04
      if (blockedSet.has(m.source)) {
        skipped.push(`${m.source} (blocked by secret-scan)`)
        continue
      }

      const result = await moveDocWithStub({
        source: m.source,
        target: m.target,
        repoRoot: ctx.cwd,
      })

      if (!result.moved) {
        errors.push(`${m.source} -> ${m.target}: ${result.errors[0]?.message ?? 'unknown'}`)
        continue
      }

      // 2026-05-18 (Luiz/dev): append no backup manifest iniciado por Step 10 — PRD D29, G10 do README do plano
      try {
        await appendToLatestBackup({
          cwd: ctx.cwd,
          entry: { originalPath: m.source, backupPath: m.source, action: 'move' },
        })
      } catch (err) {
        // append falha NAO desfaz o move ja realizado — apenas registra warning.
        errors.push(`backup append for ${m.source}: ${(err as Error).message}`)
      }

      moved.push(`${m.source} -> ${m.target}`)
    }

    const mutated = moved.length > 0
    const parts = [`init-move-docs: ${moved.length} moved`]
    if (skipped.length > 0) parts.push(`${skipped.length} skipped`)
    if (errors.length > 0) parts.push(`${errors.length} errors`)
    return {
      mutated,
      summary: parts.join(', '),
    }
  },
}
```

### Passo 2: Registry entry

```typescript
// 2026-05-18 (Luiz/dev): plano04 fase-05 — apos applyMergeDestructiveStep (fase-03)
// (Posicao definitiva no registry geral eh fixada em fase-06 — Step 10 antes Step 02.)
import { moveDocsWithStubStep } from './steps/11-move-docs-with-stub'
// after:
//   ...
//   proposeMergeBatchStep,
//   applyMergeDestructiveStep,    // fase-03
//   moveDocsWithStubStep,         // 2026-05-18 (Luiz/dev): plano04 fase-05 — PRD MH-05
//   migrate0ParseDryRunStep,
//   ...
```

### Passo 3: Testes pareados (4 casos)

```typescript
// 2026-05-18 (Luiz/dev): TDD — PRD MH-05, MH-08, CA-03, CA-08
import { describe, it, expect, beforeEach } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { moveDocsWithStubStep } from './11-move-docs-with-stub'
import { writeDiscoveryArtifact } from '../discovery-store'

describe('11-move-docs-with-stub', () => {
  let cwd: string
  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), 'move-docs-'))
    mkdirSync(path.join(cwd, 'docs'), { recursive: true })
  })

  it('moves classified docs and writes stubs at old paths (CA-03)', async () => {
    writeFileSync(path.join(cwd, 'docs', 'ARQUITETURA.md'), '# x\n', 'utf8')
    await writeDiscoveryArtifact(cwd, 'secrets-scan-result.json', { matches: [] })
    await writeDiscoveryArtifact(cwd, 'classification-result.json', {
      mappings: [{ source: 'docs/ARQUITETURA.md', target: 'docs/ARCHITECTURE.md' }],
      orphans: [],
    })

    const report = await moveDocsWithStubStep.run({ cwd, args: [], flags: {} })
    expect(report.mutated).toBe(true)
    expect(report.summary).toMatch(/1 moved/)
    expect(existsSync(path.join(cwd, 'docs', 'ARCHITECTURE.md'))).toBe(true)
    // stub no path antigo
    expect(readFileSync(path.join(cwd, 'docs', 'ARQUITETURA.md'), 'utf8')).toMatch(/^# Moved/)
  })

  it('routes orphans to docs/references/ (D11)', async () => {
    writeFileSync(path.join(cwd, 'NOTES.md'), 'x', 'utf8')
    mkdirSync(path.join(cwd, 'docs', 'references'), { recursive: true })
    await writeDiscoveryArtifact(cwd, 'secrets-scan-result.json', { matches: [] })
    await writeDiscoveryArtifact(cwd, 'classification-result.json', {
      mappings: [],
      orphans: [{ source: 'NOTES.md', target: 'docs/references/NOTES.md' }],
    })

    await moveDocsWithStubStep.run({ cwd, args: [], flags: {} })
    expect(existsSync(path.join(cwd, 'docs', 'references', 'NOTES.md'))).toBe(true)
  })

  it('skips root README.md and skips /docs/README.md is moved when classified (CA-08)', async () => {
    // 2026-05-18 (Luiz/dev): fixture com 2 READMEs — apenas o ROOT eh intocavel
    writeFileSync(path.join(cwd, 'README.md'), 'projeto\n', 'utf8')
    writeFileSync(path.join(cwd, 'docs', 'README.md'), 'docs index\n', 'utf8')
    await writeDiscoveryArtifact(cwd, 'secrets-scan-result.json', { matches: [] })
    await writeDiscoveryArtifact(cwd, 'classification-result.json', {
      mappings: [
        // Classificacao tenta mover ambos (cenario adversarial)
        { source: 'README.md', target: 'docs/references/README-OLD.md' },
        { source: 'docs/README.md', target: 'docs/references/README-DOCS.md' },
      ],
      orphans: [],
    })

    const report = await moveDocsWithStubStep.run({ cwd, args: [], flags: {} })
    expect(report.summary).toMatch(/skipped/)
    // README.md raiz INTOCAVEL
    expect(readFileSync(path.join(cwd, 'README.md'), 'utf8')).toBe('projeto\n')
    // /docs/README.md tambem skipado nesta versao (G3 do README do plano — conservador)
    expect(readFileSync(path.join(cwd, 'docs', 'README.md'), 'utf8')).toBe('docs index\n')
  })

  it('skips files marked blockedBySecret in secrets-scan-result.json (CA-04)', async () => {
    writeFileSync(path.join(cwd, 'docs', 'STRIPE.md'), 'sk_live_xxx', 'utf8')
    await writeDiscoveryArtifact(cwd, 'secrets-scan-result.json', {
      matches: [{ file: 'docs/STRIPE.md', kind: 'sk_live' }],
    })
    await writeDiscoveryArtifact(cwd, 'classification-result.json', {
      mappings: [{ source: 'docs/STRIPE.md', target: 'docs/references/STRIPE.md' }],
      orphans: [],
    })

    await moveDocsWithStubStep.run({ cwd, args: [], flags: {} })
    // STRIPE.md NAO foi movido
    expect(readFileSync(path.join(cwd, 'docs', 'STRIPE.md'), 'utf8')).toBe('sk_live_xxx')
  })
})
```

E o teste de integracao com registry:

```typescript
// 2026-05-18 (Luiz/dev): plano04 fase-05 — assert que moveDocsWithStubStep aparece apos applyMergeDestructiveStep
import { registry } from './registry'
import { moveDocsWithStubStep } from './steps/11-move-docs-with-stub'
import { applyMergeDestructiveStep } from './steps/10-apply-merge-destructive'

it('positions move-docs-with-stub immediately after apply-merge-destructive', () => {
  const i10 = registry.indexOf(applyMergeDestructiveStep)
  const i11 = registry.indexOf(moveDocsWithStubStep)
  expect(i11).toBe(i10 + 1)
})
```

---

## Gotchas

- **G3 do plano (README intocavel — conservador):** Apenas `README.md` no NIVEL RAIZ do cwd eh garantia. Para v1 esta fase ESTENDE a conservadoria: tambem skipa `*/README.md` em subdirs (teste #3 valida `docs/README.md` intocado). Isso pode ser flexibilizado em v6.5+ se necessario — registrar como decisao no MEMORY do plano.
- **G4 do plano (atomicidade parcial):** Se `moveDocWithStub` retorna `errors[]` populado apos `moved: true`, Step 11 conta como movido e propaga o erro no summary. NAO reverte o move automaticamente — Plano 05 fase-04 (rollback completo) usa o backup manifest para isso.
- **G8 do plano (dry-run):** Retorna `mutated: false` + summary com "dry-run preview". NAO chama `moveDocWithStub` em loop. TODO Plano 05 fase-02 — renderer compartilhado emitira a lista completa via console.log.
- **G9 do plano (additive NAO skipa Step 11):** Diferentemente de Step 09/10, Step 11 continua rodando em `--additive-merge` — moves para `docs/references/` sao additive-friendly. Documentar isso no comentario inline do step.
- **G10 do plano (append no backup):** `appendToLatestBackup` pode nao existir como API canonica do Plano 01. **Plano A:** consultar `plano01/MEMORY.md` e usar a API existente. **Plano B:** implementar helper local em `lib/backup-anti-vibe.ts` (extensao no Plano 04) que (i) busca `getLatestBackupDir`, (ii) le `manifest.json`, (iii) anexa a entry, (iv) reescreve manifest. Decisao tomada durante a fase deve ser registrada no MEMORY do Plano 04.
- **G12 do plano (subagent_id):** Summary contem literal `init-move-docs` em TODOS os caminhos.
- **G13 do plano (greenfield):** Em greenfield, `classification-result.json` lista vazia → step retorna "no docs to move" sem qualquer mutacao. Tracer bullet preservado.

---

## Verificacao

### TDD

- [ ] **RED:** `bun test skills/init/lib/steps/11-move-docs-with-stub.test.ts` falha (step inexistente).
- [ ] **GREEN:** Implementar step; 4 testes verdes.
- [ ] **REFACTOR:** extrair filtro de README guard como funcao local `isProtectedReadme(relpath)`.

### Checklist

- [ ] `skills/init/lib/steps/11-move-docs-with-stub.ts` exporta `moveDocsWithStubStep: Step` com id `'11-move-docs-with-stub'`.
- [ ] `bun test skills/init/lib/steps/11-move-docs-with-stub.test.ts skills/init/lib/registry.test.ts` retorna 4+1 passed.
- [ ] README.md raiz NAO eh modificado em nenhum teste (`expect(readFileSync('README.md')).toBe(original)` — passa).
- [ ] Arquivo com secret detectado tem move SKIPADO (test #4).
- [ ] `bun run lint` clean.
- [ ] Grep `init-move-docs` no step retorna pelo menos 2 matches (multiplos caminhos de summary).

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/steps/11-move-docs-with-stub.test.ts` retorna `4/4 passed`.
- `grep -E "id: '11-move-docs-with-stub'" skills/init/lib/steps/11-move-docs-with-stub.ts` retorna 1 match.
- Apos test #3, `git diff README.md` retorna vazio (README intocado).

**Por humano:**
- Inspecao manual do summary apos run em fixture com 3 moves + 1 README + 1 secret: summary lista `X moved, Y skipped` corretamente.

---

**Referencia cruzada:**
- PRD: MH-05 (move-docs-with-stub), MH-08 (README intocavel), CA-03 (move + stub + rewrite), CA-04 (blocked por secret), CA-08 (README byte-identico), D11 (orphans → references)
- README do plano: G3, G4, G8, G9, G10, G12, G13
- fase-04: `moveDocWithStub` consumido neste step
- Plano 05 fase-04 (rollback): le manifest de move escrito por este step para reverter

<!-- Gerado por /plan-feature em 2026-05-18 -->
