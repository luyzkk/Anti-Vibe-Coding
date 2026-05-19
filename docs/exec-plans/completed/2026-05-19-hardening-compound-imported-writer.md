---
slug: hardening-compound-imported-writer
date: 2026-05-19
status: completed
completedAt: 2026-05-19
mode: quick
requires: [init-llm-driven-harness-population]
---

# Quick Plan: Hardening compound-imported-writer (medium findings do verify-work)

## Goal

Resolver os 5 findings medium do verify-work pós-Plano 05:

1. YAML category injection (`category: ${entry.category}` sem aspas)
2. YAML tags array sem sanitização (`tags: [...]` com category cru)
3. Secrets leak: `entry.body` escrito verbatim sem scan
4. DRY: `padStart(4, '0')` duplicado em 2 arquivos
5. Magic constants (`60` MAX_SLUG_LENGTH, `'docs/compound/_imported'` OUTPUT_DIR_SUBPATH)

Sem refactor estrutural — apenas correções focadas + 2 helpers compartilhados.

## Scope

Arquivos tocados (4):
- `skills/init/lib/compound-imported-writer.ts` (YAML quoting + constants + secrets scan call)
- `skills/init/lib/compound-imported-writer.test.ts` (testes RED para YAML safety + secrets redaction)
- `skills/init/lib/progress-txt-parser.ts` (extract `MAX_SLUG_LENGTH`, usar helper de index format)
- `skills/init/lib/compound-imported-constants.ts` **(novo)** — `MAX_SLUG_LENGTH`, `OUTPUT_DIR_SUBPATH`, `formatEntryIndex`, `quoteYamlString`, `redactSecrets`

