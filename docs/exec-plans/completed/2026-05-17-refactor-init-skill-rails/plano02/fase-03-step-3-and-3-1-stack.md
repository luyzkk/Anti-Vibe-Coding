<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 03: Portar Step 3 + Step 3.1 — detect-stack + persist + knowledge

**Plano:** 02 — Steps puros
**Sizing:** 2h
**Depende de:** fase-01 (registry; padrao golden)
**Visual:** false

---

## O que esta fase entrega

DOIS step modules:
- `03-detect-stack-and-register.ts` — porta Step 3 (SKILL.md linhas 298-310): `detectStack` +
  `writeStackToStateMd`. 2 logs canonicos.
- `03_1-persist-stack-and-knowledge.ts` — porta Step 3.1 (SKILL.md linhas 315-333): chama
  `runStackKnowledgeInit` (orquestrador ja extraido, ver Wave 5 D2 no comentario do step atual).

Registry passa a ter 5 entradas. Step 3 RODA antes do 3.1 (3.1 ja assume STATE.md atualizada).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/03-detect-stack-and-register.ts` | Create | Step que detecta stack e escreve em STATE.md |
| `skills/init/lib/steps/03_1-persist-stack-and-knowledge.ts` | Create | Step thin wrapper sobre `runStackKnowledgeInit` |
| `skills/init/lib/registry.ts` | Modify | Adicionar as 2 novas entradas |
| `skills/init/lib/steps/03-detect-stack-and-register.test.ts` | Create | 3 testes (greenfield Node-TS, Next.js, unknown) |
| `skills/init/lib/steps/03_1-persist-stack-and-knowledge.test.ts` | Create | 2 testes (default vs --refresh-knowledge) |
| `skills/init/lib/steps/__fixtures__/stack-nextjs/package.json` | Create | Fixture: package.json com Next |
| `skills/init/lib/steps/__fixtures__/stack-node/package.json` | Create | Fixture: package.json basico |
| `skills/init/lib/steps/__fixtures__/stack-unknown/.gitkeep` | Create | Fixture: nada — stack `unknown` |
| `skills/init/lib/steps/__golden__/detect-stack-{nextjs,node,unknown}.txt` | Create | stdout esperado por cenario |

---

## Implementacao

### Passo 1: Step 3 — `03-detect-stack-and-register.ts`

**Wording (SKILL.md linhas 305-308):**
```
Detected stack: {id} (via {signalSource})
STATE.md {status}: {path}
```

```typescript
// skills/init/lib/steps/03-detect-stack-and-register.ts
import { detectStack } from '../detect-stack'
import { writeStackToStateMd } from '../state-md-init'
import type { Step } from './types'

export const detectStackAndRegisterStep: Step = {
  id: 'detect-stack-and-register',
  async run(ctx) {
    const stack = await detectStack(ctx.cwd)
    const result = await writeStackToStateMd(ctx.cwd, stack)

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linhas 305-308 (PRD R1, G1).
    const lines = [
      `Detected stack: ${stack.id} (via ${stack.signalSource})`,
      `STATE.md ${result.status}: ${result.path}`,
    ]
    return { mutated: true, summary: lines.join('\n') }
  },
}
```

### Passo 2: Step 3.1 — `03_1-persist-stack-and-knowledge.ts`

**Wording:** o helper `runStackKnowledgeInit` ja emite logs internamente (verificavel pela
nota da Wave 5 D2 no SKILL.md). Portanto este step NAO precisa emitir nada — apenas chama o
helper e retorna `summary: ''` (ou um marcador). **Conferir antes:** o teste do helper revela
se ele usa `console.log` interno OR retorna uma estrutura com logs.

```typescript
// skills/init/lib/steps/03_1-persist-stack-and-knowledge.ts
import path from 'node:path'
import { runStackKnowledgeInit } from '../run-stack-knowledge-init'
import type { Step } from './types'

