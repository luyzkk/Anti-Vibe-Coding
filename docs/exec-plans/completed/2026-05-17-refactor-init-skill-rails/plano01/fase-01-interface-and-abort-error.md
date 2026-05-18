<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-17 (Luiz/dev): codigo de saida 1 — alinhado com PRD D4`
NÃO aplicar em código de runtime do plugin (helpers TS já têm JSDoc, suficiente).
-->

# Fase 01: Interface `Step` + `AbortError`

**Plano:** 01 — Foundation + Tracer Bullet
**Sizing:** 1h
**Depende de:** Nenhuma (primeira fase)
**Visual:** false

---

## O que esta fase entrega

Tipos canonicos (`Step`, `StepReport`, `StepContext`) e a classe `AbortError` que sustentam toda a
arquitetura Rails-style do `/init`. Sem implementacoes — apenas contrato.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/types.ts` | Create | Tipos `Step`, `StepReport`, `StepContext`, `StepResult` |
| `skills/init/lib/steps/abort-error.ts` | Create | Classe `AbortError` com `code` e `reason` |
| `skills/init/lib/steps/types.test.ts` | Create | Testes de tipos (TS compila + assertions de shape) |
| `skills/init/lib/steps/abort-error.test.ts` | Create | Testes da classe (instanceof, propriedades) |

---

## Implementacao

### Passo 1: Criar `types.ts`

Definir o contrato `Step` em `skills/init/lib/steps/types.ts` (PRD D2 — NAO em `lib/types.ts`).
Decisao explicita: `StepContext` carrega o que TODO step precisa (cwd, args parseados, flags),
nada alem disso. Steps especificos podem ampliar via parametro proprio se necessario.

```typescript
// skills/init/lib/steps/types.ts

/**
 * Contexto compartilhado entregue a todo step pelo dispatcher.
 * Mantido minimo de propria — steps que precisam de mais consomem helpers diretos.
 */
export type StepContext = {
  /** Diretorio do projeto-alvo. Equivalente a process.cwd() ao tempo do dispatcher. */
  cwd: string
  /** Args brutos passados ao dispatcher (apos parse). Inclui flags como '--dry-run'. */
  args: readonly string[]
  /** Flags parseadas em formato declarativo. Dispatcher decide o shape final. */
  flags: Readonly<Record<string, boolean | string>>
}

/**
 * Resultado de um step executado com sucesso (sem abort).
 * `mutated`: true se o step escreveu/alterou disco. Steps read-only retornam false.
 * `summary`: string curta para o log do dispatcher (uma linha).
 */
export type StepReport = {
  mutated: boolean
  summary: string
}

/**
 * Contrato canonico de um step. Toda celula de execucao do /init implementa isto.
 * `id`: identificador estavel (usado em manifest/registry e em logs).
 * `run`: funcao async que recebe o contexto e retorna um report. Pode lancar AbortError.
 */
export type Step = {
  readonly id: string
  run(ctx: StepContext): Promise<StepReport>
}

/**
 * Tipo auxiliar para teste/mock: resultado de uma execucao do dispatcher,
 * exposto para os Planos 02/03 escreverem suas proprias suites.
 */
export type StepResult =
  | { kind: 'ok'; report: StepReport }
  | { kind: 'aborted'; code: number; reason: string }
```

### Passo 2: Criar `abort-error.ts`

PRD D4: gates sinalizam parada via `throw new AbortError({ code, reason })`. Dispatcher captura,
escreve `reason` no stdout (preservando wording de scripts) e sai com `code`.

```typescript
// skills/init/lib/steps/abort-error.ts

export type AbortPayload = {
  /** Codigo de saida que o dispatcher devolvera ao processo. 1=needs-migration, 2=conflict. */
  code: number
  /** Mensagem ja formatada para stdout. Wording byte-identico ao bloco inline original (PRD R1). */
  reason: string
}

/**
 * Sinaliza parada controlada do dispatcher.
 * Use em gates (validacoes que precisam interromper) em vez de process.exit() — PRD D4.
 *
 * @example
 * throw new AbortError({ code: 1, reason: 'Detected v5.x artifacts: planning-dir' })
 */
export class AbortError extends Error {
  readonly code: number
  readonly reason: string

  constructor(payload: AbortPayload) {
    super(payload.reason)
    this.name = 'AbortError'
    this.code = payload.code
    this.reason = payload.reason
    // Preserva stack em runtimes V8.
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, AbortError)
    }
  }
}
```

### Passo 3: Testes de tipo (`types.test.ts`)

Os tipos por si nao tem comportamento — o teste valida que (a) eles compilam e (b) implementacoes
satisfazem a forma esperada. Use um mock minimo de `Step`.

