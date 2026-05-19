# Fase 03: Populate Plan Renderer v2

**Plano:** 03 — Gerador LLM-driven do PLAN populate
**Sizing:** 2h
**Depende de:** fase-01 (consome `DiscoveryManifestEntry`), fase-02 (consome `StackAwareInputPaths`)
**Visual:** false

---

## O que esta fase entrega

Reescrita de `populate-plan-generator.ts` para emitir markdown com 1 fase por doc canonico,
cada fase contendo 4 blocos obrigatorios (MH-02 do PRD): `Inputs (docs candidatos)`,
`Inputs (codigo)`, `Instrucao LLM`, `Criterio de done`. Glossario de instrucoes LLM no topo.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/populate-plan-generator.ts` | Modify | Reescrita completa — sai `templateContent.replace({{TASKS_BLOCK}})`, entra geracao programatica com 4 blocos por doc |
| `skills/init/lib/populate-plan-generator.test.ts` | Create | Novo arquivo de testes — valida os 4 blocos por fase + glossario + filtros preservados |
| `skills/init/assets/snippets/populate-plan-template.md` | Modify | Reduz a um header curto (so titulo + data + objetivo); blocos vem programatico. Considerar deletar em cleanup futuro (G4 do README) |

**Nota:** o teste antigo `populate-plan-generator.test.ts` (se existir) sera substituido —
verificar com `ls skills/init/lib/populate-plan-generator.test.ts` antes; se existir, fazer
backup do conteudo em comentario do PR e reescrever do zero.

---

## Implementacao

### Passo 1: Atualizar tipo de output e input

Nova assinatura aceita `manifest` (de fase-01) + `stackPaths` (de fase-02). Mantem compatibilidade
ao tornar opcionais (defaultam para vazio em greenfield).

```typescript
// skills/init/lib/populate-plan-generator.ts (TOPO)
// 2026-05-19 (Luiz/dev): Plano 03 fase-03 — renderer v2. Sai template com {{TASKS_BLOCK}},
// entra geracao programatica com 4 blocos por doc canonico (MH-02 do PRD).
// G3 do README: ZERO chamada de LLM aqui — apenas renderiza estrutura para subagent consumir.

import { TEMPLATE_MANIFEST, type TemplateEntry } from './template-manifest'
import type { DiscoveryManifestEntry } from './discovery-manifest-light'
import type { StackAwareInputPaths, CanonicalDoc } from './stack-aware-input-paths'

export type PopulatePlanPhase = {
  readonly fase: number
  readonly docCanonico: string
  readonly inputsDocs: ReadonlyArray<string>      // paths do discovery-manifest associados
  readonly inputsCode: ReadonlyArray<{ path: string; exists: boolean; note?: string }>
  readonly instrucaoLLM: string
  readonly criterioDone: string
}

export type PopulatePlanInputV2 = {
  readonly cwd: string
  readonly projectName: string
  readonly manifest?: ReadonlyArray<DiscoveryManifestEntry>
  readonly stackPaths?: StackAwareInputPaths
  readonly clock?: () => Date
}

