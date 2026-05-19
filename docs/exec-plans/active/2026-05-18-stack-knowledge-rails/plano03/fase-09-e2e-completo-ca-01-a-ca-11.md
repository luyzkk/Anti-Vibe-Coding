<!--
Princípio universal #5 — Comment Provenance.
Esta fase escreve código TS de teste E2E + fixtures. Comentários inline em código novo
seguem: autor + papel, YYYY-MM-DD, razão/decisão referenciada (PRD CA-NN ou D-NN).
Ex: `// 2026-05-18 (Luiz/dev): Gemfile com '~> 7.0' — fixture CA-04 warning RF11`
-->

# Fase 09: E2E completo cobrindo CA-01..CA-11 com 5 fixtures

**Plano:** 03 — Batch C + INDEX + E2E + Hardening leve
**Sizing:** 2h
**Depende de:** fase-06 (INDEX final consolidado — E2E lê presença do INDEX), fase-07 (verifier+audit aprovados — não rodar E2E sobre matrix com átomos reprovados), fase-08 (RF11 warning Rails legado IMPLEMENTADO antes do E2E — CA-04 vira GREEN imediato, sem RED cross-phase per D23). Independe da fase-10 (hardening) que vem depois.
**Visual:** false

---

## O que esta fase entrega

Suite E2E final `tests/e2e/stack-knowledge-rails-full.test.ts` (TDD rigoroso, `bun:test`) cobrindo CA-01..CA-11 do PRD via 5 fixtures distintas: **Rails 8.x moderno** (CA-01 frontmatter / CA-02 happy path init <200ms per D24 / CA-05 cross-stack skill preface), **Sinatra** (CA-03 fallback / CA-06 telemetria mesmo em fallback), **Rails 7.0 legacy** (CA-04 warning RF11 — GREEN imediato porque fase-08 já implementou — ainda copia knowledge), **Monorepo Rails+Node** (CA-07 primary=rails / secondary=nodejs-typescript / só Rails copia), **Node-only** (CA-11 regressão Node intacta). Adicionalmente: CA-09 graceful degradation (skill cross-stack quando `.claude/knowledge/INDEX.md` não existe — sem warning/erro) + CA-10 schema regression (Node+Rails atoms validam juntos sem conflito de `rails_versions`). Estende `tests/e2e/stack-knowledge-rails-tracer.test.ts` do Plano 01 fase-06 (não duplica setup tmpdir — extrai helper se útil). Suite verde = matrix Rails pronto para merge.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/e2e/stack-knowledge-rails-full.test.ts` | Create | Suite E2E principal (~250-300 linhas TS) cobrindo CA-01..CA-11 |
| `tests/e2e/__fixtures__/rails-modern-8x/Gemfile` | Create | Fixture CA-01/02/05: `gem 'rails', '~> 8.0'` |
| `tests/e2e/__fixtures__/sinatra-no-rails/Gemfile` | Create | Fixture CA-03/06: `gem 'sinatra'`, SEM `gem 'rails'` |
| `tests/e2e/__fixtures__/rails-legacy-70/Gemfile` | Create | Fixture CA-04: `gem 'rails', '~> 7.0'` |
| `tests/e2e/__fixtures__/monorepo-rails-node/Gemfile` | Create | Fixture CA-07 parte Rails |
| `tests/e2e/__fixtures__/monorepo-rails-node/package.json` | Create | Fixture CA-07 parte Node (`typescript` em devDeps) |
| `tests/e2e/__fixtures__/monorepo-rails-node/app/models/post.rb` | Create | Arquivo `.rb` para dar maioria à stack Rails |
| `tests/e2e/__fixtures__/monorepo-rails-node/frontend/index.ts` | Create | Arquivo `.ts` para popular stack secondary |
| `tests/e2e/__fixtures__/node-only/package.json` | Create | Fixture CA-11: typescript em devDeps, SEM Gemfile |

---

## Implementacao

### Passo 1: Esqueleto da suite (TDD — RED primeiro)

Antes de escrever fixtures, esboçar a suite com 11 `describe`/`test` cobrindo cada CA. Rodar `bun run test -- tests/e2e/stack-knowledge-rails-full.test.ts` — devem falhar todos por arquivo inexistente / fixtures faltando. RED estabelecido.

```typescript
// 2026-05-18 (Luiz/dev): suite E2E final cobrindo CA-01..CA-11 — alinhado com PRD §Critérios de Aceite
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { runStackKnowledgeInit } from '../../skills/init/lib/run-stack-knowledge-init'
import { detectStack } from '../../skills/init/lib/detect-stack'

