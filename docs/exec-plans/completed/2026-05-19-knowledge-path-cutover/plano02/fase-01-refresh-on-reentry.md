<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante esta fase deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou seção do PRD).
-->

# Fase 01: Refresh on Reentry

**Plano:** 02 — Reentrada, Migracao V5 e Validator Pos-Init
**Sizing:** ~1.5h
**Depende de:** Plano 01 completo (path `knowledge/` estabelecido, copy-knowledge.ts ja aponta para o novo path)
**Visual:** false

---

## O que esta fase entrega

Quando `/init` roda em modo re-populate (`__reentryMode === 're-populate'`) e `.claude/knowledge/` ja existe no projeto alvo, os atoms sao sobrescritos com o conteudo atual da matrix do plugin — eliminando drift entre versoes.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/copy-knowledge.ts` | Modify | Logica ja existe (branch `destExists && !refresh` → status skipped); apenas o caller passava sempre `refresh=false`. Nenhuma mudanca de logica necessaria aqui apos Plano 01. |
| `skills/init/lib/steps/03_1-persist-stack-and-knowledge.ts` | Modify | Adicionar derivacao de `refresh` a partir de `ctx.flags['__reentryMode']` e propagar para `runStackKnowledgeInit` |
| `skills/init/lib/run-stack-knowledge-init.ts` | Modify | Adicionar campo `refresh?: boolean` em `RunStackKnowledgeInitOpts` e propagar para `copyKnowledge()` |
| `skills/init/lib/steps/03_1-persist-stack-and-knowledge.test.ts` | Modify | Adicionar testes para os cenarios CA-06 e CA-07 |

---

## Implementacao

### Passo 1: Verificar assinatura de `RunStackKnowledgeInitOpts`

Antes de qualquer mudanca, ler `skills/init/lib/run-stack-knowledge-init.ts` para confirmar:
- Se `RunStackKnowledgeInitOpts` ja tem campo `refresh?: boolean`
- Como `copyKnowledge` e chamada internamente (para saber onde injetar o campo)

Se `refresh` ja existir, apenas o caller `03_1` precisa ser alterado. Se nao existir, adicionar em `RunStackKnowledgeInitOpts` e propagar.

### Passo 2: Escrever testes (TDD RED)

Em `skills/init/lib/steps/03_1-persist-stack-and-knowledge.test.ts`, adicionar:

```typescript
// 2026-05-20 (Luiz/dev): D5.B.2 do PRD knowledge-path-cutover — refresh automatico em re-populate
describe('persistStackKnowledgeStep refresh behavior', () => {
  test('passes refresh=true to runner when __reentryMode is re-populate', async () => {
    let capturedOpts: RunStackKnowledgeInitOpts | undefined
    const mockRunner: StackKnowledgeRunner = async (opts) => {
      capturedOpts = opts
      return { status: 'refreshed', atomCount: 3, message: 'refreshed', destDir: '/tmp/.claude/knowledge' }
    }

    await runPersistStackKnowledgeStep(
      {
        cwd: '/tmp/project',
        args: [],
        flags: { '__reentryMode': 're-populate' },
      },
      mockRunner,
      '/tmp/plugin',
    )

    expect(capturedOpts?.refresh).toBe(true)
  })

  test('passes refresh=false to runner when __reentryMode is NOT re-populate (greenfield)', async () => {
    let capturedOpts: RunStackKnowledgeInitOpts | undefined
    const mockRunner: StackKnowledgeRunner = async (opts) => {
      capturedOpts = opts
      return { status: 'copied', atomCount: 3, message: 'copied', destDir: '/tmp/.claude/knowledge' }
    }

    await runPersistStackKnowledgeStep(
      {
        cwd: '/tmp/project',
        args: [],
        flags: {},
      },
      mockRunner,
      '/tmp/plugin',
    )

    expect(capturedOpts?.refresh).toBe(false)
  })

  test('passes refresh=false when __reentryMode is greenfield (explicit)', async () => {
    let capturedOpts: RunStackKnowledgeInitOpts | undefined
    const mockRunner: StackKnowledgeRunner = async (opts) => {
      capturedOpts = opts
      return { status: 'copied', atomCount: 3, message: 'copied', destDir: '/tmp/.claude/knowledge' }
    }

    await runPersistStackKnowledgeStep(
      {
        cwd: '/tmp/project',
        args: [],
        flags: { '__reentryMode': 'greenfield' },
      },
      mockRunner,
      '/tmp/plugin',
    )

    expect(capturedOpts?.refresh).toBe(false)
  })
})
```

Rodar `bun run test -- --grep "passes refresh"` — deve falhar com "capturedOpts?.refresh is undefined" (assertion failure, nao compilation error).

### Passo 3: Implementar — adicionar `refresh` em `RunStackKnowledgeInitOpts`

Em `skills/init/lib/run-stack-knowledge-init.ts`, adicionar o campo na interface (se ausente):

```typescript
export interface RunStackKnowledgeInitOpts {
  targetDir: string
  pluginRoot: string
  args: string
  // 2026-05-20 (Luiz/dev): D5.B.2 do PRD knowledge-path-cutover — refresh automatico em re-populate.
  // Quando true, copyKnowledge sobrescreve .claude/knowledge/ existente (elimina drift).
  // Greenfield omite — default false (CA-07).
  refresh?: boolean
}
```

Propagar para a chamada interna de `copyKnowledge()`:

```typescript
// Dentro de runStackKnowledgeInit, na chamada a copyKnowledge:
const result = await copyKnowledge({
  targetDir,
  pluginRoot,
  primary,
  refresh: opts.refresh ?? false,  // 2026-05-20 (Luiz/dev): D5.B.2 — propaga refresh do caller
})
```

### Passo 4: Implementar — derivar `refresh` em `03_1`

Em `skills/init/lib/steps/03_1-persist-stack-and-knowledge.ts`, alterar `runPersistStackKnowledgeStep`:

```typescript
// ANTES (atual):
export async function runPersistStackKnowledgeStep(
  ctx: { cwd: string; args: readonly string[] },
  runner: StackKnowledgeRunner = runStackKnowledgeInit,
  pluginRootOverride?: string,
): Promise<{ mutated: boolean; summary: string }> {
  const pluginRoot = pluginRootOverride ?? resolvePluginRoot(import.meta.dir)
  await runner({ targetDir: ctx.cwd, pluginRoot, args: ctx.args.join(' ') })
  return { mutated: true, summary: '' }
}
```

```typescript
// DEPOIS:
export async function runPersistStackKnowledgeStep(
  ctx: { cwd: string; args: readonly string[]; flags?: Record<string, unknown> },
  runner: StackKnowledgeRunner = runStackKnowledgeInit,
  pluginRootOverride?: string,
): Promise<{ mutated: boolean; summary: string }> {
  const pluginRoot = pluginRootOverride ?? resolvePluginRoot(import.meta.dir)
  // 2026-05-20 (Luiz/dev): D5.B.2 do PRD knowledge-path-cutover — refresh quando re-populate.
  // Greenfield (flags ausente ou __reentryMode !== 're-populate') usa false (CA-07).
  // --refresh-knowledge CLI continua ortogonal (parseRefreshFlag em run-stack-knowledge-init).
  const refresh = ctx.flags?.['__reentryMode'] === 're-populate'
  await runner({ targetDir: ctx.cwd, pluginRoot, args: ctx.args.join(' '), refresh })
  return { mutated: true, summary: '' }
}
```

Nota: o Step wrapper `persistStackKnowledgeStep` ja tem acesso a `ctx.flags` via o `StepContext` tipado — verificar se a assinatura de `runPersistStackKnowledgeStep` precisa aceitar o `ctx` completo ou apenas o subconjunto. O step chama `runPersistStackKnowledgeStep(ctx)` — se `ctx` ja inclui `flags`, a mudanca de tipo e apenas aditiva.

### Passo 5: Verificar CA-07 (greenfield nao entra em refresh)

Confirmar que `copy-knowledge.ts:83-91` permanece intocada pelo Plano 02 fase-01. O branch de skip-if-destExists-and-no-refresh ainda funciona corretamente para greenfield:

```typescript
// copy-knowledge.ts (linhas 83-91 — SEM MUDANCA nesta fase):
const destExists = await fs.access(destDir).then(() => true).catch(() => false)

