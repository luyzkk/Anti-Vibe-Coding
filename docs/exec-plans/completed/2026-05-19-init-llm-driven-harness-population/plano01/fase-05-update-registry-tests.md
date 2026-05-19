<!--
Princípio universal #5 — Comment Provenance.
-->

# Fase 05: Update Registry Tests + Flag E2E Quebrados

**Plano:** 01 — Refactor de Registry (Tracer Bullet)
**Sizing:** 1h
**Depende de:** fase-02, fase-03, fase-04
**Visual:** false

---

## O que esta fase entrega

`registry.test.ts` atualizado para refletir a nova ordem e remocoes (cobre parte de CA-10).
E2E que assumiam Steps 07-11 marcados explicitamente como `test.skip` com motivo apontando
Plano 05 fase-04 (que vai reescrever os E2E para o fluxo LLM-driven novo).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/registry.test.ts` | Modify | Remove imports orfaos + testes obsoletos. Adiciona testes de ausencia (steps removidos nao estao no registry). |
| `tests/e2e/init-tracer-bullet.test.ts` | Investigate + skip | Se referencia Steps 07-11, marcar `test.skip` com motivo. |
| `tests/e2e/init-cutover-greenfield.test.ts` | Investigate + skip | idem. |
| `tests/e2e/init-cutover-legacy-v5.test.ts` | Investigate + skip | idem. |
| `tests/e2e/ca12-greenfield-populate-validate.test.ts` | Investigate + skip | idem. |
| `tests/e2e/ca13-dry-run-parity.test.ts` | Investigate + skip | idem (linha 42 ja menciona Step 09). |
| Outros E2E listados no MEMORY.md das fases anteriores | Skip conforme audit | Lista vem da fase-03. |

---

## Implementacao

### Passo 1: Atualizar `registry.test.ts`

Estado atual relevante (apos fase-01 que ja inverteu 2 testes):

```typescript
import { describe, expect, test } from 'bun:test'
import { registry } from './registry'
import { proposeMergeBatchStep } from './steps/09-propose-merge-batch'
import { classifyBlocksHybridStep } from './steps/08-classify-blocks-hybrid'
import { applyMergeDestructiveStep } from './steps/10-apply-merge-destructive'
import { moveDocsWithStubStep } from './steps/11-move-docs-with-stub'
import { linkClaudeAgentsStep } from './steps/02-link-claude-agents'
```

Substituir o arquivo INTEIRO por:

```typescript
// 2026-05-19 (Luiz/dev): Plano 01 fase-05 — testes do registry atualizados para refletir
// remocao de Steps 07/08/09-propose-merge/11 e rename do Step 10 (Plano 01 fases 02-04).
// Cobre parte de CA-10 do PRD init-llm-driven-harness-population.
import { describe, expect, test } from 'bun:test'
import { registry } from './registry'
import { backupPreMutationStep } from './steps/10-backup-pre-mutation'

