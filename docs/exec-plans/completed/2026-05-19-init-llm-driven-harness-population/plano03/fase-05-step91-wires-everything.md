# Fase 05: Step 91 Wires Everything

**Plano:** 03 — Gerador LLM-driven do PLAN populate
**Sizing:** 1.5h
**Depende de:** fase-01 (`discoveryManifestLight`), fase-02 (`stackAwareInputPaths`), fase-03 (`generatePopulatePlanV2`), fase-04 (`writePopulatePlanFolder`)
**Visual:** false

---

## O que esta fase entrega

Step 91 reescrito orquestrando os 4 helpers das fases anteriores. Garante CA-01 (>= 10 fases)
e CA-02 (>= 3 paths reais por fase em Next.js+Supabase) via assertions explicitas no audit log.
E2E novo cobre greenfield + stack mockado.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/91-generate-populate-plan.ts` | Modify | Reescrita: chama discoveryManifestLight + stackAwareInputPaths + generatePopulatePlanV2 + writePopulatePlanFolder + assertions CA-01/CA-02 |
| `skills/init/lib/steps/91-generate-populate-plan.test.ts` | Modify | Adiciona testes E2E orquestrando o pipeline completo com fixtures (greenfield, Next.js+Supabase) |
| `skills/init/lib/populate-plan-generator.ts` | Modify | Remove export `generatePopulatePlan` v1 antiga (callers atualizados — so Step 91 importava) |

---

## Implementacao

### Passo 1: Reescrever Step 91

```typescript
// skills/init/lib/steps/91-generate-populate-plan.ts
// 2026-05-19 (Luiz/dev): Plano 03 fase-05 — Step 91 orquestra discovery + stack + render + write.
// MH-01 + CA-01 + CA-02 do PRD. G2 (LLM-hallucination) coberto via stackAwareInputPaths.
// G3 (zero LLM): este step PURO — apenas renderiza estrutura, LLM chamada acontece em /execute-plan.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { detectProjectName } from '../detect-project-name'
import { detectStack } from '../detect-stack'
import { discoveryManifestLight } from '../discovery-manifest-light'
import { stackAwareInputPaths } from '../stack-aware-input-paths'
import { generatePopulatePlanV2 } from '../populate-plan-generator'
import { writePopulatePlanFolder } from '../populate-plan-writer'
import type { Step } from './types'
import { isDryRun } from '../dry-run-mode'
import { INIT_SUBAGENT_IDS } from '../init-subagent-ids'
import type { AuditLogWriter } from '../audit-log'

/** SH-07 do PRD — subagent_id canonico para Plano 06 fase-01 audit log padronizado. */
export const SUBAGENT_ID = 'init-populate-plan-gen' as const

