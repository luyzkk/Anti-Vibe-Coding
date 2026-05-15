# Fase 02: migration-mode-detector.ts

**Plano:** 01 — Fundação: Category Field + Detection + Tracer Bullet
**Sizing:** 1h
**Depende de:** fase-01 (TemplateEntry.category classifica os slots, mas o detector não os consome diretamente — depende de fase-01 para estabelecer os conceitos do "3rd state")
**Visual:** false

---

## O que esta fase entrega

Módulo `skills/init/lib/migration-mode-detector.ts` com função pura `detectInitMode(targetDir)` que
retorna `{ mode: InitMode, signals: InitModeSignal[] }`. Isolado, testável via mocks de filesystem,
sem efeitos colaterais. Distingue os 4 estados: `'greenfield'`, `'migration'`, `'already-initiated'`,
`'v5-legacy'`. A fase-03 consome este módulo para expandir o SKILL.md.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/migration-mode-detector.ts` | Criar | Detector dos 4 modos de init |
| `skills/init/lib/migration-mode-detector.test.ts` | Criar | Testes unitários com mocks de filesystem |

---

## Implementacao

### Passo 1: Escrever testes RED antes de criar o módulo

Criar `skills/init/lib/migration-mode-detector.test.ts`:

```typescript
import { describe, it, expect, mock, beforeEach } from 'bun:test'
// O módulo será importado após criação — testes falham (RED) até que o arquivo exista.
import { detectInitMode, type InitMode } from './migration-mode-detector'

// Helpers para simular estrutura de diretórios via mock de fs.promises.access e fs.promises.readdir
// Pattern usado em detect-v5-legacy.test.ts (se existir) ou similar ao mock approach de bun:test.

describe('detectInitMode', () => {
  it('returns greenfield when no docs and no manifest and no legacy artifacts', async () => {
    // Simula repo limpo: nenhum arquivo existe
    const result = await detectInitMode('/fake/greenfield')
    expect(result.mode).toBe('greenfield')
  })

  it('returns already-initiated when .anti-vibe-manifest.json exists', async () => {
    // Simula repo com manifest instalado
    const result = await detectInitMode('/fake/already-initiated')
    expect(result.mode).toBe('already-initiated')
  })

  it('returns v5-legacy when .planning/ dir has content', async () => {
    // Simula repo com .planning/ não vazio
    const result = await detectInitMode('/fake/v5-legacy')
    expect(result.mode).toBe('v5-legacy')
  })

  it('returns migration when docs has 5+ non-harness md files and no manifest', async () => {
    // Simula repo com docs/ populado por humano (ADRs, design notes) sem harness
    const result = await detectInitMode('/fake/migration')
    expect(result.mode).toBe('migration')
    expect(result.signals.length).toBeGreaterThan(0)
  })

  it('returns greenfield when docs has only harness scaffold READMEs', async () => {
    // docs/ existe mas só tem exec-plans/active/README.md etc — é harness parcial, não migration
    const result = await detectInitMode('/fake/harness-partial')
    expect(result.mode).toBe('greenfield')
  })

  it('includes signal describing which docs triggered migration detection', async () => {
    const result = await detectInitMode('/fake/migration')
    const docSignal = result.signals.find((s) => s.type === 'populated-docs')
    expect(docSignal).toBeDefined()
    expect(docSignal?.count).toBeGreaterThanOrEqual(5)
  })
})
```

Rodar para confirmar RED: `bun run test -- --grep 'detectInitMode'`

### Passo 2: Tipos e contratos

```typescript
// migration-mode-detector.ts

export type InitMode =
  | 'greenfield'        // repo sem docs institucionais e sem anti-vibe
  | 'migration'         // repo com docs humanos existentes, sem anti-vibe (3rd state)
  | 'already-initiated' // .claude/.anti-vibe-manifest.json presente (modo update)
  | 'v5-legacy'         // .planning/ com conteudo ou artifacts v5 (existingDetectV5Legacy)

export type InitModeSignalType =
  | 'manifest-present'   // .anti-vibe-manifest.json detectado
  | 'v5-artifacts'       // .planning/ ou lessons-learned.md etc
  | 'populated-docs'     // docs/ tem N arquivos .md não-harness
  | 'root-md-files'      // arquivos .md na raiz (README, CONTRIBUTING, etc)

export type InitModeSignal = {
  type: InitModeSignalType
  /** Descrição legível para mostrar ao operador. */
  description: string
  /** Contagem de arquivos detectados (quando aplicável). */
  count?: number
  /** Lista de paths detectados (truncada a 5 para não poluir output). */
  paths?: string[]
}

export type InitModeResult = {
  mode: InitMode
  signals: InitModeSignal[]
}
```

### Passo 3: Implementar a função principal

```typescript
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { detectV5Legacy } from './detect-v5-legacy'

/**
 * HARNESS_MARKER_PATHS: paths que indicam que o harness já foi scaffolded.
 * Presença desses READMEs em docs/ NÃO conta como "docs populados externamente" (G2).
 */
const HARNESS_MARKER_PATHS = new Set([
  'docs/exec-plans/active/README.md',
  'docs/exec-plans/completed/README.md',
  'docs/compound/README.md',
  'docs/review-checklists/README.md',
  'docs/smoke-flows/README.md',
  'docs/references/README.md',
])

/**
 * Limiar de arquivos .md em docs/ para considerar repo como "populado externamente".
 * Excluindo os HARNESS_MARKER_PATHS, se restar >= MIN_POPULATED_DOCS arquivos → migration mode.
 */
const MIN_POPULATED_DOCS = 5

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

/**
 * Coleta arquivos .md em docs/ recursivamente, excluindo paths que são markers do harness.
 * Retorna apenas os paths que indicam conteúdo gerado por humanos, não pelo scaffold.
 */
