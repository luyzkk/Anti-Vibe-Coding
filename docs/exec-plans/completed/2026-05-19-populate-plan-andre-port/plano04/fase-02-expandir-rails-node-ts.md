<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
-->

# Fase 02: Expandir `RAILS_CANDIDATES` + `NODE_TS_CANDIDATES`

**Plano:** 04 — MH-4 Discovery `(stack-id + doc-canonico) -> paths` expandido
**Sizing:** 1.5h
**Depende de:** fase-01 (padrao de expansao + entries de README/PRODUCT_SENSE estabelecidos)
**Visual:** false

---

## O que esta fase entrega

Expandir `RAILS_CANDIDATES` e `NODE_TS_CANDIDATES` em `stack-aware-input-paths.ts` cobrindo
os mesmos 8 docs canonicos novos que fase-01 cobriu para Next.js, **sem inventar paths** —
apenas paths do scaffold padrao de cada stack (`rails new` para Rails, `bun init`/`npm init`
para Node-TS, mais convencoes documentadas pelo Andre em `tmp/andre-skills/`). 2 unit tests
novos em `stack-aware-input-paths.test.ts` validam que o stack respectivo expoe os docs
esperados.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/stack-aware-input-paths.ts` | Modify | Linhas 108-129: expandir `RAILS_CANDIDATES` com 6 docs novos. Linhas 131-144: expandir `NODE_TS_CANDIDATES` com 6 docs novos. |
| `tests/fixtures/stack-aware/rails/` | Modify | Adicionar `app/controllers/`, `app/models/`, `config/routes.rb` se ausentes — checar primeiro. Fixture ja tem `Gemfile`, `app/`, `config/` (verificado em fase-01 do plano). |
| `skills/init/lib/stack-aware-input-paths.test.ts` | Modify | Adicionar 2 it's: "Rails cobre 6 docs novos" e "Node-TS cobre 6 docs novos". |

Estado esperado apos esta fase: cada stack (Rails, Node-TS) cobre os mesmos 8 docs novos
(menos os 2 ja cobertos por entry pre-existente quando aplicavel — ex: ARCHITECTURE,
CODE_STYLE). Os docs cobertos em fase-01 estao agora todos com entries equivalentes em
Rails e Node-TS, com paths que existem em projeto recem-scaffolded com `rails new` ou
`bun init`.

---

## Implementacao

### Passo 1: Mapear paths do scaffold padrao Rails (NAO INVENTAR)

Referenciar `tmp/andre-skills/harness-engineering/assets/harness-template/` se houver
exemplo Rails. Fallback: `rails new` produz:
- `Gemfile`, `Gemfile.lock`
- `config/routes.rb`, `config/application.rb`, `config/database.yml`, `config/environment.rb`
- `app/controllers/application_controller.rb`, `app/models/application_record.rb`
- `db/migrate/`, `db/schema.rb`
- `bin/rails`, `bin/setup`
- `README.md`

Mapa para os 6 docs novos (AGENTS, CLAUDE, PRODUCT_SENSE, PLANS, QUALITY_SCORE, STATE,
core-beliefs, README — exclui 2 que ja sao cobertos por sinal indireto):

```typescript
const RAILS_CANDIDATES: StackCandidates = {
  'ARCHITECTURE.md': [
    'config/routes.rb',
    'app/controllers/',
    'app/models/',
    'config/application.rb',
  ],
  'docs/SECURITY.md': [
    'config/initializers/cors.rb',
    'config/credentials.yml.enc',
    'app/controllers/application_controller.rb',
  ],
  'docs/RELIABILITY.md': [
    'config/database.yml',
    'config/sidekiq.yml',
    'app/jobs/',
  ],
  'docs/CODE_STYLE.md': [
    '.rubocop.yml',
    'Gemfile',
  ],
  // 2026-05-19 (Luiz/dev): Plano 04 fase-02 do PRD populate-plan-andre-port (MH-4).
  // Paths do scaffold `rails new` — sem inventar paths customizados.
  'AGENTS.md': [
    'README.md',
    'Gemfile',
    'CLAUDE.md',
  ],
  'CLAUDE.md': [
    'AGENTS.md',
    'README.md',
    'Gemfile',
  ],
  'docs/PRODUCT_SENSE.md': [
    'README.md',
    'config/routes.rb',
    'Gemfile',
  ],
  'docs/PLANS.md': [
    'docs/exec-plans/active/',
    'docs/exec-plans/completed/',
  ],
  'docs/QUALITY_SCORE.md': [
    '.github/workflows/',
    '.github/pull_request_template.md',
    'Gemfile',
  ],
  'docs/STATE.md': [
    'Gemfile.lock',
    'docs/exec-plans/active/',
    'config/application.rb',
  ],
  'docs/design-docs/core-beliefs.md': [
    'CLAUDE.md',
    'docs/CODE_STYLE.md',
    'README.md',
  ],
  'README.md': [
    'Gemfile',
    'config/routes.rb',
    'bin/rails',
  ],
}
```

### Passo 2: Mapear paths do scaffold padrao Node-TS (NAO INVENTAR)

`bun init` / `npm init -y` + `tsc --init` produz:
- `package.json`, `bun.lockb` ou `package-lock.json`
- `tsconfig.json`
- `src/index.ts` (convencao)
- `.gitignore`
- `README.md`

Mapa para os 6 docs novos:

```typescript
const NODE_TS_CANDIDATES: StackCandidates = {
  'ARCHITECTURE.md': [
    'src/index.ts',
    'src/main.ts',
    'package.json',
    'tsconfig.json',
  ],
  'docs/CODE_STYLE.md': [
    'tsconfig.json',
    '.eslintrc.json',
    'eslint.config.js',
    '.prettierrc',
  ],
  // 2026-05-19 (Luiz/dev): Plano 04 fase-02 do PRD populate-plan-andre-port (MH-4).
  // Paths do scaffold `bun init` / `npm init` — sem inventar paths customizados.
  'AGENTS.md': [
    'README.md',
    'package.json',
    'CLAUDE.md',
  ],
  'CLAUDE.md': [
    'AGENTS.md',
    'README.md',
    'package.json',
  ],
  'docs/PRODUCT_SENSE.md': [
    'README.md',
    'package.json',
  ],
  'docs/PLANS.md': [
    'docs/exec-plans/active/',
    'docs/exec-plans/completed/',
  ],
  'docs/QUALITY_SCORE.md': [
    '.github/workflows/',
    '.github/pull_request_template.md',
    'package.json',
  ],
  'docs/STATE.md': [
    'package.json',
    'docs/exec-plans/active/',
  ],
  'docs/design-docs/core-beliefs.md': [
    'CLAUDE.md',
    'docs/CODE_STYLE.md',
    'README.md',
  ],
  'docs/SECURITY.md': [
    // 2026-05-19 (Luiz/dev): Node-TS generico nao tem middleware/auth scaffold —
    // dependency tree fica como fonte real. Renderer marca `exists: false` em
    // greenfield se .env.example nao existe.
    '.env.example',
    'package.json',
  ],
  'docs/RELIABILITY.md': [
    'package.json',
    'tsconfig.json',
  ],
  'README.md': [
    'package.json',
    'tsconfig.json',
    'src/index.ts',
  ],
}
```

**NOTA:** SECURITY e RELIABILITY foram acrescentados em Node-TS — Plano 01 sente falta
delas; foi decisao do PRD MH-4 "cobertura para Node-TS". Mantemos paths magros (poucos
candidatos) — `exists: false` em greenfield e o comportamento correto.

### Passo 3: Aplicar mudancas em `stack-aware-input-paths.ts`

Editar in-place, mantendo entries existentes (linhas 108-129 e 131-144 do arquivo
original) e adicionando as novas. Confirmar que o tipo `CanonicalDoc` (apos Plano 01)
inclui todos os keys usados — caso contrario, `bun run typecheck` quebra.

### Passo 4: Verificar fixture Rails

```powershell
Get-ChildItem -Recurse tests/fixtures/stack-aware/rails/
```

**Esperado:** ja tem `Gemfile`, `app/`, `config/`. Para o test novo "Rails cobre 6 docs
novos", basta verificar que paths existem no map — nao precisa que `exists: true` para
todos. Se o test futuro (Plano 05) exigir CA-02-equivalente para Rails (>= 3 paths
reais em ARCHITECTURE), entao adicionar stubs. Por enquanto, NAO adicionar.

Registrar em MEMORY.md como `DI-Plano04-fase02-rails-fixture-stub` se decidir adicionar.

### Passo 5: Adicionar 2 unit tests novos

Editar `skills/init/lib/stack-aware-input-paths.test.ts`. APOS os 3 it's da fase-01,
adicionar:

```typescript
// 2026-05-19 (Luiz/dev): Plano 04 fase-02 do PRD populate-plan-andre-port (MH-4).
// Cobertura analoga ao test de fase-01 — cada stack expoe os 6 docs novos canonicos.

