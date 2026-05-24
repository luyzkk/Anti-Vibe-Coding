<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante esta fase deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou seção do PRD).
-->

# Fase 02: Migrate Knowledge Path Step

**Plano:** 02 — Reentrada, Migracao V5 e Validator Pos-Init
**Sizing:** ~1.5h
**Depende de:** Plano 01 completo
**Visual:** false

---

## O que esta fase entrega

Step dedicado `13_1-migrate-knowledge-path.ts` que, em modo re-populate, move `docs/knowledge/legacy-claude-knowledge/` (artefato de init v5) para `docs/_legacy/knowledge/` com rename atomico. Guard de colisao aborta se destino ja existe. Registrado no registry entre `migrate4DecisionsStep` e `scaffoldFullTreeStep` (AR-03).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/steps/13_1-migrate-knowledge-path.ts` | Create | Step novo — logica de migracao v5 legacy knowledge |
| `skills/init/lib/steps/13_1-migrate-knowledge-path.test.ts` | Create | Testes unitarios — 3 cenarios (migracao feliz, colisao, nao re-populate) |
| `skills/init/lib/registry.ts` | Modify | Importar e registrar `migrateKnowledgePathStep` entre `migrate4DecisionsStep` e `scaffoldFullTreeStep` |

---

## Implementacao

### Passo 1: Verificar numeracao e posicao no registry (AR-03)

Confirmar no `registry.ts` que a posicao entre `migrate4DecisionsStep` e `scaffoldFullTreeStep` existe e nao tem outros steps intercalados. Conforme leitura atual do registry:

```typescript
// registry.ts — trecho relevante (linhas 71-72 conforme leitura atual):
migrate4DecisionsStep,        // 2026-05-17 (Luiz/dev): ...
scaffoldFullTreeStep,
```

O novo step sera inserido entre essas duas linhas. Numbering `13_1-` segue padrao AR-03: `00_1`, `00_2`, `00_3`, `03_1`, `09_1` ja em uso. `13_1-migrate-knowledge-path` e o proximo da serie.

### Passo 2: Escrever testes (TDD RED)

Criar `skills/init/lib/steps/13_1-migrate-knowledge-path.test.ts`:

```typescript
// 2026-05-20 (Luiz/dev): D7.A.1 + D3 do PRD knowledge-path-cutover — step dedicado de migracao v5.
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import * as os from 'node:os'
import { runMigrateKnowledgePathStep } from './13_1-migrate-knowledge-path'

let tmpDir: string

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'migrate-knowledge-path-'))
})

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('migrateKnowledgePathStep', () => {
  test('moves docs/knowledge/legacy-claude-knowledge to docs/_legacy/knowledge in re-populate mode', async () => {
    // Arrange: criar estrutura v5 legacy
    const src = path.join(tmpDir, 'docs', 'knowledge', 'legacy-claude-knowledge')
    await fs.mkdir(src, { recursive: true })
    await fs.writeFile(path.join(src, 'README.md'), '# legacy knowledge')

    // Act
    const result = await runMigrateKnowledgePathStep({
      cwd: tmpDir,
      flags: { '__reentryMode': 're-populate' },
    })

    // Assert: destino existe, fonte nao existe, step reporta mutacao
    const dest = path.join(tmpDir, 'docs', '_legacy', 'knowledge')
    const destFile = path.join(dest, 'README.md')
    expect(result.mutated).toBe(true)
    expect(result.summary).toContain('migrated')
    await expect(fs.access(destFile)).resolves.toBeUndefined()
    await expect(fs.access(src)).rejects.toThrow()
  })

  test('aborts with AbortError when destination docs/_legacy/knowledge already exists', async () => {
    // Arrange: fonte E destino pre-existentes
    const src = path.join(tmpDir, 'docs', 'knowledge', 'legacy-claude-knowledge')
    const dest = path.join(tmpDir, 'docs', '_legacy', 'knowledge')
    await fs.mkdir(src, { recursive: true })
    await fs.mkdir(dest, { recursive: true })
    await fs.writeFile(path.join(src, 'README.md'), '# src')
    await fs.writeFile(path.join(dest, 'README.md'), '# dest existing')

    // Act + Assert
    await expect(
      runMigrateKnowledgePathStep({
        cwd: tmpDir,
        flags: { '__reentryMode': 're-populate' },
      })
    ).rejects.toMatchObject({
      name: 'AbortError',
      reason: expect.stringContaining('Destino já existe'),
    })
  })

  test('is a no-op when NOT in re-populate mode', async () => {
    // Arrange: estrutura v5 presente mas nao eh re-populate
    const src = path.join(tmpDir, 'docs', 'knowledge', 'legacy-claude-knowledge')
    await fs.mkdir(src, { recursive: true })
    await fs.writeFile(path.join(src, 'README.md'), '# legacy knowledge')

    // Act
    const result = await runMigrateKnowledgePathStep({
      cwd: tmpDir,
      flags: {},
    })

    // Assert: nao mutou, fonte intacta
    expect(result.mutated).toBe(false)
    expect(result.summary).toContain('skipped')
    await expect(fs.access(src)).resolves.toBeUndefined()
  })

  test('is a no-op when docs/knowledge/legacy-claude-knowledge does not exist', async () => {
    // Sem fonte → skip silencioso
    const result = await runMigrateKnowledgePathStep({
      cwd: tmpDir,
      flags: { '__reentryMode': 're-populate' },
    })

    expect(result.mutated).toBe(false)
    expect(result.summary).toContain('no legacy')
  })
})
```

Rodar `bun run test -- --grep "migrateKnowledgePathStep"` — deve falhar com erro de modulo nao encontrado (nao por assertion — apos criar o esqueleto vazio deve ser assertion failure).

### Passo 3: Criar o step (skeleton → GREEN)

Criar `skills/init/lib/steps/13_1-migrate-knowledge-path.ts`:

```typescript
// skills/init/lib/steps/13_1-migrate-knowledge-path.ts
// 2026-05-20 (Luiz/dev): D7.A.1 do PRD knowledge-path-cutover — step dedicado SRP.
// Move docs/knowledge/legacy-claude-knowledge/ (artefato init v5) → docs/_legacy/knowledge/.
// AR-03: numbering 13_1- segue padrao NN_M- ja em uso no projeto.
// Roda APOS migrate4DecisionsStep (que popula legacy-claude-knowledge via migrate-claude-artifacts).
// Sequencia garantida por AR-01: backupPre650 (copia defensiva) → migrate-* → este step → scaffold.
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Step } from './types'
import { AbortError } from './abort-error'

