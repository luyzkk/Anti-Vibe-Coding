<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem
`// 2026-05-21 (Luiz/dev): ...`. Aplicado nos snippets abaixo.
-->

# Fase 01: Step 8 (`delivery-loop`) real — port + remocao dry-run

**Plano:** 05 — Steps 8-10 + harness-validate + E2E final
**Sizing:** 1h
**Depende de:** Nenhuma (primeira fase). Plano 01 fase-04 ja criou stub `deliveryLoopStep` em `steps/08-delivery-loop.ts`.
**Visual:** false

---

## O que esta fase entrega

`skills/init/lib/steps/08-delivery-loop.ts` REAL que porta a logica de `14-delivery-loop.ts` SEM o dry-run guard (D4). Mantem o contrato `needsUser` para pergunta interativa (PRD D3, CH-01). Cobertura unit: 1a invocacao retorna `needsUser`, 2a com 'y' injeta secao em `AGENTS.md`, 2a com 'N' ou outro valor nao injeta. CA-06 attested: `AGENTS.md` esta inalterado apos 1a invocacao.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/08-delivery-loop.ts` | Modify | Substituir stub (id-only) por logica real portada de `14-delivery-loop.ts` (sem dry-run guard). |
| `skills/init/lib/steps/08-delivery-loop.test.ts` | Create | Testes unit cobrindo CA-06: pergunta antes de mutar, 'y' injeta, 'N' no-op, marker-missing falha graceful. |
| `tests/fixtures/agents-md/with-marker.md` | Create (se nao existir) | Fixture `AGENTS.md` com `<!-- INIT:DELIVERY_LOOP_SLOT -->` para input dos testes. |
| `tests/fixtures/agents-md/without-marker.md` | Create (se nao existir) | Fixture sem marker — para teste de `marker-missing`. |
| `skills/init/lib/steps/14-delivery-loop.ts` | (NAO TOCAR nesta fase) | Sera deletado em fase-05 apos verde. Mantido para audit comparativo durante porting. |

---

## Implementacao

### Passo 1: Confirmar stub existente

```bash
# Verificar que Plano 01 fase-04 deixou o stub:
grep "deliveryLoopStep" skills/init/lib/steps/08-delivery-loop.ts
# Esperado: export const deliveryLoopStep: Step = { id: 'delivery-loop', async run() { return { mutated: false, summary: '' } } }
```

Se o stub nao existe, parar e voltar ao Plano 01 fase-04.

### Passo 2: Escrever teste RED (CA-06 + needsUser)

```typescript
// skills/init/lib/steps/08-delivery-loop.test.ts
// 2026-05-21 (Luiz/dev): Plano 05 fase-01 — CA-06 attestation + contrato needsUser (PRD D3/CH-01).