it('Rails cobre 6 docs canonicos novos em RAILS_CANDIDATES', async () => {
  const result = await stackAwareInputPaths(path.join(FIXTURES, 'rails'), 'rails')
  const docsCobertos = Array.from(result.keys())
  const docsEsperados = [
    'AGENTS.md',
    'CLAUDE.md',
    'docs/PRODUCT_SENSE.md',
    'docs/PLANS.md',
    'docs/QUALITY_SCORE.md',
    'docs/STATE.md',
    'docs/design-docs/core-beliefs.md',
    'README.md',
  ] as const
  for (const doc of docsEsperados) {
    expect(docsCobertos).toContain(doc)
  }
})

it('Node-TS cobre 6 docs canonicos novos em NODE_TS_CANDIDATES', async () => {
  // 2026-05-19 (Luiz/dev): nao temos fixture node-ts dedicado — reusamos `empty` com
  // primary='node-ts'. `exists` ficara `false` em todos os paths (sem arquivos no fixture).
  // O teste valida apenas COBERTURA DE KEYS, nao existencia de arquivos.
  const result = await stackAwareInputPaths(path.join(FIXTURES, 'empty'), 'node-ts')
  const docsCobertos = Array.from(result.keys())
  const docsEsperados = [
    'AGENTS.md',
    'CLAUDE.md',
    'docs/PRODUCT_SENSE.md',
    'docs/PLANS.md',
    'docs/QUALITY_SCORE.md',
    'docs/STATE.md',
    'docs/design-docs/core-beliefs.md',
    'README.md',
  ] as const
  for (const doc of docsEsperados) {
    expect(docsCobertos).toContain(doc)
  }
})
```

### Passo 6: Rodar testes

```powershell
bun test skills/init/lib/stack-aware-input-paths.test.ts
```

**Esperado:** 8 (fase-01) + 2 (fase-02) = 10 passing.

```powershell
bun test
```

**Esperado:** suite completa verde, zero regressao.

### Passo 7: Typecheck e lint

```powershell
bun run typecheck
bun run lint
```

**Esperado:** ambos limpos. Se typecheck reclamar de chave nao-cobrindo de `CanonicalDoc`,
confirmar Plano 01 mergeado.

### Passo 8: Atualizar MEMORY.md

Registrar:
- `DI-Plano04-fase02-rails-cobertura`: lista exata de 8 docs cobertos com paths
  escolhidos.
- `DI-Plano04-fase02-nodets-cobertura`: idem para Node-TS, observando que SECURITY e
  RELIABILITY foram adicionados (nao existiam antes em `NODE_TS_CANDIDATES`).
- Se algum doc ficou sem entry em algum stack (decisao consciente), registrar e
  apontar para Plano 05 fase-02 (SH-2 Laravel + Python) como follow-up.

---

## Gotchas

- **G4 do plano (sem inventar paths):** se um doc nao tem path obvio no scaffold (ex:
  `docs/PLANS.md` em Rails sem evidencia de planos versionados), usar `docs/exec-plans/active/`
  + `docs/exec-plans/completed/` — paths que apareceram quando o plugin /init rodar
  apos esta feature. `exists: false` em greenfield, ok.
- **G-rails-controllers-path:** `app/controllers/` (com slash final) e tratado como
  diretorio. `fs.access` aceita pasta. Conferir que no fixture `tests/fixtures/stack-aware/rails/`
  a pasta `app/` existe (verificada ja).
- **G-node-ts-novas-secoes:** Plano 04 fase-02 adiciona SECURITY e RELIABILITY para
  Node-TS, que nao existiam antes em `NODE_TS_CANDIDATES`. Isso muda o numero de keys
  do mapa retornado para projetos Node-TS — fixture `empty` tinha 0 paths antes, agora
  tera todos os keys do `NODE_TS_CANDIDATES` (mas todos com `exists: false`). Verificar
  que nao quebra outros testes (filtros por `exists: true` continuam corretos).
- **G-empty-fixture-reuse:** o test "Node-TS cobre 6 docs novos" usa `empty` fixture com
  `primary='node-ts'`. Se algum teste anterior assumia que `stackAwareInputPaths(empty, 'node-ts')`
  retornaria mapa pequeno (ex: 2 keys), agora retornara maior. Conferir `bun test` para
  qualquer regressao.
- **G-paths-com-slash-final:** `app/controllers/`, `app/models/`, `app/jobs/`,
  `docs/exec-plans/active/`, `.github/workflows/` — todos terminam com `/`. `fs.access`
  aceita em ambos Windows e Posix (o `path.join(cwd, candidate)` resolve corretamente).
  Manter consistente — mais legivel que sem `/` para indicar "isto e pasta".

---

## Verificacao

### TDD

- [ ] **RED:** antes das mudancas, rodar `bun test skills/init/lib/stack-aware-input-paths.test.ts`
      com os 2 novos it's. Esperado: 2 fails (`docsCobertos` nao contem os 8 docs novos
      em Rails nem em Node-TS).
- [ ] **GREEN:** apos Passos 1-3, rodar mesmo comando — 10 passing.

### Checklist

- [ ] `RAILS_CANDIDATES` tem 4 entries originais + 8 novas = 12 keys.
- [ ] `NODE_TS_CANDIDATES` tem 2 entries originais + 8 novas + 2 (SECURITY/RELIABILITY)
      = 12 keys.
- [ ] Cada entry usa paths do scaffold padrao da stack — sem paths customizados ou
      inventados.
- [ ] `bun test skills/init/lib/stack-aware-input-paths.test.ts` — 10 pass.
- [ ] `bun test` — zero regressao.
- [ ] `bun run typecheck` limpo.
- [ ] `bun run lint` limpo.
- [ ] Comentarios datados `2026-05-19 (Luiz/dev)` nos blocos novos.
- [ ] MEMORY.md atualizado com `DI-Plano04-fase02-rails-cobertura` e `DI-Plano04-fase02-nodets-cobertura`.

### Comandos verificaveis

```powershell
bun test skills/init/lib/stack-aware-input-paths.test.ts
# Esperado: 10 pass, 0 fail (8 fase-01 + 2 fase-02)

bun test
# Esperado: zero regressao

bun run typecheck
bun run lint
```

---

## Criterio de Aceite

**Por maquina:**
- `Select-String -Pattern "'AGENTS.md':" -Path skills/init/lib/stack-aware-input-paths.ts`
  retorna >= 4 matches (Next.js + Next.js+Supabase superpoint + Rails + Node-TS — note
  que NEXTJS_SUPABASE_EXTRA pode nao ter AGENTS, ok).
- `bun test skills/init/lib/stack-aware-input-paths.test.ts` — exit 0, 10 passes.
- `bun run typecheck` exit 0.
- `bun run lint` exit 0.

**Por humano:**
- Diff legivel: 8 entries novas em `RAILS_CANDIDATES`, 10 entries novas em `NODE_TS_CANDIDATES`
  (8 docs + 2 secoes ausentes antes — SECURITY/RELIABILITY).
- Comentarios `2026-05-19 (Luiz/dev)` apontando Plano 04 fase-02 + MH-4.
- Sem paths inventados — cada entry rastreia ao scaffold padrao da stack.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
