<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 03: Step 4 — migrate-planning + build legacy-manifest.json REAL

**Plano:** 02 — Step 3 (secrets-scan) + Step 4 (migrate + manifest) + Shared Manifest Schema
**Sizing:** 1.5h
**Depende de:** fase-01 (Zod schema), fase-02 (mesma sessao RED-GREEN-VERIFY)
**Visual:** false

---

## O que esta fase entrega

`skills/init/lib/steps/04-migrate-planning-and-manifest.ts` REAL: le `ctx.legacy` + `ctx.stack`
populados pelo Step 2 (Plano 01 fase-02), reaproveita `migrate-planning.ts` para mover
`.claude/planning/` → `docs/specs/` (sem branch dry-run), e escreve `.claude/legacy-manifest.json`
validado pelo schema Zod compartilhado (DR-5). Cobre RF-02, DT-06, CA-03, CA-05 do PRD.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/04-migrate-planning-and-manifest.ts` | Create | Step 4 REAL — substitui stub do Plano 01 fase-04 |
| `skills/init/lib/steps/04-migrate-planning-and-manifest.test.ts` | Create | 5 testes cobrindo: greenfield, planning legacy, claude-md, progress.txt, lessons-learned |

---

## Implementacao

### Passo 1: RED — escrever testes do `04-migrate-planning-and-manifest.test.ts`

Cinco cenarios obrigatorios (CA-03 + CA-05 do PRD + behaviors derivados de D6/D7/D8):

```typescript
// skills/init/lib/steps/04-migrate-planning-and-manifest.test.ts
// 2026-05-21 (Luiz/dev): Step 4 — migrate-planning + manifest writer (Plano 02 fase-03 init-refactor-v7).
// Cobertura: CA-03 (planning moved), CA-05 (greenfield), D6 (manifest em disco),
// D7 (progress.txt vira compound entry), D8 (lessons/decisions reference-only), CA-02 (CLAUDE.md preserved).
import { expect, test, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { migratePlanningAndManifestStep } from './04-migrate-planning-and-manifest'
import { parseLegacyManifest } from '../../../_shared/legacy-manifest-schema'
import type { StepContext } from './types'
import type { DetectedStack } from '../detect-stack'

async function mkTmp(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'init-step4-'))
}

const STACK_NODE: DetectedStack = {
  primary: 'node-ts',
  secondary: [],
  signalSource: 'package.json#devDependencies.typescript',
  anchorFiles: ['package.json'],
}

function makeCtx(cwd: string, overrides: Partial<StepContext> = {}): StepContext {
  return {
    cwd,
    args: [],
    flags: {},
    // 2026-05-21 (Luiz/dev): DV-4 — legacy/stack opcionais no tipo, mas garantidos pelo Step 2
    // no pipeline real. Testes populam diretamente.
    stack: STACK_NODE,
    legacy: { isLegacy: false, alreadyMigrated: false, artifacts: [], paths: {} },
    ...overrides,
  } as StepContext
}

async function readManifest(cwd: string) {
  const raw = await fs.readFile(path.join(cwd, '.claude', 'legacy-manifest.json'), 'utf8')
  return parseLegacyManifest(JSON.parse(raw))
}