function resolvePluginRoot(stepFileDir: string): string {
  return process.env.CLAUDE_PLUGIN_ROOT ?? path.join(stepFileDir, '..', '..', '..', '..')
}

export const persistStackKnowledgeStep: Step = {
  id: 'persist-stack-and-knowledge',
  async run(ctx) {
    const targetDir = ctx.cwd
    const pluginRoot = resolvePluginRoot(import.meta.dir)
    // 2026-05-17 (Luiz/dev): args passado verbatim ao orquestrador — ele extrai --refresh-knowledge.
    // PRD CA-04, G5 do plano (NAO duplicar parse).
    const args = ctx.args.join(' ')

    await runStackKnowledgeInit({ targetDir, pluginRoot, args })

    // 2026-05-17 (Luiz/dev): summary vazia — orquestrador faz seus proprios logs (Wave 5 D2).
    // mutated true mesmo assim — orquestrador escreve .claude/stack.json e copia knowledge files.
    return { mutated: true, summary: '' }
  },
}
```

> **Conferir Wave 5 D2:** abrir `skills/init/lib/run-stack-knowledge-init.ts` e ver se ele faz
> `console.log` ou se devolve dados via `RunStackKnowledgeInitResult`. Se devolve, o step precisa
> emitir os logs canonicos. Se ja loga, `summary: ''` esta correto. Ajustar antes de fechar.

### Passo 3: Registrar no `registry.ts`

```typescript
// 2026-05-17 (Luiz/dev): Step 3 -> Step 3.1, sequencial.
// detect-stack-and-register escreve STATE.md; persist-stack-and-knowledge le STATE.md indireto via runStackKnowledgeInit.
export const registry: readonly Step[] = [
  detectLegacyStep,
  scaffoldFullTreeStep,
  linkClaudeAgentsStep,
  detectStackAndRegisterStep,
  persistStackKnowledgeStep,
]
```

### Passo 4: Fixtures

```
__fixtures__/stack-nextjs/package.json
  {
    "name": "test-app",
    "dependencies": { "next": "^14.0.0", "react": "^18.0.0", "react-dom": "^18.0.0" }
  }

__fixtures__/stack-node/package.json
  {
    "name": "test-app",
    "dependencies": { "typescript": "^5.0.0" }
  }

__fixtures__/stack-unknown/
  .gitkeep        (vazio)
```

### Passo 5: Testes Step 3 (`03-detect-stack-and-register.test.ts`)

```typescript
// skills/init/lib/steps/03-detect-stack-and-register.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtemp, rm, cp, mkdir } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { detectStackAndRegisterStep } from './03-detect-stack-and-register'

const FIX = path.join(import.meta.dir, '__fixtures__')

const ctx = (cwd: string) => ({ cwd, args: [] as readonly string[], flags: {} as Readonly<Record<string, boolean | string>> })

async function copyFixture(name: string): Promise<string> {
  const dst = await mkdtemp(path.join(os.tmpdir(), `stack-${name}-`))
  await cp(path.join(FIX, name), dst, { recursive: true })
  return dst
}

