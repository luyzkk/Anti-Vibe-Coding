# Fase 03: Auto-flip initMode → "completed"

**Plano:** 04 — Manifest + Harness Validate: Fase 4
**Sizing:** 1h
**Depende de:** fase-01 (`manifest-writer.ts` — `readManifest`, `writeManifest`, `AntiVibeManifest`, `MigrationPlanEntry`)
**Visual:** false

---

## O que esta fase entrega

Função `autoFlipIfComplete(targetDir, manifest)` em `manifest-writer.ts` que verifica se todos os migration plans catalogados foram completados e — se sim — flippa `initMode: "migration" → "completed"` no manifest.

Integração com SKILL.md: no Step 0 do routing (quando detecta `initMode === "migration"`), o código chama `autoFlipIfComplete()` antes de qualquer outra lógica. Se flippado, emite mensagem de warning visual ao operador: *"Migration concluded — strict mode re-engaged."* e encerra sem re-executar fases.

**Invariante chave:** A Fase 4 (buildAndWritePhase4Manifest) NUNCA flippa para `"completed"` — sempre grava `"migration"`. O flip só ocorre quando invocado pelo routing do `/init`, após uma execução anterior ter movido o último plan para `completed/`.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/manifest-writer.ts` | Modificar | Adicionar `autoFlipIfComplete()` |
| `skills/init/lib/manifest-writer.test.ts` | Modificar | Adicionar testes de `autoFlipIfComplete` |
| `skills/init/SKILL.md` | Modificar | Step 0 routing: chamar auto-flip ao detectar `initMode: "migration"` |

---

## Implementacao

### Passo 1: Adicionar testes RED para `autoFlipIfComplete`

Expandir `skills/init/lib/manifest-writer.test.ts` com:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { writeManifest, readManifest, autoFlipIfComplete } from './manifest-writer'
import type { AntiVibeManifest } from './manifest-writer'

describe('autoFlipIfComplete', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = path.join(tmpdir(), `manifest-test-${randomUUID()}`)
    await fs.mkdir(path.join(tmpDir, '.claude'), { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('returns flipped: true and updates initMode when all plans are completed', async () => {
    const manifest: AntiVibeManifest = {
      pluginVersion: '6.1.0',
      initMode: 'migration',
      installedAt: new Date().toISOString(),
      files: {},
      migrationPlans: [
        { id: 'plan-a', slot: 'AGENTS.md', path: 'docs/exec-plans/completed/plan-a.md', status: 'completed' },
        { id: 'plan-b', slot: 'docs/DESIGN.md', path: 'docs/exec-plans/completed/plan-b.md', status: 'completed' },
      ],
    }
    await writeManifest(tmpDir, manifest)

    const result = await autoFlipIfComplete(tmpDir, manifest)

    expect(result.flipped).toBe(true)
    expect(result.updatedManifest.initMode).toBe('completed')

    // Confirma que o manifest em disco foi atualizado.
    const onDisk = await readManifest(tmpDir)
    expect(onDisk?.initMode).toBe('completed')
  })

  it('returns flipped: false when at least one plan is still active', async () => {
    const manifest: AntiVibeManifest = {
      pluginVersion: '6.1.0',
      initMode: 'migration',
      installedAt: new Date().toISOString(),
      files: {},
      migrationPlans: [
        { id: 'plan-a', slot: 'AGENTS.md', path: 'docs/exec-plans/active/plan-a.md', status: 'active' },
        { id: 'plan-b', slot: 'docs/DESIGN.md', path: 'docs/exec-plans/completed/plan-b.md', status: 'completed' },
      ],
    }
    await writeManifest(tmpDir, manifest)

    const result = await autoFlipIfComplete(tmpDir, manifest)

    expect(result.flipped).toBe(false)
    expect(result.updatedManifest.initMode).toBe('migration')
  })

  it('returns flipped: false when initMode is not migration', async () => {
    const manifest: AntiVibeManifest = {
      pluginVersion: '6.1.0',
      initMode: 'fresh',  // não é migration
      installedAt: new Date().toISOString(),
      files: {},
    }
    await writeManifest(tmpDir, manifest)

    const result = await autoFlipIfComplete(tmpDir, manifest)

    expect(result.flipped).toBe(false)
    expect(result.updatedManifest.initMode).toBe('fresh')
  })

  it('returns flipped: false when migrationPlans is empty (nothing to complete)', async () => {
    const manifest: AntiVibeManifest = {
      pluginVersion: '6.1.0',
      initMode: 'migration',
      installedAt: new Date().toISOString(),
      files: {},
      migrationPlans: [],  // catalog vazio = estado inconsistente, não flippar
    }
    await writeManifest(tmpDir, manifest)

    const result = await autoFlipIfComplete(tmpDir, manifest)

    expect(result.flipped).toBe(false)
  })
})
```

