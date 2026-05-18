<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 02: Dispatcher Skeleton

**Plano:** 01 — Foundation + Tracer Bullet
**Sizing:** 1.5h
**Depende de:** fase-01
**Visual:** false

---

## O que esta fase entrega

Dispatcher rodavel (`skills/init/lib/run-init.ts`) que itera um registry de steps, captura
`AbortError` e propaga `code` ao processo. Sem steps reais ainda — o tracer chega na fase-03.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/run-init.ts` | Create | Dispatcher: parse args, itera registry, captura AbortError |
| `skills/init/lib/parse-flags.ts` | Create | Parser de flags simples (--dry-run, etc), sem dep externa |
| `skills/init/lib/registry.ts` | Create | Registry vazio (apenas o tipo `Registry` + array exportado) |
| `skills/init/lib/run-init.test.ts` | Create | Testes do dispatcher com steps fake (spy) |
| `skills/init/lib/parse-flags.test.ts` | Create | Testes do parser de flags |

---

## Implementacao

### Passo 1: Criar `parse-flags.ts`

Parser minimo. Sem dependencias externas (nada de `yargs`/`commander`). Trata apenas o que /init
precisa: flags booleanas tipo `--dry-run` e args posicionais.

```typescript
// skills/init/lib/parse-flags.ts

export type ParsedFlags = {
  args: readonly string[]
  flags: Readonly<Record<string, boolean | string>>
}

/**
 * Parser intencional-minimo. Reconhece:
 *   --flag         → flags.flag = true
 *   --flag=value   → flags.flag = 'value'
 *   tudo o resto   → args (posicional)
 *
 * Nao trata short-flags (-d), nao agrupa, nao normaliza camelCase. Se /init crescer alem disso,
 * trocar por uma lib — mas hoje YAGNI.
 */
export function parseFlags(argv: readonly string[]): ParsedFlags {
  const args: string[] = []
  const flags: Record<string, boolean | string> = {}

  for (const raw of argv) {
    if (raw.startsWith('--')) {
      const body = raw.slice(2)
      const eq = body.indexOf('=')
      if (eq >= 0) {
        flags[body.slice(0, eq)] = body.slice(eq + 1)
      } else {
        flags[body] = true
      }
    } else {
      args.push(raw)
    }
  }

  return { args, flags }
}
```

### Passo 2: Criar `registry.ts` (esqueleto vazio)

```typescript
// skills/init/lib/registry.ts
import type { Step } from './steps/types'

/**
 * Lista ORDENADA de steps que o dispatcher executa sequencialmente.
 * Cada plano (01/02/03) adiciona suas entradas. Manter a ordem deste array eh contratual:
 * altera = revisar SKILL.md (Plano 04 — cutover).
 */
export const registry: readonly Step[] = []
```

### Passo 3: Criar `run-init.ts` (dispatcher)

```typescript
// skills/init/lib/run-init.ts
import { AbortError } from './steps/abort-error'
import type { Step, StepResult } from './steps/types'
import { parseFlags } from './parse-flags'

export type RunInitOptions = {
  /** Permite injetar registry alternativo (tests). Default: registry global. */
  registry?: readonly Step[]
  /** Permite injetar cwd (tests). Default: process.cwd(). */
  cwd?: string
  /** Sink de log (tests podem capturar). Default: console.log. */
  log?: (line: string) => void
}

/**
 * Executa todos os steps em sequencia. Para no primeiro AbortError.
 * Nao chama process.exit() — devolve `StepResult` para o caller decidir.
 *
 * @example
 * const result = await runInit(Bun.argv.slice(2))
 * if (result.kind === 'aborted') process.exit(result.code)
 */
export async function runInit(
  argv: readonly string[],
  opts: RunInitOptions = {},
): Promise<StepResult> {
  const { registry: injectedRegistry, cwd, log = console.log } = opts
  // 2026-05-17 (Luiz/dev): import dinamico apenas se nao houver injecao — evita carregar
  // todos os steps em testes que so usam fake. Tambem isola o boundary DI-06 (fase-04 centraliza).
  const reg = injectedRegistry ?? (await import('./registry')).registry

  const ctx = (() => {
    const { args, flags } = parseFlags(argv)
    return { cwd: cwd ?? process.cwd(), args, flags }
  })()

  for (const step of reg) {
    try {
      const report = await step.run(ctx)
      log(`[${step.id}] ${report.summary}`)
      if (report.mutated) {
        // 2026-05-17 (Luiz/dev): log explicito de mutacao — alinhado com PRD SH-04 (rastreabilidade).
        log(`[${step.id}] (mutated disk)`)
      }
    } catch (e) {
      if (e instanceof AbortError) {
        log(e.reason)
        return { kind: 'aborted', code: e.code, reason: e.reason }
      }
      throw e
    }
  }

  return { kind: 'ok', report: { mutated: false, summary: 'all steps completed' } }
}
```

### Passo 4: Testes do dispatcher (`run-init.test.ts`)

Usa steps fake para validar comportamento sem depender de FS real.

```typescript
// skills/init/lib/run-init.test.ts
import { describe, test, expect } from 'bun:test'
import { runInit } from './run-init'
import { AbortError } from './steps/abort-error'
import type { Step } from './steps/types'

