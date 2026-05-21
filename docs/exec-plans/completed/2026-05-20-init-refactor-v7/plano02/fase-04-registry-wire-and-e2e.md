<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 04: Registry Wire + E2E com Legacy

**Plano:** 02 — Step 3 (secrets-scan) + Step 4 (migrate + manifest) + Shared Manifest Schema
**Sizing:** 0.5h
**Depende de:** fase-02 (Step 3 real), fase-03 (Step 4 real)
**Visual:** false

---

## O que esta fase entrega

`registry.ts` com 2 imports trocados: stub `'03-secrets-scan'` → `secretsScanStep` real, stub
`'04-migrate-planning-and-manifest'` → `migratePlanningAndManifestStep` real. Teste e2e em
fixture com legacy (`.claude/planning/`, `.claude/CLAUDE.md` de 533 linhas, `.claude/progress.txt`)
valida que o init escreve o manifest conforme DT-06 + CA-03 + CA-05.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/registry.ts` | Modify | Trocar 2 stubs por imports reais (`secretsScanStep` da fase-02, `migratePlanningAndManifestStep` da fase-03) |
| `tests/e2e/init-v7-legacy-manifest.test.ts` | Create | E2E em fixture legacy: valida `.claude/legacy-manifest.json` apos `runInit([])` |

---

## Implementacao

### Passo 1: Atualizar `registry.ts`

Plano 01 fase-04 deixou os 10 nomes com 8 stubs. Esta fase substitui apenas as posicoes #3 e #4
pelos imports reais. As demais (Steps 5-10) permanecem stubs ate Planos 03, 04, 05.

Estado esperado apos esta fase (Plano 01 fase-04 ja produziu o registry; aqui so trocamos 2
imports):

```typescript
// skills/init/lib/registry.ts
// 2026-05-21 (Luiz/dev): Plano 02 fase-04 — substitui stubs Step 3 e Step 4 pelos imports reais.
// Demais steps (5-10) continuam stubs ate Planos 03/04/05.

import type { Step } from './steps/types'
import { reentryGateStep } from './steps/01-reentry-gate'
import { detectLegacyAndStackStep } from './steps/02-detect-legacy-and-stack'
import { secretsScanStep } from './steps/03-secrets-scan'                          // 2026-05-21: Plano 02 fase-02 (real)
import { migratePlanningAndManifestStep } from './steps/04-migrate-planning-and-manifest' // 2026-05-21: Plano 02 fase-03 (real)
import { scaffoldAndLinkStep } from './steps/05-scaffold-and-link'                 // stub — Plano 03
import { installGhFilesStep } from './steps/06-install-gh-files'                   // stub — Plano 03
import { generatePopulatePlansStep } from './steps/07-generate-populate-plans'     // stub — Plano 04
import { deliveryLoopStep } from './steps/08-delivery-loop'                        // stub — Plano 05
import { copyKnowledgeStep } from './steps/09-copy-knowledge'                      // stub — Plano 05
import { finalValidationStep } from './steps/10-final-validation'                  // stub — Plano 05

export const registry: readonly Step[] = [
  reentryGateStep,                  // 1: real (Plano 01 fase-03)
  detectLegacyAndStackStep,         // 2: real (Plano 01 fase-02)
  secretsScanStep,                  // 3: real (Plano 02 fase-02) — DV-1
  migratePlanningAndManifestStep,   // 4: real (Plano 02 fase-03)
  scaffoldAndLinkStep,              // 5: stub
  installGhFilesStep,               // 6: stub
  generatePopulatePlansStep,        // 7: stub (CORE — Plano 04)
  deliveryLoopStep,                 // 8: stub
  copyKnowledgeStep,                // 9: stub
  finalValidationStep,              // 10: stub
]
```

**Nota:** Os nomes exatos dos stubs (`scaffoldAndLinkStep`, `installGhFilesStep`, etc.) e seus
paths (`05-scaffold-and-link.ts`, etc.) dependem de como o Plano 01 fase-04 os nomeou. Esta fase
APENAS troca os imports #3 e #4 — nao reescreve o registry. Se nomes divergirem, ajustar de acordo
com o que o Plano 01 fase-04 produziu (consultar o que esta em disco).

### Passo 2: RED — escrever `tests/e2e/init-v7-legacy-manifest.test.ts`

E2E em fixture legacy realista. Roda `runInit([])` e valida o estado final.

```typescript
// tests/e2e/init-v7-legacy-manifest.test.ts
// 2026-05-21 (Luiz/dev): E2E Plano 02 fase-04 init-refactor-v7.
// Cobre CA-03 (.claude/planning/ migrado) + CA-05 (greenfield manifest legacy: []).
import { expect, test, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { runInit } from '../../skills/init/lib/run-init'
import { parseLegacyManifest } from '../../skills/_shared/legacy-manifest-schema'
import { registry } from '../../skills/init/lib/registry'

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'init-v7-e2e-'))
}