const LEGACY_SRC_REL = path.join('docs', 'knowledge', 'legacy-claude-knowledge')
const LEGACY_DEST_REL = path.join('docs', '_legacy', 'knowledge')

export async function runMigrateKnowledgePathStep(ctx: {
  cwd: string
  flags?: Record<string, unknown>
}): Promise<{ mutated: boolean; summary: string }> {
  // 2026-05-20 (Luiz/dev): D5/D7 — apenas em re-populate (CA-08 requer __reentryMode='re-populate').
  if (ctx.flags?.['__reentryMode'] !== 're-populate') {
    return { mutated: false, summary: 'skipped: not in re-populate mode' }
  }

  const src = path.join(ctx.cwd, LEGACY_SRC_REL)
  const dest = path.join(ctx.cwd, LEGACY_DEST_REL)

  // Verificar se fonte existe
  const srcExists = await fs.access(src).then(() => true).catch(() => false)
  if (!srcExists) {
    return { mutated: false, summary: 'skipped: no legacy docs/knowledge/legacy-claude-knowledge found' }
  }

  // 2026-05-20 (Luiz/dev): D8 guard de colisao (CA-09) — abortar se destino ja existe.
  // Usuario deve remover manualmente ou migracao ja foi feita em execucao anterior.
  const destExists = await fs.access(dest).then(() => true).catch(() => false)
  if (destExists) {
    throw new AbortError({
      code: 2,
      reason:
        'Destino já existe: docs/_legacy/knowledge/. ' +
        'Migração manual necessária ou remova `docs/_legacy/knowledge/` para permitir migração automática.',
    })
  }

  // Garantir que o diretorio pai do destino existe
  await fs.mkdir(path.dirname(dest), { recursive: true })

  // Rename atomico (no-op se mesma particao, O(1))
  await fs.rename(src, dest)

  return {
    mutated: true,
    summary: `migrated docs/knowledge/legacy-claude-knowledge → docs/_legacy/knowledge`,
  }
}

export const migrateKnowledgePathStep: Step = {
  id: '13_1-migrate-knowledge-path',
  async run(ctx) {
    return runMigrateKnowledgePathStep(ctx)
  },
}
```

### Passo 4: Registrar no registry.ts

Em `skills/init/lib/registry.ts`, adicionar import e inserir o step:

```typescript
// Adicionar import (junto com os outros migrate* imports):
import { migrateKnowledgePathStep } from './steps/13_1-migrate-knowledge-path'

// Inserir no array registry — entre migrate4DecisionsStep e scaffoldFullTreeStep:
// ANTES:
migrate4DecisionsStep,        // 2026-05-17 (Luiz/dev): G4 do plano03 fase-04 — best-effort, sem AbortError.
scaffoldFullTreeStep,