describe('registry', () => {
  test('all step ids are unique', () => {
    const ids = registry.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // 2026-05-19 (Luiz/dev): MH-01 / CA-07 do PRD novo — Bug C.
  test('final-validation is the last step', () => {
    expect(registry.at(-1)?.id).toBe('final-validation')
  })

  test('91-generate-populate-plan comes BEFORE final-validation', () => {
    const ids = registry.map(s => s.id)
    const finalIdx = ids.indexOf('final-validation')
    const populateIdx = ids.indexOf('91-generate-populate-plan')
    expect(populateIdx).toBeGreaterThanOrEqual(0)
    expect(finalIdx).toBeGreaterThan(populateIdx)
  })

  // 2026-05-19 (Luiz/dev): MH-04 do PRD novo — Steps heuristicos removidos.
  test.each([
    '07-discover-existing-docs',
    '08-classify-blocks-hybrid',
    '09-propose-merge-batch',
    '11-move-docs-with-stub',
  ])('removed step %s is NOT present in registry', (removedId) => {
    const ids = registry.map(s => s.id)
    expect(ids).not.toContain(removedId)
  })

  // 2026-05-19 (Luiz/dev): MH-05 / D3 CONTEXT — Step 10 renomeado preservando linhagem git.
  test('10-backup-pre-mutation is present (renamed from apply-merge-destructive)', () => {
    expect(registry).toContain(backupPreMutationStep)
    const ids = registry.map(s => s.id)
    expect(ids).toContain('10-backup-pre-mutation')
    expect(ids).not.toContain('10-apply-merge-destructive')
  })

  // 2026-05-19 (Luiz/dev): backup deve rodar ANTES do scaffold mutativo (decisao DI-N MEMORY.md).
  test('10-backup-pre-mutation comes before scaffold-full-tree', () => {
    const ids = registry.map(s => s.id)
    const backupIdx = ids.indexOf('10-backup-pre-mutation')
    const scaffoldIdx = ids.indexOf('01-scaffold-full-tree')
    expect(backupIdx).toBeGreaterThanOrEqual(0)
    expect(scaffoldIdx).toBeGreaterThanOrEqual(0)
    expect(backupIdx).toBeLessThan(scaffoldIdx)
  })
})
```

**Mudancas vs estado atual:**
- Removidos 4 imports orfaos (`proposeMergeBatchStep`, `classifyBlocksHybridStep`,
  `applyMergeDestructiveStep`, `moveDocsWithStubStep`).
- Removido import de `linkClaudeAgentsStep` (so era usado pelo teste "positions
  apply-merge-destructive IMMEDIATELY BEFORE link-claude-agents" que e deletado).
- Adicionado import de `backupPreMutationStep` (novo Step 10).
- Removidos 2 testes obsoletos:
  - `'positions propose-merge-batch immediately after classify-blocks-hybrid'`
  - `'positions apply-merge-destructive IMMEDIATELY BEFORE link-claude-agents (D23 reorder)'`
- Adicionados 4 novos testes:
  - `removed step %s is NOT present in registry` (cobre MH-04, 4 ids removidos)
  - `10-backup-pre-mutation is present (renamed from apply-merge-destructive)`
  - `10-backup-pre-mutation comes before scaffold-full-tree`

### Passo 2: Auditoria de E2E afetados

Rodar para identificar TODOS os E2E que precisam ser skipados:

```bash
grep -rln "discoverExistingDocsStep\|classifyBlocksHybridStep\|proposeMergeBatchStep\|moveDocsWithStubStep\|applyMergeDestructiveStep\|07-discover-existing-docs\|08-classify-blocks-hybrid\|09-propose-merge-batch\|10-apply-merge-destructive\|11-move-docs-with-stub" tests/
```

Para CADA arquivo retornado:
1. Abrir o arquivo.
2. Inserir no topo do `describe()` ou nos `test()` afetados:

```typescript
// 2026-05-19 (Luiz/dev): Plano 01 fase-05 — assumia Steps 07-11 do registry antigo.
// Plano 05 fase-04 reescreve este E2E para o fluxo LLM-driven novo.
test.skip('nome original do teste', () => { /* ... */ })
```

   OU, se for o `describe` inteiro afetado:

```typescript
describe.skip('nome do describe', () => { /* ... */ })
```

**Nao tentar consertar os E2E aqui** — escopo Plano 05 fase-04.

### Passo 3: Atualizar MEMORY.md com a lista final

Apos rodar o grep e marcar os skips, registrar no MEMORY.md em "Notas para Planos Seguintes":

```markdown
- E2E skipados nesta fase (input para Plano 05 fase-04):
  - tests/e2e/{path}: motivo X
  - tests/e2e/{path}: motivo Y
  - ...
```

Lista exata depende do output do grep — esperado entre 3 e 8 arquivos.

### Passo 4: Verificar golden snapshot

O arquivo `tests/e2e/__golden__/init-greenfield.stdout.txt` apareceu no grep em fases
anteriores como contendo referencias aos steps removidos. Inspecionar:

```bash
grep -n "discover-existing-docs\|classify-blocks\|propose-merge\|apply-merge\|move-docs-with-stub" tests/e2e/__golden__/init-greenfield.stdout.txt
```

Se houver matches, o golden snapshot ficara obsoleto. NAO reescrever aqui — apenas
documentar no MEMORY.md como "Golden snapshot precisa ser regenerado no Plano 05 fase-04 apos
reescrita do E2E."

---

## Gotchas

- **G5 do plano (imports orfaos em registry.test.ts):** O cenario classico de "esqueci um import"
  pode passar o lint mas quebrar TS. Apos o rewrite do Passo 1, rodar `bun run typecheck`
  explicitamente para garantir.
- **Local (test.skip vs test.todo):** Usar `test.skip` (nao `test.todo`) porque o codigo
  do teste continua util como referencia para o Plano 05 fase-04 reescrever. `test.todo`
  apaga o body.
- **Local (suites com beforeAll/beforeEach):** Se um E2E skipado tem `beforeAll` que faz
  setup pesado (ex: criar tmp dir), `describe.skip` impede o setup — preferivel a
  `test.skip` em cada teste individual.
- **Local (Bun test.each):** Sintaxe `test.each([...])('descricao %s', fn)` e suportada
  pelo bun:test. Se houver problema, fallback para 4 `test()` separados.

---

## Verificacao

### TDD

- [ ] **RED:** Antes do rewrite, `bun test skills/init/lib/registry.test.ts` provavelmente
      ja falha porque os 4 imports referenciam arquivos deletados nas fases 02-04.
- [ ] **GREEN:** Apos rewrite do Passo 1 + skips nos E2E:
  - Comando: `bun test skills/init/lib/registry.test.ts`
  - Resultado esperado: `8 passed, 0 failed` (3 testes preservados + 4 do `test.each` + 2 novos
    + 1 contagem aproximada — ajustar conforme rewrite)
  - Comando: `bun test tests/e2e/`
  - Resultado esperado: muitos testes em `skipped` mas zero falhos.

### Checklist

- [ ] `registry.test.ts` sem imports orfaos (`bun run typecheck` passa)
- [ ] `registry.test.ts` tem testes de ausencia para 4 ids removidos
- [ ] `registry.test.ts` tem testes de presenca + ordem para `10-backup-pre-mutation`
- [ ] Todos os E2E identificados pelo grep do Passo 2 tem `test.skip` ou `describe.skip`
      com comentario de provenance apontando Plano 05 fase-04
- [ ] MEMORY.md lista os E2E skipados (input concreto para Plano 05)
- [ ] Golden snapshot, se afetado, esta documentado em MEMORY.md (regenerar no Plano 05 fase-04)
- [ ] `bun test skills/init/lib/registry.smoke.test.ts` continua passando
- [ ] `bun run lint` limpo
- [ ] `bun run typecheck` exit 0
- [ ] `bun run test` global nao trava em erros (skips sao OK)

---

## Criterio de Aceite

**Por maquina:**
- `grep -c "from './steps/0[789]-\|from './steps/11-" skills/init/lib/registry.test.ts` retorna `0`
- `grep -c "10-backup-pre-mutation" skills/init/lib/registry.test.ts` retorna `>= 2`
  (import + asserts)
- `bun test skills/init/lib/registry.test.ts` retorna 0 failed
- `bun run typecheck` retorna exit 0
- `bun test tests/e2e/` retorna 0 failed (skips contam como pass)

**Por humano:**
- MEMORY.md tem lista explicita de E2E skipados em "Notas para Planos Seguintes" —
  Plano 05 fase-04 vai usar essa lista como checklist.

---

## TODOs para planos seguintes

- **Plano 05 fase-04:** reescrever E2E skipados para validar novo fluxo
  (scaffold determinístico -> PLAN.md gerado pelo Step 91 -> Step 90 warning-mode).
  Regenerar `tests/e2e/__golden__/init-greenfield.stdout.txt`.
- **Plano 02 fase-03:** expandir logica do `10-backup-pre-mutation.ts` para iterar
  outros docs raiz + emitir manifest de backup. Adicionar testes extras.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
