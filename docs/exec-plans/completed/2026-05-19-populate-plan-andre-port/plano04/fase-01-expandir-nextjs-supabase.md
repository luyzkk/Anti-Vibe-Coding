<!--
Princípio universal #5 — Comment Provenance.
Todo comentário inline em código gerado durante este plano deve ter linhagem:
quem decidiu (autor + papel), quando (YYYY-MM-DD), por que (link para decisão ou
seção do PRD).
Exemplo: `// 2026-05-19 (Luiz/dev): default 30s — alinhado com timeout do upstream X`
-->

# Fase 01: Expandir `NEXTJS_CANDIDATES` + `NEXTJS_SUPABASE_EXTRA` (CA-02 mecanico)

**Plano:** 04 — MH-4 Discovery `(stack-id + doc-canonico) -> paths` expandido
**Sizing:** 2h
**Depende de:** Plano 01 (CanonicalDoc estendido com `docs/PRODUCT_SENSE.md` e `README.md`)
**Visual:** false

---

## O que esta fase entrega

Expandir `NEXTJS_CANDIDATES` em `skills/init/lib/stack-aware-input-paths.ts` para cobrir
**8 docs canonicos novos** (AGENTS.md, CLAUDE.md, docs/PRODUCT_SENSE.md, docs/PLANS.md,
docs/QUALITY_SCORE.md, docs/STATE.md, docs/design-docs/core-beliefs.md, README.md).
Expandir `NEXTJS_SUPABASE_EXTRA` para garantir **>= 3 paths com `exists: true`** em
ARCHITECTURE.md, docs/SECURITY.md e docs/RELIABILITY.md (CA-02 mecanico). Adicionar
stubs de arquivo ao fixture `tests/fixtures/stack-aware/nextjs-supabase/` para que o
teste passe. 1 unit test novo em `stack-aware-input-paths.test.ts` valida o CA-02.

---

## Arquivos Afetados

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `skills/init/lib/stack-aware-input-paths.ts` | Modify | Linhas 48-85: expandir `NEXTJS_CANDIDATES` com 8 docs novos. Linhas 89-106: expandir `NEXTJS_SUPABASE_EXTRA` para SECURITY/RELIABILITY/ARCHITECTURE garantirem >= 3 paths reais. Linha 147-155: expandir `GENERIC_CANDIDATES` para incluir `README.md` e `docs/PRODUCT_SENSE.md`. |
| `tests/fixtures/stack-aware/nextjs-supabase/src/app/layout.tsx` | Create | Stub vazio (touch). CA-02 ARCHITECTURE. |
| `tests/fixtures/stack-aware/nextjs-supabase/src/middleware.ts` | Create | Stub vazio (touch). CA-02 SECURITY. NOTA: pode ja existir — checar antes. |
| `tests/fixtures/stack-aware/nextjs-supabase/src/lib/supabase/server.ts` | Create | Stub vazio (touch). CA-02 SECURITY + ARCHITECTURE. |
| `tests/fixtures/stack-aware/nextjs-supabase/src/lib/supabase/client.ts` | Create | Stub vazio (touch). CA-02 ARCHITECTURE. |
| `tests/fixtures/stack-aware/nextjs-supabase/supabase/migrations/20260519000000_init.sql` | Create | Stub vazio (touch). CA-02 SECURITY + RELIABILITY. |
| `tests/fixtures/stack-aware/nextjs-supabase/supabase/functions/hello/index.ts` | Create | Stub vazio (touch). CA-02 RELIABILITY. |
| `tests/fixtures/stack-aware/nextjs-supabase/supabase/config.toml` | Create (se ausente) | Stub vazio (touch). Refor sinal Supabase + CA-02 SECURITY/ARCHITECTURE. |
| `tests/fixtures/stack-aware/README.md` | Create | Nota: stubs vazios sao intencionais — preservar para CA-02 do PRD populate-plan-andre-port. |
| `skills/init/lib/stack-aware-input-paths.test.ts` | Modify | Adicionar 1 it: "Next.js+Supabase: >= 3 paths reais em ARCHITECTURE, SECURITY, RELIABILITY (CA-02)". |