const pluginRoot = path.resolve(__dirname, '../..')

function setupFixture(fixtureName: string): string {
  const target = mkdtempSync(path.join(tmpdir(), `avc-e2e-${fixtureName}-`))
  // copyTree(`tests/e2e/__fixtures__/${fixtureName}`, target) — usar helper existente
  return target
}

describe('Stack Knowledge Rails — E2E full (CA-01..CA-11)', () => {
  let target: string
  afterEach(() => { if (target) rmSync(target, { recursive: true, force: true }) })

  test('CA-01: matrix Rails populado com 14 átomos + INDEX após merge', () => {
    const matrix = path.join(pluginRoot, 'docs/knowledge/rails')
    expect(existsSync(path.join(matrix, 'INDEX.md'))).toBe(true)
    // wc -l <= 100
    expect(readFileSync(path.join(matrix, 'INDEX.md'), 'utf8').split('\n').length).toBeLessThanOrEqual(100)
    // 14 átomos
    const atoms = require('node:fs').readdirSync(path.join(matrix, 'atoms')).filter((f: string) => f.endsWith('.md'))
    expect(atoms.length).toBe(14)
  })

  test('CA-02: /init em Rails 8.x copia INDEX + 14 átomos em <200ms (D24 — relaxado de 100→200)', async () => {
    target = setupFixture('rails-modern-8x')
    const stack = await detectStack(target)
    expect(stack.primary).toBe('rails')
    const t0 = performance.now()
    const result = await runStackKnowledgeInit({ targetDir: target, pluginRoot, primary: 'rails' })
    // 2026-05-18 (Luiz/dev): D24 — limite 200ms absorve flake CI Windows com cold I/O
    expect(performance.now() - t0).toBeLessThan(200)
    expect(result.status).toBe('copied')
    expect(existsSync(path.join(target, '.claude/knowledge/INDEX.md'))).toBe(true)
  })

  // ... demais CA-03..CA-11
})
```

### Passo 2: Fixtures (5 diretórios isolados em `tests/e2e/__fixtures__/`)

**Fixture 1: `rails-modern-8x/Gemfile`** (CA-01, CA-02, CA-05)
```ruby
source 'https://rubygems.org'
gem 'rails', '~> 8.0'
gem 'puma'
gem 'sqlite3'
```

**Fixture 2: `sinatra-no-rails/Gemfile`** (CA-03, CA-06)
```ruby
source 'https://rubygems.org'
gem 'sinatra'
gem 'puma'
# DELIBERADAMENTE sem gem 'rails' — CA-03 falsoposit guard
```

**Fixture 3: `rails-legacy-70/Gemfile`** (CA-04 — warning RF11)
```ruby
source 'https://rubygems.org'
gem 'rails', '~> 7.0'
gem 'puma'
```

**Fixture 4: `monorepo-rails-node/`** (CA-07)
- `Gemfile`: `gem 'rails', '~> 8.0'`
- `package.json`: `{ "devDependencies": { "typescript": "^5.0.0" } }`
- 3 arquivos `.rb` em `app/models/` (dá maioria à stack Rails)
- 1 arquivo `.ts` em `frontend/` (gera secondary `nodejs-typescript`)

**Fixture 5: `node-only/package.json`** (CA-11 — regressão Node intacta)
```json
{
  "name": "node-only-fixture",
  "devDependencies": { "typescript": "^5.0.0" }
}
```
SEM Gemfile. Detector retorna `primary: 'node-ts'`, knowledge Node copiado normalmente.

### Passo 3: Testes por CA (GREEN — implementar até passarem)

Cobertura test-by-test:

```typescript
test('CA-03: Sinatra (Gemfile sem gem rails) → primary=unknown, knowledge NÃO copiado', async () => {
  target = setupFixture('sinatra-no-rails')
  const stack = await detectStack(target)
  expect(stack.primary).toBeNull() // ou 'unknown' — checar contrato real
  const result = await runStackKnowledgeInit({ targetDir: target, pluginRoot, primary: stack.primary })
  expect(result.status).toBe('no-matrix')
  expect(existsSync(path.join(target, '.claude/knowledge'))).toBe(false)
})

