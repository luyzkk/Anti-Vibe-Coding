<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado nesta fase deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou seção do PRD).
Exemplo: `// 2026-05-16 (Luiz/dev): alias map — Plano 01 fase-03 G1, evita CA-10 regression`
-->

# Fase 03: `/init` monostack extension (`stack.json` + copy knowledge)

**Plano:** 01 — Tracer Bullet
**Sizing:** 1.5h
**Depende de:** fase-01 (precisa de `docs/knowledge/nodejs-typescript/` com INDEX + `atoms/` para a cópia ter source)
**Visual:** false

---

## O que esta fase entrega

Extensão monostack de `/init`: dois helpers TS puros (`write-stack-json.ts`, `copy-knowledge.ts`) + invocação após Step 3 existente em `skills/init/SKILL.md`. Apenas caminho Node+TS feliz — multi-stack, edge cases (CA-03, CA-06, CA-07), flag `--refresh-knowledge` (CA-04) e telemetria vão para o Plano 02.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/write-stack-json.ts` | Create | Writer puro: recebe `DetectedStack` + `targetDir`, grava `.claude/stack.json` |
| `skills/init/lib/write-stack-json.test.ts` | Create | Testes vitest: shape do JSON, alias map aplicado, timestamp ISO 8601 |
| `skills/init/lib/copy-knowledge.ts` | Create | Cópia idempotente: `docs/knowledge/{matrix-folder}/` → `.claude/knowledge/` (skip se destino existe) |
| `skills/init/lib/copy-knowledge.test.ts` | Create | Testes vitest: cópia de INDEX + atoms, idempotência (skip), alias map, unknown stack → noop |
| `skills/init/SKILL.md` | Modify | Adiciona invocação dos dois helpers logo após Step 3 atual (linhas 298-313). NÃO renumerar Step 4 nem alterar Step 3 (CA-10) |

---

## Implementacao

### Passo 1 (RED): escrever testes de `write-stack-json.ts` que falham

```typescript
// skills/init/lib/write-stack-json.test.ts
// 2026-05-16 (Luiz/dev): RED phase — Plano 01 fase-03, CA-02 setup.
import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeStackJson } from './write-stack-json'

describe('writeStackJson', () => {
  let target: string
  beforeEach(() => { target = mkdtempSync(join(tmpdir(), 'init-stack-')) })
  // cleanup omitido por brevidade — usar afterEach com rmSync recursivo

  it('writes .claude/stack.json with canonical matrix folder name (alias node-ts → nodejs-typescript)', async () => {
    await writeStackJson(target, { id: 'node-ts', signalSource: 'package.json#devDependencies.typescript' })
    const raw = readFileSync(join(target, '.claude', 'stack.json'), 'utf8')
    const parsed = JSON.parse(raw) as { primary: string; secondary: string[]; detected_at: string; anchor_files: string[] }
    expect(parsed.primary).toBe('nodejs-typescript')
    expect(parsed.secondary).toEqual([])
    expect(parsed.anchor_files).toContain('package.json')
    expect(new Date(parsed.detected_at).toString()).not.toBe('Invalid Date')
  })

  it('creates .claude/ folder if absent', async () => {
    await writeStackJson(target, { id: 'node-ts', signalSource: 'package.json#devDependencies.typescript' })
    expect(existsSync(join(target, '.claude'))).toBe(true)
  })
})
```

Comando RED: `bun run test -- --grep 'writeStackJson'` → esperado: arquivo `write-stack-json.ts` não existe / função não exportada (compilation error ok aqui, vira assertion failure logo após criar stub).

### Passo 2 (GREEN): implementar `write-stack-json.ts`

```typescript
// skills/init/lib/write-stack-json.ts
// 2026-05-16 (Luiz/dev): writer monostack — Plano 01 fase-03. PRD §Mecanismo "stack.json schema".
// G1 do plano: alias map node-ts → nodejs-typescript para resolver naming do PRD vs StackId.
// G6 do plano: stack.json.primary armazena matrix folder (canônico); StateMD continua com StackId.

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { DetectedStack, StackId } from './detect-stack'

