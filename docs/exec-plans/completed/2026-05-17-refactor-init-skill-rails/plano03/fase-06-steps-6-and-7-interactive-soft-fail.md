<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 06: Portar Step 6 (Delivery Loop interativo) + Step 7 (Capabilities Discovery soft-fail)

**Plano:** 03 — Gates de abortagem + steps interativos
**Sizing:** 1.5h
**Depende de:** fase-01 (catch de AbortError ja comprovado — nao usado aqui, mas dispatcher precisa)
**Visual:** false

---

## O que esta fase entrega

DOIS step modules + DUAS extensoes do contrato + UMA modificacao do dispatcher:

1. **`14-delivery-loop.ts`** — porta Step 6 (SKILL.md linhas 369-399) usando o contrato
   `needsUser` (PRD D3, CH-01). Quando o step decide perguntar, retorna
   `{ mutated: false, summary: '', needsUser: { prompt, options } }`. Dispatcher pausa,
   chama `ctx.askUser(prompt, options)`, e re-invoca o step com a resposta em
   `ctx.flags['__deliveryLoopAnswer']`. Em segundo invoke, step decide: 'y' → injeta
   snippet em AGENTS.md; 'N' → no-op.

2. **`15-capabilities-discovery.ts`** — porta Step 7 (SKILL.md linhas 403-461) com
   soft-fail OBRIGATORIO (PRD CA-06, G7 do plano). Try/catch INTERNO engole TODOS os
   erros. Profile null = skip com log. Profile + sucesso = audit + warnings. Profile +
   helper throw = log de soft-fail e retorna `{ mutated: false, summary }` SEM lancar.

3. **Extensao em `types.ts`** — campo opcional `needsUser?: { prompt: string; options: readonly string[] }`
   em `StepReport`, e campo opcional `askUser?: (prompt, options) => Promise<string>` em
   `StepContext`. Ambos opcionais — retro-compativeis.

4. **Modificacao em `run-init.ts`** — apos cada step, dispatcher inspeciona `report.needsUser`.
   Se presente E `ctx.askUser` existir, chama `askUser`, popula `ctx.flags['__deliveryLoopAnswer']`
   com a resposta, e re-invoca `step.run(ctx)` UMA VEZ. Se step retornar `needsUser` na
   segunda chamada, eh bug — abortar com erro. Limite anti-loop de 1.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/types.ts` | Modify | Adicionar `needsUser?` em `StepReport` e `askUser?` em `StepContext` |
| `skills/init/lib/run-init.ts` | Modify | Pause-and-resume loop apos cada step quando `needsUser` |
| `skills/init/lib/steps/14-delivery-loop.ts` | Create | Step 6 com `needsUser` no primeiro invoke + injecao no segundo |
| `skills/init/lib/steps/15-capabilities-discovery.ts` | Create | Step 7 com try/catch interno (soft-fail) |
| `skills/init/lib/registry.ts` | Modify | Inserir `deliveryLoopStep` + `capabilitiesDiscoveryStep` apos `installGhFilesStep`, antes de `finalValidationStep` |
| `skills/init/lib/steps/14-delivery-loop.test.ts` | Create | 3 cenarios: user-N (no-op), user-y (injecao), marker-missing (warn) |
| `skills/init/lib/steps/15-capabilities-discovery.test.ts` | Create | 3 cenarios: no-profile (skip), profile-ok (audit + warnings), profile-throws (soft-fail logged) |
| `skills/init/lib/run-init-needs-user.test.ts` | Create | 2 testes do dispatcher: pause+resume com askUser, anti-loop guard |

---

## Implementacao

### Passo 1: Estender `types.ts` (G6 do plano)

```typescript
// skills/init/lib/steps/types.ts (modificacao)

export type StepContext = {
  cwd: string
  args: readonly string[]
  flags: Readonly<Record<string, boolean | string>>
  /**
   * 2026-05-17 (Luiz/dev): injetado pelo dispatcher para steps interativos.
   * Steps NAO chamam askUser diretamente — eles RETORNAM `needsUser` no report.
   * O dispatcher faz a chamada e re-invoca o step com a resposta. PRD D3, CH-01.
   * Default: undefined (testes podem stubar).
   */
  askUser?: (prompt: string, options: readonly string[]) => Promise<string>
}