Estado esperado apos esta fase: `stackAwareInputPaths(FIXTURE_NEXTJS_SUPABASE, 'nextjs')`
retorna mapa onde ARCHITECTURE.md, docs/SECURITY.md e docs/RELIABILITY.md tem cada um
`>= 3` entries com `exists: true`. Os 8 docs novos aparecem como keys do mapa (mesmo que
com `exists: false` em greenfield — o que importa para fase-03 e a presenca da key, nao
necessariamente paths reais).

---

## Implementacao

### Passo 1: Reler estado atual e mapear entries faltantes

Abrir `skills/init/lib/stack-aware-input-paths.ts` e checar o estado atual:

```powershell
# Verificar docs canonicos cobertos hoje em NEXTJS_CANDIDATES (linhas 48-85)
# Esperado (apos Plano 01 mergeado): 6 docs cobertos
#   - ARCHITECTURE.md
#   - docs/FRONTEND.md
#   - docs/SECURITY.md
#   - docs/RELIABILITY.md
#   - docs/DESIGN.md
#   - docs/CODE_STYLE.md
```

Docs canonicos AUSENTES de `NEXTJS_CANDIDATES` (apos Plano 01) — 8 entries a adicionar:

1. `AGENTS.md` — paths candidatos: `README.md`, `package.json`, `CLAUDE.md`
2. `CLAUDE.md` — paths candidatos: `AGENTS.md`, `README.md`, `package.json`
3. `docs/PRODUCT_SENSE.md` — paths candidatos: `README.md`, `src/app/page.tsx`, `package.json`
4. `docs/PLANS.md` — paths candidatos: `docs/exec-plans/active/`, `docs/exec-plans/completed/`
5. `docs/QUALITY_SCORE.md` — paths candidatos: `.github/workflows/`, `.github/pull_request_template.md`, `package.json`
6. `docs/STATE.md` — paths candidatos: `package.json`, `docs/exec-plans/active/`
7. `docs/design-docs/core-beliefs.md` — paths candidatos: `CLAUDE.md`, `docs/CODE_STYLE.md`, `README.md`
8. `README.md` — paths candidatos: `package.json`, `src/app/page.tsx`, `next.config.js`, `next.config.mjs`, `next.config.ts`

Registrar lista exata adicionada em MEMORY.md como `DI-Plano04-fase01-nextjs-coverage`.

### Passo 2: Aplicar mudanca em `NEXTJS_CANDIDATES`

Editar `skills/init/lib/stack-aware-input-paths.ts` adicionando as 8 entries dentro do
objeto `NEXTJS_CANDIDATES` (apos a entry `docs/CODE_STYLE.md`, antes do fechamento `}`):

```typescript
// 2026-05-19 (Luiz/dev): Plano 04 fase-01 do PRD populate-plan-andre-port (MH-4 / CA-02).
// 8 docs canonicos adicionados para Next.js. Paths sao do scaffold padrao Next.js — nao inventar.
// `exists: false` aceito em greenfield (renderer marca _nao encontrado_).
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
  'src/app/page.tsx',
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
'README.md': [
  'package.json',
  'src/app/page.tsx',
  'next.config.js',
  'next.config.mjs',
  'next.config.ts',
],
```

### Passo 3: Expandir `NEXTJS_SUPABASE_EXTRA` para CA-02 mecanico

O CA-02 exige **>= 3 paths reais com `exists: true`** em ARCHITECTURE, SECURITY e
RELIABILITY quando stack e Next.js+Supabase. Estado atual da `NEXTJS_SUPABASE_EXTRA`
ja tem candidatos suficientes, mas o fixture pode nao ter os arquivos. Decisao:
**expandir entries de `docs/RELIABILITY.md` para 3+** (hoje tem 2 — `supabase/functions/`
e `supabase/migrations/`) e garantir cobertura redundante:

```typescript
// 2026-05-19 (Luiz/dev): Plano 04 fase-01 do PRD populate-plan-andre-port (MH-4 / CA-02).
// CA-02 exige >= 3 paths com exists:true em ARCH/SEC/REL. Paths sao do scaffold padrao
// Next.js+Supabase, validados via fs.access no test setup.
const NEXTJS_SUPABASE_EXTRA: StackCandidates = {
  'ARCHITECTURE.md': [
    'supabase/migrations/',
    'supabase/functions/',
    'supabase/config.toml',
    'src/lib/supabase/server.ts',
    'src/lib/supabase/client.ts',
  ],
  'docs/SECURITY.md': [
    'supabase/migrations/',
    'src/lib/supabase/server.ts',
    'supabase/config.toml',
    // 2026-05-19 (Luiz/dev): Plano 04 fase-01 — entry adicionada para CA-02 mecanico.
    'src/lib/supabase/client.ts',
  ],
  'docs/RELIABILITY.md': [
    'supabase/functions/',
    'supabase/migrations/',
    // 2026-05-19 (Luiz/dev): Plano 04 fase-01 — entries adicionadas para CA-02 mecanico
    // (RELIABILITY precisa de >= 3 paths reais).
    'supabase/config.toml',
    'src/lib/supabase/server.ts',
  ],
}
```

### Passo 4: Expandir `GENERIC_CANDIDATES` para cobrir docs novos

`GENERIC_CANDIDATES` e fallback para `null`/`laravel`/`python`/`unknown`. Adicionar entries
minimas para `README.md` e `docs/PRODUCT_SENSE.md`:

```typescript
const GENERIC_CANDIDATES: StackCandidates = {
  'ARCHITECTURE.md': [
    'README.md',
    'package.json',
    'Gemfile',
    'composer.json',
    'pyproject.toml',
  ],
  // 2026-05-19 (Luiz/dev): Plano 04 fase-01 — entries genericas para README e PRODUCT_SENSE.
  // Subset minimo — Plano 05 fase-02 (SH-2 Laravel + Python) pode estender se aparecerem novos
  // paths-scaffold por linguagem.
  'README.md': [
    'package.json',
    'Gemfile',
    'composer.json',
    'pyproject.toml',
  ],
  'docs/PRODUCT_SENSE.md': [
    'README.md',
    'package.json',
  ],
}
```

### Passo 5: Criar stubs no fixture `nextjs-supabase`

```powershell
# Pasta src/app (criar primeiro)
New-Item -ItemType Directory -Force -Path "tests/fixtures/stack-aware/nextjs-supabase/src/app"
New-Item -ItemType File -Path "tests/fixtures/stack-aware/nextjs-supabase/src/app/layout.tsx"

# middleware (raiz src/)
New-Item -ItemType File -Path "tests/fixtures/stack-aware/nextjs-supabase/src/middleware.ts" -ErrorAction SilentlyContinue

# src/lib/supabase (cliente e server)
New-Item -ItemType Directory -Force -Path "tests/fixtures/stack-aware/nextjs-supabase/src/lib/supabase"
New-Item -ItemType File -Path "tests/fixtures/stack-aware/nextjs-supabase/src/lib/supabase/server.ts"
New-Item -ItemType File -Path "tests/fixtures/stack-aware/nextjs-supabase/src/lib/supabase/client.ts"

# supabase/migrations (1 arquivo dummy)
New-Item -ItemType Directory -Force -Path "tests/fixtures/stack-aware/nextjs-supabase/supabase/migrations"
New-Item -ItemType File -Path "tests/fixtures/stack-aware/nextjs-supabase/supabase/migrations/20260519000000_init.sql"

# supabase/functions/hello
New-Item -ItemType Directory -Force -Path "tests/fixtures/stack-aware/nextjs-supabase/supabase/functions/hello"
New-Item -ItemType File -Path "tests/fixtures/stack-aware/nextjs-supabase/supabase/functions/hello/index.ts"

# supabase/config.toml
New-Item -ItemType File -Path "tests/fixtures/stack-aware/nextjs-supabase/supabase/config.toml" -ErrorAction SilentlyContinue
```

