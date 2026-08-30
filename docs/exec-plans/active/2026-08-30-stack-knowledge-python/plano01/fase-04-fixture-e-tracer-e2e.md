<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
autor + papel, YYYY-MM-DD, decisão/RF referenciado.
-->

# Fase 04: Fixture FastAPI + variante requirements-only + tracer e2e

**Plano:** 01 — Infra + Validador + Piloto + Tracer Bullet
**Sizing:** 2h
**Depende de:** fase-03 (piloto commitado — o tracer asserta o átomo copiado)
**Visual:** false

---

## O que esta fase entrega

Prova executável da Premissa 1 do PRD: `/init` num projeto Python completa **sem AbortError**,
grava `primary='python'` e copia INDEX + piloto (CA-02); variante requirements-only também
detecta e copia (CA-11). É o go/no-go para investir nos 17 átomos restantes (RF6).

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `tests/fixtures/python-fastapi-fixture/pyproject.toml` | Create | fastapi + `requires-python = ">=3.12"` |
| `tests/fixtures/python-fastapi-fixture/app/main.py` | Create | App FastAPI mínima (anchor realista) |
| `tests/fixtures/python-requirements-fixture/requirements.txt` | Create | Variante CA-11 (sem pyproject) |
| `tests/fixtures/python-requirements-fixture/main.py` | Create | 1 arquivo .py mínimo |
| `tests/e2e/stack-knowledge-python-tracer.test.ts` | Create | Tracer e2e (espelho do rails-tracer) |

Zero mudança em `skills/init/lib/` — se o tracer falhar, o bug está no scaffold/infra, não se
corrige "ajustando o teste".

---

## Implementacao

### Passo 1: Fixture FastAPI

`tests/fixtures/python-fastapi-fixture/pyproject.toml`:

```toml
# 2026-08-30 (Luiz/dev): fixture CA-02 — pyproject com fastapi + requires-python >= 3.12
# (sem warning de versao, CA-04 lado negativo) — RF6 do PRD stack-knowledge-python
[project]
name = "python-fastapi-fixture"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = ["fastapi>=0.110", "uvicorn[standard]>=0.30"]
```

`tests/fixtures/python-fastapi-fixture/app/main.py`:

```python
# 2026-08-30 (Luiz/dev): app minima — so precisa existir como arquivo-fonte .py
# para contagem multi-stack (CA-07 herdado) — RF6 do PRD stack-knowledge-python
from fastapi import FastAPI

app = FastAPI()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
```

`requires-python = ">=3.12"` é escolha deliberada: quando a fase-05 introduzir o warning
legado, esta fixture continua SEM warning (CA-04 lado negativo) — o tracer já asserta
`warnings` ausente e permanece válido.

### Passo 2: Variante requirements-only (CA-11)

`tests/fixtures/python-requirements-fixture/requirements.txt`:

```
# 2026-08-30 (Luiz/dev): variante CA-11 — sem pyproject, sem marker de versao => sem warning
fastapi>=0.110
uvicorn[standard]>=0.30
```

`tests/fixtures/python-requirements-fixture/main.py`: mesmo conteúdo mínimo do Passo 1
(pode omitir o subdiretório `app/`).

### Passo 3: Tracer e2e

`tests/e2e/stack-knowledge-python-tracer.test.ts` — espelho estrutural de
`tests/e2e/stack-knowledge-rails-tracer.test.ts` (mesmos imports, mesmo padrão
mkdtemp/afterEach), com a diferença de que aqui a fixture é COPIADA para tmpdir (G6):

