<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 03: Registry Wire + E2E (CA-01, CA-02, CA-08)

**Plano:** 03 — Step 5 (scaffold-and-link) + Step 6 (install-gh-files)
**Sizing:** 1h
**Depende de:** fase-01 (Step 5 real), fase-02 (Step 6 real)
**Visual:** false

---

## O que esta fase entrega

`registry.ts` com 2 imports trocados (stubs Steps 5-6 → `scaffoldAndLinkStep` e
`installGhFilesStep` reais). E2E em fixture greenfield + fixture com `.claude/CLAUDE.md`
preexistente valida os criterios de aceite: CA-01 (placeholders criados + `.github/` files
instalados), CA-02 (CLAUDE.md byte-identico, line-count invariante), CA-08 (re-run nao
sobrescreve nenhum arquivo). Tracer e2e do Plano 01 fase-06 e re-executado para garantir
que Steps 5-6 reais nao quebram o pipeline.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/registry.ts` | Modify | Trocar 2 stubs por imports reais (`scaffoldAndLinkStep` da fase-01, `installGhFilesStep` da fase-02). Os outros 8 imports (Steps 1-2 reais, Steps 3-4 reais via Plano 02 se ja feito ou stubs caso contrario, Steps 7-10 stubs) permanecem como estavam. |
| `tests/e2e/init-v7-scaffold-and-gh.test.ts` | Create | E2E em 2 fixtures: greenfield (CA-01 + CA-08) e com CLAUDE.md preexistente (CA-02). Valida tambem ordem do registry. |

---

## Implementacao

### Passo 1: Atualizar `registry.ts`

Plano 01 fase-04 deixou os 10 nomes com 8 stubs. Esta fase substitui as posicoes #5 e #6
pelos imports reais. As demais (Steps 7-10) permanecem stubs ate Planos 04/05. Steps 1-4
ja foram substituidos pelos Planos 01/02 se executados em ordem; caso contrario continuam
stubs — esta fase NAO mexe neles.

Estado esperado apos esta fase (assumindo Planos 01 e 02 concluidos):

```typescript
// skills/init/lib/registry.ts
// 2026-05-21 (Luiz/dev): Plano 03 fase-03 — substitui stubs Step 5 e Step 6 pelos imports reais.
// Demais steps (7-10) continuam stubs ate Planos 04/05.

import type { Step } from './steps/types'
import { reentryGateStep } from './steps/01-reentry-gate'                          // real (Plano 01 fase-03)
import { detectLegacyAndStackStep } from './steps/02-detect-legacy-and-stack'      // real (Plano 01 fase-02)
import { secretsScanStep } from './steps/03-secrets-scan'                          // real (Plano 02 fase-02) ou stub se Plano 02 nao executado
import { migratePlanningAndManifestStep } from './steps/04-migrate-planning-and-manifest' // real (Plano 02 fase-03) ou stub
import { scaffoldAndLinkStep } from './steps/05-scaffold-and-link'                 // 2026-05-21: Plano 03 fase-01 (real)
import { installGhFilesStep } from './steps/06-install-gh-files'                   // 2026-05-21: Plano 03 fase-02 (real)
import { generatePopulatePlansStep } from './steps/07-generate-populate-plans'     // stub — Plano 04
import { deliveryLoopStep } from './steps/08-delivery-loop'                        // stub — Plano 05
import { copyKnowledgeStep } from './steps/09-copy-knowledge'                      // stub — Plano 05
import { finalValidationStep } from './steps/10-final-validation'                  // stub — Plano 05

export const registry: readonly Step[] = [
  reentryGateStep,                  // 1: real
  detectLegacyAndStackStep,         // 2: real
  secretsScanStep,                  // 3: real ou stub
  migratePlanningAndManifestStep,   // 4: real ou stub
  scaffoldAndLinkStep,              // 5: real (Plano 03 fase-01) — DESTE PLANO
  installGhFilesStep,               // 6: real (Plano 03 fase-02) — DESTE PLANO
  generatePopulatePlansStep,        // 7: stub (CORE — Plano 04)
  deliveryLoopStep,                 // 8: stub
  copyKnowledgeStep,                // 9: stub
  finalValidationStep,              // 10: stub
]
```

**Nota:** Os nomes exatos dos imports e paths dependem do que o Plano 01 fase-04 nomeou.
Esta fase APENAS troca os imports #5 e #6 — nao reescreve o registry. Se nomes divergirem,
ajustar para o que esta em disco.

### Passo 2: RED — escrever `tests/e2e/init-v7-scaffold-and-gh.test.ts`

E2E roda `runInit([])` em 2 fixtures e valida o estado final do disco + summary do dispatcher.

```typescript
// tests/e2e/init-v7-scaffold-and-gh.test.ts
// 2026-05-21 (Luiz/dev): E2E Plano 03 fase-03 init-refactor-v7.
// Cobre CA-01 (placeholders + .github/ presentes), CA-02 (.claude/CLAUDE.md byte-identico),
// CA-08 (re-run skip-if-exists). Re-valida tracer global apos Steps 5-6 reais.
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { runInit } from '../../skills/init/lib/run-init'
import { registry } from '../../skills/init/lib/registry'
import { TEMPLATE_MANIFEST } from '../../skills/init/lib/template-manifest'

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'init-v7-e2e-scaffold-'))
}