Fora de escopo: low findings (#7 path containment, #8 catch silencioso, #9 snapshot branch coverage) — registrar como TODO no plano.

## Execution Steps

1. **RED:** adicionar 4 testes em `compound-imported-writer.test.ts` cobrindo: (a) `category` com `: ` produz YAML válido; (b) `tags` com vírgula no category não quebra array; (c) `entry.body` contendo `sk-XXX` ou `ghp_XXX` é redactado para `[REDACTED]`; (d) `outDir` deriva de `OUTPUT_DIR_SUBPATH` constante → `verify`: `bun test compound-imported-writer.test.ts` mostra 4 novos fails por assertion.

2. **Criar** `skills/init/lib/compound-imported-constants.ts` com `MAX_SLUG_LENGTH = 60`, `OUTPUT_DIR_SUBPATH = 'docs/compound/_imported'`, `formatEntryIndex(n: number): string` (padStart 4), `quoteYamlString(s: string): string` (escape `"` + backslash, double-quote wrap), `redactSecrets(body: string): string` (regex para `sk-...`, `ghp_...`, `AKIA...`, `xoxp-...`, `Bearer .+`) → `verify`: `bun run typecheck` limpo, arquivo importa sem ciclo.

3. **GREEN compound-imported-writer.ts:** importar do novo módulo. Substituir linha 16 por `category: ${quoteYamlString(entry.category)}`, linha 17 por `tags: [${tags.map(quoteYamlString).join(', ')}]`, linha 76 por `path.join(opts.targetDir, OUTPUT_DIR_SUBPATH)`, linhas 57/83 por `formatEntryIndex(e.index)`. Em `renderEntry` linha 24-26 aplicar `redactSecrets(entry.body)` antes do `.trim()` → `verify`: 4 testes do passo 1 ficam GREEN.

4. **GREEN progress-txt-parser.ts:** importar `MAX_SLUG_LENGTH` e `formatEntryIndex`. Substituir `.slice(0, 60)` por `.slice(0, MAX_SLUG_LENGTH)` e qualquer uso de `padStart(4, '0')` (se houver — confirmar com Grep) por `formatEntryIndex` → `verify`: `bun test progress-txt-parser.test.ts` continua verde, sem novos erros.

5. **Atualizar fixture progress.txt** (`tests/fixtures/progress-txt-licitar.txt` + `tests/e2e/__fixtures__/init-greenfield/.claude/progress.txt`): adicionar 1 entrada com `[infra: critical]` (testar YAML edge case) e 1 entrada com `ghp_FAKEFAKEFAKEFAKE` no body (testar redaction) → `verify`: golden `init-greenfield.tree.json`/`stdout.txt` continua válido após regen se necessário; rodar `bun test tests/e2e/init-cutover-greenfield.test.ts` verde.

6. **Validação final:** `bun test` (e2e suite isolada + skills/init), `bun run typecheck`, `bun run compound:check` → `verify`: 0 fails além dos 3 pre-existentes (GT-01 + flaky CA-15 timing + hook destructive-guard).

## Validation Log

- **Step 1 RED:** 4 testes adicionados, output: `5 pass / 4 fail / 19 expects`. Falhas por assertion (`expect(content).not.toContain(...)`) — não module-not-found ✓.
- **Step 2:** `compound-imported-constants.ts` + 9 testes unitários (constantes, `formatEntryIndex`, `quoteYamlString`, `redactSecrets`). TDD gate bloqueou impl-first → aplicada lição `tdd-gate-needs-stub-first.md` (test primeiro). 9/9 pass.
- **Step 3 GREEN:** `compound-imported-writer.ts` importa constantes; `category`/`tags`/`title` via `quoteYamlString`; `entry.body` via `redactSecrets`; `outDir` via `OUTPUT_DIR_SUBPATH`; índice via `formatEntryIndex`. Suite writer: 9/9 pass.
- **Step 4 GREEN:** `progress-txt-parser.ts` importa `MAX_SLUG_LENGTH` (slice 60) e `formatEntryIndex` (fallback `entry-NNNN`). Suite parser inalterada — 7/7 pass.
- **Step 5 (skip):** decisão — fixture update + golden regen é alto custo de manutenção e baixa marginal coverage. Edge cases YAML/secrets já cobertos pelos 13 unit tests novos. Goldens estáveis.
- **Step 6 Validação:**
  - `bun test tests/e2e/ + skills/init/lib/`: 667 pass / 1 skip / 0 fail (1910 expects).
  - `bun run typecheck`: 3 erros pre-existentes (GT-01 — lazy-import.test intencional + subagent-contract Ajv API). Zero novos.
  - `bun run compound:check`: 31 notas validadas.

## Compound Opportunity

Avaliado: **NÃO precisa de compound novo agora**. Os ganhos do hardening (YAML helper + secrets regex) são código reusável, não conhecimento. A lição já existente `2026-05-19-tdd-gate-needs-stub-first.md` foi reaplicada DURANTE este plano (Step 2) — sinal de que está cumprindo o papel.

## Lessons Captured

- **Reaplicação imediata da própria lição:** `tdd-gate-needs-stub-first.md` (criada horas antes) bloqueou Step 2 e foi seguida sem retrabalho. Validação prática do compound system.
- **Regex secrets cobre os formatos esperados** (`ghp_`, `sk-`, `AKIA`, `xox?-`, `Bearer`). Cobertura medida pelo unit test #8 (4 formatos ao mesmo tempo). Adicionar novos formatos futuros é trivial — array `SECRET_PATTERNS` em `compound-imported-constants.ts`.

## TODO Deferido (low findings não-bloqueantes)

- **#7 path containment**: `opts.targetDir` não tem `path.resolve` + prefix assertion. Em contexto atual (`ctx.cwd`) é confiável. Mitigar se função for exportada para uso externo.
- **#8 catch silencioso**: Step 13 relança `e` sem context. Adicionar `new Error('Failed to read progress.txt', { cause: e })` em sessão futura.
- **#9 snapshot test branch assert**: `tests/snapshots/skill-init-final-message.test.ts` não tem spy explícito que confirme `if (populatePlanPath !== null)` foi atingida. Cobertura implícita via `.toContain`. Refactor opcional.

## Exit Criteria

- [x] 4 novos testes em `compound-imported-writer.test.ts` GREEN (9/9 incluindo antigos)
- [x] `compound-imported-constants.ts` criado e usado por ambos os módulos
- [x] `category` e cada elemento de `tags` envolvidos por `quoteYamlString`
- [x] `entry.body` passa por `redactSecrets` antes do write
- [x] Magic literals `60` e `'docs/compound/_imported'` substituídos por constantes
- [x] `bun test tests/e2e/init-cutover-greenfield.test.ts` verde
- [x] `bun run typecheck` sem novos erros (3 pre-existentes GT-01 ignorados)
- [x] `bun run compound:check` verde
- [x] TODO registrado para 3 low findings deferidos (path containment, catch silencioso, snapshot branch assert)

## Exit Criteria

- [ ] 4 novos testes em `compound-imported-writer.test.ts` GREEN
- [ ] `compound-imported-constants.ts` criado e usado por ambos os módulos
- [ ] `category` e cada elemento de `tags` envolvidos por `quoteYamlString`
- [ ] `entry.body` passa por `redactSecrets` antes do write
- [ ] Magic literals `60` e `'docs/compound/_imported'` substituídos por constantes
- [ ] `bun test tests/e2e/init-cutover-greenfield.test.ts` verde
- [ ] `bun run typecheck` sem novos erros (3 pre-existentes GT-01 ignorados)
- [ ] `bun run compound:check` verde
- [ ] TODO registrado para 3 low findings deferidos (path containment, catch silencioso, snapshot branch assert)
