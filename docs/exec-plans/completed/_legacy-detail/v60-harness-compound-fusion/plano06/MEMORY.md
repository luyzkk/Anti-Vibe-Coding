<!--
Princípio universal #5 — Comment Provenance.
Este arquivo eh preenchido DURANTE a execucao do plano (uma fase por vez), nao agora.
O subagente que executa cada fase atualiza este arquivo com bugs, decisoes, gotchas e desvios.
-->

# Memoria: Plano 06 — Agent-Native (D31 CRUD + D32 STATE.md hook + D33 completion signal)

**Feature:** Anti-Vibe Coding v6.0.0 — Harness + Compound Fusion
**Iniciado:** 2026-05-12
**Status:** concluido

---

## Decisoes de Implementacao

- **DI-01 (fase-01):** `js-yaml` com `{ flowLevel: -1, lineWidth: 120, noRefs: true }` para serializar completion signal. Trunca strings >80 chars (06-A2). `extractCompletionSignal` extrai o ULTIMO bloco yaml (permite redefinicao em re-runs).
- **DI-02 (fase-02):** As 6 skills sao TypeScript function exports (nao CLI entry points). Subagente leu os `index.ts` antes de implementar — sem suposicoes sobre a interface.
- **DI-03 (fase-04):** Lock logic INLINED no hook CJS (compliance com GT-07-01). Hook chama gerador via `spawnSync('bun', ['run', generatorPath, projectRoot])`. Lock TTL = 30s, chaveado por resolved projectRoot em `~/.claude/cache/state-md-last-run.json`.
- **DI-04 (fase-05):** `update()` e `archive()` sao sincronos. `compoundDir` derivado diretamente de `path.join(projectRoot, 'docs', 'compound')` em vez de chamar a `resolvePaths()` async. Elimina complexidade desnecessaria.
- **DI-05 (fase-06):** `revoke()` sincrono. `designDocsDir` derivado diretamente como `path.join(projectRoot, 'docs', 'design-docs')`. `computeNextAdrNumber` nao exportado de `adr-writer.ts` — reimplementado localmente via `fs.readdirSync` + regex.
- **DI-06 (cross-cutting):** Todos os helpers em `skills/lib/` (nao `anti-vibe-coding/lib/` — diretorio inexistente). Confirma DI-01-01 do Plano 05. Imports usam `'../lib/'` (um nivel relativo).
- **DI-07 (fase-07):** `todo-utils.ts` usa operador `??` em `m[1]` de regex para compliance com `noUncheckedIndexedAccess`. `remove` recusa linha nao-checkbox (evita delete acidental de titulo).

---

## Bugs Descobertos

- **BUG-01 (fase-02):** `spyOn(process.stdout, 'write')` nao intercepta `console.log` no Bun.
  - Causa: Bun implementa `console.log` internamente sem passar por `process.stdout.write`.
  - Fix: usar `spyOn(console, 'log')` nas asercoes de completion signal.
  - Fase afetada: fase-02

---

## Gotchas

- **GT-01 (fase-01):** `noUncheckedIndexedAccess: true` requer guard antes de `array[0]`. Pattern: `const first = arr[0]; if (first !== undefined) { ... }`. Nunca acessar `.length` de elemento potencialmente undefined sem narrowing.
- **GT-02 (fase-02):** TDD gate ativou ao criar `tests/completion-signal-emission.test.ts` — bloqueou edits em `skills/*/index.ts` (pois index.ts nao tinha co-located `.test.ts`). Fix: criar stubs `index.test.ts` co-localizados antes de editar `index.ts`. Gate verifica path DO ARQUIVO EDITADO, nao do contexto.
- **GT-03 (fase-04):** GT-07-01 confirmado para hooks: `.cjs` nao pode `require('../skills/lib/*.ts')` em Windows com espacos no path. Solucao: inline logic no hook OU `spawnSync('bun', ['run', absPath, arg])`. Workaround via URL encoding (`createRequire(import.meta.url)`) funciona mas exige ESM — hooks sao CJS. Inlining eh a solucao mais simples.
- **GT-04 (fase-05):** `gray-matter` parseia datas YAML (`created: 2026-05-12`) como objetos JS `Date`. Sem normalizacao, `matter.stringify()` reescreve como `2026-05-12T00:00:00.000Z`. Fix: helper `normalizeDateFields()` que converte `Date` de volta para `YYYY-MM-DD` string antes de `matter.stringify`. Afeta campos: `created`, `updated`, `archived_at`.
- **GT-05 (fase-06):** `computeNextAdrNumber` nao exportado de `adr-writer.ts`. Deve ser reimplementado localmente via `fs.readdirSync(designDocsDir).filter(f => /^ADR-\d{4}-/.test(f))` + `Math.max(...nums) + 1`.