describe('init v7 e2e — scaffold + gh (Plano 03 fase-03)', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('registry: 05-scaffold-and-link na posicao 5, 06-install-gh-files na posicao 6', () => {
    // 2026-05-21 (Luiz/dev): contrato de ordem D12 (revisada por DV-1/DV-3 — pipeline 10 steps).
    const ids = registry.map((s) => s.id)
    expect(ids[4]).toBe('05-scaffold-and-link')
    expect(ids[5]).toBe('06-install-gh-files')
  })

  test('CA-01: greenfield (Node-TS) — runInit cria todos os 36 placeholders + .github/ files', async () => {
    // 2026-05-21 (Luiz/dev): package.json minimo para Step 2 detectar stack node-ts.
    await fs.writeFile(
      path.join(tmp, 'package.json'),
      JSON.stringify({ name: 'fixture', devDependencies: { typescript: '^5.0' } }, null, 2),
    )

    const exitCode = await runInit([], { cwd: tmp })
    expect(exitCode).toBe(0)

    // 2026-05-21 (Luiz/dev): valida cada entry do manifest (cobre 4 extras AVC — RF-12).
    for (const entry of TEMPLATE_MANIFEST) {
      const stat = await fs.stat(path.join(tmp, entry.dst))
      expect(stat.isFile()).toBe(true)
    }

    // 2026-05-21 (Luiz/dev): valida .github/ files (Step 6).
    const yml = await fs.stat(path.join(tmp, '.github/workflows/harness.yml'))
    expect(yml.isFile()).toBe(true)
    const pr = await fs.stat(path.join(tmp, '.github/pull_request_template.md'))
    expect(pr.isFile()).toBe(true)

    // 2026-05-21 (Luiz/dev): valida link CLAUDE.md raiz ↔ AGENTS.md (Step 5 / linkClaudeToAgents).
    const rootClaude = await fs.stat(path.join(tmp, 'CLAUDE.md'))
    expect(rootClaude.isFile()).toBe(true)
  })

  test('CA-02: .claude/CLAUDE.md preexistente (533 linhas) — byte-identico apos runInit', async () => {
    // 2026-05-21 (Luiz/dev): cobre PRD linha 280 — invariante CA-02 ponta-a-ponta.
    await fs.writeFile(
      path.join(tmp, 'package.json'),
      JSON.stringify({ name: 'fixture', devDependencies: { typescript: '^5.0' } }, null, 2),
    )
    await fs.mkdir(path.join(tmp, '.claude'), { recursive: true })
    const original = Array.from({ length: 533 }, (_, i) => `linha ${String(i + 1)}`).join('\n')
    const claudeMdPath = path.join(tmp, '.claude', 'CLAUDE.md')
    await fs.writeFile(claudeMdPath, original, 'utf8')

    const exitCode = await runInit([], { cwd: tmp })
    expect(exitCode).toBe(0)

    const after = await fs.readFile(claudeMdPath, 'utf8')
    expect(after).toBe(original)
    expect(after.split('\n')).toHaveLength(533)
  })

  test('CA-08: re-run (idempotencia) — segundo runInit nao sobrescreve nenhum placeholder', async () => {
    // 2026-05-21 (Luiz/dev): cobre PRD CA-08 ponta-a-ponta.
    // NOTA: PRD DR-1 instala gate de re-entrada (Plano 01 fase-03) que BLOQUEIA re-run quando
    // .claude/legacy-manifest.json existe. Se Plano 02 estiver feito, o gate dispara. Para
    // isolar o teste de CA-08 do Steps 5-6, simulamos re-run RODANDO APENAS o subset de
    // steps (Steps 5-6 isoladamente, sem o gate). Alternativa: testar CA-08 com flag
    // `--no-reentry-gate` se Plano 01 fase-03 expor. Por enquanto: testar diretamente
    // os 2 steps via registry filtrado.
    await fs.writeFile(
      path.join(tmp, 'package.json'),
      JSON.stringify({ name: 'fixture', devDependencies: { typescript: '^5.0' } }, null, 2),
    )
    await runInit([], { cwd: tmp })

    // Snapshot do estado apos primeiro run.
    const beforeSecond: Record<string, string> = {}
    for (const entry of TEMPLATE_MANIFEST) {
      beforeSecond[entry.dst] = await fs.readFile(path.join(tmp, entry.dst), 'utf8')
    }
    const ymlBefore = await fs.readFile(path.join(tmp, '.github/workflows/harness.yml'), 'utf8')
    const prBefore = await fs.readFile(path.join(tmp, '.github/pull_request_template.md'), 'utf8')

    // 2026-05-21 (Luiz/dev): re-rodar Steps 5-6 isoladamente (bypassa gate de re-entrada).
    // Step contract aceita StepContext minimo com cwd/args/flags vazio.
    const ctx = { cwd: tmp, args: [], flags: {} as Record<string, boolean | string> }
    const step5 = registry.find((s) => s.id === '05-scaffold-and-link')!
    const step6 = registry.find((s) => s.id === '06-install-gh-files')!
    const r5 = await step5.run(ctx)
    const r6 = await step6.run(ctx)

    // 2026-05-21 (Luiz/dev): summary do segundo run confirma 0 escritos, todos skipados.
    expect(r5.summary).toMatch(/placeholdersCreated:\s*0/)
    expect(r5.summary).toMatch(new RegExp(`placeholdersSkipped:\\s*${String(TEMPLATE_MANIFEST.length)}`))
    expect(r6.summary).toMatch(/ghFilesInstalled:\s*0/)
    expect(r6.summary).toMatch(/ghFilesSkipped:\s*2/)

    // 2026-05-21 (Luiz/dev): conteudo permanece byte-identico (defesa adicional).
    for (const entry of TEMPLATE_MANIFEST) {
      const after = await fs.readFile(path.join(tmp, entry.dst), 'utf8')
      expect(after).toBe(beforeSecond[entry.dst])
    }
    const ymlAfter = await fs.readFile(path.join(tmp, '.github/workflows/harness.yml'), 'utf8')
    const prAfter = await fs.readFile(path.join(tmp, '.github/pull_request_template.md'), 'utf8')
    expect(ymlAfter).toBe(ymlBefore)
    expect(prAfter).toBe(prBefore)
  })
})
```

### Passo 3: GREEN — implementar swap no `registry.ts`

Editar o registry conforme o Passo 1. Confirmar via `bun run typecheck` que os imports
resolvem. Re-rodar o tracer e2e do Plano 01 fase-06 para garantir que Steps 5-6 reais nao
quebram o pipeline (R6 mitigation):

```bash
bun test tests/e2e/init-v7-tracer-bullet.test.ts
```

Esperado: tracer continua verde — Steps 5-6 em greenfield apenas escrevem placeholders +
mirror + 2 arquivos `.github/`, sem abort.

### Passo 4: VERIFY

```bash
bun test tests/e2e/init-v7-scaffold-and-gh.test.ts
bun test tests/e2e/init-v7-tracer-bullet.test.ts  # R6 mitigation
bun run test  # toda a suite
bun run typecheck
bun run lint
```

---

## Gotchas

- **G1 do plano (D4 — sem dry-run):** O e2e NAO passa flag `--dry-run`. `runInit([])` com
  args vazio. Se o teste falhar por algum step ainda ter wiring de dry-run, identificar e
  remover (esperado: Steps 5-6 nao tem; Steps 1-4 ja foram tratados nos Planos 01/02).

- **G2 do plano (CA-02 / D16):** Teste `CA-02:` valida invariante ponta-a-ponta. Se falhar,
  diagnostico: rodar fase-01 `bun test skills/init/lib/steps/05-scaffold-and-link.test.ts --grep "CA-02"`
  — se passar no unit mas falhar no e2e, problema esta em outro step (provavelmente Step 4
  do Plano 02 — mas Step 4 NAO toca `.claude/CLAUDE.md` por design — G7 do Plano 02).
  Se ambos falham, problema esta no `scaffoldFullTree:80` guard — improvavel pois ja tem
  cobertura unit em `scaffold-full-tree.test.ts:64-87`.

- **G3 do plano (CA-08 — re-run + gate de re-entrada):** O gate de re-entrada do Plano 01
  fase-03 (DR-1) bloqueia re-run quando `.claude/legacy-manifest.json` existe. Para isolar
  CA-08 deste plano de CA-08 global, o teste de re-run executa Steps 5-6 diretamente
  (bypassa o gate). Trade-off: cobertura ponta-a-ponta de re-run completo fica para
  Plano 05 e2e final. Documentar no comentario inline.

- **G6 do plano (link APOS scaffold no e2e):** Apos `runInit([])`, valida `CLAUDE.md` raiz
  existe (criado por `linkClaudeToAgents`) E `AGENTS.md` raiz existe (criado por scaffold).
  Se link falhar (ENOENT no AGENTS.md), o teste quebra. Diagnostico: registry tem ordem
  Step 5 antes de Step 6, mas DENTRO do Step 5 a ordem `scaffold -> link` e invariante
  (fase-01 cobre).

- **Local — `runInit` signature:** Confirmar via `Read skills/init/lib/run-init.ts` que
  aceita `runInit(args: string[], opts?: { cwd?: string })`. Se nao aceita `cwd`, o teste
  deve usar `process.chdir(tmp)` antes e restaurar no afterEach. Se Plano 02 fase-04 ja
  resolveu esse problema (assumindo `runInit` ja aceita `cwd`), reusar.

- **Local — stubs Steps 7-10:** Stubs do Plano 01 fase-04 retornam `{ mutated: false, summary: 'stub' }`.
  Eles nao geram efeitos colaterais — apenas Steps 1-6 produzem efeitos visiveis no disco.
  Validar apenas isso.

- **Local — re-validar tracer global:** Mesma estrategia da fase-04 do Plano 02. R6 mitigation
  explicita.

---

## Verificacao

### TDD

- [ ] **RED:** `tests/e2e/init-v7-scaffold-and-gh.test.ts` falha porque registry ainda tem
  stubs nos Steps 5-6 (placeholders nao sao escritos, `.github/` files nao existem).
  - Comando: `bun test tests/e2e/init-v7-scaffold-and-gh.test.ts --grep "CA-01"`
  - Resultado esperado: falha por `ENOENT` em `fs.stat(path.join(tmp, '.github/workflows/harness.yml'))`

- [ ] **GREEN:** Apos trocar os 2 imports no registry, todos os testes passam.
  - Comando: `bun test tests/e2e/init-v7-scaffold-and-gh.test.ts`
  - Resultado esperado: `4 passed, 0 failed`

### Checklist

- [ ] `registry.ts` importa `scaffoldAndLinkStep` de `./steps/05-scaffold-and-link` (real)
- [ ] `registry.ts` importa `installGhFilesStep` de `./steps/06-install-gh-files` (real)
- [ ] Os outros 8 imports permanecem como estavam apos Plano 01 fase-04 (e Plano 02 se executado)
- [ ] `tests/e2e/init-v7-scaffold-and-gh.test.ts` passa (4 testes)
- [ ] `tests/e2e/init-v7-tracer-bullet.test.ts` (Plano 01 fase-06) continua verde — R6 mitigation
- [ ] `bun run test` global verde
- [ ] `bun run typecheck` limpo
- [ ] `bun run lint` limpo
- [ ] `MEMORY.md` do Plano 03 atualizado com `Status: concluido` e metricas finais

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/e2e/init-v7-scaffold-and-gh.test.ts` retorna `4 passed, 0 failed`
- `bun test tests/e2e/init-v7-tracer-bullet.test.ts` continua verde (R6)
- `grep -c "scaffoldAndLinkStep" skills/init/lib/registry.ts` retorna >= 1
- `grep -c "installGhFilesStep" skills/init/lib/registry.ts` retorna >= 1
- `bun run typecheck && bun run lint` retorna exit 0
- `bun run test` global passa

**Por humano:**
- Inspecionar o fixture do teste CA-01 apos run: ver os 36 placeholders + 2 arquivos
  `.github/` + `CLAUDE.md` raiz mirror. Inspecionar fixture do CA-02: `.claude/CLAUDE.md`
  com exatamente 533 linhas, sem byte adicionado.

---

<!-- Gerado por /plan-feature em 2026-05-21 -->