test('CA-04: Rails 7.0 legacy → knowledge copiado + warning RF11 no output (GREEN imediato — fase-08 já implementou)', async () => {
  target = setupFixture('rails-legacy-70')
  // Detector classifica como rails (gem 'rails' presente)
  const stack = await detectStack(target)
  expect(stack.primary).toBe('rails')
  // Output capturado deve conter warning legado (fase-08 — D23)
  const out = await runStackKnowledgeInit({ targetDir: target, pluginRoot, primary: 'rails' })
  expect(out.warnings).toContain('⚠️ Knowledge Rails cobre 7.1+. Alguns padrões podem não se aplicar.')
  // Assets ainda copiados
  expect(existsSync(path.join(target, '.claude/knowledge/INDEX.md'))).toBe(true)
})

test('CA-05: skill cross-stack /security cita .claude/knowledge/INDEX.md em projeto Rails populado', () => {
  target = setupFixture('rails-modern-8x')
  // Setup: /init já rodou, INDEX existe
  // Invocar getStackKnowledgePreface(target) e validar que retorna string contendo 'INDEX.md'
  // E que INDEX tem seção 'Para /security' apontando para security-csrf-and-brakeman
})

test('CA-06: telemetria stack_detected emitida com anchor_files=[Gemfile] mesmo no fallback Sinatra', async () => {
  target = setupFixture('sinatra-no-rails')
  // Hook na telemetria writer — validar que evento foi emitido com primary=null + anchor_files inclui Gemfile
})

test('CA-07: monorepo Rails+Node → primary=rails, secondary=[nodejs-typescript], só Rails copiado', async () => {
  target = setupFixture('monorepo-rails-node')
  const stack = await detectStack(target)
  expect(stack.primary).toBe('rails')
  expect(stack.secondary).toContain('nodejs-typescript')
  await runStackKnowledgeInit({ targetDir: target, pluginRoot, primary: 'rails' })
  expect(existsSync(path.join(target, '.claude/knowledge/atoms/active-record-fundamentals.md'))).toBe(true)
  // Node atoms NÃO copiados como knowledge primary
})

test('CA-09: skill cross-stack sem .claude/knowledge/ funciona gracefully', () => {
  target = setupFixture('node-only') // ou criar fixture sem .claude
  // Invocar getStackKnowledgePreface(target) — deve retornar string vazia ou padrão sem warning
})

test('CA-10: schema rails_versions opcional — atoms Node + Rails validam juntos', () => {
  // harness:validate spawned via Bun.spawn ou import direto
  // Deve retornar exit 0 sobre toda a subárvore docs/knowledge/
})