Rodar para confirmar RED: `bun run test -- --grep 'autoFlipIfComplete'`

### Passo 2: Implementar `autoFlipIfComplete` em `manifest-writer.ts`

Adicionar ao final do módulo (após `buildAndWritePhase4Manifest`):

```typescript
export type AutoFlipResult = {
  flipped: boolean
  updatedManifest: AntiVibeManifest
}

/**
 * Verifica se todos os migration plans estão completados e, se sim,
 * flippa `initMode: "migration" → "completed"` no manifest em disco.
 *
 * Invariante: nunca flippa se `migrationPlans` está vazio (catalog vazio
 * significa estado inconsistente — operador deve investigar).
 *
 * Chamado pelo SKILL.md routing no Step 0 quando detecta initMode === 'migration'.
 */
export async function autoFlipIfComplete(
  targetDir: string,
  manifest: AntiVibeManifest,
): Promise<AutoFlipResult> {
  if (manifest.initMode !== 'migration') {
    return { flipped: false, updatedManifest: manifest }
  }

  const plans = manifest.migrationPlans ?? []

  // Catalog vazio = inconsistente. Não flippar.
  if (plans.length === 0) {
    return { flipped: false, updatedManifest: manifest }
  }

  const hasActivePlans = plans.some((p) => p.status === 'active')

  if (hasActivePlans) {
    return { flipped: false, updatedManifest: manifest }
  }

  // Todos plans completados → flippar.
  const updatedManifest: AntiVibeManifest = {
    ...manifest,
    initMode: 'completed',
    installedAt: new Date().toISOString(),  // Atualiza timestamp do flip
  }

  await writeManifest(targetDir, updatedManifest)

  return { flipped: true, updatedManifest }
}
```

### Passo 3: Integrar no SKILL.md routing (Step 0)

Localizar o Step 0 de routing em `skills/init/SKILL.md` — a seção que detecta `initMode` do manifest.
Expandir o branch `initMode === "migration"` para:

```markdown
### Step 0 — Detect init mode

1. Ler `.claude/.anti-vibe-manifest.json` via `readManifest(targetDir)`.
2. Se `manifest.initMode === "migration"`:
   a. Chamar `autoFlipIfComplete(targetDir, manifest)`.
   b. Se `result.flipped === true`:
      - Emitir ao operador: "✅ Migration concluded — strict mode re-engaged. All migration plans are now in completed/."
      - Encerrar sem re-executar fases.
   c. Se `result.flipped === false`:
      - Contar plans ativos: `manifest.migrationPlans?.filter(p => p.status === 'active').length ?? 0`
      - Emitir: "Migration in progress: {N} plans remaining in docs/exec-plans/active/. Run /execute-plan or move plans manually."
      - Encerrar sem re-executar fases. (Re-run de migration mode regenera discovery mas não interfere — ver DT-02.)
```

**Nota:** O SKILL.md routing usa linguagem natural (não código TS). O agente executor lê as instruções e chama as funções correspondentes via `import`. A instrução acima é spec para o LLM executor — não pseudocódigo literal.