---

## Desvios do Plano

- **DEV-01 (fase-05):** `tests/fixtures/lessons-crud-fixture/` nao commitado. Fixture eh totalmente efemera — `beforeEach` recria do zero em cada run. Leftovers de `_archived/` foram unstaged antes do commit.
- **DEV-02 (fase-06):** `revoke` sincrono apesar de `resolvePaths` ser async. `designDocsDir` derivado diretamente — simplificacao valida ja que o caminho eh deterministico (`docs/design-docs/` relativo a projectRoot).

---

## Metricas

| Metrica | Valor |
|---------|-------|
| Fases planejadas | 7 |
| Fases concluidas | 7 |
| Fases com desvio | 2 |
| Bugs encontrados | 1 |
| Retries necessarios | 0 |

---

## Notas para Planos Seguintes

**Para Plano 07 (TODO.md + /todo-pick):**

- `skills/lib/todo-utils.ts` exporta `parse(filePath)`, `markDone(file, lineIndex)`, `skip(file, lineIndex)`, `remove(file, lineIndex)`, `addLine(file, description)`. Plano 07 fase-02 estende com `pickNext`/`listPending` etc.
- `skills/lib/completion-signal.ts` exporta `renderCompletionSignal(opts: CompletionSignal): string`. Usar em TODA skill nova. Formato: bloco yaml com `skill / status / outputs / next_suggested / blocks_for_user`.
- `skills/lib/state-md-generator.ts` exporta `regenerateStateMd(projectRoot): Promise<string>`. Hook dispara via `spawnSync('bun', ['run', generatorPath, projectRoot])`.
- `hooks/state-md-hook.cjs` PostToolUse hook ativo — monitora `docs/compound/`, `docs/design-docs/ADR-*.md`, `docs/exec-plans/active|completed/`, `TODO.md`. Rate-limit 30s.
- `skills/lib/lessons-learned-crud.ts` exporta `update(root, slug, opts)` / `archive(root, slug)`. Slug resolve com/sem prefixo de data.
- `skills/lib/decision-registry-revoke.ts` exporta `revoke(root, id, opts)`. Cria nova ADR `{slug}-superseded` com links bidirecionais. Slug formato: `ADR-0001` ou `0001` ou `my-slug`.
- **GT-07-01 (critico):** Hooks CJS JAMAIS podem `require()` arquivos `.ts` — path com espaco (`Claude code/`) quebra o require nativo. Inline logic ou use `spawnSync('bun', ['run', absPath])`.
- **`noUncheckedIndexedAccess`:** sempre guard `m[1] !== undefined` antes de usar capture groups. Sempre guard `arr[0] !== undefined` antes de acessar elementos de arrays.
- **`bun test {explicit-path}`** obrigatorio — `bun run test` retorna exit 1 por 2 fails pre-existentes em `profile-md-generator.test.ts`. Suite global = 626 pass / 3 fail (as 3 sao pre-existentes).
- **ANTI_VIBE_DISABLE_HOOKS=1** em `bunfig.toml` desabilita hooks durante test runs.
- TDD gate co-located: criar `arquivo.test.ts` ANTES de editar `arquivo.ts` — gate bloqueia Write sem co-located test.

---

<!-- Atualizado automaticamente durante execucao -->
