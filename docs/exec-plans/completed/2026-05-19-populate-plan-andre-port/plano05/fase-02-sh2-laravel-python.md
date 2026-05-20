<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-19 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
-->

# Fase 02: `LARAVEL_CANDIDATES` + `PYTHON_CANDIDATES` (SH-2)

**Plano:** 05 — Gate completo + Should Haves + compound + goldens
**Sizing:** 1h
**Depende de:** Nenhuma (independente das outras fases do Plano 05; arquivos disjuntos)
**Visual:** false

---

## O que esta fase entrega

Adicionar `LARAVEL_CANDIDATES` e `PYTHON_CANDIDATES` em `skills/init/lib/stack-aware-input-paths.ts` cobrindo paths do scaffold padrao de cada stack. Atualizar `pickStaticMap()` para essas 2 stacks **sairem do default `GENERIC_CANDIDATES`** e usarem seus mapas dedicados. Cumpre SH-2 do PRD.

Sem inventar paths — apenas o que existe no scaffold padrao do `composer create-project laravel/laravel` (Laravel) e do `poetry new` / `cookiecutter pypackage` (Python). Convencoes de equipe (`app/Services/`, `app/Repositories/`, `src/services/`) ficam **fora** desta fase.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/stack-aware-input-paths.ts` | Modify | Adicionar `LARAVEL_CANDIDATES` (apos `NODE_TS_CANDIDATES`, antes de `GENERIC_CANDIDATES`); adicionar `PYTHON_CANDIDATES` (apos `LARAVEL_CANDIDATES`); modificar `pickStaticMap()` (linha 211-223) para retornar os mapas novos quando `primary === 'laravel'` ou `'python'`. |
| `skills/init/lib/stack-aware-input-paths.test.ts` | Modify | 2 unit tests novos: "Laravel: ARCHITECTURE.md retorna app/, config/, routes/web.php" + "Python: ARCHITECTURE.md retorna src/, pyproject.toml". Sub-asserts cobrindo cobertura minima (>= 4 docs canonicos por stack). |
| `tests/fixtures/stack-aware/laravel/` (opcional) | Create | Stubs minimos: `composer.json`, `app/Http/Controllers/.gitkeep`, `app/Models/.gitkeep`, `routes/web.php`, `config/.gitkeep`, `database/migrations/.gitkeep`. Apenas se os 2 tests novos exigirem `exists: true` (caso CA-02-equivalente para Laravel) — caso contrario, basta `tests/fixtures/stack-aware/empty/` (`exists: false` aceitavel para esta fase, ja que CA-02 mecanico cobre apenas Next.js+Supabase). |
| `tests/fixtures/stack-aware/python/` (opcional) | Create | Stubs minimos: `pyproject.toml`, `src/.gitkeep`, `tests/.gitkeep`. Mesma logica do Laravel. |

Estado esperado apos esta fase: `stackAwareInputPaths(cwd, 'laravel')` retorna mapa com pelo menos 4 docs canonicos cobertos (ARCHITECTURE, SECURITY, RELIABILITY, CODE_STYLE) — paths podem ter `exists: false` em greenfield (aceitavel — CA-02 nao se estende para Laravel/Python neste PRD).

---

## Implementacao

### Passo 1: Reler estado atual do `pickStaticMap`

```powershell
# Confirmar lugar exato do switch (linha 211-223 do arquivo atual)
Select-String -Pattern "function pickStaticMap" -Path skills/init/lib/stack-aware-input-paths.ts
```

Esperado: 1 match. Linha do switch tem 5 cases hoje (`nextjs`, `rails`, `node-ts`, e cases compostos `laravel|python|unknown|null|default → GENERIC`).

### Passo 2: Definir `LARAVEL_CANDIDATES`

Inserir apos `NODE_TS_CANDIDATES` (linha ~144 do arquivo). **Sem inventar paths** — referencia: scaffold de `composer create-project laravel/laravel my-app` (versao 11.x atual).

```typescript
// 2026-05-19 (Luiz/dev): Plano 05 fase-02 do PRD populate-plan-andre-port (SH-2).
// Paths sao do scaffold padrao `composer create-project laravel/laravel` (versao 11.x).
// NAO incluir convencoes de equipe (Modules/, app/Services/, app/Repositories/) —
// G4 do README do plano 05.
const LARAVEL_CANDIDATES: StackCandidates = {
  'ARCHITECTURE.md': [
    'composer.json',
    'app/Http/Controllers/',
    'app/Models/',
    'app/Providers/',
    'config/app.php',
    'routes/web.php',
    'routes/api.php',
    'bootstrap/app.php',
  ],
  'docs/SECURITY.md': [
    'app/Http/Middleware/',
    'app/Http/Kernel.php',
    'config/auth.php',
    'config/cors.php',
    '.env.example',
    'routes/web.php',
  ],
  'docs/RELIABILITY.md': [
    'database/migrations/',
    'app/Console/Commands/',
    'app/Jobs/',
    'config/database.php',
    'config/queue.php',
    'config/logging.php',
  ],
  'docs/CODE_STYLE.md': [
    'composer.json',
    'phpunit.xml',
    '.php-cs-fixer.php',
    'pint.json',
  ],
  'docs/FRONTEND.md': [
    'resources/views/',
    'resources/js/',
    'resources/css/',
    'vite.config.js',
    'webpack.mix.js',
  ],
  'docs/DESIGN.md': [
    'resources/views/',
    'resources/css/',
    'public/css/',
  ],
  'AGENTS.md': [
    'composer.json',
    'README.md',
    'CLAUDE.md',
  ],
  'CLAUDE.md': [
    'composer.json',
    'README.md',
    'AGENTS.md',
  ],
  'README.md': [
    'composer.json',
    'routes/web.php',
    'app/Http/Controllers/',
  ],
  'docs/PRODUCT_SENSE.md': [
    'README.md',
    'composer.json',
    'resources/views/',
  ],
}
```

**Decisao consciente:** `docs/PLANS.md`, `docs/QUALITY_SCORE.md`, `docs/STATE.md`, `docs/design-docs/core-beliefs.md` **NAO** ganham entry em `LARAVEL_CANDIDATES`. Razao: G5 do Plano 04 README — sao docs de PROCESSO, sem evidencia natural no codigo de framework. O fallback do mapa (key ausente → `result.get(key)` retorna `undefined` → renderer emite "_(Nenhum path candidato para este doc no stack detectado.)_") e o comportamento correto.

### Passo 3: Definir `PYTHON_CANDIDATES`

Inserir apos `LARAVEL_CANDIDATES`. **Sem assumir framework** (G5 do README do Plano 05) — paths sao do Python "vanilla" estruturado.

```typescript
// 2026-05-19 (Luiz/dev): Plano 05 fase-02 do PRD populate-plan-andre-port (SH-2).
// Paths neutros (sem assumir Django/Flask/FastAPI). Scaffolds referencia:
// - `poetry new my-app` (cria src/{pkg}/ e tests/)
// - `cookiecutter pypackage` (estrutura similar)
// Frameworks especificos viram PYTHON_DJANGO_EXTRA/PYTHON_FASTAPI_EXTRA em iteracao futura
// (G5 do README do plano 05).
const PYTHON_CANDIDATES: StackCandidates = {
  'ARCHITECTURE.md': [
    'pyproject.toml',
    'setup.py',
    'setup.cfg',
    'src/',
    'app/',
    'main.py',
    '__init__.py',
  ],
  'docs/SECURITY.md': [
    'pyproject.toml',
    '.env.example',
    'requirements.txt',
  ],
  'docs/RELIABILITY.md': [
    'tests/',
    'alembic/versions/',
    'logging.conf',
    'Makefile',
  ],
  'docs/CODE_STYLE.md': [
    'pyproject.toml',
    '.flake8',
    '.pre-commit-config.yaml',
    'tox.ini',
    'ruff.toml',
  ],
  'AGENTS.md': [
    'pyproject.toml',
    'README.md',
    'CLAUDE.md',
  ],
  'CLAUDE.md': [
    'pyproject.toml',
    'README.md',
    'AGENTS.md',
  ],
  'README.md': [
    'pyproject.toml',
    'setup.py',
    'requirements.txt',
  ],
  'docs/PRODUCT_SENSE.md': [
    'README.md',
    'pyproject.toml',
  ],
}
```

### Passo 4: Atualizar `pickStaticMap()`

Modificar o switch para distribuir `'laravel'` e `'python'` aos mapas dedicados:

```typescript
/**
 * Seleciona o mapa estatico de candidatos pelo stack primario detectado.
 * unknown e null caem no GENERIC_CANDIDATES.
 * 2026-05-19 (Luiz/dev): Plano 05 fase-02 — Laravel e Python agora tem mapas dedicados (SH-2).
 */