async function readManifest(cwd: string) {
  const raw = await fs.readFile(path.join(cwd, '.claude', 'legacy-manifest.json'), 'utf8')
  return parseLegacyManifest(JSON.parse(raw))
}

describe('init v7 e2e — legacy manifest (Plano 02 fase-04)', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('registry: 03-secrets-scan apos 02-detect-legacy-and-stack, antes de 04-migrate-planning-and-manifest', () => {
    const ids = registry.map((s) => s.id)
    const idxSecrets = ids.indexOf('03-secrets-scan')
    const idxDetect = ids.indexOf('02-detect-legacy-and-stack')
    const idxMigrate = ids.indexOf('04-migrate-planning-and-manifest')
    expect(idxDetect).toBeGreaterThanOrEqual(0)
    expect(idxSecrets).toBeGreaterThan(idxDetect)
    expect(idxMigrate).toBeGreaterThan(idxSecrets)
  })

  test('CA-05: greenfield (Node-TS) -> manifest com legacy: [] e stack node-ts high', async () => {
    // Setup: package.json minimo com typescript em devDeps -> stack node-ts
    await fs.writeFile(
      path.join(tmp, 'package.json'),
      JSON.stringify({ name: 'fixture', devDependencies: { typescript: '^5.0' } }, null, 2),
    )

    const exitCode = await runInit([], { cwd: tmp })
    expect(exitCode).toBe(0)

    const manifest = await readManifest(tmp)
    expect(manifest.schemaVersion).toBe('1.0')
    expect(manifest.stack.primary).toBe('node-ts')
    expect(manifest.stack.confidence).toBe('high')
    expect(manifest.legacy).toHaveLength(0)
  })

  test('CA-03: fixture com .claude/planning + .claude/CLAUDE.md (533 linhas) + progress.txt -> manifest completo', async () => {
    // Setup do legacy
    await fs.writeFile(
      path.join(tmp, 'package.json'),
      JSON.stringify({ name: 'fixture', devDependencies: { typescript: '^5.0' } }, null, 2),
    )
    await fs.mkdir(path.join(tmp, '.claude', 'planning'), { recursive: true })
    await fs.writeFile(path.join(tmp, '.claude', 'planning', 'CONTEXT-foo.md'), '# foo')

    const claudeMd = Array.from({ length: 533 }, (_, i) => `linha ${String(i + 1)}`).join('\n')
    await fs.writeFile(path.join(tmp, '.claude', 'CLAUDE.md'), claudeMd)

    await fs.writeFile(path.join(tmp, '.claude', 'progress.txt'), 'gotcha 1')

    // Run init
    const exitCode = await runInit([], { cwd: tmp })
    expect(exitCode).toBe(0)

    // CA-02: CLAUDE.md byte-identico
    const after = await fs.readFile(path.join(tmp, '.claude', 'CLAUDE.md'), 'utf8')
    expect(after).toBe(claudeMd)
    expect(after.split('\n')).toHaveLength(533)

    // CA-03: docs/specs/ existe
    const specsExists = await fs.access(path.join(tmp, 'docs', 'specs')).then(() => true).catch(() => false)
    expect(specsExists).toBe(true)

    // Manifest completo
    const manifest = await readManifest(tmp)
    expect(manifest.legacy.find((e) => e.type === 'planning')?.action).toBe('moved')
    expect(manifest.legacy.find((e) => e.type === 'claude-md')?.lines).toBe(533)
    expect(manifest.legacy.find((e) => e.type === 'compound')?.sourcePath).toBe('.claude/progress.txt')
  })
})
```

### Passo 3: GREEN — implementar swap no `registry.ts`

Editar o registry conforme o Passo 1. Confirmar via `bun run typecheck` que os imports resolvem.
Re-rodar o tracer e2e do Plano 01 fase-06 para garantir que ainda passa (R6 mitigation):

```bash
bun test tests/e2e/init-v7-tracer-bullet.test.ts
```

Esperado: o tracer continua verde mesmo com Steps 3-4 reais (porque sao read-only para
greenfield SEM legacy — manifest com `legacy: []` e secrets-scan retorna 0).

### Passo 4: VERIFY

```bash
bun test tests/e2e/init-v7-legacy-manifest.test.ts
bun run test  # toda a suite
bun run typecheck
bun run lint
```

---

## Gotchas

- **G2 do plano (DV-4 soft typing):** O e2e usa `runInit` que orquestra TODOS os steps. Step 2
  (Plano 01 fase-02) popula `ctx.legacy` + `ctx.stack` antes do Step 4 rodar. Se algo no Plano 01
  estiver incompleto (Step 2 nao popular o ctx corretamente), o e2e desta fase quebra. Diagnostico
  rapido: rodar Step 4 isolado via test de unit (fase-03) — se passa, problema esta no Step 2.

- **G8 do plano (idempotencia):** O e2e roda `runInit` UMA vez. Re-run bloquearia pelo Step 1
  (gate via manifest existente, DR-1 do Plano 01 fase-03). Para testar idempotencia, criar teste
  separado em `tests/e2e/init-v7-reentry.test.ts` (escopo Plano 05). NAO incluir aqui.

- **Local — `runInit` signature:** Confirmar via `Read skills/init/lib/run-init.ts` que assina
  `runInit(args: string[], opts?: { cwd?: string })`. Se diverge, ajustar chamadas. Se `cwd` nao
  for parametro, o teste deve usar `process.chdir(tmp)` antes e `process.chdir(originalCwd)` no
  `afterEach`. Documentar como DI desta fase se precisar fallback.

- **Local — stubs Steps 5-10 silent:** Os stubs do Plano 01 fase-04 retornam
  `{ mutated: false, summary: 'stub' }` (G5 do Plano 01). Eles nao fazem nada — entao apos run,
  apenas Steps 3-4 produziram efeitos visiveis (discovery artifact + legacy-manifest.json +
  possivel docs/specs/). Validar apenas isso.

- **Local — re-validar o tracer global:** O tracer e2e do Plano 01 fase-06 valida que os 10
  steps rodam em ordem com exit 0. Apos esta fase, Steps 3-4 NAO sao mais silenciosos —
  produzem efeitos. O tracer ainda deve passar (greenfield com manifest `legacy: []`), mas
  re-rodar e mitigation explicita do R6.

---

## Verificacao

### TDD

- [ ] **RED:** `tests/e2e/init-v7-legacy-manifest.test.ts` falha porque registry ainda tem stubs
  nos Steps 3-4 (manifest nao e escrito, docs/specs/ nao existe).
  - Comando: `bun test tests/e2e/init-v7-legacy-manifest.test.ts --grep "CA-05"`
  - Resultado esperado: falha por arquivo `.claude/legacy-manifest.json` nao existir

- [ ] **GREEN:** Apos trocar os 2 imports no registry, todos os testes passam.
  - Comando: `bun test tests/e2e/init-v7-legacy-manifest.test.ts`
  - Resultado esperado: `3 passed, 0 failed`

### Checklist

- [ ] `registry.ts` importa `secretsScanStep` de `./steps/03-secrets-scan` (real)
- [ ] `registry.ts` importa `migratePlanningAndManifestStep` de `./steps/04-migrate-planning-and-manifest` (real)
- [ ] Os outros 8 imports (Steps 1-2 reais + Steps 5-10 stubs) permanecem como estavam apos Plano 01 fase-04
- [ ] `tests/e2e/init-v7-legacy-manifest.test.ts` passa (3 testes)
- [ ] `tests/e2e/init-v7-tracer-bullet.test.ts` (Plano 01 fase-06) continua passando — R6 mitigation
- [ ] `bun run test` global verde
- [ ] `bun run typecheck` limpo
- [ ] `bun run lint` limpo
- [ ] `MEMORY.md` do Plano 02 atualizado com `Status: concluido` e metricas finais

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/e2e/init-v7-legacy-manifest.test.ts` retorna `3 passed, 0 failed`
- `bun test tests/e2e/init-v7-tracer-bullet.test.ts` continua verde (R6)
- `grep -c "secretsScanStep" skills/init/lib/registry.ts` retorna >= 1
- `grep -c "migratePlanningAndManifestStep" skills/init/lib/registry.ts` retorna >= 1
- `bun run typecheck && bun run lint` retorna exit 0
- `bun run test` global passa

**Por humano:**
- Inspecionar o fixture do teste CA-03 apos run: `.claude/legacy-manifest.json` espelha a
  estrutura do exemplo do PRD DT-06 (linha 230-273).

---

<!-- Gerado por /plan-feature em 2026-05-21 -->