describe('runInit dispatcher', () => {
  test('executes all steps in order when none abort', async () => {
    const calls: string[] = []
    const stepA: Step = {
      id: 'a',
      async run() { calls.push('a'); return { mutated: false, summary: 'ok' } },
    }
    const stepB: Step = {
      id: 'b',
      async run() { calls.push('b'); return { mutated: false, summary: 'ok' } },
    }
    const result = await runInit([], { registry: [stepA, stepB], cwd: '/tmp', log: () => {} })
    expect(calls).toEqual(['a', 'b'])
    expect(result.kind).toBe('ok')
  })

  test('halts on AbortError and returns code + reason', async () => {
    const logs: string[] = []
    const stepA: Step = {
      id: 'a',
      async run() { throw new AbortError({ code: 7, reason: 'stop here' }) },
    }
    const stepB: Step = {
      id: 'b',
      async run() { throw new Error('should never run') },
    }
    const result = await runInit([], {
      registry: [stepA, stepB],
      cwd: '/tmp',
      log: (l) => logs.push(l),
    })
    expect(result).toEqual({ kind: 'aborted', code: 7, reason: 'stop here' })
    expect(logs).toContain('stop here')
  })

  test('parses flags into ctx', async () => {
    let captured: Readonly<Record<string, boolean | string>> | undefined
    const probe: Step = {
      id: 'probe',
      async run(ctx) { captured = ctx.flags; return { mutated: false, summary: '' } },
    }
    await runInit(['--dry-run', '--mode=fast'], { registry: [probe], cwd: '/tmp', log: () => {} })
    expect(captured).toEqual({ 'dry-run': true, mode: 'fast' })
  })

  test('re-throws non-AbortError (bug visibility)', async () => {
    const buggy: Step = { id: 'bug', async run() { throw new Error('boom') } }
    await expect(runInit([], { registry: [buggy], cwd: '/tmp', log: () => {} })).rejects.toThrow('boom')
  })
})
```

### Passo 5: Testes do parser (`parse-flags.test.ts`)

```typescript
// skills/init/lib/parse-flags.test.ts
import { describe, test, expect } from 'bun:test'
import { parseFlags } from './parse-flags'

describe('parseFlags', () => {
  test('separates flags from positional args', () => {
    const r = parseFlags(['migrate', '--dry-run', 'extra'])
    expect(r.args).toEqual(['migrate', 'extra'])
    expect(r.flags).toEqual({ 'dry-run': true })
  })

  test('handles --key=value', () => {
    const r = parseFlags(['--mode=fast'])
    expect(r.flags).toEqual({ mode: 'fast' })
  })

  test('returns empty for empty argv', () => {
    const r = parseFlags([])
    expect(r.args).toEqual([])
    expect(r.flags).toEqual({})
  })
})
```

---

## Gotchas

- **G2 do plano (DI-06/GT-04):** o dispatcher usa `await import('./registry')` para carregar o
  registry — esse eh exatamente o pattern Windows-safe que a fase-04 vai centralizar e documentar.
  Steps individuais nao precisam usar `await import` para nada — eles importam estaticamente
  porque ja estao DENTRO do boundary do dispatcher.
- **G3 do plano (contrato estavel):** os testes do dispatcher usam o `Step` da fase-01 SEM
  ampliacao. Se algum teste exigir extender `StepContext`, pause e revise — eh sinal de que o
  shape minimo nao basta e Planos 02/03 vao quebrar.
- **Local — `process.exit` proibido aqui:** o dispatcher NAO chama `process.exit()`. Quem chama
  eh o caller (futuro entrypoint do Plano 04). Isso permite testar o dispatcher sem precisar
  fork de processo.

---

## Verificacao

### TDD

- [ ] **RED:** Escrever testes primeiro, observar `Cannot find module './run-init'`.
  - Comando: `bun run test skills/init/lib/run-init.test.ts`
  - Resultado esperado: erro de modulo (esperado pre-implementacao)

- [ ] **GREEN:** Implementar `parse-flags.ts`, `registry.ts`, `run-init.ts`. Testes passam.
  - Comando: `bun run test skills/init/lib/`
  - Resultado esperado: `>= 7 passed, 0 failed`

### Checklist

- [ ] `skills/init/lib/parse-flags.ts` criado e exporta `parseFlags`, `ParsedFlags`
- [ ] `skills/init/lib/registry.ts` criado e exporta `registry: readonly Step[]` (vazio)
- [ ] `skills/init/lib/run-init.ts` criado e exporta `runInit`, `RunInitOptions`
- [ ] Dispatcher captura `AbortError` e retorna `{ kind: 'aborted', code, reason }`
- [ ] Dispatcher re-throw erros nao-Abort (bug nao silenciado)
- [ ] `bun run test skills/init/lib/` retorna >= 7 testes passando
- [ ] `bun run lint skills/init/lib/` limpo
- [ ] Zero uso de `any`/`as` (verificar com grep)

---

## Criterio de Aceite

Dispatcher rodavel ponta-a-ponta com steps fake. Captura `AbortError`, propaga `code`, parseia
flags. SEM nenhum step real registrado — fase-03 acrescenta o primeiro.

**Por maquina:**
- `bun run test skills/init/lib/run-init.test.ts` exit 0 com 4 testes passando
- `bun run test skills/init/lib/parse-flags.test.ts` exit 0 com 3 testes passando
- `grep -E '\bany\b|\bas\s' skills/init/lib/run-init.ts skills/init/lib/parse-flags.ts` retorna 0 matches

---

<!-- Gerado por /plan-feature em 2026-05-17 -->
