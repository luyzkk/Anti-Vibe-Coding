<!--
Princípio universal #5 — Comment Provenance.
Helpers TS deste plugin tem JSDoc canonico — provenance inline aplica-se apenas
a logica nao-obvia (subagent_id literal pre-definido, posicao no registry,
contrato Step{id, run}).
-->

# Fase 03: Step 91 `generate-populate-plan` + registro no registry (TDD)

**Plano:** 02 — Tracer Bullet — Populate Plan Generator
**Sizing:** 0.5h
**Depende de:** fase-02 (helper `generatePopulatePlan` exportado de `lib/populate-plan-generator.ts`)
**Visual:** false

---

## O que esta fase entrega

Novo step `generatePopulatePlanStep` implementando o contrato canonico `Step { id, run }` em `skills/init/lib/steps/91-generate-populate-plan.ts`. Step consome `generatePopulatePlan` (fase-02), escreve o PLAN.md de populacao em disco no `cwd` do projeto-alvo, retorna `StepReport` com `mutated: true` e summary em PT-BR sugerindo `/anti-vibe-coding:execute-plan`. Step e adicionado como ULTIMA entrada do `registry.ts`, apos `finalValidationStep` (MH-01, G7 do plano).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/91-generate-populate-plan.ts` | Create | Step com `id: '91-generate-populate-plan'` + `run(ctx)` |
| `skills/init/lib/steps/91-generate-populate-plan.test.ts` | Create | 4 testes: escrita correta, summary PT-BR, mutated true, idempotencia |
| `skills/init/lib/registry.ts` | Modify | Import + append ao array `registry` (ultima posicao) |
| `skills/init/lib/registry.test.ts` | Create or Modify | Asserta posicao 91 = ultima + id unico no array |
| `docs/exec-plans/active/2026-05-17-refactor-init-harness-populate-merge/plano02/MEMORY.md` | Modify | Registrar DI da posicao no registry + subagent_id canonico |

---

## Implementacao

### Passo 1: Definir o step (RED)

```typescript
// skills/init/lib/steps/91-generate-populate-plan.ts

// 2026-05-18 (Luiz/dev): MH-01 do PRD — Step 91 emite PLAN.md de populacao em disco.
// D3 do PRD: init NAO invoca /execute-plan — apenas sugere via summary.
// G1 do plano02: NUNCA chamar a skill /execute-plan programaticamente daqui.
// SH-07 do PRD / G8 do plano02: subagent_id canonico para audit log futuro (Plano 06 fase-01).
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { detectProjectName } from '../detect-project-name'
import { generatePopulatePlan } from '../populate-plan-generator'
import type { Step } from './types'

/** SH-07 do PRD — subagent_id canonico para Plano 06 fase-01 audit log padronizado. */
const SUBAGENT_ID = 'init-populate-plan-gen' as const

export const generatePopulatePlanStep: Step = {
  id: '91-generate-populate-plan',
  async run(ctx) {
    const projectName = detectProjectName(ctx.cwd)

    // 2026-05-18 (Luiz/dev): CH-03 do PRD — no tracer bullet (greenfield), sharedGlossary
    // eh undefined porque Step 08 classify-blocks-hybrid (Plano 03) ainda nao rodou.
    // Plano 05 fase-03 (drift detector) e Plano 03 fase-06 podem passar terminologia real.
    const result = await generatePopulatePlan({
      cwd: ctx.cwd,
      projectName,
      // sharedGlossary: undefined  // explicit por documentacao
    })

    const absolutePath = path.join(ctx.cwd, result.relativePath)
    await fs.mkdir(path.dirname(absolutePath), { recursive: true })
    await fs.writeFile(absolutePath, result.planMarkdown, 'utf8')

    // 2026-05-18 (Luiz/dev): RNF-05 do PRD — summary em PT-BR para mensagem final do init.
    const summary = [
      `Plano de populacao gerado: ${result.relativePath}`,
      `Tasks emitidas: ${result.tasks.length} (${result.tasks.filter(t => t.wave === 1).length} populacao + 1 validacao).`,
      'Para popular o harness com analise do repo: /anti-vibe-coding:execute-plan',
    ].join('\n')

    return { mutated: true, summary }
  },
}
```

### Passo 2: Registrar no `registry.ts`

Modificar `skills/init/lib/registry.ts`:

```typescript
// Adicionar import no topo, junto aos demais:
import { generatePopulatePlanStep } from './steps/91-generate-populate-plan'