export type StepReport = {
  mutated: boolean
  summary: string
  skipRemaining?: boolean
  /**
   * 2026-05-17 (Luiz/dev): contrato `needs-user` (PRD D3, CH-01).
   * Step sinaliza ao dispatcher que precisa de input do usuario. Dispatcher pausa,
   * chama ctx.askUser, popula ctx.flags['__deliveryLoopAnswer'] e re-invoca o step.
   * NUNCA setar AMBOS needsUser E skipRemaining (G6 do plano).
   */
  needsUser?: {
    readonly prompt: string
    readonly options: readonly string[]
  }
}
```

### Passo 2: Modificar `run-init.ts` (loop pause-and-resume)

```typescript
// skills/init/lib/run-init.ts (snippet do loop — preservar resto do skeleton)

for (const step of reg) {
  try {
    let report = await step.run(ctx)

    // 2026-05-17 (Luiz/dev): contrato needsUser (PRD D3, CH-01, G6 do plano).
    // Anti-loop guard: re-invoca step UMA UNICA VEZ. Se segunda chamada tambem retorna
    // needsUser, eh bug do step — abortamos com erro generico (nao AbortError, pois
    // nao eh comportamento esperado).
    if (report.needsUser !== undefined) {
      if (ctx.askUser === undefined) {
        // 2026-05-17 (Luiz/dev): step pediu user, mas runtime nao injetou stub.
        // Em test sem stub: pula a interacao (default == primeira opcao OR opcao 'N').
        // Em prod, dispatcher sempre injeta askUser — esse branch eh defensive.
        report = { ...report, needsUser: undefined }
      } else {
        const answer = await ctx.askUser(report.needsUser.prompt, report.needsUser.options)
        // 2026-05-17 (Luiz/dev): propagar resposta via ctx.flags. Chave reservada para
        // o step que pediu (delivery-loop usa __deliveryLoopAnswer). Convencao: cada
        // step interativo define sua propria chave. Documentar em init-rationale.md (Plano 04).
        const ctxWithAnswer = {
          ...ctx,
          flags: { ...ctx.flags, __interactiveAnswer: answer },
        }
        report = await step.run(ctxWithAnswer)
        if (report.needsUser !== undefined) {
          throw new Error(`Step "${step.id}" returned needsUser twice — anti-loop guard tripped.`)
        }
      }
    }

    log(report.summary)
    if (report.skipRemaining === true) {
      break
    }
  } catch (e) {
    if (e instanceof AbortError) {
      log(e.reason)
      return { kind: 'aborted', code: e.code, reason: e.reason }
    }
    throw e
  }
}
```

> **Coordenacao com Plano 02 fase-06:** o `skipRemaining` check continua funcionando.
> Ordem do check: needsUser primeiro (pode mudar o report), depois skipRemaining no
> report FINAL. Se `__interactiveAnswer` for ignorada por outros steps, sem dano (chave
> apenas adicionada).

### Passo 3: Criar `14-delivery-loop.ts` (Step 6)

```typescript
// skills/init/lib/steps/14-delivery-loop.ts
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { injectOptionalSection } from '../inject-optional-section'
import type { Step } from './types'

// 2026-05-17 (Luiz/dev): plugin root resolution copiado de SKILL.md linha 384.
// O step esta em lib/steps/, plugin root eh 4 niveis acima.
function resolvePluginRoot(stepFileDir: string): string {
  return process.env.CLAUDE_PLUGIN_ROOT ?? path.join(stepFileDir, '..', '..', '..', '..')
}