import { test, expect, describe, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { deliveryLoopStep } from './08-delivery-loop'

describe('Step 8: delivery-loop', () => {
  let cwd: string
  beforeEach(async () => {
    cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'avc-step08-'))
    // 2026-05-21 (Luiz/dev): fixture AGENTS.md com marker — simula scaffold do Step 5 real.
    await fs.writeFile(
      path.join(cwd, 'AGENTS.md'),
      '# Agents\n\n<!-- INIT:DELIVERY_LOOP_SLOT -->\n',
      'utf8',
    )
  })
  afterEach(async () => {
    await fs.rm(cwd, { recursive: true, force: true })
  })

  test('first invocation returns needsUser with byte-identical prompt (DOUBLE SPACE preserved)', async () => {
    const ctx = { cwd, args: [], flags: {} }
    const report = await deliveryLoopStep.run(ctx)
    expect(report.mutated).toBe(false)
    expect(report.needsUser).toBeDefined()
    // 2026-05-21 (Luiz/dev): G3 do README — DOUBLE SPACE antes de '[y/N]' eh contratual.
    expect(report.needsUser?.prompt).toBe(
      'Do you use Linear and want to enable the Delivery Loop convention?  [y/N]',
    )
    expect(report.needsUser?.options).toEqual(['y', 'N'])
  })

  test('CA-06: AGENTS.md is byte-identical AFTER first invocation (no mutation before user answers)', async () => {
    const ctx = { cwd, args: [], flags: {} }
    const before = await fs.readFile(path.join(cwd, 'AGENTS.md'), 'utf8')
    await deliveryLoopStep.run(ctx)
    const after = await fs.readFile(path.join(cwd, 'AGENTS.md'), 'utf8')
    expect(after).toBe(before)
  })

  test('second invocation with answer "y" injects Delivery Loop section', async () => {
    const ctx = { cwd, args: [], flags: { __interactiveAnswer: 'y' } }
    const report = await deliveryLoopStep.run(ctx)
    expect(report.mutated).toBe(true)
    expect(report.summary).toContain('injected')
    const content = await fs.readFile(path.join(cwd, 'AGENTS.md'), 'utf8')
    expect(content).toContain('Delivery Loop') // first non-empty line of snippet
  })

  test('second invocation with default "N" returns mutated=false (no injection)', async () => {
    const ctx = { cwd, args: [], flags: { __interactiveAnswer: 'N' } }
    const report = await deliveryLoopStep.run(ctx)
    expect(report.mutated).toBe(false)
    expect(report.summary).toBe('')
    const content = await fs.readFile(path.join(cwd, 'AGENTS.md'), 'utf8')
    expect(content).not.toContain('Delivery Loop')
  })

  test('answer is case-insensitive: "Y" also injects', async () => {
    const ctx = { cwd, args: [], flags: { __interactiveAnswer: 'Y' } }
    const report = await deliveryLoopStep.run(ctx)
    expect(report.mutated).toBe(true)
  })

  test('second invocation when section already-present returns mutated=false', async () => {
    // First answer 'y' injects.
    await deliveryLoopStep.run({ cwd, args: [], flags: { __interactiveAnswer: 'y' } })
    // Second answer 'y' should be no-op (idempotent).
    const report = await deliveryLoopStep.run({ cwd, args: [], flags: { __interactiveAnswer: 'y' } })
    expect(report.mutated).toBe(false)
    expect(report.summary).toContain('already-present')
  })

  // 2026-05-21 (Luiz/dev): D4 attestation — Step 08 NAO contem dry-run guard.
  // Se ctx.flags['dry-run'] === true, comportamento deve ser identico (sem early-return).
  test('D4: dry-run flag is ignored — step still answers normally (no special branch)', async () => {
    const ctx = { cwd, args: [], flags: { 'dry-run': true, __interactiveAnswer: 'y' } }
    const report = await deliveryLoopStep.run(ctx)
    expect(report.mutated).toBe(true) // would be false in v6.7 with dry-run guard
  })
})
```

Rodar `bun test skills/init/lib/steps/08-delivery-loop.test.ts` → RED esperado (stub retorna `{mutated:false, summary:''}` sem `needsUser`).

### Passo 3: Portar logica de `14-delivery-loop.ts` para `08-delivery-loop.ts`

```typescript
// skills/init/lib/steps/08-delivery-loop.ts
// 2026-05-21 (Luiz/dev): Plano 05 fase-01 — port de 14-delivery-loop.ts sem dry-run guard (D4).
// Mantem contrato needsUser do PRD D3/CH-01 (CA-06: pergunta ANTES de mutar).

import path from 'node:path'
import { promises as fs } from 'node:fs'
import { injectOptionalSection } from '../inject-optional-section'
import type { Step } from './types'
import { resolvePluginRoot } from './helpers'