if (destExists && !refresh) {
  // 2026-05-16 (Luiz/dev): CA-04 — preserve + inform. Mensagem textual exata do PRD §Edge Cases.
  return {
    status: 'skipped',
    atomCount: 0,
    message: 'Knowledge já existe em .claude/knowledge/. Use --refresh-knowledge para re-copiar.',
    destDir,
  }
}
```

Em greenfield: `destExists === false` → nao entra no branch de skip nem no de refresh. Em re-populate sem `.claude/knowledge/` preexistente: `destExists === false` → copia normalmente. Em re-populate com `.claude/knowledge/` preexistente: `destExists === true` E `refresh === true` → entra no branch de rm+mkdir+copyTree (linhas 96-100).

---

## Gotchas

- **G1 do plano (cadeia de propagacao):** A cadeia e `03_1` → `runStackKnowledgeInit` → `copyKnowledge`. Se `RunStackKnowledgeInitOpts` nao tiver `refresh`, adicionar antes de tentar compilar o teste. Erro de TypeScript em `runner({ ..., refresh })` sera o primeiro sinal.

- **G2 do plano (dry-run guard):** O guard em `03_1:34` e `if (ctx.flags['dry-run'] === true) return ...`. Este guard retorna ANTES de derivar `refresh` — correto. Nao ha colisao. Mas se o executor mover o guard para depois da derivacao de `refresh`, quebraria CA-07 em dry-run. Manter o guard ANTES.

- **Local — tipo de `ctx` em `runPersistStackKnowledgeStep`:** A assinatura atual usa `ctx: { cwd: string; args: readonly string[] }` — sem `flags`. O step chama `runPersistStackKnowledgeStep(ctx)` onde `ctx` e o `StepContext` completo (que inclui `flags`). TypeScript vai aceitar pois `ctx` e um supertipo do parametro esperado. Ao adicionar `flags?` na assinatura, o campo passa a ser tipado corretamente. Alternativa mais simples: trocar o tipo do parametro para `Pick<StepContext, 'cwd' | 'args' | 'flags'>`.

- **Local — `--refresh-knowledge` CLI ortogonal:** `parseRefreshFlag` em `run-stack-knowledge-init.ts` le `args` para detectar `--refresh-knowledge`. A nova logica de `refresh` deriva de `flags['__reentryMode']`. Os dois caminhos sao OR (qualquer um que seja true causa refresh). Verificar que `run-stack-knowledge-init.ts` nao clobbers o `opts.refresh` com o valor de `parseRefreshFlag` sem considerar o OR.

---

## Verificacao

### TDD

- [ ] **RED:** Testes escritos e FALHAM por assertion
  - Comando: `bun run test -- --grep "passes refresh"`
  - Resultado esperado: `Expected true, received undefined` ou similar

- [ ] **GREEN:** Implementacao minima, testes PASSAM
  - Comando: `bun run test -- --grep "passes refresh"`
  - Resultado esperado: `3 passed, 0 failed`

### Checklist

- [ ] `runPersistStackKnowledgeStep` deriva `refresh = ctx.flags?.['__reentryMode'] === 're-populate'`
- [ ] `RunStackKnowledgeInitOpts` tem campo `refresh?: boolean`
- [ ] `runStackKnowledgeInit` propaga `opts.refresh ?? false` para `copyKnowledge()`
- [ ] `runPersistStackKnowledgeStep` com `flags: {}` passa `refresh: false`
- [ ] `runPersistStackKnowledgeStep` com `flags: { '__reentryMode': 'greenfield' }` passa `refresh: false`
- [ ] `persistStackKnowledgeStep.run` com `ctx.flags['dry-run'] === true` retorna antes de derivar refresh
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun tsc --noEmit`

---

## Criterio de Aceite

**CA-06 (refresh em re-populate):**

**Por maquina:**
- Dado fixture com manifest `pluginVersion=6.5.0` e `.claude/knowledge/nodejs-typescript/INDEX.md` com conteudo desatualizado, quando `runPersistStackKnowledgeStep` e chamado com `ctx.flags['__reentryMode'] = 're-populate'`, entao o runner recebe `refresh: true`.
- `bun run test -- --grep "passes refresh=true to runner when __reentryMode is re-populate"` retorna `1 passed`.

**CA-07 (greenfield NAO faz refresh):**

**Por maquina:**
- `bun run test -- --grep "passes refresh=false to runner when __reentryMode is NOT re-populate"` retorna `1 passed`.
- `bun run test -- --grep "passes refresh=false when __reentryMode is greenfield"` retorna `1 passed`.

---

<!-- Gerado por /plan-feature em 2026-05-20 -->
