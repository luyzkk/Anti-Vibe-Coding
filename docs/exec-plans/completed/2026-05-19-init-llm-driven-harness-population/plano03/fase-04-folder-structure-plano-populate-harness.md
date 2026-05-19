# Fase 04: Folder Structure `plano-populate-harness/`

**Plano:** 03 — Gerador LLM-driven do PLAN populate
**Sizing:** 1.5h
**Depende de:** fase-03 (consome `PopulatePlanOutputV2` com `planIndexMarkdown` + `phaseFiles`)
**Visual:** false

---

## O que esta fase entrega

Writer (`populate-plan-writer.ts`) que materializa o output da fase-03 em filesystem:
cria pasta `docs/exec-plans/active/{date}-populate-harness/`, escreve `PLAN.md` (indice)
e 1 arquivo `fase-NN-{slug}.md` por fase. Compativel com infra de `/anti-vibe-coding:execute-plan`
(D4 do CONTEXT).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/populate-plan-writer.ts` | Create | Funcao `writePopulatePlanFolder(plan, cwd)` que escreve pasta + indice + fases |
| `skills/init/lib/populate-plan-writer.test.ts` | Create | Testes: cria pasta, escreve N+1 arquivos, sobrescreve quando ja existe, permission-denied vira warning |
| `tests/fixtures/populate-plan-writer/` | Create | Tmp scratch dir para testes — usar `tmpdir + randomUUID` em tempo de teste, nao fixture comitada |

---

## Implementacao

### Passo 1: Separacao render/write (Single Responsibility)

Fase-03 PURA (so transforma input em strings markdown).
Esta fase faz I/O (mkdir + writeFile). Razao: testes da fase-03 nao precisam de FS;
testes desta fase usam tmpdir.

### Passo 2: Funcao publica `writePopulatePlanFolder`

```typescript
// skills/init/lib/populate-plan-writer.ts
// 2026-05-19 (Luiz/dev): Plano 03 fase-04 — writer materializa output do renderer v2 em disco.
// D4 do CONTEXT: pasta `plano-populate-harness/` com PLAN.md indice + 1 arquivo por fase.
// G5 do README: compatibilidade com /execute-plan a verificar antes de fase-05.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { PopulatePlanOutputV2 } from './populate-plan-generator'

export type WritePopulatePlanResult = {
  /** Pasta absoluta criada. */
  readonly absoluteFolder: string
  /** Arquivos efetivamente escritos (PLAN.md + fases). */
  readonly writtenFiles: ReadonlyArray<string>
  /** Warnings nao bloqueantes (ex: arquivos pre-existentes sobrescritos). */
  readonly warnings: ReadonlyArray<string>
}

/**
 * Materializa o output do renderer v2 em disco.
 *
 * Estrutura criada:
 *   {cwd}/{plan.relativeFolderPath}/
 *     PLAN.md
 *     fase-01-{slug}.md
 *     fase-02-{slug}.md
 *     ...
 *
 * Sobrescreve arquivos pre-existentes (emite warning).
 * Erros de permission denied emitem warning e sao parcialmente toleraveis (init nao aborta).
 */
export async function writePopulatePlanFolder(
  plan: PopulatePlanOutputV2,
  cwd: string,
): Promise<WritePopulatePlanResult> {
  const absoluteFolder = path.join(cwd, plan.relativeFolderPath)
  await fs.mkdir(absoluteFolder, { recursive: true })

  const writtenFiles: string[] = []
  const warnings: string[] = []

  // Indice PLAN.md
  const indexPath = path.join(absoluteFolder, 'PLAN.md')
  await writeWithWarning(indexPath, plan.planIndexMarkdown, writtenFiles, warnings)

  // Arquivos por fase
  for (const [fileName, content] of plan.phaseFiles.entries()) {
    const filePath = path.join(absoluteFolder, fileName)
    await writeWithWarning(filePath, content, writtenFiles, warnings)
  }

  return { absoluteFolder, writtenFiles, warnings }
}