export const deliveryLoopStep: Step = {
  id: 'delivery-loop',
  async run(ctx) {
    // 2026-05-21 (Luiz/dev): 1a invocacao — sem resposta. Retorna needsUser para dispatcher
    // pausar e perguntar. CA-06 garantido aqui: zero IO antes de retornar.
    const answer = ctx.flags['__interactiveAnswer']
    if (typeof answer !== 'string') {
      return {
        mutated: false,
        summary: '',
        needsUser: {
          // 2026-05-21 (Luiz/dev): wording byte-identico SKILL.md L372. DOUBLE SPACE eh contratual.
          prompt: 'Do you use Linear and want to enable the Delivery Loop convention?  [y/N]',
          options: ['y', 'N'] as const,
        },
      }
    }

    // 2026-05-21 (Luiz/dev): 2a invocacao — answer via ctx.flags. Default N (SKILL.md L374).
    // Case-insensitive 'y' ativa. D4: SEM dry-run guard — segue direto pra IO.
    const yes = answer.trim().toLowerCase() === 'y'
    if (!yes) {
      return { mutated: false, summary: '' }
    }

    // 2026-05-21 (Luiz/dev): wording byte-identico SKILL.md L384-396.
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

    return {
      mutated: result.status === 'injected',
      // 2026-05-21 (Luiz/dev): wording byte-identico SKILL.md L396 — 'injected'/'already-present'/'marker-missing'.
      summary: 'Delivery Loop injection: ' + result.status,
    }
  },
}
```

### Passo 4: GREEN + REFACTOR

Rodar `bun test skills/init/lib/steps/08-delivery-loop.test.ts` → esperado 7 passed.

Se RED ainda falha, debugar via leitura do `injectOptionalSection` (linha 36-37: detecta idempotencia pela primeira linha nao-vazia do body).

REFACTOR: nenhum esperado — codigo curto, 1 caminho condicional.

### Passo 5: VERIFY

```bash
bun test skills/init/lib/steps/08-delivery-loop.test.ts
bun run lint -- skills/init/lib/steps/08-delivery-loop.ts
# Confirmar D4: zero refs a dry-run no step novo
grep -c "dry-run\|isDryRun\|makeWriter\|WriteRecorder" skills/init/lib/steps/08-delivery-loop.ts
# Esperado: 0
```

---

## Gotchas

- **G2 do plano (CA-06 — pergunta ANTES de mutar):** o teste explicito "AGENTS.md byte-identico apos 1a invocacao" e a evidencia contratual. Se o step antigo `14-delivery-loop.ts` for refatorado para ler `AGENTS.md` antes de retornar `needsUser` (ex: validar marker upfront), CA-06 quebra. O `injectOptionalSection` ja faz `readFile` e isso eh aceitavel SO na 2a invocacao.
- **G3 do plano (DOUBLE SPACE):** se o lint/formatter normalizar espacos consecutivos para 1, o teste literal quebra. Adicionar `// eslint-disable-next-line` se necessario. Documentar no MEMORY.
- **G14 do plano (NAO deletar `14-delivery-loop.ts` aqui):** delete acontece em fase-05 apos e2e final verde. Manter durante porting para audit comparativo.
- **Local — `resolvePluginRoot(import.meta.dir)`:** durante teste rodando do tmp, `import.meta.dir` aponta para o `skills/init/lib/steps/` real (compilado), nao para tmp. `pluginRoot` resolve para `<repo>/skills/init/assets/snippets/delivery-loop.md` corretamente. Se um teste rodar em CI com path alternativo, mockar via override (nao necessario com path absoluto resolvido por `import.meta.dir`).

---

## Verificacao

### TDD

- [ ] **RED:** Testes em `08-delivery-loop.test.ts` falham porque stub retorna sem `needsUser`.
  - Comando: `bun test skills/init/lib/steps/08-delivery-loop.test.ts`
  - Resultado esperado: 7 failed (assertion failures, nao compilation)

- [ ] **GREEN:** Apos porting, todos os 7 testes passam.
  - Comando: `bun test skills/init/lib/steps/08-delivery-loop.test.ts`
  - Resultado esperado: `7 passed, 0 failed`

### Checklist

- [ ] `08-delivery-loop.ts` reescrito com porting de `14-delivery-loop.ts`
- [ ] Dry-run guard REMOVIDO (D4): `grep -c "dry-run\|isDryRun" 08-delivery-loop.ts` retorna `0`
- [ ] Wording byte-identico ao SKILL.md L372 (DOUBLE SPACE preservado)
- [ ] Contrato `needsUser` retornado na 1a invocacao com `mutated: false`
- [ ] CA-06 attested: AGENTS.md inalterado apos 1a invocacao
- [ ] Idempotencia: 2 invocacoes com 'y' = injecao + `already-present` (sem dupla insercao)
- [ ] `bun run test` (suite completa) verde
- [ ] `bun run lint` limpo

---

## Criterio de Aceite

**Por maquina:**
- `bun test skills/init/lib/steps/08-delivery-loop.test.ts` retorna `7 passed, 0 failed`
- `grep -c "dry-run\|isDryRun" skills/init/lib/steps/08-delivery-loop.ts` retorna `0`
- `diff <(grep -E "prompt:" skills/init/lib/steps/08-delivery-loop.ts) <(grep -E "prompt:" skills/init/lib/steps/14-delivery-loop.ts)` retorna saida igual (mesma string, modulo comentarios em volta)

**Por humano:**
- Inspecao visual: o step novo nao tem branch `if (ctx.flags['dry-run']...)` nem early-return. Compara lado-a-lado com `14-delivery-loop.ts:36-39`.

---

<!-- Gerado por /plan-feature em 2026-05-21 -->