export type PopulatePlanOutputV2 = {
  /** Indice (PLAN.md root) — sumario com link para cada fase. */
  readonly planIndexMarkdown: string
  /** Conteudo de cada fase — chave = nome do arquivo (`fase-01-architecture.md`). */
  readonly phaseFiles: ReadonlyMap<string, string>
  /** Path relativo da pasta destino (`docs/exec-plans/active/{date}-populate-harness/`). */
  readonly relativeFolderPath: string
  /** Fases emitidas — util para audit log e testes. */
  readonly phases: ReadonlyArray<PopulatePlanPhase>
}
```

### Passo 2: Preservar filtros de docs populaveis (G6 do README)

Logica existente em `populate-plan-generator.ts` define `EXCLUDED_FROM_POPULATION` +
`EXCLUDED_PATTERNS`. Manter ambos, expor como funcao puro para testes.

```typescript
// 2026-05-19 (Luiz/dev): preservado do gerador v1 — D14 do PRD mantem filosoficos sem populate.
const EXCLUDED_FROM_POPULATION = new Set<string>([
  'docs/COMPOUND_ENGINEERING.md',
  'docs/PRODUCT_SENSE.md',
  'README.md',
])
const EXCLUDED_PATTERNS: ReadonlyArray<RegExp> = [/^\.github\//, /^scripts\//]

export function isPopulatable(entry: TemplateEntry): boolean {
  if (!entry.dst.endsWith('.md')) return false
  if (EXCLUDED_FROM_POPULATION.has(entry.dst)) return false
  if (EXCLUDED_PATTERNS.some(rx => rx.test(entry.dst))) return false
  return true
}
```

### Passo 3: Mapa de instrucoes LLM por doc canonico

Tabela hash (CLAUDE.md global rule: preferir hash maps sobre switch-case). Prompt por doc
canonico — curto, focado, sem ambiguidade.

```typescript
// 2026-05-19 (Luiz/dev): instrucoes LLM por doc canonico. Adicionar entry quando novo doc
// for adicionado ao TEMPLATE_MANIFEST. Default cobre docs nao mapeados.
const LLM_INSTRUCTIONS: Record<string, string> = {
  'ARCHITECTURE.md':
    'Leia os inputs (docs candidatos + codigo). Sintetize a arquitetura REAL do projeto: ' +
    'dominios, modulos compartilhados, integracoes externas. Cada afirmacao deve apontar para ' +
    'um arquivo/pasta do repo. Zero placeholder generico. Se um input nao tem destino obvio ' +
    'neste doc, sugira consolidacao em outro canonico e marque `needsUser` (DQ2 do CONTEXT).',
  'docs/FRONTEND.md':
    'Documente a arquitetura de UI real: rotas, layouts, componentes compartilhados, sistema de ' +
    'design vivo. Referencie cada componente por path. Se houver Tailwind config, extraia tokens ' +
    'principais (cores, spacing, typography) e cite o arquivo.',
  'docs/SECURITY.md':
    'Auth (provider, fluxo), CORS, secrets (onde, como gerenciar), RLS / authz. Cada item deve ' +
    'citar arquivo (middleware, policy, env.example). Se Supabase: enumere policies de migrations. ' +
    'Se algum aspecto critico (auth, secrets) nao tem evidencia no codigo, marque `needsUser`.',
  'docs/RELIABILITY.md':
    'Error boundaries, retries, observabilidade (logs, traces, metrics), backups. Cite arquivos de ' +
    'config e libs. Sem speculation — apenas o que esta no codigo. Para edge functions ou jobs, ' +
    'enumere com path + responsabilidade.',
  'docs/DESIGN.md':
    'Design System visual: tokens (cores, tipografia, spacing), componentes base, padroes de ' +
    'composicao. Extrair de tailwind.config + globals.css + components/ui. NAO documentar regras ' +
    'de codigo aqui (vao em CODE_STYLE.md).',
  'docs/CODE_STYLE.md':
    'Regras de estilo de codigo: convencoes de nomes, organizacao de arquivos, padroes que o time ' +
    'segue. Inputs: snippets `akita-*.md` (se existirem), `.eslintrc`/`eslint.config`, `.prettierrc`. ' +
    'Codigo real do projeto e a fonte da verdade — extrair padroes implicitos.',
  'docs/QUALITY_SCORE.md':
    'Rubrica de score de PR review. Pode comecar do template canonico + adaptar pesos para a ' +
    'realidade do time. Se nao houver historico de PR review, mantenha o template e adicione ' +
    'TODO `// preencher apos 5 PR reviews`.',
  'docs/PLANS.md':
    'Indice de planos exec ativos + estado de cada um. Listar pastas em `docs/exec-plans/active/`. ' +
    'Sem speculation — so o que esta no FS.',
  'docs/STATE.md':
    'Snapshot do estado atual: versao do plugin, ultima init rodada, stack detectado. Maior parte ' +
    'preenchida pelo Step 03 (detect-stack-and-register) — esta fase confirma e amplia se houver ' +
    'contexto novo (ex: PRD ativo, plano em execucao).',
  'docs/design-docs/core-beliefs.md':
    'Principios senior do projeto: arquitetura padrao, seguranca por default, qualidade nao-negociavel. ' +
    'Se progress.txt tem gotchas que ascendem a principios, promover (DQ5 do CONTEXT). Caso contrario, ' +
    'usar templates do plugin + adaptar nomes ao time.',
  'AGENTS.md':
    'Index do que cada agente/skill lendo este projeto deve saber. Listar docs canonicos com 1 linha ' +
    'cada explicando quando ler. CLAUDE.md mirror este conteudo.',
  'CLAUDE.md':
    'Mirror canonico de AGENTS.md (alguns agents leem CLAUDE.md, outros AGENTS.md). Mesmo conteudo, ' +
    'mesmo formato. Em alteracoes futuras: atualizar AMBOS.',
}

const DEFAULT_INSTRUCTION =
  'Leia os inputs (docs candidatos + codigo). Sintetize o conteudo deste doc canonico com base na ' +
  'verdade do projeto. Zero placeholder. Se nao houver evidencia suficiente, marque `needsUser` e ' +
  'pergunte ao dev no PR.'

function llmInstructionFor(dst: string): string {
  return LLM_INSTRUCTIONS[dst] ?? DEFAULT_INSTRUCTION
}
```

### Passo 4: Associacao heuristica docs-candidatos -> doc-canonico

Para `Inputs (docs candidatos)`, fase-03 NAO faz regex de classificacao (G3 — LLM faz no
`/execute-plan`). Mas precisa dar **dica** ao subagent listando docs do manifest que **podem**
ser relevantes. Heuristica simples: match por nome (`ARCHITECTURE.md` candidato matches
entries com `architecture` no path) — sem garantia, so atalho. Se ambiguo, listar todos.

```typescript
function suggestCandidateDocsFor(
  dst: string,
  manifest: ReadonlyArray<DiscoveryManifestEntry>,
): string[] {
  const baseName = dst.split('/').pop()?.replace(/\.md$/, '').toLowerCase() ?? ''
  if (!baseName) return manifest.map(e => e.path)
  // Match por substring no path; se 0 matches, retorna TODOS (LLM filtra)
  const matches = manifest
    .filter(e => e.path.toLowerCase().includes(baseName))
    .map(e => e.path)
  return matches.length > 0 ? matches : manifest.map(e => e.path)
}
```

### Passo 5: Renderizar fases programaticamente

```typescript
function renderInputsDocsBlock(paths: ReadonlyArray<string>): string {
  if (paths.length === 0) {
    return '### Inputs (docs candidatos)\n\n_(Nenhum doc existente detectado. LLM gera do zero a partir do codigo.)_\n'
  }
  const list = paths.map(p => `- \`${p}\``).join('\n')
  return `### Inputs (docs candidatos)\n\n${list}\n\n_(LLM confirma associacao no momento do /execute-plan — pode pular itens irrelevantes.)_\n`
}

function renderInputsCodeBlock(
  entries: ReadonlyArray<{ path: string; exists: boolean; note?: string }>,
): string {
  if (entries.length === 0) {
    return '### Inputs (codigo)\n\n_(Nenhum path candidato para este doc no stack detectado.)_\n'
  }
  const list = entries
    .map(e => {
      if (e.exists) return `- \`${e.path}\``
      return `- \`${e.path}\` _(${e.note ?? 'nao encontrado'})_`
    })
    .join('\n')
  return `### Inputs (codigo)\n\n${list}\n`
}

function renderLLMInstructionBlock(instruction: string): string {
  return `### Instrucao LLM\n\n${instruction}\n`
}

function renderDoneCriteriaBlock(): string {
  return `### Criterio de done\n\nHumano valida via PR review. Validador Step 90 emite warnings ` +
    `nao bloqueantes — qualidade real e avaliada por leitura humana do output. DQ3 do CONTEXT.\n`
}

function renderPhase(phase: PopulatePlanPhase): string {
  return [
    `# Fase ${String(phase.fase).padStart(2, '0')}: Popular \`${phase.docCanonico}\``,
    '',
    `**Doc canonico:** \`${phase.docCanonico}\``,
    `**Subagente:** harness-populator`,
    '',
    '---',
    '',
    renderInputsDocsBlock(phase.inputsDocs),
    '',
    renderInputsCodeBlock(phase.inputsCode),
    '',
    renderLLMInstructionBlock(phase.instrucaoLLM),
    '',
    renderDoneCriteriaBlock(),
  ].join('\n')
}
```

### Passo 6: Renderizar PLAN.md indice + glossario

```typescript
function renderGlossario(): string {
  return [
    '## Glossario de Instrucoes LLM',
    '',
    '- **`needsUser`**: subagent encontrou ambiguidade que humano deve resolver (ex: doc orfao ' +
      'sem destino canonico obvio). Emite mensagem no PR, nao quebra build.',
    '- **`Inputs (docs candidatos)`**: lista heuristica de paths do `discovery-manifest`. ' +
      'Subagent CONFIRMA relevancia antes de usar — pode pular irrelevantes.',
    '- **`Inputs (codigo)`**: paths reais validados via `fs.access`. Paths marcados como ' +
      '_nao encontrado_ podem ter sido movidos/renomeados; verificar antes de citar no doc final.',
    '- **`Criterio done`**: humano valida via PR review. Sem gate automatico bloqueante.',
    '',
  ].join('\n')
}

function renderPlanIndex(
  phases: ReadonlyArray<PopulatePlanPhase>,
  projectName: string,
  dateStr: string,
): string {
  const rows = phases
    .map(p => {
      const file = `fase-${String(p.fase).padStart(2, '0')}-${docToSlug(p.docCanonico)}.md`
      return `| ${String(p.fase).padStart(2, '0')} | \`${p.docCanonico}\` | [${file}](./${file}) | aberta |`
    })
    .join('\n')
  return [
    `# Plan: Populate Harness — ${projectName}`,
    '',
    `**Generated by:** /anti-vibe-coding:init (Step 91-generate-populate-plan)`,
    `**Date:** ${dateStr}`,
    `**Status:** active`,
    '',
    '---',
    '',
    renderGlossario(),
    '---',
    '',
    '## Fases',
    '',
    '| Fase | Doc canonico | Arquivo | Status |',
    '|------|--------------|---------|--------|',
    rows,
    '',
    '---',
    '',
    '## Como executar',
    '',
    '`/anti-vibe-coding:execute-plan` despacha 1 subagent por fase (paralelo).',
    'Cada subagent le inputs declarados, gera conteudo do doc canonico, e escreve.',
    'Revise via diff/PR. Aprove ou rejeite por fase.',
    '',
  ].join('\n')
}
```

### Passo 7: Funcao publica `generatePopulatePlanV2`

```typescript
function docToSlug(dst: string): string {
  return dst
    .replace(/\.md$/, '')
    .replace(/[\/_]/g, '-')
    .toLowerCase()
}

function datePathSafe(now: Date): string {
  return now.toISOString().replace(/[:.]/g, '-').replace(/-\d{3}Z$/, 'Z')
}

export async function generatePopulatePlanV2(
  input: PopulatePlanInputV2,
): Promise<PopulatePlanOutputV2> {
  const now = input.clock !== undefined ? input.clock() : new Date()
  const manifest = input.manifest ?? []
  const stackPaths = input.stackPaths ?? new Map()

  const populatable = TEMPLATE_MANIFEST.filter(isPopulatable)
  const phases: PopulatePlanPhase[] = populatable.map((entry, idx) => {
    const inputsCode = stackPaths.get(entry.dst as CanonicalDoc) ?? []
    return {
      fase: idx + 1,
      docCanonico: entry.dst,
      inputsDocs: suggestCandidateDocsFor(entry.dst, manifest),
      inputsCode,
      instrucaoLLM: llmInstructionFor(entry.dst),
      criterioDone: 'humano valida via PR review',
    }
  })

  const phaseFiles = new Map<string, string>()
  for (const phase of phases) {
    const file = `fase-${String(phase.fase).padStart(2, '0')}-${docToSlug(phase.docCanonico)}.md`
    phaseFiles.set(file, renderPhase(phase))
  }

  const dateStr = now.toISOString().slice(0, 10)
  const planIndexMarkdown = renderPlanIndex(phases, input.projectName, dateStr)

  const dateSafe = datePathSafe(now)
  const relativeFolderPath = `docs/exec-plans/active/${dateSafe}-populate-harness`

  return {
    planIndexMarkdown,
    phaseFiles,
    relativeFolderPath,
    phases,
  }
}
```

### Passo 8: Testes do renderer v2

```typescript
// skills/init/lib/populate-plan-generator.test.ts
import { describe, it, expect } from 'bun:test'
import { generatePopulatePlanV2 } from './populate-plan-generator'

const FIXED_DATE = new Date('2026-05-19T10:00:00.000Z')

describe('generatePopulatePlanV2', () => {
  it('emits one phase per populatable canonical doc (>= 10 — G1 + CA-01)', async () => {
    const result = await generatePopulatePlanV2({
      cwd: '/tmp/fake',
      projectName: 'test-project',
      clock: () => FIXED_DATE,
    })
    expect(result.phases.length).toBeGreaterThanOrEqual(10)
  })

  it('each phase file contains 4 mandatory blocks (MH-02)', async () => {
    const result = await generatePopulatePlanV2({
      cwd: '/tmp/fake',
      projectName: 'test-project',
      clock: () => FIXED_DATE,
    })
    for (const content of result.phaseFiles.values()) {
      expect(content).toContain('### Inputs (docs candidatos)')
      expect(content).toContain('### Inputs (codigo)')
      expect(content).toContain('### Instrucao LLM')
      expect(content).toContain('### Criterio de done')
    }
  })

  it('PLAN.md index contains glossario + phase table', async () => {
    const result = await generatePopulatePlanV2({
      cwd: '/tmp/fake',
      projectName: 'test-project',
      clock: () => FIXED_DATE,
    })
    expect(result.planIndexMarkdown).toContain('## Glossario de Instrucoes LLM')
    expect(result.planIndexMarkdown).toContain('| Fase | Doc canonico | Arquivo | Status |')
  })

  it('does NOT include excluded files (D14 PRD — filosoficos)', async () => {
    const result = await generatePopulatePlanV2({
      cwd: '/tmp/fake',
      projectName: 'test-project',
      clock: () => FIXED_DATE,
    })
    const docs = result.phases.map(p => p.docCanonico)
    expect(docs).not.toContain('docs/COMPOUND_ENGINEERING.md')
    expect(docs).not.toContain('docs/PRODUCT_SENSE.md')
    expect(docs).not.toContain('README.md')
  })

  it('relativeFolderPath uses path-safe date (no colons)', async () => {
    const result = await generatePopulatePlanV2({
      cwd: '/tmp/fake',
      projectName: 'test-project',
      clock: () => FIXED_DATE,
    })
    expect(result.relativeFolderPath).not.toContain(':')
    expect(result.relativeFolderPath).toMatch(/docs\/exec-plans\/active\/.+-populate-harness$/)
  })

  it('NEVER calls fetch / network (G3 — pure render)', async () => {
    const originalFetch = globalThis.fetch
    let called = false
    globalThis.fetch = (() => { called = true; throw new Error('should not fetch') }) as typeof fetch
    try {
      await generatePopulatePlanV2({
        cwd: '/tmp/fake',
        projectName: 'test-project',
        clock: () => FIXED_DATE,
      })
    } finally {
      globalThis.fetch = originalFetch
    }
    expect(called).toBe(false)
  })
})
```

### Passo 9: Reduzir snippet antigo a stub

`populate-plan-template.md` foi consumido por `templateContent.replace(...)`. Renderer v2 nao
usa mais — reduzir o snippet a uma nota explicando que foi substituido. NAO deletar nesta
fase (cleanup vai para `MEMORY.md`).

```markdown
<!-- skills/init/assets/snippets/populate-plan-template.md -->
<!--
2026-05-19 (Luiz/dev): Plano 03 fase-03 — snippet substituido por geracao programatica
em `skills/init/lib/populate-plan-generator.ts` (generatePopulatePlanV2).
Mantido aqui temporariamente para detectar callers residuais antes do cleanup
(registrado em docs/exec-plans/active/2026-05-19-init-llm-driven-harness-population/plano03/MEMORY.md).
-->
```

---

## Gotchas

- **G3 do plano (zero LLM aqui):** ESTA fase emite estrutura PARA a LLM consumir depois.
  Zero `fetch`, zero import do SDK. Teste "NEVER calls fetch" (passo 8) blinda.
- **G4 do plano (snippet legado):** apos esta fase verde, `populate-plan-template.md` fica
  sem caller real. NAO deletar aqui — cleanup vai para `MEMORY.md` e Plano 05/cleanup futuro.
- **G6 do plano (filtros preservados):** `EXCLUDED_FROM_POPULATION` + `EXCLUDED_PATTERNS`
  vem do gerador v1. Teste "does NOT include excluded files" cobre.
- **Local — backward compat:** funcao `generatePopulatePlan` (v1) ainda existe pois Step 91
  atual chama (sera reescrito em fase-05). Estrategia: manter `generatePopulatePlan` antiga
  exportada ate fase-05 trocar callers, depois deletar em commit separado.
- **Local — match heuristico em `suggestCandidateDocsFor`:** se baseName for `core-beliefs`,
  match por substring funciona; se for `frontend`, match `docs/frontend.md` correto. Caso
  ambiguo: `manifest` tem `architecture-old.md` + `architecture.md` — ambos viram candidatos
  do doc `ARCHITECTURE.md`. LLM filtra. Aceitavel em v1.

---

## Verificacao

### TDD

- [ ] **RED:** novo teste falha (funcao v2 nao existe)
  - Comando: `bun test skills/init/lib/populate-plan-generator.test.ts`
  - Resultado esperado: `generatePopulatePlanV2 is not a function`

- [ ] **GREEN:** implementacao + filtros + 4 blocos, testes passam
  - Comando: `bun test skills/init/lib/populate-plan-generator.test.ts`
  - Resultado esperado: `6 passed, 0 failed`

- [ ] **REFACTOR:** extrair `LLM_INSTRUCTIONS`, `renderPhase`, `renderPlanIndex` em funcoes
  isoladas (ja feito acima). Testes continuam verdes.

### Checklist

- [ ] Renderer v2 emite >= 10 fases (CA-01 — depende de Plano 02 fase-01 ter adicionado CODE_STYLE.md)
- [ ] Cada fase tem os 4 blocos (MH-02)
- [ ] PLAN.md indice tem glossario + tabela de fases
- [ ] Snippet antigo (`populate-plan-template.md`) marcado como deprecated em comentario
- [ ] Funcao `generatePopulatePlan` antiga preservada (callers atualizados em fase-05)
- [ ] Sem `any`, sem `as` injustificado
- [ ] Testes passam: `bun test skills/init/lib/populate-plan-generator.test.ts`
- [ ] Lint: `bun run lint`
- [ ] Typecheck: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/populate-plan-generator.test.ts` retorna `6 passed, 0 failed`
- `(await generatePopulatePlanV2({ ... })).phases.length >= 10`
- Cada `result.phaseFiles.get(file)` contem `### Inputs (docs candidatos)`, `### Inputs (codigo)`,
  `### Instrucao LLM`, `### Criterio de done`
- `result.planIndexMarkdown.includes('## Glossario de Instrucoes LLM') === true`
- Teste "NEVER calls fetch" passa (zero network)

**Por humano:**
- Ler `result.planIndexMarkdown` + 1 `result.phaseFiles.get(...)` random — output e
  legivel, sem placeholder generico, instrucao LLM e clara

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