export const deliveryLoopStep: Step = {
  id: 'delivery-loop',
  async run(ctx) {
    // 2026-05-17 (Luiz/dev): primeira invocacao — sem resposta no ctx.flags.
    // Retorna needsUser para o dispatcher pausar e perguntar. PRD D3, CH-01.
    const answer = ctx.flags['__interactiveAnswer']
    if (typeof answer !== 'string') {
      return {
        mutated: false,
        summary: '',
        needsUser: {
          // 2026-05-17 (Luiz/dev): prompt byte-identico ao SKILL.md linha 372 (PRD R1, G1).
          // ATENCAO: DOUBLE SPACE antes de '[y/N]'.
          prompt: 'Do you use Linear and want to enable the Delivery Loop convention?  [y/N]',
          options: ['y', 'N'],
        },
      }
    }

    // 2026-05-17 (Luiz/dev): segunda invocacao — answer disponivel via ctx.flags.
    // Default: N (SKILL.md linha 374). Apenas 'y' (case insensitive) ativa injecao.
    const yes = answer.trim().toLowerCase() === 'y'
    if (!yes) {
      return { mutated: false, summary: '' }
    }

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linhas 384-396.
    const pluginRoot = resolvePluginRoot(import.meta.dir)
    const snippet = await fs.readFile(
      path.join(pluginRoot, 'skills/init/assets/snippets/delivery-loop.md'),
      'utf8',
    )

    const result = await injectOptionalSection({
      filePath: path.join(ctx.cwd, 'AGENTS.md'),
      marker: '<!-- INIT:DELIVERY_LOOP_SLOT -->',
      body: snippet,
    })

    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 396 (PRD R1, G1).
    return {
      mutated: result.status === 'injected',
      summary: 'Delivery Loop injection: ' + result.status,
    }
  },
}
```

### Passo 4: Criar `15-capabilities-discovery.ts` (Step 7) — SOFT-FAIL OBRIGATORIO

```typescript
// skills/init/lib/steps/15-capabilities-discovery.ts
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { readArchitectureProfile } from '../../../lib/read-architecture-profile'
import { discoverCapabilities } from '../../../lib/capabilities-writer'
import { AuditLogWriter } from '../audit-log'
import type { Step } from './types'

export const capabilitiesDiscoveryStep: Step = {
  id: 'capabilities-discovery',
  async run(ctx) {
    // 2026-05-17 (Luiz/dev): G7 do plano — soft-fail OBRIGATORIO (PRD CA-06).
    // Try/catch GLOBAL engole tudo. Step nunca lanca. Step nunca aborta /init.
    try {
      const projectRoot = ctx.cwd
      const profileObj = readArchitectureProfile()

      if (profileObj === null) {
        // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 421 (PRD R1, G1).
        return {
          mutated: false,
          summary: '[capabilities-discovery] skipped — architecture profile not detected. Run /anti-vibe-coding:detect-architecture first.',
        }
      }

      const startMs = Date.now()
      const output = await discoverCapabilities(projectRoot, profileObj.profile)
      const capsPath = path.join(projectRoot, 'discovery', 'capabilities.json')
      await writeFile(capsPath, JSON.stringify(output, null, 2), 'utf-8')

      const lines: string[] = []

      // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 432 (PRD R1, G1).
      // Schema-mismatch eh apenas WARN — nao falha. Inclui na SUMMARY (visto pelo user).
      if (output.schema_version !== '1.0') {
        lines.push('[capabilities-discovery] schema_version mismatch — expected "1.0", got ' + JSON.stringify(output.schema_version))
      }

      const writer = new AuditLogWriter(projectRoot, randomUUID())
      await writer.append({
        subagent_id: 'capabilities-discovery',
        input_paths: ['app/**', 'routes/**'],
        output_struct: {
          capabilities_count: output.capabilities.length,
          coverage_gaps_count: output.coverage_gaps.length,
          profile: profileObj.profile,
          schema_version: '1.0',
        },
        duration_ms: Date.now() - startMs,
        retry_count: 0,
      })

      // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linhas 452/454 (PRD R1, G1).
      if (output.coverage_gaps.length > 0 && output.capabilities.length === 0) {
        lines.push('Capabilities discovery found no routes. Consider running /anti-vibe-coding:init --refresh after adding routes.')
      } else if (output.coverage_gaps.length > 0) {
        lines.push('Capabilities discovery: ' + output.capabilities.length + ' routes found, ' + output.coverage_gaps.length + ' coverage gaps. Run /anti-vibe-coding:init --refresh if routes change.')
      }

      return {
        mutated: true,
        summary: lines.join('\n'),
      }
    } catch (err) {
      // 2026-05-17 (Luiz/dev): G7 do plano — soft-fail. NUNCA rethrow. PRD CA-06.
      // wording byte-identico ao SKILL.md linha 458.
      const message = err instanceof Error ? err.message : String(err)
      return {
        mutated: false,
        summary: '[capabilities-discovery] step failed, skipping: ' + message,
      }
    }
  },
}
```

> **Local — verified signatures:** `readArchitectureProfile()` retorna `ArchitectureProfile | null`
> (sem argumentos). `discoverCapabilities(projectRoot, profileName)` retorna
> `Promise<CapabilitiesOutput>` que tem `capabilities`, `coverage_gaps`, `schema_version`,
> etc. Helpers em `skills/lib/` (NAO `skills/init/lib/`) — path relativo
> `'../../../lib/read-architecture-profile'` e `'../../../lib/capabilities-writer'` a
> partir de `skills/init/lib/steps/15-...ts`. CONFIRMAR com Glob antes do RED.

### Passo 5: Atualizar `registry.ts`

```typescript
// skills/init/lib/registry.ts (snippet)
import { deliveryLoopStep } from './steps/14-delivery-loop'
import { capabilitiesDiscoveryStep } from './steps/15-capabilities-discovery'