```typescript
// 2026-08-30 (Luiz/dev): E2E tracer Python — Plano01 fase-04.
// Prova CA-02 (init primary=python copia INDEX + piloto SEM AbortError — mata o bug
//   copy-knowledge.ts:81 com matrix mapeada e pasta ausente),
//      CA-11 (requirements-only detecta e copia),
//      regressao Node (projeto TS puro segue intacto).
// Alinhado com D10 + Premissa 1 do PRD stack-knowledge-python, RF6.

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, cpSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { runStackKnowledgeInit } from '../../skills/init/lib/run-stack-knowledge-init'
import { validateAtomFrontmatter } from '../../skills/init/lib/atoms-frontmatter-validator'

const PLUGIN_ROOT = join(import.meta.dir, '..', '..')
const FASTAPI_FIXTURE = join(import.meta.dir, '..', 'fixtures', 'python-fastapi-fixture')
const REQUIREMENTS_FIXTURE = join(import.meta.dir, '..', 'fixtures', 'python-requirements-fixture')

describe('stack-knowledge Python tracer bullet (Plano 01 fase-04)', () => {
  let project: string

  beforeEach(() => { project = mkdtempSync(join(tmpdir(), 'tracer-python-')) })
  afterEach(() => { rmSync(project, { recursive: true, force: true }) })

  it('CA-02: fixture FastAPI -> primary=python, INDEX + piloto copiados, SEM AbortError', async () => {
    // G6: copiar fixture -> tmpdir; init grava .claude/ no target e a fixture fica imutavel
    cpSync(FASTAPI_FIXTURE, project, { recursive: true })

    // A resolucao sem throw E a prova anti-AbortError (copy-knowledge.ts:81 lancava aqui)
    const result = await runStackKnowledgeInit({
      targetDir: project,
      pluginRoot: PLUGIN_ROOT,
      logger: () => {},
    })

    expect(result.stackPrimary).toBe('python')
    expect(result.copyResult.status).toBe('copied')
    // G5: atomCount dinamico >= 1 — NAO hardcodear 18 (e2e full do Plano 04 valida 18/18)
    expect(result.copyResult.atomCount).toBeGreaterThanOrEqual(1)

    expect(existsSync(join(project, '.claude', 'knowledge', 'INDEX.md'))).toBe(true)
    expect(existsSync(join(project, '.claude', 'knowledge', 'atoms', 'async-and-concurrency.md'))).toBe(true)

    const atom = readFileSync(join(project, '.claude', 'knowledge', 'atoms', 'async-and-concurrency.md'), 'utf-8')
    expect(atom).toContain('stack: python')
    expect(atom).toContain("python_versions: ['>=3.11']")

    // CA-04 lado negativo (forward-compat com fase-05): >=3.12 nunca gera warning de versao
    expect(result.warnings).toBeUndefined()
  })

  it('CA-11: requirements-only -> python detectado, knowledge copiado, sem warning de versao', async () => {
    cpSync(REQUIREMENTS_FIXTURE, project, { recursive: true })

    const result = await runStackKnowledgeInit({ targetDir: project, pluginRoot: PLUGIN_ROOT, logger: () => {} })

    expect(result.stackPrimary).toBe('python')
    expect(result.copyResult.status).toBe('copied')
    expect(existsSync(join(project, '.claude', 'knowledge', 'INDEX.md'))).toBe(true)
    expect(result.warnings).toBeUndefined()
  })

  it('regressao Node: projeto TS puro continua entregando Node knowledge, nada de python', async () => {
    writeFileSync(
      join(project, 'package.json'),
      JSON.stringify({ name: 'fixture-node', devDependencies: { typescript: '^5.0.0' } }, null, 2),
    )
    writeFileSync(join(project, 'tsconfig.json'), '{ "compilerOptions": { "strict": true } }')

    const result = await runStackKnowledgeInit({ targetDir: project, pluginRoot: PLUGIN_ROOT, logger: () => {} })

    expect(result.stackPrimary).toBe('nodejs-typescript')
    expect(existsSync(join(project, '.claude', 'knowledge', 'atoms', 'type-system-idioms.md'))).toBe(true)
    expect(existsSync(join(project, '.claude', 'knowledge', 'atoms', 'async-and-concurrency.md'))).toBe(false)
  })

  it('regression: piloto copiado passa validateAtomFrontmatter (loop fase-02 -> fase-03 fechado)', async () => {
    cpSync(FASTAPI_FIXTURE, project, { recursive: true })
    await runStackKnowledgeInit({ targetDir: project, pluginRoot: PLUGIN_ROOT, logger: () => {} })

    const validation = validateAtomFrontmatter(join(project, '.claude', 'knowledge', 'atoms', 'async-and-concurrency.md'))
    expect(validation.errors).toEqual([])
    expect(validation.valid).toBe(true)
  })
})
```

