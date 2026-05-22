# Fase 01: Tracer Bullet — FasePlanInput v1 type + renderFasePlan

**Plano:** 01 — Schema, Renderer e Data
**Sizing:** 2h
**Depende de:** Nenhuma (primeira fase)
**Visual:** false

---

## O que esta fase entrega

O contrato basico: tipo `FasePlanInput v1` exportado + funcao pura `renderFasePlan` que emite as 10 H2 do Andre na ordem fixa, com placeholders nas 3 H2 deferidas (Validation Log, Compound Opportunity, Lessons Captured) e Final Report Contract hardcoded como bloco final.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/render-fase-plan.ts` | Create | Novo modulo: tipo `FasePlanInput` + funcao `renderFasePlan` |
| `skills/init/lib/render-fase-plan.test.ts` | Create | Snapshot test com 1 input sintetico + asserts estruturais |
| `skills/init/lib/__golden__/fase-plan-sample.md` | Create | Golden esperado do snapshot (fixa byte-a-byte a ordem das 10 H2) |

---

## Implementacao

### Passo 1: Definir o tipo `FasePlanInput` (10 H2 base + 6 extensoes + identidade)

Espelha literalmente o schema da ADR-0022. Comentarios de provenance apontam para a ADR.

```typescript
// skills/init/lib/render-fase-plan.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-01 — ADR-0022 FasePlanInput v1.
// Schema com schemaVersion: 1 explicito para evolucao futura sem migration retroativa.

export type Wave = {
  readonly name: string
  readonly items: ReadonlyArray<string>
}

export type RiskEntry = {
  readonly risk: string
  readonly mitigation: string
}

export type StackVariants = {
  readonly rails?: string
  readonly nextjs?: string
  readonly 'node-ts'?: string
}

export type FasePlanInput = {
  // === Identidade ===
  readonly docPath: string
  readonly schemaVersion: 1

  // === Base Andre (10 H2 literal, ordem fixa) ===
  readonly goal: string
  readonly scope: { readonly in: ReadonlyArray<string>; readonly out: ReadonlyArray<string> }
  readonly assumptions: ReadonlyArray<string>
  readonly risks: ReadonlyArray<RiskEntry>
  readonly waves: ReadonlyArray<Wave>
  readonly reviewChecklist: ReadonlyArray<string>
  // Validation Log    -> placeholder no renderer
  readonly compoundOpportunity: string
  // Lessons Captured  -> placeholder no renderer
  readonly exitCriteria: ReadonlyArray<string>

  // === Extensoes AVC ===
  readonly guidanceFile: string
  readonly detectionSignals: ReadonlyArray<string>
  readonly mustCover: Readonly<Record<string, ReadonlyArray<string>>>
  readonly linkTargets: ReadonlyArray<string>
  readonly stackVariants?: StackVariants
  readonly validationCommand: string
  readonly dependsOn: ReadonlyArray<string>
}
```

### Passo 2: Implementar `renderFasePlan` — ORDEM das 10 H2 eh literal

A constante `SECTION_TITLES` espelha a do `populate-plan-generator.ts` atual mas vai virar a unica fonte da verdade.

```typescript
const SECTION_TITLES = [
  '## Goal',
  '## Scope',
  '## Assumptions',
  '## Risks',
  '## Execution Steps',
  '## Review Checklist',
  '## Validation Log',
  '## Compound Opportunity',
  '## Lessons Captured',
  '## Exit Criteria',
] as const