test('CA-11: projeto Node-only (sem Gemfile) — fluxo Node v6.3.2 intacto', async () => {
  target = setupFixture('node-only')
  const stack = await detectStack(target)
  expect(stack.primary).toBe('node-ts')
  const result = await runStackKnowledgeInit({ targetDir: target, pluginRoot, primary: 'node-ts' })
  expect(result.status).toBe('copied')
  // Atoms Node copiados (não Rails)
  expect(existsSync(path.join(target, '.claude/knowledge/atoms/error-handling-patterns.md'))).toBe(true)
})
```

### Passo 4: Refactor — extrair helpers se duplicação for visível

Após GREEN, se setup tmpdir é repetido em todos os testes, extrair em `tests/e2e/__helpers__/setup-fixture.ts` (ou reusar de `tests/e2e/init-tracer-bullet.test.ts` se já existe). Não duplicar `copyTree` — usar o do `copy-knowledge.ts` se exportado.

### Passo 5: Verificar suite verde + sem flakiness

Rodar `bun run test -- tests/e2e/stack-knowledge-rails-full.test.ts` 3x consecutivos. Todos PASS. Se algum teste flaky (telemetria assíncrona, race condition de tmpdir), corrigir antes de fechar a fase.

---

## Gotchas

- **G8 do plano (5 fixtures distintas):** não tentar reusar uma fixture com mutações — cada CA exige Gemfile/package.json específico. Diretórios separados em `__fixtures__/`. Tmpdir copia por teste para isolamento.
- **G11 do plano (warning RF11 — D23):** CA-04 vira GREEN imediato porque fase-08 (RF11) foi implementada ANTES desta fase. Sem RED cross-phase. Se CA-04 falha, primeiro suspeito é caller `run-stack-knowledge-init.ts` não estar chamando `extractRailsVersionWarning` (re-checar fase-08 Passo 3).
- **G12 do plano (preview keywords RF12):** se RF12 já é regressão do Node, CA-02 pode validar que output do init Rails contém preview de keywords sem fase-10 ter rodado. Confirmar antes de escrever assertion. Se RF12 NÃO é regressão automática, manter assertion frouxa aqui e tightar em fase-10.
- **Local — `detectStack` retorna `null` para primary** (D22 — contrato multi-stack): confirmar via `Grep` no `detect-stack.ts` que `result.primary` é `StackId | null`. Antes do refactor D22, era `result.id` com string `'unknown'` — não usar.
- **Local — telemetria assíncrona:** se telemetria é fire-and-forget, CA-06 precisa de await/flush antes da assertion. Reusar padrão do Node E2E (`tests/e2e/stack-knowledge-tracer-bullet.test.ts`).
- **Local — performance assertion CA-02 (<200ms — D24):** PRD pede <100ms, mas D24 (risk resolution pre-exec) relaxou para 200ms na suite real após observar flakiness CI Windows com cold I/O. Comentário inline em linhagem 2026-05-18 explica.

---

## Verificacao

### TDD

- [ ] **RED:** Suite criada com 11 testes (1 por CA), todos falham por fixtures ausentes
  - Comando: `bun run test -- tests/e2e/stack-knowledge-rails-full.test.ts`
  - Resultado esperado: `11 failed` (fixture not found / assertion failure)

- [ ] **GREEN:** Fixtures criadas + testes ajustados (RF11 já implementado em fase-08; RF12 pode vir da fase-10 se não for regressão automática), todos PASS
  - Comando: `bun run test -- tests/e2e/stack-knowledge-rails-full.test.ts`
  - Resultado esperado: `11 passed, 0 failed`

### Checklist

- [ ] `tests/e2e/stack-knowledge-rails-full.test.ts` existe com 11 testes nomeados (CA-01 a CA-11, exceto CA-08 que é audit humano coberto em fase-07)
- [ ] 5 fixtures criadas em `tests/e2e/__fixtures__/`: `rails-modern-8x`, `sinatra-no-rails`, `rails-legacy-70`, `monorepo-rails-node`, `node-only`
- [ ] `tests/e2e/__fixtures__/monorepo-rails-node/` tem Gemfile + package.json + arquivos `.rb` e `.ts`
- [ ] Suite passa 3x consecutivos sem flakiness
- [ ] `bun run lint` limpo sobre `tests/e2e/stack-knowledge-rails-full.test.ts`
- [ ] Suite cobre os 11 CA: 01, 02, 03, 04, 05, 06, 07, 09, 10, 11 (CA-08 humano em fase-07)
- [ ] Performance assertion CA-02 (<200ms — D24) passa sob ambiente padrão (incluindo CI Windows com cold I/O); comentário inline referencia D24
- [ ] Telemetria CA-06 testada com flush ou await apropriado
- [ ] Cleanup de tmpdir após cada teste (afterEach com rmSync)

---

## Criterio de Aceite

**Por maquina:**

- `bun run test -- tests/e2e/stack-knowledge-rails-full.test.ts` retorna `11 passed, 0 failed`
- `bun run lint` retorna 0 sobre o novo arquivo de teste
- 5 fixtures presentes em `tests/e2e/__fixtures__/` (`ls` retorna os 5 diretórios)
- Suite roda em <30s wall-clock (alvo razoável para 11 testes E2E com tmpdir)

**Por humano:**

- Reviewer roda a suite localmente — verde.
- Reviewer lê CA-04 e CA-07 (os mais não-triviais) — entende fluxo sem precisar abrir o código de produção.
- Reviewer confirma que fixtures são MÍNIMAS — sem arquivos a mais que confundem o que está sendo testado.

---

<!-- Gerado por /plan-feature (sub-agente isolado) em 2026-05-18 -->