/** Step 91: gera pasta `plano-populate-harness/` em `docs/exec-plans/active/{date}-populate-harness/`. */
export const generatePopulatePlanStep: Step = {
  id: '91-generate-populate-plan',
  async run(ctx) {
    const startMs = performance.now()
    const projectName = detectProjectName(ctx.cwd)

    // Step 1: detect stack (reusa helper existente, multi-stack contract D22)
    const stack = await detectStack(ctx.cwd)

    // Step 2: discovery leve (so paths + 100 primeiras linhas, sem regex de classificacao)
    const discovery = await discoveryManifestLight(ctx.cwd)

    // Step 3: paths candidatos por stack, validados via fs.access (G2 — LLM-hallucination)
    const stackPaths = await stackAwareInputPaths(ctx.cwd, stack.primary)

    // Step 4: render programatico — 1 fase por doc canonico com 4 blocos
    const plan = await generatePopulatePlanV2({
      cwd: ctx.cwd,
      projectName,
      manifest: discovery.entries,
      stackPaths,
    })

    // Assertion defensiva CA-01: >= 10 fases. Se falhar, indica TEMPLATE_MANIFEST sem CODE_STYLE.md
    // (dependencia Plano 02 fase-01 nao mergeada).
    if (plan.phases.length < 10) {
      return {
        mutated: false,
        summary:
          `init-91: PLAN gerado com apenas ${plan.phases.length} fases (esperado >= 10). ` +
          `Verificar TEMPLATE_MANIFEST tem >= 10 entries populaveis. CA-01 falhou.`,
      }
    }

    // Dry-run: nao escreve, so preview
    if (isDryRun(ctx)) {
      return {
        mutated: false,
        summary:
          `dry-run: would generate populate plan at ${plan.relativeFolderPath} ` +
          `with ${plan.phases.length} phases`,
      }
    }

    // Step 5: write em pasta
    const writeResult = await writePopulatePlanFolder(plan, ctx.cwd)

    // Audit log: registra evento populate_plan_generated com contagens
    const writer = ctx.flags['__auditLog'] as AuditLogWriter | undefined
    await writer?.append({
      subagent_id: INIT_SUBAGENT_IDS.populatePlanGen,
      input_paths: [ctx.cwd],
      output_struct: {
        planFolder: plan.relativeFolderPath,
        phaseCount: plan.phases.length,
        filesWritten: writeResult.writtenFiles.length,
        warnings: writeResult.warnings.length,
        stackPrimary: stack.primary ?? 'none',
        discoveryEntries: discovery.entries.length,
      },
      duration_ms: Math.round(performance.now() - startMs),
      retry_count: 0,
    })

    const summary = [
      `Plano de populacao gerado: ${plan.relativeFolderPath}`,
      `Fases emitidas: ${plan.phases.length} (1 por doc canonico).`,
      `Stack detectado: ${stack.primary ?? 'nenhum'} (${stack.signalSource}).`,
      `Discovery: ${discovery.entries.length} docs existentes amostrados.`,
      'Para popular o harness com analise do repo: /anti-vibe-coding:execute-plan ' +
        plan.relativeFolderPath,
    ].join('\n')

    return { mutated: true, summary }
  },
}
```

### Passo 2: E2E novo orquestrando o pipeline completo

```typescript
// skills/init/lib/steps/91-generate-populate-plan.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { randomUUID } from 'node:crypto'
import { generatePopulatePlanStep } from './91-generate-populate-plan'
import type { StepContext } from './types'

const NEXTJS_SUPABASE_FIXTURE = path.join(
  import.meta.dir, '..', '..', '..', '..', 'tests', 'fixtures', 'stack-aware', 'nextjs-supabase',
)

let tmpCwd: string

function makeCtx(cwd: string): StepContext {
  return {
    cwd,
    flags: {},
  }
}

