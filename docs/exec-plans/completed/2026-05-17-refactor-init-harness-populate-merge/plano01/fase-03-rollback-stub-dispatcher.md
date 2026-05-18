<!--
Princípio universal #5 — Comment Provenance.
Helpers TS internos do plugin já usam JSDoc + 2026-05-18 (Luiz/dev) inline em
pontos não-obvios. Sem comentários robóticos.
-->

# Fase 03: Flag `--rollback` + stub do dispatcher (early-return)

**Plano:** 01 — Fundacao + Discovery do execute-plan
**Sizing:** 1h
**Depende de:** fase-02 (precisa de `lib/backup-anti-vibe.ts` para validar tipo de retorno do stub e suporte a `getLatestBackupDir`)
**Visual:** false

---

## O que esta fase entrega

Comando `/anti-vibe-coding:init --rollback` reconhecido pelo dispatcher. `runInit` detecta a flag ANTES de iterar registry, invoca `lib/rollback.ts` (stub que retorna `{ kind: 'aborted', reason: 'Rollback not yet implemented (Plano 05 fase-04)' }`) e retorna o `StepResult` correspondente. Dispatcher e registry permanecem imutaveis (D21). Plano 05 fase-04 substituira o corpo do stub pela implementacao real.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/parse-flags.ts` | Modify | (verificar — pode ja suportar `--rollback` via shape generico) — adicionar teste explicito |
| `skills/init/lib/parse-flags.test.ts` | Modify | Novo caso: `parseFlags(['--rollback']) === { args: [], flags: { rollback: true } }` |
| `skills/init/lib/run-init.ts` | Modify | Apos `parseFlags`, se `flags.rollback === true`, invocar `runRollback` e retornar early sem entrar no loop do registry |
| `skills/init/lib/rollback.ts` | Create | Stub que exporta `runRollback({ cwd, log, askUser })` retornando `{ kind: 'aborted', reason: 'Rollback not yet implemented (Plano 05 fase-04)' }` |
| `skills/init/lib/rollback.test.ts` | Create | 2 testes: stub retorna shape correto; tipo de retorno bate com `StepResult` |
| `skills/init/lib/run-init-rollback.test.ts` | Create | 3 testes integrando dispatcher + flag + stub |
| `docs/exec-plans/active/2026-05-17-refactor-init-harness-populate-merge/plano01/MEMORY.md` | Modify | Anotar resultado do plano + entrega final |

---

## Implementacao

### Passo 1: Atualizar `parse-flags` (se necessario)

Releitura do `parse-flags.ts` mostrou que o parser ja suporta `--rollback` como booleano via fallback generico. **Acao real:** apenas adicionar caso de teste explicito ao `parse-flags.test.ts` para travar comportamento.

```typescript
// skills/init/lib/parse-flags.test.ts (adicao)

test('parseFlags recognizes --rollback as boolean flag', () => {
  const result = parseFlags(['--rollback'])
  expect(result.args).toEqual([])
  expect(result.flags.rollback).toBe(true)
})

test('parseFlags --rollback coexists with other args', () => {
  const result = parseFlags(['--rollback', '--dry-run'])
  expect(result.flags.rollback).toBe(true)
  expect(result.flags['dry-run']).toBe(true)
})
```

### Passo 2: Criar `lib/rollback.ts` (stub) — RED then GREEN

```typescript
// skills/init/lib/rollback.ts
import type { StepResult } from './steps/types'

export type RunRollbackOptions = {
  readonly cwd: string
  readonly log?: (line: string) => void
  readonly askUser?: (prompt: string, options: readonly string[]) => Promise<string>
}

/**
 * 2026-05-18 (Luiz/dev): stub. Body completo eh entregue pelo Plano 05 fase-04
 * (le `.anti-vibe/backup/{latest}/manifest.json`, valida checksums, restaura,
 * registra ADR). Aqui apenas garantimos que o dispatcher detecta a flag e
 * invoca o helper sem quebrar contrato. PRD D24 (flag, nao skill separada),
 * D21 (dispatcher imutavel).
 */
export async function runRollback(opts: RunRollbackOptions): Promise<StepResult> {
  const log = opts.log ?? console.log
  log('[rollback] stub — real implementation lands in Plano 05 fase-04')
  return {
    kind: 'aborted',
    code: 1,
    reason: 'Rollback not yet implemented (Plano 05 fase-04)',
  }
}
```

Testes em `rollback.test.ts`:

```typescript
// skills/init/lib/rollback.test.ts