async function writeWithWarning(
  filePath: string,
  content: string,
  written: string[],
  warnings: string[],
): Promise<void> {
  // Sinalizar overwrite (auditoria de PR review)
  try {
    await fs.access(filePath)
    warnings.push(`sobrescrito: ${filePath}`)
  } catch {
    // novo arquivo — OK
  }
  try {
    await fs.writeFile(filePath, content, 'utf-8')
    written.push(filePath)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    warnings.push(`falha ao escrever ${filePath}: ${message}`)
  }
}
```

### Passo 3: Testes do writer

Usar `tmpdir + randomUUID` para isolamento entre testes (sem fixtures comitadas para esta fase).

```typescript
// skills/init/lib/populate-plan-writer.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { randomUUID } from 'node:crypto'
import { writePopulatePlanFolder } from './populate-plan-writer'
import type { PopulatePlanOutputV2 } from './populate-plan-generator'

function makeFakePlan(): PopulatePlanOutputV2 {
  const phaseFiles = new Map<string, string>([
    ['fase-01-architecture.md', '# Fase 01: ARCHITECTURE\n\n## Inputs (codigo)\n- src/app/layout.tsx\n'],
    ['fase-02-frontend.md', '# Fase 02: FRONTEND\n\n## Inputs (codigo)\n- tailwind.config.ts\n'],
  ])
  return {
    planIndexMarkdown: '# Plan: Populate Harness — test\n\n## Fases\n| 01 | ARCHITECTURE |\n',
    phaseFiles,
    relativeFolderPath: 'docs/exec-plans/active/2026-05-19T10-00-00Z-populate-harness',
    phases: [],
  }
}

let tmpCwd: string