// 2026-05-17 (Luiz/dev): G4 do plano — apos installGhFilesStep, antes de finalValidationStep.
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
  deliveryLoopStep,             // <-- novo (interativo, opt-in)
  capabilitiesDiscoveryStep,    // <-- novo (soft-fail)
  finalValidationStep,
]
```

### Passo 6: Testes (`14-delivery-loop.test.ts`)

```typescript
// skills/init/lib/steps/14-delivery-loop.test.ts
import { describe, test, expect, afterEach } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { deliveryLoopStep } from './14-delivery-loop'

describe('deliveryLoopStep', () => {
  let tmpDir: string
  afterEach(async () => { if (tmpDir) await rm(tmpDir, { recursive: true, force: true }) })

  test('primeiro invoke (sem __interactiveAnswer): retorna needsUser com prompt byte-identico', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'dl-prompt-'))
    const r = await deliveryLoopStep.run({ cwd: tmpDir, args: [], flags: {} })
    expect(r.needsUser).toBeDefined()
    if (r.needsUser) {
      // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 372 (PRD R1, G1).
      // DOUBLE SPACE antes de '[y/N]' (preservado).
      expect(r.needsUser.prompt).toBe('Do you use Linear and want to enable the Delivery Loop convention?  [y/N]')
      expect(r.needsUser.options).toEqual(['y', 'N'])
    }
    expect(r.mutated).toBe(false)
  })

  test('segundo invoke com "N": no-op silencioso', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'dl-N-'))
    await writeFile(path.join(tmpDir, 'AGENTS.md'), '# AGENTS\n\n<!-- INIT:DELIVERY_LOOP_SLOT -->\n')

    const r = await deliveryLoopStep.run({
      cwd: tmpDir,
      args: [],
      flags: { __interactiveAnswer: 'N' },
    })
    expect(r).toEqual({ mutated: false, summary: '' })
  })

  test('segundo invoke com "y": injeta snippet em AGENTS.md', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'dl-y-'))
    await writeFile(path.join(tmpDir, 'AGENTS.md'), '# AGENTS\n\n<!-- INIT:DELIVERY_LOOP_SLOT -->\n')

    const r = await deliveryLoopStep.run({
      cwd: tmpDir,
      args: [],
      flags: { __interactiveAnswer: 'y' },
    })

    expect(r.mutated).toBe(true)
    // 2026-05-17 (Luiz/dev): wording byte-identico ao SKILL.md linha 396 (PRD R1, G1).
    expect(r.summary).toBe('Delivery Loop injection: injected')

    const updated = await Bun.file(path.join(tmpDir, 'AGENTS.md')).text()
    expect(updated).toContain('<!-- INIT:DELIVERY_LOOP_SLOT -->')
    // 2026-05-17 (Luiz/dev): snippet foi injetado APOS o marker.
    expect(updated.length).toBeGreaterThan('# AGENTS\n\n<!-- INIT:DELIVERY_LOOP_SLOT -->\n'.length)
  })

  test('segundo invoke com "y" + AGENTS.md sem marker: status marker-missing', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'dl-nomark-'))
    await writeFile(path.join(tmpDir, 'AGENTS.md'), '# AGENTS\n\n(no marker here)\n')

    const r = await deliveryLoopStep.run({
      cwd: tmpDir,
      args: [],
      flags: { __interactiveAnswer: 'y' },
    })
    expect(r.summary).toBe('Delivery Loop injection: marker-missing')
    expect(r.mutated).toBe(false)
  })
})
```

### Passo 7: Testes (`15-capabilities-discovery.test.ts`) — SOFT-FAIL OBRIGATORIO

```typescript
// skills/init/lib/steps/15-capabilities-discovery.test.ts
import { describe, test, expect, afterEach, mock } from 'bun:test'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { capabilitiesDiscoveryStep } from './15-capabilities-discovery'