export function renderFasePlan(input: FasePlanInput): string {
  const lines: string[] = []

  // Identidade / cabecalho
  lines.push(`# Populate: ${input.docPath}`)
  lines.push('')
  // Bloco AVC ext: guidanceFile + detectionSignals + dependsOn + validationCommand
  lines.push(`**Guidance file:** \`${input.guidanceFile}\``)
  lines.push(`**Validation command:** \`${input.validationCommand}\``)
  lines.push(`**Depends on:** ${input.dependsOn.length ? input.dependsOn.join(', ') : '— (independent)'}`)
  if (input.detectionSignals.length > 0) {
    lines.push('')
    lines.push('**Detection signals (grep before writing):**')
    for (const s of input.detectionSignals) lines.push(`- \`${s}\``)
  }
  lines.push('')

  // ## Goal
  lines.push(SECTION_TITLES[0]); lines.push('')
  lines.push(input.goal); lines.push('')

  // ## Scope
  lines.push(SECTION_TITLES[1]); lines.push('')
  lines.push('**In:**')
  for (const s of input.scope.in) lines.push(`- ${s}`)
  lines.push('')
  lines.push('**Out:**')
  for (const s of input.scope.out) lines.push(`- ${s}`)
  lines.push('')

  // ## Assumptions
  lines.push(SECTION_TITLES[2]); lines.push('')
  for (const a of input.assumptions) lines.push(`- ${a}`)
  lines.push('')

  // ## Risks
  lines.push(SECTION_TITLES[3]); lines.push('')
  lines.push('| Risco | Mitigacao |')
  lines.push('|-------|-----------|')
  for (const r of input.risks) lines.push(`| ${r.risk} | ${r.mitigation} |`)
  lines.push('')

  // ## Execution Steps (Waves) + mustCover inline por wave 2 item se houver
  lines.push(SECTION_TITLES[4]); lines.push('')
  for (const w of input.waves) {
    lines.push(`### ${w.name}`); lines.push('')
    for (const item of w.items) lines.push(`- ${item}`)
    lines.push('')
  }

  // mustCover (bloco extra apos Waves)
  const mustCoverKeys = Object.keys(input.mustCover)
  if (mustCoverKeys.length > 0) {
    lines.push('**Must cover (per H2 in target doc):**'); lines.push('')
    for (const key of mustCoverKeys) {
      lines.push(`- **${key}**`)
      for (const item of input.mustCover[key]!) lines.push(`  - ${item}`)
    }
    lines.push('')
  }

  // linkTargets (bloco extra)
  if (input.linkTargets.length > 0) {
    lines.push('**Required outbound links:**'); lines.push('')
    for (const l of input.linkTargets) lines.push(`- ${l}`)
    lines.push('')
  }

  // stackVariants (bloco condicional)
  if (input.stackVariants) {
    const sv = input.stackVariants
    const entries = (['rails', 'nextjs', 'node-ts'] as const)
      .filter(k => sv[k] !== undefined)
    if (entries.length > 0) {
      lines.push('**Stack variants:**'); lines.push('')
      for (const k of entries) lines.push(`- \`${k}\`: ${sv[k]}`)
      lines.push('')
    }
  }

  // ## Review Checklist
  lines.push(SECTION_TITLES[5]); lines.push('')
  for (const c of input.reviewChecklist) lines.push(`- [ ] ${c}`)
  lines.push('')

  // ## Validation Log (placeholder)
  lines.push(SECTION_TITLES[6]); lines.push('')
  lines.push('<!-- preencher durante execucao: comando + resultado -->'); lines.push('')

  // ## Compound Opportunity
  lines.push(SECTION_TITLES[7]); lines.push('')
  lines.push(input.compoundOpportunity); lines.push('')

  // ## Lessons Captured (placeholder)
  lines.push(SECTION_TITLES[8]); lines.push('')
  lines.push('<!-- preencher ao /iterate: links para docs/compound/ -->'); lines.push('')

  // ## Exit Criteria
  lines.push(SECTION_TITLES[9]); lines.push('')
  for (const e of input.exitCriteria) lines.push(`- [ ] ${e}`)
  lines.push('')

  // === Final Report Contract — HARDCODED (ADR-0022 decisao 6) ===
  lines.push('---'); lines.push('')
  lines.push('## Final Report Contract'); lines.push('')
  lines.push('Quando esta fase for executada, o relatorio final DEVE listar:')
  lines.push('- **Files added** — paths criados nesta fase')
  lines.push('- **Files customized** — paths existentes que foram editados')
  lines.push('- **Files unchanged** — paths inspecionados mas nao modificados (com razao)')
  lines.push('- **Unresolved TODOs** — qualquer `TODO(<owner/context needed>): ...` deixado no doc')
  lines.push('- **Validation result** — output de `' + input.validationCommand + '`')
  lines.push('- **First plan path** — proxima fase a executar (de `dependsOn` inverso)')
  lines.push('')

  return lines.join('\n')
}

