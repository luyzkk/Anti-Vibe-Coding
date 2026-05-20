# Plano 04: MH-4 Discovery `(stack-id + doc-canonico) -> paths` expandido

**Feature:** populate-plan-andre-port ([PLAN overview](../PLAN.md))
**Fases:** 3
**Sizing total:** ~4.5h
**Depende de:** Plano 01 (`CanonicalDoc` estendido com `docs/PRODUCT_SENSE.md` + `README.md`; `tests/e2e/populate-plan-parity.test.ts` com 2 asserts MH-1 ativos; `EXCLUDED_FROM_POPULATION_V2` reduzido)
**Desbloqueia:** Plano 05 fase-01 (golden snapshot estende CA-02 e CA-05) e Plano 05 fase-02 (SH-2 Laravel + Python — refatora `pickStaticMap` para nao cair em generico)

---

## O que este plano entrega

Expandir `skills/init/lib/stack-aware-input-paths.ts` para cobrir **todos os 12+ docs
canonicos** em cada stack suportado (Next.js, Next.js+Supabase, Rails, Node-TS). Hoje
o mapa cobre ~6 de 12 docs por stack — os demais caem em `Inputs (codigo)` vazio, o que
quebra o principio "nunca diminuir" do PRD. Apos este plano:

- Cada `CanonicalDoc` tem entry em pelo menos 1 stack (sem inventar paths — apenas paths
  do scaffold padrao da stack).
- Em Next.js+Supabase, `ARCHITECTURE.md`, `docs/SECURITY.md` e `docs/RELIABILITY.md` tem
  `>= 3` paths reais com `exists: true` (CA-02 mecanico).
- Em stack `unknown` ou `null`, fases ainda existem com `Inputs (codigo)` vazio + nota
  explicita "stack nao detectado" (CA-05 — nao falha build).
- 2 sub-asserts novos em `tests/e2e/populate-plan-parity.test.ts` travam o gate CA-02 +
  CA-05 mecanicamente.

Plano 03 (`LLM_INSTRUCTIONS`) e Plano 02 (`PLAN.md.tpl`) tocam arquivos disjuntos — Plano
04 roda em paralelo com ambos.

---

## Analise de Dependencias

### Bloqueadores (precisa estar pronto ANTES deste plano)

| O que | De onde vem | Status apos Plano 01 |
|-------|-------------|----------------------|
| `CanonicalDoc` inclui `docs/PRODUCT_SENSE.md` e `README.md` | Plano 01 fase-01 | pronto |
| `EXCLUDED_FROM_POPULATION_V2` reduzido a `docs/COMPOUND_ENGINEERING.md` | Plano 01 fase-01 | pronto |
| `TEMPLATE_MANIFEST` inclui entries para `ARCHITECTURE.md`, `AGENTS.md`, `.claude/CLAUDE.md` | Plano 01 fase-01 | pronto |
| `tests/e2e/populate-plan-parity.test.ts` (esqueleto + 2 asserts MH-1) | Plano 01 fase-02 | pronto |
| `generatePopulatePlanV2` aceita `stackPaths?` injetavel | feature anterior (MH-02) | ja existe |
| `stackAwareInputPaths(cwd, primary)` valida com `fs.access` (G2 invariante) | feature anterior | ja existe |

### Produz para (outros planos que dependem deste)

| O que | Quem consome |
|-------|-------------|
| `NEXTJS_CANDIDATES` expandido com 8+ novos docs | Plano 05 fase-01 (golden snapshot inspeciona contagem por doc canonico) |
| `NEXTJS_SUPABASE_EXTRA` expandido para garantir CA-02 mecanico | Plano 05 fase-01 (assert "Next.js+Supabase: 3+ paths reais em ARCHITECTURE/SECURITY/RELIABILITY") |
| `RAILS_CANDIDATES` e `NODE_TS_CANDIDATES` expandidos | Plano 05 fase-02 (SH-2 Laravel + Python seguem o mesmo padrao) |
| 2 sub-asserts CA-02 + CA-05 no parity test | Plano 05 fase-01 (estende com snapshot diff por stack) |
| Fixture `tests/fixtures/stack-aware/nextjs-supabase/` com 3+ paths reais por doc critico | Reusada por Plano 05 fase-01 |

---

## Mapa de Fases