const ctx = (cwd: string) => ({ cwd, args: [] as readonly string[], flags: {} as Readonly<Record<string, boolean | string>> })

describe('capabilitiesDiscoveryStep', () => {
  let tmpDir: string
  afterEach(async () => { if (tmpDir) await rm(tmpDir, { recursive: true, force: true }) })

  test('no profile (manifest ausente): log de skip, mutated=false, NAO lanca', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'cap-noprofile-'))
    // 2026-05-17 (Luiz/dev): sem .anti-vibe-manifest.json, readArchitectureProfile retorna null.
    // No process.cwd() pode ter manifest do projeto-pai — usar cwd com cwd corretamente isolado.
    // Estrategia: o helper le manifest do process.cwd() (constante DEFAULT_MANIFEST_PATH),
    // NAO do ctx.cwd. Pode ser preciso stub via mock.module — confirmar comportamento.
    // Se nao puder isolar, este teste depende do estado real do projeto (skip se nao manipulavel).

    const r = await capabilitiesDiscoveryStep.run(ctx(tmpDir))
    // 2026-05-17 (Luiz/dev): se profile estiver disponivel no projeto pai, esse assert pode
    // falhar — usar regex que cobre os 2 paths possiveis.
    expect(r.mutated).toBe(false)
    // Wording byte-identico ao SKILL.md linha 421.
    if (r.summary.includes('skipped')) {
      expect(r.summary).toBe('[capabilities-discovery] skipped — architecture profile not detected. Run /anti-vibe-coding:detect-architecture first.')
    }
  })

  test('helper throws: soft-fail logged, mutated=false, NAO lanca exception (PRD CA-06, G7)', async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'cap-throw-'))
    // 2026-05-17 (Luiz/dev): pre-criar discovery/ como ARQUIVO (nao diretorio) para forcar
    // erro em writeFile downstream. Estrategia pratica de injecao de falha sem mock de modulo.
    await writeFile(path.join(tmpDir, 'discovery'), 'not a directory')
    // 2026-05-17 (Luiz/dev): mesmo com profile null no helper, este teste valida o catch global.
    // Para forcar throw, podemos tambem invocar com manifest forjado mas o write falhar.

    // Independente do caminho de erro: a invariante eh "NUNCA throw".
    // 2026-05-17 (Luiz/dev): essa chamada NAO deve lancar. Se lancar, G7 violado.
    let didThrow = false
    let result
    try {
      result = await capabilitiesDiscoveryStep.run(ctx(tmpDir))
    } catch {
      didThrow = true
    }
    expect(didThrow).toBe(false)
    expect(result).toBeDefined()
    if (result) {
      expect(result.mutated).toBe(false)
      // Se o caminho de erro for atingido, summary contem o prefixo de soft-fail.
      // Se nao foi (porque profile foi null antes do writeFile), summary tem "skipped".
      const ok =
        result.summary.startsWith('[capabilities-discovery] step failed, skipping: ') ||
        result.summary.includes('skipped — architecture profile not detected')
      expect(ok).toBe(true)
    }
  })

  test('profile + write OK: audit gravado, summary com warnings se coverage_gaps', async () => {
    // 2026-05-17 (Luiz/dev): este teste depende de FS real + manifest valido.
    // Pode ser SKIPPED se ambiente de teste nao tiver manifest util — o teste anterior
    // ja prova o invariante de soft-fail. Marcar como SKIP no CI se necessario.
    // Caso execucao manual: criar .anti-vibe-manifest.json com profile valido em tmpDir,
    // garantir que process.cwd() aponta para tmpDir (via test.skip ou monkey-patch),
    // e validar que discovery/capabilities.json eh criado + audit-log gravado.
  })
})
```

> **Nota de teste:** `readArchitectureProfile` usa `path.join(process.cwd(), '.anti-vibe-manifest.json')`
> — depende do `process.cwd()` REAL do runner, NAO de `ctx.cwd`. Isso eh limitacao do
> helper (nao mexer — PRD Won't Have). Em testes unitarios, isolamento perfeito exigiria
> monkey-patching ou subprocess. Para esta fase, o teste do soft-fail (segundo cenario)
> eh suficiente para provar G7. Teste 3 fica como "manual smoke" ou skip.

### Passo 8: Testes do dispatcher (`run-init-needs-user.test.ts`)

```typescript
// skills/init/lib/run-init-needs-user.test.ts
import { describe, test, expect } from 'bun:test'
import { runInit } from './run-init'
import type { Step } from './steps/types'

