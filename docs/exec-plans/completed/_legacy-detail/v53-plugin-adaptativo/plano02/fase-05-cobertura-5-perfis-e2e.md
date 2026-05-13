# Fase 05: Cobertura E2E dos 5 Perfis

**Plano:** 02 — Architecture Detector
**Sizing:** 1.5h
**Depende de:** fase-01, 02, 03, 04 (toda a stack do detector)
**Visual:** false

---

## O que esta fase entrega

Suite E2E que cria 5 fixtures (uma por perfil) em diretorios temporarios reais com estrutura de pastas + arquivos mock representativos, roda o fluxo completo (`readSrcTree -> detectArchitecture -> writeArchitectureProfile`) e verifica que o manifest + markdown gerados batem com o esperado. CA-01 fica explicitamente coberto: fixture `clean-architecture-ritual` resulta em `confidence >= 80%`. Cobre D4 (5 perfis canonicos).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `anti-vibe-coding/skills/lib/architecture-detector/__fixtures__/projects/clean-arch/...` | Create | Fixture de projeto com domain/, application/use-cases, infrastructure/, presentation/ |
| `anti-vibe-coding/skills/lib/architecture-detector/__fixtures__/projects/mvc-flat/...` | Create | Fixture com controllers/, models/, services/, views/ |
| `anti-vibe-coding/skills/lib/architecture-detector/__fixtures__/projects/vertical-slice/...` | Create | Fixture com features/billing/{domain,api,ui}, shared/ |
| `anti-vibe-coding/skills/lib/architecture-detector/__fixtures__/projects/nextjs/...` | Create | Fixture com app/(dashboard)/page.tsx, app/api/health/route.ts, components/, lib/ |
| `anti-vibe-coding/skills/lib/architecture-detector/__fixtures__/projects/unknown/...` | Create | Fixture com pastas randomicas sem padrao |
| `anti-vibe-coding/skills/lib/architecture-detector/__fixtures__/projects/build-fixture.ts` | Create | Helper que copia uma fixture para diretorio tmp e retorna o path |
| `anti-vibe-coding/skills/lib/architecture-detector/e2e.test.ts` | Create | Suite E2E rodando o fluxo completo nas 5 fixtures |

---

## Implementacao

### Passo 1: Estrutura de diretorios das fixtures

Cada fixture e um mini-projeto real (nao `SrcTreeNode` em memoria). Conteudo dos arquivos e suficiente para os imports baterem.

```
__fixtures__/projects/clean-arch/
  src/
    domain/
      aggregates/
        order.ts                      # export class Order { /* ... */ }
      value-objects/
        money.ts
    application/
      use-cases/
        create-order.ts               # import { Order } from '@/domain/aggregates/order'
        list-orders.ts                # import { OrderRepository } from '@/domain/repositories/order-repository'
      ports/
        order-repository.ts
    infrastructure/
      repositories/
        prisma-order-repo.ts          # implements OrderRepository
    presentation/
      controllers/
        order-controller.ts           # import { CreateOrderUseCase } from '@/application/use-cases/create-order'

__fixtures__/projects/mvc-flat/
  src/
    controllers/
      user-controller.ts              # import { UserService } from '@/services/user-service'
      order-controller.ts
    models/
      user.ts
      order.ts
    services/
      user-service.ts                 # import { UserModel } from '@/models/user'
      order-service.ts
    views/
      user-view.ts

__fixtures__/projects/vertical-slice/
  src/
    features/
      billing/
        domain/
          invoice.ts
        api/
          create-invoice.ts           # import { Invoice } from './domain/invoice'; import { logger } from '@/shared/lib/logger'
        ui/
          invoice-form.tsx
      onboarding/
        domain/
          step.ts
        api/
          start-onboarding.ts
    shared/
      lib/
        logger.ts
      ui/
        button.tsx

__fixtures__/projects/nextjs/
  src/
    app/
      layout.tsx                      # 'use client' export default function RootLayout(...)
      page.tsx
      (dashboard)/
        layout.tsx
        page.tsx                      # import { redirect } from 'next/navigation'
      api/
        health/
          route.ts                    # import { NextResponse } from 'next/server'
    components/
      header.tsx
    lib/
      utils.ts

__fixtures__/projects/unknown/
  src/
    stuff/
      a.ts
      b.ts
    misc/
      c.ts
    random/
      d.ts
```