**Observacao:** verificar primeiro com `ls -la` se algum desses ja existe (especialmente
`middleware.ts` e `config.toml` — podem ter sido criados em planos anteriores). Stubs
vazios bastam — `fs.access` so checa existencia.

### Passo 6: Criar `tests/fixtures/stack-aware/README.md`

```markdown
<!-- 2026-05-19 (Luiz/dev): Plano 04 fase-01 do PRD populate-plan-andre-port. -->

# Stack-Aware Fixtures

Stubs vazios para o helper `stackAwareInputPaths` validar paths via `fs.access`.

- `empty/` — sem arquivos. Usado em CA-05 (stack nao detectado / fallback null).
- `nextjs-supabase/` — Next.js + Supabase. Stubs cobrem CA-02 (>= 3 paths reais em
  ARCHITECTURE, SECURITY, RELIABILITY). NAO deletar stubs sem regenerar
  `tests/e2e/__golden__/populate-plan-andre-parity.md` (Plano 05 fase-01).
- `rails/` — Rails (Gemfile + app + config). Usado pelo test "Rails-specific paths".

Manter `.gitkeep` em pastas vazias para garantir que ficam no repo.
```

### Passo 7: Adicionar 1 unit test novo

Editar `skills/init/lib/stack-aware-input-paths.test.ts`. APOS o `it` de linha 9-14
(`returns Next.js + Supabase paths with >= 3 reais em ARCHITECTURE (CA-02)` — JA EXISTE),
adicionar 2 it's espelhados para SECURITY e RELIABILITY:

```typescript
// 2026-05-19 (Luiz/dev): Plano 04 fase-01 do PRD populate-plan-andre-port (MH-4 / CA-02).
// CA-02 ja cobria ARCHITECTURE — espelhamos para SECURITY e RELIABILITY com mesmo limite.
it('returns Next.js + Supabase paths with >= 3 reais em SECURITY (CA-02)', async () => {
  const result = await stackAwareInputPaths(path.join(FIXTURES, 'nextjs-supabase'), 'nextjs')
  const sec = result.get('docs/SECURITY.md') ?? []
  const real = sec.filter(p => p.exists)
  expect(real.length).toBeGreaterThanOrEqual(3)
})

it('returns Next.js + Supabase paths with >= 3 reais em RELIABILITY (CA-02)', async () => {
  const result = await stackAwareInputPaths(path.join(FIXTURES, 'nextjs-supabase'), 'nextjs')
  const rel = result.get('docs/RELIABILITY.md') ?? []
  const real = rel.filter(p => p.exists)
  expect(real.length).toBeGreaterThanOrEqual(3)
})

it('cobre 8 docs canonicos novos em NEXTJS_CANDIDATES (MH-4 expansion)', async () => {
  const result = await stackAwareInputPaths(path.join(FIXTURES, 'nextjs-supabase'), 'nextjs')
  const docsCobertos = Array.from(result.keys())
  // 2026-05-19 (Luiz/dev): Plano 04 fase-01 — cobertura de 8 docs novos. Plano 01 ja adicionou
  // PRODUCT_SENSE e README ao CanonicalDoc; aqui validamos que entries existem no map.
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

### Passo 8: Rodar testes

```powershell
bun test skills/init/lib/stack-aware-input-paths.test.ts
```

**Esperado:** 5 it's antes + 3 novos = 8 passing. Se algum dos 3 novos falhar,
investigar:
- "SECURITY: 3 reais" falha → confirmar que `src/lib/supabase/server.ts` E `src/lib/supabase/client.ts`
  existem no fixture (Passo 5).
- "RELIABILITY: 3 reais" falha → confirmar que `supabase/functions/`, `supabase/migrations/` e
  `supabase/config.toml` existem no fixture.
- "8 docs novos" falha → confirmar que `NEXTJS_CANDIDATES` recebeu todas as 8 entries (Passo 2).

```powershell
bun test
```

**Esperado:** suite completa verde, zero regressao.

### Passo 9: Typecheck e lint

```powershell
bun run typecheck
bun run lint
```

**Esperado:** ambos limpos. Se typecheck reclamar de chave `'README.md'` em
`NEXTJS_CANDIDATES` antes de Plano 01 mergeado (CanonicalDoc nao inclui ainda),
**parar** — Plano 04 depende de Plano 01.

---

## Gotchas

- **G1 do plano (fixture stubs):** sem stubs adicionados em Passo 5, o CA-02 assert
  passa em `>= 0` mas nao em `>= 3`. Verificar com `ls -la tests/fixtures/stack-aware/nextjs-supabase/`
  apos Passo 5 — 8+ arquivos visiveis (4 pastas + arquivos dentro).
- **G7 do plano (README.md no map):** `NEXTJS_CANDIDATES['README.md']` pode parecer
  redundante (README.md geralmente nao precisa ser populado pelo plugin — ja vem do
  TEMPLATE_MANIFEST), mas o `populate-plan-generator` itera por `TEMPLATE_MANIFEST` e
  consulta `stackPaths.get(entry.dst)`. Se a key nao existe no map, `inputsCode` vira `[]`
  e o markdown emite "_(Nenhum path candidato...)_". Para README.md, paths como `package.json`
  ajudam a LLM a entender contexto. Adicionar.
- **G8 do plano (paths sempre posix):** todos os paths sao strings literais com `/`.
  NAO usar `path.sep` nem `path.join` no array de candidatos — apenas no codigo que valida
  com `fs.access`. Helper ja faz isso (linha 257 do generator).
- **G-fixture-supabase-signal:** o `hasSupabaseSignal(cwd)` (linha 163) detecta Supabase
  via pasta `supabase/` OU `@supabase/*` em `package.json`. Stubs do Passo 5 ja garantem
  ambos (pasta supabase/ existe, mas package.json do fixture pode nao ter `@supabase/*`).
  Verificar `tests/fixtures/stack-aware/nextjs-supabase/package.json` — se ausente dep,
  ainda assim funciona pelo sinal de pasta. NAO mexer no package.json — pode quebrar
  outros testes.
- **G-deduplicacao em `mergeCandidates`:** quando `NEXTJS_SUPABASE_EXTRA` mescla com
  `NEXTJS_CANDIDATES`, paths duplicados sao deduplicados (Set spread em linha 201). Ordem
  preservada: base primeiro, extras depois. Adicionar paths em `NEXTJS_CANDIDATES` que ja
  estao em `NEXTJS_SUPABASE_EXTRA` NAO duplica — vira no-op no merge. Aceitavel.
- **G-DI-MEMORY-update:** apos Passos 5 e 7, registrar em MEMORY.md a lista exata de
  stubs criados e docs novos cobertos. Plano 05 fase-01 (golden snapshot) le essa lista.

---

## Verificacao

### TDD

- [ ] **RED:** ANTES das mudancas, rodar `bun test skills/init/lib/stack-aware-input-paths.test.ts`
      com os 3 novos it's adicionados (mas codigo de produtor ainda antigo).
      Esperado: 2 fails (SECURITY e RELIABILITY com 2 reais em vez de 3); 1 fail (`8 docs novos`
      lista vazia ou incompleta).
- [ ] **GREEN:** apos Passos 2-7, rodar mesmo comando — 8 passing.
- [ ] **REFACTOR:** se algum path duplicar entre `NEXTJS_CANDIDATES` e `NEXTJS_SUPABASE_EXTRA`,
      deixar — `mergeCandidates` deduplica. Nao otimizar.

### Checklist

- [ ] `NEXTJS_CANDIDATES` tem 6 entries originais + 8 novas = 14 chaves.
- [ ] `NEXTJS_SUPABASE_EXTRA['docs/SECURITY.md']` tem >= 4 entries.
- [ ] `NEXTJS_SUPABASE_EXTRA['docs/RELIABILITY.md']` tem >= 4 entries.
- [ ] `GENERIC_CANDIDATES` tem `README.md` e `docs/PRODUCT_SENSE.md`.
- [ ] Fixture `tests/fixtures/stack-aware/nextjs-supabase/` contem:
      `src/app/layout.tsx`, `src/middleware.ts`, `src/lib/supabase/server.ts`,
      `src/lib/supabase/client.ts`, `supabase/config.toml`,
      `supabase/migrations/20260519000000_init.sql`,
      `supabase/functions/hello/index.ts`.
- [ ] `tests/fixtures/stack-aware/README.md` criado com nota sobre stubs.
- [ ] `bun test skills/init/lib/stack-aware-input-paths.test.ts` — 8 pass.
- [ ] `bun test` (suite completa) — zero regressao.
- [ ] `bun run typecheck` limpo.
- [ ] `bun run lint` limpo.
- [ ] Comentarios datados `2026-05-19 (Luiz/dev)` nos blocos novos do `.ts`.

### Comandos verificaveis

```powershell
# Teste especifico do stack-aware
bun test skills/init/lib/stack-aware-input-paths.test.ts
# Esperado: 8 pass, 0 fail (5 antigos + 3 novos)

# Suite completa nao regride
bun test
# Esperado: pre-fase total + 3 (novos asserts), zero fails

# Typecheck garante CanonicalDoc do Plano 01
bun run typecheck

# Lint
bun run lint

# Verificar fixture
Get-ChildItem -Recurse tests/fixtures/stack-aware/nextjs-supabase/
# Esperado: pasta supabase/ + src/lib/supabase/* + src/app/ + src/middleware.ts
```

---

## Criterio de Aceite

**Por maquina:**
- `skills/init/lib/stack-aware-input-paths.ts` contem entries para `'AGENTS.md'`,
  `'CLAUDE.md'`, `'docs/PRODUCT_SENSE.md'`, `'docs/PLANS.md'`, `'docs/QUALITY_SCORE.md'`,
  `'docs/STATE.md'`, `'docs/design-docs/core-beliefs.md'`, `'README.md'` no
  `NEXTJS_CANDIDATES`
  (`Select-String -Pattern "'AGENTS.md':" -Path skills/init/lib/stack-aware-input-paths.ts`
  retorna >= 1 match — multiplos se outros stacks tambem cobrem).
- `bun test skills/init/lib/stack-aware-input-paths.test.ts` — exit 0, 8 passes (5 antigos
  + 3 novos).
- Em `tests/fixtures/stack-aware/nextjs-supabase/`, `Test-Path` retorna `True` para:
  `src/app/layout.tsx`, `src/middleware.ts`, `src/lib/supabase/server.ts`,
  `src/lib/supabase/client.ts`, `supabase/config.toml`,
  `supabase/migrations/20260519000000_init.sql`, `supabase/functions/hello/index.ts`.
- `bun run typecheck` exit 0.
- `bun run lint` exit 0.

**Por humano:**
- Diff legivel em `stack-aware-input-paths.ts`: 8 entries novas em `NEXTJS_CANDIDATES`,
  2 entries appendadas em `NEXTJS_SUPABASE_EXTRA.docs/SECURITY.md` e
  `NEXTJS_SUPABASE_EXTRA.docs/RELIABILITY.md`, 2 entries novas em `GENERIC_CANDIDATES`.
- Comentarios `2026-05-19 (Luiz/dev)` apontando Plano 04 fase-01 + CA-02.
- Fixture cresceu por arquivos vazios — README do fixture explica o por que.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