test('runRollback stub returns aborted with documented reason', async () => {
  const result = await runRollback({ cwd: '/tmp/x' })
  expect(result.kind).toBe('aborted')
  if (result.kind === 'aborted') {
    expect(result.code).toBe(1)
    expect(result.reason).toContain('Plano 05 fase-04')
  }
})

test('runRollback respects injected log sink', async () => {
  const lines: string[] = []
  await runRollback({ cwd: '/tmp/x', log: (l) => lines.push(l) })
  expect(lines.length).toBeGreaterThan(0)
  expect(lines[0]).toMatch(/rollback/)
})
```

### Passo 3: Modificar `run-init.ts` (early-return)

A modificacao e MINIMA e CIRURGICA. Apos o bloco que parseia `flags`, e ANTES do loop `for (const step of reg)`:

```typescript
// skills/init/lib/run-init.ts (insercao apos a construcao do ctx, antes do loop)

// 2026-05-18 (Luiz/dev): PRD D24 — `--rollback` eh flag do mesmo /init,
// detectada via early-return antes do registry. D21 — dispatcher imutavel:
// nenhum step novo adicionado, nenhum hook beforeStep.
if (ctx.flags.rollback === true) {
  const { runRollback } = await lazyImport(() => import('./rollback'))
  return runRollback({ cwd: ctx.cwd, log, askUser })
}

for (const step of reg) {
  // ... mantido como esta ...
}
```

**Cuidados:**
- Usar `lazyImport` (DI-06 / R-04 Windows safety) ja existente no arquivo — nao trocar para `import` estatico.
- Passar `cwd` resolvido (ja em `ctx.cwd`), `log` do opts e `askUser` do opts. NAO passar `ctx.flags` (rollback recebera flags relevantes via Plano 05 quando necessario, mas o stub nao precisa).
- A flag e lida de `ctx.flags.rollback` (string `'rollback'` no map). NAO confiar em `ctx.args` para detectar — `parseFlags` ja separa flags de args.

### Passo 4: Testes integrados em `run-init-rollback.test.ts`

```typescript
// skills/init/lib/run-init-rollback.test.ts

test('runInit with --rollback flag invokes rollback stub and does not iterate registry', async () => {
  let registryWasIterated = false
  const fakeStep = {
    id: 'fake-step',
    async run() {
      registryWasIterated = true
      return { mutated: false, summary: 'should not run' }
    },
  }
  const result = await runInit(['--rollback'], { registry: [fakeStep] })
  expect(registryWasIterated).toBe(false)
  expect(result.kind).toBe('aborted')
})

test('runInit without --rollback flag iterates registry normally', async () => {
  let registryWasIterated = false
  const fakeStep = {
    id: 'fake-step',
    async run() {
      registryWasIterated = true
      return { mutated: false, summary: 'ran' }
    },
  }
  const result = await runInit([], { registry: [fakeStep] })
  expect(registryWasIterated).toBe(true)
  expect(result.kind).toBe('ok')
})