describe('writePopulatePlanFolder', () => {
  beforeEach(async () => {
    tmpCwd = path.join(os.tmpdir(), `pop-writer-${randomUUID()}`)
    await fs.mkdir(tmpCwd, { recursive: true })
  })
  afterEach(async () => {
    await fs.rm(tmpCwd, { recursive: true, force: true })
  })

  it('creates folder + PLAN.md + 1 file per phase', async () => {
    const plan = makeFakePlan()
    const result = await writePopulatePlanFolder(plan, tmpCwd)
    const files = await fs.readdir(result.absoluteFolder)
    expect(files).toContain('PLAN.md')
    expect(files).toContain('fase-01-architecture.md')
    expect(files).toContain('fase-02-frontend.md')
    expect(result.writtenFiles).toHaveLength(3)
    expect(result.warnings).toHaveLength(0)
  })

  it('overwrites existing files with warning', async () => {
    const plan = makeFakePlan()
    await fs.mkdir(path.join(tmpCwd, plan.relativeFolderPath), { recursive: true })
    await fs.writeFile(
      path.join(tmpCwd, plan.relativeFolderPath, 'PLAN.md'),
      'old content',
      'utf-8',
    )
    const result = await writePopulatePlanFolder(plan, tmpCwd)
    expect(result.warnings.some(w => w.startsWith('sobrescrito:'))).toBe(true)
    const newContent = await fs.readFile(path.join(result.absoluteFolder, 'PLAN.md'), 'utf-8')
    expect(newContent).toContain('Plan: Populate Harness')
  })

  it('PLAN.md index references each phase file', async () => {
    const plan: PopulatePlanOutputV2 = {
      ...makeFakePlan(),
      planIndexMarkdown: makeFakePlan().planIndexMarkdown
        + '\n[fase-01-architecture.md](./fase-01-architecture.md)\n',
    }
    const result = await writePopulatePlanFolder(plan, tmpCwd)
    const index = await fs.readFile(path.join(result.absoluteFolder, 'PLAN.md'), 'utf-8')
    expect(index).toContain('fase-01-architecture.md')
  })

  it('returns absolutePath using cwd + relativeFolderPath', async () => {
    const plan = makeFakePlan()
    const result = await writePopulatePlanFolder(plan, tmpCwd)
    expect(result.absoluteFolder).toBe(path.join(tmpCwd, plan.relativeFolderPath))
  })
})
```

### Passo 4: Verificar compatibilidade com `/execute-plan` (G5 do README)

Antes de fechar fase-04, ler `skills/execute-plan/SKILL.md` Step 1 — confirmar que enumera
pastas em `docs/exec-plans/active/` por padrao OU registrar como follow-up.

Procedimento:

```bash
# Verificar que regex de enumeracao em execute-plan aceita pasta com sufixo `-populate-harness`
grep -n "exec-plans/active" skills/execute-plan/SKILL.md
grep -nE "populate|harness" skills/execute-plan/SKILL.md
```

Se `execute-plan` enumera por nome exato `YYYY-MM-DD-{slug}/` -> compativel
(`2026-05-19T10-00-00Z-populate-harness/` casa o padrao `YYYY-MM-DD*`).

Se `execute-plan` exige sufixo especifico -> registrar em `MEMORY.md` como follow-up
e Plano 05 fase-03 atualiza SKILL.md `/execute-plan`. NAO bloquear fase-04.

---

## Gotchas

- **G5 do plano (compat execute-plan):** verificar antes de fase-05 — se incompativel,
  ajustar slug da pasta OU registrar follow-up. Politica: nao quebrar `/execute-plan` aqui.
- **Local — Windows mkdir recursivo:** `fs.mkdir(..., { recursive: true })` cobre. Sem
  manual recursion.
- **Local — overwrite e intencional:** re-rodar init em projeto que ja tem
  `plano-populate-harness/` SOBRESCREVE. Razao: reentrada destruct-safe ja foi resolvida
  por Plano 04 fase-02 (backup completo antes de qualquer write). Aqui, sobrescrever e
  comportamento esperado. Warning serve so para auditoria de PR.
- **Local — diretorio aninhado parcialmente existente:** se `docs/exec-plans/active/` ja
  existir mas faltar a subpasta com data, `recursive: true` cria o que falta. Sem race
  condition em testes (cada teste usa tmpdir unico).

---

## Verificacao

### TDD

- [ ] **RED:** teste falha (modulo writer nao existe)
  - Comando: `bun test skills/init/lib/populate-plan-writer.test.ts`
  - Resultado esperado: `Cannot find module './populate-plan-writer'`

- [ ] **GREEN:** implementacao do mkdir + writeFile, testes passam
  - Comando: `bun test skills/init/lib/populate-plan-writer.test.ts`
  - Resultado esperado: `4 passed, 0 failed`

### Checklist

- [ ] Writer cria a pasta correta (`{cwd}/docs/exec-plans/active/{date}-populate-harness/`)
- [ ] Cada arquivo do `phaseFiles` Map vira arquivo separado na pasta
- [ ] `PLAN.md` indice escrito como `{folder}/PLAN.md`
- [ ] Overwrite emite warning (auditoria), nao quebra init
- [ ] G5 do README verificado — compat `/execute-plan` confirmada OU follow-up registrado em `MEMORY.md`
- [ ] Sem `any`
- [ ] Testes passam: `bun test skills/init/lib/populate-plan-writer.test.ts`
- [ ] Lint: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/populate-plan-writer.test.ts` retorna `4 passed, 0 failed`
- Apos `writePopulatePlanFolder(plan, tmpCwd)`, `fs.readdir(absoluteFolder)` contem `PLAN.md`
  + 1 arquivo por entrada de `plan.phaseFiles`
- Sobrescrever arquivo existente nao lanca excecao — apenas adiciona warning

**Por humano:**
- Comando `bun test skills/init/lib/populate-plan-writer.test.ts` mostra logs limpos
- Verificacao manual: rodar writer com fake plan em pasta tmp e listar arquivos —
  estrutura batendo com D4 do CONTEXT

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