function pickStaticMap(primary: StackId | null): StackCandidates {
  switch (primary) {
    case 'nextjs': return NEXTJS_CANDIDATES
    case 'rails': return RAILS_CANDIDATES
    case 'node-ts': return NODE_TS_CANDIDATES
    case 'laravel': return LARAVEL_CANDIDATES
    case 'python': return PYTHON_CANDIDATES
    case 'unknown':
    case null:
    default:
      return GENERIC_CANDIDATES
  }
}
```

**Observacao G3 do README:** switch passa de 5 cases para 7 cases. Continua legivel — nao refatorar para hash map nesta fase.

### Passo 5: Validar que `StackId` inclui `'laravel'` e `'python'`

```powershell
Select-String -Pattern "export type StackId" -Path skills/init/lib/detect-stack.ts -Context 0,5
```

Esperado: union type ja inclui `'laravel'` e `'python'` (D22 do PRD anterior coberto). Se nao incluir, **parar** — Plano 05 fase-02 depende dessa cobertura. Sinalizar ao dev.

### Passo 6: Adicionar unit tests em `stack-aware-input-paths.test.ts`

Localizar a secao de tests por stack (apos os tests de Next.js, Rails, Node-TS). Adicionar:

```typescript
// 2026-05-19 (Luiz/dev): Plano 05 fase-02 do PRD populate-plan-andre-port (SH-2).
// Cobertura minima de Laravel e Python — sem CA-02 (CA-02 escopo eh Next.js+Supabase only).