### Passo 2: Helper de build de fixture (copia para tmp)

```typescript
// __fixtures__/projects/build-fixture.ts

import { cpSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), '.')

export type FixtureName = 'clean-arch' | 'mvc-flat' | 'vertical-slice' | 'nextjs' | 'unknown'

export function buildFixture(name: FixtureName): string {
  const tmp = mkdtempSync(join(tmpdir(), `arch-e2e-${name}-`))
  cpSync(join(FIXTURES_DIR, name), tmp, { recursive: true })
  return tmp
}
```

### Passo 3: Suite E2E

```typescript
// e2e.test.ts

import { afterEach, describe, expect, test } from 'bun:test'
import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { readSrcTree } from './read-src-tree'
import { detectArchitecture } from './detect-architecture'
import { writeArchitectureProfile } from './write-architecture-profile'
import { buildFixture, type FixtureName } from './__fixtures__/projects/build-fixture'

const tmpDirs: string[] = []
afterEach(() => {
  while (tmpDirs.length) rmSync(tmpDirs.pop()!, { recursive: true, force: true })
})

function runFullFlow(fixture: FixtureName) {
  const cwd = buildFixture(fixture)
  tmpDirs.push(cwd)
  const srcResult = readSrcTree(cwd)
  if (srcResult.kind !== 'ok') throw new Error(`expected ok, got ${srcResult.kind}`)
  const reader = (path: string) => { try { return readFileSync(path, 'utf-8') } catch { return '' } }
  const result = detectArchitecture(srcResult.tree, reader)
  writeArchitectureProfile(result, cwd)
  return { cwd, result }
}

describe('Architecture Detector E2E', () => {
  test('CA-01: clean-architecture-ritual fixture detects with confidence >= 80%', () => {
    const { cwd, result } = runFullFlow('clean-arch')
    expect(result.profile).toBe('clean-architecture-ritual')
    expect(result.confidence).toBeGreaterThanOrEqual(80)
    const manifest = JSON.parse(readFileSync(join(cwd, '.claude/.anti-vibe-manifest.json'), 'utf-8'))
    expect(manifest.architectureProfile.profile).toBe('clean-architecture-ritual')
  })

  test('mvc-flat fixture detects mvc-flat profile', () => {
    const { result } = runFullFlow('mvc-flat')
    expect(result.profile).toBe('mvc-flat')
    expect(result.confidence).toBeGreaterThanOrEqual(70)
  })

  test('vertical-slice fixture detects vertical-slice profile', () => {
    const { result } = runFullFlow('vertical-slice')
    expect(result.profile).toBe('vertical-slice')
    expect(result.confidence).toBeGreaterThanOrEqual(70)
  })

  test('nextjs fixture detects nextjs-app-router profile (G1)', () => {
    const { result } = runFullFlow('nextjs')
    expect(result.profile).toBe('nextjs-app-router')
    expect(result.confidence).toBeGreaterThanOrEqual(70)
  })

  test('unknown fixture detects unknown-mixed with low confidence', () => {
    const { result } = runFullFlow('unknown')
    expect(result.profile).toBe('unknown-mixed')
    expect(result.confidence).toBeLessThan(80)
  })

  test('all 5 profiles produce manifest with valid schemaVersion', () => {
    for (const name of ['clean-arch', 'mvc-flat', 'vertical-slice', 'nextjs', 'unknown'] as FixtureName[]) {
      const { cwd } = runFullFlow(name)
      const manifest = JSON.parse(readFileSync(join(cwd, '.claude/.anti-vibe-manifest.json'), 'utf-8'))
      expect(manifest.architectureProfile.schemaVersion).toBe(1)
    }
  })

  test('all 5 profiles produce architecture-profile.md', () => {
    for (const name of ['clean-arch', 'mvc-flat', 'vertical-slice', 'nextjs', 'unknown'] as FixtureName[]) {
      const { cwd } = runFullFlow(name)
      const md = readFileSync(join(cwd, '.claude/architecture-profile.md'), 'utf-8')
      expect(md.length).toBeGreaterThan(50)  // nao e arquivo vazio
    }
  })

  test('end-to-end flow completes in < 500ms per fixture (RNF performance)', () => {
    const start = performance.now()
    runFullFlow('nextjs')
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(500)
  })
})
```