describe('migratePlanningAndManifestStep (Step 4 real)', () => {
  let tmp = ''
  beforeEach(async () => { tmp = await mkTmp() })
  afterEach(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

  test('id contratual estavel = 04-migrate-planning-and-manifest', () => {
    expect(migratePlanningAndManifestStep.id).toBe('04-migrate-planning-and-manifest')
  })

  test('CA-05: greenfield (sem legacy) escreve manifest com legacy: []', async () => {
    const report = await migratePlanningAndManifestStep.run(makeCtx(tmp))
    expect(report.mutated).toBe(true)

    const manifest = await readManifest(tmp)
    expect(manifest.schemaVersion).toBe('1.0')
    expect(manifest.stack.primary).toBe('node-ts')
    expect(manifest.legacy).toHaveLength(0)
  })

  test('CA-03: .claude/planning/ presente -> moved + entry planning no manifest', async () => {
    // Setup: criar planning com 1 arquivo
    await fs.mkdir(path.join(tmp, '.claude', 'planning'), { recursive: true })
    await fs.writeFile(path.join(tmp, '.claude', 'planning', 'CONTEXT-foo.md'), '# context foo')

    const ctx = makeCtx(tmp, {
      legacy: {
        isLegacy: true,
        alreadyMigrated: false,
        artifacts: ['planning-dir'],
        paths: { 'planning-dir': path.join(tmp, '.claude', 'planning') },
      },
    })
    const report = await migratePlanningAndManifestStep.run(ctx)
    expect(report.mutated).toBe(true)

    // docs/specs/ existe e contem o conteudo migrado
    const specsExists = await fs.access(path.join(tmp, 'docs', 'specs')).then(() => true).catch(() => false)
    expect(specsExists).toBe(true)

    // manifest tem entry planning moved
    const manifest = await readManifest(tmp)
    const planningEntry = manifest.legacy.find((e) => e.type === 'planning')
    expect(planningEntry).toBeDefined()
    expect(planningEntry?.action).toBe('moved')
    expect(planningEntry?.migratedTo).toBe('docs/specs/')
  })

  test('CA-02: .claude/CLAUDE.md presente -> preserved + lines count no manifest', async () => {
    const claudeMdContent = Array.from({ length: 42 }, (_, i) => `linha ${String(i + 1)}`).join('\n')
    await fs.mkdir(path.join(tmp, '.claude'), { recursive: true })
    await fs.writeFile(path.join(tmp, '.claude', 'CLAUDE.md'), claudeMdContent)

    const ctx = makeCtx(tmp, {
      legacy: {
        isLegacy: true,
        alreadyMigrated: false,
        artifacts: [],
        paths: {},
      },
    })
    const report = await migratePlanningAndManifestStep.run(ctx)
    expect(report.mutated).toBe(true)

    // CLAUDE.md NAO foi modificado (byte-identico)
    const after = await fs.readFile(path.join(tmp, '.claude', 'CLAUDE.md'), 'utf8')
    expect(after).toBe(claudeMdContent)

    // manifest tem entry claude-md preserved + lines: 42
    const manifest = await readManifest(tmp)
    const claudeMdEntry = manifest.legacy.find((e) => e.type === 'claude-md')
    expect(claudeMdEntry?.action).toBe('preserved')
    expect(claudeMdEntry?.lines).toBe(42)
  })

  test('D7: .claude/progress.txt presente -> entry type compound reference-only', async () => {
    await fs.mkdir(path.join(tmp, '.claude'), { recursive: true })
    await fs.writeFile(path.join(tmp, '.claude', 'progress.txt'), 'gotcha 1\ngotcha 2')

    const ctx = makeCtx(tmp, {
      legacy: { isLegacy: true, alreadyMigrated: false, artifacts: [], paths: {} },
    })
    await migratePlanningAndManifestStep.run(ctx)

    // arquivo NAO importado (escopo D7) — apenas referenciado
    const stillThere = await fs.access(path.join(tmp, '.claude', 'progress.txt')).then(() => true).catch(() => false)
    expect(stillThere).toBe(true)

    const manifest = await readManifest(tmp)
    const compoundEntry = manifest.legacy.find((e) => e.type === 'compound')
    expect(compoundEntry?.action).toBe('reference-only')
    expect(compoundEntry?.sourcePath).toBe('.claude/progress.txt')
  })

  test('D8: lessons-learned.md (raiz) -> entry type lessons reference-only', async () => {
    await fs.writeFile(path.join(tmp, 'lessons-learned.md'), '# lessons')

    const ctx = makeCtx(tmp, {
      legacy: {
        isLegacy: true,
        alreadyMigrated: false,
        artifacts: ['lessons-learned'],
        paths: { 'lessons-learned': path.join(tmp, 'lessons-learned.md') },
      },
    })
    await migratePlanningAndManifestStep.run(ctx)

    // arquivo NAO movido (escopo D8) — execute-plan usa como contexto
    const stillThere = await fs.access(path.join(tmp, 'lessons-learned.md')).then(() => true).catch(() => false)
    expect(stillThere).toBe(true)

    const manifest = await readManifest(tmp)
    const lessonsEntry = manifest.legacy.find((e) => e.type === 'lessons')
    expect(lessonsEntry?.action).toBe('reference-only')
    expect(lessonsEntry?.sourcePath).toBe('lessons-learned.md')
  })
})
```

### Passo 2: GREEN — escrever `04-migrate-planning-and-manifest.ts`

Step le `ctx.legacy` + `ctx.stack`, decide o que mover e o que apenas referenciar, escreve manifest.

```typescript
// skills/init/lib/steps/04-migrate-planning-and-manifest.ts
// 2026-05-21 (Luiz/dev): Step 4 — migrate planning + escrever legacy-manifest.json
// Plano 02 fase-03 init-refactor-v7. PRD RF-02, DT-06, CA-03, CA-05.
// Substitui o stub criado no Plano 01 fase-04.

import path from 'node:path'
import { promises as fs } from 'node:fs'
import type { Step, StepContext, StepReport } from './types'
import { migratePlanning } from '../migrate-planning'
import {
  LegacyManifestSchema,
  type LegacyManifest,
  type LegacyEntry,
  type ManifestStack,
} from '../../../_shared/legacy-manifest-schema'
import type { DetectedStack } from '../detect-stack'
import type { LegacyState } from '../detect-v5-legacy'

// 2026-05-21 (Luiz/dev): regra simples para confidence. high se 1+ probe positivo;
// low se nenhum (primary null). medium reservado para casos futuros (multi-stack conflito).
function deriveConfidence(stack: DetectedStack): ManifestStack['confidence'] {
  return stack.primary === null ? 'low' : 'high'
}

function toManifestStack(stack: DetectedStack): ManifestStack {
  return {
    primary: stack.primary,
    confidence: deriveConfidence(stack),
  }
}

// 2026-05-21 (Luiz/dev): regras de classificacao por artefato detectado pelo Step 2.
// Cada artefato vira (no maximo) 1 entry no manifest. Mapeamento:
//   planning-dir            -> type=planning, action=moved, migratedTo='docs/specs/'
//   claude-decisions        -> type=decisions, action=reference-only
//   decisions               -> type=decisions, action=reference-only
//   lessons-learned         -> type=lessons, action=reference-only
//   claude-knowledge-dir    -> type=knowledge-legacy, action=reference-only
//   claude-rules-dir        -> type=rules, action=reference-only
//   (CLAUDE.md / progress.txt sao checados separadamente fora do array `artifacts`)
function classifyArtifacts(legacy: LegacyState): LegacyEntry[] {
  const out: LegacyEntry[] = []
  const rel = (abs: string, cwd: string): string =>
    path.relative(cwd, abs).split(path.sep).join('/')

  // cwd nao esta aqui — caller passa absolutos em `legacy.paths`. Conversao no caller.
  for (const artifact of legacy.artifacts) {
    const p = legacy.paths[artifact]
    if (!p) continue

    if (artifact === 'planning-dir') {
      out.push({
        type: 'planning',
        found: true,
        sourcePath: '.claude/planning/',
        action: 'moved',
        migratedTo: 'docs/specs/',
      })
    } else if (artifact === 'lessons-learned') {
      out.push({
        type: 'lessons',
        found: true,
        sourcePath: 'lessons-learned.md',
        action: 'reference-only',
        note: 'Usar como contexto ao popular harness docs',
      })
    } else if (artifact === 'decisions' || artifact === 'claude-decisions') {
      out.push({
        type: 'decisions',
        found: true,
        sourcePath: artifact === 'claude-decisions' ? '.claude/decisions.md' : 'decisions.md',
        action: 'reference-only',
        note: 'Usar como contexto ao popular harness docs',
      })
    } else if (artifact === 'claude-knowledge-dir') {
      out.push({
        type: 'knowledge-legacy',
        found: true,
        sourcePath: '.claude/knowledge/',
        action: 'reference-only',
      })
    } else if (artifact === 'claude-rules-dir') {
      out.push({
        type: 'rules',
        found: true,
        sourcePath: '.claude/rules/',
        action: 'reference-only',
      })
    }
    // outros artifacts (senior-principles, claude-architecture-profile, claude-project-map,
    // claude-plans-dir, claude-tasks-dir, claude-prompts-dir, manifest-v5*) nao mapeiam
    // para entries do manifest neste plano — execute-plan le do disco se precisar.
    // Documentado como DI desta fase em MEMORY.md (DI-Plano02-fase03-unmapped-artifacts).
  }

  return out
}

async function detectClaudeMd(cwd: string): Promise<LegacyEntry | null> {
  const p = path.join(cwd, '.claude', 'CLAUDE.md')
  try {
    const content = await fs.readFile(p, 'utf8')
    const lines = content.split('\n').length
    return {
      type: 'claude-md',
      found: true,
      sourcePath: '.claude/CLAUDE.md',
      action: 'preserved',
      lines,
      note: 'Fonte primaria para popular AGENTS.md',
    }
  } catch {
    return null
  }
}

async function detectProgressTxt(cwd: string): Promise<LegacyEntry | null> {
  const p = path.join(cwd, '.claude', 'progress.txt')
  try {
    await fs.access(p)
    return {
      type: 'compound',
      found: true,
      sourcePath: '.claude/progress.txt',
      action: 'reference-only',
      note: 'Importar para docs/compound/ via execute-plan',
    }
  } catch {
    return null
  }
}

export const migratePlanningAndManifestStep: Step = {
  id: '04-migrate-planning-and-manifest',

  async run(ctx: StepContext): Promise<StepReport> {
    // 2026-05-21 (Luiz/dev): DV-4 — legacy/stack garantidos pelo Step 2 (Plano 01 fase-02).
    // Tipo continua opcional no Plano 02; endurecer em Plano 05. Non-null assertion controlada.
    const legacy = ctx.legacy
    const stack = ctx.stack
    if (!legacy || !stack) {
      throw new Error(
        '[Step 4] ctx.legacy ou ctx.stack ausente. Step 2 (detect-legacy-and-stack) deveria ter populado. Pipeline quebrado.',
      )
    }

    // 1) Move planning se aplicavel
    let plannningMoved = false
    if (legacy.artifacts.includes('planning-dir')) {
      const report = await migratePlanning(ctx.cwd, { dryRun: false })
      if (report.conflicts.length > 0) {
        // Manter comportamento do step antigo: nao aborta o init aqui — apenas registra no summary.
        // Conflicts ficam visiveis no log mas o manifest ainda eh escrito (fail-soft no init v7).
      }
      plannningMoved = report.status === 'completed'
    }

    // 2) Classificar artifacts em entries
    const entries: LegacyEntry[] = classifyArtifacts(legacy)

    // 3) Detectar CLAUDE.md e progress.txt (fora do array `artifacts` — sao probes diretos)
    const claudeMdEntry = await detectClaudeMd(ctx.cwd)
    if (claudeMdEntry) entries.push(claudeMdEntry)

    const progressEntry = await detectProgressTxt(ctx.cwd)
    if (progressEntry) entries.push(progressEntry)

    // 4) Montar manifest e validar com Zod
    const manifest: LegacyManifest = {
      schemaVersion: '1.0',
      detectedAt: new Date().toISOString(),
      stack: toManifestStack(stack),
      legacy: entries,
    }
    LegacyManifestSchema.parse(manifest) // throws ZodError em divergencia

    // 5) Escrever em .claude/legacy-manifest.json
    const manifestPath = path.join(ctx.cwd, '.claude', 'legacy-manifest.json')
    await fs.mkdir(path.dirname(manifestPath), { recursive: true })
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')

    const summaryParts = [
      `legacy-manifest written (${String(entries.length)} entries)`,
      plannningMoved ? 'planning -> docs/specs/' : null,
    ].filter((s): s is string => s !== null)

    return {
      mutated: true,
      summary: summaryParts.join('; '),
    }
  },
}
```

### Passo 3: VERIFY local

```bash
bun test skills/init/lib/steps/04-migrate-planning-and-manifest.test.ts
```

Esperado: 6 testes passam (id + 5 cenarios).

---

## Gotchas

- **G2 do plano (DV-4 soft typing):** `ctx.legacy` e `ctx.stack` opcionais no tipo. Step usa
  guard explicito `if (!legacy || !stack) throw new Error(...)`. NAO usar `!` assertion sem o
  guard — em testes futuros sem Step 2 popular, o erro precisa ser claro.

- **G4 do plano (manifest em disco):** Garantir `mkdir -p .claude/` antes do write
  (`fs.mkdir(path.dirname(manifestPath), { recursive: true })`). Em greenfield SEM `.claude/`,
  o Step 4 cria o diretorio.

- **G5 do plano (D8 — escopo da migracao):** lessons-learned.md NAO e movido. decisions.md NAO
  e movido. Apenas planning. Verificar via testes — assert que arquivo continua no lugar.

- **G6 do plano (D7 — progress.txt vira entry compound):** progress.txt nao e importado (nao
  ha leitura/processamento do conteudo). Apenas entry no manifest com `action: 'reference-only'`.
  O step antigo `13-import-progress-txt.ts` (que IMPORTAVA) sera deletado em Plano 01 fase-05.

- **G7 do plano (CA-02 — CLAUDE.md preservado):** Step le o arquivo apenas para contar linhas.
  NUNCA escreve nele. Teste valida byte-identidade apos run.

- **Local — `migratePlanning` conflicts:** `migrate-planning.ts` retorna `conflicts` quando
  arquivo destino existe com conteudo diferente. Comportamento do step antigo `11-migrate-2-planning.ts`
  era abortar com `AbortError({ code: 1, reason: ... })`. **Decisao desta fase:** NAO abortar.
  Init v7 e fail-soft no nivel do step de migracao — manifest e escrito mesmo com conflitos
  (visivel no summary). Re-run e bloqueado pelo Step 1 (reentry-gate), entao conflitos so
  acontecem em projetos misturados manualmente. Documentar como DI desta fase
  (`DI-Plano02-fase03-no-abort-on-conflicts`).

- **Local — artifacts nao mapeados:** Alguns artifacts do `LegacyState` (e.g. `claude-plans-dir`,
  `claude-project-map`) nao tem mapping para `LegacyEntry`. Decisao: nao adicionar no manifest
  neste plano. Execute-plan pode ler do disco se precisar. Documentar como DI desta fase
  (`DI-Plano02-fase03-unmapped-artifacts`).

- **Local — path do import do schema:** `../../../_shared/legacy-manifest-schema` partindo de
  `skills/init/lib/steps/`. Confirmar resolucao via `bun run typecheck` — se nao resolver,
  pode ser que precise ajustar `tsconfig.json` (improvavel — relative paths funcionam).

- **Local — `detectedAt` em testes:** Tests usam `parseLegacyManifest` que valida `datetime()`.
  `new Date().toISOString()` produz formato compativel. Testes nao precisam congelar o tempo.

---

## Verificacao

### TDD

- [ ] **RED:** Testes em `04-migrate-planning-and-manifest.test.ts` falham por step nao existir
  (ou por id ainda em `'TODO'`).
  - Comando: `bun test skills/init/lib/steps/04-migrate-planning-and-manifest.test.ts --grep "id contratual"`
  - Resultado esperado: assertion failure clara

- [ ] **GREEN:** Step implementado, 6 testes passam
  - Comando: `bun test skills/init/lib/steps/04-migrate-planning-and-manifest.test.ts`
  - Resultado esperado: `6 passed, 0 failed`

### Checklist

- [ ] `skills/init/lib/steps/04-migrate-planning-and-manifest.ts` criado com id correto
- [ ] Step importa `LegacyManifestSchema` de `_shared/legacy-manifest-schema`
- [ ] Step le `ctx.legacy` + `ctx.stack` e lanca erro se ausentes
- [ ] Step NAO modifica `.claude/CLAUDE.md` (validado em teste byte-identico)
- [ ] Step NAO move lessons-learned.md / decisions.md (validado em teste)
- [ ] Step NAO importa progress.txt (validado em teste)
- [ ] Manifest validado por Zod antes de escrever (`LegacyManifestSchema.parse(manifest)`)
- [ ] Manifest escrito em `.claude/legacy-manifest.json` com formato JSON 2-space
- [ ] 6 testes passam (`bun test`)
- [ ] `bun run typecheck` limpo
- [ ] `bun run lint` limpo
- [ ] `bun run test` global continua verde
- [ ] `MEMORY.md` atualizado com `DI-Plano02-fase03-no-abort-on-conflicts` e `DI-Plano02-fase03-unmapped-artifacts`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/steps/04-migrate-planning-and-manifest.test.ts` retorna `6 passed, 0 failed`
- Em fixture com `.claude/CLAUDE.md` de N linhas: `cat .claude/legacy-manifest.json | jq '.legacy[] | select(.type=="claude-md") | .lines'` retorna N
- Em fixture com `.claude/planning/`: `ls docs/specs/` retorna conteudo migrado
- `bun -e "import { parseLegacyManifest } from './skills/_shared/legacy-manifest-schema'; const m = parseLegacyManifest(JSON.parse(require('fs').readFileSync('.claude/legacy-manifest.json'))); console.log(m.schemaVersion)"` em fixture imprime `1.0`

**Por humano:**
- Abrir `.claude/legacy-manifest.json` gerado em fixture com 5 artefatos e confirmar que cada
  entry segue o exemplo do PRD DT-06 (linha 230-273).

---

<!-- Gerado por /plan-feature em 2026-05-21 -->