it('returns Laravel-specific paths when primary is laravel', async () => {
  const result = await stackAwareInputPaths(path.join(FIXTURES, 'empty'), 'laravel')
  const arch = result.get('ARCHITECTURE.md') ?? []
  // Esperado: paths Laravel-especificos (composer.json, app/, routes/), nao paths Rails ou genericos.
  const paths = arch.map(p => p.path)
  expect(paths).toContain('composer.json')
  expect(paths).toContain('app/Http/Controllers/')
  expect(paths).toContain('routes/web.php')
  // NAO deve conter paths Rails (Gemfile, app/controllers/) — esses sao do RAILS_CANDIDATES.
  expect(paths).not.toContain('Gemfile')
})

it('Laravel cobre >= 4 docs canonicos (SH-2 cobertura minima)', async () => {
  const result = await stackAwareInputPaths(path.join(FIXTURES, 'empty'), 'laravel')
  const docsCobertos = Array.from(result.keys())
  // 2026-05-19 (Luiz/dev): SH-2 requer cobertura significativa, nao exaustiva.
  // 4 docs base + extensoes (AGENTS, CLAUDE, README, PRODUCT_SENSE) = >= 8 esperado.
  expect(docsCobertos.length).toBeGreaterThanOrEqual(8)
  // Docs core esperados
  expect(docsCobertos).toContain('ARCHITECTURE.md')
  expect(docsCobertos).toContain('docs/SECURITY.md')
  expect(docsCobertos).toContain('docs/RELIABILITY.md')
  expect(docsCobertos).toContain('docs/CODE_STYLE.md')
})

it('returns Python-specific paths when primary is python', async () => {
  const result = await stackAwareInputPaths(path.join(FIXTURES, 'empty'), 'python')
  const arch = result.get('ARCHITECTURE.md') ?? []
  const paths = arch.map(p => p.path)
  expect(paths).toContain('pyproject.toml')
  expect(paths).toContain('src/')
  // NAO deve conter manage.py (Django) nem wsgi.py (assumindo framework) — G5 do README plano 05.
  expect(paths).not.toContain('manage.py')
  expect(paths).not.toContain('wsgi.py')
})

