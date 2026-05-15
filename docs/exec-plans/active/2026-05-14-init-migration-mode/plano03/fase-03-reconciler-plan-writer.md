<!-- Comment Provenance: 2026-05-14 (Luiz/dev) — gerado por /plan-feature para Plano 03 do /init Migration Mode -->

# Fase 03: Reconciler + Plan Writer

**Plano:** 03 — Subagent Orchestration
**Sizing:** 2h
**Depende de:** fase-02 (`migration-planner.ts` + `SemanticInventory`), Plano 01 fase-01 (`TemplateEntry.category`)
**Visual:** false

---

## O que esta fase entrega

Três módulos interdependentes:

1. **`skills/init/lib/reconciler.ts`** — invoca o Reconciler subagent slot-a-slot, consumindo `SemanticInventory` e `TEMPLATE_MANIFEST`, coletando `VerificationContract` com a decisão por slot e o conteúdo do migration plan.
2. **`skills/init/lib/plan-writer.ts`** — extrai `migration_plan_content` do payload do Reconciler e escreve em `docs/exec-plans/active/YYYY-MM-DD-NNNN-{slot-slug}-migration.md`.
3. **`skills/init/lib/plan-validator.ts`** — valida que migration plans gerados têm exatamente as 10 seções do `new-plan.mjs` do André (CA-08).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/reconciler.ts` | Criar | Orchestrator do Reconciler subagent + integração com plan-writer |
| `skills/init/lib/plan-writer.ts` | Criar | Writer de migration plans com shape André |
| `skills/init/lib/plan-validator.ts` | Criar | Validator das 10 seções obrigatórias |
| `skills/init/lib/reconciler.test.ts` | Criar | Testes com mocks do Reconciler subagent |
| `skills/init/lib/plan-validator.test.ts` | Criar | Testes do validator (RED → GREEN) |

---

## Implementacao

### Passo 1: Escrever testes stub RED

```typescript
// skills/init/lib/plan-validator.test.ts
import { describe, it, expect } from 'bun:test'
import { validateMigrationPlan, REQUIRED_PLAN_SECTIONS } from './plan-validator'

describe('validateMigrationPlan', () => {
  it('module exists and exports validateMigrationPlan', () => {
    expect(typeof validateMigrationPlan).toBe('function')
  })
})
```

```typescript
// skills/init/lib/reconciler.test.ts
import { describe, it, expect } from 'bun:test'
import { runReconciler } from './reconciler'

describe('runReconciler', () => {
  it('module exists and exports runReconciler', () => {
    expect(typeof runReconciler).toBe('function')
  })
})
```

Rodar: `bun run test -- --grep 'validateMigrationPlan|runReconciler'` → RED

### Passo 2: Implementar `plan-validator.ts`

```typescript
// skills/init/lib/plan-validator.ts
// 2026-05-14 (Luiz/dev): CA-08 — plans devem ter 10 seções exatas do new-plan.mjs do André

/**
 * Seções obrigatórias do migration plan, em ordem.
 * Shape exato do new-plan.mjs de André Prado.
 * CA-08: validator rejeita plans com seção faltando ou com nome errado.
 */
export const REQUIRED_PLAN_SECTIONS = [
  'Goal',
  'Scope',
  'Assumptions',
  'Risks',
  'Execution Steps',
  'Review Checklist',
  'Validation Log',
  'Compound Opportunity',
  'Lessons Captured',
  'Exit Criteria',
] as const

export type PlanSection = (typeof REQUIRED_PLAN_SECTIONS)[number]

export type PlanValidationResult = {
  valid: boolean
  missingSections: string[]
  extraSections: string[]
  /** Erros de ordem (seção presente mas fora de ordem). */
  orderErrors: string[]
}

/**
 * Extrai heading H2 slugs de um markdown string.
 * Retorna apenas o texto após "## " (case-sensitive).
 */