async function collectNonHarnessDocsMd(targetDir: string): Promise<string[]> {
  const docsDir = path.join(targetDir, 'docs')
  if (!(await exists(docsDir))) return []

  const results: string[] = []

  async function walk(dir: string): Promise<void> {
    let entries: string[]
    try {
      entries = await fs.readdir(dir)
    } catch {
      return
    }
    for (const entry of entries) {
      const full = path.join(dir, entry)
      const rel = path.relative(targetDir, full).replace(/\\/g, '/')
      try {
        const stat = await fs.stat(full)
        if (stat.isDirectory()) {
          await walk(full)
        } else if (entry.endsWith('.md') && !HARNESS_MARKER_PATHS.has(rel)) {
          results.push(rel)
        }
      } catch {
        // skip inacessível
      }
    }
  }

  await walk(docsDir)
  return results
}

/**
 * Detecta o modo de inicialização do /init para o projeto em targetDir.
 *
 * Ordem de precedência (primeira correspondência vence):
 * 1. already-initiated (manifest presente)
 * 2. v5-legacy (.planning/ ou artifacts legados)
 * 3. migration (docs/ populado sem harness)
 * 4. greenfield (padrão)
 *
 * @example
 * const { mode, signals } = await detectInitMode('/path/to/project')
 * if (mode === 'migration') { // oferecer migration pipeline }
 */
export async function detectInitMode(targetDir: string): Promise<InitModeResult> {
  const signals: InitModeSignal[] = []

  // 1. Checar manifest (modo update — já iniciado)
  const manifestPath = path.join(targetDir, '.claude', '.anti-vibe-manifest.json')
  if (await exists(manifestPath)) {
    signals.push({
      type: 'manifest-present',
      description: '.claude/.anti-vibe-manifest.json found — project already initiated',
    })
    return { mode: 'already-initiated', signals }
  }

  // 2. Checar v5 legacy (delegar ao detector existente)
  const legacyState = await detectV5Legacy(targetDir)
  if (legacyState.isLegacy) {
    signals.push({
      type: 'v5-artifacts',
      description: `v5.x artifacts found: ${legacyState.artifacts.join(', ')}`,
      count: legacyState.artifacts.length,
      paths: Object.values(legacyState.paths).filter(Boolean) as string[],
    })
    return { mode: 'v5-legacy', signals }
  }

  // 3. Checar docs populados (3rd state: migration)
  const nonHarnessDocs = await collectNonHarnessDocsMd(targetDir)
  if (nonHarnessDocs.length >= MIN_POPULATED_DOCS) {
    signals.push({
      type: 'populated-docs',
      description: `${nonHarnessDocs.length} non-harness .md files found in docs/`,
      count: nonHarnessDocs.length,
      paths: nonHarnessDocs.slice(0, 5),
    })
    return { mode: 'migration', signals }
  }

  // 4. Greenfield
  return { mode: 'greenfield', signals }
}
```

### Passo 4: Verificar alinhamento com detect-v5-legacy.ts

O módulo chama `detectV5Legacy` internamente. Isso significa que o teste de `detectInitMode`
com mock para `v5-legacy` deve interceptar o filesystem (não o módulo) para simular presença
de `.planning/` com conteúdo. Usar `mock.module` do bun:test OU criar fixtures de diretório
temporário com `fs.mkdtemp`. A segunda abordagem é mais robusta e não acopla o teste à
implementação interna.

---

## Gotchas

**G1 — Ordem de precedência importa:** `already-initiated` DEVE ser verificado antes de `v5-legacy`.
Um repo pode ter ambos (parcialmente migrado). Se verificar v5 primeiro, o usuário seria enviado
para o fluxo errado (migrate em vez de update).

**G2 — collectNonHarnessDocsMd deve excluir harness markers:** Os READMEs plantados pelo scaffold
(`exec-plans/active/README.md` etc.) indicam que o harness está instalado — presença deles não é
sinal de "repo populado externamente". Sem essa exclusão, um repo em update mode poderia triggerar
migration mode se o manifest fosse deletado acidentalmente.

**G3 — Walk recursivo deve ser robusto a erros de permissão:** Em Windows, alguns diretórios podem
estar bloqueados. O `try/catch` interno no walk deve silenciar erros de acesso sem abortar a contagem.

**G5 — `detectV5Legacy` é reutilizado, não reimplementado:** Evitar duplicação da lógica de detecção
de `.planning/`. O `migration-mode-detector` delega para o detector existente para v5.

---

## Verificacao

### TDD
- [ ] RED: `migration-mode-detector.ts` não existe ainda, testes falham com ModuleNotFoundError
  - Comando: `bun run test -- --grep 'detectInitMode'`
- [ ] GREEN: módulo criado, testes passam
  - Comando: `bun run test -- --grep 'detectInitMode'`

### Checklist
- [ ] `detectInitMode` retorna `{ mode, signals }` em todos os 4 cenários
- [ ] Ordem de precedência: `already-initiated` > `v5-legacy` > `migration` > `greenfield`
- [ ] `HARNESS_MARKER_PATHS` exclui os 6 READMEs do scaffold da contagem
- [ ] `MIN_POPULATED_DOCS = 5` está declarado como constante nomeada (não magic number inline)
- [ ] `bun run tsc --noEmit` passa sem erros
- [ ] Testes passam: `bun run test`
- [ ] Lint limpo: `bun run lint`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test -- --grep 'detectInitMode'` retorna 6 testes PASS, 0 FAIL
- `bun run tsc --noEmit` retorna exit code 0

<!-- Gerado por /plan-feature em 2026-05-14 -->