### Passo 4: Conteudo minimo dos arquivos das fixtures

Cada arquivo `.ts`/`.tsx` precisa de conteudo suficiente para os imports baterem com `IMPORT_PATTERNS` da fase-02. Exemplos por perfil ja inseridos no Passo 1.

Validacao manual: `cat __fixtures__/projects/clean-arch/src/application/use-cases/create-order.ts` deve mostrar `import ... from '@/domain/...'`.

---

## Gotchas

- **G1 do README — Next.js vs vertical-slice ambiguidade:** fixture `nextjs` precisa ter `app/page.tsx` E NAO ter `features/<X>/`. Se ambos existirem, o teste vai falhar (priority lookup). Mantemos canonico.
- **G5 do README — performance:** teste explicito de `< 500ms` valida RNF do PRD. Se falhar, investigar amostragem de imports (provavel: `pickCandidates` esta listando arquivos demais).
- **G7 do README — fixtures sao arquivos reais:** NAO `SrcTreeNode` em memoria. Esta fase precisa de IO real para validar `readSrcTree`. Diferente das fases 01-02 que usam fixtures em memoria.
- **Local — `cpSync` requer Bun >= 1.0:** confirmar versao do Bun no `package.json` do plugin. Se < 1.0, usar `fs.cpSync` do Node (`node:fs`).
- **Local — limpeza de tmp dirs:** `afterEach` desempilha `tmpDirs`. Se um teste lancar antes de pushar, vaza tmp dir — aceitavel, OS limpa.
- **Local — fixtures versionadas no git:** sao parte do plugin. Usar `.gitkeep` em pastas vazias se houver. Nao adicionar `node_modules` ou builds nas fixtures.

---

## Verificacao

### TDD

Esta fase nao tem RED-GREEN classico — e suite E2E que valida o trabalho ja feito nas fases 01-04. Ainda assim:

- [ ] **RED:** Antes de criar fixtures, rodar `e2e.test.ts` falha com `ENOENT` (fixtures nao existem).
  - Comando: `bun run test --grep 'Architecture Detector E2E'`
  - Resultado esperado: 8 falhas

- [ ] **GREEN:** Apos criar as 5 fixtures, todos os 8 testes passam.
  - Comando: `bun run test --grep 'Architecture Detector E2E'`
  - Resultado esperado: `8 passed, 0 failed`

### Checklist

- [ ] As 5 fixtures de projeto existem em `__fixtures__/projects/<nome>/src/...`
- [ ] Cada fixture tem entre 5 e 12 arquivos (suficiente para amostragem, nao excessivo)
- [ ] CA-01 explicitamente coberto: `clean-arch` retorna `confidence >= 80%`
- [ ] Os outros 4 perfis tambem detectam corretamente (com threshold >= 70% para nao-canonicos)
- [ ] `unknown-mixed` detecta com `confidence < 80%`
- [ ] Performance `< 500ms` por fixture
- [ ] Suite completa do plano passa: `bun run test --grep 'classifyByFolders|sampleImports|computeConfidence|detectArchitecture|writeArchitectureProfile|Architecture Detector E2E'`
- [ ] Lint limpo: `bun run lint`
- [ ] TypeCheck: `bun run typecheck`

---

## Criterio de Aceite

**Por maquina:**
- `bun run test --grep 'Architecture Detector E2E'` retorna `8 passed, 0 failed`
- `bun run test` (suite completa do detector) retorna 0 falhas
- Comando combinado dos cinco perfis: cada `runFullFlow(<perfil>)` produz `manifest.architectureProfile.profile === <perfil esperado>`

**Por humano:**
- Inspecao visual do markdown gerado para cada perfil mostra signals/imports plausiveis
- Tempo total da suite E2E `bun run test --grep 'E2E'` < 5 segundos (5 fixtures × 1s margem)

---

<!-- Gerado por /plan-feature em 2026-05-04 -->