---

## Gotchas

**G1 — `status` no catalog vs status real em disco:** `autoFlipIfComplete` usa o `status` dentro de `manifest.migrationPlans[]`, não escaneia o filesystem. A responsabilidade de atualizar `status: 'active' → 'completed'` quando um plan é movido é do operador (mover o arquivo + rodar `/init` para re-sincronizar). O `buildMigrationPlanCatalog` (fase-01) faz o scan real e atualiza o catalog em cada execução.

**G2 — Re-run reconstrói o catalog, o flip usa o catalog do manifest corrente:** Quando o operador roda `/init` de novo depois de mover plans para `completed/`, o routing detecta `migration`, chama `autoFlipIfComplete` com o manifest **corrente** (que ainda tem `status: 'active'` para os plans). Mas antes do flip, o routing já deveria ter chamado `buildMigrationPlanCatalog` para atualizar o catalog. Ordem correta no SKILL.md: (1) re-scan catalog → (2) atualizar manifest.migrationPlans → (3) chamar autoFlipIfComplete com manifest atualizado.

**G3 — Warning visual é responsabilidade do LLM executor, não do TS:** `autoFlipIfComplete` retorna `{ flipped: true, ... }`. A mensagem "Migration concluded — strict mode re-engaged." é emitida pelo código de routing no SKILL.md (que o LLM interpreta), não por `console.log` no módulo TS. O módulo TS apenas grava o manifest atualizado — não tem opinião sobre output.

**G4 — `installedAt` é atualizado no flip:** Para rastreabilidade, o flip atualiza `installedAt` com o timestamp do momento do flip. O harness-validate pode usar `installedAt` para saber quando a migration completou.

**G5 — Catalog vazio não é "tudo completado":** Plans vazios (`migrationPlans: []`) podem indicar: (a) manifest criado antes de rodar Plano 03, ou (b) bug no catalog builder. Em ambos os casos, flippar seria prematuro. O invariante de não-flip em catalog vazio é conservador e seguro.

---

## Verificacao

### TDD
- [ ] RED: `autoFlipIfComplete` não existe, teste falha com ImportError
  - Comando: `bun run test -- --grep 'autoFlipIfComplete'`
- [ ] GREEN: função implementada, todos os 4 casos passam
  - Comando: `bun run test -- --grep 'autoFlipIfComplete'`

### Checklist

- [ ] `autoFlipIfComplete(targetDir, manifest)` exportada de `manifest-writer.ts`
- [ ] Retorna `{ flipped: false }` se `initMode !== 'migration'`
- [ ] Retorna `{ flipped: false }` se `migrationPlans` está vazio
- [ ] Retorna `{ flipped: false }` se há pelo menos 1 plan com `status: 'active'`
- [ ] Retorna `{ flipped: true }` e atualiza `initMode → 'completed'` quando todos plans têm `status: 'completed'`
- [ ] Manifest em disco é atualizado quando `flipped: true`
- [ ] `installedAt` é atualizado com novo timestamp no flip
- [ ] SKILL.md Step 0 tem instrução de chamar `autoFlipIfComplete` ao detectar migration mode
- [ ] SKILL.md Step 0 tem instrução de emitir mensagem "Migration concluded" quando flipped
- [ ] `bun run tsc --noEmit` passa sem erros
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- --grep 'autoFlipIfComplete'` retorna ≥4 testes PASS, 0 FAIL
- Round-trip: `writeManifest` com todos plans `completed` → `autoFlipIfComplete` → `readManifest` → `initMode === 'completed'`
- `autoFlipIfComplete` com manifest `initMode: 'fresh'` → `flipped: false` sem modificar disco

**Por humano:**
- Ao rodar `/init` com manifest `initMode: "migration"` e último plan movido para `completed/`, o operador vê a mensagem "Migration concluded — strict mode re-engaged." na saída da skill

<!-- Gerado por /plan-feature em 2026-05-14 -->