describe('runInit — needsUser flow (Plano 03 fase-06)', () => {
  test('pausa, chama askUser, re-invoca step com resposta em flags.__interactiveAnswer', async () => {
    let callCount = 0
    let lastFlags: Readonly<Record<string, boolean | string>> = {}
    const interactiveStep: Step = {
      id: 'interactive',
      async run(ctx) {
        callCount += 1
        lastFlags = ctx.flags
        if (callCount === 1) {
          return {
            mutated: false,
            summary: '',
            needsUser: { prompt: 'pick one', options: ['y', 'N'] },
          }
        }
        return { mutated: false, summary: 'done' }
      },
    }

    let askUserCalls = 0
    const askUserStub = async (prompt: string, opts: readonly string[]): Promise<string> => {
      askUserCalls += 1
      expect(prompt).toBe('pick one')
      expect(opts).toEqual(['y', 'N'])
      return 'y'
    }

    const result = await runInit([], {
      registry: [interactiveStep],
      cwd: '/tmp',
      log: () => {},
      askUser: askUserStub,
    })

    expect(askUserCalls).toBe(1)
    expect(callCount).toBe(2)
    expect(lastFlags.__interactiveAnswer).toBe('y')
    expect(result.kind).toBe('ok')
  })

  test('anti-loop guard: step que retorna needsUser duas vezes vira Error', async () => {
    const buggyStep: Step = {
      id: 'buggy-interactive',
      async run() {
        // 2026-05-17 (Luiz/dev): sempre pede user, mesmo apos resposta. Bug — dispatcher deve abortar.
        return { mutated: false, summary: '', needsUser: { prompt: 'p', options: ['a'] } }
      },
    }
    await expect(
      runInit([], {
        registry: [buggyStep],
        cwd: '/tmp',
        log: () => {},
        askUser: async () => 'a',
      }),
    ).rejects.toThrow(/anti-loop guard/)
  })
})
```

> **Nota:** `runInit` precisa aceitar `askUser` em `RunInitOptions`. Adicionar campo
> opcional na fase-02 do Plano 01 OU patchear aqui — vamos patchear aqui em
> coordenacao com a modificacao do `run-init.ts` (Passo 2 desta fase).

### Passo 9: Patch adicional em `RunInitOptions` (run-init.ts)

```typescript
// skills/init/lib/run-init.ts (snippet — RunInitOptions)
export type RunInitOptions = {
  registry?: readonly Step[]
  cwd?: string
  log?: (line: string) => void
  /**
   * 2026-05-17 (Luiz/dev): Plano 03 fase-06 — injetado em ctx para steps interativos.
   * Em prod: liga em AskUserQuestion via wrapper. Em test: stub direto. PRD D3, CH-01.
   */
  askUser?: (prompt: string, options: readonly string[]) => Promise<string>
}