```typescript
// skills/init/lib/steps/types.test.ts
import { describe, test, expect } from 'bun:test'
import type { Step, StepContext, StepReport } from './types'

describe('Step contract', () => {
  test('accepts a minimal implementation', async () => {
    // 2026-05-17 (Luiz/dev): mock minimo — fixa o shape esperado por Planos 02/03.
    const noop: Step = {
      id: 'test-noop',
      async run(_ctx: StepContext): Promise<StepReport> {
        return { mutated: false, summary: 'noop' }
      },
    }
    const result = await noop.run({ cwd: '/tmp', args: [], flags: {} })
    expect(result).toEqual({ mutated: false, summary: 'noop' })
  })

  test('id is a stable string identifier', () => {
    const s: Step = { id: 'detect-legacy', run: async () => ({ mutated: false, summary: '' }) }
    expect(typeof s.id).toBe('string')
    expect(s.id.length).toBeGreaterThan(0)
  })
})
```

### Passo 4: Testes da `AbortError` (`abort-error.test.ts`)

```typescript
// skills/init/lib/steps/abort-error.test.ts
import { describe, test, expect } from 'bun:test'
import { AbortError } from './abort-error'

describe('AbortError', () => {
  test('carries code and reason', () => {
    const err = new AbortError({ code: 1, reason: 'needs migration' })
    expect(err.code).toBe(1)
    expect(err.reason).toBe('needs migration')
    expect(err.message).toBe('needs migration')
  })

  test('is catchable as AbortError (instanceof)', () => {
    try {
      throw new AbortError({ code: 2, reason: 'conflict' })
    } catch (e) {
      expect(e).toBeInstanceOf(AbortError)
      expect(e).toBeInstanceOf(Error)
      if (e instanceof AbortError) {
        expect(e.code).toBe(2)
      }
    }
  })

  test('name is AbortError (for serialization/logging)', () => {
    const err = new AbortError({ code: 1, reason: 'x' })
    expect(err.name).toBe('AbortError')
  })
})
```

---

## Gotchas

- **G3 do plano (contrato Step estavel):** se o `StepContext` mudar depois desta fase, Planos 02 e
  03 precisam ser revisados. Decisao agora: campos minimos (`cwd`, `args`, `flags`). Steps que
  precisam de mais (ex: leitor de FS injetavel) recebem via parametro proprio na fase futura — NAO
  inflar `StepContext`.
- **Local — Path do tipo:** PRD D2 manda em `skills/init/lib/steps/types.ts`. Tentar consolidar em
  `lib/types.ts` quebra a convencao do Plano 04 (manifest importa de `./steps/types`).
- **Local — `Error.captureStackTrace`:** funcao V8-only. Bun suporta, mas o guard `typeof === 'function'`
  garante que nao explode em runtimes futuros que rodem o tipo. Sem regressao em ambiente atual.

---

## Verificacao

### TDD

- [ ] **RED:** Testes escritos antes de criar `types.ts`/`abort-error.ts` falham por modulo nao
      encontrado (esse eh um compilation error aceito SOMENTE nesta fase porque o teste eh sobre
      existencia da api).
  - Comando: `bun run test -- --grep 'Step contract'`
  - Resultado esperado: `Cannot find module './types'` (esperado antes de criar arquivos)

- [ ] **GREEN:** Tipos e classe implementados, testes passam.
  - Comando: `bun run test -- --grep 'Step contract'` e `bun run test -- --grep 'AbortError'`
  - Resultado esperado: `5 passed, 0 failed` (3 do AbortError + 2 do Step contract)

### Checklist

- [ ] Arquivo `skills/init/lib/steps/types.ts` existe e exporta `Step`, `StepReport`, `StepContext`, `StepResult`
- [ ] Arquivo `skills/init/lib/steps/abort-error.ts` existe e exporta `AbortError` + `AbortPayload`
- [ ] Testes de tipo passam: `bun run test skills/init/lib/steps/types.test.ts`
- [ ] Testes de AbortError passam: `bun run test skills/init/lib/steps/abort-error.test.ts`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck` (se configurado no projeto)
- [ ] Nenhum arquivo fora de `skills/init/lib/steps/` foi tocado

---

## Criterio de Aceite

Contrato `Step` exportado e testado. Implementacao trivial (`{ id, async run() {...} }`) compila
sem `any` ou `as`.

**Por maquina:**
- `bun run test skills/init/lib/steps/` retorna exit 0 com >= 5 testes passando
- `bun run lint skills/init/lib/steps/` retorna exit 0
- `grep -r 'any' skills/init/lib/steps/*.ts` retorna 0 matches (zero `any`)

---

<!-- Gerado por /plan-feature em 2026-05-17 -->