| Fase | Arquivo | Entrega | Sizing | Depende de |
|------|---------|---------|--------|------------|
| 01 | fase-01-expandir-nextjs-supabase.md | `NEXTJS_CANDIDATES` cobre 8 docs novos; `NEXTJS_SUPABASE_EXTRA` garante >= 3 paths reais em ARCHITECTURE/SECURITY/RELIABILITY; fixture `tests/fixtures/stack-aware/nextjs-supabase/` recebe arquivos minimos para que `exists: true`; 1 unit test novo em `stack-aware-input-paths.test.ts` valida CA-02 mecanico | 2h | — |
| 02 | fase-02-expandir-rails-node-ts.md | `RAILS_CANDIDATES` cobre 6 docs novos (sem inventar paths — Gemfile, config/application.rb, app/, etc); `NODE_TS_CANDIDATES` cobre 5 docs novos (tsconfig.json, src/index.ts, etc); 2 unit tests novos validam que `CanonicalDoc` cobertos correspondem ao esperado por stack | 1.5h | fase-01 (padrao de expansao estabelecido) |
| 03 | fase-03-parity-asserts-ca02-ca05.md | 2 sub-asserts em `tests/e2e/populate-plan-parity.test.ts`: (a) projeto Next.js+Supabase tem >= 3 paths com `exists: true` em SECURITY/ARCHITECTURE/RELIABILITY (CA-02); (b) stack `null` (unknown) gera `Inputs (codigo)` vazio + nota explicita sem falhar build (CA-05) | 1h | fase-01 + fase-02 |

---

## Grafo de Fases

```
fase-01 (Next.js + Supabase — padrao + CA-02 mecanico)
        |
        v
fase-02 (Rails + Node-TS — espelhar padrao, sem inventar paths)
        |
        v
fase-03 (2 asserts CA-02 + CA-05 no parity test)
```

**Paralelismo possivel:** zero entre fases deste plano (fase-02 reusa padrao estabelecido em
fase-01 para fixtures e estilo; fase-03 valida o cumulativo). **Em paralelo com outros planos:**
Plano 02 e Plano 03 (arquivos disjuntos — este toca `stack-aware-input-paths.ts` + fixtures
em `tests/fixtures/stack-aware/` + 2 sub-asserts no parity, nao bate com `.tpl`s do Plano 02
nem com `LLM_INSTRUCTIONS` do Plano 03).

---

## TDD Strategy

```
Ciclo por fase:
1. RED: escrever teste/assert que falha (assertion failure, nao compilation error)
2. GREEN: codigo minimo que faz o teste passar (entries novas no map)
3. REFACTOR: agrupar paths logicamente (sem perder cobertura)
4. VERIFY: bun run test && bun run lint && bun run typecheck
```

Por fase:

- **fase-01:** TDD direto. RED — escrever assert "ARCHITECTURE.md em Next.js+Supabase
  tem >= 3 paths com `exists: true`" antes de expandir `NEXTJS_SUPABASE_EXTRA`. Hoje o
  map ja tem 5 candidatos em ARCHITECTURE, mas o fixture pode nao ter todos os arquivos —
  pode falhar antes mesmo de expandir entries. GREEN — adicionar arquivos minimos ao
  fixture E expandir entries para SECURITY/RELIABILITY. REFACTOR — deduplicar paths que
  aparecem em mais de um doc (ex: `supabase/migrations/`).
- **fase-02:** TDD igual. RED — assert "Rails: ARCHITECTURE.md retorna `config/routes.rb`,
  `app/controllers/`, `app/models/`, `config/application.rb`" antes de adicionar entries
  para os demais docs (AGENTS.md, CLAUDE.md, docs/PLANS.md etc). GREEN — adicionar entries
  sem inventar paths novos (paths do scaffold padrao de cada stack).
- **fase-03:** RED puro no parity test. Adicionar 2 asserts (CA-02 e CA-05). Sem expandir
  entries adicionais — apenas validar o cumulativo das fases 01 e 02. RED esperado se
  alguem reverter fase-01 ou fase-02; GREEN com fases mergeadas.

**Tracer Bullet deste plano:** N/A — Tracer Bullet global da feature ja foi Plano 01. Plano
04 entra na coluna "discovery cobre 100% dos docs canonicos por stack" (CA-02 + CA-05).

---

## Gotchas Conhecidos

- **G1 (fixture `nextjs-supabase` precisa de arquivos minimos para `exists: true`):** Hoje
  o fixture tem apenas `package.json` + `src/` + `supabase/` (verificado via
  `ls tests/fixtures/stack-aware/nextjs-supabase/`). Para CA-02 mecanico, precisa de pelo
  menos:
  - `src/app/layout.tsx` (ou similar para ARCHITECTURE)
  - `src/middleware.ts` (para SECURITY)
  - `supabase/migrations/` com pelo menos 1 arquivo (para SECURITY/RELIABILITY)
  - `supabase/functions/` com pelo menos 1 arquivo (para RELIABILITY)
  - `src/lib/supabase/server.ts` (para SECURITY/ARCHITECTURE)

  Adicionar como touch-files vazios (`echo "" > path`) — o teste so checa `fs.access`,
  conteudo nao importa. Documentar no fixture um `README.md` explicando que sao stubs
  para CA-02.