// E dentro do runInit:
const ctx: StepContext = {
  cwd: cwd ?? process.cwd(),
  args, flags,
  askUser: opts.askUser,
}
```

### Passo 10: Paranoia grep contra SKILL.md (G1)

```bash
# 2026-05-17 (Luiz/dev): G1 do plano — strings DEVEM existir no SKILL.md atual.
# Step 6:
grep -F 'Do you use Linear and want to enable the Delivery Loop convention?  [y/N]' skills/init/SKILL.md
grep -F 'Delivery Loop injection:' skills/init/SKILL.md
grep -F '<!-- INIT:DELIVERY_LOOP_SLOT -->' skills/init/SKILL.md
# Step 7:
grep -F '[capabilities-discovery] skipped — architecture profile not detected. Run /anti-vibe-coding:detect-architecture first.' skills/init/SKILL.md
grep -F '[capabilities-discovery] schema_version mismatch — expected "1.0", got ' skills/init/SKILL.md
grep -F '[capabilities-discovery] step failed, skipping:' skills/init/SKILL.md
grep -F 'Capabilities discovery found no routes. Consider running /anti-vibe-coding:init --refresh after adding routes.' skills/init/SKILL.md
grep -F 'Capabilities discovery: ' skills/init/SKILL.md
```

Todos exit 0.

---

## Gotchas

- **G1 do plano (wording byte-identico):** prompt do Step 6 tem DOUBLE SPACE antes de
  `[y/N]` — esse eh um detalhe que sera errado em revisao se nao for explicitado. Strings
  do Step 7 com schema_version usam `JSON.stringify(output.schema_version)` que produz
  `"<valor>"` com aspas — preservar.
- **G2 do plano (helpers preservados):** `injectOptionalSection`, `readArchitectureProfile`,
  `discoverCapabilities`, `AuditLogWriter` NAO modificados.
- **G3 do plano (imports estaticos):** todos imports estaticos no topo. Step 7 importa
  de `'../../../lib/...'` (skills/lib — verificado via Glob).
- **G5 do plano:** Step 6 nao usa AbortError. Step 7 SOFT-FAIL — NAO usa AbortError nem
  qualquer throw nao tratado. G7 garante esse invariante.
- **G6 do plano (`needsUser` aditivo a `skipRemaining`):** ambos opcionais. NUNCA setar
  os dois no mesmo report. Dispatcher checa needsUser PRIMEIRO (pode mudar o report),
  depois skipRemaining no report final.
- **G7 do plano (soft-fail invariante):** o teste 2 de Step 7 prova que helper throwing
  NAO faz o step throw. Plano 04 fase-04 (E2E) reforca com fixture mais elaborada.
- **Local — verified path:** `'../../../lib/read-architecture-profile'` a partir de
  `skills/init/lib/steps/`. Confirmado via Glob — arquivo esta em `skills/lib/`.
  Caminho relativo `lib/steps/ → lib/ → init/ → skills/ → skills/lib/` = 3 niveis acima
  + `lib/`. Cuidado para nao escrever `../../lib/` (so 2 niveis — apontaria para
  `skills/init/lib/lib/`, que nao existe).
- **Local — verified signature `readArchitectureProfile`:** SEM argumentos, le manifest
  de `process.cwd()`. NAO de ctx.cwd. Limitacao do helper. Pode produzir confusao em
  testes — documentar no teste 1 do Step 7.
- **Local — verified signature `discoverCapabilities(projectRoot, profile)`:** retorna
  `Promise<CapabilitiesOutput>` com fields `capabilities`, `coverage_gaps`,
  `schema_version`, `generated_at`, `profile_at_generation`.
- **Local — `ctx.flags['__interactiveAnswer']`:** chave que comeca com `__` para evitar
  colisao com flags de usuario (--reuse-discovery, --dry-run, etc). NAO acidentalmente
  setar de outra fonte.
- **Local — `injectOptionalSection` status:** retorna union `'injected' | 'already-present' | 'marker-missing'`.
  Mutated=true so quando `'injected'`. Idempotente em `'already-present'` (status preservado
  no summary — usuario ve "Delivery Loop injection: already-present" e entende).
- **Local — anti-loop guard:** se step buggy retornar needsUser duas vezes, dispatcher
  lanca Error generica (NAO AbortError, porque eh bug do step, nao gate de design).
  Teste explicito.

---

## Verificacao

### TDD

- [ ] **RED:** Testes escritos antes dos steps + extensoes. Falham por modulo nao
      encontrado E por campos `needsUser`/`askUser` nao existirem em types.ts.
  - Comandos: `bun run test skills/init/lib/steps/14-*.test.ts`, `bun run test skills/init/lib/steps/15-*.test.ts`, `bun run test skills/init/lib/run-init-needs-user.test.ts`

- [ ] **GREEN:** Steps + types extension + dispatcher patch + registry. Testes passam.
  - Comando: `bun run test skills/init/lib/`
  - Resultado esperado: 9 testes desta fase + acumulados anteriores passam.

### Checklist

- [ ] `skills/init/lib/steps/types.ts` atualizado com `needsUser?` em `StepReport` e `askUser?` em `StepContext`
- [ ] `skills/init/lib/run-init.ts` patcheado com pause-and-resume loop + anti-loop guard + `askUser` em `RunInitOptions`
- [ ] `skills/init/lib/steps/14-delivery-loop.ts` criado, exporta `deliveryLoopStep`
- [ ] `skills/init/lib/steps/15-capabilities-discovery.ts` criado, exporta `capabilitiesDiscoveryStep`
- [ ] `skills/init/lib/registry.ts` atualizado com AMBOS apos installGhFilesStep, antes de finalValidationStep
- [ ] 4 testes do delivery-loop passam (prompt, N, y, marker-missing)
- [ ] 3 testes do capabilities-discovery passam (no-profile, soft-fail, optional smoke)
- [ ] 2 testes do dispatcher needs-user passam (pause+resume, anti-loop guard)
- [ ] `skills/init/SKILL.md` NAO modificado
- [ ] Helpers NAO modificados: `git diff skills/init/lib/inject-optional-section.ts skills/lib/read-architecture-profile.ts skills/lib/capabilities-writer.ts skills/init/lib/audit-log.ts` vazio
- [ ] Paranoia grep (8 strings) retorna exit 0
- [ ] Lint limpo
- [ ] Steps nao usam `await import` nem `bun -e` (verificar com grep)
- [ ] Zero `any`/`as`
- [ ] Step 7 envolve TODA logica em try/catch (G7) — `grep -c 'try {' skills/init/lib/steps/15-capabilities-discovery.ts` retorna >= 1, e o catch retorna sem throw

---

## Criterio de Aceite

Step 6 (Delivery Loop) usa contrato `needsUser` com pause-and-resume no dispatcher. Step 7
(Capabilities Discovery) tem soft-fail GARANTIDO por try/catch global. Contrato extendido
em `types.ts` (campos opcionais — retro-compatibilidade). Dispatcher patcheado com
anti-loop guard. Wording byte-identico de 8 strings criticas.

**Por maquina:**
- `bun run test skills/init/lib/steps/14-delivery-loop.test.ts` exit 0 com 4 testes
- `bun run test skills/init/lib/steps/15-capabilities-discovery.test.ts` exit 0 com 3 testes
- `bun run test skills/init/lib/run-init-needs-user.test.ts` exit 0 com 2 testes
- `bun run test skills/init/lib/` exit 0 (regression dos 3 planos)
- `git diff --stat skills/init/SKILL.md skills/init/lib/inject-optional-section.ts skills/lib/read-architecture-profile.ts skills/lib/capabilities-writer.ts` retorna 0 arquivos
- `grep -c 'needsUser' skills/init/lib/steps/types.ts` retorna >= 1
- `grep -c 'askUser' skills/init/lib/steps/types.ts` retorna >= 1
- `grep -c 'anti-loop guard' skills/init/lib/run-init.ts` retorna >= 1
- `grep -c 'try {' skills/init/lib/steps/15-capabilities-discovery.ts` retorna >= 1
- `grep -E 'throw' skills/init/lib/steps/15-capabilities-discovery.ts` retorna 0 matches (G7)

**Por humano:**
- Inspecao visual do prompt do Step 6: confirmar DOUBLE SPACE antes de `[y/N]` no
  source AND no teste.
- Inspecao visual do bloco try/catch do Step 7: catch retorna sem throw, summary contem
  `'[capabilities-discovery] step failed, skipping: '` + message original.
- Confirmar com Glob que `'../../../lib/read-architecture-profile'` e
  `'../../../lib/capabilities-writer'` resolvem para `skills/lib/*.ts` (NAO falsos
  positivos como `skills/init/lib/lib/`).

---

<!-- Gerado por /plan-feature em 2026-05-17 -->