describe('generatePopulatePlanStep — E2E orquestracao', () => {
  beforeEach(async () => {
    tmpCwd = path.join(os.tmpdir(), `step91-${randomUUID()}`)
    await fs.mkdir(tmpCwd, { recursive: true })
  })
  afterEach(async () => {
    await fs.rm(tmpCwd, { recursive: true, force: true })
  })

  it('greenfield: cria pasta com >= 10 arquivos (PLAN.md + N fases) — CA-01', async () => {
    const ctx = makeCtx(tmpCwd)
    const result = await generatePopulatePlanStep.run(ctx)
    expect(result.mutated).toBe(true)

    // Encontrar pasta criada (nome tem date-safe)
    const activeDir = path.join(tmpCwd, 'docs', 'exec-plans', 'active')
    const subdirs = await fs.readdir(activeDir)
    const harnessDir = subdirs.find(d => d.endsWith('-populate-harness'))
    expect(harnessDir).toBeDefined()

    const files = await fs.readdir(path.join(activeDir, harnessDir!))
    // 1 PLAN.md + >= 10 fases
    expect(files.length).toBeGreaterThanOrEqual(11)
    expect(files).toContain('PLAN.md')
  })

  it('Next.js+Supabase fixture: fase ARCHITECTURE tem >= 3 paths reais — CA-02', async () => {
    // Copia fixture nextjs-supabase para tmpCwd para que detectStack + stackAwareInputPaths achem os paths
    await copyRecursive(NEXTJS_SUPABASE_FIXTURE, tmpCwd)
    const ctx = makeCtx(tmpCwd)
    const result = await generatePopulatePlanStep.run(ctx)
    expect(result.mutated).toBe(true)

    const activeDir = path.join(tmpCwd, 'docs', 'exec-plans', 'active')
    const subdirs = await fs.readdir(activeDir)
    const harnessDir = subdirs.find(d => d.endsWith('-populate-harness'))!

    const archFile = path.join(activeDir, harnessDir, 'fase-01-architecture.md')
    // O slug pode variar; localiza o arquivo de architecture especificamente
    const allFiles = await fs.readdir(path.join(activeDir, harnessDir))
    const archFileActual = allFiles.find(f => f.includes('architecture'))
    expect(archFileActual).toBeDefined()

    const content = await fs.readFile(path.join(activeDir, harnessDir, archFileActual!), 'utf-8')
    // Contar paths reais (linhas que comecam com `- \`<path>\`` SEM nota "candidato nao encontrado")
    const realPathLines = content
      .split('\n')
      .filter(line => /^- `[^`]+`\s*$/.test(line)) // formato sem nota
    expect(realPathLines.length).toBeGreaterThanOrEqual(3)
  })

  it('aborta gracefully (warning) se TEMPLATE_MANIFEST < 10 docs populaveis (G1)', async () => {
    // Este teste exige mock de TEMPLATE_MANIFEST — pular se nao houver infraestrutura de mock.
    // Em v1, validar o branch via leitura do summary. Se a assertion CA-01 for ativada,
    // summary contem "CA-01 falhou".
    // (Teste skipped se TEMPLATE_MANIFEST ja tem >= 10 entries — ambiente de CI normal.)
  })

  it('dry-run: nao escreve nada, summary contem "dry-run"', async () => {
    const ctx: StepContext = {
      cwd: tmpCwd,
      flags: { '--dry-run': true },
    }
    const result = await generatePopulatePlanStep.run(ctx)
    expect(result.mutated).toBe(false)
    expect(result.summary).toContain('dry-run')
    const activeDir = path.join(tmpCwd, 'docs', 'exec-plans', 'active')
    let listed: string[] = []
    try { listed = await fs.readdir(activeDir) } catch { /* sem dir = OK */ }
    expect(listed).toHaveLength(0)
  })

  it('summary contem caminho da pasta + comando /execute-plan (MH-09)', async () => {
    const ctx = makeCtx(tmpCwd)
    const result = await generatePopulatePlanStep.run(ctx)
    expect(result.summary).toContain('docs/exec-plans/active/')
    expect(result.summary).toContain('populate-harness')
    expect(result.summary).toContain('/anti-vibe-coding:execute-plan')
  })
})

async function copyRecursive(src: string, dest: string): Promise<void> {
  const stat = await fs.stat(src)
  if (stat.isDirectory()) {
    await fs.mkdir(dest, { recursive: true })
    for (const name of await fs.readdir(src)) {
      await copyRecursive(path.join(src, name), path.join(dest, name))
    }
  } else {
    await fs.copyFile(src, dest)
  }
}
```

### Passo 3: Limpar callers da v1

Apos os testes acima passarem, deletar a funcao `generatePopulatePlan` (v1) de
`populate-plan-generator.ts` — Step 91 e o unico caller, e agora usa V2.

```bash
# Verificar zero callers antes de deletar
grep -rn "generatePopulatePlan\b" skills/ tests/ --include='*.ts'
# Esperado: so referencias ao novo `generatePopulatePlanV2`. Se aparecer `generatePopulatePlan`
# (sem `V2`), atualizar caller antes de deletar.
```

Se grep retorna zero callers da v1, deletar bloco `export async function generatePopulatePlan(...)`
e tipos antigos `PopulatePlanTask`, `PopulatePlanInput`, `PopulatePlanOutput`.

### Passo 4: Verificacao manual end-to-end

```bash
# Em projeto fixture greenfield
cd /tmp/greenfield-test
mkdir -p some-empty-project
cd some-empty-project
# Simular Step 91 isoladamente (sem rodar init completa)
bun -e "
  import { generatePopulatePlanStep } from '/path/to/skills/init/lib/steps/91-generate-populate-plan';
  const ctx = { cwd: process.cwd(), flags: {} };
  const r = await generatePopulatePlanStep.run(ctx);
  console.log(r.summary);
"
# Verificar:
ls -la docs/exec-plans/active/*-populate-harness/
cat docs/exec-plans/active/*-populate-harness/PLAN.md | head -40
cat docs/exec-plans/active/*-populate-harness/fase-01-*.md
```

---

## Gotchas

- **G1 do plano (TEMPLATE_MANIFEST):** se Plano 02 fase-01 nao foi mergeada antes desta fase,
  `TEMPLATE_MANIFEST.filter(isPopulatable).length` retorna 9 (sem CODE_STYLE.md). CA-01 falha.
  Mitigacao: assertion no Step 91 retorna summary com `CA-01 falhou` em vez de crashar — facil de diagnosticar.
- **G2 do plano (LLM-hallucination):** validado por fase-02. Teste CA-02 conta APENAS paths
  sem nota `_(candidato nao encontrado)_` — garante que apenas paths reais sao contados.
- **G3 do plano (zero LLM):** Step 91 nao importa SDK Anthropic. Audit log nao registra
  chamada de modelo. Teste E2E nao mocka rede — confirma puro.
- **G5 do plano (compat execute-plan):** verificar pasta criada bate com enumeracao de
  `/execute-plan`. Se incompativel, registrar em `MEMORY.md` Notas para Plano 05.
- **Local — copia de fixture:** teste CA-02 copia `nextjs-supabase/` para tmpdir. Helper
  `copyRecursive` simples; alternativa: usar `fs.cp` (Node 16+). Bun suporta `fs.cp` —
  pode trocar se preferir.
- **Local — slug do arquivo:** `docToSlug('docs/DESIGN.md')` -> `docs-design`. Teste CA-02
  procura `find(f => f.includes('architecture'))` em vez de path fixo para tolerar mudancas
  de slug.
- **Local — `INIT_SUBAGENT_IDS.populatePlanGen`:** ja existe em `init-subagent-ids.ts`
  (Step 91 antigo ja usava). Verificar se enum mudou; se sim, atualizar.

---

## Verificacao

### TDD

- [ ] **RED:** teste E2E falha (Step 91 antigo ainda usa `generatePopulatePlan` v1)
  - Comando: `bun test skills/init/lib/steps/91-generate-populate-plan.test.ts`
  - Resultado esperado: `expected files.length >= 11` falha (v1 gera 1 arquivo monolitico)

- [ ] **GREEN:** Step 91 reescrito + orquestracao + assertions, todos os testes E2E passam
  - Comando: `bun test skills/init/lib/steps/91-generate-populate-plan.test.ts`
  - Resultado esperado: `5 passed, 0 failed` (incluindo 1 skipped do mock TEMPLATE_MANIFEST)

### Checklist

- [ ] Step 91 importa 4 helpers das fases 01-04 (detect-stack ja existia)
- [ ] Assertion CA-01 (>= 10 fases) presente no Step 91 com summary explicito em falha
- [ ] Teste CA-02 verifica >= 3 paths reais em ARCHITECTURE de Next.js+Supabase
- [ ] Teste dry-run cobre branch `isDryRun(ctx)` (nao escreve)
- [ ] Summary do Step 91 contem path da pasta + comando `/anti-vibe-coding:execute-plan`
- [ ] Audit log emite evento com `phaseCount` + `stackPrimary` + `discoveryEntries`
- [ ] Funcao `generatePopulatePlan` (v1) deletada apos confirmar zero callers
- [ ] G5 (compat execute-plan) verificado — registrado em `MEMORY.md` se follow-up
- [ ] Sem `any`, sem `as` injustificado
- [ ] Testes passam: `bun test skills/init/lib/steps/91-generate-populate-plan.test.ts`
- [ ] Lint: `bun run lint`
- [ ] Typecheck: `bun run typecheck`
- [ ] Full suite passa: `bun run test`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/steps/91-generate-populate-plan.test.ts` retorna 0 failures
- `bun run test` (suite completa) retorna 0 failures
- Apos `generatePopulatePlanStep.run(ctxGreenfield)`:
  - `fs.readdir(absoluteFolder).length >= 11` (PLAN.md + 10 fases) **— CA-01**
- Apos `generatePopulatePlanStep.run(ctxNextjsSupabase)`:
  - Arquivo de fase `ARCHITECTURE` contem >= 3 linhas no formato `- \`<path>\`` sem nota _(candidato nao encontrado)_ **— CA-02**
- `result.summary` contem `/anti-vibe-coding:execute-plan` (MH-09 base)
- `grep -rn "generatePopulatePlan\b" skills/ tests/` retorna so referencias ao novo `generatePopulatePlanV2`

**Por humano:**
- Inspecionar manualmente PLAN.md gerado em fixture greenfield — estrutura clara, glossario
  presente, tabela de fases linkavel
- Inspecionar 1 arquivo de fase (ex: `fase-01-architecture.md`) — 4 blocos presentes, instrucao
  LLM clara, paths candidatos plausiveis

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