// Apender ao array `registry` apos `finalValidationStep`:
export const registry: readonly Step[] = [
  detectLegacyStep,
  reuseDiscoveryStep,
  migrate0ParseDryRunStep,
  migrateAllOrchestrateStep,
  migrate1BackupStep,
  migrate2PlanningStep,
  migrate3LessonsStep,
  migrate4DecisionsStep,
  scaffoldFullTreeStep,
  linkClaudeAgentsStep,
  detectStackAndRegisterStep,
  persistStackKnowledgeStep,
  customizeArchitectureStep,
  installGhFilesStep,
  deliveryLoopStep,
  capabilitiesDiscoveryStep,
  finalValidationStep,
  // 2026-05-18 (Luiz/dev): MH-01 do PRD / G7 do plano02 —
  // Step 91 SEMPRE apos finalValidationStep. Gerar PLAN.md com harness invalido geraria lixo.
  generatePopulatePlanStep,
]
```

> **Atencao G7:** ordem e contratual. Plano 04 fase-06 vai reordenar `linkClaudeAgentsStep` (Step 02) para depois de `apply-merge-destructive` (Step 10). Mas Step 91 fica SEMPRE como ultima entrada — nenhum step adicional cabe depois sem revisao do registry.

### Passo 3: Testes do Step (`91-generate-populate-plan.test.ts`)

Cada teste usa `mkdtemp` isolado + clock injetado via `generatePopulatePlan` (mas o step nao expoe clock — testes verificam apenas comportamento observavel).

> **Nota:** o step nao recebe clock como ctx — ele depende do clock real via `generatePopulatePlan`. Para testes deterministicos, **stuba** `detectProjectName` se necessario e aceita data flutuante. Os asserts focam em **estrutura** (path comeca com `docs/exec-plans/active/`, termina com `-populate-harness/PLAN.md`) em vez de data exata.

| # | Nome do teste | O que verifica |
|---|---------------|----------------|
| 1 | `writes PLAN.md at docs/exec-plans/active/{date}-populate-harness/PLAN.md` | Chama `generatePopulatePlanStep.run({ cwd: tmpdir, args: [], flags: {} })`. Le diretorio `tmpdir/docs/exec-plans/active/`. Asserta que existe EXATAMENTE 1 entrada que casa regex `^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z-populate-harness$` e que dentro ha `PLAN.md`. |
| 2 | `summary suggests /anti-vibe-coding:execute-plan in PT-BR` | `expect(report.summary).toContain('/anti-vibe-coding:execute-plan')` + `toContain('Plano de populacao gerado')`. |
| 3 | `mutated is true` | `expect(report.mutated).toBe(true)`. |
| 4 | `re-running writes a different folder (timestamp differs)` | Chama o step 2x em sequencia no mesmo tmpdir. Verifica que `fs.readdir('docs/exec-plans/active/')` retorna 2 entradas distintas (caminho varia por segundo). **Tolerancia:** se as 2 chamadas caem no mesmo segundo (raro em test runner), o teste eh skip-tolerante via `await new Promise(r => setTimeout(r, 1100))` entre as chamadas — documentar em comentario. |

### Passo 4: Teste do registry (`registry.test.ts`)

Pode ser arquivo novo se nao existir, ou modificacao se existir. Asserts:

```typescript
import { describe, expect, test } from 'bun:test'
import { registry } from './registry'