/** Util compartilhado com testes — extrai linhas H2 do markdown gerado. */
export function extractH2Sections(markdown: string): string[] {
  return markdown
    .split('\n')
    .filter(line => line.startsWith('## '))
    .map(line => line.trim())
}
```

### Passo 3: Snapshot test + asserts estruturais

```typescript
// skills/init/lib/render-fase-plan.test.ts
// 2026-05-21 (Luiz/dev): Plano 01 fase-01 — RED test antes do GREEN do renderer.
// Snapshot fixa as 10 H2 na ordem literal da ADR-0022.

import { describe, test, expect } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { renderFasePlan, extractH2Sections, type FasePlanInput } from './render-fase-plan'

const SAMPLE: FasePlanInput = {
  docPath: 'docs/SECURITY.md',
  schemaVersion: 1,
  goal: 'Document the security posture: auth, secrets handling, data classification.',
  scope: {
    in: ['Auth model', 'Secrets handling'],
    out: ['Pentest reports (lives elsewhere)'],
  },
  assumptions: ['Project has auth in scope'],
  risks: [{ risk: 'Secrets leaked to logs', mitigation: 'Use redactor in logger' }],
  waves: [
    { name: 'Wave 1 — Discovery', items: ['grep `process.env`', 'list auth middlewares'] },
    { name: 'Wave 2 — Write sections', items: ['Write H2: Auth Flow', 'Write H2: Secrets'] },
  ],
  reviewChecklist: ['No real secrets in examples', 'Auth flow links to source'],
  compoundOpportunity: 'Auth misconfigurations belong in docs/compound/ as a gotcha note.',
  exitCriteria: ['harness:validate passes for docs/SECURITY.md', 'Zero placeholders'],

  guidanceFile: 'skills/init/assets/populate-guidance/docs-security-md.md',
  detectionSignals: ['process.env\\.', 'JWT_SECRET', 'cors\\(', 'helmet\\('],
  mustCover: {
    'Auth Flow': ['provider', 'session lifecycle', 'refresh strategy'],
    'Secrets': ['where stored', 'rotation policy', 'access audit'],
  },
  linkTargets: ['docs/ARCHITECTURE.md#components', 'docs/MERGE_GATES.md'],
  stackVariants: {
    rails: 'See devise + rails-secrets conventions',
    nextjs: 'See next-auth + env.local conventions',
    'node-ts': 'See dotenv-safe + custom JWT conventions',
  },
  validationCommand: 'bun run harness:validate',
  dependsOn: [],
}