// DEPOIS:
migrate4DecisionsStep,        // 2026-05-17 (Luiz/dev): G4 do plano03 fase-04 — best-effort, sem AbortError.
migrateKnowledgePathStep,     // 2026-05-20 (Luiz/dev): D7.A.1 do PRD knowledge-path-cutover — migra docs/knowledge/legacy-claude-knowledge → docs/_legacy/knowledge/ (SH-03, CA-08, CA-09).
scaffoldFullTreeStep,
```

### Passo 5: Verificar que `--dry-run` nao quebra

O step deve ser defensivo com dry-run. `runMigrateKnowledgePathStep` nao verifica `dry-run` explicitamente — adicionar guard:

```typescript
// No inicio de runMigrateKnowledgePathStep, antes do reentryMode check:
// 2026-05-20 (Luiz/dev): dry-run guard — consistente com outros steps do pipeline.
if (ctx.flags?.['dry-run'] === true) {
  return { mutated: false, summary: 'dry-run: migrate-knowledge-path would run in re-populate mode' }
}
```

---

## Gotchas

- **G3 do plano (sequencia AR-01):** A sequencia no registry e crucial. `backupPre650Step` roda antes de todos os migrate-*. `migrateAllOrchestrateStep` orquestra os migrate-1/2/3/4 em real mode. `migrate4DecisionsStep` popula `docs/knowledge/legacy-claude-knowledge/` via `migrate-claude-artifacts.ts` (se artefato v5 presente). Apenas DEPOIS de `migrate4DecisionsStep` faz sentido mover `legacy-claude-knowledge/` — do contrario fonte nao existe.

- **G4 do plano (`docs/_legacy/knowledge/` vs `docs/_legacy/pre-6.5.0/`):** `backupPre650Step` cria `docs/_legacy/pre-6.5.0/` ou `docs/_legacy/pre-6.5.0-{ts}/`. O destino do migrate-knowledge-path e `docs/_legacy/knowledge/` — pasta diferente. Guard de colisao so dispara se `docs/_legacy/knowledge/` ja existe (execucao anterior bem-sucedida deste step). Sem overlap com pre-6.5.0.

- **Local — `fs.rename` cross-device:** Se `tmpDir` do teste estiver em particao diferente do destino, `fs.rename` falha com `EXDEV`. Para testes com `os.tmpdir()`, geralmente nao e problema (mesma particao). Para robustez em producao, documentar: se `EXDEV` for detectado, fallback para copyTree + rm. Nao implementar agora (YAGNI) — registrar como gotcha.

- **Local — `migrate-claude-artifacts.ts:45` preservado:** Este arquivo usa `docs/knowledge/legacy-claude-knowledge/` como PATH NO PROJETO ALVO (nao no plugin). Nao deve ser alterado no Plano 01 nem aqui. O step novo MOVE esse path — o caminho literal permanece correto no `migrate-claude-artifacts.ts` pois ele CRIA a pasta que este step depois MOVE.

---

## Verificacao

### TDD

- [ ] **RED:** Testes escritos e FALHAM por assertion (modulo inexistente → criar esqueleto vazio primeiro)
  - Comando: `bun run test -- --grep "migrateKnowledgePathStep"`
  - Resultado esperado: `Expected true, received false` (apos esqueleto vazio com stubs)

- [ ] **GREEN:** Implementacao completa, todos os 4 testes PASSAM
  - Comando: `bun run test -- --grep "migrateKnowledgePathStep"`
  - Resultado esperado: `4 passed, 0 failed`

### Checklist

- [ ] `13_1-migrate-knowledge-path.ts` exporta `runMigrateKnowledgePathStep` e `migrateKnowledgePathStep`
- [ ] Step id e `'13_1-migrate-knowledge-path'` (com underscore, sem prefixo numerico extra)
- [ ] Guard de colisao lanca `AbortError` com `code: 2` e mensagem contendo "Destino já existe"
- [ ] No-op quando nao e re-populate (`mutated: false`, summary "skipped: not in re-populate mode")
- [ ] No-op quando fonte nao existe (`mutated: false`, summary contendo "no legacy")
- [ ] dry-run retorna sem mutacao
- [ ] Step registrado em `registry.ts` entre `migrate4DecisionsStep` e `scaffoldFullTreeStep`
- [ ] Import adicionado em `registry.ts`
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun tsc --noEmit`

---

## Criterio de Aceite

**CA-08 (migracao v5):**

**Por maquina:**
- `bun run test -- --grep "moves docs/knowledge/legacy-claude-knowledge"` retorna `1 passed`

**CA-09 (guard de colisao):**

**Por maquina:**
- `bun run test -- --grep "aborts with AbortError when destination"` retorna `1 passed`

**Registry:**
- `bun run test -- --grep "registry"` continua verde (registry.test.ts verifica ordem dos steps)
- Grep de `'13_1-migrate-knowledge-path'` em `registry.ts` retorna match

---

<!-- Gerado por /plan-feature em 2026-05-20 -->