it('Python cobre >= 4 docs canonicos (SH-2 cobertura minima)', async () => {
  const result = await stackAwareInputPaths(path.join(FIXTURES, 'empty'), 'python')
  const docsCobertos = Array.from(result.keys())
  expect(docsCobertos.length).toBeGreaterThanOrEqual(8)
  expect(docsCobertos).toContain('ARCHITECTURE.md')
  expect(docsCobertos).toContain('docs/SECURITY.md')
  expect(docsCobertos).toContain('docs/RELIABILITY.md')
  expect(docsCobertos).toContain('docs/CODE_STYLE.md')
})

it('Laravel e Python NAO caem em GENERIC_CANDIDATES (pickStaticMap branch)', async () => {
  // GENERIC_CANDIDATES tem apenas ARCHITECTURE.md hoje. Se Laravel/Python caissem em GENERIC,
  // result.size seria 1. Apos SH-2, sao 8+.
  const laravel = await stackAwareInputPaths(path.join(FIXTURES, 'empty'), 'laravel')
  const python = await stackAwareInputPaths(path.join(FIXTURES, 'empty'), 'python')
  expect(laravel.size).toBeGreaterThan(1)
  expect(python.size).toBeGreaterThan(1)
})
```

### Passo 7: Rodar tests do stack-aware

```powershell
bun test skills/init/lib/stack-aware-input-paths.test.ts
```

**Esperado:** N+5 it's pass (N pre-existentes + 5 novos).

### Passo 8: Rodar parity test e suite completa

```powershell
bun test tests/e2e/populate-plan-parity.test.ts
```

**Esperado:** todos os it's verdes — fase-02 nao afeta os asserts do parity test (que cobrem Next.js+Supabase). Mas confirmar nao regredir.

```powershell
bun test
```

**Esperado:** suite completa verde.

### Passo 9: Typecheck e lint

```powershell
bun run typecheck
bun run lint
```

**Esperado:** ambos limpos.

### Passo 10: Registrar em MEMORY.md

- `DI-Plano05-fase02-laravel-paths`: cobertura Laravel inclui composer.json, app/, routes/, config/, bootstrap/. Sem `app/Services/`, `app/Repositories/` (convencao de equipe).
- `DI-Plano05-fase02-python-neutral`: cobertura Python neutra (sem `manage.py`, sem `wsgi.py`). Frameworks viram EXTRA em iteracao futura.
- `DI-Plano05-fase02-pickstaticmap-7cases`: switch passou de 5 para 7 cases. Continua legivel. Refator para hash map fica para iteracao futura.

---

## Gotchas

- **G3 do plano (switch 7 cases):** apos esta fase, switch tem `nextjs/rails/node-ts/laravel/python/unknown/null + default`. CLAUDE.md global preconiza hash map sobre switch, mas 7 cases ainda esta enxuto. Refator para `Record<StackId | 'null', StackCandidates>` pode virar Could Have. NAO refatorar agora.
- **G4 do plano (sem inventar paths):** se em duvida sobre algum path Laravel, verificar contra repositorio oficial `laravel/laravel` no GitHub (estado de qualquer release recente). Para Python, repos `python-poetry/poetry` ou `cookiecutter/cookiecutter` (templates oficiais comuns). NAO consultar tutoriais online — eles refletem convencoes da comunidade, nao do scaffold padrao.
- **G5 do plano (Python sem framework):** decisao consciente de nao incluir `manage.py` (Django), `wsgi.py`/`asgi.py` (framework-especifico) nem `app.py` (convencao Flask, nao scaffold). Se aparecer caso real de projeto Python framework-especifico que faz Plano 05 SH-2 cobrir mal, criar `PYTHON_DJANGO_EXTRA`/`PYTHON_FASTAPI_EXTRA` em iteracao futura, mesma logica de `NEXTJS_SUPABASE_EXTRA`. Registrar em MEMORY.md como follow-up.
- **G-laravel-version-11:** scaffold Laravel mudou estrutura entre versao 10 e 11 (`bootstrap/app.php` substituiu `app/Http/Kernel.php` como entry-point principal). Incluir ambos no `'docs/SECURITY.md'`: Kernel.php (versao 10) + `bootstrap/app.php` (versao 11). `exists: false` para um dos dois em qualquer projeto real — aceitavel.
- **G-fixture-empty-reuse:** o fixture `tests/fixtures/stack-aware/empty/` (ja existe — usado pelo CA-05) cobre os 5 tests novos. NAO criar fixture novo `laravel/` ou `python/` neste passo — gera overhead sem ganho. `exists: false` para todos os paths e aceitavel; o teste so valida cobertura (keys do map), nao validacao `fs.access`.
- **G-fixture-only-if-CA02-stretch:** se em iteracao futura quisermos CA-02-equivalente para Laravel (`>= 3 paths reais em ARCHITECTURE/SECURITY/RELIABILITY`), ai sim criar `tests/fixtures/stack-aware/laravel/` com stubs. Hoje, fora do escopo (CA-02 do PRD e Next.js+Supabase only).

---

## Verificacao

### TDD

- [ ] **RED:** ANTES do Passo 2-4 (codigo de producao ainda antigo, tests novos no Passo 6 adicionados), rodar `bun test skills/init/lib/stack-aware-input-paths.test.ts` — 5 fails (`expect(paths).toContain('composer.json')` etc — paths atualmente vem de `GENERIC_CANDIDATES`).
- [ ] **GREEN:** apos Passos 2-4 (mapas adicionados + switch atualizado), 5 pass.
- [ ] **REFACTOR:** se houver duplicacao entre `LARAVEL_CANDIDATES['AGENTS.md']` e `['CLAUDE.md']` (espelho), aceitavel — Andre tambem duplica. Nao otimizar.

### Checklist

- [ ] `LARAVEL_CANDIDATES` definido com >= 8 docs canonicos cobertos.
- [ ] `PYTHON_CANDIDATES` definido com >= 8 docs canonicos cobertos.
- [ ] `pickStaticMap()` tem case explicito para `'laravel'` e `'python'`.
- [ ] 5 unit tests novos em `stack-aware-input-paths.test.ts`.
- [ ] `bun test skills/init/lib/stack-aware-input-paths.test.ts` — N+5 pass.
- [ ] `bun test tests/e2e/populate-plan-parity.test.ts` — sem regressao.
- [ ] `bun test` (suite completa) — verde.
- [ ] `bun run typecheck` limpo.
- [ ] `bun run lint` limpo.
- [ ] Comentarios datados `2026-05-19 (Luiz/dev)` nos blocos novos.
- [ ] MEMORY.md atualizada (3 DIs).

### Comandos verificaveis

```powershell
# Confirma constantes definidas
Select-String -Pattern "LARAVEL_CANDIDATES|PYTHON_CANDIDATES" -Path skills/init/lib/stack-aware-input-paths.ts
# Esperado: pelo menos 4 matches (2 declaracoes + 2 returns no pickStaticMap)

# Test especifico do stack-aware
bun test skills/init/lib/stack-aware-input-paths.test.ts
# Esperado: 5 pass novos + N pre-existentes

# Suite completa
bun test
# Esperado: zero regressao
```

---

## Criterio de Aceite

**Por maquina:**
- `Select-String -Pattern "case 'laravel': return LARAVEL_CANDIDATES" -Path skills/init/lib/stack-aware-input-paths.ts` retorna 1 match.
- `Select-String -Pattern "case 'python': return PYTHON_CANDIDATES" -Path skills/init/lib/stack-aware-input-paths.ts` retorna 1 match.
- `bun test skills/init/lib/stack-aware-input-paths.test.ts` — exit 0, N+5 pass.
- `bun run typecheck` exit 0.
- `bun run lint` exit 0.

**Por humano:**
- Diff em `stack-aware-input-paths.ts`: 2 constantes novas + 2 cases novos no switch.
- Paths em `LARAVEL_CANDIDATES` sao do scaffold padrao Laravel 11.x (sem convencoes de equipe).
- Paths em `PYTHON_CANDIDATES` sao neutros (sem `manage.py`, sem `app.py`).
- Comentarios `2026-05-19 (Luiz/dev)` apontando Plano 05 fase-02 + SH-2.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