describe('renderFasePlan (FasePlanInput v1)', () => {
  test('emits H2 in the exact order from ADR-0022 (Andre parity)', () => {
    const md = renderFasePlan(SAMPLE)
    const h2s = extractH2Sections(md)

    expect(h2s).toEqual([
      '## Goal',
      '## Scope',
      '## Assumptions',
      '## Risks',
      '## Execution Steps',
      '## Review Checklist',
      '## Validation Log',
      '## Compound Opportunity',
      '## Lessons Captured',
      '## Exit Criteria',
      '## Final Report Contract',
    ])
  })

  test('Validation Log / Lessons Captured render as placeholders', () => {
    const md = renderFasePlan(SAMPLE)
    expect(md).toContain('<!-- preencher durante execucao: comando + resultado -->')
    expect(md).toContain('<!-- preencher ao /iterate: links para docs/compound/ -->')
  })

  test('Final Report Contract is hardcoded (NOT a field on FasePlanInput)', () => {
    const md = renderFasePlan(SAMPLE)
    expect(md).toContain('## Final Report Contract')
    expect(md).toContain('Files added')
    expect(md).toContain('Files customized')
    expect(md).toContain('Files unchanged')
    expect(md).toContain('Unresolved TODOs')
    expect(md).toContain('Validation result')
    expect(md).toContain('First plan path')
  })

  test('guidanceFile / detectionSignals / linkTargets / stackVariants render in header / dedicated blocks', () => {
    const md = renderFasePlan(SAMPLE)
    expect(md).toContain('**Guidance file:**')
    expect(md).toContain('skills/init/assets/populate-guidance/docs-security-md.md')
    expect(md).toContain('**Detection signals (grep before writing):**')
    expect(md).toContain('**Required outbound links:**')
    expect(md).toContain('**Stack variants:**')
  })

  test('matches golden snapshot (byte-stable)', async () => {
    const goldenPath = path.join(import.meta.dir, '__golden__', 'fase-plan-sample.md')
    const expected = await fs.readFile(goldenPath, 'utf-8')
    const actual = renderFasePlan(SAMPLE)
    expect(actual).toBe(expected)
  })
})
```

### Passo 4: Criar o golden

Gerar a primeira vez com `bun test --update-snapshots` OU rodar o renderer e gravar manualmente em `__golden__/fase-plan-sample.md`. O snapshot fica versionado para travar mudanca de bytes acidental.

---

## Gotchas

- **G1 do plano (ordem H2):** Snapshot test e a guarda. Se quiser mudar wording de uma H2, eh decisao explicita — atualiza ADR-0022.
- **G2 do plano (Final Report Contract hardcoded):** Eh literal no renderer. NAO aceitar PR que tente movê-lo para campo do input.
- **Local:** `mustCover` eh `Record<string, ReadonlyArray<string>>` — chaves arbitrarias (nomes de H2 do doc-alvo, nao da fase). Drift test em fase-04 valida.
- **Local:** `stackVariants` opcional — quando ausente, bloco "Stack variants:" NAO aparece no markdown. Aceito.
- **Local:** `dependsOn: []` renderiza como "— (independent)" no cabecalho (string literal). Plano 02 vai popular `dependsOn` com IDs de fases reais.

---

## Verificacao

### TDD

- [ ] **RED:** `bun test skills/init/lib/render-fase-plan.test.ts` falha porque `render-fase-plan.ts` nao existe (modulo nao encontrado)
- [ ] **RED → GREEN:** apos implementar `render-fase-plan.ts` e gerar `__golden__/fase-plan-sample.md`, `bun test` passa com 5 testes verdes
- [ ] **REFACTOR:** rodar `bun run lint` e `bun run typecheck` sem erros

### Checklist

- [ ] Tipo `FasePlanInput` exportado e importavel (importar de outro arquivo em REPL TS)
- [ ] `renderFasePlan` retorna string com EXATAMENTE 11 H2 (10 do Andre + Final Report Contract)
- [ ] `extractH2Sections(md)` retorna a lista exata da ADR-0022 (test asserta)
- [ ] Golden `__golden__/fase-plan-sample.md` committed e bate byte-a-byte com output do renderer
- [ ] `populate-plan-generator.ts` ANTIGO continua funcional (NAO deletar ainda — Plano 02 fase-01 deleta)
- [ ] Testes passam: `bun test skills/init/lib/render-fase-plan.test.ts`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/render-fase-plan.test.ts` retorna `5 passed, 0 failed`
- `bun run typecheck` passa sem erros
- `bun run lint` passa sem warnings novos
- Arquivo `skills/init/lib/__golden__/fase-plan-sample.md` existe e bate com output do renderer

**Por humano:**
- Diff visual do golden mostra as 11 H2 na ordem exata da ADR-0022
- Final Report Contract aparece como secao H2 separada, NAO como campo do input

---

<!-- Gerado por /plan-feature (inline, auto mode) em 2026-05-21 -->