function extractH2Sections(markdown: string): string[] {
  const sections: string[] = []
  for (const line of markdown.split('\n')) {
    const m = line.match(/^## (.+)/)
    if (m?.[1]) sections.push(m[1].trim())
  }
  return sections
}

/**
 * Valida que um migration plan contém as 10 seções obrigatórias em ordem.
 *
 * @param planContent Conteúdo markdown do plan (string completa)
 * @returns PlanValidationResult com valid=true se todas as 10 seções presentes
 *
 * @example
 * const result = validateMigrationPlan(content)
 * if (!result.valid) throw new Error(`Plan inválido: ${result.missingSections.join(', ')}`)
 */
export function validateMigrationPlan(planContent: string): PlanValidationResult {
  const found = extractH2Sections(planContent)
  const required = REQUIRED_PLAN_SECTIONS as readonly string[]

  const missingSections = required.filter((s) => !found.includes(s))
  const extraSections = found.filter((s) => !required.includes(s))

  // Verificar ordem: required sections devem aparecer na ordem correta
  const orderErrors: string[] = []
  const foundRequired = found.filter((s) => required.includes(s))
  for (let i = 0; i < foundRequired.length; i++) {
    if (foundRequired[i] !== required[i]) {
      orderErrors.push(
        `Seção "${foundRequired[i]}" encontrada na posição ${i + 1}, esperado "${required[i]}"`,
      )
    }
  }

  return {
    valid: missingSections.length === 0 && orderErrors.length === 0,
    missingSections,
    extraSections,
    orderErrors,
  }
}
```

### Passo 3: Implementar `plan-writer.ts`

```typescript
// skills/init/lib/plan-writer.ts
// 2026-05-14 (Luiz/dev): plan writer — shape new-plan.mjs do André, paths em docs/exec-plans/active/

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { validateMigrationPlan } from './plan-validator'

export type PlanWriterOptions = {
  /**
   * Se true, lança erro quando plan não passa em validateMigrationPlan.
   * Default: true (CA-08 é estrito).
   */
  strict?: boolean
}

export type WrittenPlan = {
  /** Path absoluto do arquivo escrito. */
  absolutePath: string
  /** Path relativo ao targetDir. */
  relativePath: string
  /** Slug do slot canônico (ex: "design" para "docs/DESIGN.md"). */
  slotSlug: string
  /** domain_status do Reconciler para este slot. */
  domainStatus: string
}

/**
 * Converte um path de slot canônico em slug para o filename do plan.
 * Ex: "docs/DESIGN.md" → "design"
 * Ex: "docs/design-docs/ADR-template.md" → "adr-template"
 */
export function slotToSlug(slotPath: string): string {
  const basename = path.posix.basename(slotPath, '.md')
  return basename
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Retorna o próximo índice de 4 dígitos para plans existentes no diretório.
 * Ex: se existem 0001 e 0002, retorna "0003".
 */
async function nextPlanIndex(activeDir: string): Promise<string> {
  let entries: string[] = []
  try {
    entries = await fs.readdir(activeDir)
  } catch {
    return '0001'
  }
  const migrationPlans = entries.filter((e) => e.match(/^\d{4}-/))
  if (migrationPlans.length === 0) return '0001'

  const maxIndex = migrationPlans.reduce((max, name) => {
    const m = name.match(/^(\d{4})-/)
    const n = m?.[1] ? parseInt(m[1], 10) : 0
    return Math.max(max, n)
  }, 0)

  return String(maxIndex + 1).padStart(4, '0')
}

/**
 * Escreve um migration plan no formato canônico do André.
 * CA-08: valida 10 seções antes de escrever. Lança se validation falhar (strict mode).
 *
 * @param targetDir Raiz do projeto
 * @param slotPath Path do slot canônico (ex: "docs/DESIGN.md")
 * @param domainStatus Decisão do Reconciler (ex: "divergent")
 * @param planContent Conteúdo markdown completo do plan (com 10 seções)
 * @param date Data no formato YYYY-MM-DD (default: hoje)
 * @param opts Opções
 */
export async function writeMigrationPlan(
  targetDir: string,
  slotPath: string,
  domainStatus: string,
  planContent: string,
  date: string = new Date().toISOString().slice(0, 10),
  opts: PlanWriterOptions = {},
): Promise<WrittenPlan> {
  const strict = opts.strict ?? true

  // CA-08: validar antes de escrever
  const validation = validateMigrationPlan(planContent)
  if (!validation.valid && strict) {
    throw new Error(
      `Plan inválido para slot "${slotPath}": ` +
        `seções faltando: [${validation.missingSections.join(', ')}]; ` +
        `erros de ordem: [${validation.orderErrors.join('; ')}]`,
    )
  }

  const slug = slotToSlug(slotPath)
  const activeDir = path.join(targetDir, 'docs/exec-plans/active')
  await fs.mkdir(activeDir, { recursive: true })

  const index = await nextPlanIndex(activeDir)
  const filename = `${date}-${index}-${slug}-migration.md`
  const absolutePath = path.join(activeDir, filename)
  const relativePath = `docs/exec-plans/active/${filename}`

  // Adicionar frontmatter se ausente no planContent
  const finalContent = planContent.startsWith('---')
    ? planContent
    : `---\nslot: ${slotPath}\ndomain_status: ${domainStatus}\ncreated: ${date}\nstatus: active\n---\n\n${planContent}`

  await fs.writeFile(absolutePath, finalContent, 'utf-8')

  return { absolutePath, relativePath, slotSlug: slug, domainStatus }
}
```

### Passo 4: Implementar `reconciler.ts`

```typescript
// skills/init/lib/reconciler.ts
// 2026-05-14 (Luiz/dev): Reconciler orchestrator — slot-a-slot, emite VerificationContract

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseContract } from '../../lib/subagent-contract'
import type { VerificationContract } from '../../lib/subagent-contract'
import type { TemplateEntry } from './template-manifest'
import type { SemanticInventory } from './migration-planner'
import type { SubagentInvoker } from './migration-planner'
import type { AuditLogger } from './audit-log'
import { writeMigrationPlan } from './plan-writer'

export type ReconcilerOptions = {
  logger?: AuditLogger
  /** Se true, gera plan mesmo para slots 'empty'. Default: true. */
  generateEmptySlotPlans?: boolean
  /** Número máximo de slots por invocação do Reconciler. Default: 5. */
  slotsPerInvocation?: number
}

export type ReconcilerResult = {
  /** Paths absolutos de todos os plans escritos. */
  planPaths: string[]
  /** Slots que falharam reconciliação. */
  failedSlots: string[]
  /** Resumo por slot. */
  slotDecisions: Array<{
    slotPath: string
    domainStatus: string
    planPath?: string
    error?: string
  }>
}

function isVerificationPayload(v: unknown): v is { checks: unknown[]; domain_status?: string; migration_plan_content?: string } {
  return typeof v === 'object' && v !== null && 'checks' in v && Array.isArray((v as Record<string, unknown>)['checks'])
}

/**
 * Orquestra o Reconciler subagent para todos os slots do TEMPLATE_MANIFEST.
 * Itera slot-a-slot (ou em pequenos grupos), emite migration plans completos.
 *
 * @param semanticInventory Output da Fase 1 (Explorer)
 * @param templateManifest TEMPLATE_MANIFEST com campo category
 * @param targetDir Raiz do projeto
 * @param invoker Abstração sobre Task tool
 * @param opts Opções
 */
export async function runReconciler(
  semanticInventory: SemanticInventory,
  templateManifest: TemplateEntry[],
  targetDir: string,
  invoker: SubagentInvoker,
  opts: ReconcilerOptions = {},
): Promise<ReconcilerResult> {
  const runId = semanticInventory.run_id
  const slotsPerInvocation = opts.slotsPerInvocation ?? 5
  const generateEmptySlotPlans = opts.generateEmptySlotPlans ?? true

  // Carregar prompt do Reconciler
  const promptPath = path.join(import.meta.dir, 'prompts/reconciler.md')
  const reconcilerPrompt = await fs.readFile(promptPath, 'utf-8')

  const planPaths: string[] = []
  const failedSlots: string[] = []
  const slotDecisions: ReconcilerResult['slotDecisions'] = []

  // Processar slots em grupos de slotsPerInvocation
  for (let i = 0; i < templateManifest.length; i += slotsPerInvocation) {
    const slotBatch = templateManifest.slice(i, i + slotsPerInvocation)

    for (const slot of slotBatch) {
      try {
        // Filtrar semantic entries relevantes para este slot
        const relevantEntries = semanticInventory.entries.filter(
          (e) => e.slot_match === slot.path || e.confidence > 0.5,
        )

        const inputJson = JSON.stringify(
          {
            run_id: runId,
            current_slot: slot.path,
            slot_category: slot.category,
            slot_description: slot.description,
            relevant_semantic_entries: relevantEntries,
          },
          null,
          2,
        )

        const rawOutput = await invoker(
          reconcilerPrompt + '\n\n## Input\n\n```json\n' + inputJson + '\n```',
          {},
        )

        const result = parseContract(rawOutput)
        if (!result.valid || !result.contract) {
          throw new Error(`Reconciler contract invalid: ${result.errors.map((e) => e.message).join('; ')}`)
        }
        if (result.contract.kind !== 'verification') {
          throw new Error(`Reconciler expected kind:verification, got ${result.contract.kind}`)
        }

        const contract = result.contract as VerificationContract
        const payload = contract.payload

        if (!isVerificationPayload(payload)) {
          throw new Error('Reconciler payload missing checks array')
        }

        const domainStatus = (payload as Record<string, unknown>)['domain_status'] as string | undefined ?? 'unknown'
        const planContent = (payload as Record<string, unknown>)['migration_plan_content'] as string | undefined

        opts.logger?.append({
          agent: 'reconciler',
          run_id: runId,
          slot: slot.path,
          status: contract.status,
          domain_status: domainStatus,
          timestamp: new Date().toISOString(),
        })

        // Escrever plan se temos conteúdo (e se não é empty sem plan ou se generateEmptySlotPlans=true)
        if (planContent && (domainStatus !== 'empty' || generateEmptySlotPlans)) {
          const written = await writeMigrationPlan(
            targetDir,
            slot.path,
            domainStatus,
            planContent,
          )
          planPaths.push(written.absolutePath)
          slotDecisions.push({
            slotPath: slot.path,
            domainStatus,
            planPath: written.absolutePath,
          })
        } else {
          slotDecisions.push({ slotPath: slot.path, domainStatus })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        failedSlots.push(slot.path)
        slotDecisions.push({ slotPath: slot.path, domainStatus: 'error', error: message })

        opts.logger?.append({
          agent: 'reconciler',
          run_id: runId,
          slot: slot.path,
          status: 'needs_retry',
          error: message,
          timestamp: new Date().toISOString(),
        })
      }
    }
  }

  return { planPaths, failedSlots, slotDecisions }
}
```

### Passo 5: Expandir `migration-planner.ts` para chamar Reconciler

Em `runMigrationPlanner`, após escrever `semantic-inventory.json`, adicionar chamada ao Reconciler:

```typescript
// Em migration-planner.ts, após escrever semantic-inventory.json:

// Nota: runReconciler importado de './reconciler' — criado em fase-03
// Importação adiada para evitar circular dependency durante desenvolvimento

// O resultado da Fase 2 (Reconciler) popula planPaths:
// const reconcilerResult = await runReconciler(semanticInventory, templateManifest, targetDir, invoker, { logger: opts.logger })
// return { semanticInventory, planPaths: reconcilerResult.planPaths, aborted, abortReason }
```

**Nota:** A integração explícita do Reconciler no `runMigrationPlanner` é feita nesta fase,
mas o trecho acima é pseudocódigo para documentar a intenção. A implementação real adiciona o import
e a chamada após o Reconciler ser testado individualmente.

### Passo 6: Testes do plan-validator

```typescript
// Expandir plan-validator.test.ts

describe('validateMigrationPlan', () => {
  it('module exists and exports validateMigrationPlan', () => {
    expect(typeof validateMigrationPlan).toBe('function')
  })

  it('retorna valid:true para plan com 10 secoes corretas', () => {
    const content = [
      '## Goal', 'test',
      '## Scope', 'test',
      '## Assumptions', 'test',
      '## Risks', 'test',
      '## Execution Steps', 'test',
      '## Review Checklist', 'test',
      '## Validation Log', 'test',
      '## Compound Opportunity', 'test',
      '## Lessons Captured', 'test',
      '## Exit Criteria', 'test',
    ].join('\n')
    const result = validateMigrationPlan(content)
    expect(result.valid).toBe(true)
    expect(result.missingSections).toEqual([])
  })

  it('retorna valid:false quando secao Goal ausente', () => {
    const content = [
      '## Scope', 'test',
      '## Assumptions', 'test',
    ].join('\n')
    const result = validateMigrationPlan(content)
    expect(result.valid).toBe(false)
    expect(result.missingSections).toContain('Goal')
  })

  it('detecta secao com nome errado (case-sensitive)', () => {
    const content = [
      '## goal', // lowercase — inválido
      '## Scope', 'test',
    ].join('\n')
    const result = validateMigrationPlan(content)
    expect(result.missingSections).toContain('Goal')
  })
})
```

---

## Gotchas

**G1 — `migration_plan_content` é string no payload JSON:** O Reconciler gera o markdown como string dentro do JSON. Pode conter `\n` escapados. Ao extrair, usar a string diretamente — não fazer `JSON.parse` secundário.

**G2 — Frontmatter no plan:** `writeMigrationPlan` adiciona frontmatter se não presente. O Reconciler pode ou não gerar frontmatter. O writer verifica com `planContent.startsWith('---')` e adiciona se ausente.

**G3 — `slotToSlug` deve ser idempotente:** `slotToSlug('docs/DESIGN.md')` → `"design"`. `slotToSlug('docs/design-docs/ADR-template.md')` → `"adr-template"`. Testar com slots que têm caracteres especiais (`docs/exec-plans/active/README.md` → `"readme"`).

**G4 — `nextPlanIndex` concorrência:** Reconciler processa slots sequencialmente (não em paralelo), então não há race condition em `nextPlanIndex`. Se paralelismo for adicionado em versões futuras, usar lock de arquivo ou contador atômico.

**G5 — `generateEmptySlotPlans: true` por default:** Todos os 26 slots geram plan, mesmo `empty`. Isso garante que o operador tem visibilidade total do que precisa ser criado. Plan de slot vazio tem Execution Steps: "Criar arquivo do zero usando template canônico".

---

## Verificacao

### TDD (RED → GREEN)
- [ ] RED: `plan-validator.ts` não existe → `bun run test -- --grep 'validateMigrationPlan'` falha
- [ ] GREEN: módulo criado, tests básicos passam
- [ ] RED: test "retorna valid:false quando secao Goal ausente" falha antes de implementar lógica
- [ ] GREEN: lógica de missingSections implementada, test passa
- [ ] RED: `reconciler.ts` não existe → `bun run test -- --grep 'runReconciler'` falha
- [ ] GREEN: módulo criado, test de existência passa

### Checklist
- [ ] `plan-validator.ts` exporta `validateMigrationPlan`, `REQUIRED_PLAN_SECTIONS`, `PlanValidationResult`
- [ ] `REQUIRED_PLAN_SECTIONS` tem exatamente 10 elementos em ordem correta
- [ ] `validateMigrationPlan` rejeita plan com qualquer das 10 seções faltando
- [ ] `validateMigrationPlan` detecta erros de ordem (CA-08: seções na ordem certa)
- [ ] `plan-writer.ts` exporta `writeMigrationPlan`, `slotToSlug`, `WrittenPlan`
- [ ] `writeMigrationPlan` adiciona frontmatter se ausente
- [ ] `writeMigrationPlan` usa `nextPlanIndex` para filename sequencial
- [ ] `writeMigrationPlan` lança erro em strict mode se plan inválido
- [ ] `reconciler.ts` exporta `runReconciler`, `ReconcilerResult`
- [ ] Reconciler registra cada slot em `agents-log.json` via `opts.logger`
- [ ] `bun run tsc --noEmit` passa
- [ ] `bun run test` passa
- [ ] `bun run lint` limpo

---

## Criterio de Aceite

**Por máquina:**
- `bun run test -- --grep 'validateMigrationPlan'` retorna ≥4 testes PASS
- `writeMigrationPlan` com plan de 10 seções corretas escreve arquivo sem lançar erro
- `writeMigrationPlan` com plan faltando "Goal" lança erro em strict mode
- `bun run tsc --noEmit` exit code 0

<!-- Gerado por /plan-feature em 2026-05-14 -->