describe('detectStackAndRegisterStep', () => {
  let tmpDir: string
  afterEach(async () => { if (tmpDir) await rm(tmpDir, { recursive: true, force: true }) })

  test('nextjs: summary mentions nextjs id and signalSource', async () => {
    tmpDir = await copyFixture('stack-nextjs')
    const report = await detectStackAndRegisterStep.run(ctx(tmpDir))
    expect(report.mutated).toBe(true)
    const lines = report.summary.split('\n')
    expect(lines[0]).toMatch(/^Detected stack: nextjs \(via [a-z-]+\)$/)
    expect(lines[1]).toMatch(/^STATE\.md (created|updated): .+STATE\.md$/)
  })

  test('node-ts: summary mentions node-ts', async () => {
    tmpDir = await copyFixture('stack-node')
    const report = await detectStackAndRegisterStep.run(ctx(tmpDir))
    const lines = report.summary.split('\n')
    expect(lines[0]).toMatch(/^Detected stack: node-ts \(via [a-z-]+\)$/)
  })

  test('unknown: summary mentions unknown id', async () => {
    tmpDir = await copyFixture('stack-unknown')
    const report = await detectStackAndRegisterStep.run(ctx(tmpDir))
    const lines = report.summary.split('\n')
    expect(lines[0]).toMatch(/^Detected stack: unknown \(via [a-z-]+\)$/)
  })
})
```

### Passo 6: Testes Step 3.1 (`03_1-persist-stack-and-knowledge.test.ts`)

Como `runStackKnowledgeInit` ja tem sua propria suite (Wave 5 D2), este teste valida apenas que
o step propaga `args` corretamente. Usar DI via parametro testavel similar a fase-02.

```typescript
// skills/init/lib/steps/03_1-persist-stack-and-knowledge.ts (adicionar export testavel)
import type { RunStackKnowledgeInitOpts, RunStackKnowledgeInitResult } from '../run-stack-knowledge-init'
// ... (resto do step acima)

type StackKnowledgeRunner = (opts: RunStackKnowledgeInitOpts) => Promise<RunStackKnowledgeInitResult>

export async function runPersistStackKnowledgeStep(
  ctx: { cwd: string; args: readonly string[] },
  runner: StackKnowledgeRunner = runStackKnowledgeInit,
  pluginRootOverride?: string,
) {
  const pluginRoot = pluginRootOverride ?? resolvePluginRoot(import.meta.dir)
  await runner({ targetDir: ctx.cwd, pluginRoot, args: ctx.args.join(' ') })
  return { mutated: true, summary: '' }
}
```

```typescript
// skills/init/lib/steps/03_1-persist-stack-and-knowledge.test.ts
import { describe, test, expect } from 'bun:test'
import { runPersistStackKnowledgeStep } from './03_1-persist-stack-and-knowledge'