### Passo 4: Rodar, verificar working tree limpo e commitar (commit próprio)

```
bun test tests/e2e/stack-knowledge-python-tracer.test.ts
bun test
bun run typecheck
git status   # fixtures NAO podem ter .claude/ gerado dentro (G6)
git add tests/fixtures/python-fastapi-fixture tests/fixtures/python-requirements-fixture tests/e2e/stack-knowledge-python-tracer.test.ts
git commit -m "test(python-knowledge): fixtures FastAPI/requirements-only + tracer e2e sem AbortError (RF6, CA-02, CA-11)"
```

---

## Gotchas

- **G6 do README:** SEMPRE `cpSync(fixture, tmpdir)` antes do init. Rodar init direto na
  fixture cria `tests/fixtures/**/.claude/` e suja o repo — se `git status` mostrar isso,
  apagar e corrigir o teste.
- **G5 do README:** `atomCount` assertado como `>= 1`, nunca `=== 18` (nem `=== 1` — os
  Planos 02-04 adicionam átomos e este tracer deve continuar verde sem edição).
- **Local:** a fixture FastAPI NÃO pode conter `package.json`/`Gemfile` — a ordem dos PROBES
  (`detect-stack.ts:164`) coloca python por último; qualquer anchor JS/Ruby roubaria o primary.
- **Local:** sem asserção de budget de tempo (ex: <100ms) no teste — precedente 2026-08-17 do
  rails-tracer: "wall-clock sob carga nao e determinismo". O SLA <100ms do PRD é herdado da
  infra, não re-medido aqui.
- **Local:** se a fase-00 catalogou golden/teste que quebra com a NOVA pasta de fixture
  (improvável — fixtures não entram em goldens), corrigir aqui e registrar no MEMORY.md.
- **Windows:** `cpSync` recursivo funciona no Bun/Windows; caminhos sempre via `join()` —
  nunca concatenar com `/`.

---

## Verificacao

### TDD

- [ ] **RED:** escrever o tracer ANTES de conferir — rodar contra o commit da fase-03.
      Se a infra estiver correta, ele já nasce verde (é prova de premissa, não de código novo
      desta fase); se nascer VERMELHO, a Premissa 1 falhou → PARAR o plano e investigar a
      infra antes de qualquer átomo novo (é exatamente o propósito do tracer bullet)
  - Comando: `bun test tests/e2e/stack-knowledge-python-tracer.test.ts`

- [ ] **GREEN:** 4 testes do tracer passam
  - Resultado esperado: `4 pass, 0 fail`

### Checklist

- [ ] `pyproject.toml` da fixture tem `fastapi` nas dependencies e `requires-python = ">=3.12"`
- [ ] Variante requirements-only sem `pyproject.toml` (senão CA-11 não testa nada)
- [ ] CA-02 verde: primary=python, status=copied, INDEX + piloto no `.claude/knowledge/`
- [ ] CA-11 verde: requirements-only detecta, copia e `warnings` undefined
- [ ] Regressão Node verde (CA-09 parcial — full no Plano 04)
- [ ] `git status` limpo de `.claude/` dentro de `tests/fixtures/` (G6)
- [ ] Testes passam: `bun test` (suite completa — inclui rails-tracer e nextjs-tracer intactos)
- [ ] TypeCheck: `bun run typecheck`
- [ ] Commit próprio feito (fora do bundle)

---

## Criterio de Aceite

**Por maquina:**
- `bun test tests/e2e/stack-knowledge-python-tracer.test.ts` retorna `4 pass, 0 fail`
- `bun test` completo retorna 0 fail (nenhuma regressão nas suites Rails/Node/Next)

**Por humano:**
- Confirmação explícita no MEMORY.md: "Premissa 1 provada — infra funciona com
  primary='python' sem mudança de código core" (é o go para os Planos 02-04)

---

<!-- Gerado por /plan-feature em 2026-08-30 -->