describe('registry', () => {
  test('all step ids are unique', () => {
    const ids = registry.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('91-generate-populate-plan is the last step', () => {
    expect(registry.at(-1)?.id).toBe('91-generate-populate-plan')
  })

  test('91-generate-populate-plan comes after final-validation', () => {
    const finalIdx = registry.findIndex(s => s.id === 'final-validation')
    const populateIdx = registry.findIndex(s => s.id === '91-generate-populate-plan')
    expect(finalIdx).toBeGreaterThanOrEqual(0)
    expect(populateIdx).toBeGreaterThan(finalIdx)
  })
})
```

### Passo 5: REFACTOR

- Garantir que `SUBAGENT_ID` esta exportado como `export const SUBAGENT_ID = 'init-populate-plan-gen' as const` para Plano 06 fase-01 importar quando wireear audit log.
- JSDoc nos exports.
- Verificar que nao ha import circular (registry → step → populate-plan-generator → template-manifest; nenhuma volta).

---

## Snippets de referencia

### Contrato `Step` esperado (lembrete da fase)

```typescript
// De skills/init/lib/steps/types.ts (NAO modificar — contrato pronto).
export type Step = {
  readonly id: string
  run(ctx: StepContext): Promise<StepReport>
}

export type StepReport = {
  mutated: boolean
  summary: string
  skipRemaining?: boolean
  needsUser?: { readonly prompt: string; readonly options: readonly string[] }
}
```

### `detectProjectName` (reuso)

Helper ja existe em `skills/init/lib/detect-project-name.ts`. Step 91 importa e usa — nao reimplementa.

---

## Gotchas

- **G1 do plano (init NAO executa o plano):** Summary do step SUGERE `/anti-vibe-coding:execute-plan` em PT-BR. Em hipotese alguma o step chama a skill `/execute-plan` programaticamente. Test #2 verifica a string sugerida.
- **G7 do plano (posicao no registry):** `generatePopulatePlanStep` e SEMPRE a ultima entrada. Test do registry asserta `registry.at(-1)?.id === '91-generate-populate-plan'`. Se Plano 04 fase-06 reorder do Step 02 mudar o array, este teste continua valido — checagem por id, nao por indice numerico.
- **G8 do plano (subagent_id canonico):** `SUBAGENT_ID = 'init-populate-plan-gen'`. Exportar para Plano 06 fase-01 importar quando wireear audit log padronizado. Nao tentar emitir audit log aqui — wiring vem no Plano 06.
- **Local — `ctx.flags['--dry-run']`:** Plano 05 fase-01 vai adicionar bypass quando dry-run estiver ativo (Step 91 retorna `mutated: false` + summary "Preview do plano de populacao: {primeiras 10 linhas}" sem escrever em disco). Aqui no tracer bullet, **NAO** implementar dry-run — escopo do Plano 05. Apenas deixar um TODO comentado:
  ```typescript
  // 2026-05-18 (Luiz/dev): TODO Plano 05 fase-01 — bypass de mutacao quando flags['--dry-run'] === true.
  ```
- **Local — `fs.mkdir({ recursive: true })`:** Necessario porque `docs/exec-plans/active/{date}-populate-harness/` ainda nao existe (date fresh). Sem `recursive`, falha.
- **Local — encoding utf8 explicito:** `fs.writeFile(..., result.planMarkdown, 'utf8')`. Sem isso, Node assume UTF-8 mas tooling Windows pode quebrar (G5 do plano).
- **Local — registry test imutavel:** `registry` exportado como `readonly Step[]`. Test nao tenta mutar — apenas le.

---

## Verificacao

### TDD

- [ ] **RED:** Criar `91-generate-populate-plan.test.ts` + `registry.test.ts` ANTES de criar o step. Stub vazio em `91-generate-populate-plan.ts` exportando objeto `{ id: '91-generate-populate-plan', async run() { throw new Error('not implemented') } }`. Rodar:
  - Comando: `bun test skills/init/lib/steps/91-generate-populate-plan.test.ts skills/init/lib/registry.test.ts`
  - Resultado esperado: testes do step falham por assertion (path nao existe) + teste do registry falha porque ainda nao foi adicionado ao array.

- [ ] **GREEN:**
  1. Implementar `run` do step (le `generatePopulatePlan`, escreve disco, retorna summary).
  2. Importar e apender ao `registry` em `registry.ts`.
  3. Re-rodar testes — devem passar.
  - Comando: `bun test skills/init/lib/steps/91-generate-populate-plan.test.ts skills/init/lib/registry.test.ts`
  - Resultado esperado: `7 passed, 0 failed` (4 do step + 3 do registry).

- [ ] **REFACTOR:** Exportar `SUBAGENT_ID`, JSDoc em todos os exports, validar absence de import circular.

### Checklist

- [ ] `skills/init/lib/steps/91-generate-populate-plan.ts` exporta `generatePopulatePlanStep: Step` com `id === '91-generate-populate-plan'`.
- [ ] `skills/init/lib/steps/91-generate-populate-plan.ts` exporta `SUBAGENT_ID = 'init-populate-plan-gen'`.
- [ ] `skills/init/lib/registry.ts` tem `generatePopulatePlanStep` como ultima entrada.
- [ ] `registry.test.ts` passa 3 testes (ids unicos + ultima posicao + apos final-validation).
- [ ] `91-generate-populate-plan.test.ts` passa 4 testes.
- [ ] Summary contem `/anti-vibe-coding:execute-plan` (verificado por test #2).
- [ ] Step retorna `mutated: true` (test #3).
- [ ] Sem dependencia circular: `bun run lint` ou `tsc --noEmit` clean.
- [ ] `MEMORY.md` do plano02: registra `SUBAGENT_ID` literal + decisao de nao implementar `--dry-run` nesta fase (escopo Plano 05).

### Validacao end-to-end light (sanity check antes da fase-04)

```bash
# Em tmpdir isolado:
cd $(mktemp -d)
bun run /path/to/anti-vibe-coding/skills/init/index.ts
ls docs/exec-plans/active/
# Esperado: 1 pasta com formato {date}-populate-harness/ contendo PLAN.md
cat docs/exec-plans/active/*-populate-harness/PLAN.md | head -20
# Esperado: "# Plan: Populate Harness — {project-name}"
```

Se sanity check passa, fase-04 (E2E formal) tem alta probabilidade de passar imediatamente.

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/steps/91-generate-populate-plan.test.ts` retorna `4 passed, 0 failed`.
- `bun test skills/init/lib/registry.test.ts` retorna `3 passed, 0 failed`.
- `grep -c '91-generate-populate-plan' skills/init/lib/registry.ts` >= 2 (1 import + 1 entrada no array).
- `bun run lint` clean em `91-generate-populate-plan.ts`, `registry.ts`.

**Por humano:**
- Reviewer le `registry.ts` e ve a entrada `generatePopulatePlanStep` apos `finalValidationStep` com comentario provenance explicando "MH-01 / G7: ultima posicao".
- Reviewer le `91-generate-populate-plan.ts` e identifica: (1) onde o step le do gerador, (2) onde escreve em disco, (3) onde compoe o summary PT-BR.

---

## Decisoes Aplicadas

- **D1 do PRD** (4 modos): step nao filtra por modo — roda em todos. Plano 05 fase-03 (drift) faz filtragem ANTES de chamar este step, passando lista reduzida.
- **D3 do PRD** (sugestao, nao invocacao): summary em PT-BR sugere `/anti-vibe-coding:execute-plan`. NENHUMA chamada programatica a skill.
- **MH-01 do PRD** (Step 91 apos finalValidation): registry tem entrada como ultima posicao.
- **SH-07 do PRD** (audit log subagent_id padronizado): `SUBAGENT_ID = 'init-populate-plan-gen'` exportado, pronto para Plano 06 fase-01.
- **R-04 do PRD** (Windows compat): `path.join` + `fs.mkdir({ recursive: true })` + `'utf8'` explicito.
- **RNF-05 do PRD** (mensagens user-facing em PT-BR): summary do step inteiro em PT-BR.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