test('runInit with --rollback propagates reason from stub', async () => {
  const result = await runInit(['--rollback'], { registry: [] })
  expect(result.kind).toBe('aborted')
  if (result.kind === 'aborted') {
    expect(result.reason).toContain('Plano 05 fase-04')
  }
})
```

---

## Snippets de referencia

### Shape final do early-return em `run-init.ts`

```typescript
export async function runInit(
  argv: readonly string[],
  opts: RunInitOptions = {},
): Promise<StepResult> {
  const { registry: injectedRegistry, cwd, log = console.log, askUser } = opts
  const reg = injectedRegistry ?? (await lazyImport(() => import('./registry'))).registry

  const ctx: StepContext = (() => {
    const { args, flags } = parseFlags(argv)
    const base: StepContext = { cwd: cwd ?? process.cwd(), args, flags }
    return askUser !== undefined ? { ...base, askUser } : base
  })()

  // 2026-05-18 (Luiz/dev): D24 — `--rollback` early-return ANTES do registry.
  if (ctx.flags.rollback === true) {
    const { runRollback } = await lazyImport(() => import('./rollback'))
    return runRollback({ cwd: ctx.cwd, log, askUser })
  }

  for (const step of reg) {
    // ... bloco original intocado ...
  }

  return { kind: 'ok', report: { mutated: false, summary: 'all steps completed' } }
}
```

---

## Gotchas

- **G1 do plano (D21 dispatcher imutavel):** A insercao do early-return ainda preserva a assinatura publica de `runInit(argv, opts)`. Nenhum step novo no registry. Plano 05 fase-04 substitui o corpo do stub, NAO toca em `run-init.ts` novamente.
- **G2 do plano (D24 flag, nao skill separada):** Manifest do plugin (skills/init/...) nao recebe nenhum item novo para "init-rollback". Eh literalmente o mesmo comando com flag.
- **Local — `process.exit()` proibido:** O comentario inicial de `run-init.ts` diz "Nao chama process.exit() — devolve `StepResult`". O stub respeita: retorna `{ kind: 'aborted', code, reason }`.
- **Local — uso de `lazyImport`:** Manter alinhamento com o resto do arquivo. Importar `rollback` estaticamente quebraria o padrao DI-06 e poderia complicar testes futuros (Plano 05 fase-04 pode querer mockar `lib/rollback.ts`).
- **Local — `ctx.flags.rollback` eh `boolean | string`:** O comparador deve ser `=== true` (nao truthy check). Se alguem rodar `--rollback=manifesto.json` no futuro, o early-return NAO dispara — comportamento explicito a documentar quando Plano 05 fase-04 precisar de variantes.
- **Local — registry NAO importado quando `--rollback`:** O `lazyImport` original do registry esta na linha `const reg = injectedRegistry ?? (await lazyImport(...)).registry`. Como esse load ocorre ANTES do `if (ctx.flags.rollback === true)`, o registry e carregado mesmo em modo rollback. **Sugestao:** mover o `lazyImport` do registry para DEPOIS do early-return — economiza tokens em rollback. Decisao do executor: pode adiar para Plano 05 fase-04 (otimizacao YAGNI agora). Documentar em MEMORY.md se reordenar.

---

## Verificacao

### TDD

- [ ] **RED:** Criar `rollback.test.ts` + `run-init-rollback.test.ts` ANTES da implementacao. Rodar `bun test skills/init/lib/rollback.test.ts skills/init/lib/run-init-rollback.test.ts` — falha por "Cannot find module" ou assertion error (depende da ordem de criacao).
- [ ] **GREEN:** Criar stub minimo + early-return. Rodar testes — todos 5 (2 do rollback + 3 do run-init-rollback) devem passar.
  - Comando: `bun test skills/init/lib/rollback.test.ts skills/init/lib/run-init-rollback.test.ts skills/init/lib/parse-flags.test.ts`
  - Resultado esperado: `>=5 passed, 0 failed` (5 novos + os existentes de parse-flags).
- [ ] **REFACTOR:** Apenas se ficar feio. Stub e curto demais para precisar.

### Checklist

- [ ] `lib/parse-flags.test.ts` tem caso explicito para `--rollback` (2 novos testes).
- [ ] `lib/rollback.ts` exporta `runRollback` + `RunRollbackOptions`.
- [ ] Stub `runRollback` retorna `{ kind: 'aborted', code: 1, reason: 'Rollback not yet implemented (Plano 05 fase-04)' }`.
- [ ] `run-init.ts` tem early-return logo apos construcao de `ctx`, antes do loop.
- [ ] Early-return usa `lazyImport` (consistente com restante do arquivo).
- [ ] Registry NAO foi modificado (verificar `git diff skills/init/lib/registry.ts` vazio).
- [ ] Teste integrado prova que step do registry NAO eh executado quando `--rollback` esta presente (uso de `fakeStep` com flag boolean).
- [ ] `bun run lint` clean em todos os 5 arquivos tocados.
- [ ] `MEMORY.md` do plano01 atualizado em "Notas para Planos Seguintes" listando:
  - Assinatura final de `runRollback`
  - Confirmacao de que registry esta imutavel
  - Eventual decisao de DI sobre reordenacao do `lazyImport` do registry (GT-N)

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/rollback.test.ts` retorna `2 passed, 0 failed`.
- `bun test skills/init/lib/run-init-rollback.test.ts` retorna `3 passed, 0 failed`.
- `bun test skills/init/lib/parse-flags.test.ts` continua verde com os 2 novos casos.
- `git diff skills/init/lib/registry.ts` esta vazio (zero mudancas no registry).

**Por humano:**
- Reviewer consegue rodar `bun -e "import('./skills/init/lib/run-init.ts').then(m => m.runInit(['--rollback']).then(r => console.log(r)))"` em um repo de teste e ve o aborted reason logado.

---

## Decisoes Aplicadas

- **D21 do PRD** (dispatcher imutavel): assinatura de `runInit` preservada. Apenas insercao de bloco condicional dentro do corpo.
- **D24 do PRD** (rollback como flag, nao skill): `parse-flags` ja suporta; uma flag = um comportamento alternativo do mesmo `/init`.
- **SH-12 do PRD** (manifest backup com checksums): preparacao indireta — Plano 05 fase-04 vai consumir `getLatestBackupDir` + `readBackupManifest` do helper criado na fase-02.

---

<!-- Gerado por /plan-feature em 2026-05-18 -->