describe('persistStackKnowledgeStep', () => {
  test('passes joined args to runner', async () => {
    let seenArgs: string | undefined
    const stub: any = async (opts: any) => {
      seenArgs = opts.args
      return { stackPersisted: 'created', knowledgeCopied: 0 }
    }
    await runPersistStackKnowledgeStep({ cwd: '/tmp', args: ['--refresh-knowledge'] }, stub, '/plugin-root')
    expect(seenArgs).toBe('--refresh-knowledge')
  })

  test('summary is empty (orchestrator emits its own logs)', async () => {
    const stub: any = async () => ({ stackPersisted: 'created', knowledgeCopied: 0 })
    const r = await runPersistStackKnowledgeStep({ cwd: '/tmp', args: [] }, stub, '/plugin-root')
    expect(r.summary).toBe('')
    expect(r.mutated).toBe(true)
  })
})
```

### Passo 7: Goldens (referencia humana)

`__golden__/detect-stack-nextjs.txt`:
```
Detected stack: nextjs (via package-json)
STATE.md created: <abs-path>/STATE.md
```

`__golden__/detect-stack-node.txt`:
```
Detected stack: node-ts (via package-json)
STATE.md created: <abs-path>/STATE.md
```

`__golden__/detect-stack-unknown.txt`:
```
Detected stack: unknown (via fallback)
STATE.md created: <abs-path>/STATE.md
```

> `signalSource` e `path` sao placeholders — os testes usam regex porque `path` muda por tmp dir
> e `signalSource` pode variar (`package-json`, `framework-config`, `fallback`).

### Passo 8: Paranoia grep contra SKILL.md (G1)

```bash
grep -F 'Detected stack:' skills/init/SKILL.md
grep -F 'STATE.md' skills/init/SKILL.md
```

Ambos exit 0.

---

## Gotchas

- **G1 do plano (wording):** as 2 linhas tem interpolacoes `${...}`. Conferir que os campos
  acessados (`stack.id`, `stack.signalSource`, `result.status`, `result.path`) batem com
  os tipos atuais dos helpers (`DetectedStack`, `WriteStackResult`).
- **G2 do plano:** helpers `detect-stack.ts`, `state-md-init.ts`, `run-stack-knowledge-init.ts`
  preservados. Se algum teste falhar por bug, escalar.
- **G3 do plano (imports estaticos):** import direto.
- **G5 do plano (NAO duplicar parseRefreshFlag):** o orquestrador `runStackKnowledgeInit` ja
  faz `parseRefreshFlag(args)` internamente. Step 3.1 NAO chama `parseRefreshFlag` aqui.
- **Local — Step 3.1 sem logs proprios:** depende do orquestrador ter `console.log` interno.
  Verificar `run-stack-knowledge-init.ts` (procurar por `console.log`). Se NAO logar, este step
  precisa montar `summary` lendo o `RunStackKnowledgeInitResult` retornado. Decidir antes do RED.
- **Local — `ctx.args.join(' ')`:** o SKILL.md atual usa `typeof ARGUMENTS === 'string' ? ARGUMENTS : ''`.
  No dispatcher novo, `ARGUMENTS` foi parseado em `ctx.args` (array). Re-juntar com `' '` aproxima
  o wording original, mas se algum arg tem espaco no valor, o re-join NAO eh perfeito. Para
  `--refresh-knowledge`, sem args com espaco — ok. Documentar limite caso surja arg posicional
  com espaco no futuro.
- **Local — fixtures de package.json:** `cp(..., { recursive: true })` so funciona Node >= 16.7
  ou Bun. Em ambos, ok. Validar que o teste corre em CI.
- **Local — Bun stub `any`:** usar `as any` para o runner stub em tests eh feio mas evita
  ter que importar e re-implementar `RunStackKnowledgeInitResult` no teste. Aceitavel em escopo
  de teste. Lint pode reclamar — adicionar `// @ts-expect-error stub` se necessario.

---

## Verificacao

### TDD

- [ ] **RED:** Testes escritos. Falham por modulo nao encontrado.
- [ ] **GREEN:** Steps + registry. Testes passam.

### Checklist

- [ ] `03-detect-stack-and-register.ts` e `03_1-persist-stack-and-knowledge.ts` criados
- [ ] `registry.ts` com 5 entradas em ordem (G4 do plano)
- [ ] 3 fixtures + 3 goldens (referencia)
- [ ] 3 testes do Step 3 passam
- [ ] 2 testes do Step 3.1 passam (via DI runner stub)
- [ ] Helpers NAO modificados
- [ ] `SKILL.md` NAO modificado
- [ ] Paranoia grep: 2 strings encontradas (exit 0)
- [ ] Sem `await import` ou `bun -e`
- [ ] Lint limpo

---

## Criterio de Aceite

Step 3 e Step 3.1 portados com testes que cobrem 3+2 cenarios. Wording byte-identico do Step 3
preserva CA-01. Step 3.1 propaga args ao orquestrador (preserva CA-04 — `--refresh-knowledge`).

**Por maquina:**
- `bun run test skills/init/lib/steps/03-*.test.ts skills/init/lib/steps/03_1-*.test.ts` exit 0 com 5 testes
- `git diff --stat skills/init/SKILL.md skills/init/lib/{detect-stack,state-md-init,run-stack-knowledge-init,parse-refresh-flag}.ts` retorna 0 arquivos
- `grep -c parseRefreshFlag skills/init/lib/steps/03_1-*.ts` retorna 0 (G5: NAO duplicar)

**Por humano:**
- Goldens batem com SKILL.md linhas 305-308 (estrutura), nao literal por causa das interpolacoes

---

<!-- Gerado por /plan-feature em 2026-05-17 -->