- **G2 (`exists: false` continua valido — nao filtrar):** O test ja existente
  `flags inexistent paths with exists: false + note` (linha 16 de `stack-aware-input-paths.test.ts`)
  prova que paths inexistentes sao mantidos com `exists: false`. NAO mexer no comportamento
  — apenas adicionar entries. Politica de filtragem (renderer) e decisao futura.

- **G3 (CanonicalDoc estendido em Plano 01 — usar):** Apos Plano 01 fase-01,
  `CanonicalDoc` inclui `docs/PRODUCT_SENSE.md` e `README.md`. Plano 04 fase-01 PODE
  adicionar entries para esses dois docs (paths candidatos: `README.md` raiz, `package.json`,
  etc). Se Plano 01 ainda nao mergeou, o type quebra — confirmar primeiro com `Grep` em
  `stack-aware-input-paths.ts`.

- **G4 (sem inventar paths — scaffold padrao):** Regra do PRD MH-4. Para Rails, paths sao
  os do `rails new` (Gemfile, config/routes.rb, config/application.rb, app/controllers/,
  app/models/, db/migrate/). Para Node-TS, paths sao do `bun init` ou `npm init`
  (package.json, tsconfig.json, src/index.ts). NAO adicionar paths que dependem de
  preferencia do dev (ex: `src/services/`, `src/repositories/` — nao sao parte do scaffold
  padrao). Em duvida, consultar `tmp/andre-skills/harness-engineering/assets/harness-template/`
  como referencia do que o Andre considera scaffold real.

- **G5 (entries por doc orfao — fallback explicito):** Docs como `docs/PLANS.md`,
  `docs/STATE.md`, `docs/QUALITY_SCORE.md` nao tem evidencia natural no codigo da
  stack — sao docs do PROCESSO do projeto, nao do codigo. Para esses:
  - Adicionar entry com paths que ajudem a LLM a entender contexto: `docs/exec-plans/active/`
    (lista de planos vivos), `package.json` (versao + scripts), `.github/workflows/` (se
    existir — pipeline reflete qualidade).
  - Paths podem nao existir em greenfield — `exists: false` com nota e o comportamento
    correto.

- **G6 (`pickStaticMap` switch-case — manter por enquanto):** Linha 211. CLAUDE.md global
  diz "Preferir hash maps sobre switch-case". Aqui ha 5 cases (incluindo default) — switch
  ja esta enxuto. NAO refatorar nesta fase — fica para Plano 05 fase-02 se SH-2 (Laravel +
  Python) demandar. Registrar como DI no MEMORY.md se for tentado.

- **G7 (CanonicalDoc keys sem README.md em entries do map — possivel inconsistencia):**
  Apos Plano 01, `CanonicalDoc` inclui `README.md`, mas se nenhum stack tem entry para
  ele, `result.get('README.md')` retorna `undefined`. Em fase-01, adicionar entry para
  `README.md` em pelo menos `NEXTJS_CANDIDATES` e `GENERIC_CANDIDATES` (ex: `package.json`,
  `bun.lockb`, `pnpm-lock.yaml`). Mesma logica para `docs/PRODUCT_SENSE.md`.

- **G8 (Posix paths no Windows — invariante existente):** `stack-aware-input-paths.ts` ja
  emite paths em forward-slash (linha 230-231 do JSDoc). Manter — NAO usar `path.sep` nos
  novos entries. Strings literais com `/` em todas as entries.

---

## Notas para Fase-03 (parity asserts)

- Decisao **`generatePopulatePlanV2` direto vs `runInit`** ja tomada em Plano 01 fase-02
  (`DI-Plano01-fase02-isolated-call`): chamar `generatePopulatePlanV2()` diretamente,
  passando `stackPaths` montado em test setup. Plano 04 fase-03 segue mesma estrategia.
- Para CA-02, o assert chama `stackAwareInputPaths(FIXTURE_NEXTJS_SUPABASE, 'nextjs')` e
  injeta o resultado em `generatePopulatePlanV2({ stackPaths: ... })`. Apos, conta paths
  com `exists: true` em SECURITY/ARCHITECTURE/RELIABILITY.
- Para CA-05, o assert chama `stackAwareInputPaths(FIXTURE_EMPTY, null)` (primary null).
  `inputsCode` em cada fase deve estar `[]` OU com paths `exists: false`. O assert
  verifica que **a fase existe** (nao falhou) e que mensagem `_(Nenhum path candidato...)_`
  esta presente no markdown renderizado da fase.

---

<!-- Gerado por /plan-feature em 2026-05-19 -->