// G1 — alias map. Apenas node-ts mapeia em v6.3.2 (monostack).
// Plano 02 estende para rails/python/laravel/nextjs (ver Plano 01 MEMORY.md DI-1).
const STACK_ID_TO_MATRIX_FOLDER: Partial<Record<StackId, string>> = {
  'node-ts': 'nodejs-typescript',
}

// Mapa de signalSource → anchor file. Mínimo viável para Node+TS.
function anchorFilesFromSignal(signalSource: string): string[] {
  if (signalSource.startsWith('package.json')) return ['package.json']
  return []
}

export type StackJson = {
  primary: string | null
  secondary: string[]
  detected_at: string
  anchor_files: string[]
}

export async function writeStackJson(targetDir: string, stack: DetectedStack): Promise<StackJson> {
  const primary = STACK_ID_TO_MATRIX_FOLDER[stack.id] ?? null
  const payload: StackJson = {
    primary,
    secondary: [],
    detected_at: new Date().toISOString(),
    anchor_files: anchorFilesFromSignal(stack.signalSource),
  }
  mkdirSync(join(targetDir, '.claude'), { recursive: true })
  writeFileSync(join(targetDir, '.claude', 'stack.json'), JSON.stringify(payload, null, 2) + '\n', 'utf8')
  return payload
}
```

Comando GREEN: `bun run test -- --grep 'writeStackJson'` → 2 passed, 0 failed.

### Passo 3 (RED): escrever testes de `copy-knowledge.ts` que falham

```typescript
// skills/init/lib/copy-knowledge.test.ts
// 2026-05-16 (Luiz/dev): RED phase — Plano 01 fase-03, CA-02 + CA-04 setup.
import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { copyKnowledge } from './copy-knowledge'

describe('copyKnowledge (monostack)', () => {
  let project: string
  let pluginRoot: string

  beforeEach(() => {
    project = mkdtempSync(join(tmpdir(), 'init-proj-'))
    pluginRoot = mkdtempSync(join(tmpdir(), 'plugin-'))
    // simula matrix: docs/knowledge/nodejs-typescript/{INDEX.md, atoms/type-system-idioms.md}
    mkdirSync(join(pluginRoot, 'docs', 'knowledge', 'nodejs-typescript', 'atoms'), { recursive: true })
    writeFileSync(join(pluginRoot, 'docs', 'knowledge', 'nodejs-typescript', 'INDEX.md'), '# fake INDEX')
    writeFileSync(join(pluginRoot, 'docs', 'knowledge', 'nodejs-typescript', 'atoms', 'type-system-idioms.md'), '# fake atom')
  })

  it('copies INDEX + atoms when primary is nodejs-typescript and destination absent', async () => {
    const result = await copyKnowledge({ projectRoot: project, pluginRoot, primary: 'nodejs-typescript' })
    expect(result.status).toBe('copied')
    expect(result.atomCount).toBe(1)
    expect(existsSync(join(project, '.claude', 'knowledge', 'INDEX.md'))).toBe(true)
    expect(existsSync(join(project, '.claude', 'knowledge', 'atoms', 'type-system-idioms.md'))).toBe(true)
  })

  it('skips when .claude/knowledge already exists (CA-04 idempotent default)', async () => {
    mkdirSync(join(project, '.claude', 'knowledge'), { recursive: true })
    writeFileSync(join(project, '.claude', 'knowledge', 'sentinel.md'), 'existing')
    const result = await copyKnowledge({ projectRoot: project, pluginRoot, primary: 'nodejs-typescript' })
    expect(result.status).toBe('skipped')
    expect(readFileSync(join(project, '.claude', 'knowledge', 'sentinel.md'), 'utf8')).toBe('existing')
  })

  it('noops when primary is null (unknown stack)', async () => {
    const result = await copyKnowledge({ projectRoot: project, pluginRoot, primary: null })
    expect(result.status).toBe('noop')
    expect(existsSync(join(project, '.claude', 'knowledge'))).toBe(false)
  })
})
```

### Passo 4 (GREEN): implementar `copy-knowledge.ts`

```typescript
// skills/init/lib/copy-knowledge.ts
// 2026-05-16 (Luiz/dev): cópia idempotente monostack — Plano 01 fase-03, D14 + CA-02 + CA-04.
// G2 do plano: STATE.md (escrita por state-md-init.ts) permanece intacta — esta fn é aditiva.
// G5 do plano: meta SLA ≤100ms (CA-02). Com 1 átomo é trivial; medido em fase-05 E2E.

import { cpSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export type CopyKnowledgeArgs = {
  projectRoot: string
  pluginRoot: string
  primary: string | null
}

export type CopyKnowledgeResult =
  | { status: 'copied'; atomCount: number; durationMs: number }
  | { status: 'skipped'; reason: string }
  | { status: 'noop'; reason: string }

export async function copyKnowledge(args: CopyKnowledgeArgs): Promise<CopyKnowledgeResult> {
  const { projectRoot, pluginRoot, primary } = args
  if (primary === null) {
    return { status: 'noop', reason: 'unknown stack (primary=null)' }
  }
  const destRoot = join(projectRoot, '.claude', 'knowledge')
  if (existsSync(destRoot)) {
    return { status: 'skipped', reason: '.claude/knowledge already exists (use --refresh-knowledge in Plano 02 to force)' }
  }
  const sourceRoot = join(pluginRoot, 'docs', 'knowledge', primary)
  if (!existsSync(sourceRoot)) {
    return { status: 'noop', reason: `matrix folder absent: docs/knowledge/${primary}` }
  }
  const start = performance.now()
  cpSync(sourceRoot, destRoot, { recursive: true })
  const durationMs = performance.now() - start
  const atomsDir = join(destRoot, 'atoms')
  const atomCount = existsSync(atomsDir)
    ? readdirSync(atomsDir).filter((f) => f.endsWith('.md')).length
    : 0
  return { status: 'copied', atomCount, durationMs }
}
```

### Passo 5: wire em `skills/init/SKILL.md` (preservar Step 3, adicionar invocação após)

Adicionar **depois** do bloco Step 3 atual (linhas 298-313), **antes** de Step 4. NÃO renumerar.

```markdown
### Step 3.1 (v6.3.2): Persist stack to `.claude/stack.json` + copy knowledge (Plano 01)

<!-- 2026-05-16 (Luiz/dev): Plano 01 fase-03 monostack extension.
     G2 do plano: Step 3 (state-md-init) acima permanece intacto (CA-10).
     G1 do plano: alias map node-ts → nodejs-typescript em write-stack-json.ts.
     Plano 02 estende este step para multi-stack, --refresh-knowledge, telemetria. -->

```bash
bun run -e "
import { detectStack } from './lib/detect-stack.ts'
import { writeStackJson } from './lib/write-stack-json.ts'
import { copyKnowledge } from './lib/copy-knowledge.ts'

const projectRoot = process.cwd()
const pluginRoot = process.env.PLUGIN_ROOT ?? import.meta.dir + '/../..'

const stack = await detectStack(projectRoot)
const stackJson = await writeStackJson(projectRoot, stack)
console.log('stack.json written. primary =', stackJson.primary)

const copyResult = await copyKnowledge({ projectRoot, pluginRoot, primary: stackJson.primary })
console.log('knowledge copy:', copyResult.status)
"
```
```

---

## Gotchas

- **G1 do plano (alias map):** `detectStack()` retorna `id: 'node-ts'`. Matrix folder é `nodejs-typescript`. Alias vive apenas em `write-stack-json.ts` (`STACK_ID_TO_MATRIX_FOLDER`). **NÃO** modificar `detect-stack.ts` nem `state-md-init.ts`. Documentar como DI-1 em MEMORY.md.
- **G2 do plano (CA-10):** Step 3 atual (linhas 298-313 de `skills/init/SKILL.md`) **permanece intacto**. O novo Step 3.1 é aditivo. `detected_stack: node-ts` em `docs/STATE.md` continua sendo escrito.
- **G6 do plano (dupla representação):** `stack.json.primary` = `'nodejs-typescript'` (matrix folder); `STATE.md` = `detected_stack: node-ts` (StackId). Testar ambos os lados em fase-05.
- **Local — `pluginRoot` resolution:** `import.meta.dir` em scripts `bun -e` resolve do CWD. Em produção via slash command, o plugin root é fixo. Em testes, injetar via parâmetro (testes em Passos 3-4 já fazem isso).
- **Local — `cpSync` vs `cp` async:** usar `cpSync` para previsibilidade no SLA (CA-02 ≤100ms). Async cpria overhead de orquestração para tão pouco conteúdo. Performance medida em fase-05.

---

## Verificacao

### TDD

- [ ] **RED (write-stack-json):** Teste escrito e FALHA por assertion (não compilation error após stub)
  - Comando: `bun run test -- --grep 'writeStackJson'`
  - Resultado esperado: `Expected 'nodejs-typescript', received undefined` (assertion failure)

- [ ] **GREEN (write-stack-json):** Implementação mínima, testes passam
  - Comando: `bun run test -- --grep 'writeStackJson'`
  - Resultado esperado: `2 passed, 0 failed`

- [ ] **RED (copy-knowledge):** Teste escrito e FALHA por assertion
  - Comando: `bun run test -- --grep 'copyKnowledge'`
  - Resultado esperado: 3 assertion failures (copied / skipped / noop)

- [ ] **GREEN (copy-knowledge):** Implementação mínima, testes passam
  - Comando: `bun run test -- --grep 'copyKnowledge'`
  - Resultado esperado: `3 passed, 0 failed`

### Checklist

- [ ] `skills/init/lib/write-stack-json.ts` exporta `writeStackJson` e tipo `StackJson`
- [ ] `skills/init/lib/copy-knowledge.ts` exporta `copyKnowledge`, `CopyKnowledgeArgs`, `CopyKnowledgeResult`
- [ ] Alias map `STACK_ID_TO_MATRIX_FOLDER` contém apenas `'node-ts': 'nodejs-typescript'` (extensão para outras stacks vive no Plano 02)
- [ ] `skills/init/SKILL.md` Step 3 atual (linhas 298-313) **não foi modificado** (`git diff skills/init/SKILL.md` mostra apenas adição de Step 3.1)
- [ ] Step 3.1 invoca `detectStack` → `writeStackJson` → `copyKnowledge` na ordem
- [ ] Helpers usam `import type` para `DetectedStack`/`StackId` (sem importar runtime de `detect-stack.ts`)
- [ ] Sem `any`. Sem `as` (exceto em narrowing impraticável — não necessário aqui)
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- skills/init/lib/write-stack-json.test.ts skills/init/lib/copy-knowledge.test.ts` retorna 5 passed / 0 failed
- `bun run typecheck` exit 0
- `bun run lint` exit 0
- Diff de `skills/init/SKILL.md` mostra **apenas** adição de Step 3.1 (Step 3 original byte-idêntico)

**Por humano:**
- Inspeção de `.claude/stack.json` em projeto Node+TS de teste mostra `primary: "nodejs-typescript"`, não `"node-ts"` (alias aplicado)
- `.claude/knowledge/INDEX.md` + `.claude/knowledge/atoms/type-system-idioms.md` presentes após rodar Step 3.1 manualmente

---

<!-- Gerado por /plan-feature em 2026-05-16 -->
